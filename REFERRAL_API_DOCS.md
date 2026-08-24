# Referral System API Documentation

Base URL (local): `http://localhost:9000`
All protected routes require: `Authorization: Bearer <token>`

Referral code = the user's own `userCode` (e.g. `LS26000001`). No separate
code is generated at registration.

Core rules enforced by the backend:
- A referral code can be entered only **once** per account.
- A referral code can be entered only **within 72 hours** of registration.
- After 72 hours with no code entered, the account is locked to `EXPIRED`.
- Self-referral is not allowed.
- ₹50 is credited to the referrer **only** when all of these are true:
  - Payment status = `success`
  - The referred user has a `referredByUserId`
  - The referred user's `referralStatus` = `REFERRED`
  - The payment was completed within 72 hours of the referred user's registration
  - No reward has already been credited for that referred user
- If a payment is refunded, the reward can be reversed (admin endpoint), which
  debits the ₹50 back from the referrer's wallet.

---

## 1. Get Referral Details

`GET /api/referrals/my-code`

```bash
curl --location 'http://localhost:9000/api/referrals/my-code' \
--header 'Authorization: Bearer <token>'
```

Response:
```json
{
  "success": true,
  "message": "Referral details fetched successfully",
  "data": {
    "referralCode": "LS26000001",
    "shareLink": "https://laboursampark.com/ref/LS26000001",
    "rewardPerReferral": 50,
    "totalReferred": 4,
    "creditedRewards": 2,
    "pendingRewards": 0
  }
}
```

---

## 2. Validate Referral Code

`POST /api/referrals/validate`

```bash
curl --location 'http://localhost:9000/api/referrals/validate' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "referralCode": "LS26000001"
}'
```

Response (eligible):
```json
{
  "success": true,
  "message": "Referral code is valid",
  "data": {
    "eligible": true,
    "referrer": {
      "userId": "64f...",
      "fullName": "Ramesh Kumar",
      "userCode": "LS26000001",
      "userType": "contractor"
    }
  }
}
```

Response (not eligible):
```json
{
  "success": true,
  "message": "Referral code is not valid",
  "data": {
    "eligible": false,
    "reason": "72 hour referral window has expired"
  }
}
```

---

## 3. Apply / Lock Referral Code

`POST /api/referrals/apply`

```bash
curl --location 'http://localhost:9000/api/referrals/apply' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
--data '{
  "referralCode": "LS26000001"
}'
```

Response (success):
```json
{
  "success": true,
  "message": "Referral code applied successfully",
  "data": {
    "referralStatus": "REFERRED",
    "referralCodeLocked": true,
    "referralCodeEnteredAt": "2026-08-25T10:15:00.000Z",
    "referredBy": {
      "userId": "64f...",
      "fullName": "Ramesh Kumar",
      "userCode": "LS26000001",
      "userType": "contractor"
    }
  }
}
```

Response (error, e.g. already applied / expired / invalid code / self referral):
```json
{
  "success": false,
  "message": "A referral code has already been applied to this account"
}
```

---

## 4. Referral Status (own status, as the referred user)

`GET /api/referrals/status`

```bash
curl --location 'http://localhost:9000/api/referrals/status' \
--header 'Authorization: Bearer <token>'
```

Response:
```json
{
  "success": true,
  "message": "Referral status fetched successfully",
  "data": {
    "referralStatus": "REFERRED",
    "referralCodeLocked": true,
    "referralCodeEnteredAt": "2026-08-25T10:15:00.000Z",
    "referralExpiryTime": "2026-08-28T09:00:00.000Z",
    "referredBy": {
      "userId": "64f...",
      "fullName": "Ramesh Kumar",
      "userCode": "LS26000001",
      "userType": "contractor"
    }
  }
}
```

---

## 5. Referral History (as referrer)

`GET /api/referrals/history?page=1&limit=20`

