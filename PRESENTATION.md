# Domain Monitoring System
## Project Presentation

---

## 1. Project Overview

### Objective
Build a system that allows users to register, log in, and monitor multiple domains for liveness and SSL certificate details with real-time monitoring updates and concurrent scanning capabilities.

### Key Goals
- User registration and authentication
- Domain management (single and bulk upload)
- Real-time domain monitoring
- SSL certificate tracking
- Multithreaded concurrent scanning
- Scalable architecture for future database integration

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (UI)                        │
│                   HTML + CSS + JavaScript                    │
│  Registration | Login | Dashboard | Domain Management        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Flask)                           │
│  • User Authentication & Session Management                  │
│  • API Endpoints & Request Routing                          │
│  • Domain Validation & Processing                           │
└────────────────────┬───────────────────┬────────────────────┘
                     │                   │
                     ▼                   ▼
┌────────────────────────────┐  ┌──────────────────────────┐
│  Domain Monitoring Engine  │  │    Data Storage (JSON)   │
│         (DME)              │  │                          │
│  • URL Checker             │  │  • users.json            │
│  • SSL Checker             │  │  • {user}_domains.json   │
│  • ThreadPoolExecutor      │  │                          │
│  • Concurrent Processing   │  └──────────────────────────┘
└────────────────────────────┘
```

### Component Descriptions

**Frontend (UI)**
- Built with HTML, CSS, JavaScript
- Bootstrap 5 responsive design
- User interaction for registration, login, domain management
- Real-time dashboard updates

**Backend (Flask)**
- User authentication and session management
- RESTful API endpoints
- Domain validation and processing
- Logging and error handling

**Domain Monitoring Engine (DME)**
- Multithreaded domain checking (20 concurrent threads)
- HTTP/HTTPS liveness verification
- SSL certificate validation and expiration tracking
- Uses `concurrent.futures.ThreadPoolExecutor`

**Data Storage**
- JSON-based temporary storage
- `users.json` for user credentials
- `{username}_domains.json` for user-specific domains
- Structured for easy database migration

---

## 3. User Flows

### 3.1 User Registration Flow
```
User Input → Validation → Store in users.json → Confirmation
```
1. User enters username, password, and email
2. Backend validates (unique username, password requirements)
3. Password validation: min 8 chars, 1 uppercase, 1 number
4. User details stored in `users.json`
5. User receives confirmation and redirects to login

### 3.2 Login Flow
```
Credentials → Authentication → Session Creation → Dashboard
```
1. User provides username and password
2. Backend validates against `users.json`
3. Flask session object maintains user state
4. Successful login redirects to personalized dashboard
5. Session persists across requests

### 3.3 Domain Management Flow

**Single Domain Entry:**
```
Input Domain → Validate → Store → Update Dashboard
```

**Bulk Domain Upload:**
```
Upload .txt File → Parse & Validate → Store Valid Domains → Update Dashboard
```

1. User submits domain(s) via input field or file upload
2. Backend validates domain format using regex pattern
3. Checks for duplicate domains
4. Stores in `{username}_domains.json` with default status "Pending"
5. Maximum 100 domains per user enforced

### 3.4 Domain Monitoring Flow
```
Trigger Check → ThreadPoolExecutor → Liveness + SSL Check → Update Results → Display
```
1. User triggers single or bulk domain check
2. Monitoring engine creates thread pool (20 workers)
3. Each thread performs:
   - HTTP/HTTPS liveness check
   - SSL certificate validation (if HTTPS)
   - Extracts expiration date and issuer
4. Results update `{username}_domains.json`
5. Dashboard displays updated status in real-time

---

## 4. Key Features and Modules

### 4.1 User Management Module

**Registration**
- **Endpoint:** `POST /register`
- **Features:**
  - Unique username validation
  - Password strength requirements
  - Email validation
  - Error handling for duplicate users

**Login**
- **Endpoint:** `POST /logincheck`
- **Features:**
  - Credential authentication
  - Flask session management
  - Secure session storage
  - Remember me functionality

**Password Reset**
- **Endpoint:** `GET/POST /forgotPass/<username>`
- **Features:**
  - Email verification
  - Password update with validation

### 4.2 Domain Management Module

**Add Domain**
- **Single Entry:** `POST /api/add-domain`
  - Input validation using regex
  - Duplicate checking
  - Immediate storage

- **Bulk Upload:** `POST /api/add-domain-file`
  - .txt file processing
  - Line-by-line validation
  - Bad domain tracking
  - Maximum 100 domains enforced

**Delete Domain**
- **Endpoint:** `DELETE /api/delete-domain`
- Removes domain from user's JSON file

**Get Domains**
- **Endpoint:** `GET /api/get-domains`
- Returns all user domains with status

### 4.3 Monitoring System

**Liveness Check**
- Uses `requests` library
- Tries HTTPS first, falls back to HTTP
- 1-second timeout for performance
- Status codes: OK (200), FAILED (other)

**SSL Check**
- Uses Python `ssl` library
- Retrieves certificate information
- Extracts:
  - Expiration date
  - Issuer organization
  - Certificate validity
- Detects expired certificates

### 4.4 Multithreaded Scanning Module

**Implementation:**
- `concurrent.futures.ThreadPoolExecutor`
- 20 concurrent workers
- Queue-based task distribution
- Thread-safe result collection

**Performance:**
- Processes 100 domains efficiently
- Minimal delay with concurrent execution
- Handles timeouts gracefully

---

## 5. Technology Stack

### Backend
- **Framework:** Flask 2.3.3
- **Session Management:** Flask-Session 0.5.0
- **HTTP Requests:** requests 2.31.0
- **Utilities:** Werkzeug 2.3.7
- **Concurrency:** concurrent.futures (built-in)

### Frontend
- **HTML5** - Structure and semantics
- **CSS3** - Custom styling
- **Bootstrap 5** - Responsive framework
- **JavaScript (ES6+)** - Interactive functionality
- **Font Awesome** - Icons

### Data Storage
- **Format:** JSON
- **Files:**
  - `data/users.json` - User credentials
  - `data/domains/{username}_domains.json` - Domain data

### Utilities
- **url_checker.py** - Domain availability checking
- **ssl_checker.py** - SSL certificate validation
- **file_tools.py** - File operations

---

## 6. Data Structures

### 6.1 users.json Structure
```json
{
    "username": {
        "username": "Example",
        "password": "Password123",
        "email": "user@example.com"
    }
}
```

### 6.2 {username}_domains.json Structure
```json
[
    {
        "domain": "example.com",
        "status": "OK",
        "ssl_expiration": "2025-12-31 23:59:59",
        "ssl_issuer": "Let's Encrypt",
        "last_chk": "2024-10-13 10:30:00 UTC"
    }
]
```

**Status Values:**
- `Pending` - Not yet checked
- `OK` - Domain is live (HTTP 200)
- `FAILED` - Domain is down or unreachable

**SSL Expiration:**
- Date format: `YYYY-MM-DD HH:MM:SS`
- `EXPIRED: {date}` - Certificate expired
- `N/A` - No SSL or check failed

---

## 7. API Contracts

### 7.1 Authentication APIs

**Registration**
```
POST /register
Request: { username, password, email }
Response: Redirect to /login or error message
```

**Login**
```
POST /logincheck
Request: { username, password }
Response: Redirect to /dashboard or error message
```

**Logout**
```
GET /logout
Response: Clear session, redirect to /
```

### 7.2 Domain Management APIs

**Add Single Domain**
```
POST /api/add-domain
Request: { "domain": "example.com" }
Response: { "records_written": 1 } or { "error": "message" }
```

**Bulk Upload**
```
POST /api/add-domain-file
Request: FormData with .txt file
Response: { "records_written": 10, "bad_domains": 2 }
```

**Get Domains**
```
GET /api/get-domains
Response: [{ domain, status, ssl_expiration, ssl_issuer, last_chk }]
```

**Delete Domain**
```
DELETE /api/delete-domain
Request: { "domain": "example.com" }
Response: { "message": "Domain deleted successfully" }
```

### 7.3 Monitoring APIs

**Check Single Domain**
```
POST /api/checkurl
Request: { "domain": "example.com" }
Response: { domain, status, ssl_expiration, ssl_issuer, last_chk }
```

**Check All Domains**
```
POST /api/checkurls
Response: [{ domain, status, ssl_expiration, ssl_issuer, last_chk }]
```

**Get Stats**
```
GET /api/get-stats
Response: {
    total_domains, online_domains, offline_domains,
    pending_domains, ssl_expired
}
```

**Get Logs**
```
GET /api/get-logs
Response: ["log entry 1", "log entry 2", ...]
```

---

## 8. Concurrency and Multithreading

### Implementation Details

**ThreadPoolExecutor Configuration:**
- Max workers: 20 threads
- Queue-based task distribution
- Thread-safe result collection

**Process Flow:**
```
URLs → Queue → Thread Pool (20 workers) → Results Queue → JSON Update
```

**Benefits:**
- Simultaneous domain checks
- Reduced total processing time
- Efficient resource utilization
- Handles 100 domains with minimal delay

**Error Handling:**
- Timeout protection (1 second per request)
- Exception catching per thread
- Failed checks don't block other domains
- Results collected regardless of failures

---

## 9. Error Handling and Validation

### Input Validation

**User Registration:**
- Username: Required, unique, alphanumeric
- Password: Min 8 chars, 1 uppercase, 1 number
- Email: Required, valid format

**Domain Validation:**
- Regex pattern: `^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$`
- Protocol removal (http://, https://)
- Duplicate checking
- Format validation

**File Validation:**
- .txt file format required
- One domain per line
- Empty lines ignored
- Invalid domains tracked and reported

### Error Messages

**Authentication Errors:**
- "Invalid username or password"
- "Username already taken"
- "Password must meet requirements"

**Domain Errors:**
- "Invalid domain format"
- "Domain already exists"
- "User already has 100 domains"

**System Errors:**
- "Failed to load users"
- "Failed to update domain record"
- Connection timeouts logged

### Logging

**Log File:** `logs/log.log`

**Logged Events:**
- User registration and login attempts
- Domain additions and deletions
- Failed domain validations
- System errors and exceptions
- File I/O operations

---

## 10. Frontend Structure

### Pages

**1. Login Page (`login.html`)**
- Username and password fields
- "Forgot Password" link
- Registration redirect
- Error message display

**2. Registration Page (`register.html`)**
- Username, password, email fields
- Real-time password validation
- Password strength indicator
- Client-side validation

**3. Dashboard (`dashboard.html`)**
- Statistics cards:
  - Total Domains
  - Online Domains
  - SSL Expired
  - Offline Domains
  - Pending Domains
- Domain table with columns:
  - Domain name
  - Status (badge with color)
  - SSL Expiration
  - SSL Issuer
  - Last Check
  - Actions (Check, Delete)
- Add domain modal (single/bulk)
- Refresh all button

**4. Logs Page (`logs.html`)**
- System log viewer
- Log filtering options
- Real-time log updates
- Search functionality

### JavaScript Controllers

**dashboard-controller.js:**
- `refreshData()` - Update stats and domains
- `checkUrl()` - Single domain check
- `checkAll()` - Bulk domain check
- `deleteDomain()` - Remove domain
- `addDomain()` - Add single domain
- `uploadFile()` - Bulk upload handler

**logs-controller.js:**
- Log fetching and display
- Log filtering
- Search functionality

---

## 11. Testing with test_domains.txt

### Purpose
Comprehensive test file containing 20 domains for validating system functionality across various scenarios.

### Test Scenarios Included

**1. Valid Domains (Working SSL)**
- google.com, github.com, stackoverflow.com
- Tests successful liveness and SSL checks

**2. Invalid/Non-existent Domains**
- nonexistentdomain12345.com
- invalid-domain-that-does-not-exist.net
- Tests error handling and DNS failures

**3. Expired SSL Certificates**
- expired-ssl-test.com
- Tests expiration detection and display

**4. HTTP-Only Sites**
- http-only-site.com
- Tests non-SSL domain handling

**5. Timeout Scenarios**
- timeout-test-domain.com
- slow-response-test.com
- Tests timeout handling

**6. Special Cases**
- Malformed URLs (malformed-url-test)
- Subdomain testing (subdomain.test.com)
- Redirect handling (redirect-test.com)
- DNS resolution failures (dns-resolution-fail.test)
- Port blocking scenarios (port-blocked-test.com)
- Wildcard SSL certificates (wildcard-ssl-test.com)
- Certificate mismatches (ssl-mismatch-test.com)

### File Format
```
google.com
github.com
stackoverflow.com
...
```
Plain text format with one domain per line (20 domains total).

### Usage
1. Navigate to Dashboard
2. Click "Add" → "Upload File"
3. Select `test_domains.txt`
4. System validates and imports domains
5. Click "Check All Domains"
6. Observe various status results

### Expected Results
- Valid domains show "OK" status
- Invalid domains show "FAILED" status
- Expired SSL marked with "EXPIRED:" prefix
- System handles all scenarios gracefully
- No crashes or unhandled exceptions

---

## 12. Security Considerations

### Current Implementation
- Session-based authentication
- Server-side input validation
- Protection against duplicate usernames
- File upload validation
- Regex-based domain validation

### Future Enhancements
- Password hashing (bcrypt/scrypt)
- CSRF protection
- Rate limiting
- SQL injection prevention (when migrating to DB)
- XSS protection
- HTTPS enforcement
- Password reset via email
- Two-factor authentication

---

## 13. Scalability and Future Improvements

### Database Migration
**Current:** JSON file storage
**Future:** PostgreSQL/MongoDB
- Improved query performance
- Better concurrent access
- Data integrity constraints
- Relationship management

### Additional Features
- Email notifications for SSL expiration
- Scheduled automatic domain checks
- Domain availability history tracking
- Custom check intervals per domain
- API key authentication for external access
- Multi-user collaboration
- Domain categorization/tagging
- Export reports (PDF/CSV)

### Performance Optimizations
- Caching frequently checked domains
- Asynchronous background tasks
- Load balancing for high traffic
- Redis for session storage
- CDN for static assets

---

## 14. Project Statistics

### Code Structure
- **Main Application:** `app.py` (577 lines)
- **Utilities:** 3 modules (154 lines total)
- **Templates:** 5 HTML files
- **JavaScript:** 3 controllers
- **CSS:** 3 stylesheets

### Capacity
- **Users:** Unlimited
- **Domains per User:** 100 maximum
- **Concurrent Checks:** 20 threads
- **Check Timeout:** 1 second per domain

### Dependencies
- Flask 2.3.3
- Flask-Session 0.5.0
- requests 2.31.0
- Werkzeug 2.3.7

---

## 15. Conclusion

### Project Achievements
✅ User authentication and session management
✅ Domain validation and management
✅ Multithreaded concurrent monitoring
✅ SSL certificate tracking
✅ Real-time dashboard updates
✅ Bulk domain upload support
✅ Comprehensive error handling
✅ Logging system
✅ Responsive UI design
✅ Test file for validation

### Alignment with Requirements
- ✅ Meets all HLD specifications
- ✅ Implements all LLD components
- ✅ Follows defined API contracts
- ✅ Proper data structure implementation
- ✅ Multithreading as specified
- ✅ Complete user flows implemented

### Success Metrics
- Efficient concurrent domain checking
- Reliable SSL certificate monitoring
- Clean and intuitive user interface
- Scalable architecture for future enhancements
- Comprehensive testing capabilities

---

## Thank You!

**Project Repository:** Domain Monitoring System
**Documentation:** README.md
**Test File:** test_domains.txt

For questions or contributions:
- Discord: [Join our development group](https://discord.gg/CncFchjd)
- Trello: [Project management board](https://trello.com/b/pVFBTkP1/domain-monitoring-system)

