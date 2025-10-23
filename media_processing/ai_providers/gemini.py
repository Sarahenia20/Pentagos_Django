"""
Google Gemini 2.5 Flash Image Generation Integration
Based on: https://github.com/JimmyLv/awesome-nano-banana
"""
import google.generativeai as genai
from django.conf import settings
from PIL import Image
import io
import base64
import requests


class GeminiImageGenerator:
    """
    Gemini 2.5 Flash Image generation (aka "nano-banana")
    FREE tier available!
    """

    def __init__(self):
        """Initialize Gemini with API key from settings"""
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured in settings")

        genai.configure(api_key=api_key)
        # Use Gemini 2.5 Flash Image model
        self.model = genai.GenerativeModel('gemini-2.5-flash-image')

    def generate_image(self, prompt, image_size='1024x1024', **kwargs):
        """
        Generate an image from a text prompt

        Args:
            prompt (str): Text description of the image to generate
            image_size (str): Size like '1024x1024', '1024x1792', etc.
            **kwargs: Additional parameters

        Returns:
            PIL.Image: Generated image

        Raises:
            Exception: If generation fails
        """
        try:
            # Parse image size
            width, height = map(int, image_size.split('x'))

            # Enhanced prompt for better results
            enhanced_prompt = f"{prompt}. High quality, detailed, professional."

            # Generate image using Gemini
            response = self.model.generate_content([enhanced_prompt])

            # Extract image from response
            # Note: Actual implementation depends on Gemini API response format
            # This is a placeholder - will need to adapt based on API docs

            if hasattr(response, 'parts'):
                for part in response.parts:
                    if hasattr(part, 'inline_data'):
                        # Image data is in inline_data
                        image_data = part.inline_data.data
                        image = Image.open(io.BytesIO(image_data))

                        # Resize if needed
                        if image.size != (width, height):
                            image = image.resize((width, height), Image.LANCZOS)

                        return image

            raise Exception("No image data in Gemini response")

        except Exception as e:
            raise Exception(f"Gemini image generation failed: {str(e)}")

    def edit_image(self, base_image, prompt, **kwargs):
        """
        Edit an existing image with a prompt (future feature)

        Args:
            base_image (PIL.Image): Base image to edit
            prompt (str): Edit instructions

        Returns:
            PIL.Image: Edited image
        """
        # Gemini 2.5 Flash supports image editing
        # Implementation TBD based on your needs
        raise NotImplementedError("Image editing coming soon!")

    def generate_variations(self, base_image, count=4, **kwargs):
        """
        Generate variations of an image (future feature)

        Args:
            base_image (PIL.Image): Base image
            count (int): Number of variations

        Returns:
            list[PIL.Image]: List of variation images
        """
        raise NotImplementedError("Variations coming soon!")


# Helper function for easy usage
def generate_with_gemini(prompt, image_size='1024x1024', **kwargs):
    """
    Quick helper to generate image with Gemini

    Usage:
        image = generate_with_gemini("A beautiful sunset over mountains")
    """
    generator = GeminiImageGenerator()
    return generator.generate_image(prompt, image_size, **kwargs)
