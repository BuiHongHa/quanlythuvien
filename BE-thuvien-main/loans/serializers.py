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
    
    class Meta:
        model = LoanDetail
        fields = ['id', 'book', 'quantity', 'fine_amounts']

class LoanSerializer(serializers.ModelSerializer):
    loan_details = LoanDetailSerializer(many=True, read_only=True)
    
    # Lấy Username (Đã có)
    user = serializers.CharField(source='user.username', read_only=True)
    
    # 1. THÊM DÒNG NÀY: Lấy Họ và tên từ bảng User
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    
    book_names = serializers.SerializerMethodField()

    class Meta:
        model = Loan
        # 2. NHỚ THÊM 'full_name' VÀO ĐÂY:
        fields = ['id', 'user', 'full_name', 'borrow_date', 'due_date', 'return_date', 'status', 'loan_details', 'book_names']
        read_only_fields = ['user', 'borrow_date']

    def get_book_names(self, obj):
        try:
            details = obj.loan_details.all()
        except AttributeError:
            details = obj.loandetail_set.all()
        titles = [detail.book.title for detail in details if getattr(detail, 'book', None)]
        return ", ".join(titles)