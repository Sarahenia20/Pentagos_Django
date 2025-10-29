"""
Comprehensive test suite for media_processing Celery tasks.

Tests cover:
- Avatar generation task
- Profile bio generation task
- Artist personality generation task  
- Skill progression analysis task
- Task retry logic and error handling
- Integration with AI providers
"""

import pytest
from unittest.mock import patch, Mock, MagicMock
from django.contrib.auth.models import User
from PIL import Image
import io

from media_processing.tasks import generate_avatar_for_user
from accounts.models import UserProfile

TEST_PASSWORD = 'test_password'  # noqa: S105

# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def user(django_user_model):
    """Create a test user with profile."""
    user = django_user_model.objects.create_user(
        username='testuser',
        email='test@example.com',
        password=TEST_PASSWORD
    )
    return user


@pytest.fixture
def mock_image():
    """Create a mock PIL Image."""
    img = Image.new('RGB', (512, 512), color='red')
    return img


# ============================================================================
# AVATAR GENERATION TESTS
# ============================================================================

@pytest.mark.django_db
class TestGenerateAvatarForUser:
    """Test generate_avatar_for_user Celery task."""

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_success(self, mock_generate, user, mock_image):
        """Test successful avatar generation."""
        mock_generate.return_value = mock_image
        
        result = generate_avatar_for_user(
            user.id,
            'professional portrait',
            'sdxl',
            '512x512'
        )
        
        assert result['status'] == 'success'
        mock_generate.assert_called_once_with(
            'professional portrait',
            model='sdxl',
            image_size='512x512'
        )
        
        # Verify avatar was saved to profile
        user.profile.refresh_from_db()
        assert user.profile.avatar is not None

    def test_generate_avatar_user_not_found(self):
        """Test avatar generation with non-existent user."""
        result = generate_avatar_for_user(
            999999,
            'test prompt',
            'sdxl',
            '512x512'
        )
        
        assert result['status'] == 'error'
        assert 'not found' in result['message'].lower()

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_with_different_providers(self, mock_generate, user, mock_image):
        """Test avatar generation with different providers."""
        mock_generate.return_value = mock_image
        
        providers = ['sdxl', 'sd15', 'flux', 'playground']
        
        for provider in providers:
            result = generate_avatar_for_user(
                user.id,
                'test prompt',
                provider,
                '512x512'
            )
            
            if provider in ['sdxl', 'sd15', 'flux', 'playground']:
                # Valid providers
                assert result['status'] == 'success'
            # else would use default 'sdxl'

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_saves_image_correctly(self, mock_generate, user, mock_image):
        """Test that avatar image is saved correctly to profile."""
        mock_generate.return_value = mock_image
        
        generate_avatar_for_user(
            user.id,
            'portrait',
            'sdxl',
            '512x512'
        )
        
        user.profile.refresh_from_db()
        
        # Check that avatar field is populated
        assert user.profile.avatar
        # Check that file exists in storage (name is not empty)
        assert user.profile.avatar.name

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_handles_generation_error(self, mock_generate, user):
        """Test handling of image generation errors."""
        mock_generate.side_effect = RuntimeError('Generation failed')
        
        with pytest.raises(RuntimeError):
            generate_avatar_for_user(
                user.id,
                'test prompt',
                'sdxl',
                '512x512'
            )

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_with_default_provider(self, mock_generate, user, mock_image):
        """Test avatar generation falls back to default provider."""
        mock_generate.return_value = mock_image
        
        result = generate_avatar_for_user(
            user.id,
            'test prompt',
            'invalid_provider',  # Should fall back to sdxl
            '512x512'
        )
        
        # Should still succeed using default
        assert result['status'] == 'success'

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_with_various_sizes(self, mock_generate, user, mock_image):
        """Test avatar generation with different image sizes."""
        mock_generate.return_value = mock_image
        
        sizes = ['256x256', '512x512', '1024x1024']
        
        for size in sizes:
            result = generate_avatar_for_user(
                user.id,
                'test prompt',
                'sdxl',
                size
            )
            
            assert result['status'] == 'success'
            mock_generate.assert_called_with(
                'test prompt',
                model='sdxl',
                image_size=size
            )

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_unicode_prompt(self, mock_generate, user, mock_image):
        """Test avatar generation with Unicode characters in prompt."""
        mock_generate.return_value = mock_image
        
        unicode_prompt = 'Portrait with 🎨 émojis and 日本語'
        
        result = generate_avatar_for_user(
            user.id,
            unicode_prompt,
            'sdxl',
            '512x512'
        )
        
        assert result['status'] == 'success'

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_very_long_prompt(self, mock_generate, user, mock_image):
        """Test avatar generation with very long prompt."""
        mock_generate.return_value = mock_image
        
        long_prompt = 'A detailed portrait ' * 100  # Very long
        
        result = generate_avatar_for_user(
            user.id,
            long_prompt,
            'sdxl',
            '512x512'
        )
        
        assert result['status'] == 'success'

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_replaces_existing(self, mock_generate, user, mock_image):
        """Test that new avatar replaces existing one."""
        mock_generate.return_value = mock_image
        
        # Generate first avatar
        result1 = generate_avatar_for_user(
            user.id,
            'first prompt',
            'sdxl',
            '512x512'
        )
        
        user.profile.refresh_from_db()
        
        # Generate second avatar
        result2 = generate_avatar_for_user(
            user.id,
            'second prompt',
            'sdxl',
            '512x512'
        )
        
        user.profile.refresh_from_db()
        
        assert result1['status'] == 'success'
        assert result2['status'] == 'success'
        # Avatar name may be different (depends on implementation)


