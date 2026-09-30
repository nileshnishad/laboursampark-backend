import crypto from "crypto";

const PAYMENT_VERSION = process.env.CASHFREE_API_VERSION || "2026-01-01";
const PAYOUT_VERSION = process.env.CASHFREE_PAYOUT_API_VERSION || "2024-01-01";

const required = (value, name) => {
  if (!value) throw new Error(`${name} is missing in environment variables`);
  return value;
};

const request = async ({ baseUrl, path, method = "GET", headers = {}, body, timeout = 15000 }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Accept: "application/json", "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || payload.error || `Cashfree API failed with status ${response.status}`);
      error.status = response.status;
      error.code = payload.code || payload.type;
      throw error;
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
};

const uuid = () => crypto.randomUUID();

const paymentConfig = () => ({
  baseUrl: process.env.CASHFREE_ENVIRONMENT === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
  headers: {
    "x-client-id": required(process.env.CASHFREE_APP_ID, "CASHFREE_APP_ID"),
    "x-client-secret": required(process.env.CASHFREE_SECRET_KEY, "CASHFREE_SECRET_KEY"),
    "x-api-version": PAYMENT_VERSION,
  },
});

const payoutConfig = () => ({
  baseUrl: process.env.CASHFREE_PAYOUT_ENVIRONMENT === "production" ? "https://api.cashfree.com/payout" : "https://sandbox.cashfree.com/payout",
  headers: {
    "x-client-id": required(process.env.CASHFREE_PAYOUT_CLIENT_ID, "CASHFREE_PAYOUT_CLIENT_ID"),
    "x-client-secret": required(process.env.CASHFREE_PAYOUT_CLIENT_SECRET, "CASHFREE_PAYOUT_CLIENT_SECRET"),
    "x-api-version": PAYOUT_VERSION,
  },
});

export const cashfreePayments = {
  createOrder: (body, idempotencyKey) => { const c = paymentConfig(); return request({ ...c, path: "/orders", method: "POST", headers: { ...c.headers, "x-idempotency-key": idempotencyKey || uuid() }, body }); },
  getOrder: (orderId) => { const c = paymentConfig(); return request({ ...c, path: `/orders/${encodeURIComponent(orderId)}`, headers: c.headers }); },
  getPayments: (orderId) => { const c = paymentConfig(); return request({ ...c, path: `/orders/${encodeURIComponent(orderId)}/payments`, headers: c.headers }); },
  createRefund: (orderId, body, idempotencyKey) => { const c = paymentConfig(); return request({ ...c, path: `/orders/${encodeURIComponent(orderId)}/refunds`, method: "POST", headers: { ...c.headers, "x-idempotency-key": idempotencyKey || uuid() }, body }); },
  getRefund: (orderId, refundId) => { const c = paymentConfig(); return request({ ...c, path: `/orders/${encodeURIComponent(orderId)}/refunds/${encodeURIComponent(refundId)}`, headers: c.headers }); },
};

export const cashfreePayouts = {
  createBeneficiary: (body) => { const c = payoutConfig(); return request({ ...c, path: "/beneficiary", method: "POST", headers: c.headers, body }); },
  getBeneficiary: (query) => { const c = payoutConfig(); return request({ ...c, path: `/beneficiary?${new URLSearchParams(query).toString()}`, headers: c.headers }); },
  removeBeneficiary: (beneficiaryId) => { const c = payoutConfig(); return request({ ...c, path: `/beneficiary?beneficiary_id=${encodeURIComponent(beneficiaryId)}`, method: "DELETE", headers: c.headers }); },
  createTransfer: (body) => { const c = payoutConfig(); return request({ ...c, path: "/transfers", method: "POST", headers: c.headers, body }); },
  getTransfer: (query) => { const c = payoutConfig(); return request({ ...c, path: `/transfers?${new URLSearchParams(query).toString()}`, headers: c.headers }); },
};

export const verifyCashfreeWebhook = ({ signature, timestamp, rawBody, secret }) => {
  if (!signature || !timestamp || !rawBody || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}${rawBody}`).digest("base64");
  if (expected.length !== String(signature).length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};
