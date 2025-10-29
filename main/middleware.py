from django.utils import translation
from django.conf import settings

class UserLanguageMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Проверяем язык в профиле пользователя
        if request.user.is_authenticated and hasattr(request.user, 'userprofile'):
            language = request.user.userprofile.language
            if language:
                translation.activate(language)
                request.LANGUAGE_CODE = language
        
        response = self.get_response(request)
        return response