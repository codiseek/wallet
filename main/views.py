import json 
import re
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .models import Category, Transaction, Debt, DebtPayment
from decimal import Decimal, InvalidOperation
from django.db.models import Sum
from django.db import transaction
from django.db import IntegrityError  
import random
import string
from django.core.cache import cache
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import datetime, date, timedelta
from django.contrib.auth.models import User 
from django.core.paginator import Paginator
from django.conf import settings
from django_user_agents.utils import get_user_agent
from django.db.models import Sum, Count, Q
from webpush import send_user_notification
from webpush import send_group_notification
from .models import Note
from django.core.cache import cache
from .models import Debt
from .forms import DebtForm
from django.views.decorators.http import require_http_methods
from .models import SystemNotification, UserNotification
from django.contrib.admin.views.decorators import staff_member_required
from django.core.paginator import Paginator, EmptyPage
import uuid
from django.core.files.storage import default_storage
from django.http import HttpResponseRedirect
from django.utils import translation
from django.contrib.sessions.models import Session
import pytz
from main.models import Transaction, Category
from .models import DebtPayment


from .models import (
    Category, Transaction, UserProfile, Note, 
    SystemNotification, UserNotification,
    NotificationChat, ChatMessage, Todo
)

@login_required
@csrf_exempt
@require_POST
def add_debt_payment(request, debt_id):
    try:
        debt = Debt.objects.get(id=debt_id, user=request.user)
        payment_amount = Decimal(request.POST.get('payment_amount', '0'))
        note = request.POST.get('note', '').strip()

        if payment_amount <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Сумма платежа должна быть больше 0'
            })

        if payment_amount > debt.remaining_amount:
            return JsonResponse({
                'success': False,
                'error': f'Сумма платежа не может превышать оставшуюся сумму ({debt.remaining_amount})'
            })

        # Создаем запись о платеже
        payment = DebtPayment.objects.create(
            debt=debt,
            amount=payment_amount,
            note=note
        )

        # Обновляем сумму погашения в долге
        debt.paid_amount += payment_amount
        debt.update_status()

        # Получаем обновленные данные долга
        debts_data = get_debt_data(debt)

        return JsonResponse({
            'success': True,
            'message': f'Платеж на сумму {payment_amount} успешно добавлен',
            'debt': debts_data,  # Убедитесь, что это поле есть
            'payment': {
                'id': payment.id,
                'amount': float(payment.amount),
                'payment_date': payment.payment_date.isoformat(),
                'note': payment.note or ''
            }
        })

    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Долг не найден'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Ошибка при добавлении платежа: {str(e)}'
        })
    




@login_required
@csrf_exempt
@require_POST
def pay_full_debt(request, debt_id):
    """Полное погашение долга"""
    try:
        debt = Debt.objects.get(id=debt_id, user=request.user)
        
        if debt.remaining_amount <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Платеж уже полностью оплачен'
            })

        # Создаем запись о полном платеже
        payment = DebtPayment.objects.create(
            debt=debt,
            amount=debt.remaining_amount,
            note='Полная оплата платежа'
        )

        # Обновляем долг
        debt.paid_amount = debt.amount
        debt.update_status()

        # Получаем обновленные данные долга
        debts_data = get_debt_data(debt)

        return JsonResponse({
            'success': True,
            'message': f'Платеж полностью оплачен на сумму {debt.amount}',
            'debt': debts_data,
            'payment': {
                'id': payment.id,
                'amount': float(payment.amount),
                'payment_date': payment.payment_date.isoformat(),
                'note': payment.note
            }
        })

    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Платеж не найден'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Ошибка при оплате платежа: {str(e)}'
        })

@login_required
def get_debt_payments(request, debt_id):
    """Получение истории платежей по долгу"""
    try:
        debt = Debt.objects.get(id=debt_id, user=request.user)
        payments = debt.payments.all().order_by('-payment_date')
        
        payments_data = []
        for payment in payments:
            payments_data.append({
                'id': payment.id,
                'amount': float(payment.amount),
                'payment_date': payment.payment_date.strftime('%d.%m.%Y %H:%M'),
                'note': payment.note or ''
            })
        
        return JsonResponse({
            'success': True,
            'payments': payments_data
        })
        
    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Платеж не найден'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

def get_debt_data(debt):
    """Вспомогательная функция для получения данных долга"""
    days_remaining = None
    is_overdue = False
    
    if debt.status in ['active', 'delay_7', 'partially_paid']:
        today = timezone.now().date()
        days_remaining = (debt.due_date - today).days
        is_overdue = debt.due_date < today
    
    return {
        'id': debt.id,
        'debtor_name': debt.debtor_name,
        'phone': debt.phone or 'Не указан',
        'address': debt.address or 'Не указан',
        'amount': float(debt.amount),
        'paid_amount': float(debt.paid_amount),
        'remaining_amount': float(debt.remaining_amount),
        'due_date': debt.due_date.strftime('%d.%m.%Y'),
        'description': debt.description or '',
        'status': debt.status,
        'status_display': debt.get_status_display(),
        'days_remaining': days_remaining,
        'is_overdue': is_overdue,
        'created_at': debt.created_at.strftime('%d.%m.%Y %H:%M'),
    }



def check_overdue_debts():
    """Проверка просроченных долгов и создание уведомлений"""
    try:
        today = timezone.now().date()
        overdue_debts = Debt.objects.filter(
            due_date__lt=today,
            status__in=['active', 'delay_7'],
            overdue_notification_sent=False
        ).select_related('user')
        
        for debt in overdue_debts:
            # Создаем системное уведомление о просрочке
            notification = SystemNotification.objects.create(
                title='Просроченный платеж!',
                message=f'Платеж от {debt.debtor_name} на сумму {debt.amount} не оплачен. Срок оплаты был {debt.due_date.strftime("%d.%m.%Y")}.',
                created_by=debt.user,  # Владелец долга создает уведомление себе
                target_user=debt.user,  # Персональное уведомление
                has_chat=True  # Разрешаем обсуждение в чате
            )
            
            # Создаем запись UserNotification
            UserNotification.objects.create(
                user=debt.user,
                notification=notification
            )
            
            # Создаем чат для обсуждения просрочки
            chat = NotificationChat.objects.create(notification=notification)
            
            # Первое сообщение в чат от системы
            ChatMessage.objects.create(
                chat=chat,
                user=debt.user,
                message=f"Платеж от {debt.debtor_name} не оплачен. Сумма: {debt.amount}. Срок был: {debt.due_date.strftime('%d.%m.%Y')}."
            )
            
            # Помечаем, что уведомление отправлено
            debt.overdue_notification_sent = True
            debt.last_overdue_check = timezone.now()
            debt.save()
            
            print(f"Создано уведомление о просрочке для долга {debt.id}")
        
        return f"Проверено {len(overdue_debts)} просроченных платежей"
        
    except Exception as e:
        print(f"Ошибка при проверке просроченных долгов: {str(e)}")
        return f"Ошибка: {str(e)}"

@staff_member_required
@login_required
def trigger_overdue_check(request):
    """Ручной запуск проверки просроченных долгов (для админа)"""
    try:
        result = check_overdue_debts()
        return JsonResponse({'success': True, 'message': result})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
def debt_list(request):
    """Получить список долгов с фильтрацией - ОБНОВЛЕННАЯ ЛОГИКА"""
    try:
        filter_type = request.GET.get('filter', 'active')
        
        debts = Debt.objects.filter(user=request.user)
        
        if filter_type == 'active':
            # Активные - все кроме полностью погашенных (включая частично погашенные и отсроченные)
            debts = debts.exclude(status='paid')
        elif filter_type == 'overdue':
            # Просроченные - активные долги с просроченной датой
            debts = debts.filter(
                status__in=['active', 'delay_7', 'partially_paid'], 
                due_date__lt=timezone.now().date()
            )
        elif filter_type == 'paid':
            # Погашенные - только долги со статусом paid
            debts = debts.filter(status='paid')
        
        debts_data = []
        for debt in debts:
            debts_data.append(get_debt_data(debt))
        
        print(f"Returning {len(debts_data)} debts for filter '{filter_type}'")
        return JsonResponse({'success': True, 'debts': debts_data})
    
    except Exception as e:
        print(f"Error in debt_list: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)})    



@login_required
@csrf_exempt
def create_debt(request):
    """Создать новый долг - ОЧИЩЕННАЯ ВЕРСИЯ"""
    try:
        # Получаем данные из POST
        debtor_name = request.POST.get('debtor_name', '').strip()
        phone = request.POST.get('phone', '').strip()
        address = request.POST.get('address', '').strip()
        amount = request.POST.get('amount', '0')
        due_date_str = request.POST.get('due_date', '')
        description = request.POST.get('description', '').strip()

        # Проверка авторизации
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'error': 'Пользователь не авторизован'
            })

        # Валидация обязательных полей
        if not debtor_name or len(debtor_name) < 2:
            return JsonResponse({
                'success': False,
                'error': 'ФИО должника обязательно (минимум 2 символа)'
            })

        try:
            amount_decimal = Decimal(amount)
            if amount_decimal <= Decimal('0'):
                return JsonResponse({
                    'success': False,
                    'error': 'Сумма долга должна быть больше 0'
                })
        except (ValueError, InvalidOperation):
            return JsonResponse({
                'success': False,
                'error': 'Некорректная сумма долга'
            })

        if not due_date_str:
            return JsonResponse({
                'success': False,
                'error': 'Укажите срок возврата'
            })

        try:
            from datetime import datetime
            due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
           
           
        except ValueError:
            return JsonResponse({
                'success': False,
                'error': 'Некорректный формат даты'
            })

        # Создаем объект долга
        debt = Debt(
            user=request.user,
            debtor_name=debtor_name,
            phone=phone if phone else None,
            address=address if address else None,
            amount=amount_decimal,
            due_date=due_date,
            description=description if description else None,
            status='active'
        )

        # Сохраняем
        debt.save()
        
        # Проверяем, что объект сохранился
        saved_debt = Debt.objects.filter(id=debt.id).first()
        if not saved_debt:
            return JsonResponse({
                'success': False,
                'error': 'Долг не был сохранен в базу данных'
            })

        return JsonResponse({
            'success': True,
            'message': 'Долг успешно добавлен',
            'debt': {
                'id': debt.id,
                'debtor_name': debt.debtor_name,
                'phone': debt.phone or 'Не указан',
                'address': debt.address or 'Не указан',
                'amount': float(debt.amount),
                'due_date': debt.due_date.strftime('%d.%m.%Y'),
                'description': debt.description or '',
                'status': debt.status,
            }
        })
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Внутренняя ошибка сервера: {str(e)}'
        })
    


@login_required
@csrf_exempt
def update_debt_status(request, debt_id):
    """Универсальный метод для изменения статуса долга"""
    try:
        debt = Debt.objects.get(id=debt_id, user=request.user)
        new_status = request.POST.get('status')
        
        # Проверяем допустимые статусы
        valid_statuses = ['active', 'paid', 'delay_7']
        if new_status not in valid_statuses:
            return JsonResponse({
                'success': False,
                'message': f'Неверный статус. Допустимые значения: {", ".join(valid_statuses)}'
            })
        
        # Если устанавливаем отсрочку 7 дней, обновляем дату возврата
        if new_status == 'delay_7':
            debt.due_date = debt.due_date + timedelta(days=7)
        
        debt.status = new_status
        debt.save()
        
        # Формируем сообщение в зависимости от статуса
        status_messages = {
            'active': 'Долг отмечен как активный',
            'paid': 'Долг отмечен как погашенный', 
            'delay_7': 'Добавлено 7 дней отсрочки'
        }
        
        return JsonResponse({
            'success': True,
            'message': status_messages.get(new_status, 'Статус обновлен')
        })
        
    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Долг не найден'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Ошибка при изменении статуса: {str(e)}'
        })
    

# Добавьте этот метод в views.py
@login_required
@csrf_exempt
@require_POST
def delete_debt(request, debt_id):
    """Удаление долга"""
    try:
        debt = Debt.objects.get(id=debt_id, user=request.user)
        debtor_name = debt.debtor_name
        debt.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'Должник {debtor_name} успешно удален'
        })
        
    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Долг не найден'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Ошибка при удалении: {str(e)}'
        })
    


