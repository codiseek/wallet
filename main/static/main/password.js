// Переменные для управления модалкой пароля
let passwordModalOpen = false;
let requireCurrentPassword = false;
// Глобальная переменная для отслеживания состояния пароля
window.passwordChanged = false;

// Обновляем функцию openPasswordModal для сброса состояния кнопки
function openPasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    passwordModalOpen = true;
    
    // Сброс формы
    resetPasswordForm();
    
    // Сбрасываем состояние кнопки
    resetSavePasswordButton();
    
    // Скрываем уведомления
    hidePasswordNotification();
    
    // Проверяем, нужно ли показывать поле текущего пароля
    checkPasswordChangeStatus();
    
    // АНИМАЦИЯ ОТКРЫТИЯ МОДАЛКИ
    animateModal(modal, true);
}


function closePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    passwordModalOpen = false;
    
    // АНИМАЦИЯ ЗАКРЫТИЯ МОДАЛКИ
    animateModal(modal, false);
}

// Функция обновления интерфейса модального окна
function updatePasswordModalInterface() {
    const currentPasswordField = document.getElementById('currentPasswordField');
    
    if (requireCurrentPassword) {
        currentPasswordField.classList.remove('hidden');
        // Добавляем анимацию появления
        currentPasswordField.style.opacity = '0';
        currentPasswordField.style.transition = 'opacity 0.3s ease-in-out';
        
        setTimeout(() => {
            currentPasswordField.style.opacity = '1';
        }, 10);
    } else {
        currentPasswordField.classList.add('hidden');
    }
    
    // Обновляем состояние кнопки
    updateSaveButton();
}

// Функция сброса формы пароля
function resetPasswordForm() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('currentPasswordError').classList.add('hidden');
    document.getElementById('passwordMatchMessage').classList.add('hidden');
    resetPasswordStrength();
}

// Показать уведомление в модалке
function showPasswordNotification(message, type) {
    const notification = document.getElementById('passwordNotification');
    const icon = document.getElementById('passwordNotificationIcon');
    const text = document.getElementById('passwordNotificationText');
    
    // Скрываем предыдущие ошибки
    document.getElementById('currentPasswordError').classList.add('hidden');
    
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
            hidePasswordNotification();
        }, 3000);
    }
}

// Скрыть уведомление в модалке
function hidePasswordNotification() {
    const notification = document.getElementById('passwordNotification');
    notification.classList.add('hidden');
}

// Проверка статуса смены пароля
function checkPasswordChangeStatus() {
    // Загружаем информацию о профиле
    fetch('/get_profile_info/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const requireCurrent = data.profile.password_changed;
                requireCurrentPassword = requireCurrent;
                
                // ОБНОВЛЯЕМ ИНТЕРФЕЙС НА ОСНОВЕ ПОЛУЧЕННЫХ ДАННЫХ
                updatePasswordModalInterface();
            }
        })
        .catch(error => {
            console.error('Error checking password status:', error);
        });
}

// Функция для переключения видимости пароля
function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = field.nextElementSibling.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Функция проверки сложности пароля
function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.getElementById('passwordStrengthBar');
    const strengthText = document.getElementById('passwordStrengthText');
    
    // Скрываем уведомления при изменении пароля
    hidePasswordNotification();
    
    // Сброс проверок
    resetChecks();
    
    if (password.length === 0) {
        strengthBar.style.width = '0%';
        strengthBar.className = 'h-2 rounded-full transition-all duration-300';
        strengthText.textContent = 'Не задан';
        strengthText.className = 'text-xs font-medium text-gray-400';
        return;
    }
    
    let strength = 0;
    
    // Проверка длины
    if (password.length >= 8) {
        strength += 20;
        document.getElementById('lengthCheck').className = 'fas fa-check text-green-400 mr-2 text-xs';
    }
    
    // Проверка заглавных букв
    if (/[A-Z]/.test(password)) {
        strength += 20;
        document.getElementById('uppercaseCheck').className = 'fas fa-check text-green-400 mr-2 text-xs';
    }
    
    // Проверка строчных букв
    if (/[a-z]/.test(password)) {
        strength += 20;
        document.getElementById('lowercaseCheck').className = 'fas fa-check text-green-400 mr-2 text-xs';
    }
    
    // Проверка цифр
    if (/[0-9]/.test(password)) {
        strength += 20;
        document.getElementById('numberCheck').className = 'fas fa-check text-green-400 mr-2 text-xs';
    }
    
    // Проверка специальных символов
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        strength += 20;
        document.getElementById('specialCheck').className = 'fas fa-check text-green-400 mr-2 text-xs';
    }
    
    // Обновление индикатора
    strengthBar.style.width = strength + '%';
    
    // Определение уровня сложности и цвета
    if (strength <= 20) {
        strengthBar.className = 'h-2 rounded-full transition-all duration-300 bg-red-500';
        strengthText.textContent = 'Слабый';
        strengthText.className = 'text-xs font-medium text-red-400';
    } else if (strength <= 60) {
        strengthBar.className = 'h-2 rounded-full transition-all duration-300 bg-yellow-500';
        strengthText.textContent = 'Средний';
        strengthText.className = 'text-xs font-medium text-yellow-400';
    } else {
        strengthBar.className = 'h-2 rounded-full transition-all duration-300 bg-green-500';
        strengthText.textContent = 'Сильный';
        strengthText.className = 'text-xs font-medium text-green-400';
    }
    
    // Проверка совпадения паролей
    checkPasswordMatch();
    updateSaveButton();
}

