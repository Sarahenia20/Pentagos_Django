# Django Platform

A flexible Django-based platform that can be adapted for either:
- **Generative AI Media Platform**: Photo and video processing with AI capabilities
- **Security Surveillance Platform**: SIEM dashboard integration and monitoring

## Features

- 🔐 User authentication and profiles
- 📁 File upload and media processing
- 📊 Dashboard with analytics
- 🚀 REST API with Django REST Framework
- 📱 Responsive web interface
- 🏷️ Tagging system for content organization
- 📈 Activity monitoring and logging

## Quick Start

1. **Clone and Setup**:
   ```bash
   cd django-platform
   python -m venv venv

   # On Windows:
   venv\Scripts\activate

   # On Unix/MacOS:
   source venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Initialize Database**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Run Development Server**:
   ```bash
   python manage.py runserver
   ```

Visit `http://127.0.0.1:8000` to see your platform!

## Project Structure

```
django-platform/
├── platform_core/          # Main project settings
├── accounts/               # User management
├── dashboard/              # Analytics dashboard
├── media_processing/       # File handling & AI processing
├── api/                   # REST API endpoints
├── templates/             # HTML templates
├── static/               # CSS, JS, images
├── media/                # User uploads
└── requirements.txt      # Python dependencies
```

## Apps Overview

### Accounts
- User profiles and authentication
- Activity tracking and logging
- User management features

### Dashboard
- Analytics and metrics visualization
- System monitoring
- Settings management

### Media Processing
- File upload and storage
- Media processing tasks
- AI analysis capabilities
- Tagging and organization

### API
- RESTful API endpoints
- Authentication and permissions
- Data serialization

## Customization for Your Use Case

### For Generative AI Media Platform:
- Focus on `media_processing` app
- Add AI model integrations
- Implement image/video generation features
- Add content galleries and sharing

### For Security Surveillance/SIEM:
- Focus on `dashboard` app
- Add security event monitoring
- Implement log analysis
- Add alerting and notification systems

## API Endpoints

- `/api/media/` - Media file management
- `/api/tags/` - Tag management
- `/api/users/` - User management
- `/api/health/` - Health check

## Development

Run tests:
```bash
python manage.py test
```

Create migrations:
```bash
python manage.py makemigrations
```

## Production Deployment

1. Set `DEBUG=False` in your `.env`
2. Configure your database (PostgreSQL recommended)
3. Set up static file serving
4. Use gunicorn or similar WSGI server
5. Configure reverse proxy (nginx recommended)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).