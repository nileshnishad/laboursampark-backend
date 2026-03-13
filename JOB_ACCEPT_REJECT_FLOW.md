# 📋 Job Accept & Reject API - Complete Documentation

## 🎯 Overview

This document explains the complete flow of job application acceptance and rejection, including:
- In-app notifications
- Email notifications
- Database updates
- Activity logging
- User feedback

---

## 📊 Complete Flow Diagram

```
User Applies for Job
        ↓
Contractor Receives Application
        ↓
┌─────────────────────────────────────────────┐
│  Contractor Reviews Application & Decides   │
└──────────────────┬──────────────────────────┘
                  ↙                ↘
            ❌ REJECT           ✅ ACCEPT
              ↙                    ↘
    [Rejection Flow]         [Acceptance Flow]
         ↓                           ↓
    Update Status                Update Status
    to "rejected"               to "accepted"
         ↓                           ↓
    Create Notification        Create Notification
    Update UserJobHistory       Update UserJobHistory
    Send Rejection Email        Send Acceptance Email
    Log Activity                Add to selectedWorkers
                                Log Activity
         ↓                           ↓
    User Receives Rejection    User Receives Acceptance
    in App + Email             in App + Email
```

---

## 📬 Rejection Flow (Detailed)

### **Step 1️⃣: Contractor Calls Reject API**

**Endpoint:**
```
POST /api/job-enquiries/:enquiryId/reject
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "reason": "Your skill set doesn't match our requirements" // Optional
}
```

### **Step 2️⃣: API Response Flow**

1. **Validation**
   - ✅ Check if user is authenticated
   - ✅ Validate enquiryId format
   - ✅ Verify user is the job creator (authorization check)
   - ✅ Check if enquiry status is not already "rejected"

2. **Database Updates**
   ```javascript
   // Update JobEnquiry
   enquiry.status = "rejected"
   enquiry.rejectedAt = new Date()
   enquiry.rejectionReason = reason || ""
   
   // Update UserJobHistory
   UserJobHistory.status = "rejected"
   UserJobHistory.timeline.rejectedAt = new Date()
   UserJobHistory.isActive = false
   ```

3. **Create In-App Notification**
   ```javascript
   new Notification({
     userId: applicantId,
     notificationType: "enquiry_rejected",
     title: "Application Not Selected - {jobTitle}",
     message: "Your application has not been selected. Keep applying!",
     details: {
       jobTitle: jobTitle,
       rejectionReason: reason,
       ...
     },
     priority: "medium",
     actionRequired: false
   })
   ```

4. **Send Email (Non-blocking)**
   - Uses `jobRejectionTemplate`
   - Includes:
     - Job title
     - Contractor name
     - Rejection reason (if provided)
     - Encouragement message
     - "What's Next?" tips

5. **Log Activity (Non-blocking)**
   ```javascript
   logActivity({
     userId: contractorId,
     activityType: "enquiry_rejected",
     targetId: enquiryId,
     description: "Rejected enquiry for job: {jobTitle}",
     details: { reason, applicantId, ... }
   })
   ```

### **Step 3️⃣: Applicant Notifications**

**In-App Notification:**
- Status: ❌ **Not Read**
- Icon: 📋
- Title: "Application Not Selected - Plumbing Services"
- Message: "Your application for 'Plumbing Services' has not been selected. Please keep applying..."
- Priority: Medium
- Action Required: No

**Email Subject:**
```
Application Update - Plumbing Services
```

**Email Content:**
```
Hi Rajesh,

Unfortunately, your application for the following job has not been selected:

Job Title: Plumbing Services
Posted By: Acme Contractors

Feedback from Contractor: [If provided]
"Your skill set doesn't match our requirements"

What's Next?
✓ Keep trying: Apply to other similar jobs
✓ Improve your profile: Add more skills
✓ Update portfolio: Share previous work
✓ Stay active: Regularly apply
```

---

## ✅ Acceptance Flow (Detailed)

