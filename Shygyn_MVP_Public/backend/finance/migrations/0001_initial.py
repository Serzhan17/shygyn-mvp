# Initial Shygyn MVP schema (handwritten migration to support offline delivery).
from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Account',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80)),
                ('bank', models.CharField(blank=True, max_length=80)),
                ('account_type', models.CharField(choices=[('card', 'Банковская карта'), ('cash', 'Наличные')], default='card', max_length=8)),
                ('opening_balance', models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='accounts', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['created_at', 'id']},
        ),
        migrations.CreateModel(
            name='MonthlyBudget',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('month', models.DateField(help_text='Первый день месяца')),
                ('limit', models.DecimalField(decimal_places=2, max_digits=12, validators=[MinValueValidator(Decimal('0.01'))])),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='budgets', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-month']},
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('transaction_type', models.CharField(choices=[('expense', 'Расход'), ('income', 'Доход')], max_length=8)),
                ('category', models.CharField(choices=[
                    ('food', 'Еда'), ('transport', 'Транспорт'), ('shopping', 'Покупки'),
                    ('subscriptions', 'Подписки'), ('home', 'Дом'), ('health', 'Здоровье'),
                    ('entertainment', 'Развлечения'), ('education', 'Образование'),
                    ('salary', 'Зарплата'), ('business', 'Бизнес'), ('other', 'Другое')
                ], default='other', max_length=20)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12, validators=[MinValueValidator(Decimal('0.01'))])),
                ('description', models.CharField(max_length=160)),
                ('occurred_at', models.DateField(db_index=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('account', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='transactions', to='finance.account')),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-occurred_at', '-id']},
        ),
        migrations.AddIndex(
            model_name='transaction',
            index=models.Index(fields=['owner', 'occurred_at'], name='finance_owner_date_idx'),
        ),
        migrations.AddConstraint(
            model_name='monthlybudget',
            constraint=models.UniqueConstraint(fields=('owner', 'month'), name='unique_user_month_budget'),
        ),
    ]
