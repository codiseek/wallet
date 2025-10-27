(function() {
    // Проверяем, не инициализирована ли уже админ-панель
    if (window.adminPanelInitialized) {
        return;
    }

    // Глобальные переменные для админ-панели
    let adminUsersModal = null;
    let currentAdminPage = 1;
    let adminUsers = [];

    // Инициализация админ-панели
    function initAdminPanel() {
        if (!document.querySelector('.admin-panel')) return;
        
        adminUsersModal = document.getElementById('adminUsersModal');
        
        // Загружаем статистику при открытии панели
        loadAdminStats();
        
        // Инициализируем обработчики
        initAdminHandlers();
    }




// Загрузка статистики администратора
// Обновленная функция loadAdminStats в admin.js
async function loadAdminStats() {
    try {
        
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        
        const response = await fetch('/admin_panel/get_stats/', {
            method: 'GET',
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateAdminStats(data.stats);
        } else {
            throw new Error(data.error || 'Ошибка загрузки данных');
        }
    } catch (error) {
        showErrorNotification('Ошибка загрузки статистики: ' + error.message);
    }
}



// Обновление статистики на странице
function updateAdminStats(stats) {
    // Обновляем основные счетчики
    if (stats.total_users !== undefined) {
        document.getElementById('totalUsersCount').textContent = stats.total_users.toLocaleString();
    }
    
    if (stats.new_users_week !== undefined) {
        document.getElementById('newUsersWeekCount').textContent = stats.new_users_week;
    }
    
    if (stats.active_today !== undefined) {
        document.getElementById('activeTodayCount').textContent = stats.active_today;
    }
    
    // Обновляем список последних пользователей
    if (stats.recent_users && stats.recent_users.length > 0) {
        updateRecentUsersList(stats.recent_users);
    }
}

// Обновление списка последних пользователей
function updateRecentUsersList(users) {
    const container = document.getElementById('recentUsersList');
    if (!container) return;
    
    container.innerHTML = '';
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'flex items-center justify-between text-sm';
        
        const timeAgo = getTimeAgo(user.date_joined);
        const bgColor = getRandomColorClass();
        
        userElement.innerHTML = `
            <div class="flex items-center space-x-2 mb-2">
                <div class="w-6 h-6 ${bgColor} rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-white text-xs"></i>
                </div>
                <span class="text-gray-200">${escapeHtml(user.username)}</span>
            </div>
            <span class="text-gray-400 text-xs">${timeAgo}</span>
        `;
        
        container.appendChild(userElement);
    });
}

// Загрузка списка пользователей для модального окна
async function loadUsersList(page = 1) {
    try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const loader = document.getElementById('usersListLoader');
        const content = document.getElementById('usersListContent');
        
        if (loader) loader.classList.remove('hidden');
        if (content) content.classList.add('hidden');
        
        const response = await fetch(`/admin_panel/get_users/?page=${page}`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки пользователей');
        
        const data = await response.json();
        
        if (data.success) {
            adminUsers = data.users || [];
            currentAdminPage = page;
            displayUsersList(adminUsers, data.has_more);
        } else {
            throw new Error(data.error || 'Ошибка загрузки пользователей');
        }
    } catch (error) {
        console.error('Load users error:', error);
        showErrorNotification('Ошибка загрузки списка пользователей');
    } finally {
        const loader = document.getElementById('usersListLoader');
        const content = document.getElementById('usersListContent');
        
        if (loader) loader.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }
}

// Отображение списка пользователей в модальном окне
function displayUsersList(users, hasMore = false) {
    const container = document.getElementById('usersListContainer');
    const loadMoreBtn = document.getElementById('loadMoreUsersBtn');
    
    if (!container) return;
    
    if (currentAdminPage === 1) {
        container.innerHTML = '';
    }
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-users text-4xl mb-2"></i>
                <p>Пользователи не найдены</p>
            </div>
        `;
        return;
    }
    
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'bg-gray-700/50 rounded-lg p-4 mb-3 border border-gray-600/30';
        
        const statusBadge = user.is_active ? 
            '<span class="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">Активен</span>' :
            '<span class="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full">Неактивен</span>';
        
        const staffBadge = user.is_staff ? 
            '<span class="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full ml-2">Админ</span>' : '';
        
        userCard.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <i class="fas fa-user text-white"></i>
                    </div>
                    <div>
                        <div class="flex items-center space-x-2">
                            <h4 class="font-semibold text-white">${escapeHtml(user.username)}</h4>
                            ${statusBadge}
                            ${staffBadge}
                        </div>
                        <p class="text-gray-400 text-sm mt-1">ID: ${user.id}</p>
                    </div>
                </div>
                <button class="user-actions-btn text-gray-400 hover:text-white p-1 rounded" data-user-id="${user.id}">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-xs mt-3">
                <div>
                    <p class="text-gray-400">Зарегистрирован</p>
                    <p class="text-white">${formatDate(user.date_joined)}</p>
                </div>
                <div>
                    <p class="text-gray-400">Последний вход</p>
                    <p class="text-white">${user.last_login ? formatDate(user.last_login) : 'Никогда'}</p>
                </div>
            </div>
            
            <div class="mt-3 pt-3 border-t border-gray-600/50">
                <div class="flex justify-between text-xs">
                    <div class="text-center">
                        <p class="text-gray-400">Транзакций</p>
                        <p class="text-white font-semibold">${user.transactions_count || 0}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-gray-400">Категорий</p>
                        <p class="text-white font-semibold">${user.categories_count || 0}</p>
                    </div>
                    <div class="text-center">
                        <p class="text-gray-400">Баланс</p>
                        <p class="text-white font-semibold">${user.balance || 0}</p>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(userCard);
    });
    
    // Показать/скрыть кнопку "Загрузить еще"
    if (loadMoreBtn) {
        if (hasMore) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden');
        }
    }
}

// Вспомогательные функции
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function getRandomColorClass() {
    const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Управление модальным окном
function toggleAdminUsersModal() {
    if (!adminUsersModal) return;
    
    if (adminUsersModal.classList.contains('hidden')) {
        // Открываем модалку с анимацией
        animateModal(adminUsersModal, true);
        currentAdminPage = 1;
        loadUsersList(1);
    } else {
        // Закрываем модалку с анимацией
        animateModal(adminUsersModal, false);
    }
}

// Загрузка следующих пользователей
function loadMoreUsers() {
    loadUsersList(currentAdminPage + 1);
}

// Инициализация обработчиков
function initAdminHandlers() {
    // Обработчик для кнопки загрузки еще
    const loadMoreBtn = document.getElementById('loadMoreUsersBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreUsers);
    }
    
    // Закрытие модального окна по клику вне области
    if (adminUsersModal) {
        adminUsersModal.addEventListener('click', function(e) {
            if (e.target === adminUsersModal) {
                animateModal(adminUsersModal, false);
            }
        });
    }


     // Добавляем обработчики для кнопок закрытия внутри модалки
    const closeButtons = adminUsersModal.querySelectorAll('[data-close="adminUsersModal"]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => animateModal(adminUsersModal, false));
    });
}


// Поиск пользователей
function searchUsers() {
    const searchInput = document.getElementById('usersSearchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (!searchTerm) {
        displayUsersList(adminUsers);
        return;
    }
    
    const filteredUsers = adminUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm) ||
        (user.email && user.email.toLowerCase().includes(searchTerm))
    );
    
    displayUsersList(filteredUsers, false);
}



 // Инициализация при загрузке документа
    document.addEventListener('DOMContentLoaded', function() {
        initAdminPanel();
    });

    // Экспорт функций для глобального использования
    window.toggleAdminUsersModal = toggleAdminUsersModal;
    window.loadMoreUsers = loadMoreUsers;
    window.searchUsers = searchUsers;

    window.adminPanelInitialized = true;
})();
