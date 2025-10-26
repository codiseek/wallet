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
    }

    // Простой метод для получения символа валюты
   getCurrencySymbol() {
    const currency = window.currentCurrency || 'c';
    switch(currency) {
        case 'c': return 'с';
        case 'r': return '₽';
        case '$': return '$';
        case '€': return '€';
        default: return 'с';
    }
}

    // Обновляем валюту при вызове
updateCurrency() {
    this.currencySymbol = this.getCurrencySymbol();
    this.updateDebtDisplay();
}

    // Обновляем отображение долгов
updateDebtDisplay() {
    this.updateStatisticsCurrency();
    this.updateDebtsListCurrency();
    this.updateModalCurrency();
}


// Добавьте новый метод для обновления валюты в модалке
updateModalCurrency() {
    const currencySymbols = document.querySelectorAll('#debtModal .currency-symbol');
    currencySymbols.forEach(element => {
        element.textContent = this.currencySymbol;
    });
}

    // Обновляем валюту в статистике
    updateStatisticsCurrency() {
        const statsContainer = document.getElementById('debtStatistics');
        if (!statsContainer) return;

        const totalAmountEl = statsContainer.querySelector('.bg-gray-800\\/50 .text-white');
        const overdueAmountEl = statsContainer.querySelector('.bg-red-500\\/10 .text-white');
        const paidAmountEl = statsContainer.querySelector('.bg-green-500\\/10 .text-white');

        if (totalAmountEl) {
            const amount = totalAmountEl.textContent.replace(/[^\d.,]/g, '');
            totalAmountEl.textContent = `${amount} ${this.currencySymbol}`;
        }
        if (overdueAmountEl) {
            const amount = overdueAmountEl.textContent.replace(/[^\d.,]/g, '');
            overdueAmountEl.textContent = `${amount} ${this.currencySymbol}`;
        }
        if (paidAmountEl) {
            const amount = paidAmountEl.textContent.replace(/[^\d.,]/g, '');
            paidAmountEl.textContent = `${amount} ${this.currencySymbol}`;
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
                this.showError(data.message || 'Ошибка при удалении должника');
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
                this.showError('Ошибка загрузки списка долгов: ' + (data.error || 'неизвестная ошибка'));
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
        
        let gradientClass, borderClass, statusClass, statusIcon, statusText, daysClass, daysIcon;
        
        if (debt.status === 'paid') {
            gradientClass = 'bg-gradient-to-br from-green-500/10 to-emerald-500/10';
            borderClass = 'border-green-500/20 hover:border-green-400/40';
            statusClass = 'bg-green-500/20 text-green-400 border-green-500/30';
            statusIcon = 'fa-check-circle';
            statusText = 'Погашен';
            daysClass = 'text-green-400';
            daysIcon = 'fa-trophy';
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
        
        debtDiv.className = `${gradientClass} rounded-xl p-4 border ${borderClass} transition-all duration-300 debt-item relative cursor-pointer collapsed`;
        
        let whatsappLink = '';
        if (debt.phone && debt.phone !== 'Не указан') {
            const cleanPhone = debt.phone.replace(/\s+/g, '');
            whatsappLink = `https://wa.me/${cleanPhone}`;
        }
        
        debtDiv.innerHTML = `
            <button 
                class="absolute top-3 right-3 w-9 h-9 bg-gray-700/50 rounded-lg flex items-center justify-center hover:bg-red-500/30 transition-all duration-200 delete-debt-btn z-20"
                data-debt-id="${debt.id}"
                data-no-toggle="true"
            >
                <i class="fas fa-trash text-gray-300 text-base"></i>
            </button>

            <div class="delete-confirm hidden absolute inset-0 bg-gray-800 flex flex-col items-center justify-center rounded-2xl text-center p-4 z-10" data-no-toggle="true">
                <div class="text-center mb-3">
                    <p class="text-red-400 font-semibold">Удалить должника?</p>
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

            <!-- Основная информация (всегда видима) -->
            <div class="debt-main-info">
                <div class="text-center mb-4">
                    <h3 class="font-bold text-white text-xl mb-2">${this.escapeHtml(debt.debtor_name)}</h3>
                </div>

                <div class="flex justify-center items-center space-x-6 mb-2">
                    <div class="text-center">
                        <p class="text-sm text-gray-400 mb-1">Сумма долга</p>
                        <p class="text-2xl font-bold text-white">${formatAmount(debt.amount)} ${this.currencySymbol}</p>
                    </div>
                    <div class="h-8 w-px bg-gray-600"></div>
                    <div class="text-center">
                        <p class="text-sm text-gray-400 mb-1">Срок возврата</p>
                        <p class="text-lg font-semibold text-white">${this.escapeHtml(debt.due_date)}</p>
                    </div>
                </div>
            </div>

            <!-- Дополнительная информация (скрыта по умолчанию) -->
            <div class="debt-details hidden space-y-4 mt-4 border-t border-gray-700/50 pt-4">
                ${debt.days_remaining !== null && debt.status === 'active' ? `
                <div class="text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${daysClass} ${debt.days_remaining < 0 ? 'bg-red-500/20' : 'bg-green-500/20'}">
                        <i class="fas ${daysIcon} mr-1.5"></i>
                        ${debt.days_remaining < 0 ? `Просрочено на ${Math.abs(debt.days_remaining)} дн.` : `Осталось ${debt.days_remaining} дн.`}
                    </span>
                </div>
                ` : ''}
                
                ${debt.status === 'delay_7' ? `
                    <div class="text-center">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                            <i class="fas fa-clock mr-1.5"></i>
                            +7 дней отсрочка
                        </span>
                    </div>
                ` : ''}
                
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
                    
                    ${debt.address ? `
                        <div class="flex items-center bg-gray-800/30 rounded-lg p-3">
                            <i class="fas fa-map-marker-alt mr-3 text-green-400"></i>
                            <span class="text-gray-300 font-medium">${this.escapeHtml(debt.address)}</span>
                        </div>
                    ` : ''}
                </div>
                
                ${debt.description ? `
                    <div class="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <p class="text-gray-300 text-sm leading-relaxed">
                            <i class="fas fa-comment mr-2 text-yellow-400"></i>
                            ${this.escapeHtml(debt.description)}
                        </p>
                    </div>
                ` : ''}
                
                <div class="flex justify-between items-center pt-4 border-t border-gray-700/50">
                    <div class="text-gray-500 text-xs flex items-center">
                        <i class="fas fa-calendar-plus mr-1.5"></i>
                        Добавлен: ${this.escapeHtml(debt.created_at)}
                    </div>
                    
                    <div class="relative">
                        <button class="status-dropdown-btn bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 flex items-center"
                                data-no-toggle="true">
                            <span>${this.getStatusText(debt.status)}</span>
                            <i class="fas fa-chevron-up ml-2 text-xs"></i>
                        </button>
                        
                        <div class="status-dropdown absolute right-0 bottom-full mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl hidden min-w-40 z-[100]">
                            <button class="status-option w-full text-left px-4 py-3 hover:bg-gray-700 text-sm transition-colors border-b border-gray-700 ${debt.status === 'active' ? 'bg-blue-500/20 text-blue-400' : 'text-white'}" data-status="active" data-no-toggle="true">
                                Активный
                            </button>
                            <button class="status-option w-full text-left px-4 py-3 hover:bg-gray-700 text-sm transition-colors border-b border-gray-700 ${debt.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'text-white'}" data-status="paid" data-no-toggle="true">
                                Погашенный
                            </button>
                            <button class="status-option w-full text-left px-4 py-3 hover:bg-gray-700 text-sm transition-colors ${debt.status === 'delay_7' ? 'bg-yellow-500/20 text-yellow-400' : 'text-white'}" data-status="delay_7" data-no-toggle="true">
                                Отсрочка 7 дней
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Подсказка для развертывания -->
            <div class="text-center mt-3 pt-3 border-t border-gray-700/30">
                <p class="text-xs text-gray-500">Тапните чтобы развернуть</p>
            </div>
        `;
        
        // Обработчик для сворачивания/разворачивания карточки
        debtDiv.addEventListener('click', (e) => {
            // Игнорируем клики на элементах с data-no-toggle="true"
            if (e.target.closest('[data-no-toggle="true"]')) {
                return;
            }
            
            const details = debtDiv.querySelector('.debt-details');
            const isCollapsed = debtDiv.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Разворачиваем
                debtDiv.classList.remove('collapsed');
                details.classList.remove('hidden');
                debtDiv.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    debtDiv.style.transform = '';
                }, 300);
            } else {
                // Сворачиваем
                debtDiv.classList.add('collapsed');
                details.classList.add('hidden');
            }
        });

        // Добавляем обработчики для кнопки удаления
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
        
        // Обработчики для dropdown статуса
        const dropdownBtn = debtDiv.querySelector('.status-dropdown-btn');
        const dropdown = debtDiv.querySelector('.status-dropdown');
        
        if (dropdownBtn && dropdown) {
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });
            
            const statusOptions = dropdown.querySelectorAll('.status-option');
            statusOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newStatus = e.target.dataset.status;
                    this.changeStatus(debt.id, newStatus);
                    dropdown.classList.add('hidden');
                });
            });
            
            document.addEventListener('click', () => {
                dropdown.classList.add('hidden');
            });
        }
        
        const callBtn = debtDiv.querySelector('a[href^="tel:"]');
        if (callBtn) {
            callBtn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        const whatsappBtn = debtDiv.querySelector('a[href^="https://wa.me/"]');
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        return debtDiv;
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
        <div class="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-400 text-xs">Общая сумма</p>
                    <p class="text-white font-bold text-lg">${formatAmount(totalAmount)} <span class="currency-symbol">${this.currencySymbol}</span></p>
                </div>
            </div>
        </div>
        <div class="bg-red-500/10 rounded-xl p-3 border border-red-500/30">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-red-400 text-xs">Просрочено</p>
                    <p class="text-white font-bold text-lg">${formatAmount(overdueAmount)} <span class="currency-symbol">${this.currencySymbol}</span></p>
                </div>
            </div>
        </div>
        <div class="bg-green-500/10 rounded-xl p-3 border border-green-500/30">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-green-400 text-xs">Погашено</p>
                    <p class="text-white font-bold text-lg">${formatAmount(paidAmount)} <span class="currency-symbol">${this.currencySymbol}</span></p>
                </div>
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
        this.showError('Введите корректную сумму долга (больше 0)');
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
        if (!confirm('Отметить долг как погашенный?')) return;

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