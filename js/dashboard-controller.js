let selectedMethod = null;

// Helper function for fetch requests with timeout
function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    return fetch(url, {
        credentials: 'include', // send cookies (session)
        ...options,
        signal: controller.signal
    }).finally(() => {
        clearTimeout(timeoutId);
    });
}

// Sample JavaScript functions - integrate with your backend
function refreshData() {
    get_user_domains()
    updateStats()
}

// function to delete a domain
function deleteDomain(domain) {
    console.log('deleteDomain', domain);
    fetchWithTimeout('/api/delete-domain', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({domain: domain})
    })
    .then(response => response.json())
    .then(response => {
        if (response.message) {
            console.log('domain deleted?', response.message);
            // Auto-refresh data after delete
            refreshData();
        } else {
            console.error('Error deleting domain', response.error);
        }
    })
}

// function to check a domain
function checkUrl(tr,domain) {
    console.log('checkUrl', domain);
    // Indicate loading state
    const checkBtn = tr.querySelector('.check-btn i');
    checkBtn.classList.remove('fa-check');
    checkBtn.classList.add('fa-spinner', 'fa-spin');
    fetchWithTimeout('/api/checkurl', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({domain: domain})
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            console.log('domain checked:', data);
            // Auto-refresh data after individual check
            refreshData();
        }
    })
    .catch(error => {
        console.error('Error checking domain:', error);
    })
    .finally(() => {
        // Remove loading state
        checkBtn.classList.remove('fa-spinner', 'fa-spin');
        checkBtn.classList.add('fa-check');
    });
}

// function to check all domains
function checkURLs() {
    console.log('checkURLs');
    
    // Show spinner with informative text
    const checkAllBtn = document.querySelector('[onclick="checkURLs()"]');
    if (checkAllBtn) {
        checkAllBtn.disabled = true;
        checkAllBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Checking All...';
    }
    
    fetchWithTimeout('/api/checkurls', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            console.log('all domains checked:', data);
            // Auto-refresh data after check all
            refreshData();
        }
    })
    .catch(error => {
        console.error('Error checking all domains:', error);
        if (error.name === 'AbortError') {
            alert('Request timed out. Please try again.');
        }
    })
    .finally(() => {
        // Restore original button text
        const checkAllBtn = document.querySelector('[onclick="checkURLs()"]');
        if (checkAllBtn) {
            checkAllBtn.disabled = false;
            checkAllBtn.innerHTML = '<i class="fa fa-check"></i> Check All';
        }
    });
}

// function to select the add method
function selectAddMethod(method, element) {
    selectedMethod = method;
    
    // Reset all forms and buttons
    document.getElementById('singleDomainForm').style.display = 'none';
    document.getElementById('fileUploadForm').style.display = 'none';
    document.getElementById('addDomainBtn').style.display = 'none';
    document.getElementById('uploadFileBtn').style.display = 'none';
    
    // Remove active class from all cards
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('border-primary', 'bg-light');
    });
    
    if (method === 'single') {
        document.getElementById('singleDomainForm').style.display = 'block';
        document.getElementById('addDomainBtn').style.display = 'inline-block';
        // Add active styling to single domain card
        if (element) {
            element.classList.add('border-primary', 'bg-light');
        }
    } else if (method === 'file') {
        document.getElementById('fileUploadForm').style.display = 'block';
        document.getElementById('uploadFileBtn').style.display = 'inline-block';
        // Add active styling to file upload card
        if (element) {
            element.classList.add('border-primary', 'bg-light');
        }
    }
}

// function to add a single domain
function addDomain() {
    const domainName = document.getElementById('domainName').value.trim();
    fetchWithTimeout('/api/add-domain', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({domain: domainName})
    })
    .then(response => response.json())
    .then(data=> {
        if (data.error) {
            alert(data.error);
        } else {
            console.log('domain added:', data);
            closeModalAndReset();
            // Auto-refresh data after adding domain
            refreshData();
        }
    })
}

