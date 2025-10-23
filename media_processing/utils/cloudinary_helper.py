"""
Cloudinary upload helper
Only uploads when user clicks "Save"
"""

import cloudinary
import cloudinary.uploader
from decouple import config
from PIL import Image
import io


def upload_to_cloudinary(image_path_or_pil):
    """
    Upload image to Cloudinary

    Args:
        image_path_or_pil: Either file path string or PIL Image

    Returns:
        Cloudinary URL or None if failed
    """
    # Check if Cloudinary is configured
    cloud_name = config('CLOUDINARY_CLOUD_NAME', default='')
    api_key = config('CLOUDINARY_API_KEY', default='')
    api_secret = config('CLOUDINARY_API_SECRET', default='')

    if not all([cloud_name, api_key, api_secret]):
        return None

    # Configure Cloudinary
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret
    )

    try:
        # If PIL Image, convert to bytes
        if isinstance(image_path_or_pil, Image.Image):
            img_bytes = io.BytesIO()
            image_path_or_pil.save(img_bytes, format='JPEG', quality=95)
            img_bytes.seek(0)
            upload_source = img_bytes
        else:
            upload_source = image_path_or_pil

        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            upload_source,
            folder="pentaart/artworks",
            resource_type="image"
        )

        return result.get('secure_url')

    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None
