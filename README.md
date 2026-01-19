# Domain Monitoring System - Frontend

A modern, responsive frontend for the Domain Monitoring System built with vanilla JavaScript, Bootstrap 5, and Nginx. Features role-based navigation, real-time domain monitoring, and an integrated admin panel.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Backend service running (see backend README)

### Run with Docker

```bash
# Build the frontend image
docker build -t domain-monitoring-system-fe .

# Or use docker-compose from backend repository
cd ../domain-monitoring-system-be
docker-compose up -d frontend
```

**Access the application:**
- **Frontend UI**: http://localhost
- **Backend API**: http://localhost:8080 (proxied via Nginx)

## Architecture

### Technology Stack
- **Web Server**: Nginx (Alpine)
- **Frontend Framework**: Vanilla JavaScript (ES6+)
- **UI Library**: Bootstrap 5.3.3
- **Icons**: Font Awesome
- **Containerization**: Docker

### Features
- **Responsive Design**: Mobile-first Bootstrap 5 interface
- **Role-Based Navigation**: Dynamic menu based on user role (admin/user)
- **Real-Time Updates**: Live domain status monitoring
- **Admin Panel**: Integrated admin interface with PostgreSQL query tool
- **Session Management**: Secure authentication flow
- **API Integration**: RESTful API communication with backend

## Project Structure

```
domain-monitoring-system-fe/
├── index.html              # Landing page
├── login.html              # Login page
├── register.html           # Registration page
├── dashboard.html          # Main dashboard
├── logs.html               # System logs viewer
├── admin.html              # Admin panel (admin only)
├── css/
│   ├── style.css          # Main application styles
│   ├── login_style.css    # Login page styles
│   └── logs.css           # Logs page styles
├── js/
│   ├── api.js             # API utility functions
│   ├── login.js           # Login functionality
│   ├── register.js        # Registration functionality
│   ├── dashboard-controller.js  # Dashboard logic & role-based navigation
│   └── logs-controller.js # Logs viewer functionality
├── nginx/
│   └── nginx.conf         # Nginx configuration with API proxy
└── Dockerfile             # Container definition
```

## Key Components

### Navigation System
- **Admin Users**: See "Admin Panel" link (contains Logs + PostgreSQL query)
- **Regular Users**: See "Logs" link only
- Role detection via `/api/current-user` endpoint
- Dynamic visibility using Bootstrap `d-none` class

### Dashboard (`dashboard.html`)
- Real-time domain statistics
- Domain management (add, delete, check status)
- Bulk domain upload
- Responsive table with status indicators

### Admin Panel (`admin.html`)
- **Logs Tab**: System logs viewer
- **PostgreSQL Tab**: SQL query interface (SELECT only)
- Role verification on page load
- Automatic redirect for non-admin users

### API Integration (`js/api.js`)
- Centralized API communication
- Error handling and timeout management
- Session validation

## Nginx Configuration

The frontend uses Nginx to:
- Serve static HTML/CSS/JS files
- Proxy API requests to backend service
- Handle routing and redirects

**Configuration**: `nginx/nginx.conf`
- Static files: `/usr/share/nginx/html`
- API proxy: `/api/*` → `http://backend:8080`

## Development

### Local Development (without Docker)

```bash
# Serve files with a simple HTTP server
python3 -m http.server 8000

# Or use Node.js http-server
npx http-server -p 8000
```

**Note**: For local development, you'll need to configure CORS or use a proxy to connect to the backend API.

### Building Docker Image

```bash
docker build -t danielmazh/domain-monitoring-system-fe:0.0.5 .
```

### Testing

1. **Login Flow**: Test authentication and session management
2. **Role-Based Navigation**: Verify admin vs regular user views
3. **Domain Management**: Test add, delete, and status checking
4. **Admin Panel**: Verify admin-only access and SQL query interface

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security Considerations

- **Role Verification**: Client-side checks with backend validation
- **Session Management**: Secure cookie handling
- **API Security**: All API calls require authentication
- **XSS Prevention**: Input sanitization and safe DOM manipulation

## Docker Images

Images are available on Docker Hub:
- `danielmazh/domain-monitoring-system-fe:0.0.5`

## Integration with Backend

The frontend communicates with the backend via REST API:
- **Base URL**: Configured in `nginx.conf` (proxied to `backend:8080`)
- **Authentication**: Session-based (Flask-Session)
- **Endpoints**: See backend README for API documentation

## Troubleshooting

### API Connection Issues
- Verify backend service is running: `docker-compose ps backend`
- Check Nginx proxy configuration in `nginx/nginx.conf`
- Verify network connectivity between containers

### Role-Based Navigation Not Working
- Clear browser cache and cookies
- Verify user role in database
- Check browser console for JavaScript errors
- Ensure `/api/current-user` returns correct role

### Static Files Not Loading
- Verify files are copied to `/usr/share/nginx/html` in container
- Check Nginx configuration
- Review container logs: `docker-compose logs frontend`

## Collaboration

- **Discord**: [Join our development group](https://discord.gg/CncFchjd)
- **Trello**: [Project management board](https://trello.com/b/pVFBTkP1/domain-monitoring-system)
