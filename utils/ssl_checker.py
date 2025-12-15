import ssl
import socket
from datetime import datetime
import logging

logger = logging.getLogger('DMS_app'+'.ssl_checker')

def check_certificate(url):
    """
    Check SSL certificate for a given URL.
    Returns [issuer, expiration_date] format expected by url_checker.py
    """
    try:
        # Remove "https://", "http://", "www." from the URL if present
        hostname = url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        
        # Establish a secure connection to fetch the SSL certificate
        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443)) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                
        # Get the certificate's expiration date
        expiry_date_str = cert['notAfter']
        expiry_date = datetime.strptime(expiry_date_str, "%b %d %H:%M:%S %Y %Z")
        
        # Convert expiration date to a readable string format
        expiry_date_formatted = expiry_date.strftime("%Y-%m-%d %H:%M:%S")
        
        # Extract certificate issuer
        issuer = "Unknown"
        if 'issuer' in cert:
            # Extract the organization name from issuer
            issuer_info = cert['issuer']
            if isinstance(issuer_info, tuple):
                for item in issuer_info:
                    if isinstance(item, tuple) and len(item) >= 1:
                        if item[0][0] == 'organizationName':
                            issuer = item[0][1]
                            break
            elif isinstance(issuer_info, dict):
                issuer = issuer_info.get('organizationName', 'Unknown')
        
        # Check if the certificate is expired
        if expiry_date < datetime.utcnow():
            return [issuer, f"EXPIRED: {expiry_date_formatted}"]
        else:
            return [issuer, expiry_date_formatted]
            
    except Exception as e:
        logger.error(f"Failed to check certificate for {url}: {str(e)}")
        return ["Error", f"Failed to check certificate: {str(e)}"]

# Example usage
# print(check_certificate("https://oracle.com"))
