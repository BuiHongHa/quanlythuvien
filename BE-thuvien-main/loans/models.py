from django.db import models
from django.conf import settings
# Create your models here.
class Loan(models.Model):
    STATUS_CHOICES=(
        ('borrowed','Đã mượn'),
        ('returned','Đã trả'),
        ('overdue','Quá hạn'),
    )

    user=models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='loans'
    )
    borrow_date= models.DateField(auto_now_add=True)
    due_date=models.DateField()
    return_date=models.DateField(blank=True,null=True)
    status=models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='borrowed'
    )
    def __str__(self):
        return f"Loan #{self.id} -- {self.user.full_name}"
class LoanDetail(models.Model):
    loan=models.ForeignKey(
        Loan,
        on_delete=models.CASCADE,
        related_name="loan_details"
    )

    book=models.ForeignKey(
        'books.Book',
        on_delete=models.CASCADE,
        related_name="loan_details"
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name="Số lượng mượn")
    fine_amounts=models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0        
    )

    def __str__(self):
        return f"{self.book.title} -- Loan #{self.loan.id}" 



