const { subjectServices } = require("../services");
const constant = require('../constants/constant');
const { formatResponse } = require("../helper/helper");

// exports.fetchUnitsandChaptersBasedonSubjects = (req, res, next) => {
//     console.log("Fetch fetchUnitsandChaptersBasedonSubjects");
//     console.log(req.body);
//     let request = req.body;
//     subjectServices.getUnitsandChaptersBasedonSubjects(request, function (fetch_subjects_err, fetch_subjects_res) {
//         if (fetch_subjects_err) {
//             res.status(fetch_subjects_err).json(fetch_subjects_res);
//         } else {
//             console.log("Got Subject Based Unit and Chapter Data!");
//             res.json(fetch_subjects_res);
//         }
//     });
// };

exports.fetchUnitsandChaptersBasedonSubjects = async (req, res, next) => {
    console.log("Fetch fetchUnitsandChaptersBasedonSubjects");
    console.log(req.body);
    let request = req.body;
    try {
        const fetch_subjects_res = await subjectServices.getUnitsandChaptersBasedonSubjects2(request);
        formatResponse(res, fetch_subjects_res);
    } catch (error) {
        next(error);
    }
};

// exports.fetchTopicAndNoOfQuestions = (req, res, next) => {
//     console.log("Fetch topics and no of questions for express");
//     console.log(req.body);
//     let request = req.body;

//     if(request.data.quizSelectionType == constant.unlockChapterValues.expressQuiz)
//     {   
//         subjectServices.getExpressTopicsAndQuestionCount(request, function (getExpress_err, getExpress_res) {
//             if (getExpress_err) {
//                 res.status(getExpress_err).json(getExpress_res);
//             } else {
//                 console.log("Got topics and no of questions for express!");
//                 res.json(getExpress_res);
//             }
//         });
//     }
//     else if(request.data.quizSelectionType == constant.unlockChapterValues.manualQuiz)
//     {
//         console.log(constant.unlockChapterValues.manualQuiz);
//     }
//     else
//     {
//         console.log(constant.messages.INVALID_DATA);
//         res.json([]);
//     }
// };

exports.fetchTopicAndNoOfQuestions = async (req, res, next) => {
    const request = req.body;

    try {
        if (request?.data?.quizSelectionType === constant.unlockChapterValues.expressQuiz) {
            const getExpressRes = await subjectServices.getExpressTopicsAndQuestionCount2(request);
            formatResponse(res, getExpressRes);
        } else if (request?.data?.quizSelectionType === constant.unlockChapterValues.manualQuiz) {
            console.log(constant.unlockChapterValues.manualQuiz);
        } else {
            console.log(constant.messages.INVALID_DATA);
            formatResponse(res, []);
        }
    } catch (error) {
        next(error);
    }
};

exports.fetchAllChaptersBySubjectId = async(req, res, next) => {
    console.log("Fetch all chapters by subject id");
    console.log(req.body);
    let request = req.body;
    try {
        const fetch_subjects_res = await subjectServices.getAllChaptersBySubjectId(request);
        formatResponse(res, fetch_subjects_res);
    } catch (error) {
        next(error);
    }
};