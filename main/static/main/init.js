// init.js
document.addEventListener("DOMContentLoaded", function() {
    // Скрываем пустое состояние для фильтрованных категорий
    const emptyStateFiltered = document.getElementById('emptyStateFiltered');
    if (emptyStateFiltered) {
        emptyStateFiltered.classList.add('hidden');
    }
    
    // Инициализация системы фильтрации
    if (typeof window.initTransactionFilter === 'function') {
        window.initTransactionFilter();
    } else {
        console.error('Функция initTransactionFilter не найдена');
    }
    
    // Инициализация вкладок категорий
    if (typeof window.updateCategoryTabsHandlers === 'function') {
        window.updateCategoryTabsHandlers();
    }
});