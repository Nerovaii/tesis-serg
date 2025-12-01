import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://localhost:3001"

def post_json(endpoint, data):
    url = f"{BASE_URL}{endpoint}"
    print(f"Requesting: {url}")
    req = urllib.request.Request(url)
    req.add_header('Content-Type', 'application/json')
    jsondata = json.dumps(data).encode('utf-8')
    req.add_header('Content-Length', len(jsondata))
    
    try:
        response = urllib.request.urlopen(req, jsondata)
        content = response.read()
        try:
            return response.status, json.loads(content)
        except json.JSONDecodeError:
            print(f"⚠️ Response is not JSON: {content.decode('utf-8')}")
            return response.status, {}
    except urllib.error.HTTPError as e:
        content = e.read()
        try:
            return e.code, json.loads(content)
        except json.JSONDecodeError:
            print(f"⚠️ Error Response is not JSON: {content.decode('utf-8')}")
            return e.code, {}
    except Exception as e:
        print(f"Error: {e}")
        return 500, {}

def test_change_password():
    print("Testing Change Password Endpoint...")
    
    email = "test_change@example.com"
    old_pass = "oldpassword123"
    new_pass = "newpassword123"
    
    # 1. Register
    print("\n1. Registering user...")
    status, res = post_json("/auth/register", {
        "email": email,
        "password": old_pass,
        "role": "student"
    })
    if status not in [201, 409]:
        print(f"❌ Registration failed: {status}")
        return False

    # 2. Change Password
    print("\n2. Changing password...")
    status, res = post_json("/auth/change-password", {
        "email": email,
        "currentPassword": old_pass,
        "newPassword": new_pass
    })
    print(f"Change Status: {status}")
    print(f"Change Response: {res}")
    
    if status != 200:
        print("❌ Change password failed")
        # return False # Continue to debug
        
    # 3. Verify Login with NEW password
    print("\n3. Verifying login with new password...")
    status, res = post_json("/auth/login", {
        "email": email,
        "password": new_pass
    })
    
    if status == 200:
        print("✅ Login with new password successful")
    else:
        print("❌ Login with new password failed")
        # return False

    # 4. Verify Login with OLD password (should fail)
    print("\n4. Verifying login with old password (should fail)...")
    status, res = post_json("/auth/login", {
        "email": email,
        "password": old_pass
    })
    
    if status == 401:
        print("✅ Login with old password failed as expected")
    else:
        print(f"❌ Login with old password should have failed but got {status}")
        return False

    # 5. Test Debug Endpoints
    print("\n5. Testing Debug Endpoints...")
    
    # /test
    print("Requesting: /test")
    try:
        req = urllib.request.Request(f"{BASE_URL}/test")
        res = urllib.request.urlopen(req)
        print(f"✅ /test Status: {res.status}")
    except Exception as e:
        print(f"❌ /test Failed: {e}")

    # /auth/change_password
    print("Requesting: /auth/change_password")
    status, res = post_json("/auth/change_password", {})
    print(f"Status: {status}, Response: {res}")
    
    return True

if __name__ == "__main__":
    success = test_change_password()
    sys.exit(0 if success else 1)
