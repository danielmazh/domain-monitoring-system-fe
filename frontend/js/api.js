// Simple API helper for the frontend.
// For now, calls the backend directly at localhost:8080.
// Later, Nginx will proxy /api/... to this backend.

const API_BASE_URL = 'http://localhost:8080';  // adjust if your backend uses a different port/path

async function apiRequest(path, options = {}) {
  const url = API_BASE_URL + path;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const fetchOptions = {
    credentials: 'include', // send cookies (session)
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, fetchOptions);

  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = null;
  }

  if (!response.ok) {
    const message = (data && data.error) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}
