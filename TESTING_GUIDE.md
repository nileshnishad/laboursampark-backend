# 🧪 Job Accept & Reject API - Testing Guide

## 🔑 Required Setup

### **Environment Variables (ensure these are set in .env):**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
Email_PASSWORD=your-app-password
```

### **Substitute These Values in Curl Commands:**
- `{TOKEN}` → JWT token from login
- `{JOB_ID}` → ID from job creation
- `{ENQUIRY_ID}` → ID from job application
- `{NOTIFICATION_ID}` → ID from notifications list

---

## 📋 Complete Testing Sequence

### **Step 1: Contractor Creates a Job**

```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Authorization: Bearer {CONTRACTOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "workTitle": "Plumbing Repair",
    "description": "Need experienced plumber for emergency repair",
    "workType": "plumbing",
    "estimatedBudget": 5000,
    "budgetType": "fixed",
    "requiredSkills": ["plumbing", "pipe-fitting"],
    "workersNeeded": 1,
    "target": ["labour", "sub_contractor"],
    "location": {
      "city": "Delhi",
      "state": "Delhi",
      "area": "Dwarka"
    }
  }'
```

**Response:** Save the `_id` as `{JOB_ID}`

---

### **Step 2: Labour User Applies for Job**

```bash
curl -X POST http://localhost:5000/api/job-enquiries/{JOB_ID} \
  -H "Authorization: Bearer {LABOUR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I am an experienced plumber with 5 years of experience in residential and commercial plumbing."
  }'
```

**Response:** Save the `_id` as `{ENQUIRY_ID}`

**Console Output:**
```
✅ Enquiry saved successfully: {ENQUIRY_ID}
✅ UserJobHistory saved successfully: {HISTORY_ID}
```

---

## 🚫 **REJECTION FLOW**

### **Step 3A: Contractor Rejects Application**

```bash
curl -X POST http://localhost:5000/api/job-enquiries/{ENQUIRY_ID}/reject \
  -H "Authorization: Bearer {CONTRACTOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Looking for someone with commercial plumbing experience"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiry rejected successfully. Applicant has been notified via email and in-app notification.",
  "data": {
    "_id": "{ENQUIRY_ID}",
    "status": "rejected",
    "rejectedAt": "2026-03-13T10:30:00Z",
    "rejectionReason": "Looking for someone with commercial plumbing experience",
    "userDetails": { ... }
  }
}
```

**Console Output:**
```
✅ Enquiry rejected: {ENQUIRY_ID}
✅ In-app notification created: {NOTIFICATION_ID}
✅ Email sent successfully to: labour@example.com
```

### **Step 4A: Labour Checks Notifications**

```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=10&sortBy=newest" \
  -H "Authorization: Bearer {LABOUR_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "_id": "{NOTIFICATION_ID}",
        "notificationType": "enquiry_rejected",
        "title": "Application Not Selected - Plumbing Repair",
        "message": "Your application for 'Plumbing Repair' has not been selected. Please keep applying to other jobs and improve your profile to increase your chances.",
        "isRead": false,
        "priority": "medium",
        "details": {
          "jobTitle": "Plumbing Repair",
          "jobBudget": 5000,
          "rejectionReason": "Looking for someone with commercial plumbing experience"
        },
        "createdAt": "2026-03-13T10:30:00Z"
      }
    ],
    "unreadCount": 1,
    "pagination": { "total": 1, "page": 1, "limit": 10 }
  }
}
```

### **Step 5A: Labour Marks Rejection Notification as Read**

```bash
curl -X PUT http://localhost:5000/api/notifications/{NOTIFICATION_ID}/read \
  -H "Authorization: Bearer {LABOUR_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "_id": "{NOTIFICATION_ID}",
    "isRead": true,
    "readAt": "2026-03-13T10:35:00Z"
  }
}
```

---

## ✅ **ACCEPTANCE FLOW**

### **Step 3B: Contractor Accepts Application**

```bash
curl -X POST http://localhost:5000/api/job-enquiries/{ENQUIRY_ID}/accept \
  -H "Authorization: Bearer {CONTRACTOR_TOKEN}" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Enquiry accepted successfully. Applicant has been notified via email and in-app notification.",
  "data": {
    "_id": "{ENQUIRY_ID}",
    "status": "accepted",
    "acceptedAt": "2026-03-13T11:00:00Z",
    "userDetails": { ... }
  }
}
```

**Console Output:**
```
✅ Enquiry accepted: {ENQUIRY_ID}
✅ In-app notification created: {NOTIFICATION_ID}
✅ Email sent successfully to: labour@example.com
```

### **Step 4B: Labour Checks Notifications**

```bash
curl -X GET "http://localhost:5000/api/notifications" \
  -H "Authorization: Bearer {LABOUR_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "_id": "{NOTIFICATION_ID}",
        "notificationType": "enquiry_accepted",
        "title": "Job Application Accepted - Plumbing Repair",
        "message": "Congratulations! Your application for 'Plumbing Repair' has been accepted by Contractor Name. They will contact you soon with more details.",
        "isRead": false,
        "priority": "high",
        "actionRequired": true,
        "details": {
          "jobTitle": "Plumbing Repair",
          "jobBudget": 5000,
          "actionUrl": "/applied-jobs/{ENQUIRY_ID}"
        },
        "createdAt": "2026-03-13T11:00:00Z"
      }
    ],
    "unreadCount": 1
  }
}
```

### **Step 5B: Labour Check Unread Count**

```bash
curl -X GET http://localhost:5000/api/notifications/unread/count \
  -H "Authorization: Bearer {LABOUR_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Unread notification count fetched",
  "data": {
    "unreadCount": 1
  }
}
```

### **Step 6B: Labour Marks Acceptance as Read**

```bash
curl -X PUT http://localhost:5000/api/notifications/{NOTIFICATION_ID}/read \
  -H "Authorization: Bearer {LABOUR_TOKEN}"
