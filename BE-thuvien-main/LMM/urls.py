"""
URL configuration for LMM project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib import admin
from django.http import HttpResponse
from django.urls import path,include
from django.conf import settings
from django.conf.urls.static import static
from core.views import LoginView
# Tạo một hàm view đơn giản ngay tại đây
def home_view(request):
    return HttpResponse("<h1>Chào mừng đến với API Hệ thống Quản lý Thư viện!</h1>")

urlpatterns = [
    path('', home_view), # Thêm dòng này để xử lý đường dẫn trống (trang chủ)
    path('admin/', admin.site.urls),
    path('api/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Các API của bạn
    path('api/books/', include('books.urls')),
    path('api/loans/', include('loans.urls')),
    path('api/core/', include('core.urls')),
    path('api/library/', include('library.urls')),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
