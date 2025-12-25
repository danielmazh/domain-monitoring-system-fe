// JavaScript functionality for the domain monitoring dashboard
// Registration page password checker
// JavaScript functionality for the domain monitoring dashboard

//Registration page password checker
document.addEventListener('DOMContentLoaded', () => {
    // Get references to all the form elements
    const usernameInput = document.getElementById('userName');
    const passwordInput = document.getElementById('password');
    const rpasswordInput = document.getElementById('rpassword');
    const passwordFeedback = document.getElementById('password-feedback');
    const rpasswordFeedback = document.getElementById('rpassword-feedback');
    const registrationForm = document.getElementById('registrationForm');

    // You need to get a reference to the username feedback element
    const usernameFeedback = document.getElementById('username-feedback');

    // Function to validate the password fields
    const validatePasswords = () => {
        const username = usernameInput.value;
        const password = passwordInput.value;
        const rpassword = rpasswordInput.value;
        let isPasswordValid = true;

        // Reset feedback messages
        passwordFeedback.textContent = '';
        rpasswordFeedback.textContent = '';

        // Check password strength requirements
        const hasNumber = /\d/.test(password);
        const isLongEnough = password.length >= 8;
        const isUpper = /[A-Z]/.test(password);

        if (!isLongEnough) {
            passwordFeedback.textContent = 'Password must be at least 8 characters long.';
            passwordFeedback.style.color = 'red';
            isPasswordValid = false;
        } else if (!hasNumber) {
            passwordFeedback.textContent = 'Password must contain at least one number.';
            passwordFeedback.style.color = 'red';
            isPasswordValid = false;
        } else if (!isUpper){
            passwordFeedback.textContent = 'Password must contain at least one upper case.';
            passwordFeedback.style.color = 'red';
            isPasswordValid = false;
        } else {
            passwordFeedback.textContent = 'Password is valid!';
            passwordFeedback.style.color = 'green';
        }

        // Check if re-written password matches
        let doPasswordsMatch = true;
        if (rpassword.length > 0) {
            if (password !== rpassword) {
                rpasswordFeedback.textContent = 'Passwords do not match.';
                rpasswordFeedback.style.color = 'red';
                doPasswordsMatch = false;
            } else {
                rpasswordFeedback.textContent = 'Passwords match!';
                rpasswordFeedback.style.color = 'green';
            }
        }

        // Return true only if all checks pass
        return isPasswordValid && doPasswordsMatch;
    };

    // Function to validate the username
    const validateUsername = () => {
        const username = usernameInput.value;
        if (username.length >= 30) {
            usernameFeedback.textContent = 'Username is too long - make it less than 30 chars.';
            usernameFeedback.style.color = 'red';
            return false;
        } else {
            usernameFeedback.textContent = ''; // Clear message if valid
            return true;
        }
    };

    // Attach event listeners for real-time validation
    passwordInput.addEventListener('input', validatePasswords);
    rpasswordInput.addEventListener('input', validatePasswords);

    // Add a new event listener for the username input
    usernameInput.addEventListener('input', validateUsername);

    // Prevent form submission if validation fails
    registrationForm.addEventListener('submit', (event) => {
        // You must now check both password and username validation
        const passwordsValid = validatePasswords();
        const usernameValid = validateUsername();
        if (!passwordsValid || !usernameValid) {
            event.preventDefault(); // Stop the form from submitting
        }
    });
});
