const topicServices = require("../services/topicServices");
const { formatResponse } = require("../helper/helper");
const { constant } = require("../constants");

exports.topicUnlock = async (req, res) => {
    try {
        let request = req.body;
        request["token"] = req.header(constant.messages.AUTHORIZATION);

        const unlock_topic_response = await topicServices.topicUnlockService(request);
        res.json(unlock_topic_response);
    } catch (error) {
        res.status(error.status || 500).json(error.message || constant.messages.INTERNAL_SERVER_ERROR);
    }
};

exports.fetchDigicardsBasedonTopic = async (req, res) => {
    try {
        let request = req.body;
        request["token"] = req.header(constant.messages.AUTHORIZATION);

        const individual_topic_response = await topicServices.getDigicardsBasedonTopic(request);
        res.json(individual_topic_response);
    } catch (error) {
        res.status(error.status || 500).json(error.message || constant.messages.INTERNAL_SERVER_ERROR);
    }
};

exports.fetchTopicsBasedonChapters = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await topicServices.getTopicsBasedonChapters(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};
