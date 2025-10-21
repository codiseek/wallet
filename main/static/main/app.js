// -----------------------------
// Утилиты и глобальные переменные
// -----------------------------


// Добавьте в самом начале app.js для отладки
console.log('app.js загружен');

// Проверьте что функции доступны
window.testCurrency = function() {
    console.log('Функция testCurrency доступна');
    return 'OK';
};



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
window.initialReservePercentage = window.initialReservePercentage || 0;
window.initialTargetReserve = window.initialTargetReserve || 0;


// -----------------------------
// Уведомления и мелкие UI-помощники
// -----------------------------
function showSuccessNotification(message) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = 'notification-inline flex items-center px-3 py-1.5 rounded-lg text-sm bg-gray-800/80 backdrop-blur-sm border border-gray-700';
    notification.innerHTML = `<span><i class="fas fa-bell mr-2 text-blue-400"></i> ${message}</span>`;
container.appendChild(notification);

// Обеспечим наложение поверх предыдущих
notification.style.zIndex = Date.now(); // чуть выше с каждым разом

setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
}, 2000);

}

// -----------------------------
// Модалки
// -----------------------------
function animateModal(modalEl, show = true) {
    if (!modalEl) {
        console.error('Modal element not found');
        return;
    }

    if (show) {
        modalEl.style.display = 'flex';
        setTimeout(() => {
            modalEl.classList.remove('hidden');
            modalEl.classList.add('animate-overlayFadeIn');
            
            // Блокируем скролл фона
            document.body.classList.add('modal-open');
            
            const content = modalEl.querySelector('.modal-content');
            if (content) {
                content.classList.remove('animate-modalHide');
                content.classList.add('animate-modalShow');
            }
        }, 10);
    } else {
        const content = modalEl.querySelector('.modal-content');
        if (content) {
            content.classList.remove('animate-modalShow');
            content.classList.add('animate-modalHide');
        }
        
        // Уменьшаем таймаут для более быстрого скрытия (было 200, стало 150)
        setTimeout(() => {
            modalEl.classList.add('hidden');
            modalEl.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 150); // Уменьшили с 200ms до 150ms
    }
}


function updateBalanceDisplay() {
    const totalEl = document.getElementById('totalBalance');
    const incomeEl = document.getElementById('monthIncome');
    const expenseEl = document.getElementById('monthExpense');
    const reserveEl = document.getElementById('reserveAmount');
    
    // Получаем текущий символ валюты
    const currentCurrency = window.currentCurrency || 'c';
    let symbol = 'с';
    switch(currentCurrency) {
        case 'c': symbol = 'с'; break;
        case 'r': symbol = '₽'; break;
        case '$': symbol = '$'; break;
        case '€': symbol = '€'; break;
    }
    
    if (totalEl && window.initialBalances) {
        const rawValue = window.initialBalances.total || 0;
        totalEl.textContent = formatAmount(rawValue);
        totalEl.setAttribute('data-raw-value', rawValue);
    }
    
    if (incomeEl && window.initialBalances) {
        const rawValue = window.initialBalances.income || 0;
        incomeEl.textContent = '+' + formatAmount(rawValue);
        incomeEl.setAttribute('data-raw-value', rawValue);
    }
    
    if (expenseEl && window.initialBalances) {
        const rawValue = window.initialBalances.expense || 0;
        expenseEl.textContent = formatAmount(rawValue);
        expenseEl.setAttribute('data-raw-value', rawValue);
    }
    
    if (reserveEl && window.initialBalances) {
        const rawValue = window.initialBalances.total_reserve || 0;
        reserveEl.textContent = formatAmount(rawValue);
        reserveEl.setAttribute('data-raw-value', rawValue);
    }
    
    // Обновляем символы валюты отдельно
    updateCurrencySymbols(currentCurrency);
    
    updateSavingsDisplay();
}

// -----------------------------
// Обновление отображения сбережений в вкладке статистики
// -----------------------------



// Обновленная функция для отображения сбережений
function updateSavingsDisplay() {
    try {
        const currentReserveValue = window.initialBalances.total_reserve || 0;
        const monthlyReserveValue = window.initialBalances.monthly_reserve || 0;
        const targetReserveValue = window.initialTargetReserve || 0;
        const remainingValue = Math.max(0, targetReserveValue - currentReserveValue);
        const progressPercentage = targetReserveValue > 0 ? 
            Math.min(100, (currentReserveValue / targetReserveValue) * 100) : 0;

        // Обновляем текущий резерв (только число, символ валюты добавится автоматически)
        const currentReserveEl = document.getElementById('currentReserveAmount');
        if (currentReserveEl) {
            currentReserveEl.textContent = formatAmount(currentReserveValue);
            currentReserveEl.setAttribute('data-raw-value', currentReserveValue);
        }

        // Обновляем отложено в этом месяце (только число)
        const monthlyReserveEl = document.getElementById('monthlyReserveAmount');
        if (monthlyReserveEl) {
            monthlyReserveEl.textContent = formatAmount(monthlyReserveValue);
            monthlyReserveEl.setAttribute('data-raw-value', monthlyReserveValue);
        }

        // Обновляем всего накоплено (только число)
        const totalReserveEl = document.getElementById('totalReserveAmount');
        if (totalReserveEl) {
            totalReserveEl.textContent = formatAmount(currentReserveValue);
            totalReserveEl.setAttribute('data-raw-value', currentReserveValue);
        }

        // Обновляем целевой резерв (только число)
        const targetReserveEl = document.getElementById('targetReserveAmount');
        if (targetReserveEl) {
            targetReserveEl.textContent = formatAmount(targetReserveValue);
            targetReserveEl.setAttribute('data-raw-value', targetReserveValue);
        }

        // Обновляем осталось до цели (только число)
        const remainingEl = document.getElementById('remainingToTarget');
        if (remainingEl) {
            remainingEl.textContent = formatAmount(remainingValue);
            remainingEl.setAttribute('data-raw-value', remainingValue);
        }

        // Обновляем текст "Осталось: X" (без символа валюты)
        const remainingTextEl = document.getElementById('remainingToTargetText');
        if (remainingTextEl) {
            remainingTextEl.innerHTML = `Осталось: <span id="remainingToTarget" data-raw-value="${remainingValue}">${formatAmount(remainingValue)}</span>`;
        }

        // Обновляем прогресс-бар и текст прогресса
        const progressBar = document.getElementById('reserveProgressBar');
        const progressText = document.getElementById('reserveProgressText');
        
        if (progressBar) {
            progressBar.style.width = `${progressPercentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${progressPercentage.toFixed(1)}%`;
        }

        // ОБНОВЛЯЕМ ЦЕЛЕВОЙ ПРОГРЕСС-БАР
        const targetProgressBar = document.getElementById('targetProgressBar');
        if (targetProgressBar) {
            targetProgressBar.style.width = `${progressPercentage}%`;
        }

        // ОБНОВЛЯЕМ ДИНАМИЧЕСКИЕ ЭЛЕМЕНТЫ ЦЕЛЕВОГО РЕЗЕРВА (только числа)
        const targetCurrentReserveEl = document.getElementById('targetCurrentReserve');
        if (targetCurrentReserveEl) {
            targetCurrentReserveEl.textContent = formatAmount(currentReserveValue);
            targetCurrentReserveEl.setAttribute('data-raw-value', currentReserveValue);
        }

        const targetRemainingEl = document.getElementById('targetRemaining');
        if (targetRemainingEl) {
            targetRemainingEl.textContent = formatAmount(remainingValue);
            targetRemainingEl.setAttribute('data-raw-value', remainingValue);
        }

        const targetProgressPercentEl = document.getElementById('targetProgressPercent');
        if (targetProgressPercentEl) {
            targetProgressPercentEl.textContent = `${progressPercentage.toFixed(1)}%`;
        }
        // В функцию updateSavingsDisplay добавьте этот код в конец try блока:
const currentTargetReserveMenu = document.getElementById('currentTargetReserve');
if (currentTargetReserveMenu) {
    currentTargetReserveMenu.textContent = formatAmount(targetReserveValue);
}

        // ОБНОВЛЯЕМ МОТИВАЦИОННОЕ СООБЩЕНИЕ
        updateMotivationMessage(progressPercentage);

    } catch (e) {
        console.error('updateSavingsDisplay error', e);
    }
}
// Функция для обновления мотивационного сообщения
function updateMotivationMessage(progressPercentage) {
    const motivationMessageEl = document.getElementById('motivationMessage');
    if (!motivationMessageEl) return;

    let messageHtml = '';

    if (progressPercentage === 100) {
        messageHtml = `
            <div class="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-2 border border-green-500/30">
                <p class="text-xs text-green-400 font-semibold">
                    <i class="fas fa-trophy mr-1"></i>Поздравляем! Цель достигнута!
                </p>
            </div>
        `;
    } else if (progressPercentage > 75) {
        messageHtml = `
            <p class="text-xs text-yellow-400 animate-pulse">
                <i class="fas fa-fire mr-1"></i>Осталось совсем немного!
            </p>
        `;
    } else if (progressPercentage > 50) {
        messageHtml = `
            <p class="text-xs text-blue-400">
                <i class="fas fa-rocket mr-1"></i>Отличный прогресс!
            </p>
        `;
    } else if (progressPercentage > 25) {
        messageHtml = `
            <p class="text-xs text-purple-400">
                <i class="fas fa-seedling mr-1"></i>Продолжайте в том же духе!
            </p>
        `;
    } else {
        messageHtml = `
            <p class="text-xs text-gray-400">
                <i class="fas fa-flag mr-1"></i>Начните свой путь к цели
            </p>
        `;
    }

    motivationMessageEl.innerHTML = messageHtml;
}

// -----------------------------
// Форматирование всех элементов резерва при загрузке
// -----------------------------
// Форматирование всех элементов резерва при загрузке
function formatAllReserveElements() {
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
            const rawValue = element.getAttribute('data-raw-value') || element.textContent.replace(/[^\d]/g, '');
            if (rawValue) {
                element.textContent = formatAmount(rawValue);
                element.setAttribute('data-raw-value', rawValue);
            }
        }
    });
    
    // Также форматируем прогресс при загрузке
    const progressText = document.getElementById('reserveProgressText');
    if (progressText) {
        const currentValue = parseFloat(progressText.textContent) || 0;
        progressText.textContent = `${currentValue.toFixed(1)}%`;
    }
}