// function to upload a file of domains
function uploadFile() {
    const fileInput = document.getElementById('domainFile');
    const file = fileInput.files[0];
    
    if (file) {
        // Implement file upload functionality
        console.log('Uploading file:', file.name);
        
        // You can add file validation here
        const allowedTypes = ['text/plain', 'text/csv'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a .txt or .csv file');
            return;
        }

        // Process the file
        const reader = new FileReader();
        const formData = new FormData();
        reader.onload = function(e) {
            const content = e.target.result;
            const domains = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            console.log('Domains from file:', domains);

            formData.append('domain_file', file);
            fetchWithTimeout('/api/add-domain-file', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data=> {
                if (data.error) {
                    alert(data.error);
                } else {
                    console.log('domain file added:', data);
                    closeModalAndReset();
                    // Auto-refresh data after uploading file
                    refreshData();
                }
            })
            
            // Close modal and reset
            closeModalAndReset();
        };
        reader.readAsText(file);
    } else {
        alert('Please select a file to upload');
    }
}

// function to close the modal and reset the forms
function closeModalAndReset() {
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addDomainModal'));
    modal.hide();
    
    // Reset forms
    document.getElementById('addSingleDomainForm').reset();
    document.getElementById('addFileUploadForm').reset();
    
    // Reset method selection
    selectedMethod = null;
    document.getElementById('singleDomainForm').style.display = 'none';
    document.getElementById('fileUploadForm').style.display = 'none';
    document.getElementById('addDomainBtn').style.display = 'none';
    document.getElementById('uploadFileBtn').style.display = 'none';
    
    // Remove active styling from cards
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('border-primary', 'bg-light');
    });
}

// function to update the stats
function updateStats() {
    fetchWithTimeout('/api/get-stats')
    .then(response => response.json())
    .then(stats => {
        document.getElementById('totalDomains').textContent = stats.total_domains;
        document.getElementById('onlineDomains').textContent = stats.online_domains;
        document.getElementById('sslExpiring').textContent = stats.ssl_expired;
        document.getElementById('offlineDomains').textContent = stats.offline_domains;
        document.getElementById('pendingDomains').textContent = stats.pending_domains;
    })
    .catch(error => {
        console.error('Error updating stats:', error);
    });
}

// function to show the empty state
function showEmptyState() {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('domainsTableBody').innerHTML = '';
}

// function to update the table state
function updateTableState(domains) {
    document.getElementById('emptyState').style.display = 'none';

    const tbody = document.getElementById('domainsTableBody');
    tbody.innerHTML = ''; 

    domains.forEach(domain => {
        const row = createDomainRow(domain);
        tbody.appendChild(row);
    })
}

// functions to create the domain row
function createDomainRow(domainData) {
    const row = document.createElement('tr');
    row.setAttribute('data-domain', domainData.domain);
    
    // Determine badge color and icon based on status
    let badgeClass = 'badge ';
    let statusIcon = '';
    let statusText = '';
    
    if (domainData.status === 'OK') {
        badgeClass += 'bg-success'; // Green for OK/Online
        statusIcon = '<i class="fas fa-check-circle"></i>';
        statusText = 'OK';
    } else if (domainData.status === 'FAILED') {
        badgeClass += 'bg-danger'; // Red for FAILED/Offline
        statusIcon = '<i class="fas fa-times-circle"></i>';
        statusText = 'FAILED';
    } else if (domainData.status === 'Pending') {
        badgeClass += 'bg-secondary'; // Gray for Pending
        statusIcon = '<i class="fas fa-clock"></i>';
        statusText = 'Pending';
    } else {
        badgeClass += 'bg-warning'; // Yellow for expired/other statuses
        statusIcon = '<i class="fas fa-exclamation-triangle"></i>';
        statusText = 'Expired';
    }
    
    row.innerHTML = `
        <td><strong>${domainData.domain}</strong></td>
        <td><span class="${badgeClass}">${statusIcon} ${statusText}</span></td>
        <td>${domainData.ssl_expiration}</td>
        <td>${domainData.ssl_issuer}</td>
        <td>
            <div>
                <button class="btn btn-outline-primary btn-sm delete-btn" 
                    style="color: red; border-color: red;" 
                    onmouseover="this.style.backgroundColor='red'; this.style.color='white';"
                    onmouseout="this.style.backgroundColor='transparent'; this.style.color='red';" title="Delete Domain">
                    <i class="fas fa-trash"></i>
                </button>

                <button class="btn btn-outline-primary btn-sm check-btn" 
                    style="color: blue; border-color: blue;" 
                    onmouseover="this.style.backgroundColor='blue'; this.style.color='white';"
                    onmouseout="this.style.backgroundColor='transparent'; this.style.color='blue';" title="Check Domain">
                    <i class="fa-solid fa-check"></i>
                </button>
            </div>
        </td>
        <td>${domainData.last_chk}</td>
    `;
    return row;
}

