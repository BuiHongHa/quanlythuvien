from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import UserView,RegisterView,LoginView,ProfileView,ChangePasswordView

router=DefaultRouter()
router.register(r'users',UserView)

urlpatterns=[
    path('auth/register/',RegisterView.as_view(),name='register'),
    path('auth/login/',LoginView.as_view(),name='login'),
    path('users/profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('',include(router.urls)),
]