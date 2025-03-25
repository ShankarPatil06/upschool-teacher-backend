const { blueprintServices } = require("../services");
const { formatResponse } = require("../helper/helper");
const { constant } = require("../constants");

exports.fetchBlueprintById = async (req, res) => {
    try {
        const request = req.body;
        const fetch_blueprint_response = await blueprintServices.getBlueprintByItsId(request);
        res.json(fetch_blueprint_response);
    } catch (error) {
        res.status(error.status || 500).json(error);
    }
};

exports.fetchBlueprintDetailsBasedonId = async (req, res, next) => {
    try {
        let request = req.body;
        const reportData = await blueprintServices.fetchBlueprintDetailsBasedonId(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.fetchQuestionBasedOnBlueprint = async (req, res) => {
    try {
        let request = req.body;

        const blueQuestions_response = await blueprintServices.fetchBlueprintQuestions(request);

        res.json(blueQuestions_response);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || constant.messages.INTERNAL_SERVER_ERROR });
    }
};

exports.fetchAllBluePrints = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await blueprintServices.getAllBluePrints(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};