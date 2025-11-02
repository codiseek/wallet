// Переменная для отслеживания состояния импорта
let isImporting = false;

// Функция для экспорта данных
function exportData() {
    if (isImporting) return;
    
    if (window.showLoadingNotification) {
        showLoadingNotification('Подготовка данных для экспорта...');
    }
    
    fetch('/export-data/', {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка экспорта: ' + response.status);
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        if (window.showSuccessNotification) {
            showSuccessNotification('Данные успешно экспортированы!');
        }
    })
    .catch(error => {
        if (window.showErrorNotification) {
            showErrorNotification('Ошибка при экспорте данных: ' + error.message);
        }
    });
}

// Функция для импорта данных
function importData() {
    if (isImporting) {
        return;
    }
    
    // Создаем файловый input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    // Добавляем обработчик события change
    fileInput.addEventListener('change', function(event) {
        handleFileImport(event, fileInput);
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

// Обработчик выбора файла для импорта
function handleFileImport(event, fileInput) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    // Подтверждение импорта
    if (!confirm('ВНИМАНИЕ: При импорте будут перезаписаны все текущие данные. Продолжить?')) {
        return;
    }

    // Находим кнопку импорта
    const importBtn = document.getElementById('importBtn');
    
    if (importBtn) {
        // Сохраняем оригинальное состояние
        const originalHTML = importBtn.innerHTML;
        const originalClasses = importBtn.className;
        
        // Обновляем кнопку
        importBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin text-2xl"></i>
            <span class="font-medium text-sm">Импорт...</span>
            <span class="text-xs text-blue-200 opacity-80">Идет загрузка</span>
        `;
        importBtn.className = originalClasses.replace('bg-green-600', 'bg-blue-600') + ' cursor-not-allowed';
        importBtn.disabled = true;
        
        // Устанавливаем флаг импорта
        isImporting = true;
        
        // Показываем уведомление
        if (window.showLoadingNotification) {
            showLoadingNotification('Импорт данных... Это может занять несколько секунд');
        }
        
        const formData = new FormData();
        formData.append('backup_file', file);
        
        fetch('/import-data/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Успех
                importBtn.innerHTML = `
                    <i class="fas fa-check text-2xl"></i>
                    <span class="font-medium text-sm">Успешно!</span>
                    <span class="text-xs text-green-200 opacity-80">Перезагрузка...</span>
                `;
                importBtn.className = originalClasses.replace('bg-green-600', 'bg-green-700') + ' cursor-not-allowed';
                
                if (window.showSuccessNotification) {
                    showSuccessNotification(data.message || 'Данные успешно импортированы!');
                }
                
                // Перезагрузка через 2 секунды
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                // Ошибка
                throw new Error(data.error || 'Неизвестная ошибка');
            }
        })
        .catch(error => {
            // Восстанавливаем кнопку с ошибкой
            importBtn.innerHTML = `
                <i class="fas fa-times text-2xl"></i>
                <span class="font-medium text-sm">Ошибка</span>
                <span class="text-xs text-red-200 opacity-80">Нажмите снова</span>
            `;
            importBtn.className = originalClasses.replace('bg-green-600', 'bg-red-600');
            
            // Показываем ошибку
            if (window.showErrorNotification) {
                showErrorNotification('Ошибка при импорте данных: ' + error.message);
            }
            
            // Восстанавливаем кнопку через 3 секунды
            setTimeout(() => {
                importBtn.innerHTML = originalHTML;
                importBtn.className = originalClasses;
                importBtn.disabled = false;
                isImporting = false;
            }, 3000);
        })
        .finally(() => {
            // Удаляем файловый input
            if (fileInput && document.body.contains(fileInput)) {
                document.body.removeChild(fileInput);
            }
        });
    } else {
        if (window.showErrorNotification) {
            showErrorNotification('Ошибка: не найдена кнопка импорта');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, что кнопки найдены
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    
    // Добавляем обработчики, если они не установлены через onclick
    if (exportBtn && !exportBtn.onclick) {
        exportBtn.addEventListener('click', exportData);
    }
    if (importBtn && !importBtn.onclick) {
        importBtn.addEventListener('click', importData);
    }
});

// Функции уведомлений (если не определены)
if (typeof showSuccessNotification === 'undefined') {
    window.showSuccessNotification = function(message) {
        alert('SUCCESS: ' + message);
    };
}

if (typeof showErrorNotification === 'undefined') {
    window.showErrorNotification = function(message) {
        alert('ERROR: ' + message);
    };
}

if (typeof showLoadingNotification === 'undefined') {
    window.showLoadingNotification = function(message) {
        // Без действия, так как это уведомление о загрузке
    };
}