// -----------------------------
// Улучшенная функция форматирования
// -----------------------------
function formatAmount(amount) {
    // Если значение уже отформатировано (содержит пробелы), возвращаем как есть
    if (typeof amount === 'string' && amount.includes(' ')) {
        return amount;
    }
    
    const number = typeof amount === 'string' ? 
        parseFloat(amount.replace(/\s/g, '').replace(',', '.')) : 
        amount || 0;
    
    // Округляем до целого числа
    const rounded = Math.round(number);
    
    // Форматируем с пробелами между тысячами
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}





// Функция для обновления отображения резерва в интерфейсе
function updateReserveDisplay() {
    try {
        const reserveAmountEl = document.getElementById('reserveAmount');
        const reservePercentDisplay = document.getElementById('reservePercentageDisplay');
        const currentReservePercent = document.getElementById('currentReservePercent');
        
        // Обновляем сумму резерва
        if (reserveAmountEl && window.initialBalances) {
            const reserveValue = window.initialBalances.total_reserve || 0;
            reserveAmountEl.textContent = formatAmount(reserveValue);
            reserveAmountEl.setAttribute('data-raw-value', reserveValue);
        }
        
        // Обновляем отображение процента в разных местах
        const reservePercentage = window.initialReservePercentage || 0;
        
        if (reservePercentDisplay) {
            reservePercentDisplay.textContent = reservePercentage;
        }
        
        if (currentReservePercent) {
            currentReservePercent.textContent = reservePercentage + '%';
        }
        
        // Обновляем уведомление о резерве
        updateReserveNotification();
        
    } catch (e) {
        console.error('updateReserveDisplay error', e);
    }
}



// -----------------------------
// Добавление транзакции в DOM
// -----------------------------

