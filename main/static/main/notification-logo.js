// notification-logo.js
// Функционал модалки уведомлений

// -----------------------------
// Глобальные переменные
// -----------------------------
let notificationsModal2 = null;
let notificationLogoBtn2 = null;
let notificationIndicator2 = null;

// -----------------------------
// Инициализация модалки уведомлений
// -----------------------------
function initNotificationsModal2() {
    console.log('Initializing notifications modal 2...');
    
    notificationsModal2 = document.getElementById('notificationsModal2');
    notificationLogoBtn2 = document.getElementById('notificationLogoBtn2');
    notificationIndicator2 = document.getElementById('notificationIndicator2');
    const closeBtn2 = document.getElementById('closeNotificationsModal2');
    const filterBtns2 = document.querySelectorAll('.filter-notification-btn');

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
            markNotificationAsRead2(notificationItem);
        }
    });

    // Инициализация счетчика уведомлений
    updateNotificationsCounter2();
    
    // Для демонстрации - показываем индикатор
    showNotificationIndicator2();
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
            case 'system':
                show = notification.querySelector('.fa-robot') !== null;
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
        if (visibleCount === 0) {
            emptyState2.classList.remove('hidden');
        } else {
            emptyState2.classList.add('hidden');
        }
    }
}

// -----------------------------
// Пометить уведомление как прочитанное
// -----------------------------
function markNotificationAsRead2(notificationItem) {
    if (notificationItem.getAttribute('data-unread') === 'true') {
        notificationItem.classList.remove('bg-blue-500/10', 'border-blue-500/20');
        notificationItem.classList.add('bg-gray-700/30', 'border-gray-600/30');
        notificationItem.setAttribute('data-unread', 'false');
        
        // Убираем индикатор нового сообщения
        const newIndicator = notificationItem.querySelector('.bg-blue-400, .bg-yellow-400');
        if (newIndicator && newIndicator.parentElement) {
            newIndicator.parentElement.remove();
        }

        // Обновляем счетчик
        updateNotificationsCounter2();
    }
}

// -----------------------------
// Обновление счетчика уведомлений
// -----------------------------
function updateNotificationsCounter2() {
    if (!notificationIndicator2) return;
    
    const unreadNotifications = document.querySelectorAll('.notification-item[data-unread="true"]');
    const counterElement2 = document.getElementById('notificationsCount2');
    
    // Обновляем индикатор
    if (unreadNotifications.length > 0) {
        notificationIndicator2.classList.remove('hidden');
    } else {
        notificationIndicator2.classList.add('hidden');
    }
    
    // Обновляем счетчик в модалке
    if (counterElement2) {
        const totalNotifications = document.querySelectorAll('.notification-item').length;
        counterElement2.textContent = totalNotifications;
    }
}

// -----------------------------
// Показать индикатор уведомлений
// -----------------------------
function showNotificationIndicator2() {
    if (notificationIndicator2) {
        notificationIndicator2.classList.remove('hidden');
    }
}

// -----------------------------
// Скрыть индикатор уведомлений
// -----------------------------
function hideNotificationIndicator2() {
    if (notificationIndicator2) {
        notificationIndicator2.classList.add('hidden');
    }
}

// -----------------------------
// Показать тестовое уведомление
// -----------------------------
function showDemoNotification2() {
    const notificationsList2 = document.getElementById('notificationsList2');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    
    if (!notificationsList2) return;

    const newNotification = document.createElement('div');
    newNotification.className = 'notification-item bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 animate-fadeIn cursor-pointer hover:bg-blue-500/15 transition-all';
    newNotification.setAttribute('data-unread', 'true');
    newNotification.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                <i class="fas fa-gift text-green-400 text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between mb-1">
                    <h3 class="text-sm font-semibold text-white truncate">Демо-уведомление</h3>
                    <span class="text-xs text-blue-400 font-medium ml-2 whitespace-nowrap">только что</span>
                </div>
                <p class="text-xs text-gray-300 leading-relaxed">
                    Это тестовое уведомление для демонстрации работы системы. Нажмите на него, чтобы отметить как прочитанное.
                </p>
                <div class="flex items-center space-x-2 mt-2">
                    <span class="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    <span class="text-xs text-blue-400">Новое</span>
                </div>
            </div>
        </div>
    `;

    // Добавляем уведомление в начало списка
    notificationsList2.insertBefore(newNotification, notificationsList2.firstChild);
    
    // Скрываем пустое состояние если оно было показано
    if (emptyState2) {
        emptyState2.classList.add('hidden');
    }

    // Обновляем счетчик и показываем индикатор
    updateNotificationsCounter2();
    showNotificationIndicator2();
}

// -----------------------------
// Инициализация при загрузке
// -----------------------------
function initNotifications2() {
    console.log('DOM loaded - initializing notifications system 2');
    initNotificationsModal2();
    
    // Для демонстрации - показываем индикатор уведомлений через небольшую задержку
    setTimeout(() => {
        showNotificationIndicator2();
        // showDemoNotification2(); // Раскомментируйте для тестового уведомления
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
window.showDemoNotification2 = showDemoNotification2;
window.showNotificationIndicator2 = showNotificationIndicator2;
window.hideNotificationIndicator2 = hideNotificationIndicator2;