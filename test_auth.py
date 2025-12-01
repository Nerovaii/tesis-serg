import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:3001"

def post_json(endpoint, data):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url)
    req.add_header('Content-Type', 'application/json')
    jsondata = json.dumps(data).encode('utf-8')
    req.add_header('Content-Length', len(jsondata))
    
    try:
        response = urllib.request.urlopen(req, jsondata)
        return response.status, json.loads(response.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())
    except Exception as e:
        print(f"Error: {e}")
        return 500, {}

def test_auth():
    print("Testing Auth Endpoints (urllib)...")
    
    # 1. Register
    print("\n1. Testing Registration...")
    email = "test_urllib@example.com"
    password = "password123"
    
    status, res = post_json("/auth/register", {
        "email": email,
        "password": password,
        "role": "student"
    })
    
    print(f"Register Status: {status}")
    print(f"Register Response: {res}")
    
    if status not in [201, 409]:
        print("❌ Registration failed")
        return False

    # 2. Login
    print("\n2. Testing Login...")
    status, res = post_json("/auth/login", {
        "email": email,
        "password": password
    })
    
    print(f"Login Status: {status}")
    print(f"Login Response: {res}")
    
    if status == 200:
        print("✅ Login successful")
        return True
    else:
        print("❌ Login failed")
        return False

if __name__ == "__main__":
    success = test_auth()
    sys.exit(0 if success else 1)