window.addTransactionToList = function(transaction, animate = true, append = false) {
    const transactionsContainer = document.getElementById('transactionsListContainer');
    if (!transactionsContainer) return;

    const transactionDate = new Date(transaction.created_at || transaction.created || Date.now());
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
         data-created-date="${formattedDate}"
         data-created-time="${formattedTime}">
        <div class="flex items-center">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center mr-3" 
                 style="background-color: ${categoryColor}22; color: ${categoryColor}">
                <i class="${categoryIcon} text-sm"></i>
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


function openTransactionDetail(transactionElement) {
    const modal = document.getElementById("transactionDetailModal");
    if (!modal) return;

    // Получаем данные из data-атрибутов
    const transactionId = transactionElement.dataset.transactionId;
    const categoryName = transactionElement.dataset.categoryName;
    const categoryIcon = transactionElement.dataset.categoryIcon;
    const categoryColor = transactionElement.dataset.categoryColor;
    const transactionType = transactionElement.dataset.transactionType;
    const amount = parseFloat(transactionElement.dataset.transactionAmount);
    const reserveAmount = parseFloat(transactionElement.dataset.reserveAmount);
    const description = transactionElement.dataset.description;
    const createdDate = transactionElement.dataset.createdDate;
    const createdTime = transactionElement.dataset.createdTime;
    
    // Сохраняем данные транзакции для возможного обновления
    currentTransactionDetailData = {
        transactionId,
        categoryName,
        categoryIcon,
        categoryColor,
        transactionType,
        amount,
        reserveAmount,
        description,
        createdDate,
        createdTime
    };
    
    // Обновляем модалку с текущими данными
    updateTransactionDetailModal();
    
    // УБЕДИТЕСЬ, ЧТО ПЕРЕД ОТКРЫТИЕМ ПОЛНОСТЬЮ СБРАСЫВАЕМ ВСЕ СОСТОЯНИЯ
    resetDeleteConfirmation();
    
    // Сохраняем transactionId в модалке для использования при удалении
    modal.dataset.currentTransactionId = transactionId;

    // Показываем модалку с анимацией
    animateModal(modal, true);
}

// Функция для обновления модалки деталей транзакции
function updateTransactionDetailModal() {
    if (!currentTransactionDetailData) return;
    
    const modal = document.getElementById("transactionDetailModal");
    if (!modal) return;
    
    const {
        transactionId,
        categoryName,
        categoryIcon,
        categoryColor,
        transactionType,
        amount,
        reserveAmount,
        description,
        createdDate,
        createdTime
    } = currentTransactionDetailData;
    
    // Получаем текущий символ валюты
    const currentCurrency = window.currentCurrency || 'c';
    let currencySymbol = 'с';
    switch(currentCurrency) {
        case 'c': currencySymbol = 'с'; break;
        case 'r': currencySymbol = '₽'; break;
        case '$': currencySymbol = '$'; break;
        case '€': currencySymbol = '€'; break;
    }
    
    const isIncome = transactionType === 'income';

    // Обновляем основную сумму
    const amountDisplay = document.getElementById('detailAmount');
    if (amountDisplay) {
        amountDisplay.innerHTML = '';
        
        const amountSpan = document.createElement('span');
        amountSpan.textContent = (isIncome ? '+' : '-') + formatAmount(amount);
        amountSpan.style.color = isIncome ? '#10B981' : '#EF4444';
        
        const currencySpan = document.createElement('span');
        currencySpan.className = 'currency-symbol';
        currencySpan.textContent = ' ' + currencySymbol;
        
        amountDisplay.appendChild(amountSpan);
        amountDisplay.appendChild(currencySpan);
    }
    
    // ID транзакции под суммой
    const detailTransactionId = document.getElementById('detailTransactionId');
    if (detailTransactionId) {
        detailTransactionId.textContent = `ID ${transactionId || '-'}`;
    }
    
    // Резерв под основной суммой (только для доходов)
    const reserveInfo = document.getElementById('detailReserveInfo');
    const reserveAmountElement = document.getElementById('detailReserveAmount');
    
    if (reserveInfo && reserveAmountElement) {
        if (isIncome && reserveAmount > 0) {
            reserveInfo.classList.remove('hidden');
            reserveAmountElement.textContent = formatAmount(reserveAmount);
            
            // Обновляем символ валюты в резерве
            const reserveCurrencySymbols = reserveInfo.querySelectorAll('.currency-symbol');
            reserveCurrencySymbols.forEach(symbol => {
                symbol.textContent = ' ' + currencySymbol;
            });
        } else {
            reserveInfo.classList.add('hidden');
        }
    }
    
    // Обновляем все символы валюты в модалке
    const currencySymbols = modal.querySelectorAll('.currency-symbol');
    currencySymbols.forEach(symbol => {
        symbol.textContent = ' ' + currencySymbol;
    });
    
    // Категория и тип
    const categoryIconEl = document.getElementById('detailCategoryIcon');
    if (categoryIconEl) {
        categoryIconEl.innerHTML = `<i class="${categoryIcon} text-lg"></i>`;
        categoryIconEl.style.backgroundColor = categoryColor + '22';
        categoryIconEl.style.color = categoryColor;
    }
    
    const detailCategoryName = document.getElementById('detailCategoryName');
    if (detailCategoryName) {
        detailCategoryName.textContent = categoryName;
    }
    
    const typeElement = document.getElementById('detailType');
    if (typeElement) {
        typeElement.textContent = isIncome ? 'Доход' : 'Расход';
        typeElement.style.color = isIncome ? '#10B981' : '#EF4444';
    }
    
    // Описание
    const descriptionSection = document.getElementById('detailDescriptionSection');
    const descriptionElement = document.getElementById('detailDescription');
    if (descriptionSection && descriptionElement) {
        if (description && description.trim() !== '') {
            descriptionSection.style.display = 'block';
            descriptionElement.textContent = description;
        } else {
            descriptionSection.style.display = 'none';
        }
    }
    
    // Дата и время
    const detailTimestamp = document.getElementById('detailTimestamp');
    if (detailTimestamp) {
        detailTimestamp.textContent = `${createdDate} ${createdTime}`;
    }
}

// -----------------------------
// Пустые состояния
// -----------------------------
function hideEmptyStates() {
    const emptyAll = document.getElementById('emptyStateAll');
    const emptyFiltered = document.getElementById('emptyStateFiltered');
    if (emptyAll) emptyAll.classList.add('hidden');
    if (emptyFiltered) emptyFiltered.classList.add('hidden');
}

function showEmptyState() {
    const emptyAll = document.getElementById('emptyStateAll');
    const emptyFiltered = document.getElementById('emptyStateFiltered');
    if (currentCategory === 'all') {
        if (emptyAll) emptyAll.classList.remove('hidden');
        if (emptyFiltered) emptyFiltered.classList.add('hidden');
    } else {
        if (emptyFiltered) emptyFiltered.classList.remove('hidden');
        if (emptyAll) emptyAll.classList.add('hidden');
    }
}

// -----------------------------
// Загрузка транзакций кнопка
// -----------------------------
async function loadTransactions() {
    if (isLoading) return;
    isLoading = true;

    const transactionsContainer = document.getElementById('transactionsListContainer');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (!transactionsContainer) {
        console.error('transactionsListContainer not found');
        isLoading = false;
        return;
    }

  

    if (currentPage === 1) {
        transactionsContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                <p class="text-gray-400 text-sm mt-2">Загрузка...</p>
            </div>
        `;
    }

    try {
        const url = `/get_transactions/?filter=${currentFilter}&page=${currentPage}&limit=${PAGE_SIZE}&category=${currentCategory}`;
        
        
        const resp = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (!resp.ok) {
            console.error('Server error when fetching transactions:', resp.status, resp.statusText);
            if (currentPage === 1) {
                transactionsContainer.innerHTML = `<div class="text-center py-8 text-red-400"><i class="fas fa-exclamation-triangle text-2xl mb-2"></i><p>Ошибка загрузки (сервер вернул ${resp.status}).</p></div>`;
            }
            hasMoreTransactions = false;
            if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
            return;
        }

        const data = await resp.json();
       
        
        if (data.success) {
            if (currentPage === 1) transactionsContainer.innerHTML = '';
            
            if (data.transactions && data.transactions.length > 0) {
               
                
                data.transactions.forEach(tx => window.addTransactionToList(tx, false, true));
                
                hasMoreTransactions = !!data.has_more;
                if (loadMoreContainer) loadMoreContainer.classList.toggle('hidden', !hasMoreTransactions);
                hideEmptyStates();
                updateWelcomeHint();
                if (hasMoreTransactions) currentPage++;
            } else {
                
                if (currentPage === 1) {
                    transactionsContainer.innerHTML = '';
                    showEmptyState();
                    updateWelcomeHint();
                    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
                } else {
                    if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
                }
                hasMoreTransactions = false;
            }
        } else {
            console.error('API returned success:false for transactions:', data);
            if (currentPage === 1) {
                transactionsContainer.innerHTML = `<div class="text-center py-8 text-red-400"><i class="fas fa-exclamation-triangle text-2xl mb-2"></i><p>Ошибка загрузки данных</p></div>`;
            }
            if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
            hasMoreTransactions = false;
        }
    } catch (error) {
        console.error('Ошибка при загрузке транзакций:', error);
        if (currentPage === 1) {
            transactionsContainer.innerHTML = `<div class="text-center py-8 text-red-400"><i class="fas fa-exclamation-triangle text-2xl mb-2"></i><p>Ошибка загрузки</p></div>`;
        }
        if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
        hasMoreTransactions = false;
    } finally {
        isLoading = false;
    }
}
// Загрузить ещё
async function loadMoreTransactions() {
    if (isLoading || !hasMoreTransactions) return;
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<div class="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>';
    }
    await loadTransactions();
    if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Загрузить еще';
    }
}

// -----------------------------
// Инициализация фильтров и табов категорий
// -----------------------------
function updateCategoryTabsHandlers() {
    const tabs = document.querySelectorAll('.tab');
    // переподвешиваем обработчики (делаем клон чтобы убрать старые)
    tabs.forEach(tab => {
        const clone = tab.cloneNode(true);
        tab.parentNode.replaceChild(clone, tab);
    });
    const updatedTabs = document.querySelectorAll('.tab');
    updatedTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            updatedTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const categoryId = this.dataset.category;
            currentCategory = categoryId || 'all';
            currentPage = 1;
            hasMoreTransactions = true;
            loadTransactions();
        });
    });
}

function initTransactionFilter() {
   
    
    // Ждем полной загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTransactionFilter);
        return;
    }

    const filterToggle = document.getElementById('filterToggleBtn');
    const filterDropdown = document.getElementById('filterDropdown');
    const filterOptions = document.querySelectorAll('.filter-option');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    

    if (filterToggle && filterDropdown) {
        // Удаляем существующие обработчики чтобы избежать дублирования
        filterToggle.replaceWith(filterToggle.cloneNode(true));
        const newFilterToggle = document.getElementById('filterToggleBtn');
        
        newFilterToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            
            filterDropdown.classList.toggle('hidden');
        });

        // закрываем при клике вне
        document.addEventListener('click', function(e) {
            if (!filterDropdown.contains(e.target) && !newFilterToggle.contains(e.target)) {
                filterDropdown.classList.add('hidden');
            }
        });
    }

    // Остальной код остается без изменений...
    filterOptions.forEach(option => {
        option.addEventListener('click', function() {
            const filter = this.dataset.filter;
            currentFilter = filter || 'week';
            currentPage = 1;
            hasMoreTransactions = true;
            const currentText = document.getElementById('currentFilterText');
            if (currentText) currentText.textContent = this.textContent.trim();
            filterDropdown.classList.add('hidden');
            loadTransactions();
        });
    });

    if (loadMoreBtn) loadMoreBtn.addEventListener('click', loadMoreTransactions);

    // автоинициализация
    setTimeout(() => {
        const container = document.getElementById('transactionsListContainer');
        if (container && container.children.length === 0) loadTransactions();
    }, 300);
}

// -----------------------------
// Удаление транзакций (инлайн-подтверждение)
// -----------------------------
function deleteTransaction(transactionId) {
    const el = document.querySelector(`.delete-transaction-btn[data-transaction-id="${transactionId}"]`);
    if (!el) return;
    const item = el.closest('.transaction-item');
    if (!item) return;

    // Сохраняем оригинальное содержимое и информацию о транзакции
    const originalContent = item.innerHTML;
    const transactionType = item.querySelector('.font-semibold').classList.contains('text-green-400') ? 'income' : 'expense';
    const amountText = item.querySelector('.font-semibold').textContent;
    const amount = parseFloat(amountText.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    // Создаем контент подтверждения удаления
    item.innerHTML = `
        <div class="flex items-center justify-between w-full animate-popIn">
            <div class="flex items-center space-x-2">
                <i class="fas fa-trash text-red-400"></i>
                <span class="text-gray-200 text-sm font-medium">Удалить операцию?</span>
            </div>
            <div class="flex items-center space-x-2">
                <button class="cancel-delete-btn bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-all">
                    Нет
                </button>
                <button class="confirm-delete-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                        data-transaction-id="${transactionId}">
                    Да
                </button>
            </div>
        </div>
    `;

    // Обработчик подтверждения удаления
    const confirmBtn = item.querySelector('.confirm-delete-btn');
    confirmBtn.addEventListener('click', async function(e) {
        e.stopPropagation(); // Предотвращаем всплытие
        try {
            const resp = await fetch(`/delete_transaction/${transactionId}/`);
            const data = await resp.json();
            if (data.success) {
                // Показываем успешное сообщение
                item.innerHTML = `
                    <div class="w-full flex items-center justify-between animate-popIn">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center ring-2 ring-green-400/30 shadow-inner shadow-green-600/10">
                                <i class="fas fa-check text-green-400 text-lg"></i>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-green-400 font-semibold text-sm tracking-wide">Транзакция удалена!</span>
                                <span class="text-gray-400 text-xs">Данные успешно обновлены :)</span>
                            </div>
                        </div>
                        <i class="fas fa-circle-check text-green-400 text-xl opacity-80"></i>
                    </div>
                `;

                setTimeout(() => { 
                    item.remove(); 
                    checkEmptyStatesAfterChange(); 
                    updateWelcomeHint();
                }, 2200);

                // Обновляем балансы
                if (data.updated_balances) {
                    window.initialBalances = data.updated_balances;
                    updateBalanceDisplay();
                } else {
                    updateBalancesAfterDelete(transactionType, Math.abs(amount));
                }
            } else {
                item.innerHTML = originalContent;
                reattachDeleteHandler(item, transactionId);
            }
        } catch (e) {
            console.error('delete transaction error', e);
            item.innerHTML = originalContent;
            reattachDeleteHandler(item, transactionId);
        }
    });
    
    // Обработчик отмены удаления
    const cancelBtn = item.querySelector('.cancel-delete-btn');
    cancelBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Предотвращаем всплытие
        item.innerHTML = originalContent;
        reattachDeleteHandler(item, transactionId);
    });
}
// -----------------------------
// Перепривязка обработчика удаления после отмены
// -----------------------------
function reattachDeleteHandler(item, transactionId) {
    const deleteBtn = item.querySelector('.delete-transaction-btn');
    if (deleteBtn) {
        // Удаляем старые обработчики и добавляем новый
        deleteBtn.replaceWith(deleteBtn.cloneNode(true));
        const newDeleteBtn = item.querySelector('.delete-transaction-btn');
        newDeleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            deleteTransaction(transactionId);
        });
    }
}

// -----------------------------
// Локальное обновление балансов при удалении транзакции
// -----------------------------
function updateBalancesAfterDelete(type, amount) {
    if (!window.initialBalances) window.initialBalances = { total: 0, income: 0, expense: 0 };
    
    let total = parseFloat(window.initialBalances.total || 0);
    let income = parseFloat(window.initialBalances.income || 0);
    let expense = parseFloat(window.initialBalances.expense || 0);

    if (type === 'income') {
        // Удаляем доход: уменьшаем общий баланс и доходы
        total -= amount;
        income -= amount;
    } else {
        // Удаляем расход: увеличиваем общий баланс и уменьшаем расходы
        total += amount;
        expense -= amount;
    }

    window.initialBalances.total = total;
    window.initialBalances.income = income;
    window.initialBalances.expense = expense;
    
    updateBalanceDisplay();
}



    // -----------------------------
// Инициализация модалки деталей транзакции
// -----------------------------
function initTransactionDetailModal() {
    const modal = document.getElementById("transactionDetailModal");
    if (!modal) {
        console.error("Transaction detail modal not found");
        return;
    }

    // Закрытие по клику вне модалки
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeTransactionDetailModal();
        }
    });

    // Делегирование событий для кнопок внутри модалки
    modal.addEventListener('click', function(e) {
        // Кнопка "Удалить транзакцию" - ПЕРВОЕ НАЖАТИЕ
        if (e.target.closest('#deleteTransactionBtn')) {
            e.preventDefault();
            e.stopPropagation();
            showDeleteConfirmation();
            return;
        }
        
        // Кнопка "Отмена" при подтверждении удаления
        if (e.target.closest('#cancelDeleteBtn')) {
            e.preventDefault();
            e.stopPropagation();
            resetDeleteConfirmation();
            return;
        }
        
        // Кнопка "Да, удалить" - ВТОРОЕ НАЖАТИЕ
        if (e.target.closest('#confirmDeleteBtn')) {
            e.preventDefault();
            e.stopPropagation();
            deleteTransactionFromModal();
            return;
        }
        
        // Кнопка закрытия модалки
        if (e.target.closest('#closeTransactionDetailModal')) {
            e.preventDefault();
            e.stopPropagation();
            closeTransactionDetailModal();
            return;
        }
    });
}

// Функция для показа подтверждения удаления
function showDeleteConfirmation() {
    
    const normalButtons = document.getElementById('normalButtons');
    const confirmDeleteSection = document.getElementById('confirmDeleteSection');
    
    if (normalButtons) normalButtons.classList.add('hidden');
    if (confirmDeleteSection) {
        confirmDeleteSection.classList.remove('hidden');
        confirmDeleteSection.classList.add('animate-fadeIn');
    }
}

// Функция для сброса состояния подтверждения удаления
function resetDeleteConfirmation() {
  
    const normalButtons = document.getElementById('normalButtons');
    const confirmDeleteSection = document.getElementById('confirmDeleteSection');
    
    if (normalButtons) normalButtons.classList.remove('hidden');
    if (confirmDeleteSection) {
        // ВОССТАНАВЛИВАЕМ ОРИГИНАЛЬНЫЙ HTML КНОПОК ПОДТВЕРЖДЕНИЯ
        confirmDeleteSection.innerHTML = `
             <div class="text-center mb-3">
                    <p class="text-red-400 font-semibold">Удалить транзакцию?</p>
                    <p class="text-gray-400 text-sm">Это действие нельзя отменить!</p>
                </div>
            <div class="flex space-x-2">
                <button id="cancelDeleteBtn" class="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors">
                    Отмена
                </button>
                <button id="confirmDeleteBtn" class="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">
                    Да, удалить!
                </button>
            </div>
        `;
        confirmDeleteSection.classList.add('hidden');
        confirmDeleteSection.classList.remove('animate-fadeIn');
    }
}


// Функция для удаления транзакции из модалки
async function deleteTransactionFromModal() {
    const modal = document.getElementById("transactionDetailModal");
    if (!modal) {
        console.error("Modal not found");
        return;
    }
    
    const transactionId = modal.dataset.currentTransactionId;
    if (!transactionId) {
        console.error("No transaction ID found");
        alert('Ошибка: ID транзакции не найден');
        resetDeleteConfirmation();
        return;
    }
    
    
    try {
        // Показываем состояние загрузки
        const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Удаление...';
            confirmDeleteBtn.disabled = true;
        }
        
        const resp = await fetch(`/delete_transaction/${transactionId}/`);
        if (!resp.ok) {
            throw new Error(`HTTP error! status: ${resp.status}`);
        }
        
        const data = await resp.json();
        
        if (data.success) {
            // Показываем успешное сообщение
            const confirmDeleteSection = document.getElementById('confirmDeleteSection');
            if (confirmDeleteSection) {
                confirmDeleteSection.innerHTML = `
                    <div class="text-center py-4 animate-popIn">
                        <div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                            <i class="fas fa-check text-green-400 text-xl"></i>
                        </div>
                        <p class="text-green-400 font-semibold">Транзакция удалена!</p>
                        
                    </div>
                `;
            }
            
            // Обновляем балансы
            if (data.updated_balances) {
                window.initialBalances = data.updated_balances;
                updateBalanceDisplay();
            }
            
            // Удаляем транзакцию из списка
            const transactionElement = document.querySelector(`[data-transaction-id="${transactionId}"]`);
            if (transactionElement) {
                transactionElement.style.opacity = '0.5';
                setTimeout(() => {
                    transactionElement.remove();
                    checkEmptyStatesAfterChange();
                    updateWelcomeHint();
                }, 500);
            }
            
            // Закрываем модалку через 1 секунду
            setTimeout(() => {
                closeTransactionDetailModal();
            }, 1000);
            
        } else {
            // Показываем ошибку
            console.error('Delete failed:', data.error);
            alert(data.error || 'Ошибка при удалении транзакции');
            resetDeleteConfirmation();
        }
    } catch (error) {
        console.error('Ошибка при удалении транзакции:', error);
        alert('Произошла ошибка при удалении: ' + error.message);
        resetDeleteConfirmation();
    }
}




// Функция закрытия модалки деталей транзакции
function closeTransactionDetailModal() {
    const modal = document.getElementById("transactionDetailModal");
    if (modal) {
        // СБРАСЫВАЕМ СОСТОЯНИЕ ПОДТВЕРЖДЕНИЯ ПЕРЕД ЗАКРЫТИЕМ
        resetDeleteConfirmation();
        
        animateModal(modal, false);
        
        // ОЧИЩАЕМ ID ТРАНЗАКЦИИ И ДАННЫЕ ПРИ ЗАКРЫТИИ
        setTimeout(() => {
            if (modal.dataset.currentTransactionId) {
                delete modal.dataset.currentTransactionId;
            }
            // Сбрасываем данные транзакции
            currentTransactionDetailData = null;
        }, 300);
    }
}




function openTransactionDetail(transactionElement) {
    const modal = document.getElementById("transactionDetailModal");
    if (!modal) return;

    // Получаем данные из data-атрибутов
    const transactionId = transactionElement.dataset.transactionId;
    const categoryName = transactionElement.dataset.categoryName;
    const categoryIcon = transactionElement.dataset.categoryIcon;
    const categoryColor = transactionElement.dataset.categoryColor;
    const transactionType = transactionElement.dataset.transactionType;
    const amount = parseFloat(transactionElement.dataset.transactionAmount);
    const reserveAmount = parseFloat(transactionElement.dataset.reserveAmount);
    const description = transactionElement.dataset.description;
    const createdDate = transactionElement.dataset.createdDate;
    const createdTime = transactionElement.dataset.createdTime;
    
    // Получаем текущий символ валюты
    const currentCurrency = window.currentCurrency || 'c';
    let currencySymbol = 'с';
    switch(currentCurrency) {
        case 'c': currencySymbol = 'с'; break;
        case 'r': currencySymbol = '₽'; break;
        case '$': currencySymbol = '$'; break;
        case '€': currencySymbol = '€'; break;
    }
    
    // СБРАСЫВАЕМ СОСТОЯНИЕ ПЕРЕД ОТКРЫТИЕМ
    resetDeleteConfirmation();
    
    // Сохраняем transactionId в модалке для использования при удалении
    modal.dataset.currentTransactionId = transactionId;
    
    const isIncome = transactionType === 'income';

    // ОБНОВЛЯЕМ СУММУ - ПРАВИЛЬНЫЙ ПОДХОД
    const amountDisplay = document.getElementById('detailAmount');
    if (amountDisplay) {
        // Очищаем и пересоздаем содержимое
        amountDisplay.innerHTML = '';
        
        const amountSpan = document.createElement('span');
        amountSpan.className = 'amount-value';
        amountSpan.textContent = (isIncome ? '+' : '-') + formatAmount(amount);
        amountSpan.style.color = isIncome ? '#10B981' : '#EF4444';
        amountSpan.style.fontSize = '2.25rem'; // text-4xl
        amountSpan.style.fontWeight = 'bold';
        
        const currencySpan = document.createElement('span');
        currencySpan.className = 'currency-symbol';
        currencySpan.textContent = ' ' + currencySymbol;
        currencySpan.style.color = isIncome ? '#10B981' : '#EF4444';
        currencySpan.style.fontSize = '2.25rem'; // text-4xl
        currencySpan.style.fontWeight = 'bold';
        
        amountDisplay.appendChild(amountSpan);
        amountDisplay.appendChild(currencySpan);
    }
    
    // ID транзакции под суммой
    const detailTransactionId = document.getElementById('detailTransactionId');
    if (detailTransactionId) {
        detailTransactionId.textContent = `ID ${transactionId || '-'}`;
    }
    
    // Резерв под основной суммой (только для доходов)
    const reserveInfo = document.getElementById('detailReserveInfo');
    const reserveAmountElement = document.getElementById('detailReserveAmount');
    
    if (reserveInfo && reserveAmountElement) {
        if (isIncome && reserveAmount > 0) {
            reserveInfo.classList.remove('hidden');
            reserveAmountElement.textContent = formatAmount(reserveAmount);
            
            // Обновляем символ валюты в резерве
            const reserveCurrencySymbols = reserveInfo.querySelectorAll('.currency-symbol');
            reserveCurrencySymbols.forEach(symbol => {
                symbol.textContent = ' ' + currencySymbol;
            });
        } else {
            reserveInfo.classList.add('hidden');
        }
    }
    
    // Категория и тип
    const categoryIconEl = document.getElementById('detailCategoryIcon');
    if (categoryIconEl) {
        categoryIconEl.innerHTML = `<i class="${categoryIcon} text-lg"></i>`;
        categoryIconEl.style.backgroundColor = categoryColor + '22';
        categoryIconEl.style.color = categoryColor;
    }
    
    const detailCategoryName = document.getElementById('detailCategoryName');
    if (detailCategoryName) {
        detailCategoryName.textContent = categoryName;
    }
    
    const typeElement = document.getElementById('detailType');
    if (typeElement) {
        typeElement.textContent = isIncome ? 'Доход' : 'Расход';
        typeElement.style.color = isIncome ? '#10B981' : '#EF4444';
    }
    
    // Описание
    const descriptionSection = document.getElementById('detailDescriptionSection');
    const descriptionElement = document.getElementById('detailDescription');
    if (descriptionSection && descriptionElement) {
        if (description && description.trim() !== '') {
            descriptionSection.style.display = 'block';
            descriptionElement.textContent = description;
        } else {
            descriptionSection.style.display = 'none';
        }
    }
    
    // Дата и время
    const detailTimestamp = document.getElementById('detailTimestamp');
    if (detailTimestamp) {
        detailTimestamp.textContent = `${createdDate} ${createdTime}`;
    }

    // Показываем модалку с анимацией
    animateModal(modal, true);
}


// -----------------------------
// Делегирование событий для кнопок удаления
// -----------------------------
document.addEventListener('click', function(e) {
    // Обработка кнопок удаления категорий
    if (e.target.closest('.delete-category-btn')) {
        const target = e.target.closest('.delete-category-btn');
        e.preventDefault();
        e.stopPropagation();
        const categoryId = target.dataset.categoryId;
        if (categoryId) {
            deleteCategory(categoryId);
        }
        return;
    }

    // Обработка клика по категории для открытия деталей
    const categoryItem = e.target.closest('.category-item');
    if (categoryItem && !e.target.closest('.delete-category-btn')) {
        // Используем функцию из categories-modal.js
        if (typeof openCategoryDetail === 'function') {
            openCategoryDetail(categoryItem);
        }
    }

    // Обработка клика по транзакции для открытия деталей
    const transactionItem = e.target.closest('.transaction-item');
    if (transactionItem && !e.target.closest('.delete-transaction-btn')) {
        openTransactionDetail(transactionItem);
    }
});






// -----------------------------
// Проверки пустых состояний
// -----------------------------

function checkEmptyStatesAfterChange() {
    const transactionsContainer = document.getElementById('transactionsListContainer');
    if (!transactionsContainer) return;
    
    const items = transactionsContainer.querySelectorAll('.transaction-item');
    const visible = Array.from(items).filter(it => !it.innerHTML.includes('Удалить?') && !it.innerHTML.includes('Удалено'));
    
    if (visible.length === 0) {
        showEmptyState();
    } else {
        hideEmptyStates();
    }
    
    // Обновляем подсказку
    updateWelcomeHint();
}



// -----------------------------
// Категории: загрузка и обновление
// -----------------------------
async function updateGlobalCategories() {
    try {
        const resp = await fetch('/get_categories/');
        const data = await resp.json();
        if (data.categories) {
            window.categories = data.categories;
            // обновим табы
            updateCategoryTabs();
        }
    } catch (e) {
        console.error('updateGlobalCategories error', e);
    }
}

async function updateCategoryTabs() {
    try {
        const resp = await fetch('/get_categories/');
        const data = await resp.json();
        if (!data.categories) return;
        const tabsWrapper = document.getElementById('tabsWrapper');
        if (!tabsWrapper) return;
        tabsWrapper.innerHTML = `<div class="tab active" data-category="all"><span>Все</span></div>`;
        data.categories.forEach(cat => {
            const el = document.createElement('div');
            el.className = 'tab';
            el.dataset.category = cat.id;
            el.innerHTML = `<span>${cat.name}</span>`;
            tabsWrapper.appendChild(el);
        });
        updateCategoryTabsHandlers();
    } catch (e) {
        console.error('updateCategoryTabs error', e);
    }
}

// -----------------------------
// Инициализация модалки транзакции, клавиатуры и формы
// -----------------------------
function initTransactionModal() {
    const modal = document.getElementById("transactionModal");
    const openBtn = document.getElementById("openTransactionModalBtn");
    const closeBtn = document.getElementById("closeTransactionModalBtn");

    if (openBtn && modal) {
        openBtn.addEventListener('click', async function() {
            animateModal(modal, true);
            resetTransactionForm();
            await updateGlobalCategories();
            // если есть функция loadCategories, вызовем её
            if (typeof loadCategoriesForModal === 'function') loadCategoriesForModal();

        });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => animateModal(modal, false));
    }

    // По клику вне модалки
    if (modal) {
        modal.addEventListener('click', e => { if (e.target === modal) animateModal(modal, false); });
    }

    initTypeButtons();
    initKeypad();
    initFormSubmission();
    
}

function initTypeButtons() {
    const typeButtons = document.querySelectorAll('.type-btn');
    typeButtons.forEach(button => {
        button.addEventListener('click', function() {
            typeButtons.forEach(btn => {
                btn.classList.remove('bg-red-600','bg-green-600','text-white','border-red-600','border-green-600');
                btn.classList.add('bg-gray-700','text-gray-300','border-gray-600');
            });
            const type = this.dataset.type;
            if (type === 'expense') {
                this.classList.remove('bg-gray-700','text-gray-300','border-gray-600');
                this.classList.add('bg-red-600','text-white','border-red-600');
            } else {
                this.classList.remove('bg-gray-700','text-gray-300','border-gray-600');
                this.classList.add('bg-green-600','text-white','border-green-600');
            }
        });
    });
}

function initKeypad() {
    const amountInput = document.getElementById('amountInput');
    const keys = document.querySelectorAll('.keypad-btn');
    if (!amountInput) return;
    function formatInputAmount(value) {
        const clean = value.replace(/[^\d]/g,'');
        if (!clean) return '0';
        return formatAmount(clean);
    }
    keys.forEach(k => {
        k.addEventListener('click', function() {
            const v = this.textContent.trim();
            const current = amountInput.value.replace(/[^\d]/g,'');
            if (this.querySelector('i.fa-backspace')) {
                const newV = current.slice(0,-1) || '0';
                amountInput.value = formatInputAmount(newV);
            } else if (v === '00') {
                const newV = current === '0' ? '0' : current + '00';
                amountInput.value = formatInputAmount(newV);
            } else {
                let newV = current === '0' ? v : current + v;
                amountInput.value = formatInputAmount(newV);
            }
        });
    });
    amountInput.addEventListener('input', function() { this.value = formatInputAmount(this.value); });
}

function resetTransactionForm() {
    const form = document.getElementById('transactionForm');
    if (form) form.reset();
    resetCategorySelection();
    
    const amountInput = document.getElementById('amountInput');
    if (amountInput) amountInput.value = '0';
    
    // Сброс кнопок типа операции
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('bg-red-600','bg-green-600','text-white','border-red-600','border-green-600');
        btn.classList.add('bg-gray-700','text-gray-300','border-gray-600');
    });
}





function initFormSubmission() {
    const form = document.getElementById('transactionForm');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const activeTypeBtn = document.querySelector('.type-btn.bg-red-600, .type-btn.bg-green-600');
        if (!activeTypeBtn) { alert('Выберите тип операции (Расход/Доход)'); return; }
        const transactionType = activeTypeBtn.dataset.type;
        const amountRaw = document.getElementById('amountInput').value.replace(/\s/g,'');
        if (!amountRaw || parseFloat(amountRaw) <= 0) { alert('Введите корректную сумму'); return; }
        const selectedCategory = document.getElementById('selectedCategory').value;
        if (!selectedCategory) { alert('Выберите категорию'); return; }
        const formData = new FormData();
        formData.append('type', transactionType);
        formData.append('amount', amountRaw);
        formData.append('category', selectedCategory);
        formData.append('description', document.getElementById('descriptionInput') ? document.getElementById('descriptionInput').value : '');
        const csrfTokenEl = document.querySelector('[name=csrfmiddlewaretoken]');
        const csrfToken = csrfTokenEl ? csrfTokenEl.value : '';
        try {
            const resp = await fetch(window.ADD_TRANSACTION_URL || '/add_transaction/', {
                method: 'POST',
                headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest' },
                body: formData
            });
            const data = await resp.json();
            if (data.success) {
                // Закрываем модалку
                const modal = document.getElementById('transactionModal');
                if (modal) animateModal(modal, false);
                // Обновляем баланс и ставим транзакцию наверх
                if (data.transaction) window.addTransactionToList(data.transaction, true, false); 
                if (data.updated_balances) {
                    window.initialBalances = data.updated_balances;
                    updateBalanceDisplay();
                } else {
                    // локально обновим
                    updateBalancesAfterTransaction(transactionType, parseFloat(amountRaw));
                }
                showSuccessNotification('Транзакция успешна!');
            } else {
                alert(data.error || 'Ошибка при сохранении');
            }
        } catch (err) {
            console.error('submit transaction error', err);
            alert('Произошла ошибка при отправке формы');
        }
    });
}



function updateBalancesAfterTransaction(type, amount, reserveAmount = 0) {
    if (!window.initialBalances) window.initialBalances = { 
        total: 0, 
        income: 0, 
        expense: 0, 
        total_reserve: 0,
        monthly_reserve: 0 
    };
    
    let total = parseFloat(window.initialBalances.total || 0);
    let income = parseFloat(window.initialBalances.income || 0);
    let expense = parseFloat(window.initialBalances.expense || 0);
    let total_reserve = parseFloat(window.initialBalances.total_reserve || 0);
    let monthly_reserve = parseFloat(window.initialBalances.monthly_reserve || 0);

    if (type === 'income') {
        total += amount - reserveAmount;
        income += amount;
        total_reserve += reserveAmount;
        monthly_reserve += reserveAmount; // добавляем к месячному резерву
    } else {
        total -= amount;
        expense += amount;
    }

    window.initialBalances.total = total;
    window.initialBalances.income = income;
    window.initialBalances.expense = expense;
    window.initialBalances.total_reserve = total_reserve;
    window.initialBalances.monthly_reserve = monthly_reserve;
    
    updateBalanceDisplay();
}

function updateBalancesAfterDelete(type, amount, reserveAmount = 0) {
    if (!window.initialBalances) window.initialBalances = { 
        total: 0, 
        income: 0, 
        expense: 0, 
        total_reserve: 0,
        monthly_reserve: 0 
    };
    
    let total = parseFloat(window.initialBalances.total || 0);
    let income = parseFloat(window.initialBalances.income || 0);
    let expense = parseFloat(window.initialBalances.expense || 0);
    let total_reserve = parseFloat(window.initialBalances.total_reserve || 0);
    let monthly_reserve = parseFloat(window.initialBalances.monthly_reserve || 0);

    if (type === 'income') {
        total -= amount - reserveAmount;
        income -= amount;
        total_reserve -= reserveAmount;
        monthly_reserve -= reserveAmount; // вычитаем из месячного резерва
    } else {
        total += amount;
        expense -= amount;
    }

    window.initialBalances.total = total;
    window.initialBalances.income = income;
    window.initialBalances.expense = expense;
    window.initialBalances.total_reserve = total_reserve;
    window.initialBalances.monthly_reserve = monthly_reserve;
    
    updateBalanceDisplay();
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

// Загрузка категорий для модалки выбора
async function loadCategoriesForSelection() {
    const container = document.getElementById('categorySelectionList');
    const emptyState = document.getElementById('emptyCategoriesSelection');
    
    if (!container) return;

    try {
        const response = await fetch('/get_categories/');
        const data = await response.json();

        container.innerHTML = '';

        if (data.categories && data.categories.length > 0) {
            emptyState.classList.add('hidden');
            
            data.categories.forEach(cat => {
                const categoryItem = document.createElement('button');
                categoryItem.type = 'button';
                categoryItem.className = 'category-selection-item w-full p-4 rounded-xl bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 hover:border-blue-500/50 transition-all duration-200 flex items-center space-x-4 text-left';
                categoryItem.dataset.categoryId = cat.id;
                
                categoryItem.innerHTML = `
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" 
                         style="background-color: ${cat.color}22; color: ${cat.color}">
                        <i class="${cat.icon} text-lg"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-semibold text-white text-lg">${cat.name}</p>
                    </div>
                    <div class="w-6 h-6 rounded-full border-2 border-gray-500 flex items-center justify-center flex-shrink-0">
                        <div class="w-3 h-3 rounded-full bg-blue-500 hidden"></div>
                    </div>
                `;

                categoryItem.addEventListener('click', function() {
                    selectCategory(cat);
                    animateModal(document.getElementById('categorySelectionModal'), false);
                });

                container.appendChild(categoryItem);
            });
        } else {
            emptyState.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Ошибка загрузки категорий для выбора:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-400">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Ошибка загрузки категорий</p>
            </div>
        `;
    }
}

