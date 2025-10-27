from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

from .models import PromptTemplate, Category, Tag, UserPromptLibrary
from .serializers import PromptTemplateSerializer, CategorySerializer, TagSerializer, UserPromptLibrarySerializer


class PromptTemplateViewSet(viewsets.ModelViewSet):
    queryset = PromptTemplate.objects.all()
    serializer_class = PromptTemplateSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category__slug', 'tags__name', 'is_public']
    search_fields = ['title', 'prompt_text', 'description', 'tags__name']
    ordering_fields = ['created_at', 'likes_count']

    def get_queryset(self):
        qs = super().get_queryset()
        # Only public prompts for anonymous users
        if not self.request.user.is_authenticated:
            return qs.filter(is_public=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        prompt = self.get_object()
        # Simple toggle: record in UserPromptLibrary as favorite and increment likes_count
        upl, created = UserPromptLibrary.objects.get_or_create(user=request.user, prompt=prompt)
        upl.is_favorite = True
        upl.save()
        prompt.likes_count = prompt.saved_by.filter(is_favorite=True).count()
        prompt.save(update_fields=['likes_count'])
        return Response({'status': 'liked', 'likes_count': prompt.likes_count})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unlike(self, request, pk=None):
        prompt = self.get_object()
        try:
            upl = UserPromptLibrary.objects.get(user=request.user, prompt=prompt)
            upl.is_favorite = False
            upl.save()
        except UserPromptLibrary.DoesNotExist:
            pass
        prompt.likes_count = prompt.saved_by.filter(is_favorite=True).count()
        prompt.save(update_fields=['likes_count'])
        return Response({'status': 'unliked', 'likes_count': prompt.likes_count})


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


class UserPromptLibraryViewSet(viewsets.ModelViewSet):
    serializer_class = UserPromptLibrarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserPromptLibrary.objects.filter(user=self.request.user).select_related('prompt')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
