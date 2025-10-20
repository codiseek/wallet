from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from main.models import SystemNotification, UserNotification

class Command(BaseCommand):
    help = 'Distribute existing notifications to all users'

    def handle(self, *args, **options):
        active_notifications = SystemNotification.objects.filter(is_active=True)
        users = User.objects.all()
        
        created_count = 0
        for notification in active_notifications:
            for user in users:
                # Создаем запись, если ее еще нет
                obj, created = UserNotification.objects.get_or_create(
                    user=user,
                    notification=notification,
                    defaults={'is_read': False}
                )
                if created:
                    created_count += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully distributed {created_count} notifications to {users.count()} users'
            )
        )