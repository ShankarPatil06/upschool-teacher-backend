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

exports.fetchDigiCardstoReorder = async (req, res, next) => {
    try {
        const request = req.body;
        const digiCardsResponse = await teacherServices.getDigiCardstoReorder(request);
        return formatResponse(res, digiCardsResponse);
    } catch (error) {
        next(error)
    }
};

exports.fetchQuestionSourceandChapters = async (req, res, next) => {
    try {
        let request = req.body;
        request.data.source_type = constant.contentType.question;
        request.data.source_status = "Active";
        const response = await teacherServices.getQuestionSourceandChapters(request);
        return formatResponse(res, response);
    } catch (error) {
        next(error)
    }
};
