const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { isEmptyArray } = require('../helper/helper');


exports.fetchGroupsData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DigiCard Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            let group_array = request.group_array;

            if (group_array.length === 0) {

                callback(400, constant.messages.NO_RELATED_DIGICARDS);

            } else if (group_array.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_group_table,
                    KeyConditionExpression: "group_id = :group_id",
                    ExpressionAttributeValues: {
                        ":group_id": group_array[0],
                    },
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                group_array.forEach((element, index) => {
                    if (index < group_array.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(group_id = :group_id" + index + ") OR "
                        ExpressionAttributeValuesDynamic[':group_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(group_id = :group_id" + index + ")"
                        ExpressionAttributeValuesDynamic[':group_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_group_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}


exports.fetchGroupsData2 = async (request) => {
    try {
        const group_array = request.group_array;
        console.log({ group_array });
        if (group_array.length === 0) {
            throw new Error(constant.messages.NO_DATA);
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

        // Using BatchGetItem for multiple group_ids
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
                console.error("BatchGet Error: ", err);
                throw new Error("Error fetching groups from database");
            }
        }

        return allResults;
    } catch (error) {
        console.error("Error in fetchGroupsData:", error);
        throw new Error(error.message || "Failed to fetch groups data");
    }
}

exports.getGroupByIds = async (request) => {
    if (isEmptyArray(request)) return [];

    const groupDetailsParams = {
        RequestItems: {
            [TABLE_NAMES.upschool_group_table]: {
                Keys: request?.map(e => ({ group_id: e }))
            }
        }
    }

    return (await DATABASE_TABLE2.getByObjects(groupDetailsParams))?.Responses[TABLE_NAMES.upschool_group_table] ?? [];
}