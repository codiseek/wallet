"""
URL configuration for wallet project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from main import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('hello/', views.hello, name='hello'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('register/', views.register, name='register'),
    path('add_transaction/', views.add_transaction, name='add_transaction'),
    path('add_category/', views.add_category, name='add_category'),
    path('delete_category/<int:category_id>/', views.delete_category, name='delete_category'),
    path('get_categories_with_stats/', views.get_categories_with_stats, name='get_categories_with_stats'),
    path('get_categories/', views.get_categories, name='get_categories'),
    path('delete_transaction/<int:transaction_id>/', views.delete_transaction, name='delete_transaction'), 
    path('change_password/', views.change_password, name='change_password'),
    path('get_transactions/', views.get_transactions, name='get_transactions'),
    path('get_notes/', views.get_notes, name='get_notes'),
    path('add_note/', views.add_note, name='add_note'),
    path('edit_note/<int:note_id>/', views.edit_note, name='edit_note'),
    path('delete_note/<int:note_id>/', views.delete_note, name='delete_note'),
    path('mark_note_as_reminded/<int:note_id>/', views.mark_note_as_reminded, name='mark_note_as_reminded'),
    path('get_pending_reminders/', views.get_pending_reminders, name='get_pending_reminders'),
    path('update_reserve_percentage/', views.update_reserve_percentage, name='update_reserve_percentage'),
    path('update_target_reserve/', views.update_target_reserve, name='update_target_reserve'),
    path('update_reserve_percentage/', views.update_reserve_percentage, name='update_reserve_percentage'),
    path('update_target_reserve/', views.update_target_reserve, name='update_target_reserve'),
    path('webpush/', include('webpush.urls')),
    path('send_note_reminder/', views.send_note_reminder, name='send_note_reminder'),
    path('get_pending_reminders/', views.get_pending_reminders, name='get_pending_reminders'),
    path('get_category_stats/<int:category_id>/', views.get_category_stats, name='get_category_stats'),
    path('notifications/create/', views.create_system_notification, name='create_system_notification'),
    path('notifications/', views.get_user_notifications, name='get_user_notifications'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_as_read, name='mark_notification_as_read'),
    path('notifications/<int:notification_id>/delete/', views.delete_system_notification, name='delete_system_notification'),
    path('notifications/distribute/', views.distribute_existing_notifications, name='distribute_notifications'),
]