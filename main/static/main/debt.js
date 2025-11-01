// Добавьте в начало файла, после объявления класса
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



class DebtManager {
constructor() {
    this.currentFilter = 'active';
    this.isSaving = false;
    this.currencySymbol = this.getCurrencySymbol();
    this.moveModalToGlobal();
    this.init();
    this.initMenuEventListener();
    
    // Добавьте эту строку
    this.initCurrencyUpdates();
}

initCurrencyUpdates() {
    // Обновляем валюту при загрузке
    this.updateCurrency();
    
    // Слушаем глобальные события смены валюты
    document.addEventListener('currencyUpdated', () => {
        this.updateCurrency();
    });
}

refreshDebtsOnCurrencyChange() {
    if (this.currentFilter) {
        this.loadDebts(); // Просто перезагружаем долги - это перерисует все карточки с новой валютой
    }
}



    // Простой метод для получения символа валюты
   getCurrencySymbol() {
    const currency = window.currentCurrency || 'c';
    switch(currency) {
        case 'c': return 'с';
        case 'r': return '₽';
        case '$': return '$';
        case '€': return '€';
        case '₸': return '₸';
        default: return 'с';
    }
}

    // Обновляем валюту при вызове
updateCurrency() {
    this.currencySymbol = this.getCurrencySymbol();
    
    // Обновляем все элементы интерфейса долгов
    this.updateStatisticsCurrency();
    this.updateDebtsListCurrency();
    this.updateModalCurrency();
    
    // ПЕРЕЗАГРУЖАЕМ ДОЛГИ - КАК В СТАТИСТИКЕ!
    this.refreshDebtsOnCurrencyChange();
}

    // Обновляем отображение долгов
updateDebtDisplay() {
    this.updateStatisticsCurrency();
    this.updateDebtsListCurrency();
    this.updateModalCurrency();
    this.updateAllDebtCardsCurrency(); // Добавьте этот вызов
}


updateAllDebtCardsCurrency() {
    const debtItems = document.querySelectorAll('.debt-item');
    
    debtItems.forEach(debtDiv => {
        // Обновляем основную сумму
        const amountEl = debtDiv.querySelector('.text-2xl.font-bold.text-white');
        if (amountEl) {
            const rawAmount = amountEl.getAttribute('data-raw-amount');
            if (rawAmount) {
                amountEl.textContent = `${formatAmount(rawAmount)} ${this.currencySymbol}`;
            }
        }
        
        // Обновляем суммы в прогресс-баре
        const progressSpans = debtDiv.querySelectorAll('.debt-main-info .mb-4 span');
        if (progressSpans.length >= 2) {
            const paidRaw = progressSpans[0].getAttribute('data-raw-amount');
            const remainingRaw = progressSpans[1].getAttribute('data-raw-amount');
            
            if (paidRaw) {
                progressSpans[0].textContent = `Выполнено: ${formatAmount(paidRaw)} ${this.currencySymbol}`;
                progressSpans[0].setAttribute('data-raw-amount', paidRaw);
            }
            if (remainingRaw) {
                progressSpans[1].textContent = `Осталось: ${formatAmount(remainingRaw)} ${this.currencySymbol}`;
                progressSpans[1].setAttribute('data-raw-amount', remainingRaw);
            }
        }
        
        // Обновляем ежедневную сумму
        const dailyBadge = debtDiv.querySelector('.bg-gray-500\\/20');
        if (dailyBadge) {
            const dailyRaw = dailyBadge.getAttribute('data-raw-amount');
            if (dailyRaw) {
                dailyBadge.textContent = `${formatAmount(dailyRaw)} ${this.currencySymbol} / день`;
                dailyBadge.setAttribute('data-raw-amount', dailyRaw);
            }
        }
        
        // Обновляем максимальную сумму в форме платежа
        const maxAmountText = debtDiv.querySelector('.payment-form .text-gray-500.text-xs');
        if (maxAmountText) {
            const maxRaw = maxAmountText.getAttribute('data-raw-amount');
            if (maxRaw) {
                maxAmountText.textContent = `Максимум: ${formatAmount(maxRaw)} ${this.currencySymbol}`;
                maxAmountText.setAttribute('data-raw-amount', maxRaw);
            }
        }
        
        // Обновляем историю платежей
        this.updatePaymentHistoryCurrency(debtDiv);
    });
}


// Добавьте метод для обновления валюты в истории платежей
updatePaymentHistoryCurrency(debtDiv) {
    const paymentItems = debtDiv.querySelectorAll('.payment-history-list .bg-gray-700\\/30');
    
    paymentItems.forEach(paymentItem => {
        const amountEl = paymentItem.querySelector('.text-white.font-semibold');
        if (amountEl) {
            const rawAmount = amountEl.getAttribute('data-raw-amount');
            if (rawAmount) {
                amountEl.textContent = `${formatAmount(rawAmount)} ${this.currencySymbol}`;
                amountEl.setAttribute('data-raw-amount', rawAmount);
            }
        }
    });
}



// Добавьте новый метод для обновления валюты в модалке
updateModalCurrency() {
    const currencySymbols = document.querySelectorAll('#debtModal .currency-symbol');
    currencySymbols.forEach(element => {
        element.textContent = this.currencySymbol;
    });
}


updateStatisticsCurrency() {
    const statsContainer = document.getElementById('debtStatistics');
    if (!statsContainer) return;

    const amountElements = statsContainer.querySelectorAll('[data-raw-amount]');
    amountElements.forEach(element => {
        const rawAmount = element.getAttribute('data-raw-amount');
        if (rawAmount) {
            element.textContent = formatAmount(rawAmount);
            // Добавляем символ валюты как отдельный элемент
            if (!element.querySelector('.currency-symbol')) {
                const currencySpan = document.createElement('span');
                currencySpan.className = 'currency-symbol';
                currencySpan.textContent = ' ' + this.currencySymbol;
                element.appendChild(currencySpan);
            } else {
                element.querySelector('.currency-symbol').textContent = ' ' + this.currencySymbol;
            }
        }
    });
}


   async addPayment(debtId, paymentAmount, note = '') {
    try {
        
        console.log('Note:', note);

        const formData = new FormData();
        formData.append('payment_amount', paymentAmount.toString());
        if (note) {
            formData.append('note', note);
        }
        
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfToken) {
            formData.append('csrfmiddlewaretoken', csrfToken.value);
        }

        const response = await fetch(`/api/debts/${debtId}/add_payment/`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: formData
        });

        const data = await response.json();
       

