// todo.js - с исправленным позиционированием и анимациями
function getCsrfToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 10) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }
    }
    return cookieValue;
}

class TodoManager {
    constructor() {
        this.currentEditingTodo = null;
        this.currentFilter = 'active';
        this.allTodos = [];
        this.initEventListeners();
        this.loadTodos();
    }

    initEventListeners() {
        document.getElementById('saveTodoBtn').addEventListener('click', () => this.saveTodo());
        document.getElementById('closeTodoModalHeaderBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('todoModal').addEventListener('click', (e) => {
            if (e.target.id === 'todoModal') this.closeModal();
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.currentTarget.dataset.filter);
            });
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-blue-500/20', 'text-blue-400', 'border-blue-500/30', 
                                'bg-green-500/20', 'text-green-400', 'border-green-500/30',
                                'bg-gray-800/40', 'text-gray-400', 'border-gray-600/30');
            
            if (btn.dataset.filter === filter) {
                if (filter === 'active') {
                    btn.classList.add('active', 'bg-blue-500/20', 'text-blue-400', 'border-blue-500/30');
                } else {
                    btn.classList.add('active', 'bg-green-500/20', 'text-green-400', 'border-green-500/30');
                }
            } else {
                btn.classList.add('bg-gray-800/40', 'text-gray-400', 'border-gray-600/30');
            }
        });
        
        this.renderFilteredTodos();
    }


openAddModal() {
    this.currentEditingTodo = null;
    document.getElementById('todoModalTitle').innerHTML = 'Новая задача';
    document.getElementById('todoTitleInput').value = '';
    document.getElementById('todoDescriptionInput').value = '';
    this.openModal();
}

openEditModal(todo) {
    this.currentEditingTodo = todo;
    document.getElementById('todoModalTitle').innerHTML = 'Редактирование';
    document.getElementById('todoTitleInput').value = todo.title;
    document.getElementById('todoDescriptionInput').value = todo.description || '';
    this.openModal();
}

openModal() {
    const modal = document.getElementById('todoModal');
    if (modal) {
        animateModal(modal, true);
    }
}

