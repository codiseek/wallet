// notes.js - Исправленная система напоминаний

let currentEditingNoteId = null;
let currentNotes = [];

document.addEventListener('DOMContentLoaded', function() {
    loadNotes();
    initNoteSystem();
    initReminderSystem();
    
    // Проверяем напоминания сразу при загрузке
    setTimeout(checkReminders, 2000);
});

// Инициализация всей системы заметок
function initNoteSystem() {
    initNoteModal();
    initViewNoteModal();
    
    // Добавляем обработчик для кнопки добавления заметки
    const addNoteBtn = document.querySelector('.add-note-btn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openAddNoteModal();
        });
    }
    
    // ОЧИСТКА СТАРЫХ УВЕДОМЛЕНИЙ ПРИ ЗАГРУЗКЕ
    clearStaleNotifications();
}

// НОВАЯ ФУНКЦИЯ: Очистка старых уведомлений
function clearStaleNotifications() {
    const notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) return;
    
    // Очищаем все уведомления о напоминаниях при загрузке
    const reminderNotifications = notificationContainer.querySelectorAll('[data-reminder-id]');
    reminderNotifications.forEach(notification => {
        notification.remove();
    });
}

// Функция для отправки напоминания через push
function sendReminderPush(reminder) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
    }

    // Отправляем запрос на сервер для отправки push-уведомления
    fetch('/send_note_reminder/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            note_id: reminder.id,
            title: reminder.title,
            content: reminder.content
        })
    })
    .then(response => response.json())
    .catch(error => {
        console.error('Ошибка отправки push напоминания:', error);
    });
}

// Загрузка списка заметок
function loadNotes() {
    fetch('/get_notes/')
        .then(response => response.json())
        .then(data => {
            const notesList = document.getElementById('notesList');
            const emptyState = document.getElementById('emptyNotesState');
            
            if (!notesList) {
                return;
            }

            // Всегда показываем контейнер заметок
            notesList.style.display = 'block';
            
            // Очищаем только заметки, но не весь контейнер
            const existingNotes = notesList.querySelectorAll('.note-item');
            existingNotes.forEach(note => note.remove());
            
            currentNotes = data.notes || [];

            if (currentNotes.length > 0) {
                // Есть заметки - скрываем пустое состояние
                if (emptyState) emptyState.style.display = 'none';
                
                // Добавляем заметки
                currentNotes.forEach(note => {
                    const noteElement = createNoteElement(note);
                    notesList.appendChild(noteElement);
                });
            } else {
                // Нет заметок - показываем пустое состояние
                if (emptyState) emptyState.style.display = 'block';
            }
        })
        .catch(error => {
            // В случае ошибки тоже показываем пустое состояние
            const emptyState = document.getElementById('emptyNotesState');
            if (emptyState) emptyState.style.display = 'block';
        });
}

