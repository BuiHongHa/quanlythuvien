from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import ZoneView,SeatView,SeatReservationView

router=DefaultRouter()
router.register(r'zones',ZoneView)
router.register(r'seats',SeatView)
router.register(r'reservations',SeatReservationView)

urlpatterns=[
    path('',include(router.urls)),
]