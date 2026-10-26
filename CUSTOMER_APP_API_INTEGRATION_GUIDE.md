# LabourSampark — Customer App API Integration Guide & cURL Collection

This guide provides the complete documentation and ready-to-use cURL commands for registering and authenticating customers in the **LabourSampark Customer App** with `userType: "user"`.

---

## 1. Overview of Backend Updates

The backend now officially supports regular customers/end-users:
* **Allowed `userType` Values**: `"user"` and `"customer"` (in addition to `"labour"`, `"contractor"`, `"sub_contractor"`, `"vendor"`, `"admin"`, `"super_admin"`).
* **Automatic Session Initialization**: During registration, a session is automatically initialized and a session-bound JWT token is returned, allowing immediate access to protected endpoints.
* **Flexible Mobile Number Formatting**: Login and Registration accept both standard 10-digit mobile numbers (`"9876543210"`) and international format (`"+919876543210"`).

---

## 2. Base URLs

* **Local Development**:
  ```text
  http://localhost:9000/api/users
  ```
  *(Alternative route alias: `http://localhost:9000/auth`)*
* **Production / Staging**:
  ```text
  https://<YOUR_BACKEND_DOMAIN>/api/users
  ```

---

## 3. Registration API (`POST /api/users/register`)

Registers a new customer account.

### Endpoint Details
- **Method**: `POST`
- **URL**: `http://localhost:9000/api/users/register`
- **Auth**: None (Public)
- **Headers**:
  ```http
  Content-Type: application/json
  ```

### Payload Requirements

| Field | Type | Required | Description / Rules |
|---|---|---|---|
| `fullName` | String | **Yes** | Full name of the customer (e.g., `"Amit Sharma"`). |
| `mobile` | String | **Yes** | 10-digit mobile number (`"9876543210"`) or prefixed (`"+919876543210"`). |
| `password` | String | **Yes** | Password (minimum 6 characters). |
| `userType` | String | **Yes** | Must be `"user"` (or `"customer"`). |
| `email` | String | *Optional* | Valid email format (e.g., `"amit.sharma@example.com"`). |
| `dob` | String | *Optional* | Date of birth in ISO/standard date format (`"YYYY-MM-DD"`). |
| `location` | Object | *Optional* | City, state, area, pincode, and address. |
| `profilePhotoUrl`| String | *Optional* | URL to customer's profile photo. |
| `termsAgreed` | Boolean| *Optional* | `true` or `false`. |

---

### cURL Request (Registration)

```bash
curl --location 'http://localhost:9000/api/users/register' \
--header 'Content-Type: application/json' \
--data-raw '{
  "fullName": "Amit Sharma",
  "email": "amit.sharma@example.com",
  "mobile": "9876543210",
  "password": "CustomerPassword@123",
  "userType": "user",
  "dob": "1995-06-15",
  "termsAgreed": true,
  "location": {
    "address": "Flat 302, Green Valley Apartments",
    "area": "Andheri West",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400053"
  }
}'
```

### Example Success Response (`201 Created`)

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "data": {
    "user": {
      "_id": "67be1234567890abcdef1234",
      "userCode": "LS26000045",
      "fullName": "Amit Sharma",
      "email": "amit.sharma@example.com",
      "mobile": "+919876543210",
      "userType": "user",
      "dob": "1995-06-15T00:00:00.000Z",
      "status": "active",
      "isVerified": false,
      "emailVerified": false,
      "mobileVerified": false,
      "location": {
        "address": "Flat 302, Green Valley Apartments",
        "area": "Andheri West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400053",
        "coordinates": {
          "type": "Point",
          "coordinates": [0, 0]
        }
      },
      "termsAgreed": true,
      "createdAt": "2026-10-27T00:50:00.000Z",
      "updatedAt": "2026-10-27T00:50:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

---

## 4. Login API (`POST /api/users/login`)

Authenticates an existing customer using mobile number (or email) and password.

### Endpoint Details
- **Method**: `POST`
- **URL**: `http://localhost:9000/api/users/login`
- **Auth**: None (Public)
- **Headers**:
  ```http
  Content-Type: application/json
  ```

### Payload Requirements

| Field | Type | Required | Description |
|---|---|---|---|
| `mobile` | String | **Required if email is not provided** | 10-digit number (`"9876543210"`) or with prefix (`"+919876543210"`). |
| `email` | String | **Required if mobile is not provided** | Customer's registered email address. |
| `password` | String | **Yes** | Account password. |
| `userType` | String | *Optional* | `"user"`. |

---

### cURL Request (Login with Mobile & Password)

```bash
curl --location 'http://localhost:9000/api/users/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "mobile": "9876543210",
  "password": "CustomerPassword@123"
}'
```

### cURL Request (Login with Email & Password)

```bash
curl --location 'http://localhost:9000/api/users/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "amit.sharma@example.com",
  "password": "CustomerPassword@123"
}'
```

### Example Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "67be1234567890abcdef1234",
      "fullName": "Amit Sharma",
      "email": "amit.sharma@example.com",
      "mobile": "+919876543210",
      "userType": "user",
      "profilePhotoUrl": null,
      "location": {
        "address": "Flat 302, Green Valley Apartments",
        "area": "Andheri West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400053",
        "coordinates": {
          "type": "Point",
          "coordinates": [0, 0]
        }
      },
      "status": "active",
      "isVerified": false,
      "emailVerified": false,
      "mobileVerified": false,
      "termsAgreed": true,
      "lastLogin": "2026-10-27T00:52:00.000Z",
      "createdAt": "2026-10-27T00:50:00.000Z",
      "updatedAt": "2026-10-27T00:52:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```

---

## 5. Authenticated Profile APIs (For Logged-in Customers)

Once logged in, attach the received token in the `Authorization` header:

### A. Get Current User Profile
- **Method**: `GET`
- **URL**: `http://localhost:9000/api/users/profile`
- **Header**: `Authorization: Bearer <TOKEN>`

```bash
curl --location 'http://localhost:9000/api/users/profile' \
--header 'Authorization: Bearer <TOKEN>'
```

### B. Update Profile
- **Method**: `PUT`
- **URL**: `http://localhost:9000/api/users/profile`
- **Header**: `Authorization: Bearer <TOKEN>`

```bash
curl --location --request PUT 'http://localhost:9000/api/users/profile' \
--header 'Authorization: Bearer <TOKEN>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "fullName": "Amit R. Sharma",
  "location": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "area": "Juhu",
    "address": "Bungalow 12, JVPD Scheme",
    "pincode": "400049"
  }
}'
```

### C. Logout Current Session
- **Method**: `POST`
- **URL**: `http://localhost:9000/api/users/logout`
- **Header**: `Authorization: Bearer <TOKEN>`

```bash
curl --location --request POST 'http://localhost:9000/api/users/logout' \
--header 'Authorization: Bearer <TOKEN>'
```

