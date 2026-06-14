from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

# Create your models here.
class Zone(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    layout_image = models.ImageField(upload_to='zone_layouts/', blank=True, null=True)

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
    x_position = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    y_position = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    
    def __str__(self):
        return f"{self.zone.name} -- {self.seat_number}"

class SeatReservation(models.Model):
    STATUS_CHOICE = (
        ('pending', 'Chờ Duyệt'),     # Nên để pending lên đầu vì là default
        ('approved', 'Đã Duyệt'),
        ('checked_in', 'Đang Ngồi'),
        ('completed', 'Đã Rời'),
        ('cancelled', 'Hủy'),
        ('rejected', 'Từ Chối'),
        ('booked', 'Đã Đặt'),         # Giữ lại cho tương thích ngược
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
        default='pending'  # Đã đúng
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # 1. Kiểm tra giờ hợp lệ
        if self.start_time >= self.end_time:
            raise ValidationError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.')
        
        # 2. Kiểm tra ngày không được trong quá khứ (chỉ cho phép đặt từ hôm nay trở đi)
        from datetime import date
        if self.date < date.today():
            raise ValidationError('Không thể đặt chỗ trong quá khứ.')

        # 3. Kiểm tra trùng lịch cho các trạng thái "đã duyệt" hoặc "đang ngồi"
        # Đây là các trạng thái chiếm chỗ thực tế
        if self.status in ['approved', 'checked_in']:
            overlapping = SeatReservation.objects.filter(
                seat=self.seat,
                date=self.date,
                status__in=['approved', 'checked_in']  # Chỉ các đơn đã được duyệt mới tính
            ).exclude(id=self.id).filter(
                start_time__lt=self.end_time,
                end_time__gt=self.start_time
            )
        
            if overlapping.exists():
                raise ValidationError('Ghế đã được duyệt trong khung giờ này.')
        
        # 4. THÊM MỚI: Kiểm tra trùng lịch cho các đơn pending (tùy chọn)
        # Nếu muốn tránh nhiều người đặt cùng lúc chờ duyệt, bỏ comment đoạn này:
        
        # if self.status == 'pending':
        #     pending_overlap = SeatReservation.objects.filter(
        #         seat=self.seat,
        #         date=self.date,
        #         status='pending',
        #         start_time__lt=self.end_time,
        #         end_time__gt=self.start_time
        #     ).exclude(id=self.id)
            
        #     if pending_overlap.exists():
        #         raise ValidationError('Đã có người đặt chờ đợi trong khung giờ này.')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.seat} -- {self.date} ({self.get_status_display()})"