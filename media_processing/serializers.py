from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Artwork, Tag, ArtworkTag, Collection
from .models import Comment


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model"""
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'created_at']
        read_only_fields = ['id', 'created_at']


class ArtworkSerializer(serializers.ModelSerializer):
    """Serializer for Artwork model"""
    user = UserSerializer(read_only=True)
    tags = TagSerializer(source='artwork_tags.tag', many=True, read_only=True)
    generation_duration = serializers.ReadOnlyField()
    image_url = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        """Return full URL for image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    class Meta:
        model = Artwork
        fields = [
            'id', 'user', 'title', 'generation_type', 'status',
            'prompt', 'ai_provider', 'algorithm_name', 'algorithm_params',
            'image', 'image_url', 'cloudinary_url', 'image_size', 'generation_started_at', 'generation_completed_at',
            'celery_task_id', 'error_message', 'is_public', 'likes_count', 'views_count',
            'created_at', 'updated_at', 'tags', 'generation_duration',
            'ai_caption', 'ai_tags', 'ai_caption_model', 'ai_caption_generated_at'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'generation_started_at', 'generation_completed_at',
            'celery_task_id', 'error_message', 'likes_count', 'views_count',
            'created_at', 'updated_at', 'generation_duration', 'image',
            'ai_caption', 'ai_tags', 'ai_caption_model', 'ai_caption_generated_at'
        ]


class ArtworkCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new artwork"""
    class Meta:
        model = Artwork
        fields = [
            'id', 'title', 'generation_type', 'prompt', 'ai_provider',
            'algorithm_name', 'algorithm_params', 'image_size', 'is_public', 'status'
        ]
        read_only_fields = ['id', 'status']

    def validate(self, data):
        """Validate artwork creation data"""
        generation_type = data.get('generation_type')

        # Validate AI generation
        if generation_type == 'ai_prompt':
            if not data.get('prompt'):
                raise serializers.ValidationError({
                    'prompt': 'Prompt is required for AI generation'
                })
            if data.get('ai_provider') not in ['gemini', 'gpt4o']:
                raise serializers.ValidationError({
                    'ai_provider': 'Invalid AI provider'
                })

        # Validate algorithmic generation
        elif generation_type == 'algorithmic':
            if not data.get('algorithm_name'):
                raise serializers.ValidationError({
                    'algorithm_name': 'Algorithm name is required for algorithmic generation'
                })

        # Validate hybrid generation
        elif generation_type == 'hybrid':
            if not data.get('prompt') or not data.get('algorithm_name'):
                raise serializers.ValidationError({
                    'prompt': 'Both prompt and algorithm_name are required for hybrid generation'
                })

        return data

    def create(self, validated_data):
        """Create artwork and trigger generation"""
        # Don't set user - will be handled in view's perform_create
        # validated_data['user'] is already set by perform_create
        artwork = Artwork.objects.create(**validated_data)
        return artwork


class CollectionSerializer(serializers.ModelSerializer):
    """Serializer for Collection model"""
    user = UserSerializer(read_only=True)
    artworks = ArtworkSerializer(many=True, read_only=True)
    artwork_count = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = [
            'id', 'user', 'name', 'description', 'artworks',
            'artwork_count', 'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_artwork_count(self, obj):
        return obj.artworks.count()


class CollectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating collections"""
    artwork_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Collection
        fields = ['name', 'description', 'is_public', 'artwork_ids']

    def create(self, validated_data):
        artwork_ids = validated_data.pop('artwork_ids', [])
        validated_data['user'] = self.context['request'].user
        collection = Collection.objects.create(**validated_data)

        if artwork_ids:
            # Add artworks to collection
            artworks = Artwork.objects.filter(
                id__in=artwork_ids,
                user=self.context['request'].user
            )
            collection.artworks.set(artworks)

        return collection


class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    # Accept artwork as optional (the view will set artwork from the URL). This avoids validation errors
    # when clients POST only { "content": "..." } to /artworks/{id}/comments/.
    artwork = serializers.PrimaryKeyRelatedField(queryset=Artwork.objects.all(), required=False)

    class Meta:
        model = Comment
        fields = ['id', 'artwork', 'user', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
