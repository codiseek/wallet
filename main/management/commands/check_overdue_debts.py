from django.core.management.base import BaseCommand
from django.utils import timezone
from main.models import Debt, SystemNotification, UserNotification, NotificationChat, ChatMessage

class Command(BaseCommand):
    help = 'Проверка просроченных долгов и создание уведомлений'

    def handle(self, *args, **options):
        try:
            today = timezone.now().date()
            overdue_debts = Debt.objects.filter(
                due_date__lt=today,
                status__in=['active', 'delay_7'],
                overdue_notification_sent=False
            ).select_related('user')
            
            self.stdout.write(f"Найдено {len(overdue_debts)} просроченных долгов")
            
            for debt in overdue_debts:
                # Создаем уведомление
                notification = SystemNotification.objects.create(
                    title='🔔 Просроченный долг',
                    message=f'Долг от {debt.debtor_name} на сумму {debt.amount} просрочен. Срок возврата был {debt.due_date.strftime("%d.%m.%Y")}.',
                    created_by=debt.user,
                    target_user=debt.user,
                    has_chat=True
                )
                
                UserNotification.objects.create(
                    user=debt.user,
                    notification=notification
                )
                
                # Создаем чат
                chat = NotificationChat.objects.create(notification=notification)
                ChatMessage.objects.create(
                    chat=chat,
                    user=debt.user,
                    message=f"Долг от {debt.debtor_name} просрочен. Сумма: {debt.amount}. Срок был: {debt.due_date.strftime('%d.%m.%Y')}."
                )
                
                debt.overdue_notification_sent = True
                debt.last_overdue_check = timezone.now()
                debt.save()
                
                self.stdout.write(
                    self.style.SUCCESS(f'Создано уведомление для долга {debt.id}')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Ошибка: {str(e)}')
            )