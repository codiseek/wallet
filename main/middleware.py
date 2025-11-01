# main/middleware.py
from django.utils import translation
from django.conf import settings

class UserLanguageMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Проверяем язык в сессии, куках или профиле пользователя
        user_language = None
        
        # 1. Проверяем сессию
        if hasattr(request, 'session'):
            user_language = request.session.get('django_language')
        
        # 2. Если нет в сессии, проверяем куки
        if not user_language:
            user_language = request.COOKIES.get('django_language')
        
        # 3. Если нет в куках, проверяем профиль пользователя
        if not user_language and request.user.is_authenticated:
            if hasattr(request.user, 'userprofile'):
                user_language = request.user.userprofile.language
        
        # 4. Если язык найден, активируем его
        if user_language and user_language in [lang[0] for lang in settings.LANGUAGES]:
            translation.activate(user_language)
            request.LANGUAGE_CODE = user_language
        
        response = self.get_response(request)
        return response