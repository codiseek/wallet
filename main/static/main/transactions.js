// -----------------------------
// Инициализация модалки транзакции, клавиатуры и формы
// -----------------------------
function initTransactionModal() {
    const modal = document.getElementById("transactionModal");
    const openBtn = document.getElementById("openTransactionModalBtn");
    const closeBtn = document.getElementById("closeTransactionModalBtn");
    const closeHeaderBtn = document.getElementById("closeTransactionModalHeaderBtn"); // ДОБАВЬТЕ ЭТУ СТРОКУ

    if (openBtn && modal) {
        openBtn.addEventListener('click', async function() {
            animateModal(modal, true);
            resetTransactionForm();
            await updateGlobalCategories();
            // если есть функция loadCategories, вызовем её
            if (typeof loadCategoriesForModal === 'function') loadCategoriesForModal();
        });
    }
    
    // Обработчик для кнопки закрытия внизу
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => animateModal(modal, false));
    }

    // Обработчик для кнопки закрытия в шапке
    if (closeHeaderBtn && modal) {
        closeHeaderBtn.addEventListener('click', () => animateModal(modal, false));
    }

    // По клику вне модалки
    if (modal) {
        modal.addEventListener('click', e => { 
            if (e.target === modal) animateModal(modal, false); 
        });
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
    
    // Используем transactionDate и transactionTime из второй версии
    const transactionDate = transactionElement.dataset.transactionDate;
    const transactionTime = transactionElement.dataset.transactionTime;
    
    // Сохраняем данные транзакции для возможного обновления (из первой версии)
    currentTransactionDetailData = {
        transactionId,
        categoryName,
        categoryIcon,
        categoryColor,
        transactionType,
        amount,
        reserveAmount,
        description,
        transactionDate, // используем transactionDate вместо createdDate
        transactionTime  // используем transactionTime вместо createdTime
    };
    
    // Обновляем модалку с текущими данными (из первой версии)
    updateTransactionDetailModal();
    
    // УБЕДИТЕСЬ, ЧТО ПЕРЕД ОТКРЫТИЕМ ПОЛНОСТЬЮ СБРАСЫВАЕМ ВСЕ СОСТОЯНИЯ (из первой версии)
    resetDeleteConfirmation();
    
    // Сохраняем transactionId в модалке для использования при удалении (из первой версии)
    modal.dataset.currentTransactionId = transactionId;

    // Получаем текущий символ валюты - ПОЛНАЯ ВЕРСИЯ С ТЕНГЕ (из второй версии)
    const currentCurrency = window.currentCurrency || 'c';
    let currencySymbol = 'с';
    switch(currentCurrency) {
        case 'c': currencySymbol = 'с'; break;
        case 'r': currencySymbol = '₽'; break;
        case '$': currencySymbol = '$'; break;
        case '€': currencySymbol = '€'; break;
        case '₸': currencySymbol = '₸'; break;
    }
    
    const isIncome = transactionType === 'income';

    // ОБНОВЛЯЕМ СУММУ - ПРАВИЛЬНЫЙ ПОДХОД (из второй версии)
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
    
    // ID транзакции под суммой (из второй версии)
    const detailTransactionId = document.getElementById('detailTransactionId');
    if (detailTransactionId) {
        detailTransactionId.textContent = `ID ${transactionId || '-'}`;
    }
    
    // Резерв под основной суммой (только для доходов) (из второй версии)
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
    
    // Категория и тип - ИСПРАВЛЕНО: используем getIconHTML для SVG иконок (из второй версии)
    const categoryIconEl = document.getElementById('detailCategoryIcon');
    if (categoryIconEl) {
        // ИСПОЛЬЗУЕМ ГЛОБАЛЬНУЮ ФУНКЦИЮ getIconHTML для правильного отображения SVG
        const iconHTML = window.getIconHTML ? window.getIconHTML(categoryIcon, categoryColor) : `<i class="${categoryIcon} text-lg"></i>`;
        categoryIconEl.innerHTML = iconHTML;
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
    
    // Описание (из второй версии)
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
    
    // Дата и время (из второй версии)
    const detailTimestamp = document.getElementById('detailTimestamp');
    if (detailTimestamp) {
        detailTimestamp.textContent = `${transactionDate} ${transactionTime}`;
    }

    // Показываем модалку с анимацией
    animateModal(modal, true);
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
        transactionDate, 
        transactionTime  
    } = currentTransactionDetailData;
    
    // Получаем текущий символ валюты
    const currentCurrency = window.currentCurrency || 'c';
    let currencySymbol = 'с';
    switch(currentCurrency) {
        case 'c': currencySymbol = 'с'; break;
        case 'r': currencySymbol = '₽'; break;
        case '$': currencySymbol = '$'; break;
        case '€': currencySymbol = '€'; break;
        case '₸': currencySymbol = '₸'; break;
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
    
    // Дата и время - УДАЛЕН ДУБЛИРУЮЩИЙСЯ КОД
    const detailTimestamp = document.getElementById('detailTimestamp');
    if (detailTimestamp) {
        detailTimestamp.textContent = `${transactionDate} ${transactionTime}`;
    }
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
                // Просто передаем транзакции в функцию отображения
                // Вся обработка даты и времени теперь происходит в window.addTransactionToList
                data.transactions.forEach(tx => {
                    window.addTransactionToList(tx, false, true);
                });
                
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


// Вспомогательные функции для форматирования даты и времени (если их еще нет)
function formatDate(dateString) {
    if (!dateString) return 'Неизвестно';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (e) {
        console.error('Error formatting date:', e);
        return 'Неизвестно';
    }
}

function formatTime(dateString) {
    if (!dateString) return 'Неизвестно';
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Error formatting time:', e);
        return 'Неизвестно';
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

    // Обработчики для опций фильтра
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
// Управление подсказкой "Сделай первую транзакцию"
// -----------------------------
function updateWelcomeHint() {
    const welcomeHint = document.getElementById('welcomeHint');
    
    if (!welcomeHint) return;
    
    // Просто скрываем через 4 секунды независимо от условий
    setTimeout(() => {
        console.log('Force hiding welcome hint after 4 seconds');
        welcomeHint.style.display = 'none';
        welcomeHint.style.opacity = '0';
        welcomeHint.style.visibility = 'hidden';
        welcomeHint.classList.add('hidden');
    }, 4000);
}

