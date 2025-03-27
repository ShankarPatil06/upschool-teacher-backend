const { DATABASE_TABLE2 } = require("./baseRepositoryNew");
const { getDataByFilterKey } = require("../helper/helper");
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require("../constants");
const { messages, constValues, common } = require("../constants/constant");

exports.fetchPreTopicData2 = async (request) => {

    const chapterTopicIds = request.prelearning_topic_id;

    if (chapterTopicIds.length === 1) {
        const readParams = {
            TableName: TABLE_NAMES.upschool_topic_table,
            KeyConditionExpression: "topic_id = :topic_id",
            FilterExpression: "topic_status = :topic_status AND pre_post_learning = :pre_post_learning",
            ExpressionAttributeValues: {
                ":topic_id": chapterTopicIds[0],
                ":topic_status": common.Active,
                ":pre_post_learning": common.PreLearning
            },
            ProjectionExpression: "topic_id, topic_title, pre_post_learning, topic_description, display_name, topic_concept_id, topic_status",
        };
        return await DATABASE_TABLE2.query(readParams);
    }

    const keys = chapterTopicIds.map((id) => ({
        topic_id: id,
    }));

    const readParams = {
        RequestItems: {
            [TABLE_NAMES.upschool_topic_table]: {
                Keys: keys,
                ProjectionExpression: "topic_id, topic_title, pre_post_learning, topic_description, display_name, topic_concept_id, topic_status"
            }
        }
    };

    const data = await DATABASE_TABLE2.getByObjects(readParams);

    const filteredData = data.Responses[TABLE_NAMES.upschool_topic_table].filter(
        item => item.topic_status === common.Active && item.pre_post_learning === common.PreLearning
    );

    return filteredData;

};

exports.fetchPostTopicData2 = async (request) => {
    const chapter_topic_ids = request.postlearning_topic_id;
    let params;

    if (chapter_topic_ids.length === 1) {
        params = {
            TableName: TABLE_NAMES.upschool_topic_table,
            KeyConditionExpression: "topic_id = :topic_id",
            FilterExpression: "topic_status = :topic_status AND pre_post_learning = :pre_post_learning",
            ExpressionAttributeValues: {
                ":topic_id": chapter_topic_ids[0],
                ":topic_status": common.Active,
                ":pre_post_learning": common.PostLearning,
            },
            ProjectionExpression: "topic_id, topic_title, pre_post_learning, topic_description, topic_concept_id, display_name",
        };
        return await DATABASE_TABLE2.query(params);
    } else {
        const keys = chapter_topic_ids.map((id) => ({ topic_id: id }));

        const params = {
            RequestItems: {
                [TABLE_NAMES.upschool_topic_table]: {
                    Keys: keys,
                    ProjectionExpression: "topic_id, topic_title, pre_post_learning, topic_description, topic_concept_id, display_name",
                },
            },
        };

        const data = await DATABASE_TABLE2.getByObjects(params);
        return data.Responses[TABLE_NAMES.upschool_topic_table];
    }
};

exports.fetchTopicIDDisplayTitleData2 = async (request) => {
    const fromatedRequest = await getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_topic_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "topic_id, topic_title, display_name, topic_concept_id"
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;

};

exports.fetchTopicConceptIDData2 = async (request) => {
    const { topic_array } = request;

    if (!topic_array || topic_array.length === 0) {
        throw new Error(messages.INVALID_TOPIC_ARRAY);
    }

    let params = {
        TableName: TABLE_NAMES.upschool_topic_table,
        ProjectionExpression: "topic_id, topic_concept_id",
        ExpressionAttributeValues: { ":topic_status": common.Active }
    };

    if (topic_array.length === 1) {
        params.KeyConditionExpression = "topic_id = :topic_id";
        params.FilterExpression = "topic_status = :topic_status";
        params.ExpressionAttributeValues[":topic_id"] = topic_array[0];
        return await DATABASE_TABLE2.query(params);
    } else {
        const filterConditions = topic_array.map((id, index) => `(topic_id = :topic_id${index} AND topic_status = :topic_status)`).join(" OR ");

        params.FilterExpression = filterConditions;
        topic_array.forEach((id, index) => {
            params.ExpressionAttributeValues[`:topic_id${index}`] = id;
        });

        return await DATABASE_TABLE2.query(params);
    }
};

