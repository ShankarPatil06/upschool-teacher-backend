const { tables: { TABLE_NAMES } } = require('../constants');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { isEmptyArray } = require('../helper/helper');
const { messages } = require('../constants/constant');


exports.fetchGroupsData2 = async (request) => {
    try {
        const group_array = request.group_array;

        if (isEmptyArray(group_array)) {
            throw new Error(messages.NO_DATA);
        }
        if (group_array.length === 1) {
            const read_params = {
                TableName: TABLE_NAMES.upschool_group_table,
                KeyConditionExpression: "group_id = :group_id",
                ExpressionAttributeValues: {
                    ":group_id": group_array[0],
                },
                ProjectionExpression: "group_id, group_question_id",
            };

            const result = await DATABASE_TABLE2.query(read_params);
            return result.Items;
        }

        const BATCH_SIZE = 100;
        let allResults = [];

        for (let i = 0; i < group_array.length; i += BATCH_SIZE) {
            const batch = group_array.slice(i, i + BATCH_SIZE);
            const read_params = {
                RequestItems: {
                    [TABLE_NAMES.upschool_group_table]: {
                        Keys: batch.map(id => ({ group_id: id })),
                        ProjectionExpression: "group_id, group_question_id",
                    }
                }
            };

            try {
                const result = await DATABASE_TABLE2.getByObjects(read_params);
                if (result.Responses && result.Responses[TABLE_NAMES.upschool_group_table]) {
                    allResults = allResults.concat(result.Responses[TABLE_NAMES.upschool_group_table]);
                }
            } catch (err) {
                throw new Error(messages.GROUPS_FETCH_FAILED);
            }
        }

        return allResults;
    } catch (error) {
        throw new Error(error.message || messages.GROUPS_FETCH_FAILED);
    }
}