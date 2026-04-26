# Twilio Integration

This folder contains all logic and configuration for Twilio integration.

## Files
- `TwilioService.js`: Utility functions to initialize Twilio and send SMS.
- `twilioConfig.js`: Loads Twilio credentials from environment variables.

## Usage
1. Set the following environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
2. Import and initialize Twilio in your application:

```js
import { initTwilio, sendSMS } from './utils/twilio/TwilioService.js';
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } from './utils/twilio/twilioConfig.js';

initTwilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// To send an SMS:
sendSMS({
  to: '+919999999999',
  from: TWILIO_PHONE_NUMBER,
  body: 'Hello from Twilio!'
});
```
