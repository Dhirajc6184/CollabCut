from rest_framework import serializers
from .models import AppUser, Project


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppUser
        fields = ['name', 'email', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        user = AppUser(
            name=validated_data['name'],
            email=validated_data['email'],
            role=validated_data['role']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'user', 'editor', 'video']