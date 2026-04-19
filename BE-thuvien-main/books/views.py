from django.shortcuts import render
from rest_framework import viewsets
from core.permissions import IsLibrarianOrReadOnly
from .models import Category,Book
from .serializers import CategorySerializer,BookSerializer
# Create your views here.

class CategoryView(viewsets.ModelViewSet):
    queryset=Category.objects.all()
    serializer_class=CategorySerializer
    permission_classes = [IsLibrarianOrReadOnly]

class BookView(viewsets.ModelViewSet):
    queryset=Book.objects.all()
    serializer_class=BookSerializer
    permission_classes = [IsLibrarianOrReadOnly]