closeModal() {
    const modal = document.getElementById('todoModal');
    if (modal) {
        animateModal(modal, false);
    }
}
   async saveTodo() {
    const title = document.getElementById('todoTitleInput').value.trim();
    const description = document.getElementById('todoDescriptionInput').value.trim();

    if (!title) {
        if (typeof showNotification === 'function') {
            showNotification('Введите название задачи', 'error');
        }
        return;
    }

    const saveButton = document.getElementById('saveTodoBtn');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Сохранение...';
    saveButton.disabled = true;

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('priority', 'medium');
        
        if (this.currentEditingTodo) {
            // При редактировании не передаем статус выполнения
            const response = await fetch(`/todo/update/${this.currentEditingTodo.id}/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            const result = await response.json();
            
            if (result.success) {
                if (typeof showNotification === 'function') {
                    showNotification('Задача обновлена', 'success');
                }
                this.closeModal();
                this.loadTodos();
            } else {
                throw new Error(result.error);
            }
        } else {
            // При создании новой задачи is_completed всегда false
            const response = await fetch('/todo/add/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            const result = await response.json();
            
            if (result.success) {
                if (typeof showNotification === 'function') {
                    showNotification('Задача создана', 'success');
                }
                this.closeModal();
                this.loadTodos();
            } else {
                throw new Error(result.error);
            }
        }
    } catch (error) {
        console.error('Error saving todo:', error);
        if (typeof showNotification === 'function') {
            showNotification('Ошибка при сохранении: ' + error.message, 'error');
        }
    } finally {
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    }
}


    async loadTodos() {
        try {
            const response = await fetch('/todo/get/');
            const result = await response.json();
            
            if (result.success) {
                this.allTodos = result.todos;
                this.renderFilteredTodos();
                this.updateTodoCounter(this.allTodos);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error loading todos:', error);
            if (typeof showNotification === 'function') {
                showNotification('Ошибка при загрузке задач', 'error');
            }
        }
    }

    renderFilteredTodos() {
        let filteredTodos = [];
        
        if (this.currentFilter === 'active') {
            filteredTodos = this.allTodos.filter(todo => !todo.is_completed);
        } else if (this.currentFilter === 'completed') {
            filteredTodos = this.allTodos.filter(todo => todo.is_completed);
        }
        
        filteredTodos.sort((a, b) => {
            if (this.currentFilter === 'active') {
                return new Date(b.created_at) - new Date(a.created_at);
            } else {
                return new Date(b.updated_at) - new Date(a.updated_at);
            }
        });

        this.renderTodos(filteredTodos);
    }

    renderTodos(todos) {
        const todoList = document.getElementById('todoList');
        
        if (todos.length === 0) {
            if (this.currentFilter === 'active') {
                todoList.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-check-circle text-4xl mb-4 opacity-50"></i>
                        <p class="text-lg mb-4">Все задачи выполнены!</p>
                        
                        <button onclick="setTodoFilter('completed')" 
                                class="bg-green-700 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors duration-200">
                            <i class="fas fa-list-check mr-2"></i>Посмотреть выполненные
                        </button>
                    </div>
                `;
            } else {
                todoList.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-clipboard-list text-4xl mb-4 opacity-50"></i>
                        <p class="text-lg mb-4">Пока нет выполненных задач</p>
                        
                        <button onclick="setTodoFilter('active')" 
                                class="bg-blue-700 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors duration-200">
                            <i class="fas fa-arrow-left mr-2"></i>Вернуться к активным
                        </button>
                    </div>
                `;
            }
        } else {
            todoList.innerHTML = todos.map(todo => this.createTodoElement(todo)).join('');
            this.attachTodoEventListeners();
        }
    }

    updateTodoCounter(todos) {
        const todoCounter = document.getElementById('todoCounter');
        const todoIconBtn = document.getElementById('todoIconBtn');
        
        // Фильтруем только активные задачи
        const activeTodos = todos.filter(todo => !todo.is_completed);
        
        if (activeTodos.length > 0) {
            todoIconBtn.classList.remove('hidden');
            todoCounter.classList.remove('hidden');
            todoCounter.textContent = activeTodos.length;
            
           
            
            todoIconBtn.onclick = function() {
                document.querySelectorAll('.mobile-tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                document.getElementById('tab-todo').classList.add('active');
                
                const balanceBlock = document.querySelector('.mobile-header .bg-gradient-to-r');
                if (balanceBlock) {
                    balanceBlock.classList.add('hidden');
                }
                
                document.querySelectorAll('.mobile-nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                const todoNavItem = document.querySelector('.mobile-nav-item[data-tab="todo"]');
                if (todoNavItem) {
                    todoNavItem.classList.add('active');
                }
                
                // При переходе на вкладку показываем активные задачи
                if (window.todoManager) {
                    window.todoManager.setFilter('active');
                }
            };
        } else {
            // Скрываем иконку если нет активных задач
            todoIconBtn.classList.add('hidden');
            todoCounter.classList.add('hidden');
        }
    }

 createTodoElement(todo) {
    const completedClass = todo.is_completed ? 'opacity-60' : '';
    const completedIcon = todo.is_completed ? 
        'fas fa-check-circle text-green-400' : 
        'far fa-circle text-gray-400';
    
    return `
        <div class="todo-item bg-gray-800/40 rounded-xl p-4 border border-gray-700/50 transition-all duration-200 hover:bg-gray-700/40 hover:border-gray-600/50 ${completedClass} mb-3 w-full relative" data-todo-id="${todo.id}">
            <!-- Основной контент -->
            <div class="flex items-start justify-between">
                <!-- Основной контент - кликабельный для переключения статуса -->
                <div class="flex items-start space-x-3 flex-1 min-w-0 cursor-pointer" onclick="todoManager.animateAndToggleTodo('${todo.id}')">
                    <div class="mt-0.5 flex-shrink-0">
                        <i class="${completedIcon} text-lg"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="text-white font-medium break-words leading-tight ${todo.is_completed ? 'line-through text-gray-400' : ''}">
                            ${this.escapeHtml(todo.title)}
                        </h3>
                        ${todo.description ? `
                            <p class="text-gray-400 text-sm mt-2 break-words leading-relaxed">
                                ${this.escapeHtml(todo.description)}
                            </p>
                        ` : ''}
             <div class="mt-2">
    <div class="text-xs text-gray-500 mb-1">
        ${new Date(todo.created_at).toLocaleDateString('ru-RU')}
    </div>
    ${todo.is_completed ? `
        <div class="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded-full inline-block">
            <i class="fas fa-check mr-1"></i>Выполнено
        </div>
    ` : `
        <div class="text-xs text-blue-400 bg-blue-400/20 px-2 py-1 rounded-full inline-block">
            <i class="fas fa-clock mr-1"></i>Активно
        </div>
    `}
</div>
                    </div>
                </div>
                
                <!-- Кнопки редактирования и удаления -->
                <div class="flex items-center space-x-1 ml-3 flex-shrink-0" style="margin-top: -2px;">
                    <button class="todo-edit w-8 h-8 flex items-center justify-center text-blue-400 hover:text-blue-300 transition-colors rounded-lg hover:bg-blue-400/10 border border-blue-500/30" 
                            data-todo-id="${todo.id}" title="Редактировать">
                        <i class="fas fa-edit text-sm"></i>
                    </button>
                    <button class="todo-delete w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-red-400/10 border border-red-500/30" 
                            data-todo-id="${todo.id}" title="Удалить">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            </div>

            <!-- Контейнер подтверждения удаления - теперь он в потоке и растягивает блок -->
            <div class="delete-confirm hidden mt-3 bg-gray-800 flex flex-col items-center justify-center rounded-xl text-center p-4 border border-gray-700">
                <div class="text-center mb-3">
                    <p class="text-red-400 font-semibold">Удалить задачу?</p>
                    <p class="text-gray-400 text-sm">Это действие нельзя отменить</p>
                </div>
                <div class="flex space-x-3 w-full">
                    <button class="cancel-delete flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">
                        Отмена
                    </button>
                    <button class="confirm-delete flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors">
                        Удалить
                    </button>
                </div>
            </div>
        </div>
    `;
}


// Обновленный метод attachTodoEventListeners
attachTodoEventListeners() {
    document.querySelectorAll('.todo-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const todoId = e.currentTarget.dataset.todoId;
            this.editTodo(todoId);
        });
    });
    
    // Новые обработчики для удаления (как у заметок)
    document.querySelectorAll('.todo-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const todoItem = e.currentTarget.closest('.todo-item');
            const confirmBox = todoItem.querySelector('.delete-confirm');
            
            confirmBox.classList.remove('hidden');
            confirmBox.classList.add('animate-fadeIn');
        });
    });

    // Обработчики для подтверждения удаления
    document.querySelectorAll('.cancel-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const confirmBox = e.currentTarget.closest('.delete-confirm');
            confirmBox.classList.add('hidden');
        });
    });

    document.querySelectorAll('.confirm-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const todoItem = e.currentTarget.closest('.todo-item');
            const todoId = todoItem.dataset.todoId;
            const confirmBox = todoItem.querySelector('.delete-confirm');
            const confirmBtn = confirmBox.querySelector('.confirm-delete');
            
            confirmBtn.textContent = 'Удаляется...';
            confirmBtn.disabled = true;

            this.deleteTodoWithAnimation(todoId, todoItem);
        });
    });
}

async deleteTodoWithAnimation(todoId, todoElement) {
    try {
        const response = await fetch(`/todo/delete/${todoId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        });
        const result = await response.json();
        
        if (result.success) {
            // Анимация удаления
            todoElement.classList.add('opacity-0', 'translate-x-5', 'transition-all');
            setTimeout(() => {
                todoElement.remove();
                
                // Обновляем список задач
                this.loadTodos();
                
                if (typeof showNotification === 'function') {
                    showNotification('Задача удалена', 'success');
                }
            }, 300);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
        
        // Возвращаем кнопку в исходное состояние при ошибке
        const confirmBox = todoElement.querySelector('.delete-confirm');
        const confirmBtn = confirmBox.querySelector('.confirm-delete');
        confirmBtn.textContent = 'Ошибка!';
        
        setTimeout(() => {
            confirmBtn.textContent = 'Да, удалить!';
            confirmBtn.disabled = false;
            confirmBox.classList.add('hidden');
        }, 2000);
        
        if (typeof showNotification === 'function') {
            showNotification('Ошибка при удалении задачи', 'error');
        }
    }
}



    async animateAndToggleTodo(todoId) {
        const todoElement = document.querySelector(`[data-todo-id="${todoId}"]`);
        if (!todoElement) return;

        // Добавляем анимацию пульсации
        todoElement.classList.add('todo-pulse-animation');
        
        // Ждем завершения анимации
        setTimeout(async () => {
            await this.toggleTodoComplete(todoId);
            todoElement.classList.remove('todo-pulse-animation');
        }, 600);
    }

    async toggleTodoComplete(todoId) {
        try {
            const formData = new FormData();
            const response = await fetch(`/todo/toggle/${todoId}/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            const result = await response.json();
            
            if (result.success) {
                // Обновляем локальные данные
                const todoIndex = this.allTodos.findIndex(todo => todo.id === parseInt(todoId));
                if (todoIndex !== -1) {
                    this.allTodos[todoIndex] = result.todo;
                }
                this.renderFilteredTodos();
                this.updateTodoCounter(this.allTodos);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error toggling todo:', error);
            if (typeof showNotification === 'function') {
                showNotification('Ошибка при обновлении задачи', 'error');
            }
        }
    }

    async editTodo(todoId) {
        try {
            const response = await fetch(`/todo/get/${todoId}/`);
            const result = await response.json();
            
            if (result.success) {
                this.openEditModal(result.todo);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error loading todo for edit:', error);
            if (typeof showNotification === 'function') {
                showNotification('Ошибка при загрузке задачи', 'error');
            }
        }
    }

   async deleteTodoWithAnimation(todoId, todoElement) {
    try {
        const response = await fetch(`/todo/delete/${todoId}/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            }
        });
        const result = await response.json();
        
        if (result.success) {
            // Анимация удаления (как у заметок)
            todoElement.classList.add('opacity-0', 'translate-x-5', 'transition-all');
            setTimeout(() => {
                todoElement.remove();
                
                // Обновляем список задач
                this.loadTodos();
                
                if (typeof showNotification === 'function') {
                    showNotification('Задача удалена', 'success');
                }
            }, 300);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error deleting todo:', error);
        
        // Возвращаем кнопку в исходное состояние при ошибке
        const confirmBox = todoElement.querySelector('.delete-confirm');
        const confirmBtn = confirmBox.querySelector('.confirm-delete');
        confirmBtn.textContent = 'Ошибка!';
        
        setTimeout(() => {
            confirmBtn.textContent = 'Да, удалить!';
            confirmBtn.disabled = false;
            confirmBox.classList.add('hidden');
        }, 2000);
        
        if (typeof showNotification === 'function') {
            showNotification('Ошибка при удалении задачи', 'error');
        }
    }
}

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Глобальные функции
function openAddTodoModal() {
    if (window.todoManager) {
        window.todoManager.openAddModal();
    }
}

function setTodoFilter(filter) {
    if (window.todoManager) {
        window.todoManager.setFilter(filter);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    window.todoManager = new TodoManager();
});