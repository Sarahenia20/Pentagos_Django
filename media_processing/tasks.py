"""
Celery tasks for PentaArt - Asynchronous art generation

This module handles:
1. AI-based image generation (GPT-4o, Gemini, Stable Diffusion)
2. Algorithmic art generation (Fractals, Flow Fields, Geometric)
3. Hybrid generation (AI + Algorithmic blending)
4. Image processing and optimization
5. Activity logging and user statistics updates
"""

from celery import shared_task
from django.utils import timezone
from django.core.files.base import ContentFile
from PIL import Image
import io
import logging
import time
from datetime import timedelta

from .models import Artwork
from accounts.models import ActivityLog, UserProfile

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_artwork(self, artwork_id):
    """
    Main task for generating artwork based on generation type

    Args:
        artwork_id: UUID of the Artwork instance

    Returns:
        dict: Generation result with status and image URL
    """
    try:
        # Fetch artwork from database
        artwork = Artwork.objects.get(id=artwork_id)

        # Update status to processing
        artwork.status = 'processing'
        artwork.generation_started_at = timezone.now()
        artwork.save(update_fields=['status', 'generation_started_at'])

        logger.info(f"Starting generation for artwork {artwork_id} - Type: {artwork.generation_type}")

        # Route to appropriate generation function based on type
        if artwork.generation_type == 'ai_prompt':
            result_image = _generate_ai_image(artwork)
        elif artwork.generation_type == 'algorithmic':
            result_image = _generate_algorithmic_art(artwork)
        elif artwork.generation_type == 'hybrid':
            result_image = _generate_hybrid_art(artwork)
        else:
            raise ValueError(f"Unknown generation type: {artwork.generation_type}")

        # Save generated image to artwork
        if result_image:
            _save_artwork_image(artwork, result_image)

            # Mark as completed
            artwork.status = 'completed'
            artwork.generation_completed_at = timezone.now()
            artwork.error_message = ''  # Clear any previous error (use empty string, not None)
            artwork.save(update_fields=['status', 'generation_completed_at', 'error_message'])

            # Create activity log entry (only if user is authenticated)
            if artwork.user:
                _create_activity_log(artwork)

            # Update user profile statistics (only if user is authenticated)
            if artwork.user:
                _update_user_statistics(artwork.user)

            logger.info(f"Successfully generated artwork {artwork_id}")

            return {
                'status': 'success',
                'artwork_id': str(artwork.id),
                'image_url': artwork.image.url if artwork.image else None
            }
        else:
            raise Exception("Image generation returned None")

    except Artwork.DoesNotExist:
        logger.error(f"Artwork {artwork_id} not found")
        return {'status': 'error', 'message': 'Artwork not found'}

    except Exception as exc:
        logger.error(f"Error generating artwork {artwork_id}: {str(exc)}")

        # Update artwork with error
        try:
            artwork = Artwork.objects.get(id=artwork_id)
            artwork.status = 'failed'
            artwork.error_message = str(exc)[:500]  # Limit error message length
            artwork.generation_completed_at = timezone.now()
            artwork.save(update_fields=['status', 'error_message', 'generation_completed_at'])
        except:
            pass

        # Retry the task if retries remaining
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying artwork {artwork_id} - Attempt {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(exc=exc)

        return {'status': 'error', 'message': str(exc)}


def _generate_ai_image(artwork):
    """
    Generate image using AI provider (GPT-4o, Gemini, Hugging Face)

    Args:
        artwork: Artwork instance with prompt and ai_provider

    Returns:
        PIL.Image: Generated image
    """
    from .ai_providers.gpt4o import GPT4oImageGenerator
    # DISABLED - Only using DALL-E for now, will add other providers later
    # from .ai_providers.gemini import GeminiImageGenerator
    # from .ai_providers.huggingface import HuggingFaceImageGenerator

    provider = artwork.ai_provider
    prompt = artwork.prompt
    image_size = artwork.image_size or "1024x1024"

    logger.info(f"Using AI provider: {provider}")

    try:
        if provider == 'gpt4o':
            logger.info("Initializing GPT4oImageGenerator...")
            try:
                generator = GPT4oImageGenerator()
            except Exception as init_error:
                logger.error(f"Failed to initialize GPT4oImageGenerator: {type(init_error).__name__}: {str(init_error)}")
                raise Exception(f"OpenAI initialization failed: {str(init_error)}")
            
            # Use algorithm_params JSONField for AI parameters (quality, style, etc.)
            quality = artwork.algorithm_params.get('quality', 'standard') if artwork.algorithm_params else 'standard'
            logger.info(f"Generating image with prompt: {prompt[:100]}...")
            image = generator.generate_image(
                prompt=prompt,
                image_size=image_size,
                quality=quality
            )

        elif provider == 'gemini':
            generator = GeminiImageGenerator()
            image = generator.generate_image(
                prompt=prompt,
                image_size=image_size
            )

        elif provider == 'huggingface':
            generator = HuggingFaceImageGenerator()
            # Use algorithm_params JSONField for AI parameters
            model_name = artwork.algorithm_params.get('model', 'sdxl') if artwork.algorithm_params else 'sdxl'
            image = generator.generate_image(
                prompt=prompt,
                image_size=image_size,
                model_name=model_name
            )

        else:
            raise ValueError(f"Unknown AI provider: {provider}")

        return image

    except Exception as e:
        logger.error(f"AI generation error with {provider}: {str(e)}")
        raise


def _generate_algorithmic_art(artwork):
    """
    Generate art using algorithmic/procedural techniques

    Args:
        artwork: Artwork instance with algorithm_name and algorithm_params

    Returns:
        PIL.Image: Generated image
    """
    from .utils.algorithmic_art import generate_algorithmic_art, PATTERN_CATALOG

    algorithm = artwork.algorithm_name
    params = artwork.algorithm_params or {}

    logger.info(f"Using algorithm: {algorithm} with params: {params}")

    # Parse image size
    try:
        size_str = artwork.image_size or "1024x1024"
        width, height = map(int, size_str.split('x'))
        size = width  # Use width for square images
    except:
        size = 1024

    # Validate algorithm exists
    if algorithm not in PATTERN_CATALOG:
        raise ValueError(f"Unknown algorithm: {algorithm}. Available: {list(PATTERN_CATALOG.keys())}")

    # Generate the algorithmic art
    logger.info(f"Generating {algorithm} pattern at {size}x{size}")
    image = generate_algorithmic_art(algorithm, size=size, **params)
    
    logger.info(f"Successfully generated {algorithm} pattern")
    return image


def _generate_hybrid_art(artwork):
    """
    Generate hybrid art by combining AI and algorithmic generation

    Args:
        artwork: Artwork instance with both prompt and algorithm settings

    Returns:
        PIL.Image: Blended image
    """
    logger.info("Generating hybrid artwork")

    # Generate AI component
    ai_image = _generate_ai_image(artwork)

    # Generate algorithmic component
    algo_image = _generate_algorithmic_art(artwork)

    # Blend the two images
    blend_mode = artwork.blend_mode or 'overlay'
    alpha = artwork.blend_alpha or 0.5

    # Ensure both images are the same size
    if ai_image.size != algo_image.size:
        algo_image = algo_image.resize(ai_image.size, Image.Resampling.LANCZOS)

    # Simple alpha blending (can be enhanced with more blend modes)
    blended = Image.blend(ai_image.convert('RGBA'), algo_image.convert('RGBA'), alpha)

    return blended.convert('RGB')


def _save_artwork_image(artwork, image):
    """
    Save PIL Image to artwork.image field

    Args:
        artwork: Artwork instance
        image: PIL.Image to save
    """
    # Convert image to bytes
    img_io = io.BytesIO()

    # Optimize image before saving
    if image.mode == 'RGBA':
        image = image.convert('RGB')

    # Save as JPEG with optimization
    image.save(img_io, format='JPEG', quality=95, optimize=True)
    img_io.seek(0)

    # Generate filename - just the UUID.jpg (upload_to handles the path)
    filename = f"{artwork.id}.jpg"

    # Save to artwork.image field
    artwork.image.save(filename, ContentFile(img_io.read()), save=True)

    logger.info(f"Saved image to {filename}")


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_avatar_for_user(self, user_id, prompt, provider='sdxl', image_size='1024x1024'):
    """Generate an avatar image for a given user and save it to their profile.

    This runs asynchronously via Celery because local model loading can be very slow
    and should not block HTTP requests.
    """
    try:
        logger.info('generate_avatar_for_user: starting for user_id=%s', user_id)
        from accounts.models import UserProfile
        from PIL import Image
        # Lazy import of huggingface generator
        from .ai_providers.huggingface import generate_with_huggingface

        try:
            profile = UserProfile.objects.get(user__id=user_id)
        except UserProfile.DoesNotExist:
            logger.error('generate_avatar_for_user: UserProfile not found for user_id=%s', user_id)
            return {'status': 'error', 'message': 'user not found'}

        # Generate image (this may download model weights on first run)
        model_key = provider if provider in ('sdxl', 'sd15', 'flux', 'playground') else 'sdxl'
        image = generate_with_huggingface(prompt, model=model_key, image_size=image_size)

        # Save image to profile.avatar as PNG
        buf = io.BytesIO()
        image.save(buf, format='PNG')
        buf.seek(0)
        filename = f"avatar_{profile.user.id}_{int(time.time())}.png"
        profile.avatar.save(filename, ContentFile(buf.read()), save=True)
        profile.save()

        logger.info('generate_avatar_for_user: saved avatar for user=%s path=%s', profile.user.username, profile.avatar.name)
        return {'status': 'success', 'avatar_url': profile.avatar.url if profile.avatar else None}

    except Exception as exc:
        logger.exception('generate_avatar_for_user: failed for user_id=%s: %s', user_id, exc)
        # Retry if possible
        try:
            if self.request.retries < self.max_retries:
                raise self.retry(exc=exc)
        except Exception:
            pass
        return {'status': 'error', 'message': str(exc)}


def _create_activity_log(artwork):
    """
    Create activity log entry for artwork creation

    Args:
        artwork: Artwork instance
    """
    try:
        ActivityLog.objects.create(
            user=artwork.user,
            activity_type='artwork_created',
            description=f"Created artwork: {artwork.title}"
        )
        logger.debug(f"Created activity log for artwork {artwork.id}")
    except Exception as e:
        logger.error(f"Failed to create activity log: {str(e)}")


def _update_user_statistics(user):
    """
    Update user profile statistics after artwork generation

    Args:
        user: User instance (can be None for anonymous generation)
    """
    # Skip if no user (anonymous generation)
    if not user:
        logger.debug("Skipping user statistics update - anonymous generation")
        return
    
    try:
        profile = UserProfile.objects.get(user=user)

        # Recalculate total artworks count
        total_artworks = Artwork.objects.filter(user=user, status='completed').count()
        profile.total_artworks = total_artworks
        profile.save(update_fields=['total_artworks'])

        logger.debug(f"Updated statistics for user {user.username}")
    except UserProfile.DoesNotExist:
        logger.warning(f"UserProfile not found for user {user.username}")
    except Exception as e:
        logger.error(f"Failed to update user statistics: {str(e)}")


# ============================================================================
# ADDITIONAL UTILITY TASKS
# ============================================================================

@shared_task
def cleanup_failed_artworks():
    """
    Periodic task to clean up old failed artwork records
    Runs daily via Celery Beat
    """
    cutoff_date = timezone.now() - timedelta(days=7)

    deleted_count, _ = Artwork.objects.filter(
        status='failed',
        created_at__lt=cutoff_date
    ).delete()

    logger.info(f"Cleaned up {deleted_count} failed artworks older than 7 days")
    return {'cleaned': deleted_count}


@shared_task
def optimize_image(artwork_id):
    """
    Optimize an existing artwork image (resize, compress)

    Args:
        artwork_id: UUID of artwork to optimize
    """
    try:
        artwork = Artwork.objects.get(id=artwork_id)

        if not artwork.image:
            return {'status': 'error', 'message': 'No image to optimize'}

        # Open image
        image = Image.open(artwork.image.path)

        # Optimize and save
        _save_artwork_image(artwork, image)

        logger.info(f"Optimized image for artwork {artwork_id}")
        return {'status': 'success'}

    except Artwork.DoesNotExist:
        return {'status': 'error', 'message': 'Artwork not found'}
    except Exception as e:
        logger.error(f"Error optimizing image: {str(e)}")
        return {'status': 'error', 'message': str(e)}
