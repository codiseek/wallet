// navigation.js

// -----------------------------
// Навигация и табы
// -----------------------------
function initTabNavigation() {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    const tabs = document.querySelectorAll('.mobile-tab');
    const balanceBlock = document.querySelector('.mobile-header .bg-gradient-to-r');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Обновляем активные элементы навигации и вкладки
            navItems.forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            tabs.forEach(t => t.classList.remove('active'));
            
            // Управляем видимостью блока баланса
            if (balanceBlock) {
                if (tabName === 'home') balanceBlock.classList.remove('hidden');
                else balanceBlock.classList.add('hidden');
            }
            
            // Активируем целевую вкладку
            const active = document.getElementById(`tab-${tabName}`);
            if (active) active.classList.add('active');
            
            // Загружаем категории если нужно
            if (tabName === 'categories') loadUserCategories();
            
            // ПРОКРУЧИВАЕМ СТРАНИЦУ К ВЕРХУ ДЛЯ ВСЕХ ВКЛАДОК
            window.scrollTo(0, 0);
        });
    });
}

// Можешь добавить сюда другие функции навигации, если появятся

