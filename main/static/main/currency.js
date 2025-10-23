// Функция для обновления валюты
async function updateCurrency(currency) {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    
    try {
        // Показываем состояние загрузки на нажатой кнопке
        const clickedButton = document.querySelector(`.currency-btn[data-currency="${currency}"]`);
        if (clickedButton) {
            const originalHTML = clickedButton.innerHTML;
            clickedButton.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>';
            clickedButton.disabled = true;
        }

        const response = await fetch('/update_currency/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `currency=${currency}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем глобальную переменную валюты
            window.currentCurrency = currency;
            
            // Обновляем интерфейс
            updateBalanceCurrencyIcon(currency);
            updateCurrencySymbols(currency);
            updateCurrentCurrencyDisplay(currency);
            updateAllCurrencyButtons(currency); // Используем обновленную функцию с иконками
            updateBalanceDisplay();
            
            // Обновляем открытую модалку транзакции
            updateTransactionDetailModal();
            
            // Перезагружаем транзакции с новым символом валюты
            currentPage = 1;
            hasMoreTransactions = true;
            loadTransactions();
            
            showSuccessNotification('Валюта изменена!');
            
        } else {
            showErrorNotification(data.error || 'Ошибка при изменении валюты');
            // Восстанавливаем кнопки с иконками
            restoreCurrencyButtons();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showErrorNotification('Ошибка соединения');
        // Восстанавливаем кнопки с иконками
        restoreCurrencyButtons();
    } finally {
        // Восстанавливаем все кнопки с иконками
        restoreCurrencyButtons();
    }
}

// Функция для обновления стилей кнопок валюты (с иконками)
function updateAllCurrencyButtons(selectedCurrency) {
    const buttons = document.querySelectorAll('.currency-btn');
    
    buttons.forEach(btn => {
        const currency = btn.dataset.currency;
        
        // Удаляем все стили
        btn.classList.remove(
            'border-2', 'border-green-500', 'bg-green-500/10',
            'border', 'border-gray-600'
        );
        
        // Добавляем соответствующие стили
        if (currency === selectedCurrency) {
            btn.classList.add('border-2', 'border-green-500', 'bg-green-500/10');
        } else {
            btn.classList.add('border', 'border-gray-600');
        }
        
        // Убеждаемся, что содержимое - это иконка, а не текст
        let iconClass = '';
        switch(currency) {
            case 'c': iconClass = 'fa-solid fa-c'; break;
            case 'r': iconClass = 'fas fa-ruble-sign'; break;
            case '$': iconClass = 'fas fa-dollar-sign'; break;
            case '€': iconClass = 'fas fa-euro-sign'; break;
        }
        
        // Если кнопка содержит текст вместо иконки, заменяем на иконку
        if (!btn.innerHTML.includes('fa-') || btn.querySelector('span')) {
            btn.innerHTML = `<i class="${iconClass} text-white text-lg"></i>`;
        }
    });
}

// Функция для восстановления кнопок валюты (с иконками)
function restoreCurrencyButtons() {
    const buttons = document.querySelectorAll('.currency-btn');
    const currentCurrency = window.currentCurrency || 'c';
    
    buttons.forEach(btn => {
        btn.disabled = false;
        const currency = btn.dataset.currency;
        
        // ВОССТАНАВЛИВАЕМ ИКОНКИ ВМЕСТО ТЕКСТА
        let iconClass = '';
        switch(currency) {
            case 'c': iconClass = 'fa-solid fa-c'; break;
            case 'r': iconClass = 'fas fa-ruble-sign'; break;
            case '$': iconClass = 'fas fa-dollar-sign'; break;
            case '€': iconClass = 'fas fa-euro-sign'; break;
        }
        
        btn.innerHTML = `<i class="${iconClass} text-white text-lg"></i>`;
        
        // Восстанавливаем правильные стили
        btn.classList.remove(
            'border-2', 'border-green-500', 'bg-green-500/10',
            'border', 'border-gray-600'
        );
        
        if (currency === currentCurrency) {
            btn.classList.add('border-2', 'border-green-500', 'bg-green-500/10');
        } else {
            btn.classList.add('border', 'border-gray-600');
        }
    });
}


// Функция для обновления стилей кнопок валюты
function updateCurrencyButtons(selectedCurrency) {
    const buttons = document.querySelectorAll('.currency-btn');
    
    buttons.forEach(btn => {
        const currency = btn.dataset.currency;
        
        // Удаляем все стили
        btn.classList.remove(
            'border-2', 'border-green-500', 'bg-green-500/10',
            'border', 'border-gray-600'
        );
        
        // Добавляем соответствующие стили
        if (currency === selectedCurrency) {
            btn.classList.add('border-2', 'border-green-500', 'bg-green-500/10');
        } else {
            btn.classList.add('border', 'border-gray-600');
        }
    });
}


// Функция для инициализации кнопок валюты при загрузке (с иконками)
function initCurrencyButtons() {
    // Используем валюту из Django или по умолчанию 'c'
    const currentCurrency = window.currentCurrency || 'c';
    
    const buttons = document.querySelectorAll('.currency-btn');
    buttons.forEach(btn => {
        const currency = btn.dataset.currency;
        
        // Убеждаемся, что каждая кнопка имеет иконку
        let iconClass = '';
        switch(currency) {
            case 'c': iconClass = 'fa-solid fa-c'; break;
            case 'r': iconClass = 'fas fa-ruble-sign'; break;
            case '$': iconClass = 'fas fa-dollar-sign'; break;
            case '€': iconClass = 'fas fa-euro-sign'; break;
        }
        
        // Если кнопка не содержит иконку, устанавливаем её
        if (!btn.innerHTML.includes('fa-')) {
            btn.innerHTML = `<i class="${iconClass} text-white text-lg"></i>`;
        }
    });
    
    updateAllCurrencyButtons(currentCurrency);
}




// Функция для обновления иконки в основном балансе
function updateBalanceCurrencyIcon(currency) {
    const balanceIcon = document.getElementById('balanceCurrencyIcon');
    if (!balanceIcon) return;
    
    // Удаляем все классы иконок валют
    balanceIcon.className = '';
    balanceIcon.classList.add('fas', 'text-[110px]', 'text-blue-800/20', 'absolute', 'top-3', 'right-4');
    
    // Добавляем нужную иконку
    switch(currency) {
        case 'c':
            balanceIcon.classList.add('fa-c');
            break;
        case '$':
            balanceIcon.classList.add('fa-dollar-sign');
            break;
        case 'r':
            balanceIcon.classList.add('fa-ruble-sign');
            break;
        case '€':
            balanceIcon.classList.add('fa-euro-sign');
            break;
        default:
            balanceIcon.classList.add('fa-c');
    }
}




// Обновленная функция для обновления символов валюты во всем интерфейсе
// Обновленная функция для обновления символов валюты во всем интерфейсе
function updateCurrencySymbols(currency) {
    let symbol = 'с'; // по умолчанию
    
    switch(currency) {
        case 'c': symbol = 'с'; break;
        case 'r': symbol = '₽'; break;
        case '$': symbol = '$'; break;
        case '€': symbol = '€'; break;
    }
    
    // Обновляем все элементы с классом currency-symbol
    const currencySymbols = document.querySelectorAll('.currency-symbol');
    currencySymbols.forEach(element => {
        element.textContent = symbol;
    });
    
    // Также обновляем элементы статистики резерва
    const reserveElements = [
        'currentReserveAmount',
        'monthlyReserveAmount',
        'totalReserveAmount',
        'targetReserveAmount',
        'remainingToTarget',
        'targetCurrentReserve',
        'targetRemaining'
    ];
    
    reserveElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const rawValue = element.getAttribute('data-raw-value');
            if (rawValue) {
                // Форматируем значение с правильным символом
                element.textContent = formatAmount(rawValue);
                // Добавляем символ валюты как отдельный элемент после числа
                if (!element.nextElementSibling || !element.nextElementSibling.classList.contains('currency-symbol')) {
                    const currencySpan = document.createElement('span');
                    currencySpan.className = 'currency-symbol';
                    currencySpan.textContent = ' ' + symbol;
                    currencySpan.style.marginLeft = '2px';
                    element.parentNode.insertBefore(currencySpan, element.nextSibling);
                }
            }
        }
    });
    
    // ОБНОВЛЯЕМ КАТЕГОРИИ - перезагружаем список категорий
    if (document.getElementById('categoriesList')) {
        loadUserCategories();
    }
    
    console.log('Символы валюты обновлены на:', symbol);
}


