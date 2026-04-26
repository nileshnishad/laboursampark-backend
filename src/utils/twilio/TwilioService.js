// TwilioService.js
// Utility functions for Twilio integration

import twilio from 'twilio';

let client;

export function initTwilio(accountSid, authToken) {
  client = twilio(accountSid, authToken);
}

export function sendSMS({ to, from, body }) {
  if (!client) throw new Error('Twilio client not initialized');
  return client.messages.create({ to, from, body });
}

export function getTwilioClient() {
  if (!client) throw new Error('Twilio client not initialized');
  return client;
}
