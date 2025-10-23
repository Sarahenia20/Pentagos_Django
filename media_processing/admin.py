from django.contrib import admin
from .models import Artwork, Tag, ArtworkTag, Collection


@admin.register(Artwork)
class ArtworkAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'generation_type', 'status', 'ai_provider', 'created_at']
    list_filter = ['status', 'generation_type', 'ai_provider', 'is_public', 'created_at']
    search_fields = ['title', 'prompt', 'user__username']
    readonly_fields = ['id', 'created_at', 'updated_at', 'generation_duration']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'user', 'title', 'generation_type', 'status')
        }),
        ('Generation Settings', {
            'fields': ('prompt', 'ai_provider', 'algorithm_name', 'algorithm_params', 'image_size')
        }),
        ('Output', {
            'fields': ('image',)
        }),
        ('Processing', {
            'fields': ('celery_task_id', 'generation_started_at', 'generation_completed_at', 'generation_duration', 'error_message')
        }),
        ('Social', {
            'fields': ('is_public', 'likes_count', 'views_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(ArtworkTag)
class ArtworkTagAdmin(admin.ModelAdmin):
    list_display = ['artwork', 'tag', 'created_at']
    list_filter = ['tag', 'created_at']
    search_fields = ['artwork__title', 'tag__name']


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'is_public', 'created_at']
    list_filter = ['is_public', 'created_at']
    search_fields = ['name', 'description', 'user__username']
    filter_horizontal = ['artworks']
