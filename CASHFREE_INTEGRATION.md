# Cashfree Backend Integration

This backend keeps the existing PayU endpoints unchanged and adds Cashfree behind `/api/cashfree`.
Cashfree Payment Gateway calls use API version `2026-01-01`. Cashfree Payouts V2 calls use API version `2024-01-01`.

## Configuration

Copy the variable names from `.env.example` into the deployment environment. Use Cashfree sandbox credentials with `sandbox` first, then switch both environment variables to `production` with production credentials. Never commit real values.

Payment Gateway uses `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY`. Payouts uses its separate client ID and client secret. Webhook signatures use the relevant product secret and the exact raw request body.

## Endpoints

All authenticated endpoints use `Authorization: Bearer <JWT>` from the existing auth middleware.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/cashfree/orders` | User | Create an order and return `paymentSessionId` |
| GET | `/api/cashfree/orders/:paymentId/status` | User | Fetch Cashfree order/payments and reconcile status |
| POST | `/api/cashfree/payments/:paymentId/refund` | Admin | Create a full or partial refund |
| GET | `/api/cashfree/payments/:paymentId/refund` | Admin | Refresh refund status |
| POST | `/api/cashfree/beneficiaries` | User | Create a Cashfree Payouts V2 beneficiary |
| GET | `/api/cashfree/beneficiaries/:beneficiaryId` | User | Refresh beneficiary status |
| DELETE | `/api/cashfree/beneficiaries/:beneficiaryId` | User | Remove a beneficiary |
| POST | `/api/cashfree/payouts` | Admin | Initiate a payout to a verified beneficiary |
| GET | `/api/cashfree/payouts` | Admin | List local payout records |
| GET | `/api/cashfree/payouts/:payoutId` | Admin | Refresh payout status |
| POST | `/api/cashfree/payouts/:payoutId/retry` | Admin | Retry failed, rejected, or reversed payouts with a new transfer ID |
| POST | `/api/cashfree/webhooks/payment` | Cashfree | Signed Payment Gateway webhook |
| POST | `/api/cashfree/webhooks/payout` | Cashfree | Signed Payouts V2 webhook |

Create order body:

```json
{
  "amount": 999,
  "productInfo": "Premium Plan",
  "purpose": "subscription",
  "description": "Monthly subscription",
  "metadata": { "benefitType": "profile_visibility" }
}
```

The client should initialize Cashfree Checkout with the returned `paymentSessionId`. The client redirect is never treated as proof of payment; the status endpoint and signed webhook both reconcile against Cashfree.

Refund body:

```json
{ "amount": 999, "note": "Customer refund" }
```

Beneficiary body accepts `beneficiaryId`, `name`, `email`, `phone`, and either `bankAccountNumber` plus `bankIfsc`, or `vpa`. Bank account numbers are not stored; only the last four digits are retained.

Payout body:

```json
{ "beneficiaryId": "<local-beneficiary-id>", "amount": 500, "transferMode": "imps" }
```

## Status and reliability

Cashfree statuses are retained in `cashfreeStatus` and mapped to controlled application statuses. Payment, refund, payout, and webhook records use unique identifiers. Repeated webhook deliveries are ignored by `CashfreeWebhookEvent.eventId`; repeated order creation can use the `x-idempotency-key` header. A Cashfree 5xx payout response must be reconciled with status before retrying.

Payment success invokes the existing referral reward and profile visibility benefit functions, so PayU business behavior remains reusable and PayU routes remain available during migration.

## Dashboard setup

Configure these HTTPS URLs in the Cashfree dashboards:

* Payment Gateway: `/api/cashfree/webhooks/payment`
* Payouts V2: `/api/cashfree/webhooks/payout`, selecting webhook version V2

Enable the relevant payment and payout products, complete production KYC, configure payout fund sources and transfer permissions, and use Cashfree sandbox test data before switching environments.

## Manual checks

Do not use a frontend success redirect as confirmation. Verify an order with the status endpoint, inspect webhook signatures with Cashfree's official tool, and reconcile pending records periodically using the status endpoints. Run the project's existing test command manually after installing or configuring the environment; this repository currently has no configured automated test script beyond its placeholder.

Official references:

* https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order
* https://www.cashfree.com/docs/api-reference/payments/latest/payments/get-payments-for-an-order
* https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create-refund
* https://www.cashfree.com/docs/api-reference/payments/latest/webhooks/signature-verification
* https://www.cashfree.com/docs/api-reference/payouts/v2/payouts-api-v2-new
* https://www.cashfree.com/docs/api-reference/payouts/v2/webhooks/webhooks-v2