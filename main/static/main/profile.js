// Функции для модалки профиля
function openProfileModal() {
    loadProfileInfo();
    animateModal(document.getElementById('profileModal'), true);
    
    // Добавляем обработчик закрытия по ESC
    document.addEventListener('keydown', handleProfileModalEscape);
}

function closeProfileModal() {
    animateModal(document.getElementById('profileModal'), false);
    
    // Убираем обработчик ESC
    document.removeEventListener('keydown', handleProfileModalEscape);
}

function handleProfileModalEscape(e) {
    if (e.key === 'Escape') {
        closeProfileModal();
    }
}

// Закрытие по клику вне модалки
document.getElementById('profileModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeProfileModal();
    }
});

function loadProfileInfo() {
    fetch('/get_profile_info/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateProfileDisplay(data.profile);
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки профиля:', error);
        });
}

function updateProfileDisplay(profile) {
    // Заполняем поля формы
    document.getElementById('firstNameInput').value = profile.first_name || '';
    document.getElementById('emailInput').value = profile.email || '';
    document.getElementById('phoneInput').value = profile.phone || '';
    
    // Обновляем прогресс
    document.getElementById('completionPercentage').textContent = profile.completion_percentage + '%';
    document.getElementById('completionProgress').style.width = profile.completion_percentage + '%';
    
    // Обновляем уведомление в интерфейсе
    updateProfileNotification(profile);
}

function updateProfileNotification(profile) {
    const notification = document.getElementById('profileNotification');
    if (!notification) return;
    
    if (profile.completion_percentage < 50) {
        notification.innerHTML = `
            <div class="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <div class="flex items-center space-x-3">
                    <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                    <div>
                        <p class="text-white font-semibold">Заполните профиль</p>
                        <p class="text-yellow-300 text-sm">Добавьте email для восстановления доступа</p>
                    </div>
                </div>
                <button onclick="openProfileModal()" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition-colors">
                    Заполнить
                </button>
            </div>
        `;
        notification.classList.remove('hidden');
    } else if (profile.completion_percentage < 100) {
        notification.innerHTML = `
            <div class="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div class="flex items-center space-x-3">
                    <i class="fas fa-user-edit text-blue-400"></i>
                    <div>
                        <p class="text-white font-semibold">Профиль заполнен на ${profile.completion_percentage}%</p>
                        <p class="text-blue-300 text-sm">Можете добавить дополнительную информацию</p>
                    </div>
                </div>
                <button onclick="openProfileModal()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors">
                    Обновить
                </button>
            </div>
        `;
        notification.classList.remove('hidden');
    } else {
        notification.classList.add('hidden');
    }
}

// Обработчик формы профиля
document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfile();
        });
    }
});

function saveProfile() {
    const form = document.getElementById('profileForm');
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Показываем загрузку
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Сохранение...';
    
    fetch('/update_profile/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessNotification(data.message);
            updateProfileDisplay(data.profile);
            setTimeout(() => {
                animateModal(document.getElementById('profileModal'), false);
            }, 1000);
        } else {
            showErrorNotification(data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showErrorNotification('Ошибка сохранения');
    })
    .finally(() => {
        // Восстанавливаем кнопку
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем информацию о профиле
    loadProfileInfo();
    
    // Показываем уведомление о профиле для новых пользователей
    setTimeout(() => {
        if (!window.profileChecked) {
            loadProfileInfo();
            window.profileChecked = true;
        }
    }, 2000);
});