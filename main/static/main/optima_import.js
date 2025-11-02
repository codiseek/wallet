
// Функция для начала импорта Optima (вызывается из модалки)
function startOptimaImport() {
    closeOptimaInstructionModal();
    
    // Даем небольшую задержку перед открытием выбора файла
    setTimeout(() => {
        const fileInput = document.getElementById('optimaFileInput');
        if (fileInput) {
            fileInput.click();
        }
    }, 300);
}



// Обработчик выбора файла Optima
document.getElementById('optimaFileInput').addEventListener('change', function(event) {
    handleOptimaFileImport(event);
});

// Обработчик импорта файла Optima Bank
function handleOptimaFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Проверяем расширение файла
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['pdf'].includes(fileExtension)) {
        if (window.showErrorNotification) {
            showErrorNotification('Поддерживаются только PDF файлы для Optima Bank');
        }
        return;
    }

    const importOptimaBtn = document.getElementById('importOptimaBtn');
    if (importOptimaBtn) {
        const originalHTML = importOptimaBtn.innerHTML;
        
        // Обновляем кнопку - показываем анимацию загрузки
        importOptimaBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span class="font-semibold text-sm">Импорт...</span>
        `;
        importOptimaBtn.disabled = true;

        if (window.showLoadingNotification) {
            showLoadingNotification('Импорт данных из Optima Bank...');
        }

        const formData = new FormData();
        formData.append('optima_file', file);

        fetch('/import/optima/', {
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
                importOptimaBtn.innerHTML = `
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
            console.error('Optima import error:', error);
            if (window.showErrorNotification) {
                showErrorNotification('Ошибка при импорте: ' + error.message);
            }
            // Восстанавливаем кнопку
            importOptimaBtn.innerHTML = originalHTML;
            importOptimaBtn.disabled = false;
        });
    }
}

// Импорт из Optima Bank
function importOptima() {
    // Создаем файловый input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.style.display = 'none';
    fileInput.id = 'optimaFileInput';
    
    // Добавляем обработчик события change
    fileInput.addEventListener('change', function(event) {
        handleOptimaFileImport(event);
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
}