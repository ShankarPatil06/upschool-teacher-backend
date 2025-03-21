const { testQuestionPaperServices } = require("../services");
const constants = require("../constants/constant");
const { formatResponse } = require("../helper/helper");

exports.fetchTestQuestionPapersBasedonStatus = async (req, res, next) => {
    let request = req.body;
    try {
        const test_question_paper_response = await testQuestionPaperServices.fetchTestQuestionPapersBasedonStatus2(request);
        return formatResponse(res, test_question_paper_response);
    } catch (error) {
        next(error);
    }
};

exports.addTestQuestionPaper = async (req, res, next) => {
    let request = req.body;
    try {
        const test_question_paper_response = await testQuestionPaperServices.addTestQuestionPaper2(request);
        formatResponse(res, test_question_paper_response);
    } catch (error) {
        next(error);
    }
};

exports.validateQuestionPaperName = async (req, res, next) => {
    let request = req.body;

    try {
        const test_question_paper_response = await testQuestionPaperServices.validateQuestionPaperName2(request);
        formatResponse(res, test_question_paper_response);
    } catch (error) {
        next(error);
    }
};

exports.viewTestQuestionPaper = async (req, res, next) => {
    let request = req.body;
    try {
        const view_test_question_paper_response = await testQuestionPaperServices.viewTestQuestionPaper2(request);
        formatResponse(res, view_test_question_paper_response);
    } catch (error) {
        next(error);
    }
};

exports.toggleQuestionPaper = async (req, res, next) => {
    try {
        const request = req.body;
        const toggleQuestionPaperResponse = await testQuestionPaperServices.toggleQuestionPaperBasedOnId2(request);

        if (toggleQuestionPaperResponse.statusCode == 200) {
            formatResponse(res, toggleQuestionPaperResponse);
        } else {
            formatResponse(res, constants.messages.CANNOT_DELETE_QUESTION_PAPER, toggleQuestionPaperResponse.statusCode);
        }
    } catch (error) {
        next(error);
    }
};
