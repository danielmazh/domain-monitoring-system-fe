# Domain Monitoring System

A Flask-based web application for monitoring domain status, SSL certificates, and availability with user authentication and real-time dashboard. [test-trigger!!!]

## Project Structure

```
domain-monitoring-system/
├── app.py                          # Main Flask application with routes, API endpoints, and business logic
├── requirements.txt                # Python dependencies (Flask, Flask-Session, requests, Werkzeug)
├── test_api.py                    # Python test suite for backend API endpoints
├── test_domains.txt               # Test file with various domain scenarios for system testing
├── data/
│   ├── users.json                 # User authentication data storage
│   └── domains/                   # User-specific domain monitoring data
│       ├── {username}_domains.json # Individual user domain files (max 100 domains per user)
├── templates/
│   ├── base.html                  # Base template with navigation and layout
│   ├── dashboard.html             # Main dashboard with domain monitoring interface
│   ├── login.html                 # User login page
│   ├── register.html              # User registration page
│   └── logs.html                  # System logs viewer
├── static/
│   ├── css/
│   │   ├── style.css              # Main application styles
│   │   ├── login_style.css        # Login page styles
│   │   └── logs.css               # Logs page styles
│   └── js/
│       ├── app.js                 # General JavaScript functionality
│       ├── dashboard-controller.js # Dashboard API calls and UI updates
│       └── logs-controller.js     # Logs page functionality
├── utils/
│   ├── url_checker.py             # Domain availability checking with multithreading
│   ├── ssl_checker.py             # SSL certificate validation and expiration checking
│   └── file_tools.py              # File operations for domain data management
├── logs/
│   └── log.log                    # Application logging
└── flask_session/                 # Flask session storage
```

## Features

- **Domain Monitoring**: Real-time domain availability checking with HTTP/HTTPS support
- **SSL Certificate Monitoring**: SSL expiration tracking, issuer information, and certificate validation
- **User Authentication**: Secure registration/login with password validation and session management
- **Dashboard Interface**: Real-time statistics, domain tables, and status monitoring
- **Bulk Operations**: Add domains individually or upload multiple domains via text file
- **Multithreaded Processing**: Concurrent domain checking for improved performance (20 threads)
- **Data Persistence**: JSON-based storage with user-specific domain files
- **Error Handling**: Comprehensive logging and error management
- **Responsive Design**: Modern Bootstrap 5 interface with mobile support

## Getting Started

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Access the web interface at `http://localhost:8080`

4. Register a new account or login with existing credentials

5. Start monitoring domains by adding them individually or uploading a file

## Testing

### API Test Suite

The project includes a Python test suite (`test_api.py`) that performs automated testing against all backend API endpoints. To run the tests:

```bash
python test_api.py
```

The test suite covers:
- User registration and authentication
- Domain management (add, get, delete)
- Domain status checking (single and bulk)
- Statistics retrieval
- System logs access

All tests run sequentially and provide colored output with a summary report.

### test_domains.txt

The system includes a comprehensive test file (`test_domains.txt`) containing 20 test domains for testing various scenarios. Users can upload this file through the system's domain upload functionality to test:

- **Domain validation** - How the system handles valid vs invalid domains
- **SSL certificate checking** - Including expired, mismatched, and wildcard certificates  
- **Error handling** - DNS failures, timeouts, and connection issues
- **Status reporting** - How different domain states are displayed
- **Performance** - How the system handles multiple domains simultaneously

The file contains one domain per line in plain text format, compatible with the bulk upload feature.

## API Endpoints

- `GET /` - Landing page (redirects to dashboard if authenticated)
- `GET /register` - User registration page
- `POST /register` - User registration with validation
- `POST /logincheck` - User authentication
- `GET /dashboard` - Main dashboard (requires authentication)
- `GET /logout` - User logout
- `GET /logs` - System logs viewer (requires authentication)
- `GET /forgotPass/<username>` - Password reset functionality
- `POST /api/add-domain` - Add single domain
- `POST /api/add-domain-file` - Upload domains from text file
- `GET /api/get-domains` - Get user's domains
- `GET /api/get-stats` - Get user's domain statistics
- `DELETE /api/delete-domain` - Delete a domain
- `POST /api/checkurl` - Check single domain status
- `POST /api/checkurls` - Check all user domains
- `GET /api/get-logs` - Get system logs

## Collaboration

- **Discord**: [Join our development group](https://discord.gg/CncFchjd)
- **Trello**: [Project management board](https://trello.com/b/pVFBTkP1/domain-monitoring-system)
