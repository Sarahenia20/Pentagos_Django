from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction, models
from django.utils import timezone
from .models import Artwork, Tag, ArtworkTag, Collection, Comment


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    artwork_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'date_joined', 'artwork_count']
        read_only_fields = ['id', 'date_joined', 'artwork_count']
    
    def get_artwork_count(self, obj):
        """Return count of user's artworks"""
        return obj.artworks.count()


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for nested user representation"""
    class Meta:
        model = User
        fields = ['id', 'username']
        read_only_fields = ['id', 'username']


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model"""
    artwork_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'created_at', 'artwork_count']
        read_only_fields = ['id', 'slug', 'created_at', 'artwork_count']
    
    def get_artwork_count(self, obj):
        """Return count of artworks with this tag"""
        return obj.artwork_tags.count()


class TagMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for nested tag representation"""
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug']
        read_only_fields = ['id', 'name', 'slug']


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for Comment model"""
    user = UserMinimalSerializer(read_only=True)
    artwork = serializers.PrimaryKeyRelatedField(
        queryset=Artwork.objects.all(), 
        required=False
    )
    is_author = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'artwork', 'user', 'content', 'created_at', 
                  'updated_at', 'is_author', 'can_edit']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 
                           'is_author', 'can_edit']
    
    def get_is_author(self, obj):
        """Check if the current user is the comment author"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False
    
    def get_can_edit(self, obj):
        """Check if the current user can edit this comment"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.user == request.user or request.user.is_staff
    
    def validate_content(self, value):
        """Validate comment content"""
        if not value or not value.strip():
            raise serializers.ValidationError("Comment content cannot be empty.")
        if len(value) > 1000:
            raise serializers.ValidationError("Comment cannot exceed 1000 characters.")
        return value.strip()


class ArtworkListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for artwork listings"""
    user = UserMinimalSerializer(read_only=True)
    tags = TagMinimalSerializer(source='artwork_tags.tag', many=True, read_only=True)
    image_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    
    class Meta:
        model = Artwork
        fields = [
            'id', 'user', 'title', 'generation_type', 'status',
            'image_url', 'thumbnail_url', 'is_public', 'likes_count', 
            'views_count', 'created_at', 'tags', 'is_owner', 'comments_count'
        ]
        read_only_fields = fields
    
    def get_image_url(self, obj):
        """Return full URL for image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.cloudinary_url
    
    def get_thumbnail_url(self, obj):
        """Return thumbnail URL (you can implement thumbnail logic)"""
        # Placeholder for thumbnail logic
        return self.get_image_url(obj)
    
    def get_is_owner(self, obj):
        """Check if the current user owns this artwork"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False


class ArtworkDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for individual artwork view"""
    user = UserSerializer(read_only=True)
    tags = TagSerializer(source='artwork_tags.tag', many=True, read_only=True)
    generation_duration = serializers.ReadOnlyField()
    image_url = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    related_artworks = serializers.SerializerMethodField()

    def get_image_url(self, obj):
        """Return full URL for image"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.cloudinary_url
    
    def get_comments_count(self, obj):
        """Return count of comments for this artwork"""
        return obj.comments.count()
    
    def get_is_owner(self, obj):
        """Check if the current user owns this artwork"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False
    
    def get_is_liked(self, obj):
        """Check if the current user has liked this artwork"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Assuming you have a Like model or similar
            return False  # Implement based on your Like model
        return False
    
    def get_related_artworks(self, obj):
        """Get related artworks based on tags or user"""
        # Get artworks with similar tags
        related = Artwork.objects.filter(
            artwork_tags__tag__in=obj.artwork_tags.values_list('tag', flat=True),
            is_public=True
        ).exclude(id=obj.id).distinct()[:4]
        
        return ArtworkListSerializer(
            related, 
            many=True, 
            context=self.context
        ).data

    class Meta:
        model = Artwork
        fields = [
            'id', 'user', 'title', 'generation_type', 'status',
            'prompt', 'ai_provider', 'algorithm_name', 'algorithm_params',
            'image', 'image_url', 'cloudinary_url', 'image_size', 
            'generation_started_at', 'generation_completed_at',
            'celery_task_id', 'error_message', 'is_public', 'likes_count', 
            'views_count', 'created_at', 'updated_at', 'tags', 
            'generation_duration', 'ai_caption', 'ai_tags', 
            'ai_caption_model', 'ai_caption_generated_at',
            'comments', 'comments_count', 'is_owner', 'is_liked',
            'related_artworks'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'generation_started_at', 
            'generation_completed_at', 'celery_task_id', 'error_message', 
            'likes_count', 'views_count', 'created_at', 'updated_at', 
            'generation_duration', 'image', 'ai_caption', 'ai_tags', 
            'ai_caption_model', 'ai_caption_generated_at',
            'comments', 'comments_count', 'is_owner', 'is_liked',
            'related_artworks'
        ]


class ArtworkCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new artwork with tag support"""
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=50),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Artwork
        fields = [
            'id', 'title', 'generation_type', 'prompt', 'ai_provider',
            'algorithm_name', 'algorithm_params', 'image_size', 
            'is_public', 'status', 'tag_names'
        ]
        read_only_fields = ['id', 'status']

    def validate_title(self, value):
        """Validate artwork title"""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        if len(value) > 200:
            raise serializers.ValidationError("Title cannot exceed 200 characters.")
        return value.strip()
    
    def validate_prompt(self, value):
        """Validate AI prompt"""
        if value and len(value) > 2000:
            raise serializers.ValidationError("Prompt cannot exceed 2000 characters.")
        return value
    
    def validate_image_size(self, value):
        """Validate image size format"""
        if value:
            try:
                width, height = map(int, value.split('x'))
                if width <= 0 or height <= 0:
                    raise ValueError
                if width > 4096 or height > 4096:
                    raise serializers.ValidationError(
                        "Image dimensions cannot exceed 4096x4096."
                    )
            except (ValueError, AttributeError):
                raise serializers.ValidationError(
                    "Invalid image size format. Use format: WIDTHxHEIGHT (e.g., 512x512)."
                )
        return value

    def validate(self, data):
        """Validate artwork creation data"""
        generation_type = data.get('generation_type')

        # Validate AI generation
        if generation_type == 'ai_prompt':
            if not data.get('prompt'):
                raise serializers.ValidationError({
                    'prompt': 'Prompt is required for AI generation.'
                })
            if not data.get('ai_provider'):
                raise serializers.ValidationError({
                    'ai_provider': 'AI provider is required for AI generation.'
                })
            if data.get('ai_provider') not in ['gemini', 'gpt4o']:
                raise serializers.ValidationError({
                    'ai_provider': 'Invalid AI provider. Choose from: gemini, gpt4o.'
                })

        # Validate algorithmic generation
        elif generation_type == 'algorithmic':
            if not data.get('algorithm_name'):
                raise serializers.ValidationError({
                    'algorithm_name': 'Algorithm name is required for algorithmic generation.'
                })

        # Validate hybrid generation
        elif generation_type == 'hybrid':
            if not data.get('prompt') or not data.get('algorithm_name'):
                raise serializers.ValidationError(
                    'Both prompt and algorithm_name are required for hybrid generation.'
                )
            if not data.get('ai_provider'):
                raise serializers.ValidationError({
                    'ai_provider': 'AI provider is required for hybrid generation.'
                })

        return data

    @transaction.atomic
    def create(self, validated_data):
        """Create artwork with tags"""
        tag_names = validated_data.pop('tag_names', [])
        
        # Create artwork
        artwork = Artwork.objects.create(**validated_data)
        
        # Handle tags
        if tag_names:
            for tag_name in tag_names[:10]:  # Limit to 10 tags
                tag, _ = Tag.objects.get_or_create(
                    name=tag_name.strip().lower(),
                    defaults={'slug': tag_name.strip().lower().replace(' ', '-')}
                )
                ArtworkTag.objects.get_or_create(artwork=artwork, tag=tag)
        
        return artwork


class ArtworkUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating artwork"""
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=50),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Artwork
        fields = ['title', 'is_public', 'tag_names']
    
    def validate_title(self, value):
        """Validate artwork title"""
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty.")
        if len(value) > 200:
            raise serializers.ValidationError("Title cannot exceed 200 characters.")
        return value.strip()
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """Update artwork with tag management"""
        tag_names = validated_data.pop('tag_names', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update tags if provided
        if tag_names is not None:
            # Remove existing tags
            ArtworkTag.objects.filter(artwork=instance).delete()
            
            # Add new tags
            for tag_name in tag_names[:10]:  # Limit to 10 tags
                tag, _ = Tag.objects.get_or_create(
                    name=tag_name.strip().lower(),
                    defaults={'slug': tag_name.strip().lower().replace(' ', '-')}
                )
                ArtworkTag.objects.get_or_create(artwork=instance, tag=tag)
        
        return instance


class CollectionSerializer(serializers.ModelSerializer):
    """Serializer for Collection model"""
    user = UserMinimalSerializer(read_only=True)
    artworks = ArtworkListSerializer(many=True, read_only=True)
    artwork_count = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = [
            'id', 'user', 'name', 'description', 'artworks',
            'artwork_count', 'is_public', 'created_at', 'updated_at',
            'is_owner'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 
                           'artwork_count', 'is_owner']

    def get_artwork_count(self, obj):
        """Return count of artworks in collection"""
        return obj.artworks.count()
    
    def get_is_owner(self, obj):
        """Check if the current user owns this collection"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False


class CollectionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for collection listings"""
    user = UserMinimalSerializer(read_only=True)
    artwork_count = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = [
            'id', 'user', 'name', 'description', 'artwork_count',
            'cover_image_url', 'is_public', 'created_at', 'updated_at',
            'is_owner'
        ]
        read_only_fields = fields

    def get_artwork_count(self, obj):
        """Return count of artworks in collection"""
        return obj.artworks.count()
    
    def get_cover_image_url(self, obj):
        """Return URL of first artwork's image as cover"""
        first_artwork = obj.artworks.first()
        if first_artwork and first_artwork.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_artwork.image.url)
            return first_artwork.image.url
        return None
    
    def get_is_owner(self, obj):
        """Check if the current user owns this collection"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False


class CollectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating collections"""
    artwork_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        allow_empty=True
    )

    class Meta:
        model = Collection
        fields = ['name', 'description', 'is_public', 'artwork_ids']
    
    def validate_name(self, value):
        """Validate collection name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Collection name cannot be empty.")
        if len(value) > 100:
            raise serializers.ValidationError("Collection name cannot exceed 100 characters.")
        return value.strip()
    
    def validate_artwork_ids(self, value):
        """Validate artwork IDs"""
        if len(value) > 100:
            raise serializers.ValidationError("Cannot add more than 100 artworks at once.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        """Create collection with artworks"""
        artwork_ids = validated_data.pop('artwork_ids', [])
        user = self.context['request'].user
        
        # Check for duplicate collection name
        if Collection.objects.filter(user=user, name=validated_data['name']).exists():
            raise serializers.ValidationError({
                'name': 'You already have a collection with this name.'
            })
        
        # Create collection
        collection = Collection.objects.create(user=user, **validated_data)

        if artwork_ids:
            # Verify all artworks belong to user and are public or owned by user
            artworks = Artwork.objects.filter(
                id__in=artwork_ids
            ).filter(
                models.Q(user=user) | models.Q(is_public=True)
            )
            
            if len(artworks) != len(artwork_ids):
                raise serializers.ValidationError({
                    'artwork_ids': 'Some artworks were not found or you do not have access to them.'
                })
            
            collection.artworks.set(artworks)

        return collection


class CollectionUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating collections"""
    artwork_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Collection
        fields = ['name', 'description', 'is_public', 'artwork_ids']
    
    def validate_name(self, value):
        """Validate collection name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Collection name cannot be empty.")
        if len(value) > 100:
            raise serializers.ValidationError("Collection name cannot exceed 100 characters.")
        return value.strip()

    @transaction.atomic
    def update(self, instance, validated_data):
        """Update collection"""
        artwork_ids = validated_data.pop('artwork_ids', None)
        user = self.context['request'].user
        
        # Check for duplicate name (excluding current collection)
        if 'name' in validated_data:
            if Collection.objects.filter(
                user=user, 
                name=validated_data['name']
            ).exclude(id=instance.id).exists():
                raise serializers.ValidationError({
                    'name': 'You already have a collection with this name.'
                })
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update artworks if provided
        if artwork_ids is not None:
            artworks = Artwork.objects.filter(
                id__in=artwork_ids
            ).filter(
                models.Q(user=user) | models.Q(is_public=True)
            )
            
            if len(artworks) != len(artwork_ids):
                raise serializers.ValidationError({
                    'artwork_ids': 'Some artworks were not found or you do not have access to them.'
                })
            
            instance.artworks.set(artworks)
        
        return instance


# Performance optimization hint for views
class ArtworkQuerySetMixin:
    """
    Mixin to optimize artwork querysets with select_related and prefetch_related.
    Use in your views like:
    
    queryset = ArtworkQuerySetMixin.get_optimized_queryset()
    """
    
    @staticmethod
    def get_optimized_list_queryset():
        """Optimized queryset for list views"""
        return Artwork.objects.select_related('user').prefetch_related(
            'artwork_tags__tag',
            'comments'
        )
    
    @staticmethod
    def get_optimized_detail_queryset():
        """Optimized queryset for detail views"""
        return Artwork.objects.select_related('user').prefetch_related(
            'artwork_tags__tag',
            'comments__user',
            'collections'
        )