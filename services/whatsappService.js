// const axios = require('axios');
    
     
//     async function sendTemplateMessage(phoneNumber, templateName, components) {
//       const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
//       const fromPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
   
//       if (!accessToken || !fromPhoneNumberId) {
//         throw new Error('WhatsApp environment variables are not configured.');
//     }
   
//      try {
//         const response = await axios.post(
//           `https://graph.facebook.com/v19.0/${fromPhoneNumberId}/messages`,
//           {
//             messaging_product: 'whatsapp',
//             to: phoneNumber,
//             type: 'template',
//             template: {
//              name: templateName,
//              language: {
//                code: 'en_US',
//              },
//              components: components,
//            },
//          },
//        {
//             headers: {
//               Authorization: `Bearer ${accessToken}`,
//              'Content-Type': 'application/json',
//            },
//          }
//        );
//        console.log('WhatsApp message sent successfully:', response.data);
//      return response.data;
//      } catch (error) {
//        const errorMessage = error.response?.data || error.message;
//        console.error('Error sending WhatsApp message:', JSON.stringify(errorMessage, null, 2));
//        throw new Error('Failed to send WhatsApp message');
//      }
//    }
   
//    module.exports = {
//      sendTemplateMessage,
//    };