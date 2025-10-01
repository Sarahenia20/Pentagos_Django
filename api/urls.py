from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'media', views.MediaFileViewSet)
router.register(r'tags', views.TagViewSet)
router.register(r'users', views.UserViewSet)

app_name = 'api'

urlpatterns = [
    path('', include(router.urls)),
    path('auth/', include('rest_framework.urls')),
    path('health/', views.HealthCheckView.as_view(), name='health_check'),
]