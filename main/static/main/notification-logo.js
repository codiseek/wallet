// notification-logo.js
// Функционал модалки уведомлений

// -----------------------------
// Глобальные переменные
// -----------------------------
let notificationsModal2 = null;
let notificationLogoBtn2 = null;
let notificationIndicator2 = null;
let userNotifications = [];
let unreadCount = 0;

// -----------------------------
// Инициализация модалки уведомлений
// -----------------------------
function initNotificationsModal2() {
    console.log('Initializing notifications modal 2...');
    
    notificationsModal2 = document.getElementById('notificationsModal2');
    notificationLogoBtn2 = document.getElementById('notificationLogoBtn2');
    notificationIndicator2 = document.getElementById('notificationIndicator2');
    const closeBtn2 = document.getElementById('closeNotificationsModal2');

    console.log('Modal2 found:', !!notificationsModal2);
    console.log('Button2 found:', !!notificationLogoBtn2);
    console.log('Indicator2 found:', !!notificationIndicator2);

    if (!notificationsModal2) {
        console.error('Notifications modal 2 not found');
        return;
    }

    if (!notificationLogoBtn2) {
        console.error('Notification logo button 2 not found');
        return;
    }

    // Загружаем уведомления при инициализации
    loadUserNotifications();

    // Открытие модалки
    notificationLogoBtn2.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Notification button 2 clicked');
        openNotificationsModal2();
    });

    // Закрытие модалки
    if (closeBtn2) {
        closeBtn2.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeNotificationsModal2();
        });
    }

    // Закрытие по клику вне модалки
    notificationsModal2.addEventListener('click', function(e) {
        if (e.target === notificationsModal2) {
            closeNotificationsModal2();
        }
    });

    // Фильтрация уведомлений
    const filterBtns2 = document.querySelectorAll('.filter-notification-btn');
    filterBtns2.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const filter = this.dataset.filter;
            
            // Обновляем активную кнопку фильтра
            filterBtns2.forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('bg-gray-700', 'text-gray-300');
            });
            this.classList.remove('bg-gray-700', 'text-gray-300');
            this.classList.add('bg-blue-600', 'text-white');

            // Применяем фильтр
            applyNotificationsFilter2(filter);
        });
    });

    // Обработка кликов по уведомлениям
    document.addEventListener('click', function(e) {
        const notificationItem = e.target.closest('.notification-item');
        if (notificationItem) {
            const notificationId = notificationItem.dataset.id;
            markNotificationAsRead2(notificationId, notificationItem);
        }
        
        // Обработка удаления уведомления (для админа)
        const deleteBtn = e.target.closest('.delete-notification-btn');
        if (deleteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const notificationId = deleteBtn.dataset.notificationId;
            deleteSystemNotification(notificationId, deleteBtn.closest('.notification-item'));
        }
    });

    // Инициализация счетчика уведомлений
    updateNotificationsCounter2();
}

// -----------------------------
// Загрузка уведомлений пользователя
// -----------------------------
async function loadUserNotifications() {
    try {
        const response = await fetch('/notifications/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            userNotifications = data.notifications;
            unreadCount = data.unread_count;
            renderNotificationsList2();
            updateNotificationsCounter2();
        } else {
            console.error('Ошибка загрузки уведомлений:', data.error);
        }
    } catch (error) {
        console.error('Ошибка при загрузке уведомлений:', error);
    }
}

