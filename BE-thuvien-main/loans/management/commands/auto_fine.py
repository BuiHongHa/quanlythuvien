from django.core.management.base import BaseCommand
from datetime import date
from loans.models import Loan

class Command(BaseCommand):
    help = 'Tự động quét và cập nhật trạng thái quá hạn cho các phiếu mượn'

    def handle(self, *args, **kwargs):
        today = date.today()
        # Tìm các phiếu đang mượn mà ngày đến hạn nhỏ hơn hôm nay
        overdue_loans = Loan.objects.filter(status='borrowed', due_date__lt=today)
        
        count = 0
        for loan in overdue_loans:
            loan.status = 'overdue'
            loan.save()
            count += 1
            
        self.stdout.write(self.style.SUCCESS(f'Đã cập nhật phạt thành công cho {count} phiếu mượn.'))