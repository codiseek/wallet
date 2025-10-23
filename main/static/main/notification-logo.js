

// -----------------------------
// Глобальные переменные
// -----------------------------
let notificationsModal2 = null;
let notificationLogoBtn2 = null;
let notificationIndicator2 = null;
let userNotifications = [];
let unreadCount = 0;




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
        
        // Исправленный блок - убраны лишние обратные кавычки
       // В блоке создания HTML для каждого уведомления замените на:
notificationsHTML += `
    <div class="notification-item bg-gray-700/30 border ${isUnread ? 'border-blue-500/20 bg-blue-500/10' : 'border-gray-600/30'} rounded-xl p-3 animate-fadeIn cursor-pointer hover:bg-gray-700/50 transition-all" 
         data-id="${notif.id}" data-unread="${isUnread}" data-notification-id="${notif.notification_id}">
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full ${isUnread ? 'bg-blue-500/20' : 'bg-gray-600/20'} flex items-center justify-center flex-shrink-0 mt-1">
                <i class="fas ${notif.is_personal ? 'fa-user text-green-400' : 'fa-bullhorn text-blue-400'} text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between mb-1">
                    <h3 class="text-sm font-semibold ${isUnread ? 'text-white' : 'text-gray-300'} truncate">${escapeHtml(notif.title)}</h3>
                    <span class="text-xs ${isUnread ? 'text-blue-400' : 'text-gray-500'} font-medium ml-2 whitespace-nowrap">${timeAgo}</span>
                </div>
                <p class="text-xs ${isUnread ? 'text-gray-300' : 'text-gray-400'} leading-relaxed">
                    ${escapeHtml(notif.message)}
                </p>
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center space-x-2">
                        ${isUnread ? `
                        <span class="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                        <span class="text-xs text-blue-400">Новое</span>
                        ` : ''}
                        ${notif.is_personal ? '<span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Персональное</span>' : ''}
                    </div>
                    <!-- Кнопка удаления для админа -->
                    ${window.isAdmin ? `
                    <button class="delete-notification-btn text-xs text-red-400 hover:text-red-300 transition-colors p-1" 
                            data-notification-id="${notif.notification_id}"
                            title="Удалить уведомление">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                    ` : ''}
                </div>
            </div>
        </div>
    </div>
`;
    });
    
    notificationsList2.innerHTML = notificationsHTML;
    applyNotificationsFilter2('all'); // Применяем фильтр по умолчанию
}




// -----------------------------
// Загрузка персональных уведомлений для админа
// -----------------------------
async function loadPersonalNotifications() {
    try {
        const response = await fetch('/notifications/personal/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderPersonalNotificationsList(data.notifications);
        } else {
            console.error('Ошибка загрузки персональных уведомлений:', data.error);
            renderPersonalNotificationsList([]);
        }
    } catch (error) {
        console.error('Ошибка при загрузке персональных уведомлений:', error);
        renderPersonalNotificationsList([]);
    }
}

