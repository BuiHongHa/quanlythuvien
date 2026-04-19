from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryView,BookView

router=DefaultRouter()
router.register(r'categories',CategoryView)
router.register(r'books',BookView)

urlpatterns=[
    path('',include(router.urls)),
]