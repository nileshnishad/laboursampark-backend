# LabourSampark — Vendor Portal API Integration Guide & cURL Documentation

This document contains the complete summary of backend changes, base URLs, authentication details, and ready-to-use cURL commands for frontend integration in the **LabourSampark Vendor Portal**.

---

## 1. Summary of Changes Made in Backend

All backend changes follow strict production-safety rules: zero breaking changes to existing Labour, Contractor, and Subcontractor services, and 100% native ES module compatibility.

| Component | File Path | Action | Description |
|---|---|---|---|
| **Global Master Data** | `src/constants/vendorConstants.js` | **Created** | Categories (`Cement & Sand`, `Steel & Rebar`, etc.), Business types, Trade categories, Units, and Statuses. |
| **User Schema** | `src/models/User.js` | **Updated** | Added `vendorDocuments`, `kycStatus`, and `businessType`. Preserved existing `documents: [ObjectId]` for Labour/Contractor KYC backward compatibility. |
| **User Controller** | `src/controllers/userController.js` | **Updated** | Added `'vendor'` to `validUserTypes` so vendor accounts are valid across system authentication & admin services. |
| **Product Model** | `src/models/VendorProduct.js` | **Created** | Products catalogue, SKUs, inventory, pricing, units, and compound text search indexes. |
| **Requirements Model** | `src/models/ProductRequirement.js` | **Created** | Buyer/site material requirements posted by contractors and embedded vendor quotations. |
| **Workforce Model** | `src/models/VendorWorkforce.js` | **Created** | Bulk workforce hiring for Labour, Contractors, and Subcontractors. |
| **Vendor Guard** | `src/middleware/vendorAuth.js` | **Created** | Secures `/api/vendor/*` routes, checks `userType === 'vendor'`, `'admin'`, or `'super_admin'`, sets `req.vendorId`. |
| **Vendor Controller** | `src/controllers/vendorController.js` | **Created** | Complete controller functions for Auth, Profile, Products, Requirements, Quotations, Workforce, and Dashboard Analytics. |
| **Vendor Router** | `src/routes/vendorRoutes.js` | **Created** | Maps all `/api/vendor/*` endpoints. |
| **App Entrypoint** | `src/app.js` | **Updated** | Mounted router: `app.use("/api/vendor", vendorRoutes);`. |
| **Seed Script** | `scripts/seedVendorData.js` | **Created** | ES module script to populate demo vendor, catalogue items, site requirements, and workforce requests. |

---

## 2. Base URLs & Authentication

### Base URL
- **Local Development**: `http://localhost:9000/api/vendor`
- **Production / Staging**: `https://<YOUR_BACKEND_DOMAIN>/api/vendor`

### Authentication Header
All endpoints under `/api/vendor/*` (except `/register` and `/login`) require a Bearer token:
```http
Authorization: Bearer <VENDOR_JWT_TOKEN>
Content-Type: application/json
```

---

## 3. All API Endpoints & cURL Commands

---

### 1. Vendor Registration
Registers a new vendor business account.

- **Method**: `POST`
- **Endpoint**: `{{baseUrl}}/register`
- **Auth**: None (Public)

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/register' \
--header 'Content-Type: application/json' \
--data-raw '{
  "fullName": "Ramesh Patel",
  "email": "ramesh@patelsuppliers.com",
  "mobile": "9876543210",
  "password": "VendorPassword@123",
  "companyName": "Patel Building Material Depot",
  "businessType": "Multi-Product Construction Material Depot",
  "gstNumber": "27AAACP1234A1Z5",
  "location": {
    "address": "Gala No 14, APMC Market Yard",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}'
```

#### Example Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Vendor registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "data": {
    "id": "v-67ba1234567890abcdef1234",
    "userId": "67ba1234567890abcdef1234",
    "fullName": "Ramesh Patel",
    "email": "ramesh@patelsuppliers.com",
    "mobile": "+919876543210",
    "companyName": "Patel Building Material Depot",
    "businessType": "Multi-Product Construction Material Depot",
    "userType": "vendor",
    "isVerified": true,
    "kycStatus": "pending_review"
  }
}
```

---

### 2. Vendor Login
Authenticates a vendor via mobile or email and password.

- **Method**: `POST`
- **Endpoint**: `{{baseUrl}}/login`
- **Auth**: None (Public)

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "mobile": "9876543210",
  "password": "VendorPassword@123"
}'
```

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "data": {
    "id": "v-67ba1234567890abcdef1234",
    "userId": "67ba1234567890abcdef1234",
    "fullName": "Ramesh Patel",
    "email": "ramesh@patelsuppliers.com",
    "mobile": "+919876543210",
    "companyName": "Patel Building Material Depot",
    "businessType": "Multi-Product Construction Material Depot",
    "userType": "vendor",
    "isVerified": true,
    "kycStatus": "pending_review"
  }
}
```

