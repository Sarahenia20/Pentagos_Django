"""
FUTURISTIC CLOUDINARY INTEGRATION
==================================
Features:
- AI-powered image optimization
- Advanced transformations and effects
- Video support
- Lazy loading and responsive images
- CDN delivery optimization
- Batch uploads
- Image analysis and tagging
- NFT metadata generation
- Watermarking and protection
"""

import cloudinary
import cloudinary.uploader
import cloudinary.api
from cloudinary.utils import cloudinary_url
from decouple import config
from PIL import Image
import io
import asyncio
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum
from dataclasses import dataclass
import hashlib
import json


class ImageFormat(str, Enum):
    """Supported image formats"""
    AUTO = "auto"  # Cloudinary auto-selects best format
    WEBP = "webp"
    AVIF = "avif"
    PNG = "png"
    JPG = "jpg"
    GIF = "gif"


class ImageQuality(str, Enum):
    """Quality presets"""
    AUTO_BEST = "auto:best"
    AUTO_GOOD = "auto:good"
    AUTO_ECO = "auto:eco"
    HIGH = "100"
    MEDIUM = "80"
    LOW = "60"


class TransformationPreset(str, Enum):
    """Predefined transformation presets"""
    THUMBNAIL = "thumbnail"
    AVATAR = "avatar"
    BANNER = "banner"
    SOCIAL_POST = "social_post"
    NFT_DISPLAY = "nft_display"
    PRINT_QUALITY = "print_quality"


@dataclass
class UploadResult:
    """Enhanced upload result with metadata"""
    url: str
    secure_url: str
    public_id: str
    format: str
    width: int
    height: int
    bytes: int
    asset_id: str
    version: int
    responsive_urls: Dict[str, str]
    ai_tags: List[str]
    colors: List[Dict[str, Any]]
    metadata: Dict[str, Any]


@dataclass
class TransformationOptions:
    """Comprehensive transformation options"""
    width: Optional[int] = None
    height: Optional[int] = None
    crop: str = "fill"
    quality: ImageQuality = ImageQuality.AUTO_BEST
    format: ImageFormat = ImageFormat.AUTO
    effect: Optional[str] = None
    overlay: Optional[str] = None
    background: Optional[str] = None
    angle: Optional[int] = None
    border: Optional[str] = None
    radius: Optional[str] = None
    opacity: Optional[int] = None
    watermark: Optional[str] = None


