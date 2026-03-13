export const jobAcceptanceTemplate = (userName, jobTitle, companyName, contactInfo) => {
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
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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
        .celebration {
          text-align: center;
          font-size: 40px;
          margin: 20px 0;
        }
        .success-alert {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #155724;
          font-weight: 600;
        }
        .job-details {
          background-color: #f9f9f9;
          border: 1px solid #eeeeee;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .job-details .label {
          font-weight: 600;
          color: #666666;
          font-size: 12px;
          text-transform: uppercase;
        }
        .job-details .value {
          font-size: 16px;
          color: #333333;
          margin: 5px 0 15px 0;
        }
        .next-steps {
          background-color: #e7f3ff;
          border-left: 4px solid #2196F3;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #01579b;
        }
        .next-steps h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .next-steps ol {
          margin: 10px 0;
          padding-left: 20px;
        }
        .next-steps li {
          margin: 8px 0;
          font-size: 13px;
        }
        .contact-section {
          background-color: #fff9e6;
          border-left: 4px solid #ff9800;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #e65100;
          font-size: 13px;
        }
        .contact-section .label {
          font-weight: 600;
          display: block;
          margin-bottom: 8px;
        }
        .contact-detail {
          margin: 5px 0;
        }
        .contact-detail .detail-label {
          font-weight: 500;
          display: inline-block;
          min-width: 80px;
        }
        .action-button {
          display: inline-block;
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: white;
          text-decoration: none;
          padding: 12px 40px;
          border-radius: 5px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .action-button:hover {
          opacity: 0.9;
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
          color: #11998e;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Labour Sampark</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px;">Congratulations! Application Accepted</p>
        </div>

        <div class="content">
          <div class="celebration">🎉🎊</div>

          <div style="font-size: 16px; margin-bottom: 20px;">
            <strong>Hello ${userName},</strong>
          </div>

          <div class="success-alert">
            ✅ Great news! Your application has been accepted!
          </div>

          <p style="color: #666666; margin: 20px 0;">
            Congratulations! The contractor has reviewed your profile and accepted your application for:
          </p>

          <div class="job-details">
            <div>
              <div class="label">Job Title</div>
              <div class="value">${jobTitle}</div>
            </div>
            <div>
              <div class="label">Contractor</div>
              <div class="value">${companyName}</div>
            </div>
          </div>

          <div class="next-steps">
            <h3>📋 Next Steps:</h3>
            <ol>
              <li><strong>Wait for contractor contact:</strong> They will reach out to you with job details and timeline</li>
              <li><strong>Discuss requirements:</strong> Clarify the job scope, timeline, and expectations</li>
              <li><strong>Confirm start date:</strong> Agree on when you'll start the work</li>
              <li><strong>Begin work:</strong> Execute the job professionally and maintain communication</li>
              <li><strong>Get reviewed:</strong> After completion, the contractor will rate and review your work</li>
            </ol>
          </div>

          ${
            contactInfo && (contactInfo.email || contactInfo.mobile)
              ? `
          <div class="contact-section">
            <div class="label">📞 Contractor Contact Information:</div>
            ${contactInfo.email ? `<div class="contact-detail"><span class="detail-label">Email:</span> ${contactInfo.email}</div>` : ""}
            ${contactInfo.mobile ? `<div class="contact-detail"><span class="detail-label">Phone:</span> ${contactInfo.mobile}</span>` : ""}
            <div style="margin-top: 10px; font-size: 12px;">
              <em>Note: The contractor may contact you within 24-48 hours</em>
            </div>
          </div>
          `
              : ""
          }

          <p style="color: #666666; margin-top: 30px; font-size: 14px; border-top: 1px solid #eeeeee; padding-top: 20px;">
            <strong>Important Reminders:</strong>
          </p>
          <ul style="color: #666666; font-size: 13px; line-height: 1.8;">
            <li>Keep your profile updated and maintain professionalism</li>
            <li>Respond promptly to contractor messages</li>
            <li>Deliver quality work as discussed</li>
            <li>Report any issues immediately to Labour Sampark support</li>
          </ul>
        </div>

        <div class="footer">
          <p>© 2026 Labour Sampark. All rights reserved.</p>
          <p>
            <a href="https://laboursampark.com">Visit Website</a> | 
            <a href="https://laboursampark.com/contact">Contact Support</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};
