const constant = require('../constants/constant');
const helper = require('../helper/helper');
const axios = require('axios');

exports.readScannedPage = async function (request, callback) {
    try {
        const { Key } = request.data;
        // Get the URL of the image in S3
        const imageUrl = await helper.getS3SignedUrl(Key);

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
                formats: ["text"],
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

        const imageUrl = await helper.getS3SignedUrl(Key);
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
