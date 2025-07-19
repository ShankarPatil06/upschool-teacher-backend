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

const extractTextAndEquations = async (imageUrl, predictiveText) => {
  try {
    const base64Image = await convertImageToBase64(imageUrl);
    if (base64Image) {
      let response;
      if (predictiveText && predictiveText === 'Yes') {
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [
                // { type: 'text', text: 'Extract text, images, and equations from the image exactly as it appears, without adding any additional formatting, symbols, or special characters like *. Also, read the page number (like Page no: 1/2) and roll no precisely. If there are spelling or grammar mistakes, correct them and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>).' },

                // { type: 'text', text: 'Extract text, images, and equations from the image. Also, read the page number as Page No. If there are spelling or grammar mistakes, correct them and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>).' },//uncomment this
                { type: 'text', text: '1.First,extract the "Set:", "Quiz ID:", "Quiz Name:", "Class:", "Section:", "Subject Name:", "Test ID:", "Roll No:", "Page No:" in the exact order and format while giving the output.2.Second extract text, images, and equations(Provide Equations in Latex) from the image.3. Correct spelling and grammar mistakes and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>).4. For unclear handwriting, provide multiple possible interpretations of ambiguous words or phrases, displaying them in parentheses (e.g., word1/word2).5. Omit content that is scratched, scribbled over, or manually crossed out. Do not include parts of the text that are visibly altered by strikethroughs or manual cuts, as these indicate the student intent to remove them.6. If an answer is written by the student below or beside the scratched-out or manually cut part, include it in the output as part of the student response, provided it is clearly legible and not crossed out.7. Apply predictive corrections only to the final content clearly intended by the student while excluding manually crossed-out portions. Correct the intended response to improve readability while maintaining accuracy.8. Ensure the output provides the complete answer of the student response while balancing predictive assistance with accuracy and respecting the student original intent.9.Do not give any extra characters or symbols in the answersheet , just give the extracted content as it is.' },
                { type: 'image_url', image_url: { url: base64Image } },
              ],
            },
          ],
        });
      }
      else {
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [
                // { type: 'text', text: 'Extract text, images, and equations from the image. Also, read the page number (like 1/2) and roll no precisely.' },

                // { type: 'text', text: 'Extract text, images, and equations from the image. Also, read the page number as Page No' },//uncomment this

                { type: 'text', text: '1.First,extract the "Set:", "Quiz ID:", "Quiz Name:", "Class:", "Section:", "Subject Name:", "Test ID:", "Roll No:", "Page No:" in the exact order and format while giving the output.2.Second extract text, images, and equations(Provide Equations in Latex) from the image.3. Provide multiple possible interpretations for ambiguous words or phrases, displaying them in parentheses (e.g., word1/word2), to assist evaluators in selecting the appropriate option.4. Omit any content that is scratched, scribbled over, or manually crossed out. Do not include any part of the text that is visibly altered by a strikethrough or cross mark, as this indicates the student intent to remove it. Only include the final content that is clearly legible and intended for submission.5. If an answer is written by the student below or beside the scratched or cut-out part, include it in the output as part of the student response, as long as it is not crossed out.6. Do not apply predictive corrections. Ensure that the text is extracted exactly as written by the student, preserving the original spelling, punctuation, and handwriting as much as possible. Only focus on precise extraction to maintain accuracy.7. Avoid interpreting or modifying the content beyond what is clearly written by the student. If there is ambiguity, include it verbatim, and where necessary, provide an alternative reading in parentheses to preserve accuracy.9.Do not give any extra characters or symbols in the answersheet , just give the extracted content as it is.' },
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

const extractTextAndEquationsNew = async (imageUrl, predictiveText, subject) => {
  try {
    const base64Image = await convertImageToBase64(imageUrl);
    const prompt = constant.OCRPrompts[subject] || constant.OCRPrompts.Default;
    if (base64Image) {
      let response;
      if (predictiveText && predictiveText === 'Yes') {
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [
                // { type: 'text', text: 'Extract text, images, and equations from the image exactly as it appears, without adding any additional formatting, symbols, or special characters like *. Also, read the page number (like Page no: 1/2) and roll no precisely. If there are spelling or grammar mistakes, correct them and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>).' },

                // { type: 'text', text: 'Extract text, images, and equations from the image. Also, read the page number as Page No. If there are spelling or grammar mistakes, correct them and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>).' },//uncomment this
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: base64Image } },
              ],
            },
          ],
        });
      }
      else {
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0,
          messages: [
            {
              role: 'user',
              content: [
                // { type: 'text', text: 'Extract text, images, and equations from the image. Also, read the page number (like 1/2) and roll no precisely.' },

                // { type: 'text', text: 'Extract text, images, and equations from the image. Also, read the page number as Page No' },//uncomment this

                { type: 'text', text: prompt },
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
    const imageUrl = await s3Services.getS3SignedUrl(Key);
    // const imageUrl = await s3Services.getS3SignedUrl("quiz_uploads/c2ddd828-ab47-5a7a-9128-9243f107f187/student_answered_sheets/5e7af638-6523-5cf6-844b-f68b03b1041b.png");
    // const imageUrl = "https://testing-upschool.s3.ap-south-1.amazonaws.com/quiz_uploads/144568c4-5cb6-5852-96a9-df46756f233f/student_answered_sheets/e9e38967-6113-4ebd-9f39-ec22010c9e50.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQREMEI3P6BDPNCX2%2F20241213%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20241213T042820Z&X-Amz-Expires=600&X-Amz-Signature=8040c9f039e230c5324ef262bac0c0ab0a75d920777201fcd29c0d8b3b12126f&X-Amz-SignedHeaders=host";

    console.log("IMAGE URL", imageUrl)

    // For testing, you can pass a hardcoded URL to extract text and equations
    //   const imageUrl = request.data.url; // Replace with your image URL

    // const schoolInfo = await schoolRepository.getSchoolDetailsById2(request)
    // // console.log("type",schoolInfo?.Items[0].school_subscribtion_feature.predictive_evaluation)
    //   const response = await extractTextAndEquations(imageUrl,schoolInfo?.Items[0].school_subscribtion_feature.predictive_evaluation);
    const schoolInfoPromise = schoolRepository.getSchoolDetailsById2(request);
    const responsePromise = schoolInfoPromise.then(schoolInfo =>
      extractTextAndEquationsNew(imageUrl, schoolInfo?.Items[0]?.school_subscribtion_feature?.predictive_evaluation ? schoolInfo?.Items[0]?.school_subscribtion_feature?.predictive_evaluation : 'NO', request.data?.subject_title)
    );

    // Wait for both promises to resolve
    const schoolInfo = await schoolInfoPromise;
    const response = await responsePromise;


    console.log('Analysis result:', response);
    return response;

  } catch (error) {
    console.error('Error in readOpenAiPage:', error);
    return { error: 'Error in processing the image' };
  }
};


