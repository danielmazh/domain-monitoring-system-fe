Frontend Split + Nginx Reverse Proxy
What was delivered
The frontend was separated from the Flask backend and is now served as static files from an Nginx Docker container. API calls from the browser now go to the same origin as the frontend (port 8081) using /api/*, and Nginx proxies those requests to the backend running on 8080.​

Chain of events (what happened during the work)
Verified the backend is healthy directly (local): GET http://localhost:8080/api/health returned 200 with {"status":"ok"} (backend readiness baseline).

Built a frontend Docker image that contains: static HTML/JS pages + an Nginx configuration.

Ran the frontend container with port publishing -p 8081:80 so the Nginx container is reachable at http://localhost:8081. Docker port publishing is what makes a container port reachable from the host.​

Confirmed Nginx is alive via GET http://localhost:8081/health returning healthy.

Confirmed end-to-end routing via GET http://localhost:8081/api/health returning {"status":"ok"} through the proxy (frontend → Nginx → backend).​

What changed (Engineer 2 scope)
Added / changed
Static frontend pages (HTML/JS) served directly by Nginx instead of being rendered by the backend.

Nginx reverse proxy rule so /api/* requests are forwarded to the backend (typical location /api/ { proxy_pass ... }).​

Frontend container “alive” endpoint: /health returning 200.

Docker run flow that publishes container port 80 to host port 8081.​

Removed / no longer required (conceptually)
Browser direct calls to the backend port (localhost:8080)—the browser should call http://localhost:8081/api/... instead.

Backend responsibility for serving the UI (backend can remain API-only).

Why these changes matter
The browser talks to one origin (:8081) for both UI and API paths, which simplifies client configuration and avoids pushing backend URLs into the UI.​

Frontend and backend can now be deployed/scaled independently (frontend image is a standalone artifact).

Clear health checks exist for both the frontend container itself (/health) and the full request chain (/api/health).​

Architecture Diagram
Browser now calls http://localhost:8081/api/* through Nginx
Same-origin calls (static frontend + API proxy both on :8081)

┌──────────────────────────────────────────────────────────────────────┐
│                               User Browser                            │
└───────────────────────────────┬───────────────────────────────────────┘
                                │  http://localhost:8081
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Docker Container (Frontend Image)                   │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │                        Nginx (port 80)                        │   │
│   │                                                              │   │
│   │   GET /            → serves static HTML/JS (login/dashboard)  │   │
│   │   GET /health      → 200 OK  (frontend container health)      │   │
│   │   /api/*           → reverse proxy to backend                 │   │
│   │                      ┌───────────────────────────────────┐   │   │
│   │                      │ proxy_pass http://...:8080;        │   │   │
│   │                      └───────────────────────────────────┘   │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Port publishing / mapping:   -p 8081:80                             │
│   Host:8081  ───────────────────────────────►  Container:80           │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                │  proxied upstream (dev)
                                │  http://host.docker.internal:8080
                                │  (backend running on host)
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                           Flask Backend API                            │
│                           http://localhost:8080                        │
│                                                                      │
│   GET  /api/health   → 200 OK   {"status":"ok"}                        │
│   POST /api/login    → 200 OK   (token/session response)               │
│   GET  /api/users    → 200 OK   (JSON list, etc.)                      │
│   ... other /api/* endpoints                                           │
└──────────────────────────────────────────────────────────────────────┘
Local run commands:
bash
# backend (separate terminal): ensure it listens on :8080
# frontend
docker build -t domain-frontend .
docker run --rm -p 8081:80 --name domain-frontend domain-frontend
Port publishing (-p hostPort:containerPort) is what exposes the container service to localhost.​

Validation checklist
http://localhost:8081/health → healthy

http://localhost:8081/api/health → {"status":"ok"} (via Nginx proxy)