// -----------------------------
// Отображение списка уведомлений
// -----------------------------
function renderNotificationsList2() {
    const notificationsList2 = document.getElementById('notificationsList2');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    const counterElement2 = document.getElementById('notificationsCount2');
    
    if (!notificationsList2) return;

    // Обновляем счетчик
    if (counterElement2) {
        counterElement2.textContent = userNotifications.length;
    }

    if (userNotifications.length === 0) {
        if (emptyState2) emptyState2.classList.remove('hidden');
        notificationsList2.innerHTML = '';
        return;
    }

    if (emptyState2) emptyState2.classList.add('hidden');

    let notificationsHTML = '';
    
    userNotifications.forEach(notif => {
        const isUnread = !notif.is_read;
        const timeAgo = getTimeAgo(notif.created_at);
        
        notificationsHTML += `
            <div class="notification-item bg-gray-700/30 border ${isUnread ? 'border-blue-500/20 bg-blue-500/10' : 'border-gray-600/30'} rounded-xl p-3 animate-fadeIn cursor-pointer hover:bg-gray-700/50 transition-all" 
                 data-id="${notif.id}" data-unread="${isUnread}" data-notification-id="${notif.notification_id}">
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 rounded-full ${isUnread ? 'bg-blue-500/20' : 'bg-gray-600/20'} flex items-center justify-center flex-shrink-0 mt-1">
                        <i class="fas fa-bullhorn ${isUnread ? 'text-blue-400' : 'text-gray-400'} text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between mb-1">
                            <h3 class="text-sm font-semibold ${isUnread ? 'text-white' : 'text-gray-300'} truncate">${escapeHtml(notif.title)}</h3>
                            <span class="text-xs ${isUnread ? 'text-blue-400' : 'text-gray-500'} font-medium ml-2 whitespace-nowrap">${timeAgo}</span>
                        </div>
                        <p class="text-xs ${isUnread ? 'text-gray-300' : 'text-gray-400'} leading-relaxed">
                            ${escapeHtml(notif.message)}
                        </p>
                        ${isUnread ? `
                        <div class="flex items-center space-x-2 mt-2">
                            <span class="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                            <span class="text-xs text-blue-400">Новое</span>
                        </div>
                        ` : ''}
                        
                        <!-- Кнопка удаления для админа -->
                        ${window.isAdmin ? `
                        <div class="flex justify-end mt-2">
                            <button class="delete-notification-btn text-xs text-red-400 hover:text-red-300 transition-colors p-1" 
                                    data-notification-id="${notif.notification_id}"
                                    title="Удалить уведомление">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    notificationsList2.innerHTML = notificationsHTML;
    applyNotificationsFilter2('all'); // Применяем фильтр по умолчанию
}

// -----------------------------
// Пометить уведомление как прочитанное
// -----------------------------
async function markNotificationAsRead2(notificationId, notificationElement) {
    try {
        const response = await fetch(`/notifications/${notificationId}/read/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем стиль уведомления
            notificationElement.classList.remove('bg-blue-500/10', 'border-blue-500/20');
            notificationElement.classList.add('bg-gray-700/30', 'border-gray-600/30');
            notificationElement.setAttribute('data-unread', 'false');
            
            // Убираем индикатор нового сообщения
            const newIndicator = notificationElement.querySelector('.bg-blue-400');
            if (newIndicator && newIndicator.parentElement) {
                newIndicator.parentElement.remove();
            }
            
            // Обновляем заголовок
            const title = notificationElement.querySelector('h3');
            if (title) {
                title.classList.remove('text-white');
                title.classList.add('text-gray-300');
            }
            
            // Обновляем текст
            const message = notificationElement.querySelector('p');
            if (message) {
                message.classList.remove('text-gray-300');
                message.classList.add('text-gray-400');
            }
            
            // Обновляем время
            const time = notificationElement.querySelector('span.text-blue-400');
            if (time) {
                time.classList.remove('text-blue-400');
                time.classList.add('text-gray-500');
            }
            
            // Обновляем иконку
            const icon = notificationElement.querySelector('.fa-bullhorn');
            const iconContainer = notificationElement.querySelector('.w-8.h-8.rounded-full');
            if (icon && iconContainer) {
                icon.classList.remove('text-blue-400');
                icon.classList.add('text-gray-400');
                iconContainer.classList.remove('bg-blue-500/20');
                iconContainer.classList.add('bg-gray-600/20');
            }

            // Обновляем счетчик
            unreadCount = Math.max(0, unreadCount - 1);
            updateNotificationsCounter2();
        }
    } catch (error) {
        console.error('Ошибка при отметке уведомления как прочитанного:', error);
    }
}

// -----------------------------
// Удаление системного уведомления (для админа)
// -----------------------------
async function deleteSystemNotification(notificationId, notificationElement) {
    if (!confirm('Вы уверены, что хотите удалить это уведомление? Оно будет удалено для всех пользователей.')) {
        return;
    }
    
    try {
        const response = await fetch(`/notifications/${notificationId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Плавно скрываем уведомление
            notificationElement.style.opacity = '0';
            notificationElement.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                notificationElement.remove();
                
                // Обновляем список уведомлений
                userNotifications = userNotifications.filter(n => n.notification_id != notificationId);
                
                // Проверяем пустой список
                const notificationsList2 = document.getElementById('notificationsList2');
                const emptyState2 = document.getElementById('emptyNotificationsState2');
                if (userNotifications.length === 0 && emptyState2) {
                    emptyState2.classList.remove('hidden');
                }
                
                updateNotificationsCounter2();
            }, 300);
        } else {
            alert('Ошибка при удалении уведомления: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка при удалении уведомления:', error);
        alert('Ошибка при удалении уведомления');
    }
}

// -----------------------------
// Фильтрация уведомлений
// -----------------------------
function applyNotificationsFilter2(filter) {
    const notifications = document.querySelectorAll('.notification-item');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    
    let visibleCount = 0;

    notifications.forEach(notification => {
        let show = false;
        const isUnread = notification.getAttribute('data-unread') === 'true';
        
        switch(filter) {
            case 'all':
                show = true;
                break;
            case 'unread':
                show = isUnread;
                break;
        }

        if (show) {
            notification.classList.remove('hidden');
            visibleCount++;
        } else {
            notification.classList.add('hidden');
        }
    });

    // Показываем/скрываем пустое состояние
    if (emptyState2) {
        if (visibleCount === 0 && userNotifications.length > 0) {
            // Есть уведомления, но они отфильтрованы
            emptyState2.innerHTML = `
                <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center">
                    <i class="fas fa-filter text-2xl text-gray-500"></i>
                </div>
                <p class="text-gray-400">Нет уведомлений по выбранному фильтру</p>
            `;
            emptyState2.classList.remove('hidden');
        } else if (userNotifications.length === 0) {
            // Нет уведомлений вообще
            emptyState2.innerHTML = `
                <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center">
                    <i class="fas fa-bell-slash text-2xl text-gray-500"></i>
                </div>
                <p class="text-gray-400">Уведомлений пока нет</p>
                <p class="text-sm text-gray-500 mt-1">Здесь будут появляться системные уведомления</p>
            `;
            emptyState2.classList.remove('hidden');
        } else {
            emptyState2.classList.add('hidden');
        }
    }
}

// -----------------------------
// Открытие модалки уведомлений
// -----------------------------
function openNotificationsModal2() {
    console.log('Opening notifications modal 2');
    if (!notificationsModal2) return;
    
    notificationsModal2.style.display = 'flex';
    setTimeout(() => {
        notificationsModal2.classList.remove('hidden');
        notificationsModal2.classList.add('animate-overlayFadeIn');
        
        const content = notificationsModal2.querySelector('.modal-content');
        if (content) {
            content.classList.remove('animate-modalHide');
            content.classList.add('animate-modalShow');
        }
        
        // Блокируем скролл фона
        document.body.classList.add('modal-open');
    }, 10);
}

// -----------------------------
// Закрытие модалки уведомлений
// -----------------------------
function closeNotificationsModal2() {
    console.log('Closing notifications modal 2');
    if (!notificationsModal2) return;
    
    const content = notificationsModal2.querySelector('.modal-content');
    if (content) {
        content.classList.remove('animate-modalShow');
        content.classList.add('animate-modalHide');
    }
    
    setTimeout(() => {
        notificationsModal2.classList.add('hidden');
        notificationsModal2.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 150);
}

// -----------------------------
// Обновление счетчика уведомлений
// -----------------------------
function updateNotificationsCounter2() {
    if (!notificationIndicator2) return;
    
    // Обновляем индикатор
    if (unreadCount > 0) {
        notificationIndicator2.classList.remove('hidden');
    } else {
        notificationIndicator2.classList.add('hidden');
    }
}

// -----------------------------
// Вспомогательные функции
// -----------------------------
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

// -----------------------------
// Функции для админ-панели уведомлений
// -----------------------------
function openCreateNotificationModal() {
    document.getElementById('createNotificationModal').classList.remove('hidden');
}

function closeCreateNotificationModal() {
    document.getElementById('createNotificationModal').classList.add('hidden');
    document.getElementById('createNotificationForm').reset();
}

// Обработчик формы создания уведомления
document.addEventListener('DOMContentLoaded', function() {
    const createNotificationForm = document.getElementById('createNotificationForm');
    if (createNotificationForm) {
        createNotificationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const title = document.getElementById('notificationTitle').value;
            const message = document.getElementById('notificationMessage').value;
            
            try {
                const response = await fetch('/notifications/create/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({
                        title: title,
                        message: message
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Уведомление успешно отправлено!');
                    closeCreateNotificationModal();
                    // Перезагружаем уведомления
                    loadUserNotifications();
                } else {
                    alert('Ошибка: ' + data.error);
                }
            } catch (error) {
                console.error('Ошибка при создании уведомления:', error);
                alert('Ошибка при создании уведомления');
            }
        });
    }
});

// -----------------------------
// Инициализация при загрузке
// -----------------------------
function initNotifications2() {
    console.log('DOM loaded - initializing notifications system 2');
    initNotificationsModal2();
    
    // Для демонстрации - показываем индикатор уведомлений через небольшую задержку
    setTimeout(() => {
        updateNotificationsCounter2();
    }, 1000);
}

// Ожидаем полной загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications2);
} else {
    initNotifications2();
}

// Экспортируем функции для глобального использования
window.initNotificationsModal2 = initNotificationsModal2;
window.openNotificationsModal2 = openNotificationsModal2;
window.closeNotificationsModal2 = closeNotificationsModal2;
window.loadUserNotifications = loadUserNotifications;
window.openCreateNotificationModal = openCreateNotificationModal;
window.closeCreateNotificationModal = closeCreateNotificationModal;