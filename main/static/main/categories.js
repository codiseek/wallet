
// -----------------------------
// Категории: загрузка и обновление
// -----------------------------
async function updateGlobalCategories() {
    try {
        const resp = await fetch('/get_categories/');
        const data = await resp.json();
        if (data.categories) {
            window.categories = data.categories;
            // обновим табы
            updateCategoryTabs();
        }
    } catch (e) {
    }
}




// -----------------------------
// Модалка добавления категории
// -----------------------------
function initCategoryModal() {
    const modal = document.getElementById('categoryModal');
    const openBtn = document.getElementById('addCategoryBtn');
    const saveBtn = document.getElementById('saveCategoryBtn'); // 🟢 кнопка "Сохранить"
    const closeBtns = modal ? modal.querySelectorAll('.close-modal, [data-modal="category"]') : [];

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            animateModal(modal, true);
            resetCategoryForm();

            // 🟢 При открытии модалки загружаем иконки и цвета
            initIconsGrid();
            initColorsGrid();
        });
    }

    // 🟢 Сохранение категории
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCategory);
    }

    // Кнопки закрытия
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => animateModal(modal, false));
    });

    // Закрытие по клику вне содержимого
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === modal) animateModal(modal, false);
        });
    }
}



function resetCategoryForm() {
    const nameInput = document.getElementById('categoryNameInput');
    if (nameInput) nameInput.value = '';

    const iconGrid = document.getElementById('iconsGrid');
    const colorGrid = document.getElementById('colorsGrid');
    if (iconGrid) iconGrid.innerHTML = '';
    if (colorGrid) colorGrid.innerHTML = '';

    // 🟢 Сбрасываем активные выделения
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-gray-700', 'text-gray-300');
    });
    document.querySelectorAll('.color-option').forEach(btn => {
        btn.classList.remove('border-white', 'border-2');
    });
}



// -----------------------------
// СЕТКИ ИКОНОК И ЦВЕТОВ ДЛЯ МОДАЛКИ КАТЕГОРИЙ
// -----------------------------
function initIconsGrid() {
    const iconsGrid = document.getElementById('iconsGrid');
    if (!iconsGrid) return;

    const icons = [
        'fas fa-utensils', 'fas fa-home', 'fas fa-car', 'fas fa-heart',
        'fas fa-shopping-cart', 'fas fa-tv', 'fas fa-tshirt', 'fas fa-book',
        'fas fa-gift', 'fas fa-money-bill-wave', 'fas fa-chart-line', 'fas fa-building',
        'fas fa-briefcase', 'fas fa-phone', 'fas fa-wifi', 'fas fa-gas-pump'
    ];

    iconsGrid.innerHTML = '';
    icons.forEach(icon => {
        const iconBtn = document.createElement('button');
        iconBtn.type = 'button';
        iconBtn.className = 'icon-option p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300';
        iconBtn.innerHTML = `<i class="${icon} text-lg"></i>`;
        iconBtn.dataset.icon = icon;

        iconBtn.addEventListener('click', function() {
            document.querySelectorAll('.icon-option').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-700', 'text-gray-300');
            });
            this.classList.remove('bg-gray-700', 'text-gray-300');
            this.classList.add('bg-blue-600', 'text-white');
        });

        iconsGrid.appendChild(iconBtn);
    });
}


function initColorsGrid() {
    const colorsGrid = document.getElementById('colorsGrid');
    if (!colorsGrid) return;

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981',
        '#06b6d4', '#6366f1', '#ec4899'
    ];

    colorsGrid.innerHTML = '';
    colors.forEach(color => {
        const colorBtn = document.createElement('button');
        colorBtn.type = 'button';
        colorBtn.className = 'color-option w-8 h-8 rounded-full border-2 border-gray-600 mb-3';
        colorBtn.style.backgroundColor = color;
        colorBtn.dataset.color = color;

        colorBtn.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(btn => {
                btn.classList.remove('border-white', 'border-2');
            });
            this.classList.add('border-white', 'border-2');
        });

        colorsGrid.appendChild(colorBtn);
    });
}



async function saveCategory() {
    const nameInput = document.getElementById('categoryNameInput');
    const selectedIcon = document.querySelector('.icon-option.bg-blue-600');
    const selectedColor = document.querySelector('.color-option.border-white');

    if (!nameInput || !nameInput.value.trim()) {
        alert('Введите название категории');
        return;
    }

    if (!selectedIcon) {
        alert('Выберите иконку для категории');
        return;
    }

    if (!selectedColor) {
        alert('Выберите цвет для категории');
        return;
    }

    const formData = new FormData();
    formData.append('name', nameInput.value.trim());
    formData.append('icon', selectedIcon.dataset.icon);
    formData.append('color', selectedColor.dataset.color);

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    try {
        const response = await fetch('/add_category/', {
            method: "POST",
            headers: { 
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            animateModal(document.getElementById('categoryModal'), false);
            nameInput.value = '';

            // Сбрасываем выделение иконки и цвета
            document.querySelectorAll('.icon-option').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-700', 'text-gray-300');
            });
            document.querySelectorAll('.color-option').forEach(btn => {
                btn.classList.remove('border-white', 'border-2');
            });

            // Обновляем категории в приложении
            await updateGlobalCategories();
            if (typeof updateCategoryTabs === 'function') await updateCategoryTabs();
            if (typeof loadUserCategories === 'function') await loadUserCategories();

            showSuccessNotification('Категория добавлена!');
        } else {
            alert(data.error || "Ошибка при сохранении категории");
        }
    } catch (error) {
        alert("Произошла ошибка при отправке формы");
    }
}