### **Step 1️⃣: Contractor Calls Accept API**

**Endpoint:**
```
POST /api/job-enquiries/:enquiryId/accept
Content-Type: application/json
Authorization: Bearer <token>
```

### **Step 2️⃣: API Response Flow**

1. **Validation**
   - ✅ Check if user is authenticated
   - ✅ Validate enquiryId format
   - ✅ Verify user is the job creator
   - ✅ Check if enquiry status is "pending"

2. **Database Updates**
   ```javascript
   // Update JobEnquiry
   enquiry.status = "accepted"
   enquiry.acceptedAt = new Date()
   
   // Update UserJobHistory
   UserJobHistory.status = "accepted"
   UserJobHistory.timeline.acceptedAt = new Date()
   UserJobHistory.isActive = true
   
   // Update Job's selectedWorkers
   Job.selectedWorkers.push({
     workerId: applicantId,
     acceptedAt: new Date()
   })
   ```

3. **Create In-App Notification**
   ```javascript
   new Notification({
     userId: applicantId,
     notificationType: "enquiry_accepted",
     title: "Job Application Accepted - {jobTitle}",
     message: "Congratulations! Your application has been accepted!",
     details: {
       jobTitle: jobTitle,
       jobBudget: estimatedBudget,
       actionUrl: `/applied-jobs/${enquiryId}`
     },
     priority: "high",
     actionRequired: true
   })
   ```

4. **Send Email (Non-blocking)**
   - Uses `jobAcceptanceTemplate`
   - Includes:
     - Congratulations message
     - Job details
     - Contractor contact info
     - Next steps (what applicant should do)
     - Important reminders

5. **Log Activity (Non-blocking)**
   ```javascript
   logActivity({
     userId: contractorId,
     activityType: "enquiry_accepted",
     targetId: enquiryId,
     description: "Accepted enquiry for job: {jobTitle}",
     details: { applicantId, jobId, ... }
   })
   ```

### **Step 3️⃣: Applicant Notifications**

**In-App Notification:**
- Status: ❌ **Not Read**
- Icon: 🎉
- Title: "Job Application Accepted - Plumbing Services"
- Message: "Congratulations! Your application has been accepted. Contractor will contact soon!"
- Priority: **High**
- Action Required: **Yes**

**Email Subject:**
```
✅ Job Application Accepted - Plumbing Services
```

**Email Content:**
```
Hi Rajesh,

🎉 Congratulations!

Your application has been accepted!

Job Title: Plumbing Services
Contractor: Acme Contractors

Next Steps:
1. Wait for contractor contact - They will reach out within 24-48 hours
2. Discuss requirements - Clarify job scope and timeline
3. Confirm start date - Agree on when to start
4. Begin work - Execute professionally
5. Get reviewed - Contractor will rate your work

📞 Contractor Contact:
Email: contractor@example.com
Phone: +91-XXXXX-XXXXX

Important Reminders:
✓ Keep your profile updated
✓ Respond promptly to messages
✓ Deliver quality work
✓ Report any issues immediately
```

---

## 📬 Notification System

### **Notification Model Structure**

```javascript
{
  _id: ObjectId,
  userId: ObjectId,                    // Recipient
  notificationType: String,            // enquiry_rejected, enquiry_accepted, etc.
  enquiryId: ObjectId,                 // Reference to JobEnquiry
  jobId: ObjectId,                     // Reference to Job
  relatedUserId: ObjectId,             // Contractor who accepted/rejected
  title: String,                       // "Job Application Accepted"
  message: String,                     // Detailed message
  details: {
    jobTitle: String,
    jobBudget: Number,
    rejectionReason: String,
    actionUrl: String
  },
  isRead: Boolean,                     // false by default
  readAt: Date,                        // When user marked as read
  priority: String,                    // low, medium, high
  actionRequired: Boolean,             // true for acceptance, false for rejection
  createdAt: Date,
  updatedAt: Date
}
```

### **Notification APIs**

