from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Category(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Tag(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class PromptTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    prompt_text = models.TextField()
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='prompts')
    tags = models.ManyToManyField(Tag, related_name='prompts', blank=True)
    variables = models.JSONField(default=list, blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_prompts')
    created_at = models.DateTimeField(default=timezone.now)
    likes_count = models.PositiveIntegerField(default=0)
    is_public = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class UserPromptLibrary(models.Model):
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='prompt_library')
    prompt = models.ForeignKey(PromptTemplate, on_delete=models.CASCADE, related_name='saved_by')
    saved_at = models.DateTimeField(default=timezone.now)
    is_favorite = models.BooleanField(default=False)

    class Meta:
        unique_together = [('user', 'prompt')]
        ordering = ['-saved_at']

    def __str__(self):
        return f"{self.user} -> {self.prompt.title}"
