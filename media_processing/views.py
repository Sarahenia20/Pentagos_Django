from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
import os

from .models import Artwork, Tag, Collection
from .serializers import (
    ArtworkSerializer, ArtworkCreateSerializer,
    TagSerializer, CollectionSerializer, CollectionCreateSerializer
)
from .utils.algorithmic_art import PATTERN_CATALOG
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .ai_providers.moderation import moderate_text
from rest_framework import status
from rest_framework.response import Response


class ArtworkViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Artwork CRUD operations
    List, create, retrieve, update, delete artworks
    NO AUTH REQUIRED - For testing image generation
    """
    queryset = Artwork.objects.all()
    # permission_classes = [IsAuthenticatedOrReadOnly]  # DISABLED - No auth needed for testing
    permission_classes = [AllowAny]  # Allow anonymous artwork generation
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'generation_type', 'ai_provider', 'is_public', 'user']
    search_fields = ['title', 'prompt']
    ordering_fields = ['created_at', 'likes_count', 'views_count']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return ArtworkCreateSerializer
        return ArtworkSerializer

    def get_queryset(self):
        """Filter queryset based on user permissions"""
        queryset = Artwork.objects.all()

        # Non-authenticated users see only public artworks
        if not self.request.user.is_authenticated:
            return queryset.filter(is_public=True)

        # Authenticated users see public artworks + their own
        if self.action == 'list':
            return queryset.filter(
                models.Q(is_public=True) | models.Q(user=self.request.user)
            )

        return queryset

    def perform_create(self, serializer):
        """Create artwork and trigger generation task"""
        # Allow anonymous artwork generation - user is optional
        if self.request.user.is_authenticated:
            artwork = serializer.save(user=self.request.user)
        else:
            artwork = serializer.save(user=None)

        # Trigger Celery task for async generation
        from .tasks import generate_artwork
        task = generate_artwork.delay(str(artwork.id))
        artwork.celery_task_id = task.id
        artwork.save(update_fields=['celery_task_id'])

        return artwork

    def perform_destroy(self, instance):
        """Delete artwork and its image file from filesystem"""
        # Delete image file if it exists
        if instance.image:
            try:
                if os.path.isfile(instance.image.path):
                    os.remove(instance.image.path)
                    print(f"Deleted image file: {instance.image.path}")
            except Exception as e:
                print(f"Error deleting image file: {e}")
        
        # Delete the database record
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """Like an artwork"""
        artwork = self.get_object()
        user = request.user

        # Toggle like: if already liked by user, remove it (unlike), else create like
        from .models import ArtworkLike

        liked = ArtworkLike.objects.filter(user=user, artwork=artwork).first()
        if liked:
            liked.delete()
            # Decrement likes_count safely
            if artwork.likes_count > 0:
                artwork.likes_count -= 1
                artwork.save(update_fields=['likes_count'])
            return Response({'status': 'unliked', 'likes_count': artwork.likes_count})

        ArtworkLike.objects.create(user=user, artwork=artwork)
        artwork.likes_count += 1
        artwork.save(update_fields=['likes_count'])
        return Response({'status': 'liked', 'likes_count': artwork.likes_count})

    @action(detail=True, methods=['get', 'post'], permission_classes=[IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        """List or create comments for an artwork"""
        artwork = self.get_object()
        from .models import Comment
        from .serializers import CommentSerializer
        # moderation helper
        from .ai_providers.moderation import moderate_text

        if request.method == 'GET':
            comments = artwork.comments.all().select_related('user')
            serializer = CommentSerializer(comments, many=True, context={'request': request})
            return Response(serializer.data)

        # POST - create comment (auth required)
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        # Run moderation on incoming content before validation/save
        content = request.data.get('content', '')
        mod = moderate_text(content)
        if mod.get('blocked'):
            return Response({'error': 'Comment blocked by moderation', 'reasons': mod.get('reasons', [])}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CommentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        # Ensure artwork is set from URL
        serializer.save(user=request.user, artwork=artwork)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get generation status of artwork"""
        artwork = self.get_object()
        
        # Build full URL for image
        image_url = None
        if artwork.image:
            image_url = request.build_absolute_uri(artwork.image.url)
        
        return Response({
            'id': str(artwork.id),
            'status': artwork.status,
            'generation_started_at': artwork.generation_started_at,
            'generation_completed_at': artwork.generation_completed_at,
            'generation_duration': artwork.generation_duration,
            'error_message': artwork.error_message,
            'image_url': image_url
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_artworks(self, request):
        """Get current user's artworks"""
        artworks = self.queryset.filter(user=request.user)
        serializer = self.get_serializer(artworks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def save_to_cloudinary(self, request, pk=None):
        """Save artwork image to Cloudinary"""
        artwork = self.get_object()

        if not artwork.image:
            return Response(
                {'error': 'No image to save'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Upload to Cloudinary
        from .utils.cloudinary_helper import upload_to_cloudinary

        try:
            cloudinary_url = upload_to_cloudinary(artwork.image.path)

            if cloudinary_url:
                # Save Cloudinary URL to dedicated field
                artwork.cloudinary_url = cloudinary_url
                artwork.save(update_fields=['cloudinary_url'])

                return Response({
                    'status': 'saved',
                    'cloudinary_url': cloudinary_url,
                    'message': 'Image saved to Cloudinary successfully!'
                })
            else:
                return Response(
                    {'error': 'Failed to upload to Cloudinary'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TagViewSet(viewsets.ModelViewSet):
    """ViewSet for Tag operations"""
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class CollectionViewSet(viewsets.ModelViewSet):
    """ViewSet for Collection operations"""
    queryset = Collection.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_public', 'user']
    search_fields = ['name', 'description']

    def get_serializer_class(self):
        if self.action == 'create':
            return CollectionCreateSerializer
        return CollectionSerializer

    def get_queryset(self):
        """Filter collections based on user permissions"""
        queryset = Collection.objects.all()

        if not self.request.user.is_authenticated:
            return queryset.filter(is_public=True)

        return queryset.filter(
            models.Q(is_public=True) | models.Q(user=self.request.user)
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_artwork(self, request, pk=None):
        """Add artwork to collection"""
        collection = self.get_object()

        if collection.user != request.user:
            return Response(
                {'error': 'You can only modify your own collections'},
                status=status.HTTP_403_FORBIDDEN
            )

        artwork_id = request.data.get('artwork_id')
        artwork = get_object_or_404(Artwork, id=artwork_id, user=request.user)
        collection.artworks.add(artwork)

        return Response({'status': 'artwork added'})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def remove_artwork(self, request, pk=None):
        """Remove artwork from collection"""
        collection = self.get_object()

        if collection.user != request.user:
            return Response(
                {'error': 'You can only modify your own collections'},
                status=status.HTTP_403_FORBIDDEN
            )

        artwork_id = request.data.get('artwork_id')
        artwork = get_object_or_404(Artwork, id=artwork_id)
        collection.artworks.remove(artwork)

        return Response({'status': 'artwork removed'})


class AlgorithmicPatternsView(APIView):
    """
    View to list available algorithmic art patterns
    No authentication required
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Return catalog of available algorithmic art patterns
        with their metadata, parameters, and categories
        """
        # Organize by category
        patterns_by_category = {}
        
        for pattern_id, pattern_info in PATTERN_CATALOG.items():
            category = pattern_info['category']
            
            if category not in patterns_by_category:
                patterns_by_category[category] = []
            
            patterns_by_category[category].append({
                'id': pattern_id,
                'name': pattern_info['name'],
                'description': pattern_info['description'],
                'params': pattern_info['params']
            })
        
        return Response({
            'patterns': PATTERN_CATALOG,
            'patterns_by_category': patterns_by_category,
            'categories': list(patterns_by_category.keys()),
            'total_patterns': len(PATTERN_CATALOG)
        })



class ModerationView(APIView):
    """Lightweight moderation precheck endpoint.

    POST /api/moderate/ with JSON {"content": "..."}
    Returns { allowed: bool, blocked: bool, reasons: [...] }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        content = request.data.get('content', '')
        result = moderate_text(content)
        # Return 200 with moderation result; client can decide how to act
        return Response(result, status=status.HTTP_200_OK)