function createNoteElement(note) {
    const noteDiv = document.createElement('div');
    noteDiv.className =
        'note-item relative bg-gray-800 hover:bg-gray-750 rounded-2xl p-4 border border-gray-700 transition-all cursor-pointer overflow-hidden';
    noteDiv.dataset.noteId = note.id;

    const hasReminder = note.reminder_date !== null;
    const reminderDate = hasReminder ? new Date(note.reminder_date) : null;
    const now = new Date();
    const isUpcomingReminder = hasReminder && reminderDate > now;

    const reminderText = hasReminder
        ? `${reminderDate.toLocaleString('ru-RU', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })}`
        : 'Без напоминания';

    const truncatedTitle =
        note.title.length > 25 ? note.title.substring(0, 25) + '...' : note.title;

    noteDiv.innerHTML = `
        <div class="flex flex-col space-y-2 main-content">
            <h3 class="font-semibold text-lg text-white leading-snug">${escapeHtml(
                truncatedTitle
            )}</h3>

            <div class="text-xs text-gray-400 flex items-center space-x-1">
                <i class="fas fa-calendar-alt text-gray-500"></i>
                <span>${new Date(note.created_at).toLocaleDateString('ru-RU')}</span>
            </div>

            ${
                hasReminder
                    ? `
                <div class="text-xs text-blue-400 flex items-center space-x-2">
                    <i class="fas fa-bell ${
                        isUpcomingReminder ? 'animate-pulse' : ''
                    }"></i>
                    <span>${isUpcomingReminder ? 'Запланировано' : 'Напомнено'}</span>
                </div>
            `
                    : ''
            }

            <div class="relative bg-gray-800/60 rounded-xl p-3 border border-transparent">
                <div class="absolute left-0 top-0 h-full w-1 bg-blue-500 rounded-l-md"></div>
                <p class="text-gray-200 text-sm whitespace-pre-wrap ml-3 line-clamp-3">${escapeHtml(note.content || '')}</p>

            </div>

            <div class="text-sm text-gray-400 truncate w-full flex items-center space-x-2">
                <i class="fas fa-clock text-blue-400"></i>
                <span class="truncate">${escapeHtml(reminderText)}</span>
            </div>
        </div>

        <button class="absolute top-3 right-3 text-red-400 hover:text-red-300 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg delete-note-btn" title="Удалить">
            <i class="fas fa-trash"></i>
        </button>

        <!-- Контейнер подтверждения удаления -->
        <div class="delete-confirm hidden absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center rounded-2xl border border-red-500/50 text-center p-4">
            <p class="text-red-400 mb-3 text-sm font-medium">Удалить эту заметку?</p>
            <div class="flex space-x-3">
                <button class="confirm-delete bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">Удалить</button>
                <button class="cancel-delete bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium">Отмена</button>
            </div>
        </div>
    `;

    // Открытие при клике
    noteDiv.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-note-btn') && !e.target.closest('.delete-confirm')) {
            openViewNoteModal(note);
        }
    });

    // Показ подтверждения удаления
    const deleteBtn = noteDiv.querySelector('.delete-note-btn');
    const confirmBox = noteDiv.querySelector('.delete-confirm');

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        noteDiv.querySelector('.main-content').classList.add('opacity-30', 'pointer-events-none');
        confirmBox.classList.remove('hidden');
        confirmBox.classList.add('animate-fadeIn');
    });

    // Отмена
    confirmBox.querySelector('.cancel-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        confirmBox.classList.add('hidden');
        noteDiv.querySelector('.main-content').classList.remove('opacity-30', 'pointer-events-none');
    });

    // Удаление
    confirmBox.querySelector('.confirm-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        confirmBox.querySelector('.confirm-delete').textContent = 'Удаляется...';
        confirmBox.querySelector('.confirm-delete').disabled = true;

        fetch(`/delete_note/${note.id}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    noteDiv.classList.add('opacity-0', 'translate-x-5', 'transition-all');
                    setTimeout(() => noteDiv.remove(), 300);
                } else {
                    confirmBox.querySelector('.confirm-delete').textContent = 'Ошибка';
                }
            })
            .catch(() => {
                confirmBox.querySelector('.confirm-delete').textContent = 'Ошибка';
            });
    });

    return noteDiv;
}

// Открытие модалки для добавления заметки
function openAddNoteModal() {
    currentEditingNoteId = null;
    document.getElementById('noteModalTitle').textContent = 'Новая заметка';
    document.getElementById('noteTitleInput').value = '';
    document.getElementById('noteContentInput').value = '';
    
    // УБРАЛИ установку значения по умолчанию - поле будет пустым
    document.getElementById('reminderDateInput').value = '';
    
    animateModal(document.getElementById('noteModal'), true);
}

// Инициализация модального окна заметок
function initNoteModal() {
    const noteModal = document.getElementById('noteModal');
    const closeNoteModalBtns = document.querySelectorAll('.close-modal[data-modal="note"]');
    const saveNoteBtn = document.getElementById('saveNoteBtn');

    if (!noteModal) {
        return;
    }

    // Закрытие модалки заметки
    closeNoteModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            animateModal(noteModal, false);
            document.body.classList.remove('modal-open');

        });
    });

    // Сохранение заметки
    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', saveNote);
    }

    // Закрытие по клику вне окна
    noteModal.addEventListener('click', function(e) {
        if (e.target === noteModal) {
           animateModal(noteModal, false);
            document.body.classList.remove('modal-open');
        }
    });
}

// Открытие модалки редактирования заметки
function openEditNoteModal(note) {
    currentEditingNoteId = note.id;
    document.getElementById('noteModalTitle').textContent = 'Редактировать заметку';
    document.getElementById('noteTitleInput').value = note.title;
    document.getElementById('noteContentInput').value = note.content || '';
    
    if (note.reminder_date) {
        const reminderDate = new Date(note.reminder_date);
        
        // Форматируем дату для input[type=datetime-local]
        const year = reminderDate.getFullYear();
        const month = String(reminderDate.getMonth() + 1).padStart(2, '0');
        const day = String(reminderDate.getDate()).padStart(2, '0');
        const hours = String(reminderDate.getHours()).padStart(2, '0');
        const minutes = String(reminderDate.getMinutes()).padStart(2, '0');
        
        document.getElementById('reminderDateInput').value = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
        document.getElementById('reminderDateInput').value = '';
    }
    
   animateModal(document.getElementById('noteModal'), true);
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Сохранение заметки с запросом разрешений
function saveNote() {
    const title = document.getElementById('noteTitleInput').value.trim();
    const content = document.getElementById('noteContentInput').value.trim();
    const reminderDateValue = document.getElementById('reminderDateInput').value;

    if (!title) {
        showNoteNotification('Заголовок пуст!', 'error');
        return;
    }

    // Проверка даты на клиенте
    if (reminderDateValue) {
        const selectedDate = new Date(reminderDateValue);
        const now = new Date();
        
        if (selectedDate < now) {
            showNoteNotification('Дата в прошлом!', 'error');
            return;
        }
        
        // ЗАПРАШИВАЕМ РАЗРЕШЕНИЕ НА УВЕДОМЛЕНИЯ ПРИ СОЗДАНИИ ЗАМЕТКИ С НАПОМИНАНИЕМ
        requestNotificationPermission().then(hasPermission => {
            if (hasPermission) {
                proceedWithSave(title, content, reminderDateValue);
            } else {
                proceedWithSave(title, content, reminderDateValue);
            }
        });
    } else {
        // Сохраняем без напоминания
        proceedWithSave(title, content, '');
    }
}

// НОВАЯ ФУНКЦИЯ: Фактическое сохранение заметки
function proceedWithSave(title, content, reminderDateValue) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    
    if (reminderDateValue) {
        // Получаем выбранную дату и время
        const selectedDate = new Date(reminderDateValue);
        
        // Форматируем дату в ISO строку с указанием временной зоны
        const timezoneOffset = -selectedDate.getTimezoneOffset(); // в минутах
        const timezoneOffsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
        const timezoneOffsetMinutes = Math.abs(timezoneOffset) % 60;
        const timezoneSign = timezoneOffset >= 0 ? '+' : '-';
        
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const hours = String(selectedDate.getHours()).padStart(2, '0');
        const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
        
        // Форматируем дату с временной зоной
        const isoDate = `${year}-${month}-${day}T${hours}:${minutes}:00${timezoneSign}${String(timezoneOffsetHours).padStart(2, '0')}:${String(timezoneOffsetMinutes).padStart(2, '0')}`;
        
        formData.append('reminder_date', isoDate);
    }

    const url = currentEditingNoteId ? `/edit_note/${currentEditingNoteId}/` : '/add_note/';

    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            animateModal(document.getElementById('noteModal'), false);
            loadNotes();
            showNoteNotification(currentEditingNoteId ? 'Заметка обновлена!' : 'Заметка создана!', 'success');
            
            // ПЛАНИРУЕМ PUSH-УВЕДОМЛЕНИЕ ПРИ УСПЕШНОМ СОХРАНЕНИИ
            if (reminderDateValue) {
                const selectedDate = new Date(reminderDateValue);
                const now = new Date();
                const timeUntilReminder = selectedDate.getTime() - now.getTime();
                
                if (timeUntilReminder > 0) {
                    // Можно отправить запрос на сервер для планирования push-уведомления
                }
            }
        } else {
            showNoteNotification(data.error || 'Ошибка при сохранении заметки', 'error');
        }
    })
    .catch(error => {
        showNoteNotification('Произошла ошибка при отправке формы: ' + error.message, 'error');
    });
}

// Инициализация модалки просмотра заметки
function initViewNoteModal() {
    const viewNoteModal = document.getElementById('viewNoteModal');
    const closeViewNoteModalBtns = document.querySelectorAll('.close-modal[data-modal="viewNote"]');
    const editNoteBtn = document.getElementById('editNoteBtn');
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    const hideReminderBtn = document.getElementById('hideReminderBtn');

    if (!viewNoteModal) {
        return;
    }

    // Закрытие модалки просмотра заметки через кнопку закрытия
    closeViewNoteModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            animateModal(viewNoteModal, false);
        });
    });

    // Редактировать заметку из модалки просмотра
    if (editNoteBtn) {
        editNoteBtn.addEventListener('click', () => {
            const noteId = viewNoteModal.dataset.noteId;
            const note = currentNotes.find(n => n.id == noteId);
            if (note) {
                animateModal(viewNoteModal, false);
                setTimeout(() => openEditNoteModal(note), 300);
            }
        });
    }

    // Удалить заметку из модалки просмотра
    if (deleteNoteBtn) {
        deleteNoteBtn.addEventListener('click', () => {
            const noteId = viewNoteModal.dataset.noteId;
            if (noteId) {
                animateModal(viewNoteModal, false);
                setTimeout(() => deleteNote(noteId), 300);
            }
        });
    }

    // Скрыть напоминание
    if (hideReminderBtn) {
        hideReminderBtn.addEventListener('click', () => {
            const noteId = viewNoteModal.dataset.noteId;
            if (noteId) {
                markNoteAsReminded(noteId);
            }
        });
    }

    // Закрытие по клику вне окна
    viewNoteModal.addEventListener('click', function(e) {
        if (e.target === viewNoteModal) {
            animateModal(viewNoteModal, false);
        }
    });
}

function openViewNoteModal(note, isFromReminder = false) {
    const modal = document.getElementById('viewNoteModal');
    document.getElementById('viewNoteTitle').textContent = note.title;
    document.getElementById('viewNoteContent').textContent = note.content || '';
    modal.dataset.noteId = note.id;

    const createdDate = new Date(note.created_at);
    const reminderDate = note.reminder_date ? new Date(note.reminder_date) : null;
    
    // Обновляем информацию о датах
    const viewNoteInfo = document.getElementById('viewNoteInfo');
    viewNoteInfo.innerHTML = `
        <div class="flex items-center text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            <i class="fas fa-calendar-alt mr-2"></i>
            <span>Создано: ${createdDate.toLocaleDateString('ru-RU')}</span>
        </div>
        ${reminderDate ? `
            <div class="flex items-center text-sm ${note.is_reminded ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'} bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                <i class="fas fa-bell mr-2 ${!note.is_reminded ? 'animate-pulse' : ''}"></i>
                <span>${reminderDate.toLocaleString('ru-RU')}</span>
            </div>
        ` : ''}
    `;

    // Настройка отображения блока напоминания
    const reminderInfo = document.getElementById('viewNoteReminderInfo');
    if (isFromReminder) {
        reminderInfo.classList.remove('hidden');
        reminderInfo.innerHTML = `
            <div class="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <i class="fas fa-bell animate-pulse text-blue-500 mr-3"></i>
                <span class="text-blue-700 dark:text-blue-300 font-medium">Напоминание</span>
            </div>
        `;
    } else {
        reminderInfo.classList.add('hidden');
    }

    // УПРАВЛЕНИЕ КНОПКАМИ
    const actionButtonsContainer = document.querySelector('#viewNoteModal .modal-actions');
    actionButtonsContainer.innerHTML = ''; // Очищаем контейнер

    if (isFromReminder) {
        // РЕЖИМ НАПОМИНАНИЯ - только одна кнопка закрытия
        const closeBtn = document.createElement('button');
        closeBtn.className = 'w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors duration-200';
        closeBtn.textContent = 'Закрыть';
        closeBtn.addEventListener('click', () => {
            animateModal(modal, false);
        });
        
        actionButtonsContainer.appendChild(closeBtn);
        
    } else {
        // ОБЫЧНЫЙ РЕЖИМ - кнопки в один ряд: Закрыть | Редактировать
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'flex gap-3';
        
        // Кнопка Закрыть
        const closeBtn = document.createElement('button');
        closeBtn.className = 'flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors duration-200 flex items-center justify-center';
        closeBtn.innerHTML = `
            <span>Закрыть</span>
        `;
        closeBtn.addEventListener('click', () => {
            animateModal(modal, false);
        });
        
        // Кнопка Редактировать
        const editBtn = document.createElement('button');
        editBtn.className = 'flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors duration-200 flex items-center justify-center';
        editBtn.innerHTML = `
            <span>Редактировать</span>
        `;
        editBtn.addEventListener('click', () => {
            const noteId = modal.dataset.noteId;
            const note = currentNotes.find(n => n.id == noteId);
            if (note) {
                animateModal(modal, false);
                setTimeout(() => openEditNoteModal(note), 300);
            }
        });
        
        buttonsContainer.appendChild(closeBtn);
        buttonsContainer.appendChild(editBtn);
        actionButtonsContainer.appendChild(buttonsContainer);
    }
    
    animateModal(modal, true);
}

function addModalDecorations(modal, isFromReminder) {
    // Удаляем старые декорации
    const oldDecorations = modal.querySelectorAll('.modal-decoration');
    oldDecorations.forEach(el => el.remove());
    
    if (isFromReminder) {
        // Добавляем анимированные элементы для режима напоминания
        const decoration1 = document.createElement('div');
        decoration1.className = 'modal-decoration absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping opacity-60';
        decoration1.style.animation = 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite';
        
        const decoration2 = document.createElement('div');
        decoration2.className = 'modal-decoration absolute -bottom-2 -left-2 w-4 h-4 bg-blue-400 rounded-full animate-bounce';
        
        modal.querySelector('.modal-content').appendChild(decoration1);
        modal.querySelector('.modal-content').appendChild(decoration2);
    }
    
    // Добавляем градиентную обводку
    const gradientBorder = document.createElement('div');
    gradientBorder.className = 'modal-decoration absolute inset-0 rounded-2xl pointer-events-none';
    gradientBorder.style.background = isFromReminder 
        ? 'linear-gradient(45deg, transparent, transparent), linear-gradient(45deg, #f59e0b, #3b82f6, #8b5cf6)'
        : 'linear-gradient(45deg, transparent, transparent), linear-gradient(45deg, #3b82f6, #06b6d4, #10b981)';
    gradientBorder.style.backgroundSize = '400% 400%';
    gradientBorder.style.animation = 'gradientShift 3s ease infinite';
    gradientBorder.style.zIndex = '-1';
    gradientBorder.style.margin = '-2px';
    gradientBorder.style.borderRadius = 'inherit';
    
    modal.querySelector('.modal-content').style.position = 'relative';
    modal.querySelector('.modal-content').appendChild(gradientBorder);
}

// Удаление заметки
function deleteNote(noteId) {
    if (!confirm('Удалить заметку? Это действие нельзя отменить.')) {
        return;
    }

    fetch(`/delete_note/${noteId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadNotes();
            showNoteNotification('Заметка удалена!', 'success');
        } else {
            showNoteNotification(data.error || 'Ошибка при удалении заметки', 'error');
        }
    })
    .catch(error => {
        showNoteNotification('Произошла ошибка при удалении заметки', 'error');
    });
}

