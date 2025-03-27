const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { common, constValues, messages } = require('../constants/constant');
const { isEmptyArray } = require('../helper/helper');

exports.fetchConceptData3 = async (request) => {
    try {
        let topic_concept_id = request.topic_concept_id;

        if (!Array.isArray(topic_concept_id) || topic_concept_id.length === 0) {
            throw new Error(messages.INVALID_INPUT_TOPIC_CONCEPT_ID);
        }

        let params = {
            RequestItems: {
                [TABLE_NAMES.upschool_concept_blocks_table]: {
                    Keys: topic_concept_id.map(id => ({ concept_id: id }))
                }
            }
        };

        let result = await DATABASE_TABLE2.getByObjects(params);
        return result.Responses[TABLE_NAMES.upschool_concept_blocks_table];
    } catch (error) {
        throw new Error(messages.DATABASE_ERROR);
    }
};

exports.fetchConceptIDDisplayName2 = async (request) => {
    const conceptArray = request.concept_array;

    if (!Array.isArray(conceptArray) || isEmptyArray(conceptArray)) {
        throw new Error(messages.INVALID_REQUEST);
    }

    let readParams;

    if (conceptArray.length === 1) {
        readParams = {
            TableName: TABLE_NAMES.upschool_concept_blocks_table,
            KeyConditionExpression: "concept_id = :concept_id",
            FilterExpression: "concept_status = :concept_status",
            ExpressionAttributeValues: {
                ":concept_id": conceptArray[0],
                ":concept_status": common.Active,
            },
            ProjectionExpression: "concept_id, concept_title, display_name, concept_question_id",
        };

        const result = await DATABASE_TABLE2.query(readParams);
        return result.Items;
    } else {
        const keys = conceptArray.map(id => ({
            concept_id: id,
        }));

        readParams = {
            RequestItems: {
                [TABLE_NAMES.upschool_concept_blocks_table]: {
                    Keys: keys,
                    ProjectionExpression: "concept_id, concept_title, display_name, concept_status,concept_question_id",
                },
            },
        };

        const data = await DATABASE_TABLE2.getByObjects(readParams);

        const filteredData = data.Responses[TABLE_NAMES.upschool_concept_blocks_table].filter(
            item => item.concept_status === common.Active
        );

        return filteredData;
    }
};

exports.fetchBulkConceptsIDName2 = async (request) => {
    const unit_Concept_id = [...new Set(request.unit_Concept_id)];
    if (unit_Concept_id.length === 1) {
        const params = {
            TableName: TABLE_NAMES.upschool_concept_blocks_table,
            KeyConditionExpression: "concept_id = :concept_id",
            ExpressionAttributeValues: {
                ":concept_id": unit_Concept_id[0]
            },
            ProjectionExpression: "concept_id, concept_title, display_name",
        };

        const result = await DATABASE_TABLE2.query(params);
        return result.Items;
    } else {
        const keys = unit_Concept_id.map((id) => ({
            concept_id: id
        }));

        const params = {
            RequestItems: {
                [TABLE_NAMES.upschool_concept_blocks_table]: {
                    Keys: keys,
                    ProjectionExpression: "concept_id, concept_title, display_name"
                }
            }
        };

        const result = await DATABASE_TABLE2.getByObjects(params);
        return result.Responses[TABLE_NAMES.upschool_concept_blocks_table];
    }
};

exports.fetchConceptDatabasedonQuestionID3 = async (uniqueQuestionArr) => {
    const questionIds = uniqueQuestionArr;

    const queryParams = {
        TableName: TABLE_NAMES.upschool_concept_blocks_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
        },
        ProjectionExpression: "concept_id, display_name, concept_question_id",
    };

    const result = await DATABASE_TABLE2.query(queryParams);

    const filteredGroups = result.Items.filter(group => {

        return group.concept_question_id.some(questionId => questionIds.includes(questionId));
    });

    return filteredGroups || [];
};

exports.fetchConceptUsingTopicId = async (request) => {
    try {
        if (!Array.isArray(request) || isEmptyArray(request)) {
            throw new Error(messages.ID_ARRAY_REQUIRED);
        }

        const allResults = [];

        for (const topic of request) {
            if (!topic.topic_concept_id || !Array.isArray(topic.topic_concept_id)) {
                continue;
            }

            if (topic.topic_concept_id.length === 1) {
                const params = {
                    TableName: TABLE_NAMES.upschool_concept_blocks_table,
                    KeyConditionExpression: "concept_id = :concept_id",
                    ExpressionAttributeValues: {
                        ":concept_id": topic.topic_concept_id[0],
                    },
                    ProjectionExpression: "concept_id, concept_title, display_name,concept_question_id,concept_group_id",
                };

                const result = await DATABASE_TABLE2.query(params);
                if (result.Items) allResults.push(...result.Items);

            } else if (topic.topic_concept_id.length > 1) {
                const keys = topic.topic_concept_id.map((id) => ({ concept_id: id }));
                const batches = [];
                for (let i = 0; i < keys.length; i += 100) {
                    batches.push(keys.slice(i, i + 100));
                }

                for (const batch of batches) {
                    const params = {
                        RequestItems: {
                            [TABLE_NAMES.upschool_concept_blocks_table]: {
                                Keys: batch,
                                ProjectionExpression: "concept_id, concept_title, display_name,concept_question_id",
                            },
                        },
                    };

                    const result = await DATABASE_TABLE2.getByObjects(params);
                    if (result.Responses && result.Responses[TABLE_NAMES.upschool_concept_blocks_table]) {
                        allResults.push(...result.Responses[TABLE_NAMES.upschool_concept_blocks_table]);
                    }
                }
            }
        }

        return allResults;

    } catch (error) {
        throw new Error( `${messages.BULK_DATA_FETCH_FAILED} ${error.message}`);
    }
};