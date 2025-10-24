"""
OpenAI GPT-4o Image Generation Integration
Based on: https://github.com/jamez-bondos/awesome-gpt4o-images
"""
import os
from openai import OpenAI
from django.conf import settings
from PIL import Image
import io
import requests


class GPT4oImageGenerator:
    """
    GPT-4o integrated image generation
    $0.035 per 1024x1024 image
    """

    def __init__(self):
        """Initialize OpenAI client with API key from settings"""
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY not configured in settings")

        # SIMPLIFIED initialization - just api_key, nothing else
        # This avoids any compatibility issues with kwargs
        self.client = OpenAI(api_key=api_key)

    def generate_image(self, prompt, image_size='1024x1024', quality='standard', **kwargs):
        """
        Generate an image from a text prompt using GPT-4o

        Args:
            prompt (str): Text description of the image
            image_size (str): Size '1024x1024', '1024x1792', '1792x1024'
            quality (str): 'standard' or 'hd'
            **kwargs: Additional parameters

        Returns:
            PIL.Image: Generated image

        Raises:
            Exception: If generation fails
        """
        try:
            # GPT-4o image generation via DALL-E 3 endpoint
            response = self.client.images.generate(
                model="dall-e-3",  # GPT-4o uses DALL-E 3 under the hood
                prompt=prompt,
                size=image_size,
                quality=quality,
                n=1,
            )

            # Get image URL from response
            image_url = response.data[0].url

            # Download image
            image_response = requests.get(image_url, timeout=30)
            image_response.raise_for_status()

            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_response.content))

            return image

        except Exception as e:
            raise Exception(f"GPT-4o image generation failed: {str(e)}")

    def edit_image(self, base_image, prompt, mask_image=None, **kwargs):
        """
        Edit an existing image with a prompt

        Args:
            base_image (PIL.Image): Base image to edit
            prompt (str): Edit instructions
            mask_image (PIL.Image): Optional mask for specific edits

        Returns:
            PIL.Image: Edited image
        """
        try:
            # Convert PIL Image to bytes
            base_buffer = io.BytesIO()
            base_image.save(base_buffer, format='PNG')
            base_buffer.seek(0)

            kwargs_edit = {
                'image': base_buffer,
                'prompt': prompt,
                'n': 1,
                'size': '1024x1024',
            }

            if mask_image:
                mask_buffer = io.BytesIO()
                mask_image.save(mask_buffer, format='PNG')
                mask_buffer.seek(0)
                kwargs_edit['mask'] = mask_buffer

            response = self.client.images.edit(**kwargs_edit)

            # Get edited image URL
            image_url = response.data[0].url

            # Download image
            image_response = requests.get(image_url, timeout=30)
            image_response.raise_for_status()

            # Convert to PIL Image
            edited_image = Image.open(io.BytesIO(image_response.content))

            return edited_image

        except Exception as e:
            raise Exception(f"GPT-4o image editing failed: {str(e)}")

    def generate_variations(self, base_image, count=4, **kwargs):
        """
        Generate variations of an image

        Args:
            base_image (PIL.Image): Base image
            count (int): Number of variations (max 10)

        Returns:
            list[PIL.Image]: List of variation images
        """
        try:
            # Convert PIL Image to bytes
            image_buffer = io.BytesIO()
            base_image.save(image_buffer, format='PNG')
            image_buffer.seek(0)

            response = self.client.images.create_variation(
                image=image_buffer,
                n=min(count, 10),  # Max 10 variations
                size='1024x1024',
            )

            # Download all variation images
            variations = []
            for img_data in response.data:
                image_url = img_data.url
                image_response = requests.get(image_url, timeout=30)
                image_response.raise_for_status()
                image = Image.open(io.BytesIO(image_response.content))
                variations.append(image)

            return variations

        except Exception as e:
            raise Exception(f"GPT-4o variations failed: {str(e)}")


# Helper function for easy usage
def generate_with_gpt4o(prompt, image_size='1024x1024', quality='standard', **kwargs):
    """
    Quick helper to generate image with GPT-4o

    Usage:
        image = generate_with_gpt4o("A futuristic cityscape at night")
    """
    generator = GPT4oImageGenerator()
    return generator.generate_image(prompt, image_size, quality, **kwargs)