// Отметить заметку как напомненную (ручное скрытие)
function markNoteAsReminded(noteId) {
    fetch(`/mark_note_as_reminded/${noteId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Закрываем модалку просмотра, если открыта
            const viewNoteModal = document.getElementById('viewNoteModal');
            if (viewNoteModal) {
                animateModal(viewNoteModal, false);
            }
            
            // Перезагружаем список заметок
            loadNotes();
            
            // Удаляем соответствующее уведомление, если оно еще есть
            const notificationContainer = document.getElementById('notificationContainer');
            if (notificationContainer) {
                const reminderNotification = notificationContainer.querySelector(`[data-reminder-id="${noteId}"]`);
                if (reminderNotification) {
                    reminderNotification.remove();
                }
            }
            
            showNoteNotification('Напоминание скрыто!', 'success');
        } else {
            showNoteNotification(data.error || 'Ошибка при скрытии напоминания', 'error');
        }
    })
    .catch(error => {
        showNoteNotification('Произошла ошибка при скрытии напоминания', 'error');
    });
}

// Система напоминаний
function initReminderSystem() {
    // Проверяем сразу при загрузке
    checkReminders();
    
    // Проверяем каждые 30 секунд вместо 2 минут
    setInterval(checkReminders, 30000);
    
    // Дополнительная проверка при фокусе на вкладке
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            checkReminders();
        }
    });
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Проверка напоминаний
function checkReminders() {
    fetch('/get_pending_reminders/')
        .then(response => response.json())
        .then(data => {
            if (data.reminders && data.reminders.length > 0) {
                // Получаем текущие уведомления
                const notificationContainer = document.getElementById('notificationContainer');
                if (!notificationContainer) return;
                
                const currentNotifications = notificationContainer.querySelectorAll('[data-reminder-id]');
                const currentNotificationIds = Array.from(currentNotifications).map(el => el.dataset.reminderId);
                
                // Показываем только новые напоминания
                data.reminders.forEach(reminder => {
                    if (!currentNotificationIds.includes(reminder.id.toString())) {
                        showReminderNotification(reminder);
                        
                        // Отправляем push-уведомление
                        sendReminderPush(reminder);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Ошибка при проверке напоминаний:', error);
        });
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Показ уведомления о напоминании
function showReminderNotification(reminder) {
    const notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        return;
    }

    // Проверяем, нет ли уже уведомления с таким ID
    const existingNotification = notificationContainer.querySelector(`[data-reminder-id="${reminder.id}"]`);
    if (existingNotification) {
        existingNotification.remove();
    }

    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = 'notification-inline flex items-center px-3 py-1.5 rounded-lg text-sm bg-gray-800/90 backdrop-blur-sm border border-gray-700 cursor-pointer hover:bg-gray-700/90 transition-all duration-200 active:scale-95 mb-2';
    notification.dataset.reminderId = reminder.id;
    notification.style.cssText = 'pointer-events: auto; z-index: 1000;';
    
    // Обрезаем текст для уведомления
    const truncatedTitle = reminder.title.length > 30 ? reminder.title.substring(0, 30) + '...' : reminder.title;
    
    notification.innerHTML = `
        <div class="flex items-center w-full">
            <i class="fas fa-bell mr-3 p-1 text-yellow-300 animate-pulse"></i>
            <div class="flex-1">
                <div class="font-semibold text-white text-xs">Напоминание</div>
              
            </div>
           
        </div>
    `;

    // При клике на уведомление открываем заметку
    notification.addEventListener('click', function(e) {
        if (!e.target.closest('.close-reminder-notification')) {
            openReminderNote(reminder);
        }
    });

    // Добавляем в контейнер
    notificationContainer.appendChild(notification);

    // Автоматическое скрытие через 30 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 30000);
}

// ФУНКЦИЯ: Запрос разрешения на уведомления
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        return Promise.resolve(false);
    }
    
    if (Notification.permission === 'granted') {
        subscribeToPushNotifications();
        return Promise.resolve(true);
    }
    
    if (Notification.permission === 'denied') {
        showNoteNotification('Разрешите уведомления в настройках браузера', 'error');
        return Promise.resolve(false);
    }
    
    return Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            showNoteNotification('Уведомления включены!', 'success');
            subscribeToPushNotifications();
            return true;
        } else {
            return false;
        }
    });
}

// Функция для подписки на push-уведомления
function subscribeToPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
    }
    
    navigator.serviceWorker.ready.then(registration => {
        // Преобразуем ключ VAPID
        const applicationServerKey = urlBase64ToUint8Array("{{ vapid_key|safe }}");
        
        return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });
    })
    .then(subscription => {
        // Отправляем подписку на сервер
        return fetch("/webpush/save_information/?group=notes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken()
            },
            body: JSON.stringify(subscription)
        });
    })
    .catch(error => {
        console.error('Ошибка подписки на push:', error);
    });
}

// Функция для преобразования base64 в Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

function openReminderNote(reminder) {
    // Сразу отмечаем заметку как напомненную на сервере
    fetch(`/mark_note_as_reminded/${reminder.id}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Удаляем уведомление из контейнера
            const notificationContainer = document.getElementById('notificationContainer');
            if (notificationContainer) {
                const reminderNotification = notificationContainer.querySelector(`[data-reminder-id="${reminder.id}"]`);
                if (reminderNotification) {
                    reminderNotification.remove();
                }
            }
            
            // Обновляем данные заметки с сервера
            reminder.is_reminded = true;
            
            // Показываем модалку с заметкой в режиме напоминания
            openViewNoteModal(reminder, true);
            
            // Перезагружаем список заметок для обновления статуса
            setTimeout(() => {
                loadNotes();
            }, 500);
            
        } else {
            // Все равно показываем заметку, но без отметки
            openViewNoteModal(reminder, true);
        }
    })
    .catch(error => {
        // В случае ошибки все равно показываем заметку
        openViewNoteModal(reminder, true);
    });
}

