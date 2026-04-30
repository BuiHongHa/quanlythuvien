from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class  Meta:
        model=User
        fields=[
            'id',
            'username',
            'email',
            'full_name',
            'address',
            'phone',
            'date_of_birth',
            'role',
            'is_active'
        ]

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model=User
        fields=[
            'username',
            'password',
            'email',
            'full_name',
            'phone',
            'address',
            'date_of_birth'
        ]
        extra_kwargs={
            'password':{'write_only':True}
        }
    def create(self, validated_data):
        validated_data.setdefault('role', 'reader')
        user=User.objects.create_user(**validated_data)
        user.role = 'reader'
        user.is_staff = False
        user.is_superuser = False
        user.save(update_fields=['role', 'is_staff', 'is_superuser'])
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = getattr(user, 'role', 'reader')
        token['full_name'] = getattr(user, 'full_name', '')
        token['is_staff'] = user.is_staff
        return token