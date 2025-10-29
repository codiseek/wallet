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



// Обработчики для модалки долгов
document.addEventListener('DOMContentLoaded', function() {
    const debtModal = document.getElementById('debtModal');
    const addDebtBtn = document.getElementById('addDebtBtn');
    const closeDebtModalHeaderBtn = document.getElementById('closeDebtModalHeaderBtn');
    const cancelDebtBtn = document.getElementById('cancelDebtBtn');
    const saveDebtBtn = document.getElementById('saveDebtBtn');

    // Открытие модалки
    if (addDebtBtn) {
        addDebtBtn.addEventListener('click', function() {
            debtModal.classList.remove('hidden');
        });
    }

    // Закрытие модалки
    function closeDebtModal() {
        debtModal.classList.add('hidden');
    }

    if (closeDebtModalHeaderBtn) closeDebtModalHeaderBtn.addEventListener('click', closeDebtModal);
    if (cancelDebtBtn) cancelDebtBtn.addEventListener('click', closeDebtModal);

    // Закрытие по клику вне модалки
    debtModal.addEventListener('click', function(e) {
        if (e.target === debtModal) {
            closeDebtModal();
        }
    });

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
        
        if (debtsList.children.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    }
});




// Обработчик для первой смены пароля
document.addEventListener('DOMContentLoaded', function() {
    const firstForm = document.getElementById('changePasswordFirstForm');
    const regularForm = document.getElementById('changePasswordRegularForm');
    
    if (firstForm) {
        firstForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handlePasswordChange(this, false);
        });
    }
    
    if (regularForm) {
        regularForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handlePasswordChange(this, true);
        });
    }
});

function handlePasswordChange(form, requireCurrentPassword) {
    const submitBtn = form.querySelector('.change-password-submit-btn');
    const btnText = form.querySelector('.change-password-btn-text');
    const spinner = form.querySelector('.change-password-spinner');
    
    // Показываем загрузку
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.classList.remove('hidden');
    
    const formData = new FormData(form);
    
    // Добавляем флаг необходимости текущего пароля
    if (requireCurrentPassword) {
        formData.append('require_current', 'true');
    }
    
    fetch('/change-password/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessNotification(data.message);
            
            // Закрываем модалку
            const modal = form.closest('.modal');
            if (modal) {
                animateModal(modal, false);
            }
            
            // Обновляем статус на кнопке
            const changePasswordBtn = document.getElementById('changePasswordBtn');
            if (changePasswordBtn) {
                changePasswordBtn.setAttribute('data-password-changed', 'true');
                
                // Убираем уведомление о необходимости смены пароля
                const passwordWarning = document.querySelector('.text-red-400');
                if (passwordWarning) {
                    passwordWarning.remove();
                }
            }
            
            // Очищаем форму
            form.reset();
            
        } else {
            showErrorNotification(data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorNotification('Ошибка сети');
    })
    .finally(() => {
        // Возвращаем кнопку в нормальное состояние
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        spinner.classList.add('hidden');
    });
}