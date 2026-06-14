from django.shortcuts import render
from datetime import date, timedelta
from django.db import transaction
from django.db.models import Sum, F, IntegerField
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import Loan, LoanDetail
from .serializers import LoanDetailSerializer, LoanSerializer
from books.models import Book
from core.permissions import IsLibrarian

ACTIVE_LOAN_STATUSES = ('pending', 'borrowed', 'overdue')


def sync_book_stock(book):
    borrowed_qty = LoanDetail.objects.filter(
        book=book,
        loan__status__in=ACTIVE_LOAN_STATUSES
    ).aggregate(
        total=Sum(
            F('quantity') - F('returned_quantity'),
            output_field=IntegerField()
        )
    ).get('total') or 0
    available = max(book.total_quantity - borrowed_qty, 0)
    if book.available_quantity != available:
        book.available_quantity = available
        book.save(update_fields=['available_quantity'])


def _get_loan_details(loan):
    try:
        return loan.loan_details.all()
    except AttributeError:
        return loan.loandetail_set.all()


def _calculate_fine_amount(due_date, quantity, return_date=None):
    if return_date is None:
        return_date = date.today()
    days_late = max((return_date - due_date).days, 0)
    return days_late * 5000 * quantity

# Create your views here.
class LoanView(viewsets.ModelViewSet):
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated]  
    
    def _is_librarian(self, user):
        role = str(getattr(user, 'role', '') or '').strip().lower()
        return user.is_superuser or user.is_staff or role in ('librarian', 'admin', 'staff')

    def get_queryset(self):
        """Librarian xem được tất cả, reader chỉ thấy loan của mình."""
        role = str(getattr(self.request.user, 'role', '') or '').strip().lower()
        if self.request.user.is_superuser or self.request.user.is_staff or role in ('librarian', 'admin', 'staff'):
            return Loan.objects.all().order_by('-borrow_date','-id')
        return Loan.objects.filter(user=self.request.user).order_by('-borrow_date','-id'   )

    def get_permissions(self):
        if self.action in ['approve', 'reject', 'finalize_return', 'destroy', 'update', 'partial_update']:
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
                    status='pending'
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
            
            message_text = f"Yêu cầu mượn sách đã được gửi và đang chờ duyệt: {', '.join(borrowed_titles)}"
            return Response(
                {
                    "message": message_text,
                    "loan_id": loan.id,
                    "due_date": due_date,
                    "status": 'pending'
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
        if loan.status != 'pending':
            return Response({"error": "Chỉ phiếu mượn đang chờ mới có thể duyệt."}, status=status.HTTP_400_BAD_REQUEST)
        loan.status = 'overdue' if loan.due_date < date.today() else 'borrowed'
        loan.save()
        return Response({"message": "Phiếu mượn đã được duyệt.", "status": loan.status})

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        loan = self.get_object()
        if loan.status != 'pending':
            return Response({"error": "Chỉ phiếu mượn đang chờ mới có thể từ chối."}, status=status.HTTP_400_BAD_REQUEST)
        loan.status = 'rejected'
        loan.save()
        for detail in _get_loan_details(loan):
            sync_book_stock(detail.book)
        return Response({"message": "Phiếu mượn đã bị từ chối."})

    @action(detail=True, methods=['patch'])
    def return_book(self, request, pk=None):
        """Người mượn gửi yêu cầu trả sách. Thủ thư xác nhận tiền phạt và hoàn tất sau."""
        loan = self.get_object()

        if loan.user_id != request.user.id:
            return Response({"error": "Chỉ người mượn mới có thể thao tác trả sách."}, status=status.HTTP_403_FORBIDDEN)

        if loan.status in ('returned', 'return_pending'):
            return Response({"error": "Phiếu mượn này đã được gửi trả hoặc đã hoàn tất."}, status=status.HTTP_400_BAD_REQUEST)

        if loan.status not in ('borrowed', 'overdue'):
            return Response({"error": "Chỉ phiếu đang mượn hoặc quá hạn mới có thể trả sách."}, status=status.HTTP_400_BAD_REQUEST)

        details = _get_loan_details(loan)
        if not details.exists():
            return Response({"error": "Phiếu mượn không có sách để trả."}, status=status.HTTP_400_BAD_REQUEST)

        requested_items = request.data.get('items')
        return_date = date.today()
        returned_books = []
        books_to_sync = set()

        if requested_items is None:
            requested_items = [
                {"book": detail.book_id, "quantity": detail.outstanding_quantity}
                for detail in details
            ]

        if not isinstance(requested_items, list) or len(requested_items) == 0:
            return Response({"error": "Danh sách sách trả không hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

        details_by_book = {detail.book_id: detail for detail in details}

        with transaction.atomic():
            for item in requested_items:
                book_id = item.get('book')
                quantity = int(item.get('quantity', 0))
                if not book_id or quantity <= 0:
                    return Response({"error": "Mỗi mục trả cần có book và quantity hợp lệ."}, status=status.HTTP_400_BAD_REQUEST)

                if book_id not in details_by_book:
                    return Response({"error": f"Sách ID {book_id} không có trong phiếu mượn này."}, status=status.HTTP_400_BAD_REQUEST)

                detail = details_by_book[book_id]
                outstanding = detail.quantity - detail.returned_quantity
                if quantity > outstanding:
                    return Response({"error": f"Số lượng trả cho sách '{detail.book.title}' vượt quá số còn nợ."}, status=status.HTTP_400_BAD_REQUEST)

                suggested_fine = _calculate_fine_amount(loan.due_date, quantity, return_date)
                detail.returned_quantity += quantity
                detail.fine_amounts = suggested_fine
                detail.save(update_fields=['returned_quantity', 'fine_amounts'])

                returned_books.append(f"{detail.book.title} (x{quantity})")
                books_to_sync.add(detail.book_id)

            remaining_details = _get_loan_details(loan)
            still_outstanding = any(
                detail.quantity > detail.returned_quantity
                for detail in remaining_details
            )
            if not still_outstanding:
                loan.status = 'return_pending'
            else:
                loan.status = 'overdue' if loan.due_date < return_date else 'borrowed'
            loan.save()

        for book_id in books_to_sync:
            book = Book.objects.get(id=book_id)
            sync_book_stock(book)

        return Response({
            "message": f"Đã gửi yêu cầu trả sách: {', '.join(returned_books)}. Vui lòng chờ thủ thư xác nhận tiền phạt.",
            "loan_status": loan.status,
            "return_date": None,
        })

    @action(detail=True, methods=['patch'])
    def finalize_return(self, request, pk=None):
        """Thủ thư xác nhận tiền phạt và hoàn tất phiếu trả."""
        loan = self.get_object()
        if loan.status != 'return_pending':
            return Response({"error": "Chỉ phiếu đang chờ xác nhận trả mới có thể hoàn tất."}, status=status.HTTP_400_BAD_REQUEST)

        return_date = date.today()
        loan.status = 'returned'
        loan.return_date = return_date
        loan.save(update_fields=['status', 'return_date'])

        return Response({
            "message": "Phiếu mượn đã được hoàn tất.",
            "loan_status": loan.status,
            "return_date": loan.return_date,
        })

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