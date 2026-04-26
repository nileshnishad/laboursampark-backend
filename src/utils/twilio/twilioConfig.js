// twilioConfig.js
// Twilio configuration and environment variable loader


// Twilio Account SID and Auth Token
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// Twilio phone number (for SMS, if needed)
export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
// Twilio Verify Service SID (for verification API)
export const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
// Twilio Messaging Service SID (for SMS sending)
export const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID || !TWILIO_MESSAGING_SERVICE_SID) {
  throw new Error('Twilio environment variables are not set (SID, Auth Token, or Verify Service SID)');
}
