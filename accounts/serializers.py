from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, ActivityLog


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'bio', 'ai_bio', 'ai_bio_generated_at', 
            'artist_personality', 'artist_personality_generated_at',
            'skill_analysis', 'skill_analysis_updated_at',
            'avatar', 'website', 'location',
            'default_ai_provider', 'default_image_size', 'favorite_algorithm',
            'style_preferences', 'total_artworks', 'total_likes_received',
            'total_views_received', 'is_public_profile', 'followers_count',
            'following_count', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'ai_bio', 'ai_bio_generated_at',
            'artist_personality', 'artist_personality_generated_at',
            'skill_analysis', 'skill_analysis_updated_at',
            'total_artworks', 'total_likes_received', 'total_views_received',
            'followers_count', 'following_count', 'created_at', 'updated_at'
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with profile"""
    profile = UserProfileSerializer()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 'profile']
        read_only_fields = ['id', 'date_joined']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Passwords do not match'
            })
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for ActivityLog"""
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'username', 'activity_type', 'description', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']
