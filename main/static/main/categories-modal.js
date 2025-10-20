// categories-modal.js
// Функции для работы с модалкой категорий

let currentCategoryId = null;

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
    
    if (normalButtons) normalButtons.classList.add('hidden');
    if (confirmDeleteSection) {
        confirmDeleteSection.classList.remove('hidden');
        confirmDeleteSection.classList.add('animate-fadeIn');
    }
}

// Функция для сброса состояния подтверждения удаления категории
function resetCategoryDeleteConfirmation() {
    const normalButtons = document.getElementById('categoryNormalButtons');
    const confirmDeleteSection = document.getElementById('categoryConfirmDeleteSection');
    
    if (normalButtons) normalButtons.classList.remove('hidden');
    if (confirmDeleteSection) {
        confirmDeleteSection.classList.add('hidden');
        confirmDeleteSection.classList.remove('animate-fadeIn');
    }
}

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
    
    currentCategoryId = categoryId;

    // Сбрасываем состояние подтверждения удаления
    resetCategoryDeleteConfirmation();
    
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
function showCategoryLoadingState(name, icon, color) {
    // Используем новую функцию для установки отображения категории
    updateCategoryDisplay(name, icon, color);
    
    const categoryTypeEl = document.getElementById('categoryDetailType');
    const transactionsList = document.getElementById('categoryTransactionsList');
    const noTransactions = document.getElementById('categoryNoTransactions');

    if (categoryTypeEl) {
        categoryTypeEl.textContent = 'Категория расходов';
    }

    // Сбрасываем статистику при загрузке
    resetCategoryStats();
}

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
        
        const iconElement = document.createElement('i');
        if (icon && icon.startsWith('fa-')) {
            iconElement.className = `fas ${icon}`;
        } else {
            iconElement.className = icon || 'fas fa-tag';
        }
        
        categoryIconEl.appendChild(iconElement);
        
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
    console.log('📊 RAW DATA FROM SERVER:', data);
    
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

    // НЕПОСРЕДСТВЕННО ОБНОВЛЯЕМ ВСЕ ЭЛЕМЕНТЫ ВРУЧНУЮ
    updateCategoryElementsDirectly(data, formatAmount);

    // Обновляем список транзакций (операции за день)
    updateTransactionsList(data.transactions || [], data.has_transactions, formatAmount);

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

// Прямое обновление элементов (обходной путь)
function updateCategoryElementsDirectly(data, formatAmount) {
    console.log('🔄 Directly updating elements...');
    
    // Всего потрачено
    const totalExpenseEl = document.getElementById('categoryTotalExpense');
    if (totalExpenseEl) {
        const total = parseFloat(data.total_expense) || 0;
        totalExpenseEl.textContent = formatAmount(total) + ' с';
        console.log('✅ Total expense:', totalExpenseEl.textContent);
    }

    // Средний чек
    const averageAmountEl = document.getElementById('categoryAverageAmount');
    if (averageAmountEl) {
        const average = parseFloat(data.average_amount) || 0;
        averageAmountEl.textContent = formatAmount(average) + ' с';
        console.log('✅ Average amount:', averageAmountEl.textContent);
    }

    // Количество операций
    const transactionsCountEl = document.getElementById('categoryTransactionsCount');
    if (transactionsCountEl) {
        const count = parseInt(data.transactions_count) || 0;
        transactionsCountEl.textContent = count.toString();
        console.log('✅ Transactions count:', transactionsCountEl.textContent);
    }

    // Доля расходов
    const expensePercentageEl = document.getElementById('categoryExpensePercentage');
    if (expensePercentageEl) {
        const percentage = parseFloat(data.income_percentage) || 0;
        expensePercentageEl.textContent = percentage.toFixed(1) + '%';
        console.log('✅ Expense percentage:', expensePercentageEl.textContent);
        
        // Меняем цвет в зависимости от процента
        if (percentage > 50) {
            expensePercentageEl.className = 'text-xl font-bold text-red-400';
        } else if (percentage > 30) {
            expensePercentageEl.className = 'text-xl font-bold text-yellow-400';
        } else {
            expensePercentageEl.className = 'text-xl font-bold text-green-400';
        }
    }

    console.log('🎯 Final check - Elements should be updated');
}

// Функция для обновления отображения категории (оставляем как есть)
function updateCategoryDisplay(name, icon, color) {
    const categoryNameEl = document.getElementById('categoryDetailName');
    const categoryIconEl = document.getElementById('categoryDetailIcon');

    if (categoryNameEl && name) {
        categoryNameEl.textContent = name;
    }

    if (categoryIconEl && icon) {
        categoryIconEl.innerHTML = '';
        const iconElement = document.createElement('i');
        iconElement.className = icon || 'fas fa-tag';
        categoryIconEl.appendChild(iconElement);
        
        if (color) {
            categoryIconEl.style.backgroundColor = color + '20';
            categoryIconEl.style.color = color;
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

// Обновить список транзакций
function updateTransactionsList(transactions, hasTransactions, formatAmount) {
    const transactionsList = document.getElementById('categoryTransactionsList');
    const noTransactions = document.getElementById('categoryNoTransactions');

    if (!transactionsList) {
        return;
    }

    // Очищаем список
    transactionsList.innerHTML = '';

    if (!hasTransactions || !transactions || transactions.length === 0) {
        if (noTransactions) {
            noTransactions.classList.remove('hidden');
        }
        return;
    }

    if (noTransactions) {
        noTransactions.classList.add('hidden');
    }

    let html = '';
    transactions.forEach((transaction) => {
        // Безопасное извлечение данных транзакции
        const amount = parseFloat(transaction.amount) || 0;
        const description = transaction.description || 'Без описания';
        let transactionDate;
        
        try {
            transactionDate = new Date(transaction.created_at);
        } catch (e) {
            transactionDate = new Date();
        }
        
        const formattedDate = transactionDate.toLocaleDateString('ru-RU');
        const formattedTime = transactionDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg border border-gray-600 mb-2">
                <div class="flex-1">
                    <p class="text-sm text-gray-200">${description}</p>
                    <p class="text-xs text-gray-400">${formattedDate} ${formattedTime}</p>
                </div>
                <div class="text-right">
                    <p class="text-red-400 font-semibold">-${formatAmount(amount)} с</p>
                </div>
            </div>
        `;
    });

    transactionsList.innerHTML = html;
}

// Показать состояние ошибки
function showCategoryErrorState(errorMessage = 'Ошибка загрузки данных') {
    const transactionsList = document.getElementById('categoryTransactionsList');
    const noTransactions = document.getElementById('categoryNoTransactions');
    
    if (transactionsList) {
        transactionsList.innerHTML = `
            <div class="text-center py-4 text-red-400">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>${errorMessage}</p>
            </div>
        `;
    }
    
    if (noTransactions) {
        noTransactions.classList.add('hidden');
    }
    
    // Сбрасываем статистику при ошибке
    resetCategoryStats();
}

// Удаление категории из модалки
async function deleteCategoryFromModal() {
    if (!currentCategoryId) {
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
        resetCategoryDeleteConfirmation();
        animateModal(modal, false);
        
        // Очищаем ID категории при закрытии
        setTimeout(() => {
            currentCategoryId = null;
        }, 300);
    }
}

// Делаем функции глобально доступными
window.openCategoryDetail = openCategoryDetail;
window.initCategoryDetailModal = initCategoryDetailModal;
window.closeCategoryDetailModal = closeCategoryDetailModal;