// Новые обработчики с предотвращением всплытия
document.addEventListener('DOMContentLoaded', function() {
    
    // Обработчик для кнопки удаления аккаунта в модалке профиля
    const deleteAccountBtn = document.querySelector('.delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', function(e) {
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
                backToProfileModal();
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
            }
        }
    });

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

    // Обработчик для формы профиля
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            saveProfile();
        });
    }

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

function handleExportData() {
    closeProfileModal();
    setTimeout(exportUserData, 300);
}

function openProfileModalFromMenu() {
    closeUserMenu();
    setTimeout(() => {
        openProfileModal();
    }, 100);
}



function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        if (typeof animateModal === 'function') {
            animateModal(modal, false);
        } else {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }
}

function handleDeleteAccount() {
    const profileModal = document.getElementById('profileModal');
    const deleteModal = document.getElementById('deleteAccountModal');
    
    if (profileModal && deleteModal) {
        const content = profileModal.querySelector('.modal-content');
        if (content) content.classList.add('hidden');
        deleteModal.classList.remove('hidden');
    }
}

function backToProfileModal() {
    const profileModal = document.getElementById('profileModal');
    const deleteModal = document.getElementById('deleteAccountModal');
    
    if (profileModal && deleteModal) {
        if (typeof animateModal === 'function') {
            animateModal(deleteModal, false);
        } else {
            deleteModal.classList.add('hidden');
            deleteModal.style.display = 'none';
        }
        
        setTimeout(() => {
            if (typeof animateModal === 'function') {
                animateModal(profileModal, true);
            } else {
                profileModal.style.display = 'flex';
                profileModal.classList.remove('hidden');
            }
        }, 300);
    }
}

function openDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (!modal) {
        return;
    }
    
    modal.classList.remove('hidden');
    
    setTimeout(() => {
        const confirmDelete = document.getElementById('confirmDelete');
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        
        if (confirmDelete && deleteAccountBtn) {
            confirmDelete.checked = false;
            deleteAccountBtn.disabled = true;
            
            confirmDelete.onchange = function() {
                deleteAccountBtn.disabled = !this.checked;
            };
            
            confirmDelete.onclick = function() {
                deleteAccountBtn.disabled = !this.checked;
            };
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

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        menu.classList.toggle('hidden');
        
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && !e.target.closest('.user-menu-btn')) {
                menu.classList.add('hidden');
                document.removeEventListener('click', closeMenu);
            }
        });
    }
}

function exportUserData() {
    showSuccessNotification('Начинаем экспорт данных...');
    
    const link = document.createElement('a');
    link.href = '/export_user_data/';
    link.download = 'backup.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccessNotification('Экспорт завершен! Файл скачан.');
}

/*
function deleteAccount() {
    const passwordInput = document.getElementById('confirmPasswordDelete');
    const password = passwordInput.value.trim();
    
    if (!password) {
        showErrorNotification('Введите пароль для подтверждения');
        return;
    }

    if (!document.getElementById('confirmDelete').checked) {
        showErrorNotification('Подтвердите удаление аккаунта');
        return;
    }

    const btn = document.getElementById('deleteAccountBtn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Удаление...';

    fetch('/delete_account/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessNotification(data.message);
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showErrorNotification(data.error);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    })
    .catch(error => {
        showErrorNotification('Ошибка при удалении аккаунта');
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}


*/


function loadProfileInfo() {
    return fetch('/get_profile_info/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateProfileDisplay(data.profile);
                updateProfileNotification(data.profile);
                return data.profile;
            }
            throw new Error('Failed to load profile info');
        })
        .catch(error => {
            throw error;
        });
}

function refreshProfileNotification() {
    loadProfileInfo().then(profile => {
        updateProfileNotification(profile);
    }).catch(error => {});
}

function updateProfileDisplay(profile) {
    document.getElementById('firstNameInput').value = profile.first_name || '';
    document.getElementById('emailInput').value = profile.email || '';
    document.getElementById('phoneInput').value = profile.phone || '';
    
    updateProfileNotification(profile);
}

