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

from django.conf import settings
from django.conf.urls.static import static

from django.conf.urls.i18n import i18n_patterns

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
    path('notifications/personal/', views.get_personal_notifications, name='get_personal_notifications'),
    path('update_currency/', views.update_currency, name='update_currency'),
    path('desktop/', views.desktop, name='desktop'),
    path('notifications/mark_all_as_read/', views.mark_all_notifications_read, name='mark_all_notifications_read'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_as_read, name='mark_notification_read'),
    path('notifications/<int:notification_id>/chat/', views.get_chat_messages, name='get_chat_messages'),
    path('notifications/<int:notification_id>/chat/send/', views.send_chat_message, name='send_chat_message'),
    path('notifications/admin/chats/', views.get_admin_chats, name='get_admin_chats'),
    path('notifications/<int:notification_id>/chat/send/', views.send_chat_message, name='send_chat_message'),
    path('admin_panel/get_stats/', views.get_admin_stats, name='admin_get_stats'),
    path('admin_panel/get_users/', views.get_admin_users, name='admin_get_users'),
    path('todo/get/', views.get_todos, name='get_todos'),
    path('todo/add/', views.add_todo, name='add_todo'),
    path('todo/get/<int:todo_id>/', views.get_todo, name='get_todo'),
    path('todo/update/<int:todo_id>/', views.update_todo, name='update_todo'),
    path('todo/delete/<int:todo_id>/', views.delete_todo, name='delete_todo'),
    path('todo/toggle/<int:todo_id>/', views.toggle_todo, name='toggle_todo'),
    path('notifications/delete_all/', views.delete_all_notifications, name='delete_all_notifications'),
    path('notifications/<int:notification_id>/delete_chat/', views.delete_chat_completely, name='delete_chat_completely'),
    path('api/debts/', views.debt_list, name='debt_list'),
    path('api/debts/create/', views.create_debt, name='create_debt'),
    path('api/debts/statistics/', views.debt_statistics, name='debt_statistics'),
    path('api/debts/<int:debt_id>/update_status/', views.update_debt_status, name='update_debt_status'),
    path('debts/<int:debt_id>/update_status/', views.update_debt_status, name='update_debt_status'),
    path('api/debts/<int:debt_id>/delete/', views.delete_debt, name='delete_debt'),
    path('admin/check_overdue_debts/', views.trigger_overdue_check, name='check_overdue_debts'),
    path('api/debts/<int:debt_id>/add_payment/', views.add_debt_payment, name='add_debt_payment'),
    path('api/debts/<int:debt_id>/pay_full/', views.pay_full_debt, name='pay_full_debt'),
    path('api/debts/<int:debt_id>/payments/', views.get_debt_payments, name='get_debt_payments'),
    path('export-data/', views.export_user_data, name='export_data'),
    path('import-data/', views.import_user_data, name='import_data'),
    path('update-language/', views.update_language, name='update_language'),
    path('i18n/', include('django.conf.urls.i18n')),
    path('get_profile_info/', views.get_profile_info, name='get_profile_info'),
    path('update_profile/', views.update_profile, name='update_profile'),

    
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)