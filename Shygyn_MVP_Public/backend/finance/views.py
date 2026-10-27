from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from calendar import monthrange

from django.contrib.auth import authenticate
from django.db.models import Sum
from django.db.models.functions import TruncDay
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Account, MonthlyBudget, Transaction
from .serializers import (AccountSerializer, MonthlyBudgetSerializer,
                          RegisterSerializer, TransactionSerializer, UserSerializer)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health(request):
    return Response({'status': 'ok', 'app': 'Shygyn API'})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    token = Token.objects.create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    email = str(request.data.get('email', '')).strip().lower()
    password = request.data.get('password', '')
    user = authenticate(username=email, password=password)
    if user is None:
        return Response({'detail': 'Неверный email или пароль.'}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data})


@api_view(['GET'])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
def logout(request):
    if request.auth:
        request.auth.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer

    def get_queryset(self):
        return Account.objects.filter(owner=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        qs = Transaction.objects.filter(owner=self.request.user).select_related('account')
        month = self.request.query_params.get('month', '')
        if month:
            try:
                year, number = parse_month(month)
            except ValueError:
                return qs.none()
            qs = qs.filter(occurred_at__year=year, occurred_at__month=number)
        account_id = self.request.query_params.get('account')
        if account_id and account_id.isdecimal():
            qs = qs.filter(account_id=account_id)
        return qs[:500] if self.action == 'list' else qs


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = MonthlyBudgetSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        return MonthlyBudget.objects.filter(owner=self.request.user)


def parse_month(value):
    if len(value) != 7 or value[4] != '-':
        raise ValueError('month must be YYYY-MM')
    year, month = (int(x) for x in value.split('-'))
    if not (2000 <= year <= 2100 and 1 <= month <= 12):
        raise ValueError('invalid date')
    return year, month


@api_view(['GET'])
def summary(request):
    month = request.query_params.get('month') or timezone.localdate().strftime('%Y-%m')
    try:
        year, number = parse_month(month)
    except (ValueError, TypeError):
        return Response({'detail': 'Параметр month должен быть YYYY-MM.'}, status=400)
    first = date(year, number, 1)
    last = date(year, number, monthrange(year, number)[1])
    qs = Transaction.objects.filter(owner=request.user, occurred_at__range=(first, last))
    totals = qs.values('transaction_type').annotate(total=Sum('amount'))
    mapped = {x['transaction_type']: x['total'] for x in totals}
    spent = mapped.get('expense', Decimal('0'))
    earned = mapped.get('income', Decimal('0'))
    budget = MonthlyBudget.objects.filter(owner=request.user, month=first).first()
    monthly_limit = budget.limit if budget else None
    categories = (qs.filter(transaction_type='expense').values('category')
                  .annotate(total=Sum('amount')).order_by('-total'))
    labels = dict(Transaction.CATEGORIES)
    daily = defaultdict(lambda: {'income': Decimal('0'), 'expense': Decimal('0')})
    for item in qs.values('occurred_at', 'transaction_type').annotate(total=Sum('amount')):
        daily[item['occurred_at'].isoformat()][item['transaction_type']] = item['total']
    recent = TransactionSerializer(qs.select_related('account').order_by('-occurred_at', '-id')[:5], many=True).data
    return Response({
        'month': month,
        'income': str(earned), 'expenses': str(spent),
        'budget_limit': str(monthly_limit) if monthly_limit is not None else None,
        'remaining': str(monthly_limit - spent) if monthly_limit is not None else None,
        'total_balance': str(sum((a.balance for a in Account.objects.filter(owner=request.user)), Decimal('0'))),
        'accounts_count': Account.objects.filter(owner=request.user).count(),
        'categories': [{'category': x['category'], 'label': labels.get(x['category'], x['category']), 'amount': str(x['total'])} for x in categories],
        'daily': [{'date': day, 'income': str(sums['income']), 'expense': str(sums['expense'])} for day, sums in sorted(daily.items())],
        'recent_transactions': recent,
    })


LOAN_RATES = {
    'mortgage': [('Банк A', '17.0'), ('Банк B', '19.0'), ('Банк C', '22.0')],
    'auto': [('Банк A', '21.0'), ('Банк B', '23.0'), ('Банк C', '26.0')],
    'business': [('Банк A', '24.0'), ('Банк B', '27.0'), ('Банк C', '31.0')],
}


def annuity(amount, annual_percent, months):
    principal = Decimal(amount)
    rate = Decimal(annual_percent) / Decimal('1200')
    if rate == 0:
        payment = principal / Decimal(months)
    else:
        factor = (Decimal(1) + rate) ** months
        payment = principal * rate * factor / (factor - Decimal(1))
    payment = payment.quantize(Decimal('.01'))
    total = (payment * months).quantize(Decimal('.01'))
    return {'monthly_payment': str(payment), 'total_payment': str(total),
            'overpayment': str(total - principal)}


@api_view(['GET'])
def compare_loans(request):
    kind = request.query_params.get('kind', 'mortgage')
    if kind not in LOAN_RATES:
        return Response({'detail': 'Неизвестный тип кредита.'}, status=400)
    try:
        amount = Decimal(str(request.query_params.get('amount', '5000000')))
        months = int(request.query_params.get('months', 60))
    except (ValueError, ArithmeticError):
        return Response({'detail': 'Неверная сумма или срок.'}, status=400)
    if not amount.is_finite() or not Decimal('10000') <= amount <= Decimal('1000000000') or not 1 <= months <= 360:
        return Response({'detail': 'Сумма: 10 000–1 000 000 000 ₸; срок: 1–360 месяцев.'}, status=400)
    offers = []
    for bank, rate in LOAN_RATES[kind]:
        offers.append({'bank': bank, 'annual_rate': rate, **annuity(amount, rate, months)})
    return Response({'kind': kind, 'amount': str(amount), 'months': months,
                     'offers': offers, 'illustrative': True,
                     'disclaimer': 'Условные ставки, не предложения банков. Расчёт без комиссий, страховок и ГЭСВ.'})


@api_view(['GET'])
def categories(request):
    return Response([{'value': key, 'label': value} for key, value in Transaction.CATEGORIES])
