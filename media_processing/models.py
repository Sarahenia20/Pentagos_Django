from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid


class ArtworkGenerationType(models.TextChoices):
    """Types of art generation available in PentaArt"""
    AI_PROMPT = 'ai_prompt', 'AI Prompt (Gemini/GPT-4o)'
    ALGORITHMIC = 'algorithmic', 'Algorithmic/Procedural'
    HYBRID = 'hybrid', 'Hybrid (AI + Algorithmic)'


class GenerationStatus(models.TextChoices):
    """Status of artwork generation"""
    QUEUED = 'queued', 'Queued'
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'


class AIProvider(models.TextChoices):
    """AI providers for image generation"""
    GEMINI = 'gemini', 'Google Gemini 2.5 Flash'
    GPT4O = 'gpt4o', 'OpenAI GPT-4o'
    NONE = 'none', 'None (Algorithmic only)'


class Artwork(models.Model):
    """
    Core model for all generated artworks in PentaArt
    Supports AI-generated, algorithmic, and hybrid art
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='artworks')  # DISABLED - No auth for testing
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='artworks', null=True, blank=True)  # Optional user for anonymous generation

    # Generation metadata
    title = models.CharField(max_length=200, blank=True)
    generation_type = models.CharField(
        max_length=20,
        choices=ArtworkGenerationType.choices,
        default=ArtworkGenerationType.AI_PROMPT
    )
    status = models.CharField(
        max_length=20,
        choices=GenerationStatus.choices,
        default=GenerationStatus.QUEUED
    )

    # AI generation fields
    prompt = models.TextField(blank=True, help_text="Text prompt for AI generation")
    ai_provider = models.CharField(
        max_length=20,
        choices=AIProvider.choices,
        default=AIProvider.GEMINI
    )

    # Algorithmic generation fields
    algorithm_name = models.CharField(max_length=100, blank=True, help_text="e.g., 'fractal', 'flow_field', 'geometric'")
    algorithm_params = models.JSONField(default=dict, blank=True, help_text="Parameters for algorithmic generation")

    # Image output
    image = models.ImageField(upload_to='artworks/%Y/%m/%d/', null=True, blank=True)
    cloudinary_url = models.URLField(max_length=500, blank=True, help_text="Cloudinary URL if saved to gallery")
    image_size = models.CharField(max_length=20, default='1024x1024')

    # Processing metadata
    generation_started_at = models.DateTimeField(null=True, blank=True)
    generation_completed_at = models.DateTimeField(null=True, blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)

    # Social features
    is_public = models.BooleanField(default=True)
    likes_count = models.PositiveIntegerField(default=0)
    views_count = models.PositiveIntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['is_public', '-created_at']),
        ]

    def __str__(self):
        return f"{self.title or 'Untitled'} - {self.user.username} ({self.status})"

    def start_processing(self):
        """Mark artwork as processing"""
        self.status = GenerationStatus.PROCESSING
        self.generation_started_at = timezone.now()
        self.save(update_fields=['status', 'generation_started_at'])

    def complete(self):
        """Mark artwork as completed"""
        self.status = GenerationStatus.COMPLETED
        self.generation_completed_at = timezone.now()
        self.save(update_fields=['status', 'generation_completed_at'])

    def fail(self, error_message):
        """Mark artwork as failed"""
        self.status = GenerationStatus.FAILED
        self.error_message = error_message
        self.generation_completed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'generation_completed_at'])

    @property
    def generation_duration(self):
        """Calculate generation duration in seconds"""
        if self.generation_started_at and self.generation_completed_at:
            return (self.generation_completed_at - self.generation_started_at).total_seconds()
        return None


class Tag(models.Model):
    """Tags for organizing and categorizing artworks"""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ArtworkTag(models.Model):
    """Many-to-many relationship between Artwork and Tag"""
    artwork = models.ForeignKey(Artwork, on_delete=models.CASCADE, related_name='artwork_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='artwork_tags')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['artwork', 'tag']
        ordering = ['tag__name']

    def __str__(self):
        return f"{self.artwork} - {self.tag}"


class Collection(models.Model):
    """User-created collections of artworks"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='collections')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    artworks = models.ManyToManyField(Artwork, related_name='collections', blank=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'name']

    def __str__(self):
        return f"{self.name} by {self.user.username}"
