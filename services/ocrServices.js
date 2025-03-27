const { externalURLs } = require('../constants/constant');
const axios = require('axios');
const s3Services = require("./s3Service");
const { OpenAI } = require('openai');
const { schoolRepository } = require('../repository');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

exports.readScannedPage = async function (request, callback) {
  try {
    const { Key } = request.data;
    const imageUrl = await s3Services.getS3SignedUrl(Key);

    await axios({
      method: "post",
      url: externalURLs.mathpixURL,
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
      callback(0, response);
    });

  } catch (error) {
    callback(error, 0);
  }
}

exports.readScannedPage2 = async (request) => {

  const { Key } = request.data;

  const imageUrl = await s3Services.getS3SignedUrl(Key);

  const response = await axios({
    method: "post",
    url: externalURLs.mathpixURL,
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

  return response;
};

const convertImageToBase64 = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    const base64Image = Buffer.from(response.data, 'binary').toString('base64');

    const mimeType = response.headers['content-type'];

    return `data:${mimeType};base64,${base64Image}`;
  } catch (error) {
    return null;
  }
}

const extractTextAndEquationsNew = async (imageUrl, predictiveText) => {
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
                { type: 'text', text: '1.First, extract the "Page No:" , which will be a numeral. Do it very carefully and precisely from the answersheet. Pay utmost attention and try your best to extract this "Page No:"  first.2.Second extract text, images, and equations(Provide Equations in Latex) from the image.3. Correct spelling and grammar mistakes and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>).4. For unclear handwriting, provide multiple possible interpretations of ambiguous words or phrases, displaying them in parentheses (e.g., word1/word2).5. Omit content that is scratched, scribbled over, or manually crossed out. Do not include parts of the text that are visibly altered by strikethroughs or manual cuts, as these indicate the student intent to remove them.6. If an answer is written by the student below or beside the scratched-out or manually cut part, include it in the output as part of the student response, provided it is clearly legible and not crossed out.7. Apply predictive corrections only to the final content clearly intended by the student while excluding manually crossed-out portions. Correct the intended response to improve readability while maintaining accuracy.8. Ensure the output provides the complete answer of the student response while balancing predictive assistance with accuracy and respecting the student original intent.9.Do not give any extra characters or symbols in the answersheet , just give the extracted content as it is.' },
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
                { type: 'text', text: '1.First, extract the "Page No:" , which will be a numeral. Do it very carefully and precisely from the answersheet. Pay utmost attention and try your best to extract this "Page No:"  first.2.Second extract text, images, and equations(Provide Equations in Latex) from the image.3. Provide multiple possible interpretations for ambiguous words or phrases, displaying them in parentheses (e.g., word1/word2), to assist evaluators in selecting the appropriate option.4. Omit any content that is scratched, scribbled over, or manually crossed out. Do not include any part of the text that is visibly altered by a strikethrough or cross mark, as this indicates the student intent to remove it. Only include the final content that is clearly legible and intended for submission.5. If an answer is written by the student below or beside the scratched or cut-out part, include it in the output as part of the student response, as long as it is not crossed out.6. Do not apply predictive corrections. Ensure that the text is extracted exactly as written by the student, preserving the original spelling, punctuation, and handwriting as much as possible. Only focus on precise extraction to maintain accuracy.7. Avoid interpreting or modifying the content beyond what is clearly written by the student. If there is ambiguity, include it verbatim, and where necessary, provide an alternative reading in parentheses to preserve accuracy.9.Do not give any extra characters or symbols in the answersheet , just give the extracted content as it is.' },
                { type: 'image_url', image_url: { url: base64Image } },
              ],
            },
          ],
        });
      }

      let extractedText = response?.choices[0].message;

      return extractedText;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

exports.readOpenAiPage = async (request) => {
  try {
    const { Key } = request.data;
    const imageUrl = await s3Services.getS3SignedUrl(Key);
    const schoolInfoPromise = schoolRepository.getSchoolDetailsById2(request);
    const responsePromise = schoolInfoPromise.then(schoolInfo =>
      extractTextAndEquationsNew(imageUrl, schoolInfo?.Items[0]?.school_subscribtion_feature?.predictive_evaluation ? schoolInfo?.Items[0]?.school_subscribtion_feature?.predictive_evaluation : 'NO')
    );

    const schoolInfo = await schoolInfoPromise;
    const response = await responsePromise;

    return response;

  } catch (error) {
    return { error: 'Error in processing the image' };
  }
};


