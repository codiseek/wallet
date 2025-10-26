

// -----------------------------
// Глобальные переменные
// -----------------------------
let notificationsModal2 = null;
let notificationLogoBtn2 = null;
let notificationIndicator2 = null;
let userNotifications = [];
let unreadCount = 0;
let unreadChatsCount = 0;
let currentNotificationDetail = null;
let isNotificationsModalOpen = false; // Добавляем флаг состояния модалки

let currentChatNotificationId = null;
let chatMessages = [];
let chatPollingInterval = null;



function initNotificationsPolling() {
    // Проверяем счетчик непрочитанных при загрузке
    checkUnreadCountOnly();
    
    // Проверяем счетчик каждые 30 секунд (увеличили частоту для админа)
    setInterval(checkUnreadCountOnly, 30000);
    
    // Дополнительная проверка при фокусе на вкладке
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            checkUnreadCountOnly();
        }
    });
}


// Функция для проверки только счетчика непрочитанных
async function checkUnreadCountOnly() {
    try {
        const response = await fetch('/notifications/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const previousUnreadCount = unreadCount;
            unreadCount = data.unread_count;
            
            // Для админа дополнительно проверяем непрочитанные чаты
            if (window.isAdmin) {
                await checkUnreadChatsForAdmin();
            }
            
            // Обновляем индикаторы независимо от активной вкладки
            updateNotificationsCounter2();
            updateChatsTabIndicator();
            
            // Если появились новые уведомления и модалка закрыта - показываем иконку
            const totalUnread = window.isAdmin ? unreadCount + unreadChatsCount : unreadCount;
            const previousTotalUnread = window.isAdmin ? previousUnreadCount + unreadChatsCount : previousUnreadCount;
            
            if (totalUnread > previousTotalUnread && !isNotificationsModalOpen) {
                showNewNotificationsIndicator();
            }
        }
    } catch (error) {
        console.error('Ошибка при проверке уведомлений:', error);
    }
}

// Новая функция для проверки непрочитанных чатов для админа
async function checkUnreadChatsForAdmin() {
    if (!window.isAdmin) return;
    
    try {
        const response = await fetch('/notifications/admin/chats/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Считаем общее количество непрочитанных сообщений во всех чатах
            unreadChatsCount = data.chats.reduce((total, chat) => total + (chat.unread_count || 0), 0);
        }
    } catch (error) {
        console.error('Ошибка при проверке непрочитанных чатов:', error);
    }
}


async function checkForNewNotifications() {
    try {
        const response = await fetch('/notifications/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const previousUnreadCount = unreadCount;
            unreadCount = data.unread_count;
            
            // Для админа проверяем непрочитанные чаты
            if (window.isAdmin) {
                await checkUnreadChatsForAdmin();
            } else {
                // Для пользователя загружаем последние сообщения чатов
                userNotifications = data.notifications;
                await loadLastChatMessagesForNotifications();
            }
            
            // Общее количество непрочитанных
            const totalUnread = window.isAdmin ? unreadCount + unreadChatsCount : unreadCount;
            const previousTotalUnread = window.isAdmin ? previousUnreadCount + unreadChatsCount : previousUnreadCount;
            
            // Если количество непрочитанных изменилось
            if (totalUnread !== previousTotalUnread) {
                updateNotificationsCounter2();
                updateChatsTabIndicator();
                
                // Если появились новые уведомления и модалка закрыта - показываем иконку с анимацией
                if (totalUnread > previousTotalUnread && !isNotificationsModalOpen) {
                    showNewNotificationsIndicator();
                }
            }
            
            // Плавное обновление списка только если модалка открыта
            if (isNotificationsModalOpen) {
                smoothRenderNotificationsList2();
            }
            
            // Если это админ и открыта вкладка чатов - обновляем чаты
            if (window.isAdmin && document.querySelector('.filter-notification-btn[data-filter="chats"]')?.classList.contains('bg-blue-600')) {
                await loadAdminChats();
            }
        }
    } catch (error) {
        console.error('Ошибка при проверке уведомлений:', error);
    }
}



