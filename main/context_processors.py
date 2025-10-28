from .models import UserProfile

def user_language(request):
    """Добавляет язык пользователя в контекст всех шаблонов"""
    if request.user.is_authenticated:
        try:
            language = request.user.userprofile.language
            # Проверяем, что язык поддерживается
            if language not in ['ru', 'en', 'kg']:
                language = 'ru'
        except UserProfile.DoesNotExist:
            language = 'ru'
    else:
        language = 'ru'
    
    return {
        'user_language': language
    }