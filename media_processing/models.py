"""
FUTURISTIC PENTAART MODELS
===========================
Features:
- NFT minting support
- Blockchain integration ready
- Advanced analytics and metrics
- AI-powered recommendations
- Social graph and engagement
- Version control and history
- Copyright protection
- Monetization features
- Collaborative artworks
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid
import json
from typing import Optional, Dict, Any


class ArtworkGenerationType(models.TextChoices):
    """Types of art generation"""
    AI_PROMPT = 'ai_prompt', 'AI Prompt (Text-to-Image)'
    ALGORITHMIC = 'algorithmic', 'Algorithmic/Procedural'
    HYBRID = 'hybrid', 'Hybrid (AI + Algorithmic)'
    AI_VARIATION = 'ai_variation', 'AI Variation'
    AI_UPSCALE = 'ai_upscale', 'AI Upscale'
    AI_STYLE_TRANSFER = 'ai_style_transfer', 'AI Style Transfer'


class GenerationStatus(models.TextChoices):
    """Status of artwork generation"""
    QUEUED = 'queued', 'Queued'
    PROCESSING = 'processing', 'Processing'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    CANCELLED = 'cancelled', 'Cancelled'


class AIProvider(models.TextChoices):
    """AI providers for image generation"""
    GEMINI = 'gemini', 'Google Gemini 2.5 Flash'
    OPENAI = 'openai', 'OpenAI DALL-E'
    GROQ = 'groq', 'Groq LLama Vision'
    HUGGINGFACE = 'huggingface', 'HuggingFace Models'
    STABILITY = 'stability', 'Stability AI'
    MIDJOURNEY = 'midjourney', 'Midjourney'
    NONE = 'none', 'None (Algorithmic only)'


class BlockchainNetwork(models.TextChoices):
    """Supported blockchain networks for NFT minting"""
    ETHEREUM = 'ethereum', 'Ethereum'
    POLYGON = 'polygon', 'Polygon'
    SOLANA = 'solana', 'Solana'
    TEZOS = 'tezos', 'Tezos'
    NONE = 'none', 'Not minted'


class LicenseType(models.TextChoices):
    """Artwork license types"""
    ALL_RIGHTS = 'all_rights', 'All Rights Reserved'
    CC_BY = 'cc_by', 'Creative Commons Attribution'
    CC_BY_SA = 'cc_by_sa', 'Creative Commons Attribution-ShareAlike'
    CC_BY_NC = 'cc_by_nc', 'Creative Commons Attribution-NonCommercial'
    CC_BY_ND = 'cc_by_nd', 'Creative Commons Attribution-NoDerivs'
    PUBLIC_DOMAIN = 'public_domain', 'Public Domain'
    COMMERCIAL = 'commercial', 'Commercial License'


class Artwork(models.Model):
    """
    Next-generation artwork model with NFT and blockchain support
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='artworks', null=True, blank=True)
    
    # Basic metadata
    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    
    # Generation metadata
    generation_type = models.CharField(
        max_length=20,
        choices=ArtworkGenerationType.choices,
        default=ArtworkGenerationType.AI_PROMPT
    )
    status = models.CharField(
        max_length=20,
        choices=GenerationStatus.choices,
        default=GenerationStatus.QUEUED,
        db_index=True
    )
    
    # AI generation fields
    prompt = models.TextField(blank=True, help_text="Original text prompt")
    enhanced_prompt = models.TextField(blank=True, help_text="AI-enhanced prompt")
    negative_prompt = models.TextField(blank=True, help_text="Negative prompt (what to avoid)")
    ai_provider = models.CharField(
        max_length=20,
        choices=AIProvider.choices,
        default=AIProvider.GEMINI
    )
    ai_model = models.CharField(max_length=100, blank=True, help_text="Specific AI model used")
    
    # Algorithmic generation fields
    algorithm_name = models.CharField(max_length=100, blank=True)
    algorithm_params = models.JSONField(default=dict, blank=True)
    
    # Generation parameters
    generation_seed = models.BigIntegerField(null=True, blank=True)
    generation_steps = models.IntegerField(default=50)
    guidance_scale = models.FloatField(default=7.5)
    style_preset = models.CharField(max_length=50, blank=True)
    
    # Image output
    image = models.ImageField(upload_to='artworks/%Y/%m/%d/', null=True, blank=True)
    cloudinary_url = models.URLField(max_length=500, blank=True)
    image_size = models.CharField(max_length=20, default='1024x1024')
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    image_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash for verification")
    
    # Processing metadata
    generation_started_at = models.DateTimeField(null=True, blank=True)
    generation_completed_at = models.DateTimeField(null=True, blank=True)
    generation_duration_ms = models.IntegerField(null=True, blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)
    
    # Quality metrics
    quality_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="AI-calculated quality score (0-1)"
    )
    aesthetic_score = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(10.0)],
        help_text="Aesthetic score (0-10)"
    )
    
    # Social features
    is_public = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    is_nsfw = models.BooleanField(default=False)
    likes_count = models.PositiveIntegerField(default=0, db_index=True)
    views_count = models.PositiveIntegerField(default=0)
    shares_count = models.PositiveIntegerField(default=0)
    downloads_count = models.PositiveIntegerField(default=0)
    
    # AI-generated metadata
    ai_caption = models.TextField(blank=True)
    ai_tags = models.JSONField(default=list, blank=True)
    ai_dominant_colors = models.JSONField(default=list, blank=True)
    ai_detected_objects = models.JSONField(default=list, blank=True)
    ai_sentiment = models.CharField(max_length=20, blank=True)
    ai_caption_model = models.CharField(max_length=100, blank=True)
    ai_caption_generated_at = models.DateTimeField(null=True, blank=True)
    
    # NFT & Blockchain
    is_nft = models.BooleanField(default=False, db_index=True)
    nft_contract_address = models.CharField(max_length=255, blank=True)
    nft_token_id = models.CharField(max_length=100, blank=True)
    nft_blockchain = models.CharField(
        max_length=20,
        choices=BlockchainNetwork.choices,
        default=BlockchainNetwork.NONE
    )
    nft_metadata_uri = models.URLField(max_length=500, blank=True)
    nft_minted_at = models.DateTimeField(null=True, blank=True)
    nft_owner_wallet = models.CharField(max_length=255, blank=True)
    
    # Licensing & Rights
    license_type = models.CharField(
        max_length=20,
        choices=LicenseType.choices,
        default=LicenseType.ALL_RIGHTS
    )
    is_for_sale = models.BooleanField(default=False)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sale_currency = models.CharField(max_length=10, default='USD')
    
    # Collaboration
    is_collaborative = models.BooleanField(default=False)
    collaborators = models.ManyToManyField(User, related_name='collaborated_artworks', blank=True)
    parent_artwork = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='derivatives'
    )
    remix_count = models.PositiveIntegerField(default=0)
    
    # Analytics
    engagement_score = models.FloatField(default=0.0, db_index=True)
    trending_score = models.FloatField(default=0.0, db_index=True)
    virality_coefficient = models.FloatField(default=0.0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_viewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['is_public', '-created_at']),
            models.Index(fields=['-likes_count']),
            models.Index(fields=['-engagement_score']),
            models.Index(fields=['-trending_score']),
            models.Index(fields=['is_nft', '-created_at']),
            models.Index(fields=['is_featured', '-created_at']),
        ]
    
    def __str__(self):
        username = self.user.username if self.user else 'Anonymous'
        return f"{self.title or 'Untitled'} - {username} ({self.status})"
    
    def start_processing(self):
        """Mark artwork as processing"""
        self.status = GenerationStatus.PROCESSING
        self.generation_started_at = timezone.now()
        self.save(update_fields=['status', 'generation_started_at'])
    
    def complete(self, duration_ms: Optional[int] = None):
        """Mark artwork as completed"""
        self.status = GenerationStatus.COMPLETED
        self.generation_completed_at = timezone.now()
        
        if duration_ms:
            self.generation_duration_ms = duration_ms
        elif self.generation_started_at:
            duration = (self.generation_completed_at - self.generation_started_at).total_seconds() * 1000
            self.generation_duration_ms = int(duration)
        
        self.save(update_fields=['status', 'generation_completed_at', 'generation_duration_ms'])
    
    def fail(self, error_message: str):
        """Mark artwork as failed"""
        self.status = GenerationStatus.FAILED
        self.error_message = error_message
        self.generation_completed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'generation_completed_at'])
    
    def increment_view(self):
        """Increment view count"""
        self.views_count = models.F('views_count') + 1
        self.last_viewed_at = timezone.now()
        self.save(update_fields=['views_count', 'last_viewed_at'])
    
    def increment_download(self):
        """Increment download count"""
        self.downloads_count = models.F('downloads_count') + 1
        self.save(update_fields=['downloads_count'])
    
    def calculate_engagement_score(self):
        """Calculate engagement score based on interactions"""
        # Weighted engagement formula
        score = (
            (self.likes_count * 3) +
            (self.views_count * 0.1) +
            (self.shares_count * 5) +
            (self.downloads_count * 2) +
            (self.remix_count * 10)
        )
        
        # Time decay factor (newer content gets boost)
        age_days = (timezone.now() - self.created_at).days
        decay_factor = 1 / (1 + (age_days / 7))  # Decay over weeks
        
        self.engagement_score = score * decay_factor
        self.save(update_fields=['engagement_score'])
    
    def calculate_trending_score(self):
        """Calculate trending score (recent engagement velocity)"""
        # Get recent interactions (last 24 hours)
        recent_likes = self.likes.filter(created_at__gte=timezone.now() - timezone.timedelta(days=1)).count()
        recent_views = self.views_count  # Simplified - would need time-series data
        
        # Trending formula
        self.trending_score = (recent_likes * 5) + (recent_views * 0.2)
        self.save(update_fields=['trending_score'])
    
    @property
    def generation_duration(self):
        """Get generation duration in seconds"""
        if self.generation_duration_ms:
            return self.generation_duration_ms / 1000
        return None


