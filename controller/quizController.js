const { formatResponse } = require("../helper/helper");
const { quizServices } = require("../services");

exports.checkDuplicateQuizName = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.checkDuplicateQuizName(request);
        formatResponse(res, reportData)
    } catch (error) {
        next(error)
    }
};

exports.toggleQuizStatus = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.updateQuizStatus(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.fetchQuizBasedonStatus = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.fetchQuizBasedonStatus(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.getStudentQuizResultData = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.getQuizResult(request);
        return formatResponse(res, reportData)
    } catch (error) {
        next(error)
    }
};
exports.updateStudentQuizMarks = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.editStudentQuizMarks(request);
        return formatResponse(res, reportData)
    } catch (error) {
        next(error)
    }
};

exports.viewQuizQuestionPaper = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.viewQuizQuestionPaper(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.fetchQuizTemplates = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.fetchQuizTemplates(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.resetQuizEvaluationStatus = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.resetQuizEvaluationStatus(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.startQuizEvaluation = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await quizServices.startQuizEvaluationProcess(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.fetchAllQuizDetails = async (req, res, next) => {
    try {
        const request = { ...req.body, token: req.header('Authorization') };
        const fetchAllQuizResponse = await quizServices.fetchAllQuizDetails(request);
        return formatResponse(res, fetchAllQuizResponse);
    } catch (error) {
        next(error);
    }
};