@login_required
def debt_statistics(request):
    """Получить статистику по долгам - ОБНОВЛЕННАЯ ЛОГИКА"""
    try:
        debts = Debt.objects.filter(user=request.user)
        
        # ОБЩАЯ СУММА: только активные долги (active + delay_7 + partially_paid) - оставшаяся сумма
        active_debts = debts.filter(status__in=['active', 'delay_7', 'partially_paid'])
        total_amount = sum([debt.remaining_amount for debt in active_debts])
        
        # ПРОСРОЧЕНО: только активные долги с просроченной датой - оставшаяся сумма
        overdue_debts = active_debts.filter(due_date__lt=timezone.now().date())
        overdue_amount = sum([debt.remaining_amount for debt in overdue_debts])
        
        # ПОГАШЕНО: сумма всех платежей по всем долгам
        paid_amount = sum([debt.paid_amount for debt in debts])
        
        print(f"Statistics - Active Total: {total_amount}, Overdue: {overdue_amount}, Paid: {paid_amount}")
        
        return JsonResponse({
            'success': True,
            'total_amount': float(total_amount),
            'overdue_amount': float(overdue_amount),
            'paid_amount': float(paid_amount),
        })
    except Exception as e:
        print(f"Error in debt_statistics: {e}")
        return JsonResponse({'success': False, 'error': str(e)})


@staff_member_required
@require_POST
def create_system_notification(request):
    """Создание системного уведомления админом с обложкой"""
    try:
        # Используем request.POST и request.FILES для обработки формы с файлами
        title = request.POST.get('title')
        message = request.POST.get('message')
        target_user_id = request.POST.get('target_user_id')
        cover_image = request.FILES.get('cover_image')  # Получаем загруженный файл
        
        if not title or not message:
            return JsonResponse({'success': False, 'error': 'Заполните все поля'})
        
        # Обрабатываем целевого пользователя, если указан
        target_user = None
        if target_user_id:
            try:
                target_user = User.objects.get(id=target_user_id)
            except User.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Пользователь с указанным ID не найден'})
        
        # Создаем системное уведомление с картинкой
        notification = SystemNotification.objects.create(
            title=title,
            message=message,
            created_by=request.user,
            target_user=target_user,
            cover_image=cover_image  # Сохраняем картинку
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
    """Получение уведомлений пользователя с проверкой просроченных долгов"""
    try:
        # ПРОВЕРКА ПРОСРОЧЕННЫХ ДОЛГОВ
        today = timezone.now().date()
        overdue_debts = Debt.objects.filter(
            user=request.user,
            due_date__lt=today,
            status__in=['active', 'delay_7'],
            overdue_notification_sent=False
        )
        
        for debt in overdue_debts:
            # Создаем уведомление о просрочке с ID долга в сообщении
            notification = SystemNotification.objects.create(
                title='🔔 Просроченный долг',
                message=f'Долг от {debt.debtor_name} на сумму {debt.amount} просрочен. Срок возврата был {debt.due_date.strftime("%d.%m.%Y")}. [DEBT_ID:{debt.id}]',
                created_by=request.user,
                target_user=request.user,
                has_chat=False
            )
            
            # Создаем запись UserNotification
            UserNotification.objects.create(
                user=request.user,
                notification=notification
            )
            
            # Помечаем, что уведомление отправлено
            debt.overdue_notification_sent = True
            debt.save()
        
        # ОСТАЛЬНАЯ ЛОГИКА ПОЛУЧЕНИЯ УВЕДОМЛЕНИЙ
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
            has_chat = NotificationChat.objects.filter(
                notification=user_notif.notification
            ).exists()
            
            is_overdue_debt = 'просрочен' in user_notif.notification.title.lower()
            
            # Для уведомлений о просрочке получаем данные долга
            debt_data = None
            if is_overdue_debt:
                import re
                debt_id_match = re.search(r'\[DEBT_ID:(\d+)\]', user_notif.notification.message)
                if debt_id_match:
                    debt_id = debt_id_match.group(1)
                    try:
                        debt = Debt.objects.get(id=debt_id, user=request.user)
                        debt_data = {
                            'id': debt.id,
                            'phone': debt.phone,
                            'debtor_name': debt.debtor_name,
                            'amount': float(debt.amount),
                            'due_date': debt.due_date.strftime('%d.%m.%Y')
                        }
                    except Debt.DoesNotExist:
                        print(f"Долг с ID {debt_id} не найден")
            
            # ПОЛУЧАЕМ URL КАРТИНКИ ЕСЛИ ОНА ЕСТЬ
            cover_image_url = None
            if user_notif.notification.cover_image:
                cover_image_url = user_notif.notification.cover_image.url
            
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
                'is_admin_chat': False,
                'is_overdue_debt': is_overdue_debt,
                'debt_data': debt_data,
                'cover_image': cover_image_url  # ДОБАВЛЯЕМ URL КАРТИНКИ
            })
            
            if not user_notif.is_read:
                unread_count += 1
        
        # Сортируем: сначала непрочитанные, потом по дате (новые сверху)
        notifications_data.sort(key=lambda x: (not x['is_read'], x['created_at']), reverse=True)
        
        return JsonResponse({
            'success': True,
            'notifications': notifications_data,
            'unread_count': unread_count
        })
        
    except Exception as e:
        print(f"Ошибка в get_user_notifications: {str(e)}")
        import traceback
        traceback.print_exc()
        # В случае ошибки возвращаем unread_count = 0
        return JsonResponse({
            'success': False, 
            'error': 'Ошибка загрузки уведомлений',
            'unread_count': 0  # ДОБАВЛЯЕМ ЗНАЧЕНИЕ ПО УМОЛЧАНИЮ
        }) 


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
        
        if currency not in ['c', 'r', '$', '€', '₸', '₴']:
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
    """Создает категории по умолчанию для пользователя атомарно"""
    try:
        with transaction.atomic():
            # Проверяем, создавались ли уже дефолтные категории
            if hasattr(user, 'userprofile') and user.userprofile.default_categories_created:
                return
            
            # Если у пользователя уже есть категории - ничего не создаем
            if Category.objects.filter(user=user).exists():
                return
            
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
                
    except Exception as e:
        print(f"Ошибка при создании категорий по умолчанию: {e}")



@login_required
def index(request):

     # Устанавливаем язык из профиля пользователя
    if hasattr(request.user, 'userprofile') and request.user.userprofile.language:
        language = request.user.userprofile.language
        translation.activate(language)

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

            # СОЗДАЕМ ТРАНЗАКЦИЮ С transaction_date
            transaction = Transaction.objects.create(
                user=request.user,
                type=type_,
                amount=amount_decimal,
                category=category,
                description=description,
                reserve_amount=reserve_amount,
                transaction_date=timezone.now()  # Добавляем текущую дату и время
            )
            
            # ПЕРЕСЧИТЫВАЕМ БАЛАНСЫ С УЧЕТОМ РЕЗЕРВА (используем transaction_date для фильтрации)
            transactions = Transaction.objects.filter(user=request.user)
            income_result = transactions.filter(type='income').aggregate(total=Sum('amount'))
            expense_result = transactions.filter(type='expense').aggregate(total=Sum('amount'))
            reserve_result = transactions.filter(type='income').aggregate(total=Sum('reserve_amount'))
            
            income = income_result['total'] or Decimal('0')
            expense = expense_result['total'] or Decimal('0')
            total_reserve = reserve_result['total'] or Decimal('0')
            total = income - expense - total_reserve
            
            # РАСЧЕТ РЕЗЕРВА ЗА ТЕКУЩИЙ МЕСЯЦ (используем transaction_date вместо created_at)
            now = timezone.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_reserve_result = Transaction.objects.filter(
                user=request.user,
                type='income',
                transaction_date__gte=month_start  # Заменяем created_at на transaction_date
            ).aggregate(total=Sum('reserve_amount'))
            monthly_reserve = month_reserve_result['total'] or Decimal('0')
            
            # Возвращаем данные о созданной транзакции для динамического обновления
            transaction_data = {
                'id': transaction.id,
                'type': transaction.type,
                'amount': float(transaction.amount),
                'reserve_amount': float(reserve_amount),
                'description': transaction.description,
                'transaction_date': transaction.transaction_date.isoformat(),  # Используем transaction_date
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
                    "monthly_reserve": float(monthly_reserve)
                }
            })
            
        except Category.DoesNotExist:
            return JsonResponse({"success": False, "error": "Категория не найдена"})
        except Exception as e:
            print(f"Ошибка при создании транзакции: {str(e)}")
            return JsonResponse({"success": False, "error": f"Внутренняя ошибка сервера: {str(e)}"})

    return JsonResponse({"success": False, "error": "Неверный метод запроса"})


@login_required
@require_POST
def delete_all_transactions_and_categories(request):
    """Удаление всех транзакций и категорий пользователя"""
    try:
        user = request.user
        
        # Удаляем все транзакции пользователя
        transactions_count = Transaction.objects.filter(user=user).count()
        Transaction.objects.filter(user=user).delete()
        
        # Удаляем все категории пользователя
        categories_count = Category.objects.filter(user=user).count()
        Category.objects.filter(user=user).delete()
        
        print(f"✅ Удалено {transactions_count} транзакций и {categories_count} категорий для пользователя {user.username}")
        
        return JsonResponse({
            'success': True,
            'message': f'Все данные успешно удалены: {transactions_count} транзакций и {categories_count} категорий'
        })
        
    except Exception as e:
        print(f"❌ Ошибка при удалении транзакций и категорий: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Ошибка при удалении: {str(e)}'
        })

        
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
        
        # РАСЧЕТ РЕЗЕРВА ЗА ТЕКУЩИЙ МЕСЯЦ (используем transaction_date вместо created_at)
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_reserve_result = Transaction.objects.filter(
            user=request.user,
            type='income',
            transaction_date__gte=month_start  # Заменяем created_at на transaction_date
        ).aggregate(total=Sum('reserve_amount'))
        monthly_reserve = month_reserve_result['total'] or Decimal('0')
        
        return JsonResponse({
            "success": True,
            "updated_balances": {
                "total": float(total),
                "income": float(income),
                "expense": float(expense),
                "total_reserve": float(total_reserve),
                "monthly_reserve": float(monthly_reserve)
            }
        })
    except Transaction.DoesNotExist:
        return JsonResponse({"success": False, "error": "Транзакция не найдена"})
    


