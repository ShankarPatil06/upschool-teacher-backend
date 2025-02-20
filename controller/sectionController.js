const { formatResponse } = require("../helper/helper");
const {sectionServices} = require("../services");

exports.updateActionAndRecommendations = async (req, res, next) => {
    try {
        let request = req.body;
        const update_section_res =  await sectionServices.updateActionAndRecommendations(request);
        return formatResponse(res, update_section_res);
    }catch(error)
    {
        next(error);
    }
};