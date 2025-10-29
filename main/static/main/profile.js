// Новые обработчики с предотвращением всплытия
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing profile handlers');
    
    // Обработчик для кнопки удаления аккаунта в модалке профиля
    const deleteAccountBtn = document.querySelector('.delete-account-btn');
if (deleteAccountBtn) {
    console.log('Found delete account button by class, attaching handler');
    deleteAccountBtn.addEventListener('click', function(e) {
        console.log('Delete account button clicked');
        e.stopPropagation();
        e.preventDefault();
        handleDeleteAccount();
    });
}
    
    // Обработчик для кнопки экспорта в модалке профиля
    const exportDataBtn = document.querySelector('button[onclick*="handleExportData"]');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            handleExportData();
        });
        exportDataBtn.removeAttribute('onclick');
    }
    
    // Обработчик для кнопки редактирования в меню
    const editProfileBtn = document.querySelector('button[onclick*="openProfileModalFromMenu"]');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            openProfileModalFromMenu();
        });
        editProfileBtn.removeAttribute('onclick');
    }

    // Обработчики закрытия по клику вне модалок
    const profileModal = document.getElementById('profileModal');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    
    if (profileModal) {
        profileModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeProfileModal();
            }
        });
    }
    
    if (deleteAccountModal) {
        deleteAccountModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeDeleteAccountModal();
            }
        });
    }

    // ESC для закрытия
   document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const deleteModal = document.getElementById('deleteAccountModal');
            const profileModal = document.getElementById('profileModal');
            
            // Если открыта модалка удаления - возвращаем к профилю
            if (deleteModal && !deleteModal.classList.contains('hidden')) {
                backToProfileModal();
            } 
            // Если открыт профиль - закрываем его
            else if (profileModal && !profileModal.classList.contains('hidden')) {
                closeProfileModal();
            }
            // Закрываем меню в любом случае
            closeUserMenu();
        }
    });
});

// Функции без параметра event
function handleDeleteAccount() {
    const profileModal = document.getElementById('profileModal');
    const deleteModal = document.getElementById('deleteAccountModal');
    
    if (profileModal && deleteModal) {
        // просто прячем контент профиля
        const content = profileModal.querySelector('.modal-content');
        if (content) content.classList.add('hidden');

        // показываем удаление
        deleteModal.classList.remove('hidden');
    }
}



function handleExportData() {
    closeProfileModal();
    setTimeout(exportUserData, 300);
}

function openProfileModalFromMenu() {
    closeUserMenu();
    openProfileModal();
}


// Вместо closeDeleteAccountModal сделаем функцию возврата к профилю
function backToProfileModal() {
    console.log('backToProfileModal called');
    
    const profileModal = document.getElementById('profileModal');
    const deleteModal = document.getElementById('deleteAccountModal');
    
    if (profileModal && deleteModal) {
        deleteModal.classList.add('hidden');
        profileModal.classList.remove('hidden');
        console.log('Switched from delete to profile modal');
    }
}

function openProfileModal() {
    console.log('openProfileModal called');
    loadProfileInfo();

    const modal = document.getElementById('profileModal');
    if (modal) {
        // Показываем сам модальный контейнер
        modal.classList.remove('hidden');

        // Показываем содержимое, если оно случайно скрыто
        const content = modal.querySelector('.modal-content');
        if (content) content.classList.remove('hidden');

        console.log('Profile modal fully visible now');
    }
}

function closeProfileModal() {
    console.log('closeProfileModal called');
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.add('hidden');
        const content = modal.querySelector('.modal-content');
        if (content) content.classList.remove('hidden'); // восстановим на всякий случай
    }
}