def generate_random_password(length=12):
    """Генерация случайного пароля"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(random.choice(characters) for i in range(length))


@staff_member_required
@login_required
def get_last_user_details(request):
    """Получение детальной информации о последнем зарегистрированном пользователе"""
    try:
        # Получаем последнего пользователя
        last_user = User.objects.order_by('-date_joined').first()
        
        if not last_user:
            return JsonResponse({
                'success': False,
                'error': 'Пользователи не найдены'
            })
        
        # Собираем статистику пользователя
        transactions_count = Transaction.objects.filter(user=last_user).count()
        categories_count = Category.objects.filter(user=last_user).count()
        notes_count = Note.objects.filter(user=last_user).count()
        todos_count = Todo.objects.filter(user=last_user).count()
        debts_count = Debt.objects.filter(user=last_user).count()
        
        # Расчет баланса
        income_result = Transaction.objects.filter(user=last_user, type='income').aggregate(total=Sum('amount'))
        expense_result = Transaction.objects.filter(user=last_user, type='expense').aggregate(total=Sum('amount'))
        reserve_result = Transaction.objects.filter(user=last_user, type='income').aggregate(total=Sum('reserve_amount'))
        
        income = income_result['total'] or Decimal('0')
        expense = expense_result['total'] or Decimal('0')
        reserve = reserve_result['total'] or Decimal('0')
        balance = income - expense - reserve
        
        # Получаем профиль пользователя
        profile = getattr(last_user, 'userprofile', None)
        
        # РАСЧЕТ ПОСЛЕДНЕЙ АКТИВНОСТИ ПО ВСЕМ МОДЕЛЯМ
        last_activity = None
        
        # Проверяем последнюю транзакцию
        last_transaction = Transaction.objects.filter(user=last_user).order_by('-created_at').first()
        if last_transaction and last_transaction.created_at:
            last_activity = last_transaction.created_at
        
        # Проверяем последнюю заметку
        last_note = Note.objects.filter(user=last_user).order_by('-created_at').first()
        if last_note and last_note.created_at:
            if not last_activity or last_note.created_at > last_activity:
                last_activity = last_note.created_at
        
        # Проверяем последнюю задачу
        last_todo = Todo.objects.filter(user=last_user).order_by('-created_at').first()
        if last_todo and last_todo.created_at:
            if not last_activity or last_todo.created_at > last_activity:
                last_activity = last_todo.created_at
        
        # Проверяем последний долг
        last_debt = Debt.objects.filter(user=last_user).order_by('-created_at').first()
        if last_debt and last_debt.created_at:
            if not last_activity or last_debt.created_at > last_activity:
                last_activity = last_debt.created_at
        
        # Проверяем последний платеж по долгу
        last_debt_payment = DebtPayment.objects.filter(debt__user=last_user).order_by('-payment_date').first()
        if last_debt_payment and last_debt_payment.payment_date:
            if not last_activity or last_debt_payment.payment_date > last_activity:
                last_activity = last_debt_payment.payment_date
        
        # Если активность не найдена, используем дату регистрации
        if not last_activity:
            last_activity = last_user.date_joined

        # ПРОВЕРЯЕМ ИМПОРТЫ ИЗ БАНКОВ - ДОБАВЛЯЕМ ЭТУ ЛОГИКУ
        bank_imports = []
        
        # Проверяем наличие категории MBank
        if Category.objects.filter(user=last_user, name='MBank').exists():
            bank_imports.append('MBank')
        
        # Проверяем наличие категории Optima Bank
        if Category.objects.filter(user=last_user, name='Optima Bank').exists():
            bank_imports.append('Optima Bank')
        
        # Проверяем транзакции с категориями банков
        mbank_transactions = Transaction.objects.filter(user=last_user, category__name='MBank').count()
        optima_transactions = Transaction.objects.filter(user=last_user, category__name='Optima Bank').count()
        
        # Если есть транзакции но нет категории, все равно считаем что импорт был
        if mbank_transactions > 0 and 'MBank' not in bank_imports:
            bank_imports.append('MBank')
        if optima_transactions > 0 and 'Optima Bank' not in bank_imports:
            bank_imports.append('Optima Bank')

        user_data = {
            'id': last_user.id,
            'username': last_user.username,
            'email': last_user.email or 'Не указан',
            'date_joined': last_user.date_joined.isoformat(),
            'last_login': last_user.last_login.isoformat() if last_user.last_login else None,
            'last_activity': last_activity.isoformat(),
            'is_active': last_user.is_active,
            'is_staff': last_user.is_staff,
            'stats': {
                'transactions_count': transactions_count,
                'categories_count': categories_count,
                'notes_count': notes_count,
                'todos_count': todos_count,
                'debts_count': debts_count,
                'balance': float(balance),
                'income': float(income),
                'expense': float(expense),
                'reserve': float(reserve),
                'bank_imports': bank_imports,  # ДОБАВЛЯЕМ ИНФОРМАЦИЮ ОБ ИМПОРТАХ
                'mbank_transactions': mbank_transactions,
                'optima_transactions': optima_transactions,
            },
            'profile': {
                'currency': profile.currency if profile else 'c',
                'reserve_percentage': profile.reserve_percentage if profile else 10,
                'target_reserve': float(profile.target_reserve) if profile and profile.target_reserve else 0,
                'language': profile.language if profile else 'ru'
            }
        }
        
        return JsonResponse({
            'success': True,
            'last_user': user_data
        })
        
    except Exception as e:
        print(f"Error in get_last_user_details: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)})
    
    


def register(request):
    if request.method == 'POST':
        try:
            username = request.POST.get('username', '').strip()
            print(f"=== REGISTER ATTEMPT ===")
            print(f"Username: {username}")
            
            # Проверка лимита регистраций
            client_ip = request.META.get('REMOTE_ADDR', 'unknown')
            cache_key = f'registration_limit_{client_ip}'
            
            last_registration = cache.get(cache_key)
            if last_registration:
                time_passed = timezone.now() - last_registration
                if time_passed < timedelta(minutes=30):
                    return JsonResponse({
                        "success": False, 
                        "error": "С одного устройства можно регистрироваться только 1 раз в 30 минут!"
                    })
            
            if not username:
                return JsonResponse({"success": False, "error": "Введите логин"})
            
            if len(username) < 3:
                return JsonResponse({"success": False, "error": "Логин должен быть не менее 3 символов"})
            
            # ПРОСТАЯ и надежная проверка
            if User.objects.filter(username=username).exists():
                print(f"❌ Пользователь {username} уже существует в БД")
                return JsonResponse({"success": False, "error": "Пользователь с таким логином уже существует"})
            
            print(f"✅ Создаем пользователя: {username}")
            
            # Создаем пользователя
            password = generate_random_password()
            user = User.objects.create_user(username=username, password=password)
            
            print(f"✅ Пользователь создан с ID: {user.id}")
            
            cache.set(cache_key, timezone.now(), 60 * 10)
            login(request, user)
            request.session['is_new_user'] = True

            print(f"✅ Успешная регистрация для пользователя: {username}")
            
            return JsonResponse({
                "success": True, 
                "message": "Аккаунт успешно создан", 
                "username": username
            })
            
        except Exception as e:
            print(f"❌ Ошибка при регистрации: {str(e)}")
            print(f"❌ Тип ошибки: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            
            # Если ошибка уникальности - пользователь уже существует
            if "UNIQUE constraint" in str(e) or "unique" in str(e).lower():
                return JsonResponse({"success": False, "error": "Пользователь с таким логином уже существует"})
            
            return JsonResponse({"success": False, "error": f"Ошибка при создании аккаунта: {str(e)}"})
    
    return JsonResponse({"success": False, "error": "Неверный метод запроса"})




@login_required
def get_transactions(request):
    filter_type = request.GET.get('filter', 'week')
    page = int(request.GET.get('page', 1))
    limit = int(request.GET.get('limit', 10))
    category_id = request.GET.get('category', 'all')
    
    # Определяем период фильтрации
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
    elif filter_type == '3months':
        start_date = now - timedelta(days=90)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif filter_type == '6months':
        start_date = now - timedelta(days=180)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif filter_type == '9months':
        start_date = now - timedelta(days=270)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif filter_type == '12months':
        start_date = now - timedelta(days=365)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    else:
        start_date = None
        end_date = None
    
    # Получаем транзакции
    transactions = Transaction.objects.filter(user=request.user)
    
    # Фильтруем по категории если выбрана конкретная
    if category_id != 'all':
        transactions = transactions.filter(category_id=category_id)
    
    # Фильтруем по дате если выбран период (ИСПОЛЬЗУЕМ transaction_date вместо created_at)
    if start_date and end_date:
        transactions = transactions.filter(transaction_date__range=[start_date, end_date])
    elif start_date:  # Для случая "все время" или других фильтров
        transactions = transactions.filter(transaction_date__gte=start_date)
    
    # СОРТИРУЕМ ПО transaction_date вместо created_at
    transactions = transactions.order_by('-transaction_date')
    
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
        # ОБРАБОТКА СЛУЧАЯ, КОГДА КАТЕГОРИЯ = None
        category_info = {
            'id': None,
            'name': 'Без категории',
            'icon': 'fas fa-circle',
            'color': '#999999'
        }
        
        if transaction.category:
            category_info = {
                'id': transaction.category.id,
                'name': transaction.category.name,
                'icon': transaction.category.icon,
                'color': transaction.category.color
            }
        
        transactions_data.append({
            'id': transaction.id,
            'amount': float(transaction.amount),
            'reserve_amount': float(transaction.reserve_amount),
            'type': transaction.type,
            'description': transaction.description,
            'transaction_date': transaction.transaction_date.isoformat(),  # ИСПОЛЬЗУЕМ transaction_date
            'category_id': category_info['id'],
            'category_name': category_info['name'],
            'category_icon': category_info['icon'],
            'category_color': category_info['color'],
        })
    
    return JsonResponse({
        'success': True,
        'transactions': transactions_data,
        'has_more': page_obj.has_next(),
        'filter_type': filter_type,
        'total_count': paginator.count
    })



@login_required
def get_categories_with_stats(request):
    period = request.GET.get('period', 'month')  # Получаем период из запроса
    
    # Определяем временной диапазон на основе периода
    today = timezone.now()
    if period == 'day':
        start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == 'week':
        start_date = today - timedelta(days=6)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == '3months':
        start_date = today - timedelta(days=90)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == '6months':
        start_date = today - timedelta(days=180)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == '9months':
        start_date = today - timedelta(days=270)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == '12months':
        start_date = today - timedelta(days=365)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    else:  # month (по умолчанию)
        start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    categories = Category.objects.filter(user=request.user)
    
    # ОБНОВЛЯЕМ: используем transaction_date вместо created_at
    total_income = Transaction.objects.filter(
        user=request.user,
        type='income',
        transaction_date__gte=start_date  # Заменяем created_at на transaction_date
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    
    categories_data = []
    for category in categories:
        # Сумма расходов по категории за период (ОБНОВЛЯЕМ: используем transaction_date)
        category_expense = Transaction.objects.filter(
            user=request.user,
            category=category,
            type='expense',
            transaction_date__gte=start_date  # Заменяем created_at на transaction_date
        )
        total_expense = category_expense.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        transaction_count = category_expense.count()

        # Расчет процента от общего дохода за период
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
        elif period == '6months':
            start_date = today - timedelta(days=180)
            period_name = '6 месяцев'
        elif period == '9months':
            start_date = today - timedelta(days=270)
            period_name = '9 месяцев'
        elif period == '12months':
            start_date = today - timedelta(days=365)
            period_name = '12 месяцев'
        else:  # month (по умолчанию)
            start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            period_name = 'месяц'
        
        print(f"Period: {period_name}, Start date: {start_date}")
        
        # Получаем расходы в этой категории за выбранный период (ОБНОВЛЯЕМ: используем transaction_date)
        period_expenses = Transaction.objects.filter(
            user=request.user,
            category=category,
            type='expense',
            transaction_date__gte=start_date  # Заменяем created_at на transaction_date
        )
        
        # Сумма расходов по категории за период
        total_expense = period_expenses.aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Количество операций в категории за период
        transactions_count = period_expenses.count()
        
        # Средний чек за период
        average_amount = total_expense / transactions_count if transactions_count > 0 else 0
        
        # Общие доходы за период (ОБНОВЛЯЕМ: используем transaction_date)
        period_income = Transaction.objects.filter(
            user=request.user,
            type='income',
            transaction_date__gte=start_date  # Заменяем created_at на transaction_date
        ).aggregate(Sum('amount'))['amount__sum'] or 1
        
        # Процент от доходов за период
        income_percentage = (total_expense / period_income * 100) if period_income > 0 else 0
        
        # Транзакции за сегодня (отдельно для списка) (ОБНОВЛЯЕМ: используем transaction_date)
        today_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
        daily_expenses = period_expenses.filter(transaction_date__gte=today_start).order_by('-transaction_date')  # Заменяем created_at на transaction_date
        
        transactions_data = []
        for expense in daily_expenses:
            transactions_data.append({
                'id': expense.id,
                'amount': float(expense.amount),
                'description': expense.description or 'Без описания',
                'transaction_date': expense.transaction_date.isoformat(),  # Заменяем created_at на transaction_date
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
    """Получение списка пользователей с пагинацией и последней активностью"""
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

            # ВЫЧИСЛЯЕМ ПОСЛЕДНЮЮ АКТИВНОСТЬ
            last_activity = None
            
            # Проверяем последнюю транзакцию
            last_transaction = Transaction.objects.filter(user=user).order_by('-created_at').first()
            if last_transaction and last_transaction.created_at:
                last_activity = last_transaction.created_at
            
            # Проверяем последнюю заметку
            last_note = Note.objects.filter(user=user).order_by('-created_at').first()
            if last_note and last_note.created_at:
                if not last_activity or last_note.created_at > last_activity:
                    last_activity = last_note.created_at
            
            # Проверяем последнюю задачу
            last_todo = Todo.objects.filter(user=user).order_by('-created_at').first()
            if last_todo and last_todo.created_at:
                if not last_activity or last_todo.created_at > last_activity:
                    last_activity = last_todo.created_at
            
            # Проверяем последний долг
            last_debt = Debt.objects.filter(user=user).order_by('-created_at').first()
            if last_debt and last_debt.created_at:
                if not last_activity or last_debt.created_at > last_activity:
                    last_activity = last_debt.created_at
            
            # Если активность не найдена, используем дату регистрации
            if not last_activity:
                last_activity = user.date_joined

            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email or 'Не указан',
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'last_activity': last_activity.isoformat(),  # ДОБАВЛЯЕМ ПОСЛЕДНЮЮ АКТИВНОСТЬ
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
    

@staff_member_required
@login_required
def get_user_details(request, user_id):
    """Получение детальной информации о конкретном пользователе"""
    try:
        user = User.objects.get(id=user_id)
        
        # Собираем статистику пользователя
        transactions_count = Transaction.objects.filter(user=user).count()
        categories_count = Category.objects.filter(user=user).count()
        notes_count = Note.objects.filter(user=user).count()
        todos_count = Todo.objects.filter(user=user).count()
        debts_count = Debt.objects.filter(user=user).count()
        
        # Расчет баланса
        income_result = Transaction.objects.filter(user=user, type='income').aggregate(total=Sum('amount'))
        expense_result = Transaction.objects.filter(user=user, type='expense').aggregate(total=Sum('amount'))
        reserve_result = Transaction.objects.filter(user=user, type='income').aggregate(total=Sum('reserve_amount'))
        
        income = income_result['total'] or Decimal('0')
        expense = expense_result['total'] or Decimal('0')
        reserve = reserve_result['total'] or Decimal('0')
        balance = income - expense - reserve
        
        # Получаем профиль пользователя
        profile = getattr(user, 'userprofile', None)
        
        # РАСЧЕТ ПОСЛЕДНЕЙ АКТИВНОСТИ ПО ВСЕМ МОДЕЛЯМ
        last_activity = None
        
        # Проверяем последнюю транзакцию
        last_transaction = Transaction.objects.filter(user=user).order_by('-created_at').first()
        if last_transaction and last_transaction.created_at:
            last_activity = last_transaction.created_at
        
        # Проверяем последнюю заметку
        last_note = Note.objects.filter(user=user).order_by('-created_at').first()
        if last_note and last_note.created_at:
            if not last_activity or last_note.created_at > last_activity:
                last_activity = last_note.created_at
        
        # Проверяем последнюю задачу
        last_todo = Todo.objects.filter(user=user).order_by('-created_at').first()
        if last_todo and last_todo.created_at:
            if not last_activity or last_todo.created_at > last_activity:
                last_activity = last_todo.created_at
        
        # Проверяем последний долг
        last_debt = Debt.objects.filter(user=user).order_by('-created_at').first()
        if last_debt and last_debt.created_at:
            if not last_activity or last_debt.created_at > last_activity:
                last_activity = last_debt.created_at
        
        # Проверяем последний платеж по долгу
        last_debt_payment = DebtPayment.objects.filter(debt__user=user).order_by('-payment_date').first()
        if last_debt_payment and last_debt_payment.payment_date:
            if not last_activity or last_debt_payment.payment_date > last_activity:
                last_activity = last_debt_payment.payment_date
        
        # Если активность не найдена, используем дату регистрации
        if not last_activity:
            last_activity = user.date_joined

        # ПРОВЕРЯЕМ ИМПОРТЫ ИЗ БАНКОВ
        bank_imports = []
        
        # Проверяем наличие категории MBank
        if Category.objects.filter(user=user, name='MBank').exists():
            bank_imports.append('MBank')
        
        # Проверяем наличие категории Optima Bank
        if Category.objects.filter(user=user, name='Optima Bank').exists():
            bank_imports.append('Optima Bank')
        
        # Проверяем транзакции с категориями банков (на всякий случай)
        mbank_transactions = Transaction.objects.filter(user=user, category__name='MBank').count()
        optima_transactions = Transaction.objects.filter(user=user, category__name='Optima Bank').count()
        
        # Если есть транзакции но нет категории, все равно считаем что импорт был
        if mbank_transactions > 0 and 'MBank' not in bank_imports:
            bank_imports.append('MBank')
        if optima_transactions > 0 and 'Optima Bank' not in bank_imports:
            bank_imports.append('Optima Bank')

        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email or 'Не указан',
            'date_joined': user.date_joined.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'last_activity': last_activity.isoformat(),
            'is_active': user.is_active,
            'is_staff': user.is_staff,
            'stats': {
                'transactions_count': transactions_count,
                'categories_count': categories_count,
                'notes_count': notes_count,
                'todos_count': todos_count,
                'debts_count': debts_count,
                'balance': float(balance),
                'income': float(income),
                'expense': float(expense),
                'reserve': float(reserve),
                'bank_imports': bank_imports,  # ДОБАВЛЯЕМ ИНФОРМАЦИЮ ОБ ИМПОРТАХ
                'mbank_transactions': mbank_transactions,
                'optima_transactions': optima_transactions,
            },
            'profile': {
                'currency': profile.currency if profile else 'c',
                'reserve_percentage': profile.reserve_percentage if profile else 10,
                'target_reserve': float(profile.target_reserve) if profile and profile.target_reserve else 0,
                'language': profile.language if profile else 'ru'
            }
        }
        
        return JsonResponse({
            'success': True,
            'user': user_data
        })
        
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Пользователь не найден'})
    except Exception as e:
        print(f"Error in get_user_details: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': str(e)})

        

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
    """ПОЛНОЕ удаление всех системных уведомлений и связанных данных"""
    try:
        if not request.user.is_staff:
            return JsonResponse({'success': False, 'error': 'Доступ запрещен'})

        # Подтверждение для безопасности
        if not request.POST.get('confirm'):
            return JsonResponse({'success': False, 'error': 'Требуется подтверждение'})

        print("🔄 Начинаем полное удаление всех уведомлений...")

        # Удаляем в правильном порядке чтобы избежать проблем с внешними ключами
        with transaction.atomic():
            # 1. Сначала удаляем все сообщения чатов
            chat_messages_deleted = ChatMessage.objects.filter(
                chat__notification__created_by=request.user
            ).delete()
            print(f"✅ Удалено сообщений чатов: {chat_messages_deleted}")

            # 2. Удаляем все чаты
            chats_deleted = NotificationChat.objects.filter(
                notification__created_by=request.user
            ).delete()
            print(f"✅ Удалено чатов: {chats_deleted}")

            # 3. Удаляем все пользовательские уведомления
            user_notifications_deleted = UserNotification.objects.filter(
                notification__created_by=request.user
            ).delete()
            print(f"✅ Удалено пользовательских уведомлений: {user_notifications_deleted}")

            # 4. Удаляем все системные уведомления
            system_notifications_deleted = SystemNotification.objects.filter(
                created_by=request.user
            ).delete()
            print(f"✅ Удалено системных уведомлений: {system_notifications_deleted}")

        total_deleted = (
            chat_messages_deleted[0] + 
            chats_deleted[0] + 
            user_notifications_deleted[0] + 
            system_notifications_deleted[0]
        )

        print(f"🎉 Полное удаление завершено. Всего удалено записей: {total_deleted}")

        return JsonResponse({
            'success': True, 
            'message': f'Полностью удалено {total_deleted} записей уведомлений и связанных данных'
        })

    except Exception as e:
        print(f"❌ Ошибка при полном удалении уведомлений: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': f'Ошибка при удалении: {str(e)}'})




@staff_member_required
@require_POST
def create_system_notification(request):
    """Создание системного уведомления админом с обложкой"""
    try:
        # Обрабатываем FormData вместо JSON
        title = request.POST.get('title')
        message = request.POST.get('message')
        target_user_id = request.POST.get('target_user_id')
        cover_image = request.FILES.get('cover_image')  # Получаем загруженный файл
        
        print(f"📨 Создание уведомления: title={title}, target_user_id={target_user_id}, cover_image={cover_image}")
        
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
            target_user=target_user,
            cover_image=cover_image  # Сохраняем картинку
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
        
        print(f"✅ Уведомление создано: {message_type} для {users_count} пользователей")
        
        return JsonResponse({
            'success': True, 
            'message': f'{message_type} для {users_count} пользователей',
            'is_personal': target_user is not None
        })
        
    except Exception as e:
        print(f"❌ Error creating system notification: {str(e)}")
        import traceback
        traceback.print_exc()
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




@csrf_exempt
@transaction.atomic
def export_user_data(request):
    """Экспорт всех данных пользователя"""
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Не авторизован'})
    
    try:
        user = request.user
        
        # Собираем все данные пользователя
        data = {
            'export_info': {
                'version': '1.1',  # Обновили версию, так как добавили transaction_date
                'export_date': timezone.now().isoformat(),
                'user_id': user.id,
                'username': user.username
            },
            'user_profile': {},
            'categories': [],
            'transactions': [],
            'debts': [],
            'debt_payments': [],
            'notes': [],
            'todos': []
        }
        
        # Получаем профиль пользователя
        try:
            if hasattr(user, 'userprofile'):
                profile = user.userprofile
                data['user_profile'] = {
                    'currency': profile.currency,
                    'reserve_percentage': profile.reserve_percentage,
                    'target_reserve': float(profile.target_reserve) if profile.target_reserve else 0.0,
                    'password_changed': profile.password_changed,
                    'language': profile.language,
                    'first_name': profile.first_name,
                    'user_email': profile.user_email,
                    'phone': profile.phone
                }
        except Exception as e:
            print(f"Error getting user profile: {e}")
        
        # Экспорт категорий
        try:
            categories = Category.objects.filter(user=user)
            categories_data = []
            for category in categories:
                categories_data.append({
                    'id': category.id,
                    'name': category.name,
                    'icon': category.icon,
                    'color': category.color,
                })
            data['categories'] = categories_data
            print(f"Exported {len(categories_data)} categories")
        except Exception as e:
            print(f"Error getting categories: {e}")
        
        # ОБНОВЛЕННЫЙ ЭКСПОРТ ТРАНЗАКЦИЙ - ДОБАВЛЕН transaction_date
        try:
            transactions = user.transaction_set.all()
            transactions_data = []
            for transaction in transactions:
                transactions_data.append({
                    'id': transaction.id,
                    'amount': float(transaction.amount),
                    'type': transaction.type,
                    'description': transaction.description,
                    'category_id': transaction.category_id,
                    'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                    'transaction_date': transaction.transaction_date.isoformat() if transaction.transaction_date else None,  # ДОБАВЛЕНО НОВОЕ ПОЛЕ
                    'reserve_amount': float(transaction.reserve_amount),
                    'source': getattr(transaction, 'source', 'manual')  # Добавляем источник, если есть
                })
            data['transactions'] = transactions_data
            print(f"Exported {len(transactions_data)} transactions")
        except Exception as e:
            print(f"Error getting transactions: {e}")
        
        # Получаем долги
        try:
            debts = user.debt_set.all()
            debts_data = []
            for debt in debts:
                debts_data.append({
                    'id': debt.id,
                    'debtor_name': debt.debtor_name,
                    'amount': float(debt.amount),
                    'paid_amount': float(debt.paid_amount),
                    'due_date': debt.due_date.isoformat() if debt.due_date else None,
                    'status': debt.status,
                    'phone': debt.phone,
                    'address': debt.address,
                    'description': debt.description,
                    'created_at': debt.created_at.isoformat() if debt.created_at else None
                })
            data['debts'] = debts_data
        except Exception as e:
            print(f"Error getting debts: {e}")
        
        # Получаем платежи по долгам
        try:
            debt_ids = [debt['id'] for debt in data['debts']]
            if debt_ids:
                payments = DebtPayment.objects.filter(debt_id__in=debt_ids)
                payments_data = []
                for payment in payments:
                    payments_data.append({
                        'id': payment.id,
                        'debt_id': payment.debt_id,
                        'amount': float(payment.amount),
                        'payment_date': payment.payment_date.isoformat() if payment.payment_date else None,
                        'note': payment.note
                    })
                data['debt_payments'] = payments_data
        except Exception as e:
            print(f"Error getting debt payments: {e}")
        
        # Получаем заметки
        try:
            notes = user.note_set.all()
            notes_data = []
            for note in notes:
                notes_data.append({
                    'id': note.id,
                    'title': note.title,
                    'content': note.content,
                    'reminder_date': note.reminder_date.isoformat() if note.reminder_date else None,
                    'is_reminded': note.is_reminded,
                    'created_at': note.created_at.isoformat() if note.created_at else None
                })
            data['notes'] = notes_data
        except Exception as e:
            print(f"Error getting notes: {e}")
        
        # Получаем задачи
        try:
            todos = user.todo_set.all()
            todos_data = []
            for todo in todos:
                todos_data.append({
                    'id': todo.id,
                    'title': todo.title,
                    'description': todo.description,
                    'is_completed': todo.is_completed,
                    'priority': todo.priority,
                    'created_at': todo.created_at.isoformat() if todo.created_at else None
                })
            data['todos'] = todos_data
        except Exception as e:
            print(f"Error getting todos: {e}")
        
        # Создаем JSON файл
        filename = f"backup_{user.username}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.json"
        response = HttpResponse(
            json.dumps(data, ensure_ascii=False, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
    
        
    
@csrf_exempt
@transaction.atomic
def import_user_data(request):
    """Импорт данных пользователя"""
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Не авторизован'})
    
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Только POST запросы'})
    
    try:
        user = request.user
        uploaded_file = request.FILES.get('backup_file')
        
        if not uploaded_file:
            return JsonResponse({'success': False, 'error': 'Файл не выбран'})
        
        if not uploaded_file.name.endswith('.json'):
            return JsonResponse({'success': False, 'error': 'Только JSON файлы'})
        
        # Читаем и парсим JSON
        file_content = uploaded_file.read().decode('utf-8')
        data = json.loads(file_content)
        
        # Валидация структуры файла
        if 'export_info' not in data:
            return JsonResponse({'success': False, 'error': 'Неверный формат файла'})
        
        # ПОЛНОЕ УДАЛЕНИЕ ВСЕХ СУЩЕСТВУЮЩИХ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
        print(f"Deleting all existing data for user {user.username}")
        
        # Удаляем транзакции
        user.transaction_set.all().delete()
        print("Deleted transactions")
        
        # Удаляем категории
        user.category_set.all().delete()
        print("Deleted categories")
        
        # Удаляем долги и их платежи
        user.debt_set.all().delete()
        print("Deleted debts")
        
        # Удаляем заметки
        user.note_set.all().delete()
        print("Deleted notes")
        
        # Удаляем задачи
        user.todo_set.all().delete()
        print("Deleted todos")
        
        # Восстанавливаем профиль пользователя
        if 'user_profile' in data:
            profile = user.userprofile
            profile_data = data['user_profile']
            
            if 'currency' in profile_data:
                profile.currency = profile_data['currency']
            if 'reserve_percentage' in profile_data:
                profile.reserve_percentage = profile_data['reserve_percentage']
            if 'target_reserve' in profile_data:
                from decimal import Decimal
                profile.target_reserve = Decimal(str(profile_data['target_reserve']))
            
            profile.save()
            print("Updated user profile")
        
        # Восстанавливаем категории
        category_mapping = {}
        if 'categories' in data:
            for category_data in data['categories']:
                old_id = category_data['id']
                
                # Создаем категорию с ТОЧНО ТАКИМИ ЖЕ данными
                new_category = Category.objects.create(
                    user=user,
                    name=category_data['name'],  # Оригинальное название
                    icon=category_data.get('icon', 'fas fa-tag'),
                    color=category_data.get('color', '#3b82f6')
                )
                
                category_mapping[old_id] = new_category.id
            
            print(f"Created {len(data['categories'])} categories with original names")
        
        # Вспомогательная функция для преобразования строк дат
        def parse_date(date_string):
            if not date_string:
                return None
            try:
                # Пробуем разные форматы дат
                for fmt in ('%Y-%m-%dT%H:%M:%S.%f%z', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
                    try:
                        return datetime.strptime(date_string, fmt)
                    except ValueError:
                        continue
                # Если ничего не подошло, возвращаем None
                return None
            except (ValueError, TypeError):
                return None
        
        # Восстанавливаем транзакции С ПРАВИЛЬНЫМИ ДАТАМИ
        if 'transactions' in data:
            transaction_count = 0
            for transaction_data in data['transactions']:
                old_category_id = transaction_data.get('category_id')
                
                from decimal import Decimal
                amount = Decimal(str(transaction_data['amount']))
                reserve_amount = Decimal(str(transaction_data.get('reserve_amount', 0)))
                
                # Используем маппинг категорий
                category_id = category_mapping.get(old_category_id)
                
                # Преобразуем строку даты обратно в datetime
                created_at = parse_date(transaction_data.get('created_at'))
                if not created_at:
                    created_at = timezone.now()  # fallback на текущее время
                
                transaction = Transaction.objects.create(
                    user=user,
                    amount=amount,
                    type=transaction_data['type'],
                    description=transaction_data.get('description', ''),
                    category_id=category_id,
                    reserve_amount=reserve_amount
                )
                
                # Обновляем created_at в обход auto_now_add
                if created_at:
                    Transaction.objects.filter(id=transaction.id).update(created_at=created_at)
                
                transaction_count += 1
            
            print(f"Created {transaction_count} transactions with original dates")

        # Восстанавливаем долги С ПРАВИЛЬНЫМИ ДАТАМИ
        debt_mapping = {}
        if 'debts' in data:
            debt_count = 0
            for debt_data in data['debts']:
                old_id = debt_data['id']
                
                # Преобразуем float обратно в Decimal
                from decimal import Decimal
                amount = Decimal(str(debt_data['amount']))
                paid_amount = Decimal(str(debt_data.get('paid_amount', 0)))
                
                # Преобразуем строки дат
                due_date = parse_date(debt_data.get('due_date'))
                created_at = parse_date(debt_data.get('created_at'))
                
                if not due_date:
                    due_date = timezone.now().date()
                if not created_at:
                    created_at = timezone.now()
                
                new_debt = Debt.objects.create(
                    user=user,
                    debtor_name=debt_data['debtor_name'],
                    amount=amount,
                    paid_amount=paid_amount,
                    due_date=due_date,
                    status=debt_data.get('status', 'active'),
                    phone=debt_data.get('phone', ''),
                    address=debt_data.get('address', ''),
                    description=debt_data.get('description', '')
                )
                
                # Обновляем created_at в обход auto_now_add
                if created_at:
                    Debt.objects.filter(id=new_debt.id).update(created_at=created_at)
                
                debt_mapping[old_id] = new_debt.id
                debt_count += 1
            
            print(f"Created {debt_count} debts with original dates")
        
        # Восстанавливаем платежи по долгам С ПРАВИЛЬНЫМИ ДАТАМИ
        if 'debt_payments' in data:
            payment_count = 0
            for payment_data in data['debt_payments']:
                old_debt_id = payment_data.get('debt_id')
                
                if old_debt_id in debt_mapping:
                    # Преобразуем float обратно в Decimal
                    from decimal import Decimal
                    amount = Decimal(str(payment_data['amount']))
                    
                    # Преобразуем строку даты
                    payment_date = parse_date(payment_data.get('payment_date'))
                    if not payment_date:
                        payment_date = timezone.now()
                    
                    payment = DebtPayment.objects.create(
                        debt_id=debt_mapping[old_debt_id],
                        amount=amount,
                        note=payment_data.get('note', '')
                    )
                    
                    # Обновляем payment_date в обход auto_now_add
                    if payment_date:
                        DebtPayment.objects.filter(id=payment.id).update(payment_date=payment_date)
                    
                    payment_count += 1
            
            print(f"Created {payment_count} debt payments with original dates")
        
        # Восстанавливаем заметки С ПРАВИЛЬНЫМИ ДАТАМИ
        if 'notes' in data:
            note_count = 0
            for note_data in data['notes']:
                # Преобразуем строки дат
                reminder_date = parse_date(note_data.get('reminder_date'))
                created_at = parse_date(note_data.get('created_at'))
                
                if not created_at:
                    created_at = timezone.now()
                
                note = Note.objects.create(
                    user=user,
                    title=note_data['title'],
                    content=note_data.get('content', ''),
                    reminder_date=reminder_date,
                    is_reminded=note_data.get('is_reminded', False)
                )
                
                # Обновляем created_at в обход auto_now_add
                if created_at:
                    Note.objects.filter(id=note.id).update(created_at=created_at)
                
                note_count += 1
            
            print(f"Created {note_count} notes with original dates")
        
        # Восстанавливаем задачи С ПРАВИЛЬНЫМИ ДАТАМИ
        if 'todos' in data:
            todo_count = 0
            for todo_data in data['todos']:
                # Преобразуем строку даты
                created_at = parse_date(todo_data.get('created_at'))
                if not created_at:
                    created_at = timezone.now()
                
                todo = Todo.objects.create(
                    user=user,
                    title=todo_data['title'],
                    description=todo_data.get('description', ''),
                    is_completed=todo_data.get('is_completed', False),
                    priority=todo_data.get('priority', 'medium')
                )
                
                # Обновляем created_at в обход auto_now_add
                if created_at:
                    Todo.objects.filter(id=todo.id).update(created_at=created_at)
                
                todo_count += 1
            
            print(f"Created {todo_count} todos with original dates")
        
        return JsonResponse({
            'success': True, 
            'message': f'Данные успешно импортированы! Создано: {len(data.get("categories", []))} категорий, {len(data.get("transactions", []))} транзакций, {len(data.get("debts", []))} долгов.'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Ошибка чтения JSON файла'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})    

@csrf_exempt
@login_required
@require_POST
def update_language(request):
    """Упрощенная функция смены языка без использования translation"""
    try:
        lang_code = request.POST.get("language")
        
        # Простая проверка допустимых языков
        if lang_code not in ['ru', 'en', 'ky', 'uk']:
            return JsonResponse({
                'success': False,
                'error': 'Неверный код языка'
            })

        # Сохраняем только в профиль и сессию
        request.session['django_language'] = lang_code
        
        if hasattr(request.user, 'userprofile'):
            request.user.userprofile.language = lang_code
            request.user.userprofile.save()

        response = JsonResponse({
            'success': True,
            'message': 'Язык успешно изменен',
            'language': lang_code,
            'language_name': {
                'ru': 'Русский',
                'en': 'English', 
                'ky': 'Кыргызча',
                'uk': 'Українська'
            }.get(lang_code, lang_code)
        })
        
        # Устанавливаем простой cookie
        response.set_cookie('django_language', lang_code, max_age=365*24*60*60)
        
        return response

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Ошибка: {str(e)}'
        })
    



@login_required
def get_profile_info(request):
    """Получение информации о профиле"""
    try:
        profile = request.user.userprofile
        return JsonResponse({
            'success': True,
            'profile': {
                'has_email': profile.has_email,
                'email': profile.user_email or '',
                'first_name': profile.first_name or '',
                'phone': profile.phone or '',
                'completion_percentage': profile.profile_completion_percentage,
                'email_verified': profile.email_verified
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})




@login_required
@require_POST
def update_profile(request):
    """Обновление профиля пользователя"""
    try:
        profile = request.user.userprofile
        user_email = request.POST.get('email', '').strip()
        first_name = request.POST.get('first_name', '').strip()
        phone = request.POST.get('phone', '').strip()

        # Валидация email (если указан)
        if user_email:
            # Простая валидация email
            if '@' not in user_email or '.' not in user_email:
                return JsonResponse({"success": False, "error": "Неверный формат email"})
            
            # Проверяем, не используется ли email другим пользователем
            if UserProfile.objects.filter(user_email=user_email).exclude(user=request.user).exists():
                return JsonResponse({"success": False, "error": "Этот email уже используется другим пользователем"})

        # Обновляем данные
        if user_email:
            profile.user_email = user_email
            # Помечаем как неподтвержденный (можно добавить логику подтверждения позже)
            profile.email_verified = False
            
        if first_name:
            profile.first_name = first_name
        if phone:
            profile.phone = phone
            
        profile.save()

        return JsonResponse({
            "success": True,
            "message": "Профиль успешно обновлен",
            "profile": {
                'has_email': profile.has_email,
                'email': profile.user_email or '',
                'first_name': profile.first_name or '',
                'phone': profile.phone or '',
                'completion_percentage': profile.profile_completion_percentage,
                'email_verified': profile.email_verified
            }
        })

    except Exception as e:
        print(f"Ошибка при обновлении профиля: {str(e)}")
        return JsonResponse({"success": False, "error": f"Ошибка при обновлении профиля: {str(e)}"})
    




@login_required
@require_POST
def delete_account(request):
    """Удаление аккаунта пользователя со всеми данными"""
    try:
        user = request.user
        username = user.username
        
        # Логируем удаление для безопасности
        print(f"🔄 Удаление аккаунта пользователя: {username}")
        
        # Удаляем все данные пользователя в правильном порядке
        with transaction.atomic():
            # 1. Удаляем долги и платежи
            DebtPayment.objects.filter(debt__user=user).delete()
            Debt.objects.filter(user=user).delete()
            
            # 2. Удаляем транзакции
            Transaction.objects.filter(user=user).delete()
            
            # 3. Удаляем категории
            Category.objects.filter(user=user).delete()
            
            # 4. Удаляем заметки
            Note.objects.filter(user=user).delete()
            
            # 5. Удаляем задачи
            Todo.objects.filter(user=user).delete()
            
            # 6. Удаляем уведомления и чаты
            UserNotification.objects.filter(user=user).delete()
            # Удаляем персональные уведомления, созданные пользователем
            SystemNotification.objects.filter(created_by=user).delete()
            
            # 7. Удаляем профиль
            UserProfile.objects.filter(user=user).delete()
            
            # 8. Удаляем самого пользователя
            user.delete()
        
        # Выходим из системы
        logout(request)
        
        print(f"✅ Аккаунт {username} успешно удален")
        
        return JsonResponse({
            'success': True,
            'message': 'Ваш аккаунт и все данные успешно удалены'
        })
        
    except Exception as e:
        print(f"❌ Ошибка при удалении аккаунта: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Ошибка при удалении аккаунта: {str(e)}'
        })
    



import pandas as pd

import os
from django.views.decorators.csrf import csrf_protect


@login_required
@require_POST
@csrf_protect
def import_mbank_view(request):
    """
    Обработка импорта из Мбанка для всех пользователей
    """
    try:
        if not request.FILES.get('mbank_file'):
            return JsonResponse({
                'success': False, 
                'message': 'Файл не выбран'
            })
        
        uploaded_file = request.FILES['mbank_file']
        
        print(f"=== НАЧАЛО ОБРАБОТКИ ЗАПРОСА ===")
        print(f"Пользователь: {request.user.username}")
        print(f"Файл: {uploaded_file.name}, размер: {uploaded_file.size}")
        
        # Проверяем расширение файла
        file_name = uploaded_file.name.lower()
        if not (file_name.endswith('.csv') or file_name.endswith('.xlsx') or file_name.endswith('.xls')):
            return JsonResponse({
                'success': False, 
                'message': 'Поддерживаются только CSV и Excel файлы'
            })
        
        # Сохраняем временный файл
        temp_dir = 'temp_imports'
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f'mbank_import_{request.user.id}_{uploaded_file.name}')
        
        with open(temp_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        print(f"Файл сохранен: {temp_path}")
        
        try:
            # Вызываем функцию импорта
            result = import_mbank(temp_path, request.user)
            
            # Добавляем отладочную информацию
            result['debug'] = {
                'user': request.user.username,
                'file': uploaded_file.name,
                'file_size': uploaded_file.size
            }
            
            return JsonResponse(result)
            
        finally:
            # Удаляем временный файл
            if os.path.exists(temp_path):
                os.remove(temp_path)
                print(f"Временный файл удален: {temp_path}")
                
    except Exception as e:
        print(f"❌ ОШИБКА В VIEW: {e}")
        import traceback
        print(traceback.format_exc())
        return JsonResponse({
            'success': False, 
            'message': f'Ошибка при обработке файла: {str(e)}'
        })

def import_mbank(file_path, user):
    """
    Умная функция импорта транзакций из Мбанка с автоматическим определением категорий
    и добавлением начального баланса
    """
    try:
        print(f"=== НАЧАЛО ИМПОРТА МБАНК ДЛЯ {user.username} ===")
        
        # Читаем файл
        if file_path.endswith('.csv'):
            try:
                df = pd.read_csv(file_path, delimiter=';', encoding='utf-8')
            except:
                try:
                    df = pd.read_csv(file_path, delimiter=',', encoding='utf-8')
                except:
                    df = pd.read_csv(file_path, delimiter=';', encoding='cp1251')
        elif file_path.endswith('.xlsx') or file_path.endswith('.xls'):
            df = pd.read_excel(file_path)
        else:
            return {'success': False, 'message': 'Неверный формат файла'}
        
        print(f"Файл прочитан. Колонки: {list(df.columns)}")
        print(f"Размер данных: {df.shape}")
        
        if df.empty:
            return {'success': False, 'message': 'Файл пустой'}
        
        if len(df.columns) < 5:
            return {'success': False, 'message': f'Недостаточно колонок. Найдено: {len(df.columns)}, нужно: 5'}
        
        # Создаем категорию MBank
        mbank_category, created = Category.objects.get_or_create(
            user=user,
            name='MBank',
            defaults={
                'color': '#6B46C1',
                'icon': '/static/main/icons/mico.svg'
            }
        )
        print(f"Категория MBank: {'создана' if created else 'существовала'}")
        
        # ПОИСК НАЧАЛЬНОГО БАЛАНСА
        initial_balance = Decimal('0')
        initial_balance_found = False
        
        # Фразы для поиска начального баланса
        balance_phrases = [
            'средства на начало периода',
            'начальный остаток',
            'остаток на начало периода',
            'баланс на начало'
        ]
        
        # Ищем начальный баланс в данных
        for index, row in df.iterrows():
            all_text = ' '.join([str(cell) for cell in row.values if pd.notna(cell)]).lower()
            
            # Проверяем на фразы начального баланса
            for phrase in balance_phrases:
                if phrase in all_text:
                    print(f"Найдена строка с начальным балансом: {all_text}")
                    
                    # Извлекаем числовое значение из строки
                    for cell in row.values:
                        if pd.notna(cell):
                            cell_str = str(cell).strip()
                            # Ищем числовые значения
                            numbers = re.findall(r'[+-]?\d+[\s,]*\d*[.,]?\d*', cell_str)
                            for num_str in numbers:
                                try:
                                    clean_num = num_str.replace(' ', '').replace(',', '.')
                                    # Убираем лишние точки
                                    if clean_num.count('.') > 1:
                                        parts = clean_num.split('.')
                                        clean_num = parts[0] + '.' + ''.join(parts[1:])
                                    
                                    balance_value = Decimal(clean_num)
                                    if balance_value > 0:
                                        initial_balance = balance_value
                                        initial_balance_found = True
                                        print(f"✅ Найден начальный баланс: {initial_balance}")
                                        break
                                except (ValueError, InvalidOperation) as e:
                                    continue
                            if initial_balance_found:
                                break
                    if initial_balance_found:
                        break
            if initial_balance_found:
                break
        
        # ДОБАВЛЯЕМ ТРАНЗАКЦИЮ НАЧАЛЬНОГО БАЛАНСА
        if initial_balance_found and initial_balance > 0:
            # Проверяем, нет ли уже такой транзакции
            existing_initial = Transaction.objects.filter(
                user=user,
                amount=initial_balance,
                type='income',
                description='Начальный баланс из выписки',
                category=mbank_category
            ).first()
            
            if not existing_initial:
                # Создаем транзакцию начального баланса
                Transaction.objects.create(
                    user=user,
                    amount=initial_balance,
                    type='income',
                    description='Начальный баланс из выписки',
                    category=mbank_category,
                    transaction_date=timezone.now()
                )
                print(f"✅ Создана транзакция начального баланса: {initial_balance}")
            else:
                print("ℹ️ Транзакция начального баланса уже существует")
        
        # СЛОВАРЬ КАТЕГОРИЙ И КЛЮЧЕВЫХ СЛОВ
        category_keywords = {
            'Тулпар': {
                'keywords': ['Тулпар', 'TULPAR'],
                'color': "#8B80F9",
                'icon': '/static/main/icons/tulpar.svg'
            },
            'Куликовский': {
                'keywords': ['Kulikovskiy', 'куликовский'],
                'color': "#5D8BF4",
                'icon': '/static/main/icons/kulikov.svg'
            },
            'Globus': {
                'keywords': ['globus', 'глобус'],
                'color': '#FF7B7B',
                'icon': '/static/main/icons/globus.svg'
            },
            'Аптека': {
                'keywords': ['аптека', 'apteka', 'pharmacy', 'медтехника', 'фармация', 'дарыкана'],
                'color': '#4ECDC4',
                'icon': 'fas fa-pills'
            },
            'Мой дом': {
                'keywords': ['Мой дом'],
                'color': '#10D452',
                'icon': '/static/main/icons/moi-dom.svg'
            },
            'Интернет': {
                'keywords': ['Exnet', 'homeline', 'megaline', 'skynet', 'fastnet', 'aknet', 'neotelecom', 'акнет', 'фастнет', 'скайнет', 'мега-лайн'],
                'color': "#A0AABC",
                'icon': 'fa-solid fa-wifi'
            },
            'KFC': {
                'keywords': ['KFC'],
                'color': "#FFCC00",
                'icon': '/static/main/icons/kfc.svg'
            },
            'Lalafo': {
                'keywords': ['Lalafo'],
                'color': "#00FF88",
                'icon': '/static/main/icons/lalafo.svg'
            },
            'Finca Bank': {
                'keywords': ['Finca', 'финка', 'FINCA_Bank'],
                'color': "#FF3366",
                'icon': '/static/main/icons/finca.svg'
            },
            'Элкарт': {
                'keywords': ['Элкарт'],
                'color': "#3399FF",
                'icon': '/static/main/icons/elcard.svg'
            },
            'MEGA': {
                'keywords': ['Mega', 'megacom'],
                'color': "#00FF66",
                'icon': '/static/main/icons/mega.svg'
            },
            'O!Dengi': {
                'keywords': ['O!Dengi', 'оденьги', 'O!'],
                'color': "#FF27A6",
                'icon': '/static/main/icons/o.svg'
            },
            'Dodo Pizza': {
                'keywords': ['Dodo', 'Dodo Pizza', 'Додо пицца'],
                'color': "#FF4444",
                'icon': '/static/main/icons/dodo.svg'
            },
            'Optima Bank': {
                'keywords': ['optima', 'оптима'],
                'color': "#CCCCCC",
                'icon': '/static/main/icons/optima.svg'
            },
            'Оптовые цены': {
                'keywords': ['Оптовые цены'],
                'color': "#66B3FF",
                'icon': 'fa-solid fa-cart-shopping'
            },
            'Spar': {
                'keywords': ['Spar'],
                'color': "#FF6B6B",
                'icon': '/static/main/icons/spar.svg'
            },
            'Перекресток': {
                'keywords': ['Перекресток'],
                'color': "#9D95FF",
                'icon': '/static/main/icons/per.svg'
            }
        }
        
        # Кэш для категорий
        categories_cache = {'MBank': mbank_category}
        
        # Функция для определения категории по описанию
        def detect_category(description):
            desc_lower = description.lower()
            
            for category_name, category_data in category_keywords.items():
                for keyword in category_data['keywords']:
                    if keyword.lower() in desc_lower:
                        return category_name
            
            return 'MBank'
        
        transactions_created = 0
        errors = []
        skipped_rows = []
        category_stats = {}
        created_categories = []
        
        # Список служебных строк для пропуска
        service_phrases = [
            'выписка из лицевого счета за период',
            'лицевой счет:',
            'валюта:',
            'состояние счета на:',
            'текущий остаток средств:',
            'ФИО/Наименование клиента:',
            'средства на начало периода',
            'зачисления за период',
            'списания за период',
            'средства на конец периода'
        ]
        
        # Обрабатываем каждую строку
        for index, row in df.iterrows():
            try:
                date_val = row.iloc[0]  # Колонка 0 - Дата
                operation_val = row.iloc[1] if len(row) > 1 else ''  # Колонка 1 - Операция
                debit_val = row.iloc[2] if len(row) > 2 else 0  # Колонка 2 - Дебет
                credit_val = row.iloc[3] if len(row) > 3 else 0  # Колонка 3 - Кредит
                recipient_val = row.iloc[4] if len(row) > 4 else ''  # Колонка 4 - Получатель
                
                # Пропускаем полностью пустые строки
                if (pd.isna(date_val) or str(date_val).strip() in ['', 'NaN', 'NaT', 'None']) and \
                   (pd.isna(debit_val) or debit_val == 0) and \
                   (pd.isna(credit_val) or credit_val == 0):
                    skipped_rows.append(f"Строка {index+1}: полностью пустая")
                    continue
                
                # Получаем текстовые значения для проверки
                operation = str(operation_val) if pd.notna(operation_val) and str(operation_val).strip() not in ['', 'NaN', 'NaT', 'None'] else ''
                recipient = str(recipient_val) if pd.notna(recipient_val) and str(recipient_val).strip() not in ['', 'NaN', 'NaT', 'None'] else ''
                date_str = str(date_val) if pd.notna(date_val) else ''
                
                # Объединяем все текстовые поля для проверки
                all_text = f"{date_str} {operation} {recipient}".lower()
                
                # Проверяем на служебные фразы
                is_service_line = False
                for phrase in service_phrases:
                    if phrase in all_text:
                        is_service_line = True
                        skipped_rows.append(f"Строка {index+1}: служебная строка (содержит '{phrase}')")
                        break
                
                if is_service_line:
                    continue
                
                # Проверка на слишком короткий текст
                if len(operation.strip()) < 3 and len(recipient.strip()) < 3:
                    skipped_rows.append(f"Строка {index+1}: слишком короткий текст операции/получателя")
                    continue
                
                # Обработка числовых значений
                debit_clean = 0
                credit_clean = 0
                
                # Обрабатываем дебет
                if pd.notna(debit_val):
                    try:
                        if isinstance(debit_val, (int, float)):
                            debit_clean = float(debit_val)
                        else:
                            debit_str = str(debit_val).replace(',', '.').replace(' ', '')
                            debit_clean = float(debit_str) if debit_str else 0
                    except:
                        debit_clean = 0
                
                # Обрабатываем кредит
                if pd.notna(credit_val):
                    try:
                        if isinstance(credit_val, (int, float)):
                            credit_clean = float(credit_val)
                        else:
                            credit_str = str(credit_val).replace(',', '.').replace(' ', '')
                            credit_clean = float(credit_str) if credit_str else 0
                    except:
                        credit_clean = 0
                
                # Пропускаем нулевые операции
                if debit_clean == 0 and credit_clean == 0:
                    skipped_rows.append(f"Строка {index+1}: обе суммы нулевые")
                    continue
                
                # Определяем тип и сумму
                if debit_clean > 0:
                    transaction_type = 'expense'
                    amount = debit_clean
                elif credit_clean > 0:
                    transaction_type = 'income'
                    amount = credit_clean
                else:
                    skipped_rows.append(f"Строка {index+1}: не удалось определить тип транзакции")
                    continue
                
                # Формируем описание
                description = f"{operation} {recipient}".strip()
                
                if not description:
                    description = f"Транзакция Мбанк {index + 1}"
                
                # Определяем категорию по описанию
                detected_category = detect_category(description)
                
                # Если категория еще не создана, создаем ее
                if detected_category not in categories_cache:
                    if detected_category in category_keywords:
                        category_data = category_keywords[detected_category]
                        category_obj, created = Category.objects.get_or_create(
                            user=user,
                            name=detected_category,
                            defaults={
                                'color': category_data['color'],
                                'icon': category_data.get('icon', 'fas fa-circle')
                            }
                        )
                        categories_cache[detected_category] = category_obj
                        if created:
                            created_categories.append(detected_category)
                            print(f"Создана новая категория: {detected_category}")
                    else:
                        categories_cache[detected_category] = mbank_category
                
                category = categories_cache[detected_category]
                
                # Обновляем статистику по категориям
                if detected_category not in category_stats:
                    category_stats[detected_category] = 0
                category_stats[detected_category] += 1
                
                print(f"Определена категория: {detected_category} для описания: {description}")
                
                # Парсим дату и время из выписки
                transaction_datetime = None
                if pd.notna(date_val) and str(date_val).strip() not in ['', 'NaN', 'NaT', 'None']:
                    date_time_str = str(date_val).strip()
                    try:
                        datetime_formats = [
                            '%d.%m.%Y %H:%M',
                            '%d.%m.%Y %H:%M:%S',
                            '%d.%m.%Y',
                            '%Y-%m-%d %H:%M:%S',
                            '%Y-%m-%d %H:%M',
                            '%Y-%m-%d',
                        ]
                        
                        for fmt in datetime_formats:
                            try:
                                transaction_datetime = datetime.strptime(date_time_str, fmt)
                                break
                            except:
                                continue
                        
                        if transaction_datetime is None:
                            transaction_datetime = pd.to_datetime(date_time_str)
                            
                    except Exception as e:
                        print(f"Ошибка парсинга даты '{date_time_str}': {e}")
                        transaction_datetime = timezone.now()
                else:
                    transaction_datetime = timezone.now()
                
                print(f"Создаем транзакцию: {transaction_datetime} - {amount} - {transaction_type} - {description} - категория: {detected_category}")
                
                # Проверяем, нет ли уже такой транзакции
                existing_transaction = Transaction.objects.filter(
                    user=user,
                    amount=amount,
                    type=transaction_type,
                    description=description,
                    transaction_date=transaction_datetime
                ).first()
                
                if existing_transaction:
                    skipped_rows.append(f"Строка {index+1}: дубликат транзакции")
                    continue
                
                # Создаем транзакцию
                Transaction.objects.create(
                    user=user,
                    amount=amount,
                    type=transaction_type,
                    description=description,
                    category=category,
                    transaction_date=transaction_datetime
                )
                
                transactions_created += 1
                print(f"✅ УСПЕШНО создана транзакция #{transactions_created} в категории {detected_category}")
                
            except Exception as e:
                error_msg = f"Строка {index+1}: {str(e)}"
                errors.append(error_msg)
                print(f"❌ Ошибка в строке {index+1}: {e}")
                continue
        
        # Формируем результат
        result_stats = {
            'transactions_created': transactions_created,
            'initial_balance_added': initial_balance_found,
            'initial_balance_amount': float(initial_balance) if initial_balance_found else 0
        }
        
        print(f"=== ИТОГ ИМПОРТА ===")
        print(f"Создано транзакций: {transactions_created}")
        if initial_balance_found:
            print(f"Добавлен начальный баланс: {initial_balance}")
        print(f"Ошибок: {len(errors)}")
        print(f"Пропущено строк: {len(skipped_rows)}")
        print("Распределение по категориям:")
        for category_name, count in category_stats.items():
            print(f"  - {category_name}: {count}")
        
        if created_categories:
            print("Созданные категории:")
            for category_name in created_categories:
                print(f"  - {category_name}")
        
        result = {
            'success': transactions_created > 0 or initial_balance_found,
            'message': f'Успешно импортировано {transactions_created} транзакций из Мбанка' + 
                      (f' и добавлен начальный баланс {initial_balance}' if initial_balance_found else ''),
            'count': transactions_created,
            'category_stats': category_stats,
            'created_categories': created_categories,
            'initial_balance': result_stats
        }
        
        if errors:
            result['warnings'] = errors[:5]
        
        return result
        
    except Exception as e:
        print(f"❌ КРИТИЧЕСКАЯ ОШИБКА: {e}")
        import traceback
        print(traceback.format_exc())
        return {'success': False, 'message': f'Критическая ошибка: {str(e)}'}
    


@login_required
@require_POST
@csrf_protect
def import_optima_view(request):
    """Обработка импорта из Optima Bank для всех пользователей"""
    try:
        if not request.FILES.get('optima_file'):
            return JsonResponse({
                'success': False, 
                'message': 'Файл не выбран'
            })
        
        uploaded_file = request.FILES['optima_file']
        
        print(f"=== НАЧАЛО ОБРАБОТКИ OPTIMA ЗАПРОСА ===")
        print(f"Пользователь: {request.user.username}")
        print(f"Тип пользователя: {type(request.user)}")
        print(f"Файл: {uploaded_file.name}, размер: {uploaded_file.size}")
        
        # Проверяем расширение файла
        file_name = uploaded_file.name.lower()
        if not file_name.endswith('.pdf'):
            return JsonResponse({
                'success': False, 
                'message': 'Поддерживаются только PDF файлы для Optima Bank'
            })
        
        # Сохраняем временный файл
        temp_dir = 'temp_imports'
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f'optima_import_{request.user.id}_{uploaded_file.name}')
        
        with open(temp_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        print(f"Файл сохранен: {temp_path}")
        
        try:
            # Вызываем функцию импорта с правильным пользователем
            result = import_optima_bank(temp_path, request.user)
            
            # Добавляем отладочную информацию
            result['debug'] = {
                'user': request.user.username,
                'file': uploaded_file.name,
                'file_size': uploaded_file.size
            }
            
            return JsonResponse(result)
            
        except Exception as e:
            print(f"❌ Ошибка в import_optima_bank: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({
                'success': False, 
                'message': f'Ошибка при импорте данных: {str(e)}'
            })
        finally:
            # Удаляем временный файл
            if os.path.exists(temp_path):
                os.remove(temp_path)
                print(f"Временный файл удален: {temp_path}")
                
    except Exception as e:
        print(f"❌ ОШИБКА В OPTIMA VIEW: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False, 
            'message': f'Ошибка при обработке файла: {str(e)}'
        })

def import_optima_bank(file_path, user_obj):
    """
    Умная функция импорта транзакций из Optima Bank с автоматическим определением категорий
    """
    try:
        print(f"=== НАЧАЛО ИМПОРТА OPTIMA BANK ДЛЯ {user_obj.username} ===")
        
        # Импортируем библиотеки для работы с PDF
        try:
            import pdfplumber
            import re
        except ImportError as e:
            print(f"❌ Не установлены необходимые библиотеки: {e}")
            return {'success': False, 'message': 'Не установлены библиотеки для работы с PDF. Установите: pip install pdfplumber'}
        
        # Создаем категорию Optima Bank
        optima_category, created = Category.objects.get_or_create(
            user=user_obj,
            name='Optima Bank',
            defaults={
                'color': '#FF6B6B',
                'icon': '/static/main/icons/optima.svg'
            }
        )
        
        # СЛОВАРЬ КАТЕГОРИЙ И КЛЮЧЕВЫХ СЛОВ
        category_keywords = {
            'Google': {
                'keywords': ['GOOGLE', 'Google'],
                'color': "#4285F4",
                'icon': 'fab fa-google'
            },
            'Facebook': {
                'keywords': ['FACEBK', 'Facebook'],
                'color': "#1877F2",
                'icon': 'fab fa-facebook'
            },
            'Instagram': {
                'keywords': ['INSTAGRAM', 'Instagram'],
                'color': "#E4405F",
                'icon': 'fab fa-instagram'
            },
            'WhatsApp': {
                'keywords': ['WhatsApp'],
                'color': "#25D366",
                'icon': 'fab fa-whatsapp'
            },
            'Курсы': {
                'keywords': ['COURSERA', 'ALISON', 'Udemy'],
                'color': "#FF6B6B",
                'icon': 'fas fa-graduation-cap'
            },
            'Продукты': {
                'keywords': ['SPAR', 'Globus', 'Перекресток', 'BAR PEREKRESTOK', 'Magazin Dobryi'],
                'color': "#4CAF50",
                'icon': 'fas fa-shopping-basket'
            },
            'Транспорт': {
                'keywords': ['Yandex', 'Uber', 'Bolt'],
                'color': "#FFA000",
                'icon': 'fas fa-taxi'
            },
            'Тулпар': {
                'keywords': ['Тулпар', 'TULPAR'],
                'color': "#8B80F9",
                'icon': '/static/main/icons/tulpar.svg'
            },
            'Куликовский': {
                'keywords': ['Kulikovskiy', 'куликовский'],
                'color': "#5D8BF4",
                'icon': '/static/main/icons/kulikov.svg'
            },
            'Globus': {
                'keywords': ['globus', 'глобус'],
                'color': '#FF7B7B',
                'icon': '/static/main/icons/globus.svg'
            },
            'Аптека': {
                'keywords': ['аптека', 'apteka', 'pharmacy', 'медтехника', 'фармация', 'дарыкана'],
                'color': '#4ECDC4',
                'icon': 'fas fa-pills'
            },
            'Мой дом': {
                'keywords': ['Мой дом'],
                'color': '#10D452',
                'icon': '/static/main/icons/moi-dom.svg'
            },
            'Интернет': {
                'keywords': ['Exnet', 'homeline', 'megaline', 'skynet', 'fastnet', 'aknet', 'neotelecom', 'акнет', 'фастнет', 'скайнет', 'мега-лайн'],
                'color': "#A0AABC",
                'icon': 'fa-solid fa-wifi'
            },
            'KFC': {
                'keywords': ['KFC'],
                'color': "#FFCC00",
                'icon': '/static/main/icons/kfc.svg'
            },
            'Lalafo': {
                'keywords': ['Lalafo'],
                'color': "#00FF88",
                'icon': '/static/main/icons/lalafo.svg'
            },
            'Finca Bank': {
                'keywords': ['Finca', 'финка', 'FINCA_Bank'],
                'color': "#FF3366",
                'icon': '/static/main/icons/finca.svg'
            },
            'Элкарт': {
                'keywords': ['Элкарт'],
                'color': "#3399FF",
                'icon': '/static/main/icons/elcard.svg'
            },
            'MEGA': {
                'keywords': ['Mega', 'megacom'],
                'color': "#00FF66",
                'icon': '/static/main/icons/mega.svg'
            },
            'O!Dengi': {
                'keywords': ['O!Dengi', 'оденьги', 'O!'],
                'color': "#FF27A6",
                'icon': '/static/main/icons/o.svg'
            },
            'Dodo Pizza': {
                'keywords': ['Dodo', 'Dodo Pizza', 'Додо пицца'],
                'color': "#FF4444",
                'icon': '/static/main/icons/dodo.svg'
            },
            'Optima Bank': {
                'keywords': ['optima', 'оптима'],
                'color': "#CCCCCC",
                'icon': '/static/main/icons/optima.svg'
            },
            'Оптовые цены': {
                'keywords': ['Оптовые цены'],
                'color': "#66B3FF",
                'icon': 'fa-solid fa-cart-shopping'
            },
            'Spar': {
                'keywords': ['Spar'],
                'color': "#FF6B6B",
                'icon': '/static/main/icons/spar.svg'
            },
            'Перекресток': {
                'keywords': ['Перекресток'],
                'color': "#9D95FF",
                'icon': '/static/main/icons/per.svg'
            }
        }
        
        # Функция для определения категории по описанию
        def detect_category(description):
            desc_lower = description.lower()
            
            for category_name, category_data in category_keywords.items():
                for keyword in category_data['keywords']:
                    if keyword.lower() in desc_lower:
                        return category_name
            
            return 'Optima Bank'
        
        # Кэш для категорий
        categories_cache = {'Optima Bank': optima_category}
        
        # Читаем PDF файл
        transactions_created = 0
        errors = []
        
        try:
            with pdfplumber.open(file_path) as pdf:
                all_text = ""
                
                # Извлекаем текст со всех страниц
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        all_text += page_text + "\n"
                
                print(f"Извлеченный текст из PDF ({len(all_text)} символов)")
                
                # УЛУЧШЕННЫЙ ПАРСИНГ ТРАНЗАКЦИЙ - ИЩЕМ РЕАЛЬНОЕ ВРЕМЯ
                transactions_data = []
                
                # Разбиваем на строки и ищем транзакции
                lines = all_text.split('\n')
                
                i = 0
                while i < len(lines):
                    line = lines[i].strip()
                    # Очищаем от спецсимволов
                    line = line.replace('\u200b', '').replace('\xa0', ' ').strip()
                    
                    # Пропускаем пустые и служебные строки
                    if not line or any(phrase in line.lower() for phrase in [
                        'фио', 'инн', 'адрес', 'номер счета', 'номер карты', 'валюта счета',
                        'период:', 'остаток на', 'дата создания', 'оао "оптима банк"', 'тел.:'
                    ]):
                        i += 1
                        continue
                    
                    # ИЩЕМ СТРОКУ С ДАТОЙ В ФОРМАТЕ DD.MM.YYYY
                    date_match = re.match(r'(\d{2}\.\d{2}\.\d{4})', line)
                    if date_match:
                        date_str = date_match.group(1)
                        time_str = "00:00"  # По умолчанию
                        description = ""
                        amount_kgs = None
                        
                        # Ищем время в текущей строке
                        time_match = re.search(r'(\d{1,2}:\d{2})', line)
                        if time_match:
                            time_str = time_match.group(1)
                            print(f"🕒 Найдено время в текущей строке: {time_str}")
                        else:
                            # Ищем время в следующих строках (максимум 2 строки)
                            for j in range(i+1, min(i+3, len(lines))):
                                next_line = lines[j].strip()
                                next_line = next_line.replace('\u200b', '').replace('\xa0', ' ').strip()
                                time_match = re.search(r'(\d{1,2}:\d{2})', next_line)
                                if time_match:
                                    time_str = time_match.group(1)
                                    print(f"🕒 Найдено время в следующей строке {j+1}: {time_str}")
                                    break
                        
                        # Извлекаем описание (убираем дату)
                        desc_line = line[date_match.end():].strip()
                        
                        # Ищем сумму в KGS в этой строке
                        amount_match = re.search(r'([-]?\d{1,3}(?:\s?\d{3})*(?:[.,]\d+)?)\s?KGS', desc_line)
                        if amount_match:
                            amount_str = amount_match.group(1).replace(' ', '').replace(',', '.')
                            try:
                                amount_val = Decimal(amount_str)
                                if amount_val != 0:  # Игнорируем нулевые суммы
                                    amount_kgs = amount_val
                                    # Убираем сумму из описания
                                    desc_line = desc_line[:amount_match.start()] + desc_line[amount_match.end():]
                            except (ValueError, InvalidOperation):
                                pass
                        
                        description = desc_line.strip()
                        
                        # Если не нашли сумму в этой строке, проверяем следующие строки
                        if amount_kgs is None:
                            for j in range(i+1, min(i+3, len(lines))):
                                next_line = lines[j].strip()
                                if not next_line:
                                    continue
                                
                                # Пропускаем строки, которые уже использовались для времени
                                if re.match(r'^\d{1,2}:\d{2}$', next_line):
                                    continue
                                
                                # Ищем сумму в следующей строке
                                amount_match = re.search(r'([-]?\d{1,3}(?:\s?\d{3})*(?:[.,]\d+)?)\s?KGS', next_line)
                                if amount_match:
                                    amount_str = amount_match.group(1).replace(' ', '').replace(',', '.')
                                    try:
                                        amount_val = Decimal(amount_str)
                                        if amount_val != 0:
                                            amount_kgs = amount_val
                                            # Добавляем описание из следующей строки (без суммы)
                                            desc_part = next_line[:amount_match.start()].strip()
                                            if desc_part and len(description) < 100:
                                                description += ' ' + desc_part
                                            break
                                    except (ValueError, InvalidOperation):
                                        pass
                                elif len(description) < 100:
                                    # Добавляем к описанию если нет суммы
                                    description += ' ' + next_line
                        
                        # Если нашли сумму, добавляем транзакцию
                        if amount_kgs is not None and description:
                            transaction_type = 'expense' if amount_kgs < 0 else 'income'
                            amount_abs = abs(amount_kgs)
                            
                            transactions_data.append({
                                'date': date_str,
                                'time': time_str,
                                'description': description.strip(),
                                'amount': amount_abs,
                                'type': transaction_type
                            })
                    
                    i += 1
                
                print(f"Найдено {len(transactions_data)} транзакций для обработки")
                
                # ВЫВОДИМ ПЕРВЫЕ ТРАНЗАКЦИИ ДЛЯ ПРОВЕРКИ ВРЕМЕНИ
                print("=== ПЕРВЫЕ ТРАНЗАКЦИИ ДЛЯ ПРОВЕРКИ ===")
                for idx, trans in enumerate(transactions_data[:10]):
                    print(f"{idx+1}. Дата: {trans['date']} | Время: {trans['time']} | Сумма: {trans['amount']} | Описание: {trans['description'][:50]}...")
                print("=====================================")
                
                # СОЗДАНИЕ ТРАНЗАКЦИЙ В БАЗЕ - СОХРАНЯЕМ РЕАЛЬНОЕ ВРЕМЯ
                for transaction in transactions_data:
                    try:
                        # Определяем категорию
                        detected_category = detect_category(transaction['description'])
                        
                        # Создаем/получаем категорию
                        if detected_category not in categories_cache:
                            if detected_category in category_keywords:
                                category_data = category_keywords[detected_category]
                                category_obj, created = Category.objects.get_or_create(
                                    user=user_obj,
                                    name=detected_category,
                                    defaults={
                                        'color': category_data['color'],
                                        'icon': category_data.get('icon', 'fas fa-circle')
                                    }
                                )
                                categories_cache[detected_category] = category_obj
                            else:
                                categories_cache[detected_category] = optima_category
                        
                        category = categories_cache[detected_category]
                        
                        # СОЗДАЕМ ДАТУ С РЕАЛЬНЫМ ВРЕМЕНЕМ ИЗ ВЫПИСКИ
                        date_str = transaction['date']
                        time_str = transaction['time']
                        
                        try:
                            # Создаем datetime объект с реальным временем
                            datetime_str = f"{date_str} {time_str}"
                            naive_datetime = datetime.strptime(datetime_str, '%d.%m.%Y %H:%M')
                            

                            bishkek_tz = pytz.timezone('Asia/Bishkek')
                            transaction_datetime = bishkek_tz.localize(naive_datetime)
                            
                            print(f"🕒 Сохраняем время: {transaction_datetime}")
                            
                        except Exception as e:
                            print(f"❌ Ошибка создания datetime: {e}")
                            transaction_datetime = timezone.now()
                        
                        # Проверяем существующую транзакцию
                        existing = Transaction.objects.filter(
                            user=user_obj,
                            amount=transaction['amount'],
                            type=transaction['type'],
                            description=transaction['description'],
                            transaction_date__date=transaction_datetime.date()
                        ).first()
                        
                        if existing:
                            print(f"⏩ Пропущен дубликат: {transaction['description']}")
                            continue
                        
                        # СОЗДАЕМ ТРАНЗАКЦИЮ С РЕАЛЬНЫМ ВРЕМЕНЕМ
                        Transaction.objects.create(
                            user=user_obj,
                            amount=transaction['amount'],
                            type=transaction['type'],
                            description=transaction['description'],
                            category=category,
                            transaction_date=transaction_datetime
                        )
                        
                        transactions_created += 1
                        print(f"✅ Создана транзакция #{transactions_created}: {transaction_datetime} - {transaction['amount']} - {transaction['description'][:30]}...")
                        
                    except Exception as e:
                        errors.append(f"Ошибка: {e}")
                        print(f"❌ Ошибка создания транзакции: {e}")
                        continue
                        
        except Exception as e:
            print(f"❌ Ошибка при обработке PDF: {e}")
            return {'success': False, 'message': f'Ошибка при обработке PDF файла: {str(e)}'}
        
        # ФОРМИРУЕМ РЕЗУЛЬТАТ
        result = {
            'success': transactions_created > 0,
            'message': f'Успешно импортировано {transactions_created} транзакций из Optima Bank',
            'count': transactions_created,
        }
        
        if errors:
            result['warnings'] = errors[:5]
        
        print(f"=== ИТОГ: {transactions_created} транзакций создано ===")
        return result
        
    except Exception as e:
        print(f"❌ КРИТИЧЕСКАЯ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'message': f'Критическая ошибка: {str(e)}'}