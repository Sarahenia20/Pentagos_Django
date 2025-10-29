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


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def generate_artwork_caption(self, artwork_id):
    """
    Generate AI caption and tags for an artwork using image captioning model.
    
    Uses Hugging Face transformers pipeline (runs locally) with BLIP or VIT-GPT2
    models to analyze the artwork image and produce:
    - A descriptive caption
    - A list of hashtags/tags
    
    Args:
        artwork_id: UUID of the Artwork instance
    
    Returns:
        dict: Result with status, caption, and tags
    """
    try:
        logger.info(f"Generating caption for artwork {artwork_id}")
        
        # Fetch artwork
        artwork = Artwork.objects.get(id=artwork_id)
        
        if not artwork.image:
            logger.warning(f"Artwork {artwork_id} has no image, cannot generate caption")
            return {'status': 'error', 'message': 'No image available'}
        
        caption_text = None
        model_used = None
        
        try:
            # Try using transformers pipeline locally
            from transformers import pipeline
            from PIL import Image
            
            # Try BLIP model first (better quality)
            models_to_try = [
                ("Salesforce/blip-image-captioning-base", "image-to-text"),
                ("nlpconnect/vit-gpt2-image-captioning", "image-to-text"),
            ]
            
            # Open image
            image = Image.open(artwork.image.path).convert('RGB')
            
            for model_name, task in models_to_try:
                try:
                    logger.info(f"Trying local model: {model_name} for artwork {artwork_id}")
                    
                    # Initialize pipeline (will download model on first use)
                    captioner = pipeline(task, model=model_name)
                    
                    # Generate caption
                    result = captioner(image)
                    
                    # Parse result
                    if isinstance(result, list) and len(result) > 0:
                        caption_text = result[0].get('generated_text', '').strip()
                    elif isinstance(result, dict):
                        caption_text = result.get('generated_text', '').strip()
                    
                    if caption_text:
                        model_used = model_name
                        logger.info(f"Success with {model_name}: {caption_text}")
                        break
                        
                except Exception as model_error:
                    logger.warning(f"Error with {model_name}: {str(model_error)}")
                    continue
        
        except Exception as transform_error:
            logger.warning(f"Transformers pipeline error: {str(transform_error)}")
        
        # Fallback: use prompt if models failed
        if not caption_text:
            logger.info(f"Using fallback caption for artwork {artwork_id}")
            if artwork.prompt:
                caption_text = f"AI-generated artwork: {artwork.prompt[:80]}"
                model_used = "prompt-based"
            else:
                caption_text = f"AI-generated {artwork.generation_type or 'artwork'}"
                model_used = "default"
            logger.info(f"Generated fallback caption: {caption_text}")
        
        # Generate tags by extracting keywords from caption
        tags = _extract_tags_from_caption(caption_text, artwork.prompt)
        
        # Save to artwork
        artwork.ai_caption = caption_text
        artwork.ai_tags = tags
        artwork.ai_caption_model = model_used or "fallback"
        artwork.ai_caption_generated_at = timezone.now()
        artwork.save(update_fields=['ai_caption', 'ai_tags', 'ai_caption_model', 'ai_caption_generated_at'])
        
        logger.info(f"Generated caption for artwork {artwork_id}: {caption_text[:50]}...")
        
        return {
            'status': 'success',
            'artwork_id': str(artwork_id),
            'caption': caption_text,
            'tags': tags
        }
    
    except Artwork.DoesNotExist:
        logger.error(f"Artwork {artwork_id} not found")
        return {'status': 'error', 'message': 'Artwork not found'}
    
    except Exception as exc:
        logger.error(f"Error generating caption for artwork {artwork_id}: {str(exc)}")
        
        # Retry if possible
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying caption generation for {artwork_id} - Attempt {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(exc=exc)
        
        return {'status': 'error', 'message': str(exc)}


def _extract_tags_from_caption(caption, prompt=None):
    """
    Extract hashtags/keywords from a caption and optional prompt.
    
    Simple keyword extraction; for production use NLP or GPT API.
    
    Args:
        caption: Generated caption text
        prompt: Optional original prompt text
    
    Returns:
        list: List of tag strings
    """
    import re
    
    tags = set()
    
    # Combine caption and prompt for tag extraction
    text = caption.lower()
    if prompt:
        text += " " + prompt.lower()
    
    # Common art-related keywords to extract
    art_keywords = [
        'abstract', 'surreal', 'geometric', 'neon', 'cyberpunk', 'fantasy',
        'portrait', 'landscape', 'nature', 'architecture', 'colorful', 'vibrant',
        'minimalist', 'futuristic', 'retro', 'vintage', 'modern', 'digital',
        'painting', 'illustration', 'realistic', 'stylized', 'artistic', 'creative',
        'night', 'day', 'sunset', 'sunrise', 'urban', 'city', 'forest', 'ocean',
        'mountain', 'sky', 'clouds', 'stars', 'space', 'galaxy', 'sci-fi', 'anime'
    ]
    
    for keyword in art_keywords:
        if keyword in text:
            tags.add(keyword)
    
    # Extract nouns (simple pattern matching for common words)
    # This is a basic fallback; production should use spaCy or similar
    words = re.findall(r'\b[a-z]{4,}\b', text)
    for word in words[:10]:  # Limit to first 10 words
        if word not in ['with', 'that', 'this', 'from', 'have', 'been', 'were', 'their']:
            tags.add(word)
    
    # Return as list, limit to 8 tags
    return list(tags)[:8]


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def generate_profile_bio(self, user_id):
    """
    Generate AI-powered artist bio based on user's artwork analysis.
    
    Analyzes the user's artworks (prompts, styles, themes) and generates
    a short, personalized bio like "Your art explores surreal landscapes 
    and abstract emotions".
    
    Args:
        user_id: ID of the User instance
    
    Returns:
        dict: Result with status and generated bio
    """
    try:
        from django.contrib.auth.models import User
        from django.conf import settings
        import requests
        from collections import Counter
        
        logger.info(f"Generating AI bio for user {user_id}")
        
        # Fetch user and profile
        user = User.objects.get(id=user_id)
        profile = user.profile
        
        # Get user's artworks
        artworks = Artwork.objects.filter(user=user, status='completed').order_by('-created_at')[:20]
        
        if not artworks.exists():
            bio = "Welcome to PentaArt! Start creating to discover your unique artistic style."
            profile.ai_bio = bio
            profile.ai_bio_generated_at = timezone.now()
            profile.save(update_fields=['ai_bio', 'ai_bio_generated_at'])
            return {'status': 'success', 'bio': bio, 'method': 'default'}
        
        # Collect artwork data for analysis
        prompts = [a.prompt for a in artworks if a.prompt]
        ai_tags = []
        for a in artworks:
            if a.ai_tags:
                ai_tags.extend(a.ai_tags)
        
        # Analyze themes and styles
        generation_types = Counter([a.generation_type for a in artworks])
        ai_providers = Counter([a.ai_provider for a in artworks if a.ai_provider])
        common_tags = Counter(ai_tags).most_common(5)
        
        # Build analysis text for AI
        analysis = f"User has created {artworks.count()} artworks. "
        
        if common_tags:
            top_themes = ', '.join([tag for tag, _ in common_tags[:3]])
            analysis += f"Common themes: {top_themes}. "
        
        if prompts:
            sample_prompts = ' | '.join(prompts[:3])
            analysis += f"Sample prompts: {sample_prompts}. "
        
        # Try using Groq API for bio generation (Fast and Free!)
        groq_token = getattr(settings, 'GROQ_API_KEY', '')
        hf_token = getattr(settings, 'HUGGINGFACE_TOKEN', '')
        bio_generated = False
        
        # Try Groq first (FREE and VERY FAST!)
        if groq_token:
            try:
                logger.info(f"Using Groq AI to generate bio for user {user_id}")
                
                prompt = f"""Based on this artist's work analysis, write a short, engaging bio (max 60 words) that describes their artistic style and themes.

Analysis: {analysis}

Write the bio in FIRST PERSON (using "I", "my", "me"). The artist is speaking about themselves. Start with "I explore" or "I create" or "My art" or similar. Be creative and inspiring."""

                response = requests.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {groq_token}',
                        'Content-Type': 'application/json'
                    },
                    json={
                        'model': 'llama-3.1-8b-instant',  # Current active model (fast and good)
                        'messages': [
                            {'role': 'system', 'content': 'You are a creative art critic who writes inspiring, short artist bios.'},
                            {'role': 'user', 'content': prompt}
                        ],
                        'max_tokens': 150,
                        'temperature': 0.7
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    bio = data['choices'][0]['message']['content'].strip()
                    
                    # Clean up quotes if present
                    if bio.startswith('"') and bio.endswith('"'):
                        bio = bio[1:-1]
                    
                    bio_generated = True
                    logger.info(f"Generated Groq bio for user {user_id}: {bio[:50]}...")
                else:
                    logger.warning(f"Groq API error {response.status_code}: {response.text[:200]}")
            
            except Exception as e:
                logger.warning(f"Groq bio generation failed: {str(e)}")
        
        # Try Hugging Face as fallback
        if not bio_generated and hf_token:
            try:
                logger.info(f"Using Hugging Face to generate bio for user {user_id}")
                
                prompt = f"""Write a short artist bio (max 60 words) based on this analysis:
{analysis}

Bio:"""

                # Use a good text generation model
                models_to_try = [
                    "mistralai/Mistral-7B-Instruct-v0.1",
                    "google/flan-t5-large",
                ]
                
                for model_name in models_to_try:
                    try:
                        response = requests.post(
                            f'https://api-inference.huggingface.co/models/{model_name}',
                            headers={'Authorization': f'Bearer {hf_token}'},
                            json={
                                'inputs': prompt,
                                'parameters': {
                                    'max_new_tokens': 100,
                                    'temperature': 0.7,
                                    'top_p': 0.9,
                                    'do_sample': True
                                }
                            },
                            timeout=30
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            if isinstance(data, list) and len(data) > 0:
                                bio_text = data[0].get('generated_text', '')
                            elif isinstance(data, dict):
                                bio_text = data.get('generated_text', '')
                            else:
                                bio_text = str(data)
                            
                            # Clean up the bio
                            if 'Bio:' in bio_text:
                                bio = bio_text.split('Bio:')[-1].strip()
                            else:
                                bio = bio_text.replace(prompt, '').strip()
                            
                            if '\n' in bio:
                                bio = bio.split('\n')[0]
                            
                            if len(bio) > 500:
                                bio = bio[:497] + "..."
                            
                            if bio and len(bio) > 20:
                                bio_generated = True
                                logger.info(f"Generated HF bio for user {user_id}: {bio[:50]}...")
                                break
                        elif response.status_code == 503:
                            logger.warning(f"Model {model_name} is loading, trying next...")
                            continue
                    except Exception as e:
                        logger.warning(f"Error with {model_name}: {str(e)}")
                        continue
            
            except Exception as e:
                logger.warning(f"Hugging Face bio generation failed: {str(e)}")
        
        # Fallback: Template-based bio generation
        if not bio_generated:
            logger.info(f"Using template-based bio for user {user_id}")
            
            # Build bio from templates (FIRST PERSON)
            if common_tags:
                top_themes = ' and '.join([tag for tag, _ in common_tags[:2]])
                bio = f"I explore {top_themes} with a unique creative vision. "
            else:
                bio = "My art showcases a diverse range of creative expressions. "
            
            if generation_types.get('ai_prompt', 0) > generation_types.get('algorithmic', 0):
                bio += "I blend AI-generated imagery with artistic intuition."
            elif generation_types.get('algorithmic', 0) > 0:
                bio += "I combine algorithmic patterns with creative design."
            else:
                bio += "I experiment with various generation techniques."
        
        # Ensure bio is not too long
        if len(bio) > 500:
            bio = bio[:497] + "..."
        
        # Save to profile
        profile.ai_bio = bio
        profile.ai_bio_generated_at = timezone.now()
        profile.save(update_fields=['ai_bio', 'ai_bio_generated_at'])
        
        logger.info(f"Generated bio for user {user_id}: {bio[:100]}...")
        
        return {
            'status': 'success',
            'user_id': user_id,
            'bio': bio,
            'method': 'groq' if (bio_generated and groq_token) else ('huggingface' if (bio_generated and hf_token) else 'template')
        }
    
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return {'status': 'error', 'message': 'User not found'}
    
    except Exception as exc:
        logger.error(f"Error generating bio for user {user_id}: {str(exc)}")
        
        # Retry if possible
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying bio generation for user {user_id} - Attempt {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(exc=exc)
        
        return {'status': 'error', 'message': str(exc)}


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def generate_artist_personality(self, user_id):
    """
    Generate AI-powered artist personality type based on user's artwork analysis.
    
    Analyzes the user's artworks (themes, styles, techniques, patterns) and generates
    a personality archetype like "The Bold Experimenter" or "The Geometric Mystic"
    with a detailed description of their creative approach.
    
    Args:
        user_id: ID of the User instance
    
    Returns:
        dict: Result with status, personality type, and description
    """
    try:
        from django.contrib.auth.models import User
        from django.conf import settings
        import requests
        from collections import Counter
        import json
        
        logger.info(f"Generating artist personality for user {user_id}")
        
        # Fetch user and profile
        user = User.objects.get(id=user_id)
        profile = user.profile
        
        # Get user's artworks
        artworks = Artwork.objects.filter(user=user, status='completed').order_by('-created_at')[:30]
        
        if not artworks.exists():
            personality = json.dumps({
                "type": "The Creative Beginner",
                "description": "You're at the start of an exciting artistic journey. Every creation is an opportunity to discover your unique voice and style."
            })
            profile.artist_personality = personality
            profile.artist_personality_generated_at = timezone.now()
            profile.save(update_fields=['artist_personality', 'artist_personality_generated_at'])
            return {'status': 'success', 'personality': personality, 'method': 'default'}
        
        # Collect artwork data for analysis
        prompts = [a.prompt for a in artworks if a.prompt]
        ai_tags = []
        for a in artworks:
            if a.ai_tags:
                ai_tags.extend(a.ai_tags)
        
        # Analyze patterns
        generation_types = Counter([a.generation_type for a in artworks])
        ai_providers = Counter([a.ai_provider for a in artworks if a.ai_provider])
        common_tags = Counter(ai_tags).most_common(10)
        algorithm_names = Counter([a.algorithm_name for a in artworks if a.algorithm_name])
        
        # Count artworks by time of creation (if available)
        creation_hours = [a.created_at.hour for a in artworks]
        night_creations = sum(1 for h in creation_hours if h >= 22 or h <= 5)
        
        # Build analysis text for AI
        analysis = f"Artist has created {artworks.count()} artworks. "
        
        # Generation preferences
        if generation_types:
            top_gen_type = generation_types.most_common(1)[0]
            analysis += f"Primary generation method: {top_gen_type[0]} ({top_gen_type[1]} artworks). "
        
        # Themes and subjects
        if common_tags:
            top_themes = ', '.join([tag for tag, _ in common_tags[:5]])
            analysis += f"Recurring themes: {top_themes}. "
        
        # Algorithmic preferences
        if algorithm_names:
            top_algo = algorithm_names.most_common(1)[0][0]
            analysis += f"Favorite algorithmic pattern: {top_algo}. "
        
        # Creative patterns
        if night_creations > len(artworks) * 0.4:
            analysis += "Often creates late at night. "
        
        # Sample prompts for style analysis
        if prompts:
            sample_prompts = ' | '.join(prompts[:3])
            analysis += f"Sample creative prompts: {sample_prompts}. "
        
        # AI generation using Groq
        groq_token = getattr(settings, 'GROQ_API_KEY', '')
        hf_token = getattr(settings, 'HUGGINGFACE_TOKEN', '')
        personality_generated = False
        personality_data = {}
        
        # Try Groq first (FREE and FAST!)
        if groq_token:
            try:
                logger.info(f"Using Groq AI to generate personality for user {user_id}")
                
                prompt = f"""Based on this artist's work analysis, create an artist personality profile.

Analysis: {analysis}

Generate a JSON response with exactly this structure:
{{
  "type": "The [Adjective] [Noun]",
  "description": "A 2-3 sentence description of their creative approach, personality, and artistic vision. Use 'you' to address them."
}}

Examples of personality types: "The Bold Experimenter", "The Geometric Mystic", "The Color Alchemist", "The Digital Dreamer", "The Abstract Philosopher", "The Pattern Weaver"

Make it inspiring, unique, and accurately reflect their actual artwork patterns. Response must be valid JSON only."""

                response = requests.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {groq_token}',
                        'Content-Type': 'application/json'
                    },
                    json={
                        'model': 'llama-3.1-8b-instant',
                        'messages': [
                            {'role': 'system', 'content': 'You are an art psychologist who creates inspiring artist personality profiles. Always respond with valid JSON only.'},
                            {'role': 'user', 'content': prompt}
                        ],
                        'max_tokens': 200,
                        'temperature': 0.8
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    personality_text = data['choices'][0]['message']['content'].strip()
                    
                    # Clean up markdown code blocks if present
                    if '```json' in personality_text:
                        personality_text = personality_text.split('```json')[1].split('```')[0].strip()
                    elif '```' in personality_text:
                        personality_text = personality_text.split('```')[1].split('```')[0].strip()
                    
                    # Parse JSON
                    try:
                        personality_data = json.loads(personality_text)
                        if 'type' in personality_data and 'description' in personality_data:
                            personality_generated = True
                            logger.info(f"Generated Groq personality for user {user_id}: {personality_data['type']}")
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse JSON from Groq response: {personality_text[:100]}")
                else:
                    logger.warning(f"Groq API error {response.status_code}: {response.text[:200]}")
            
            except Exception as e:
                logger.warning(f"Groq personality generation failed: {str(e)}")
        
        # Try Hugging Face as fallback
        if not personality_generated and hf_token:
            try:
                logger.info(f"Using Hugging Face to generate personality for user {user_id}")
                
                prompt = f"""Based on this analysis, create an artist personality:
{analysis}

Format:
Type: The [Adjective] [Noun]
Description: 2 sentences about their creative style."""

                response = requests.post(
                    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
                    headers={'Authorization': f'Bearer {hf_token}'},
                    json={
                        'inputs': prompt,
                        'parameters': {
                            'max_new_tokens': 150,
                            'temperature': 0.8,
                            'top_p': 0.9,
                            'do_sample': True
                        }
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        result_text = data[0].get('generated_text', '')
                    else:
                        result_text = str(data)
                    
                    # Parse type and description
                    lines = result_text.split('\n')
                    personality_type = None
                    personality_desc = None
                    
                    for line in lines:
                        if 'Type:' in line or 'type:' in line:
                            personality_type = line.split(':', 1)[1].strip()
                        elif 'Description:' in line or 'description:' in line:
                            personality_desc = line.split(':', 1)[1].strip()
                    
                    if personality_type and personality_desc:
                        personality_data = {
                            'type': personality_type,
                            'description': personality_desc
                        }
                        personality_generated = True
                        logger.info(f"Generated HF personality for user {user_id}: {personality_type}")
            
            except Exception as e:
                logger.warning(f"Hugging Face personality generation failed: {str(e)}")
        
        # Fallback: Template-based personality generation
        if not personality_generated:
            logger.info(f"Using template-based personality for user {user_id}")
            
            # Determine personality type based on patterns
            if generation_types.get('algorithmic', 0) > generation_types.get('ai_prompt', 0):
                p_type = "The Algorithmic Architect"
                p_desc = "You craft intricate patterns through code and mathematics, finding beauty in the precision of algorithms. Your work reveals a deep appreciation for structure and computational artistry."
            elif generation_types.get('hybrid', 0) > 0:
                p_type = "The Fusion Innovator"
                p_desc = "You seamlessly blend AI creativity with algorithmic precision, creating unique hybrid artworks. Your experimental approach pushes the boundaries of generative art."
            elif 'abstract' in [tag for tag, _ in common_tags[:3]]:
                p_type = "The Abstract Visionary"
                p_desc = "You explore the realm of abstract expression, transforming concepts into visual experiences. Your work invites viewers to find their own meaning in shapes, colors, and forms."
            elif 'geometric' in [tag for tag, _ in common_tags[:3]]:
                p_type = "The Geometric Sage"
                p_desc = "You find harmony in geometry and mathematical beauty. Your compositions balance precision with creativity, revealing the elegant patterns that underlie visual art."
            elif night_creations > len(artworks) * 0.4:
                p_type = "The Midnight Creator"
                p_desc = "You create in the quiet hours when the world sleeps, channeling nocturnal inspiration into your art. Your work carries a unique energy born from late-night creativity."
            else:
                p_type = "The Digital Artist"
                p_desc = "You embrace the possibilities of AI-generated art, exploring new frontiers in digital creativity. Your work represents the exciting intersection of technology and artistic vision."
            
            personality_data = {
                'type': p_type,
                'description': p_desc
            }
        
        # Save to profile as JSON string
        personality_json = json.dumps(personality_data)
        profile.artist_personality = personality_json
        profile.artist_personality_generated_at = timezone.now()
        profile.save(update_fields=['artist_personality', 'artist_personality_generated_at'])
        
        logger.info(f"Generated personality for user {user_id}: {personality_data['type']}")
        
        return {
            'status': 'success',
            'user_id': user_id,
            'personality': personality_data,
            'method': 'groq' if (personality_generated and groq_token) else ('huggingface' if (personality_generated and hf_token) else 'template')
        }
    
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return {'status': 'error', 'message': 'User not found'}
    
    except Exception as exc:
        logger.error(f"Error generating personality for user {user_id}: {str(exc)}")
        
        # Retry if possible
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying personality generation for user {user_id} - Attempt {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(exc=exc)
        
        return {'status': 'error', 'message': str(exc)}


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def analyze_skill_progression(self, user_id):
    """
    Analyze user's artistic skill progression across multiple dimensions.
    
    Evaluates and scores the user across 5 key artistic skills:
    1. Composition - Layout, balance, focal points
    2. Color Theory - Color harmony, palette choices
    3. Creativity - Originality, experimentation
    4. Complexity - Detail level, intricacy
    5. Technical Skill - Execution quality, mastery
    
    Each skill gets:
    - Score (0-100)
    - Level (Beginner/Intermediate/Advanced/Expert)
    - Growth percentage (compared to previous analysis)
    
    Args:
        user_id: ID of the User instance
    
    Returns:
        dict: Result with status and skill analysis data
    """
    try:
        from django.contrib.auth.models import User
        from django.conf import settings
        from collections import Counter
        from datetime import timedelta
        import requests
        import json
        from PIL import Image
        import numpy as np
        
        logger.info(f"Analyzing skills for user {user_id}")
        
        # Fetch user and profile
        user = User.objects.get(id=user_id)
        profile = user.profile
        
        # Get user's artworks (more recent for current skill, older for growth comparison)
        recent_artworks = Artwork.objects.filter(
            user=user, 
            status='completed'
        ).order_by('-created_at')[:20]
        
        if not recent_artworks.exists():
            skill_data = {
                "composition": {"score": 0, "level": "Beginner", "growth": 0},
                "color_theory": {"score": 0, "level": "Beginner", "growth": 0},
                "creativity": {"score": 0, "level": "Beginner", "growth": 0},
                "complexity": {"score": 0, "level": "Beginner", "growth": 0},
                "technical_skill": {"score": 0, "level": "Beginner", "growth": 0},
                "overall_score": 0,
                "message": "Create more artworks to unlock skill analysis!"
            }
            profile.skill_analysis = skill_data
            profile.skill_analysis_updated_at = timezone.now()
            profile.save(update_fields=['skill_analysis', 'skill_analysis_updated_at'])
            return {'status': 'success', 'skills': skill_data, 'method': 'default'}
        
        # Collect artwork metadata for analysis
        total_artworks = recent_artworks.count()
        
        # 1. Analyze Generation Diversity (proxy for Creativity)
        generation_types = Counter([a.generation_type for a in recent_artworks])
        ai_providers = Counter([a.ai_provider for a in recent_artworks if a.ai_provider])
        algorithms = Counter([a.algorithm_name for a in recent_artworks if a.algorithm_name])
        
        diversity_score = len(generation_types) + len(ai_providers) + len(algorithms)
        creativity_score = min(100, (diversity_score / 10) * 100)  # Normalize
        
        # 2. Analyze Prompt Complexity (proxy for Technical Skill & Creativity)
        prompts = [a.prompt for a in recent_artworks if a.prompt]
        avg_prompt_length = sum(len(p) for p in prompts) / len(prompts) if prompts else 0
        unique_words = len(set(' '.join(prompts).lower().split())) if prompts else 0
        
        technical_score = min(100, (avg_prompt_length / 200) * 50 + (unique_words / 100) * 50)
        
        # 3. Analyze Tags Diversity (proxy for Complexity & Color Theory)
        all_tags = []
        for a in recent_artworks:
            if a.ai_tags:
                all_tags.extend(a.ai_tags)
        
        tag_diversity = len(set(all_tags))
        complexity_score = min(100, (tag_diversity / 30) * 100)
        
        # Check for color-related tags
        color_tags = [t for t in all_tags if t in [
            'colorful', 'vibrant', 'monochrome', 'gradient', 'neon', 
            'pastel', 'warm', 'cool', 'complementary', 'harmony'
        ]]
        color_theory_score = min(100, (len(color_tags) / total_artworks) * 100)
        
        # 4. Image Analysis for Composition (if images available)
        composition_score = 50  # Default mid-range
        
        try:
            # Analyze first 5 artworks with images
            artworks_with_images = [a for a in recent_artworks if a.image][:5]
            if artworks_with_images:
                composition_scores = []
                
                for artwork in artworks_with_images:
                    try:
                        img = Image.open(artwork.image.path)
                        img_array = np.array(img)
                        
                        # Simple composition metrics
                        # 1. Check for balanced color distribution
                        if len(img_array.shape) == 3:
                            color_std = np.std(img_array, axis=(0, 1))
                            balance_score = 100 - min(100, np.mean(color_std))
                        else:
                            balance_score = 50
                        
                        # 2. Check for focal point (center vs edges intensity)
                        h, w = img_array.shape[:2]
                        center_region = img_array[h//4:3*h//4, w//4:3*w//4]
                        center_intensity = np.mean(center_region)
                        edge_intensity = np.mean(img_array) - center_intensity
                        focal_score = min(100, abs(center_intensity - edge_intensity) / 2)
                        
                        comp_score = (balance_score + focal_score) / 2
                        composition_scores.append(comp_score)
                    except Exception as e:
                        logger.warning(f"Failed to analyze image for artwork {artwork.id}: {e}")
                        continue
                
                if composition_scores:
                    composition_score = np.mean(composition_scores)
        except Exception as e:
            logger.warning(f"Image analysis failed for user {user_id}: {e}")
        
        # 5. Use Groq AI for holistic skill assessment
        groq_token = getattr(settings, 'GROQ_API_KEY', '')
        ai_enhanced = False
        
        if groq_token and len(prompts) > 3:
            try:
                logger.info(f"Using Groq AI to enhance skill analysis for user {user_id}")
                
                # Build analysis summary
                analysis = f"""Artist has created {total_artworks} artworks.
Generation types: {dict(generation_types)}
Prompt examples: {' | '.join(prompts[:3])}
Tag diversity: {tag_diversity} unique tags
Common themes: {', '.join([t for t, _ in Counter(all_tags).most_common(5)])}"""

                prompt = f"""Analyze this artist's skill level and provide scores (0-100) for these dimensions:

{analysis}

Respond ONLY with valid JSON in this format:
{{
  "composition": {{"score": 75, "insight": "Shows good balance"}},
  "color_theory": {{"score": 60, "insight": "Experimenting with palettes"}},
  "creativity": {{"score": 85, "insight": "Highly original"}},
  "complexity": {{"score": 70, "insight": "Detailed work"}},
  "technical_skill": {{"score": 65, "insight": "Solid execution"}}
}}

Be realistic and encouraging. Scores should range from 40-95."""

                response = requests.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {groq_token}',
                        'Content-Type': 'application/json'
                    },
                    json={
                        'model': 'llama-3.1-8b-instant',
                        'messages': [
                            {'role': 'system', 'content': 'You are an art instructor who evaluates artists fairly and provides constructive insights. Always respond with valid JSON only.'},
                            {'role': 'user', 'content': prompt}
                        ],
                        'max_tokens': 300,
                        'temperature': 0.7
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    skill_text = data['choices'][0]['message']['content'].strip()
                    
                    # Clean up markdown
                    if '```json' in skill_text:
                        skill_text = skill_text.split('```json')[1].split('```')[0].strip()
                    elif '```' in skill_text:
                        skill_text = skill_text.split('```')[1].split('```')[0].strip()
                    
                    # Parse JSON
                    try:
                        ai_skills = json.loads(skill_text)
                        # Override with AI scores if valid
                        if 'composition' in ai_skills:
                            composition_score = ai_skills['composition']['score']
                        if 'color_theory' in ai_skills:
                            color_theory_score = ai_skills['color_theory']['score']
                        if 'creativity' in ai_skills:
                            creativity_score = ai_skills['creativity']['score']
                        if 'complexity' in ai_skills:
                            complexity_score = ai_skills['complexity']['score']
                        if 'technical_skill' in ai_skills:
                            technical_score = ai_skills['technical_skill']['score']
                        
                        ai_enhanced = True
                        logger.info(f"Enhanced skill analysis with Groq AI for user {user_id}")
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse Groq skill response: {skill_text[:100]}")
            except Exception as e:
                logger.warning(f"Groq skill analysis failed: {e}")
        
        # Calculate growth (compare with previous analysis if exists)
        previous_analysis = profile.skill_analysis or {}
        
        def get_growth(current, skill_name):
            if previous_analysis and skill_name in previous_analysis:
                prev_score = previous_analysis[skill_name].get('score', 0)
                if prev_score > 0:
                    return round(((current - prev_score) / prev_score) * 100, 1)
            return 0
        
        # Assign skill levels based on scores
        def get_level(score):
            if score >= 80:
                return "Expert"
            elif score >= 60:
                return "Advanced"
            elif score >= 40:
                return "Intermediate"
            else:
                return "Beginner"
        
        # Build final skill analysis
        skill_data = {
            "composition": {
                "score": round(composition_score),
                "level": get_level(composition_score),
                "growth": get_growth(composition_score, 'composition')
            },
            "color_theory": {
                "score": round(color_theory_score),
                "level": get_level(color_theory_score),
                "growth": get_growth(color_theory_score, 'color_theory')
            },
            "creativity": {
                "score": round(creativity_score),
                "level": get_level(creativity_score),
                "growth": get_growth(creativity_score, 'creativity')
            },
            "complexity": {
                "score": round(complexity_score),
                "level": get_level(complexity_score),
                "growth": get_growth(complexity_score, 'complexity')
            },
            "technical_skill": {
                "score": round(technical_score),
                "level": get_level(technical_score),
                "growth": get_growth(technical_score, 'technical_skill')
            },
            "overall_score": round((composition_score + color_theory_score + creativity_score + complexity_score + technical_score) / 5),
            "total_artworks_analyzed": total_artworks,
            "ai_enhanced": ai_enhanced
        }
        
        # Save to profile
        profile.skill_analysis = skill_data
        profile.skill_analysis_updated_at = timezone.now()
        profile.save(update_fields=['skill_analysis', 'skill_analysis_updated_at'])
        
        logger.info(f"Skill analysis complete for user {user_id}: Overall {skill_data['overall_score']}/100")
        
        return {
            'status': 'success',
            'user_id': user_id,
            'skills': skill_data,
            'method': 'groq' if ai_enhanced else 'algorithmic'
        }
    
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return {'status': 'error', 'message': 'User not found'}
    
    except Exception as exc:
        logger.error(f"Error analyzing skills for user {user_id}: {str(exc)}")
        
        # Retry if possible
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying skill analysis for user {user_id} - Attempt {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(exc=exc)
        
        return {'status': 'error', 'message': str(exc)}


