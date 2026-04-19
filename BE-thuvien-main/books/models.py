from django.db import models

# Create your models here.
class Category(models.Model):
    name = models.CharField(max_length=255, verbose_name="Tên thể loại")
    note = models.TextField(blank=True, null=True, verbose_name="Ghi chú")

    class Meta:
        verbose_name = "Thể loại"
        verbose_name_plural = "Danh mục Thể loại"

    def __str__(self):
        return self.name
class Book(models.Model):
    title = models.CharField(max_length=255, verbose_name="Tiêu đề sách")
    published_year = models.IntegerField(verbose_name="Năm xuất bản", null=True, blank=True)
    publisher = models.CharField(max_length=255, verbose_name="Nhà xuất bản", null=True, blank=True)
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả sách")
    
    # ĐÂY LÀ TRƯỜNG ẢNH BÌA BẠN MUỐN THÊM
    cover_image = models.ImageField(upload_to='book_covers/', null=True, blank=True, verbose_name="Ảnh bìa minh họa")
    
    # Logic Category của bạn được giữ nguyên, chỉ thêm Tiếng Việt
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name='books',
        verbose_name="Thể loại"
    )
    # Logic số lượng của bạn giữ nguyên, thêm Tiếng Việt
    total_quantity = models.PositiveIntegerField(default=1, verbose_name="Tổng số lượng")
    available_quantity = models.PositiveIntegerField(default=1, verbose_name="Số lượng sẵn có")

    class Meta:
        verbose_name = "Cuốn sách"
        verbose_name_plural = "Danh sách Sách"

    def __str__(self):
        return self.title
    def save(self, *args, **kwargs):
        if self.available_quantity > self.total_quantity:
            self.available_quantity = self.total_quantity
        super().save(*args, **kwargs)
        
    @property
    def is_available(self):
        return self.available_quantity > 0