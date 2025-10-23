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
            navItems.forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            tabs.forEach(t => t.classList.remove('active'));
            if (balanceBlock) {
                if (tabName === 'home') balanceBlock.classList.remove('hidden');
                else balanceBlock.classList.add('hidden');
            }
            const active = document.getElementById(`tab-${tabName}`);
            if (active) active.classList.add('active');
            if (tabName === 'categories') loadUserCategories();
        });
    });
}

// Можешь добавить сюда другие функции навигации, если появятся