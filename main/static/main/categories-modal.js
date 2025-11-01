// Глобальные переменные для фильтра категории
let currentCategoryFilter = 'month'; // По умолчанию месяц
let currentCategoryId = null;

// Инициализация фильтра категории
function initCategoryFilter() {
    const filterToggle = document.getElementById('categoryFilterToggleBtn');
    const filterDropdown = document.getElementById('categoryFilterDropdown');
    const filterOptions = document.querySelectorAll('.category-filter-option');

    if (filterToggle && filterDropdown) {
        // Удаляем старые обработчики и добавляем новые
        filterToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            filterDropdown.classList.toggle('hidden');
        });

        // Закрываем при клике вне
        document.addEventListener('click', function(e) {
            if (!filterDropdown.contains(e.target) && !filterToggle.contains(e.target)) {
                filterDropdown.classList.add('hidden');
            }
        });
    }

    // Обработчики для опций фильтра
    filterOptions.forEach(option => {
        option.addEventListener('click', function() {
            const filter = this.dataset.filter;
            currentCategoryFilter = filter || 'month';
            
            // Обновляем текст кнопки
            const currentText = document.getElementById('categoryCurrentFilterText');
            if (currentText) {
                currentText.textContent = this.textContent.trim();
            }
            
            // Закрываем dropdown
            filterDropdown.classList.add('hidden');
            
            // Перезагружаем данные категории с новым фильтром
            if (currentCategoryId) {
                reloadCategoryData(currentCategoryId, currentCategoryFilter);
            }
        });
    });
}

// Перезагрузка данных категории с фильтром

