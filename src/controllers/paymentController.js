import crypto from "crypto";
import Razorpay from "razorpay";
import Payment from "../models/Payment.js";
import User from "../models/User.js";

const DEFAULT_CHECKOUT_TTL_MINUTES = 15;

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are missing in environment variables");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const getFailureBucket = (status) => {
  return ["failed", "cancelled", "expired"].includes(status);
};

const applySummaryStatusTransition = async ({
  userId,
  oldStatus,
  newStatus,
  amount,
  paidAt,
}) => {
  if (!userId) return;

  const oldWasSuccess = oldStatus === "success";
  const oldWasFailure = getFailureBucket(oldStatus);
  const newIsSuccess = newStatus === "success";
  const newIsFailure = getFailureBucket(newStatus);

  const inc = {};

  if (!oldWasSuccess && newIsSuccess) {
    inc["paymentSummary.successfulTransactions"] = 1;
    inc["paymentSummary.totalAmountPaid"] = Number(amount || 0);
  }

  if (oldWasSuccess && !newIsSuccess) {
    inc["paymentSummary.successfulTransactions"] =
      (inc["paymentSummary.successfulTransactions"] || 0) - 1;
    inc["paymentSummary.totalAmountPaid"] =
      (inc["paymentSummary.totalAmountPaid"] || 0) - Number(amount || 0);
  }

  if (!oldWasFailure && newIsFailure) {
    inc["paymentSummary.failedTransactions"] = 1;
  }

  if (oldWasFailure && !newIsFailure) {
    inc["paymentSummary.failedTransactions"] =
      (inc["paymentSummary.failedTransactions"] || 0) - 1;
  }

  const update = {
    $set: {
      "paymentSummary.lastPaymentStatus": newStatus,
    },
  };

  if (newIsSuccess) {
    update.$set["paymentSummary.lastPaymentAt"] = paidAt || new Date();
  }

  if (Object.keys(inc).length > 0) {
    update.$inc = inc;
  }

  await User.updateOne({ _id: userId }, update);
};