// -----------------------------
// Загрузка категорий на главной
// -----------------------------
async function loadUserCategories() {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;

    try {
        const response = await fetch('/get_categories_with_stats/');
        const data = await response.json();
        
        categoriesList.innerHTML = '';
        
        if (data.categories && data.categories.length > 0) {
            // Получаем текущий символ валюты
            const currentCurrency = window.currentCurrency || 'c';
            let currencySymbol = 'с';
            switch(currentCurrency) {
                case 'c': currencySymbol = 'с'; break;
                case 'r': currencySymbol = '₽'; break;
                case '$': currencySymbol = '$'; break;
                case '€': currencySymbol = '€'; break;
            }
            
            data.categories.forEach(category => {
                const categoryElement = document.createElement('div');
                categoryElement.className = 'category-item bg-gray-800 rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-gray-700/50 transition-colors';
                
                // Добавляем data-атрибуты для модалки
                categoryElement.dataset.categoryId = category.id;
                categoryElement.dataset.categoryName = category.name;
                categoryElement.dataset.categoryIcon = category.icon;
                categoryElement.dataset.categoryColor = category.color;
                
                categoryElement.innerHTML = `
                    <div class="flex items-center space-x-3 flex-1">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: ${category.color}22; color: ${category.color}">
                            <i class="${category.icon}"></i>
                        </div>
                        <div class="flex-1">
                            <p class="font-medium">${category.name}</p>
                            <div class="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                                <span>Расходы: ${formatAmount(category.expense_amount)} <span class="currency-symbol">${currencySymbol}</span></span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                        ${category.percentage > 0 ? `
                            <div class="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg text-sm font-semibold min-w-12 text-center">
                                ${category.percentage}%
                            </div>
                        ` : ''}
                       
                    </div>
                `;
                
                categoriesList.appendChild(categoryElement);
            });
            
            // Добавляем обработчики для кнопок удаления
            document.querySelectorAll('.delete-category-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const categoryId = this.dataset.categoryId;
                    deleteCategory(categoryId);
                });
            });
        } else {
            categoriesList.innerHTML = `
                <div class="text-center py-8 text-gray-500" id="emptyCategoriesState">
                    <i class="fas fa-tags text-3xl mb-3"></i>
                    <p>Категорий пока нет</p>
                </div>
            `;
        }
    } catch (error) {
        categoriesList.innerHTML = `
            <div class="text-center py-8 text-red-400">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Ошибка загрузки категорий</p>
            </div>
        `;
    }
}


// -----------------------------
// Загрузка категорий в модалку "Добавить запись"
// -----------------------------
async function loadCategoriesForModal() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    try {
        const response = await fetch('/get_categories/');
        const data = await response.json();

        container.innerHTML = '';

        if (data.categories && data.categories.length > 0) {
            data.categories.forEach(cat => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'category-carousel-btn flex flex-col items-center p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all duration-200';
                btn.dataset.categoryId = cat.id;
                btn.innerHTML = `
                    <div class="w-10 h-10 flex items-center justify-center rounded-full mb-1"
                         style="background-color:${cat.color}22; color:${cat.color}">
                        <i class="${cat.icon}"></i>
                    </div>
                    <span class="text-xs text-gray-300 truncate w-12 text-center">${cat.name}</span>
                `;

                btn.addEventListener('click', function () {
                    document.querySelectorAll('.category-carousel-btn').forEach(b => b.classList.remove('ring-2', 'ring-blue-500'));
                    this.classList.add('ring-2', 'ring-blue-500');
                    document.getElementById('selectedCategory').value = cat.id;
                });

                container.appendChild(btn);
            });
        } else {
            container.innerHTML = `<div class="text-gray-500 text-sm text-center py-4">Нет категорий</div>`;
        }
    } catch (e) {
    }
}


