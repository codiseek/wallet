// -----------------------------
// Модалки
// -----------------------------
// modals.js - базовая функция для анимации модалок
function animateModal(modal, show) {
    if (!modal) return;
    
    if (show) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.remove('hidden');
            modal.classList.add('animate-overlayFadeIn');
            
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.classList.remove('animate-modalHide');
                content.classList.add('animate-modalShow');
            }
            
            document.body.classList.add('modal-open');
        }, 10);
    } else {
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.classList.remove('animate-modalShow');
            content.classList.add('animate-modalHide');
        }
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 150);
    }
}

// -----------------------------
// МОДАЛКА МЕНЮ / ПАНЕЛЬ УПРАВЛЕНИЯ
// -----------------------------
function initMenuModal() {
    const modal = document.getElementById('menuModal');
    const openBtn = document.getElementById('menuBtn');

    if (!modal) {
        console.warn('menuModal не найден');
        return;
    }

    // --- Глобальная функция открытия/закрытия ---
    window.toggleMenuModal = function(show) {
        if (!modal) return;

        const isVisible = !modal.classList.contains('hidden');

        if (show === true || (!isVisible && show !== false)) {
            // Открытие модалки
            const reserveInput = document.getElementById('reservePercentageInput');
            const targetReserveInput = document.getElementById('targetReserveInput');

            if (reserveInput) reserveInput.value = window.initialReservePercentage || 0;
            if (targetReserveInput) targetReserveInput.value = window.initialTargetReserve || 0;

            modal.classList.remove('hidden');
            requestAnimationFrame(() => modal.classList.add('opacity-100'));
            document.body.style.overflow = 'hidden';

            // Подгружаем обработчики после открытия
            setTimeout(() => {
                initCurrencyHandlers();
                initReserveHandlers();
            }, 100);
        } else {
            // Закрытие модалки
            modal.classList.remove('opacity-100');
            document.body.style.overflow = '';
            setTimeout(() => modal.classList.add('hidden'), 150);
        }
    };

    // --- Кнопка открытия ⚙️ ---
    if (openBtn) {
        openBtn.addEventListener('click', () => toggleMenuModal(true));
    }

    // --- Кнопки закрытия (с data-close="menuModal") ---
    const closeBtns = modal.querySelectorAll('[data-close="menuModal"]');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => toggleMenuModal(false));
    });

    // --- Клик по фону для закрытия ---
    modal.addEventListener('click', e => {
        if (e.target === modal) toggleMenuModal(false);
    });

    // --- Первичная инициализация ---
    setTimeout(() => {
        initCurrencyHandlers();
        initReserveHandlers();
    }, 100);
}


// -----------------------------
// Модалка выбора категории
// -----------------------------

function initCategorySelectionModal() {
    const modal = document.getElementById("categorySelectionModal");
    const openBtn = document.getElementById("openCategorySelectionBtn");
    const closeBtn = document.getElementById("closeCategorySelectionBtn"); // Теперь это кнопка "Отменить"

    if (openBtn && modal) {
        openBtn.addEventListener('click', async function() {
            animateModal(modal, true);
            await loadCategoriesForSelection();
        });
    }

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => animateModal(modal, false));
    }

    // Закрытие по клику вне модалки
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === modal) animateModal(modal, false);
        });
    }
}



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

    // Обработчик для кнопки "Сделать все прочитанными" - ВЫНЕСЕНО ИЗ ЦИКЛА
    const markAllAsReadBtn = document.getElementById('markAllAsReadBtn');
    if (markAllAsReadBtn) {
        markAllAsReadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            markAllNotificationsAsRead2();
        });
    }

    // В обработчике кликов по уведомлениям добавьте проверку на активную вкладку
    document.addEventListener('click', function(e) {
        const activeFilter = document.querySelector('.filter-notification-btn.bg-blue-600').dataset.filter;
        
        // Для обычных вкладок обрабатываем отметку как прочитанное
        if (activeFilter !== 'personal') {
            const notificationItem = e.target.closest('.notification-item');
            if (notificationItem) {
                const notificationId = notificationItem.dataset.id;
                markNotificationAsRead2(notificationId, notificationItem);
            }
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
