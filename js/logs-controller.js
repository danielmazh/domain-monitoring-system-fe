// function to load logs 
function get_system_logs() {
    const refreshBtn = document.querySelector('.refresh-btn');
    const refreshIcon = refreshBtn.querySelector('i');
    
    // Show spinner
    refreshIcon.className = 'fas fa-spinner fa-spin';
    refreshBtn.disabled = true;
    
    fetchWithTimeout('/api/get-logs')
    .then(response => response.json())
    .then(logs => {
        console.log("logs:", logs);
        
        // Show success checkmark briefly
        refreshIcon.className = 'fas fa-check';
        refreshBtn.style.color = '#28a745';
        
        setTimeout(() => {
            // Reset to original state
            refreshIcon.className = 'fas fa-sync-alt';
            refreshBtn.style.color = '';
            refreshBtn.disabled = false;
        }, 1500);
        
        if (logs == []) {
            showEmptyLogsState();
        } else {
            dateTime = new Date().toLocaleString();
            console.log("dateTime:", dateTime);
            updateLogsState(logs);
        }
    })
    .catch(error => {
        console.error('Error fetching logs:', error);
        
        // Show error state
        refreshIcon.className = 'fas fa-exclamation-triangle';
        refreshBtn.style.color = '#dc3545';
        
        setTimeout(() => {
            // Reset to original state
            refreshIcon.className = 'fas fa-sync-alt';
            refreshBtn.style.color = '';
            refreshBtn.disabled = false;
        }, 2000);
    });
}

// function to show empty logs state
function showEmptyLogsState() {
    document.getElementById('emptyLogsState').style.display = 'block';
    document.getElementById('logsTableBody').innerHTML = 'no logs found';
}

// function to update logs state
function updateLogsState(logs) {
    document.getElementById('emptyLogsState').style.display = 'none';
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = ''; // Clear existing content
    
    // Filter and sort logs (latest first)
    const validLogs = logs.filter(log => log.trim()).sort((a, b) => {
        // Extract timestamp from log entries for sorting
        const timestampA = a.split(' - ')[0];
        const timestampB = b.split(' - ')[0];
        
        // Convert timestamps to comparable format
        const dateA = parseTimestamp(timestampA);
        const dateB = parseTimestamp(timestampB);
        
        return dateB - dateA; // Latest first
    });
    
    // Helper function to parse different timestamp formats
    function parseTimestamp(timestamp) {
        try {
            // Handle format: "2025-10-13 13:16:20,038"
            if (timestamp.includes(',')) {
                const cleanTimestamp = timestamp.replace(',', '.');
                return new Date(cleanTimestamp).getTime();
            }
            // Handle format: "2025-09-01 12:59:25 UTC"
            else if (timestamp.includes('UTC')) {
                const cleanTimestamp = timestamp.replace(' UTC', '');
                return new Date(cleanTimestamp + ' UTC').getTime();
            }
            // Handle standard format: "2025-10-13 13:16:20"
            else {
                return new Date(timestamp).getTime();
            }
        } catch (e) {
            // Fallback for unparseable timestamps
            return 0;
        }
    }
    
    validLogs.forEach(log => {
        const row = document.createElement('tr');
        
        // Parse the log entry: "2025-10-13 13:16:20,038 - ERROR - User ron failed to add domain: 123123"
        const parts = log.split(' - ');
        if (parts.length >= 4) {
            let timestamp = parts[0];
            let filename = parts[1];
            let level = parts[2];
            let message = parts.slice(3).join(' - '); // In case message contains " - "
            
            // Determine log level class
            let levelClass = 'log-level-info';
            if (level === 'ERROR') levelClass = 'log-level-error';
            else if (level === 'WARNING' || level === 'WARN') levelClass = 'log-level-warning';
            else if (level === 'DEBUG') levelClass = 'log-level-debug';
            
                row.innerHTML = `
                    <td class="log-timestamp">${timestamp}</td>
                    <td>${filename}</td>
                    <td><span class="${levelClass}">${level}</span></td>
                    <td class="log-message">${message}</td>                   
                `;
        } else {
            // Fallback for malformed logs
            row.innerHTML = `
                <td class="log-timestamp">-</td>
                <td></td>
                <td><span class="log-level-info">INFO</span></td>
                <td class="log-message">${log}</td>
            `;
        }
        
        tbody.appendChild(row);
    });
}

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

// function to initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    get_system_logs()
});