// Вспомогательная функция для обрезки сообщения
function truncateMessage(message, maxLength) {
    if (!message || message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
}


// Плавное обновление списка уведомлений без дергания
function smoothRenderNotificationsList2() {
    const notificationsList2 = document.getElementById('notificationsList2');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    const counterElement2 = document.getElementById('notificationsCount2');
    
    if (!notificationsList2) return;

    // Обновляем счетчик
    if (counterElement2) {
        counterElement2.textContent = userNotifications.length;
    }

    if (userNotifications.length === 0) {
        if (emptyState2) emptyState2.classList.remove('hidden');
        notificationsList2.innerHTML = '';
        return;
    }

    if (emptyState2) emptyState2.classList.add('hidden');

    let notificationsHTML = '';
    
    userNotifications.forEach(notif => {
        const isUnread = !notif.is_read;
        const timeAgo = getTimeAgo(notif.created_at);
        const hasChat = notif.has_chat || false;
        
        // Для уведомлений с чатом используем последнее сообщение, для остальных - оригинальное
        const displayMessage = hasChat && notif.last_chat_message 
            ? notif.last_chat_message 
            : notif.message;
        
        // Обрезаем длинное сообщение
        const truncatedMessage = truncateMessage(displayMessage, 200);
        
        notificationsHTML += `
            <div class="notification-item bg-gray-700/30 border ${isUnread ? 'border-blue-500/20 bg-blue-500/10' : 'border-gray-600/30'} rounded-xl p-3 cursor-pointer hover:bg-gray-700/50 transition-all" 
                 data-id="${notif.id}" 
                 data-unread="${isUnread}" 
                 data-notification-id="${notif.notification_id}"
                 data-has-chat="${hasChat}"
                 onclick="handleNotificationClick(${notif.id}, ${hasChat})">
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 rounded-full ${isUnread ? 'bg-blue-500/20' : 'bg-gray-600/20'} flex items-center justify-center flex-shrink-0 mt-1">
                        <i class="fas ${notif.is_personal ? 'fa-user text-green-400' : 'fa-bullhorn text-blue-400'} text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between mb-1">
                            <h3 class="text-sm font-semibold ${isUnread ? 'text-white' : 'text-gray-300'} truncate">${escapeHtml(notif.title)}</h3>
                            <span class="text-xs ${isUnread ? 'text-blue-400' : 'text-gray-500'} font-medium ml-2 whitespace-nowrap">${timeAgo}</span>
                        </div>
                        <p class="text-xs ${isUnread ? 'text-gray-300' : 'text-gray-400'} leading-relaxed line-clamp-5">
                            ${escapeHtml(truncatedMessage)}
                        </p>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center space-x-2">
                                ${isUnread ? `
                                <span class="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                                <span class="text-xs text-blue-400">Новое</span>
                                ` : ''}
                                ${notif.is_personal ? '<span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Персональное</span>' : ''}
                            </div>
                            <div class="flex items-center space-x-2">
                                ${hasChat ? `
                                <button class="chat-badge-btn px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center space-x-1"
                                        onclick="event.stopPropagation(); openChatFromNotification(${notif.id})">
                                    <i class="fas fa-comments"></i>
                                    <span>Чат</span>
                                </button>
                                ` : ''}
                                ${(window.isAdmin && !notif.is_personal) ? `
<button class="delete-notification-btn px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center space-x-1"
        onclick="event.stopPropagation(); deleteSystemNotification(${notif.notification_id}, this.closest('.notification-item'))">
    <i class="fas fa-trash"></i>
    <span>Удалить</span>
</button>
` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Плавная замена контента
    notificationsList2.style.opacity = '0.7';
    setTimeout(() => {
        notificationsList2.innerHTML = notificationsHTML;
        notificationsList2.style.opacity = '1';
        applyNotificationsFilter2(getCurrentFilter());
    }, 150);
}






// Получение текущего активного фильтра
function getCurrentFilter() {
    const activeBtn = document.querySelector('.filter-notification-btn.bg-blue-600');
    return activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
}




// Показать индикатор новых уведомлений
function showNewNotificationsIndicator() {
    if (!notificationIconBtn) return;
    
    // Показываем иконку с анимацией
    notificationIconBtn.classList.remove('hidden');
    notificationIconBtn.classList.add('animate-pulse', 'bg-yellow-500/20');
    
    // Убираем анимацию через 2 секунды
    setTimeout(() => {
        notificationIconBtn.classList.remove('animate-pulse', 'bg-yellow-500/20');
    }, 2000);
}


// Обновленная функция openChatModal
async function openChatModal(notificationId) {
    // Находим уведомление в массиве, чтобы получить system_notification_id
    let systemNotificationId = notificationId;
    
    // Если передан ID UserNotification, находим соответствующий SystemNotification
    if (window.isAdmin) {
        currentChatNotificationId = notificationId;
    } else {
        const userNotification = userNotifications.find(n => n.id == notificationId);
        if (userNotification) {
            systemNotificationId = userNotification.notification_id;
            currentChatNotificationId = systemNotificationId;
        }
    }
    
    // Загружаем сообщения сразу при открытии
    await loadChatMessages(systemNotificationId);
    
    // Помечаем чат как прочитанный при открытии
    await markChatAsRead(systemNotificationId);
    
    // Показываем модалку чата
    const modal = document.getElementById('chatModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    setTimeout(() => {
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        
        // Запускаем опрос новых сообщений (30 секунд для админа)
        startChatPolling();
    }, 50);
}



// Обновленная функция openAdminChat
function openAdminChat(notificationId) {
    console.log('👨‍💼 Админ открывает чат для уведомления:', notificationId);
    
    // Просто открываем чат, не закрывая уведомления
    openChatModal(notificationId);
}


// Обновленная функция loadChatMessages с получением информации об админе
async function loadChatMessages(notificationId) {
    try {
        console.log('Загрузка сообщений для уведомления:', notificationId);
        
        const response = await fetch(`/notifications/${notificationId}/chat/`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            chatMessages = data.messages || [];
            renderChatMessages();
            scrollChatToBottom();
        } else {
            console.error('Ошибка загрузки сообщений:', data.error);
        }
    } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
    }
}






// Закрытие чата
function closeChatModal() {
    const modal = document.getElementById('chatModal');
    if (!modal) return;
    
    // Останавливаем опрос
    stopChatPolling();
    
    const content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('animate-modalShow');
        content.classList.add('animate-modalHide');
    }
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        currentChatNotificationId = null;
        
        // Закрываем также модалку уведомлений
        closeNotificationsModal2();
    }, 150);
}



// Новая функция для закрытия только чата (без закрытия уведомлений)
function closeChatModalOnly() {
    const modal = document.getElementById('chatModal');
    if (!modal) return;
    
    // Останавливаем опрос
    stopChatPolling();
    
    const content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('animate-modalShow');
        content.classList.add('animate-modalHide');
    }
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        currentChatNotificationId = null;
        
        // Модалка уведомлений остается открытой
    }, 150);
}



// Загрузка сообщений чата
async function loadChatMessages(notificationId) {
    try {
        console.log('Загрузка сообщений для уведомления:', notificationId);
        
        const response = await fetch(`/notifications/${notificationId}/chat/`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        console.log('Получены данные чата:', data);
        
        if (data.success) {
            chatMessages = data.messages || [];
            renderChatMessages();
            scrollChatToBottom();
        } else {
            console.error('Ошибка загрузки сообщений:', data.error);
        }
    } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
    }
}



// Обновленная функция отображения сообщений чата
function renderChatMessages() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    let messagesHTML = '';
    
    chatMessages.forEach(message => {
        const messageTime = new Date(message.created_at).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Определяем аватарку в зависимости от пользователя
        let avatarHTML = '';
        if (message.is_staff) {
            // Аватарка для админа с логотипом
            avatarHTML = `
                <div class="flex-shrink-0 w-8 h-8 rounded-lg bg-[#000b21] flex items-center justify-center border border-blue-500/30">
                    <img src="/static/main/ico.svg" class="w-5 h-5" alt="Admin">
                </div>
            `;
        } else {
            // Аватарка для пользователя с инициалами
            const userInitials = getUserInitials(message.username);
            const avatarColor = getAvatarColor(message.user_id);
            avatarHTML = `
                <div class="flex-shrink-0 w-8 h-8 rounded-lg ${avatarColor} flex items-center justify-center text-white text-sm font-semibold">
                    ${userInitials}
                </div>
            `;
        }
        
        messagesHTML += `
            <div class="flex ${message.is_own ? 'justify-end' : 'justify-start'}">
                <div class="flex items-start space-x-2 max-w-[80%]">
                    ${!message.is_own ? avatarHTML : ''}
                    <div class="${message.is_own ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'} rounded-lg px-3 py-2">
                        <div class="text-xs opacity-70 mb-1">
                            ${message.is_own ? 'Вы' : message.username} • ${messageTime}
                            ${message.is_staff ? '<span class="ml-1"><i class="fas fa-crown text-yellow-400"></i></span>' : ''}
                        </div>
                        <div class="text-sm">${escapeHtml(message.message)}</div>
                    </div>
                    ${message.is_own ? avatarHTML : ''}
                </div>
            </div>
        `;
    });
    
    messagesContainer.innerHTML = messagesHTML;
    scrollChatToBottom();
}


async function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!currentChatNotificationId) {
        alert('Ошибка: уведомление не выбрано');
        return;
    }
    
    try {
        const response = await fetch(`/notifications/${currentChatNotificationId}/chat/send/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Добавляем сообщение в список
            chatMessages.push(data.message);
            renderChatMessages();
            scrollChatToBottom();
            
            // Очищаем поле ввода
            input.value = '';
            
            // Для админа обновляем счетчик непрочитанных
            if (window.isAdmin) {
                await checkUnreadChatsForAdmin();
                updateNotificationsCounter2();
                updateChatsTabIndicator();
            }
            
            // ПРИНУДИТЕЛЬНО ПЕРЕЗАПУСКАЕМ ОПРОС ЧАТА
            stopChatPolling();
            startChatPolling();
        } else {
            alert('Ошибка: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        alert('Ошибка сети');
    }
}





// Прокрутка чата вниз
function scrollChatToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Опрос новых сообщений
function startChatPolling() {
    // Останавливаем предыдущий интервал если есть
    stopChatPolling();
    
    // Загружаем сообщения сразу при открытии
    if (currentChatNotificationId) {
        loadChatMessages(currentChatNotificationId);
    }
    
    // Запускаем опрос каждые 30 секунд для админа, 60 для пользователей
    const interval = window.isAdmin ? 30000 : 60000;
    chatPollingInterval = setInterval(async () => {
        if (currentChatNotificationId) {
            await loadChatMessages(currentChatNotificationId);
        }
    }, interval);
}



function stopChatPolling() {
    if (chatPollingInterval) {
        clearInterval(chatPollingInterval);
        chatPollingInterval = null;
    }
}

// -----------------------------
// Обновленная функция загрузки чатов для админа
// -----------------------------
// notification-logo.js - обновленная функция loadAdminChats с детальной отладкой

async function loadAdminChats() {
    if (!window.isAdmin) return;
    
    try {
        const response = await fetch('/notifications/admin/chats/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем счетчик непрочитанных чатов
            unreadChatsCount = data.chats.reduce((total, chat) => total + (chat.unread_count || 0), 0);
            
            // Сортируем чаты: сначала с непрочитанными, потом по дате обновления (свежие сверху)
            const sortedChats = data.chats.sort((a, b) => {
                // Сначала чаты с непрочитанными сообщениями
                if (a.unread_count > 0 && b.unread_count === 0) return -1;
                if (a.unread_count === 0 && b.unread_count > 0) return 1;
                
                // Потом по дате обновления (новые сверху)
                return new Date(b.updated_at) - new Date(a.updated_at);
            });
            
            renderAdminChatsList(sortedChats);
            
            // Обновляем индикаторы
            updateNotificationsCounter2();
            updateChatsTabIndicator();
        } else {
            console.error('Ошибка загрузки чатов админа:', data.error);
            showEmptyChatsState();
        }
    } catch (error) {
        console.error('Ошибка при загрузке чатов админа:', error);
        showEmptyChatsState();
    }
}


async function markChatAsRead(notificationId) {
    try {
        const response = await fetch(`/notifications/${notificationId}/mark_chat_as_read/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем счетчики
            if (window.isAdmin) {
                await checkUnreadChatsForAdmin();
                updateNotificationsCounter2();
                updateChatsTabIndicator();
            }
            console.log(`✅ Чат ${notificationId} помечен как прочитанный`);
        }
    } catch (error) {
        console.error('Ошибка при отметке чата как прочитанного:', error);
    }
}




// Новая функция для обновления индикатора на вкладке чатов
function updateChatsTabIndicator() {
    if (!window.isAdmin) return;
    
    const chatsTabIndicator = document.getElementById('chatsTabIndicator');
    if (!chatsTabIndicator) return;
    
    // Показываем индикатор, если есть непрочитанные сообщения в чатах
    if (unreadChatsCount > 0) {
        chatsTabIndicator.classList.remove('hidden');
        
        // Добавляем анимацию пульсации только если индикатор был скрыт
        if (!chatsTabIndicator.classList.contains('animate-ping')) {
            chatsTabIndicator.classList.add('animate-ping');
            
            // Убираем анимацию через 2 секунды
            setTimeout(() => {
                chatsTabIndicator.classList.remove('animate-ping');
            }, 2000);
        }
    } else {
        chatsTabIndicator.classList.add('hidden');
        chatsTabIndicator.classList.remove('animate-ping');
    }
}


// -----------------------------
// Отображение списка чатов для админа
// -----------------------------
function renderAdminChatsList(chats) {
    const adminChatsList = document.getElementById('adminChatsList');
    const emptyChatsState = document.getElementById('emptyChatsState');
    const chatsCount = document.getElementById('chatsCount');
    
    if (!adminChatsList) return;

    // Обновляем счетчик в футере
    if (chatsCount) {
        chatsCount.textContent = chats.length;
    }

    if (chats.length === 0) {
        showEmptyChatsState();
        return;
    }

    // Скрываем пустое состояние
    if (emptyChatsState) {
        emptyChatsState.classList.add('hidden');
    }

    let chatsHTML = '';
    
    chats.forEach((chat, index) => {
        const timeAgo = getTimeAgo(chat.updated_at);
        const hasUnread = chat.unread_count > 0;
        
        chatsHTML += `
            <div class="chat-item bg-gray-700/30 border ${hasUnread ? 'border-green-500/20 bg-green-500/10' : 'border-gray-600/30'} rounded-xl p-3 cursor-pointer hover:bg-gray-700/50 transition-all" 
                 data-notification-id="${chat.notification_id}">
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 rounded-full ${hasUnread ? 'bg-green-500/20' : 'bg-gray-600/20'} flex items-center justify-center flex-shrink-0 mt-1">
                        <i class="fas fa-user text-green-400 text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between mb-1">
                            <h3 class="text-sm font-semibold ${hasUnread ? 'text-white' : 'text-gray-300'} truncate">
                                ${escapeHtml(chat.target_user.username)}
                            </h3>
                            <span class="text-xs ${hasUnread ? 'text-green-400' : 'text-gray-500'} font-medium ml-2 whitespace-nowrap">${timeAgo}</span>
                        </div>
                        <p class="text-xs ${hasUnread ? 'text-gray-300' : 'text-gray-400'} leading-relaxed truncate">
                            ${escapeHtml(chat.last_message ? chat.last_message.text : 'Чат начат')}
                        </p>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center space-x-2">
                                ${hasUnread ? `
                                <span class="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                                <span class="text-xs text-green-400">${chat.unread_count} новое</span>
                                ` : ''}
                                <span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">Чат</span>
                            </div>
                            <!-- Кнопка удаления чата -->
                            <button class="delete-chat-btn px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center space-x-1"
                                    onclick="event.stopPropagation(); deleteChatCompletely(${chat.notification_id}, this.closest('.chat-item'))">
                                <i class="fas fa-trash"></i>
                                <span>Удалить чат</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    adminChatsList.innerHTML = chatsHTML;
    
    // Инициализируем обработчики клика для открытия чатов
    setTimeout(() => {
        initChatsClickHandlers();
    }, 100);
}


    

// Альтернативная версия - гарантированные обработчики
function initChatsClickHandlers() {
    console.log('🔄 Инициализация обработчиков чатов...');
    
    // Используем MutationObserver для отслеживания изменений DOM
    const adminChatsList = document.getElementById('adminChatsList');
    if (!adminChatsList) {
        console.error('❌ adminChatsList не найден');
        return;
    }
    
    // Обработчик для делегирования событий
    const handleChatClick = (e) => {
        console.log('🎯 Событие клика поймано:', e.target);
        
        const chatItem = e.target.closest('.chat-item');
        if (chatItem) {
            console.log('✅ Найден chat-item:', chatItem);
            const notificationId = chatItem.getAttribute('data-notification-id');
            if (notificationId) {
                console.log(`🎯 Открываем чат ${notificationId}`);
                e.stopPropagation();
                openAdminChat(parseInt(notificationId));
            } else {
                console.error('❌ data-notification-id не найден');
            }
        } else {
            console.log('❌ chat-item не найден по клику');
        }
    };
    
    // Удаляем старый обработчик и добавляем новый
    adminChatsList.removeEventListener('click', handleChatClick);
    adminChatsList.addEventListener('click', handleChatClick);
    
    console.log('✅ Обработчики чатов инициализированы');
}

// -----------------------------
// Добавление обработчиков клика на элементы чата
// -----------------------------
function addChatItemClickHandlers() {
    const chatItems = document.querySelectorAll('.chat-item');
    console.log(`🔗 Добавляем обработчики для ${chatItems.length} чатов`);
    
    chatItems.forEach(chatItem => {
        // Удаляем старые обработчики чтобы избежать дублирования
        chatItem.replaceWith(chatItem.cloneNode(true));
    });
    
    // Добавляем новые обработчики через делегирование событий
    const adminChatsList = document.getElementById('adminChatsList');
    if (adminChatsList) {
        adminChatsList.addEventListener('click', function(e) {
            const chatItem = e.target.closest('.chat-item');
            if (chatItem) {
                const notificationId = chatItem.getAttribute('data-notification-id');
                if (notificationId) {
                    console.log(`🖱️ Клик по чату с notification_id: ${notificationId}`);
                    openAdminChat(parseInt(notificationId));
                }
            }
        });
    }
}



// -----------------------------
// Показать пустое состояние для чатов
// -----------------------------
function showEmptyChatsState() {
    const adminChatsList = document.getElementById('adminChatsList');
    const emptyChatsState = document.getElementById('emptyChatsState');
    const chatsCount = document.getElementById('chatsCount');
    
    if (adminChatsList) adminChatsList.innerHTML = '';
    if (emptyChatsState) emptyChatsState.classList.remove('hidden');
    if (chatsCount) chatsCount.textContent = '0';
}



// -----------------------------
// Открытие чата для админа
// -----------------------------
function openAdminChat(notificationId) {
    console.log('👨‍💼 Админ открывает чат для уведомления:', notificationId);
    
    // Сначала открываем чат, потом закрываем уведомления
    openChatModal(notificationId);
}



// -----------------------------
// Обновленная функция загрузки уведомлений
// -----------------------------
async function loadUserNotifications() {
    try {
        const response = await fetch('/notifications/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            userNotifications = data.notifications;
            unreadCount = data.unread_count;
            
            // Для уведомлений с чатом загружаем последние сообщения (только для пользователей)
            if (!window.isAdmin) {
                await loadLastChatMessagesForNotifications();
            }
            
            // Сортируем уведомления: сначала непрочитанные, потом по дате (свежие сверху)
            userNotifications.sort((a, b) => {
                // Сначала непрочитанные
                if (!a.is_read && b.is_read) return -1;
                if (a.is_read && !b.is_read) return 1;
                
                // Потом по дате (новые сверху)
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
            renderNotificationsList2();
            updateNotificationsCounter2();
        } else {
            console.error('Ошибка загрузки уведомлений:', data.error);
        }
    } catch (error) {
        console.error('Ошибка при загрузке уведомлений:', error);
    }
}


// Функция для загрузки последнего сообщения конкретного чата
async function loadLastChatMessage(notificationId) {
    try {
        const response = await fetch(`/notifications/${notificationId}/chat/last_message/`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.last_message) {
            // Обновляем уведомление в массиве
            const notificationIndex = userNotifications.findIndex(n => n.notification_id == notificationId);
            if (notificationIndex !== -1) {
                userNotifications[notificationIndex].last_chat_message = data.last_message.message;
                userNotifications[notificationIndex].last_message_time = data.last_message.created_at;
            }
        }
    } catch (error) {
        console.error(`Ошибка при загрузке последнего сообщения для чата ${notificationId}:`, error);
    }
}



async function loadLastChatMessagesForNotifications() {
    if (window.isAdmin) return;
    
    try {
        // Собираем ID всех уведомлений с чатами
        const chatNotificationIds = userNotifications
            .filter(notif => notif.has_chat)
            .map(notif => notif.notification_id);
        
        if (chatNotificationIds.length === 0) return;
        
        console.log('🔄 Загружаем последние сообщения для чатов:', chatNotificationIds);
        
        // Загружаем последние сообщения для каждого чата
        for (const notificationId of chatNotificationIds) {
            await loadLastChatMessageForUser(notificationId);
        }
    } catch (error) {
        console.error('Ошибка при загрузке последних сообщений чатов:', error);
    }
}



async function loadLastChatMessageForUser(notificationId) {
    try {
        // Используем тот же endpoint, что и для загрузки всех сообщений, но берем только последнее
        const response = await fetch(`/notifications/${notificationId}/chat/`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
            // Берем последнее сообщение из массива (самое новое)
            const lastMessage = data.messages[data.messages.length - 1];
            
            // Обновляем уведомление в массиве
            const notificationIndex = userNotifications.findIndex(n => n.notification_id == notificationId);
            if (notificationIndex !== -1) {
                userNotifications[notificationIndex].last_chat_message = lastMessage.message;
                userNotifications[notificationIndex].last_message_time = lastMessage.created_at;
                console.log(`✅ Последнее сообщение для чата ${notificationId}:`, lastMessage.message);
            }
        } else {
            console.log(`❌ Нет сообщений для чата ${notificationId}`);
        }
    } catch (error) {
        console.error(`Ошибка при загрузке последнего сообщения для чата ${notificationId}:`, error);
    }
}




// -----------------------------
// Инициализация системы фильтров
// -----------------------------
function initNotificationsFilters() {
    // Обработчики для кнопок фильтров
    document.querySelectorAll('.filter-notification-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            applyNotificationsFilter2(filter);
        });
    });
}


// notification-logo.js - добавляем в существующую систему
function initUserChats() {
    if (!window.isAdmin) {
        // Добавляем вкладку для чатов пользователей
        addUserChatsTab();
        loadUserChats();
    }
}

function addUserChatsTab() {
    // Добавляем кнопку фильтра для чатов пользователей
    const filtersContainer = document.querySelector('.flex.space-x-1.bg-gray-700.rounded-lg.p-1');
    if (filtersContainer) {
        filtersContainer.innerHTML += `
            <button class="filter-notification-btn flex-1 py-1.5 px-2 rounded text-xs font-medium transition-all active:scale-95 bg-gray-700 text-gray-300" data-filter="user_chats">
                Чаты
            </button>
        `;
    }
}
// Оригинальная функция рендеринга (для случаев когда модалка закрыта)
function renderNotificationsList2() {
    const notificationsList2 = document.getElementById('notificationsList2');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    const counterElement2 = document.getElementById('notificationsCount2');
    
    if (!notificationsList2) return;

    // Обновляем счетчик
    if (counterElement2) {
        counterElement2.textContent = userNotifications.length;
    }

    if (userNotifications.length === 0) {
        if (emptyState2) emptyState2.classList.remove('hidden');
        notificationsList2.innerHTML = '';
        return;
    }

    if (emptyState2) emptyState2.classList.add('hidden');

    let notificationsHTML = '';
    
    userNotifications.forEach(notif => {
        const isUnread = !notif.is_read;
        const timeAgo = getTimeAgo(notif.created_at);
        const hasChat = notif.has_chat || false;
        
        // Для уведомлений с чатом используем последнее сообщение, для остальных - оригинальное
        const displayMessage = hasChat && notif.last_chat_message 
            ? notif.last_chat_message 
            : notif.message;
        
        // Обрезаем длинное сообщение
        const truncatedMessage = truncateMessage(displayMessage, 200);
        
        notificationsHTML += `
            <div class="notification-item bg-gray-700/30 border ${isUnread ? 'border-blue-500/20 bg-blue-500/10' : 'border-gray-600/30'} rounded-xl p-3 cursor-pointer hover:bg-gray-700/50 transition-all" 
                 data-id="${notif.id}" 
                 data-unread="${isUnread}" 
                 data-notification-id="${notif.notification_id}"
                 data-has-chat="${hasChat}"
                 onclick="handleNotificationClick(${notif.id}, ${hasChat})">
                <div class="flex items-start space-x-3">
                    <div class="w-8 h-8 rounded-full ${isUnread ? 'bg-blue-500/20' : 'bg-gray-600/20'} flex items-center justify-center flex-shrink-0 mt-1">
                        <i class="fas ${notif.is_personal ? 'fa-user text-green-400' : 'fa-bullhorn text-blue-400'} text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between mb-1">
                            <h3 class="text-sm font-semibold ${isUnread ? 'text-white' : 'text-gray-300'} truncate">${escapeHtml(notif.title)}</h3>
                            <span class="text-xs ${isUnread ? 'text-blue-400' : 'text-gray-500'} font-medium ml-2 whitespace-nowrap">${timeAgo}</span>
                        </div>
                        <p class="text-xs ${isUnread ? 'text-gray-300' : 'text-gray-400'} leading-relaxed line-clamp-3">
                            ${escapeHtml(truncatedMessage)}
                        </p>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center space-x-2">
                                ${isUnread ? `
                                <span class="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                                <span class="text-xs text-blue-400">Новое</span>
                                ` : ''}
                                ${notif.is_personal ? '<span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Персональное</span>' : ''}
                                ${hasChat ? '<span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">Есть чат</span>' : ''}

                                ${(window.isAdmin && !notif.is_personal) ? `
<button class="delete-notification-btn text-xs text-red-400 hover:text-red-300 transition-colors p-1" 
        data-notification-id="${notif.notification_id}"
        title="Удалить уведомление"
        onclick="event.stopPropagation(); deleteSystemNotification(${notif.notification_id}, this.closest('.notification-item'))">
    <i class="fas fa-trash"></i>
</button>
` : ''}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    notificationsList2.innerHTML = notificationsHTML;
    applyNotificationsFilter2(getCurrentFilter());
}


// Вспомогательные функции для обновления интерфейса
function updateNotificationsCounters() {
    const counterElement2 = document.getElementById('notificationsCount2');
    if (counterElement2) {
        counterElement2.textContent = document.querySelectorAll('.notification-item').length;
    }
}

function checkEmptyState() {
    const notificationsList2 = document.getElementById('notificationsList2');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    
    if (notificationsList2 && emptyState2) {
        const remainingItems = notificationsList2.querySelectorAll('.notification-item').length;
        if (remainingItems === 0) {
            emptyState2.classList.remove('hidden');
        }
    }
}



// Функция удаления всех уведомлений (для админа)
async function deleteAllNotifications() {
    if (!window.isAdmin) return;
    
    if (!confirm('Вы уверены, что хотите удалить все уведомления? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const response = await fetch('/notifications/delete_all/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Очищаем локальные данные
            userNotifications = [];
            unreadCount = 0;
            
            // Обновляем интерфейс
            if (isNotificationsModalOpen) {
                smoothRenderNotificationsList2();
            }
            updateNotificationsCounter2();
            
            alert('Все уведомления успешно удалены');
        } else {
            alert('Ошибка при удалении уведомлений: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка при удалении всех уведомлений:', error);
        alert('Ошибка при удалении уведомлений');
    }
}


// -----------------------------
// Обработчик клика по уведомлению
// -----------------------------
// Обновленная функция обработки клика по уведомлению
function handleNotificationClick(notificationId, hasChat) {
    console.log('🖱️ Клик по уведомлению:', { notificationId, hasChat });
    
    // Находим уведомление в массиве
    const notification = userNotifications.find(n => n.id == notificationId);
    if (!notification) return;
    
    // Проверяем, является ли это админским чатом
    const isAdminChat = notification.is_admin_chat || false;
    
    if (hasChat || isAdminChat) {
        // Если есть чат или это админский чат - сразу открываем чат
        openChatFromNotification(notificationId);
    } else {
        // Если чата нет - открываем детальное view
        openNotificationDetail(notificationId);
    }
}


// Обновленная функция открытия чата из уведомления
function openChatFromNotification(userNotificationId) {
    console.log('💬 Пользователь открывает чат из уведомления:', userNotificationId);
    
    // Находим уведомление в массиве
    const notification = userNotifications.find(n => n.id == userNotificationId);
    if (!notification) return;
    
    // НЕ закрываем модалку уведомлений - оставляем её открытой
    
    // Помечаем уведомление как прочитанное, если оно не прочитано
    if (!notification.is_read) {
        markNotificationAsRead2(userNotificationId);
    }
    
    // Открываем чат
    openChatModal(userNotificationId);
}



// Функция полного удаления чата
// Функция полного удаления чата
async function deleteChatCompletely(notificationId, element) {
    if (!confirm('Вы уверены, что хотите полностью удалить этот чат? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const response = await fetch(`/notifications/${notificationId}/delete_chat/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Плавно удаляем элемент из DOM
            element.style.opacity = '0';
            element.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                element.remove();
                
                // Обновляем счетчик чатов
                const chatsCount = document.getElementById('chatsCount');
                if (chatsCount) {
                    const currentCount = parseInt(chatsCount.textContent);
                    chatsCount.textContent = Math.max(0, currentCount - 1);
                }
                
                // Проверяем пустой список
                const adminChatsList = document.getElementById('adminChatsList');
                const emptyChatsState = document.getElementById('emptyChatsState');
                if (adminChatsList && emptyChatsState) {
                    const remainingChats = adminChatsList.querySelectorAll('.chat-item').length;
                    if (remainingChats === 0) {
                        emptyChatsState.classList.remove('hidden');
                    }
                }
            }, 300);
            
            alert('Чат успешно удален');
        } else {
            alert('Ошибка при удалении чата: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка при удалении чата:', error);
        alert('Ошибка при удалении чата');
    }
}





// -----------------------------
// Открытие детального просмотра уведомления
// -----------------------------
// notification-logo.js - обновленная функция openNotificationDetail
// Обновленная функция открытия детального просмотра уведомления
function openNotificationDetail(notificationId) {
    // Находим уведомление в массиве
    const notification = userNotifications.find(n => n.id == notificationId);
    if (!notification) return;
    
    currentNotificationDetail = notification;
    
    // Устанавливаем заголовок модалки (тип уведомления)
    const modalTitle = document.getElementById('notificationModalTitle');
    if (notification.is_personal) {
        modalTitle.innerHTML = '<i class="fas fa-user text-green-400 mr-2"></i>Персональное уведомление';
    } else {
        modalTitle.innerHTML = 'Обновление';
    }
    
    // Заполняем заголовок новости
    document.getElementById('notificationDetailTitle').textContent = notification.title;
    
    // Заполняем текст уведомления (полный текст)
    document.getElementById('notificationDetailMessage').textContent = notification.message;
    
    // Устанавливаем дату
    const dateElement = document.getElementById('notificationDetailDate');
    const date = new Date(notification.created_at);
    dateElement.textContent = date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Скрываем кнопку "Обсудить" - теперь чат открывается сразу при клике на уведомление
    const discussBtn = document.getElementById('discussNotificationBtn');
    discussBtn.classList.add('hidden');
    
    // Показываем модалку
    const modal = document.getElementById('notificationDetailModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.remove('hidden');
        modal.classList.add('animate-overlayFadeIn');
        
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.classList.remove('animate-modalHide');
            content.classList.add('animate-modalShow');
        }
        
        document.body.classList.add('modal-open');
    }, 10);
    
    // Если уведомление не прочитано, помечаем как прочитанное
    if (!notification.is_read) {
        markNotificationAsRead2(notificationId);
    }
}



// -----------------------------
// Инициализация чата
// -----------------------------
// Обновленная функция инициализации чата с кнопкой "Назад"
function initChatModal() {
    const modal = document.getElementById('chatModal');
    if (!modal) return;
    
    // Обработчики закрытия
    const closeBtns = modal.querySelectorAll('[data-close="chatModal"]');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeChatModal);
    });
    
    // Обработчик для кнопки "Назад" - закрывает только чат
    const backBtn = document.getElementById('chatBackButton');
    if (backBtn) {
        backBtn.addEventListener('click', closeChatModalOnly);
    }
    
    // Закрытие по клику вне модалки
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeChatModal();
        }
    });
    
    // Отправка сообщения по клику
    const sendBtn = document.getElementById('sendChatMessage');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendChatMessage);
    }
    
    // Отправка сообщения по Enter
    const messageInput = document.getElementById('chatMessageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Закрытие по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeChatModal();
        }
    });
}




