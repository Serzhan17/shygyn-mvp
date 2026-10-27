from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from finance.models import Account, MonthlyBudget, Transaction


class Command(BaseCommand):
    help = 'Create local demo data (not for real deployment)'

    def handle(self, *args, **kwargs):
        user_model = get_user_model()
        email = 'demo@shygyn.kz'
        user, created = user_model.objects.get_or_create(
            username=email, defaults={'email': email, 'first_name': 'Демо'}
        )
        if created:
            user.set_password('ShygynDemo2026!')
            user.save()
        card, _ = Account.objects.get_or_create(owner=user, name='Основная карта',
            defaults={'bank': 'Пример банка', 'account_type': 'card', 'opening_balance': '225000'})
        cash, _ = Account.objects.get_or_create(owner=user, name='Наличные',
            defaults={'account_type': 'cash', 'opening_balance': '30000'})
        today = timezone.localdate()
        month = today.replace(day=1)
        MonthlyBudget.objects.get_or_create(owner=user, month=month, defaults={'limit': '240000'})
        rows = [
            (0, 'expense', 'food', 'Продукты в супермаркете', '12900', card),
            (1, 'expense', 'transport', 'Такси', '3200', card),
            (2, 'expense', 'shopping', 'Одежда', '18500', card),
            (3, 'expense', 'food', 'Кофе и завтрак', '2500', cash),
            (4, 'income', 'salary', 'Зарплата', '320000', card),
            (5, 'expense', 'subscriptions', 'Музыка', '1490', card),
            (6, 'expense', 'home', 'Коммунальные услуги', '18500', card),
            (8, 'expense', 'food', 'Ресторан', '7400', card),
            (9, 'expense', 'transport', 'Бензин', '16000', card),
            (11, 'expense', 'education', 'Онлайн-курс', '23000', card),
        ]
        existing = Transaction.objects.filter(owner=user).exists()
        if not existing:
            for days_ago, kind, category, description, amount, account in rows:
                occurred = max(month, today - timedelta(days=days_ago))
                Transaction.objects.create(owner=user, account=account,
                    transaction_type=kind, category=category,
                    description=description, amount=Decimal(amount), occurred_at=occurred)
        self.stdout.write(self.style.SUCCESS(
            'Демо: demo@shygyn.kz / ShygynDemo2026! (только для локального тестирования)'))
