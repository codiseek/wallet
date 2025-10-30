

let currentFilter = 'week';
let currentPage = 1;
let hasMoreTransactions = true;
let isLoading = false;
let currentCategory = 'all';
const PAGE_SIZE = 10;

// Добавьте в начало файла с другими глобальными переменными
let currentTransactionDetailData = null;





window.categories = window.categories || [];
window.initialBalances = window.initialBalances || { total: 0, income: 0, expense: 0 };

function initLanguageHandlers() {
    // Обработчик для кнопок смены языка
    document.addEventListener('click', function(e) {
        const langBtn = e.target.closest('.language-btn');
        if (langBtn) {
            // После смены языка переинициализируем баланс
            setTimeout(() => {
                updateBalanceDisplay();
                updateCurrencySymbols(window.currentCurrency || 'c');
            }, 500);
        }
    });
}

// -----------------------------
// Добавление транзакции в DOM
// -----------------------------

window.addTransactionToList = function(transaction, animate = true, append = false) {
    const transactionsContainer = document.getElementById('transactionsListContainer');
    if (!transactionsContainer) return;

    // Используем transaction_date для получения даты и времени
    const transactionDate = new Date(transaction.transaction_date || transaction.created_at || Date.now());
    const formattedDate = transactionDate.toLocaleDateString('ru-RU');
    const formattedTime = transactionDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    // Сохраняем данные для модалки
    const categoryName = transaction.category_name || transaction.category || 'Прочее';
    const categoryIcon = transaction.category_icon || 'fas fa-circle';
    const categoryColor = transaction.category_color || '#999';
    const description = transaction.description || '';
    const reserveAmount = transaction.reserve_amount || 0;

    // Получаем текущий символ валюты
    const currentCurrency = window.currentCurrency || 'c';
    let currencySymbol = 'с';
    switch(currentCurrency) {
        case 'c': currencySymbol = 'с'; break;
        case 'r': currencySymbol = '₽'; break;
        case '$': currencySymbol = '$'; break;
        case '€': currencySymbol = '€'; break;
    }

    let amountDisplay = '';
    if (transaction.type === 'income') {
        if (reserveAmount > 0) {
            amountDisplay = `
                <div class="text-right">
                    <div class="space-y-1">
                        <p class="text-green-400 font-semibold">+${formatAmount(transaction.amount)} ${currencySymbol}</p>
                        <p class="text-blue-400 text-xs">резерв: ${formatAmount(reserveAmount)} ${currencySymbol}</p>
                        <p class="text-xs text-gray-400">${formattedDate} ${formattedTime}</p>
                    </div>
                </div>
            `;
        } else {
            amountDisplay = `
                <div class="text-right">
                    <div class="space-y-1">
                        <p class="text-green-400 font-semibold">+${formatAmount(transaction.amount)} ${currencySymbol}</p>
                        <p class="text-xs text-gray-400">${formattedDate} ${formattedTime}</p>
                    </div>
                </div>
            `;
        }
    } else {
        amountDisplay = `
            <div class="text-right">
                <div class="space-y-1">
                    <p class="text-red-400 font-semibold">-${formatAmount(transaction.amount)} ${currencySymbol}</p>
                    <p class="text-xs text-gray-400">${formattedDate} ${formattedTime}</p>
                </div>
            </div>
        `;
    }

    const html = `
   <div class="transaction-item flex justify-between items-center p-3 bg-gray-800/40 rounded-xl border border-gray-700/30 ${animate ? 'animate-fadeIn' : ''} cursor-pointer hover:bg-gray-800/60 transition-colors"
         data-transaction-id="${transaction.id || ''}"
         data-category-id="${transaction.category_id || transaction.categoryId || 'unknown'}"
         data-category-name="${categoryName}"
         data-category-icon="${categoryIcon}"
         data-category-color="${categoryColor}"
         data-transaction-type="${transaction.type}"
         data-transaction-amount="${transaction.amount}"
         data-reserve-amount="${reserveAmount}"
         data-description="${description.replace(/"/g, '&quot;')}"
         data-transaction-date="${formattedDate}"
         data-transaction-time="${formattedTime}">
        <div class="flex items-center">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center mr-3" 
                 style="background-color: ${categoryColor}22; color: ${categoryColor}">
                ${getIconHTML(categoryIcon, categoryColor)}
            </div>
            <div class="max-w-[140px]">
                <p class="font-medium text-white text-sm truncate">${categoryName}</p>
                ${description ? `<p class="text-gray-400 text-xs truncate">${description}</p>` : ''}
            </div>
        </div>
        <div class="text-right">
            ${amountDisplay}
        </div>
    </div>
    `;

    if (append) {
        transactionsContainer.insertAdjacentHTML('beforeend', html);
    } else {
        transactionsContainer.insertAdjacentHTML('afterbegin', html);
    }

    hideEmptyStates();
    updateWelcomeHint();
};



// Функция для определения типа иконки и генерации HTML
function getIconHTML(icon, color) {
    // Проверяем, является ли иконка SVG (содержит .svg или начинается с /static)
    if (icon && (icon.includes('.svg') || icon.startsWith('/static') || icon.startsWith('static/'))) {
        return `<img src="${icon}" alt="Category icon" class="w-5 h-5">`;
    } 
    // Проверяем, является ли иконка Font Awesome (содержит fa-)
    else if (icon && icon.includes('fa-')) {
        return `<i class="${icon}"></i>`;
    }
    // Если иконка не определена, используем иконку по умолчанию
    else {
        return `<i class="fas fa-tag"></i>`;
    }
}