class CloudinaryManager:
    """
    Advanced Cloudinary manager with futuristic features
    """
    
    def __init__(self):
        """Initialize Cloudinary configuration"""
        self.cloud_name = config('CLOUDINARY_CLOUD_NAME', default='')
        self.api_key = config('CLOUDINARY_API_KEY', default='')
        self.api_secret = config('CLOUDINARY_API_SECRET', default='')
        
        if not all([self.cloud_name, self.api_key, self.api_secret]):
            raise ValueError("Cloudinary credentials not fully configured")
        
        cloudinary.config(
            cloud_name=self.cloud_name,
            api_key=self.api_key,
            api_secret=self.api_secret,
            secure=True
        )
        
        self.upload_cache = {}
    
    async def upload_image(
        self,
        image_source: Any,
        folder: str = "pentaart/artworks",
        public_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        context: Optional[Dict[str, str]] = None,
        transformation: Optional[TransformationOptions] = None,
        use_ai_tags: bool = True,
        use_ai_colors: bool = True,
        generate_responsive: bool = True,
        overwrite: bool = False,
        **kwargs
    ) -> UploadResult:
        """
        Upload image with advanced options and AI analysis
        
        Args:
            image_source: File path, PIL Image, or bytes
            folder: Cloudinary folder path
            public_id: Custom public ID
            tags: Custom tags
            context: Custom metadata
            transformation: Transformation options
            use_ai_tags: Enable AI auto-tagging
            use_ai_colors: Extract dominant colors
            generate_responsive: Generate responsive breakpoints
            overwrite: Overwrite existing file
            
        Returns:
            UploadResult with enhanced metadata
        """
        try:
            # Convert PIL Image to bytes if needed
            if isinstance(image_source, Image.Image):
                img_bytes = io.BytesIO()
                image_source.save(img_bytes, format='PNG', quality=95)
                img_bytes.seek(0)
                upload_source = img_bytes
            else:
                upload_source = image_source
            
            # Build upload options
            upload_options = {
                'folder': folder,
                'resource_type': 'image',
                'overwrite': overwrite,
                'unique_filename': not public_id,
                'use_filename': True,
                'quality_analysis': True,
            }
            
            if public_id:
                upload_options['public_id'] = public_id
            
            if tags:
                upload_options['tags'] = tags
            
            if context:
                upload_options['context'] = context
            
            # Enable AI features
            if use_ai_tags:
                upload_options['categorization'] = 'google_tagging'
                upload_options['auto_tagging'] = 0.7  # Confidence threshold
            
            if use_ai_colors:
                upload_options['colors'] = True
            
            # Generate responsive breakpoints
            if generate_responsive:
                upload_options['responsive_breakpoints'] = {
                    'create_derived': True,
                    'bytes_step': 20000,
                    'min_width': 200,
                    'max_width': 2000,
                    'max_images': 10,
                }
            
            # Apply eager transformations
            if transformation:
                upload_options['eager'] = [self._build_transformation(transformation)]
                upload_options['eager_async'] = True
            
            # Merge additional kwargs
            upload_options.update(kwargs)
            
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(upload_source, **upload_options)
            
            # Generate responsive URLs
            responsive_urls = {}
            if generate_responsive and 'responsive_breakpoints' in result:
                for bp in result['responsive_breakpoints']:
                    for breakpoint in bp['breakpoints']:
                        width = breakpoint['width']
                        responsive_urls[f'w_{width}'] = breakpoint['secure_url']
            
            # Extract AI tags
            ai_tags = []
            if 'tags' in result:
                ai_tags = result['tags']
            
            # Extract colors
            colors = []
            if 'colors' in result:
                colors = result['colors']
            
            # Build enhanced result
            upload_result = UploadResult(
                url=result['url'],
                secure_url=result['secure_url'],
                public_id=result['public_id'],
                format=result['format'],
                width=result['width'],
                height=result['height'],
                bytes=result['bytes'],
                asset_id=result.get('asset_id', ''),
                version=result['version'],
                responsive_urls=responsive_urls,
                ai_tags=ai_tags,
                colors=colors,
                metadata={
                    'created_at': result['created_at'],
                    'resource_type': result['resource_type'],
                    'type': result['type'],
                }
            )
            
            # Cache result
            cache_key = self._get_cache_key(image_source)
            self.upload_cache[cache_key] = upload_result
            
            return upload_result
            
        except Exception as e:
            raise Exception(f"Cloudinary upload failed: {str(e)}")
    
    async def upload_batch(
        self,
        images: List[Any],
        **kwargs
    ) -> List[UploadResult]:
        """
        Upload multiple images in parallel
        
        Args:
            images: List of image sources
            **kwargs: Same options as upload_image
            
        Returns:
            List of UploadResult objects
        """
        tasks = [
            self.upload_image(img, **kwargs)
            for img in images
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors
        successful_results = [
            r for r in results
            if isinstance(r, UploadResult)
        ]
        
        return successful_results
    
    def get_optimized_url(
        self,
        public_id: str,
        transformation: Optional[TransformationOptions] = None,
        preset: Optional[TransformationPreset] = None,
        device_pixel_ratio: float = 1.0,
    ) -> str:
        """
        Get optimized URL with transformations
        
        Args:
            public_id: Cloudinary public ID
            transformation: Custom transformation options
            preset: Predefined transformation preset
            device_pixel_ratio: DPR for retina displays
            
        Returns:
            Optimized Cloudinary URL
        """
        # Use preset if provided
        if preset:
            transformation = self._get_preset_transformation(preset)
        
        # Build transformation dict
        trans_dict = {}
        if transformation:
            trans_dict = self._build_transformation(transformation)
        
        # Add DPR for retina displays
        if device_pixel_ratio > 1.0:
            trans_dict['dpr'] = device_pixel_ratio
        
        # Generate URL
        url, _ = cloudinary_url(
            public_id,
            **trans_dict,
            secure=True,
        )
        
        return url
    
    def get_responsive_urls(
        self,
        public_id: str,
        breakpoints: List[int] = [320, 640, 768, 1024, 1280, 1920],
        transformation: Optional[TransformationOptions] = None,
    ) -> Dict[str, str]:
        """
        Generate responsive URLs for different breakpoints
        
        Args:
            public_id: Cloudinary public ID
            breakpoints: List of width breakpoints
            transformation: Base transformation to apply
            
        Returns:
            Dictionary of breakpoint -> URL
        """
        urls = {}
        
        for width in breakpoints:
            # Clone transformation and set width
            trans = transformation or TransformationOptions()
            trans.width = width
            
            url = self.get_optimized_url(public_id, trans)
            urls[f'w_{width}'] = url
        
        return urls
    
    def add_watermark(
        self,
        public_id: str,
        watermark_text: Optional[str] = None,
        watermark_image: Optional[str] = None,
        position: str = "south_east",
        opacity: int = 50,
    ) -> str:
        """
        Add watermark to image
        
        Args:
            public_id: Image public ID
            watermark_text: Text watermark
            watermark_image: Image overlay public ID
            position: Watermark position
            opacity: Watermark opacity (0-100)
            
        Returns:
            URL with watermark
        """
        trans_dict = {
            'overlay': {},
            'gravity': position,
            'opacity': opacity,
        }
        
        if watermark_text:
            trans_dict['overlay'] = {
                'text': watermark_text,
                'font_family': 'Arial',
                'font_size': 20,
            }
        elif watermark_image:
            trans_dict['overlay'] = watermark_image
        
        url, _ = cloudinary_url(public_id, **trans_dict, secure=True)
        return url
    
    def apply_ai_effects(
        self,
        public_id: str,
        effect_type: str = "improve",
        strength: int = 50,
    ) -> str:
        """
        Apply AI-powered effects
        
        Args:
            public_id: Image public ID
            effect_type: Effect to apply
                - improve: AI enhancement
                - cartoonify: Cartoon effect
                - outline: Edge detection
                - pixelate: Pixelation
                - blur: Blur effect
                - sharpen: Sharpen
            strength: Effect strength (0-100)
            
        Returns:
            URL with AI effect
        """
        effect_map = {
            'improve': f'improve:{strength}',
            'cartoonify': 'cartoonify',
            'outline': f'outline:{strength}',
            'pixelate': f'pixelate:{strength}',
            'blur': f'blur:{strength}',
            'sharpen': f'sharpen:{strength}',
        }
        
        effect = effect_map.get(effect_type, 'improve')
        
        url, _ = cloudinary_url(
            public_id,
            effect=effect,
            secure=True
        )
        
        return url
    
    def generate_nft_metadata(
        self,
        public_id: str,
        name: str,
        description: str,
        attributes: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generate NFT-compatible metadata
        
        Args:
            public_id: Image public ID
            name: NFT name
            description: NFT description
            attributes: NFT attributes/traits
            
        Returns:
            NFT metadata JSON
        """
        # Get optimized high-res URL
        image_url = self.get_optimized_url(
            public_id,
            transformation=TransformationOptions(
                width=2048,
                height=2048,
                quality=ImageQuality.HIGH,
                format=ImageFormat.PNG,
            )
        )
        
        # Build metadata
        metadata = {
            'name': name,
            'description': description,
            'image': image_url,
            'external_url': f'https://pentaart.io/artwork/{public_id}',
            'attributes': attributes or [],
        }
        
        return metadata
    
    def analyze_image(self, public_id: str) -> Dict[str, Any]:
        """
        Analyze image using Cloudinary AI
        
        Args:
            public_id: Image public ID
            
        Returns:
            Analysis results including tags, colors, faces
        """
        try:
            resource = cloudinary.api.resource(
                public_id,
                colors=True,
                faces=True,
                image_metadata=True,
                quality_analysis=True,
            )
            
            return {
                'tags': resource.get('tags', []),
                'colors': resource.get('colors', []),
                'faces': resource.get('faces', []),
                'quality_score': resource.get('quality_analysis', {}).get('focus', 0),
                'width': resource['width'],
                'height': resource['height'],
                'format': resource['format'],
                'bytes': resource['bytes'],
            }
        except Exception as e:
            raise Exception(f"Image analysis failed: {str(e)}")
    
    def delete_image(self, public_id: str) -> bool:
        """
        Delete image from Cloudinary
        
        Args:
            public_id: Image public ID
            
        Returns:
            Success boolean
        """
        try:
            cloudinary.uploader.destroy(public_id)
            
            # Remove from cache
            cache_keys_to_remove = [
                k for k, v in self.upload_cache.items()
                if v.public_id == public_id
            ]
            for key in cache_keys_to_remove:
                del self.upload_cache[key]
            
            return True
        except Exception as e:
            print(f"Delete failed: {e}")
            return False
    
    def _build_transformation(self, trans: TransformationOptions) -> Dict[str, Any]:
        """Build Cloudinary transformation dictionary"""
        result = {}
        
        if trans.width:
            result['width'] = trans.width
        if trans.height:
            result['height'] = trans.height
        
        result['crop'] = trans.crop
        result['quality'] = trans.quality.value
        result['fetch_format'] = trans.format.value
        
        if trans.effect:
            result['effect'] = trans.effect
        if trans.overlay:
            result['overlay'] = trans.overlay
        if trans.background:
            result['background'] = trans.background
        if trans.angle:
            result['angle'] = trans.angle
        if trans.border:
            result['border'] = trans.border
        if trans.radius:
            result['radius'] = trans.radius
        if trans.opacity:
            result['opacity'] = trans.opacity
        
        return result
    
    def _get_preset_transformation(self, preset: TransformationPreset) -> TransformationOptions:
        """Get predefined transformation preset"""
        presets = {
            TransformationPreset.THUMBNAIL: TransformationOptions(
                width=200,
                height=200,
                crop="fill",
                quality=ImageQuality.AUTO_GOOD,
            ),
            TransformationPreset.AVATAR: TransformationOptions(
                width=128,
                height=128,
                crop="fill",
                radius="max",
                quality=ImageQuality.AUTO_BEST,
            ),
            TransformationPreset.BANNER: TransformationOptions(
                width=1920,
                height=1080,
                crop="fill",
                quality=ImageQuality.AUTO_BEST,
            ),
            TransformationPreset.SOCIAL_POST: TransformationOptions(
                width=1200,
                height=630,
                crop="fill",
                quality=ImageQuality.AUTO_BEST,
            ),
            TransformationPreset.NFT_DISPLAY: TransformationOptions(
                width=2048,
                height=2048,
                crop="pad",
                background="auto",
                quality=ImageQuality.HIGH,
                format=ImageFormat.PNG,
            ),
            TransformationPreset.PRINT_QUALITY: TransformationOptions(
                width=4096,
                height=4096,
                crop="fit",
                quality=ImageQuality.HIGH,
                format=ImageFormat.PNG,
            ),
        }
        
        return presets[preset]
    
    def _get_cache_key(self, source: Any) -> str:
        """Generate cache key for upload source"""
        if isinstance(source, str):
            return hashlib.md5(source.encode()).hexdigest()
        elif isinstance(source, bytes):
            return hashlib.md5(source).hexdigest()
        else:
            return hashlib.md5(str(id(source)).encode()).hexdigest()


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

async def upload_to_cloudinary(
    image_source: Any,
    folder: str = "pentaart/artworks",
    **kwargs
) -> str:
    """
    Quick upload helper (returns URL only)
    
    Usage:
        url = await upload_to_cloudinary(image, folder="artworks")
    """
    manager = CloudinaryManager()
    result = await manager.upload_image(image_source, folder=folder, **kwargs)
    return result.secure_url


def upload_to_cloudinary_sync(image_source: Any, **kwargs) -> str:
    """Synchronous wrapper"""
    return asyncio.run(upload_to_cloudinary(image_source, **kwargs))


# Global manager instance
cloudinary_manager = CloudinaryManager()