import crypto from "crypto";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

const DEFAULT_CHECKOUT_TTL_MINUTES = 20;

const getPayUConfig = () => {
  const key = process.env.PAYU_KEY;
  const salt = process.env.PAYU_SALT;
  const baseUrl = process.env.PAYU_BASE_URL || "https://test.payu.in";

  if (!key || !salt) {
    throw new Error("PAYU_KEY or PAYU_SALT is missing in environment variables");
  }

  return {
    key,
    salt,
    paymentUrl: `${baseUrl}/_payment`,
    commandUrl: `${baseUrl}/merchant/postservice?form=2`,
  };
};

const sha512 = (value) => crypto.createHash("sha512").update(value).digest("hex");

const createTxnid = () => `TXN_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

const createPaymentToken = () => crypto.randomBytes(24).toString("hex");

const toMoneyString = (amount) => Number(amount).toFixed(2);

const isAllowedRedirectUrl = (url) => {
  if (!url) return false;

  const allowedBaseList = String(process.env.PAYU_ALLOWED_REDIRECT_BASES || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (allowedBaseList.length === 0) {
    return true;
  }

  return allowedBaseList.some((allowedBase) => url.startsWith(allowedBase));
};

// PayU required hash formula:
// sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
const buildPaymentHash = ({ key, txnid, amount, productinfo, firstname, email, udf1 = "", udf2 = "", udf3 = "", udf4 = "", udf5 = "", salt }) => {
  const sequence = [
    key,
    txnid,
    toMoneyString(amount),
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    "",
    "",
    "",
    "",
    "",
    salt,
  ].join("|");

  return sha512(sequence);
};

const buildResponseHash = ({ body, salt }) => {
  const pieces = [
    salt,
    body.status || "",
    body.udf10 || "",
    body.udf9 || "",
    body.udf8 || "",
    body.udf7 || "",
    body.udf6 || "",
    body.udf5 || "",
    body.udf4 || "",
    body.udf3 || "",
    body.udf2 || "",
    body.udf1 || "",
    body.email || "",
    body.firstname || "",
    body.productinfo || "",
    body.amount || "",
    body.txnid || "",
    body.key || "",
  ];

  if (body.additionalCharges) {
    pieces.unshift(String(body.additionalCharges));
  }

  return sha512(pieces.join("|"));
};

const updatePaymentSummary = async ({ userId, oldStatus, newStatus, amount }) => {
  if (!userId) return;

  const oldSuccess = oldStatus === "success";
  const newSuccess = newStatus === "success";
  const oldFailure = ["failed", "cancelled", "expired"].includes(oldStatus);
  const newFailure = ["failed", "cancelled", "expired"].includes(newStatus);

  const inc = {};

  if (!oldSuccess && newSuccess) {
    inc["paymentSummary.successfulTransactions"] = 1;
    inc["paymentSummary.totalAmountPaid"] = Number(amount || 0);
  }

  if (oldSuccess && !newSuccess) {
    inc["paymentSummary.successfulTransactions"] =
      (inc["paymentSummary.successfulTransactions"] || 0) - 1;
    inc["paymentSummary.totalAmountPaid"] =
      (inc["paymentSummary.totalAmountPaid"] || 0) - Number(amount || 0);
  }

  if (!oldFailure && newFailure) {
    inc["paymentSummary.failedTransactions"] = 1;
  }

  if (oldFailure && !newFailure) {
    inc["paymentSummary.failedTransactions"] =
      (inc["paymentSummary.failedTransactions"] || 0) - 1;
  }

  const update = {
    $set: {
      "paymentSummary.lastPaymentStatus": newStatus,
    },
  };

  if (newSuccess) {
    update.$set["paymentSummary.lastPaymentAt"] = new Date();
  }

  if (Object.keys(inc).length > 0) {
    update.$inc = inc;
  }

  await User.updateOne({ _id: userId }, update);
};

const applyPostPaymentBenefits = async (payment) => {
  if (!payment?.userId) return null;
  if (payment?.benefitAppliedAt) return payment.benefitAppliedDetails || {};

  const purpose = String(payment.purpose || "").toLowerCase();
  const benefitType = String(payment.metadata?.benefitType || "").toLowerCase();
  const updates = {};

  // Profile visibility unlock use-case.
  if (
    purpose.includes("visibility") ||
    benefitType === "profile_visibility" ||
    payment.metadata?.setDisplayTrue === true
  ) {
    updates.display = true;
  }

  if (Object.keys(updates).length === 0) {
    return null;
  }

  await User.updateOne({ _id: payment.userId }, { $set: updates });
  return updates;
};

const verifyWithPayU = async ({ key, salt, commandUrl, txnId }) => {
  const command = "verify_payment";
  const hash = sha512(`${key}|${command}|${txnId}|${salt}`);

  const body = new URLSearchParams({
    key,
    command,
    var1: txnId,
    hash,
  });

  const response = await fetch(commandUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`PayU verify API failed with status ${response.status}`);
  }

  return response.json();
};

const appendQuery = (url, params) => {
  const query = new URLSearchParams(params);
  return `${url}${url.includes("?") ? "&" : "?"}${query.toString()}`;
};

const getCallbackBaseUrl = (req) => {
  const explicit = process.env.PAYU_CALLBACK_BASE_URL;
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
};

export const createPayUCheckoutLink = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      amount,
      productInfo,
      purpose = "general",
      description,
      firstName,
      email,
      phone,
      metadata = {},
      successUrl,
      failureUrl,
      checkoutTtlMinutes = DEFAULT_CHECKOUT_TTL_MINUTES,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    if (!productInfo || !String(productInfo).trim()) {
      return res.status(400).json({ success: false, message: "productInfo is required" });
    }

    if (successUrl && !isAllowedRedirectUrl(successUrl)) {
      return res.status(400).json({ success: false, message: "Invalid successUrl domain" });
    }

    if (failureUrl && !isAllowedRedirectUrl(failureUrl)) {
      return res.status(400).json({ success: false, message: "Invalid failureUrl domain" });
    }

    const user = await User.findById(userId).select("fullName email mobile paymentSummary").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const resolvedFirstName = String(firstName || user.fullName || "Customer").trim();
    const resolvedEmail = String(email || user.email || "").trim();
    const resolvedPhone = String(phone || user.mobile || "").trim();

    if (!resolvedEmail) {
      return res.status(400).json({ success: false, message: "Email is required for payment" });
    }

    const parsedAmount = Number(amount);
    const ttl = Number(checkoutTtlMinutes) > 0 ? Number(checkoutTtlMinutes) : DEFAULT_CHECKOUT_TTL_MINUTES;
    const checkoutExpiresAt = new Date(Date.now() + ttl * 60 * 1000);
    const txnId = createTxnid();
    const paymentUrlToken = createPaymentToken();
    const receipt = `payu_${txnId}`;

    const payment = await Payment.create({
      userId,
      gateway: "payu",
      txnId,
      receipt,
      amount: parsedAmount,
      currency: "INR",
      purpose,
      productInfo: String(productInfo).trim(),
      description,
      status: "created",
      paymentUrlToken,
      checkoutExpiresAt,
      customer: {
        firstName: resolvedFirstName,
        email: resolvedEmail,
        phone: resolvedPhone,
      },
      frontendRedirects: {
        successUrl: successUrl || "",
        failureUrl: failureUrl || "",
      },
      metadata,
    });

    await User.updateOne(
      { _id: userId },
      {
        $inc: {
          "paymentSummary.totalTransactions": 1,
        },
        $set: {
          "paymentSummary.lastPaymentStatus": "created",
        },
      },
    );

    const callbackBase = getCallbackBaseUrl(req);
    const paymentLink = `${callbackBase}/api/payments/checkout/${paymentUrlToken}`;

    return res.status(201).json({
      success: true,
      message: "PayU payment link created successfully",
      data: {
        paymentId: payment._id,
        txnId,
        gateway: "payu",
        amount: payment.amount,
        currency: payment.currency,
        paymentLink,
        expiresAt: checkoutExpiresAt,
      },
    });
  } catch (error) {
    console.error("Create PayU link error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create PayU payment link",
      error: error.message,
    });
  }
};

export const openPayUCheckout = async (req, res) => {
  try {
    const { token } = req.params;
    const payment = await Payment.findOne({ paymentUrlToken: token });

    if (!payment) {
      return res.status(404).send("Invalid payment link");
    }

    if (payment.status !== "created" && payment.status !== "pending") {
      return res.status(400).send("Payment already processed");
    }

    if (payment.checkoutExpiresAt && payment.checkoutExpiresAt < new Date()) {
      payment.status = "expired";
      payment.errorDetails = {
        code: "LINK_EXPIRED",
        description: "Payment link expired",
        reason: "expired",
      };
      await payment.save();
      await updatePaymentSummary({
        userId: payment.userId,
        oldStatus: "created",
        newStatus: "expired",
        amount: payment.amount,
      });
      return res.status(410).send("Payment link expired");
    }

    const { key, salt, paymentUrl } = getPayUConfig();
    const callbackBase = getCallbackBaseUrl(req);
    const surl = `${callbackBase}/api/payments/payu/callback/success`;
    const furl = `${callbackBase}/api/payments/payu/callback/failure`;

    const udf1 = String(payment._id);

    const hash = buildPaymentHash({
      key,
      txnid: payment.txnId,
      amount: payment.amount,
      productinfo: payment.productInfo,
      firstname: payment.customer?.firstName || "Customer",
      email: payment.customer?.email || "",
      udf1,
      udf2: "",
      udf3: "",
      udf4: "",
      udf5: "",
      salt,
    });

    payment.status = "pending";
    await payment.save();

    const fields = {
      key,
      txnid: payment.txnId,
      amount: toMoneyString(payment.amount),
      productinfo: payment.productInfo,
      firstname: payment.customer?.firstName || "Customer",
      email: payment.customer?.email || "",
      phone: payment.customer?.phone || "",
      surl,
      furl,
      hash,
      udf1,
      udf2: "",
      udf3: "",
      udf4: "",
      udf5: "",
    };

    const hiddenInputs = Object.entries(fields)
      .map(([name, value]) => `<input type="hidden" name="${name}" value="${String(value).replace(/"/g, "&quot;")}" />`)
      .join("\n");

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Redirecting to PayU</title>
  </head>
  <body>
    <p>Redirecting to secure payment page...</p>
    <form id="payu-form" method="post" action="${paymentUrl}">
      ${hiddenInputs}
    </form>
    <script>
      document.getElementById("payu-form").submit();
    </script>
  </body>
