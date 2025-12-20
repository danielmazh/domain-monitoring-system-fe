# Main Flask application file - contains all routes, blueprints, and app configuration
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash, url_for, redirect # type: ignore
from flask_session import Session
from werkzeug.datastructures import FileStorage
from utils.url_checker import URLChecker
from utils.file_tools import fileTools
import json
import os
import time
import logging
from pathlib import Path
import re
from datetime import datetime
from functools import wraps
from flask_cors import CORS

# Check if the directory exists and create it if not
log_dir = './logs'
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

logger = logging.getLogger('DMS_app')
logger.setLevel(logging.DEBUG)
file_handler = logging.FileHandler(os.path.join(log_dir, 'log.log'))
formatter = logging.Formatter('%(asctime)s - %(filename)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config["SECRET_KEY"] = "replace-me"  # REQUIRED for sessions
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
app.url_map.strict_slashes = False

USERS_FILE = os.path.join('data', 'users.json')
Session(app)

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("user"):
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

# function to load users from JSON file
def load_users():
    """Load user data from the JSON file with a retry mechanism."""
    retries = 5
    delay = 0.5  # seconds
    for _ in range(retries):
        try:
            # Check if the file exists AND if it's not empty
            if not os.path.exists(USERS_FILE) or os.path.getsize(USERS_FILE) == 0:
                logger.error("Load users - users.json file was not found")
                return {}
            with open(USERS_FILE, 'r') as f:
                return json.load(f)
        except (IOError, PermissionError) as e:

            logger.error(f"File access error: {e}. Retrying in {delay} seconds...")
            time.sleep(delay)
            continue
    # If all retries fail, return an empty dictionary and log the error.
    logger.error("Failed to load users after multiple retries.")
    return {}

# function to save users
def save_users(users):
    """Save user data to the JSON file with a retry mechanism."""
    retries = 5
    delay = 0.5  # seconds
    for _ in range(retries):
        try:
            # Ensure the directory exists before saving
            os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
            with open(USERS_FILE, 'w') as f:
                json.dump(users, f, indent=4)
            return True # Success
        except (IOError, PermissionError) as e:

            logger.error(f"File write error: {e}. Retrying in {delay} seconds...")
            time.sleep(delay)
            continue
    # If all retries fail, log the error.
    logger.error("Failed to save users after multiple retries.")
    return False


###################################################
################  app routes   ####################
###################################################

@app.route('/',methods=['GET'])
def index():
    # If already logged in → go to dashboard
    if session.get("user"):
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/register',methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json(silent=True)

        if data is None:
            data = request.form

        logger.info(f"User tried to register with data: {data}")

        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        logger.info(f"User registration attempt - username: {username}, email: {email}")

        if not username or not password:
            error_message = 'Username and Password are required.'
            flash(error_message) 
             
            if request.content_type == 'application/json':
                return {"error": "Username and Password are required"}, 400
                 
            return render_template('register.html', username=username)
    
        if email is None or len(email) == 0:
            logger.warn(f"User {username} did not provide an email during registration")
            email = "noemail@noemail.com"

        users = load_users()

        # Check if username already exists
        if username.lower() in users:
            flash(f'The username "{username}" is already taken. Please choose other one')
            logger.warn(f"User tried to register with existing username: {username}")
            return render_template('register.html',
                                   username=username.lower(),
                                   email=email,
                                   username_exists=True)

        # Back-end validation (critical for security)
        if len(password) < 8:
            flash('Password must be at least 8 characters long.')
            if request.content_type == 'application/json':
                # Simplified error response as requested
                return {"error": "Username already taken"}, 409 # 409 Conflict
                
            return render_template('register.html',
                                   username=username,
                                   username_exists=True)
        
        if not any(char.isdigit() for char in password):
            flash('Password must contain at least one number.')
            return render_template('register.html',
                                   username=username,
                                   email=email)
        # Check if password contains at least one uppercase letter
        if not any(char.isupper() for char in password):
            flash('Password must contain at least one uppercase letter.')
            return render_template('register.html',
                                   username=username,
                                   email=email)
        logger.info(f"New user was created - 'username': {username}, 'password': ****, 'email' : {email}")
        users[username.lower()] = {'username': username, 'password': password, 'email' : email}
        if request.content_type == 'application/json':
            save_users(users)
            # Simplified success response as requested
            return {"message": "Registered successfully"}
        
        save_users(users)
        return redirect(url_for('login'))

    return render_template('register.html')

from flask import request, jsonify, redirect, url_for, render_template, flash, session

@app.route('/logincheck', methods=['GET', 'POST', 'OPTIONS'])
def login():
    # 1. Handle GET: old browser form visits this URL directly
    if request.method == 'GET':
        return redirect(url_for('index'))

    # 2. Handle CORS preflight (OPTIONS)
    if request.method == 'OPTIONS':
        # Let flask-cors handle headers, just return 200
        return '', 200

    # 3. Handle POST from static frontend (JSON) or old HTML form
    # Try JSON first
    data = request.get_json(silent=True)
    logger.info(f"User tried to login with data: {data}")

    # Fallback to form data if no JSON (for old HTML form)
    if data is None:
        data = request.form

    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    logger.info(f"User login attempt - username: {username}")

    # Input validation
    if not username or not password:
        error_msg = "Please enter both username and password."
        if request.content_type and 'application/json' in request.content_type:
            return jsonify({"error": error_msg}), 401  # JSON error for API clients
        flash(error_msg)
        return render_template('login.html', username=username)

    users = load_users()
    username_lower = username.lower()

    if username_lower in users and users[username_lower].get("password") == password:
        session["user"] = username_lower

        if request.content_type and 'application/json' in request.content_type:
            # Success API response for static frontend
            return jsonify({"message": "Login successful"}), 200

        # Old HTML flow
        return redirect(url_for('dashboard'))

    # Invalid credentials
    error_msg = "Invalid username or password"

    if request.content_type and 'application/json' in request.content_type:
        return jsonify({"error": error_msg}), 401

    return render_template('login.html', error=error_msg)
        
@app.route("/logout")
def logout():
    session.pop("user", None)
    # You redirected to 'login_form' before, but that route didn't exist.
    return redirect(url_for('index'))

@app.route('/dashboard', methods=['GET'])
@login_required
def dashboard():
    username = session.get("user")
    return render_template('dashboard.html', username=username)

@app.route('/forgotPass/<username>', methods=['GET', 'POST'])
def forgot(username):
    users = load_users()
    username_lower = username.lower()

    if request.method == "POST":
        email = request.form.get('email')
        password = request.form.get('password')
        rpassword = request.form.get('rpassword')

        # Check if the provided email matches the user's email in the JSON file
        if username_lower in users and users[username_lower]['email'].lower() == email.lower():
            # Check if passwords match
            if password != rpassword:
                flash("New passwords do not match.")
                return render_template('register.html', username=username, is_forgot_password=True)

            # Back-end validation for new password
            if len(password) < 8 or not any(char.isdigit() for char in password) or not any(char.isupper() for char in password):
                flash('Password must be at least 8 characters long, with one number and one uppercase letter.')
                return render_template('register.html', username=username, is_forgot_password=True)

            # Update the user's password and save
            users[username_lower]['password'] = password
            save_users(users)
            flash("Password changed successfully!")
            return redirect(url_for('login'))
        else:
            flash("Username or email does not match.")
            logger.warn(f"User : {username} try to change password but email is not much email {email}")
            return render_template('register.html', username=username, is_forgot_password=True)

    # Handle the GET request (display the form)
    # This will render the register page with the username from the URL pre-filled
    if username_lower in users:
        return render_template('register.html', username=username, is_forgot_password=True)
    else:
        # If the user is not found, redirect to login page
        flash("User not found.")
        logger.warn(f"User {username_lower} was not found in database")
        return redirect(url_for('login'))

@app.route('/logs', methods=['GET'])
@login_required
def logs():
    return render_template('logs.html')


###################################################
################  API routes   ####################
###################################################
@app.route('/api/logincheck', methods=['POST', 'OPTIONS'])
def api_logincheck():
    # Preflight request (CORS)
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({"error": "Please enter both username and password."}), 401

    users = load_users()
    username_lower = username.lower()

    if username_lower in users and users[username_lower].get("password") == password:
        session["user"] = username_lower
        return jsonify({"message": "Login successful"}), 200

    return jsonify({"error": "Invalid username or password"}), 401

@app.route('/api/logout', methods=['GET', 'OPTIONS'])
def api_logout():
    if request.method == 'OPTIONS':
        return '', 200

    session.pop("user", None)
    return jsonify({"message": "Logged out"}), 200

@app.route('/api/add-domain', methods=['POST'])
@login_required
def api_add_domain():
    domain = request.json.get('domain')
    username = session.get('user')
    logger.info(f"User {username} is trying to add domain: {domain}")

    if validate_domain(domain, username):
        result = update_user_domains(domain, username)
        return jsonify(result)
    else:
        return jsonify({'error': 'Invalid domain'}), 400

@app.route('/api/add-domain-file', methods=['POST'])
@login_required
def api_add_domain_file():
    domain_file = request.files.get('domain_file')
    username = session.get('user')
    records = confirm_domain_file(username)
    logger.info(f"User {username} is trying to upload a domain file")
    logger.info(f"User {username} currently has {records} domains")
    if records < 100:
        result = update_user_domains(domain_file, username)
        return jsonify(result)
    else:
        return jsonify({'error': 'File already has 100 domains'}), 400

@app.route('/api/get-stats')
@login_required
def api_get_stats():
    username = session.get('user')
    stats = load_user_stats(username)
    return jsonify(stats)

@app.route('/api/get-domains', methods=['GET', 'POST'])
@login_required
def api_get_domains():
    
    sortBy = request.json.get('sortBy')
    sortOrder = request.json.get('sortOrder')
    
    username = session.get('user')
    if sortBy is None:
        sortBy = session.get('sortBy','domain')
    else:
        session['sortBy'] = sortBy
        
    if sortOrder is None:
        sortOrder = session.get('sortOrder', 'asc')
    else:
        session['sortOrder'] = sortOrder
    
    domains = load_user_domains(username)
    sorted_domains = sorted(domains, key=lambda x: (x[sortBy], x['domain']), reverse=(sortOrder == 'desc'))
    return jsonify(sorted_domains)

@app.route('/api/delete-domain', methods=['DELETE'])
@login_required
def api_delete_domain():
    domain = request.json.get('domain')
    username = session.get('user')
    delete_domain(domain, username)
    return jsonify({'message': 'Domain deleted successfully'})

@app.route('/api/checkurl',methods=['GET','POST'])
def check_url():
    username = session.get('user')
    if username is None:
        return redirect(url_for('index'))
    url = request.json.get('domain')
    urls_list = []
    urls_list.append(url)
    obj = URLChecker(urls_list)
    results = obj.check_all_urls()
    
    if  len(results) > 0:
        fileTools.updateRowsInFile(username,results) # update the domain record in the user file
        return jsonify(results[0])
    else:
        return jsonify({})

@app.route('/api/checkurls',methods=['GET','POST'])
def check_urls():
    username = session.get('user')
    if username is None:
        return redirect(url_for('index'))
    
    urls = fileTools.get_urls_from_file(username)
    obj = URLChecker(urls)
    results = obj.check_all_urls()
    
    if  len(results) > 0:
        fileTools.updateRowsInFile(username,results) # update the domain record in the user file
        return jsonify(results)
    else:
        return jsonify({})

@app.route('/api/get-logs')
@login_required
def api_get_logs():
    logs = load_user_logs()
    return jsonify(logs)

@app.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({"status": "ok"}), 200

###################################################
############ functions for the app.py #############
###################################################

# function to validate domain input
def validate_domain(domain, username):
    """
    Validates if input is a proper domain format
    Returns: bool - True if valid, False if invalid
    """

    if not domain or not isinstance(domain, str):
        return False
    
    # Remove protocol if present
    domain = domain.replace('http://', '').replace('https://', '').replace('www.', '')
    
    # Basic domain regex pattern
    pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$'
    
    # log the failed domain for user
    if not bool(re.match(pattern, domain)):
        logger.error(f"User {username} failed to add domain: {domain}")
    return bool(re.match(pattern, domain))

# function to verify the domain file returns the number of domains in the file
def confirm_domain_file(username: str) -> int:
    """
    check if file exists and create the file if needed
    returns record count as int
    """
    username = username.lower()
    dest_file_exists = Path(f"data/domains/{username}_domains.json")

    if not dest_file_exists.is_file():
        dest_file_exists.parent.mkdir(parents=True, exist_ok=True)
        dest_file_exists.write_text("[]")
        logger.info(f"User {username} created domains file")
        return 0
    
    with open(dest_file_exists,"r") as file:
        data = json.load(file)
        return len(data)
    
# check existence of a record within a file
def check_record_existence(domain, username):
    """
    check if a record exists in the user domains file
    returns True if exists, False if not
    """

    search_for = domain
    dest_file = (f"data/domains/{username}_domains.json")
    found_record = False

    with open(dest_file, "r") as file:
        for line in file:
            if search_for in line:
                found_record = True
                break
            
    return found_record
        
# save list of domains or single domain to the file
def update_user_domains(domains, username):
    """
    update the user domains file with the new domains
    returns the number of records written
    """
    # need a further check if the file came from the user is correct
    # if (not isinstance(domains, str) and not isinstance(domains, list)) or len(username) == 0:
    #     return -1
    
    username = username.lower()
    records_count = confirm_domain_file(username)
    dest_file = (f"data/domains/{username}_domains.json")

    if records_count < 100:

        # single record string
        if isinstance(domains, str):
            records_written = 0

            already_exists = check_record_existence(domains, username)
            if already_exists:
                return {'error': 'Domain already exists'}

            entry = {
                "domain": domains,
                "status": "Pending",
                "ssl_expiration": "N/A",
                "ssl_issuer": "N/A",
                "last_chk": ""
            }

            with open(dest_file, "r") as file:
                data = json.load(file)
                data.append(entry)
            
            with open(dest_file, "w") as file:
                json.dump(data, file, indent=4)

            records_written+=1
            return ({"records_written": records_written})

        print("type(domains)", type(domains))
        # bulk records to write from txt file
        if isinstance(domains, FileStorage):
            content = domains.read().decode('utf-8')
            domain_list = content.split('\n')
            domain_list = [line.strip() for line in domain_list if line.strip()]

            allowed_count = 100 - records_count
            records_written = 0

            domain_data = []
            bad_domains = []

            for domain in domain_list:
                
                if allowed_count == 0:
                        break

                if validate_domain(domain, username):
                    already_exists = check_record_existence(domain, username)
                    
                    if already_exists:
                        print("already_exists- domain", domain)
                        continue

                    entry = {
                        "domain": domain,
                        "status": "Pending",
                        "ssl_expiration": "N/A",
                        "ssl_issuer": "N/A",
                        "last_chk": ""
                    }

                    domain_data.append(entry)
                    allowed_count-=1
                    records_written+=1
                else:
                    bad_domains.append(domain)

            with open(dest_file, "r") as file:
                data = json.load(file)
                data.extend(domain_data)
            
            with open(dest_file, "w") as file:
                json.dump(data, file, indent=4)
            
            logger.info(f"User {username} uploaded a file with {records_written} domains and {len(bad_domains)} bad domains")
            return ({"records_written": records_written, "bad_domains": len(bad_domains)})

        else:
            logger.error(f"User {username} failed to add domain file")
            return {'error': 'Invalid domain file'}
            
    else:
        logger.error(f"User {username} already has 100 domains")
        return {'error': 'User already has 100 domains'}

# function to load user domains
def load_user_domains(username):
    """
    load the user domains from the file
    returns the user domains
    """
    username = username.lower()
    dest_file = (f"data/domains/{username}_domains.json")

    try:
        with open(dest_file) as domains:
            user_domains = json.load(domains)
            return user_domains
    except (FileNotFoundError, json.JSONDecodeError):
        return []

# function to load user stats
def load_user_stats(username):
    """
    load the user stats from the file
    returns the user stats
    """
    username = username.lower()
    dest_file = (f"data/domains/{username}_domains.json")
    date = datetime.now().strftime("%Y-%m-%d")
    try:
        with open(dest_file) as domains_file:
            domains = json.load(domains_file)

            total_domains = len(domains)
            online_domains = sum(1 for domain in domains if domain['status'] == 'OK')
            offline_domains = sum(1 for domain in domains if domain['status'] == 'FAILED')
            pending_domains = sum(1 for domain in domains if domain['status'] == 'Pending')
            ssl_expired = sum(1 for domain in domains if domain['ssl_expiration'] != 'N/A' and domain['ssl_expiration'].startswith('EXPIRED:'))

            return {
                'total_domains': total_domains,
                'online_domains': online_domains,
                'ssl_expired': ssl_expired,
                'offline_domains': offline_domains,
                'pending_domains': pending_domains
            }

    except (FileNotFoundError, json.JSONDecodeError):
        return {
            'total_domains': 0,
            'online_domains': 0,
            'ssl_expired': 0,
            'offline_domains': 0,
            'pending_domains': 0
        }

# function to delete a domain
def delete_domain(domain, username):
    """
    delete a domain from the user domains file
    returns the message
    """
    username = username.lower()
    dest_file = (f"data/domains/{username}_domains.json")
   
    try:
        with open(dest_file) as domains:
            user_domains = json.load(domains)
            print('user_domains from delete_domain', user_domains)
            
            # Find and remove the domain object
            domain_found = False
            for i, domain_obj in enumerate(user_domains):
                if domain_obj.get('domain') == domain:
                    user_domains.pop(i)
                    domain_found = True
                    break
            
            if domain_found:
                with open(dest_file, "w") as file:
                    json.dump(user_domains, file, indent=4)
                logger.info(f"User {username} deleted domain: {domain}")
                return {'message': 'Domain deleted successfully'}
            else:
                return {'error': 'Domain not found'}
    except (FileNotFoundError, json.JSONDecodeError):
        return {'error': 'Failed to delete domain'}

# function to load logs
def load_user_logs():
    """
    load the user logs from the file
    returns the user logs
    """
    dest_file = (f"logs/log.log")
    with open(dest_file, "r") as file:
        logs = file.readlines()
        logs = [log.strip() for log in logs]
        return logs

if __name__ == "__main__":
    if not os.path.exists(os.path.dirname(USERS_FILE)):
        os.makedirs(os.path.dirname(USERS_FILE))
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'w') as f:
            json.dump({}, f)
    app.run(debug=True,host="0.0.0.0",port=8080)