// Вспомогательные функции
function getCSRFToken() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfToken ? csrfToken.value : '';
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Обновленная функция уведомлений для notes.js
function showNoteNotification(message, type = 'success') {
    const notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        return;
    }
    
    // Создаем новое уведомление, не перезаписывая существующие
    const notification = document.createElement('div');
    notification.className = 'notification-inline flex items-center px-3 py-1.5 rounded-lg text-sm bg-gray-800/80 backdrop-blur-sm border border-gray-700 text-white mb-2';
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    const iconColor = type === 'success' ? 'text-blue-400' : 'text-yellow-400';
    
    notification.innerHTML = `
        <i class="fas ${icon} mr-2 ${iconColor}"></i>
        <span>${message}</span>
    `;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Управление выбором даты напоминания
// Упрощенная система выбора напоминания
function initReminderPicker() {
    const dateInput = document.getElementById('reminderDateInput');
    const timeInput = document.getElementById('reminderTimeInput');
    const clearBtn = document.getElementById('clearReminderBtn');

    // Устанавливаем минимальную дату - сегодня
    const today = new Date().toISOString().split('T')[0];
    if (dateInput) {
        dateInput.min = today;
    }

    // Очистка напоминания
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (dateInput) dateInput.value = '';
            if (timeInput) timeInput.value = '';
        });
    }

    // Автоматическая установка времени при выборе даты
    if (dateInput && timeInput) {
        dateInput.addEventListener('change', function() {
            // Если дата сегодня, устанавливаем время на час вперед
            if (this.value === today && !timeInput.value) {
                const now = new Date();
                now.setHours(now.getHours() + 1);
                timeInput.value = now.toTimeString().slice(0, 5);
            }
        });
    }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Сохранение заметки с улучшенной валидацией
