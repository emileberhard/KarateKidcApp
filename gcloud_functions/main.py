import functions_framework
import requests
from urllib.parse import urlparse, parse_qs
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
from google.cloud import storage
import pickle
import os
import time

# Initialize Google Cloud Storage client
storage_client = storage.Client()
bucket_name = "karatekids"
bucket = storage_client.bucket(bucket_name)

def get_last_request_time():
    blob = bucket.blob("last_request_time")
    if blob.exists():
        return float(blob.download_as_text())
    return 0

def set_last_request_time(timestamp):
    blob = bucket.blob("last_request_time")
    blob.upload_from_string(str(timestamp))

def rate_limit():
    last_request_time = get_last_request_time()
    current_time = time.time()
    if current_time - last_request_time < 5:
        time.sleep(5 - (current_time - last_request_time))
    set_last_request_time(time.time())

def get_cached_session():
    blob = bucket.blob("gocardless_session")
    if blob.exists():
        session_data = pickle.loads(blob.download_as_bytes())
        if datetime.now() < session_data['expiration']:
            return session_data['session']
    return None

def cache_session(session):
    session_data = {
        'session': session,
        'expiration': datetime.now() + timedelta(hours=1)  # Adjust expiration time as needed
    }
    blob = bucket.blob("gocardless_session")
    blob.upload_from_string(pickle.dumps(session_data))

def login_to_gocardless():
    # Hardcoded credentials
    email = "eberhard.emil@gmail.com"
    password = "degdi9-capmYt-tenmek"
    
    session = requests.Session()
    
    # Initial request to get the login page
    response = session.get("https://bankaccountdata.gocardless.com/login?pd&utm_source=gc_payments&utm_medium=product&utm_campaign=p_bad_signin_page")
    
    # Extract the state parameter from the redirected URL
    parsed_url = urlparse(response.url)
    state = parse_qs(parsed_url.query)['state'][0]
    
    # Perform the login
    login_data = {
        "client_id": "30l50SqMzsszNZuzElA3L3wBZhPdTTz9",
        "redirect_uri": "https://bankaccountdata.gocardless.com/complete/auth0/",
        "tenant": "gocardless-live-production",
        "response_type": "code",
        "scope": "openid profile email",
        "state": state,
        "connection": "custom-database",
        "username": email,
        "password": password,
        "sso": "true",
        "protocol": "oauth2",
        "_intstate": "deprecated"
    }
    
    login_response = session.post("https://auth0.gocardless.com/usernamepassword/login", json=login_data)
    
    # Parse the HTML response
    soup = BeautifulSoup(login_response.text, 'html.parser')
    form = soup.find('form', {'name': 'hiddenform'})
    
    if form:
        action_url = form.get('action')
        form_data = {input_tag.get('name'): input_tag.get('value') for input_tag in form.find_all('input')}
        
        # Submit the form
        callback_response = session.post(action_url, data=form_data)
        
        # Follow any redirects
        final_response = session.get(callback_response.url, allow_redirects=True)
        
        # Check if we're successfully logged in
        if "Bank Account Data portal will let you configure your project settings." in final_response.text:
            return session
    
    return None

def download_transactions(session, url):
    response = session.get(url)
    if response.status_code == 200:
        try:
            return response.json()
        except json.JSONDecodeError:
            return None
    else:
        return None

def process_transactions(transactions, limit=50):
    if not transactions or 'transactions' not in transactions or 'booked' not in transactions['transactions']:
        return None
    
    # Sort transactions by bookingDate in descending order
    sorted_transactions = sorted(
        transactions['transactions']['booked'],
        key=lambda x: datetime.strptime(x['bookingDate'], '%Y-%m-%d'),
        reverse=True
    )
    
    # Take only the most recent 'limit' transactions
    limited_transactions = sorted_transactions[:limit]
    
    return {'data': {'booked': limited_transactions}}


@functions_framework.http
def gocardless_function(request):
    try:
        # Apply rate limiting
        rate_limit()

        session = get_cached_session()
        
        if not session:
            session = login_to_gocardless()
            if session:
                cache_session(session)
            else:
                return "Failed to authenticate", 401
        
        transactions_url = "https://bankaccountdata.gocardless.com/data/download/21bf2653-fd5e-4502-81b7-396ecf16b07d/"
        transactions = download_transactions(session, transactions_url)
        
        if transactions:
            processed_transactions = process_transactions(transactions)
            if processed_transactions:
                return json.dumps(processed_transactions), 200, {'Content-Type': 'application/json'}
            else:
                return "Failed to process transactions", 500
        else:
            # If transaction download fails, it might be due to an expired session
            # Try to re-authenticate and try again
            session = login_to_gocardless()
            if session:
                cache_session(session)
                transactions = download_transactions(session, transactions_url)
                if transactions:
                    processed_transactions = process_transactions(transactions)
                    if processed_transactions:
                        return json.dumps(processed_transactions), 200, {'Content-Type': 'application/json'}
            
            return "Failed to download transactions", 500
    except Exception as e:
        return str(e), 500