// Добавьте в app.js
document.addEventListener('DOMContentLoaded', function() {
    // Обработчик для кнопок в хедере
    document.addEventListener('click', function(e) {
        const todoIconBtn = e.target.closest('#todoIconBtn');
        const debtIconBtn = e.target.closest('#debtIconBtn');
        
        if (todoIconBtn || debtIconBtn) {
            // Определяем какая вкладка должна быть активна
            const targetTab = todoIconBtn ? 'todo' : 'debt';
            
            console.log('Переключение на вкладку:', targetTab);
            
            // Переключаем на нужную вкладку
            const tabs = document.querySelectorAll('.mobile-tab');
            
            // Скрываем все вкладки
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Показываем целевую вкладку
            const targetTabElement = document.getElementById(`tab-${targetTab}`);
            if (targetTabElement) {
                targetTabElement.classList.add('active');
                console.log('Активирована вкладка:', targetTabElement.id);
            } else {
                console.error('Вкладка не найдена:', `tab-${targetTab}`);
            }
            
            // Скрываем блок баланса
            const balanceBlock = document.querySelector('.mobile-header .bg-gradient-to-r');
            if (balanceBlock) {
                balanceBlock.classList.add('hidden');
            }
            
            // Прокручиваем к верху страницы
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Останавливаем всплытие события
            e.stopPropagation();
        }
    });
});

// -----------------------------
// Экспортируем необходимые функции в global
// -----------------------------
window.initTransactionFilter = initTransactionFilter;
window.loadTransactions = loadTransactions;
window.updateCategoryTabsHandlers = updateCategoryTabsHandlers;
window.checkEmptyStatesAfterChange = checkEmptyStatesAfterChange;
window.updateGlobalCategories = updateGlobalCategories;
window.initTransactionModal = initTransactionModal;
window.initTabNavigation = initTabNavigation;
// Сделаем функцию глобально доступной
window.formatAmount = formatAmount;


// -----------------------------
// Главная инициализация при загрузке
// -----------------------------
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Форматируем балансы при загрузке страницы
        updateBalanceDisplay();
        
        // Инициализация debt manager
        if (typeof DebtManager !== 'undefined' && document.getElementById('tab-debt')) {
            window.debtManager = new DebtManager();
        }

        // Обработчик для кнопки смены пароля
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        
        if (changePasswordBtn) {
            changePasswordBtn.addEventListener('click', function() {
                const passwordChanged = this.getAttribute('data-password-changed') === 'true';
                
                if (passwordChanged) {
                    // Пароль уже менялся - открываем модалку с полем текущего пароля
                    openChangePasswordRegularModal();
                } else {
                    // Первая смена пароля - открываем простую модалку
                    openChangePasswordFirstModal();
                }
            });
        }

        // Форматируем все элементы резерва при загрузке страницы
        formatAllReserveElements();
        initCurrencyHandlers();
        initCurrencyOnLoad();
        
        // Обновляем отображение сбережений при загрузке
        updateSavingsDisplay();
        initCategorySelectionModal();
        updateWelcomeHint();
        initTransactionFilter();
        
        // Инициализируем модалки категорий
        if (typeof initCategoryDetailModal === 'function') {
            initCategoryDetailModal();
        }

        // Показываем приветствие при необходимости
        if (window.isNewUser) {
            setTimeout(() => { showSuccessNotification('Добро пожаловать!'); }, 800);
        }

        // ДОБАВЬ ЭТОТ ВЫЗОВ
        setTimeout(() => {
            if (typeof initNotesIcon === 'function') {
                initNotesIcon();
            }
            if (typeof loadNotes === 'function') {
                loadNotes(); // Это обновит иконку
            }
        }, 500);

        // Инициализация валюты при загрузке
        setTimeout(() => {
            const currentCurrency = window.currentCurrency || 'c';
            updateCurrencySymbols(currentCurrency);
            updateBalanceCurrencyIcon(currentCurrency);
            updateCurrentCurrencyDisplay(currentCurrency);
            updateAllCurrencyButtons(currentCurrency);
        }, 100);

        initReserveHandlers();
        // Инициализируем модалки и интерфейс
        initTabNavigation();
        initTransactionModal();
        initCategoryModal();

        initTransactionDetailModal();
        initCategoryFilter();
        initReminderPicker();
        initLanguageHandlers();
        // Инициализируем кнопки валюты при загрузке
        initCurrencyButtons();
        if (typeof updateCategoryTabsHandlers === 'function') updateCategoryTabsHandlers();

        // Загружаем категории и транзакции при старте
        updateGlobalCategories();
        updateReserveNotification();
        setTimeout(() => {
            if (document.getElementById('transactionsListContainer') && document.getElementById('transactionsListContainer').children.length === 0) {
                loadTransactions();
            }
        }, 300);
    } catch (e) {
        console.error('Initialization error', e);
    }
});

// Функции для открытия модалок
function openChangePasswordFirstModal() {
    const modal = document.getElementById('changePasswordFirstModal');
    if (modal) {
        animateModal(modal, true);
    }
}

function openChangePasswordRegularModal() {
    const modal = document.getElementById('changePasswordRegularModal');
    if (modal) {
        animateModal(modal, true);
    }
}