---

### 3. Get Vendor Profile & KYC Status
Retrieves vendor company info and submitted KYC documents.

- **Method**: `GET`
- **Endpoint**: `{{baseUrl}}/profile`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/profile' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>'
```

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "v-67ba1234567890abcdef1234",
    "userId": "67ba1234567890abcdef1234",
    "fullName": "Ramesh Patel",
    "email": "ramesh@patelsuppliers.com",
    "mobile": "+919876543210",
    "companyName": "Patel Building Material Depot",
    "businessType": "Multi-Product Construction Material Depot",
    "gstNumber": "27AAACP1234A1Z5",
    "registrationNumber": "REG-2024-9988",
    "location": {
      "address": "Gala No 14, APMC Market Yard",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "about": "Authorized distributor for UltraTech, Tata Steel and Astral CPVC.",
    "isVerified": true,
    "kycStatus": "pending_review",
    "documents": {
      "panCard": {
        "number": "AAACP1234A",
        "type": "PAN",
        "documentUrl": "https://storage.laboursampark.com/kyc/pan.jpg",
        "status": "pending"
      },
      "gstCertificate": {
        "number": "27AAACP1234A1Z5",
        "type": "GST",
        "documentUrl": "https://storage.laboursampark.com/kyc/gst.pdf",
        "status": "verified"
      },
      "businessRegistration": {
        "number": "REG-2024-9988",
        "type": "REG",
        "documentUrl": "https://storage.laboursampark.com/kyc/reg.pdf",
        "status": "verified"
      },
      "addressProof": {
        "number": "EB-987654",
        "type": "Electricity Bill",
        "documentUrl": "https://storage.laboursampark.com/kyc/ebill.pdf",
        "status": "pending"
      }
    },
    "createdAt": "2026-10-24T00:00:00.000Z"
  }
}
```

---

### 4. Update Vendor Profile & KYC Documents
Updates business details, description, location, or uploaded KYC document references.

- **Method**: `PUT`
- **Endpoint**: `{{baseUrl}}/profile`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location --request PUT 'http://localhost:9000/api/vendor/profile' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "companyName": "Patel Infra & Construction Supplies",
  "businessType": "Multi-Product Construction Material Depot",
  "gstNumber": "27AAACP1234A1Z5",
  "registrationNumber": "REG-2026-0012",
  "about": "Leading supplier of wholesale cement, TMT bars, and aggregates across MMR.",
  "location": {
    "address": "Plot 24, Vashi Sector 19",
    "city": "Navi Mumbai",
    "state": "Maharashtra",
    "pincode": "400705"
  },
  "documents": {
    "panCard": {
      "number": "AAACP1234A",
      "type": "PAN",
      "documentUrl": "https://storage.laboursampark.com/kyc/pan_updated.jpg",
      "status": "pending"
    }
  }
}'
```

---

### 5. Get Product Catalogue (List / Search / Filter)
Retrieves the vendor's products with optional filtering by `category`, `status`, and free-text search.

- **Method**: `GET`
- **Endpoint**: `{{baseUrl}}/products?category=Cement%20%26%20Sand&status=active&search=UltraTech`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/products?category=all&status=all&search=' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>'
```

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "67ba20000000000000000001",
      "vendorId": "67ba1234567890abcdef1234",
      "name": "UltraTech Super Cement (50kg Bag)",
      "category": "Cement & Sand",
      "sku": "UT-CEMENT-50",
      "price": 385,
      "unit": "Bag",
      "availableQuantity": 1200,
      "minOrderQuantity": 50,
      "description": "PPC Grade 53 cement suitable for civil slabs, columns, and foundations.",
      "imageUrl": "https://images.unsplash.com/photo-1589939705384-5185137a7f0f",
      "status": "active",
      "createdAt": "2026-10-24T00:00:00.000Z",
      "updatedAt": "2026-10-24T00:00:00.000Z"
    }
  ]
}
```

---

### 6. Add Product to Catalogue
Creates a new material product listing under the vendor's catalogue.

- **Method**: `POST`
- **Endpoint**: `{{baseUrl}}/products`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/products' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Tata Tiscon 550D TMT Rebar (12mm)",
  "category": "Steel & Rebar",
  "sku": "TT-TMT-12MM",
  "price": 68500,
  "unit": "Ton",
  "availableQuantity": 35,
  "minOrderQuantity": 2,
  "description": "Fe 550D grade earthquake-resistant thermo-mechanically treated rebars.",
  "imageUrl": "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122",
  "status": "active"
}'
```

