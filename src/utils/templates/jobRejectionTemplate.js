export const jobRejectionTemplate = (userName, jobTitle, companyName, rejectionReason) => {
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
        .alert {
          background-color: #f8d7da;
          border-left: 4px solid #f5494a;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #721c24;
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
          background-color: #e8f4f8;
          border-left: 4px solid #17a2b8;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #0c5460;
        }
        .next-steps h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
        }
        .next-steps ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .next-steps li {
          margin: 5px 0;
          font-size: 13px;
        }
        .reason-section {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #856404;
          font-size: 13px;
        }
        .reason-section .label {
          font-weight: 600;
          display: block;
          margin-bottom: 8px;
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
          <p style="margin: 10px 0 0 0; font-size: 14px;">Application Status Update</p>
        </div>

        <div class="content">
          <div style="font-size: 16px; margin-bottom: 20px;">
            <strong>Hello ${userName},</strong>
          </div>

          <div class="alert">
            <strong>📋 Your application has been reviewed</strong>
          </div>

          <p style="color: #666666; margin: 20px 0;">
            Unfortunately, your application for the following job has not been selected at this time:
          </p>

          <div class="job-details">
            <div>
              <div class="label">Job Title</div>
              <div class="value">${jobTitle}</div>
            </div>
            <div>
              <div class="label">Posted By</div>
              <div class="value">${companyName}</div>
            </div>
          </div>

          ${
            rejectionReason
              ? `
          <div class="reason-section">
            <div class="label">Feedback from Contractor:</div>
            <div style="font-size: 14px;">${rejectionReason}</div>
          </div>
          `
              : ""
          }

          <div class="next-steps">
            <h3>💡 What's Next?</h3>
            <ul>
              <li><strong>Keep trying:</strong> Apply to other similar jobs on Labour Sampark</li>
              <li><strong>Improve your profile:</strong> Add more skills and experience to increase chances</li>
              <li><strong>Update your portfolio:</strong> Share your previous work samples and reviews</li>
              <li><strong>Stay active:</strong> Regularly apply for jobs matching your skills</li>
            </ul>
          </div>

          <p style="color: #666666; margin-top: 30px; font-size: 14px;">
            Don't get discouraged! Many successful contractors faced rejections before landing their first job. 
            Keep improving and applying to gain experience.
          </p>

          <p style="color: #666666; margin-top: 20px; font-size: 13px;">
            If you believe this is a mistake or have any questions, please contact our support team.
          </p>
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
