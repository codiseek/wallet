// Обновленная функция для отображения сбережений
function updateSavingsDisplay() {
    try {
        const currentReserveValue = window.initialBalances.total_reserve || 0;
        const monthlyReserveValue = window.initialBalances.monthly_reserve || 0;
        const targetReserveValue = window.initialTargetReserve || 0;
        const remainingValue = Math.max(0, targetReserveValue - currentReserveValue);
        const progressPercentage = targetReserveValue > 0 ? 
            Math.min(100, (currentReserveValue / targetReserveValue) * 100) : 0;

        // Обновляем текущий резерв (только число, символ валюты добавится автоматически)
        const currentReserveEl = document.getElementById('currentReserveAmount');
        if (currentReserveEl) {
            currentReserveEl.textContent = formatAmount(currentReserveValue);
            currentReserveEl.setAttribute('data-raw-value', currentReserveValue);
        }

        // Обновляем отложено в этом месяце (только число)
        const monthlyReserveEl = document.getElementById('monthlyReserveAmount');
        if (monthlyReserveEl) {
            monthlyReserveEl.textContent = formatAmount(monthlyReserveValue);
            monthlyReserveEl.setAttribute('data-raw-value', monthlyReserveValue);
        }

        // Обновляем всего накоплено (только число)
        const totalReserveEl = document.getElementById('totalReserveAmount');
        if (totalReserveEl) {
            totalReserveEl.textContent = formatAmount(currentReserveValue);
            totalReserveEl.setAttribute('data-raw-value', currentReserveValue);
        }

        // Обновляем целевой резерв (только число)
        const targetReserveEl = document.getElementById('targetReserveAmount');
        if (targetReserveEl) {
            targetReserveEl.textContent = formatAmount(targetReserveValue);
            targetReserveEl.setAttribute('data-raw-value', targetReserveValue);
        }

        // Обновляем осталось до цели (только число)
        const remainingEl = document.getElementById('remainingToTarget');
        if (remainingEl) {
            remainingEl.textContent = formatAmount(remainingValue);
            remainingEl.setAttribute('data-raw-value', remainingValue);
        }

        // Обновляем текст "Осталось: X" (без символа валюты)
        const remainingTextEl = document.getElementById('remainingToTargetText');
        if (remainingTextEl) {
            remainingTextEl.innerHTML = `Осталось: <span id="remainingToTarget" data-raw-value="${remainingValue}">${formatAmount(remainingValue)}</span>`;
        }

        // Обновляем прогресс-бар и текст прогресса
        const progressBar = document.getElementById('reserveProgressBar');
        const progressText = document.getElementById('reserveProgressText');
        
        if (progressBar) {
            progressBar.style.width = `${progressPercentage}%`;
        }
        if (progressText) {
            progressText.textContent = `${progressPercentage.toFixed(1)}%`;
        }

        // ОБНОВЛЯЕМ ЦЕЛЕВОЙ ПРОГРЕСС-БАР
        const targetProgressBar = document.getElementById('targetProgressBar');
        if (targetProgressBar) {
            targetProgressBar.style.width = `${progressPercentage}%`;
        }

        // ОБНОВЛЯЕМ ДИНАМИЧЕСКИЕ ЭЛЕМЕНТЫ ЦЕЛЕВОГО РЕЗЕРВА (только числа)
        const targetCurrentReserveEl = document.getElementById('targetCurrentReserve');
        if (targetCurrentReserveEl) {
            targetCurrentReserveEl.textContent = formatAmount(currentReserveValue);
            targetCurrentReserveEl.setAttribute('data-raw-value', currentReserveValue);
        }

        const targetRemainingEl = document.getElementById('targetRemaining');
        if (targetRemainingEl) {
            targetRemainingEl.textContent = formatAmount(remainingValue);
            targetRemainingEl.setAttribute('data-raw-value', remainingValue);
        }

        const targetProgressPercentEl = document.getElementById('targetProgressPercent');
        if (targetProgressPercentEl) {
            targetProgressPercentEl.textContent = `${progressPercentage.toFixed(1)}%`;
        }
        // В функцию updateSavingsDisplay добавьте этот код в конец try блока:
const currentTargetReserveMenu = document.getElementById('currentTargetReserve');
if (currentTargetReserveMenu) {
    currentTargetReserveMenu.textContent = formatAmount(targetReserveValue);
}

        // ОБНОВЛЯЕМ МОТИВАЦИОННОЕ СООБЩЕНИЕ
        updateMotivationMessage(progressPercentage);

    } catch (e) {
        console.error('updateSavingsDisplay error', e);
    }
}


