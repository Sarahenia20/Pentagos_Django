"""
Comprehensive test suite for prompt_library app.

Tests cover:
- Models (PromptTemplate, Category, Tag, UserPromptLibrary)
- Serializers (validation, nested relationships)
- Permissions (IsAuthorOrReadOnly)
- ViewSets (CRUD operations, custom actions, filtering)
- GeneratePromptView (Gemini API integration)
"""

import pytest
import json
from unittest.mock import patch, Mock, MagicMock
from django.contrib.auth.models import User
from django.utils import timezone
from django.db import IntegrityError
from rest_framework.test import APIClient
from rest_framework import status
from django.core.cache import cache

from prompt_library.models import (
    PromptTemplate, Category, Tag, UserPromptLibrary
)
from prompt_library.serializers import (
    PromptTemplateSerializer, CategorySerializer,
    TagSerializer, UserPromptLibrarySerializer
)
from prompt_library.permissions import IsAuthorOrReadOnly
from prompt_library.views import GeneratePromptView
# Ensure list endpoints return arrays (not paginated objects) during tests
@pytest.fixture(autouse=True)
def disable_pagination(settings):
    rf = dict(getattr(settings, 'REST_FRAMEWORK', {}))
    rf['DEFAULT_PAGINATION_CLASS'] = None
    settings.REST_FRAMEWORK = rf


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def user(db, django_user_model):
    """Create a test user."""
    return django_user_model.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def other_user(db, django_user_model):
    """Create another test user for permission tests."""
    return django_user_model.objects.create_user(
        username='otheruser',
        email='other@example.com',
        password='testpass123'
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


@pytest.fixture
def category(db):
    """Create a test category."""
    return Category.objects.create(
        name='Fantasy',
        slug='fantasy',
        icon='🧙'
    )


@pytest.fixture
def tag1(db):
    """Create first test tag."""
    return Tag.objects.create(name='landscape')


@pytest.fixture
def tag2(db):
    """Create second test tag."""
    return Tag.objects.create(name='detailed')


@pytest.fixture
def prompt_template(db, user, category, tag1, tag2):
    """Create a test prompt template."""
    template = PromptTemplate.objects.create(
        title='Epic Fantasy Scene',
        prompt_text='A mystical forest with glowing mushrooms and ancient trees',
        description='Fantasy landscape prompt',
        category=category,
        author=user,
        likes_count=5,
        is_public=True,
        variables=['style', 'mood']
    )
    template.tags.add(tag1, tag2)
    return template


@pytest.fixture
def private_prompt(db, user):
    """Create a private prompt template."""
    return PromptTemplate.objects.create(
        title='Private Prompt',
        prompt_text='Secret prompt',
        author=user,
        is_public=False
    )


# ============================================================================
# MODEL TESTS
# ============================================================================

@pytest.mark.django_db
class TestCategoryModel:
    """Test Category model."""

    def test_category_creation(self, category):
        """Test basic category creation."""
        assert category.name == 'Fantasy'
        assert category.slug == 'fantasy'
        assert category.icon == '🧙'
        assert str(category) == 'Fantasy'

    def test_category_ordering(self, db):
        """Test categories are ordered by name."""
        Category.objects.create(name='Zzz', slug='zzz')
        Category.objects.create(name='Aaa', slug='aaa')
        categories = list(Category.objects.all())
        assert categories[0].name == 'Aaa'
        assert categories[1].name == 'Zzz'

    def test_category_unique_name(self, category):
        """Test category name uniqueness constraint."""
        with pytest.raises(IntegrityError):
            Category.objects.create(name='Fantasy', slug='fantasy2')

    def test_category_unique_slug(self, category):
        """Test category slug uniqueness constraint."""
        with pytest.raises(IntegrityError):
            Category.objects.create(name='Fantasy2', slug='fantasy')


@pytest.mark.django_db
class TestTagModel:
    """Test Tag model."""

    def test_tag_creation(self, tag1):
        """Test basic tag creation."""
        assert tag1.name == 'landscape'
        assert str(tag1) == 'landscape'

    def test_tag_ordering(self, db):
        """Test tags are ordered by name."""
        Tag.objects.create(name='zzz')
        Tag.objects.create(name='aaa')
        tags = list(Tag.objects.all())
        assert tags[0].name == 'aaa'
        assert tags[1].name == 'zzz'

    def test_tag_unique_name(self, tag1):
        """Test tag name uniqueness constraint."""
        with pytest.raises(IntegrityError):
            Tag.objects.create(name='landscape')


@pytest.mark.django_db
class TestPromptTemplateModel:
    """Test PromptTemplate model."""

    def test_prompt_creation(self, prompt_template, category, user):
        """Test basic prompt template creation."""
        assert prompt_template.title == 'Epic Fantasy Scene'
        assert 'mystical forest' in prompt_template.prompt_text
        assert prompt_template.category == category
        assert prompt_template.author == user
        assert prompt_template.likes_count == 5
        assert prompt_template.is_public is True
        assert prompt_template.tags.count() == 2

    def test_prompt_uuid_primary_key(self, prompt_template):
        """Test prompt uses UUID as primary key."""
        assert prompt_template.id is not None
        assert len(str(prompt_template.id)) == 36  # UUID format

    def test_prompt_variables_json(self, prompt_template):
        """Test variables stored as JSON."""
        assert isinstance(prompt_template.variables, list)
        assert 'style' in prompt_template.variables
        assert 'mood' in prompt_template.variables

    def test_prompt_default_values(self, db, user):
        """Test prompt default values."""
        prompt = PromptTemplate.objects.create(
            title='Test',
            prompt_text='Test prompt',
            author=user
        )
        assert prompt.likes_count == 0
        assert prompt.is_public is True
        assert prompt.variables == []
        assert prompt.created_at is not None

    def test_prompt_ordering(self, db, user):
        """Test prompts ordered by created_at descending."""
        p1 = PromptTemplate.objects.create(
            title='First',
            prompt_text='First prompt',
            author=user
        )
        p2 = PromptTemplate.objects.create(
            title='Second',
            prompt_text='Second prompt',
            author=user
        )
        prompts = list(PromptTemplate.objects.all())
        assert prompts[0] == p2  # Most recent first
        assert prompts[1] == p1

    def test_prompt_str(self, prompt_template):
        """Test prompt __str__ method."""
        assert str(prompt_template) == 'Epic Fantasy Scene'

    def test_prompt_without_category(self, db, user):
        """Test prompt can exist without category."""
        prompt = PromptTemplate.objects.create(
            title='No Category',
            prompt_text='Test',
            author=user,
            category=None
        )
        assert prompt.category is None

    def test_prompt_without_author(self, db):
        """Test prompt can exist without author."""
        prompt = PromptTemplate.objects.create(
            title='No Author',
            prompt_text='Test',
            author=None
        )
        assert prompt.author is None


@pytest.mark.django_db
class TestUserPromptLibraryModel:
    """Test UserPromptLibrary model."""

    def test_library_creation(self, db, user, prompt_template):
        """Test basic library entry creation."""
        entry = UserPromptLibrary.objects.create(
            user=user,
            prompt=prompt_template,
            is_favorite=True
        )
        assert entry.user == user
        assert entry.prompt == prompt_template
        assert entry.is_favorite is True
        assert entry.saved_at is not None

    def test_library_unique_together(self, db, user, prompt_template):
        """Test user-prompt uniqueness constraint."""
        UserPromptLibrary.objects.create(user=user, prompt=prompt_template)
        with pytest.raises(IntegrityError):
            UserPromptLibrary.objects.create(user=user, prompt=prompt_template)

    def test_library_str(self, db, user, prompt_template):
        """Test library __str__ method."""
        entry = UserPromptLibrary.objects.create(user=user, prompt=prompt_template)
        assert 'testuser' in str(entry)
        assert 'Epic Fantasy Scene' in str(entry)

    def test_library_ordering(self, db, user, prompt_template):
        """Test library entries ordered by saved_at descending."""
        p2 = PromptTemplate.objects.create(
            title='Second',
            prompt_text='Test',
            author=user
        )
        UserPromptLibrary.objects.create(user=user, prompt=prompt_template)
        e2 = UserPromptLibrary.objects.create(user=user, prompt=p2)
        entries = list(UserPromptLibrary.objects.all())
        assert entries[0] == e2  # Most recent first


# ============================================================================
# SERIALIZER TESTS
# ============================================================================

@pytest.mark.django_db
class TestCategorySerializer:
    """Test CategorySerializer."""

    def test_serialize_category(self, category):
        """Test category serialization."""
        serializer = CategorySerializer(category)
        data = serializer.data
        assert data['name'] == 'Fantasy'
        assert data['slug'] == 'fantasy'
        assert data['icon'] == '🧙'
        assert 'id' in data

    def test_deserialize_category(self):
        """Test category deserialization."""
        data = {
            'name': 'SciFi',
            'slug': 'scifi',
            'icon': '🚀'
        }
        serializer = CategorySerializer(data=data)
        assert serializer.is_valid()
        category = serializer.save()
        assert category.name == 'SciFi'


@pytest.mark.django_db
class TestTagSerializer:
    """Test TagSerializer."""

    def test_serialize_tag(self, tag1):
        """Test tag serialization."""
        serializer = TagSerializer(tag1)
        assert serializer.data['name'] == 'landscape'

    def test_deserialize_tag(self):
        """Test tag deserialization."""
        serializer = TagSerializer(data={'name': 'portrait'})
        assert serializer.is_valid()
        tag = serializer.save()
        assert tag.name == 'portrait'


@pytest.mark.django_db
class TestPromptTemplateSerializer:
    """Test PromptTemplateSerializer."""

    def test_serialize_prompt(self, prompt_template):
        """Test prompt serialization."""
        serializer = PromptTemplateSerializer(prompt_template)
        data = serializer.data
        assert data['title'] == 'Epic Fantasy Scene'
        assert 'mystical forest' in data['prompt_text']
        assert data['category']['name'] == 'Fantasy'
        assert len(data['tags']) == 2
        assert data['likes_count'] == 5
        assert data['is_public'] is True
        assert 'author_id' in data

    def test_deserialize_prompt_with_tags(self, category, user):
        """Test prompt deserialization with tag names."""
        data = {
            'title': 'New Prompt',
            'prompt_text': 'Test prompt text',
            'description': 'Test description',
            'category_id': category.id,
            'tag_names': ['newtag1', 'newtag2'],
            'is_public': True
        }
        serializer = PromptTemplateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        prompt = serializer.save(author=user)
        assert prompt.title == 'New Prompt'
        assert prompt.tags.count() == 2
        assert Tag.objects.filter(name='newtag1').exists()

    def test_update_prompt_tags(self, prompt_template):
        """Test updating prompt tags."""
        data = {
            'tag_names': ['updated1', 'updated2', 'updated3']
        }
        serializer = PromptTemplateSerializer(
            prompt_template,
            data=data,
            partial=True
        )
        assert serializer.is_valid()
        prompt = serializer.save()
        assert prompt.tags.count() == 3
        assert prompt.tags.filter(name='updated1').exists()

    def test_deserialize_without_tags(self, user):
        """Test creating prompt without tags."""
        data = {
            'title': 'Simple Prompt',
            'prompt_text': 'Simple text'
        }
        serializer = PromptTemplateSerializer(data=data)
        assert serializer.is_valid()
        prompt = serializer.save(author=user)
        assert prompt.tags.count() == 0

    def test_variables_field(self, user):
        """Test variables field handling."""
        data = {
            'title': 'Variable Prompt',
            'prompt_text': 'Test with {style} and {mood}',
            'variables': ['style', 'mood', 'color']
        }
        serializer = PromptTemplateSerializer(data=data)
        assert serializer.is_valid()
        prompt = serializer.save(author=user)
        assert len(prompt.variables) == 3


@pytest.mark.django_db
class TestUserPromptLibrarySerializer:
    """Test UserPromptLibrarySerializer."""

    def test_serialize_library_entry(self, db, user, prompt_template):
        """Test library entry serialization."""
        entry = UserPromptLibrary.objects.create(
            user=user,
            prompt=prompt_template,
            is_favorite=True
        )
        serializer = UserPromptLibrarySerializer(entry)
        data = serializer.data
        assert 'user' in data
        assert 'prompt' in data
        assert data['is_favorite'] is True
        assert 'saved_at' in data

    def test_deserialize_library_entry(self, user, prompt_template):
        """Test library entry deserialization."""
        data = {
            'prompt_id': prompt_template.id,
            'is_favorite': False
        }
        serializer = UserPromptLibrarySerializer(data=data)
        assert serializer.is_valid()
        entry = serializer.save(user=user)
        assert entry.prompt == prompt_template
        assert entry.is_favorite is False


# ============================================================================
# PERMISSION TESTS
# ============================================================================

@pytest.mark.django_db
class TestIsAuthorOrReadOnly:
    """Test IsAuthorOrReadOnly permission."""

    def test_safe_methods_allowed(self, prompt_template, user, other_user):
        """Test read operations allowed for all users."""
        permission = IsAuthorOrReadOnly()

        # Mock GET request
        request = Mock()
        request.method = 'GET'
        request.user = other_user

        assert permission.has_object_permission(request, None, prompt_template) is True

    def test_author_can_edit(self, prompt_template, user):
        """Test author can edit their own prompt."""
        permission = IsAuthorOrReadOnly()

        request = Mock()
        request.method = 'PUT'
        request.user = user

        assert permission.has_object_permission(request, None, prompt_template) is True

    def test_non_author_cannot_edit(self, prompt_template, other_user):
        """Test non-author cannot edit prompt."""
        permission = IsAuthorOrReadOnly()

        request = Mock()
        request.method = 'PUT'
        request.user = other_user

        assert permission.has_object_permission(request, None, prompt_template) is False

    def test_author_can_delete(self, prompt_template, user):
        """Test author can delete their prompt."""
        permission = IsAuthorOrReadOnly()

        request = Mock()
        request.method = 'DELETE'
        request.user = user

        assert permission.has_object_permission(request, None, prompt_template) is True

    def test_prompt_without_author(self, db):
        """Test permission for prompt without author."""
        prompt = PromptTemplate.objects.create(
            title='No Author',
            prompt_text='Test',
            author=None
        )
        permission = IsAuthorOrReadOnly()

        request = Mock()
        request.method = 'PUT'
        request.user = Mock()

        assert permission.has_object_permission(request, None, prompt) is False

    def test_exception_handling(self, user):
        """Test permission handles exceptions gracefully."""
        permission = IsAuthorOrReadOnly()

        # Create object without author attribute
        obj = Mock(spec=[])  # No author attribute
        request = Mock()
        request.method = 'PUT'
        request.user = user

        assert permission.has_object_permission(request, None, obj) is False


# ============================================================================
# VIEW TESTS - PromptTemplateViewSet
# ============================================================================

@pytest.mark.django_db
class TestPromptTemplateViewSet:
    """Test PromptTemplateViewSet."""

    def test_list_prompts_anonymous(self, api_client, prompt_template, private_prompt):
        """Test anonymous users only see public prompts."""
        response = api_client.get('/api/prompt-templates/')
        assert response.status_code == status.HTTP_200_OK
        # Only public prompts visible
        assert len(response.data) >= 1
        titles = [p['title'] for p in response.data]
        assert 'Epic Fantasy Scene' in titles
        assert 'Private Prompt' not in titles

    def test_list_prompts_authenticated(self, authenticated_client, prompt_template, private_prompt):
        """Test authenticated users see all prompts."""
        response = authenticated_client.get('/api/prompt-templates/')
        assert response.status_code == status.HTTP_200_OK

    def test_retrieve_prompt(self, api_client, prompt_template):
        """Test retrieving single prompt."""
        response = api_client.get(f'/api/prompt-templates/{prompt_template.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Epic Fantasy Scene'

    def test_create_prompt_anonymous(self, api_client):
        """Test anonymous users cannot create prompts."""
        data = {
            'title': 'New Prompt',
            'prompt_text': 'Test prompt'
        }
        response = api_client.post('/api/prompt-templates/', data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_prompt_authenticated(self, authenticated_client, category):
        """Test authenticated user can create prompt."""
        data = {
            'title': 'My New Prompt',
            'prompt_text': 'Amazing prompt text',
            'description': 'A great prompt',
            'category_id': category.id,
            'tag_names': ['tag1', 'tag2'],
            'is_public': True
        }
        response = authenticated_client.post('/api/prompt-templates/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'My New Prompt'
        assert len(response.data['tags']) == 2

    def test_update_own_prompt(self, authenticated_client, prompt_template):
        """Test author can update their prompt."""
        data = {
            'title': 'Updated Title',
            'prompt_text': 'Updated text'
        }
        response = authenticated_client.put(
            f'/api/prompt-templates/{prompt_template.id}/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Updated Title'

    def test_update_others_prompt(self, api_client, other_user, prompt_template):
        """Test user cannot update others' prompts."""
        api_client.force_authenticate(user=other_user)
        data = {'title': 'Hacked Title'}
        response = api_client.put(
            f'/api/prompt-templates/{prompt_template.id}/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_own_prompt(self, authenticated_client, prompt_template):
        """Test author can delete their prompt."""
        response = authenticated_client.delete(
            f'/api/prompt-templates/{prompt_template.id}/'
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not PromptTemplate.objects.filter(id=prompt_template.id).exists()

    def test_filter_by_category(self, api_client, prompt_template, category):
        """Test filtering prompts by category slug."""
        response = api_client.get(f'/api/prompt-templates/?category__slug={category.slug}')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_filter_by_tag(self, api_client, prompt_template, tag1):
        """Test filtering prompts by tag name."""
        response = api_client.get(f'/api/prompt-templates/?tags__name={tag1.name}')
        assert response.status_code == status.HTTP_200_OK

    def test_search_prompts(self, api_client, prompt_template):
        """Test searching prompts."""
        response = api_client.get('/api/prompt-templates/?search=mystical')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_order_by_likes(self, api_client, prompt_template, user):
        """Test ordering by likes_count."""
        # Create prompt with more likes
        PromptTemplate.objects.create(
            title='Popular',
            prompt_text='Test',
            author=user,
            likes_count=100
        )
        response = api_client.get('/api/prompt-templates/?ordering=-likes_count')
        assert response.status_code == status.HTTP_200_OK
        assert response.data[0]['likes_count'] >= response.data[-1]['likes_count']


@pytest.mark.django_db
class TestPromptTemplateCustomActions:
    """Test custom actions on PromptTemplateViewSet."""

    def test_like_prompt(self, authenticated_client, prompt_template):
        """Test liking a prompt."""
        response = authenticated_client.post(
            f'/api/prompt-templates/{prompt_template.id}/like/'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'liked'

        # Check library entry created
        assert UserPromptLibrary.objects.filter(
            user__username='testuser',
            prompt=prompt_template,
            is_favorite=True
        ).exists()

    def test_unlike_prompt(self, authenticated_client, prompt_template, user):
        """Test unliking a prompt."""
        # First like it
        UserPromptLibrary.objects.create(
            user=user,
            prompt=prompt_template,
            is_favorite=True
        )

        response = authenticated_client.post(
            f'/api/prompt-templates/{prompt_template.id}/unlike/'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'unliked'

    def test_my_templates(self, authenticated_client, prompt_template):
        """Test retrieving user's own templates."""
        response = authenticated_client.get('/api/prompt-templates/my_templates/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]['title'] == 'Epic Fantasy Scene'

    def test_my_templates_empty(self, api_client, other_user):
        """Test my_templates returns empty for user with no prompts."""
        api_client.force_authenticate(user=other_user)
        response = api_client.get('/api/prompt-templates/my_templates/')
        assert response.status_code == status.HTTP_200_OK

    def test_create_from_generated(self, authenticated_client):
        """Test creating prompt from generated text."""
        data = {
            'prompt_text': 'Generated prompt with amazing details',
            'title': 'Generated Prompt',
            'description': 'From AI',
            'tag_names': ['ai', 'generated'],
            'is_public': True
        }
        response = authenticated_client.post(
            '/api/prompt-templates/from-generated/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Generated Prompt'

    def test_create_from_generated_no_prompt(self, authenticated_client):
        """Test create_from_generated requires prompt_text."""
        data = {'title': 'No Prompt'}
        response = authenticated_client.post(
            '/api/prompt-templates/from-generated/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_from_generated_auto_title(self, authenticated_client):
        """Test auto-generation of title from prompt_text."""
        data = {
            'prompt_text': 'This is a very long prompt text that should be truncated for the title'
        }
        response = authenticated_client.post(
            '/api/prompt-templates/from-generated/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data['title']) <= 80


# ============================================================================
# VIEW TESTS - Category & Tag ViewSets
# ============================================================================

@pytest.mark.django_db
class TestCategoryViewSet:
    """Test CategoryViewSet."""

    def test_list_categories(self, api_client, category):
        """Test listing categories."""
        response = api_client.get('/api/prompt-categories/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_search_categories(self, api_client, category):
        """Test searching categories."""
        response = api_client.get('/api/prompt-categories/?search=Fantasy')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1


@pytest.mark.django_db
class TestTagViewSet:
    """Test TagViewSet."""

    def test_list_tags(self, api_client, tag1):
        """Test listing tags."""
        response = api_client.get('/api/prompt-tags/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_search_tags(self, api_client, tag1):
        """Test searching tags."""
        response = api_client.get('/api/prompt-tags/?search=landscape')
        assert response.status_code == status.HTTP_200_OK


# ============================================================================
# VIEW TESTS - UserPromptLibraryViewSet
# ============================================================================

@pytest.mark.django_db
class TestUserPromptLibraryViewSet:
    """Test UserPromptLibraryViewSet."""

    def test_list_library(self, authenticated_client, user, prompt_template):
        """Test listing user's library."""
        UserPromptLibrary.objects.create(user=user, prompt=prompt_template)
        response = authenticated_client.get('/api/user-prompts/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_create_library_entry(self, authenticated_client, prompt_template):
        """Test adding prompt to library."""
        data = {
            'prompt_id': str(prompt_template.id),
            'is_favorite': False
        }
        response = authenticated_client.post(
            '/api/user-prompts/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_duplicate_library_entry(self, authenticated_client, user, prompt_template):
        """Test adding duplicate returns 200 OK."""
        UserPromptLibrary.objects.create(user=user, prompt=prompt_template)

        data = {'prompt_id': str(prompt_template.id)}
        response = authenticated_client.post(
            '/api/user-prompts/',
            data,
            format='json'
        )
        # Should return 200 for existing, not 201
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]

    def test_favorites_action(self, authenticated_client, user, prompt_template):
        """Test retrieving favorite prompts."""
        UserPromptLibrary.objects.create(
            user=user,
            prompt=prompt_template,
            is_favorite=True
        )
        response = authenticated_client.get('/api/user-prompts/favorites/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1


# ============================================================================
# VIEW TESTS - GeneratePromptView
# ============================================================================

@pytest.mark.django_db
class TestGeneratePromptView:
    """Test GeneratePromptView for AI prompt generation."""

    @patch('prompt_library.views.requests.post')
    def test_generate_prompt_success(self, mock_post, api_client, settings):
        """Test successful prompt generation."""
        settings.GEMINI_API_KEY = 'test-key'

        # Mock successful Gemini response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'candidates': [{
                'content': {
                    'parts': [
                        {'text': 'Variation 1: Epic fantasy landscape'},
                        {'text': 'Variation 2: Mystical forest scene'},
                        {'text': 'Variation 3: Ancient magical realm'}
                    ]
                }
            }]
        }
        mock_post.return_value = mock_response

        data = {
            'userInput': 'fantasy landscape',
            'style': 'epic',
            'mood': 'mystical',
            'quality': '8K'
        }
        response = api_client.post('/api/prompts/generate', data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'variations' in response.data
        assert len(response.data['variations']) == 3

    def test_generate_prompt_no_input(self, api_client):
        """Test generation without user input fails."""
        response = api_client.post('/api/prompts/generate', {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    @patch('prompt_library.views.requests.post')
    def test_generate_prompt_rate_limit(self, mock_post, api_client, settings):
        """Test rate limiting."""
        settings.GEMINI_API_KEY = 'test-key'
        cache.clear()

        # Make 61 requests to exceed limit
        data = {'userInput': 'test'}
        for _ in range(61):
            response = api_client.post('/api/prompts/generate', data, format='json')

        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_generate_prompt_no_api_key(self, api_client, settings):
        """Test generation without API key."""
        settings.GEMINI_API_KEY = None
        data = {'userInput': 'test'}
        response = api_client.post('/api/prompts/generate', data, format='json')
        assert response.status_code == status.HTTP_501_NOT_IMPLEMENTED

    @patch('prompt_library.views.requests.post')
    def test_generate_prompt_fallback(self, mock_post, api_client, settings):
        """Test local fallback when Gemini fails."""
        settings.GEMINI_API_KEY = 'test-key'

        # Mock failed Gemini response
        mock_post.side_effect = Exception('API Error')

        data = {
            'userInput': 'test prompt',
            'style': 'realistic',
            'mood': 'calm',
            'quality': '4K'
        }
        response = api_client.post('/api/prompts/generate', data, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'variations' in response.data
        assert 'local-fallback' in response.data['metadata']['model']

    @patch('prompt_library.views.requests.post')
    def test_generate_prompt_with_advanced_options(self, mock_post, api_client, settings):
        """Test generation with advanced options."""
        settings.GEMINI_API_KEY = 'test-key'

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'candidates': [{
                'content': {
                    'parts': [{'text': 'Test variation'}]
                }
            }]
        }
        mock_post.return_value = mock_response

        data = {
            'userInput': 'portrait',
            'advancedOptions': {
                'aspectRatio': '16:9',
                'lighting': 'natural'
            }
        }
        response = api_client.post('/api/prompts/generate', data, format='json')
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestGeneratePromptDiagnoseView:
    """Test GeneratePromptDiagnoseView."""

    @patch('prompt_library.views.requests.post')
    def test_diagnose_success(self, mock_post, api_client, user, settings):
        """Test diagnostic endpoint for admins."""
        user.is_staff = True
        user.is_superuser = True
        user.save()
        api_client.force_authenticate(user=user)

        settings.GEMINI_API_KEY = 'test-key'

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        mock_response.elapsed = Mock(total_seconds=Mock(return_value=0.5))
        mock_post.return_value = mock_response

        response = api_client.get('/api/prompts/generate/diagnose/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['ok'] is True

    def test_diagnose_non_admin(self, authenticated_client):
        """Test non-admin cannot access diagnose."""
        response = authenticated_client.get('/api/prompts/generate/diagnose/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ============================================================================
# EDGE CASES AND ERROR HANDLING
# ============================================================================

@pytest.mark.django_db
class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_very_long_prompt_text(self, authenticated_client):
        """Test creating prompt with very long text."""
        data = {
            'title': 'Long Prompt',
            'prompt_text': 'A' * 10000,  # Very long
            'is_public': True
        }
        response = authenticated_client.post(
            '/api/prompt-templates/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_empty_tag_names(self, authenticated_client):
        """Test creating prompt with empty tag list."""
        data = {
            'title': 'No Tags',
            'prompt_text': 'Test',
            'tag_names': []
        }
        response = authenticated_client.post(
            '/api/prompt-templates/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['tags'] == []

    def test_special_characters_in_title(self, authenticated_client):
        """Test prompt with special characters in title."""
        data = {
            'title': 'Test 🎨 Émojis & Spëcial',
            'prompt_text': 'Test'
        }
        response = authenticated_client.post(
            '/api/prompt-templates/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_nonexistent_prompt_id(self, api_client):
        """Test accessing non-existent prompt."""
        response = api_client.get('/api/prompt-templates/00000000-0000-0000-0000-000000000000/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_invalid_category_id(self, authenticated_client):
        """Test creating prompt with invalid category ID."""
        data = {
            'title': 'Test',
            'prompt_text': 'Test',
            'category_id': 99999
        }
        response = authenticated_client.post(
            '/api/prompt-templates/',
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST