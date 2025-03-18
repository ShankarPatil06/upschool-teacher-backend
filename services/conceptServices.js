const { conceptRepository, topicRepository } = require("../repository")
const constant = require('../constants/constant');

exports.getConceptsBasedonTopicsNew = async (request) => {
    if (!Array.isArray(request.data.topic_array) || request.data.topic_array.length === 0) {
        return {
            statusCode: 400,
            body: constant.messages.INVALID_REQUEST,
        };
    }

    const topic_res = await topicRepository.fetchTopicIDandTopicConceptID2({ topic_array: request.data.topic_array });

    if (topic_res.length === 0) {
        return {
            statusCode: 200,
            body: topic_res,
        };
    }

    const concept_array = [...new Set(topic_res.flatMap(e => e.topic_concept_id))];

    const concept_res = await conceptRepository.fetchConceptIDDisplayName2({ concept_array });

    return concept_res;
};
