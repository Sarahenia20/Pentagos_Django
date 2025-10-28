"""
URL configuration for PentaArt platform.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from accounts import views as accounts_views
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken import views as authtoken_views

# Import admin customization
from . import admin as custom_admin

# Import viewsets
from media_processing.views import ArtworkViewSet, TagViewSet, CollectionViewSet, AlgorithmicPatternsView, ModerationView, CommentViewSet
from accounts.views import UserProfileViewSet, ActivityLogViewSet
from accounts import views as accounts_views

# Create router for API endpoints
router = DefaultRouter()
router.register(r'artworks', ArtworkViewSet, basename='artwork')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'collections', CollectionViewSet, basename='collection')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'activities', ActivityLogViewSet, basename='activity')

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API endpoints
    path('api/', include(router.urls)),
    path('api/auth/', include('accounts.urls')),
    # Social OAuth endpoints at root so frontend can redirect to /auth/social/... (matches Github OAuth app callback)
    path('auth/social/github/login/', accounts_views.github_login, name='github_login'),
    path('auth/social/github/callback/', accounts_views.github_callback, name='github_callback'),
    # Google OAuth
    path('auth/social/google/login/', accounts_views.google_login, name='google_login'),
    path('auth/social/google/callback/', accounts_views.google_callback, name='google_callback'),
    path('api/algorithmic-patterns/', AlgorithmicPatternsView.as_view(), name='algorithmic_patterns'),
    path('api/moderate/', ModerationView.as_view(), name='moderate'),

    # API authentication
    path('api-auth/', include('rest_framework.urls')),
    path('api-token-auth/', authtoken_views.obtain_auth_token),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
