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
