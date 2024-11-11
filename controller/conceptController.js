const { formatResponse } = require("../helper/helper");
const conceptServices = require("../services/conceptServices");


exports.fetchConceptsBasedonTopics = async (req, res, next) => {
    try {
        const request = req.body;
        const bluePrintsResponse = await conceptServices.getConceptsBasedonTopicsNew(request);
        return formatResponse(res, bluePrintsResponse);
    } catch (error) {
        next(error)
    }
};
