const { conceptRepository, topicRepository } = require("../repository")
const constant = require('../constants/constant');
const { helper } = require("../helper");

exports.getConceptsBasedonTopicsNew = async (request) => {
    if (helper.isEmptyArray(request.data.topic_array)) {
        return {
            statusCode: 400,
            body: constant.messages.INVALID_REQUEST,
        };
    }

    const topic_res = await topicRepository.fetchTopicIDandTopicConceptID2({ topic_array: request.data.topic_array });

    if (helper.isEmptyArray(topic_res)) {
        return {
            statusCode: 200,
            body: topic_res,
        };
    }

    const concept_array = [...new Set(topic_res.flatMap(e => e.topic_concept_id))];

    const concept_res = await conceptRepository.fetchConceptIDDisplayName2({ concept_array });

    return concept_res;
};
