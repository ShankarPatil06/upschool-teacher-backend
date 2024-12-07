const constant = require('../constants/constant');
const helper = require('../helper/helper');
const axios = require('axios');
const s3Services = require("./s3Service");
const fs = require('fs');
const { OpenAI } = require('openai');
const { schoolRepository } = require('../repository');

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY, 
});

exports.readScannedPage = async function (request, callback) {
    try {
        const { Key } = request.data;
        // Get the URL of the image in S3
        const imageUrl = await s3Services.getS3SignedUrl(Key);

        console.log("imageUrl", imageUrl);

        // MathPix Api section 
        await axios({
            method: "post",
            url: constant.externalURLs.mathpixURL,
            headers: {
                app_id: process.env.MP_APP_ID,
                app_key: process.env.MP_APP_KEY,
                "Content-type": "application/json",
            },
            data: {
                src: imageUrl,
                formats: ["text"]
            },
        }).then(async function (response) {
            console.log("RESPONSE : ", response);
            callback(0, response);
        });

    } catch (error) {
        console.log('Main Try Catch', error);
        callback(error, 0);
    }
}

exports.readScannedPage2 = async (request) => {

    const { Key } = request.data;

    const imageUrl = await s3Services.getS3SignedUrl(Key);
    console.log("imageUrl", imageUrl);

    const response = await axios({
        method: "post",
        url: constant.externalURLs.mathpixURL,
        headers: {
            app_id: process.env.MP_APP_ID,
            app_key: process.env.MP_APP_KEY,
            "Content-type": "application/json",
        },
        data: {
            src: imageUrl,
            formats: ["text"],
        },
    });

    console.log("RESPONSE : ", response);
    return response;
};

// Function to convert image URL to base64
async function convertImageToBase64(imageUrl) {
    try {
      // Fetch the image from the URL
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      
      // Convert the image data to base64
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      
      // Determine the MIME type (e.g., image/jpeg, image/png)
      const mimeType = response.headers['content-type'];
      
      // Return the base64 string in a data URL format
      return `data:${mimeType};base64,${base64Image}`;
    } catch (error) {
      console.error('Error fetching or converting the image:', error);
      return null;
    }
  }
  
  // Function to send the base64 image to OpenAI
  // async function extractTextAndEquations(imageUrl) {
  //   try {
  //     const base64Image = await convertImageToBase64(imageUrl);
  //     // console.log({base64Image})
  //     const predictiveText = true;
  //     if (base64Image) {
  //       // Send request to OpenAI with the base64 image
  //       const response = await openai.chat.completions.create({
  //         model: 'gpt-4o',  // Replace with the actual model you're using
  //         messages: [
  //           {
  //             role: 'user',
  //             content: [
  //               { type: 'text', text: 'extract text and images and equations from image also read page number' },
  //               { type: 'image_url', image_url: { url: base64Image } },
  //             ],
  //           },
  //         ],
  //       });
  
  //       console.log('Analysis result:', response.choices[0].message);
  //       return response.choices[0].message
  //     }else {
  //         console.error('Failed to convert image to base64');
  //         return null;
  //       }
  //   } catch (error) {
  //     console.error('Error processing image:', error);
  //   }
  // }

  const extractTextAndEquations = async (imageUrl ,predictiveText ) => {
    try {

      const base64Image = await convertImageToBase64(imageUrl);
  
      if (base64Image) {
        let response ;
        if( predictiveText && predictiveText === 'Yes')
        {
          response = await openai.chat.completions.create({
            model: 'gpt-4o',  
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Extract text, images, and equations from the image exactly as it appears, without adding any additional formatting, symbols, or special characters like *. Also, read the page number (like Page no: 1/2) and roll no precisely. If there are spelling or grammar mistakes, correct them and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>).' },
                  { type: 'image_url', image_url: { url: base64Image } },
                ],
              },
            ],
          });
        }
        else
        {
          response = await openai.chat.completions.create({
            model: 'gpt-4o',  
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Extract text, images, and equations from the image. Also, read the page number (like 1/2) and roll no precisely.' },
                  { type: 'image_url', image_url: { url: base64Image } },
                ],
              },
            ],
          });
        }
  
        let extractedText = response?.choices[0].message;
  
          return extractedText;
      } else {
        console.error('Failed to convert image to base64');
        return null;
      }
    } catch (error) {
      console.error('Error processing image:', error);
      return null;
    }
  }

  // async function extractTextAndEquations(imageUrl ,predictiveText ) {
  //   try {
  //     const promptText = predictiveText && predictiveText === 'Yes'
  //             ? 'Extract text, images, and equations from the image. Also, read the page number. If there are spelling or grammar mistakes, correct them and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>).'
  //             : 'Extract text, images, and equations from the image. Also, read the page number.';
      
  //     const base64Image = await convertImageToBase64(imageUrl);
  
  //     if (base64Image) {
  //       const response = await openai.chat.completions.create({
  //         model: 'gpt-4o',  
  //         messages: [
  //           {
  //             role: 'user',
  //             content: [
  //               { type: 'text', text: promptText },
  //               { type: 'image_url', image_url: { url: base64Image } },
  //             ],
  //           },
  //         ],
  //       });
  
  //       let extractedText = response.choices[0].message;
  
  //         return extractedText;
  //     } else {
  //       console.error('Failed to convert image to base64');
  //       return null;
  //     }
  //   } catch (error) {
  //     console.error('Error processing image:', error);
  //     return null;
  //   }
  // }
  

  // async function extractTextAndEquations(imageUrl) {
  //   try {
  //     const base64Image = await convertImageToBase64(imageUrl);
  //     const predictiveText = true;
  
  //     if (base64Image) {
  //       const promptText = predictiveText
  //         ? 'Extract text, images, and equations from the image. Also, read the page number. If there are spelling or grammar mistakes, correct them and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>).'
  //         : 'Extract text, images, and equations from the image. Also, read the page number.';
  
  //       const response = await openai.chat.completions.create({
  //         model: 'gpt-4o', 
  //         messages: [
  //           {
  //             role: 'user',
  //             content: [
  //               { type: 'text', text: promptText },
  //               { type: 'image_url', image_url: { url: base64Image } },
  //             ],
  //           },
  //         ],
  //       });
  
  //       const extractedText = response.choices[0].message.content;
  
  //       return extractedText;
  //     } else {
  //       console.error('Failed to convert image to base64');
  //       return null;
  //     }
  //   } catch (error) {
  //     console.error('Error processing image:', error);
  //     return null;
  //   }
  // }
  

