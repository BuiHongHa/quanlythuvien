from django.shortcuts import render
from datetime import date, timedelta
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import Loan, LoanDetail
from .serializers import LoanDetailSerializer, LoanSerializer
from books.models import Book
from core.permissions import IsLibrarian

# Create your views here.
class LoanView(viewsets.ModelViewSet):
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated]  
    
    def get_queryset(self):
        """Librarian xem được tất cả, reader chỉ thấy loan của mình."""
        role = str(getattr(self.request.user, 'role', '') or '').strip().lower()
        if self.request.user.is_staff or role in ('librarian', 'manager', 'admin', 'staff'):
            return Loan.objects.all()
        return Loan.objects.filter(user=self.request.user)

    def get_permissions(self):
        if self.action in ['approve', 'destroy', 'update', 'partial_update']:
            return [IsAuthenticated(), IsLibrarian()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Override create để xử lý POST request từ frontend"""
        try:
            book_id = request.data.get('book')
            # Ép kiểu int để tính toán an toàn
            quantity = int(request.data.get('quantity', 1)) 
            borrow_duration = int(request.data.get('borrow_duration', 14))
            
            # Kiểm tra user đã đăng nhập
            if not request.user.is_authenticated:
                return Response(
                    {"error": "Vui lòng đăng nhập trước!"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Lấy sách từ DB
            try:
                book = Book.objects.get(id=book_id)
            except Book.DoesNotExist:
                return Response(
                    {"error": "Sách không tồn tại!"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Kiểm tra số lượng sẵn có
            if book.available_quantity < quantity:
                return Response(
                    {"error": f"Chỉ còn {book.available_quantity} cuốn sách!"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Tạo Loan mới
            due_date = date.today() + timedelta(days=borrow_duration)
            loan = Loan.objects.create(
                user=request.user,
                due_date=due_date,
                status='borrowed'
            )
            
            # Tạo LoanDetail
            LoanDetail.objects.create(
                loan=loan,
                book=book,
                quantity=quantity
            )
            
            # Cập nhật số lượng sách
            book.available_quantity -= quantity
            book.save()
            
            return Response(
                {
                    "message": f"Mượn sách '{book.title}' thành công!",
                    "loan_id": loan.id,
                    "due_date": due_date
                },
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        loan = self.get_object()
        
        loan.status = "borrowed"
        loan.save()
        return Response({"message": "Loan Approved"})

    @action(detail=True, methods=['patch'])
    def return_book(self, request, pk=None):
        loan = self.get_object()

        role = str(getattr(request.user, 'role', '') or '').strip().lower()
        is_librarian = request.user.is_staff or role in ('librarian', 'manager', 'admin', 'staff')
        if loan.user_id != request.user.id and not is_librarian:
            return Response({"error": "Bạn không có quyền trả khoản mượn này."}, status=status.HTTP_403_FORBIDDEN)

        if loan.status != 'borrowed':
            return Response({"error": "Chỉ khoản mượn đang mượn mới có thể trả."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Phòng hờ lỗi sai tên khóa ngoại related_name
        try:
            details = loan.loan_details.all()
        except AttributeError:
            details = loan.loandetail_set.all()

        if not details.exists():
            print(f"⚠️ CẢNH BÁO: Phiếu mượn số {loan.id} đang bị rỗng! Không có thông tin sách (LoanDetail).")
        
        # Xử lý cộng lại kho
        for detail in details:
            book = detail.book
            book.available_quantity += detail.quantity
            book.save()

        loan.status = "returned"
        loan.return_date = date.today()
        loan.save()

        return Response({"message": "Book Returned"})

    @action(detail=False, methods=['get'])
    def my_loans(self, request):
        loans = Loan.objects.filter(user=request.user)
        serializer = self.get_serializer(loans, many=True)
        return Response(serializer.data)


class LoanDetailView(viewsets.ModelViewSet):
    queryset = LoanDetail.objects.all()
    serializer_class = LoanDetailSerializer