// -----------------------------
// Закрытие модалки детального просмотра
// -----------------------------
function closeNotificationDetailModal() {
    const modal = document.getElementById('notificationDetailModal');
    if (!modal) return;
    
    const content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('animate-modalShow');
        content.classList.add('animate-modalHide');
    }
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        currentNotificationDetail = null;
    }, 150);
}


// -----------------------------
// Обновленная функция пометки уведомления как прочитанного
// -----------------------------
async function markNotificationAsRead2(notificationId) {
    try {
        const response = await fetch(`/notifications/${notificationId}/read/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем данные в локальном массиве
            const notificationIndex = userNotifications.findIndex(n => n.id == notificationId);
            if (notificationIndex !== -1) {
                userNotifications[notificationIndex].is_read = true;
                userNotifications[notificationIndex].read_at = new Date().toISOString();
            }
            
            // Обновляем интерфейс
            const notificationElement = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
            if (notificationElement) {
                updateNotificationElementStyle(notificationElement, false);
            }
            
            // Обновляем счетчик
            unreadCount = Math.max(0, unreadCount - 1);
            updateNotificationsCounter2();
        }
    } catch (error) {
        console.error('Ошибка при отметке уведомления как прочитанного:', error);
    }
}


// -----------------------------
// Вспомогательная функция для обновления стиля элемента уведомления
// -----------------------------
function updateNotificationElementStyle(element, isUnread) {
    if (isUnread) {
        element.classList.add('border-blue-500/20', 'bg-blue-500/10');
        element.classList.remove('border-gray-600/30', 'bg-gray-700/30');
        
        // Обновляем внутренние элементы для непрочитанного состояния
        const title = element.querySelector('h3');
        if (title) {
            title.classList.add('text-white');
            title.classList.remove('text-gray-300');
        }
        
        const message = element.querySelector('p');
        if (message) {
            message.classList.add('text-gray-300');
            message.classList.remove('text-gray-400');
        }
        
        const time = element.querySelector('span.text-blue-400, span.text-gray-500');
        if (time) {
            time.classList.add('text-blue-400');
            time.classList.remove('text-gray-500');
        }
        
        const iconContainer = element.querySelector('.w-8.h-8.rounded-full');
        if (iconContainer) {
            iconContainer.classList.add('bg-blue-500/20');
            iconContainer.classList.remove('bg-gray-600/20');
        }
    } else {
        element.classList.remove('border-blue-500/20', 'bg-blue-500/10');
        element.classList.add('border-gray-600/30', 'bg-gray-700/30');
        
        // Обновляем внутренние элементы для прочитанного состояния
        const title = element.querySelector('h3');
        if (title) {
            title.classList.remove('text-white');
            title.classList.add('text-gray-300');
        }
        
        const message = element.querySelector('p');
        if (message) {
            message.classList.remove('text-gray-300');
            message.classList.add('text-gray-400');
        }
        
        const time = element.querySelector('span.text-blue-400, span.text-gray-500');
        if (time) {
            time.classList.remove('text-blue-400');
            time.classList.add('text-gray-500');
        }
        
        const iconContainer = element.querySelector('.w-8.h-8.rounded-full');
        if (iconContainer) {
            iconContainer.classList.remove('bg-blue-500/20');
            iconContainer.classList.add('bg-gray-600/20');
        }
        
        // Убираем индикатор нового сообщения
        const newIndicator = element.querySelector('.bg-blue-400');
        if (newIndicator && newIndicator.parentElement) {
            newIndicator.parentElement.remove();
        }
    }
    
    element.setAttribute('data-unread', isUnread.toString());
}


// -----------------------------
// Инициализация модалки детального просмотра
// -----------------------------
function initNotificationDetailModal() {
    const modal = document.getElementById('notificationDetailModal');
    if (!modal) return;
    
    // Обработчики закрытия
    const closeBtns = modal.querySelectorAll('[data-close="notificationDetailModal"]');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeNotificationDetailModal);
    });
    
    // Закрытие по клику вне модалки
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeNotificationDetailModal();
        }
    });
    
    // Закрытие по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            closeNotificationDetailModal();
        }
    });
}

// -----------------------------
// Загрузка персональных уведомлений для админа
// -----------------------------
async function loadPersonalNotifications() {
    try {
        const response = await fetch('/notifications/personal/', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderPersonalNotificationsList(data.notifications);
        } else {
            console.error('Ошибка загрузки персональных уведомлений:', data.error);
            renderPersonalNotificationsList([]);
        }
    } catch (error) {
        console.error('Ошибка при загрузке персональных уведомлений:', error);
        renderPersonalNotificationsList([]);
    }
}

// -----------------------------
// Отображение списка персональных уведомлений
// -----------------------------
function renderPersonalNotificationsList(personalNotifications) {
    const notificationsList2 = document.getElementById('notificationsList2');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    const counterElement2 = document.getElementById('notificationsCount2');
    
    if (!notificationsList2) return;

    // Обновляем счетчик
    if (counterElement2) {
        counterElement2.textContent = personalNotifications.length;
    }

    if (personalNotifications.length === 0) {
        if (emptyState2) {
            emptyState2.innerHTML = `
                <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center">
                    <i class="fas fa-user-slash text-2xl text-gray-500"></i>
                </div>
                <p class="text-gray-400">Персональных уведомлений нет</p>
                <p class="text-sm text-gray-500 mt-1">Вы еще не отправляли персональные уведомления</p>
            `;
            emptyState2.classList.remove('hidden');
        }
        notificationsList2.innerHTML = '';
        return;
    }

    if (emptyState2) emptyState2.classList.add('hidden');

    let notificationsHTML = '';
    
    personalNotifications.forEach(notif => {
        const isUnread = !notif.is_read;
        const timeAgo = getTimeAgo(notif.created_at);
        
        notificationsHTML += `
    <div class="notification-item bg-gray-700/30 border ${isUnread ? 'border-blue-500/20 bg-blue-500/10' : 'border-gray-600/30'} rounded-xl p-3 animate-fadeIn cursor-pointer hover:bg-gray-700/50 transition-all" 
         data-id="${notif.id}" 
         data-unread="${isUnread}" 
         data-notification-id="${notif.notification_id}"
         onclick="openNotificationDetail(${notif.id})">
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full ${isUnread ? 'bg-blue-500/20' : 'bg-gray-600/20'} flex items-center justify-center flex-shrink-0 mt-1">
                <i class="fas ${notif.is_personal ? 'fa-user text-green-400' : 'fa-bullhorn text-blue-400'} text-sm"></i>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between mb-2">
                    <h3 class="text-sm font-bold ${isUnread ? 'text-white' : 'text-gray-300'} truncate">${escapeHtml(notif.title)}</h3>
                    <span class="text-xs ${isUnread ? 'text-blue-400' : 'text-gray-500'} font-medium ml-2 whitespace-nowrap">${timeAgo}</span>
                </div>
                <p class="text-xs ${isUnread ? 'text-gray-300' : 'text-gray-400'} leading-relaxed line-clamp-3">
                    ${escapeHtml(truncatedMessage)}
                </p>
                <div class="flex items-center justify-between mt-3">
                    <div class="flex items-center space-x-2">
                        ${isUnread ? `
                        <span class="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                        <span class="text-xs text-blue-400">Новое</span>
                        ` : ''}
                        ${notif.is_personal ? 
                          '<span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">Персональное</span>' : 
                          '<span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">Системное</span>'}
                    </div>
                    <!-- Кнопка удаления для админа -->
                   ${(window.isAdmin && !notif.is_personal) ? `
<button class="delete-notification-btn text-xs text-red-400 hover:text-red-300 transition-colors p-1" 
        data-notification-id="${notif.notification_id}"
        title="Удалить уведомление"
        onclick="event.stopPropagation(); deleteSystemNotification(${notif.notification_id}, this.closest('.notification-item'))">
    <i class="fas fa-trash"></i>
</button>
` : ''}
                </div>
            </div>
        </div>
    </div>
`;
    });
    
    notificationsList2.innerHTML = notificationsHTML;
}



// -----------------------------
// Пометить уведомление как прочитанное
// -----------------------------
async function markNotificationAsRead2(notificationId, notificationElement) {
    try {
        const response = await fetch(`/notifications/${notificationId}/read/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем стиль уведомления
            notificationElement.classList.remove('bg-blue-500/10', 'border-blue-500/20');
            notificationElement.classList.add('bg-gray-700/30', 'border-gray-600/30');
            notificationElement.setAttribute('data-unread', 'false');
            
            // Убираем индикатор нового сообщения
            const newIndicator = notificationElement.querySelector('.bg-blue-400');
            if (newIndicator && newIndicator.parentElement) {
                newIndicator.parentElement.remove();
            }
            
            // Обновляем заголовок
            const title = notificationElement.querySelector('h3');
            if (title) {
                title.classList.remove('text-white');
                title.classList.add('text-gray-300');
            }
            
            // Обновляем текст
            const message = notificationElement.querySelector('p');
            if (message) {
                message.classList.remove('text-gray-300');
                message.classList.add('text-gray-400');
            }
            
            // Обновляем время
            const time = notificationElement.querySelector('span.text-blue-400');
            if (time) {
                time.classList.remove('text-blue-400');
                time.classList.add('text-gray-500');
            }
            
            // Обновляем иконку
            const icon = notificationElement.querySelector('.fa-bullhorn');
            const iconContainer = notificationElement.querySelector('.w-8.h-8.rounded-full');
            if (icon && iconContainer) {
                icon.classList.remove('text-blue-400');
                icon.classList.add('text-gray-400');
                iconContainer.classList.remove('bg-blue-500/20');
                iconContainer.classList.add('bg-gray-600/20');
            }

            // Обновляем счетчик
            unreadCount = Math.max(0, unreadCount - 1);
            updateNotificationsCounter2();
        }
    } catch (error) {
        console.error('Ошибка при отметке уведомления как прочитанного:', error);
    }
}




