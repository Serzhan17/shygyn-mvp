from django.urls import include, path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('accounts', views.AccountViewSet, basename='account')
router.register('transactions', views.TransactionViewSet, basename='transaction')
router.register('budgets', views.BudgetViewSet, basename='budget')

urlpatterns = [
    path('health/', views.health),
    path('auth/register/', views.register),
    path('auth/login/', views.login),
    path('auth/me/', views.me),
    path('auth/logout/', views.logout),
    path('summary/', views.summary),
    path('categories/', views.categories),
    path('loans/compare/', views.compare_loans),
    path('', include(router.urls)),
]
