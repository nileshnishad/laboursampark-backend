import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports like 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.Email_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates (Gmail compatible)
  },
});

// Verify transporter connection (non-blocking)
emailTransporter.verify((error, success) => {
  if (error) {
    console.warn(
      "⚠️  Email transporter warning:",
      error.message || error.code
    );
    console.log(
      "📧 Email configuration:",
      `${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`
    );
  } else {
    console.log("✅ Email transporter is ready to send messages");
  }
});

/**
 * Send Email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} options.text - Plain text email body (optional)
 * @returns {Promise} - Returns email send result
 */
export const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `Labour Sampark <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || "",
    };

    const result = await emailTransporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully to:", options.to);
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("❌ Error sending email:", {
      to: options.to,
      subject: options.subject,
      error: error.message,
      code: error.code,
    });
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

export default sendEmail;
