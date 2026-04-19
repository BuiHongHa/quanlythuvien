from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import LoanView,LoanDetailView

router =DefaultRouter()
router.register(r'loans',LoanView)
#router.register(r'loandetails',LoanDetailView)
urlpatterns=[
    path('',include(router.urls)),
]