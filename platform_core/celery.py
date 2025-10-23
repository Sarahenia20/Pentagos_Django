"""
Celery configuration for PentaArt platform

This module sets up Celery for async task processing, primarily for:
- AI image generation (GPT-4o, Gemini, Stable Diffusion)
- Algorithmic art generation
- Hybrid generation workflows
- Image processing and optimization
"""

import os
from celery import Celery
from decouple import config

# Set default Django settings module for 'celery' program
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'platform_core.settings')

# Create Celery app
app = Celery('pentaart')

# Configure Celery using settings from Django settings.py
# namespace='CELERY' means all celery-related config keys should have `CELERY_` prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Celery Configuration
app.conf.update(
    broker_url=config('CELERY_BROKER_URL', default='redis://localhost:6379/0'),
    result_backend=config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0'),

    # Task serialization
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,

    # Task result expiration (7 days)
    result_expires=604800,

    # Task routing - DISABLED for now, use default 'celery' queue
    # task_routes={
    #     'media_processing.tasks.*': {'queue': 'generation'},
    # },

    # Worker configuration
    worker_prefetch_multiplier=1,  # One task at a time per worker (for long-running AI tasks)
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks (prevent memory leaks)

    # Task time limits (AI generation can take time)
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=600,  # 10 minutes hard limit

    # Task retry configuration
    task_acks_late=True,  # Acknowledge task after completion (not when started)
    task_reject_on_worker_lost=True,  # Requeue task if worker crashes

    # Beat schedule (for periodic tasks if needed)
    beat_schedule={
        # Example: Clean up failed tasks older than 7 days
        # 'cleanup-old-failed-artworks': {
        #     'task': 'media_processing.tasks.cleanup_failed_artworks',
        #     'schedule': crontab(hour=3, minute=0),  # Run at 3 AM daily
        # },
    },
)

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task to test Celery setup"""
    print(f'Request: {self.request!r}')