#### Example Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Product added to catalogue successfully",
  "data": {
    "id": "67ba20000000000000000002",
    "vendorId": "67ba1234567890abcdef1234",
    "name": "Tata Tiscon 550D TMT Rebar (12mm)",
    "category": "Steel & Rebar",
    "sku": "TT-TMT-12MM",
    "price": 68500,
    "unit": "Ton",
    "availableQuantity": 35,
    "minOrderQuantity": 2,
    "description": "Fe 550D grade earthquake-resistant thermo-mechanically treated rebars.",
    "imageUrl": "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122",
    "status": "active"
  }
}
```

---

### 7. Update Product in Catalogue
Updates pricing, available quantity, or listing status (`active`, `inactive`, `out_of_stock`).

- **Method**: `PUT`
- **Endpoint**: `{{baseUrl}}/products/:id`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location --request PUT 'http://localhost:9000/api/vendor/products/67ba20000000000000000002' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "price": 67800,
  "availableQuantity": 50,
  "status": "active"
}'
```

---

### 8. Delete Product from Catalogue
Removes a product listing belonging to this vendor.

- **Method**: `DELETE`
- **Endpoint**: `{{baseUrl}}/products/:id`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location --request DELETE 'http://localhost:9000/api/vendor/products/67ba20000000000000000002' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>'
```

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Product removed from catalogue"
}
```

---

### 9. Get Construction Site Requirements (Buyer Leads)
Retrieves live construction site buyer requirements. If the logged-in vendor already submitted a quote, `status` becomes `"quoted"` and includes `myQuote`.

- **Method**: `GET`
- **Endpoint**: `{{baseUrl}}/requirements?category=all&status=all`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/requirements' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>'
```

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "67ba30000000000000000001",
      "title": "Need 600 Bags of OPC 53 Grade Cement for High-Rise Project",
      "category": "Cement & Sand",
      "buyerName": "Vikram Construction Ltd.",
      "buyerCompany": "Vikram Infra & Buildcon",
      "buyerPhone": "+91 98200 12345",
      "buyerEmail": "procurement@vikraminfra.com",
      "requiredQuantity": 600,
      "unit": "Bag",
      "targetPrice": 375,
      "deliveryLocation": {
        "address": "Sector 15, Ghodbunder Road",
        "city": "Thane",
        "state": "Maharashtra",
        "pincode": "400615"
      },
      "deliveryTimeline": "Within 3 Days",
      "description": "Require fresh factory-certified 53 Grade cement bags unloaded directly on site.",
      "status": "open",
      "quotations": []
    }
  ]
}
```

---

### 10. Submit Quotation to Site Requirement
Submits or modifies a vendor quotation against a buyer requirement.

- **Method**: `POST`
- **Endpoint**: `{{baseUrl}}/requirements/:id/quote`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/requirements/67ba30000000000000000001/quote' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "offeredPrice": 370,
  "deliveryDays": 2,
  "notes": "Direct factory dispatch from Kalamboli yard. GST 28% and unloading included."
}'
```

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Quotation submitted successfully to buyer",
  "data": {
    "id": "67ba30000000000000000001",
    "title": "Need 600 Bags of OPC 53 Grade Cement for High-Rise Project",
    "status": "quoted",
    "myQuote": {
      "offeredPrice": 370,
      "deliveryDays": 2,
      "notes": "Direct factory dispatch from Kalamboli yard. GST 28% and unloading included.",
      "quotedAt": "2026-10-24T01:30:00.000Z"
    }
  }
}
```

---

### 11. Get Vendor Workforce Requests
Retrieves bulk labour, contractor, or subcontractor requests posted by this vendor.

- **Method**: `GET`
- **Endpoint**: `{{baseUrl}}/workforce`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/workforce' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>'
```

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "67ba40000000000000000001",
      "vendorId": "67ba1234567890abcdef1234",
      "title": "Need 12 Warehouse Helpers for Heavy Cement & Steel Unloading",
      "workerType": "labour",
      "tradeCategory": "Loading & Material Handling Labour",
      "workersNeeded": 12,
      "skillsRequired": ["Loading / Unloading", "Stacking", "Material Sorting"],
      "workLocation": {
        "address": "Godown No. 4, Bhiwandi Logistics Hub",
        "city": "Thane",
        "state": "Maharashtra"
      },
      "startDate": "2026-10-25",
      "duration": "15 Days",
      "budgetPerWorker": 650,
      "budgetPeriod": "daily",
      "description": "Morning shift physical helpers needed for unloading 50kg bags.",
      "status": "open",
      "applicantCount": 8
    }
  ]
}
```

