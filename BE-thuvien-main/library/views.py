from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Zone, Seat, SeatReservation 
from .serializers import ZoneSerializer, SeatSerializer, SeatReservationSerializer
from core.permissions import IsLibrarianOrReadOnly

class ZoneView(viewsets.ModelViewSet):
    queryset = Zone.objects.all()
    serializer_class = ZoneSerializer
    permission_classes = [IsLibrarianOrReadOnly]

class SeatView(viewsets.ModelViewSet):
    queryset = Seat.objects.all()
    serializer_class = SeatSerializer
    permission_classes = [IsLibrarianOrReadOnly]

class SeatReservationView(viewsets.ModelViewSet):
    queryset = SeatReservation.objects.all()
    serializer_class = SeatReservationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return SeatReservation.objects.all()
        return SeatReservation.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    # API Custom: Check-in (PATCH /api/reservations/{id}/check_in/)
    @action(detail=True, methods=['patch'])
    def check_in(self, request, pk=None):
        reservation = self.get_object()
        if reservation.user_id != request.user.id and not request.user.is_staff:
            return Response({"error": "Bạn không có quyền check-in cho lượt đặt này."}, status=status.HTTP_403_FORBIDDEN)
        if reservation.status != 'booked':
            return Response({"error": "Chỉ có thể check-in các ghế đã đặt."}, status=status.HTTP_400_BAD_REQUEST)
        
        reservation.status = 'checked_in' 
        reservation.save()
        return Response({"status": "Check-in thành công"})

    # API Custom: Check-out (PATCH /api/reservations/{id}/check_out/)
    @action(detail=True, methods=['patch'])
    def check_out(self, request, pk=None):
        reservation = self.get_object()
        if reservation.user_id != request.user.id and not request.user.is_staff:
            return Response({"error": "Bạn không có quyền check-out cho lượt đặt này."}, status=status.HTTP_403_FORBIDDEN)
        if reservation.status != 'checked_in':
            return Response({"error": "Chưa check-in nên không thể check-out."}, status=status.HTTP_400_BAD_REQUEST)
        
        reservation.status = 'completed' 
        reservation.save()
        return Response({"status": "Check-out thành công"})