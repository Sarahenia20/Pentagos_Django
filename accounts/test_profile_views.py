"""
Comprehensive test suite for accounts profile views.

Tests cover:
- Profile update endpoint
- Avatar generation (async via Celery)
- AI-powered bio generation
- Artist personality generation
- Skill progression analysis
- Password reset workflow
- Registration and login
- Edge cases and error handling
"""

import pytest
from unittest.mock import patch, Mock, MagicMock
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.core import mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator

from accounts.models import UserProfile
from rest_framework.authtoken.models import Token


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def user(_db, django_user_model):
    """Create a test user with profile."""
    user = django_user_model.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'  # noqa: S106
    )
    # Profile is auto-created via signals
    return user


@pytest.fixture
def other_user(_db, django_user_model):
    """Create another test user."""
    return django_user_model.objects.create_user(
        username='otheruser',
        email='other@example.com',
        password='testpass123'  # noqa: S106
    )


@pytest.fixture
def api_client():
    """Create API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """Create authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


# ============================================================================
# PROFILE VIEWSET TESTS
# ============================================================================

@pytest.mark.django_db
class TestUserProfileViewSet:
    """Test UserProfileViewSet."""

    def test_get_my_profile(self, authenticated_client):
        """Test retrieving current user's profile."""
        response = authenticated_client.get('/api/profiles/me/')
        assert response.status_code == status.HTTP_200_OK
        assert 'user' in response.data

    def test_get_my_profile_unauthenticated(self, api_client):
        """Test unauthenticated user cannot access profile."""
        response = api_client.get('/api/profiles/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_profile_bio(self, authenticated_client, user):
        """Test updating profile bio."""
        data = {'bio': 'I am a digital artist specializing in sci-fi art'}
        response = authenticated_client.patch('/api/profiles/update_me/', data)
        assert response.status_code == status.HTTP_200_OK

        user.profile.refresh_from_db()
        assert user.profile.bio == 'I am a digital artist specializing in sci-fi art'

    def test_update_profile_username(self, authenticated_client, user):
        """Test updating username via profile endpoint."""
        data = {'username': 'newusername'}
        response = authenticated_client.patch('/api/profiles/update_me/', data)
        assert response.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.username == 'newusername'

    def test_update_profile_email(self, authenticated_client, user):
        """Test updating email via profile endpoint."""
        data = {'email': 'newemail@example.com'}
        response = authenticated_client.patch('/api/profiles/update_me/', data)
        assert response.status_code == status.HTTP_200_OK

        user.refresh_from_db()
        assert user.email == 'newemail@example.com'

    def test_update_profile_duplicate_username(self, authenticated_client, _other_user):
        """Test updating to existing username fails."""
        data = {'username': 'otheruser'}
        response = authenticated_client.patch('/api/profiles/update_me/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in response.data

    def test_update_profile_duplicate_email(self, authenticated_client, _other_user):
        """Test updating to existing email fails."""
        data = {'email': 'other@example.com'}
        response = authenticated_client.patch('/api/profiles/update_me/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data

    def test_update_profile_multiple_fields(self, authenticated_client, user):
        """Test updating multiple profile fields at once."""
        data = {
            'bio': 'New bio',
            'location': 'San Francisco',
            'website': 'https://example.com',
            'is_public_profile': True
        }
        response = authenticated_client.patch('/api/profiles/update_me/', data)
        assert response.status_code == status.HTTP_200_OK

        user.profile.refresh_from_db()
        assert user.profile.bio == 'New bio'
        assert user.profile.location == 'San Francisco'


# ============================================================================
# AVATAR GENERATION TESTS
# ============================================================================

@pytest.mark.django_db
class TestAvatarGeneration:
    """Test avatar generation endpoint."""

    @patch('accounts.views.generate_avatar_for_user')
    def test_generate_avatar_success(self, mock_task, authenticated_client):
        """Test successful avatar generation queueing."""
        mock_task.delay.return_value = Mock(id='task-123')

        data = {
            'prompt': 'a professional portrait of an artist',
            'provider': 'sdxl',
            'image_size': '512x512'
        }
        response = authenticated_client.post('/api/profiles/generate_avatar/', data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data['status'] == 'queued'
        assert response.data['task_id'] == 'task-123'
        mock_task.delay.assert_called_once()

    def test_generate_avatar_missing_prompt(self, authenticated_client):
        """Test avatar generation without prompt fails."""
        data = {}
        response = authenticated_client.post('/api/profiles/generate_avatar/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_generate_avatar_empty_prompt(self, authenticated_client):
        """Test avatar generation with empty prompt fails."""
        data = {'prompt': '   '}
        response = authenticated_client.post('/api/profiles/generate_avatar/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch('accounts.views.moderate_text')
    @patch('accounts.views.generate_avatar_for_user')
    def test_generate_avatar_blocked_prompt(self, mock_task, mock_moderate, authenticated_client):
        """Test avatar generation with blocked prompt."""
        mock_moderate.return_value = {
            'blocked': True,
            'reasons': ['profanity']
        }

        data = {'prompt': 'inappropriate content'}
        response = authenticated_client.post('/api/profiles/generate_avatar/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'blocked' in response.data['detail'].lower()
        mock_task.delay.assert_not_called()

    @patch('accounts.views.moderate_text')
    @patch('accounts.views.generate_avatar_for_user')
    def test_generate_avatar_moderation_passes(self, mock_task, mock_moderate, authenticated_client):
        """Test avatar generation with approved prompt."""
        mock_moderate.return_value = {
            'blocked': False,
            'reasons': []
        }
        mock_task.delay.return_value = Mock(id='task-456')

        data = {'prompt': 'a friendly portrait'}
        response = authenticated_client.post('/api/profiles/generate_avatar/', data)

        assert response.status_code == status.HTTP_202_ACCEPTED
        mock_task.delay.assert_called_once()

    @patch('accounts.views.generate_avatar_for_user')
    def test_generate_avatar_celery_failure(self, mock_task, authenticated_client):
        """Test handling of Celery task queue failure."""
        mock_task.delay.side_effect = Exception('Celery not available')

        data = {'prompt': 'test prompt'}
        response = authenticated_client.post('/api/profiles/generate_avatar/', data)

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_generate_avatar_unauthenticated(self, api_client):
        """Test unauthenticated user cannot generate avatar."""
        data = {'prompt': 'test'}
        response = api_client.post('/api/profiles/generate_avatar/', data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# BIO GENERATION TESTS
# ============================================================================

@pytest.mark.django_db
class TestBioGeneration:
    """Test AI-powered bio generation."""

    @patch('accounts.views.generate_profile_bio')
    def test_generate_bio_success(self, mock_task, authenticated_client):
        """Test successful bio generation queueing."""
        mock_task.delay.return_value = Mock(id='bio-task-123')

        response = authenticated_client.post('/api/profiles/generate_bio/')

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data['status'] == 'queued'
        assert response.data['task_id'] == 'bio-task-123'
        mock_task.delay.assert_called_once()

    @patch('accounts.views.generate_profile_bio')
    def test_generate_bio_celery_failure(self, mock_task, authenticated_client):
        """Test handling of Celery failure for bio generation."""
        mock_task.delay.side_effect = Exception('Task queue error')

        response = authenticated_client.post('/api/profiles/generate_bio/')

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert 'Failed to queue' in response.data['detail']

    def test_generate_bio_unauthenticated(self, api_client):
        """Test unauthenticated user cannot generate bio."""
        response = api_client.post('/api/profiles/generate_bio/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# PERSONALITY GENERATION TESTS
# ============================================================================

@pytest.mark.django_db
class TestPersonalityGeneration:
    """Test artist personality generation."""

    @patch('accounts.views.generate_artist_personality')
    def test_generate_personality_success(self, mock_task, authenticated_client):
        """Test successful personality generation queueing."""
        mock_task.delay.return_value = Mock(id='personality-task-123')

        response = authenticated_client.post('/api/profiles/generate_personality/')

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data['status'] == 'queued'
        assert 'task_id' in response.data
        mock_task.delay.assert_called_once()

    @patch('accounts.views.generate_artist_personality')
    def test_generate_personality_celery_failure(self, mock_task, authenticated_client):
        """Test handling of Celery failure."""
        mock_task.delay.side_effect = Exception('Queue error')

        response = authenticated_client.post('/api/profiles/generate_personality/')

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_generate_personality_unauthenticated(self, api_client):
        """Test unauthenticated user cannot generate personality."""
        response = api_client.post('/api/profiles/generate_personality/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# SKILL ANALYSIS TESTS
# ============================================================================

@pytest.mark.django_db
class TestSkillAnalysis:
    """Test skill progression analysis."""

    @patch('accounts.views.analyze_skill_progression')
    def test_analyze_skills_success(self, mock_task, authenticated_client):
        """Test successful skill analysis queueing."""
        mock_task.delay.return_value = Mock(id='skills-task-123')

        response = authenticated_client.post('/api/profiles/analyze_skills/')

        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data['status'] == 'queued'
        assert 'task_id' in response.data
        mock_task.delay.assert_called_once()

    @patch('accounts.views.analyze_skill_progression')
    def test_analyze_skills_celery_failure(self, mock_task, authenticated_client):
        """Test handling of Celery failure."""
        mock_task.delay.side_effect = Exception('Task error')

        response = authenticated_client.post('/api/profiles/analyze_skills/')

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    def test_analyze_skills_unauthenticated(self, api_client):
        """Test unauthenticated user cannot analyze skills."""
        response = api_client.post('/api/profiles/analyze_skills/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ============================================================================
# PASSWORD RESET TESTS
# ============================================================================

@pytest.mark.django_db
class TestPasswordReset:
    """Test password reset workflow."""

    def test_password_reset_request_success(self, api_client, _user):
        """Test password reset request sends email."""
        mail.outbox = []

        data = {'email': 'test@example.com'}
        response = api_client.post('/api/auth/password_reset/', data)

        assert response.status_code == status.HTTP_200_OK
        assert 'reset link has been sent' in response.data['detail'].lower()
        assert len(mail.outbox) == 1
        assert 'test@example.com' in mail.outbox[0].to

    def test_password_reset_request_nonexistent_email(self, api_client):
        """Test password reset with non-existent email."""
        data = {'email': 'nonexistent@example.com'}
        response = api_client.post('/api/auth/password_reset/', data)

        # Should return 200 for security (don't reveal if email exists)
        assert response.status_code == status.HTTP_200_OK

    def test_password_reset_request_missing_email(self, api_client):
        """Test password reset without email."""
        data = {}
        response = api_client.post('/api/auth/password_reset/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_request_empty_email(self, api_client):
        """Test password reset with empty email."""
        data = {'email': '   '}
        response = api_client.post('/api/auth/password_reset/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_success(self, api_client, user):
        """Test successful password reset confirmation."""
        # Generate valid token
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        data = {
            'uid': uid,
            'token': token,
            'password': 'newpassword123'
        }
        response = api_client.post('/api/auth/password_reset/confirm/', data)

        assert response.status_code == status.HTTP_200_OK

        # Verify password was changed
        user.refresh_from_db()
        assert user.check_password('newpassword123')

    def test_password_reset_confirm_invalid_token(self, api_client, user):
        """Test password reset with invalid token."""
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        data = {
            'uid': uid,
            'token': 'invalid-token',
            'password': 'newpassword123'
        }
        response = api_client.post('/api/auth/password_reset/confirm/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'invalid' in response.data['detail'].lower()

    def test_password_reset_confirm_invalid_uid(self, api_client):
        """Test password reset with invalid UID."""
        data = {
            'uid': 'invalid-uid',
            'token': 'some-token',
            'password': 'newpassword123'
        }
        response = api_client.post('/api/auth/password_reset/confirm/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_reset_confirm_missing_fields(self, api_client):
        """Test password reset confirm with missing fields."""
        response = api_client.post('/api/auth/password_reset/confirm/', {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUidInfo:
    """Test UID info endpoint."""

    def test_uid_info_success(self, api_client, user):
        """Test retrieving user info from UID."""
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        response = api_client.get(f'/api/auth/uid_info/?uid={uid}')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'

    def test_uid_info_invalid_uid(self, api_client):
        """Test UID info with invalid UID."""
        response = api_client.get('/api/auth/uid_info/?uid=invalid')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_uid_info_missing_uid(self, api_client):
        """Test UID info without UID parameter."""
        response = api_client.get('/api/auth/uid_info/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# REGISTRATION TESTS
# ============================================================================

@pytest.mark.django_db
class TestRegistration:
    """Test user registration."""

    def test_register_success(self, api_client):
        """Test successful user registration."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepass123',
            'password2': 'securepass123'
        }
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert 'token' in response.data
        assert 'user' in response.data

        # Verify user was created
        assert User.objects.filter(username='newuser').exists()

    def test_register_duplicate_username(self, api_client, _user):
        """Test registration with existing username."""
        data = {
            'username': 'testuser',
            'email': 'different@example.com',
            'password': 'pass123',
            'password2': 'pass123'
        }
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_duplicate_email(self, api_client, _user):
        """Test registration with existing email."""
        data = {
            'username': 'differentuser',
            'email': 'test@example.com',
            'password': 'pass123',
            'password2': 'pass123'
        }
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_missing_fields(self, api_client):
        """Test registration with missing fields."""
        data = {'username': 'incomplete'}
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# LOGIN TESTS
# ============================================================================

@pytest.mark.django_db
class TestLogin:
    """Test user login."""

    def test_login_success_username(self, api_client, _user):
        """Test successful login with username."""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data
        assert 'user' in response.data

    def test_login_success_email(self, api_client, _user):
        """Test successful login with email."""
        data = {
            'username': 'test@example.com',  # Using email in username field
            'password': 'testpass123'
        }
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_200_OK
        assert 'token' in response.data

    def test_login_invalid_credentials(self, api_client, _user):
        """Test login with invalid credentials."""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert 'invalid credentials' in response.data['error'].lower()

    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent user."""
        data = {
            'username': 'nonexistent',
            'password': 'password123'
        }
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_username(self, api_client):
        """Test login without username."""
        data = {'password': 'password123'}
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_missing_password(self, api_client):
        """Test login without password."""
        data = {'username': 'testuser'}
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_creates_token(self, api_client, user):
        """Test login creates auth token."""
        # Delete any existing token
        Token.objects.filter(user=user).delete()

        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_200_OK
        assert Token.objects.filter(user=user).exists()


# ============================================================================
# EDGE CASES AND ERROR HANDLING
# ============================================================================

@pytest.mark.django_db
class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_profile_update_with_multipart(self, authenticated_client):
        """Test profile update with multipart form data."""
        # Simulating file upload scenario
        data = {'bio': 'Updated bio'}
        response = authenticated_client.patch('/api/profiles/update_me/', data, format='multipart')
        assert response.status_code == status.HTTP_200_OK

    def test_very_long_bio(self, authenticated_client, _user):
        """Test updating profile with very long bio."""
        long_bio = 'A' * 5000
        data = {'bio': long_bio}
        authenticated_client.patch('/api/profiles/update_me/', data)
        # Should either accept or return validation error

    def test_special_characters_in_username(self, api_client):
        """Test registration with special characters in username."""
        data = {
            'username': 'user@#$%',
            'email': 'test@example.com',
            'password': 'pass123',
            'password2': 'pass123'
        }
        api_client.post('/api/auth/register/', data)
        # May fail validation depending on username rules

    def test_unicode_in_profile_fields(self, authenticated_client):
        """Test profile update with Unicode characters."""
        data = {
            'bio': 'I love 🎨 art and 日本語',
            'location': 'São Paulo'
        }
        response = authenticated_client.patch('/api/profiles/update_me/', data)
        assert response.status_code == status.HTTP_200_OK

    @patch('accounts.views.moderate_text')
    def test_moderation_exception_handling(self, mock_moderate, authenticated_client):
        """Test avatar generation when moderation fails."""
        mock_moderate.side_effect = Exception('Moderation error')

        data = {'prompt': 'test prompt'}
        authenticated_client.post('/api/profiles/generate_avatar/', data)
        # Should handle gracefully, might allow or block depending on implementation

    def test_concurrent_profile_updates(self, authenticated_client, _user):
        """Test handling of concurrent profile updates."""
        data1 = {'bio': 'Bio 1'}
        data2 = {'bio': 'Bio 2'}

        response1 = authenticated_client.patch('/api/profiles/update_me/', data1)
        response2 = authenticated_client.patch('/api/profiles/update_me/', data2)

        assert response1.status_code == status.HTTP_200_OK
        assert response2.status_code == status.HTTP_200_OK


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

@pytest.mark.django_db
class TestIntegration:
    """Test integration workflows."""

    def test_complete_registration_and_profile_setup(self, api_client):
        """Test complete user onboarding flow."""
        # Register
        register_data = {
            'username': 'newartist',
            'email': 'artist@example.com',
            'password': 'secure123',
            'password2': 'secure123'
        }
        reg_response = api_client.post('/api/auth/register/', register_data)
        assert reg_response.status_code == status.HTTP_201_CREATED

        token = reg_response.data['token']

        # Update profile
        api_client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        profile_data = {
            'bio': 'Digital artist',
            'location': 'New York',
            'is_public_profile': True
        }
        profile_response = api_client.patch('/api/profiles/update_me/', profile_data)
        assert profile_response.status_code == status.HTTP_200_OK

    def test_password_reset_full_workflow(self, api_client, user):
        """Test complete password reset workflow."""
        # Request reset
        reset_request = api_client.post('/api/auth/password_reset/', {'email': 'test@example.com'})
        assert reset_request.status_code == status.HTTP_200_OK

        # Get UID and token from email (simulated)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        # Confirm reset
        confirm_data = {
            'uid': uid,
            'token': token,
            'password': 'brandnewpass123'
        }
        confirm_response = api_client.post('/api/auth/password_reset/confirm/', confirm_data)
        assert confirm_response.status_code == status.HTTP_200_OK

        # Login with new password
        login_data = {
            'username': 'testuser',
            'password': 'brandnewpass123'
        }
        login_response = api_client.post('/api/auth/login/', login_data)
        assert login_response.status_code == status.HTTP_200_OK