function openDeleteAccountModal() {
    console.log('openDeleteAccountModal called - attempting to open modal');
    const modal = document.getElementById('deleteAccountModal');
    if (!modal) {
        console.error('Delete account modal not found!');
        return;
    }
    
    console.log('Delete account modal found, removing hidden class');
    modal.classList.remove('hidden');
    console.log('Modal should be visible now');
    
    // Даем время для отрисовки DOM перед поиском элементов
    setTimeout(() => {
        // Сбрасываем чекбокс и блокируем кнопку
        const confirmDelete = document.getElementById('confirmDelete');
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        
        console.log('Found elements:', {
            confirmDelete: !!confirmDelete,
            deleteAccountBtn: !!deleteAccountBtn
        });
        
        if (confirmDelete && deleteAccountBtn) {
            confirmDelete.checked = false;
            deleteAccountBtn.disabled = true;
            
            // Удаляем старые обработчики и добавляем новый
            confirmDelete.onchange = function() {
                console.log('Checkbox changed:', this.checked);
                deleteAccountBtn.disabled = !this.checked;
            };
            
            // Также добавляем обработчик click для надежности
            confirmDelete.onclick = function() {
                console.log('Checkbox clicked:', this.checked);
                deleteAccountBtn.disabled = !this.checked;
            };
        } else {
            console.error('Could not find confirmDelete or deleteAccountBtn elements');
        }
    }, 50);
}



function closeDeleteAccountModal() {
    const deleteModal = document.getElementById('deleteAccountModal');
    const profileModal = document.getElementById('profileModal');

    if (deleteModal) deleteModal.classList.add('hidden');
    if (profileModal) profileModal.classList.add('hidden');
}



function closeUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.add('hidden');
    }
}

// Убедитесь что функция animateModal существует
if (typeof animateModal === 'undefined') {
    function animateModal(modal, show) {
        if (!modal) return;
        
        if (show) {
            modal.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
        }
    }
}




// Функция для меню пользователя
// Функция для меню пользователя
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.toggle('hidden');
        
        // Закрытие меню при клике вне его
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && !e.target.closest('.user-menu-btn')) {
                menu.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }
        });
    }
}

// Экспорт данных
function exportUserData() {
    showSuccessNotification('Начинаем экспорт данных...');
    
    // Создаем скрытую ссылку для скачивания
    const link = document.createElement('a');
    link.href = '/export_user_data/';
    link.download = 'backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccessNotification('Экспорт завершен! Файл скачан.');
}

// Удаление аккаунта
function deleteAccount() {
    if (!document.getElementById('confirmDelete').checked) {
        showErrorNotification('Подтвердите удаление аккаунта');
        return;
    }

    const btn = document.getElementById('deleteAccountBtn');
    const originalText = btn.innerHTML;
    
    // Показываем загрузку
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Удаление...';

    fetch('/delete_account/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessNotification(data.message);
            setTimeout(() => {
                window.location.href = '/'; // Перенаправляем на главную
            }, 2000);
        } else {
            showErrorNotification(data.error);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showErrorNotification('Ошибка при удалении аккаунта');
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}









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
<div class="group bg-gray-800/50 rounded-xl p-4 border border-gray-600/30 hover:border-blue-500/30 transition-all duration-300 cursor-pointer" onclick="openProfileModal()">
    <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
            <div class="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">


                <i class="fa-solid fa-shield-cat text-blue-400 text-sm group-hover:text-blue-300"></i>
            </div>
            <div>
                <p class="text-white font-medium text-sm">Защитите ваш аккаунт!</p>
                <p class="text-gray-400 text-xs">Добавьте email для восстановления доступа!</p>
            </div>
        </div>
        <i class="fas fa-chevron-right text-gray-500 text-sm group-hover:text-blue-400 transition-colors"></i>
    </div>
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
    const profileModal = document.getElementById('profileModal');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    
    if (profileModal) {
        profileModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeProfileModal();
            }
        });
    }
    
    if (deleteAccountModal) {
        deleteAccountModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeDeleteAccountModal();
            }
        });
    }

    // Обработчик для кнопки меню пользователя
    const userMenuBtn = document.querySelector('.user-menu-btn');
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            toggleUserMenu();
        });
    }
    
    // Обработчик для кнопки редактирования профиля в меню
    const editProfileMenuBtn = document.querySelector('#userMenu button[onclick*="openProfileModalFromMenu"]');
    if (editProfileMenuBtn) {
        editProfileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            openProfileModalFromMenu();
        });
        editProfileMenuBtn.removeAttribute('onclick');
    }
    
    // Глобальный обработчик для чекбокса подтверждения удаления
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'confirmDelete') {
            const deleteAccountBtn = document.getElementById('deleteAccountBtn');
            if (deleteAccountBtn) {
                deleteAccountBtn.disabled = !e.target.checked;
                console.log('Global handler: checkbox changed, button disabled:', deleteAccountBtn.disabled);
            }
        }
    });
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