        if (data.success) {
            return data;
        } else {
            this.showError(data.error || 'Ошибка при добавлении платежа');
            return null;
        }

    } catch (error) {
        console.error('=== ADD PAYMENT ERROR ===');
        console.error('Error:', error);
        this.showError('Ошибка соединения с сервером');
        return null;
    }
}



// В методе payFullDebt замените на:
async payFullDebt(debtId, debtDiv, debt) {
    const payFullBtn = debtDiv.querySelector('.pay-full-debt'); // Объявляем один раз
    
    try {
        
        // Сбрасываем состояние кнопки подтверждения
        if (payFullBtn && payFullBtn.classList.contains('confirm-mode')) {
            this.resetConfirmationMode(payFullBtn);
        }
        
        // Показываем индикатор загрузки
        const originalText = payFullBtn.innerHTML;
        payFullBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Обработка...';
        payFullBtn.disabled = true;
        
        const formData = new FormData();
        
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfToken) {
            formData.append('csrfmiddlewaretoken', csrfToken.value);
        }

        const response = await fetch(`/api/debts/${debtId}/pay_full/`, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Закрываем форму платежа
            const paymentForm = debtDiv.querySelector('.payment-form');
            if (paymentForm) {
                paymentForm.classList.add('hidden');
            }
            
            // Обновляем данные долга
            if (data.debt) {
                Object.keys(data.debt).forEach(key => {
                    debt[key] = data.debt[key];
                });
                
                // Визуально обновляем карточку
                this.updateDebtCardVisuals(debtDiv, debt);
                
                // Перезагружаем историю платежей
                await this.loadAndRenderPaymentHistory(debt.id, debtDiv);
            }
            
            // ОБНОВЛЯЕМ ВЕСЬ СПИСОК И СТАТИСТИКУ
            this.loadDebts();
            this.loadStatistics();
            this.loadDebtCount();
            
            this.showSuccess(data.message);
        } else {
            this.showError(data.error || 'Ошибка при оплате платежа');
        }

    } catch (error) {
        console.error('Pay full debt error:', error);
        this.showError('Ошибка соединения с сервером');
    } finally {
        // Восстанавливаем кнопку
        if (payFullBtn) {
            payFullBtn.innerHTML = 'Всю сумму';
            payFullBtn.disabled = false;
            this.resetConfirmationMode(payFullBtn);
        }
    }
}

// Обновите метод resetConfirmationMode для работы без параметров:
resetConfirmationMode(button) {
    if (!button) return;
    
    button.innerHTML = 'Всю сумму';
    button.classList.remove('bg-red-600', 'hover:bg-red-500', 'confirm-mode');
    button.classList.add('bg-gray-600', 'hover:bg-green-500');
    
    // Очищаем таймер
    const resetTimer = button.getAttribute('data-reset-timer');
    if (resetTimer) {
        clearTimeout(parseInt(resetTimer));
        button.removeAttribute('data-reset-timer');
    }
}

// Обновите метод activateConfirmationMode:
activateConfirmationMode(button) {
    if (!button) return;
    
    // Меняем текст и стиль кнопки
    button.innerHTML = 'Вы уверены?';
    button.classList.remove('bg-gray-600', 'hover:bg-green-500');
    button.classList.add('bg-red-600', 'hover:bg-red-500', 'confirm-mode');
    
    // Устанавливаем таймер для возврата к исходному состоянию (3 секунды)
    const resetTimer = setTimeout(() => {
        this.resetConfirmationMode(button);
    }, 3000);
    
    // Сохраняем таймер в данных кнопки для возможности отмены
    button.setAttribute('data-reset-timer', resetTimer.toString());
}


