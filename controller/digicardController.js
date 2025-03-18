const { digicardServices } = require("../services");
const { formatResponse } = require("../helper/helper");

exports.fetchRelatedDigiCards = async (req, res, next) => {
    try {
        let request = req.body;
        request["token"] = req.header('Authorization');
        const individual_digicard_response = await digicardServices.fetchRelatedDigiCards(request);
        return formatResponse(res, individual_digicard_response);
    } catch (error) {
        next(error)
    }
};

exports.fetchIndividualDigiCard = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await digicardServices.fetchIndividualDigiCard(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.fetchAllPreTopicDigicards = async (req, res, next) => {
    try {
        const request = req.body;
        const topicsDigicardsResponse = await digicardServices.fetchAllPreTopicsAndItsDigicards(request);
        return formatResponse(res, topicsDigicardsResponse);
    } catch (error) {
        next(error)
    }
};

exports.digicardUnlock = async (req, res, next) => {
    try {
        const request = req.body;
        const changeLockStatusResponse = await digicardServices.changeDigicardLockStatus(request);
        return formatResponse(res, changeLockStatusResponse);
    } catch (error) {
        next(error)
    }
};

exports.fetchAllPostTopicDigicards = async (req, res, next) => {
    try {
        const request = req.body;
        const postTopicsDigicardsResponse = await digicardServices.fetchAllPostTopicsAndItsDigicards(request);
        return formatResponse(res, postTopicsDigicardsResponse);
    } catch (error) {
        next(error);
    }
};

exports.fetchDigicardExtension = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await digicardServices.getExtensionOfDigicard(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};