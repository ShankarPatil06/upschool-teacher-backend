const topicServices = require("../services/topicServices");
const { formatResponse } = require("../helper/helper");

exports.topicUnlock = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    topicServices.topicUnlockService(request, function (unlock_topic_err, unlock_topic_response) {
        if (unlock_topic_err) {
            res.status(unlock_topic_err).json(unlock_topic_response);
        } else {
            console.log("Chapter Lock Status Changed Successfully");
            res.json(unlock_topic_response);
        }
    });
};
exports.fetchDigicardsBasedonTopic = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    topicServices.getDigicardsBasedonTopic(request, function (individual_topic_err, individual_topic_response) {
        if (individual_topic_err) {
            res.status(individual_topic_err).json(individual_topic_response);
        } else {
            console.log("Topic related Concepts Fetched Successfully");
            res.json(individual_topic_response);
        }
    });
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