</html>`;

    return res.status(200).send(html);
  } catch (error) {
    console.error("Open PayU checkout error:", error);
    return res.status(500).send("Failed to open checkout");
  }
};

const handlePayUCallback = async ({ req, res, forcedStatus }) => {
  const { salt, key, commandUrl } = getPayUConfig();
  const body = req.body || {};
  const txnId = String(body.txnid || "").trim();

  if (!txnId) {
    return res.status(400).json({ success: false, message: "txnid is required" });
  }

  const payment = await Payment.findOne({ txnId });
  if (!payment) {
    return res.status(404).json({ success: false, message: "Payment not found" });
  }

  const expectedHash = buildResponseHash({ body, salt });
  const providedHash = String(body.hash || "");
  const hashValid = expectedHash === providedHash;

  if (!hashValid || body.key !== key) {
    const oldStatus = payment.status;
    payment.status = "failed";
    payment.hashValidated = false;
    payment.gatewayVerified = false;
    payment.payuStatus = String(body.status || forcedStatus || "failed");
    payment.payuResponse = body;
    payment.errorDetails = {
      code: "INVALID_CALLBACK_HASH",
      description: "Callback hash mismatch or invalid key",
      reason: "possible_tampering",
      metadata: {
        providedHash,
        expectedHash,
      },
    };
    await payment.save();

    await updatePaymentSummary({
      userId: payment.userId,
      oldStatus,
      newStatus: "failed",
      amount: payment.amount,
    });

    return res.status(400).json({ success: false, message: "Invalid callback signature" });
  }

  const status = String(forcedStatus || body.status || "").toLowerCase();
  const oldStatus = payment.status;
  payment.hashValidated = true;
  payment.payuStatus = status;
  payment.payuResponse = body;

  let appliedBenefits = null;

  if (status === "success") {
    let verifyResult = null;
    try {
      verifyResult = await verifyWithPayU({ key, salt, commandUrl, txnId });
    } catch (error) {
      verifyResult = { error: error.message };
    }

    const verifyStatus = Number(verifyResult?.status);
    const txnInVerifyPayload = Boolean(verifyResult?.transaction_details?.[txnId]);
    const verified = verifyStatus === 1 || txnInVerifyPayload;
    payment.gatewayVerified = verified;
    payment.verificationDetails = verifyResult || {};

    if (verified) {
      payment.status = "success";
      payment.paidAt = new Date();
      payment.errorDetails = undefined;
      appliedBenefits = await applyPostPaymentBenefits(payment);
      if (appliedBenefits) {
        payment.benefitAppliedAt = new Date();
        payment.benefitAppliedDetails = appliedBenefits;
      }
    } else {
      payment.status = "failed";
      payment.errorDetails = {
        code: "GATEWAY_VERIFY_FAILED",
        description: "PayU verification API did not confirm transaction",
        reason: "verification_failed",
        metadata: verifyResult || {},
      };
    }
  } else {
    payment.gatewayVerified = false;
    payment.status = ["failed", "cancelled", "expired"].includes(status) ? status : "failed";
    payment.errorDetails = {
      code: String(body.error || "PAYMENT_FAILED"),
      description: String(body.error_Message || "Payment failed at gateway"),
      reason: status || "failed",
      metadata: body,
    };
  }

  await payment.save();

  await updatePaymentSummary({
    userId: payment.userId,
    oldStatus,
    newStatus: payment.status,
    amount: payment.amount,
  });

  const redirectUrl =
    payment.status === "success"
      ? payment.frontendRedirects?.successUrl
      : payment.frontendRedirects?.failureUrl;

  if (redirectUrl) {
    const redirectWithData = appendQuery(redirectUrl, {
      status: payment.status,
      paymentId: String(payment._id),
      txnId: payment.txnId,
    });
    return res.redirect(302, redirectWithData);
  }

  return res.status(200).json({
    success: payment.status === "success",
    message: payment.status === "success" ? "Payment successful" : "Payment failed",
    data: {
      paymentId: payment._id,
      txnId: payment.txnId,
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt,
      benefitApplied: Boolean(payment.benefitAppliedAt),
      benefitAppliedDetails: payment.benefitAppliedDetails || null,
    },
  });
};

export const handlePayUSuccessCallback = async (req, res) => {
  try {
    return await handlePayUCallback({ req, res, forcedStatus: "success" });
  } catch (error) {
    console.error("PayU success callback error:", error);
    return res.status(500).json({ success: false, message: "Failed to process success callback" });
  }
};

export const handlePayUFailureCallback = async (req, res) => {
  try {
    return await handlePayUCallback({ req, res, forcedStatus: "failed" });
  } catch (error) {
    console.error("PayU failure callback error:", error);
    return res.status(500).json({ success: false, message: "Failed to process failure callback" });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { paymentId } = req.params;

    if (!paymentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid paymentId format" });
    }

    const payment = await Payment.findOne({ _id: paymentId, userId }).lean();
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    return res.json({
      success: true,
      data: {
        paymentId: payment._id,
        txnId: payment.txnId,
        status: payment.status,
        amount: payment.amount,
        gateway: payment.gateway,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        benefitApplied: Boolean(payment.benefitAppliedAt),
        benefitAppliedDetails: payment.benefitAppliedDetails || null,
      },
    });
  } catch (error) {
    console.error("Get payment status error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment status" });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments({ userId }),
    ]);

    return res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment history" });
  }
};