async function reloadCategoryData(categoryId, filter) {
    try {
        // Показываем состояние загрузки
        showCategoryLoadingState();
        
        // Загружаем данные с сервера с фильтром
        const response = await fetch(`/get_category_stats/${categoryId}/?period=${filter}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success) {
            showCategoryData(data);
        } else {
            showCategoryErrorState('Ошибка загрузки данных: ' + (data.error || 'неизвестная ошибка'));
        }
    } catch (error) {
        showCategoryErrorState('Ошибка соединения с сервером');
    }
}



// Инициализация модалки категории
function initCategoryDetailModal() {
    const modal = document.getElementById("categoryDetailModal");
    if (!modal) {
        return;
    }

    // Закрытие по клику вне модалки
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeCategoryDetailModal();
        }
    });

    // Делегирование событий для кнопок внутри модалки
    modal.addEventListener('click', function(e) {
        // Кнопка "Удалить категорию" - ПЕРВОЕ НАЖАТИЕ
        if (e.target.closest('#deleteCategoryDetailBtn')) {
            e.preventDefault();
            e.stopPropagation();
            showCategoryDeleteConfirmation();
            return;
        }
        
        // Кнопка "Отмена" при подтверждении удаления
        if (e.target.closest('#cancelCategoryDeleteBtn')) {
            e.preventDefault();
            e.stopPropagation();
            resetCategoryDeleteConfirmation();
            return;
        }
        
        // Кнопка "Да, удалить" - ВТОРОЕ НАЖАТИЕ
        if (e.target.closest('#confirmCategoryDeleteBtn')) {
            e.preventDefault();
            e.stopPropagation();
            deleteCategoryFromModal();
            return;
        }
        
        // Кнопка закрытия модалки
        if (e.target.closest('#closeCategoryDetailModal')) {
            e.preventDefault();
            e.stopPropagation();
            closeCategoryDetailModal();
            return;
        }
    });
}

// Функция для показа подтверждения удаления категории
function showCategoryDeleteConfirmation() {
    const normalButtons = document.getElementById('categoryNormalButtons');
    const confirmDeleteSection = document.getElementById('categoryConfirmDeleteSection');
    
    if (normalButtons) {
        normalButtons.classList.add('hidden');
        normalButtons.style.display = 'none';
    }
    
    if (confirmDeleteSection) {
        // Убеждаемся, что у нас правильный HTML
        confirmDeleteSection.innerHTML = `
            <div class="text-center mb-3">
                <p class="text-red-400 font-semibold">Удалить категорию?</p>
                <p class="text-gray-400 text-sm">Это действие нельзя отменить</p>
            </div>
            <div class="flex space-x-3">
                <button id="cancelCategoryDeleteBtn" class="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors">
                    Отмена
                </button>
                <button id="confirmCategoryDeleteBtn" class="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">
                    Да, удалить!
                </button>
            </div>
        `;
        confirmDeleteSection.classList.remove('hidden');
        confirmDeleteSection.style.display = 'block';
        confirmDeleteSection.classList.add('animate-fadeIn');
    }
}




// Функция для ПОЛНОГО сброса состояния подтверждения удаления категории
function resetCategoryDeleteConfirmation() {
    const normalButtons = document.getElementById('categoryNormalButtons');
    const confirmDeleteSection = document.getElementById('categoryConfirmDeleteSection');
    
    if (normalButtons) {
        normalButtons.classList.remove('hidden');
        normalButtons.style.display = 'flex';
    }
    
    if (confirmDeleteSection) {
        // ПОЛНОСТЬЮ восстанавливаем оригинальный HTML
        confirmDeleteSection.innerHTML = `
            <div class="text-center mb-3">
                <p class="text-red-400 font-semibold">Удалить категорию?</p>
                <p class="text-gray-400 text-sm">Это действие нельзя отменить</p>
            </div>
            <div class="flex space-x-3">
                <button id="cancelCategoryDeleteBtn" class="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors">
                    Отмена
                </button>
                <button id="confirmCategoryDeleteBtn" class="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">
                    Да, удалить!
                </button>
            </div>
        `;
        confirmDeleteSection.classList.add('hidden');
        confirmDeleteSection.style.display = 'none';
        confirmDeleteSection.classList.remove('animate-fadeIn');
    }
}




// Функция открытия модалки категории
// Функция открытия модалки категории
async function openCategoryDetail(categoryElement) {
    const modal = document.getElementById("categoryDetailModal");
    if (!modal) {
        return;
    }

    // Получаем данные из data-атрибутов
    const categoryId = categoryElement.dataset.categoryId;
    const categoryName = categoryElement.dataset.categoryName;
    const categoryIcon = categoryElement.dataset.categoryIcon;
    const categoryColor = categoryElement.dataset.categoryColor;
    
    // ПОЛНЫЙ сброс перед установкой новых значений
    currentCategoryId = null;
    
    // ПОЛНОСТЬЮ сбрасываем состояние подтверждения удаления
    resetCategoryDeleteConfirmation();
    
    // Устанавливаем новую категорию
    currentCategoryId = categoryId;

    // СРАЗУ ОБНОВЛЯЕМ ОТОБРАЖЕНИЕ КАТЕГОРИИ (название и иконку)
    updateCategoryDisplay(categoryName, categoryIcon, categoryColor);

    try {
        // Показываем загрузку с правильными данными категории
        showCategoryLoadingState(categoryName, categoryIcon, categoryColor);

        // Загружаем данные категории с сервера
        const response = await fetch(`/get_category_stats/${categoryId}/`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.success) {
            showCategoryData(data);
        } else {
            showCategoryErrorState('Ошибка загрузки данных: ' + (data.error || 'неизвестная ошибка'));
        }
    } catch (error) {
        showCategoryErrorState('Ошибка соединения с сервером');
    }

    // Показываем модалку с анимацией
    animateModal(modal, true);
}






// Показать состояние загрузки
// Показать состояние загрузки
function showCategoryLoadingState(name, icon, color) {
    // Используем новую функцию для установки отображения категории
    updateCategoryDisplay(name, icon, color);
    
    const categoryTypeEl = document.getElementById('categoryDetailType');

    if (categoryTypeEl) {
        categoryTypeEl.textContent = 'Категория расходов';
    }

    // Сбрасываем статистику при загрузке
    resetCategoryStats();
}

// Функция для обновления отображения категории
// Функция для обновления отображения категории
function updateCategoryDisplay(name, icon, color) {
    const categoryNameEl = document.getElementById('categoryDetailName');
    const categoryIconEl = document.getElementById('categoryDetailIcon');

    if (categoryNameEl && name) {
        categoryNameEl.textContent = name;
        categoryNameEl.className = 'font-semibold text-lg text-gray-200';
    }

    if (categoryIconEl && icon) {
        categoryIconEl.innerHTML = '';
        categoryIconEl.className = 'w-12 h-12 rounded-xl flex items-center justify-center text-2xl';
        
        // ИСПОЛЬЗУЕМ getIconHTML для правильного отображения SVG
        const iconHTML = getIconHTML(icon, color);
        categoryIconEl.innerHTML = iconHTML;
        
        if (color) {
            categoryIconEl.style.backgroundColor = color + '20';
            categoryIconEl.style.color = color;
        } else {
            categoryIconEl.style.backgroundColor = '#3b82f620';
            categoryIconEl.style.color = '#3b82f6';
        }
    }
}

// Сбросить статистику
function resetCategoryStats() {
    const statsElements = {
        'categoryTotalExpense': '0 с',
        'categoryAverageAmount': '0 с',
        'categoryTransactionsCount': '0',
        'categoryExpensePercentage': '0%'
    };

    Object.keys(statsElements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = statsElements[id];
        }
    });
}



// Показать данные категории
function showCategoryData(data) {
    // Получаем текущий символ валюты
    const currentCurrency = window.currentCurrency || 'c';
    let currencySymbol = 'с';
    switch(currentCurrency) {
        case 'c': currencySymbol = 'с'; break;
        case 'r': currencySymbol = '₽'; break;
        case '$': currencySymbol = '$'; break;
        case '€': currencySymbol = '€'; break;
        case '₸': currencySymbol = '₸'; break;
        case '₴': currencySymbol = '₴'; break;
    }
    
    // Используем функцию formatAmount из app.js
    const formatAmount = window.formatAmount || function(amount) {
        const number = typeof amount === 'string' ? 
            parseFloat(amount.replace(/\s/g, '').replace(',', '.')) : 
            amount || 0;
        const rounded = Math.round(number);
        return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    // ОБНОВЛЯЕМ ИКОНКУ И НАЗВАНИЕ КАТЕГОРИИ ИЗ ДАННЫХ СЕРВЕРА
    if (data.category) {
        updateCategoryDisplay(data.category.name, data.category.icon, data.category.color);
    }

    // НЕПОСРЕДСТВЕННО ОБНОВЛЯЕМ ВСЕ ЭЛЕМЕНТЫ С УЧЕТОМ ВАЛЮТЫ
    updateCategoryElementsDirectly(data, formatAmount, currencySymbol);

    // Показываем/скрываем кнопку удаления
    const deleteBtn = document.getElementById('deleteCategoryDetailBtn');
    if (deleteBtn) {
        if (data.has_transactions) {
            deleteBtn.classList.add('hidden');
        } else {
            deleteBtn.classList.remove('hidden');
        }
    }
}



// Прямое обновление элементов с правильной валютой
function updateCategoryElementsDirectly(data, formatAmount) {
    // Получаем текущий символ валюты
    const currentCurrency = window.currentCurrency || 'c';
    let currencySymbol = 'с';
    switch(currentCurrency) {
        case 'c': currencySymbol = 'с'; break;
        case 'r': currencySymbol = '₽'; break;
        case '$': currencySymbol = '$'; break;
        case '€': currencySymbol = '€'; break;
        case '₸': currencySymbol = '₸'; break;
        case '₴': currencySymbol = '₴'; break;
    }
    
    // Обновляем символы валюты в модалке
    const currencySymbols = document.querySelectorAll('.category-currency-symbol');
    currencySymbols.forEach(symbol => {
        symbol.textContent = currencySymbol;
    });

    // Всего потрачено
    const totalExpenseEl = document.getElementById('categoryTotalExpense');
    if (totalExpenseEl) {
        const total = parseFloat(data.total_expense) || 0;
        // Убедимся, что обновляем только числовое значение, символ валюты уже обновлен выше
        const amountSpan = totalExpenseEl.querySelector('.amount-value') || document.createElement('span');
        if (!totalExpenseEl.querySelector('.amount-value')) {
            amountSpan.className = 'amount-value';
            totalExpenseEl.innerHTML = '';
            totalExpenseEl.appendChild(amountSpan);
            const symbolSpan = document.createElement('span');
            symbolSpan.className = 'category-currency-symbol';
            symbolSpan.textContent = ' ' + currencySymbol;
            totalExpenseEl.appendChild(symbolSpan);
        }
        amountSpan.textContent = formatAmount(total);
    }

    // Средний чек
    const averageAmountEl = document.getElementById('categoryAverageAmount');
    if (averageAmountEl) {
        const average = parseFloat(data.average_amount) || 0;
        const amountSpan = averageAmountEl.querySelector('.amount-value') || document.createElement('span');
        if (!averageAmountEl.querySelector('.amount-value')) {
            amountSpan.className = 'amount-value';
            averageAmountEl.innerHTML = '';
            averageAmountEl.appendChild(amountSpan);
            const symbolSpan = document.createElement('span');
            symbolSpan.className = 'category-currency-symbol';
            symbolSpan.textContent = ' ' + currencySymbol;
            averageAmountEl.appendChild(symbolSpan);
        }
        amountSpan.textContent = formatAmount(average);
    }

    // Количество операций
    const transactionsCountEl = document.getElementById('categoryTransactionsCount');
    if (transactionsCountEl) {
        const count = parseInt(data.transactions_count) || 0;
        transactionsCountEl.textContent = count.toString();
    }

    // Доля расходов
    const expensePercentageEl = document.getElementById('categoryExpensePercentage');
    if (expensePercentageEl) {
        const percentage = parseFloat(data.income_percentage) || 0;
        expensePercentageEl.textContent = percentage.toFixed(1) + '%';
        
        // Меняем цвет в зависимости от процента
        if (percentage > 50) {
            expensePercentageEl.className = 'text-xl font-bold text-red-400';
        } else if (percentage > 30) {
            expensePercentageEl.className = 'text-xl font-bold text-yellow-400';
        } else {
            expensePercentageEl.className = 'text-xl font-bold text-green-400';
        }
    }
}



// Функция для обновления символов валюты в модалке категорий
function updateCategoryModalCurrency() {
    const currentCurrency = window.currentCurrency || 'c';
    let currencySymbol = 'с';
    switch(currentCurrency) {
        case 'c': currencySymbol = 'с'; break;
        case 'r': currencySymbol = '₽'; break;
        case '$': currencySymbol = '$'; break;
        case '€': currencySymbol = '€'; break;
        case '₸': currencySymbol = '₸'; break;
        case '₴': currencySymbol = '₴'; break;
    }
    
    // Обновляем все символы валюты в модалке категорий
    const currencySymbols = document.querySelectorAll('.category-currency-symbol');
    currencySymbols.forEach(symbol => {
        symbol.textContent = currencySymbol;
    });
    
    // Также обновляем символы валюты в элементах, которые могут их содержать
    const elementsToUpdate = [
        'categoryTotalExpense',
        'categoryAverageAmount'
    ];
    
    elementsToUpdate.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const rawValue = element.getAttribute('data-raw-value');
            if (rawValue) {
                const formatAmount = window.formatAmount || function(amount) {
                    const number = typeof amount === 'string' ? 
                        parseFloat(amount.replace(/\s/g, '').replace(',', '.')) : 
                        amount || 0;
                    const rounded = Math.round(number);
                    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
                };
                
                // Обновляем текст с правильным символом валюты
                element.textContent = formatAmount(rawValue) + ' ' + currencySymbol;
            }
        }
    });
}


// Функция для обновления отображения категории (оставляем как есть)
// Функция для обновления отображения категории
function updateCategoryDisplay(name, icon, color) {
    const categoryNameEl = document.getElementById('categoryDetailName');
    const categoryIconEl = document.getElementById('categoryDetailIcon');

    if (categoryNameEl && name) {
        categoryNameEl.textContent = name;
        categoryNameEl.className = 'font-semibold text-lg text-gray-200';
    }

    if (categoryIconEl && icon) {
        categoryIconEl.innerHTML = '';
        categoryIconEl.className = 'w-12 h-12 rounded-xl flex items-center justify-center text-2xl';
        
        // ИСПОЛЬЗУЕМ ГЛОБАЛЬНУЮ ФУНКЦИЮ getIconHTML
        const iconHTML = window.getIconHTML(icon, color);
        categoryIconEl.innerHTML = iconHTML;
        
        if (color) {
            categoryIconEl.style.backgroundColor = color + '20';
            categoryIconEl.style.color = color;
        } else {
            categoryIconEl.style.backgroundColor = '#3b82f620';
            categoryIconEl.style.color = '#3b82f6';
        }
    }
}



// Обновить статистику категории
function updateCategoryStats(stats) {
    const {
        total_expense,
        transactions_count,
        average_amount,
        expense_percentage,
        formatAmount
    } = stats;

    // Общие расходы
    const totalExpenseEl = document.getElementById('categoryTotalExpense');
    if (totalExpenseEl) {
        totalExpenseEl.textContent = formatAmount(total_expense) + ' с';
    }

    // Средний чек
    const averageAmountEl = document.getElementById('categoryAverageAmount');
    if (averageAmountEl) {
        averageAmountEl.textContent = formatAmount(average_amount) + ' с';
    }

    // Количество операций
    const transactionsCountEl = document.getElementById('categoryTransactionsCount');
    if (transactionsCountEl) {
        transactionsCountEl.textContent = transactions_count.toString();
    }

    // Процент от расходов
    const expensePercentageEl = document.getElementById('categoryExpensePercentage');
    if (expensePercentageEl) {
        expensePercentageEl.textContent = expense_percentage.toFixed(1) + '%';
    }
}



function showCategoryErrorState(errorMessage = 'Ошибка загрузки данных') {
    const errorContainer = document.getElementById('categoryErrorMessage');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="text-center py-4 text-red-400">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>${errorMessage}</p>
            </div>
        `;
    }
    resetCategoryStats();
}


// Функция для удаления категории из модалки
async function deleteCategoryFromModal() {
    if (!currentCategoryId) {
        alert('Ошибка: ID категории не найден');
        resetCategoryDeleteConfirmation();
        return;
    }
    
    try {
        const confirmBtn = document.getElementById('confirmCategoryDeleteBtn');
        if (confirmBtn) {
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Удаление...';
            confirmBtn.disabled = true;
        }
        
        const response = await fetch(`/delete_category/${currentCategoryId}/`);
        const data = await response.json();

        if (data.success) {
            // Показываем успешное сообщение
            const confirmDeleteSection = document.getElementById('categoryConfirmDeleteSection');
            if (confirmDeleteSection) {
                confirmDeleteSection.innerHTML = `
                    <div class="text-center py-4 animate-popIn">
                        <div class="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                            <i class="fas fa-check text-green-400 text-xl"></i>
                        </div>
                        <p class="text-green-400 font-semibold">Категория удалена!</p>
                    </div>
                `;
            }
            
            // Закрываем модалку через 1 секунду
            setTimeout(() => {
                closeCategoryDetailModal();
                // Обновляем список категорий
                if (typeof loadUserCategories === 'function') {
                    loadUserCategories();
                }
                // Обновляем вкладки категорий
                if (typeof updateCategoryTabs === 'function') {
                    updateCategoryTabs();
                }
            }, 1000);
            
        } else {
            alert(data.error || 'Ошибка при удалении категории');
            resetCategoryDeleteConfirmation();
        }
    } catch (error) {
        alert('Произошла ошибка при удалении: ' + error.message);
        resetCategoryDeleteConfirmation();
    }
}

// Функция закрытия модалки категории
function closeCategoryDetailModal() {
    const modal = document.getElementById("categoryDetailModal");
    if (modal) {
        // ПОЛНЫЙ сброс всех состояний
        resetCategoryDeleteConfirmation();
        
        // Сбрасываем все глобальные переменные
        currentCategoryId = null;
        currentCategoryFilter = 'month';
        
        // Сбрасываем текст фильтра
        const currentFilterText = document.getElementById('categoryCurrentFilterText');
        if (currentFilterText) {
            currentFilterText.textContent = 'За месяц';
        }
        
        // Закрываем модалку
        animateModal(modal, false);
        
        // Дополнительный сброс через небольшой таймаут для гарантии
        setTimeout(() => {
            // Убеждаемся, что все скрыто правильно
            const confirmDeleteSection = document.getElementById('categoryConfirmDeleteSection');
            if (confirmDeleteSection) {
                confirmDeleteSection.classList.add('hidden');
                confirmDeleteSection.style.display = 'none';
            }
            
            const normalButtons = document.getElementById('categoryNormalButtons');
            if (normalButtons) {
                normalButtons.classList.remove('hidden');
                normalButtons.style.display = 'flex';
            }
        }, 50);
    }
}


// Делаем функции глобально доступными
window.openCategoryDetail = openCategoryDetail;
window.initCategoryDetailModal = initCategoryDetailModal;
window.closeCategoryDetailModal = closeCategoryDetailModal;