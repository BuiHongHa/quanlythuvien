from rest_framework import serializers
from .models import Category,Book


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model=Category
        fields='__all__'

class BookSerializer(serializers.ModelSerializer):
    is_available = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Book
        fields = '__all__'
    
    def get_cover_image(self, obj):
        if not obj.cover_image:
            return None
        request = self.context.get('request')
        try:
            url = obj.cover_image.url
        except ValueError:
            return None
        if request is not None:
            return request.build_absolute_uri(url)
        return url
    
    def get_category_name(self, obj):
        return obj.category.name if obj.category else None
    
    def get_is_available(self, obj):
        return obj.is_available