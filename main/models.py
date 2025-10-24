from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class NotificationChat(models.Model):
    notification = models.OneToOneField(
        'SystemNotification', 
        on_delete=models.CASCADE,
        related_name='chat'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Chat for {self.notification.title}"

class ChatMessage(models.Model):
    chat = models.ForeignKey(
        NotificationChat, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username}: {self.message[:50]}"

class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True, null=True)
    reminder_date = models.DateTimeField(blank=True, null=True)
    is_reminded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
    
class Category(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, default='fas fa-tag')
    color = models.CharField(max_length=7, default='#3b82f6')  # HEX цвет
    
    def __str__(self):
        return self.name

class Transaction(models.Model):
    TRANSACTION_TYPES = (
        ('income', 'Доход'),
        ('expense', 'Расход'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reserve_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.user.username} - {self.category} ({self.amount})"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    password_changed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    reserve_percentage = models.PositiveSmallIntegerField(default=0) 
    target_reserve = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    default_categories_created = models.BooleanField(default=False)

    CURRENCY_CHOICES = [
    ('c', 'Сом'),
    ('r', 'Рубль'),
    ('$', 'Доллар'),
    ('€', 'Евро'),
]
    currency = models.CharField(
    max_length=1, 
    choices=CURRENCY_CHOICES, 
    default='c'
)
    

    def __str__(self):
        return f"{self.user.username} Profile"


class SystemNotification(models.Model):
    title = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_chat = models.BooleanField(default=False) 
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    # Новое поле - для персональных уведомлений
    has_chat = models.BooleanField(default=False)
    target_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='personal_notifications',
        verbose_name='Персонально для пользователя'
    )
    
    def __str__(self):
        return self.title

    @property
    def is_personal(self):
        """Проверка, является ли уведомление персональным"""
        return self.target_user is not None
    

class UserNotification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification = models.ForeignKey(SystemNotification, on_delete=models.CASCADE)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'notification']
    
    def __str__(self):
        return f"{self.user.username} - {self.notification.title}"
    

class Todo(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Низкий'),
        ('medium', 'Средний'),
        ('high', 'Высокий'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']


# Сигнал для автоматического создания профиля при создании пользователя
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    # Создаем профиль, если его нет
    UserProfile.objects.get_or_create(user=instance)

   # Сигнал для создания уведомлений для нового пользователя
@receiver(post_save, sender=User)
def create_notifications_for_new_user(sender, instance, created, **kwargs):
    if created:
        # Получаем только ОБЩИЕ активные системные уведомления (не персональные)
        active_notifications = SystemNotification.objects.filter(
            is_active=True,
            target_user=None  # Только общие уведомления
        )
        
        # Создаем записи UserNotification для нового пользователя
        user_notifications = [
            UserNotification(user=instance, notification=notification)
            for notification in active_notifications
        ]
        
        if user_notifications:
            UserNotification.objects.bulk_create(user_notifications)
            print(f"Created {len(user_notifications)} general notifications for new user {instance.username}")