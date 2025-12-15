pipeline {
    agent {
        label 'jenkins-slave-team-3-new'
    }

    environment {
        GIT_COMMIT = "${env.GIT_COMMIT}"
    }

    stages {
        // Clone repository stage: Clones the source code to a persistent location on the slave
        // We clone to /opt/domain-monitoring-system instead of the workspace because:
        // 1. This location is accessible across different stages and shell sessions
        // 2. We can control when to clean it (in post section) rather than at the start
        // 3. Using credentials ensures secure access to private repositories
        stage('clone repository') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'git-new-new', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                        sh '''
                            rm -rf /opt/domain-monitoring-system
                            mkdir -p /opt/domain-monitoring-system
                            git clone -b main https://${GIT_USER}:${GIT_TOKEN}@github.com/danielmazh/domain-monitoring-system.git /opt/domain-monitoring-system
                        '''
                    }
                }
            }
        }

        // Deploy DMS App stage: Builds and deploys the application as a Docker container
        // This stage creates a temporary image tagged with the commit hash for testing purposes
        // The container runs on port 8080 and we wait for it to be ready before proceeding
        stage('Deploy DMS App as a containerized app') {
            steps {
                script {
                    // Get commit hash from the cloned repository to use as a temporary image tag
                    // This allows us to uniquely identify the build and test it before pushing to Docker Hub
                    def lastCommit = sh(script: 'cd /opt/domain-monitoring-system && git log -1 --format=%h', returnStdout: true).trim()
                    env.IMAGE_TAG = lastCommit
                    echo ""
                    echo "=========================================="
                    echo "  Temporary Image Tag: ${env.IMAGE_TAG}"
                    echo "=========================================="
                    echo ""

                    // Build docker image from /opt/domain-monitoring-system
                    // The Dockerfile contains all instructions to create a production-ready image
                    sh """
                        cd /opt/domain-monitoring-system
                        docker build -t domain-monitoring-system:${env.IMAGE_TAG} .
                        echo ""
                        echo "------------------------------------------"
                        echo "  Docker image built successfully"
                        echo "------------------------------------------"
                        echo ""
                    """

                    // Deploy the app as a container in detached mode (-d flag)
                    // Maps container port 8080 to host port 8080 for accessibility
                    sh """
                        docker run -d -p 8080:8080 domain-monitoring-system:${env.IMAGE_TAG}
                        echo ""
                        echo "------------------------------------------"
                        echo "  Container deployed and running on port 8080"
                        echo "------------------------------------------"
                        echo ""
                    """

                    // Wait for the app to be ready: Polls the application endpoint until it responds
                    // This is crucial because containers take time to start, and we need the app
                    // to be fully operational before running Selenium tests against it
                    def maxAttempts = 20
                    def attempt = 0
                    def appReady = false
                    
                    while (attempt < maxAttempts && !appReady) {
                        try {
                            def response = sh(
                                script: 'curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 || echo "000"',
                                returnStdout: true
                            ).trim()
                            
                            if (response == "200" || response == "302") {
                                echo ""
                                echo "=========================================="
                                echo "  Application is ready! (HTTP ${response})"
                                echo "=========================================="
                                echo ""
                                appReady = true
                            } else {
                                echo ""
                                echo "  Attempt ${attempt + 1}/${maxAttempts}: App not ready yet (HTTP ${response}), waiting 5 seconds..."
                                echo ""
                                sleep(5)
                            }
                        } catch (Exception e) {
                            echo ""
                            echo "  Attempt ${attempt + 1}/${maxAttempts}: Connection failed, waiting 5 seconds..."
                            echo ""
                            sleep(5)
                        }
                        attempt++
                    }
                    
                    if (!appReady) {
                        error("Application did not become ready after ${maxAttempts} attempts")
                    }
                }
            }
        }

        // Run Selenium Tests stage: Executes automated browser tests to verify application functionality
        // This stage sets up a Python virtual environment to isolate Selenium dependencies
        stage('Run Selenium Tests') {
            steps {
                script {
                    echo ""
                    echo "=========================================="
                    echo "  Setting up Selenium test environment"
                    echo "=========================================="
                    echo ""
                    
                    // Create virtual environment and install Python dependencies for Selenium
                    // MOTIVATION FOR VENV: Modern Linux systems (Ubuntu 22.04+, Debian 12+) use PEP 668
                    // which prevents installing Python packages system-wide via pip to avoid conflicts
                    // with system package managers. A virtual environment isolates dependencies and
                    // bypasses this restriction.
                    //
                    // WORKAROUND FOR PIP: Instead of using 'source selenium-venv/bin/activate' followed
                    // by 'pip install', we directly use 'selenium-venv/bin/pip'. This is because:
                    // 1. Jenkins runs shell scripts with /bin/sh (often dash, not bash)
                    // 2. The 'source' command is a bash builtin and doesn't work in dash
                    // 3. Using the venv's pip directly avoids activation and works in any shell
                    // Install python3-venv if not available (needed to create virtual environments)
                    // Create virtual environment in the project directory
                    // Falls back to --system-site-packages if standard venv creation fails
                    // Use venv's pip directly without activation (shell-agnostic approach)
                    // This works in both bash and dash, avoiding 'source' command issues
                    sh '''
                        cd /opt/domain-monitoring-system
                        apt-get update -qq || true
                        apt-get install -y python3-venv || true
                        python3 -m venv selenium-venv || python3 -m venv --system-site-packages selenium-venv
                        selenium-venv/bin/pip install --upgrade pip
                        selenium-venv/bin/pip install selenium
                    '''
                    
                    // Install Chrome and ChromeDriver: Required for Selenium to control a browser
                    // ChromeDriver must match the Chrome version, so we detect the installed version
                    // and download the corresponding ChromeDriver binary
                    // Install unzip if not available (needed to extract ChromeDriver zip file)
                    // Install Chrome browser if not already installed
                    // Selenium needs a browser to automate, and Chrome is the standard choice
                    // Install ChromeDriver: The bridge between Selenium and Chrome browser
                    // ChromeDriver version must match Chrome version for compatibility
                    // Extract Chrome version number (e.g., "142.0.7444")
                    // Try to get matching ChromeDriver version (may fail for newer Chrome versions)
                    // Download ChromeDriver from either old or new location (Google changed URLs)
                    // Move ChromeDriver to system PATH so Selenium can find it
                    sh '''
                        apt-get update -qq || true
                        apt-get install -y unzip || true
                        
                        if ! command -v google-chrome &> /dev/null; then
                            echo ""
                            echo "  Installing Google Chrome..."
                            echo ""
                            wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - || true
                            echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list || true
                            apt-get update -qq || true
                            apt-get install -y google-chrome-stable || apt-get install -y chromium-browser || true
                        fi
                        
                        if ! command -v chromedriver &> /dev/null; then
                            echo ""
                            echo "  Installing ChromeDriver..."
                            echo ""
                            CHROME_VERSION=$(google-chrome --version | grep -oP "\\d+\\.\\d+\\.\\d+\\d+" | head -1 || chromium-browser --version | grep -oP "\\d+\\.\\d+\\.\\d+\\d+" | head -1 || echo "120.0.0.0")
                            CHROMEDRIVER_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION%.*}" || echo "120.0.6099.109")
                            wget -q "https://chromedriver.storage.googleapis.com/${CHROMEDRIVER_VERSION}/chromedriver_linux64.zip" -O /tmp/chromedriver.zip || \
                            wget -q "https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/${CHROME_VERSION}/linux64/chromedriver-linux64.zip" -O /tmp/chromedriver.zip || true
                            unzip -q /tmp/chromedriver.zip -d /tmp/ || true
                            mv /tmp/chromedriver* /usr/local/bin/chromedriver || mv /tmp/chromedriver /usr/local/bin/chromedriver || true
                            chmod +x /usr/local/bin/chromedriver || true
                        fi
                    '''
                    // Note: app.py now resolves file paths and headless mode internally
                    // The test script automatically uses the correct paths and runs in headless mode
                    
                    // Run the Selenium test using the virtual environment's Python interpreter
                    // Using the venv's Python ensures Selenium and all dependencies are available
                    // We use the full path to avoid any shell activation issues
                    sh '''
                        cd /opt/domain-monitoring-system/test-selenium
                        ../selenium-venv/bin/python app.py
                    '''
                    
                    echo ""
                    echo "=========================================="
                    echo "  Selenium tests completed successfully"
                    echo "=========================================="
                    echo ""
                }
            }
        }

        // Push new Docker image stage: Tags the tested image with a semantic version and pushes to Docker Hub
        // This stage implements automatic versioning by finding the latest semantic version tag and incrementing it
        stage('push new docker image') {
            steps {
                script {
                    // Authenticate with Docker Hub using stored credentials
                    // This allows us to push images to the private/public repository
                    withCredentials([usernamePassword(credentialsId: 'docker-hub-token', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_TOKEN')]) {
                        sh '''
                            echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
                            echo ""
                            echo "------------------------------------------"
                            echo "  Logged in to Docker Hub"
                            echo "------------------------------------------"
                            echo ""
                        '''

                        // Query Docker Hub API to get all existing tags from the repository
                        // We filter for semantic version tags (e.g., "1.2.3") to find the latest version
                        def tagsResponse = sh(script: '''
                            curl -s "https://hub.docker.com/v2/repositories/danielmazh/domain-monitoring-system/tags?page_size=100" | \
                            grep -oE '"name":"[0-9]+\\.[0-9]+\\.[0-9]+"' | \
                            cut -d'"' -f4 || echo ""
                        ''', returnStdout: true).trim()
                        
                        def latestTag = ""
                        
                        if (tagsResponse) {
                            // Find the highest semantic version tag matching pattern \d+\.\d+\.\d+
                            // This filters out non-semantic tags like commit hashes or "latest"
                            def tags = tagsResponse.split('\n').findAll { it.matches('\\d+\\.\\d+\\.\\d+') }
                            if (tags && tags.size() > 0) {
                                // Find the latest tag by comparing versions manually (CPS-compatible)
                                // We can't use Groovy's sort() with closures in Jenkins CPS, so we manually
                                // compare each tag's major.minor.patch numbers to find the highest version
                                latestTag = tags[0]
                                for (def tag : tags) {
                                    def tagParts = tag.tokenize('.').collect { it.toInteger() }
                                    def latestParts = latestTag.tokenize('.').collect { it.toInteger() }
                                    
                                    // Compare major, minor, patch versions in order of precedence
                                    // Major version takes highest priority, then minor, then patch
                                    if (tagParts[0] > latestParts[0]) {
                                        latestTag = tag
                                    } else if (tagParts[0] == latestParts[0]) {
                                        if (tagParts[1] > latestParts[1]) {
                                            latestTag = tag
                                        } else if (tagParts[1] == latestParts[1]) {
                                            if (tagParts[2] > latestParts[2]) {
                                                latestTag = tag
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        
                        // If no semantic version tag found, start with 0.0.0 (will become 0.0.1)
                        // This handles the case where this is the first push to the repository
                        if (!latestTag || !latestTag.matches('\\d+\\.\\d+\\.\\d+')) {
                            latestTag = "0.0.0"
                            echo ""
                            echo "------------------------------------------"
                            echo "  No existing semantic version tag found"
                            echo "  Starting with: 0.0.1"
                            echo "------------------------------------------"
                            echo ""
                        } else {
                            echo ""
                            echo "------------------------------------------"
                            echo "  Latest semantic version tag found: $latestTag"
                            echo "------------------------------------------"
                            echo ""
                        }
                        
                        // Increment patch version: Automatically bumps the patch number (third digit)
                        // For example: 0.0.5 -> 0.0.6, 1.2.3 -> 1.2.4
                        // This follows semantic versioning where patch increments indicate bug fixes
                        def parts = latestTag.tokenize('.')
                        def newTag = "${parts[0]}.${parts[1]}.${parts[2].toInteger() + 1}"
                        env.NEW_TAG = newTag
                        echo ""
                        echo "=========================================="
                        echo "  New tag will be: $NEW_TAG"
                        echo "=========================================="
                        echo ""

                        // Tag the locally built image with the new semantic version and push to Docker Hub
                        // The image was already tested in previous stages, so it's safe to push
                        sh '''
                            docker tag domain-monitoring-system:${IMAGE_TAG} danielmazh/domain-monitoring-system:${NEW_TAG}
                            docker push danielmazh/domain-monitoring-system:${NEW_TAG}
                            echo ""
                            echo "=========================================="
                            echo "  New docker image pushed to Docker Hub"
                            echo "=========================================="
                            echo ""
                        '''
                    }
                }
            }
        }
    }
    
    // Post section: Comprehensive cleanup that runs regardless of pipeline success or failure
    // The 'always' block ensures cleanup happens even if a stage fails, preventing resource leaks
    // This is crucial for maintaining a clean Jenkins slave environment after each job run
    post {
        always {
            echo ""
            echo "=========================================="
            echo "  Running comprehensive cleanup tasks"
            echo "  Leaving a clean slave environment"
            echo "=========================================="
            echo ""
            
            // Clean Jenkins workspace: Removes all files from the workspace directory
            // This cleans up any Jenkins-managed files, checkouts, and artifacts
            cleanWs()
            
            script {
                // Remove the cloned repository directory to free up disk space
                // This removes the entire project directory including any virtual environments
                // This ensures each pipeline run starts with a clean slate
                // Remove Docker containers only if they exist
                // We check first to avoid errors when no containers are running
                // This prevents "No such container" warnings in the logs
                // Remove Docker images only if they exist
                // We check first and redirect stderr to suppress "No such image" errors
                // This happens when images are already removed or don't exist
                // The cleanup ensures the slave doesn't accumulate Docker images over time
                // Clean up Docker system (removes unused data: networks, build cache, etc.)
                // This helps free up additional disk space and ensures a truly clean state
                sh '''
                    echo ""
                    echo "------------------------------------------"
                    echo "  Cleaning up application files and Docker resources"
                    echo "------------------------------------------"
                    echo ""
                    rm -rf /opt/domain-monitoring-system || true
                    
                    if [ "$(docker ps -aq)" ]; then
                        echo ""
                        echo "  Removing Docker containers..."
                        echo ""
                        docker rm -f $(docker ps -aq) || true
                    fi
                    
                    if [ "$(docker images -q)" ]; then
                        echo ""
                        echo "  Removing Docker images..."
                        echo ""
                        docker rmi -f $(docker images -q) 2>/dev/null || true
                    fi

                    cleanWs()
                    
                    docker system prune -af --volumes 2>/dev/null || true
                    echo ""
                    echo "=========================================="
                    echo "  Cleanup completed - slave is now clean!"
                    echo "=========================================="
                    echo ""
                '''
            }
        }
    }
}
