const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.fetchConceptData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            let topic_concept_id = request.topic_concept_id;

            if (topic_concept_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_concept_blocks_table,
                    KeyConditionExpression: "concept_id = :concept_id",
                    ExpressionAttributeValues: {
                        ":concept_id": topic_concept_id[0]
                    },
                    // ProjectionExpression: ["concept_id", "subject_name", "topic_concept_id"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log("Else");
                topic_concept_id.forEach((element, index) => {
                    if (index < topic_concept_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "concept_id = :concept_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':concept_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "concept_id = :concept_id" + index + ""
                        ExpressionAttributeValuesDynamic[':concept_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_concept_blocks_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    // ProjectionExpression: ["concept_id", "subject_name", "topic_concept_id"],
                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}
exports.fetchConceptData2 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_concept_blocks_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
    };
    try {
        return await DATABASE_TABLE2.query(params);
    } catch (error) {
        console.error(`Error fetching quiz results:`, error);
        throw error;
    }
};

exports.fetchConceptIDDisplayName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            console.log("fetchConceptData request : ", request);
            let concept_array = request.concept_array;

            console.log("concept_array : ", concept_array);
            if (concept_array.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_concept_blocks_table,
                    KeyConditionExpression: "concept_id = :concept_id",
                    FilterExpression: "concept_status = :concept_status",
                    ExpressionAttributeValues: {
                        ":concept_id": concept_array[0],
                        ":concept_status": "Active",
                    },
                    ProjectionExpression: ["concept_id", "concept_title", "display_name"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log("Else");
                concept_array.forEach((element, index) => {
                    if (index < concept_array.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(concept_id = :concept_id" + index + " AND concept_status = :concept_status) OR "
                        ExpressionAttributeValuesDynamic[':concept_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(concept_id = :concept_id" + index + " AND concept_status = :concept_status )"
                        ExpressionAttributeValuesDynamic[':concept_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[':concept_status'] = 'Active';

                let read_params = {
                    TableName: TABLE_NAMES.upschool_concept_blocks_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["concept_id", "concept_title", "display_name"],
                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}

exports.fetchConceptIDDisplayName2 = async (request) => {
    const conceptArray = request.concept_array;

    if (!Array.isArray(conceptArray) || conceptArray.length === 0) {
        throw new Error(constant.messages.INVALID_REQUEST);
    }

    let readParams;

    if (conceptArray.length === 1) {
        readParams = {
            TableName: TABLE_NAMES.upschool_concept_blocks_table,
            KeyConditionExpression: "concept_id = :concept_id",
            FilterExpression: "concept_status = :concept_status",
            ExpressionAttributeValues: {
                ":concept_id": conceptArray[0],
                ":concept_status": "Active",
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
            item => item.concept_status === "Active"
        );

        return filteredData;
    }
};


exports.fetchBulkConceptsIDName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            console.log("fetchChapterData request : ", request);
            let unit_Concept_id = request.unit_Concept_id;
            console.log("unit_Concept_id : ", unit_Concept_id);
            if (unit_Concept_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_concept_blocks_table,
                    KeyConditionExpression: "concept_id = :concept_id",
                    ExpressionAttributeValues: {
                        ":concept_id": unit_Concept_id[0]
                    },
                    ProjectionExpression: ["concept_id", "concept_title", "display_name"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log(" Chapter Else");
                unit_Concept_id.forEach((element, index) => {
                    console.log("element : ", element);

                    if (index < unit_Concept_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "concept_id = :concept_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':concept_id' + index] = element
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "concept_id = :concept_id" + index
                        ExpressionAttributeValuesDynamic[':concept_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_concept_blocks_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["concept_id", "concept_title", "display_name"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}

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
        const chunks = helper.chunkArray(unit_Concept_id, 100);
        let allItems = [];

        for (const chunk of chunks) {
            const keys = chunk.map((id) => ({
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
            const items = result.Responses[TABLE_NAMES.upschool_concept_blocks_table] || [];
            allItems = allItems.concat(items);
        }

        return allItems;
    }
};

exports.fetchConceptDatabasedonQuestionID3 = async function (uniqueQuestionArr) {
    const questionIds = uniqueQuestionArr;
    console.log("Searching for question IDs:", questionIds);

    const queryParams = {
        TableName: TABLE_NAMES.upschool_concept_blocks_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
        },
        ProjectionExpression: "concept_id, display_name, concept_question_id",
    };

    const result = await DATABASE_TABLE2.query(queryParams);

    const filteredGroups = result.Items.filter(group => {

        return group.concept_question_id.some(questionId => questionIds.includes(questionId));
    });
    console.log(filteredGroups)

    return filteredGroups || [];
};

exports.fetchConceptUsingTopicId = async (request) => {
    try {
        if (!Array.isArray(request) || request.length === 0) {
            throw new Error("Invalid or empty request format. Expected a non-empty array.");
        }

        const allResults = [];

        for (const topic of request) {
            if (!topic.topic_concept_id || !Array.isArray(topic.topic_concept_id)) {
                console.warn("Skipping invalid topic:", topic);
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
        console.error("Error in fetchConceptUsingTopicId:", error);
        throw new Error(`Failed to fetch concepts: ${error.message}`);
    }
};