// Выбор категории
function selectCategory(category) {
    const selectedCategoryInput = document.getElementById('selectedCategory');
    const selectedCategoryDisplay = document.getElementById('selectedCategoryDisplay');
    
    if (selectedCategoryInput && selectedCategoryDisplay) {
        selectedCategoryInput.value = category.id;
        selectedCategoryDisplay.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center" 
                     style="background-color: ${category.color}22; color: ${category.color}">
                    <i class="${category.icon} text-sm"></i>
                </div>
                <span class="text-white font-medium">${category.name}</span>
            </div>
        `;
    }
    
    // Обновляем кнопку выбора категории
    const openCategoryBtn = document.getElementById('openCategorySelectionBtn');
    if (openCategoryBtn) {
        openCategoryBtn.classList.remove('border-gray-600', 'hover:border-blue-500');
        openCategoryBtn.classList.add('border-blue-500', 'bg-blue-500/10');
    }
}

// Сброс выбора категории при открытии модалки транзакции
function resetCategorySelection() {
    const selectedCategoryInput = document.getElementById('selectedCategory');
    const selectedCategoryDisplay = document.getElementById('selectedCategoryDisplay');
    const openCategoryBtn = document.getElementById('openCategorySelectionBtn');
    
    if (selectedCategoryInput) selectedCategoryInput.value = '';
    if (selectedCategoryDisplay) {
        selectedCategoryDisplay.innerHTML = `
            <i class="fas fa-tag mr-2 text-gray-400"></i>
            <span>Выберите категорию</span>
        `;
    }
    if (openCategoryBtn) {
        openCategoryBtn.classList.remove('border-blue-500', 'bg-blue-500/10');
        openCategoryBtn.classList.add('border-gray-600', 'hover:border-blue-500');
    }
}





// -----------------------------
// Управление подсказкой "Сделай первую транзакцию"
// -----------------------------
function updateWelcomeHint() {
    const welcomeHint = document.getElementById('welcomeHint');
    const transactionsContainer = document.getElementById('transactionsListContainer');
    
    if (!welcomeHint || !transactionsContainer) return;
    
    // Проверяем, есть ли транзакции в контейнере
    const transactionItems = transactionsContainer.querySelectorAll('.transaction-item');
    const hasVisibleTransactions = Array.from(transactionItems).some(item => {
        return !item.innerHTML.includes('Удалить?') && !item.innerHTML.includes('Удалено');
    });
    
    // Показываем или скрываем подсказку
    if (hasVisibleTransactions) {
        welcomeHint.classList.add('hidden');
    } else {
        welcomeHint.classList.remove('hidden');
    }
}

// -----------------------------
// Инициализация навигации, табов и общий DOMContentLoaded
// -----------------------------
function initTabNavigation() {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    const tabs = document.querySelectorAll('.mobile-tab');
    const balanceBlock = document.querySelector('.mobile-header .bg-gradient-to-r');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            navItems.forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            tabs.forEach(t => t.classList.remove('active'));
            if (balanceBlock) {
                if (tabName === 'home') balanceBlock.classList.remove('hidden');
                else balanceBlock.classList.add('hidden');
            }
            const active = document.getElementById(`tab-${tabName}`);
            if (active) active.classList.add('active');
            if (tabName === 'categories') loadUserCategories();
        });
    });
}

// -----------------------------
// Загрузка категорий в модалку "Добавить запись"
// -----------------------------
async function loadCategoriesForModal() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    try {
        const response = await fetch('/get_categories/');
        const data = await response.json();

        container.innerHTML = '';

        if (data.categories && data.categories.length > 0) {
            data.categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'category-carousel-btn flex flex-col items-center p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all duration-200';
                btn.dataset.categoryId = cat.id;
                btn.innerHTML = `
                    <div class="w-10 h-10 flex items-center justify-center rounded-full mb-1"
                         style="background-color:${cat.color}22; color:${cat.color}">
                        <i class="${cat.icon}"></i>
                    </div>
                    <span class="text-xs text-gray-300 truncate w-12 text-center">${cat.name}</span>
                `;

                btn.addEventListener('click', function () {
                    document.querySelectorAll('.category-carousel-btn').forEach(b => b.classList.remove('ring-2', 'ring-blue-500'));
                    this.classList.add('ring-2', 'ring-blue-500');
                    document.getElementById('selectedCategory').value = cat.id;
                });

                container.appendChild(btn);
            });
        } else {
            container.innerHTML = `<div class="text-gray-500 text-sm text-center py-4">Нет категорий</div>`;
        }
    } catch (e) {
        console.error('Ошибка загрузки категорий для модалки:', e);
    }
}



// -----------------------------
// Загрузка категорий на главной
// -----------------------------
async function loadUserCategories() {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;

    try {
        const response = await fetch('/get_categories_with_stats/');
        const data = await response.json();
        
        categoriesList.innerHTML = '';
        
        if (data.categories && data.categories.length > 0) {
            // Получаем текущий символ валюты
            const currentCurrency = window.currentCurrency || 'c';
            let currencySymbol = 'с';
            switch(currentCurrency) {
                case 'c': currencySymbol = 'с'; break;
                case 'r': currencySymbol = '₽'; break;
                case '$': currencySymbol = '$'; break;
                case '€': currencySymbol = '€'; break;
            }
            
            data.categories.forEach(category => {
                const categoryElement = document.createElement('div');
                categoryElement.className = 'category-item bg-gray-800 rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-gray-700/50 transition-colors';
                
                // Добавляем data-атрибуты для модалки
                categoryElement.dataset.categoryId = category.id;
                categoryElement.dataset.categoryName = category.name;
                categoryElement.dataset.categoryIcon = category.icon;
                categoryElement.dataset.categoryColor = category.color;
                
                categoryElement.innerHTML = `
                    <div class="flex items-center space-x-3 flex-1">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: ${category.color}22; color: ${category.color}">
                            <i class="${category.icon}"></i>
                        </div>
                        <div class="flex-1">
                            <p class="font-medium">${category.name}</p>
                            <div class="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                                <span>Расходы: ${formatAmount(category.expense_amount)} <span class="currency-symbol">${currencySymbol}</span></span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                        ${category.percentage > 0 ? `
                            <div class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-sm font-semibold min-w-12 text-center">
                                ${category.percentage}%
                            </div>
                        ` : ''}
                       
                    </div>
                `;
                
                categoriesList.appendChild(categoryElement);
            });
            
            // Добавляем обработчики для кнопок удаления
            document.querySelectorAll('.delete-category-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const categoryId = this.dataset.categoryId;
                    deleteCategory(categoryId);
                });
            });
        } else {
            categoriesList.innerHTML = `
                <div class="text-center py-8 text-gray-500" id="emptyCategoriesState">
                    <i class="fas fa-tags text-3xl mb-3"></i>
                    <p>Категорий пока нет</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка при загрузке категорий:', error);
        categoriesList.innerHTML = `
            <div class="text-center py-8 text-red-400">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Ошибка загрузки категорий</p>
            </div>
        `;
    }
}





// -----------------------------
// Модалка добавления категории
// -----------------------------
function initCategoryModal() {
    const modal = document.getElementById('categoryModal');
    const openBtn = document.getElementById('addCategoryBtn');
    const saveBtn = document.getElementById('saveCategoryBtn'); // 🟢 кнопка "Сохранить"
    const closeBtns = modal ? modal.querySelectorAll('.close-modal, [data-modal="category"]') : [];

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            animateModal(modal, true);
            resetCategoryForm();

            // 🟢 При открытии модалки загружаем иконки и цвета
            initIconsGrid();
            initColorsGrid();
        });
    }

    // 🟢 Сохранение категории
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCategory);
    }

    // Кнопки закрытия
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => animateModal(modal, false));
    });

    // Закрытие по клику вне содержимого
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === modal) animateModal(modal, false);
        });
    }
}

function resetCategoryForm() {
    const nameInput = document.getElementById('categoryNameInput');
    if (nameInput) nameInput.value = '';

    const iconGrid = document.getElementById('iconsGrid');
    const colorGrid = document.getElementById('colorsGrid');
    if (iconGrid) iconGrid.innerHTML = '';
    if (colorGrid) colorGrid.innerHTML = '';

    // 🟢 Сбрасываем активные выделения
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-700', 'text-gray-300');
    });
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.classList.remove('border-white', 'border-2');
    });
}


// -----------------------------
// СЕТКИ ИКОНОК И ЦВЕТОВ ДЛЯ МОДАЛКИ КАТЕГОРИЙ
// -----------------------------
function initIconsGrid() {
    const iconsGrid = document.getElementById('iconsGrid');
    if (!iconsGrid) return;

    const icons = [
        'fas fa-utensils', 'fas fa-home', 'fas fa-car', 'fas fa-heart',
        'fas fa-shopping-cart', 'fas fa-tv', 'fas fa-tshirt', 'fas fa-book',
        'fas fa-gift', 'fas fa-money-bill-wave', 'fas fa-chart-line', 'fas fa-building',
        'fas fa-briefcase', 'fas fa-phone', 'fas fa-wifi', 'fas fa-gas-pump'
    ];

    iconsGrid.innerHTML = '';
    icons.forEach(icon => {
        const iconBtn = document.createElement('button');
        iconBtn.type = 'button';
        iconBtn.className = 'icon-option p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300';
        iconBtn.innerHTML = `<i class="${icon} text-lg"></i>`;
        iconBtn.dataset.icon = icon;

        iconBtn.addEventListener('click', function() {
            document.querySelectorAll('.icon-option').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-700', 'text-gray-300');
            });
            this.classList.remove('bg-gray-700', 'text-gray-300');
            this.classList.add('bg-blue-600', 'text-white');
        });

        iconsGrid.appendChild(iconBtn);
    });
}

function initColorsGrid() {
    const colorsGrid = document.getElementById('colorsGrid');
    if (!colorsGrid) return;

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981',
        '#06b6d4', '#6366f1', '#ec4899'
    ];

    colorsGrid.innerHTML = '';
    colors.forEach(color => {
        const colorBtn = document.createElement('button');
        colorBtn.type = 'button';
        colorBtn.className = 'color-option w-8 h-8 rounded-full border-2 border-gray-600 mb-3';
        colorBtn.style.backgroundColor = color;
        colorBtn.dataset.color = color;

        colorBtn.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(btn => {
                btn.classList.remove('border-white', 'border-2');
            });
            this.classList.add('border-white', 'border-2');
        });

        colorsGrid.appendChild(colorBtn);
    });
}


async function saveCategory() {
    const nameInput = document.getElementById('categoryNameInput');
    const selectedIcon = document.querySelector('.icon-option.bg-blue-600');
    const selectedColor = document.querySelector('.color-option.border-white');

    if (!nameInput || !nameInput.value.trim()) {
        alert('Введите название категории');
        return;
    }

    if (!selectedIcon) {
        alert('Выберите иконку для категории');
        return;
    }

    if (!selectedColor) {
        alert('Выберите цвет для категории');
        return;
    }

    const formData = new FormData();
    formData.append('name', nameInput.value.trim());
    formData.append('icon', selectedIcon.dataset.icon);
    formData.append('color', selectedColor.dataset.color);

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    try {
        const response = await fetch('/add_category/', {
            method: "POST",
            headers: { 
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            animateModal(document.getElementById('categoryModal'), false);
            nameInput.value = '';

            // Сбрасываем выделение иконки и цвета
            document.querySelectorAll('.icon-option').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-700', 'text-gray-300');
            });
            document.querySelectorAll('.color-option').forEach(btn => {
                btn.classList.remove('border-white', 'border-2');
            });

            // Обновляем категории в приложении
            await updateGlobalCategories();
            if (typeof updateCategoryTabs === 'function') await updateCategoryTabs();
            if (typeof loadUserCategories === 'function') await loadUserCategories();

            showSuccessNotification('Категория добавлена!');
        } else {
            alert(data.error || "Ошибка при сохранении категории");
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert("Произошла ошибка при отправке формы");
    }
}



// -----------------------------
// МОДАЛКА МЕНЮ / ПАНЕЛЬ УПРАВЛЕНИЯ
// -----------------------------
function initMenuModal() {
    const modal = document.getElementById('menuModal');
    const openBtn = document.getElementById('menuBtn');
    const closeBtn = modal ? modal.querySelector('button[onclick="toggleMenuModal()"]') : null;

    if (!modal) {
        console.warn('menuModal не найден');
        return;
    }

    window.toggleMenuModal = function(show) {
        if (!modal) return;

        const isVisible = !modal.classList.contains('hidden');
        if (show === true || (!isVisible && show !== false)) {
            // ОБНОВЛЯЕМ ЗНАЧЕНИЯ ПОЛЕЙ ПЕРЕД ОТКРЫТИЕМ
            const reserveInput = document.getElementById('reservePercentageInput');
            const targetReserveInput = document.getElementById('targetReserveInput');
            
            if (reserveInput) {
                reserveInput.value = window.initialReservePercentage || 0;
            }
            
            if (targetReserveInput) {
                targetReserveInput.value = window.initialTargetReserve || 0;
            }
            
            animateModal(modal, true);
            
            setTimeout(() => {
                initCurrencyHandlers();
                initReserveHandlers();
            }, 100);
        } else {
            animateModal(modal, false);
        }
    };



    // Открытие панели (по кнопке ⚙️)
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            toggleMenuModal(true);
        });
    }

    // Кнопка "Закрыть"
    if (closeBtn) {
        closeBtn.addEventListener('click', () => toggleMenuModal(false));
    }

    // Закрытие по клику вне окна
    modal.addEventListener('click', e => {
        if (e.target === modal) toggleMenuModal(false);
    });

    // ... остальной существующий код ...

    // ИНИЦИАЛИЗИРУЕМ ОБРАБОТЧИКИ ВАЛЮТЫ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
setTimeout(() => {
    initCurrencyHandlers();
    initReserveHandlers();
   
}, 100);
}

// -----------------------------
// Уведомления (успех / ошибка)
// -----------------------------
function showErrorNotification(message) {
    const notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        console.error('Контейнер для уведомлений не найден');
        return;
    }
    
    // Очищаем предыдущие уведомления
    notificationContainer.innerHTML = '';
    
    // Создаем уведомление с иконкой ошибки
    const notification = document.createElement('div');
    notification.className = 'notification-inline flex items-center px-3 py-1.5 rounded-lg text-sm bg-gray-800/80 backdrop-blur-sm border border-red-600/50';
    notification.innerHTML = `
        <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
        <span class="text-red-400">${message}</span>
    `;
    
    // Добавляем в контейнер
    notificationContainer.appendChild(notification);
    
    // Автоматически удаляем через 3 секунды
    setTimeout(() => {
        if (notification.parentNode === notificationContainer) {
            notification.classList.add('animate-fade-out');
            setTimeout(() => {
                if (notification.parentNode === notificationContainer) {
                    notificationContainer.removeChild(notification);
                }
            }, 300);
        }
    }, 2000);
}


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

// Вызов инициализации при загрузке
setTimeout(() => {
    initCurrencyOnLoad();
}, 100);


// -----------------------------
// Обработчики для сохранения резерва и целевого резерва
// -----------------------------
function initReserveHandlers() {
    // Обработчик для сохранения процента резерва
    const saveReserveBtn = document.getElementById('saveReserveBtn');
    if (saveReserveBtn) {
        // Удаляем существующие обработчики чтобы избежать дублирования
        saveReserveBtn.replaceWith(saveReserveBtn.cloneNode(true));
        const newSaveReserveBtn = document.getElementById('saveReserveBtn');
        
        newSaveReserveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            saveReservePercentage();
        });
    }

    // Обработчик для сохранения целевого резерва
    const saveTargetReserveBtn = document.getElementById('saveTargetReserveBtn');
    if (saveTargetReserveBtn) {
        // Удаляем существующие обработчики чтобы избежать дублирования
        saveTargetReserveBtn.replaceWith(saveTargetReserveBtn.cloneNode(true));
        const newSaveTargetReserveBtn = document.getElementById('saveTargetReserveBtn');
        
        newSaveTargetReserveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            saveTargetReserve();
        });
    }
}


// Функция сохранения процента резерва
async function saveReservePercentage() {
    const input = document.getElementById('reservePercentageInput');
    const button = document.getElementById('saveReserveBtn');
    
    if (!input || !button) {
        console.error('Элементы резерва не найдены');
        return;
    }
    
    const percentage = parseInt(input.value);
    
    // Валидация
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        showErrorNotification('Введите процент от 0 до 100');
        return;
    }

    // Сохраняем оригинальное состояние кнопки
    const originalHTML = button.innerHTML;
    const originalClasses = button.className;

    // Показываем состояние загрузки
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Сохранение...';
    button.className = originalClasses.replace('bg-blue-600', 'bg-blue-400') + ' cursor-not-allowed';
    button.disabled = true;

    try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const formData = new FormData();
        formData.append('reserve_percentage', percentage);

        const response = await fetch('/update_reserve_percentage/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Обновляем глобальные переменные
            window.initialReservePercentage = percentage;
            
            // Обновляем отображение резерва
            updateReserveDisplay();
            updateSavingsDisplay();
            
            // Показываем успешное состояние
            button.innerHTML = '<i class="fas fa-check mr-2"></i>Сохранено!';
            button.className = originalClasses.replace('bg-blue-600', 'bg-green-500') + ' cursor-not-allowed';
            
            // Показываем успешное уведомление
            showSuccessNotification('Процент резерва обновлен!');
            
            // Возвращаем исходное состояние через 2 секунды
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.className = originalClasses;
                button.disabled = false;
            }, 2000);
            
        } else {
            showErrorNotification(data.error || 'Ошибка при сохранении');
            // Восстанавливаем кнопку при ошибке
            button.innerHTML = originalHTML;
            button.className = originalClasses;
            button.disabled = false;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showErrorNotification('Ошибка соединения');
        // Восстанавливаем кнопку при ошибке
        button.innerHTML = originalHTML;
        button.className = originalClasses;
        button.disabled = false;
    }
}


// Функция сохранения целевого резерва
async function saveTargetReserve() {
    console.log('=== Сохраняю целевой резерв ===');

    const input = document.getElementById('targetReserveInput');
    const button = document.getElementById('saveTargetReserveBtn');
    
    if (!input || !button) {
        console.error('Элементы целевого резерва не найдены');
        return;
    }
    
    const target = parseFloat(input.value);
    if (isNaN(target) || target < 0) {
        showErrorNotification('Введите положительное значение цели');
        return;
    }

    // Сохраняем оригинальное состояние кнопки
    const originalHTML = button.innerHTML;
    const originalClasses = button.className;

    // Показываем состояние загрузки
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Сохранение...';
    button.className = originalClasses.replace('bg-blue-600', 'bg-blue-400') + ' cursor-not-allowed';
    button.disabled = true;

    try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const formData = new FormData();
        formData.append('target_reserve', target);

        console.log('Отправляю на сервер:', formData.get('target_reserve'));

        const response = await fetch('/update_target_reserve/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        console.log('Ответ сервера:', response.status);
        const data = await response.json();
        console.log('Ответ JSON:', data);

        if (data.success) {
            // Обновляем глобальные данные и UI
            window.initialTargetReserve = target;
            showSuccessNotification('Целевой резерв сохранён!');

            document.getElementById('currentTargetReserve').textContent = formatAmount(target);
            updateSavingsDisplay();

            // Кнопка — зелёная и с галочкой
            button.innerHTML = '<i class="fas fa-check mr-2"></i>Сохранено!';
            button.className = originalClasses.replace('bg-blue-600', 'bg-green-500') + ' cursor-not-allowed';

            // Возврат к исходному состоянию через 2 секунды
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.className = originalClasses;
                button.disabled = false;
            }, 2000);
        } else {
            showErrorNotification(data.error || 'Ошибка при сохранении');
            button.innerHTML = originalHTML;
            button.className = originalClasses;
            button.disabled = false;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showErrorNotification('Ошибка соединения');
        button.innerHTML = originalHTML;
        button.className = originalClasses;
        button.disabled = false;
    }
}


// Функция для обновления уведомления о резерве
function updateReserveNotification() {
    const reserveNotification = document.getElementById('reserveNotification');
    if (!reserveNotification) return;
    
    const reservePercentage = window.initialReservePercentage || 0;
    
    if (reservePercentage === 0) {
        reserveNotification.classList.remove('hidden');
    } else {
        reserveNotification.classList.add('hidden');
    }
}



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
        
        // Форматируем все элементы резерва при загрузке страницы
        formatAllReserveElements();
        
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
        initMenuModal();
        initTransactionDetailModal();
        initCategoryFilter();
        initReminderPicker();
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