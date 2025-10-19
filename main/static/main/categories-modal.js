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

    // Показываем состояние загрузки для транзакций
    if (transactionsList) {
        transactionsList.innerHTML = `
            <div class="text-center py-4">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                <p class="text-gray-400 text-sm mt-2">Загрузка...</p>
            </div>
        `;
    }
    
    if (noTransactions) {
        noTransactions.classList.add('hidden');
    }
    
    // Сбрасываем статистику при загрузке
    const totalExpenseEl = document.getElementById('categoryTotalExpense');
    const expensePercentageEl = document.getElementById('categoryExpensePercentage');
    const progressBar = document.getElementById('categoryProgressBar');
    const progressText = document.getElementById('categoryProgressText');
    
    if (totalExpenseEl) {
        totalExpenseEl.textContent = '0 с';
    }
    if (expensePercentageEl) {
        expensePercentageEl.textContent = '0%';
    }
    if (progressBar) {
        progressBar.style.width = '0%';
    }
    if (progressText) {
        progressText.textContent = '0%';
    }
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

// Показать данные категории
function showCategoryData(data) {
    // Безопасное извлечение данных с преобразованием типов
    const total_expense = parseFloat(data.total_expense) || 0;
    const expense_percentage = parseFloat(data.expense_percentage) || 0;
    const transactions = data.transactions || [];
    const has_transactions = Boolean(data.has_transactions);
    const category = data.category || {};

    // Используем функцию formatAmount из app.js
    const formatAmount = window.formatAmount || function(amount) {
        const number = typeof amount === 'string' ? 
            parseFloat(amount.replace(/\s/g, '').replace(',', '.')) : 
            amount || 0;
        const rounded = Math.round(number);
        return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    // Получаем общие доходы за месяц
    const monthlyIncome = parseFloat(window.initialBalances?.income) || 50250;

    // Расчет процента как на главной странице: (расходы_категории / общие_доходы) * 100
    const calculatedPercentage = monthlyIncome > 0 ? (total_expense / monthlyIncome) * 100 : 0;

    // Используем пересчитанный процент
    const finalPercentage = calculatedPercentage;

    // ОБНОВЛЯЕМ ИКОНКУ И НАЗВАНИЕ КАТЕГОРИИ ИЗ ДАННЫХ СЕРВЕРА
    if (category.name || category.icon || category.color) {
        updateCategoryDisplay(category.name, category.icon, category.color);
    }

    // Обновляем статистику - ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЙ ПРОЦЕНТ
    const totalExpenseEl = document.getElementById('categoryTotalExpense');
    const expensePercentageEl = document.getElementById('categoryExpensePercentage');
    
    if (totalExpenseEl) {
        const formattedAmount = formatAmount(total_expense) + ' с';
        totalExpenseEl.textContent = formattedAmount;
    }
    
    if (expensePercentageEl) {
        const percentageText = finalPercentage.toFixed(1) + '%';
        expensePercentageEl.textContent = percentageText;
    }

    // Обновляем прогресс-бар - ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЙ ПРОЦЕНТ
    const progressPercentage = Math.min(100, finalPercentage);
    const progressBar = document.getElementById('categoryProgressBar');
    const progressText = document.getElementById('categoryProgressText');
    
    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
    }
    
    if (progressText) {
        const progressTextValue = `${progressPercentage.toFixed(1)}%`;
        progressText.textContent = progressTextValue;
    }

    // Обновляем список транзакций (операции за день)
    updateTransactionsList(transactions, has_transactions, formatAmount);

    // Показываем/скрываем кнопку удаления
    const deleteBtn = document.getElementById('deleteCategoryDetailBtn');
    if (deleteBtn) {
        if (has_transactions) {
            deleteBtn.classList.add('hidden');
        } else {
            deleteBtn.classList.remove('hidden');
        }
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

    // ИЗМЕНИТЕ ЗАГОЛОВОК чтобы не вводить в заблуждение
    const sectionTitle = transactionsList.previousElementSibling;
    if (sectionTitle && sectionTitle.tagName === 'H3') {
        sectionTitle.textContent = `Последние операции (${transactions.length})`;
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
    const totalExpenseEl = document.getElementById('categoryTotalExpense');
    const expensePercentageEl = document.getElementById('categoryExpensePercentage');
    const progressBar = document.getElementById('categoryProgressBar');
    const progressText = document.getElementById('categoryProgressText');
    
    if (totalExpenseEl) totalExpenseEl.textContent = '0 с';
    if (expensePercentageEl) expensePercentageEl.textContent = '0%';
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0%';
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