function saveNote() {
    const title = document.getElementById('noteTitleInput').value.trim();
    const content = document.getElementById('noteContentInput').value.trim();
    const dateInput = document.getElementById('reminderDateInput');
    const timeInput = document.getElementById('reminderTimeInput');

    if (!title) {
        showNoteNotification('Заголовок пуст!', 'error');
        return;
    }

    let reminderDateValue = '';
    
    // Проверяем, заполнены ли оба поля даты и времени
    if (dateInput && timeInput && dateInput.value && timeInput.value) {
        const dateStr = dateInput.value;
        const timeStr = timeInput.value;
        
        // Создаем полную дату-время
        const selectedDate = new Date(`${dateStr}T${timeStr}`);
        const now = new Date();
        
        // ДОБАВЛЯЕМ БУФЕР В 5 МИНУТ, чтобы избежать ошибки для "слишком близкого" времени
        now.setMinutes(now.getMinutes() - 5);
        
        if (selectedDate < now) {
            showNoteNotification('Выберите дату и время в будущем!', 'error');
            return;
        }
        
        // Форматируем для отправки на сервер
        const timezoneOffset = -selectedDate.getTimezoneOffset();
        const timezoneOffsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
        const timezoneOffsetMinutes = Math.abs(timezoneOffset) % 60;
        const timezoneSign = timezoneOffset >= 0 ? '+' : '-';
        
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const hours = String(selectedDate.getHours()).padStart(2, '0');
        const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
        
        reminderDateValue = `${year}-${month}-${day}T${hours}:${minutes}:00${timezoneSign}${String(timezoneOffsetHours).padStart(2, '0')}:${String(timezoneOffsetMinutes).padStart(2, '0')}`;
    }

    // Запрашиваем разрешение на уведомления, если нужно напоминание
    if (reminderDateValue) {
        requestNotificationPermission().then(hasPermission => {
            proceedWithSave(title, content, reminderDateValue);
        });
    } else {
        proceedWithSave(title, content, '');
    }
}

