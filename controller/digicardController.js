const {digicardServices} = require("../services");
const { formatResponse } = require("../helper/helper");

exports.fetchRelatedDigiCards = (req, res, next) => {
    let request = req.body;
    
    request["token"] = req.header('Authorization');
    
    digicardServices.fetchRelatedDigiCards(request, function (individual_digicard_err, individual_digicard_response) {
        if (individual_digicard_err) { 
            res.status(individual_digicard_err).json(individual_digicard_response);
        } else { 
            console.log("Related DigiCards Fetched Successfully");
            res.json(individual_digicard_response);
        }
    });
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

exports.fetchAllPreTopicDigicards = (req, res, next) => {
    let request = req.body;    
    digicardServices.fetchAllPreTopicsAndItsDigicards(request, function (TopicsDigicards_err, TopicsDigicards_response) {
        if (TopicsDigicards_err) {
            res.status(TopicsDigicards_err).json(TopicsDigicards_response);
        } else {
            console.log("Got all topics and its digicards!");
            res.json(TopicsDigicards_response);
        }
    });
};

exports.digicardUnlock = (req, res, next) => {
    console.log("Unclock DigiCards ");
    console.log(req.body);
    let request = req.body;
    digicardServices.changeDigicardLockStatus(request, function (change_lock_status_err, change_lock_status_response) {
        if (change_lock_status_err) {
            res.status(change_lock_status_err).json(change_lock_status_response);
        } else {
            console.log("Digicard Unlock!");
            res.json(change_lock_status_response);
        }
    });
};

exports.fetchAllPostTopicDigicards = (req, res, next) => {
    let request = req.body;    
    digicardServices.fetchAllPostTopicsAndItsDigicards(request, function (postTopicsDigicards_err, postTopicsDigicards_response) {
        if (postTopicsDigicards_err) {
            res.status(postTopicsDigicards_err).json(postTopicsDigicards_response);
        } else {
            console.log("Got all post topics and its digicards!");
            res.json(postTopicsDigicards_response);
        }
    });
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