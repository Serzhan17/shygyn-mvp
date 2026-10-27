from django.contrib import admin
from .models import Account, MonthlyBudget, Transaction

admin.site.register(Account)
admin.site.register(Transaction)
admin.site.register(MonthlyBudget)
