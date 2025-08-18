const axios = require('axios');

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
const sendMessage = async ({phone, parameters ,templateName }) => {
  try {
    const bodyParams = parameters.map((text) => ({ type: "text", text }));

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: bodyParams,
          },
        ],
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // console.dir(payload,{depth: null});
    
    payload.to = "8754200227"
    const response = await axios.post(url, payload, { headers });

    // console.log({response});
    console.log(`✅ Message sent successfully to ${phone}`);

    if (response.status !== 200) {
      return 400
    }
    return 200
    

  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error(`❌ Failed to send message to ${phone}:`, errorMsg);
  }
};

module.exports = {
  sendMessage,
};
