#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Pre-flight check for PentaArt
Verifies all configurations before starting services
"""

import os
import sys
from pathlib import Path

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def check_icon(success):
    return f"{GREEN}[OK]{RESET}" if success else f"{RED}[X]{RESET}"

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text.center(60)}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def check_env_file():
    """Check if .env file exists and has required keys"""
    print_header("Checking .env Configuration")

    env_path = Path(".env")
    if not env_path.exists():
        print(f"{RED}[X] .env file not found!{RESET}")
        return False

    print(f"{GREEN}[OK] .env file found{RESET}")

    required_keys = {
        'OPENAI_API_KEY': 'OpenAI API Key',
        'GEMINI_API_KEY': 'Gemini API Key',
        'CLOUDINARY_CLOUD_NAME': 'Cloudinary Cloud Name',
        'CLOUDINARY_API_KEY': 'Cloudinary API Key',
        'CLOUDINARY_API_SECRET': 'Cloudinary API Secret',
        'CELERY_BROKER_URL': 'Redis/Celery Broker URL',
        'DB_NAME': 'Database Name',
    }

    with open(env_path, 'r') as f:
        env_content = f.read()

    all_good = True
    for key, name in required_keys.items():
        if key in env_content and not env_content.split(key)[1].split('\n')[0].strip(' =').startswith('YOUR-'):
            print(f"{GREEN}[OK]{RESET} {name}")
        else:
            print(f"{RED}[X]{RESET} {name} - Missing or not configured")
            all_good = False

    return all_good

def check_redis():
    """Check if Redis is accessible"""
    print_header("Checking Redis Connection")

    try:
        import redis
        from decouple import config

        broker_url = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')

        # Parse Redis URL
        if '://:' in broker_url:  # Has password
            password = broker_url.split('://')[1].split('@')[0].strip(':')
            host_port = broker_url.split('@')[1].split('/')[0]
            host = host_port.split(':')[0]
            port = int(host_port.split(':')[1])
            db = int(broker_url.split('/')[-1])

            r = redis.Redis(host=host, port=port, db=db, password=password, socket_timeout=2)
        else:
            r = redis.from_url(broker_url, socket_timeout=2)

        r.ping()
        print(f"{GREEN}[OK] Redis is running and accessible{RESET}")
        print(f"  Host: {broker_url.split('@')[-1] if '@' in broker_url else broker_url.split('://')[1]}")
        return True
    except ImportError:
        print(f"{YELLOW}[!] redis package not installed - run: pip install redis{RESET}")
        return False
    except Exception as e:
        print(f"{RED}[X] Cannot connect to Redis{RESET}")
        print(f"  Error: {str(e)}")
        print(f"\n  {YELLOW}Make sure Redis is running!{RESET}")
        print(f"  If using Docker: docker ps | findstr redis")
        return False

def check_database():
    """Check if database is accessible"""
    print_header("Checking Database Connection")

    try:
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'platform_core.settings')
        django.setup()

        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        print(f"{GREEN}[OK] Database is accessible{RESET}")
        print(f"  Database: {connection.settings_dict['NAME']}")
        return True
    except Exception as e:
        print(f"{RED}[X] Cannot connect to database{RESET}")
        print(f"  Error: {str(e)}")
        print(f"\n  {YELLOW}Make sure PostgreSQL is running!{RESET}")
        return False

def check_frontend_env():
    """Check if frontend .env.local exists"""
    print_header("Checking Frontend Configuration")

    frontend_env = Path("FrontOffice/.env.local")
    if not frontend_env.exists():
        print(f"{RED}[X] FrontOffice/.env.local not found{RESET}")
        return False

    with open(frontend_env, 'r') as f:
        content = f.read()

    if 'NEXT_PUBLIC_API_URL' in content:
        api_url = [line for line in content.split('\n') if 'NEXT_PUBLIC_API_URL' in line][0].split('=')[1]
        print(f"{GREEN}[OK] Frontend environment configured{RESET}")
        print(f"  API URL: {api_url}")
        return True
    else:
        print(f"{RED}[X] NEXT_PUBLIC_API_URL not found in .env.local{RESET}")
        return False

def check_dependencies():
    """Check if key Python packages are installed"""
    print_header("Checking Python Dependencies")

    required_packages = {
        'django': 'Django',
        'celery': 'Celery',
        'openai': 'OpenAI SDK',
        'PIL': 'Pillow (Image processing)',
        'cloudinary': 'Cloudinary SDK',
        'rest_framework': 'Django REST Framework',
    }

    all_good = True
    for package, name in required_packages.items():
        try:
            __import__(package)
            print(f"{GREEN}[OK]{RESET} {name}")
        except ImportError:
            print(f"{RED}[X]{RESET} {name} - Not installed")
            all_good = False

    if not all_good:
        print(f"\n{YELLOW}Run: pip install -r requirements.txt{RESET}")

    return all_good

def check_media_directory():
    """Check if media directory exists"""
    print_header("Checking Media Directory")

    media_dir = Path("media/artworks")
    if not media_dir.exists():
        media_dir.mkdir(parents=True, exist_ok=True)
        print(f"{GREEN}[OK] Created media/artworks directory{RESET}")
    else:
        print(f"{GREEN}[OK] media/artworks directory exists{RESET}")

    return True

def print_summary(checks):
    """Print summary of all checks"""
    print_header("Pre-flight Check Summary")

    total = len(checks)
    passed = sum(checks.values())

    for check_name, result in checks.items():
        icon = check_icon(result)
        print(f"{icon} {check_name}")

    print(f"\n{BLUE}{'-'*60}{RESET}")
    if passed == total:
        print(f"{GREEN}[OK] ALL CHECKS PASSED! Ready to start services.{RESET}\n")
        print_start_instructions()
    else:
        print(f"{YELLOW}[!] {passed}/{total} checks passed{RESET}")
        print(f"{YELLOW}Please fix the issues above before starting services.{RESET}\n")

def print_start_instructions():
    """Print instructions to start all services"""
    print(f"{BLUE}{'='*60}{RESET}")
    print(f"{GREEN}START ALL SERVICES (3 separate terminals):{RESET}\n")

    print(f"{YELLOW}Terminal 1 - Celery Worker:{RESET}")
    print(f"  celery -A platform_core worker -l info -P solo\n")

    print(f"{YELLOW}Terminal 2 - Django Backend:{RESET}")
    print(f"  python manage.py runserver\n")

    print(f"{YELLOW}Terminal 3 - Next.js Frontend:{RESET}")
    print(f"  cd FrontOffice")
    print(f"  npm run dev\n")

    print(f"{BLUE}{'='*60}{RESET}")
    print(f"{GREEN}Then test at: http://localhost:3000/studio{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def main():
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{'PentaArt Pre-flight Check'.center(60)}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")

    checks = {
        'Environment Configuration': check_env_file(),
        'Python Dependencies': check_dependencies(),
        'Redis Connection': check_redis(),
        'Database Connection': check_database(),
        'Frontend Configuration': check_frontend_env(),
        'Media Directory': check_media_directory(),
    }

    print_summary(checks)

    return all(checks.values())

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
