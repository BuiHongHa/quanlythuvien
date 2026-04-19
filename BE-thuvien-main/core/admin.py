from django.contrib import admin
from .models import * 
from books.models import *
from library.models import *
from loans.models import *
# Register your models here.
admin.site.register(User)
admin.site.register(Category)
admin.site.register(Book)
admin.site.register(Loan)
admin.site.register(LoanDetail)
admin.site.register(Zone)
admin.site.register(Seat)
admin.site.register(SeatReservation)