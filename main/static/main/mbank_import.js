

// Функция для начала импорта (вызывается из модалки)
function startMbankImport() {
    closeMbankInstructionModal();
    
    // Даем небольшую задержку перед открытием выбора файла
    setTimeout(() => {
        const fileInput = document.getElementById('mbankFileInput');
        if (fileInput) {
            fileInput.click();
        }
    }, 300);
}


// Обработчик выбора файла
// Найти этот код в panel_page.html и заменить его:

// Обработчик выбора файла
document.getElementById('mbankFileInput').addEventListener('change', function(event) {
    handleMbankFileImport(event);
});

// Функция для получения CSRF токена
function getCSRFToken() {
    const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfInput ? csrfInput.value : '';
}


// Обработчик импорта файла Мбанка
function handleMbankFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Проверяем расширение файла
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(fileExtension)) {
        if (window.showErrorNotification) {
            showErrorNotification('Поддерживаются только Excel файлы (XLSX, XLS)');
        }
        return;
    }

    // УДАЛЕНО ВСЕ ПОДТВЕРЖДЕНИЯ - сразу начинаем импорт

    const importMbankBtn = document.getElementById('importMbankBtn');
    if (importMbankBtn) {
        const originalHTML = importMbankBtn.innerHTML;
        
        // Обновляем кнопку - показываем анимацию загрузки
        importMbankBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span class="font-semibold text-sm">Импорт...</span>
        `;
        importMbankBtn.disabled = true;

        if (window.showLoadingNotification) {
            showLoadingNotification('Импорт данных из Мбанка...');
        }

        const formData = new FormData();
        formData.append('mbank_file', file);

        fetch('/import/mbank/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCSRFToken()
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Успех - показываем "Успешно импортировано!" на кнопке
                importMbankBtn.innerHTML = `
                    <i class="fas fa-check"></i>
                    <span class="font-semibold text-sm">Успешно импортировано!</span>
                `;
                
                if (window.showSuccessNotification) {
                    showSuccessNotification(data.message || `Успешно импортировано ${data.count} транзакций!`);
                }
                
                // Перезагрузка через 2 секунды
                setTimeout(() => window.location.href = '/', 2000);
            } else {
                throw new Error(data.message || 'Ошибка импорта');
            }
        })
        .catch(error => {
            console.error('Mbank import error:', error);
            if (window.showErrorNotification) {
                showErrorNotification('Ошибка при импорте: ' + error.message);
            }
            // Восстанавливаем кнопку
            importMbankBtn.innerHTML = originalHTML;
            importMbankBtn.disabled = false;
        });
    }
}



// Импорт из Мбанка
function importMbank() {
    
    // Создаем файловый input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.xlsx,.xls'; // Добавил .xls
    fileInput.style.display = 'none';
    
    // Добавляем обработчик события change
    fileInput.addEventListener('change', function(event) {
        handleMbankFileImport(event, fileInput);
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    
    // Удаляем input после использования
    setTimeout(() => {
        if (document.body.contains(fileInput)) {
            document.body.removeChild(fileInput);
        }
    }, 1000);
}

// Функция для получения CSRF токена
function getCSRFToken() {
    const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
    if (csrfInput) {
        return csrfInput.value;
    }
    
    // Альтернативный способ получения CSRF токена
    const csrfCookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    if (csrfCookie) {
        return csrfCookie.split('=')[1];
    }
    
    console.error('CSRF token not found');
    return '';
}

// Обработчик выбора файла для импорта Мбанка
function handleMbankFileImport(event, fileInput) {
    
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    
    // Проверяем расширение файла
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) { // Добавил .xls
        if (window.showErrorNotification) {
            showErrorNotification('Поддерживаются только CSV и Excel файлы (CSV, XLSX, XLS)');
        }
        return;
    }



    
    // Находим кнопку импорта Мбанка
    const importMbankBtn = document.getElementById('importMbankBtn');
    
    if (importMbankBtn) {
        // Сохраняем оригинальное состояние
        const originalHTML = importMbankBtn.innerHTML;
        const originalClasses = importMbankBtn.className;
        
        // Обновляем кнопку
        importMbankBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin text-xl"></i>
            <span class="font-semibold text-sm">Импорт...</span>
        `;
        importMbankBtn.className = originalClasses + ' cursor-not-allowed opacity-75';
        importMbankBtn.disabled = true;
        
        // Показываем уведомление
        if (window.showLoadingNotification) {
            showLoadingNotification('Импорт данных из Мбанка...');
        }
        
        const formData = new FormData();
        formData.append('mbank_file', file);
        
        
        fetch('/import/mbank/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCSRFToken()
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
                // Успех
                importMbankBtn.innerHTML = `
                    <i class="fas fa-check text-xl"></i>
                    <span class="font-semibold text-sm">Успешно импортировано!</span>
                `;
                importMbankBtn.className = originalClasses.replace('bg-purple-600', 'bg-green-600') + ' cursor-not-allowed';
                
                if (window.showSuccessNotification) {
                    showSuccessNotification(data.message || `Успешно импортировано ${data.count} транзакций из Мбанка!`);
                }
                
                // Перезагрузка через 2 секунды
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                // Ошибка
                throw new Error(data.message || 'Неизвестная ошибка');
            }
        })
        .catch(error => {
            console.error('Mbank import error:', error);
            
            // Восстанавливаем кнопку с ошибкой
            importMbankBtn.innerHTML = `
                <i class="fas fa-times text-xl"></i>
                <span class="font-semibold text-sm">Ошибка</span>
            `;
            importMbankBtn.className = originalClasses.replace('bg-purple-600', 'bg-red-600');
            
            // Показываем ошибку
            if (window.showErrorNotification) {
                showErrorNotification('Ошибка при импорте из Мбанка: ' + error.message);
            }
            
            // Восстанавливаем кнопку через 3 секунды
            setTimeout(() => {
                importMbankBtn.innerHTML = originalHTML;
                importMbankBtn.className = originalClasses;
                importMbankBtn.disabled = false;
            }, 3000);
        })
        .finally(() => {
            // Удаляем файловый input
            if (fileInput && document.body.contains(fileInput)) {
                document.body.removeChild(fileInput);
            }
        });
    } else {
        console.error('Mbank import button not found');
        if (window.showErrorNotification) {
            showErrorNotification('Ошибка: не найдена кнопка импорта Мбанка');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
   
    // Проверяем, что кнопки найдены
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importMbankBtn = document.getElementById('importMbankBtn');
    
    
    // Добавляем обработчики, если они не установлены через onclick
    if (exportBtn && !exportBtn.onclick) {
        exportBtn.addEventListener('click', exportData);
    }
    if (importBtn && !importBtn.onclick) {
        importBtn.addEventListener('click', importData);
    }
    if (importMbankBtn && !importMbankBtn.onclick) {
        importMbankBtn.addEventListener('click', importMbank);
    }
});