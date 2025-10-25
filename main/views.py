import json 
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .models import Category, Transaction
from decimal import Decimal, InvalidOperation
from django.db.models import Sum
from django.db import transaction
import random
import string
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User 
from django.core.paginator import Paginator
from django.conf import settings
from django_user_agents.utils import get_user_agent
from django.db.models import Sum, Count, Q
from webpush import send_user_notification
from webpush import send_group_notification
from .models import Note
from django.utils import timezone
from django.core.cache import cache

from .models import SystemNotification, UserNotification
from django.contrib.admin.views.decorators import staff_member_required
from django.core.paginator import Paginator, EmptyPage

from .models import (
    Category, Transaction, UserProfile, Note, 
    SystemNotification, UserNotification,
    NotificationChat, ChatMessage, Todo
)


@staff_member_required
@require_POST
def create_system_notification(request):
    """Создание системного уведомления админом"""
    try:
        data = json.loads(request.body)
        title = data.get('title')
        message = data.get('message')
        target_user_id = data.get('target_user_id')  # Новый параметр
        
        if not title or not message:
            return JsonResponse({'success': False, 'error': 'Заполните все поля'})
        
        # Обрабатываем целевого пользователя, если указан
        target_user = None
        if target_user_id:
            try:
                target_user = User.objects.get(id=target_user_id)
            except User.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Пользователь с указанным ID не найден'})
        
        # Создаем системное уведомление
        notification = SystemNotification.objects.create(
            title=title,
            message=message,
            created_by=request.user,
            target_user=target_user  # Может быть None (для всех) или конкретный пользователь
        )
        
        # Создаем записи UserNotification
        if target_user:
            # Персональное уведомление - только для указанного пользователя
            UserNotification.objects.create(
                user=target_user,
                notification=notification
            )
            users_count = 1
            message_type = "персональное уведомление отправлено"
        else:
            # Общее уведомление - для всех пользователей
            users = User.objects.all()
            user_notifications = [
                UserNotification(user=user, notification=notification)
                for user in users
            ]
            UserNotification.objects.bulk_create(user_notifications)
            users_count = len(users)
            message_type = "уведомление отправлено всем пользователям"
        
        
        return JsonResponse({
            'success': True, 
            'message': f'{message_type} для {users_count} пользователей',
            'is_personal': target_user is not None
        })
        
    except Exception as e:
        print(f"Error creating system notification: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})
    




    

@staff_member_required
def distribute_existing_notifications(request):
    """Распространить все активные уведомления на всех пользователей"""
    try:
        active_notifications = SystemNotification.objects.filter(is_active=True)
        users = User.objects.all()
        
        created_count = 0
        for notification in active_notifications:
            for user in users:
                # Создаем запись, если ее еще нет
                UserNotification.objects.get_or_create(
                    user=user,
                    notification=notification,
                    defaults={'is_read': False}
                )
                created_count += 1
        
        return JsonResponse({
            'success': True, 
            'message': f'Распространено {created_count} уведомлений на {users.count()} пользователей'
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def get_user_notifications(request):
    """Получение уведомлений пользователя с кэшированием"""
    cache_key = f'user_notifications_{request.user.id}'
    cached_data = cache.get(cache_key)
    
    if cached_data:
        # Возвращаем JsonResponse с данными из кэша
        return JsonResponse(cached_data)
    
    try:
        user_notifications = UserNotification.objects.filter(
            user=request.user,
            notification__is_active=True
        ).filter(
            Q(notification__target_user=None) | 
            Q(notification__target_user=request.user)
        ).select_related('notification').order_by('-created_at')
        
        notifications_data = []
        unread_count = 0
        
        for user_notif in user_notifications:
            # Проверяем, есть ли чат для этого уведомления
            has_chat = NotificationChat.objects.filter(
                notification=user_notif.notification
            ).exists()
            
            notifications_data.append({
                'id': user_notif.id,
                'notification_id': user_notif.notification.id,
                'title': user_notif.notification.title,
                'message': user_notif.notification.message,
                'created_at': user_notif.notification.created_at.isoformat(),
                'is_read': user_notif.is_read,
                'read_at': user_notif.read_at.isoformat() if user_notif.read_at else None,
                'type': "personal" if user_notif.notification.target_user else "system",
                'is_personal': user_notif.notification.target_user is not None,
                'has_chat': has_chat,
                'is_admin_chat': False
            })
            
            if not user_notif.is_read:
                unread_count += 1
        
        # Сортируем: сначала непрочитанные, потом по дате (новые сверху)
        notifications_data.sort(key=lambda x: (not x['is_read'], x['created_at']), reverse=True)
        
        # Подготавливаем данные для кэширования и ответа
        result_data = {
            'success': True,
            'notifications': notifications_data,
            'unread_count': unread_count
        }
        
        # Сохраняем в кэш на 30 секунд
        cache.set(cache_key, result_data, 30)
        
        return JsonResponse(result_data)
        
    except Exception as e:
        # Краткое сообщение об ошибке вместо полного traceback
        return JsonResponse({'success': False, 'error': 'Ошибка загрузки уведомлений'})





@login_required
def get_chat_messages(request, notification_id):
    """Получение сообщений чата"""
    try:
        notification = SystemNotification.objects.get(id=notification_id)
        
        # Проверяем доступ пользователя
        user_has_access = (
            request.user == notification.target_user or
            request.user == notification.created_by or
            request.user.is_staff
        )
        
        if not user_has_access:
            return JsonResponse({'success': False, 'error': 'Доступ запрещен'})
        
        # Создаем чат если его нет
        chat, created = NotificationChat.objects.get_or_create(notification=notification)
        
        # Помечаем сообщения как прочитанные (только для текущего пользователя)
        if not created:
            # Помечаем все сообщения от других пользователей как прочитанные
            chat.messages.filter(
                is_read=False
            ).exclude(
                user=request.user
            ).update(is_read=True)
        
        messages = chat.messages.all().select_related('user')
        messages_data = []
        
        for msg in messages:
            messages_data.append({
                'id': msg.id,
                'user_id': msg.user.id,
                'username': msg.user.username,
                'message': msg.message,
                'created_at': msg.created_at.isoformat(),
                'is_own': msg.user == request.user,
                'is_read': msg.is_read,
                'is_staff': msg.user.is_staff
            })
        
        response_data = {
            'success': True,
            'messages': messages_data,
            'chat_id': chat.id
        }
        
        # Добавляем информацию об админе для пользователей
        if not request.user.is_staff and notification.created_by:
            response_data['admin_username'] = notification.created_by.username
        
        return JsonResponse(response_data)
        
    except SystemNotification.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Уведомление не найдено'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


    



@login_required
@require_POST
def send_chat_message(request, notification_id):
    """Отправка сообщения в чат"""
    try:
        data = json.loads(request.body)
        message_text = data.get('message', '').strip()

        if not message_text:
            return JsonResponse({'success': False, 'error': 'Сообщение не может быть пустым'})

        notification = SystemNotification.objects.get(id=notification_id)

        # Создаем чат если его нет
        chat, created = NotificationChat.objects.get_or_create(notification=notification)

        # Создаем сообщение
        message = ChatMessage.objects.create(
            chat=chat,
            user=request.user,
            message=message_text
        )

        # Обновляем время чата
        chat.save()  # Это обновит updated_at

        # Если сообщение от админа - обновляем UserNotification пользователя
        if request.user.is_staff and notification.target_user:
            print(f"Админ {request.user.username} отправил сообщение пользователю {notification.target_user.username}")
            
            try:
                # Находим UserNotification пользователя для этого уведомления
                user_notification = UserNotification.objects.get(
                    notification=notification,
                    user=notification.target_user
                )
                # Сбрасываем флаг прочитанного и обновляем время
                user_notification.is_read = False
                user_notification.read_at = None
                user_notification.save()
                
                print(f"Обновлено UserNotification для пользователя {notification.target_user.username}")
                
            except UserNotification.DoesNotExist:
                print(f"UserNotification не найден для пользователя {notification.target_user.username}")

        # Если сообщение от пользователя - уведомляем админа
        elif not request.user.is_staff and notification.created_by:
            print(f"Пользователь {request.user.username} отправил сообщение админу {notification.created_by.username}")
            
            try:
                # Находим UserNotification админа для этого уведомления
                admin_notification = UserNotification.objects.get(
                    notification=notification,
                    user=notification.created_by
                )
                # Сбрасываем флаг прочитанного
                admin_notification.is_read = False
                admin_notification.read_at = None
                admin_notification.save()
                
                print(f"Обновлено UserNotification для админа {notification.created_by.username}")
                
            except UserNotification.DoesNotExist:
                print(f"UserNotification не найден для админа {notification.created_by.username}")

        return JsonResponse({
            'success': True,
            'message': {
                'id': message.id,
                'user_id': message.user.id,
                'username': message.user.username,
                'message': message.message,
                'created_at': message.created_at.isoformat(),
                'is_own': True,
                'is_read': message.is_read
            }
        })

    except SystemNotification.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Уведомление не найдено'})
    except Exception as e:
        print(f"❌ Ошибка в send_chat_message: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})





@staff_member_required
@login_required
def get_admin_chats(request):
    """Получение списка чатов для админа"""
    try:
       
        
        admin_chats = NotificationChat.objects.filter(
            notification__created_by=request.user,
            notification__target_user__isnull=False
        ).select_related(
            'notification',
            'notification__target_user'
        ).prefetch_related(
            'messages'
        ).order_by('-updated_at')
        
        chats_data = []
        
        for chat in admin_chats:
            last_message = chat.messages.last()
            
            # Считаем непрочитанные сообщения (от пользователя)
            unread_count = chat.messages.filter(
                is_read=False
            ).exclude(
                user=request.user
            ).count()
            
            chats_data.append({
                'notification_id': chat.notification.id,
                'target_user': {
                    'id': chat.notification.target_user.id,
                    'username': chat.notification.target_user.username,
                },
                'notification_title': chat.notification.title,
                'last_message': {
                    'text': last_message.message if last_message else 'Чат начат',
                    'created_at': last_message.created_at.isoformat() if last_message else chat.notification.created_at.isoformat(),
                    'is_own': last_message.user == request.user if last_message else False
                },
                'unread_count': unread_count,
                'updated_at': chat.updated_at.isoformat()
            })
        
  
        
        return JsonResponse({'success': True, 'chats': chats_data})
        
    except Exception as e:
        # Заменяем подробный вывод на краткий
        return JsonResponse({'success': False, 'error': 'Ошибка загрузки чатов'})
    


@staff_member_required
@login_required
def get_personal_notifications(request):
    """Получение всех персональных уведомлений для админа"""
    try:
        # Получаем все персональные уведомления, созданные текущим админом
        personal_notifications = SystemNotification.objects.filter(
            created_by=request.user,
            target_user__isnull=False,
            is_active=True
        ).select_related('target_user').order_by('-created_at')
        
        notifications_data = []
        
        for notification in personal_notifications:
            # Получаем информацию о пользователе-получателе
            user_notification = UserNotification.objects.filter(
                notification=notification
            ).first()
            
            notifications_data.append({
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'created_at': notification.created_at.isoformat(),
                'target_user': {
                    'id': notification.target_user.id,
                    'username': notification.target_user.username,
                    'email': notification.target_user.email or 'Не указана',
                },
                'is_read': user_notification.is_read if user_notification else False,
                'read_at': user_notification.read_at.isoformat() if user_notification and user_notification.read_at else None,
            })
        
        return JsonResponse({
            'success': True,
            'notifications': notifications_data
        })
        
    except Exception as e:
        print(f"Error getting personal notifications for admin {request.user.username}: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
@require_POST
def update_currency(request):
    """Обновление валюты пользователя"""
    try:
        currency = request.POST.get('currency')
        print(f"=== UPDATE CURRENCY ===")
        print(f"User: {request.user.username}")
        print(f"Requested currency: {currency}")
        
        if currency not in ['c', 'r', '$', '€']:
            return JsonResponse({'success': False, 'error': 'Неверная валюта'})
        
        # ГАРАНТИРУЕМ, ЧТО ПРОФИЛЬ СУЩЕСТВУЕТ
        if not hasattr(request.user, 'userprofile'):
            from .models import UserProfile
            UserProfile.objects.create(user=request.user)
        
        # Обновляем валюту в профиле пользователя
        profile = request.user.userprofile
        old_currency = profile.currency
        profile.currency = currency
        profile.save()
        
        print(f"Updated currency from {old_currency} to {currency}")
        print(f"======================")
        
        return JsonResponse({'success': True})
        
    except Exception as e:
        print(f"Error updating currency: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})



@login_required
@require_POST
def mark_notification_as_read(request, notification_id):
    """Пометить уведомление как прочитанное"""
    try:
        user_notification = UserNotification.objects.get(
            id=notification_id,
            user=request.user
        )
        
        if not user_notification.is_read:
            user_notification.is_read = True
            user_notification.read_at = timezone.now()
            user_notification.save()
        
        return JsonResponse({'success': True})
        
    except UserNotification.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Уведомление не найдено'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@staff_member_required
@require_POST
def delete_system_notification(request, notification_id):
    """Удаление системного уведомления (админ)"""
    try:
        notification = SystemNotification.objects.get(id=notification_id)
        notification.is_active = False
        notification.save()
        
        return JsonResponse({'success': True, 'message': 'Уведомление удалено'})
        
    except SystemNotification.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Уведомление не найдено'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    



@require_POST
@login_required
def send_note_reminder(request):
    try:
        data = json.loads(request.body)
        note_id = data.get('note_id')
        title = data.get('title', 'Напоминание')
        content = data.get('content', '')
        
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Заметка не найдена'})
        
        payload = {
            'head': title,
            'body': content[:100] + '...' if len(content) > 100 else content,
            'url': '/',
            'icon': '/static/main/icons/icon-192x192.png',
            'type': 'note_reminder',
            'noteId': note_id
        }
        
        # Отправляем уведомление ВСЕМ подпискам пользователя
        from webpush.models import PushInformation
        push_infos = PushInformation.objects.filter(user=request.user)
        
        for push_info in push_infos:
            try:
                send_user_notification(
                    user=request.user,
                    payload=payload,
                    ttl=1000,
                    subscription=push_info.subscription
                )
                print(f"Push отправлен на подписку {push_info.id}")
            except Exception as e:
                print(f"Ошибка отправки на подписку {push_info.id}: {str(e)}")
        
        return JsonResponse({'success': True, 'message': 'Уведомление отправлено'})
        
    except Exception as e:
        print(f"Ошибка отправки push напоминания: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})




def create_default_categories(user):
    """Создает категории по умолчанию для пользователя только один раз"""
    # Проверяем, создавались ли уже дефолтные категории для этого пользователя
    if hasattr(user, 'userprofile') and user.userprofile.default_categories_created:
        return
    
    # Если профиля нет, проверяем есть ли вообще какие-либо категории у пользователя
    if Category.objects.filter(user=user).exists():
        return  # У пользователя уже есть категории, ничего не создаем
    
    default_categories = [
        {'name': 'Еда', 'icon': 'fas fa-utensils', 'color': '#ef4444'},
        {'name': 'Жилье', 'icon': 'fas fa-home', 'color': '#10b981'},
        {'name': 'Работа', 'icon': 'fas fa-briefcase', 'color': '#3b82f6'},
    ]
    
    for cat_data in default_categories:
        Category.objects.create(
            user=user,
            name=cat_data['name'],
            icon=cat_data['icon'],
            color=cat_data['color']
        )
    
    # Отмечаем, что дефолтные категории были созданы
    if hasattr(user, 'userprofile'):
        user.userprofile.default_categories_created = True
        user.userprofile.save()

from django_user_agents.utils import get_user_agent

@login_required
def index(request):
    user_agent = get_user_agent(request)
    
    # Если это ПК - перенаправляем на презентацию
    if not (user_agent.is_mobile or user_agent.is_tablet):
        return render(request, 'main/desktop.html')
    
    # Остальной ваш существующий код для мобильных устройств
    # Создаем категории по умолчанию
    create_default_categories(request.user)
    
    categories = Category.objects.filter(user=request.user)
    transactions = Transaction.objects.filter(user=request.user).order_by('-created_at')
    
    # ГАРАНТИРУЕМ, ЧТО ПРОФИЛЬ СУЩЕСТВУЕТ
    if not hasattr(request.user, 'userprofile'):
        from .models import UserProfile
        UserProfile.objects.create(user=request.user)

    # ... остальной ваш существующий код ...
    # РАСЧЕТ БАЛАНСОВ С УЧЕТОМ РЕЗЕРВА
    income_result = transactions.filter(type='income').aggregate(total=Sum('amount'))
    expense_result = transactions.filter(type='expense').aggregate(total=Sum('amount'))
    reserve_result = transactions.filter(type='income').aggregate(total=Sum('reserve_amount'))
    
    income = income_result['total'] or Decimal('0')
    expense = expense_result['total'] or Decimal('0')
    total_reserve = reserve_result['total'] or Decimal('0')
    
    # ОСНОВНОЙ БАЛАНС: общая сумма минус накопленный резерв
    total = income - expense - total_reserve
    
    # Получаем валюту из профиля пользователя
    try:
        user_currency = request.user.userprofile.currency
    except (AttributeError, ValueError):
        user_currency = 'c'

    # Получаем процент резерва из профиля пользователя
    try:
        reserve_percentage = int(request.user.userprofile.reserve_percentage)
    except (AttributeError, ValueError):
        reserve_percentage = 10
    
    try:
        target_reserve = Decimal(str(request.user.userprofile.target_reserve))
    except (AttributeError, ValueError, InvalidOperation):
        target_reserve = Decimal('0')

    # Проверяем, является ли это первым входом (новый пользователь)
    is_new_user = request.session.get('is_new_user', False)
    if is_new_user:
        # Убираем флаг, чтобы уведомление показывалось только один раз
        request.session['is_new_user'] = False
    
    # Проверяем, есть ли у пользователя транзакции
    has_transactions = transactions.exists()

    # РАСЧЕТЫ ДЛЯ СТАТИСТИКИ РЕЗЕРВА
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Резерв за текущий месяц (сумма reserve_amount за месяц)
    month_reserve_result = Transaction.objects.filter(
        user=request.user,
        type='income',
        created_at__gte=month_start
    ).aggregate(total=Sum('reserve_amount'))
    monthly_reserve = month_reserve_result['total'] or Decimal('0')
    
    # Текущий резерв (общий накопленный) - это total_reserve
    current_reserve = total_reserve
    
    # Прогресс к цели - ИСПРАВЛЕНО
    progress_percentage = 0
    remaining_to_target = target_reserve
    
    # Безопасное сравнение
    if target_reserve > Decimal('0'):
        try:
            calculated_percentage = float((current_reserve / target_reserve) * Decimal('100'))
            progress_percentage = min(100.0, calculated_percentage)
            remaining_to_target = max(Decimal('0'), target_reserve - current_reserve)
        except (ZeroDivisionError, InvalidOperation):
            progress_percentage = 0
            remaining_to_target = target_reserve

    return render(request, 'index.html', {
        'categories': categories,
        'transactions': transactions,
        'income': income,
        'expense': expense,
        'total': total,
        'is_new_user': is_new_user,
        'has_transactions': has_transactions,
        'reserve_percentage': reserve_percentage,
        'target_reserve': target_reserve,
        # Новые данные для статистики
        'current_reserve': current_reserve,
        'monthly_reserve': monthly_reserve,
        'progress_percentage': progress_percentage,
        'remaining_to_target': remaining_to_target,
        'user_currency': user_currency,
    })

# Добавьте эту новую функцию для desktop страницы
def desktop(request):
    return render(request, 'main/desktop.html')


@login_required
def update_target_reserve(request):
    if request.method == 'POST':
        try:
            target_reserve = request.POST.get('target_reserve')
            if target_reserve is None:
                return JsonResponse({'success': False, 'error': 'Не указана цель'})
            
            target_reserve = Decimal(target_reserve)
            if target_reserve < 0:
                return JsonResponse({'success': False, 'error': 'Цель должна быть положительной'})
            
            # Обновляем целевой резерв в профиле пользователя
            profile = request.user.userprofile
            profile.target_reserve = target_reserve
            profile.save()
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Неверный метод запроса'})





@login_required
def update_reserve_percentage(request):
    if request.method == 'POST':
        try:
            new_percentage = request.POST.get('reserve_percentage')
            if new_percentage is None:
                return JsonResponse({'success': False, 'error': 'Не указан процент'})
            
            new_percentage = int(new_percentage)
            if new_percentage < 0 or new_percentage > 100:
                return JsonResponse({'success': False, 'error': 'Процент должен быть от 0 до 100'})
            
            # Обновляем процент резерва в профиле пользователя
            profile = request.user.userprofile
            profile.reserve_percentage = new_percentage
            profile.save()
            
            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Неверный метод запроса'})


# views.py - обновляем функцию add_transaction
@login_required
def add_transaction(request):
    if request.method == "POST":
        try:
            type_ = request.POST.get("type")
            amount = request.POST.get("amount")
            category_id = request.POST.get("category")
            description = request.POST.get("description", "")

            

            if not type_:
                return JsonResponse({"success": False, "error": "Не указан тип операции"})
            if not amount:
                return JsonResponse({"success": False, "error": "Не указана сумма"})
            if not category_id:
                return JsonResponse({"success": False, "error": "Не выбрана категория"})

            # Преобразуем сумму в Decimal
            try:
                amount_decimal = Decimal(amount)
                if amount_decimal <= 0:
                    return JsonResponse({"success": False, "error": "Сумма должна быть больше нуля"})
            except (ValueError, InvalidOperation):
                return JsonResponse({"success": False, "error": "Неверный формат суммы"})

            category = Category.objects.get(id=category_id)
            
            # РАСЧЕТ РЕЗЕРВА
            reserve_amount = Decimal('0')
            if type_ == 'income':
                # Получаем процент резерва из профиля пользователя
                reserve_percentage = request.user.userprofile.reserve_percentage
                reserve_amount = amount_decimal * (Decimal(reserve_percentage) / Decimal('100'))
                print(f"Рассчитан резерв: {reserve_amount} с ({reserve_percentage}% от {amount_decimal})")

            transaction = Transaction.objects.create(
                user=request.user,
                type=type_,
                amount=amount_decimal,
                category=category,
                description=description,
                reserve_amount=reserve_amount
            )
            
            # ПЕРЕСЧИТЫВАЕМ БАЛАНСЫ С УЧЕТОМ РЕЗЕРВА
            transactions = Transaction.objects.filter(user=request.user)
            income_result = transactions.filter(type='income').aggregate(total=Sum('amount'))
            expense_result = transactions.filter(type='expense').aggregate(total=Sum('amount'))
            reserve_result = transactions.filter(type='income').aggregate(total=Sum('reserve_amount'))
            
            income = income_result['total'] or Decimal('0')
            expense = expense_result['total'] or Decimal('0')
            total_reserve = reserve_result['total'] or Decimal('0')
            total = income - expense - total_reserve
            
            # РАСЧЕТ РЕЗЕРВА ЗА ТЕКУЩИЙ МЕСЯЦ
            now = timezone.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_reserve_result = Transaction.objects.filter(
                user=request.user,
                type='income',
                created_at__gte=month_start
            ).aggregate(total=Sum('reserve_amount'))
            monthly_reserve = month_reserve_result['total'] or Decimal('0')
            
            # Возвращаем данные о созданной транзакции для динамического обновления
            transaction_data = {
                'id': transaction.id,
                'type': transaction.type,
                'amount': float(transaction.amount),
                'reserve_amount': float(reserve_amount),
                'description': transaction.description,
                'created_at': transaction.created_at.isoformat(),
                'category_id': transaction.category.id,
                'category_name': transaction.category.name,
                'category_icon': transaction.category.icon,
                'category_color': transaction.category.color,
            }
            
            return JsonResponse({
                "success": True, 
                "transaction": transaction_data,
                "updated_balances": {
                    "total": float(total),
                    "income": float(income),
                    "expense": float(expense),
                    "total_reserve": float(total_reserve),
                    "monthly_reserve": float(monthly_reserve)  # добавляем месячный резерв
                }
            })
            
        except Category.DoesNotExist:
            return JsonResponse({"success": False, "error": "Категория не найдена"})
        except Exception as e:
            print(f"Ошибка при создании транзакции: {str(e)}")
            return JsonResponse({"success": False, "error": f"Внутренняя ошибка сервера: {str(e)}"})

    return JsonResponse({"success": False, "error": "Неверный метод запроса"})




def hello(request):
    user_agent = get_user_agent(request)
    
    # Если это ПК - показываем презентацию даже для неавторизованных
    if not (user_agent.is_mobile or user_agent.is_tablet):
        return render(request, 'main/desktop.html')
    
    # Для мобильных показываем обычную страницу hello
    if request.user.is_authenticated:
        return redirect('index')
    
    return render(request, 'hello.html')



# Авторизация (через AJAX или форму)
def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            # Устанавливаем флаг для показа приветствия
            request.session['is_new_user'] = True
            
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            return redirect('index')

        # Если AJAX — вернём JSON с ошибкой
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JsonResponse({'error': 'Неверный логин или пароль'}, status=400)

        # Если обычный запрос (на всякий случай)
        return render(request, 'hello.html', {'error': 'Неверный логин или пароль'})

    return redirect('hello')

# Выход
def logout_view(request):
    logout(request)
    return redirect('hello')

@login_required
def add_category(request):
    if request.method == "POST":
        try:
            name = request.POST.get("name")
            icon = request.POST.get("icon", "fas fa-tag")
            color = request.POST.get("color", "#3b82f6")

            if not name:
                return JsonResponse({"success": False, "error": "Не указано название категории"})

            category = Category.objects.create(
                user=request.user,
                name=name,
                icon=icon,
                color=color
            )
            
            return JsonResponse({"success": True, "category": {"id": category.id, "name": category.name}})
            
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)})

    return JsonResponse({"success": False, "error": "Неверный метод запроса"})

@login_required
def delete_category(request, category_id):
    try:
        category = Category.objects.get(id=category_id, user=request.user)
        
        # Проверяем, есть ли транзакции в этой категории
        transaction_count = Transaction.objects.filter(category=category, user=request.user).count()
        
        if transaction_count > 0:
            return JsonResponse({
                "success": False, 
                "error": f"Нельзя удалить категорию с существующими транзакциями ({transaction_count} шт.)"
            })
        
        category.delete()
        return JsonResponse({"success": True})
    except Category.DoesNotExist:
        return JsonResponse({"success": False, "error": "Категория не найдена"})

@login_required
def get_categories(request):
    categories = Category.objects.filter(user=request.user)
    categories_data = [
        {
            'id': cat.id,
            'name': cat.name,
            'icon': cat.icon,
            'color': cat.color
        }
        for cat in categories
    ]
    return JsonResponse({"categories": categories_data})


@login_required
def delete_transaction(request, transaction_id):
    try:
        transaction = Transaction.objects.get(id=transaction_id, user=request.user)
        
        # Сохраняем данные для пересчета балансов
        transaction_type = transaction.type
        transaction_amount = transaction.amount
        transaction_reserve = transaction.reserve_amount
        
        transaction.delete()
        
        # ПЕРЕСЧИТЫВАЕМ БАЛАНСЫ ПОСЛЕ УДАЛЕНИЯ
        transactions = Transaction.objects.filter(user=request.user)
        income_result = transactions.filter(type='income').aggregate(total=Sum('amount'))
        expense_result = transactions.filter(type='expense').aggregate(total=Sum('amount'))
        reserve_result = transactions.filter(type='income').aggregate(total=Sum('reserve_amount'))
        
        income = income_result['total'] or Decimal('0')
        expense = expense_result['total'] or Decimal('0')
        total_reserve = reserve_result['total'] or Decimal('0')
        total = income - expense - total_reserve
        
        # РАСЧЕТ РЕЗЕРВА ЗА ТЕКУЩИЙ МЕСЯЦ
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_reserve_result = Transaction.objects.filter(
            user=request.user,
            type='income',
            created_at__gte=month_start
        ).aggregate(total=Sum('reserve_amount'))
        monthly_reserve = month_reserve_result['total'] or Decimal('0')
        
        return JsonResponse({
            "success": True,
            "updated_balances": {
                "total": float(total),
                "income": float(income),
                "expense": float(expense),
                "total_reserve": float(total_reserve),
                "monthly_reserve": float(monthly_reserve)  # добавляем месячный резерв
            }
        })
    except Transaction.DoesNotExist:
        return JsonResponse({"success": False, "error": "Транзакция не найдена"})



def generate_random_password(length=12):
    """Генерация случайного пароля"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choice(characters) for i in range(length))


def register(request):
    if request.method == 'POST':
        try:
            username = request.POST.get('username', '').strip()
            
            # Проверка ограничения по времени
            client_ip = request.META.get('REMOTE_ADDR', 'unknown')
            cache_key = f'registration_limit_{client_ip}'
            
            last_registration = cache.get(cache_key)
            if last_registration:
                time_passed = timezone.now() - last_registration
                if time_passed < timedelta(minutes=2):
                    return JsonResponse({
                        "success": False, 
                        "error": "С одного устройства можно регистрироваться только 1 раз в 60 минут!"
                    })
            
            if not username:
                return JsonResponse({"success": False, "error": "Введите логин"})
            
            if len(username) < 3:
                return JsonResponse({"success": False, "error": "Логин должен быть не менее 3 символов"})
            
            if User.objects.filter(username=username).exists():
                return JsonResponse({"success": False, "error": "Пользователь с таким логином уже существует"})
            
            # Генерация случайного пароля
            password = generate_random_password()
            
            # Создаем пользователя
            user = User.objects.create_user(
                username=username,
                password=password
            )
            
            # Профиль создается автоматически через сигнал
            
            # Сохраняем время регистрации в кэш
            cache.set(cache_key, timezone.now(), 60 * 10)
            
            # Создаем категории по умолчанию
            create_default_categories(user)
            
            # Автоматически авторизуем пользователя
            login(request, user)
            
              # Устанавливаем флаг для показа приветствия
            request.session['is_new_user'] = True

            return JsonResponse({
                "success": True, 
                "message": "Аккаунт успешно создан",
                "username": username
            })
            
        except Exception as e:
            print(f"Ошибка при регистрации: {str(e)}")
            return JsonResponse({"success": False, "error": f"Ошибка при создании аккаунта: {str(e)}"})
    
    return JsonResponse({"success": False, "error": "Неверный метод запроса"})


@login_required
def change_password(request):
    if request.method == 'POST':
        try:
            new_password = request.POST.get('new_password')
            confirm_password = request.POST.get('confirm_password')
            current_password = request.POST.get('current_password')  # Для повторной смены
            
            print(f"=== СМЕНА ПАРОЛЯ ===")
            print(f"Пользователь: {request.user.username}")
            print(f"Пароль уже менялся: {request.user.userprofile.password_changed}")
            
            # Если пользователь уже менял пароль, требуем текущий пароль
            if request.user.userprofile.password_changed:
                if not current_password:
                    return JsonResponse({"success": False, "error": "Введите текущий пароль"})
                
                # Проверяем текущий пароль
                if not request.user.check_password(current_password):
                    return JsonResponse({"success": False, "error": "Неверный текущий пароль"})
            
            if not new_password or not confirm_password:
                return JsonResponse({"success": False, "error": "Заполните все поля"})
            
            if new_password != confirm_password:
                return JsonResponse({"success": False, "error": "Пароли не совпадают"})
            
            if len(new_password) < 6:
                return JsonResponse({"success": False, "error": "Пароль должен быть не менее 6 символов"})
            
            user = request.user
            user.set_password(new_password)
            user.save()
            
            # Отмечаем, что пароль был изменен
            user.userprofile.password_changed = True
            user.userprofile.save()
            
            # Обновляем сессию чтобы пользователь не разлогинился
            from django.contrib.auth import update_session_auth_hash
            update_session_auth_hash(request, user)
            
            print("Пароль успешно изменен")
            return JsonResponse({"success": True, "message": "Пароль успешно изменен"})
            
        except Exception as e:
            print(f"Ошибка при смене пароля: {str(e)}")
            return JsonResponse({"success": False, "error": f"Ошибка при смене пароля: {str(e)}"})
    
    return JsonResponse({"success": False, "error": "Неверный метод запроса"})




@login_required
def get_transactions(request):
    filter_type = request.GET.get('filter', 'week')
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 10))
    category_id = request.GET.get('category', 'all')
    
    # Определяем период фильтрации - ИСПРАВЛЕНО
    now = timezone.now()
    if filter_type == 'day':
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif filter_type == 'week':
        start_date = now - timedelta(days=6)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    elif filter_type == 'month':
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (start_date + timedelta(days=32)).replace(day=1)
        end_date = next_month - timedelta(microseconds=1)

        end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    else:
        start_date = None
        end_date = None
    
    # Получаем транзакции
    transactions = Transaction.objects.filter(user=request.user)
    
    # Фильтруем по категории если выбрана конкретная
    if category_id != 'all':
        transactions = transactions.filter(category_id=category_id)
    
    # Фильтруем по дате если выбран период - ИСПРАВЛЕНО
    if start_date and end_date:
        transactions = transactions.filter(created_at__range=[start_date, end_date])
    elif start_date:  # Для случая "все время" или других фильтров
        transactions = transactions.filter(created_at__gte=start_date)
    
    transactions = transactions.order_by('-created_at')
    
    # Пагинация с обработкой ошибок
    paginator = Paginator(transactions, limit)
    try:
        page_obj = paginator.page(page)
    except EmptyPage:
        # Если страница не существует, возвращаем пустой список
        return JsonResponse({
            'success': True,
            'transactions': [],
            'has_more': False
        })
    except Exception as e:
        # Обработка других ошибок
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
    
    transactions_data = []
    for transaction in page_obj:
        transactions_data.append({
            'id': transaction.id,
            'amount': float(transaction.amount),
            'reserve_amount': float(transaction.reserve_amount),
            'type': transaction.type,
            'description': transaction.description,
            'created_at': transaction.created_at.isoformat(),
            'category_id': transaction.category.id,
            'category_name': transaction.category.name,
            'category_icon': transaction.category.icon,
            'category_color': transaction.category.color,
        })
    
    return JsonResponse({
        'success': True,
        'transactions': transactions_data,
        'has_more': page_obj.has_next(),
        'filter_type': filter_type,  # Добавляем информацию о текущем фильтре
        'total_count': paginator.count  # Добавляем общее количество
    })



@login_required
def get_categories_with_stats(request):
    categories = Category.objects.filter(user=request.user)
    
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    total_income = Transaction.objects.filter(
        user=request.user,
        type='income',
        created_at__gte=month_start
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    categories_data = []
    for category in categories:
        # Сумма расходов по категории за месяц
        category_expense = Transaction.objects.filter(
            user=request.user,
            category=category,
            type='expense',
            created_at__gte=month_start
        )
        total_expense = category_expense.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        transaction_count = category_expense.count()

        # Расчет процента от общего дохода
        percentage = 0
        if total_income > 0 and total_expense > 0:
            percentage = (total_expense / total_income) * 100
        
        categories_data.append({
            'id': category.id,
            'name': category.name,
            'icon': category.icon,
            'color': category.color,
            'expense_amount': float(total_expense),
            'transaction_count': transaction_count,
            'percentage': round(float(percentage), 1)
        })
    
    return JsonResponse({"categories": categories_data})


################# ЗАМЕТКИ ##############

@login_required
def get_notes(request):
    notes = Note.objects.filter(user=request.user).order_by('-created_at')
    notes_data = []
    for note in notes:
        notes_data.append({
            'id': note.id,
            'title': note.title,
            'content': note.content,
            'created_at': note.created_at.isoformat(),
            'reminder_date': note.reminder_date.isoformat() if note.reminder_date else None,
            'is_reminded': note.is_reminded
        })
    
    return JsonResponse({'notes': notes_data})

@login_required
def add_note(request):
    if request.method == "POST":
        try:
            title = request.POST.get("title")
            content = request.POST.get("content", "")
            reminder_date_str = request.POST.get("reminder_date")

            if not title:
                return JsonResponse({"success": False, "error": "Не указан заголовок"})

            # Обрабатываем дату напоминания
            reminder_date = None
            if reminder_date_str:
                try:
                    from datetime import datetime
                    from django.utils import timezone
                    import re
                    
                    # Парсим дату с временной зоной
                    # Формат: YYYY-MM-DDTHH:MM:SS+HH:MM или YYYY-MM-DDTHH:MM:SS-HH:MM
                    if 'T' in reminder_date_str and ('+' in reminder_date_str or '-' in reminder_date_str):
                        # Это дата с временной зоной
                        reminder_date = datetime.fromisoformat(reminder_date_str)
                    else:
                        # Это дата без временной зоны - считаем что это локальное время
                        reminder_date = datetime.strptime(reminder_date_str, '%Y-%m-%d %H:%M:%S')
                        # Делаем дату "aware" с текущим часовым поясом
                        reminder_date = timezone.make_aware(reminder_date)
                    
                    print(f"Parsed reminder date: {reminder_date}")
                    print(f"Reminder date timezone: {reminder_date.tzinfo}")
                        
                except (ValueError, TypeError) as e:
                    print(f"Ошибка преобразования даты: {e}")
                    return JsonResponse({"success": False, "error": f"Неверный формат даты: {e}"})

            note = Note.objects.create(
                user=request.user,
                title=title,
                content=content,
                reminder_date=reminder_date
            )

            # Возвращаем данные созданной заметки
            note_data = {
                'id': note.id,
                'title': note.title,
                'content': note.content,
                'reminder_date': note.reminder_date.isoformat() if note.reminder_date else None,
                'is_reminded': note.is_reminded,
                'created_at': note.created_at.isoformat(),
            }

            return JsonResponse({"success": True, "note": note_data})

        except Exception as e:
            print(f"Ошибка при создании заметки: {str(e)}")
            return JsonResponse({"success": False, "error": f"Внутренняя ошибка сервера: {str(e)}"})

    return JsonResponse({"success": False, "error": "Неверный метод запроса"})

@login_required
def edit_note(request, note_id):
    if request.method == "POST":
        try:
            note = Note.objects.get(id=note_id, user=request.user)
            title = request.POST.get("title")
            content = request.POST.get("content", "")
            reminder_date_str = request.POST.get("reminder_date")

            if not title:
                return JsonResponse({"success": False, "error": "Не указан заголовок"})

            # Обрабатываем дату напоминания
            reminder_date = None
            if reminder_date_str:
                try:
                    from datetime import datetime
                    from django.utils import timezone
                    import re
                    
                    # Парсим дату с временной зоной
                    if 'T' in reminder_date_str and ('+' in reminder_date_str or '-' in reminder_date_str):
                        reminder_date = datetime.fromisoformat(reminder_date_str)
                    else:
                        reminder_date = datetime.strptime(reminder_date_str, '%Y-%m-%d %H:%M:%S')
                        reminder_date = timezone.make_aware(reminder_date)
                    
                    print(f"Parsed reminder date for edit: {reminder_date}")
                    print(f"Reminder date timezone for edit: {reminder_date.tzinfo}")
                        
                except (ValueError, TypeError) as e:
                    print(f"Ошибка преобразования даты: {e}")
                    return JsonResponse({"success": False, "error": f"Неверный формат даты: {e}"})

            note.title = title
            note.content = content
            note.reminder_date = reminder_date
            note.save()

            # Возвращаем обновленные данные заметки
            note_data = {
                'id': note.id,
                'title': note.title,
                'content': note.content,
                'reminder_date': note.reminder_date.isoformat() if note.reminder_date else None,
                'is_reminded': note.is_reminded,
                'created_at': note.created_at.isoformat(),
            }

            return JsonResponse({"success": True, "note": note_data})

        except Note.DoesNotExist:
            return JsonResponse({"success": False, "error": "Заметка не найдена"})
        except Exception as e:
            print(f"Ошибка при редактировании заметки: {str(e)}")
            return JsonResponse({"success": False, "error": f"Внутренняя ошибка сервера: {str(e)}"})

    return JsonResponse({"success": False, "error": "Неверный метод запроса"})

@login_required
def delete_note(request, note_id):
    try:
        note = Note.objects.get(id=note_id, user=request.user)
        note.delete()
        return JsonResponse({"success": True})
    except Note.DoesNotExist:
        return JsonResponse({"success": False, "error": "Заметка не найдена"})

@login_required
def mark_note_as_reminded(request, note_id):
    try:
        note = Note.objects.get(id=note_id, user=request.user)
        note.is_reminded = True
        note.save()
        
        # Возвращаем обновленные данные заметки
        note_data = {
            'id': note.id,
            'title': note.title,
            'content': note.content,
            'reminder_date': note.reminder_date.isoformat() if note.reminder_date else None,
            'is_reminded': note.is_reminded,
            'created_at': note.created_at.isoformat(),
        }
        
        return JsonResponse({"success": True, "note": note_data})
    except Note.DoesNotExist:
        return JsonResponse({"success": False, "error": "Заметка не найдена"})

@login_required 
def get_pending_reminders(request):
    """Получение ожидающих напоминаний ТОЛЬКО для текущего пользователя"""
    try:
        now = timezone.now()
        reminders = Note.objects.filter(
            user=request.user,  # ДОБАВЬТЕ ЭТУ СТРОЧКУ - фильтр по текущему пользователю
            reminder_date__lte=now,
            is_reminded=False
        ).select_related('user')
        
        reminders_data = []
        for reminder in reminders:
            reminders_data.append({
                'id': reminder.id,
                'title': reminder.title,
                'content': reminder.content,
                'reminder_date': reminder.reminder_date.isoformat(),
                'created_at': reminder.created_at.isoformat()
            })
            
       
            
        return JsonResponse({
            'success': True,
            'reminders': reminders_data
        })
        
    except Exception as e:
        print(f"Ошибка при получении напоминаний: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        })
    
@login_required
def get_category_stats(request, category_id):
    try:
        period = request.GET.get('period', 'month')  # Получаем период из запроса
        print(f"=== GET_CATEGORY_STATS called for category_id: {category_id}, period: {period} ===")
        
        category = Category.objects.get(id=category_id, user=request.user)
        
        # Определяем временной диапазон на основе периода
        today = timezone.now()
        if period == 'day':
            start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
            period_name = 'день'
        elif period == 'week':
            start_date = today - timedelta(days=7)
            period_name = 'неделю'
        elif period == '3months':
            start_date = today - timedelta(days=90)
            period_name = '3 месяца'
        elif period == 'year':
            start_date = today - timedelta(days=365)
            period_name = 'год'
        else:  # month (по умолчанию)
            start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            period_name = 'месяц'
        
        print(f"Period: {period_name}, Start date: {start_date}")
        
        # Получаем расходы в этой категории за выбранный период
        period_expenses = Transaction.objects.filter(
            user=request.user,
            category=category,
            type='expense',
            created_at__gte=start_date
        )
        
        # Сумма расходов по категории за период
        total_expense = period_expenses.aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Количество операций в категории за период
        transactions_count = period_expenses.count()
        
        # Средний чек за период
        average_amount = total_expense / transactions_count if transactions_count > 0 else 0
        
        # Общие доходы за период
        period_income = Transaction.objects.filter(
            user=request.user,
            type='income',
            created_at__gte=start_date
        ).aggregate(Sum('amount'))['amount__sum'] or 1
        
        # Процент от доходов за период
        income_percentage = (total_expense / period_income * 100) if period_income > 0 else 0
        
        # Транзакции за сегодня (отдельно для списка)
        today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
        daily_expenses = period_expenses.filter(created_at__gte=today_start).order_by('-created_at')
        
        transactions_data = []
        for expense in daily_expenses:
            transactions_data.append({
                'id': expense.id,
                'amount': float(expense.amount),
                'description': expense.description or 'Без описания',
                'created_at': expense.created_at.isoformat(),
            })
        
        response_data = {
            'success': True,
            'category': {
                'id': category.id,
                'name': category.name,
                'icon': category.icon or 'fas fa-tag',
                'color': category.color or '#3b82f6',
            },
            'total_expense': float(total_expense),
            'transactions_count': transactions_count,
            'average_amount': round(float(average_amount), 2),
            'income_percentage': round(float(income_percentage), 1),
            'period_income': float(period_income),
            'period': period_name,  # Для отладки
            'transactions': transactions_data,
            'has_transactions': period_expenses.exists(),
            'daily_transactions_count': len(transactions_data)
        }
        
        print(f"✅ Final response for {period_name}: {response_data}")
        return JsonResponse(response_data)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})




@require_POST
@login_required
def mark_all_notifications_read(request):
    try:
        # Помечаем все непрочитанные уведомления пользователя как прочитанные
        updated_count = UserNotification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        
        return JsonResponse({
            'success': True,
            'message': f'Отмечено как прочитано: {updated_count} уведомлений',
            'updated_count': updated_count
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)




@staff_member_required
@login_required
def get_admin_stats(request):
    """Получение статистики для админ-панели"""
    try:
        print(f"=== GET_ADMIN_STATS called by {request.user.username} ===")
        
        # Общее количество пользователей
        total_users = User.objects.count()

        # Пользователи, зарегистрированные за последние 7 дней
        week_ago = timezone.now() - timedelta(days=7)
        new_users_week = User.objects.filter(date_joined__gte=week_ago).count()

        # Активные сегодня (входили сегодня)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        active_today = User.objects.filter(last_login__gte=today_start).count()

        # Последние 5 зарегистрированных пользователей
        recent_users = User.objects.order_by('-date_joined')[:5]
        recent_users_data = []
        for user in recent_users:
            recent_users_data.append({
                'username': user.username,
                'date_joined': user.date_joined
            })

        stats = {
            'total_users': total_users,
            'new_users_week': new_users_week,
            'active_today': active_today,
            'recent_users': recent_users_data
        }

        print(f"Stats: {stats}")
        
        return JsonResponse({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        print(f"Error in get_admin_stats: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})

@staff_member_required
@login_required
def get_admin_users(request):
    """Получение списка пользователей с пагинацией"""
    try:
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 10))

        print(f"=== GET_ADMIN_USERS called, page: {page}, limit: {limit} ===")

        users = User.objects.all().order_by('-date_joined')
        paginator = Paginator(users, limit)

        try:
            page_obj = paginator.page(page)
        except EmptyPage:
            return JsonResponse({
                'success': True,
                'users': [],
                'has_more': False
            })

        users_data = []
        for user in page_obj:
            # Получаем профиль пользователя (если есть)
            profile = getattr(user, 'userprofile', None)
            
            # Считаем количество транзакций и категорий
            transactions_count = Transaction.objects.filter(user=user).count()
            categories_count = Category.objects.filter(user=user).count()
            
            # Получаем баланс (доходы - расходы - резерв)
            income_result = Transaction.objects.filter(user=user, type='income').aggregate(total=Sum('amount'))
            expense_result = Transaction.objects.filter(user=user, type='expense').aggregate(total=Sum('amount'))
            reserve_result = Transaction.objects.filter(user=user, type='income').aggregate(total=Sum('reserve_amount'))
            
            income = income_result['total'] or Decimal('0')
            expense = expense_result['total'] or Decimal('0')
            reserve = reserve_result['total'] or Decimal('0')
            balance = income - expense - reserve

            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email or 'Не указан',
                'date_joined': user.date_joined,
                'last_login': user.last_login,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
                'transactions_count': transactions_count,
                'categories_count': categories_count,
                'balance': float(balance),
            })

        response_data = {
            'success': True,
            'users': users_data,
            'has_more': page_obj.has_next(),
            'total_pages': paginator.num_pages,
            'current_page': page
        }

        print(f"Returning {len(users_data)} users, has_more: {page_obj.has_next()}")
        
        return JsonResponse(response_data)
        
    except Exception as e:
        print(f"Error in get_admin_users: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})
    






    # Добавьте эти views в views.py

@login_required
def get_todos(request):
    """Получение всех задач пользователя"""
    try:
        todos = Todo.objects.filter(user=request.user)
        todos_data = []
        for todo in todos:
            todos_data.append({
                'id': todo.id,
                'title': todo.title,
                'description': todo.description,
                'is_completed': todo.is_completed,
                'priority': todo.priority,
                'created_at': todo.created_at.isoformat(),
                'updated_at': todo.updated_at.isoformat(),
            })
        
        return JsonResponse({'success': True, 'todos': todos_data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@require_POST
def add_todo(request):
    """Добавление новой задачи"""
    try:
        title = request.POST.get("title")
        description = request.POST.get("description", "")
        priority = request.POST.get("priority", "medium")

        if not title:
            return JsonResponse({"success": False, "error": "Не указан заголовок"})

        todo = Todo.objects.create(
            user=request.user,
            title=title,
            description=description,
            priority=priority
        )

        todo_data = {
            'id': todo.id,
            'title': todo.title,
            'description': todo.description,
            'is_completed': todo.is_completed,
            'priority': todo.priority,
            'created_at': todo.created_at.isoformat(),
            'updated_at': todo.updated_at.isoformat(),
        }

        return JsonResponse({"success": True, "todo": todo_data})

    except Exception as e:
        print(f"Ошибка при создании задачи: {str(e)}")
        return JsonResponse({"success": False, "error": f"Внутренняя ошибка сервера: {str(e)}"})

@login_required
def get_todo(request, todo_id):
    """Получение конкретной задачи"""
    try:
        todo = Todo.objects.get(id=todo_id, user=request.user)
        todo_data = {
            'id': todo.id,
            'title': todo.title,
            'description': todo.description,
            'is_completed': todo.is_completed,
            'priority': todo.priority,
            'created_at': todo.created_at.isoformat(),
            'updated_at': todo.updated_at.isoformat(),
        }
        return JsonResponse({"success": True, "todo": todo_data})
    except Todo.DoesNotExist:
        return JsonResponse({"success": False, "error": "Задача не найдена"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

@login_required
@require_POST
def update_todo(request, todo_id):
    """Обновление задачи"""
    try:
        todo = Todo.objects.get(id=todo_id, user=request.user)
        title = request.POST.get("title")
        description = request.POST.get("description", "")
        priority = request.POST.get("priority", "medium")
        is_completed = request.POST.get("is_completed") == "true"

        if not title:
            return JsonResponse({"success": False, "error": "Не указан заголовок"})

        todo.title = title
        todo.description = description
        todo.priority = priority
        todo.is_completed = is_completed
        todo.save()

        todo_data = {
            'id': todo.id,
            'title': todo.title,
            'description': todo.description,
            'is_completed': todo.is_completed,
            'priority': todo.priority,
            'created_at': todo.created_at.isoformat(),
            'updated_at': todo.updated_at.isoformat(),
        }

        return JsonResponse({"success": True, "todo": todo_data})

    except Todo.DoesNotExist:
        return JsonResponse({"success": False, "error": "Задача не найдена"})
    except Exception as e:
        print(f"Ошибка при обновлении задачи: {str(e)}")
        return JsonResponse({"success": False, "error": f"Внутренняя ошибка сервера: {str(e)}"})

@login_required
@require_POST
def delete_todo(request, todo_id):
    """Удаление задачи"""
    try:
        todo = Todo.objects.get(id=todo_id, user=request.user)
        todo.delete()
        return JsonResponse({"success": True})
    except Todo.DoesNotExist:
        return JsonResponse({"success": False, "error": "Задача не найдена"})

@login_required
@require_POST
def toggle_todo(request, todo_id):
    """Переключение статуса выполнения задачи"""
    try:
        todo = Todo.objects.get(id=todo_id, user=request.user)
        todo.is_completed = not todo.is_completed
        todo.save()
        
        todo_data = {
            'id': todo.id,
            'title': todo.title,
            'description': todo.description,
            'is_completed': todo.is_completed,
            'priority': todo.priority,
            'created_at': todo.created_at.isoformat(),
            'updated_at': todo.updated_at.isoformat(),
        }
        
        return JsonResponse({"success": True, "todo": todo_data})
    except Todo.DoesNotExist:
        return JsonResponse({"success": False, "error": "Задача не найдена"})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})




@staff_member_required
@require_POST
def delete_all_notifications(request):
    """Удаление всех системных уведомлений (админ)"""
    try:
        # Деактивируем все активные уведомления
        notifications = SystemNotification.objects.filter(is_active=True)
        count = notifications.count()
        notifications.update(is_active=False)
        
        return JsonResponse({
            'success': True, 
            'message': f'Удалено {count} уведомлений'
        })
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})




@staff_member_required
@require_POST
def create_system_notification(request):
    """Создание системного уведомления админом"""
    try:
        data = json.loads(request.body)
        title = data.get('title')
        message = data.get('message')
        target_user_id = data.get('target_user_id')  # Новый параметр
        
        if not title or not message:
            return JsonResponse({'success': False, 'error': 'Заполните все поля'})
        
        # Обрабатываем целевого пользователя, если указан
        target_user = None
        if target_user_id:
            try:
                target_user = User.objects.get(id=target_user_id)
            except User.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Пользователь с указанным ID не найден'})
        
        # Создаем системное уведомление
        notification = SystemNotification.objects.create(
            title=title,
            message=message,
            created_by=request.user,
            target_user=target_user  # Может быть None (для всех) или конкретный пользователь
        )
        
        # Создаем записи UserNotification
        if target_user:
            # Персональное уведомление - только для указанного пользователя
            UserNotification.objects.create(
                user=target_user,
                notification=notification
            )
            
            # Автоматически создаем чат и первое сообщение от админа
            chat = NotificationChat.objects.create(notification=notification)
            ChatMessage.objects.create(
                chat=chat,
                user=request.user,  # Админ
                message=f"{message}"  # Первое сообщение от админа
            )
            
            users_count = 1
            message_type = "персональное уведомление отправлено"
        else:
            # Общее уведомление - для всех пользователей
            users = User.objects.all()
            user_notifications = [
                UserNotification(user=user, notification=notification)
                for user in users
            ]
            UserNotification.objects.bulk_create(user_notifications)
            users_count = len(users)
            message_type = "уведомление отправлено всем пользователям"
        
        
        return JsonResponse({
            'success': True, 
            'message': f'{message_type} для {users_count} пользователей',
            'is_personal': target_user is not None
        })
        
    except Exception as e:
        print(f"Error creating system notification: {str(e)}")
        return JsonResponse({'success': False, 'error': str(e)})


@staff_member_required
@require_POST
def delete_chat_completely(request, notification_id):
    """Полное удаление чата, сообщений и уведомления"""
    try:
        notification = SystemNotification.objects.get(id=notification_id, created_by=request.user)
        
        # Удаляем все связанные данные
        with transaction.atomic():
            # Удаляем чат и сообщения
            NotificationChat.objects.filter(notification=notification).delete()
            
            # Удаляем UserNotification для всех пользователей
            UserNotification.objects.filter(notification=notification).delete()
            
            # Удаляем само уведомление
            notification.delete()
        
        return JsonResponse({'success': True, 'message': 'Чат полностью удален'})
        
    except SystemNotification.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Уведомление не найдено'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