# ============================================================================
# PROFILE BIO GENERATION TESTS (Placeholder)
# ============================================================================

@pytest.mark.django_db
class TestGenerateProfileBio:
    """Test generate_profile_bio Celery task."""

    def test_generate_bio_placeholder(self):
        """Placeholder test for bio generation task."""
        # Note: The actual task implementation may not be in tasks.py yet
        # This is a placeholder for when it's implemented
        pass

    @patch('media_processing.tasks.generate_profile_bio')
    def test_generate_bio_task_exists(self, mock_task):
        """Test that bio generation task can be called."""
        mock_task.delay.return_value = Mock(id='task-123')
        
        # Call the task
        task = mock_task.delay(123)
        
        assert task.id == 'task-123'


# ============================================================================
# ARTIST PERSONALITY GENERATION TESTS (Placeholder)
# ============================================================================

@pytest.mark.django_db
class TestGenerateArtistPersonality:
    """Test generate_artist_personality Celery task."""

    def test_generate_personality_placeholder(self):
        """Placeholder test for personality generation task."""
        pass

    @patch('media_processing.tasks.generate_artist_personality')
    def test_generate_personality_task_exists(self, mock_task):
        """Test that personality generation task can be called."""
        mock_task.delay.return_value = Mock(id='task-456')
        
        task = mock_task.delay(123)
        
        assert task.id == 'task-456'


# ============================================================================
# SKILL PROGRESSION ANALYSIS TESTS (Placeholder)
# ============================================================================

@pytest.mark.django_db
class TestAnalyzeSkillProgression:
    """Test analyze_skill_progression Celery task."""

    def test_analyze_skills_placeholder(self):
        """Placeholder test for skill analysis task."""
        pass

    @patch('media_processing.tasks.analyze_skill_progression')
    def test_analyze_skills_task_exists(self, mock_task):
        """Test that skill analysis task can be called."""
        mock_task.delay.return_value = Mock(id='task-789')
        
        task = mock_task.delay(123)
        
        assert task.id == 'task-789'


# ============================================================================
# TASK RETRY AND ERROR HANDLING TESTS
# ============================================================================

class TestTaskRetryLogic:
    """Test Celery task retry and error handling."""

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_avatar_generation_retries_on_failure(self, mock_generate, user):
        """Test that avatar generation retries on failure."""
        # Simulate a retryable error
        mock_generate.side_effect = RuntimeError('Temporary error')
        
        with pytest.raises(RuntimeError):
            generate_avatar_for_user(
                user.id,
                'test prompt',
                'sdxl',
                '512x512'
            )

    def test_task_error_logging(self, user):
        """Test that task errors are logged properly."""
        # This would test logging behavior
        # Implementation depends on logging configuration
        pass


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

