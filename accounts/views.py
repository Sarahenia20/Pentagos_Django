from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from .models import UserProfile, ActivityLog
from .serializers import (
    UserProfileSerializer, UserDetailSerializer,
    UserRegistrationSerializer, ActivityLogSerializer
)


class UserProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for UserProfile operations"""
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Users can only view public profiles or their own"""
        if self.action == 'list':
            return UserProfile.objects.filter(is_public_profile=True)
        return UserProfile.objects.all()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user's profile"""
        profile = request.user.profile
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

    # Accept JSON, form-data and multipart uploads for profile updates
    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def update_me(self, request):
        """Update current user's profile"""
        profile = request.user.profile

        # Handle updates to the related User model (username/email) if present
        user_changed = False
        username = request.data.get('username')
        email = request.data.get('email')

        if username and username != request.user.username:
            # Basic validation: ensure username is not taken
            if User.objects.filter(username=username).exclude(pk=request.user.pk).exists():
                return Response({'username': 'This username is already taken.'}, status=status.HTTP_400_BAD_REQUEST)
            request.user.username = username
            user_changed = True

        if email and email != request.user.email:
            # Ensure email uniqueness
            if User.objects.filter(email=email).exclude(pk=request.user.pk).exists():
                return Response({'email': 'This email is already in use.'}, status=status.HTTP_400_BAD_REQUEST)
            request.user.email = email
            user_changed = True

        if user_changed:
            request.user.save()

        # Update profile fields
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Return combined user + profile representation for convenience
        data = serializer.data
        data['username'] = request.user.username
        data['email'] = request.user.email
        return Response(data)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            'user': UserDetailSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login user and return token"""
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    # First try authenticating by username
    user = authenticate(username=username, password=password)

    # If not found, and the provided 'username' looks like an email, try to resolve user by email
    if not user:
        try:
            # Try to find a user with this email and authenticate using that user's username
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

    if user:
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserDetailSerializer(user).data,
            'token': token.key
        })

    return Response(
        {'error': 'Invalid credentials'},
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user by deleting token"""
    try:
        request.user.auth_token.delete()
        return Response({'status': 'Successfully logged out'})
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current authenticated user details"""
    serializer = UserDetailSerializer(request.user)
    return Response(serializer.data)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing user activity logs"""
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Users can only view their own activity logs"""
        return ActivityLog.objects.filter(user=self.request.user)