function updateProfileNotification(profile) {
    const notification = document.getElementById('profileNotification');
    if (!notification) return;
    
    const hasEmail = profile.email && profile.email.trim() !== '';
    const hasPasswordChanged = profile.password_changed;
    
    if (hasEmail && hasPasswordChanged) {
        if (!notification.classList.contains('hidden')) {
            notification.style.opacity = '1';
            notification.style.transition = 'all 0.5s ease-in-out';
            
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(-10px)';
            }, 100);
            
            setTimeout(() => {
                notification.classList.add('hidden');
                notification.style.opacity = '';
                notification.style.transform = '';
            }, 600);
        }
        return;
    }
    
    const notificationHTML = `
<div class="group bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-4 border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300">
    <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <i class="fa-solid fa-shield-halved text-white text-sm"></i>
            </div>
            <div>
                <p class="text-white font-semibold text-sm">Защитите ваш аккаунт!</p>
                <p class="text-blue-300 text-xs">Добавьте email и установите пароль для безопасности</p>
            </div>
        </div>
    </div>
    
    <div class="flex space-x-3">
        ${!hasEmail ? `
        <button onclick="openProfileModal()" class="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-2">
            <i class="fas fa-envelope text-xs"></i>
            <span>Добавить почту</span>
        </button>
        ` : ''}
        
        ${!hasPasswordChanged ? `
        <button onclick="openPasswordModal()" class="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-2">
            <i class="fas fa-lock text-xs"></i>
            <span>Придумать пароль</span>
        </button>
        ` : ''}
    </div>
    
    ${hasEmail || hasPasswordChanged ? `
    <div class="mt-3 pt-3 border-t border-blue-500/20">
        <div class="flex items-center space-x-2 text-green-400 text-xs">
            <i class="fas fa-check-circle"></i>
            <span>${hasEmail ? '✓ Email добавлен' : ''}${hasEmail && hasPasswordChanged ? ', ' : ''}${hasPasswordChanged ? 'Пароль установлен' : ''}</span>
        </div>
    </div>
    ` : ''}
</div>
    `;
    
    if (notification.classList.contains('hidden')) {
        notification.innerHTML = notificationHTML;
        notification.classList.remove('hidden');
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
            notification.style.transition = 'all 0.5s ease-in-out';
        }, 50);
    } else {
        notification.style.opacity = '0.7';
        setTimeout(() => {
            notification.innerHTML = notificationHTML;
            notification.style.opacity = '1';
        }, 300);
    }
}

function checkDeleteConditions() {
    const passwordInput = document.getElementById('confirmPasswordDelete');
    const confirmCheckbox = document.getElementById('confirmDelete');
    const deleteButton = document.getElementById('deleteAccountBtn');
    const passwordMessage = document.getElementById('passwordDeleteMessage');
    
    const hasPassword = passwordInput.value.trim() !== '';
    const isConfirmed = confirmCheckbox.checked;
    
    if (hasPassword) {
        passwordMessage.textContent = 'Пароль введен';
        passwordMessage.className = 'text-xs mt-1 text-green-400';
        passwordMessage.classList.remove('hidden');
    } else {
        passwordMessage.textContent = 'Введите пароль для подтверждения';
        passwordMessage.className = 'text-xs mt-1 text-red-400';
        passwordMessage.classList.remove('hidden');
    }
    
    deleteButton.disabled = !(hasPassword && isConfirmed);
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}


// Функции для уведомлений в модалке профиля
function showProfileNotification(message, type) {
    const notification = document.getElementById('profileNotificationModal');
    const icon = document.getElementById('profileNotificationIcon');
    const text = document.getElementById('profileNotificationText');

    // Устанавливаем стили в зависимости от типа
    if (type === 'success') {
        notification.className = 'mb-4 rounded-lg p-3 bg-green-500/10 border border-green-500/30';
        icon.className = 'fas fa-check-circle text-green-400';
        text.className = 'text-sm font-medium text-green-400';
    } else if (type === 'error') {
        notification.className = 'mb-4 rounded-lg p-3 bg-red-500/10 border border-red-500/30';
        icon.className = 'fas fa-exclamation-circle text-red-400';
        text.className = 'text-sm font-medium text-red-400';
    } else if (type === 'loading') {
        notification.className = 'mb-4 rounded-lg p-3 bg-blue-500/10 border border-blue-500/30';
        icon.className = 'fas fa-spinner fa-spin text-blue-400';
        text.className = 'text-sm font-medium text-blue-400';
    }

    text.textContent = message;
    notification.classList.remove('hidden');

    // Автоматически скрываем успешные уведомления через 3 секунды
    if (type === 'success') {
        setTimeout(() => {
            hideProfileNotification();
        }, 3000);
    }
}

