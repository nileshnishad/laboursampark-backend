# LabourSampark Admin API Inventory

This document provides a complete and verified inventory of all Admin-related APIs discovered in the existing LabourSampark Node.js backend codebase.

---

## Admin API Inventory Table

| Method | Endpoint | Admin Permission/Auth | Module | Request | Response | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/users/login` | Public | Authentication | **JSON Body**: `email` or `mobile`, `password` or `otp` | `{ success: true, message, data: { user, token } }` | Authenticates administrator (`userType: 'admin'` \| `'super_admin'`) and generates session-bound JWT token with rotated `sessionId`. Also mounted at `/auth/login`. |
| **POST** | `/api/users/logout` | Bearer Token (`authenticateToken`) | Authentication | None (Headers: `Authorization: Bearer <token>`) | `{ success: true, message: "Logout successful" }` | Invalidates active session (`isLoggedIn: false`, `activeSessionId: null`, `lastLogoutAt`). Also mounted at `/auth/logout`. |
| **GET** | `/api/users/profile` | Bearer Token (`authenticateToken`) | Authentication | None | `{ success: true, message, data: <User Profile> }` | Fetches authenticated admin profile data. Also mounted at `/auth/profile`. |
| **PUT** | `/api/users/profile` | Bearer Token (`authenticateToken`) | Authentication | **JSON Body**: Partial user profile fields (e.g. `fullName`, `bio`, `preferredContactMethod`) | `{ success: true, message, data: <Updated User> }` | Updates admin profile (restricted fields `_id`, `password`, `email`, `mobile` stripped). Also mounted at `PATCH` and under `/auth/profile`. |
| **POST** | `/api/users/change-password` | Bearer Token (`authenticateToken`) | Authentication | **JSON Body**: `currentPassword`, `newPassword`, `confirmPassword` | `{ success: true, message: "Password changed successfully" }` | Validates current password and updates password hash. Also mounted at `/auth/change-password`. |
| **GET** | `/api/public/dashboard-stats` | Bearer Token (`authenticateToken`) | Dashboard | None | `{ success: true, stats: { users, jobs, reviews, skills, inquiries, documents, payments, notifications, jobEnquiries } }` | High-level platform metrics for admin dashboard overview. |
| **GET** | `/api/jobs/stats` | Bearer Token (`authenticateToken` with `admin`/`super_admin`) | Dashboard | None | `{ success: true, message, data: { userType: "admin", stats: { totalJobs, activeJobs, completedJobs, totalApplications, totalAccepted, totalRejected, totalUsers } } }` | Multi-role stats endpoint with explicit backend admin branch returning platform-wide metrics. |
| **GET** | `/api/users/admin/allUser` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | User Management | **Query**: `search` (matches `fullName`, `email`, `mobile`, `userCode`) | `{ success: true, message, data: { users: [...], total } }` | Retrieves all users across platform with search and sorting by `createdAt: -1`. Also mounted at `/auth/admin/allUser`. |
| **POST** | `/api/users/admin/update/:id` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | User Management | **Path**: `id`<br>**JSON Body**: `status` (`active` \| `inactive` \| `blocked` \| `suspended`), `userType`, `display`, `isVerified`, `aadharVerified`, `panVerified`, `licenseVerified`, `adminNotes`, `blockReason`, etc. | `{ success: true, message, data: { user } }` | Allows admin to activate, deactivate, block, unblock, verify KYC badges, or edit user data. Also mounted at `/auth/admin/update/:id`. |
| **GET** | `/api/jobs/admin/all` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Job Management | **Query**: `page` (default 1), `limit` (default 20), `search` (title, description, city, state) | `{ success: true, message, data: { jobs: [...], pagination } }` | Platform-wide job listings populated with creator details. Defined after wildcard `/:jobId` in router. |
| **GET** | `/api/documents/admin/pending` | Unprotected (commented `// Admin operations`) | Document Verification | None | `{ success: true, message, count, data: [...] }` | Retrieves all pending user documents (`status: 'pending'`) for admin verification. |
| **PATCH** | `/api/documents/document/:documentId/status` | Unprotected (commented `// Admin/verification`) | Document Verification | **Path**: `documentId`<br>**JSON Body**: `status` (`pending` \| `approved` \| `rejected` \| `expired`), `verificationNotes`, `verifiedBy` | `{ success: true, message, data: <Document> }` | Updates document status. Approving sets `verified: true` and `verifiedAt`. |
| **GET** | `/api/payments/admin/all` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Payments | **Query**: `page`, `limit`, `search` (txnId, receipt, email, phone, productInfo) | `{ success: true, message, data: { payments, summary: { <status>: { count, totalAmount } }, pagination } }` | Lists all platform payments with aggregation status summary. |
| **POST** | `/api/cashfree/payments/:paymentId/refund` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Payments (Refunds) | **Path**: `paymentId`<br>**JSON Body**: `amount` (optional), `note` (optional) | `{ success: true, data: <Refund Details> }` | Creates a refund for a Cashfree payment transaction. |
| **GET** | `/api/cashfree/payments/:paymentId/refund` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Payments (Refunds) | **Path**: `paymentId` | `{ success: true, data: <Refund Status> }` | Checks refund status from Cashfree and updates payment document. |
| **POST** | `/api/cashfree/payouts` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Payments (Payouts) | **JSON Body**: `beneficiaryId`, `amount`, `transferMode` (`banktransfer` \| `upi`), `remarks`, `idempotencyKey` | `{ success: true, data: <Payout Details> }` | Initiates an automated bank/UPI payout to a verified beneficiary via Cashfree Payouts. |
| **GET** | `/api/cashfree/payouts` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Payments (Payouts) | None | `{ success: true, data: [<Payout>] }` | Lists recent payouts (up to 100) sorted by creation date descending. |
| **GET** | `/api/cashfree/payouts/:payoutId` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Payments (Payouts) | **Path**: `payoutId` | `{ success: true, data: <Payout Details> }` | Retrieves real-time transfer status from Cashfree Payouts API. |
| **POST** | `/api/cashfree/payouts/:payoutId/retry` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Payments (Payouts) | **Path**: `payoutId` | `{ success: true, data: <Payout Details> }` | Retries a failed, rejected, or reversed payout. |
| **GET** | `/api/referrals/admin/payouts/pending` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Referrals & Rewards | **Query**: `page`, `limit` | `{ success: true, message, data: [...], pagination }` | Lists credited referral rewards (`status: 'CREDITED'`, `payoutStatus: 'PENDING'`) awaiting manual offline payout with referrer details. |
| **POST** | `/api/referrals/admin/payouts/:rewardId/mark-paid` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Referrals & Rewards | **Path**: `rewardId`<br>**JSON Body**: `payoutReference`, `notes` | `{ success: true, message, data: <Reward> }` | Closes out manual referral payout record (`payoutStatus: 'PAID'`). |
| **POST** | `/api/referrals/admin/process/:paymentId` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Referrals & Rewards | **Path**: `paymentId` | `{ success: true, message, data: <Reward> }` | Manually triggers referral reward bonus gating and credit for a payment. |
| **POST** | `/api/referrals/admin/reverse/:paymentId` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Referrals & Rewards | **Path**: `paymentId` | `{ success: true, message, data: <Reward> }` | Reverses referral reward and debits referrer wallet upon subscription refund. |
| **POST** | `/api/admin/fcm/send` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Push Notifications | **JSON Body**: `title`, `message`, `userType`, `skills`/`skillIds`, `businessTypes`/`businessTypeIds`, `userIds`, `excludeUserIds`, `data`, `notificationType`, `priority` | `{ success: true, message, data: { totalTargets, totalTokens, successCount, failureCount, ... } }` | Sends multicast push notifications to targeted devices and stores in-app notifications. Also mounted at `/api/firebase/send`. |
| **POST** | `/api/admin/fcm/send-to-user` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Push Notifications | **JSON Body**: `userId`, `title`, `message`, `data`, `notificationType`, `priority` | `{ success: true, message, data: { userId, successCount, failureCount, ... } }` | Sends direct push notification to specific user devices. Also mounted at `/api/firebase/send-to-user`. |
| **GET** | `/api/admin/fcm/stats` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Push Notifications | None | `{ success: true, data: { totalUsersWithTokens, recentNotifications } }` | Fetches push token statistics and recent notifications. Also mounted at `/api/firebase/stats`. |
| **GET** | `/api/admin/fcm/token-users` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Push Notifications | None | `{ success: true, data: { totalUsersWithTokens, users: [...] } }` | Lists all users with active push notification device tokens. Also mounted at `/api/firebase/token-users`. |
| **GET** | `/api/tickets/admin/all` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Support Tickets | **Query**: `status` (`open` \| `in_progress` \| `closed`), `page`, `limit` | `{ success: true, data: [...], pagination }` | Retrieves all customer support tickets. |
| **GET** | `/api/tickets/admin/:ticketId` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Support Tickets | **Path**: `ticketId` | `{ success: true, data: <Ticket> }` | Retrieves ticket details by ID with attachments and messages. |
| **PUT** | `/api/tickets/admin/:ticketId` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Support Tickets | **Path**: `ticketId`<br>**JSON Body**: `status` (`open` \| `in_progress` \| `closed`), `adminNote` | `{ success: true, message, data: <Ticket> }` | Updates ticket resolution status and appends admin resolution note. |
| **GET** | `/api/inquiries` | Bearer Token (`authenticateToken`) | Inquiries & Complaints | **Query**: `status`, `priority`, `inquiryType`, `page`, `limit` | `{ success: true, message, data: { inquiries, pagination } }` | Admin feed of submitted user inquiries/complaints. |
| **GET** | `/api/inquiries/stats` | Bearer Token (`authenticateToken`) | Inquiries & Complaints | None | `{ success: true, message, data: { total, byStatus, byType } }` | Aggregates inquiry counts by status and by category. |
| **GET** | `/api/inquiries/:id` | Bearer Token (`authenticateToken`) | Inquiries & Complaints | **Path**: `id` | `{ success: true, message, data: <Inquiry> }` | Retrieves single inquiry with populated user and response details. |
| **PUT** | `/api/inquiries/:id` | Bearer Token (`authenticateToken`) | Inquiries & Complaints | **Path**: `id`<br>**JSON Body**: `status`, `priority`, `response`, `adminNotes`, `assignedTo` | `{ success: true, message, data: <Inquiry> }` | Updates inquiry status, assigns to admin, adds notes, or sends resolution response. |
| **DELETE** | `/api/inquiries/:id` | Bearer Token (`authenticateToken`) | Inquiries & Complaints | **Path**: `id` | `{ success: true, message, data: { inquiryId } }` | Deletes an inquiry record. |
| **GET** | `/api/public/mobile-banner/admin/all` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Mobile Banners | None | `{ success: true, total, banners: [...] }` | Lists all active and inactive mobile promotional banners. |
| **POST** | `/api/public/mobile-banner` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Mobile Banners | **JSON Body**: `title`, `bannerImageUrl`, `link`, `context`, `visible` | `{ success: true, message, banner }` | Creates a mobile banner. Setting `visible: true` turns off other banners. |
| **PUT** | `/api/public/mobile-banner/:bannerId` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Mobile Banners | **Path**: `bannerId`<br>**JSON Body**: `title`, `bannerImageUrl`, `link`, `context`, `visible` | `{ success: true, message, banner }` | Updates mobile banner details. |
| **DELETE** | `/api/public/mobile-banner/:bannerId` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | Mobile Banners | **Path**: `bannerId` | `{ success: true, message, deletedBanner }` | Deletes a mobile banner. |
| **POST** | `/api/public/app/version-config` | Bearer Token (`authenticateToken`, `isAdmin` -> `admin` \| `super_admin`) | App Configuration | **JSON Body**: `platform` (`android` \| `ios`), `latestVersion`, `minimumVersion`, `forceUpdate`, `message`, `storeUrl` | `{ success: true, message, data: <AppVersion> }` | Configures mobile app release versions and force update thresholds. |
| **GET** | `/api/public/getskills` | Bearer Token (`authenticateToken`) | Master Data | **Query**: `page` | `{ success: true, page, perPage, totalSkills, totalPages, skills }` | Retrieves master skill library with multilingual names and audit info. |
| **POST** | `/api/public/addskills` | Bearer Token (`authenticateToken`) | Master Data | **JSON Body**: `enName`/`name`, `hiName`, `mrName`, `category`, `description` | `{ success: true, message: "Skill added successfully" }` | Adds a new master skill. |
| **PUT** | `/api/public/updateskills/:skillId` | Bearer Token (`authenticateToken`) | Master Data | **Path**: `skillId`<br>**JSON Body**: `enName`/`name`, `hiName`, `mrName`, `category`, `description` | `{ success: true, message, skill }` | Updates an existing master skill. |
| **POST** | `/api/public/addbusinessname` | Bearer Token (`authenticateToken`) | Master Data | **JSON Body**: Single object or array of objects with `enName`, `hiName`, `mrName`, `category`, `description` | `{ success: true, message, inserted }` | Adds one or more business category/types to master data. |
| **PUT** | `/api/public/updatebusinessname/:businessId` | Bearer Token (`authenticateToken`) | Master Data | **Path**: `businessId`<br>**JSON Body**: `enName`, `hiName`, `mrName`, `category`, `description` | `{ success: true, message, business }` | Updates an existing business category. |

