const constant = require('../constants/constant');
const helper = require('../helper/helper');
const axios = require('axios');
const s3Services = require("./s3Service");
const fs = require('fs');
const { OpenAI } = require('openai');

// Initialize OpenAI Client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY, // Replace with your actual OpenAI API key
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
  async function extractTextAndEquations(imageUrl) {
    try {
      const base64Image = await convertImageToBase64(imageUrl);
      
      if (base64Image) {
        // Send request to OpenAI with the base64 image
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',  // Replace with the actual model you're using
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'whats in the image' },
                { type: 'image_url', image_url: { url: base64Image } },
              ],
            },
          ],
        });
  
        console.log('Analysis result:', response.choices[0].message);
        return response.choices[0].message
      }
    } catch (error) {
      console.error('Error processing image:', error);
      return error
    }
  }

exports.readOpenAiPage = async (request) => {

    const { Key } = request.data;

    const imageUrl = await s3Services.getS3SignedUrl(Key);
    console.log("imageUrl", imageUrl);
    const response = await extractTextAndEquations(imageUrl);

        console.log('Analysis result:', response);
        return response;
    
    

    // const response = await axios({
    //     method: "post",
    //     url: constant.externalURLs.mathpixURL,
    //     headers: {
    //         app_id: process.env.MP_APP_ID,
    //         app_key: process.env.MP_APP_KEY,
    //         "Content-type": "application/json",
    //     },
    //     data: {
    //         src: imageUrl,
    //         formats: ["text"],
    //     },
    // });

    // console.log("RESPONSE : ", response);

};

