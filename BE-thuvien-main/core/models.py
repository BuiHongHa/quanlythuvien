from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class User(AbstractUser):
    ROLE_CHOICES= (
        ('reader','Độc Giả'),
        ('librarian','Thủ Thư'),
        ('manager','Quản Lý'),
    )
    full_name=models.CharField(max_length=255)
    address=models.TextField(blank=True,null=True)
    phone=models.CharField(max_length=20,blank=True,null=True)
    date_of_birth=models.DateField(blank=True,null=True)
    role=models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='reader')
    def __str__(self):
        return self.full_name
