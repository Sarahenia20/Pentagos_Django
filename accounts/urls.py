from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('me/', views.current_user, name='current_user'),
    path('password_reset/', views.password_reset_request, name='password_reset_request'),
    path('password_reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),
    path('uid_info/', views.uid_info, name='uid_info'),
]