const { formatResponse, formatErrorResponse } = require("../helper/helper");
const { scannerServices } = require("../services");

// exports.sendScannerLink = (req, res, next) => {
//     console.log("sendScannerLink Controller!", req.body);
//     let request = req.body;

//     scannerServices.sendScannerLink(request, function (send_scanner_link_err, send_scanner_link_response) {
//         if (send_scanner_link_err) {
//             res.status(send_scanner_link_err).json(send_scanner_link_response);
//         } else {
//             console.log("Initiated Send Scanner Link Successfully");
//             res.json(send_scanner_link_response);
//         }
//     });
// };

exports.sendScannerLink = async (req, res, next) => {
  console.log("sendScannerLink Controller!", req.body);
  let request = req.body;
  try {
    const sendScannerLinkRes = await scannerServices.sendScannerLink(request);
    formatResponse(res, sendScannerLinkRes);
  } catch (error) {
    next(error);
  }
};

exports.sendOTPForScanning = async (req, res, next) => {
  console.log("sendOTPForScanning Controller!", req.body);
  let request = req.body;
  try {
    const sendOTPForScanningRes = await scannerServices.sendOTPForScanning(request);
    formatResponse(res, sendOTPForScanningRes);
  } catch (error) {
    next(error);
  }
};

// exports.validateOTPForScanning = (req, res, next) => {
//   console.log("validateOTPForScanning Controller!", req.body);
//   let request = req.body;

//   scannerServices.validateOTPForScanning(
//     request,
//     function (
//       validate_OTP_for_scanning_err,
//       validate_OTP_for_scanning_response
//     ) {
//       if (validate_OTP_for_scanning_err) {
//         res
//           .status(validate_OTP_for_scanning_err)
//           .json(validate_OTP_for_scanning_response);
//       } else {
//         console.log("Validated OTP Successfully");
//         res.json(validate_OTP_for_scanning_response);
//       }
//     }
//   );
// };

exports.validateOTPForScanning = async (req, res, next) => {
  console.log("validateOTPForScanning Controller!", req.body);
  let request = req.body;
  try {
    const validateOTPForScanningRes = await scannerServices.validateOTPForScanning(request);
    formatResponse(res, validateOTPForScanningRes)
  } catch (error) {
    next(error);
  }
};

exports.fetchSignedURLForAnswers = async (req, res, next) => {
  let request = req.body;
  try {
    const fetchSignedURLForAnswersRes = await scannerServices.fetchSignedURLForAnswers(request);
    formatResponse(res, fetchSignedURLForAnswersRes);
  } catch (error) {
    next(error);
  }
};


exports.fetchSignedURLForQuizAnswers = async (req, res, next) => {
  console.log("fetchSignedURLForQuizAnswers Controller!", req.body);
  let request = req.body;
  try {
    const fetchSignedURLForQuizAnswersRes = await scannerServices.fetchSignedURLForQuizAnswers(request);
    formatResponse(res, fetchSignedURLForQuizAnswersRes);
  } catch (error) {
    next(error);
  }
};

exports.uploadQuizAnswerSheets = (req, res, next) => {
  console.log("uploadAnswerSheets Controller!", req.body);
  let request = req.body;

  scannerServices.uploadQuizAnswerSheets(
    request,
    function (
      upload_quiz_answer_sheets_err,
      upload_quiz_answer_sheets_response
    ) {
      if (upload_quiz_answer_sheets_err) {
        res.status(400).json(upload_quiz_answer_sheets_err);
      } else {
        console.log("Answer Sheet Uploaded Successfully");
        res.json(upload_quiz_answer_sheets_response);
      }
    }
  );
};

exports.uploadQuizAnswerSheets2 = async (req, res, next) => {
  console.log("uploadAnswerSheets2 Controller!", req.body);
  let request = req.body;
  try {
    const uploadQuizAnswerSheetsRes = await scannerServices.uploadQuizAnswerSheetsNew(request);
    formatResponse(res, uploadQuizAnswerSheetsRes);
  } catch (error) {
    next(error);
  }
};

exports.uploadAnswerSheets = (req, res, next) => {
  console.log("uploadAnswerSheets Controller!", req.body);
  let request = req.body;

  scannerServices.uploadAnswerSheets(
    request,
    function (upload_answer_sheets_err, upload_answer_sheets_response) {
      if (upload_answer_sheets_err) {
        res.status(400).json(upload_answer_sheets_err);
      } else {
        console.log("Answer Sheet Uploaded Successfully");
        res.json(upload_answer_sheets_response);
      }
    }
  );
};

exports.uploadAnswerSheets2 = async (req, res, next) => {
  console.log("uploadAnswerSheets2222 Controller!!!!", req.body);
  let request = req.body;
  try {
    const uploadAnswerSheetsRes = await scannerServices.uploadAnswerSheets2New(request);
    formatResponse(res, uploadAnswerSheetsRes);
  } catch (error) {
    next(error);
  }
};