#### **1. Get Notifications**
```bash
GET /api/notifications?isRead=false&page=1&limit=10&sortBy=newest
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "...",
        "title": "Job Application Accepted",
        "message": "Congratulations!...",
        "isRead": false,
        "priority": "high",
        "createdAt": "2026-03-13T..."
      }
    ],
    "unreadCount": 5,
    "pagination": { ... }
  }
}
```

#### **2. Mark Notification as Read**
```bash
PUT /api/notifications/:notificationId/read
```

#### **3. Mark All as Read**
```bash
PUT /api/notifications/mark/all-read
```

#### **4. Get Unread Count**
```bash
GET /api/notifications/unread/count
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

#### **5. Delete Notification**
```bash
DELETE /api/notifications/:notificationId
```

#### **6. Delete All Notifications**
```bash
DELETE /api/notifications/delete/all
```

---

## 🔄 State Machine (Enquiry Status)

```
┌──────────────┐
│   PENDING    │  ← Initial state when user applies
└───┬──────┬──┘
    │      │
    │      └─→ ❌ REJECTED
    │            (User receives rejection notification + email)
    │
    └─→ ✅ ACCEPTED
         (User receives acceptance notification + email)
         (Contractor can no longer reject)
         (User sees contractor contact info)

Additional State:
WITHDRAWN - User can withdraw their own pending application
```

---

## 📊 Database Changes Summary

### **Models Created/Modified:**

1. **Notification.js** (NEW)
   - Stores all user notifications
   - Tracks read/unread status
   - Links to jobId, enquiryId, relatedUserId

2. **jobEnquiryController.js** (MODIFIED)
   - `acceptEnquiry()` → Now creates notification & sends email
   - `rejectEnquiry()` → Now creates notification & sends email

3. **notificationController.js** (NEW)
   - `getNotifications()` - Fetch notifications
   - `markAsRead()` - Mark single notification as read
   - `markAllAsRead()` - Mark all as read
   - `deleteNotification()` - Delete specific notification
   - `deleteAllNotifications()` - Clear all notifications
   - `getUnreadCount()` - Get unread count

4. **Email Templates Created:**
   - `jobRejectionTemplate.js` - Rejection email HTML
   - `jobAcceptanceTemplate.js` - Acceptance email HTML

### **Routes Added:**

```javascript
// Notification Routes
GET    /api/notifications                    // Get all notifications
GET    /api/notifications/unread/count       // Get unread count
PUT    /api/notifications/:id/read           // Mark as read
PUT    /api/notifications/mark/all-read      // Mark all as read
DELETE /api/notifications/:id                // Delete notification
DELETE /api/notifications/delete/all         // Delete all
```

---

## 🔐 Security & Authorization

### **Rejection/Acceptance:**
- ✅ Only **job creator** can accept/reject applications
- ✅ Cannot accept/reject already processed applications
- ✅ User authentication required

### **Notifications:**
- ✅ Users can only see their own notifications
- ✅ Users can only mark their own notifications as read
- ✅ Users can only delete their own notifications

---

## 📧 Email Template Features

### **Rejection Email - Features:**
- Empathetic tone
- Clear job details
- Optional rejection reason
- "What's Next?" guidance
- Encouragement to keep trying
- Professional Labour Sampark branding

### **Acceptance Email - Features:**
- Celebratory tone with emojis
- Congratulations message
- Job and contractor details
- **Important:** Contractor contact information
- Step-by-step next steps
- Important reminders for accepted users
- Professional branding

---

## 🧪 Testing the Flow

### **Test Rejection:**
```bash
# 1. Create job (as contractor)
POST /api/jobs
{
  "workTitle": "Plumbing"
  ...
}
# Response: { job._id }

# 2. Apply for job (as labour)
POST /api/job-enquiries/{jobId}
{ "message": "I can do this" }
# Response: { enquiry._id }

# 3. Reject application (as contractor)
POST /api/job-enquiries/{enquiryId}/reject
{ "reason": "Need more experience" }
# Response: { success: true }

