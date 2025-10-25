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
// Модалка кнопка +
// -----------------------------

document.addEventListener('DOMContentLoaded', function() {
    const addNoteBtn = document.getElementById('addNote');
    const noteDropdown = document.getElementById('noteDropdown');
    
    // Простое переключение меню
    addNoteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        noteDropdown.classList.toggle('hidden');
    });
    
    // Закрытие меню при клике вне
    document.addEventListener('click', function() {
        noteDropdown.classList.add('hidden');
    });
    
  
    // Предотвращаем закрытие при клике на само меню
    noteDropdown.addEventListener('click', function(e) {
        e.stopPropagation();
    });
});





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
    notificationsModal2 = document.getElementById('notificationsModal2');
    notificationIconBtn = document.getElementById('notificationIconBtn');
    
    if (notificationIconBtn) {
        notificationIconBtn.addEventListener('click', openNotificationsModal2);
    }
    
    // Обработчики закрытия модалки
    const closeBtns = notificationsModal2.querySelectorAll('[data-close="notificationsModal2"]');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeNotificationsModal2);
    });
    
    // ДОБАВЬТЕ ЭТОТ КОД - обработчик для кнопки закрытия в модалке уведомлений
    const closeModalBtn = notificationsModal2.querySelector('.modal-close-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeNotificationsModal2);
    }
    
    // Закрытие по клику вне модалки
    notificationsModal2.addEventListener('click', function(e) {
        if (e.target === notificationsModal2) {
            closeNotificationsModal2();
        }
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !notificationsModal2.classList.contains('hidden')) {
            closeNotificationsModal2();
        }
    });
}