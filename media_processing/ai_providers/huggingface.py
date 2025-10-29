"""
Hugging Face Stable Diffusion Integration (FREE!)
Models: Stable Diffusion XL, Flux, etc.
"""
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
import torch
from PIL import Image
from django.conf import settings
import os


class HuggingFaceImageGenerator:
    """
    Hugging Face Stable Diffusion - FREE image generation
    Runs locally or via Inference API
    """

    def __init__(self, model_id="stabilityai/stable-diffusion-xl-base-1.0", use_local=True):
        """
        Initialize Stable Diffusion pipeline

        Args:
            model_id (str): Hugging Face model ID
            use_local (bool): Run locally (True) or use Inference API (False)
        """
        self.model_id = model_id
        self.use_local = use_local
        self.pipeline = None

        # If use_local is not explicitly provided, prefer remote inference when
        # an environment HUGGINGFACE_TOKEN is available in Django settings.
        if use_local is None:
            self.use_local = not bool(getattr(settings, 'HUGGINGFACE_TOKEN', None))

        if self.use_local:
            self._init_local_pipeline()
        else:
            # For Inference API, we'll use requests
            self.hf_token = getattr(settings, 'HUGGINGFACE_TOKEN', None)

    def _init_local_pipeline(self):
        """Initialize local Stable Diffusion pipeline"""
        try:
            # Check if CUDA is available
            device = "cuda" if torch.cuda.is_available() else "cpu"

            print(f"🔧 Loading Stable Diffusion model: {self.model_id}")
            print(f"📱 Device: {device}")

            # Load pipeline
            self.pipeline = StableDiffusionPipeline.from_pretrained(
                self.model_id,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                use_safetensors=True,
            )

            # Use DPM Solver for faster inference
            self.pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
                self.pipeline.scheduler.config
            )

            self.pipeline = self.pipeline.to(device)

            # Enable memory optimizations
            if device == "cuda":
                self.pipeline.enable_attention_slicing()
                self.pipeline.enable_vae_slicing()

            print("✅ Model loaded successfully!")

        except Exception as e:
            raise Exception(f"Failed to load Stable Diffusion: {str(e)}")

    def generate_image(self, prompt, image_size='1024x1024', num_inference_steps=50, guidance_scale=7.5, **kwargs):
        """
        Generate an image from a text prompt

        Args:
            prompt (str): Text description
            image_size (str): Size like '1024x1024'
            num_inference_steps (int): Quality (more = better but slower)
            guidance_scale (float): How closely to follow prompt (7-15 recommended)

        Returns:
            PIL.Image: Generated image
        """
        try:
            # Parse size
            width, height = map(int, image_size.split('x'))

            # Ensure dimensions are multiples of 8 (SD requirement)
            width = (width // 8) * 8
            height = (height // 8) * 8

            if self.use_local and self.pipeline:
                # Generate locally
                result = self.pipeline(
                    prompt=prompt,
                    height=height,
                    width=width,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    **kwargs
                )

                return result.images[0]

            else:
                # Use Inference API
                return self._generate_via_api(prompt, width, height, **kwargs)

        except Exception as e:
            raise Exception(f"Stable Diffusion generation failed: {str(e)}")

    def _generate_via_api(self, prompt, width, height, **kwargs):
        """Generate via Hugging Face Inference API"""
        import requests
        import io

        API_URL = f"https://api-inference.huggingface.co/models/{self.model_id}"
        headers = {"Authorization": f"Bearer {self.hf_token}"} if self.hf_token else {}

        payload = {
            "inputs": prompt,
            "parameters": {
                "width": width,
                "height": height,
            }
        }

        response = requests.post(API_URL, headers=headers, json=payload, timeout=120)
        response.raise_for_status()

        image = Image.open(io.BytesIO(response.content))
        return image


# Recommended models (FREE on Hugging Face)
RECOMMENDED_MODELS = {
    'sdxl': 'stabilityai/stable-diffusion-xl-base-1.0',  # High quality
    'sd15': 'runwayml/stable-diffusion-v1-5',  # Fast, classic
    'flux': 'black-forest-labs/FLUX.1-schnell',  # Very fast, good quality
    'playground': 'playgroundai/playground-v2.5-1024px-aesthetic',  # Aesthetic
}


# Helper function
def generate_with_huggingface(prompt, model='sdxl', image_size='1024x1024', **kwargs):
    """
    Quick helper to generate with Stable Diffusion

    Args:
        prompt (str): Text prompt
        model (str): 'sdxl', 'sd15', 'flux', or 'playground'
        image_size (str): Image size

    Usage:
        image = generate_with_huggingface("A beautiful landscape", model='sdxl')
    """
    model_id = RECOMMENDED_MODELS.get(model, RECOMMENDED_MODELS['sdxl'])

    # If a HUGGINGFACE_TOKEN is configured in Django settings, prefer the
    # Inference API (remote) to avoid downloading large model files locally.
    use_local = not bool(getattr(settings, 'HUGGINGFACE_TOKEN', None))
    generator = HuggingFaceImageGenerator(model_id=model_id, use_local=use_local)
    return generator.generate_image(prompt, image_size, **kwargs)