class ArtworkVersion(models.Model):
    """Version control for artworks (track edits and iterations)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artwork = models.ForeignKey(Artwork, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    
    # Version snapshot
    image_url = models.URLField(max_length=500)
    prompt = models.TextField()
    parameters = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        ordering = ['-version_number']
        unique_together = ['artwork', 'version_number']


class Tag(models.Model):
    """Enhanced tags with analytics"""
    name = models.CharField(max_length=50, unique=True, db_index=True)
    slug = models.SlugField(max_length=50, unique=True, db_index=True)
    category = models.CharField(max_length=30, blank=True)
    usage_count = models.PositiveIntegerField(default=0)
    is_trending = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-usage_count', 'name']
    
    def __str__(self):
        return self.name


class ArtworkTag(models.Model):
    """Many-to-many with additional metadata"""
    artwork = models.ForeignKey(Artwork, on_delete=models.CASCADE, related_name='artwork_tags')
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name='artwork_tags')
    confidence = models.FloatField(default=1.0, validators=[MinValueValidator(0.0), MaxValueValidator(1.0)])
    is_ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['artwork', 'tag']


class Collection(models.Model):
    """User collections with enhanced features"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='collections')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    artworks = models.ManyToManyField(Artwork, related_name='collections', blank=True)
    
    # Collection settings
    is_public = models.BooleanField(default=False)
    is_collaborative = models.BooleanField(default=False)
    collaborators = models.ManyToManyField(User, related_name='collaborative_collections', blank=True)
    
    # NFT Collection
    is_nft_collection = models.BooleanField(default=False)
    nft_collection_address = models.CharField(max_length=255, blank=True)
    
    # Analytics
    views_count = models.PositiveIntegerField(default=0)
    followers_count = models.PositiveIntegerField(default=0)
    
    # Customization
    cover_image_url = models.URLField(max_length=500, blank=True)
    theme_color = models.CharField(max_length=7, blank=True, help_text="Hex color code")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return f"{self.name} by {self.user.username}"


