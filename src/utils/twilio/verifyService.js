// verifyService.js
// Utility to call Twilio Verify API for sending verification codes

import axios from 'axios';
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } from './twilioConfig.js';

export async function sendVerificationCode(to) {
  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
  const params = new URLSearchParams();
  params.append('To', to);
  params.append('Channel', 'sms');

  const auth = {
    username: TWILIO_ACCOUNT_SID,
    password: TWILIO_AUTH_TOKEN,
  };

  try {
    const response = await axios.post(url, params, { auth });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

export async function checkVerificationCode(to, code) {
  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
  const params = new URLSearchParams();
  params.append('To', to);
  params.append('Code', code);

  const auth = {
    username: TWILIO_ACCOUNT_SID,
    password: TWILIO_AUTH_TOKEN,
  };

  try {
    const response = await axios.post(url, params, { auth });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

export async function sendTwilioSms({ to, body, messagingServiceSid }) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams();
  params.append('To', to);
  params.append('Body', body);
  params.append('MessagingServiceSid', messagingServiceSid);

  const auth = {
    username: TWILIO_ACCOUNT_SID,
    password: TWILIO_AUTH_TOKEN,
  };

  try {
    const response = await axios.post(url, params, { auth });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}