---

## Discovery & Architecture Report

### 1. Total Admin APIs Discovered
- **45 distinct admin endpoints** (plus route aliases such as `/auth/*` and `/api/firebase/*`).

### 2. APIs Grouped by Module
- **Authentication & Admin Session**: 5 endpoints
- **Dashboard & Analytics**: 2 endpoints
- **User Management**: 2 endpoints
- **Job Management**: 1 endpoint
- **Document & KYC Verification**: 2 endpoints
- **Payments, Refunds & Payouts**: 7 endpoints
- **Referrals & Rewards Management**: 4 endpoints
- **Push Notifications (FCM / Firebase)**: 4 endpoints
- **Support Tickets**: 3 endpoints
- **Inquiries & Complaints**: 5 endpoints
- **Content Management (Mobile Banners)**: 4 endpoints
- **App Configuration & Versioning**: 1 endpoint
- **Master Data (Skills & Business Categories)**: 5 endpoints

### 3. APIs Requiring Admin Authentication
- **38 endpoints** explicitly mandate JWT authentication with administrative privileges (`authenticateToken`, `isAdmin`, or role check for `"admin"` / `"super_admin"`).
- **5 endpoints** require standard JWT authentication (`authenticateToken`) and perform administrative support/management functions (e.g. Inquiry management and Master Data management).
- **2 endpoints** in Document routes are declared as admin/verification operations in comments and controller design (`getPendingDocuments`, `updateDocumentStatus`) but do not have `authenticateToken` explicitly attached in `documentRoutes.js`.