// async function extractTextAndEquations(imageUrl) {
//     const response = await openai.chat.completions.create({
//         model: "gpt-4o", // Replace with a proper multimodal model like GPT-4 or other available models
//         messages: [
//           {
//             role: "user",
//             content: "Extract text and equations from image",
//           },
//           {
//             role: "user",  // Including image URL as a message with the role set to "user"
//             content: imageUrl, // Send the image URL directly
//           }
//         ],
//         // Since gpt-4 handles multimodal inputs, you'd likely need to use 'image_url' in a compatible way:
//         // images: [{ url: imageUrl }],
//       });
    
//       console.log(response.choices[0].message);
//       return response.choices[0].message;
   
//   }
  exports.readOpenAiPage = async (request) => {
    try {
      const { Key } = request.data;
      const imageUrl = await s3Services.getS3SignedUrl("quiz_uploads/c2ddd828-ab47-5a7a-9128-9243f107f187/student_answered_sheets/5e7af638-6523-5cf6-844b-f68b03b1041b.png");
      // const imageUrl = "https://testing-upschool.s3.ap-south-1.amazonaws.com/quiz_uploads/21285864-6e00-5562-a19f-b5166d6393a0/student_answered_sheets/66d3e452-5341-5e38-9199-faf443fa5f29.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQREMEI3P6BDPNCX2%2F20241206%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20241206T141537Z&X-Amz-Expires=600&X-Amz-Signature=c605b8ee1d23f91ac44bfca9c197b050fd56ec20eea42472ab087c5bc1b31ce9&X-Amz-SignedHeaders=host";
      
        console.log("IMAGE URL",imageUrl)
  
      // For testing, you can pass a hardcoded URL to extract text and equations
    //   const imageUrl = request.data.url; // Replace with your image URL
  
    const schoolInfo = await schoolRepository.getSchoolDetailsById2(request)
      const response = await extractTextAndEquations(imageUrl,schoolInfo?.Items[0].school_subscribtion_feature.predictive_evaluation);
      
      console.log('Analysis result:', response);
      return response;
  
    } catch (error) {
      console.error('Error in readOpenAiPage:', error);
      return { error: 'Error in processing the image' };
    }
  };
  

