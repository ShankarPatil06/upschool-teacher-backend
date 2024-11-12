const { formatResponse } = require("../helper/helper");
const {reportServices} = require('../services');

exports.fetchAssessmentSummary = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.getAssessmentDetails(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
exports.getTargetedLearningExpectation = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.getTargetedLearningExpectation(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.getTargetedLearningExpectationDetails = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.getTargetedLearningExpectationDetails(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.preLearningSummaryDetails =async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.preLearningSummaryDetails(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.postLearningSummaryDetails =async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.postLearningSummaryDetails(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.viewAnalysisIndividualReport =async (req, res, next) => {
    try {
    let request = req.body;
    const reportData =  await reportServices.viewAnalysisIndividualReport(request);
    return formatResponse(res, reportData);
    } catch (error) {
    next(error)
    }
};

exports.viewClassReportQuestions =async (req, res, next) => {
    try {
    let request = req.body;
    const reportData =  await reportServices.viewClassReportQuestions(request);
    return formatResponse(res, reportData);
    } catch (error) {
    next(error)
    }
};

exports.viewClassReportFocusArea =async (req, res, next) => {
    try {
    let request = req.body;
    const reportData =  await reportServices.viewClassReportFocusArea(request);
    return formatResponse(res, reportData);
    } catch (error) {
    next(error)
    }
};

exports.viewChapterwisePerformanceTracking =async (req, res, next) => {
    try {
    let request = req.body;
    const reportData =  await reportServices.viewChapterwisePerformanceTracking(request);
    return formatResponse(res, reportData);
    } catch (error) {
    next(error)
    }
};

exports.preLearningBlueprintDetails = async (req, res, next) => {
    try {
    let request = req.body;
    const reportData = await reportServices.preLearningBlueprintDetails(request);
    return formatResponse(res, reportData);
    } catch (error) {
       next(error)
    }
};

exports.getIndividualQuizReport = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.fetchIndividualQuizReport(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.comprehensivePerformanceChapterWise = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.comprehensivePerformanceChapterWise(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.comprehensivePerformanceTopicWise = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.comprehensivePerformanceTopicWise(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.comprehensivePerformanceConceptWise = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.comprehensivePerformanceConceptWise(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.getActionsAndRecommendations = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.getActionsAndRecommendations(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.getActionsAndRecommendationDetail = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.getActionsAndRecommendationDetail(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};