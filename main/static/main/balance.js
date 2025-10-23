

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