async loadDebtPayments(debtId) {
    try {
        const response = await fetch(`/api/debts/${debtId}/payments/`);
        const data = await response.json();
        
        if (data.success) {
            return data.payments;
        } else {
            return [];
        }
    } catch (error) {
        return [];
    }
}



    // Обновляем валюту в списке долгов
    updateDebtsListCurrency() {
        const debtsList = document.getElementById('debtsList');
        if (!debtsList) return;

        const debtItems = debtsList.querySelectorAll('.debt-item');
        debtItems.forEach(item => {
            const amountEl = item.querySelector('.text-2xl.font-bold.text-white');
            if (amountEl) {
                const amount = amountEl.textContent.replace(/[^\d.,]/g, '');
                amountEl.textContent = `${amount} ${this.currencySymbol}`;
            }
        });
    }

    moveModalToGlobal() {
        const modal = document.getElementById('debtModal');
        if (modal && modal.closest('#tab-debt')) {
            document.body.appendChild(modal);
        }
    }

    init() {
        this.loadDebts();
        this.loadStatistics();
        this.loadDebtCount();
        this.initEventListeners();
    }

    initEventListeners() {
        const addDebtBtn = document.getElementById('addDebtBtn');
        if (addDebtBtn) {
            addDebtBtn.replaceWith(addDebtBtn.cloneNode(true));
            document.getElementById('addDebtBtn').addEventListener('click', () => this.openDebtModal());
        }
        
        const closeBtn = document.getElementById('closeDebtModalHeaderBtn');
        if (closeBtn) {
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            document.getElementById('closeDebtModalHeaderBtn').addEventListener('click', () => this.closeDebtModal());
        }
        
        const cancelBtn = document.getElementById('cancelDebtBtn');
        if (cancelBtn) {
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
            document.getElementById('cancelDebtBtn').addEventListener('click', () => this.closeDebtModal());
        }
        
        const modal = document.getElementById('debtModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) this.closeDebtModal();
            });
        }

        const saveBtn = document.getElementById('saveDebtBtn');
        if (saveBtn) {
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            document.getElementById('saveDebtBtn').addEventListener('click', () => this.saveDebt());
        }

        const filterContainer = document.querySelector('.flex.bg-gray-800.rounded-lg.p-1.mb-6');
        if (filterContainer) {
            filterContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('debt-filter-tab')) {
                    this.switchFilter(e.target);
                }
            });
        }
    }

    initMenuEventListener() {
        const menuBtn = document.getElementById('openDebtModalFromMenu');
        if (menuBtn) {
            menuBtn.replaceWith(menuBtn.cloneNode(true));
            document.getElementById('openDebtModalFromMenu').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const debtModal = document.getElementById('debtModal');
                if (debtModal && debtModal.closest('#tab-debt')) {
                    this.openDebtModalFromMenu();
                } else {
                    this.openDebtModal();
                }
            });
        }
    }

    openDebtModalFromMenu() {
        const debtTab = document.getElementById('tab-debt');
        const otherTabs = document.querySelectorAll('.mobile-tab');
        
        if (debtTab) {
            otherTabs.forEach(tab => {
                if (tab.id !== 'tab-debt') {
                    tab.classList.add('hidden');
                }
            });
            
            debtTab.classList.remove('hidden');
            this.updateActiveMenu('debt');
            
            setTimeout(() => {
                this.openDebtModal();
            }, 100);
        }
    }

    updateActiveMenu(activeItem) {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active', 'bg-blue-500/20', 'text-white');
            item.classList.add('text-gray-200');
        });
        
        const debtMenuBtn = document.getElementById('openDebtModalFromMenu');
        if (debtMenuBtn && activeItem === 'debt') {
            debtMenuBtn.classList.add('active', 'bg-blue-500/20', 'text-white');
            debtMenuBtn.classList.remove('text-gray-200');
        }
    }

    showSuccess(message) {
        this.showModalNotification(message, 'success');
    }

    showError(message) {
        this.showModalNotification(message, 'error');
    }

    showModalNotification(message, type) {
        const notificationEl = document.getElementById('debtModalNotification');
        if (!notificationEl) return;

        // Очищаем предыдущие уведомления
        notificationEl.innerHTML = '';
        notificationEl.className = 'hidden mx-4 mt-4 p-3 rounded-lg border';

        // Настраиваем стили в зависимости от типа
        if (type === 'success') {
            notificationEl.classList.add('bg-green-500/20', 'text-green-400', 'border-green-500/30');
            notificationEl.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>${message}</span>
                </div>
            `;
        } else if (type === 'error') {
            notificationEl.classList.add('bg-red-500/20', 'text-red-400', 'border-red-500/30');
            notificationEl.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    <span>${message}</span>
                </div>
            `;
        }

        // Показываем уведомление
        notificationEl.classList.remove('hidden');

        // Автоматически скрываем через 5 секунд
        setTimeout(() => {
            notificationEl.classList.add('hidden');
        }, 5000);

        // Также скрываем при клике
        notificationEl.addEventListener('click', () => {
            notificationEl.classList.add('hidden');
        });
    }


    openDebtModal() {
        const modal = document.getElementById('debtModal');
        if (modal) {
            if (typeof animateModal === 'function') {
                animateModal(modal, true);
            } else {
                modal.classList.remove('hidden');
            }
            this.resetDebtForm();
        }
    }

    closeDebtModal() {
        const modal = document.getElementById('debtModal');
        if (modal) {
            if (typeof animateModal === 'function') {
                animateModal(modal, false);
            } else {
                modal.classList.add('hidden');
            }
            this.resetDebtForm();
            
            // Скрываем уведомление при закрытии модалки
            const notificationEl = document.getElementById('debtModalNotification');
            if (notificationEl) {
                notificationEl.classList.add('hidden');
            }
        }
    }

     resetDebtForm() {
        const form = document.getElementById('debtForm');
        if (form) {
            form.reset();
            document.querySelectorAll('[id$="Error"]').forEach(error => {
                error.classList.add('hidden');
            });
            
           

            // Скрываем уведомление при сбросе формы
            const notificationEl = document.getElementById('debtModalNotification');
            if (notificationEl) {
                notificationEl.classList.add('hidden');
            }
        }
    }

    async deleteDebt(debtId) {
        try {
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
            const formData = new FormData();
            
            if (csrfToken) {
                formData.append('csrfmiddlewaretoken', csrfToken.value);
            }

            const response = await fetch(`/api/debts/${debtId}/delete/`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(data.message);
                this.loadDebts();
                this.loadStatistics();
                this.loadDebtCount();
            } else {
                this.showError(data.message || 'Ошибка при удалении платежа');
            }

        } catch (error) {
            this.showError('Ошибка соединения с сервером');
        }
    }

    async loadDebts() {
        const debtsList = document.getElementById('debtsList');
        const emptyState = document.getElementById('emptyDebtsState');
        const loading = document.getElementById('debtsLoading');

        if (!debtsList || !emptyState || !loading) return;

        debtsList.classList.add('hidden');
        emptyState.classList.add('hidden');
        loading.classList.remove('hidden');

        try {
            const response = await fetch(`/api/debts/?filter=${this.currentFilter}`);
            const data = await response.json();

            if (data.success && data.debts && data.debts.length > 0) {
                const filteredDebts = this.filterDebtsByTab(data.debts);
                
                if (filteredDebts.length > 0) {
                    this.renderDebts(filteredDebts);
                    debtsList.classList.remove('hidden');
                    emptyState.classList.add('hidden');
                } else {
                    debtsList.classList.add('hidden');
                    emptyState.classList.remove('hidden');
                }
            } else if (data.success) {
                debtsList.classList.add('hidden');
                emptyState.classList.remove('hidden');
            } else {
                this.showError('Ошибка загрузки списка платежей: ' + (data.error || 'неизвестная ошибка'));
                debtsList.classList.add('hidden');
                emptyState.classList.add('hidden');
            }
        } catch (error) {
            this.showError('Ошибка соединения с сервером');
            debtsList.classList.add('hidden');
            emptyState.classList.add('hidden');
        } finally {
            loading.classList.add('hidden');
        }
    }

    filterDebtsByTab(debts) {
        switch (this.currentFilter) {
            case 'active':
                return debts.filter(debt => debt.status !== 'paid');
            case 'overdue':
                return debts.filter(debt => debt.is_overdue === true);
            case 'paid':
                return debts.filter(debt => debt.status === 'paid');
            default:
                return debts;
        }
    }

    updateDebtIcon(debtsCount) {
        const debtIconBtn = document.getElementById('debtIconBtn');
        const debtCounter = document.getElementById('debtCounter');

        if (!debtIconBtn || !debtCounter) return;

        if (debtsCount > 0) {
            debtIconBtn.classList.remove('hidden');
            debtCounter.classList.remove('hidden');
            debtCounter.textContent = debtsCount > 99 ? '99+' : debtsCount;
            
            const icon = debtIconBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('text-gray-400');
                icon.classList.add('text-red-400');
            }
        } else {
            debtIconBtn.classList.add('hidden');
            debtCounter.classList.add('hidden');
            
            const icon = debtIconBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('text-red-400');
                icon.classList.add('text-gray-400');
            }
        }
    }

    async loadDebtCount() {
        try {
            const response = await fetch('/api/debts/?filter=active');
            const data = await response.json();

            if (data.success && data.debts) {
                const activeDebts = data.debts.filter(debt => debt.status !== 'paid');
                this.updateDebtIcon(activeDebts.length);
            } else {
                this.updateDebtIcon(0);
            }
        } catch (error) {
            this.updateDebtIcon(0);
        }
    }

    renderDebts(debts) {
        const debtsList = document.getElementById('debtsList');
        if (!debtsList) return;
        
        debtsList.innerHTML = '';
        
        debts.forEach(debt => {
            const debtElement = this.createDebtElement(debt);
            debtsList.appendChild(debtElement);
        });
    }

