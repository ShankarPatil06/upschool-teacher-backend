const { blueprintServices } = require("../services");
const { formatResponse } = require("../helper/helper");

exports.fetchBlueprintById = async (req, res, next) => {
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

exports.fetchQuestionBasedOnBlueprint = async (req, res, next) => {
    try {
        let request = req.body;

        const blueQuestions_response = await blueprintServices.fetchBlueprintQuestions(request);

        res.json(blueQuestions_response);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message || "Internal Server Error" });
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