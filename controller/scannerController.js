const { formatResponse, formatErrorResponse } = require("../helper/helper");
const { scannerServices } = require("../services");

exports.sendScannerLink = async (req, res, next) => {
  let request = req.body;
  try {
    const sendScannerLinkRes = await scannerServices.sendScannerLink(request);
    formatResponse(res, sendScannerLinkRes);
  } catch (error) {
    next(error);
  }
};

exports.sendOTPForScanning = async (req, res, next) => {
  let request = req.body;
  try {
    const sendOTPForScanningRes = await scannerServices.sendOTPForScanning(request);
    formatResponse(res, sendOTPForScanningRes);
  } catch (error) {
    next(error);
  }
};

exports.validateOTPForScanning = async (req, res, next) => {
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
  let request = req.body;
  try {
    const fetchSignedURLForQuizAnswersRes = await scannerServices.fetchSignedURLForQuizAnswers(request);
    formatResponse(res, fetchSignedURLForQuizAnswersRes);
  } catch (error) {
    next(error);
  }
};

exports.uploadQuizAnswerSheets2 = async (req, res, next) => {
  let request = req.body;
  try {
    const uploadQuizAnswerSheetsRes = await scannerServices.uploadQuizAnswerSheetsNew(request);
    formatResponse(res, uploadQuizAnswerSheetsRes);
  } catch (error) {
    next(error);
  }
};

exports.uploadAnswerSheets2 = async (req, res, next) => {
  let request = req.body;
  try {
    const uploadAnswerSheetsRes = await scannerServices.uploadAnswerSheets2New(request);
    formatResponse(res, uploadAnswerSheetsRes);
  } catch (error) {
    next(error);
  }
};

exports.removeUploadedAnswerData = async (req, res, next) => {
  let request = req.body;
  try {
    const removeUploadedAnswerDataRes = await scannerServices.removeUploadedAnswerData(request);
    formatResponse(res, removeUploadedAnswerDataRes);
  } catch (error) {
    next(error);
  }
};