import requests
import json
import logging
import concurrent.futures
from queue import Queue
import time
from datetime import datetime, timezone
import threading
from .ssl_checker import check_certificate

logger = logging.getLogger('DMS_app'+'.url_checker')

class URLChecker: 
    def __init__(self, urls):
        """Initialize URLChecker with a list of URLs to check."""
        self.urls = urls
        self.results = []
    
    def check_url(self, url):
        """Check a single URL and return result dictionary."""
        result = {
            'domain': url, 
            'status': 'Pending',
            'ssl_issuer': 'N/A',
            'ssl_expiration': 'N/A'
        }
        is_secured = False
        
        try:
            if url.startswith('http://') or url.startswith('https://'):
                response = requests.get(url, timeout=1)
                if url.startswith('https://'):
                    is_secured = True
            else:
                try:
                    response = requests.get(f'https://{url}', timeout=1)
                    is_secured = True
                except requests.exceptions.RequestException:
                    try:
                        response = requests.get(f'http://{url}', timeout=1)
                    except requests.exceptions.RequestException:
                        result['status'] = 'FAILED'
                        return result
            
            if response.status_code == 200:
                result['status'] = 'OK'
                if is_secured:
                    certificate = check_certificate(url)
                    result['ssl_issuer'] = certificate[0]
                    result['ssl_expiration'] = certificate[1]
            else:    
                result['status'] = 'FAILED'
                
        except requests.exceptions.RequestException:
            result['status'] = 'FAILED'
            logger.error(f"domain: {url} is check failed.")

        finally:
            result['last_chk'] = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S %Z')
        
        return result
    
    def check_all_urls(self):
        """Check all URLs using multithreading and return results."""
        start_time = time.time()
        logger.info("Starting URL liveness check...")
        urls_queue = Queue()
        analyzed_urls_queue = Queue()
        
        # Load URLs into the queue
        for url in self.urls:
            urls_queue.put(url.strip())
        
        def worker():
            """Worker function for threading."""
            while not urls_queue.empty():
                try:
                    url = urls_queue.get_nowait()
                    result = self.check_url(url)
                    analyzed_urls_queue.put(result)
                    urls_queue.task_done()
                except:
                    break
        
        # Run URL checks in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            # Submit worker tasks
            futures = [executor.submit(worker) for _ in range(20)]
            # Wait for all tasks to complete
            concurrent.futures.wait(futures)
        
        # Collect results
        while not analyzed_urls_queue.empty():
            self.results.append(analyzed_urls_queue.get())
        
        # Measure end time
        end_time = time.time()
        elapsed_time = end_time - start_time
        logger.info(f"URL liveness check complete in {elapsed_time:.2f} seconds.")
        print(f"URL liveness check complete in {elapsed_time:.2f} seconds.")
        
        return self.results
    
    def get_results(self):
        """Return the results of URL checking."""
        return self.results