```bash
curl --location 'http://localhost:9000/api/referrals/history?page=1&limit=20' \
--header 'Authorization: Bearer <token>'
```

Response:
```json
{
  "success": true,
  "message": "Referral history fetched successfully",
  "data": [
    {
      "userId": "650...",
      "fullName": "Suresh Yadav",
      "userType": "labour",
      "referralStatus": "REFERRED",
      "registeredAt": "2026-08-20T06:00:00.000Z",
      "referralCodeEnteredAt": "2026-08-20T08:00:00.000Z",
      "rewardStatus": "CREDITED",
      "rewardAmount": 50,
      "creditedAt": "2026-08-21T05:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 6. Payment Webhook (reward trigger)

The reward is credited **automatically** inside the existing PayU success
webhook (`POST /api/payments/payu/callback/success`) — no separate client
endpoint is needed. As soon as a referred user's subscription payment is
verified as `success`, `processReferralRewardForPayment()` runs and either
credits ₹50 to the referrer's wallet or records `NOT_ELIGIBLE` with a reason.

For admin/support use, two manual endpoints are available:

### 6a. Reprocess a payment (self-heal / retry)

`POST /api/referrals/admin/process/:paymentId` (admin only)

```bash
curl --location --request POST 'http://localhost:9000/api/referrals/admin/process/670f1c2b8e4a3d0012a34567' \
--header 'Authorization: Bearer <admin_token>'
```

Response:
```json
{
  "success": true,
  "message": "Referral reward processed",
  "data": {
    "_id": "670f...",
    "referrerUserId": "64f...",
    "referredUserId": "650...",
    "referralCode": "LS26000001",
    "paymentId": "670f1c2b8e4a3d0012a34567",
    "amount": 50,
    "status": "CREDITED",
    "creditedAt": "2026-08-25T10:20:00.000Z"
  }
}
```

### 6b. Reverse a reward (refund case)

`POST /api/referrals/admin/reverse/:paymentId` (admin only)

```bash
curl --location --request POST 'http://localhost:9000/api/referrals/admin/reverse/670f1c2b8e4a3d0012a34567' \
--header 'Authorization: Bearer <admin_token>'
```

Response:
```json
{
  "success": true,
  "message": "Referral reward reversed",
  "data": {
    "_id": "670f...",
    "status": "REVERSED",
    "reversedAt": "2026-08-25T11:00:00.000Z",
    "amount": 50
  }
}
```

---

## 7. Wallet Transactions

`GET /api/referrals/wallet?page=1&limit=20`

```bash
curl --location 'http://localhost:9000/api/referrals/wallet?page=1&limit=20' \
--header 'Authorization: Bearer <token>'
```

Response:
```json
{
  "success": true,
  "message": "Wallet transactions fetched successfully",
  "data": {
    "walletBalance": 150,
    "transactions": [
      {
        "_id": "670f...",
        "userId": "64f...",
        "type": "credit",
        "amount": 50,
        "balanceAfter": 150,
        "referenceType": "referral_reward",
        "referenceId": "670f...",
        "description": "Referral reward for referring Suresh Yadav",
        "createdAt": "2026-08-25T10:20:00.000Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## Files

- `src/referral/referralReward.model.js` — reward ledger (one row per referred user)
- `src/referral/walletTransaction.model.js` — wallet credit/debit ledger
- `src/referral/referral.service.js` — all business rules (window, validation, crediting, reversal)
- `src/referral/referral.controller.js` — request handlers
- `src/referral/referral.routes.js` — routes, mounted at `/api/referrals` in `src/app.js`
- `src/models/User.js` — added `referralStatus`, `referredByUserId`, `referralCodeLocked`,
  `referralCodeEnteredAt`, `referralExpiryTime`, `walletBalance`
- `src/controllers/userController.js` — sets `referralExpiryTime` at registration
- `src/controllers/paymentController.js` — calls `processReferralRewardForPayment()` on successful payments