// -----------------------------
// Пометить ВСЕ уведомления как прочитанные
// -----------------------------
async function markAllNotificationsAsRead2() {
    const markAllAsReadBtn = document.getElementById('markAllAsReadBtn');
    if (!markAllAsReadBtn) return;
    
    // Сохраняем оригинальный текст кнопки
    const originalText = markAllAsReadBtn.innerHTML;
    
    try {
        // Меняем текст кнопки на "Обработка..."
        markAllAsReadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Обработка...';
        markAllAsReadBtn.disabled = true;
        
        const response = await fetch('/notifications/mark_all_as_read/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Обновляем все уведомления в интерфейсе
            const notificationItems = document.querySelectorAll('.notification-item[data-unread="true"]');
            
            notificationItems.forEach(notificationElement => {
                // Обновляем стиль уведомления
                notificationElement.classList.remove('bg-blue-500/10', 'border-blue-500/20');
                notificationElement.classList.add('bg-gray-700/30', 'border-gray-600/30');
                notificationElement.setAttribute('data-unread', 'false');
                
                // Убираем индикатор нового сообщения
                const newIndicator = notificationElement.querySelector('.bg-blue-400');
                if (newIndicator && newIndicator.parentElement) {
                    newIndicator.parentElement.remove();
                }
                
                // Обновляем заголовок
                const title = notificationElement.querySelector('h3');
                if (title) {
                    title.classList.remove('text-white');
                    title.classList.add('text-gray-300');
                }
                
                // Обновляем текст
                const message = notificationElement.querySelector('p');
                if (message) {
                    message.classList.remove('text-gray-300');
                    message.classList.add('text-gray-400');
                }
                
                // Обновляем время
                const time = notificationElement.querySelector('span.text-blue-400');
                if (time) {
                    time.classList.remove('text-blue-400');
                    time.classList.add('text-gray-500');
                }
                
                // Обновляем иконку
                const icon = notificationElement.querySelector('.fa-bullhorn');
                const iconContainer = notificationElement.querySelector('.w-8.h-8.rounded-full');
                if (icon && iconContainer) {
                    icon.classList.remove('text-blue-400');
                    icon.classList.add('text-gray-400');
                    iconContainer.classList.remove('bg-blue-500/20');
                    iconContainer.classList.add('bg-gray-600/20');
                }
            });

            // Обновляем счетчик
            unreadCount = 0;
            updateNotificationsCounter2();

            // Показываем успешное сообщение в самой кнопке
            markAllAsReadBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Все успешно прочитано!';
            markAllAsReadBtn.classList.remove('text-green-400', 'hover:text-green-300');
            markAllAsReadBtn.classList.add('text-blue-400');
            
            // Анимация успеха
            markAllAsReadBtn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                markAllAsReadBtn.style.transform = 'scale(1)';
                markAllAsReadBtn.style.transition = 'all 0.3s ease';
            }, 150);
            
            // Возвращаем исходное состояние через 2 секунды
            setTimeout(() => {
                markAllAsReadBtn.innerHTML = originalText;
                markAllAsReadBtn.classList.remove('text-blue-400');
                markAllAsReadBtn.classList.add('text-green-400', 'hover:text-green-300');
                markAllAsReadBtn.disabled = false;
                markAllAsReadBtn.style.transform = '';
                markAllAsReadBtn.style.transition = '';
            }, 2000);
            
        } else {
            // В случае ошибки
            markAllAsReadBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Ошибка!';
            markAllAsReadBtn.classList.remove('text-green-400', 'hover:text-green-300');
            markAllAsReadBtn.classList.add('text-red-400');
            
            setTimeout(() => {
                markAllAsReadBtn.innerHTML = originalText;
                markAllAsReadBtn.classList.remove('text-red-400');
                markAllAsReadBtn.classList.add('text-green-400', 'hover:text-green-300');
                markAllAsReadBtn.disabled = false;
            }, 2000);
            
            console.error('Ошибка при отметке всех уведомлений как прочитанных:', data.error);
        }
    } catch (error) {
        // В случае ошибки сети
        markAllAsReadBtn.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Ошибка сети!';
        markAllAsReadBtn.classList.remove('text-green-400', 'hover:text-green-300');
        markAllAsReadBtn.classList.add('text-red-400');
        
        setTimeout(() => {
            markAllAsReadBtn.innerHTML = originalText;
            markAllAsReadBtn.classList.remove('text-red-400');
            markAllAsReadBtn.classList.add('text-green-400', 'hover:text-green-300');
            markAllAsReadBtn.disabled = false;
        }, 2000);
        
        console.error('Ошибка при отметке всех уведомлений как прочитанных:', error);
    }
}



