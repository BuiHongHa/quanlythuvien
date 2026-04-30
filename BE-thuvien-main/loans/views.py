from django.shortcuts import render
from datetime import date, timedelta
from django.db import transaction
from django.db.models import Sum
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import Loan, LoanDetail
from .serializers import LoanDetailSerializer, LoanSerializer
from books.models import Book
from core.permissions import IsLibrarian


def sync_book_stock(book):
    borrowed_qty = LoanDetail.objects.filter(
        book=book,
        loan__status='borrowed'
    ).aggregate(total=Sum('quantity')).get('total') or 0
    available = max(book.total_quantity - borrowed_qty, 0)
    if book.available_quantity != available:
        book.available_quantity = available
        book.save(update_fields=['available_quantity'])

# Create your views here.
class LoanView(viewsets.ModelViewSet):
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated]  
    
    def get_queryset(self):
        """Librarian xem được tất cả, reader chỉ thấy loan của mình."""
        role = str(getattr(self.request.user, 'role', '') or '').strip().lower()
        if self.request.user.is_superuser or self.request.user.is_staff or role in ('librarian', 'manager', 'admin', 'staff'):
            return Loan.objects.all()
        return Loan.objects.filter(user=self.request.user)

    def get_permissions(self):
        if self.action in ['approve', 'destroy', 'update', 'partial_update']:
            return [IsAuthenticated(), IsLibrarian()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Hỗ trợ tạo phiếu mượn 1 hoặc nhiều sách trong một lần gửi."""
        try:
            items = request.data.get('items')
            if items and isinstance(items, list):
                borrow_items = items
            else:
                # Backward compatible với payload cũ: {book, quantity}
                borrow_items = [{
                    "book": request.data.get('book'),
                    "quantity": request.data.get('quantity', 1)
                }]

            borrow_duration = int(request.data.get('borrow_duration', 14))
            
            # Kiểm tra user đã đăng nhập
            if not request.user.is_authenticated:
                return Response(
                    {"error": "Vui lòng đăng nhập trước!"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            normalized_items = []
            for item in borrow_items:
                book_id = item.get('book')
                quantity = int(item.get('quantity', 1))
                if not book_id:
                    return Response({"error": "Thiếu mã sách trong danh sách mượn."}, status=status.HTTP_400_BAD_REQUEST)
                if quantity <= 0:
                    return Response({"error": "Số lượng mượn phải lớn hơn 0."}, status=status.HTTP_400_BAD_REQUEST)
                normalized_items.append({"book_id": int(book_id), "quantity": quantity})

            # Gộp các dòng cùng book_id để quản lý dễ hơn
            merged_items = {}
            for item in normalized_items:
                merged_items[item["book_id"]] = merged_items.get(item["book_id"], 0) + item["quantity"]

            due_date = date.today() + timedelta(days=borrow_duration)
            with transaction.atomic():
                books_map = {}
                for book_id, quantity in merged_items.items():
                    try:
                        book = Book.objects.select_for_update().get(id=book_id)
                    except Book.DoesNotExist:
                        return Response({"error": f"Sách ID {book_id} không tồn tại!"}, status=status.HTTP_404_NOT_FOUND)
                    if book.available_quantity < quantity:
                        return Response(
                            {"error": f"Sách '{book.title}' chỉ còn {book.available_quantity} cuốn."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    books_map[book_id] = book

                loan = Loan.objects.create(
                    user=request.user,
                    due_date=due_date,
                    status='borrowed'
                )

                borrowed_titles = []
                for book_id, quantity in merged_items.items():
                    book = books_map[book_id]
                    LoanDetail.objects.create(
                        loan=loan,
                        book=book,
                        quantity=quantity
                    )
                    sync_book_stock(book)
                    borrowed_titles.append(f"{book.title} (x{quantity})")
            
            return Response(
                {
                    "message": f"Mượn sách thành công: {', '.join(borrowed_titles)}",
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
        is_librarian = request.user.is_superuser or request.user.is_staff or role in ('librarian', 'manager', 'admin', 'staff')
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
            sync_book_stock(book)

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

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy', 'create']:
            return [IsAuthenticated(), IsLibrarian()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        detail = serializer.save()
        sync_book_stock(detail.book)

    def perform_update(self, serializer):
        old_book = self.get_object().book
        detail = serializer.save()
        sync_book_stock(old_book)
        sync_book_stock(detail.book)

    def perform_destroy(self, instance):
        book = instance.book
        instance.delete()
        sync_book_stock(book)