---

### 12. Create Workforce Bulk Hiring Requirement
Allows a vendor to post a bulk hiring request for `labour`, `contractor`, or `sub_contractor`.

- **Method**: `POST`
- **Endpoint**: `{{baseUrl}}/workforce`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/workforce' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "title": "Need 5 Experienced Welders for Structural Fabrication Yard",
  "workerType": "contractor",
  "tradeCategory": "Welding & Steel Binding Labour",
  "workersNeeded": 5,
  "skillsRequired": ["ARC Welding", "MIG Welding", "TMT Structural Bending"],
  "workLocation": {
    "address": "Plot 18, Taloja MIDC Industrial Area",
    "city": "Navi Mumbai",
    "state": "Maharashtra"
  },
  "startDate": "2026-10-28",
  "duration": "30 Days",
  "budgetPerWorker": 950,
  "budgetPeriod": "daily",
  "description": "Certified structural welders for pre-engineered building frame fabrication."
}'
```

#### Example Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Workforce bulk requirement posted successfully",
  "data": {
    "id": "67ba40000000000000000002",
    "vendorId": "67ba1234567890abcdef1234",
    "title": "Need 5 Experienced Welders for Structural Fabrication Yard",
    "workerType": "contractor",
    "tradeCategory": "Welding & Steel Binding Labour",
    "workersNeeded": 5,
    "status": "open",
    "applicantCount": 0
  }
}
```

---

### 13. Get Dashboard Analytics & KPI Stats
Returns key performance counters for the vendor portal overview dashboard.

- **Method**: `GET`
- **Endpoint**: `{{baseUrl}}/stats`
- **Auth**: Bearer Token

#### cURL Request
```bash
curl --location 'http://localhost:9000/api/vendor/stats' \
--header 'Authorization: Bearer <VENDOR_JWT_TOKEN>'
```

#### Example Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "totalProducts": 14,
    "activeProducts": 12,
    "outOfStockCount": 2,
    "totalRequirements": 38,
    "openRequirements": 25,
    "quotedRequirements": 6,
    "activeWorkforceRequests": 3,
    "totalWorkersNeeded": 24
  }
}
```

---

## 4. Frontend Integration Checklist for React

1. **Configure API Base URL in React `.env`**:
   ```env
   REACT_APP_API_URL=http://localhost:9000/api/vendor
   # or for Vite:
   VITE_API_URL=http://localhost:9000/api/vendor
   ```

2. **Axios / Fetch Interceptor**:
   Attach the token stored in `localStorage` / cookies to the `Authorization` header:
   ```javascript
   import axios from 'axios';

   const vendorApi = axios.create({
     baseURL: process.env.REACT_APP_API_URL || 'http://localhost:9000/api/vendor',
   });

   vendorApi.interceptors.request.use((config) => {
     const token = localStorage.getItem('vendorToken');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });

   export default vendorApi;
   ```

3. **Available Category Enums**:
   For dropdowns and select inputs in your React forms, use the exact category names defined in the backend:
   - **Product Categories**:
     - `"Cement & Sand"`
     - `"Steel & Rebar"`
     - `"Bricks & Stone"`
     - `"Plumbing & Pipes"`
     - `"Electrical & Lighting"`
     - `"Paints & Finishes"`
     - `"Hardware & Tools"`
     - `"Wood & Timber"`
     - `"Tiles & Flooring"`
     - `"Safety & PPE Gear"`
     - `"Heavy Machinery & Tools"`
   - **Product Units**:
     - `"Piece"`, `"Bag"`, `"Ton"`, `"Kg"`, `"Sq.Ft"`, `"Cu.Meter"`, `"Litre"`, `"Bundle"`, `"Pair"`, `"Box"`, `"Meter"`, `"Truckload"`
   - **Workforce Trade Categories**:
     - `"Loading & Material Handling Labour"`
     - `"Civil Masonry & Concrete Workers"`
     - `"Welding & Steel Binding Labour"`
     - `"Plumbing & Drainage Labour"`
     - `"Electrical Wiring & Installation"`
     - `"Carpentry & Shuttering Labour"`
     - `"Painting & Surface Prep Workers"`
     - `"Excavation & Earthwork Operators"`
     - `"Warehouse & Inventory Helpers"`
     - `"General Unskilled Helpers"`