exports.fetchTopicIDandTopicConceptID2 = async (request) => {

    const topic_array = request.topic_array;

    if (!Array.isArray(topic_array) || topic_array.length === 0) {
        throw new Error(messages.INVALID_REQUEST);
    }

    let readParams;

    if (topic_array.length === 1) {
        readParams = {
            TableName: TABLE_NAMES.upschool_topic_table,
            KeyConditionExpression: "topic_id = :topic_id",
            FilterExpression: "topic_status = :topic_status",
            ExpressionAttributeValues: {
                ":topic_id": topic_array[0],
                ":topic_status": common.Active,
            },
            ProjectionExpression: "topic_id, topic_concept_id",
        };

        const data = await DATABASE_TABLE2.query(readParams);
        return data.Items;
    } else {
        const keys = topic_array.map(id => ({
            topic_id: id,
        }));

        readParams = {
            RequestItems: {
                [TABLE_NAMES.upschool_topic_table]: {
                    Keys: keys,
                    ProjectionExpression: "topic_id, topic_concept_id, topic_status",
                },
            },
        };

        const data = await DATABASE_TABLE2.getByObjects(readParams);

        const filteredData = data.Responses[TABLE_NAMES.upschool_topic_table].filter(
            item => item.topic_status === common.Active
        );

        return filteredData;
    }
};

exports.fetchTopicByID2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_topic_table,

        KeyConditionExpression: "topic_id = :topic_id",
        ExpressionAttributeValues: {
            ":topic_id": request.data.topic_id
        }
    };
    return await DATABASE_TABLE2.query(params);
};

exports.fetchBulkTopicsIDName2 = async (request) => {
    const unit_Topic_id = [...new Set(request.unit_Topic_id)];

    if (unit_Topic_id.length === 1) {
        const params = {
            TableName: TABLE_NAMES.upschool_topic_table,
            KeyConditionExpression: "topic_id = :topic_id",
            ExpressionAttributeValues: {
                ":topic_id": unit_Topic_id[0]
            },
            ProjectionExpression: "topic_id, topic_title, pre_post_learning, display_name, chapter_id",
        };

        const result = await DATABASE_TABLE2.query(params);
        return result.Items;
    } else {
        const keys = unit_Topic_id.map((id) => ({
            topic_id: id
        }));

        const params = {
            RequestItems: {
                [TABLE_NAMES.upschool_topic_table]: {
                    Keys: keys,
                    ProjectionExpression: "topic_id, topic_title, pre_post_learning, display_name"
                }
            }
        };
        const result = await DATABASE_TABLE2.getByObjects(params);

        return result.Responses[TABLE_NAMES.upschool_topic_table];
    }
};

exports.fetchTopicDatabasedonQuestionID3 = async function (topicids) {
    const questionIds = topicids;

    const queryParams = {
        TableName: TABLE_NAMES.upschool_topic_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
        },
        ProjectionExpression: "topic_id, topic_title, topic_concept_id",
    };

    const result = await DATABASE_TABLE2.query(queryParams);

    const filteredGroups = result.Items.filter(group => {

        return group.topic_concept_id.some(questionId => questionIds.includes(questionId));
    });
    console.log(filteredGroups)

    return filteredGroups || [];
};

exports.fetchBulkTopicsIDNameBlueprint = async (request) => {
    const unit_topic_id = request.uniqueTopicIds;

    if (unit_topic_id.length === 1) {

        const params = {
            TableName: TABLE_NAMES.upschool_topic_table,
            KeyConditionExpression: "topic_id = :topic_id",
            ExpressionAttributeValues: {
                ":topic_id": unit_topic_id[0]
            },
        };

        const topicData = await DATABASE_TABLE2.query(params);
        return topicData.Items;
    } else {
        // Use BatchGetCommand for multiple topic IDs
        const keys = unit_topic_id.map((id) => ({ topic_id: id }));
        const params = {
            RequestItems: {
                [TABLE_NAMES.upschool_topic_table]: {
                    Keys: keys,
                },
            },
        };

        const data = await DATABASE_TABLE2.getByObjects(params);
        return data.Responses[TABLE_NAMES.upschool_topic_table]; // Return the fetched chapters
    }
};
