# LabourSampark Backend — Complete Technical Reference

> **Last Updated:** 14 April 2026  
> **Version:** 1.0.0  
> **Base URL:** `http://localhost:5000` (dev) | Vercel (prod)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Database Models](#4-database-models)
5. [Authentication](#5-authentication)
6. [API Reference with cURL](#6-api-reference-with-curl)
   - [Auth & Users](#61-auth--users)
   - [Discovery (Public)](#62-discovery-public)
   - [Jobs](#63-jobs)
   - [Job Enquiries](#64-job-enquiries)
   - [Notifications](#65-notifications)
   - [User Reviews](#66-user-reviews)
   - [Documents](#67-documents)
   - [Activity History](#68-activity-history)
   - [Job History](#69-job-history)
   - [Payments (PayU)](#610-payments-payu)
   - [Inquiry (Contact Form)](#611-inquiry-contact-form)
   - [Public / Skills](#612-public--skills)
7. [Status & Enum Reference](#7-status--enum-reference)
8. [Error Response Format](#8-error-response-format)
9. [Feature Completion Status](#9-feature-completion-status)
10. [Pending / TODO](#10-pending--todo)
11. [Environment Variables](#11-environment-variables)

---

## 1. Project Overview

**LabourSampark** is a labour marketplace backend that connects **Contractors** / **Sub-contractors** with **Labour** workers in India.

### User Roles

| Role | Can Do |
|------|--------|
| `labour` | Browse jobs, apply (enquire), receive accept/reject, leave reviews |
| `sub_contractor` | Post jobs targeting labour, apply to contractor jobs, manage workers |
| `contractor` | Post jobs, manage enquiries, accept/reject applicants, review workers |
| `admin` | Manage platform, verify documents |
| `super_admin` | Full platform control |

### Core Flows

```
Contractor posts Job
    ↓
Labour/Sub-contractor sends JobEnquiry
    ↓
Contractor accepts/rejects enquiry
    ↓
In-app Notification + Email sent to applicant
    ↓
Job completed → Reviews exchanged → Job History updated
```

---

## 2. Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js v5 |
| Database | MongoDB via Mongoose v9 |
| Auth | JWT (jsonwebtoken) |
| Password Hashing | bcryptjs |
| Email | Nodemailer |
| File Upload | Multer v2 |
| Deployment | Vercel |
| Dev Server | Nodemon |

---

## 3. Architecture

```
src/
├── app.js                  # Express app setup, routes registration
├── server.js               # HTTP server entry point
├── config/
│   └── db.js               # MongoDB connection
├── middleware/
│   └── authMiddleware.js   # JWT auth guards
├── models/                 # Mongoose schemas
├── controllers/            # Business logic
├── routes/                 # Route definitions
└── utils/
    ├── activityLogger.js   # Audit trail helper
    ├── sendEmail.js        # Nodemailer wrapper
    └── templates/          # HTML email templates
        ├── forgotPasswordTemplate.js
        ├── jobAcceptanceTemplate.js
        └── jobRejectionTemplate.js
```

### Request Lifecycle

```
Request → CORS → JSON Parser → Route → [Auth Middleware] → Controller → MongoDB → Response
```

---

## 4. Database Models

### User
| Field | Type | Notes |
|-------|------|-------|
| `fullName` | String | |
| `email` | String | Unique identifier |
| `password` | String | bcrypt hashed, `select: false` |
| `mobile` | String | |
| `userType` | String | `labour \| contractor \| sub_contractor \| admin \| super_admin` |
| `skills` | [String] | |
| `location` | Object | city, state, area, pincode, address, GeoJSON coordinates |
| `display` | Boolean | Visible in public discovery, default `false` |
| `rating` | Number | Avg rating |
| `completedJobs` | Number | |
| `isVerified` | Boolean | |
| `availability` | Boolean | |
| `bankDetails` | Object | accountHolder, accountNumber, IFSC, bankName |
| `resetPasswordToken` | String | For forgot-password flow |
| `resetPasswordExpires` | Date | |

### Job
| Field | Type | Notes |
|-------|------|-------|
| `workTitle` | String | Required |
| `description` | String | Required |
| `target` | [String] | Auto-set: `labour`, `sub_contractor`, `contractor` |
| `location` | Object | GeoJSON + address fields |
| `workersNeeded` | Number | |
| `requiredSkills` | [String] | |
| `estimatedBudget` | Number | |
| `budgetType` | String | `fixed \| hourly \| daily` |
| `status` | String | `open \| in_progress \| completed \| closed \| cancelled` |
| `createdBy` | ObjectId → User | |
| `selectedWorkers` | [ObjectId] | Workers approved |
| `totalApplications` | Number | |
| `deadline` | Date | |
| `isActive` | Boolean | Toggle activation |

### JobEnquiry
| Field | Type | Notes |
|-------|------|-------|
| `jobId` | ObjectId → Job | |
| `userId` | ObjectId → User | Applicant |
| `postedBy` | ObjectId → User | Job creator |
| `userDetails` | Object | Snapshot at time of apply |
| `message` | String | Cover message |
| `status` | String | `pending \| accepted \| rejected \| withdrawn` |
| `rejectionReason` | String | |
| `acceptedAt / rejectedAt` | Date | |
| `notes` | String | Contractor's private notes |

**Unique index:** `{ jobId, userId }` — one enquiry per job per user.

### Notification
| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | Recipient |
| `notificationType` | String | See enum list |
| `jobId / enquiryId / relatedUserId` | ObjectId | Context refs |
| `title / message` | String | Display content |
| `isRead` | Boolean | |
| `priority` | String | `low \| medium \| high` |
| `actionRequired` | Boolean | |

### Payment
| Field | Type | Notes |
|-------|------|-------|
| `txnId` | String | Unique, PayU transaction ID |
| `receipt` | String | Internal receipt ID |
| `amount` | Number | In INR paise/rupees |
| `gateway` | String | `payu` |
| `status` | String | `created \| pending \| success \| failed \| cancelled \| expired` |
| `paymentUrlToken` | String | Secure checkout token |
| `hashValidated` | Boolean | PayU hash verification |

### UserReview
| Field | Type | Notes |
|-------|------|-------|
| `jobId` | ObjectId | |
| `userId` | ObjectId | Who is being reviewed |
| `reviewedBy` | ObjectId | Who wrote the review |
| `rating` | Number | 1–5 |
| `feedback` | String | 10–1000 chars |
| `ratingDetails` | Object | workQuality, communication, timeliness, professionalism |
| `reviewType` | String | `worker_review \| contractor_review` |

### Document
| Field | Type | Notes |
|-------|------|-------|
| `documentType` | String | aadhar, pan, gst_certificate, etc. |
| `documentUrl` | String | Storage URL |
| `verified` | Boolean | |
| `status` | String | `pending \| approved \| rejected \| expired` |

### ActivityHistory
Audit trail of every significant action (job_created, enquiry_accepted, login, etc.)

### UserJobHistory
Tracks each user's application journey per job with timestamps.

### Inquiry
Contact form submissions from the public.

### Skills
Platform-level skills catalogue (used in user profiles and job requirements).

---

## 5. Authentication

All protected routes require a JWT in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

- Token is issued on **register** and **login**
- Expires in **7 days**
- Decoded payload: `{ userId, email }`

---

## 6. API Reference with cURL

> Replace `TOKEN` with your JWT, `BASE_URL` with `http://localhost:5000`

---

### 6.1 Auth & Users

#### Register
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "password": "password123",
    "mobile": "9876543210",
    "userType": "labour",
    "skills": ["Painting", "Plumbing"],
    "location": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "area": "Andheri",
      "pincode": "400053",
      "address": "123 Worker Colony"
    }
  }'
```

**Response 201:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": { "user": { "_id": "...", "fullName": "Ramesh Kumar", ... } }
}
```

---

#### Login
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ramesh@example.com",
    "password": "password123"
  }'
```

Login with mobile:
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "9876543210",
    "password": "password123"
  }'
```

**Response 200:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": { "user": { ... } }
}
```

---

#### Forgot Password
```bash
curl -X POST http://localhost:5000/api/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{ "email": "ramesh@example.com" }'
```

#### Reset Password
```bash
curl -X POST http://localhost:5000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<reset_token_from_email>",
    "password": "newpassword123"
  }'
```

#### Change Password (Protected)
```bash
curl -X POST http://localhost:5000/api/users/change-password \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword456"
  }'
```

---

#### Get Profile (Protected)
```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer TOKEN"
```

#### Update Profile (Protected)
```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Ramesh Kumar Updated",
    "bio": "Experienced plumber with 5 years",
    "skills": ["Plumbing", "Welding", "Carpentry"],
    "experience": "5 years",
    "experienceRange": "3-5 years",
    "availability": true,
    "display": true,
    "location": {
      "city": "Pune",
      "state": "Maharashtra",
      "area": "Kothrud",
      "pincode": "411038",
      "address": "45 Labour Nagar"
    },
    "workingHours": "flexible",
    "workTypes": ["full-time", "part-time"]
  }'
```

---

### 6.2 Discovery (Public)

#### Get All Labour Users
```bash
curl -X GET "http://localhost:5000/api/users/labours?city=Mumbai&skills=Plumbing&page=1&limit=10"
```

#### Get All Contractors
```bash
curl -X GET "http://localhost:5000/api/users/contractors?state=Maharashtra&page=1&limit=10"
```

#### Get Visible Users (Protected)
```bash
curl -X GET http://localhost:5000/api/users/visible \
  -H "Authorization: Bearer TOKEN"
```

---

### 6.3 Jobs

#### Create Job (Contractor/Sub-contractor only)
```bash
curl -X POST http://localhost:5000/api/jobs/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workTitle": "Building Renovation Work",
    "description": "Need skilled workers for 3-floor renovation project",
    "workersNeeded": 5,
    "requiredSkills": ["Mason", "Carpenter", "Painter"],
    "estimatedBudget": 50000,
    "budgetType": "fixed",
    "deadline": "2026-06-01",
    "expectedStartDate": "2026-04-20",
    "duration": { "value": 30, "unit": "days" },
    "location": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "area": "Bandra",
      "pincode": "400050",
      "address": "Plot 12, Bandra West"
    },
    "requiredDetails": "Must have own tools. Daily wage Rs.800"
  }'
```

**Response 201:**
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": { "job": { "_id": "JOB_ID", "workTitle": "Building Renovation Work", "status": "open", ... } }
}
```

---

#### Get All Jobs (Feed)
```bash
curl -X GET "http://localhost:5000/api/jobs/?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

#### Get My Posted Jobs
```bash
curl -X GET http://localhost:5000/api/jobs/my-jobs \
  -H "Authorization: Bearer TOKEN"
```

#### Get Job By ID
```bash
curl -X GET http://localhost:5000/api/jobs/JOB_ID \
  -H "Authorization: Bearer TOKEN"
```

#### Update Job
```bash
curl -X PUT http://localhost:5000/api/jobs/JOB_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "estimatedBudget": 60000,
    "workersNeeded": 8,
    "description": "Updated: Need 8 workers for large renovation"
  }'
```

#### Delete Job
```bash
curl -X DELETE http://localhost:5000/api/jobs/JOB_ID \
  -H "Authorization: Bearer TOKEN"
```

#### Toggle Job Activation
```bash
curl -X POST http://localhost:5000/api/jobs/JOB_ID/toggle-activation \
  -H "Authorization: Bearer TOKEN"
```

#### Get Job Applications (Job Creator Only)
```bash
curl -X GET http://localhost:5000/api/jobs/JOB_ID/applications \
  -H "Authorization: Bearer TOKEN"
```

#### Select Worker
```bash
curl -X POST http://localhost:5000/api/jobs/JOB_ID/select-worker \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "workerId": "USER_ID" }'
```

#### Complete Job
```bash
curl -X POST http://localhost:5000/api/jobs/JOB_ID/complete \
  -H "Authorization: Bearer TOKEN"
```

---

### 6.4 Job Enquiries

#### Apply to a Job (Labour/Sub-contractor)
```bash
curl -X POST http://localhost:5000/api/job-enquiries/JOB_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I am experienced in mason work and available immediately. I have my own tools.",
    "interest": true
  }'
```

**Response 201:**
```json
{
  "success": true,
  "message": "Enquiry submitted successfully",
  "data": { "enquiry": { "_id": "ENQUIRY_ID", "status": "pending", ... } }
}
```

---

#### Get Enquiries for a Job (Job Creator Only)
```bash
curl -X GET "http://localhost:5000/api/job-enquiries/job/JOB_ID?status=pending&page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

#### Get My Submitted Enquiries
```bash
curl -X GET "http://localhost:5000/api/job-enquiries/my/list?status=pending" \
  -H "Authorization: Bearer TOKEN"
```

#### Get Applied Jobs (Full Job Details)
```bash
curl -X GET http://localhost:5000/api/job-enquiries/applied/jobs \
  -H "Authorization: Bearer TOKEN"
```

#### Get Single Enquiry Details
```bash
curl -X GET http://localhost:5000/api/job-enquiries/ENQUIRY_ID \
  -H "Authorization: Bearer TOKEN"
```

---

#### ✅ Accept Enquiry (Job Creator)
```bash
curl -X POST http://localhost:5000/api/job-enquiries/ENQUIRY_ID/accept \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**What happens internally:**
1. JobEnquiry status → `accepted`
2. `acceptedAt` timestamp set
3. User added to `Job.selectedWorkers`
4. In-app Notification created (priority: `high`)
5. Acceptance email sent to applicant
6. Activity logged

**Response 200:**
```json
{
  "success": true,
  "message": "Enquiry accepted successfully",
  "data": { "enquiry": { "status": "accepted", "acceptedAt": "..." } }
}
```

---

#### ❌ Reject Enquiry (Job Creator)
```bash
curl -X POST http://localhost:5000/api/job-enquiries/ENQUIRY_ID/reject \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rejectionReason": "We have already filled the position with another candidate."
  }'
```

**What happens internally:**
1. JobEnquiry status → `rejected`
2. `rejectedAt` timestamp set, `rejectionReason` stored
3. In-app Notification created (priority: `medium`)
4. Rejection email sent with reason
5. Activity logged

---

#### Withdraw Enquiry (Applicant)
```bash
curl -X POST http://localhost:5000/api/job-enquiries/ENQUIRY_ID/withdraw \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Found another job" }'
```

#### Add Notes to Enquiry (Job Creator)
```bash
curl -X PUT http://localhost:5000/api/job-enquiries/ENQUIRY_ID/notes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "notes": "Candidate has good references. Shortlisted for interview." }'
```

---

### 6.5 Notifications

#### Get All Notifications
```bash
curl -X GET "http://localhost:5000/api/notifications?isRead=false&page=1&limit=20&sortBy=newest" \
  -H "Authorization: Bearer TOKEN"
```

**Query Params:**
| Param | Values | Default |
|-------|--------|---------|
| `isRead` | `true / false` | all |
| `page` | number | 1 |
| `limit` | number | 20 |
| `sortBy` | `newest / oldest / unread` | newest |

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "...",
        "notificationType": "enquiry_accepted",
        "title": "Application Accepted!",
        "message": "Your application for 'Building Renovation Work' has been accepted.",
        "isRead": false,
        "priority": "high",
        "createdAt": "2026-04-14T10:00:00.000Z"
      }
    ],
    "pagination": { "total": 5, "page": 1, "pages": 1 }
  }
}
```

#### Get Unread Count
```bash
curl -X GET http://localhost:5000/api/notifications/unread/count \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{ "success": true, "data": { "unreadCount": 3 } }
```

#### Mark Single Notification as Read
```bash
curl -X PUT http://localhost:5000/api/notifications/NOTIFICATION_ID/read \
  -H "Authorization: Bearer TOKEN"
```

#### Mark All as Read
```bash
curl -X PUT http://localhost:5000/api/notifications/mark/all-read \
  -H "Authorization: Bearer TOKEN"
```

#### Delete Notification
```bash
curl -X DELETE http://localhost:5000/api/notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer TOKEN"
```

#### Delete All Notifications
```bash
curl -X DELETE http://localhost:5000/api/notifications/delete/all \
  -H "Authorization: Bearer TOKEN"
```

---

### 6.6 User Reviews

#### Submit Review (After Job Completion)
```bash
curl -X POST http://localhost:5000/api/user-reviews/submit \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "JOB_ID",
    "userId": "REVIEWED_USER_ID",
    "rating": 4,
    "feedback": "Excellent work quality and punctuality. Would hire again.",
    "reviewType": "contractor_review",
    "ratingDetails": {
      "workQuality": 5,
      "communication": 4,
      "timeliness": 4,
      "professionalism": 4
    }
  }'
```

**`reviewType` values:**
- `contractor_review` — contractor reviewing a labour worker
- `worker_review` — labour worker reviewing a contractor

#### Get Reviews for a User
```bash
curl -X GET "http://localhost:5000/api/user-reviews/user/USER_ID?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

#### Get Reviews for a Job
```bash
curl -X GET http://localhost:5000/api/user-reviews/job/JOB_ID
```

#### Get User Rating Details
```bash
curl -X GET http://localhost:5000/api/user-reviews/rating/USER_ID
```

**Response:**
```json
{
  "success": true,
  "data": {
    "averageRating": 4.2,
    "totalReviews": 15,
    "ratingBreakdown": { "5": 8, "4": 4, "3": 2, "2": 1, "1": 0 },
    "categoryAverages": {
      "workQuality": 4.5,
      "communication": 4.1,
      "timeliness": 4.0,
      "professionalism": 4.3
    }
  }
}
```

#### Mark Review as Helpful
```bash
curl -X POST http://localhost:5000/api/user-reviews/REVIEW_ID/helpful \
  -H "Authorization: Bearer TOKEN"
```

#### Delete Review (Reviewer Only)
```bash
curl -X DELETE http://localhost:5000/api/user-reviews/REVIEW_ID \
  -H "Authorization: Bearer TOKEN"
```

---

### 6.7 Documents

#### Upload Document
```bash
curl -X POST http://localhost:5000/api/documents/USER_ID/upload \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "aadhar",
    "documentName": "Aadhar Card Front",
    "documentUrl": "https://storage.example.com/docs/aadhar-ramesh.jpg",
    "fileType": "jpg",
    "fileSize": 204800,
    "issueDate": "2020-01-01",
    "issuingAuthority": "UIDAI"
  }'
```

**`documentType` options:** `aadhar`, `pan`, `passport`, `driving_license`, `gst_certificate`, `business_registration`, `insurance`, `certificate`, `qualification`, `experience_letter`, `bank_statement`, `other`

#### Get User Documents
```bash
curl -X GET http://localhost:5000/api/documents/USER_ID
```

#### Get Documents by Type
```bash
curl -X GET "http://localhost:5000/api/documents/USER_ID/type?documentType=aadhar"
```

#### Get Verified Documents
```bash
curl -X GET http://localhost:5000/api/documents/USER_ID/verified
```

#### Update Document Status (Admin)
```bash
curl -X PATCH http://localhost:5000/api/documents/document/DOCUMENT_ID/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "verificationNotes": "Document verified and matches records"
  }'
```

#### Delete Document
```bash
curl -X DELETE http://localhost:5000/api/documents/document/DOCUMENT_ID
```

#### Get Pending Documents (Admin)
```bash
curl -X GET http://localhost:5000/api/documents/admin/pending
```

---

### 6.8 Activity History

#### Get My Activity History
```bash
curl -X GET "http://localhost:5000/api/activity-history?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

#### Get Activity Summary
```bash
curl -X GET http://localhost:5000/api/activity-history/summary/overview \
  -H "Authorization: Bearer TOKEN"
```

#### Get Activity Timeline (Grouped by Date)
```bash
curl -X GET http://localhost:5000/api/activity-history/timeline/grouped \
  -H "Authorization: Bearer TOKEN"
```

#### Get Activity by Type
```bash
curl -X GET http://localhost:5000/api/activity-history/type/job_created \
  -H "Authorization: Bearer TOKEN"
```

**`activityType` options:** `job_created`, `job_updated`, `job_deleted`, `job_completed`, `job_closed`, `enquiry_created`, `enquiry_accepted`, `enquiry_rejected`, `enquiry_withdrawn`, `worker_selected`, `review_submitted`, `profile_updated`, `document_uploaded`, `password_changed`, `login`, `logout`

#### Get Activities for an Entity
```bash
curl -X GET http://localhost:5000/api/activity-history/entity/JOB_OR_ENQUIRY_ID \
  -H "Authorization: Bearer TOKEN"
```

#### Delete Activity
```bash
curl -X DELETE http://localhost:5000/api/activity-history/ACTIVITY_ID \
  -H "Authorization: Bearer TOKEN"
```

#### Clear All Activity History
```bash
curl -X DELETE http://localhost:5000/api/activity-history/clear/all \
  -H "Authorization: Bearer TOKEN"
```

---

### 6.9 Job History

#### Get All My Job History
```bash
curl -X GET http://localhost:5000/api/job-history/my/all \
  -H "Authorization: Bearer TOKEN"
```

#### Get Job History Stats
```bash
curl -X GET http://localhost:5000/api/job-history/my/stats \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 20,
    "applied": 15,
    "accepted": 8,
    "rejected": 4,
    "withdrawn": 3,
    "completed": 6
  }
}
```

#### Get Applied Jobs History
```bash
curl -X GET http://localhost:5000/api/job-history/my/applied \
  -H "Authorization: Bearer TOKEN"
```

#### Get Accepted Jobs History
```bash
curl -X GET http://localhost:5000/api/job-history/my/accepted \
  -H "Authorization: Bearer TOKEN"
```

#### Get Rejected Jobs History
```bash
curl -X GET http://localhost:5000/api/job-history/my/rejected \
  -H "Authorization: Bearer TOKEN"
```

#### Get Withdrawn Jobs History
```bash
curl -X GET http://localhost:5000/api/job-history/my/withdrawn \
  -H "Authorization: Bearer TOKEN"
```

#### Get Completed Jobs History
```bash
curl -X GET http://localhost:5000/api/job-history/my/completed \
  -H "Authorization: Bearer TOKEN"
```

#### Get Detailed Job History Entry
```bash
curl -X GET http://localhost:5000/api/job-history/my/detail/JOB_HISTORY_ID \
  -H "Authorization: Bearer TOKEN"
```

#### Get Application Timeline
```bash
curl -X GET http://localhost:5000/api/job-history/my/timeline/JOB_HISTORY_ID \
  -H "Authorization: Bearer TOKEN"
```

#### Smart Dashboard (Auto-detects user type)
```bash
curl -X GET http://localhost:5000/api/job-history/smart/dashboard \
  -H "Authorization: Bearer TOKEN"
```

#### Contractor: Get Applications Received
```bash
curl -X GET "http://localhost:5000/api/job-history/contractor/applications?status=pending&page=1" \
  -H "Authorization: Bearer TOKEN"
```

---

### 6.10 Payments (PayU)

#### Create PayU Checkout Link
```bash
curl -X POST http://localhost:5000/api/payments/payu/create-link \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 999,
    "productInfo": "LabourSampark Premium Plan",
    "description": "Monthly subscription for contractor",
    "purpose": "subscription",
    "successUrl": "https://yourapp.com/payment/success",
    "failureUrl": "https://yourapp.com/payment/failure"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "http://localhost:5000/api/payments/checkout/TOKEN",
    "paymentId": "...",
    "txnId": "TXN_...",
    "expiresAt": "2026-04-14T11:00:00.000Z"
  }
}
```

#### Open Checkout Page (browser redirect)
```
GET http://localhost:5000/api/payments/checkout/:token
```

#### PayU Callback — Success (PayU calls this)
```
POST http://localhost:5000/api/payments/payu/callback/success
```

#### PayU Callback — Failure (PayU calls this)
```
POST http://localhost:5000/api/payments/payu/callback/failure
```

#### Get Payment Status
```bash
curl -X GET http://localhost:5000/api/payments/PAYMENT_ID/status \
  -H "Authorization: Bearer TOKEN"
```

#### Get Payment History
```bash
curl -X GET "http://localhost:5000/api/payments/history?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

---

### 6.11 Inquiry (Contact Form)

#### Submit Inquiry (PUBLIC — no auth)
```bash
curl -X POST http://localhost:5000/api/inquiries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Suresh Patel",
    "email": "suresh@example.com",
    "mobile": "9123456789",
    "subject": "Partnership Inquiry",
    "message": "I want to discuss a bulk hiring arrangement for my construction firm."
  }'
```

#### Get All Inquiries (Protected)
```bash
curl -X GET "http://localhost:5000/api/inquiries?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

#### Get Inquiry Stats (Protected)
```bash
curl -X GET http://localhost:5000/api/inquiries/stats \
  -H "Authorization: Bearer TOKEN"
```

#### Get Inquiry by ID (Protected)
```bash
curl -X GET http://localhost:5000/api/inquiries/INQUIRY_ID \
  -H "Authorization: Bearer TOKEN"
```

#### Update Inquiry (Protected)
```bash
curl -X PUT http://localhost:5000/api/inquiries/INQUIRY_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "resolved", "adminNotes": "Responded via email on April 14" }'
```

#### Delete Inquiry (Protected)
```bash
curl -X DELETE http://localhost:5000/api/inquiries/INQUIRY_ID \
  -H "Authorization: Bearer TOKEN"
```

---

### 6.12 Public / Skills

#### Get Skills List (Public)
```bash
curl -X GET http://localhost:5000/api/public/skills
```

#### Get All Skills (Protected)
```bash
curl -X GET http://localhost:5000/api/public/getskills \
  -H "Authorization: Bearer TOKEN"
```

#### Add Skills (Protected)
```bash
curl -X POST http://localhost:5000/api/public/addskills \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "skills": ["Mason", "Carpenter", "Electrician", "Plumber", "Painter"]
  }'
```

#### Update Skill (Protected)
```bash
curl -X PUT http://localhost:5000/api/public/updateskills/SKILL_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Civil Mason" }'
```

#### Get Dashboard Stats (Protected)
```bash
curl -X GET http://localhost:5000/api/public/dashboard-stats \
  -H "Authorization: Bearer TOKEN"
```

---

## 7. Status & Enum Reference

### Job Status Flow
```
open → in_progress → completed
     ↘ closed
     ↘ cancelled
```

### Enquiry Status Flow
```
pending → accepted
        → rejected
        → withdrawn
```

### Notification Types
| Type | Triggered When |
|------|----------------|
| `enquiry_accepted` | Contractor accepts application |
| `enquiry_rejected` | Contractor rejects application |
| `enquiry_withdrawn` | Applicant withdraws |
| `job_applied` | Someone applies to your job |
| `job_completed` | Job marked complete |
| `review_received` | You receive a new review |
| `message` | Direct message |
| `general` | Platform announcements |

### User Types
`labour` | `contractor` | `sub_contractor` | `admin` | `super_admin`

### Budget Types
`fixed` | `hourly` | `daily`

### Document Types
`aadhar` | `pan` | `passport` | `driving_license` | `gst_certificate` | `business_registration` | `insurance` | `certificate` | `qualification` | `experience_letter` | `bank_statement` | `other`

### Document Status
`pending` | `approved` | `rejected` | `expired`

### Payment Status
`created` | `pending` | `success` | `failed` | `cancelled` | `expired`

---

## 8. Error Response Format

All APIs return a consistent error shape:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "error": "Technical error detail (dev mode only)"
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized (missing/invalid/expired token) |
| `403` | Forbidden (authenticated but not allowed) |
| `404` | Not Found |
| `409` | Conflict (duplicates — e.g., user already exists, already applied) |
| `500` | Internal Server Error |

---

## 9. Feature Completion Status

### ✅ Completed

| Feature | Status | Notes |
|---------|--------|-------|
| User Registration | ✅ Done | All user types, validation, bcrypt hash |
| User Login | ✅ Done | By email or mobile, JWT issued |
| Forgot / Reset Password | ✅ Done | Token via email, 1hr expiry |
| Change Password | ✅ Done | Authenticated users only |
| Profile Get/Update | ✅ Done | Full profile update including location |
| Public Labour/Contractor Discovery | ✅ Done | Filter by city, state, skills |
| Job Create | ✅ Done | Contractor/sub-contractor |
| Job CRUD | ✅ Done | Update, delete, activate/deactivate |
| Job Feed | ✅ Done | Visibility rules by user type |
| Apply to Job (Enquiry) | ✅ Done | Unique constraint per job per user |
| Accept Enquiry | ✅ Done | Adds to selectedWorkers, notifies via email + in-app |
| Reject Enquiry | ✅ Done | Stores reason, notifies via email + in-app |
| Withdraw Enquiry | ✅ Done | Labour can withdraw pending application |
| Enquiry Notes | ✅ Done | Contractor private notes on applicant |
| In-App Notifications | ✅ Done | Full CRUD, unread count, pagination |
| Email Notifications | ✅ Done | Acceptance & rejection templates |
| User Reviews | ✅ Done | Submit, view, rating breakdown, helpful votes |
| Document Management | ✅ Done | Upload, verify, status management |
| Activity History | ✅ Done | Audit trail, timeline, by type |
| Job History | ✅ Done | Full per-status tracking, stats, timeline, smart dashboard |
| Payment Integration (PayU) | ✅ Done | Create link, callback handling, history |
| Inquiry / Contact Form | ✅ Done | Public submission, admin management |
| Skills Catalogue | ✅ Done | Add, update, list |
| Dashboard Stats | ✅ Done | Platform-level stats |
| Health Check Endpoint | ✅ Done | `GET /api/health` |

---

## 10. Pending / TODO

| Feature | Priority | Notes |
|---------|----------|-------|
| OTP Login | Medium | Mobile OTP auth skeleton exists in login, not wired to SMS provider |
| Email Verification on Register | Medium | `emailVerified` field exists, verification flow not implemented |
| Mobile OTP Verification | Medium | `mobileVerified` field exists, not implemented |
| Admin Panel APIs | High | No dedicated admin route group; admin logic is scattered |
| CORS Restriction | High | Currently `origin: "*"` — needs whitelist in production |
| Document File Upload (Multer) | Medium | Multer installed, document API uses URLs not file streams |
| Geospatial Job Search | Medium | GeoJSON `2dsphere` index on Job.location.coordinates not confirmed |
| JWT Refresh Token | Medium | No refresh token mechanism; re-login required after 7 days |
| Rate Limiting | High | No rate limiting on auth endpoints (brute-force risk) |
| Input Sanitization | High | No XSS/NoSQL injection sanitization middleware (e.g., `express-mongo-sanitize`) |
| Pagination on All Endpoints | Low | Some older endpoints may lack pagination |
| WebSocket / Real-time Notifications | Low | Currently pull-based; push via Socket.IO not implemented |
| SMS Notifications | Low | No SMS provider integrated |
| Unit / Integration Tests | Medium | `npm test` script is a placeholder only |
| Swagger / OpenAPI Docs | Low | No auto-generated API docs |
| Multi-tenant / Workspace | Not Planned | Single platform only |

---

## 11. Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=5000

# Database
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/laboursampark

# Auth
JWT_SECRET=your_super_secret_jwt_key_here

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@laboursampark.com

# PayU Payment Gateway
PAYU_KEY=your_payu_merchant_key
PAYU_SALT=your_payu_merchant_salt
PAYU_BASE_URL=https://test.payu.in  # Use https://secure.payu.in for production

# Frontend URLs (for email links)
FRONTEND_URL=http://localhost:3000
```

**Start commands:**
```bash
# Development
npm run dev

# Production
npm start

# Test DB connection
npm run test-db
```

---

*Generated from source code analysis — 14 April 2026*
