const { formatResponse } = require("../helper/helper");
const {quizServices} = require("../services");

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

exports.fetchAllQuizDetails = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    quizServices.fetchAllQuizDetails(request, function (fetch_all_quiz_err, fetch_all_quiz_response) {
        if (fetch_all_quiz_err) {
            res.status(fetch_all_quiz_err).json(fetch_all_quiz_response);
        } else {
            console.log("Fetch All Quiz Successfully");
            res.json(fetch_all_quiz_response);
        }
    });
};