class ArtworkLike(models.Model):
    """Enhanced likes with reactions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    artwork = models.ForeignKey(Artwork, on_delete=models.CASCADE, related_name='likes')
    reaction_type = models.CharField(
        max_length=20,
        default='like',
        choices=[
            ('like', '👍 Like'),
            ('love', '❤️ Love'),
            ('fire', '🔥 Fire'),
            ('mind_blown', '🤯 Mind Blown'),
            ('star', '⭐ Star'),
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'artwork']
        indexes = [
            models.Index(fields=['artwork', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} {self.reaction_type} {self.artwork.id}"


class Comment(models.Model):
    """Enhanced comments with threading"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artwork = models.ForeignKey(Artwork, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    content = models.TextField()
    is_edited = models.BooleanField(default=False)
    likes_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user.username} on {self.artwork.id}"


class UserProfile(models.Model):
    """Extended user profile"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Profile info
    bio = models.TextField(blank=True, max_length=500)
    avatar_url = models.URLField(max_length=500, blank=True)
    banner_url = models.URLField(max_length=500, blank=True)
    website = models.URLField(max_length=200, blank=True)
    
    # Social links
    twitter_handle = models.CharField(max_length=50, blank=True)
    instagram_handle = models.CharField(max_length=50, blank=True)
    discord_username = models.CharField(max_length=50, blank=True)
    
    # Blockchain
    ethereum_wallet = models.CharField(max_length=42, blank=True)
    solana_wallet = models.CharField(max_length=44, blank=True)
    
    # Stats
    total_artworks = models.PositiveIntegerField(default=0)
    total_likes_received = models.PositiveIntegerField(default=0)
    total_followers = models.PositiveIntegerField(default=0)
    total_following = models.PositiveIntegerField(default=0)
    reputation_score = models.FloatField(default=0.0)
    
    # Badges
    is_verified = models.BooleanField(default=False)
    is_pro = models.BooleanField(default=False)
    badges = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Profile of {self.user.username}"


class Follow(models.Model):
    """User following system"""
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['follower', 'following']
    
    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


class ArtworkReport(models.Model):
    """Content moderation reports"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    artwork = models.ForeignKey(Artwork, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    
    reason = models.CharField(
        max_length=50,
        choices=[
            ('spam', 'Spam'),
            ('inappropriate', 'Inappropriate Content'),
            ('copyright', 'Copyright Violation'),
            ('hate_speech', 'Hate Speech'),
            ('violence', 'Violence'),
            ('other', 'Other'),
        ]
    )
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        default='pending',
        choices=[
            ('pending', 'Pending'),
            ('reviewing', 'Under Review'),
            ('resolved', 'Resolved'),
            ('dismissed', 'Dismissed'),
        ]
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_reports')
    
    class Meta:
        ordering = ['-created_at']