// -----------------------------
// Удаление системного уведомления (для админа)
// -----------------------------
async function deleteSystemNotification(notificationId, notificationElement) {
    if (!confirm('Вы уверены, что хотите удалить это уведомление?')) {
        return;
    }
    
    try {
        const response = await fetch(`/notifications/${notificationId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Плавно скрываем уведомление
            notificationElement.style.opacity = '0';
            notificationElement.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                notificationElement.remove();
                
                // Обновляем счетчик
                const counterElement2 = document.getElementById('notificationsCount2');
                if (counterElement2) {
                    const currentCount = parseInt(counterElement2.textContent);
                    counterElement2.textContent = Math.max(0, currentCount - 1);
                }
                
                // Проверяем пустой список
                const notificationsList2 = document.getElementById('notificationsList2');
                const emptyState2 = document.getElementById('emptyNotificationsState2');
                const remainingItems = notificationsList2.querySelectorAll('.notification-item').length;
                
                if (remainingItems === 0 && emptyState2) {
                    emptyState2.classList.remove('hidden');
                }
            }, 300);
        } else {
            alert('Ошибка при удалении уведомления: ' + data.error);
        }
    } catch (error) {
        console.error('Ошибка при удалении уведомления:', error);
        alert('Ошибка при удалении уведомления');
    }
}



// -----------------------------
// Обновленная функция применения фильтра
// -----------------------------
// Обновленная функция applyNotificationsFilter2
// Обновленная функция применения фильтра
function applyNotificationsFilter2(filter) {
    const notificationsContent = document.getElementById('notificationsContent');
    const adminChatsContent = document.getElementById('adminChatsContent');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    const emptyChatsState = document.getElementById('emptyChatsState');
    const footerCounter = document.getElementById('footerCounter');
    
    // Сбрасываем все активные состояния
    if (notificationsContent) notificationsContent.classList.add('hidden');
    if (adminChatsContent) adminChatsContent.classList.add('hidden');
    if (emptyState2) emptyState2.classList.add('hidden');
    if (emptyChatsState) emptyChatsState.classList.add('hidden');
    
    // Обновляем текст в футере
    if (footerCounter) {
        if (filter === 'chats') {
            footerCounter.innerHTML = 'Активных чатов: <span id="chatsCount">0</span>';
            
            // Если переключились на вкладку чатов, сбрасываем индикатор (пользователь увидел сообщения)
            if (window.isAdmin && unreadChatsCount > 0) {
                // Здесь можно добавить логику пометки чатов как прочитанных при просмотре
                // Пока просто обновляем индикатор
                updateChatsTabIndicator();
            }
        } else {
            footerCounter.innerHTML = 'Всего уведомлений: <span id="notificationsCount2">0</span>';
        }
    }
    
    switch(filter) {
        case 'all':
        case 'unread':
            if (notificationsContent) notificationsContent.classList.remove('hidden');
            applyNotificationsContentFilter(filter);
            break;
            
        case 'chats':
            if (window.isAdmin && adminChatsContent) {
                adminChatsContent.classList.remove('hidden');
                // ЗАГРУЖАЕМ АКТУАЛЬНЫЕ ЧАТЫ ПРИ ПЕРЕКЛЮЧЕНИИ НА ВКЛАДКУ
                loadAdminChats();
            }
            break;
    }
    
    // Обновляем активные кнопки фильтров
    updateFilterButtons(filter);
}
// -----------------------------
// Фильтрация контента уведомлений
// -----------------------------
function applyNotificationsContentFilter(filter) {
    const notifications = document.querySelectorAll('.notification-item');
    const emptyState2 = document.getElementById('emptyNotificationsState2');
    
    let visibleCount = 0;

    notifications.forEach(notification => {
        let show = false;
        const isUnread = notification.getAttribute('data-unread') === 'true';
        
        switch(filter) {
            case 'all':
                show = true;
                break;
            case 'unread':
                show = isUnread;
                break;
        }

        if (show) {
            notification.classList.remove('hidden');
            visibleCount++;
        } else {
            notification.classList.add('hidden');
        }
    });

    // Показываем/скрываем пустое состояние
    if (emptyState2) {
        if (visibleCount === 0 && userNotifications.length > 0) {
            emptyState2.innerHTML = `
                <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-700 flex items-center justify-center">
                    <i class="fas fa-filter text-2xl text-gray-500"></i>
                </div>
                <p class="text-gray-400">Нет уведомлений по выбранному фильтру</p>
            `;
            emptyState2.classList.remove('hidden');
        } else if (userNotifications.length === 0) {
            emptyState2.classList.remove('hidden');
        }
    }
}



// -----------------------------
// Обновление активных кнопок фильтров
// -----------------------------
function updateFilterButtons(activeFilter) {
    const filterButtons = document.querySelectorAll('.filter-notification-btn');
    
    filterButtons.forEach(btn => {
        const filter = btn.getAttribute('data-filter');
        if (filter === activeFilter) {
            btn.classList.remove('bg-gray-700', 'text-gray-300');
            btn.classList.add('bg-blue-600', 'text-white');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-700', 'text-gray-300');
        }
    });
}



// -----------------------------
// Открытие модалки уведомлений
// -----------------------------
// Обновляем функции открытия/закрытия модалки для управления флагом
function openNotificationsModal2() {
    console.log('Opening notifications modal 2');
    if (!notificationsModal2) return;
    
    isNotificationsModalOpen = true;
    notificationsModal2.style.display = 'flex';
    
    setTimeout(() => {
        notificationsModal2.classList.remove('hidden');
        notificationsModal2.classList.add('animate-overlayFadeIn');
        
        const content = notificationsModal2.querySelector('.modal-content');
        if (content) {
            content.classList.remove('animate-modalHide');
            content.classList.add('animate-modalShow');
        }
        
        // Блокируем скролл фона
        document.body.classList.add('modal-open');
        
        // ЗАГРУЖАЕМ АКТУАЛЬНЫЕ УВЕДОМЛЕНИЯ ПРИ ОТКРЫТИИ
        loadUserNotifications();
        
        // Если это админ, загружаем актуальные чаты если открыта вкладка чатов
        if (window.isAdmin) {
            const chatsTab = document.querySelector('.filter-notification-btn[data-filter="chats"]');
            if (chatsTab && chatsTab.classList.contains('bg-blue-600')) {
                loadAdminChats();
            }
        }
        
        // Убираем анимацию пульсации при открытии
        if (notificationIndicator2) {
            notificationIndicator2.classList.remove('animate-ping');
        }
    }, 10);
}
function closeNotificationsModal2() {
    console.log('🔒 Закрытие модалки уведомлений');
    if (!notificationsModal2) return;
    
    isNotificationsModalOpen = false; // Сбрасываем флаг
    notificationsModal2.classList.add('hidden');
    notificationsModal2.style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Функция для генерации цвета аватарки на основе user_id
function getAvatarColor(userId) {
    const colors = [
        'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    return colors[userId % colors.length];
}


// Функция для получения инициалов из имени пользователя
function getUserInitials(username) {
    if (!username) return 'U';
    const parts = username.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
}



// -----------------------------
// Обновление счетчика уведомлений
// -----------------------------
function updateNotificationsCounter2() {
    if (!notificationIconBtn) return;
    
    // Для админа учитываем и уведомления и непрочитанные чаты
    const totalUnread = window.isAdmin ? unreadCount + unreadChatsCount : unreadCount;
    
    // Показываем/скрываем иконку в зависимости от наличия уведомлений
    if (totalUnread > 0) {
        notificationIconBtn.classList.remove('hidden');
    } else {
        notificationIconBtn.classList.add('hidden');
    }
}

// -----------------------------
// Вспомогательные функции
// -----------------------------
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
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
}

// -----------------------------
// Функции для админ-панели уведомлений
// -----------------------------
function openCreateNotificationModal() {
    document.getElementById('createNotificationModal').classList.remove('hidden');
}

function closeCreateNotificationModal() {
    document.getElementById('createNotificationModal').classList.add('hidden');
    document.getElementById('createNotificationForm').reset();
}

// Обработчик формы создания уведомления
// Обработчик формы создания уведомления
document.addEventListener('DOMContentLoaded', function() {
    const createNotificationForm = document.getElementById('createNotificationForm');
    if (createNotificationForm) {
        createNotificationForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const title = document.getElementById('notificationTitle').value;
            const message = document.getElementById('notificationMessage').value;
            const targetUserId = document.getElementById('targetUserId').value;
            
            // Подготавливаем данные
            const formData = {
                title: title,
                message: message,
                is_chat: false  // Добавляем обязательное поле
            };
            
            // Добавляем target_user_id только если указан
            if (targetUserId && targetUserId.trim() !== '') {
                formData.target_user_id = parseInt(targetUserId);
            }
            
            try {
                const response = await fetch('/notifications/create/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCSRFToken(),
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const messageType = data.is_personal ? 'Персональное уведомление' : 'Общее уведомление';
                    alert(`${messageType} успешно отправлено!`);
                    closeCreateNotificationModal();
                    // Перезагружаем уведомления
                    loadUserNotifications();
                } else {
                    alert('Ошибка: ' + data.error);
                }
            } catch (error) {
                console.error('Ошибка при создании уведомления:', error);
                alert('Ошибка при создании уведомления');
            }
        });
    }
});

// -----------------------------
// Обновленная функция инициализации
// -----------------------------
function initNotifications2() {
    console.log('DOM loaded - initializing notifications system 2');
    initNotificationsModal2();
    initNotificationDetailModal(); 
    initNotificationsFilters();// Добавляем инициализацию модалки деталей
    initNotificationsPolling();
    initChatModal(); 
    setTimeout(() => {
        updateNotificationsCounter2();
    }, 1000);
}


// Ожидаем полной загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotifications2);
} else {
    initNotifications2();
}

// Экспортируем функции для глобального использования
window.initNotificationsModal2 = initNotificationsModal2;
window.openNotificationsModal2 = openNotificationsModal2;
window.closeNotificationsModal2 = closeNotificationsModal2;
window.loadUserNotifications = loadUserNotifications;
window.openCreateNotificationModal = openCreateNotificationModal;
window.closeCreateNotificationModal = closeCreateNotificationModal;