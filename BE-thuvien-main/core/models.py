from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class User(AbstractUser):
    ROLE_CHOICES= (
        ('reader','Độc Giả'),
        ('librarian','Thủ Thư'),
    )
    full_name=models.CharField(max_length=255)
    address=models.TextField(blank=True,null=True)
    phone=models.CharField(max_length=20,blank=True,null=True)
    date_of_birth=models.DateField(blank=True,null=True)
    role=models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='reader')
    def save(self, *args, **kwargs):
        if self.is_superuser or self.is_staff:
            if self.role == 'reader':
                self.role = 'librarian'
            if not self.full_name:
                self.full_name = self.username
        super().save(*args, **kwargs)

    def __str__(self):
        return self.full_name or self.username