// Загрузка категорий для модалки выбора
async function loadCategoriesForSelection() {
    const container = document.getElementById('categorySelectionList');
    const emptyState = document.getElementById('emptyCategoriesSelection');
    
    if (!container) return;

    try {
        const response = await fetch('/get_categories/');
        const data = await response.json();

        container.innerHTML = '';

        if (data.categories && data.categories.length > 0) {
            emptyState.classList.add('hidden');
            
            data.categories.forEach(cat => {
                const categoryItem = document.createElement('button');
                categoryItem.type = 'button';
                categoryItem.className = 'category-selection-item w-full p-4 rounded-xl bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 hover:border-blue-500/50 transition-all duration-200 flex items-center space-x-4 text-left';
                categoryItem.dataset.categoryId = cat.id;
                
                categoryItem.innerHTML = `
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" 
                         style="background-color: ${cat.color}22; color: ${cat.color}">
                        <i class="${cat.icon} text-lg"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-semibold text-white text-lg">${cat.name}</p>
                    </div>
                    <div class="w-6 h-6 rounded-full border-2 border-gray-500 flex items-center justify-center flex-shrink-0">
                        <div class="w-3 h-3 rounded-full bg-blue-500 hidden"></div>
                    </div>
                `;

                categoryItem.addEventListener('click', function() {
                    selectCategory(cat);
                    animateModal(document.getElementById('categorySelectionModal'), false);
                });

                container.appendChild(categoryItem);
            });
        } else {
            emptyState.classList.remove('hidden');
        }
    } catch (error) {
        container.innerHTML = `
            <div class="text-center py-8 text-red-400">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Ошибка загрузки категорий</p>
            </div>
        `;
    }
}



// Выбор категории
function selectCategory(category) {
    const selectedCategoryInput = document.getElementById('selectedCategory');
    const selectedCategoryDisplay = document.getElementById('selectedCategoryDisplay');
    
    if (selectedCategoryInput && selectedCategoryDisplay) {
        selectedCategoryInput.value = category.id;
        selectedCategoryDisplay.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center" 
                     style="background-color: ${category.color}22; color: ${category.color}">
                    <i class="${category.icon} text-sm"></i>
                </div>
                <span class="text-white font-medium">${category.name}</span>
            </div>
        `;
    }
    
    // Обновляем кнопку выбора категории
    const openCategoryBtn = document.getElementById('openCategorySelectionBtn');
    if (openCategoryBtn) {
        openCategoryBtn.classList.remove('border-gray-600', 'hover:border-blue-500');
        openCategoryBtn.classList.add('border-blue-500', 'bg-blue-500/10');
    }
}


// Сброс выбора категории при открытии модалки транзакции
function resetCategorySelection() {
    const selectedCategoryInput = document.getElementById('selectedCategory');
    const selectedCategoryDisplay = document.getElementById('selectedCategoryDisplay');
    const openCategoryBtn = document.getElementById('openCategorySelectionBtn');
    
    if (selectedCategoryInput) selectedCategoryInput.value = '';
    if (selectedCategoryDisplay) {
        selectedCategoryDisplay.innerHTML = `
            <i class="fas fa-tag mr-2 text-gray-400"></i>
            <span>Выберите категорию</span>
        `;
    }
    if (openCategoryBtn) {
        openCategoryBtn.classList.remove('border-blue-500', 'bg-blue-500/10');
        openCategoryBtn.classList.add('border-gray-600', 'hover:border-blue-500');
    }
}



async function updateCategoryTabs() {
    try {
        const resp = await fetch('/get_categories/');
        const data = await resp.json();
        if (!data.categories) return;
        const tabsWrapper = document.getElementById('tabsWrapper');
        if (!tabsWrapper) return;
        tabsWrapper.innerHTML = `<div class="tab active" data-category="all"><span>Все</span></div>`;
        data.categories.forEach(cat => {
            const el = document.createElement('div');
            el.className = 'tab';
            el.dataset.category = cat.id;
            el.innerHTML = `<span>${cat.name}</span>`;
            tabsWrapper.appendChild(el);
        });
        updateCategoryTabsHandlers();
    } catch (e) {
    }
}


// -----------------------------
// Инициализация фильтров и табов категорий
// -----------------------------
function updateCategoryTabsHandlers() {
    const tabs = document.querySelectorAll('.tab');
    // переподвешиваем обработчики (делаем клон чтобы убрать старые)
    tabs.forEach(tab => {
        const clone = tab.cloneNode(true);
        tab.parentNode.replaceChild(clone, tab);
    });
    const updatedTabs = document.querySelectorAll('.tab');
    updatedTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            updatedTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const categoryId = this.dataset.category;
            currentCategory = categoryId || 'all';
            currentPage = 1;
            hasMoreTransactions = true;
            loadTransactions();
        });
    });
}


// -----------------------------
// Делегирование событий для кнопок удаления
// -----------------------------
document.addEventListener('click', function(e) {
    // Обработка кнопок удаления категорий
    if (e.target.closest('.delete-category-btn')) {
        const target = e.target.closest('.delete-category-btn');
        e.preventDefault();
        e.stopPropagation();
        const categoryId = target.dataset.categoryId;
        if (categoryId) {
            deleteCategory(categoryId);
        }
        return;
    }

    // Обработка клика по категории для открытия деталей
    const categoryItem = e.target.closest('.category-item');
    if (categoryItem && !e.target.closest('.delete-category-btn')) {
        // Используем функцию из categories-modal.js
        if (typeof openCategoryDetail === 'function') {
            openCategoryDetail(categoryItem);
        }
    }

    // Обработка клика по транзакции для открытия деталей
    const transactionItem = e.target.closest('.transaction-item');
    if (transactionItem && !e.target.closest('.delete-transaction-btn')) {
        openTransactionDetail(transactionItem);
    }
});






