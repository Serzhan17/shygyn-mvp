from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from .models import Account, MonthlyBudget, Transaction


class ShygynApiTests(APITestCase):
    def setUp(self):
        users = get_user_model()
        self.user = users.objects.create_user('alice@example.com', password='StrongPassword123!')
        self.other = users.objects.create_user('bob@example.com', password='StrongPassword123!')
        self.account = Account.objects.create(owner=self.user, name='Моя карта', opening_balance=10000)
        self.other_account = Account.objects.create(owner=self.other, name='Чужая карта')
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {Token.objects.create(user=self.user).key}')

    def test_authenticated_account_creation(self):
        response = self.client.post('/api/accounts/', {'name': 'Наличные', 'account_type': 'cash', 'opening_balance': '500'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Account.objects.filter(owner=self.user).count(), 2)

    def test_account_isolation(self):
        response = self.client.get(f'/api/accounts/{self.other_account.pk}/')
        self.assertEqual(response.status_code, 404)

    def test_foreign_account_cannot_be_used(self):
        response = self.client.post('/api/transactions/', {'account': self.other_account.id,
            'transaction_type': 'expense', 'category': 'food', 'amount': '100',
            'description': 'Test', 'occurred_at': '2026-10-14'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_summary_uses_budget_less_expenses(self):
        Transaction.objects.create(owner=self.user, account=self.account, transaction_type='expense',
            category='food', amount=Decimal('1234.50'), description='Супермаркет', occurred_at=date(2026, 10, 2))
        Transaction.objects.create(owner=self.user, account=self.account, transaction_type='income',
            category='salary', amount=Decimal('1000'), description='Возврат', occurred_at=date(2026, 10, 3))
        MonthlyBudget.objects.create(owner=self.user, month=date(2026, 10, 1), limit=5000)
        response = self.client.get('/api/summary/?month=2026-10')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['expenses'], '1234.50')
        self.assertEqual(response.data['remaining'], '3765.50')
        self.assertEqual(response.data['total_balance'], '9765.50')

    def test_invalid_budget_month(self):
        response = self.client.post('/api/budgets/', {'month':'2026-10-12', 'limit':'15000'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_budget_upsert(self):
        for limit in ('5000', '9000'):
            response = self.client.post('/api/budgets/', {'month': '2026-10-01', 'limit': limit}, format='json')
            self.assertEqual(response.status_code, 201)
        self.assertEqual(MonthlyBudget.objects.filter(owner=self.user).count(), 1)
        self.assertEqual(MonthlyBudget.objects.get(owner=self.user).limit, 9000)

    def test_loan_validations_and_disclaimer(self):
        bad = self.client.get('/api/loans/compare/?amount=-1&months=0')
        self.assertEqual(bad.status_code, 400)
        response = self.client.get('/api/loans/compare/?amount=1000000&months=12&kind=business')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['offers']), 3)
        self.assertTrue(response.data['illustrative'])

    def test_anonymous_cannot_read_finances(self):
        self.client.credentials()
        self.assertEqual(self.client.get('/api/accounts/').status_code, 401)
        self.assertEqual(self.client.get('/api/summary/').status_code, 401)

    def test_register_and_login(self):
        self.client.credentials()
        response = self.client.post('/api/auth/register/', {'email': 'new@example.com',
            'first_name': 'Сержан', 'password': 'UniqueCorrectHorse123!'}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('token', response.data)
        self.assertEqual(self.client.post('/api/auth/login/', {'email': 'new@example.com',
            'password': 'UniqueCorrectHorse123!'}, format='json').status_code, 200)