// Функция сброса проверок
function resetChecks() {
    const checks = ['lengthCheck', 'uppercaseCheck', 'lowercaseCheck', 'numberCheck', 'specialCheck'];
    checks.forEach(checkId => {
        document.getElementById(checkId).className = 'fas fa-times text-red-400 mr-2 text-xs';
    });
}

// Функция сброса индикатора сложности
function resetPasswordStrength() {
    const strengthBar = document.getElementById('passwordStrengthBar');
    const strengthText = document.getElementById('passwordStrengthText');
    
    strengthBar.style.width = '0%';
    strengthBar.className = 'h-2 rounded-full transition-all duration-300';
    strengthText.textContent = 'Не задан';
    strengthText.className = 'text-xs font-medium text-gray-400';
    
    resetChecks();
    document.getElementById('passwordMatchMessage').classList.add('hidden');
    document.getElementById('currentPasswordError').classList.add('hidden');
}

// Функция проверки совпадения паролей
function checkPasswordMatch() {
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageElement = document.getElementById('passwordMatchMessage');
    
    if (confirmPassword.length === 0) {
        messageElement.classList.add('hidden');
        return;
    }
    
    if (password === confirmPassword) {
        messageElement.textContent = 'Пароли совпадают';
        messageElement.className = 'text-xs mt-1 text-green-400';
        messageElement.classList.remove('hidden');
    } else {
        messageElement.textContent = 'Пароли не совпадают';
        messageElement.className = 'text-xs mt-1 text-red-400';
        messageElement.classList.remove('hidden');
    }
    
    updateSaveButton();
}

// Функция обновления состояния кнопки сохранения
function updateSaveButton() {
    const saveBtn = document.getElementById('savePasswordBtn');
    const currentPassword = document.getElementById('currentPassword').value;
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Проверяем условия в зависимости от необходимости текущего пароля
    let isValid = false;
    
    if (requireCurrentPassword) {
        // Если требуется текущий пароль, проверяем все поля
        isValid = currentPassword.length > 0 && 
                 password.length >= 8 && 
                 password === confirmPassword;
    } else {
        // Если не требуется текущий пароль, проверяем только новые пароли
        isValid = password.length >= 8 && password === confirmPassword;
    }
    
    saveBtn.disabled = !isValid;
    if (isValid) {
        saveBtn.classList.remove('bg-blue-600', 'hover:bg-blue-500');
        saveBtn.classList.add('bg-green-600', 'hover:bg-green-500');
    } else {
        saveBtn.classList.remove('bg-green-600', 'hover:bg-green-500');
        saveBtn.classList.add('bg-blue-600', 'hover:bg-blue-500');
    }
}

