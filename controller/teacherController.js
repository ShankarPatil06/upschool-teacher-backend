const { teacherServices } = require("../services");
const constant = require("../constants/constant");
const { formatResponse } = require("../helper/helper");

exports.fetchTeacherClasses = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.getTeacherClasses(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.fetchTeacherSectionsBasedonClass = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.getTeacherSectionsBasedonClass(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.fetchTeacherSubjectsBasedonSection = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.getTeacherSubjectsBasedonSection(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
// exports.fetchDigicardsBasedonTopic = (req, res, next) => {
//     let request = req.body;
//     request["token"] = req.header('Authorization');

//     teacherServices.getDigicardsBasedonTopic(request, function (individual_topic_err, individual_topic_response) {
//         if (individual_topic_err) {
//             res.status(individual_topic_err).json(individual_topic_response);
//         } else {
//             console.log("Topic related Concepts Fetched Successfully");
//             res.json(individual_topic_response);
//         }
//     });
// };

exports.archivedActiveTopicsInChapter = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.archiveAndActivateTopicInChapter(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};


exports.getPreGrantedTeacherPermissions = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.getTeacherPreLearningPermissions(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.addDigicardExtension = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.addteacherDigicardExtension(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.generatePrePostQuiz = async (req, res, next) => {
    try {
        let request = req.body;
        let quizResponse;
        if (request.data.learningType === constant.prePostConstans.preLearningVal) {
            quizResponse = await teacherServices.generateQuizForPreLearning(request);
        } else if (request.data.learningType === constant.prePostConstans.postLearningVal) {
            quizResponse = await teacherServices.generateQuizForPostLearning(request);
        } else {
            return res.status(400).json(constant.messages.INVALID_DATA);
        }
        return formatResponse(res, quizResponse);
    } catch (error) {
        next(error);
    }
};

exports.getPostGrantedTeacherPermissions = async (req, res, next) => {
    try {
        const request = req.body;
        const permissionResponse = await teacherServices.getTeacherPostLearningPermissions(request);
        return formatResponse(res, permissionResponse);
    } catch (error) {
        next(error)
    }
};

exports.reArrangeDigiCardOrder = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.changeDigiCardOrder(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.toggleDigicardsInTopic = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await teacherServices.activeAndArchiveDigicardsInTopic(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.fetchDigiCardstoReorder = (req, res, next) => {
    console.log("fetchDigiCardstoReorder : ");
    let request = req.body;
    teacherServices.getDigiCardstoReorder(request, function (permission_err, permission_response) {
        if (permission_err) {
            res.status(permission_err).json(permission_response);
        } else {
            console.log("DigiCards Fetched Successfully");
            res.json(permission_response);
        }
    });
};
exports.fetchQuestionSourceandChapters = (req, res, next) => {
    console.log("fetchQuestionSourceandChapters : ");
    let request = req.body;
    request.data.source_type = constant.contentType.question;
    request.data.source_status = "Active";

    teacherServices.getQuestionSourceandChapters(request, function (question_source_and_chapters_err, question_source_and_chapters_response) {
        if (question_source_and_chapters_err) {
            res.status(question_source_and_chapters_err).json(question_source_and_chapters_response);
        } else {
            console.log("QuestionSource and Chapters Fetched Successfully");
            res.json(question_source_and_chapters_response);
        }
    });
};
