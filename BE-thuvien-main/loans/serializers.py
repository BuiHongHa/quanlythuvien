from datetime import date
from django.db.models import Sum
from rest_framework import serializers
from .models import Loan, LoanDetail
from books.models import Book

class BookDetailSerializer(serializers.ModelSerializer):
    """✓ Để include book info trong loan details"""
    class Meta:
        model = Book
        fields = ['id', 'title', 'cover_image']

class LoanDetailSerializer(serializers.ModelSerializer):
    book = BookDetailSerializer(read_only=True)  # ✓ FIX: Nested serializer để lấy book info
    returned_quantity = serializers.IntegerField(read_only=True)
    outstanding_quantity = serializers.SerializerMethodField()
    
    class Meta:
        model = LoanDetail
        fields = ['id', 'book', 'quantity', 'returned_quantity', 'outstanding_quantity', 'fine_amounts']

    def get_outstanding_quantity(self, obj):
        return obj.outstanding_quantity

class LoanSerializer(serializers.ModelSerializer):
    loan_details = LoanDetailSerializer(many=True, read_only=True)
    
    # Lấy Username (Đã có)
    user = serializers.CharField(source='user.username', read_only=True)
    
    # 1. THÊM DÒNG NÀY: Lấy Họ và tên từ bảng User
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    book_names = serializers.SerializerMethodField()
    total_fine = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        # 2. NHỚ THÊM 'full_name' VÀO ĐÂY:
        fields = ['id', 'user', 'full_name', 'borrow_date', 'due_date', 'return_date', 'status', 'status_display', 'loan_details', 'book_names', 'total_fine']
        read_only_fields = ['user', 'borrow_date']

    def get_book_names(self, obj):
        try:
            details = obj.loan_details.all()
        except AttributeError:
            details = obj.loandetail_set.all()
        titles = [
            f"{detail.book.title} (x{getattr(detail, 'outstanding_quantity', getattr(detail, 'quantity', 1))})"
            for detail in details if getattr(detail, 'book', None) and getattr(detail, 'outstanding_quantity', getattr(detail, 'quantity', 1)) > 0
        ]
        return ", ".join(titles)

    def get_total_fine(self, obj):
        try:
            details = obj.loan_details.all()
        except AttributeError:
            details = obj.loandetail_set.all()

        total = 0
        for detail in details:
            total += detail.fine_amounts or 0
            if obj.status == 'overdue' and obj.return_date is None:
                days_late = max((date.today() - obj.due_date).days, 0)
                total += days_late * 5000 * detail.outstanding_quantity
        return total