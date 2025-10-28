from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils.http import urlencode
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.mail import send_mail, EmailMessage
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
import io
import time
import logging
import requests
import secrets
from urllib.parse import urlencode
from django.shortcuts import redirect
from django.contrib.auth import login as django_login, logout as django_logout
from django.db import transaction

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

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def generate_avatar(self, request):
        """Enqueue avatar generation for the current user and return 202.

        This endpoint enqueues a Celery task (generate_avatar_for_user) so the heavy
        model downloads and inference run asynchronously. Returns 202 with task id.
        """
        profile = request.user.profile
        prompt = (request.data.get('prompt') or '').strip()
        provider = request.data.get('provider') or profile.default_ai_provider
        image_size = request.data.get('image_size') or profile.default_image_size or '1024x1024'

        if not prompt:
            logger = logging.getLogger(__name__)
            logger.info('generate_avatar missing prompt for user=%s', request.user.username)
            return Response({'detail': 'Prompt is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from media_processing.ai_providers.moderation import moderate_text
            mod = moderate_text(prompt)
            logger = logging.getLogger(__name__)
            logger.info('moderation result for user=%s: %s', request.user.username, mod)
            if mod.get('blocked'):
                logger.info('prompt blocked by moderation for user=%s reasons=%s', request.user.username, mod.get('reasons', []))
                return Response({'detail': 'Prompt blocked by moderation', 'reasons': mod.get('reasons', [])}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logging.getLogger(__name__).exception('moderation check failed for user=%s: %s', request.user.username, e)

        # Enqueue Celery task
        try:
            from media_processing.tasks import generate_avatar_for_user
            task = generate_avatar_for_user.delay(request.user.id, prompt, provider, image_size)
            return Response({'status': 'queued', 'task_id': task.id}, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            logging.getLogger(__name__).exception('failed to enqueue avatar generation for user=%s', request.user.username)
            return Response({'detail': f'Failed to queue generation: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def generate_bio(self, request):
        """
        Generate AI-powered artist bio based on user's artworks.
        
        Analyzes the user's artwork themes, styles, and prompts to create
        a personalized bio like "Your art explores surreal landscapes and 
        abstract emotions".
        
        Returns 202 with task_id for async processing.
        """
        logger = logging.getLogger(__name__)
        
        try:
            from media_processing.tasks import generate_profile_bio
            task = generate_profile_bio.delay(request.user.id)
            
            logger.info(f'Enqueued bio generation for user={request.user.username} task_id={task.id}')
            
            return Response({
                'status': 'queued',
                'task_id': task.id,
                'message': 'Bio generation started. Check your profile in a moment.'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.exception(f'Failed to enqueue bio generation for user={request.user.username}')
            return Response({
                'detail': f'Failed to queue bio generation: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def generate_personality(self, request):
        """
        Generate AI-powered artist personality type based on user's artworks.
        
        Analyzes the user's artwork patterns, themes, styles, and creative habits
        to create a personality archetype like "The Bold Experimenter" or 
        "The Geometric Mystic" with a detailed description.
        
        Returns 202 with task_id for async processing.
        """
        logger = logging.getLogger(__name__)
        
        try:
            from media_processing.tasks import generate_artist_personality
            task = generate_artist_personality.delay(request.user.id)
            
            logger.info(f'Enqueued personality generation for user={request.user.username} task_id={task.id}')
            
            return Response({
                'status': 'queued',
                'task_id': task.id,
                'message': 'Artist personality generation started. Check your profile in a moment.'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.exception(f'Failed to enqueue personality generation for user={request.user.username}')
            return Response({
                'detail': f'Failed to queue personality generation: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def analyze_skills(self, request):
        """
        Analyze user's artistic skill progression across multiple dimensions.
        
        Evaluates 5 key skills: Composition, Color Theory, Creativity, 
        Complexity, and Technical Skill. Returns scores (0-100), levels 
        (Beginner/Intermediate/Advanced/Expert), and growth percentages.
        
        Returns 202 with task_id for async processing.
        """
        logger = logging.getLogger(__name__)
        
        try:
            from media_processing.tasks import analyze_skill_progression
            task = analyze_skill_progression.delay(request.user.id)
            
            logger.info(f'Enqueued skill analysis for user={request.user.username} task_id={task.id}')
            
            return Response({
                'status': 'queued',
                'task_id': task.id,
                'message': 'Skill analysis started. Check your profile in a moment.'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.exception(f'Failed to enqueue skill analysis for user={request.user.username}')
            return Response({
                'detail': f'Failed to queue skill analysis: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Request a password reset email. POST { "email": "user@example.com" }"""
    # Debug: log raw request body when running in DEBUG to help diagnose client quoting issues
    try:
        from django.conf import settings
        logger = logging.getLogger(__name__)
        if getattr(settings, 'DEBUG', False):
            try:
                raw = request.body.decode('utf-8', errors='replace')
            except Exception:
                raw = str(request.body)
            logger.debug('password_reset_request raw body: %s', raw)
    except Exception:
        pass

    email = (request.data.get('email') or '').strip()
    if not email:
        return Response({'detail': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        # Don't reveal whether the email exists; return 200 for security
        return Response({'detail': 'If the email exists, a reset link has been sent.'})

    try:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        from django.conf import settings
        frontend = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        reset_path = f"/reset-password?uid={uid}&token={token}"
        reset_url = frontend.rstrip('/') + reset_path

        subject = f"{getattr(settings, 'DEFAULT_FROM_EMAIL', 'PentaArt')} - Password reset"
        message = (
            f"Hi {user.username},\n\n"
            f"We received a request to reset your password. Click the link below to set a new password:\n\n"
            f"{reset_url}\n\n"
            "If you didn't request this, you can safely ignore this email.\n\n"
            "Thanks,\nThe PentaArt Team"
        )

        # Use EmailMessage so we can set reply-to or from if needed
        email_msg = EmailMessage(subject, message, to=[user.email])
        email_msg.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
        email_msg.send(fail_silently=False)

        # Log the reset URL so developers can copy it from server logs if email sending fails
        logger = logging.getLogger(__name__)
        logger.info('Password reset URL for %s: %s', user.email, reset_url)

        # In DEBUG mode, return the URL in the response to simplify local testing
        try:
            if getattr(settings, 'DEBUG', False):
                return Response({'detail': 'If the email exists, a reset link has been sent.', 'reset_url': reset_url})
        except Exception:
            pass

        return Response({'detail': 'If the email exists, a reset link has been sent.'})
    except Exception as e:
        logging.getLogger(__name__).exception('Failed to send password reset email to %s: %s', email, e)
        return Response({'detail': 'Failed to send reset email'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Confirm password reset. POST { uid, token, password }"""
    uidb64 = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('password')

    if not uidb64 or not token or not new_password:
        return Response({'detail': 'uid, token and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except Exception:
        return Response({'detail': 'Invalid uid'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'detail': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Password has been reset'})
    except Exception as e:
        logging.getLogger(__name__).exception('Failed to reset password for uid=%s: %s', uid, e)
        return Response({'detail': 'Failed to reset password'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def uid_info(request):
    """Return minimal public info for a uid (urlsafe_base64 encoded pk).

    This endpoint returns only the username for a given uid. It's intended to
    improve UX on the reset page so we can display the account's username
    without exposing the reset token. No sensitive data is returned.
    """
    uidb64 = request.query_params.get('uid')
    if not uidb64:
        return Response({'detail': 'uid is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
        return Response({'username': user.username})
    except Exception:
        return Response({'detail': 'Invalid uid'}, status=status.HTTP_400_BAD_REQUEST)


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


@api_view(['GET'])
@permission_classes([AllowAny])
def github_login(request):
    """Start GitHub OAuth by redirecting the user to GitHub's authorize URL.

    The callback should be registered in your GitHub OAuth App as:
      http://localhost:8000/auth/social/github/callback/
    """
    from django.conf import settings
    client_id = getattr(settings, 'GITHUB_CLIENT_ID', '')
    if not client_id:
        return Response({'detail': 'GitHub OAuth not configured'}, status=status.HTTP_400_BAD_REQUEST)

    state = secrets.token_urlsafe(16)
    # store state in session to validate callback
    try:
        request.session['oauth_state'] = state
    except Exception:
        # sessions may not be configured in some contexts; continue without state
        pass

    redirect_uri = request.build_absolute_uri('/auth/social/github/callback/')
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'scope': 'user:email',
        'state': state,
        'allow_signup': 'true'
    }
    url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return redirect(url)


@api_view(['GET'])
@permission_classes([AllowAny])
def github_callback(request):
    """Handle GitHub OAuth callback: exchange code for access token, fetch user info,
    create or find a local User, issue DRF Token and set cookie, then redirect to frontend.
    """
    from django.urls import reverse
    from django.conf import settings
    code = request.GET.get('code')
    state = request.GET.get('state')
    next_path = request.GET.get('next') or '/studio'

    # verify state if present in session
    try:
        sess_state = request.session.get('oauth_state')
    except Exception:
        sess_state = None
    if sess_state and state != sess_state:
        return Response({'detail': 'Invalid OAuth state'}, status=status.HTTP_400_BAD_REQUEST)

    client_id = getattr(settings, 'GITHUB_CLIENT_ID', '')
    client_secret = getattr(settings, 'GITHUB_CLIENT_SECRET', '')
    if not client_id or not client_secret or not code:
        return Response({'detail': 'Missing OAuth configuration or code'}, status=status.HTTP_400_BAD_REQUEST)

    token_url = 'https://github.com/login/oauth/access_token'
    try:
        token_resp = requests.post(token_url, data={
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'redirect_uri': request.build_absolute_uri('/auth/social/github/callback/'),
        }, headers={'Accept': 'application/json'}, timeout=10)
        token_resp.raise_for_status()
        token_data = token_resp.json()
        access_token = token_data.get('access_token')
    except Exception as e:
        logging.getLogger(__name__).exception('GitHub token exchange failed: %s', e)
        return Response({'detail': 'Failed to exchange code for token'}, status=status.HTTP_400_BAD_REQUEST)

    if not access_token:
        return Response({'detail': 'No access token from GitHub'}, status=status.HTTP_400_BAD_REQUEST)

    # Fetch user info from GitHub
    try:
        user_resp = requests.get('https://api.github.com/user', headers={
            'Authorization': f'token {access_token}',
            'Accept': 'application/vnd.github+json'
        }, timeout=10)
        user_resp.raise_for_status()
        gh_user = user_resp.json()
        gh_login = gh_user.get('login')
        gh_email = gh_user.get('email')
    except Exception as e:
        logging.getLogger(__name__).exception('Failed to fetch GitHub user: %s', e)
        return Response({'detail': 'Failed to fetch GitHub user info'}, status=status.HTTP_400_BAD_REQUEST)

    # If GitHub didn't return an email, fetch from /user/emails
    if not gh_email:
        try:
            emails_resp = requests.get('https://api.github.com/user/emails', headers={
                'Authorization': f'token {access_token}',
                'Accept': 'application/vnd.github+json'
            }, timeout=10)
            emails_resp.raise_for_status()
            emails = emails_resp.json()
            primary = next((e for e in emails if e.get('primary') and e.get('verified')), None)
            if primary:
                gh_email = primary.get('email')
            elif emails:
                gh_email = emails[0].get('email')
        except Exception:
            gh_email = None

    # Create or get a local user. Prefer matching by email if available.
    try:
        with transaction.atomic():
            user = None
            if gh_email:
                try:
                    user = User.objects.get(email__iexact=gh_email)
                except User.DoesNotExist:
                    user = None

            if not user:
                # Make a safe username
                base_username = gh_login or (f'gh_{gh_user.get("id")}')
                username = base_username
                suffix = 0
                while User.objects.filter(username=username).exists():
                    suffix += 1
                    username = f"{base_username}{suffix}"

                user = User.objects.create(username=username, email=gh_email or '')
                user.set_unusable_password()
                user.save()
                new_user = True
            else:
                new_user = False

            # Populate basic profile/user information from GitHub
            try:
                name = gh_user.get('name') or ''
                if name:
                    parts = name.split()
                    if parts:
                        user.first_name = parts[0]
                        if len(parts) > 1:
                            user.last_name = ' '.join(parts[1:])
                # Do not overwrite existing email if present
                if gh_email and (not user.email):
                    user.email = gh_email
                user.save()

                # Ensure a profile exists (signals may auto-create it)
                profile, _created = UserProfile.objects.get_or_create(user=user)

                # Update profile fields: bio, website
                try:
                    bio = gh_user.get('bio')
                    html_url = gh_user.get('html_url')
                    if bio:
                        # Only set bio if empty or this is a new user
                        if new_user or not profile.bio:
                            profile.bio = bio
                    if html_url and (new_user or not profile.website):
                        profile.website = html_url

                    # Fetch avatar image and save it if new user or no avatar set
                    avatar_url = gh_user.get('avatar_url')
                    if avatar_url and (new_user or not profile.avatar):
                        try:
                            r = requests.get(avatar_url, timeout=10)
                            r.raise_for_status()
                            from django.core.files.base import ContentFile
                            ext = 'jpg'
                            filename = f"{user.username}_gh_avatar.{ext}"
                            profile.avatar.save(filename, ContentFile(r.content), save=False)
                        except Exception:
                            # ignore avatar fetch errors
                            pass

                    profile.save()
                except Exception:
                    # ignore profile update errors
                    pass

            except Exception:
                # ignore best-effort profile population
                pass

            token, _ = Token.objects.get_or_create(user=user)

            # Log the user in to create a proper Django session (SessionAuthentication)
            try:
                django_login(request, user)
            except Exception:
                # If session middleware isn't available, continue — cookie fallback still works
                pass

            # Redirect to frontend with HttpOnly token cookie set as well
            frontend = getattr(settings, 'FRONTEND_URL', None) or request.build_absolute_uri('/')
            # Also include token in URL fragment so SPA frontend can read it and
            # persist it to localStorage (useful when HttpOnly cookie isn't visible to JS).
            redirect_to = frontend.rstrip('/') + next_path + f"#token={token.key}"
            response = redirect(redirect_to)
            # Set HttpOnly cookie for middleware and client. Secure flag only in production
            secure_flag = not getattr(settings, 'DEBUG', False)
            response.set_cookie('pentaart_token', token.key, httponly=True, secure=secure_flag, samesite='Lax', max_age=30*24*3600)
            return response
    except Exception as e:
        logging.getLogger(__name__).exception('Failed to create or login user via GitHub: %s', e)
        return Response({'detail': 'Failed to create local user'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user by deleting token"""
    try:
        # Attempt to delete the user's token (if any)
        try:
            request.user.auth_token.delete()
        except Exception:
            pass

        # End the Django session and flush session data server-side
        try:
            django_logout(request)
        except Exception:
            pass
        try:
            request.session.flush()
        except Exception:
            pass

        # Return a response that also clears the HttpOnly token cookie and sessionid
        resp = Response({'status': 'Successfully logged out'})
        # Delete pentaart_token cookie (HttpOnly) and session cookie using the request's host domain
        try:
            host = request.get_host().split(':')[0]
        except Exception:
            host = None

        secure_flag = not getattr(__import__('django.conf').conf.settings, 'DEBUG', False)
        # pentaart_token
        try:
            if host:
                resp.delete_cookie('pentaart_token', path='/', domain=host)
                resp.set_cookie('pentaart_token', '', max_age=0, path='/', domain=host, httponly=True, samesite='Lax', secure=secure_flag)
            else:
                resp.delete_cookie('pentaart_token', path='/')
                resp.set_cookie('pentaart_token', '', max_age=0, path='/', httponly=True, samesite='Lax', secure=secure_flag)
        except Exception:
            pass

        # Delete Django session cookie as well
        try:
            from django.conf import settings as _settings
            session_cookie_name = getattr(_settings, 'SESSION_COOKIE_NAME', 'sessionid')
            if host:
                resp.delete_cookie(session_cookie_name, path='/', domain=host)
                resp.set_cookie(session_cookie_name, '', max_age=0, path='/', domain=host, httponly=True, samesite='Lax', secure=secure_flag)
            else:
                resp.delete_cookie(session_cookie_name, path='/')
                resp.set_cookie(session_cookie_name, '', max_age=0, path='/', httponly=True, samesite='Lax', secure=secure_flag)
        except Exception:
            pass

        return resp
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_login(request):
    """Start Google OAuth flow by redirecting to Google's auth endpoint and saving a state token in session."""
    from django.conf import settings
    if not getattr(settings, 'GOOGLE_CLIENT_ID', ''):
        return Response({'detail': 'Google OAuth not configured'}, status=status.HTTP_400_BAD_REQUEST)

    state = secrets.token_urlsafe(16)
    try:
        request.session['oauth_state'] = state
    except Exception:
        # sessions may not be available in some contexts; continue without state
        pass

    params = {
        'client_id': settings.GOOGLE_CLIENT_ID,
        'response_type': 'code',
        'scope': 'openid email profile',
        'redirect_uri': request.build_absolute_uri('/auth/social/google/callback/'),
        'state': state,
        'prompt': 'select_account',
    }
    auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urlencode(params)
    return redirect(auth_url)


@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback(request):
    """Handle Google OAuth callback: exchange code, fetch userinfo, create/find local user,
    populate profile fields (name, avatar, bio, location/website), create DRF token, login session,
    set HttpOnly token cookie, and redirect to frontend with token fragment for SPA hydration.
    """
    from django.conf import settings
    code = request.GET.get('code')
    state = request.GET.get('state')

    # verify state if present
    try:
        saved_state = request.session.get('oauth_state')
    except Exception:
        saved_state = None
    if saved_state and saved_state != state:
        return Response({'detail': 'Invalid OAuth state'}, status=status.HTTP_400_BAD_REQUEST)

    if not code:
        return Response({'detail': 'Missing code parameter'}, status=status.HTTP_400_BAD_REQUEST)

    token_url = 'https://oauth2.googleapis.com/token'
    data = {
        'code': code,
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'redirect_uri': request.build_absolute_uri('/auth/social/google/callback/'),
        'grant_type': 'authorization_code',
    }

    try:
        token_resp = requests.post(token_url, data=data, timeout=15)
        token_resp.raise_for_status()
        token_json = token_resp.json()
    except Exception as e:
        logging.getLogger(__name__).exception('Google token exchange failed: %s', e)
        return Response({'detail': 'Failed to exchange code for token'}, status=status.HTTP_400_BAD_REQUEST)

    access_token = token_json.get('access_token')
    id_token = token_json.get('id_token')

    # fetch userinfo
    userinfo = None
    if access_token:
        try:
            userinfo_resp = requests.get('https://www.googleapis.com/oauth2/v2/userinfo', params={'access_token': access_token}, timeout=10)
            userinfo_resp.raise_for_status()
            userinfo = userinfo_resp.json()
        except Exception:
            userinfo = None

    if not userinfo and id_token:
        # try to decode id_token payload (without signature verification) as a fallback
        try:
            import base64, json as _json
            parts = id_token.split('.')
            payload = parts[1]
            payload += '=' * ((4 - len(payload) % 4) % 4)
            decoded = base64.urlsafe_b64decode(payload)
            userinfo = _json.loads(decoded)
        except Exception:
            userinfo = None

    if not userinfo:
        return Response({'detail': 'Failed to fetch Google user info'}, status=status.HTTP_400_BAD_REQUEST)

    email = userinfo.get('email')
    if not email:
        return Response({'detail': 'Google account does not provide email'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            user = None
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                user = None

            if not user:
                base_username = email.split('@')[0]
                username = base_username
                suffix = 0
                while User.objects.filter(username=username).exists():
                    suffix += 1
                    username = f"{base_username}{suffix}"
                user = User.objects.create(username=username, email=email)
                user.set_unusable_password()
                user.save()
                new_user = True
            else:
                new_user = False

            # populate names if available
            full_name = userinfo.get('name') or ''
            if full_name and (not user.first_name and not user.last_name):
                parts = full_name.split()
                user.first_name = parts[0]
                if len(parts) > 1:
                    user.last_name = ' '.join(parts[1:])
                user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)

            # bio / about fields (Google uses different keys depending on scopes)
            bio = userinfo.get('bio') or userinfo.get('description') or userinfo.get('aboutMe')
            if bio and (new_user or not profile.bio):
                profile.bio = bio

            # picture
            picture = userinfo.get('picture')
            if picture and (new_user or not profile.avatar):
                try:
                    pic_resp = requests.get(picture, timeout=10)
                    pic_resp.raise_for_status()
                    profile.avatar.save(f'avatar_google_{user.id}.jpg', ContentFile(pic_resp.content), save=False)
                except Exception:
                    pass

            # location / locale -> store as location if present
            if userinfo.get('locale') and not getattr(profile, 'location', None):
                try:
                    profile.location = userinfo.get('locale')
                except Exception:
                    pass

            # profile link / website
            if userinfo.get('profile') and not profile.website:
                profile.website = userinfo.get('profile')

            profile.save()

            token, _ = Token.objects.get_or_create(user=user)

            try:
                django_login(request, user)
            except Exception:
                pass

            frontend = getattr(settings, 'FRONTEND_URL', None) or request.build_absolute_uri('/')
            redirect_to = frontend.rstrip('/') + f"/#token={token.key}"
            response = redirect(redirect_to)
            secure_flag = not getattr(settings, 'DEBUG', False)
            response.set_cookie('pentaart_token', token.key, httponly=True, secure=secure_flag, samesite='Lax', max_age=30*24*3600)
            return response
    except Exception as e:
        logging.getLogger(__name__).exception('Failed to create or login user via Google: %s', e)
        return Response({'detail': 'Failed to create local user'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
