from django.urls import path
from . import views

app_name = 'media_processing'

urlpatterns = [
    path('', views.MediaListView.as_view(), name='list'),
    path('upload/', views.MediaUploadView.as_view(), name='upload'),
    path('<int:pk>/', views.MediaDetailView.as_view(), name='detail'),
    path('<int:pk>/process/', views.ProcessMediaView.as_view(), name='process'),
    path('tags/', views.TagListView.as_view(), name='tags'),
]