const {sectionRepository} = require("../repository") 

exports.updateActionAndRecommendations = async (request) => {
    return await sectionRepository.updateActionAndRecommendations(request);
}
