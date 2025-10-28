// language.js
class LanguageManager {
    constructor() {
        this.currentLanguage = 'ru';
        this.translations = {};
        this.init();
    }

    async init() {
        // Загружаем текущий язык из Django
        this.currentLanguage = window.userLanguage || 'ru';
        await this.loadTranslations(this.currentLanguage);
        this.initLanguageButtons();
        this.applyTranslations();
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`/static/main/locale/${lang}.json`);
            this.translations = await response.json();
            console.log(`Translations loaded for: ${lang}`);
        } catch (error) {
            console.error('Error loading translations:', error);
            // Загружаем русский как fallback
            if (lang !== 'ru') {
                await this.loadTranslations('ru');
            }
        }
    }

    initLanguageButtons() {
        document.querySelectorAll('.language-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newLanguage = e.currentTarget.getAttribute('data-language');
                this.changeLanguage(newLanguage);
            });
        });
    }

    async changeLanguage(newLanguage) {
        if (newLanguage === this.currentLanguage) return;

        // Проверяем поддерживаемые языки
        const supportedLanguages = ['ru', 'en', 'kg'];
        if (!supportedLanguages.includes(newLanguage)) {
            console.error('Unsupported language:', newLanguage);
            return;
        }

        try {
            // Показываем загрузку
            const currentLanguageElement = document.getElementById('currentLanguage');
            if (currentLanguageElement) {
                const loadingTexts = {
                    'ru': 'Загрузка...',
                    'en': 'Loading...',
                    'kg': 'Жүктөлүүдө...'
                };
                currentLanguageElement.textContent = loadingTexts[newLanguage] || 'Загрузка...';
            }

            // Сохраняем язык на сервере
            const response = await fetch('/update-language/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `language=${newLanguage}`
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentLanguage = newLanguage;
                await this.loadTranslations(newLanguage);
                this.applyTranslations();
                this.updateLanguageButtons();
                this.updateCurrentLanguageDisplay();
                
                // Показываем уведомление
                if (window.showSuccessNotification) {
                    showSuccessNotification('Язык изменен!');
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error changing language:', error);
            if (window.showErrorNotification) {
                showErrorNotification('Ошибка при смене языка');
            }
            this.updateCurrentLanguageDisplay(); // Восстанавливаем отображение
        }
    }

    applyTranslations() {
        // Находим все элементы с data-translate атрибутом
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.getTranslation(key);
            
            if (translation) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    getTranslation(key) {
        // Получаем перевод по ключу (например: "panel.title")
        const keys = key.split('.');
        let value = this.translations;
        
        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                console.warn(`Translation not found for key: ${key}`);
                return null;
            }
        }
        
        return value;
    }

    updateLanguageButtons() {
        document.querySelectorAll('.language-btn').forEach(btn => {
            const language = btn.getAttribute('data-language');
            if (language === this.currentLanguage) {
                btn.classList.add('border-2', 'border-purple-500', 'bg-purple-500/10');
                btn.classList.remove('border-gray-600');
            } else {
                btn.classList.remove('border-2', 'border-purple-500', 'bg-purple-500/10');
                btn.classList.add('border-gray-600');
            }
        });
    }

    updateCurrentLanguageDisplay() {
        const currentLanguageElement = document.getElementById('currentLanguage');
        if (currentLanguageElement) {
            const languageNames = {
                'ru': 'Русский',
                'en': 'English', 
                'kg': 'Кыргызча'
            };
            currentLanguageElement.textContent = languageNames[this.currentLanguage] || 'Русский';
        }
    }

    getCSRFToken() {
        const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
        return csrfInput ? csrfInput.value : '';
    }
} 

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.languageManager = new LanguageManager();
});