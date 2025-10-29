from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PromptTemplateViewSet, CategoryViewSet, TagViewSet, UserPromptLibraryViewSet

router = DefaultRouter()
router.register(r'prompts', PromptTemplateViewSet, basename='prompt')
router.register(r'prompt-categories', CategoryViewSet, basename='prompt-category')
router.register(r'prompt-tags', TagViewSet, basename='prompt-tag')
router.register(r'my-prompts', UserPromptLibraryViewSet, basename='my-prompts')

urlpatterns = [
    path('', include(router.urls)),
]
