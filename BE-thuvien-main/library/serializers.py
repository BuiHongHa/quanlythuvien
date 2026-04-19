from rest_framework import serializers
from django.db.models import Q
# 1. Đã sửa lại tên import cho đúng với models.py
from .models import Zone, Seat, SeatReservation

# 2. Đổi tên class Serializer cho khớp với tên bạn đang gọi bên views.py
class SeatReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeatReservation # 3. Khai báo đúng tên model
        fields = '__all__'
        read_only_fields = ['status', 'user'] # Trạng thái và user do hệ thống gán

    def validate(self, data):
        """Thuật toán kiểm tra trùng lịch cốt lõi"""
        seat = data.get('seat')
        date = data.get('date')
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if start_time >= end_time:
            raise serializers.ValidationError("Giờ bắt đầu phải nhỏ hơn giờ kết thúc.")

        # Kiểm tra xem ghế có đang bảo trì không
        if seat.is_maintainance:
            raise serializers.ValidationError("Ghế này đang được bảo trì.")

        # Công thức giao thoa thời gian: (StartA < EndB) và (EndA > StartB)
        # 4. Sửa lại tên gọi model và cập nhật trạng thái 'checked_in' cho khớp model
        overlapping_reservations = SeatReservation.objects.filter(
            seat=seat, date=date, status__in=['booked', 'checked_in'] 
        ).filter(
            Q(start_time__lt=end_time) & Q(end_time__gt=start_time)
        )

        if self.instance is not None:
            overlapping_reservations = overlapping_reservations.exclude(id=self.instance.id)

        if overlapping_reservations.exists():
            raise serializers.ValidationError("Ghế này đã có người đặt trong khoảng thời gian bạn chọn.")
        
        return data

# (Gợi ý thêm) Bạn nên tạo luôn Serializer cho Zone và Seat để dùng bên views.py
class ZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zone
        fields = '__all__'

class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = '__all__'