// Обновленная функция открытия модалки редактирования
function openEditNoteModal(note) {
    currentEditingNoteId = note.id;
    document.getElementById('noteModalTitle').textContent = 'Редактировать заметку';
    document.getElementById('noteTitleInput').value = note.title;
    document.getElementById('noteContentInput').value = note.content || '';
    
    // Устанавливаем значения даты и времени для редактирования
    const dateInput = document.getElementById('reminderDateInput');
    const timeInput = document.getElementById('reminderTimeInput');
    
    if (note.reminder_date && dateInput && timeInput) {
        const reminderDate = new Date(note.reminder_date);
        
        // Форматируем для input[type=date]
        const year = reminderDate.getFullYear();
        const month = String(reminderDate.getMonth() + 1).padStart(2, '0');
        const day = String(reminderDate.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
        
        // Форматируем для input[type=time]
        const hours = String(reminderDate.getHours()).padStart(2, '0');
        const minutes = String(reminderDate.getMinutes()).padStart(2, '0');
        timeInput.value = `${hours}:${minutes}`;
    } else if (dateInput && timeInput) {
        // Сбрасываем поля, если напоминания нет
        dateInput.value = '';
        timeInput.value = '';
    }
    
    animateModal(document.getElementById('noteModal'), true);
}

// Обновленная функция открытия модалки добавления
function openAddNoteModal() {
    currentEditingNoteId = null;
    document.getElementById('noteModalTitle').textContent = 'Новая заметка';
    document.getElementById('noteTitleInput').value = '';
    document.getElementById('noteContentInput').value = '';
    
    // Сбрасываем поля даты и времени
    const dateInput = document.getElementById('reminderDateInput');
    const timeInput = document.getElementById('reminderTimeInput');
    if (dateInput && timeInput) {
        dateInput.value = '';
        timeInput.value = '';
        
        // Устанавливаем минимальную дату
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }
    
    animateModal(document.getElementById('noteModal'), true);
}

// Обновляем инициализацию
document.addEventListener('DOMContentLoaded', function() {
    loadNotes();
    initNoteSystem();
    initReminderSystem();
    initReminderPicker(); // Добавляем инициализацию упрощенного пикера
    
    setTimeout(checkReminders, 2000);
});



// Глобальная функция для открытия модалки из HTML атрибута onclick
window.openAddNoteModal = function() {
    currentEditingNoteId = null;
    document.getElementById('noteModalTitle').textContent = 'Новая заметка';
    document.getElementById('noteTitleInput').value = '';
    document.getElementById('noteContentInput').value = '';
    document.getElementById('reminderDateInput').value = '';
    animateModal(document.getElementById('noteModal'), true);
};