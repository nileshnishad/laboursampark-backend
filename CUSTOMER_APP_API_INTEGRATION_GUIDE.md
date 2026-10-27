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

---

## 6. Workers & Workforce Discovery API (Labour, Contractor, Subcontractor)

This endpoint is designed specifically for the **Customer App**. A logged-in customer passes their JWT token to search and filter service providers.

> **STRICT SAFETY & FILTERING RULE**:
> * **ALLOWED `userType` values ONLY**: `"labour"`, `"contractor"`, `"sub_contractor"`.
> * **EXCLUDED**: `"admin"`, `"editor"`, `"super_admin"`, `"user"`, `"customer"`, and `"vendor"` are strictly prohibited from being returned in this API.

### Endpoint Details
* **Method**: `GET`
* **URL**: `http://localhost:9000/api/users/workers` *(or alias: `http://localhost:9000/api/users/providers`)*
* **Auth**: Bearer User Token (`Authorization: Bearer <CUSTOMER_JWT_TOKEN>`)

### Available Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `userType` | String | `all` | Filter by role: `"labour"`, `"contractor"`, `"sub_contractor"`, comma-separated (`"labour,contractor"`), or `"all"` (returns all three). |
| `search` | String | `null` | Free-text search across name, skills, bio, company/business name, location, and work types. |
| `city` / `location` | String | `null` | Filter by city (case-insensitive substring match). |
| `state` | String | `null` | Filter by state. |
| `area` | String | `null` | Filter by area / neighborhood. |
| `skills` | String | `null` | Filter by skill name(s) (e.g., `"Mason,Painter"` or `"Welder"`). |
| `rating` / `minRating` | Number | `null` | Filter by minimum rating (e.g., `4` or `4.5`). |
| `minRate` / `maxRate` | Number | `null` | Filter by hourly/daily/project rate range. |
| `availability` | Boolean | `null` | Filter by `true` or `false`. |
| `page` | Number | `1` | Page number for pagination. |
| `limit` | Number | `20` | Items per page (max `50`). |

---

### cURL 1: Get All Workforce (Labour + Contractor + Subcontractor)

```bash
curl --location 'http://localhost:9000/api/users/workers?userType=all&page=1&limit=20' \
--header 'Authorization: Bearer <CUSTOMER_JWT_TOKEN>'
```

---

### cURL 2: Filter ONLY Labours

```bash
curl --location 'http://localhost:9000/api/users/workers?userType=labour&page=1&limit=20' \
--header 'Authorization: Bearer <CUSTOMER_JWT_TOKEN>'
```

---

### cURL 3: Filter ONLY Contractors

```bash
curl --location 'http://localhost:9000/api/users/workers?userType=contractor&page=1&limit=20' \
--header 'Authorization: Bearer <CUSTOMER_JWT_TOKEN>'
```

---

### cURL 4: Filter ONLY Sub-Contractors

```bash
curl --location 'http://localhost:9000/api/users/workers?userType=sub_contractor&page=1&limit=20' \
--header 'Authorization: Bearer <CUSTOMER_JWT_TOKEN>'
```

---

### cURL 5: Search by Skills, City & Rating

```bash
curl --location 'http://localhost:9000/api/users/workers?userType=labour&skills=Mason&city=Mumbai&minRating=4' \
--header 'Authorization: Bearer <CUSTOMER_JWT_TOKEN>'
```

---

### Example Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Workers retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "67be567890abcdef12345678",
        "fullName": "Suresh Kumar",
        "email": "suresh.labour@example.com",
        "mobile": "+919811122233",
        "userType": "labour",
        "userCode": "LS26000012",
        "profilePhotoUrl": "https://storage.laboursampark.com/profiles/suresh.jpg",
        "bio": "Experienced civil mason and plaster specialist with 8 years of on-site experience.",
        "about": "Available for residential and commercial civil works.",
        "skills": ["Masonry", "Plastering", "Brick Laying", "Concrete Work"],
        "location": {
          "city": "Mumbai",
          "state": "Maharashtra",
          "area": "Goregaon East",
          "pincode": "400063"
        },
        "rating": 4.8,
        "totalReviews": 34,
        "completedJobs": 28,
        "hourlyRate": 150,
        "dayRate": 900,
        "experience": "8 years",
        "experienceYears": 8,
        "availability": true,
        "serviceCategories": ["Civil & Construction"],
        "workTypes": ["Daily Wage", "Contract"],
        "isVerified": true,
        "businessName": null,
        "companyName": null,
        "createdAt": "2026-01-15T10:30:00.000Z"
      },
      {
        "_id": "67be9876543210fedcba8765",
        "fullName": "Rajesh Sharma",
        "email": "rajesh@sharmabuilders.com",
        "mobile": "+919822233344",
        "userType": "contractor",
        "userCode": "LS26000008",
        "profilePhotoUrl": "https://storage.laboursampark.com/profiles/rajesh.jpg",
        "bio": "Civil contractor undertaking residential renovation, tiling, and structural repairs.",
        "skills": ["General Civil Works", "Structural Repairs", "Waterproofing"],
        "location": {
          "city": "Mumbai",
          "state": "Maharashtra",
          "area": "Andheri East",
          "pincode": "400069"
        },
        "companyName": "Sharma Buildcon & Infra",
        "businessName": "Sharma Buildcon",
        "rating": 4.6,
        "totalReviews": 52,
        "completedJobs": 45,
        "teamSize": "25-50 workers",
        "dayRate": 12000,
        "availability": true,
        "isVerified": true,
        "createdAt": "2026-01-10T08:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    },
    "filters": {
      "userType": ["labour", "contractor", "sub_contractor"],
      "allowedTypes": ["labour", "contractor", "sub_contractor"],
      "city": null,
      "skills": null,
      "rating": null,
      "search": null
    }
  }
}
```