// Функция для обновления отображения текущей валюты в меню
function updateCurrentCurrencyDisplay(currency) {
    const currentCurrencyEl = document.getElementById('currentCurrency');
    if (!currentCurrencyEl) return;
    
    let currencyName = '';
    switch(currency) {
        case 'c': currencyName = 'Сом'; break;
        case 'r': currencyName = 'Рубль'; break;
        case '$': currencyName = 'Доллар'; break;
        case '€': currencyName = 'Евро'; break;
    }
    
    currentCurrencyEl.textContent = currencyName;
}

function initCurrencyHandlers() {
    const currencyButtons = document.querySelectorAll('.currency-btn');
    
    currencyButtons.forEach(btn => {
        // Удаляем существующие обработчики
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Получаем обновленные кнопки
    const updatedButtons = document.querySelectorAll('.currency-btn');
    
    updatedButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const currency = this.dataset.currency;
            console.log('Выбрана валюта:', currency);
            
            if (currency) {
                updateCurrency(currency);
            }
        });
    });
    
    // Инициализируем кнопки при загрузке
    initCurrencyButtons();
    
    console.log('Инициализировано обработчиков валюты:', updatedButtons.length);
}


// Инициализация символов валюты при загрузке страницы
function initCurrencyOnLoad() {
    const currentCurrency = window.currentCurrency || 'c';
    console.log('Инициализация валюты при загрузке:', currentCurrency);
    
    // Обновляем символы валюты
    updateCurrencySymbols(currentCurrency);
    
    // Обновляем отображение текущей валюты
    updateCurrentCurrencyDisplay(currentCurrency);
    
    // Обновляем иконку в балансе
    updateBalanceCurrencyIcon(currentCurrency);
    
    // Обновляем кнопки валюты
    updateAllCurrencyButtons(currentCurrency);
    
    // ОБНОВЛЯЕМ ОТОБРАЖЕНИЕ БАЛАНСА - ДОБАВЬТЕ ЭТУ СТРОКУ
    updateBalanceDisplay();

 // ОБНОВЛЯЕМ ОТОБРАЖЕНИЕ БАЛАНСА И СБЕРЕЖЕНИЙ
    updateBalanceDisplay();
    updateSavingsDisplay();

        // ПЕРЕЗАГРУЖАЕМ ТРАНЗАКЦИИ С ПРАВИЛЬНЫМ СИМВОЛОМ ВАЛЮТЫ
    currentPage = 1;
    hasMoreTransactions = true;
    loadTransactions();


}
