

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
        case '₸': symbol = '₸'; break;
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
    
    // Обновляем прогресс-бар
    updateBalanceProgressBar();
    
    updateSavingsDisplay();
}

function updateBalanceProgressBar() {
    const progressBar = document.getElementById('balanceProgressBar');
    if (!progressBar || !window.initialBalances) return;
    
    const income = parseFloat(window.initialBalances.income || 0);
    const expense = parseFloat(window.initialBalances.expense || 0);
    const total = income + expense;
    
    // Если нет доходов и расходов, показываем пустую серую шкалу
    if (total <= 0) {
        progressBar.innerHTML = '<div class="bg-gray-600 h-3 rounded-full w-full"></div>';
        return;
    }
    
    const incomePercent = (income / total) * 100;
    const expensePercent = (expense / total) * 100;
    
    // Создаем шкалу с темным разделителем между частями
    let progressHTML = '';
    
    if (incomePercent > 0 && expensePercent > 0) {
        // Если есть и доходы и расходы - показываем обе части с разделителем
        progressHTML = `
            <div class="flex h-3">
                <div class="bg-green-500 h-2 transition-all duration-500 ease-out rounded-l-full" style="width: ${incomePercent}%"></div>
                <div class="w-[1px] bg-gray-900"></div>
                <div class="bg-red-500 h-2 transition-all duration-500 ease-out rounded-r-full" style="width: ${expensePercent}%"></div>
            </div>
        `;
    } else if (incomePercent > 0) {
        // Если только доходы - зеленая полная шкала
        progressHTML = `<div class="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out" style="width: ${incomePercent}%"></div>`;
    } else if (expensePercent > 0) {
        // Если только расходы - красная полная шкала
        progressHTML = `<div class="bg-red-500 h-2 rounded-full transition-all duration-500 ease-out" style="width: ${expensePercent}%"></div>`;
    }
    
    progressBar.innerHTML = progressHTML;
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
        monthly_reserve += reserveAmount;
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
        monthly_reserve -= reserveAmount;
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



// Добавьте в balance.js
function reloadBalanceData() {
    fetch('/get_balance_data/')  // Создайте этот endpoint в Django
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.initialBalances = data.balances;
                updateBalanceDisplay();
            }
        })
        .catch(error => {
            console.error('Error reloading balance:', error);
        });
}

// Сделайте функцию глобально доступной
window.reloadBalanceData = reloadBalanceData;




// Обновите функцию updateBalanceDisplay
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
        case '₸': symbol = '₸'; break;
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
    
    // Обновляем прогресс-бар
    updateBalanceProgressBar();
    
    updateSavingsDisplay();
}