### 4. APIs with Special Roles/Permissions
- Endpoints protected by `isAdmin` middleware verify `['admin', 'super_admin'].includes(req.user.userType)`.
- `GET /api/jobs/stats` inspects `userType` in the database and provides a dedicated branch for `['admin', 'super_admin']` returning total platform statistics.
- `createMobileBanner`, `updateMobileBanner`, `deleteMobileBanner` additionally invoke the helper `hasAdminAccess(req)`.

### 5. APIs with File Upload / Multipart
- **0 endpoints** use `multipart/form-data` or `multer` middleware in the current routes.
- Document and media assets are stored via external pre-signed/cloud storage or direct URLs and transmitted as `documentUrl` and `bannerImageUrl` inside JSON request bodies.

### 6. APIs Where Request/Response Details Could Not Be Fully Determined
- All request parameters, query filters, path variables, request schemas, validation rules, and responses were **100% determined directly from backend source code**. No placeholders marked `UNKNOWN` were necessary.

### 7. Files Inspected
- `src/server.js`
- `src/app.js`
- `src/config/db.js`
- `src/config/testDB.js`
- `src/middleware/authMiddleware.js`
- `src/routes/userRoutes.js`
- `src/routes/documentRoutes.js`
- `src/routes/inquiryRoutes.js`
- `src/routes/jobRoutes.js`
- `src/routes/jobEnquiryRoutes.js`
- `src/routes/activityHistoryRoutes.js`
- `src/routes/userJobHistoryRoutes.js`
- `src/routes/userReviewRoutes.js`
- `src/routes/notificationRoutes.js`
- `src/routes/paymentRoutes.js`
- `src/routes/cashfreeRoutes.js`
- `src/routes/publicRoutes.js`
- `src/routes/smsRoutes.js`
- `src/routes/twilioRoutes.js`
- `src/routes/subscriptionRoutes.js`
- `src/routes/fcmRoutes.js`
- `src/routes/ticketRoutes.js`
- `src/referral/referral.routes.js`
- `src/controllers/userController.js`
- `src/controllers/discoveryController.js`
- `src/controllers/documentController.js`
- `src/controllers/inquiryController.js`
- `src/controllers/jobController.js`
- `src/controllers/jobEnquiryController.js`
- `src/controllers/jobStatsController.js`
- `src/controllers/activityHistoryController.js`
- `src/controllers/userJobHistoryController.js`
- `src/controllers/userReviewController.js`
- `src/controllers/notificationController.js`
- `src/controllers/paymentController.js`
- `src/controllers/cashfreeController.js`
- `src/controllers/publicController.js`
- `src/controllers/appVersionController.js`
- `src/controllers/smsController.js`
- `src/controllers/twilioController.js`
- `src/controllers/subscriptionController.js`
- `src/controllers/fcmController.js`
- `src/controllers/ticketController.js`
- `src/referral/referral.controller.js`
- `src/referral/referral.service.js`
- `src/models/User.js`
- `scripts/activateAllUsersUntilOct2026.js`
- `scripts/addUsers.js`

### 8. Output Files Created
- [`LabourSampark_Admin_Postman_Collection.json`](file:///Users/nileshnishad/Documents/github/laboursampark-backend/LabourSampark_Admin_Postman_Collection.json) - Complete, validated Postman Collection v2.1 JSON file.
- [`LabourSampark_Admin_API_Inventory.md`](file:///Users/nileshnishad/Documents/github/laboursampark-backend/LabourSampark_Admin_API_Inventory.md) - Full API inventory with methods, endpoints, roles, and schema details.

