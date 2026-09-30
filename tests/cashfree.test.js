import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyCashfreeWebhook } from "../src/utils/cashfreeClient.js";
import { mapCashfreePaymentStatus } from "../src/controllers/cashfreeController.js";

test("Cashfree payment statuses map to controlled application states", () => {
  assert.equal(mapCashfreePaymentStatus("SUCCESS"), "success");
  assert.equal(mapCashfreePaymentStatus("FAILED"), "failed");
  assert.equal(mapCashfreePaymentStatus("USER_DROPPED"), "cancelled");
  assert.equal(mapCashfreePaymentStatus("PENDING"), "pending");
});

test("Cashfree webhook signatures require the exact raw body", () => {
  const secret = "test-secret";
  const timestamp = "1710000000000";
  const rawBody = '{"type":"PAYMENT_SUCCESS_WEBHOOK"}';
  const signature = crypto.createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
  assert.equal(verifyCashfreeWebhook({ signature, timestamp, rawBody, secret }), true);
  assert.equal(verifyCashfreeWebhook({ signature, timestamp, rawBody: JSON.stringify(JSON.parse(rawBody)), secret }), true);
  assert.equal(verifyCashfreeWebhook({ signature: "invalid", timestamp, rawBody, secret }), false);
});