// Функция для обновления мотивационного сообщения
function updateMotivationMessage(progressPercentage) {
    const motivationMessageEl = document.getElementById('motivationMessage');
    if (!motivationMessageEl) return;

    let messageHtml = '';

    if (progressPercentage === 100) {
        messageHtml = `
            <div class="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-2 border border-green-500/30">
                <p class="text-xs text-green-400 font-semibold">
                    <i class="fas fa-trophy mr-1"></i>Поздравляем! Цель достигнута!
                </p>
            </div>
        `;
    } else if (progressPercentage > 75) {
        messageHtml = `
            <p class="text-xs text-yellow-400 animate-pulse">
                <i class="fas fa-fire mr-1"></i>Осталось совсем немного!
            </p>
        `;
    } else if (progressPercentage > 50) {
        messageHtml = `
            <p class="text-xs text-blue-400">
                <i class="fas fa-rocket mr-1"></i>Отличный прогресс!
            </p>
        `;
    } else if (progressPercentage > 25) {
        messageHtml = `
            <p class="text-xs text-purple-400">
                <i class="fas fa-seedling mr-1"></i>Продолжайте в том же духе!
            </p>
        `;
    } else {
        messageHtml = `
            <p class="text-xs text-gray-400">
                <i class="fas fa-flag mr-1"></i>Начните свой путь к цели
            </p>
        `;
    }

    motivationMessageEl.innerHTML = messageHtml;
}

// Форматирование всех элементов резерва при загрузке
function formatAllReserveElements() {
    const reserveElements = [
        'currentReserveAmount',
        'monthlyReserveAmount',
        'totalReserveAmount',
        'targetReserveAmount',
        'remainingToTarget',
        'targetCurrentReserve',
        'targetRemaining'
    ];

    reserveElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const rawValue = element.getAttribute('data-raw-value') || element.textContent.replace(/[^\d]/g, '');
            if (rawValue) {
                element.textContent = formatAmount(rawValue);
                element.setAttribute('data-raw-value', rawValue);
            }
        }
    });
    
    // Также форматируем прогресс при загрузке
    const progressText = document.getElementById('reserveProgressText');
    if (progressText) {
        const currentValue = parseFloat(progressText.textContent) || 0;
        progressText.textContent = `${currentValue.toFixed(1)}%`;
    }
}


// Функция для обновления отображения резерва в интерфейсе
function updateReserveDisplay() {
    try {
        const reserveAmountEl = document.getElementById('reserveAmount');
        const reservePercentDisplay = document.getElementById('reservePercentageDisplay');
        const currentReservePercent = document.getElementById('currentReservePercent');
        
        // Обновляем сумму резерва
        if (reserveAmountEl && window.initialBalances) {
            const reserveValue = window.initialBalances.total_reserve || 0;
            reserveAmountEl.textContent = formatAmount(reserveValue);
            reserveAmountEl.setAttribute('data-raw-value', reserveValue);
        }
        
        // Обновляем отображение процента в разных местах
        const reservePercentage = window.initialReservePercentage || 0;
        
        if (reservePercentDisplay) {
            reservePercentDisplay.textContent = reservePercentage;
        }
        
        if (currentReservePercent) {
            currentReservePercent.textContent = reservePercentage + '%';
        }
        
        // Обновляем уведомление о резерве
        updateReserveNotification();
        
    } catch (e) {
        console.error('updateReserveDisplay error', e);
    }
}


// Функция для обновления уведомления о резерве
function updateReserveNotification() {
    const reserveNotification = document.getElementById('reserveNotification');
    if (!reserveNotification) return;
    
    const reservePercentage = window.initialReservePercentage || 0;
    
    if (reservePercentage === 0) {
        reserveNotification.classList.remove('hidden');
    } else {
        reserveNotification.classList.add('hidden');
    }
}


// -----------------------------
// Обработчики для сохранения резерва и целевого резерва
// -----------------------------
function initReserveHandlers() {
    // Обработчик для сохранения процента резерва
    const saveReserveBtn = document.getElementById('saveReserveBtn');
    if (saveReserveBtn) {
        // Удаляем существующие обработчики чтобы избежать дублирования
        saveReserveBtn.replaceWith(saveReserveBtn.cloneNode(true));
        const newSaveReserveBtn = document.getElementById('saveReserveBtn');
        
        newSaveReserveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            saveReservePercentage();
        });
    }

    // Обработчик для сохранения целевого резерва
    const saveTargetReserveBtn = document.getElementById('saveTargetReserveBtn');
    if (saveTargetReserveBtn) {
        // Удаляем существующие обработчики чтобы избежать дублирования
        saveTargetReserveBtn.replaceWith(saveTargetReserveBtn.cloneNode(true));
        const newSaveTargetReserveBtn = document.getElementById('saveTargetReserveBtn');
        
        newSaveTargetReserveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            saveTargetReserve();
        });
    }
}


