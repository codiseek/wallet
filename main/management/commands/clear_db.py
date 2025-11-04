from django.core.management.base import BaseCommand
from django.apps import apps
from django.db import connection
from django.conf import settings

class Command(BaseCommand):
    help = 'Очищает всю базу данных'

    def handle(self, *args, **options):
        db_engine = settings.DATABASES['default']['ENGINE']
        
        # Для PostgreSQL
        if 'postgresql' in db_engine or 'psycopg2' in db_engine:
            with connection.cursor() as cursor:
                # Отключаем триггеры для внешних ключей
                cursor.execute('SET session_replication_role = replica;')
                
                # Удаляем данные из всех таблиц
                for model in apps.get_models():
                    if not model._meta.auto_created:
                        try:
                            cursor.execute(f'DELETE FROM "{model._meta.db_table}";')
                            self.stdout.write(f"Очищено: {model._meta.model_name}")
                        except Exception as e:
                            self.stderr.write(f"Ошибка с {model._meta.model_name}: {e}")
                
                # Включаем триггеры обратно
                cursor.execute('SET session_replication_role = DEFAULT;')
                
        # Для SQLite
        elif 'sqlite' in db_engine:
            for model in apps.get_models():
                if not model._meta.auto_created:
                    try:
                        model.objects.all().delete()
                        self.stdout.write(f"Очищено: {model._meta.model_name}")
                    except Exception as e:
                        self.stderr.write(f"Ошибка с {model._meta.model_name}: {e}")
        
        else:
            self.stderr.write("Неподдерживаемая СУБД")

        self.stdout.write("База данных полностью очищена!")