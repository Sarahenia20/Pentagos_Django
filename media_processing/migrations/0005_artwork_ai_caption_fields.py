# Generated migration for AI caption feature
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media_processing', '0004_comment_artworklike'),
    ]

    operations = [
        migrations.AddField(
            model_name='artwork',
            name='ai_caption',
            field=models.TextField(blank=True, help_text='AI-generated descriptive caption for the artwork'),
        ),
        migrations.AddField(
            model_name='artwork',
            name='ai_tags',
            field=models.JSONField(blank=True, default=list, help_text='AI-generated tags/hashtags as a list of strings'),
        ),
        migrations.AddField(
            model_name='artwork',
            name='ai_caption_model',
            field=models.CharField(blank=True, help_text="Model used for caption generation (e.g., 'blip-2', 'gpt-4-vision')", max_length=100),
        ),
        migrations.AddField(
            model_name='artwork',
            name='ai_caption_generated_at',
            field=models.DateTimeField(blank=True, help_text='When the AI caption was generated', null=True),
        ),
    ]
