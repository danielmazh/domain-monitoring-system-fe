import json

class fileTools:
    @staticmethod
    def updateRowsInFile(username, results):
        username = username.lower()
        dest_file = (f"data/domains/{username}_domains.json")
        try:
            with open(dest_file) as domains:
                user_domains = json.load(domains)
                print('user_domains from updateRowInFile', user_domains)
                
                # Find and update the domain object
                domain_found = False
                index = 0
                while len(results) > index:
                    result = results[index]
                    index += 1
                    for i, domain_obj in enumerate(user_domains):
                        if domain_obj.get('domain') == result['domain']:
                            user_domains[i]['status'] = result['status']
                            user_domains[i]['ssl_issuer'] = result['ssl_issuer']
                            user_domains[i]['ssl_expiration'] = result['ssl_expiration']
                            user_domains[i]['last_chk'] = result['last_chk']
                            domain_found = True
                            break
                
                if domain_found:
                    with open(dest_file, "w") as file:
                        json.dump(user_domains, file, indent=4)
                    return {'message': 'Domain record updated successfully'}
                else:
                    return {'error': 'Domain not found'}
        except (FileNotFoundError, json.JSONDecodeError):
            return {'error': 'Failed to update domain record'}
        
    @staticmethod
    def get_urls_from_file(username):
        username = username.lower()
        dest_file = (f"data/domains/{username}_domains.json")
        try:
            with open(dest_file) as domains:
                user_domains = json.load(domains)
                urls = []
                for domain in user_domains:
                    urls.append(domain['domain'])
                return urls
        except (FileNotFoundError, json.JSONDecodeError):
            return []
