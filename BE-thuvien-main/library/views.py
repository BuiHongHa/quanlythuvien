from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError

from .models import Zone, Seat, SeatReservation 
from .serializers import ZoneSerializer, SeatSerializer, SeatReservationSerializer
from core.permissions import IsLibrarianOrReadOnly

class ZoneView(viewsets.ModelViewSet):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer
    permission_classes = [IsLibrarianOrReadOnly]

    # Thêm action này để cập nhật trạng thái khu vực và xử lý đơn đặt chỗ
    @action(detail=True, methods=['patch'], permission_classes=[IsLibrarianOrReadOnly])
    def update_status(self, request, pk=None):
        zone = self.get_object()
        new_status = request.data.get('is_active')
        
        if new_status is None:
            return Response(
                {"error": "Thiếu trạng thái is_active"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Chuyển đổi boolean nếu cần
        if isinstance(new_status, str):
            new_status = new_status.lower() == 'true'
        
        old_status = zone.is_active
        
        # Nếu trạng thái không thay đổi
        if old_status == new_status:
            return Response({
                "status": "success",
                "message": "Trạng thái khu vực không thay đổi",
                "zone_status": new_status
            })
        
        affected_count = 0
        
        with transaction.atomic():
            # Cập nhật trạng thái zone
            zone.is_active = new_status
            zone.save()
            
            # Nếu chuyển từ hoạt động (True) sang tạm đóng (False)
            if old_status == True and new_status == False:
                # Lấy ngày hôm nay
                today = timezone.now().date()
                
                # Lấy tất cả ghế thuộc zone này
                seats_in_zone = Seat.objects.filter(zone=zone)
                
                if seats_in_zone.exists():
                    # Cập nhật các reservation có trạng thái pending hoặc approved trong tương lai
                    affected_reservations = SeatReservation.objects.filter(
                        seat__in=seats_in_zone,
                        date__gte=today,  # Từ hôm nay trở đi
                        status__in=['pending', 'approved']
                    )
                    
                    affected_count = affected_reservations.count()
                    
                    # Cập nhật trạng thái thành 'rejected'
                    affected_reservations.update(status='rejected')
            
            message = f"Đã cập nhật trạng thái khu vực thành {'HOẠT ĐỘNG' if new_status else 'TẠM ĐÓNG'}"
            if affected_count > 0:
                message += f". Đã từ chối {affected_count} đơn đặt chỗ {', '.join(['pending', 'approved'])} trong tương lai."
            
            return Response({
                "status": "success",
                "message": message,
                "zone_status": new_status,
                "affected_reservations": affected_count
            })

class SeatView(viewsets.ModelViewSet):
    queryset = Seat.objects.all()
    serializer_class = SeatSerializer
    permission_classes = [IsLibrarianOrReadOnly]
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        seat = self.get_object()
        new_status = request.data.get('is_maintainance')
        
        if new_status is None:
            return Response(
                {"error": "Thiếu trạng thái is_maintainance"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Chuyển đổi boolean nếu cần
        if isinstance(new_status, str):
            new_status = new_status.lower() == 'true'
        
        old_status = seat.is_maintainance
        
        # Nếu trạng thái không thay đổi
        if old_status == new_status:
            return Response({
                "status": "success",
                "message": "Trạng thái ghế không thay đổi",
                "seat_status": new_status
            })
        
        affected_count = 0
        
        with transaction.atomic():
            # Cập nhật trạng thái ghế
            seat.is_maintainance = new_status
            seat.save()
            
            # Nếu chuyển từ bình thường (False) sang bảo trì (True)
            if old_status == False and new_status == True:
                # Lấy ngày hôm nay
                today = timezone.now().date()
                
                # Cập nhật các reservation có trạng thái pending hoặc approved trong tương lai
                affected_reservations = SeatReservation.objects.filter(
                    seat=seat,
                    date__gte=today,
                    status__in=['pending', 'approved']
                )
                
                affected_count = affected_reservations.count()
                affected_reservations.update(status='rejected')
            
            message = f"Đã cập nhật trạng thái ghế {seat.seat_number} thành {'BẢO TRÌ' if new_status else 'BÌNH THƯỜNG'}"
            if affected_count > 0:
                message += f". Đã từ chối {affected_count} đơn đặt chỗ."
            
            return Response({
                "status": "success",
                "message": message,
                "seat_status": new_status,
                "affected_reservations": affected_count
            })
class SeatReservationView(viewsets.ModelViewSet):
    queryset = SeatReservation.objects.all()
    serializer_class = SeatReservationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return SeatReservation.objects.all().order_by('-created_at')
        return SeatReservation.objects.filter(user=user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            error_msg = "Đặt chỗ thất bại. Vui lòng kiểm tra lại thông tin."
            errors = serializer.errors
            if 'non_field_errors' in errors and errors['non_field_errors']:
                error_msg = errors['non_field_errors'][0]
            elif errors:
                first_field = list(errors.keys())[0]
                error_msg = f"{first_field}: {errors[first_field][0]}"
            return Response({"error": error_msg}, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, status='pending')

    # Admin duyệt đơn
    @action(detail=True, methods=['patch'], permission_classes=[IsLibrarianOrReadOnly])
    def approve(self, request, pk=None):
        reservation = self.get_object()
        
        # Kiểm tra khu vực có đang hoạt động không
        if not reservation.seat.zone.is_active:
            return Response(
                {"error": "Khu vực này hiện đang tạm đóng, không thể duyệt đơn."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if reservation.status != 'pending':
            return Response(
                {"error": f"Không thể duyệt đơn ở trạng thái {reservation.get_status_display()}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reservation.status = 'approved'
            reservation.save()
        except ValidationError as e:
            error_msg = e.message if hasattr(e, 'message') else str(e)
            if hasattr(e, 'message_dict'):
                error_msg = "; ".join([f"{k}: {', '.join(v)}" for k, v in e.message_dict.items()])
            elif hasattr(e, 'messages'):
                error_msg = "; ".join(e.messages)
            return Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({"status": "approved", "message": "Đã duyệt đơn đặt chỗ"})

    # Admin từ chối đơn
    @action(detail=True, methods=['patch'], permission_classes=[IsLibrarianOrReadOnly])
    def reject(self, request, pk=None):
        reservation = self.get_object()
        
        if reservation.status != 'pending':
            return Response(
                {"error": f"Không thể từ chối đơn ở trạng thái {reservation.get_status_display()}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservation.status = 'rejected'
        reservation.save()
        
        return Response({"status": "rejected", "message": "Đã từ chối đơn đặt chỗ"})

    # Admin check-in
    @action(detail=True, methods=['patch'], permission_classes=[IsLibrarianOrReadOnly])
    def check_in(self, request, pk=None):
        reservation = self.get_object()
        
        # Kiểm tra khu vực có đang hoạt động không
        if not reservation.seat.zone.is_active:
            return Response(
                {"error": "Khu vực này hiện đang tạm đóng, không thể check-in."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if reservation.status != 'approved':
            return Response(
                {"error": f"Chỉ có thể check-in đơn đã duyệt. Trạng thái hiện tại: {reservation.get_status_display()}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            reservation.status = 'checked_in'
            reservation.save()
        except ValidationError as e:
            error_msg = e.message if hasattr(e, 'message') else str(e)
            if hasattr(e, 'message_dict'):
                error_msg = "; ".join([f"{k}: {', '.join(v)}" for k, v in e.message_dict.items()])
            elif hasattr(e, 'messages'):
                error_msg = "; ".join(e.messages)
            return Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({"status": "checked_in", "message": "Check-in thành công"})

    # Admin check-out
    @action(detail=True, methods=['patch'], permission_classes=[IsLibrarianOrReadOnly])
    def check_out(self, request, pk=None):
        reservation = self.get_object()
        
        if reservation.status != 'checked_in':
            return Response(
                {"error": f"Chỉ có thể check-out đơn đang ngồi. Trạng thái hiện tại: {reservation.get_status_display()}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservation.status = 'completed'
        reservation.save()
        
        return Response({"status": "completed", "message": "Check-out thành công"})

    # User hủy đơn
    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        reservation = self.get_object()
        
        if reservation.user != request.user:
            return Response(
                {"error": "Bạn không có quyền hủy đơn này"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if reservation.status not in ['pending', 'approved']:
            return Response(
                {"error": f"Không thể hủy đơn ở trạng thái {reservation.get_status_display()}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reservation.status = 'cancelled'
        reservation.save()
        
        return Response({"status": "cancelled", "message": "Đã hủy đơn đặt chỗ"})