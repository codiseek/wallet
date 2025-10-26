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
// Модалка кнопка +
// -----------------------------

document.addEventListener('DOMContentLoaded', function() {
    const addNoteBtn = document.getElementById('addNote');
    const noteDropdown = document.getElementById('noteDropdown');
    
    // Простое переключение меню
    if (addNoteBtn && noteDropdown) {
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
    }
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
    const notificationsModal2 = document.getElementById('notificationsModal2');
    const notificationIconBtn = document.getElementById('notificationIconBtn');
    
    if (!notificationsModal2 || !notificationIconBtn) return;
    
    if (notificationIconBtn) {
        notificationIconBtn.addEventListener('click', openNotificationsModal2);
    }
    
    // Обработчики закрытия модалки
    const closeBtns = notificationsModal2.querySelectorAll('[data-close="notificationsModal2"]');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeNotificationsModal2);
    });
    
    // Обработчик для кнопки закрытия в модалке уведомлений
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

// Обработчики для модалки долгов
document.addEventListener('DOMContentLoaded', function() {
    const debtModal = document.getElementById('debtModal');
    const addDebtBtn = document.getElementById('addDebtBtn');
    const closeDebtModalHeaderBtn = document.getElementById('closeDebtModalHeaderBtn');
    const cancelDebtBtn = document.getElementById('cancelDebtBtn');
    const saveDebtBtn = document.getElementById('saveDebtBtn');

    // Открытие модалки
    if (addDebtBtn && debtModal) {
        addDebtBtn.addEventListener('click', function() {
            debtModal.classList.remove('hidden');
        });
    }

    // Закрытие модалки
    function closeDebtModal() {
        if (debtModal) debtModal.classList.add('hidden');
    }

    if (closeDebtModalHeaderBtn) closeDebtModalHeaderBtn.addEventListener('click', closeDebtModal);
    if (cancelDebtBtn) cancelDebtBtn.addEventListener('click', closeDebtModal);

    // Закрытие по клику вне модалки
    if (debtModal) {
        debtModal.addEventListener('click', function(e) {
            if (e.target === debtModal) {
                closeDebtModal();
            }
        });
    }

    // Сохранение долга
    if (saveDebtBtn) {
        saveDebtBtn.addEventListener('click', function() {
            // Здесь будет логика сохранения
            closeDebtModal();
            showSuccessNotification('Долг успешно добавлен');
        });
    }

    // Фильтрация по вкладкам
    const filterTabs = document.querySelectorAll('.debt-filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Активная вкладка
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Здесь будет логика фильтрации списка
            console.log('Фильтр:', filter);
        });
    });

    // Обработчики для кнопок в списке
    document.addEventListener('click', function(e) {
        if (e.target.closest('.remind-btn')) {
            const debtItem = e.target.closest('.debt-item');
            const debtorName = debtItem.querySelector('h3').textContent;
            showSuccessNotification(`Напоминание отправлено ${debtorName}`);
        }

        if (e.target.closest('.paid-btn')) {
            const debtItem = e.target.closest('.debt-item');
            const debtorName = debtItem.querySelector('h3').textContent;
            debtItem.style.opacity = '0.5';
            setTimeout(() => {
                debtItem.remove();
                checkEmptyDebtsState();
            }, 300);
            showSuccessNotification(`Долг ${debtorName} отмечен как погашенный`);
        }
    });

    // Проверка пустого состояния
    function checkEmptyDebtsState() {
        const debtsList = document.getElementById('debtsList');
        const emptyState = document.getElementById('emptyDebtsState');
        
        if (debtsList && emptyState) {
            if (debtsList.children.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
            }
        }
    }
});