createDebtElement(debt) {
    const debtDiv = document.createElement('div');
    
    // Определяем стили в зависимости от статуса
    let gradientClass, borderClass, statusClass, statusIcon, statusText, daysClass, daysIcon;
    
    if (debt.status === 'paid') {
        gradientClass = 'bg-gradient-to-br from-green-500/10 to-emerald-500/10';
        borderClass = 'border-green-500/20 hover:border-green-400/40';
        statusClass = 'bg-green-500/20 text-green-400 border-green-500/30';
        statusIcon = 'fa-check-circle';
        statusText = 'Выполнен';
        daysClass = 'text-green-400';
        daysIcon = 'fa-trophy';
    } else if (debt.status === 'partially_paid') {
        gradientClass = 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10';
        borderClass = 'border-yellow-500/20 hover:border-yellow-400/40';
        statusClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        statusIcon = 'fa-check-double';
        statusText = 'Частично оплачен';
        daysClass = debt.days_remaining <= 3 ? 'text-yellow-400' : 'text-green-400';
        daysIcon = debt.days_remaining <= 3 ? 'fa-triangle-exclamation' : 'fa-calendar';
    } else if (debt.is_overdue) {
        gradientClass = 'bg-gradient-to-br from-red-500/10 to-orange-500/10';
        borderClass = 'border-red-500/20 hover:border-red-400/40';
        statusClass = 'bg-red-500/20 text-red-400 border-red-500/30';
        statusIcon = 'fa-exclamation-triangle';
        statusText = 'Просрочен';
        daysClass = 'text-red-400';
        daysIcon = 'fa-clock';
    } else {
        gradientClass = 'bg-gradient-to-br from-blue-500/10 to-purple-500/10';
        borderClass = 'border-blue-500/20 hover:border-blue-400/40';
        statusClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        statusIcon = 'fa-clock';
        statusText = 'Активный';
        daysClass = debt.days_remaining <= 3 ? 'text-yellow-400' : 'text-green-400';
        daysIcon = debt.days_remaining <= 3 ? 'fa-exclamation' : 'fa-calendar';
    }
    
    // Расчет прогресса погашения
    const progressPercentage = (debt.paid_amount / debt.amount) * 100;
    
    debtDiv.className = `${gradientClass} rounded-xl p-4 border ${borderClass} transition-all duration-300 debt-item relative cursor-pointer collapsed`;
    
    let whatsappLink = '';
    if (debt.phone && debt.phone !== 'Не указан') {
        const cleanPhone = debt.phone.replace(/\s+/g, '');
        whatsappLink = `https://wa.me/${cleanPhone}`;
    }
    
    debtDiv.innerHTML = `
        <!-- Кнопка удаления -->
        <button 
            class="absolute top-3 right-3 w-9 h-9 bg-gray-700/50 rounded-lg flex items-center justify-center hover:bg-red-500/30 transition-all duration-200 delete-debt-btn z-20"
            data-debt-id="${debt.id}"
            data-no-toggle="true"
        >
            <i class="fas fa-trash text-gray-300 text-base"></i>
        </button>

        <!-- Подтверждение удаления -->
        <div class="delete-confirm hidden absolute inset-0 bg-gray-800 flex flex-col items-center justify-center rounded-2xl text-center p-4 z-10" data-no-toggle="true">
            <div class="text-center mb-3">
                <p class="text-red-400 font-semibold">Удалить платеж?</p>
                <p class="text-gray-400 text-sm">Это действие нельзя отменить</p>
            </div>
            <div class="flex space-x-3 w-full">
                <button class="cancel-delete flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors" data-no-toggle="true">
                    Отмена
                </button>
                <button class="confirm-delete flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors" data-no-toggle="true">
                    Да, удалить!
                </button>
            </div>
        </div>

        <!-- Основная информация -->
        <div class="debt-main-info">
            <div class="text-center mb-4">
                <h3 class="font-bold text-white text-xl mb-3">${this.escapeHtml(debt.debtor_name)}</h3>
                <div class="flex flex-wrap justify-center items-center gap-2">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusClass} status-badge-transition">
                        <i class="fas ${statusIcon} mr-1.5"></i>
                        ${statusText}
                    </span>
                    
                    <!-- Блок с ежедневной суммой -->
                    ${debt.status !== 'paid' && !debt.is_overdue && debt.days_remaining > 0 ? `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
                            <i class="fas fa-calendar-day mr-1.5 text-gray-400"></i>
                            ${formatAmount(Math.round(debt.remaining_amount / debt.days_remaining))} ${this.currencySymbol} / день
                        </span>
                    ` : ''}
                </div>
            </div>

            <!-- Прогресс выполнения -->
            ${debt.status !== 'paid' ? `
            <div class="mb-4">
                <div class="flex justify-between text-sm text-gray-400 mb-1">
                    <span>
                        Оплачено: ${formatAmount(debt.paid_amount)} ${this.currencySymbol}
                    </span>
                    <span>Осталось: ${formatAmount(debt.remaining_amount)} ${this.currencySymbol}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div class="bg-green-500 h-2 rounded-full progress-bar-transition" style="width: ${progressPercentage}%"></div>
                </div>
            </div>
            ` : ''}

            <div class="flex justify-center items-center space-x-6 mb-2">
                <div class="text-center">
                    <p class="text-sm text-gray-400 mb-1">Общая сумма</p>
                    <p class="text-2xl font-bold text-white">${formatAmount(debt.amount)} ${this.currencySymbol}</p>
                </div>
                <div class="h-8 w-px bg-gray-600"></div>
                <div class="text-center">
                    <p class="text-sm text-gray-400 mb-1">Срок оплаты</p>
                    <p class="text-lg font-semibold text-white">${this.escapeHtml(debt.due_date)}</p>
                </div>
            </div>

            <!-- Подсказка для развертывания (ПЕРЕМЕЩЕНА В ОСНОВНУЮ ЧАСТЬ) -->
            <div class="text-center mt-3 pt-3 border-t border-gray-700/30 collapse-hint">
                <p class="text-xs text-gray-500">Тапните чтобы развернуть</p>
            </div>
        </div>

        <!-- Дополнительная информация -->
        <div class="debt-details hidden space-y-4 mt-4 border-t border-gray-700/50 pt-4">
            ${debt.days_remaining !== null && debt.status !== 'paid' ? `
                <div class="flex flex-wrap justify-center items-center gap-2">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${daysClass} ${debt.days_remaining < 0 ? 'bg-red-500/20' : 'bg-green-500/20'}">
                        <i class="fas ${daysIcon} mr-1.5"></i>
                        ${debt.days_remaining < 0 ? `Просрочено на ${Math.abs(debt.days_remaining)} дн.` : `Осталось ${debt.days_remaining} дн.`}
                    </span>
                    
                    ${debt.status === 'delay_7' ? `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                            <i class="fas fa-clock mr-1.5"></i>
                            Получена отсрочка 7 дней
                        </span>
                    ` : ''}
                </div>
            ` : ''}
            
            <!-- Контактная информация -->
            <div class="space-y-3">
                ${debt.phone && debt.phone !== 'Не указан' ? `
                    <div class="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
                        <div class="flex items-center text-gray-300">
                            <i class="fas fa-phone mr-3 text-blue-400"></i>
                            <span class="font-medium">${this.escapeHtml(debt.phone)}</span>
                        </div>
                        <div class="flex space-x-2">
                            <a href="tel:${debt.phone.replace(/\s+/g, '')}" 
                               class="w-9 h-9 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg flex items-center justify-center transition-all duration-200"
                               data-no-toggle="true">
                                <i class="fas fa-phone text-sm"></i>
                            </a>
                            ${whatsappLink ? `
                            <a href="${whatsappLink}" 
                               target="_blank"
                               class="w-9 h-9 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg flex items-center justify-center transition-all duration-200"
                               data-no-toggle="true">
                                <i class="fab fa-whatsapp text-sm"></i>
                            </a>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                
                ${debt.address && debt.address !== 'Не указан' && debt.address.trim() !== '' ? `
                    <div class="flex items-center bg-gray-800/30 rounded-lg p-3">
                        <i class="fas fa-map-marker-alt mr-3 text-green-400"></i>
                        <span class="text-gray-300 font-medium">${this.escapeHtml(debt.address)}</span>
                    </div>
                ` : ''}
            </div>
            
            <!-- Описание -->
            ${debt.description ? `
                <div class="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <p class="text-gray-300 text-sm leading-relaxed">
                        <i class="fas fa-comment mr-2 text-yellow-400"></i>
                        ${this.escapeHtml(debt.description)}
                    </p>
                </div>
            ` : ''}
            
            <!-- Кнопки действий -->
            ${debt.status !== 'paid' ? `
                <div class="flex space-x-3">
                    <button class="pay-debt-btn flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                            data-no-toggle="true">
                        Внести платеж
                    </button>
                    <button class="delay-debt-btn bg-orange-600 hover:bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center"
                            data-no-toggle="true">
                        Отсрочка
                    </button>
                </div>
        
                <!-- Форма платежа -->
                <div class="payment-form hidden bg-gray-800/50 rounded-lg p-4 border border-gray-700" data-no-toggle="true">
                    <div class="mb-3" data-no-toggle="true">
                        <label class="block text-gray-400 text-sm font-medium mb-2" data-no-toggle="true">Сумма платежа</label>
                        <input type="number" 
                               class="payment-amount w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500 transition-colors"
                               placeholder="0.00"
                               step="0.01"
                               min="0.01"
                               max="${debt.remaining_amount}"
                               data-no-toggle="true">
                        <p class="text-gray-500 text-xs mt-1" data-no-toggle="true">Максимум: ${formatAmount(debt.remaining_amount)} ${this.currencySymbol}</p>
                    </div>
                    <div class="mb-3" data-no-toggle="true">
                        <label class="block text-gray-400 text-sm font-medium mb-2" data-no-toggle="true">Примечание (необязательно)</label>
                        <textarea class="payment-note w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-green-500 transition-colors resize-none"
                                  rows="2"
                                  placeholder="Комментарий к платежу..."
                                  data-no-toggle="true"></textarea>
                    </div>
                    <div class="flex space-x-3" data-no-toggle="true">
                        <button class="pay-full-debt flex-1 py-3 border-gray-700 rounded-lg hover:bg-gray-500 text-white font-semibold transition-colors"
                                data-no-toggle="true">
                            Полная сумма
                        </button>
                        <button class="confirm-payment flex-1 py-3 rounded-lg bg-blue-600 hover:bg-green-500 text-white font-semibold transition-colors"
                                data-no-toggle="true">
                            Внести часть
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <!-- История платежей -->
            <div class="payment-history">
                <h4 class="text-gray-400 font-semibold mb-3 flex items-center">
                    <i class="fas fa-history mr-2"></i>
                    История платежей
                </h4>
                <div class="payment-history-list space-y-2 max-h-40 overflow-y-auto">
                    <div class="text-center text-gray-500 py-4">
                        <i class="fas fa-spinner fa-spin mr-2"></i>
                        Загрузка...
                    </div>
                </div>
            </div>

            <!-- Блок даты публикации (ДОБАВЛЕН) -->
            <div class="flex items-center justify-center text-gray-500 text-xs mt-4 pt-3 border-t border-gray-700/30">
                <i class="fas fa-calendar mr-1.5"></i>
                <span>Опубликовано: ${debt.created_at}</span>
            </div>

            <!-- Подсказка для сворачивания (добавлена в развернутом состоянии) -->
            <div class="text-center mt-3 pt-3 border-t border-gray-700/30 expand-hint">
                <p class="text-xs text-gray-500">Тапните чтобы свернуть</p>
            </div>
        </div>
    `;
    
    // Добавляем обработчики событий
    this.addDebtEventListeners(debtDiv, debt);
    
    return debtDiv;
}



addDebtEventListeners(debtDiv, debt) {
    // Обработчик для сворачивания/разворачивания карточки
    debtDiv.addEventListener('click', (e) => {
        if (e.target.closest('[data-no-toggle="true"]')) {
            return;
        }
        
        const details = debtDiv.querySelector('.debt-details');
        const collapseHint = debtDiv.querySelector('.collapse-hint');
        const expandHint = debtDiv.querySelector('.expand-hint');
        const isCollapsed = debtDiv.classList.contains('collapsed');
        
        if (isCollapsed) {
            debtDiv.classList.remove('collapsed');
            details.classList.remove('hidden');
            collapseHint.classList.add('hidden'); // Скрываем подсказку развертывания
            expandHint.classList.remove('hidden'); // Показываем подсказку сворачивания
            debtDiv.style.transform = 'scale(1.02)';
            setTimeout(() => {
                debtDiv.style.transform = '';
            }, 300);
            
            // Загружаем историю платежей при разворачивании
            this.loadAndRenderPaymentHistory(debt.id, debtDiv);
        } else {
            debtDiv.classList.add('collapsed');
            details.classList.add('hidden');
            collapseHint.classList.remove('hidden'); // Показываем подсказку развертывания
            expandHint.classList.add('hidden'); // Скрываем подсказку сворачивания
        }
    });

    // Обработчики для кнопки удаления
    const deleteBtn = debtDiv.querySelector('.delete-debt-btn');
    const deleteConfirm = debtDiv.querySelector('.delete-confirm');
    const cancelDelete = debtDiv.querySelector('.cancel-delete');
    const confirmDelete = debtDiv.querySelector('.confirm-delete');
    
    if (deleteBtn && deleteConfirm && cancelDelete && confirmDelete) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConfirm.classList.remove('hidden');
        });
        
        cancelDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConfirm.classList.add('hidden');
        });
        
        confirmDelete.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteDebt(debt.id);
        });
    }
    
    // Обработчики для кнопок погашения и отсрочки
    const payBtn = debtDiv.querySelector('.pay-debt-btn');
    const delayBtn = debtDiv.querySelector('.delay-debt-btn');
    const paymentForm = debtDiv.querySelector('.payment-form');
    
    // Исправленный обработчик для кнопки "Погасить"
    if (payBtn && paymentForm) {
        payBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Pay button clicked'); // Для отладки
            
            // Закрываем другие открытые формы платежей
            document.querySelectorAll('.payment-form').forEach(form => {
                if (form !== paymentForm) {
                    form.classList.add('hidden');
                }
            });
            
            // Переключаем видимость формы
            paymentForm.classList.toggle('hidden');
            
            // Автофокус на поле ввода суммы при открытии формы
            if (!paymentForm.classList.contains('hidden')) {
                setTimeout(() => {
                    const amountInput = paymentForm.querySelector('.payment-amount');
                    if (amountInput) {
                        amountInput.focus();
                        amountInput.select();
                    }
                }, 150);
            }
        });
    }
    
    if (delayBtn) {
        delayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.changeStatus(debt.id, 'delay_7');
        });
    }
    
    // Обработчики для формы платежа
    const confirmPayment = debtDiv.querySelector('.confirm-payment');
    const payFullDebtBtn = debtDiv.querySelector('.pay-full-debt');
    const cancelPayment = debtDiv.querySelector('.cancel-payment');
    
    if (confirmPayment) {
        confirmPayment.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.processPayment(debt, debtDiv);
        });
    }
    
if (payFullDebtBtn) {
    payFullDebtBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Если кнопка уже в режиме подтверждения
        if (payFullDebtBtn.classList.contains('confirm-mode')) {
            // Выполняем погашение всей суммы
            this.payFullDebt(debt.id, debtDiv, debt);
        } else {
            // Переводим кнопку в режим подтверждения
            this.activateConfirmationMode(payFullDebtBtn);
        }
    });
}


    
    if (cancelPayment) {
        cancelPayment.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            paymentForm.classList.add('hidden');
        });
    }
    
    // Обработчики для полей ввода в форме погашения
    const paymentAmountInput = debtDiv.querySelector('.payment-amount');
    const paymentNoteInput = debtDiv.querySelector('.payment-note');
    
    if (paymentAmountInput) {
        paymentAmountInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        paymentAmountInput.addEventListener('input', (e) => {
            e.stopPropagation();
            // Автоматическая валидация максимальной суммы
            const maxAmount = parseFloat(e.target.max);
            const currentAmount = parseFloat(e.target.value);
            if (currentAmount > maxAmount) {
                e.target.value = maxAmount;
            }
        });

        // Обработчик для клавиши Enter в поле суммы
        paymentAmountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.processPayment(debt, debtDiv);
            }
        });
    }
    
    if (paymentNoteInput) {
        paymentNoteInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Обработчик для клавиши Enter в поле примечания
        paymentNoteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.processPayment(debt, debtDiv);
            }
        });
    }
}



async loadAndRenderPaymentHistory(debtId, debtDiv) {
    const paymentHistoryBlock = debtDiv.querySelector('.payment-history');
    const paymentList = debtDiv.querySelector('.payment-history-list');
    
    if (!paymentHistoryBlock || !paymentList) {
        console.log('Payment history elements not found');
        return;
    }
    
    console.log('Loading payment history for debt:', debtId);
    
    try {
        const payments = await this.loadDebtPayments(debtId);
        console.log('Loaded payments:', payments);
        
        if (payments.length === 0) {
            // Скрываем весь блок истории платежей если платежей нет
            paymentHistoryBlock.classList.add('hidden');
        } else {
            // Показываем блок и заполняем платежами
            paymentHistoryBlock.classList.remove('hidden');
            paymentList.innerHTML = payments.map(payment => `
                <div class="flex items-center bg-gray-700/30 rounded-lg p-3">
    <div class="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center mr-3 flex-shrink-0">
       <i class="fa-solid fa-hand-holding-dollar"></i>
    </div>
    <div>
        <p class="text-white font-semibold">${formatAmount(payment.amount)} ${this.currencySymbol}</p>
        <p class="text-gray-400 text-xs">${payment.payment_date}</p>
        ${payment.note ? `<p class="text-gray-500 text-xs mt-1">${this.escapeHtml(payment.note)}</p>` : ''}
    </div>
</div>

            `).join('');
        }
        console.log('Payment history rendered');
    } catch (error) {
        console.error('Error loading payment history:', error);
        // В случае ошибки тоже скрываем блок
        paymentHistoryBlock.classList.add('hidden');
    }
}



async processPayment(debt, debtDiv) {
    console.log('=== PROCESS PAYMENT START ===');
    
    const paymentAmountInput = debtDiv.querySelector('.payment-amount');
    const paymentNoteInput = debtDiv.querySelector('.payment-note');
    const paymentForm = debtDiv.querySelector('.payment-form');
    
    const paymentAmount = parseFloat(paymentAmountInput.value);
    const note = paymentNoteInput.value.trim();
    
    console.log('Payment amount from input:', paymentAmount);
    console.log('Note from input:', note);
    console.log('Debt remaining amount:', debt.remaining_amount);
    
    if (!paymentAmount || paymentAmount <= 0) {
        console.log('Invalid payment amount');
        this.showError('Введите корректную сумму платежа');
        return;
    }
    
    if (paymentAmount > debt.remaining_amount) {
        console.log('Payment amount exceeds remaining amount');
        this.showError(`Сумма платежа не может превышать ${formatAmount(debt.remaining_amount)} ${this.currencySymbol}`);
        return;
    }
    
    // Показываем индикатор загрузки
    const confirmBtn = debtDiv.querySelector('.confirm-payment');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Обработка...';
    confirmBtn.disabled = true;
    
    try {
        console.log('Calling addPayment...');
        const result = await this.addPayment(debt.id, paymentAmount, note);
        console.log('addPayment result:', result);
        
        if (result && result.success) {
            console.log('Payment successful, updating UI...');
            
            // Очищаем форму
            paymentAmountInput.value = '';
            paymentNoteInput.value = '';
            paymentForm.classList.add('hidden');
            
            // ОБНОВЛЯЕМ ДАННЫЕ ДОЛГА ИЗ ОТВЕТА СЕРВЕРА
            if (result.debt) {
                // Полностью заменяем объект debt новыми данными
                Object.keys(result.debt).forEach(key => {
                    debt[key] = result.debt[key];
                });
                console.log('Updated debt object:', debt);
            }
            
            // Визуально обновляем прогресс-бар и статус
            this.updateDebtCardVisuals(debtDiv, debt);
            
            // Перезагружаем историю платежей
            await this.loadAndRenderPaymentHistory(debt.id, debtDiv);
            
            // ОБНОВЛЯЕМ ВЕСЬ СПИСОК ДОЛГОВ И СТАТИСТИКУ
            this.loadDebts();
            this.loadStatistics();
            this.loadDebtCount();
            
            this.showSuccess(result.message || 'Платеж успешно добавлен');
            console.log('UI update complete');
            
        } else {
            console.log('Payment failed:', result);
            this.showError(result?.error || 'Ошибка при добавлении платежа');
        }
    } catch (error) {
        console.error('Payment process error:', error);
        this.showError('Ошибка соединения с сервером');
    } finally {
        // Восстанавливаем кнопку
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        console.log('=== PROCESS PAYMENT END ===');
    }
}



    // Добавьте этот метод для визуального обновления карточки
// В метод updateDebtCardVisuals добавьте:
updateDebtCardVisuals(debtDiv, debt) {
    console.log('Updating debt card visuals for debt:', debt);
    
    // Обновляем прогресс-бар
    const progressPercentage = (debt.paid_amount / debt.amount) * 100;
    console.log('Progress percentage:', progressPercentage);
    
    // Находим прогресс-бар
    const progressBarContainer = debtDiv.querySelector('.debt-main-info .mb-4');
    if (progressBarContainer) {
        const progressFill = progressBarContainer.querySelector('.bg-green-500');
        if (progressFill) {
            progressFill.style.width = `${progressPercentage}%`;
            console.log('Progress bar updated to:', progressFill.style.width);
        }
        
        // Обновляем текстовые значения (без ежедневной суммы)
        const spans = progressBarContainer.querySelectorAll('span');
        if (spans.length >= 2) {
            spans[0].textContent = `Оплачено: ${formatAmount(debt.paid_amount)} ${this.currencySymbol}`;
            spans[1].textContent = `Осталось: ${formatAmount(debt.remaining_amount)} ${this.currencySymbol}`;
            console.log('Text labels updated');
        }
    }
    
    // Обновляем статус и ежедневную сумму
   const statusContainer = debtDiv.querySelector('.debt-main-info .flex.flex-wrap');
if (statusContainer) {
    // Обновляем основной статус
    const statusBadge = statusContainer.querySelector('.inline-flex');
    if (statusBadge) {
        let statusClass, statusIcon, statusText;
        
        if (debt.status === 'paid') {
            statusClass = 'bg-green-500/20 text-green-400 border-green-500/30';
            statusIcon = 'fa-check-circle';
            statusText = 'Выполнен';
        } else if (debt.status === 'partially_paid') {
            statusClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            statusIcon = 'fa-check-double';
            statusText = 'Частично оплачен';
        } else if (debt.is_overdue) {
            statusClass = 'bg-red-500/20 text-red-400 border-red-500/30';
            statusIcon = 'fa-exclamation-triangle';
            statusText = 'Просрочен';
        } else {
            statusClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            statusIcon = 'fa-clock';
            statusText = 'Активный';
        }
        
        statusBadge.className = `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusClass}`;
        statusBadge.innerHTML = `<i class="fas ${statusIcon} mr-1.5"></i>${statusText}`;
        console.log('Status badge updated to:', statusText);
    }
    
    // Удаляем старый бадж ежедневной суммы (если есть)
    const dailyAmountBadge = statusContainer.querySelector('.bg-gray-500\\/20');
    if (dailyAmountBadge) dailyAmountBadge.remove();
    
    // Добавляем бадж ежедневной суммы только для активных непросроченных долгов
    if (debt.status !== 'paid' && !debt.is_overdue && debt.days_remaining > 0) {
        const newDailyBadge = document.createElement('span');
        newDailyBadge.className = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30';
        newDailyBadge.innerHTML = `<i class="fas fa-vault mr-1.5 text-gray-400"></i>${formatAmount(Math.round(debt.remaining_amount / debt.days_remaining))} ${this.currencySymbol} / день`;
        statusContainer.appendChild(newDailyBadge);
    }
}
    
    // Обновляем максимальную сумму в форме
    const maxAmountInput = debtDiv.querySelector('.payment-amount');
    if (maxAmountInput) {
        maxAmountInput.max = debt.remaining_amount;
        const maxAmountText = debtDiv.querySelector('.text-gray-500.text-xs');
        if (maxAmountText) {
            maxAmountText.textContent = `Максимум: ${formatAmount(debt.remaining_amount)} ${this.currencySymbol}`;
        }
        console.log('Max amount updated to:', debt.remaining_amount);
    }
    
    // Обновляем общую сумму долга, если нужно
    const totalAmountEl = debtDiv.querySelector('.text-2xl.font-bold.text-white');
    if (totalAmountEl) {
        totalAmountEl.textContent = `${formatAmount(debt.amount)} ${this.currencySymbol}`;
    }
}


    async changeStatus(debtId, newStatus) {
        try {
            const formData = new FormData();
            formData.append('status', newStatus);
            
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
            if (csrfToken) {
                formData.append('csrfmiddlewaretoken', csrfToken.value);
            }

            const response = await fetch(`/api/debts/${debtId}/update_status/`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.loadDebts();
                this.loadStatistics();
                this.loadDebtCount();
                this.showSuccess(data.message);
            } else {
                this.showError(data.message || 'Ошибка при изменении статуса');
            }

        } catch (error) {
            this.showError('Ошибка соединения с сервером');
            this.loadDebts();
        }
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'Активный',
            'paid': 'Погашенный',
            'delay_7': 'Отсрочка 7 дней'
        };
        return statusMap[status] || status;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/debts/statistics/');
            const data = await response.json();
            
            if (data.success) {
                this.renderStatistics(data);
            }
        } catch (error) {
            // Ошибка загрузки статистики
        }
    }

renderStatistics(stats) {
    const statsContainer = document.getElementById('debtStatistics');
    if (!statsContainer) return;

    const totalAmount = stats.total_amount || 0;
    const overdueAmount = stats.overdue_amount || 0;
    const paidAmount = stats.paid_amount || 0;

    statsContainer.innerHTML = `
        <div class="grid grid-cols-3 divide-x divide-gray-700">
            <div class="text-center px-2">
                <div class="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center mx-auto mb-2">
                    <i class="fas fa-wallet text-blue-400 text-sm"></i>
                </div>
                <p class="text-gray-400 text-xs mb-0.5">Общая</p>
                <p class="text-white font-semibold text-xl" data-raw-amount="${totalAmount}">
                    ${formatAmount(totalAmount)} <span class="currency-symbol">${this.currencySymbol}</span>
                </p>
            </div>

            <div class="text-center px-2">
                <div class="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center mx-auto mb-2">
                    <i class="fas fa-exclamation-triangle text-red-400 text-sm"></i>
                </div>
                <p class="text-gray-400 text-xs mb-0.5">Просрочено</p>
                <p class="text-white font-semibold text-xl" data-raw-amount="${overdueAmount}">
                    ${formatAmount(overdueAmount)} <span class="currency-symbol">${this.currencySymbol}</span>
                </p>
            </div>

            <div class="text-center px-2">
                <div class="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center mx-auto mb-2">
                    <i class="fas fa-check-circle text-green-400 text-sm"></i>
                </div>
                <p class="text-gray-400 text-xs mb-0.5">Оплачено</p>
                <p class="text-white font-semibold text-xl" data-raw-amount="${paidAmount}">
                    ${formatAmount(paidAmount)} <span class="currency-symbol">${this.currencySymbol}</span>
                </p>
            </div>
        </div>
    `;
}


    switchFilter(clickedTab) {
        document.querySelectorAll('.debt-filter-tab').forEach(tab => {
            tab.classList.remove('active', 'bg-blue-500', 'text-white');
            tab.classList.add('text-gray-400');
        });
        
        clickedTab.classList.add('active', 'bg-blue-500', 'text-white');
        clickedTab.classList.remove('text-gray-400');
        
        this.currentFilter = clickedTab.dataset.filter;
        this.loadDebts();
    }

   async saveDebt() {
    if (this.isSaving) {
        return;
    }

    const form = document.getElementById('debtForm');
    if (!form) return;
    
    const formData = new FormData(form);
    const saveBtn = document.getElementById('saveDebtBtn');

    // Сначала скрываем предыдущие уведомления
    const notificationEl = document.getElementById('debtModalNotification');
    if (notificationEl) {
        notificationEl.classList.add('hidden');
    }

    // Валидация полей
    const debtorName = formData.get('debtor_name')?.trim();
    const amount = formData.get('amount');
    const dueDate = formData.get('due_date');
    const phone = formData.get('phone')?.trim();

    if (!debtorName || debtorName.length < 2) {
        this.showError('Введите корректное ФИО должника (минимум 2 символа)');
        return;
    }

    if (!amount || parseFloat(amount) <= 0) {
        this.showError('Введите корректную сумму платежа (больше 0)');
        return;
    }

    if (!dueDate) {
        this.showError('Выберите срок возврата');
        return;
    }



    if (phone && !this.validatePhone(phone)) {
        this.showError('Введите корректный номер телефона');
        return;
    }

       formData.set('debtor_name', debtorName);
if (phone) formData.set('phone', phone);
const address = formData.get('address')?.trim();
if (address) formData.set('address', address);

        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (csrfToken) {
            formData.append('csrfmiddlewaretoken', csrfToken.value);
        }

        this.isSaving = true;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Сохранение...';

        try {
            const response = await fetch('/api/debts/create/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            const data = await response.json();

            if (data.success) {
                this.closeDebtModal();
                this.loadDebts();
                this.loadStatistics();
                this.loadDebtCount();
                this.showSuccess(data.message);
            } else {
                let errorMessage = 'Ошибка при сохранении';
                if (data.errors) {
                    errorMessage += ': ' + Object.values(data.errors).flat().join(', ');
                } else if (data.error) {
                    errorMessage += ': ' + data.error;
                }
                this.showError(errorMessage);
            }
        } catch (error) {
            this.showError('Ошибка соединения с сервером');
        } finally {
            this.isSaving = false;
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Сохранить';
        }
    }

    validatePhone(phone) {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

        async markAsPaid(debtId) {
        if (!confirm('Отметить платеж как выполненный?')) return;

        try {
            const response = await fetch(`/debts/${debtId}/mark_paid/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest',
                }
            });

            const data = await response.json();

            if (data.success) {
                this.loadDebts();
                this.loadStatistics();
                this.loadDebtCount();
                this.showSuccess(data.message);
            } else {
                this.showError(data.message);
            }
        } catch (error) {
            this.showError('Ошибка соединения');
        }
    }
} // ЗАКРЫТИЕ КЛАССА DebtManager - ДОЛЖНО БЫТЬ ЗДЕСЬ

// Глобальная функция для обновления валюты во всех модулях
window.updateAllCurrencyModules = function(currency) {
    if (window.debtManager) {
        window.debtManager.updateCurrency();
    }
}

// Инициализация при загрузке страницы
let debtManager;
document.addEventListener('DOMContentLoaded', function() {
    debtManager = new DebtManager();
    window.debtManager = debtManager; // Делаем глобально доступным
});

// Защита от повторной инициализации
if (window.debtManagerInitialized) {
    // DebtManager уже инициализирован
} else {
    window.debtManagerInitialized = true;
    document.addEventListener('DOMContentLoaded', function() {
        debtManager = new DebtManager();
        window.debtManager = debtManager;
    });
}