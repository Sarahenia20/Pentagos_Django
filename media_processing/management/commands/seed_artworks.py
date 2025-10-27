import os
import shutil
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = 'Seed the database with Artwork records using images from FrontOffice/public. Also creates sample users, likes and comments.'

    def add_arguments(self, parser):
        parser.add_argument('--clean', action='store_true', help='Do not create duplicates; skip existing artworks by title')

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        from media_processing.models import Artwork, ArtworkGenerationType, AIProvider, GenerationStatus, ArtworkLike, Comment

        BASE_DIR = Path(settings.BASE_DIR)
        src_dir = BASE_DIR / 'FrontOffice' / 'public'
        if not src_dir.exists():
            self.stdout.write(self.style.ERROR(f"Source images directory not found: {src_dir}"))
            return

        image_exts = ['.jpg', '.jpeg', '.png', '.webp']
        images = [p for p in sorted(src_dir.iterdir()) if p.suffix.lower() in image_exts]
        if not images:
            self.stdout.write(self.style.WARNING(f'No images found in {src_dir} to seed.'))
            return

        User = get_user_model()
        # Create or get two test users
        seed_user, _ = User.objects.get_or_create(username='seed_user', defaults={'email': 'seed_user@example.com'})
        seed_user.set_password('testpass')
        seed_user.save()

        seed_user2, _ = User.objects.get_or_create(username='seed_user2', defaults={'email': 'seed_user2@example.com'})
        seed_user2.set_password('testpass')
        seed_user2.save()

        created_count = 0
        for img_path in images:
            title = img_path.stem.replace('-', ' ').replace('_', ' ').title()

            if options.get('clean') and Artwork.objects.filter(title=title).exists():
                self.stdout.write(self.style.WARNING(f"Artwork '{title}' exists, skipping (clean mode)."))
                continue

            # Create Artwork instance (without saving image yet)
            art = Artwork.objects.create(
                title=title,
                generation_type=ArtworkGenerationType.ALGORITHMIC if 'fractal' in title.lower() or 'algorithm' in title.lower() else ArtworkGenerationType.AI_PROMPT,
                status=GenerationStatus.COMPLETED,
                prompt=f"Seeded from {img_path.name}",
                ai_provider=AIProvider.NONE,
                image_size='1024x1024',
                is_public=True,
                likes_count=0,
                views_count=0,
            )

            # Copy image into MEDIA_ROOT by saving to the ImageField
            try:
                with open(img_path, 'rb') as f:
                    django_file = File(f)
                    # Use the original filename; ImageField will store under its upload_to
                    art.image.save(img_path.name, django_file, save=True)
            except Exception as e:
                # If saving file fails, delete the created artwork to avoid dangling records
                art.delete()
                self.stdout.write(self.style.ERROR(f"Failed to attach image {img_path.name}: {e}"))
                continue

            # Create a like from seed_user
            try:
                ArtworkLike.objects.get_or_create(user=seed_user, artwork=art)
                art.likes_count = art.likes.count()
                art.save(update_fields=['likes_count'])
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not create like for artwork {art.id}: {e}"))

            # Create 1-2 sample comments from seed_user2
            try:
                Comment.objects.create(artwork=art, user=seed_user2, content=f"Nice piece! (seeded) — {title}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not create comment for artwork {art.id}: {e}"))

            created_count += 1
            self.stdout.write(self.style.SUCCESS(f"Created artwork: {art.title} (id={art.id}) with image {img_path.name}"))

        if created_count:
            self.stdout.write(self.style.SUCCESS(f'Done. Created {created_count} artwork(s) and added sample likes/comments.'))
        else:
            self.stdout.write(self.style.WARNING('No new artworks were created.'))
