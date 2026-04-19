from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

# Create your models here.
class Zone(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name
    
class Seat(models.Model):
    zone = models.ForeignKey(
        Zone,
        on_delete=models.CASCADE,
        related_name='seats'
    )
    
    seat_number = models.CharField(max_length=10)
    is_maintainance = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.zone.name} -- {self.seat_number}"

class SeatReservation(models.Model):
    STATUS_CHOICE = (
        ('booked', 'Đã Đặt'),
        ('checked_in', 'Đang Ngồi'),
        ('completed', 'Đã Rời'),
        ('cancelled', 'Hủy'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='seat_reservations'
    )

    seat = models.ForeignKey(
        Seat,
        on_delete=models.CASCADE,
        related_name='reservations'
    )

    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICE,
        default='booked'
    )

    def clean(self):
        # 1. Kiểm tra giờ hợp lệ trước tiên
        if self.start_time >= self.end_time:
            raise ValidationError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.')

        # 2. Thuật toán kiểm tra trùng lịch (Time Overlapping)
        overlapping = SeatReservation.objects.filter(
            seat=self.seat,
            date=self.date,
            status__in=['booked', 'checked_in']  # SỬA LỖI: Cần dùng 2 dấu gạch dưới (status__in) và sửa lỗi chính tả 'chech_in' thành 'checked_in'
        ).exclude(id=self.id).filter(
            start_time__lt=self.end_time,  # SỬA LỖI LOGIC: start_time của database phải < end_time mới nhập
            end_time__gt=self.start_time   # SỬA LỖI LOGIC: end_time của database phải > start_time mới nhập
        )
        
        if overlapping.exists():
            raise ValidationError('Ghế đã được đặt trong khung giờ này.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.seat} -- {self.date}"