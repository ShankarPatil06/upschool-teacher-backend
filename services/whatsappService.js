const axios = require("axios");

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

const sendMessage = async ({
  phone,
  parameters,
  templateName,
  nameParameter,
}) => {
  try {
    let bodyParams;
    if (nameParameter) {
      bodyParams = parameters.map((text) => ({ type: "text", ...text }));
    } else {
      bodyParams = parameters.map((text) => ({ type: "text", text }));
    }

    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    let payload = {
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
    if (templateName === "otp_for_scan") {
      payload.template.components = [];
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en_US",
          },
          components: [
            {
              type: "body",
              parameters: bodyParams,
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: bodyParams,
            },
          ],
        },
      };
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // console.dir(payload,{depth: null});

    // payload.to = "9606833491";
    // console.dir({payload},{depth: null});

    const response = await axios.post(url, payload, { headers });

    // console.log({response});
    console.log(`✅ Message sent successfully to ${phone}`);

    if (response.status !== 200) {
      return 400;
    }
    return 200;
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error(`❌ Failed to send message to ${phone}:`, errorMsg);
  }
};

module.exports = {
  sendMessage,
};