export const createCheckout = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      amount,
      currency = "INR",
      purpose = "general",
      description,
      metadata = {},
      checkoutTtlMinutes = DEFAULT_CHECKOUT_TTL_MINUTES,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const parsedAmount = Number(amount);
    const amountInPaise = Math.round(parsedAmount * 100);
    const normalizedCurrency = String(currency).toUpperCase();
    const ttl = Number(checkoutTtlMinutes) > 0 ? Number(checkoutTtlMinutes) : DEFAULT_CHECKOUT_TTL_MINUTES;
    const checkoutExpiresAt = new Date(Date.now() + ttl * 60 * 1000);

    const razorpay = getRazorpayInstance();

    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: normalizedCurrency,
      receipt,
      notes: {
        userId: String(userId),
        purpose,
      },
    });

    const payment = await Payment.create({
      userId,
      amount: parsedAmount,
      amountInPaise,
      currency: normalizedCurrency,
      purpose,
      description,
      receipt,
      status: "created",
      razorpayOrderId: order.id,
      checkoutExpiresAt,
      metadata,
      gatewayPayload: {
        order,
      },
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

    res.status(201).json({
      success: true,
      message: "Checkout created successfully",
      data: {
        paymentId: payment._id,
        razorpayOrderId: order.id,
        amount: payment.amount,
        amountInPaise: payment.amountInPaise,
        currency: payment.currency,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        checkoutExpiresAt,
        timerSeconds: ttl * 60,
        status: payment.status,
      },
    });
  } catch (error) {
    console.error("Create checkout error:", error);

    res.status(500).json({
      success: false,
      message: "An error occurred while creating checkout",
      error: error.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId,
      metadata = {},
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message:
          "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    const payment = await Payment.findOne({
      userId,
      $or: [
        { razorpayOrderId: razorpay_order_id },
        paymentId ? { _id: paymentId } : null,
      ].filter(Boolean),
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (signature !== razorpay_signature) {
      const oldStatus = payment.status;
      payment.status = "failed";
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.errorDetails = {
        code: "SIGNATURE_MISMATCH",
        description: "Payment signature verification failed",
        reason: "signature_mismatch",
      };
      payment.gatewayPayload = {
        ...(payment.gatewayPayload || {}),
        verifyPayload: req.body,
      };
      payment.metadata = {
        ...(payment.metadata || {}),
        ...metadata,
      };

      await payment.save();

      await applySummaryStatusTransition({
        userId,
        oldStatus,
        newStatus: "failed",
        amount: payment.amount,
      });

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    if (payment.status !== "success") {
      const oldStatus = payment.status;

      payment.status = "success";
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.paidAt = new Date();
      payment.errorDetails = undefined;
      payment.gatewayPayload = {
        ...(payment.gatewayPayload || {}),
        verifyPayload: req.body,
      };
      payment.metadata = {
        ...(payment.metadata || {}),
        ...metadata,
      };

      await payment.save();

      await applySummaryStatusTransition({
        userId,
        oldStatus,
        newStatus: "success",
        amount: payment.amount,
        paidAt: payment.paidAt,
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        payment,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while verifying payment",
      error: error.message,
    });
  }
};

export const markPaymentFailure = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      paymentId,
      razorpay_order_id,
      razorpay_payment_id,
      status = "failed",
      error = {},
      metadata = {},
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    const normalizedStatus = ["failed", "cancelled", "expired"].includes(status)
      ? status
      : "failed";

    if (!paymentId && !razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "paymentId or razorpay_order_id is required",
      });
    }

    if (paymentId && !paymentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID format",
      });
    }

    const selectors = [];
    if (paymentId) selectors.push({ _id: paymentId });
    if (razorpay_order_id) selectors.push({ razorpayOrderId: razorpay_order_id });

    const payment = await Payment.findOne({
      userId,
      $or: selectors,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (payment.status === "success") {
      return res.status(400).json({
        success: false,
        message: "Successful payment cannot be marked as failed",
      });
    }

    const oldStatus = payment.status;

    payment.status = normalizedStatus;
    payment.razorpayPaymentId = razorpay_payment_id || payment.razorpayPaymentId;
    payment.errorDetails = {
      code: error.code || error.error_code,
      description: error.description || error.error_description,
      source: error.source || error.error_source,
      step: error.step || error.error_step,
      reason: error.reason || error.error_reason,
      metadata: error.metadata || null,
    };
    payment.metadata = {
      ...(payment.metadata || {}),
      ...metadata,
    };
    payment.gatewayPayload = {
      ...(payment.gatewayPayload || {}),
      failurePayload: req.body,
    };

    await payment.save();

    await applySummaryStatusTransition({
      userId,
      oldStatus,
      newStatus: normalizedStatus,
      amount: payment.amount,
    });

    res.status(200).json({
      success: true,
      message: "Payment failure captured successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Mark payment failure error:", error);

    res.status(500).json({
      success: false,
      message: "An error occurred while saving payment failure",
      error: error.message,
    });
  }
};

export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = { userId };
    if (status) {
      filter.status = status;
    }

    const [payments, total, user] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Payment.countDocuments(filter),
      User.findById(userId).select("paymentSummary"),
    ]);

    res.status(200).json({
      success: true,
      message: "Payment history fetched successfully",
      data: {
        payments,
        paymentSummary: user?.paymentSummary || {},
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
        },
      },
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching payment history",
      error: error.message,
    });
  }
};

export const getPaymentDetails = async (req, res) => {
  try {
    const userId = req.userId;
    const { paymentId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first.",
      });
    }

    if (!paymentId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID format",
      });
    }

    const payment = await Payment.findOne({
      _id: paymentId,
      userId,
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment details fetched successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Get payment details error:", error);

    res.status(500).json({
      success: false,
      message: "An error occurred while fetching payment details",
      error: error.message,
    });
  }
};