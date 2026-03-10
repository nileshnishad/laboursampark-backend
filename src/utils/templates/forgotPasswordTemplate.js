export const forgotPasswordTemplate = (userName, resetLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
          color: #333333;
          line-height: 1.6;
        }
        .greeting {
          font-size: 16px;
          margin-bottom: 20px;
        }
        .message {
          font-size: 14px;
          color: #666666;
          margin-bottom: 30px;
        }
        .reset-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-decoration: none;
          padding: 12px 40px;
          border-radius: 5px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .reset-button:hover {
          opacity: 0.9;
        }
        .link-text {
          font-size: 12px;
          color: #999999;
          margin-top: 20px;
          word-break: break-all;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          font-size: 13px;
          color: #856404;
        }
        .footer {
          background-color: #f9f9f9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #999999;
          border-top: 1px solid #eeeeee;
        }
        .footer a {
          color: #667eea;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Labour Sampark</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">Password Reset Request</p>
        </div>

        <div class="content">
          <div class="greeting">
            <strong>Hello ${userName},</strong>
          </div>

          <div class="message">
            We received a request to reset the password associated with your Labour Sampark account. If you made this request, you can reset your password using the link below.
          </div>

          <a href="${resetLink}" class="reset-button">Reset Your Password</a>

          <div class="link-text">
            Or copy and paste this link in your browser:<br>
            <strong>${resetLink}</strong>
          </div>

          <div class="warning">
            <strong>⏰ This link will expire in 1 hour.</strong> If you don't reset your password within 1 hour, you'll need to submit a new password reset request.
          </div>

          <div class="message" style="margin-top: 30px;">
            <strong>Didn't request a password reset?</strong><br>
            If you didn't request a password reset, please ignore this email or contact our support team immediately at <a href="mailto:support@laboursampark.com">support@laboursampark.com</a>.
          </div>

          <div class="message" style="color: #999999; font-size: 13px; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 20px;">
            <strong>Security Tips:</strong>
            <ul>
              <li>Never share your password with anyone</li>
              <li>Always use a strong, unique password</li>
              <li>Be cautious of phishing emails</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0 0 10px 0;">
            © 2026 Labour Sampark. All rights reserved.
          </p>
          <p style="margin: 0;">
            <a href="${process.env.FRONTEND_URL}">Visit our website</a> | 
            <a href="mailto:support@laboursampark.com">Contact Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};
