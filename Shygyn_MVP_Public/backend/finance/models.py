from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Sum


class Account(models.Model):
    ACCOUNT_TYPES = [('card', 'Банковская карта'), ('cash', 'Наличные')]
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='accounts')
    name = models.CharField(max_length=80)
    bank = models.CharField(max_length=80, blank=True)
    account_type = models.CharField(max_length=8, choices=ACCOUNT_TYPES, default='card')
    opening_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

    @property
    def balance(self):
        sums = self.transactions.values('transaction_type').annotate(total=Sum('amount'))
        amounts = {item['transaction_type']: item['total'] for item in sums}
        return self.opening_balance + amounts.get('income', Decimal('0')) - amounts.get('expense', Decimal('0'))

    def __str__(self):
        return f'{self.name} ({self.owner_id})'


class Transaction(models.Model):
    TYPES = [('expense', 'Расход'), ('income', 'Доход')]
    CATEGORIES = [
        ('food', 'Еда'), ('transport', 'Транспорт'), ('shopping', 'Покупки'),
        ('subscriptions', 'Подписки'), ('home', 'Дом'), ('health', 'Здоровье'),
        ('entertainment', 'Развлечения'), ('education', 'Образование'),
        ('salary', 'Зарплата'), ('business', 'Бизнес'), ('other', 'Другое'),
    ]
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='transactions')
    transaction_type = models.CharField(max_length=8, choices=TYPES)
    category = models.CharField(max_length=20, choices=CATEGORIES, default='other')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.CharField(max_length=160)
    occurred_at = models.DateField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-occurred_at', '-id']
        indexes = [models.Index(fields=['owner', 'occurred_at'], name='finance_owner_date_idx')]

    def __str__(self):
        return f'{self.description} {self.amount} ₸'


class MonthlyBudget(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='budgets')
    month = models.DateField(help_text='Первый день месяца')
    limit = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])

    class Meta:
        constraints = [models.UniqueConstraint(fields=['owner', 'month'], name='unique_user_month_budget')]
        ordering = ['-month']
