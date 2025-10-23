"""
Diagnostic script to check Python environment and OpenAI version
Run this in the SAME terminal where Celery will run
"""
import sys
import os

print("=" * 60)
print("PYTHON ENVIRONMENT CHECK")
print("=" * 60)

print(f"\nPython executable: {sys.executable}")
print(f"Python version: {sys.version}")
print(f"Virtual env: {os.environ.get('VIRTUAL_ENV', 'NOT ACTIVATED')}")

print("\n" + "=" * 60)
print("PACKAGE VERSIONS")
print("=" * 60)

try:
    import openai
    print(f"\n✓ OpenAI: {openai.__version__}")
    print(f"  Location: {openai.__file__}")
except ImportError as e:
    print(f"\n✗ OpenAI not found: {e}")

try:
    import django
    print(f"✓ Django: {django.__version__}")
except ImportError as e:
    print(f"✗ Django not found: {e}")

try:
    import celery
    print(f"✓ Celery: {celery.__version__}")
except ImportError as e:
    print(f"✗ Celery not found: {e}")

try:
    import redis
    print(f"✓ Redis: {redis.__version__}")
except ImportError as e:
    print(f"✗ Redis not found: {e}")

print("\n" + "=" * 60)
print("OPENAI CLIENT TEST")
print("=" * 60)

try:
    from openai import OpenAI
    from decouple import config
    
    api_key = config('OPENAI_API_KEY', default=None)
    if not api_key:
        print("\n✗ OPENAI_API_KEY not found in .env")
    else:
        print(f"\n✓ API key loaded: {api_key[:20]}...")
        
        # Try initializing
        try:
            client = OpenAI(api_key=api_key)
            print("✓ OpenAI client initialized successfully")
            print(f"  Client type: {type(client)}")
        except Exception as e:
            print(f"✗ Failed to initialize client: {type(e).__name__}: {e}")
            
except Exception as e:
    print(f"\n✗ Error during OpenAI test: {e}")

print("\n" + "=" * 60)
print("RECOMMENDATION")
print("=" * 60)

print("\nIf OpenAI version is NOT 1.57.4:")
print("1. Close this terminal completely")
print("2. Open a NEW PowerShell")
print("3. Run: cd 'C:\\Users\\R I B\\Desktop\\5TWIN3\\django-platform'")
print("4. Run: .\\venv\\Scripts\\Activate.ps1")
print("5. Run: python check_environment.py")
print("6. If still wrong, run: pip uninstall openai -y ; pip install openai==1.57.4")
print("7. Then start Celery: celery -A platform_core worker -l info -P solo")
