# main/management/commands/fix_transaction_dates.py
from django.core.management.base import BaseCommand
from django.db import connection
from main.models import Transaction

class Command(BaseCommand):
    help = 'Fix transaction_date field for all transactions'

    def handle(self, *args, **options):
        try:
            # Проверяем существует ли поле transaction_date
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='main_transaction' and column_name='transaction_date'
                """)
                exists = cursor.fetchone()
                
                if not exists:
                    self.stdout.write("Добавляем поле transaction_date...")
                    cursor.execute("""
                        ALTER TABLE main_transaction 
                        ADD COLUMN transaction_date TIMESTAMP WITH TIME ZONE NULL
                    """)
                    self.stdout.write("Поле transaction_date добавлено")
                
            # Заполняем transaction_date значениями из created_at
            transactions = Transaction.objects.filter(transaction_date__isnull=True)
            self.stdout.write(f"Найдено {transactions.count()} транзакций без transaction_date")
            
            updated_count = 0
            for transaction in transactions:
                transaction.transaction_date = transaction.created_at
                transaction.save()
                updated_count += 1
                
            self.stdout.write(self.style.SUCCESS(f"Обновлено {updated_count} транзакций"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Ошибка: {e}"))