function hideProfileNotification() {
    const notification = document.getElementById('profileNotificationModal');
    notification.classList.add('hidden');
}

// Функция сброса состояния кнопки сохранения
function resetSaveProfileButton() {
    const submitBtn = document.getElementById('saveProfileBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Сохранить';
        submitBtn.classList.remove('bg-green-600', 'hover:bg-green-500');
        submitBtn.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'hover:from-blue-600', 'hover:to-purple-700');
    }
}

// Функция проверки заполнения полей
function validateProfileForm() {
    const firstName = document.getElementById('firstNameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const phone = document.getElementById('phoneInput').value.trim();
    
    // Проверяем, что хотя бы одно поле заполнено
    if (!firstName && !email && !phone) {
        showProfileNotification('Заполните хотя бы одно поле для сохранения профиля', 'error');
        return false;
    }
    
    // Дополнительная проверка email, если он заполнен
    if (email && !isValidEmail(email)) {
        showProfileNotification('Введите корректный email адрес', 'error');
        return false;
    }
    
    return true;
}

// Функция проверки email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function saveProfile() {
    // Проверяем заполнение полей перед отправкой
    if (!validateProfileForm()) {
        return;
    }

    const form = document.getElementById('profileForm');
    const formData = new FormData(form);
    const submitBtn = document.getElementById('saveProfileBtn');
    const originalText = submitBtn.innerHTML;
    
    // Показываем уведомление о загрузке
    showProfileNotification('Сохранение профиля...', 'loading');
    
    // Блокируем кнопку и меняем текст
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Сохранение...';
    
    fetch('/update_profile/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Показываем успешное уведомление
            showProfileNotification(data.message || 'Профиль успешно сохранен!', 'success');
            updateProfileDisplay(data.profile);
            
            // Восстанавливаем кнопку с зеленым цветом на короткое время
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Успешно!';
            submitBtn.classList.remove('bg-gradient-to-r', 'from-blue-500', 'to-purple-600', 'hover:from-blue-600', 'hover:to-purple-700');
            submitBtn.classList.add('bg-green-600', 'hover:bg-green-500');
            
            return loadProfileInfo().then(freshProfile => {
                updateProfileNotification(freshProfile);
                
                // Закрываем модалку через 250 мс
                setTimeout(() => {
                    const modal = document.getElementById('profileModal');
                    if (modal && typeof animateModal === 'function') {
                        animateModal(modal, false);
                    } else {
                        closeProfileModal();
                    }
                }, 250);
            });
        } else {
            throw new Error(data.error || 'Ошибка сохранения');
        }
    })
    .catch(error => {
        // Показываем уведомление об ошибке
        showProfileNotification('Ошибка сохранения: ' + error.message, 'error');
        
        // Восстанавливаем кнопку при ошибке
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// Обновляем функцию openProfileModal для сброса состояния
function openProfileModal() {
    loadProfileInfo();

    // Сбрасываем состояние кнопки
    resetSaveProfileButton();
    
    // Скрываем уведомления при открытии модалки
    hideProfileNotification();

    const modal = document.getElementById('profileModal');
    if (modal) {
        if (typeof animateModal === 'function') {
            animateModal(modal, true);
        } else {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
        }
    }
}

// Добавляем обработчики для полей ввода, чтобы скрывать ошибки при вводе
document.addEventListener('DOMContentLoaded', function() {
    const firstNameInput = document.getElementById('firstNameInput');
    const emailInput = document.getElementById('emailInput');
    const phoneInput = document.getElementById('phoneInput');
    
    if (firstNameInput) {
        firstNameInput.addEventListener('input', function() {
            hideProfileNotification();
        });
    }
    
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            hideProfileNotification();
        });
    }
    
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            hideProfileNotification();
        });
    }
});

