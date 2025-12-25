// Call your backend's /logincheck API with JSON.
async function login(username, password) {
  const body = { username, password };

  // This uses apiRequest from api.js
  return apiRequest('/logincheck', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Show or hide the red error box in login.html
function showLoginError(message) {
  const errorBox = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');

  if (!errorBox || !errorText) {
    console.error('Login error elements not found in DOM');
    return;
  }

  if (!message) {
    // Hide
    errorBox.classList.add('d-none');
    errorText.textContent = '';
  } else {
    // Show
    errorBox.classList.remove('d-none');
    errorText.textContent = message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  if (!form || !usernameInput || !passwordInput) {
    console.error('Login form elements missing in login.html');
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // stop normal HTML form POST

    showLoginError('');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showLoginError('Please enter both username and password.');
      return;
    }

    try {
      const data = await login(username, password);

      // If backend sends { error: "..." } with 200
      if (data && data.error) {
        showLoginError(data.error);
        return;
      }

      // On success backend sets session cookie.
      // Redirect to dashboard static page.
      window.location.href = 'dashboard.html';
    } catch (err) {
      console.error('Login failed:', err);
      showLoginError(err.message || 'Login failed. Please try again.');
    }
  });
});