// -----------------------------
// Отображение списка персональных уведомлений
// -----------------------------
function renderPersonalNotificationsList(personalNotifications) {
    const notificationsList2 = document.getElementById('notificationsList2');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    const counterElement2 = document.getElementById('notificationsCount2');
    
    if (!notificationsList2) return;

    // Обновляем счетчик
    if (counterElement2) {
        counterElement2.textContent = personalNotifications.length;
    }

    if (personalNotifications.length === 0) {
        if (emptyState2) {
            emptyState2.innerHTML = `
                <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center">
                    <i class="fas fa-user-slash text-2xl text-gray-500"></i>
                </div>
                <p class="text-gray-400">Персональных уведомлений нет</p>
                <p class="text-sm text-gray-500 mt-1">Вы еще не отправляли персональные уведомления</p>
            `;
            emptyState2.classList.remove('hidden');
        }
        notificationsList2.innerHTML = '';
        return;
    }

    if (emptyState2) emptyState2.classList.add('hidden');

    let notificationsHTML = '';
    
    personalNotifications.forEach(notif => {
        const isUnread = !notif.is_read;
        const timeAgo = getTimeAgo(notif.created_at);
        
        notificationsHTML += `
            <div class="notification-item bg-gray-700/30 border ${isUnread ? 'border-green-500/20 bg-green-500/10' : 'border-gray-600/30'} rounded-xl p-3 animate-fadeIn cursor-pointer hover:bg-gray-700/50 transition-all">
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 rounded-full ${isUnread ? 'bg-green-500/20' : 'bg-gray-600/20'} flex items-center justify-center flex-shrink-0 mt-1">
                        <i class="fas fa-user text-green-400 text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between mb-1">
                            <h3 class="text-sm font-semibold ${isUnread ? 'text-white' : 'text-gray-300'} truncate">${escapeHtml(notif.title)}</h3>
                            <span class="text-xs ${isUnread ? 'text-green-400' : 'text-gray-500'} font-medium ml-2 whitespace-nowrap">${timeAgo}</span>
                        </div>
                        
                        <!-- Информация о пользователе -->
                        <div class="mb-2 p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <div class="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span class="text-gray-400">ID:</span>
                                    <span class="text-white font-mono ml-1">${notif.target_user.id}</span>
                                </div>
                                <div>
                                    <span class="text-gray-400">Логин:</span>
                                    <span class="text-white ml-1">${escapeHtml(notif.target_user.username)}</span>
                                </div>
                                <div class="col-span-2">
                                    <span class="text-gray-400">Почта:</span>
                                    <span class="text-white ml-1">${escapeHtml(notif.target_user.email)}</span>
                                </div>
                            </div>
                        </div>
                        
                        <p class="text-xs ${isUnread ? 'text-gray-300' : 'text-gray-400'} leading-relaxed">
                            ${escapeHtml(notif.message)}
                        </p>
                        
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center space-x-2">
                                ${isUnread ? `
                                <span class="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                <span class="text-xs text-green-400">Новое</span>
                                ` : ''}
                                <span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Персональное</span>
                            </div>
                            <button class="delete-notification-btn text-xs text-red-400 hover:text-red-300 transition-colors p-1" 
                                    data-notification-id="${notif.id}"
                                    title="Удалить уведомление">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    notificationsList2.innerHTML = notificationsHTML;
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
// Пометить ВСЕ уведомления как прочитанные
// -----------------------------
// -----------------------------
// Пометить ВСЕ уведомления как прочитанные
// -----------------------------
async function markAllNotificationsAsRead2() {
    const markAllAsReadBtn = document.getElementById('markAllAsReadBtn');
    if (!markAllAsReadBtn) return;
    
    // Сохраняем оригинальный текст кнопки
    const originalText = markAllAsReadBtn.innerHTML;
    
    try {
        // Меняем текст кнопки на "Обработка..."
        markAllAsReadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Обработка...';
        markAllAsReadBtn.disabled = true;
        
        const response = await fetch('/notifications/mark_all_as_read/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем все уведомления в интерфейсе
            const notificationItems = document.querySelectorAll('.notification-item[data-unread="true"]');
            
            notificationItems.forEach(notificationElement => {
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
            });

            // Обновляем счетчик
            unreadCount = 0;
            updateNotificationsCounter2();

            // Показываем успешное сообщение в самой кнопке
            markAllAsReadBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Все успешно прочитано!';
            markAllAsReadBtn.classList.remove('text-green-400', 'hover:text-green-300');
            markAllAsReadBtn.classList.add('text-blue-400');
            
            // Анимация успеха
            markAllAsReadBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                markAllAsReadBtn.style.transform = 'scale(1)';
                markAllAsReadBtn.style.transition = 'all 0.3s ease';
            }, 150);
            
            // Возвращаем исходное состояние через 2 секунды
            setTimeout(() => {
                markAllAsReadBtn.innerHTML = originalText;
                markAllAsReadBtn.classList.remove('text-blue-400');
                markAllAsReadBtn.classList.add('text-green-400', 'hover:text-green-300');
                markAllAsReadBtn.disabled = false;
                markAllAsReadBtn.style.transform = '';
                markAllAsReadBtn.style.transition = '';
            }, 2000);
            
        } else {
            // В случае ошибки
            markAllAsReadBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Ошибка!';
            markAllAsReadBtn.classList.remove('text-green-400', 'hover:text-green-300');
            markAllAsReadBtn.classList.add('text-red-400');
            
            setTimeout(() => {
                markAllAsReadBtn.innerHTML = originalText;
                markAllAsReadBtn.classList.remove('text-red-400');
                markAllAsReadBtn.classList.add('text-green-400', 'hover:text-green-300');
                markAllAsReadBtn.disabled = false;
            }, 2000);
            
            console.error('Ошибка при отметке всех уведомлений как прочитанных:', data.error);
        }
    } catch (error) {
        // В случае ошибки сети
        markAllAsReadBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Ошибка сети!';
        markAllAsReadBtn.classList.remove('text-green-400', 'hover:text-green-300');
        markAllAsReadBtn.classList.add('text-red-400');
        
        setTimeout(() => {
            markAllAsReadBtn.innerHTML = originalText;
            markAllAsReadBtn.classList.remove('text-red-400');
            markAllAsReadBtn.classList.add('text-green-400', 'hover:text-green-300');
            markAllAsReadBtn.disabled = false;
        }, 2000);
        
        console.error('Ошибка при отметке всех уведомлений как прочитанных:', error);
    }
}



// -----------------------------
// Удаление системного уведомления (для админа)
// -----------------------------
async function deleteSystemNotification(notificationId, notificationElement) {
    if (!confirm('Вы уверены, что хотите удалить это уведомление?')) {
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
                
                // Обновляем счетчик
                const counterElement2 = document.getElementById('notificationsCount2');
                if (counterElement2) {
                    const currentCount = parseInt(counterElement2.textContent);
                    counterElement2.textContent = Math.max(0, currentCount - 1);
                }
                
                // Проверяем пустой список
                const notificationsList2 = document.getElementById('notificationsList2');
                const emptyState2 = document.getElementById('emptyNotificationsState2');
                const remainingItems = notificationsList2.querySelectorAll('.notification-item').length;
                
                if (remainingItems === 0 && emptyState2) {
                    emptyState2.classList.remove('hidden');
                }
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
    const notificationsList2 = document.getElementById('notificationsList2');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    
    if (filter === 'personal') {
        // Для вкладки "Персональные" загружаем специальные данные
        loadPersonalNotifications();
        return;
    }
    
    // Остальная логика фильтрации для обычных вкладок
    const notifications = document.querySelectorAll('.notification-item');
    
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
            emptyState2.innerHTML = `
                <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center">
                    <i class="fas fa-filter text-2xl text-gray-500"></i>
                </div>
                <p class="text-gray-400">Нет уведомлений по выбранному фильтру</p>
            `;
            emptyState2.classList.remove('hidden');
        } else if (userNotifications.length === 0) {
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
// Обработчик формы создания уведомления
document.addEventListener('DOMContentLoaded', function() {
    const createNotificationForm = document.getElementById('createNotificationForm');
    if (createNotificationForm) {
        createNotificationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const title = document.getElementById('notificationTitle').value;
            const message = document.getElementById('notificationMessage').value;
            const targetUserId = document.getElementById('targetUserId').value;
            
            // Подготавливаем данные
            const formData = {
                title: title,
                message: message,
                is_chat: false  // Добавляем обязательное поле
            };
            
            // Добавляем target_user_id только если указан
            if (targetUserId && targetUserId.trim() !== '') {
                formData.target_user_id = parseInt(targetUserId);
            }
            
            try {
                const response = await fetch('/notifications/create/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const messageType = data.is_personal ? 'Персональное уведомление' : 'Общее уведомление';
                    alert(`${messageType} успешно отправлено!`);
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