```

---

## 📬 **Additional Notification APIs**

### **Mark All Notifications as Read**

```bash
curl -X PUT http://localhost:5000/api/notifications/mark/all-read \
  -H "Authorization: Bearer {LABOUR_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "5 notifications marked as read",
  "data": { "modifiedCount": 5 }
}
```

### **Delete Specific Notification**

```bash
curl -X DELETE http://localhost:5000/api/notifications/{NOTIFICATION_ID} \
  -H "Authorization: Bearer {LABOUR_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

### **Delete All Notifications**

```bash
curl -X DELETE http://localhost:5000/api/notifications/delete/all \
  -H "Authorization: Bearer {LABOUR_TOKEN}"
```

**Response:**
```json
{
  "success": true,
  "message": "15 notifications deleted",
  "data": { "deletedCount": 15 }
}
```

### **Filter Unread Only**

```bash
curl -X GET "http://localhost:5000/api/notifications?isRead=false&sortBy=newest" \
  -H "Authorization: Bearer {LABOUR_TOKEN}"
```

---

## 📊 **Query Parameters**

### **For GET /api/notifications:**

| Parameter | Values | Example |
|-----------|--------|---------|
| `page` | Number (default: 1) | `/api/notifications?page=2` |
| `limit` | Number (default: 10) | `/api/notifications?limit=20` |
| `isRead` | true/false | `/api/notifications?isRead=false` |
| `sortBy` | newest/oldest/unread | `/api/notifications?sortBy=oldest` |

**Example Combined:**
```bash
curl -X GET "http://localhost:5000/api/notifications?page=1&limit=10&isRead=false&sortBy=newest" \
  -H "Authorization: Bearer {TOKEN}"
```

---

## 🔐 **Error Cases to Test**

### **Error 1: Try to Accept Non-Pending Enquiry**

```bash
# First reject
curl -X POST http://localhost:5000/api/job-enquiries/{ENQUIRY_ID}/reject \
  -H "Authorization: Bearer {CONTRACTOR_TOKEN}"

# Then try to accept (should fail)
curl -X POST http://localhost:5000/api/job-enquiries/{ENQUIRY_ID}/accept \
  -H "Authorization: Bearer {CONTRACTOR_TOKEN}"
```

**Error Response:**
```json
{
  "success": false,
  "message": "Cannot accept enquiry with status: rejected"
}
```

### **Error 2: Try to Reject Already Rejected**

```bash
curl -X POST http://localhost:5000/api/job-enquiries/{ENQUIRY_ID}/reject \
  -H "Authorization: Bearer {CONTRACTOR_TOKEN}" \
  -d '{"reason": "test"}'
```

**Error Response:**
```json
{
  "success": false,
  "message": "This enquiry has already been rejected"
}
```

### **Error 3: Non-Creator Try to Reject**

```bash
# Create job as User A
# Get application from User B
# Try to reject as User C (not creator)

curl -X POST http://localhost:5000/api/job-enquiries/{ENQUIRY_ID}/reject \
  -H "Authorization: Bearer {OTHER_USER_TOKEN}" \
  -d '{"reason": "test"}'
```

**Error Response:**
```json
{
  "success": false,
  "message": "You can only reject enquiries for your own jobs"
}
```

---

## 📬 **Email Testing**

### **Using Mailhog (Local Testing)**

If using Mailhog for email testing (instead of real Gmail):

1. **Update .env:**
```
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USER=test@example.com
Email_PASSWORD=test
```

2. **Access Mailhog UI:** `http://localhost:8025`
3. **Verify rejection/acceptance emails appear**

### **Email Content Verification**

**Rejection Email Should Contain:**
- ❌ "Application has not been selected"
- 📋 Job title
- 👤 Contractor name
- 💬 Rejection reason (if provided)
- 💡 "What's Next?" tips
- 🔗 link to apply to other jobs

**Acceptance Email Should Contain:**
- ✅ "Congratulations! Your application has been accepted"
- 🎉 Celebration emojis
- 📋 Job title and budget
- 👤 Contractor name
- 📞 Contractor contact info
- 📋 Next steps (numbered list)
- ⚠️ Important reminders

---

## 🎯 **Key Testing Checkpoints**

✅ **Rejection Flow:**
- [ ] JobEnquiry status changes to "rejected"
- [ ] UserJobHistory status changes to "rejected"
- [ ] Notification created in database
- [ ] Rejection email sent to labour
- [ ] Activity logged
- [ ] Notification appears in labour's GET /api/notifications
- [ ] Email contains rejection reason
- [ ] Unread count increases by 1

✅ **Acceptance Flow:**
- [ ] JobEnquiry status changes to "accepted"
- [ ] UserJobHistory status changes to "accepted"
- [ ] Job selectedWorkers updated
- [ ] Notification created with priority: "high"
- [ ] Acceptance email sent with contractor contact info
- [ ] Activity logged
- [ ] Notification appears as unread
- [ ] Contractor contact info in email is correct

✅ **Notification Management:**
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Unread count updates correctly
- [ ] Notifications can be deleted
- [ ] Query filters work (isRead, sortBy)
- [ ] Pagination works

---

## 📝 **Notes**

1. **Non-Blocking Emails:** If email fails, API still succeeds (logged in console)
2. **Notifications Persist:** They stay in database even after read
3. **Activity Logged:** All actions logged with timestamps
4. **User Isolation:** Users can only see/manage their own notifications
5. **No Re-Acceptance:** Once rejected, cannot be accepted again (state machine)

---

**Last Updated:** March 13, 2026
**Status:** ✅ Ready for Testing
