from django.contrib import admin
from .models import Category, Tag, PromptTemplate, UserPromptLibrary


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'icon')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name',)


@admin.register(PromptTemplate)
class PromptTemplateAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'created_at', 'likes_count', 'is_public')
    list_filter = ('category', 'is_public')
    search_fields = ('title', 'prompt_text', 'description')


@admin.register(UserPromptLibrary)
class UserPromptLibraryAdmin(admin.ModelAdmin):
    list_display = ('user', 'prompt', 'is_favorite', 'saved_at')
    list_filter = ('is_favorite',)
