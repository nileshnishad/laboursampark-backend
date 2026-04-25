import axios from "axios";

export const sendOtp = async (mobile) => {
  try {
    const response = await axios.post(
      "https://api.msg91.com/api/v5/otp",
      {
        mobile: `91${mobile}`, // India country code
        template_id: process.env.MSG91_TEMPLATE_ID
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("response.data",response);
    
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const sendSms = async (mobile, message) => {
  try {
    const response = await axios.post(
      "https://api.msg91.com/api/v2/sendsms",
      {
        sender: process.env.MSG91_SENDER_ID,
        route: "4",
        country: "91",
        sms: [
          {
            message,
            to: [mobile]
          }
        ]
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("response.data",response);

    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};