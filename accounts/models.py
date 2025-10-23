from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    """
    Extended user profile for PentaArt
    Stores user preferences and art generation settings
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # Profile info
    bio = models.TextField(max_length=500, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    website = models.URLField(blank=True)
    location = models.CharField(max_length=100, blank=True)

    # Art generation preferences
    default_ai_provider = models.CharField(
        max_length=20,
        default='gemini',
        choices=[('gemini', 'Gemini'), ('gpt4o', 'GPT-4o')]
    )
    default_image_size = models.CharField(max_length=20, default='1024x1024')
    favorite_algorithm = models.CharField(max_length=100, blank=True)

    # Style preferences (stored as JSON for flexibility)
    style_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="User's preferred art styles and parameters"
    )

    # Statistics
    total_artworks = models.PositiveIntegerField(default=0)
    total_likes_received = models.PositiveIntegerField(default=0)
    total_views_received = models.PositiveIntegerField(default=0)

    # Social
    is_public_profile = models.BooleanField(default=True)
    followers_count = models.PositiveIntegerField(default=0)
    following_count = models.PositiveIntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'

    def __str__(self):
        return f"{self.user.username}'s Profile"

    def update_artwork_count(self):
        """Update total artworks count"""
        self.total_artworks = self.user.artworks.filter(status='completed').count()
        self.save(update_fields=['total_artworks'])

    def update_likes_count(self):
        """Update total likes received"""
        self.total_likes_received = sum(
            artwork.likes_count for artwork in self.user.artworks.all()
        )
        self.save(update_fields=['total_likes_received'])


class ActivityLog(models.Model):
    """Track user activities in PentaArt"""
    ACTIVITY_TYPES = [
        ('artwork_created', 'Artwork Created'),
        ('artwork_liked', 'Artwork Liked'),
        ('collection_created', 'Collection Created'),
        ('profile_updated', 'Profile Updated'),
        ('user_followed', 'User Followed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'

    def __str__(self):
        return f"{self.user.username} - {self.activity_type} at {self.created_at}"


# Signal to automatically create profile when user is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()