# 4. Check notifications (as labour)
GET /api/notifications
# Response: { notifications: [rejection notification] }

# 5. Mark as read
PUT /api/notifications/{notificationId}/read
```

### **Test Acceptance:**
```bash
# 1-2. Create job and apply (same as above)

# 3. Accept application (as contractor)
POST /api/job-enquiries/{enquiryId}/accept
# Response: { success: true }

# 4. Check notifications (as labour)
GET /api/notifications
# Response: { notifications: [acceptance notification] }

# Check unread count
GET /api/notifications/unread/count
# Response: { unreadCount: 1 }
```

---

## 📝 Response Examples

### **Accept Enquiry Response:**
```json
{
  "success": true,
  "message": "Enquiry accepted successfully. Applicant has been notified via email and in-app notification.",
  "data": {
    "_id": "...",
    "status": "accepted",
    "acceptedAt": "2026-03-13T10:30:00Z",
    "userDetails": { ... },
    "jobDetails": { ... }
  }
}
```

### **Reject Enquiry Response:**
```json
{
  "success": true,
  "message": "Enquiry rejected successfully. Applicant has been notified via email and in-app notification.",
  "data": {
    "_id": "...",
    "status": "rejected",
    "rejectedAt": "2026-03-13T10:30:00Z",
    "rejectionReason": "Your skill set doesn't match...",
    "userDetails": { ... },
    "jobDetails": { ... }
  }
}
```

### **Get Notifications Response:**
```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "_id": "...",
        "userId": "...",
        "notificationType": "enquiry_accepted",
        "title": "Job Application Accepted - Plumbing",
        "message": "Congratulations! Your application has been accepted...",
        "isRead": false,
        "priority": "high",
        "actionRequired": true,
        "details": {
          "jobTitle": "Plumbing Services",
          "jobBudget": 5000,
          "actionUrl": "/applied-jobs/..."
        },
        "createdAt": "2026-03-13T10:30:00Z"
      }
    ],
    "unreadCount": 1,
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```

---

## ✨ Key Features Implemented

✅ **Comprehensive Notification System**
- In-app notifications stored in database
- Read/unread status tracking
- Priority levels (low, medium, high)

✅ **Email Notifications**
- Professional HTML templates
- Contains job and contractor details
- Personalized content

✅ **Database Integration**
- Updates JobEnquiry status
- Updates UserJobHistory
- Updates Job selectedWorkers
- Creates Notification records

✅ **Activity Logging**
- All actions logged for audit trail
- Non-blocking to prevent API failures

✅ **Authorization**
- Only job creator can accept/reject
- Only applicant can see their own notifications
- Proper permission checks

✅ **User Feedback**
- Clear success messages
- Error messages with guidance
- Helpful next steps in emails

---

## 🚀 Next Steps (Optional Features)

1. **Real-time Notifications** - WebSocket integration
2. **Push Notifications** - Mobile app notifications
3. **Notification Preferences** - Let users choose notification types
4. **Message Threading** - Direct chat between contractor and applicant
5. **Auto-rejection** - Contractor can reject after selecting someone
6. **Bulk Actions** - Accept/reject multiple applications at once

---

## 📞 API Endpoints Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | /api/job-enquiries/:id/accept | Accept application | ✅ Required |
| POST | /api/job-enquiries/:id/reject | Reject application | ✅ Required |
| GET | /api/notifications | Get all notifications | ✅ Required |
| PUT | /api/notifications/:id/read | Mark as read | ✅ Required |
| PUT | /api/notifications/mark/all-read | Mark all as read | ✅ Required |
| GET | /api/notifications/unread/count | Get unread count | ✅ Required |
| DELETE | /api/notifications/:id | Delete notification | ✅ Required |
| DELETE | /api/notifications/delete/all | Delete all | ✅ Required |

---

**Created:** March 13, 2026
**Version:** 1.0.0
**Status:** ✅ Complete & Ready to Test
