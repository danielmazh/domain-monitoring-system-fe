// Registration form submission handler

// Show or hide message box
function showRegisterMessage(message, isError = true) {
  const messageBox = document.getElementById('register-message');
  const messageText = document.getElementById('register-message-text');

  if (!messageBox || !messageText) {
    console.error('Register message elements not found in DOM');
    return;
  }

  if (!message) {
    // Hide
    messageBox.classList.add('d-none');
    messageBox.classList.remove('alert-danger', 'alert-success');
    messageText.textContent = '';
  } else {
    // Show
    messageBox.classList.remove('d-none');
    if (isError) {
      messageBox.classList.add('alert-danger');
      messageBox.classList.remove('alert-success');
    } else {
      messageBox.classList.add('alert-success');
      messageBox.classList.remove('alert-danger');
    }
    messageText.textContent = message;
  }
}

// Call registration API
async function register(username, password, email) {
  const body = { username, password, email };

  // Use apiRequest from api.js
  return apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  const usernameInput = document.getElementById('userName');
  const passwordInput = document.getElementById('password');
  const rpasswordInput = document.getElementById('rpassword');
  const emailInput = document.getElementById('email');

  if (!form || !usernameInput || !passwordInput || !rpasswordInput || !emailInput) {
    console.error('Registration form elements missing');
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // stop normal HTML form POST

    showRegisterMessage('');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const rpassword = rpasswordInput.value;
    const email = emailInput.value.trim();

    // Client-side validation
    if (!username || !password || !rpassword) {
      showRegisterMessage('Please fill in all required fields.');
      return;
    }

    if (username.length > 30) {
      showRegisterMessage('Username is too long - make it less than 30 chars.');
      return;
    }

    if (password !== rpassword) {
      showRegisterMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      showRegisterMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!/\d/.test(password)) {
      showRegisterMessage('Password must contain at least one number.');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      showRegisterMessage('Password must contain at least one uppercase letter.');
      return;
    }

    try {
      const data = await register(username, password, email);

      // If backend sends { error: "..." } with 200 (shouldn't happen but handle it)
      if (data && data.error) {
        showRegisterMessage(data.error);
        return;
      }

      // On success
      showRegisterMessage('Registration successful! Redirecting to login...', false);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } catch (err) {
      console.error('Registration failed:', err);
      showRegisterMessage(err.message || 'Registration failed. Please try again.');
    }
  });
});

