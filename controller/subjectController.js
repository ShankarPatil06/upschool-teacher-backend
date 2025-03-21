const {subjectServices} = require("../services");
const constant = require('../constants/constant');
const { formatResponse } = require("../helper/helper");

exports.fetchUnitsandChaptersBasedonSubjects = async (req, res, next) => {
    console.log("Fetch fetchUnitsandChaptersBasedonSubjects");
    console.log(req.body);
    let request = req.body;
    try{
        const fetch_subjects_res = await subjectServices.getUnitsandChaptersBasedonSubjects2(request);
        formatResponse(res, fetch_subjects_res);
    }catch(error)
    {
        next(error);
    }
};

exports.fetchTopicAndNoOfQuestions = async (req, res, next) => {
    const request = req.body;

    try {
        if (request.data.quizSelectionType === constant.unlockChapterValues.expressQuiz) {
            const getExpressRes = await subjectServices.getExpressTopicsAndQuestionCount2(request);
            formatResponse(res, getExpressRes);
        } else if (request.data.quizSelectionType === constant.unlockChapterValues.manualQuiz) {
            console.log(constant.unlockChapterValues.manualQuiz);
        } else {
            console.log(constant.messages.INVALID_DATA);
            formatResponse(res ,[]);
        }
    } catch (error) {
      next(error);
    }
};
