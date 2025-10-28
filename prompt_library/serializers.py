from rest_framework import serializers
from .models import PromptTemplate, Category, Tag, UserPromptLibrary


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon']


class PromptTemplateSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    author = serializers.StringRelatedField(read_only=True)
    # expose the numeric author id (read-only). DRF will use the field name to look up the attribute.
    author_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = PromptTemplate
        # include author_id so the declared field matches the serializer fields
        fields = ['id', 'title', 'prompt_text', 'description', 'category', 'category_id', 'tags', 'tag_names', 'variables', 'author', 'author_id', 'created_at', 'likes_count', 'is_public']

    def create(self, validated_data):
        tags = validated_data.pop('tag_names', [])
        prompt = PromptTemplate.objects.create(**validated_data)
        for t in tags:
            tag_obj, _ = Tag.objects.get_or_create(name=t)
            prompt.tags.add(tag_obj)
        return prompt

    def update(self, instance, validated_data):
        tags = validated_data.pop('tag_names', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if tags is not None:
            instance.tags.clear()
            for t in tags:
                tag_obj, _ = Tag.objects.get_or_create(name=t)
                instance.tags.add(tag_obj)
        return instance


class UserPromptLibrarySerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    prompt = PromptTemplateSerializer(read_only=True)
    prompt_id = serializers.PrimaryKeyRelatedField(queryset=PromptTemplate.objects.all(), source='prompt', write_only=True)

    class Meta:
        model = UserPromptLibrary
        fields = ['id', 'user', 'prompt', 'prompt_id', 'saved_at', 'is_favorite']
