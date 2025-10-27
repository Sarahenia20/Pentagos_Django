from django.core.management.base import BaseCommand
from prompt_library.models import Category, Tag, PromptTemplate
import random


SAMPLE = [
    {
        'title': 'Cyberpunk Portrait',
        'prompt_text': 'A highly detailed cyberpunk portrait of a {subject}, neon lights, rain-soaked streets, cinematic lighting.',
        'description': 'Creates stunning cyberpunk-style portraits',
        'category': 'Portrait',
        'tags': ['cyberpunk', 'neon', 'futuristic'],
        'variables': ['subject']
    },
    {
        'title': 'Dreamy Landscape',
        'prompt_text': 'A dreamy, pastel-colored landscape with floating islands and soft fog, {mood}.',
        'description': 'Soft, surreal landscapes for dreamy scenes',
        'category': 'Landscape',
        'tags': ['dreamy', 'pastel', 'surreal'],
        'variables': ['mood']
    },
    {
        'title': 'Fantasy Castle at Dusk',
        'prompt_text': 'A majestic fantasy castle on a cliff during dusk, warm lights, {atmosphere}.',
        'description': 'Epic fantasy architecture and scenic lighting',
        'category': 'Fantasy',
        'tags': ['fantasy', 'castle', 'epic'],
        'variables': ['atmosphere']
    },
    # Add more sample entries programmatically below
]

MORE_CATEGORIES = ['Portrait', 'Landscape', 'Abstract', 'Fantasy', 'Sci-Fi', 'Still Life']
MORE_TAGS = ['minimal', 'vibrant', 'photorealistic', 'oil', 'watercolor', 'retro', 'cinematic', 'neon']


class Command(BaseCommand):
    help = 'Seed the prompt_library with sample categories, tags and prompt templates (20 items)'

    def handle(self, *args, **options):
        # Ensure categories
        cat_objs = {}
        for name in MORE_CATEGORIES:
            obj, _ = Category.objects.get_or_create(name=name, slug=name.lower())
            cat_objs[name] = obj

        tag_objs = {}
        for t in MORE_TAGS:
            obj, _ = Tag.objects.get_or_create(name=t)
            tag_objs[t] = obj

        created = 0

        for s in SAMPLE:
            cat = cat_objs.get(s['category'])
            p, _ = PromptTemplate.objects.get_or_create(
                title=s['title'],
                defaults={
                    'prompt_text': s['prompt_text'],
                    'description': s['description'],
                    'category': cat,
                    'variables': s.get('variables', []),
                    'is_public': True,
                }
            )
            for t in s['tags']:
                tag, _ = Tag.objects.get_or_create(name=t)
                p.tags.add(tag)
            created += 1

        # Generate additional random prompts
        for i in range(20 - created):
            cat = random.choice(MORE_CATEGORIES)
            title = f"Sample Prompt {i+1} - {cat}"
            text = f"A {random.choice(['detailed','minimal','stylized'])} {cat.lower()} scene with {random.choice(MORE_TAGS)}, mood: {{mood}}."
            p, _ = PromptTemplate.objects.get_or_create(
                title=title,
                defaults={
                    'prompt_text': text,
                    'description': f'Auto-generated sample prompt for {cat}',
                    'category': cat_objs.get(cat),
                    'variables': ['mood'],
                    'is_public': True,
                }
            )
            # add some tags
            for t in random.sample(MORE_TAGS, k=2):
                tag_objs[t].prompts.add(p)

        self.stdout.write(self.style.SUCCESS('Seeded prompt_library with sample data'))
