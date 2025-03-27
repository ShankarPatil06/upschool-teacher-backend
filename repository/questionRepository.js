const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { messages } = require('../constants/constant');
const { isEmptyArray } = require('../helper/helper');


const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

exports.fetchBulkQuestionsWithPublishStatusAndProjection2 = async (request) => {
    try {
        const { IdArray, fetchIdName, TableName, projectionExp, questionStatus } = request;
        const uniqueIds = [...new Set(IdArray)];

        if (isEmptyArray(uniqueIds)) {
            return { Items: [] };
        }

        if (uniqueIds.length === 1) {
            const getParams = {
                TableName,
                Key: { [fetchIdName]: uniqueIds[0] },
                ProjectionExpression: projectionExp.join(', '),
            };

            const response = await DATABASE_TABLE2.getItem(getParams);
            if (response.Item && response.Item.question_status === questionStatus) {
                return { Items: [response.Item] };
            }
            return { Items: [] };
        }

        const idChunks = chunkArray(uniqueIds, 100);
        let allItems = [];

        for (const chunk of idChunks) {
            const keys = chunk.map((id) => ({ [fetchIdName]: id }));
            const batchParams = {
                RequestItems: {
                    [TableName]: {
                        Keys: keys,
                        ProjectionExpression: projectionExp.join(', '),
                    },
                },
            };

            const batchResponse = await DATABASE_TABLE2.getByObjects(batchParams);
            const items = batchResponse.Responses?.[TableName] || [];

            const filteredItems = items.filter((item) => item.question_status === questionStatus);
            allItems = allItems.concat(filteredItems);
        }

        return { Items: allItems };
    } catch (error) {
        throw new Error(error.message || messages.QUESTIONS_FETCH_FAILED);
    }
};

exports.fetchBulkQuestionsNameById2 = async (request) => {
    const question_ids = [...new Set(request.question_id)];

    if (isEmptyArray(question_ids)) {
        return [];
    } else if (question_ids.length === 1) {
        const params = {
            TableName: TABLE_NAMES.upschool_question_table,
            KeyConditionExpression: "question_id = :question_id",
            ExpressionAttributeValues: { ":question_id": question_ids[0] },
            ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
        };

        const result = await DATABASE_TABLE2.query(params);
        return result.Items || [];
    } else {
        const idChunks = chunkArray(question_ids, 100);
        let allResponses = [];

        for (const chunk of idChunks) {
            const keys = chunk.map(id => ({ question_id: id }));

            const params = {
                RequestItems: {
                    [TABLE_NAMES.upschool_question_table]: {
                        Keys: keys,
                        ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
                    }
                }
            };

            const result = await DATABASE_TABLE2.getByObjects(params);
            if (result.Responses && result.Responses[TABLE_NAMES.upschool_question_table]) {
                allResponses = allResponses.concat(result.Responses[TABLE_NAMES.upschool_question_table]);
            }
        }

        return allResponses;
    }
};

exports.fetchBulkQuestionsNameById5 = async (request) => {
    const question_ids = [...new Set(request.question_id)];

    if (question_ids.length === 1) {
        const params = {
            TableName: TABLE_NAMES.upschool_question_table,
            KeyConditionExpression: "question_id = :question_id",
            ExpressionAttributeValues: {
                ":question_id": question_ids[0]
            },
            ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
        };

        const result = await DATABASE_TABLE2.query(params);
        return result.Items;
    } else {
        const BATCH_SIZE = 100;
        let allResults = [];

        for (let i = 0; i < question_ids.length; i += BATCH_SIZE) {
            const batchIds = question_ids.slice(i, i + BATCH_SIZE);

            const params = {
                RequestItems: {
                    [TABLE_NAMES.upschool_question_table]: {
                        Keys: batchIds.map(id => ({ question_id: id })),
                        ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
                    }
                }
            };

            try {
                const result = await DATABASE_TABLE2.getByObjects(params);
                allResults = allResults.concat(result.Responses[TABLE_NAMES.upschool_question_table] || []);
            } catch (err) {
                throw new Error(messages.QUESTIONS_FETCH_FAILED);
            }
        }

        return allResults;
    }
};