/*
function saveNewPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const saveBtn = document.getElementById('savePasswordBtn');
    
    // Дополнительная проверка
    if (password.length < 8) {
        showPasswordNotification('Пароль должен содержать минимум 8 символов', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showPasswordNotification('Пароли не совпадают', 'error');
        return;
    }
    
    // Если требуется текущий пароль, проверяем его наличие
    if (requireCurrentPassword && !currentPassword) {
        showPasswordNotification('Введите текущий пароль', 'error');
        return;
    }
    
    // Показываем индикатор загрузки
    showPasswordNotification('Изменение пароля...', 'loading');
    
    // Блокируем кнопку и меняем текст
    const originalHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Сохранение...';
    saveBtn.disabled = true;
    
    // Получаем CSRF токен
    const csrfToken = getCsrfToken();
    
    // Отправка запроса на сервер
    const formData = new FormData();
    formData.append('new_password', password);
    if (requireCurrentPassword) {
        formData.append('current_password', currentPassword);
    }
    formData.append('csrfmiddlewaretoken', csrfToken);
    
    fetch('/change-password/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Показываем успешное уведомление
            showPasswordNotification(data.message || 'Пароль успешно изменен!', 'success');
            
            // Восстанавливаем кнопку с зеленым цветом на короткое время
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Успешно!';
            saveBtn.classList.remove('bg-blue-600', 'hover:bg-blue-500');
            saveBtn.classList.add('bg-green-600', 'hover:bg-green-500');
            
            // ОБНОВЛЯЕМ СТАТУС ТРЕБОВАНИЯ ТЕКУЩЕГО ПАРОЛЯ
            requireCurrentPassword = true;
            window.passwordChanged = true; // Устанавливаем глобальный флаг
            
            // ОБНОВЛЯЕМ ИНТЕРФЕЙС - ПОКАЗЫВАЕМ ПОЛЕ ТЕКУЩЕГО ПАРОЛЯ
            updatePasswordModalInterface();
            
            // СБРАСЫВАЕМ ФОРМУ
            resetPasswordForm();
            
            // ВАЖНО: Ожидаем обновление профиля перед закрытием модалки
            return loadProfileInfo().then((profile) => {
                // ВАЖНОЕ ИСПРАВЛЕНИЕ: Принудительно обновляем уведомление профиля
                if (typeof updateProfileNotification === 'function') {
                    updateProfileNotification(profile);
                }
                
                // Закрываем модалку через 250 мс
                setTimeout(() => {
                    closePasswordModal();
                    // Сбрасываем кнопку к исходному состоянию
                    saveBtn.innerHTML = originalHtml;
                    updateSaveButton();
                }, 250);
            });
        } else {
            throw new Error(data.error || 'Ошибка при изменении пароля');
        }
    })
    .catch(error => {
        console.error('Error changing password:', error);
        
        // Показываем ошибку в поле текущего пароля, если это ошибка аутентификации
        if (error.message.includes('текущий пароль') || error.message.includes('неверный пароль')) {
            const errorElement = document.getElementById('currentPasswordError');
            errorElement.textContent = error.message;
            errorElement.classList.remove('hidden');
            hidePasswordNotification(); // Скрываем основное уведомление
        } else {
            showPasswordNotification(error.message, 'error');
        }
        
        // Восстанавливаем кнопку
        saveBtn.innerHTML = originalHtml;
        updateSaveButton();
    });
}
*/


function resetSavePasswordButton() {
    const saveBtn = document.getElementById('savePasswordBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i><span>Сохранить</span>';
        saveBtn.classList.remove('bg-green-600', 'hover:bg-green-500');
        saveBtn.classList.add('bg-blue-600', 'hover:bg-blue-500');
    }
}


// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Находим кнопку "Пароль" в меню и добавляем обработчик
    const passwordMenuBtn = document.getElementById('passwordMenuBtn');
    if (passwordMenuBtn) {
        passwordMenuBtn.onclick = openPasswordModal;
    }
    
    /*
    const saveBtn = document.getElementById('savePasswordBtn');
    if (saveBtn) {
        saveBtn.onclick = function(event) {
            event.preventDefault();
            saveNewPassword();
        };
    }
    */
    
    // Добавляем обработчик изменения поля текущего пароля
    const currentPasswordField = document.getElementById('currentPassword');
    if (currentPasswordField) {
        currentPasswordField.addEventListener('input', function() {
            hidePasswordNotification();
            document.getElementById('currentPasswordError').classList.add('hidden');
            updateSaveButton();
        });
    }
    
    // Добавляем обработчики для полей нового пароля
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');
    
    if (newPasswordField) {
        newPasswordField.addEventListener('input', function() {
            hidePasswordNotification();
            updateSaveButton();
        });
    }
    
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', function() {
            hidePasswordNotification();
            updateSaveButton();
        });
    }
});