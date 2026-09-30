import crypto from "crypto";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import CashfreeWebhookEvent from "../models/CashfreeWebhookEvent.js";
import CashfreeBeneficiary from "../models/CashfreeBeneficiary.js";
import CashfreePayout from "../models/CashfreePayout.js";
import { cashfreePayments, cashfreePayouts, verifyCashfreeWebhook } from "../utils/cashfreeClient.js";
import { applyPostPaymentBenefits, applyReferralRewardBenefit, updatePaymentSummary } from "./paymentController.js";

export const mapCashfreePaymentStatus = (status) => ({
  SUCCESS: "success",
  FAILED: "failed",
  USER_DROPPED: "cancelled",
  CANCELLED: "cancelled",
  VOID: "cancelled",
  PENDING: "pending",
  NOT_ATTEMPTED: "pending",
}[String(status || "").toUpperCase()] || "pending");

const payoutStatus = (status) => ({ SUCCESS: "success", FAILED: "failed", REJECTED: "rejected", REVERSED: "reversed" }[String(status || "").toUpperCase()] || "pending");
const amountOf = (value) => Number(Number(value).toFixed(2));
const id = (prefix) => `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
const publicPayment = (payment) => ({ paymentId: payment._id, txnId: payment.txnId, gateway: payment.gateway, amount: payment.amount, currency: payment.currency, status: payment.status, paidAt: payment.paidAt, cashfreeOrderId: payment.cashfreeOrderId });

const applyPaymentState = async (payment, gatewayPayment, gatewayOrder) => {
  const nextStatus = mapCashfreePaymentStatus(gatewayPayment?.payment_status || gatewayOrder?.order_status);
  const oldStatus = payment.status;
  payment.status = nextStatus;
  payment.cashfreeStatus = gatewayPayment?.payment_status || gatewayOrder?.order_status;
  payment.cashfreePaymentId = gatewayPayment?.cf_payment_id || payment.cashfreePaymentId;
  payment.cashfreeResponse = { payment: gatewayPayment || {}, order: gatewayOrder || {} };
  payment.gatewayVerified = nextStatus === "success";
  payment.verificationDetails = payment.cashfreeResponse;
  if (nextStatus === "success" && oldStatus !== "success") {
    payment.paidAt = new Date();
    const referral = await applyReferralRewardBenefit(payment);
    const benefits = await applyPostPaymentBenefits(payment);
    const details = { ...(benefits || {}), ...(referral || {}) };
    if (Object.keys(details).length) { payment.benefitAppliedAt = new Date(); payment.benefitAppliedDetails = details; }
  }
  await payment.save();
  if (oldStatus !== nextStatus) await updatePaymentSummary({ userId: payment.userId, oldStatus, newStatus: nextStatus, amount: payment.amount });
  return payment;
};

export const createCashfreeOrder = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("fullName email mobile").lean();
    const { amount, productInfo, purpose = "general", description, metadata = {}, returnUrl, paymentMethods } = req.body;
    const parsedAmount = amountOf(amount);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) return res.status(400).json({ success: false, message: "Amount must be at least 1.00" });
    if (!productInfo || String(productInfo).trim().length > 200) return res.status(400).json({ success: false, message: "productInfo is required" });
    if (!validEmail(user.email) || !/^\+?[0-9]{10,15}$/.test(String(user.mobile || ""))) return res.status(400).json({ success: false, message: "User email and mobile are required for payment" });
    const requestKey = String(req.get("x-idempotency-key") || req.body.idempotencyKey || id("idem")).slice(0, 64);
    const existing = await Payment.findOne({ userId: req.userId, idempotencyKey: requestKey });
    if (existing) return res.status(200).json({ success: true, data: publicPayment(existing), paymentSessionId: existing.metadata?.paymentSessionId });
    const txnId = id("CF");
    const payment = await Payment.create({ userId: req.userId, gateway: "cashfree", txnId, receipt: txnId, idempotencyKey: requestKey, amount: parsedAmount, currency: "INR", purpose, productInfo: String(productInfo).trim(), description, status: "created", paymentUrlToken: crypto.randomBytes(24).toString("hex"), customer: { firstName: user.fullName || "Customer", email: user.email, phone: user.mobile }, metadata });
    try {
      const response = await cashfreePayments.createOrder({ order_id: txnId, order_amount: parsedAmount, order_currency: "INR", customer_details: { customer_id: String(req.userId), customer_name: user.fullName || "Customer", customer_email: user.email, customer_phone: user.mobile }, order_meta: { return_url: returnUrl, payment_methods: paymentMethods }, order_note: description || productInfo }, requestKey);
      payment.cashfreeOrderId = response.order_id || txnId;
      payment.metadata = { ...metadata, paymentSessionId: response.payment_session_id };
      payment.cashfreeResponse = response;
      payment.status = "pending";
      await payment.save();
      await User.updateOne({ _id: req.userId }, { $inc: { "paymentSummary.totalTransactions": 1 }, $set: { "paymentSummary.lastPaymentStatus": "pending" } });
      return res.status(201).json({ success: true, message: "Cashfree order created successfully", data: { ...publicPayment(payment), orderId: payment.cashfreeOrderId, paymentSessionId: response.payment_session_id } });
    } catch (error) { await Payment.deleteOne({ _id: payment._id }); throw error; }
  } catch (error) { console.error("Create Cashfree order error:", error.code || error.message); return res.status(error.status || 502).json({ success: false, message: "Unable to create payment order" }); }
};

export const verifyCashfreePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.paymentId, userId: req.userId, gateway: "cashfree" });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    const orderId = payment.cashfreeOrderId || payment.txnId;
    const [order, payments] = await Promise.all([cashfreePayments.getOrder(orderId), cashfreePayments.getPayments(orderId)]);
    const confirmed = payments.find((item) => item.payment_status === "SUCCESS") || payments[0];
    await applyPaymentState(payment, confirmed, order);
    return res.json({ success: true, data: publicPayment(payment) });
  } catch (error) { console.error("Verify Cashfree payment error:", error.code || error.message); return res.status(error.status || 502).json({ success: false, message: "Unable to verify payment" }); }
};

const processPaymentWebhook = async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body || {});
  const signature = req.get("x-webhook-signature");
  const timestamp = req.get("x-webhook-timestamp");
  if (!verifyCashfreeWebhook({ signature, timestamp, rawBody, secret: process.env.CASHFREE_SECRET_KEY })) return res.status(401).json({ success: false, message: "Invalid webhook signature" });
  const payload = req.body || JSON.parse(rawBody);
  const eventType = String(payload.type || "UNKNOWN");
  const orderId = payload.data?.order?.order_id || payload.data?.payment?.order_id;
  const eventId = crypto.createHash("sha256").update(`${eventType}:${orderId || ""}:${payload.data?.payment?.cf_payment_id || timestamp}:${rawBody}`).digest("hex");
  try { await CashfreeWebhookEvent.create({ eventId, provider: "cashfree-payment", eventType, payload, processedAt: new Date() }); } catch (error) { if (error.code === 11000) return res.status(200).json({ success: true, duplicate: true }); throw error; }
  if (orderId) { const payment = await Payment.findOne({ gateway: "cashfree", $or: [{ cashfreeOrderId: orderId }, { txnId: orderId }] }); if (payment) await applyPaymentState(payment, payload.data?.payment, payload.data?.order); }
  return res.status(200).json({ success: true });
};
export const handleCashfreePaymentWebhook = async (req, res) => { try { return await processPaymentWebhook(req, res); } catch (error) { console.error("Cashfree payment webhook error:", error.message); return res.status(500).json({ success: false, message: "Webhook processing failed" }); } };

export const createCashfreeRefund = async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.paymentId, gateway: "cashfree" });
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    const requested = amountOf(req.body.amount || payment.amount);
    if (payment.status !== "success" || requested < 1 || requested > payment.amount) return res.status(400).json({ success: false, message: "Refund amount must not exceed a successful payment" });
    if (payment.refund?.status === "PENDING" || payment.refund?.status === "SUCCESS") return res.status(409).json({ success: false, message: "Refund already requested" });
    const refundId = id("REF");
    const response = await cashfreePayments.createRefund(payment.cashfreeOrderId, { refund_amount: requested, refund_id: refundId, refund_note: String(req.body.note || "Merchant initiated refund").slice(0, 100) }, id("idem"));
    payment.refund = { refundId, cashfreeRefundId: response.cf_refund_id, amount: requested, status: response.refund_status, response, createdAt: new Date() };
    await payment.save();
    return res.status(201).json({ success: true, data: payment.refund });
  } catch (error) { console.error("Create Cashfree refund error:", error.code || error.message); return res.status(error.status || 502).json({ success: false, message: "Unable to create refund" }); }
};

export const getCashfreeRefund = async (req, res) => { try { const payment = await Payment.findOne({ _id: req.params.paymentId, gateway: "cashfree" }); if (!payment?.refund?.refundId) return res.status(404).json({ success: false, message: "Refund not found" }); const response = await cashfreePayments.getRefund(payment.cashfreeOrderId, payment.refund.refundId); payment.refund.status = response.refund_status; payment.refund.response = response; await payment.save(); return res.json({ success: true, data: payment.refund }); } catch (error) { return res.status(error.status || 502).json({ success: false, message: "Unable to fetch refund" }); } };

const beneficiaryView = (bene) => ({ id: bene._id, beneficiaryId: bene.beneficiaryId, name: bene.name, email: bene.email, phone: bene.phone, bankAccountLast4: bene.bankAccountLast4, bankIfsc: bene.bankIfsc, vpa: bene.vpa, status: bene.status });
export const createCashfreeBeneficiary = async (req, res) => { try { const { beneficiaryId, name, email, phone, bankAccountNumber, bankIfsc, vpa } = req.body; if (!beneficiaryId || !name || (!bankAccountNumber && !vpa) || (bankAccountNumber && (!bankIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(bankIfsc).toUpperCase())))) return res.status(400).json({ success: false, message: "Valid beneficiary, bank/IFSC or UPI details are required" }); const existing = await CashfreeBeneficiary.findOne({ userId: req.userId, beneficiaryId }); if (existing) return res.status(409).json({ success: false, message: "Beneficiary already exists" }); const response = await cashfreePayouts.createBeneficiary({ beneficiary_id: beneficiaryId, beneficiary_name: name, beneficiary_instrument_details: { ...(bankAccountNumber ? { bank_account_number: bankAccountNumber, bank_ifsc: bankIfsc } : {}), ...(vpa ? { vpa } : {}) }, beneficiary_contact_details: { beneficiary_email: email, beneficiary_phone: phone, beneficiary_country_code: "+91" } }); const bene = await CashfreeBeneficiary.create({ userId: req.userId, beneficiaryId, name, email, phone, bankAccountLast4: bankAccountNumber ? String(bankAccountNumber).slice(-4) : undefined, bankIfsc, vpa, status: response.beneficiary_status, cashfreeResponse: response }); return res.status(201).json({ success: true, data: beneficiaryView(bene) }); } catch (error) { return res.status(error.status || 502).json({ success: false, message: "Unable to create beneficiary" }); } };
export const getCashfreeBeneficiary = async (req, res) => { try { const bene = await CashfreeBeneficiary.findOne({ _id: req.params.beneficiaryId, userId: req.userId }); if (!bene) return res.status(404).json({ success: false, message: "Beneficiary not found" }); const response = await cashfreePayouts.getBeneficiary({ beneficiary_id: bene.beneficiaryId }); bene.status = response.beneficiary_status; bene.cashfreeResponse = response; await bene.save(); return res.json({ success: true, data: beneficiaryView(bene) }); } catch (error) { return res.status(error.status || 502).json({ success: false, message: "Unable to fetch beneficiary" }); } };
export const removeCashfreeBeneficiary = async (req, res) => { try { const bene = await CashfreeBeneficiary.findOne({ _id: req.params.beneficiaryId, userId: req.userId }); if (!bene) return res.status(404).json({ success: false, message: "Beneficiary not found" }); const response = await cashfreePayouts.removeBeneficiary(bene.beneficiaryId); bene.status = "DELETED"; bene.cashfreeResponse = response; await bene.save(); return res.json({ success: true, data: beneficiaryView(bene) }); } catch (error) { return res.status(error.status || 502).json({ success: false, message: "Unable to remove beneficiary" }); } };

export const createCashfreePayout = async (req, res) => { try { const bene = await CashfreeBeneficiary.findOne({ _id: req.body.beneficiaryId, userId: req.userId, status: "VERIFIED" }); const amount = amountOf(req.body.amount); if (!bene) return res.status(400).json({ success: false, message: "Verified beneficiary is required" }); if (!Number.isFinite(amount) || amount < 1) return res.status(400).json({ success: false, message: "Amount must be at least 1.00" }); const transferId = id("PO"); const duplicate = await CashfreePayout.findOne({ userId: req.userId, "cashfreeResponse.requestKey": req.body.idempotencyKey }); if (duplicate) return res.json({ success: true, data: duplicate }); const response = await cashfreePayouts.createTransfer({ transfer_id: transferId, transfer_amount: amount, transfer_currency: "INR", transfer_mode: req.body.transferMode || "banktransfer", beneficiary_details: { beneficiary_id: bene.beneficiaryId }, transfer_remarks: String(req.body.remarks || "LabourSampark payout").slice(0, 70) }); const payout = await CashfreePayout.create({ userId: req.userId, beneficiaryId: bene._id, transferId, cashfreeTransferId: response.cf_transfer_id, amount, transferMode: req.body.transferMode || "banktransfer", status: payoutStatus(response.status), cashfreeStatus: response.status, cashfreeResponse: { ...response, requestKey: req.body.idempotencyKey } }); return res.status(201).json({ success: true, data: payout }); } catch (error) { return res.status(error.status || 502).json({ success: false, message: "Unable to create payout" }); } };
export const getCashfreePayout = async (req, res) => { try { const payout = await CashfreePayout.findOne({ _id: req.params.payoutId, userId: req.userId }); if (!payout) return res.status(404).json({ success: false, message: "Payout not found" }); const response = await cashfreePayouts.getTransfer({ transfer_id: payout.transferId }); payout.status = payoutStatus(response.status); payout.cashfreeStatus = response.status; payout.failureReason = response.status_description; payout.cashfreeResponse = response; await payout.save(); return res.json({ success: true, data: payout }); } catch (error) { return res.status(error.status || 502).json({ success: false, message: "Unable to fetch payout" }); } };
export const handleCashfreePayoutWebhook = async (req, res) => { try { const rawBody = req.rawBody || JSON.stringify(req.body || {}); if (!verifyCashfreeWebhook({ signature: req.get("x-webhook-signature"), timestamp: req.get("x-webhook-timestamp"), rawBody, secret: process.env.CASHFREE_PAYOUT_CLIENT_SECRET })) return res.status(401).json({ success: false, message: "Invalid webhook signature" }); const payload = req.body || JSON.parse(rawBody); const data = payload.data || {}; const eventId = crypto.createHash("sha256").update(`${payload.type}:${data.transfer_id}:${rawBody}`).digest("hex"); try { await CashfreeWebhookEvent.create({ eventId, provider: "cashfree-payout", eventType: payload.type, payload, processedAt: new Date() }); } catch (error) { if (error.code === 11000) return res.status(200).json({ success: true, duplicate: true }); throw error; } const payout = await CashfreePayout.findOne({ $or: [{ transferId: data.transfer_id }, { cashfreeTransferId: data.cf_transfer_id }] }); if (payout) { payout.status = payoutStatus(data.status); payout.cashfreeStatus = data.status; payout.failureReason = data.status_description; payout.cashfreeResponse = payload; await payout.save(); } return res.json({ success: true }); } catch (error) { console.error("Cashfree payout webhook error:", error.message); return res.status(500).json({ success: false, message: "Webhook processing failed" }); } };
export const retryCashfreePayout = async (req, res) => { const original = await CashfreePayout.findOne({ _id: req.params.payoutId, userId: req.userId }); if (!original || !["failed", "rejected", "reversed"].includes(original.status)) return res.status(400).json({ success: false, message: "Only failed payouts can be retried" }); req.body = { beneficiaryId: original.beneficiaryId, amount: original.amount, transferMode: original.transferMode, remarks: "Retry payout" }; return createCashfreePayout(req, res); };
export const listCashfreePayouts = async (req, res) => { const payouts = await CashfreePayout.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(100).lean(); return res.json({ success: true, data: payouts }); };