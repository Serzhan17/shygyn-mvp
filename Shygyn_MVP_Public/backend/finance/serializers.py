from datetime import date
from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import Account, MonthlyBudget, Transaction

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'first_name', 'email')


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, allow_blank=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Этот email уже зарегистрирован.')
        return value

    def validate_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as err:
            raise serializers.ValidationError(list(err.messages))
        return value

    def create(self, validated_data):
        email = validated_data['email']
        return User.objects.create_user(username=email, email=email,
                                        first_name=validated_data['first_name'],
                                        password=validated_data['password'])


class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Account
        fields = ('id', 'name', 'bank', 'account_type', 'opening_balance', 'balance', 'created_at')
        read_only_fields = ('id', 'balance', 'created_at')

    def create(self, validated_data):
        return Account.objects.create(owner=self.context['request'].user, **validated_data)


class TransactionSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    category_label = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Transaction
        fields = ('id', 'account', 'account_name', 'transaction_type', 'category',
                  'category_label', 'amount', 'description', 'occurred_at', 'created_at')
        read_only_fields = ('id', 'account_name', 'category_label', 'created_at')

    def validate_account(self, account):
        if account.owner_id != self.context['request'].user.id:
            raise serializers.ValidationError('Этот счёт вам не принадлежит.')
        return account

    def create(self, validated_data):
        return Transaction.objects.create(owner=self.context['request'].user, **validated_data)


class MonthlyBudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyBudget
        fields = ('id', 'month', 'limit')
        read_only_fields = ('id',)

    def validate_month(self, value):
        if value.day != 1:
            raise serializers.ValidationError('Укажите первый день месяца.')
        return value

    def create(self, validated_data):
        budget, _ = MonthlyBudget.objects.update_or_create(
            owner=self.context['request'].user,
            month=validated_data['month'], defaults={'limit': validated_data['limit']}
        )
        return budget