// function to load domains 
function get_user_domains(sortBy, sortOrder) {
    fetchWithTimeout('/api/get-domains' , {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sortBy: sortBy, sortOrder: sortOrder})
    })
    .then(response => response.json())
    .then(domains => {
        if (domains.length == 0) {
            showEmptyState();
        } else {
            // Sort domains by priority before displaying
            //const sortedDomains = sortDomainsByPriority(domains);
            updateTableState(domains);
        }
    })
}

// Event delegation for delete buttons
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
        let button = e.target.closest('.delete-btn');
        let domain = button.closest('tr').dataset.domain;
        
        // Show confirmation dialog
        if (confirm(`Are you sure you want to delete "${domain}"?`)) {
            deleteDomain(domain);
        }
    }
});

// Event delegation for check buttons
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('check-btn') || e.target.closest('.check-btn')) {
        let button = e.target.closest('.check-btn');
        let tr = button.closest('tr');        
        let domain = tr.dataset.domain;
        checkUrl(tr, domain);
    }
});

// function to initialize the dashboard
document.addEventListener('DOMContentLoaded', async function() {
    // Session check first
    try {
        const r = await fetchWithTimeout("/api/get-domains", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });

        if (r.status === 401 || r.status === 403) {
            window.location.replace("login.html");
            return;
        }

        const ct = (r.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("text/html")) {
            window.location.replace("login.html");
            return;
        }
    } catch (e) {
        window.location.replace("login.html");
        return;
    }

    // Fetch and display current username and check admin role
    try {
        const userResponse = await fetchWithTimeout("/api/current-user", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });
        const userData = await userResponse.json();
        const welcomeMessage = document.getElementById("welcomeMessage");
        if (welcomeMessage && userData.username) {
            welcomeMessage.textContent = `Welcome, ${userData.username}`;
        }
        
        // Admin link is visible for all users but protected by backend
        // Non-admin users will be redirected to dashboard when accessing admin.html
    } catch (e) {
        console.error("Failed to fetch current user:", e);
    }

    // Load data
    get_user_domains()
    updateStats();

    // Logout handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (event) => {
            event.preventDefault(); // Prevent default anchor behavior
            try {
                await fetchWithTimeout("/api/logout", { method: "GET" });
            } catch (e) {
                console.error("Logout failed:", e);
            } finally {
                window.location.href = "login.html";
            }
        });
    }
});

function sortTable(button, column) {
    let isDesc = button.classList.contains('desc');
    
    buttons = document.querySelectorAll('th');
    buttons.forEach(btn => {
        btn.classList.remove('asc', 'desc');
    });
    if (isDesc) {
        button.classList.add('asc');
    } 
    else {
        button.classList.add('desc');
    }
    get_user_domains(column, isDesc ? 'asc' : 'desc');
}   