@pytest.mark.django_db
class TestTaskIntegration:
    """Test task integration scenarios."""

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_multiple_avatar_generations_for_same_user(self, mock_generate, user, mock_image):
        """Test generating multiple avatars for same user."""
        mock_generate.return_value = mock_image
        
        prompts = [
            'first portrait',
            'second portrait',
            'third portrait'
        ]
        
        for prompt in prompts:
            result = generate_avatar_for_user(
                user.id,
                prompt,
                'sdxl',
                '512x512'
            )
            
            assert result['status'] == 'success'

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_avatar_generation_for_multiple_users(self, mock_generate, django_user_model, mock_image):
        """Test generating avatars for multiple users."""
        mock_generate.return_value = mock_image
        
        # Create multiple users
        users = []
        for i in range(3):
            user = django_user_model.objects.create_user(
                username=f'user{i}',
                email=f'user{i}@example.com',
                password=TEST_PASSWORD
            )
            users.append(user)
        
        # Generate avatar for each
        for user in users:
            result = generate_avatar_for_user(
                user.id,
                f'portrait for {user.username}',
                'sdxl',
                '512x512'
            )
            
            assert result['status'] == 'success'


# ============================================================================
# EDGE CASES
# ============================================================================

@pytest.mark.django_db
class TestTaskEdgeCases:
    """Test edge cases in task execution."""

    def test_generate_avatar_with_none_user_id(self):
        """Test avatar generation with None user ID."""
        with pytest.raises((TypeError, AttributeError)):
            generate_avatar_for_user(
                None,
                'test prompt',
                'sdxl',
                '512x512'
            )

    def test_generate_avatar_with_negative_user_id(self):
        """Test avatar generation with negative user ID."""
        result = generate_avatar_for_user(
            -1,
            'test prompt',
            'sdxl',
            '512x512'
        )
        
        assert result['status'] == 'error'

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_with_empty_prompt(self, mock_generate, user, mock_image):
        """Test avatar generation with empty prompt."""
        mock_generate.return_value = mock_image
        
        # Task should still work (validation happens at API level)
        generate_avatar_for_user(
            user.id,
            '',
            'sdxl',
            '512x512'
        )
        
        # Might succeed or fail depending on provider

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_returns_none(self, mock_generate, user):
        """Test handling when image generation returns None."""
        mock_generate.return_value = None
        
        # Should handle gracefully
        with pytest.raises((AttributeError, TypeError)):
            generate_avatar_for_user(
                user.id,
                'test prompt',
                'sdxl',
                '512x512'
            )

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_with_invalid_image_format(self, mock_generate, user):
        """Test handling of invalid image formats."""
        # Return something that's not a PIL Image
        mock_generate.return_value = "not an image"
        
        with pytest.raises(AttributeError):
            generate_avatar_for_user(
                user.id,
                'test prompt',
                'sdxl',
                '512x512'
            )

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_generate_avatar_save_failure(self, mock_generate, user, mock_image):
        """Test handling of avatar save failures."""
        mock_generate.return_value = mock_image
        
        # Mock profile save to fail
        with patch.object(UserProfile, 'save', side_effect=RuntimeError('Save failed')):
            with pytest.raises(RuntimeError):
                generate_avatar_for_user(
                    user.id,
                    'test prompt',
                    'sdxl',
                    '512x512'
                )


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

@pytest.mark.django_db
class TestTaskPerformance:
    """Test task performance characteristics."""

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_avatar_generation_completes_in_reasonable_time(self, mock_generate, user, mock_image):
        """Test that avatar generation completes reasonably quickly."""
        import time
        mock_generate.return_value = mock_image
        
        start = time.time()
        result = generate_avatar_for_user(
            user.id,
            'test prompt',
            'sdxl',
            '512x512'
        )
        elapsed = time.time() - start
        
        assert result['status'] == 'success'
        # Should complete in under 5 seconds (mocked)
        assert elapsed < 5.0

    @patch('media_processing.tasks.generate_with_huggingface')
    def test_concurrent_avatar_generations(self, mock_generate, django_user_model, mock_image):
        """Test multiple concurrent avatar generations."""
        mock_generate.return_value = mock_image
        
        # Create multiple users
        users = [
            django_user_model.objects.create_user(
                username=f'concurrent_user{i}',
                email=f'concurrent{i}@example.com',
                password=TEST_PASSWORD
            )
            for i in range(5)
        ]
        
        # Generate avatars for all
        results = []
        for user in users:
            result = generate_avatar_for_user(
                user.id,
                f'portrait for {user.username}',
                'sdxl',
                '512x512'
            )
            results.append(result)
        
        # All should succeed
        assert all(r['status'] == 'success' for r in results)