// Функция сохранения процента резерва
async function saveReservePercentage() {
    const input = document.getElementById('reservePercentageInput');
    const button = document.getElementById('saveReserveBtn');
    
    if (!input || !button) {
        console.error('Элементы резерва не найдены');
        return;
    }
    
    const percentage = parseInt(input.value);
    
    // Валидация
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        showErrorNotification('Введите процент от 0 до 100');
        return;
    }

    // Сохраняем оригинальное состояние кнопки
    const originalHTML = button.innerHTML;
    const originalClasses = button.className;

    // Показываем состояние загрузки
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Сохранение...';
    button.className = originalClasses.replace('bg-blue-600', 'bg-blue-400') + ' cursor-not-allowed';
    button.disabled = true;

    try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const formData = new FormData();
        formData.append('reserve_percentage', percentage);

        const response = await fetch('/update_reserve_percentage/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Обновляем глобальные переменные
            window.initialReservePercentage = percentage;
            
            // Обновляем отображение резерва
            updateReserveDisplay();
            updateSavingsDisplay();
            
            // Показываем успешное состояние
            button.innerHTML = '<i class="fas fa-check mr-2"></i>Сохранено!';
            button.className = originalClasses.replace('bg-blue-600', 'bg-green-500') + ' cursor-not-allowed';
            
            // Показываем успешное уведомление
            showSuccessNotification('Процент резерва обновлен!');
            
            // Возвращаем исходное состояние через 2 секунды
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.className = originalClasses;
                button.disabled = false;
            }, 2000);
            
        } else {
            showErrorNotification(data.error || 'Ошибка при сохранении');
            // Восстанавливаем кнопку при ошибке
            button.innerHTML = originalHTML;
            button.className = originalClasses;
            button.disabled = false;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showErrorNotification('Ошибка соединения');
        // Восстанавливаем кнопку при ошибке
        button.innerHTML = originalHTML;
        button.className = originalClasses;
        button.disabled = false;
    }
}

// Функция сохранения целевого резерва
// Функция сохранения целевого резерва
async function saveTargetReserve() {

    const input = document.getElementById('targetReserveInput');
    const button = document.getElementById('saveTargetReserveBtn');
    
    if (!input || !button) {
        console.error('Элементы целевого резерва не найдены');
        return;
    }
    
    const target = parseFloat(input.value);
    if (isNaN(target) || target < 0) {
        showErrorNotification('Введите положительное значение цели');
        return;
    }

    // Сохраняем оригинальное состояние кнопки
    const originalHTML = button.innerHTML;
    const originalClasses = button.className;

    // Показываем состояние загрузки
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Сохранение...';
    button.className = originalClasses.replace('bg-blue-600', 'bg-blue-400') + ' cursor-not-allowed';
    button.disabled = true;

    try {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const formData = new FormData();
        formData.append('target_reserve', target);


        const response = await fetch('/update_target_reserve/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Обновляем глобальные данные и UI
            window.initialTargetReserve = target;
            showSuccessNotification('Целевой резерв сохранён!');

            // УДАЛЕНО: Прямое обновление несуществующего элемента
            // document.getElementById('currentTargetReserve').textContent = formatAmount(target);
            
            // ВМЕСТО ЭТОГО: Используем существующую функцию для обновления всего интерфейса
            updateSavingsDisplay();

            // Кнопка — зелёная и с галочкой
            button.innerHTML = '<i class="fas fa-check mr-2"></i>Сохранено!';
            button.className = originalClasses.replace('bg-blue-600', 'bg-green-500') + ' cursor-not-allowed';

            // Возврат к исходному состоянию через 2 секунды
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.className = originalClasses;
                button.disabled = false;
            }, 2000);
        } else {
            showErrorNotification(data.error || 'Ошибка при сохранении');
            button.innerHTML = originalHTML;
            button.className = originalClasses;
            button.disabled = false;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showErrorNotification('Ошибка соединения');
        button.innerHTML = originalHTML;
        button.className = originalClasses;
        button.disabled = false;
    }
}