const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.fetchChapterByID = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.CHAPTER_DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.CHAPTER_DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_chapter_table,

                KeyConditionExpression: "chapter_id = :chapter_id",
                ExpressionAttributeValues: {
                    ":chapter_id": request.data.chapter_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.fetchChapterByID2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_chapter_table,

                KeyConditionExpression: "chapter_id = :chapter_id",
                ExpressionAttributeValues: {
                    ":chapter_id": request.data.chapter_id
                }
    };

    return await DATABASE_TABLE2.query(params);
}

exports.fetchChapterData = function (request, callback) {

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
            let unit_chapter_id = request.unit_chapter_id;
            console.log("unit_chapter_id : ", unit_chapter_id);
            if (unit_chapter_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_chapter_table,
                    KeyConditionExpression: "chapter_id = :chapter_id",
                    ExpressionAttributeValues: {
                        ":chapter_id": unit_chapter_id[0]
                    },
                    ProjectionExpression: ["chapter_id", "chapter_title", "chapter_status", "chapter_updated_ts"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log(" Chapter Else");
                unit_chapter_id.forEach((element, index) => {
                    console.log("element : ", element);

                    if (index < unit_chapter_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "chapter_id = :chapter_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':chapter_id' + index] = element
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "chapter_id = :chapter_id" + index
                        ExpressionAttributeValuesDynamic[':chapter_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_chapter_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["chapter_id", "chapter_title", "chapter_status", "chapter_updated_ts"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}
exports.fetchChapterData2 = async (request) => {
  
        const { unit_chapter_id } = request;

        if (unit_chapter_id.length === 1) {
            const readParams = {
                TableName: TABLE_NAMES.upschool_chapter_table,
                KeyConditionExpression: "chapter_id = :chapter_id",
                ExpressionAttributeValues: {
                    ":chapter_id": unit_chapter_id[0]
                },
                ProjectionExpression: "chapter_id, display_name, chapter_status, chapter_updated_ts",
            };

            const result = await DATABASE_TABLE2.query(readParams);
            return result.Items;
        } else {
            const readParams = {
                RequestItems: {
                    [TABLE_NAMES.upschool_chapter_table]: {
                        Keys: unit_chapter_id.map(id => ({ chapter_id: id })),
                        ProjectionExpression: "chapter_id, chapter_title, chapter_status, chapter_updated_ts"
                    }
                }
            };

            const result = await DATABASE_TABLE2.getByObjects(readParams);
            return result.Responses[TABLE_NAMES.upschool_chapter_table] || [];
        }
};

exports.fetchBulkChaptersIDName = function (request, callback) {

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
            let unit_chapter_id = request.unit_chapter_id;
            console.log("unit_chapter_id : ", unit_chapter_id);
            if (unit_chapter_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_chapter_table,
                    KeyConditionExpression: "chapter_id = :chapter_id",
                    ExpressionAttributeValues: {
                        ":chapter_id": unit_chapter_id[0]
                    },
                    ProjectionExpression: ["chapter_id", "chapter_title", "display_name", "prelearning_topic_id", "postlearning_topic_id"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log(" Chapter Else");
                unit_chapter_id.forEach((element, index) => {
                    console.log("element : ", element);

                    if (index < unit_chapter_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "chapter_id = :chapter_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':chapter_id' + index] = element
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "chapter_id = :chapter_id" + index
                        ExpressionAttributeValuesDynamic[':chapter_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_chapter_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["chapter_id", "chapter_title", "display_name", "prelearning_topic_id", "postlearning_topic_id"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}


exports.fetchBulkChaptersIDName2 = async (request) => {
    const unit_chapter_id = request.unit_chapter_id;

    console.log("unit_chapter_id34", unit_chapter_id);

    if (unit_chapter_id.length === 1) {

        const params = {
            TableName: TABLE_NAMES.upschool_chapter_table,
            KeyConditionExpression: "chapter_id = :chapter_id",
            ExpressionAttributeValues: {
                ":chapter_id": unit_chapter_id[0]
            },
            ProjectionExpression: "chapter_id, chapter_title, display_name, prelearning_topic_id, postlearning_topic_id",
        };

        const chapterData = await DATABASE_TABLE2.query(params);
        return chapterData.Items;
    } else {
        // Use BatchGetCommand for multiple chapter IDs
        const keys = unit_chapter_id.map((id) => ({ chapter_id: id }));
        const params = {
            RequestItems: {
                [TABLE_NAMES.upschool_chapter_table]: {
                    Keys: keys,
                    ProjectionExpression: "chapter_id, chapter_title, display_name, prelearning_topic_id, postlearning_topic_id",
                },
            },
        };

        const data = await DATABASE_TABLE2.getByObjects(params);
        return data.Responses[TABLE_NAMES.upschool_chapter_table]; // Return the fetched chapters
    }
};

exports.fetchChaptersIDandChapterTopicID = function (request, callback) {

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
            let chapter_array = request.chapter_array;
            console.log("chapter_array : ", chapter_array);
            if (chapter_array.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_chapter_table,
                    KeyConditionExpression: "chapter_id = :chapter_id",
                    ExpressionAttributeValues: {
                        ":chapter_id": chapter_array[0]
                    },
                    ProjectionExpression: ["chapter_id", "prelearning_topic_id", "postlearning_topic_id"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log(" Chapter Else");
                chapter_array.forEach((element, index) => {
                    console.log("element : ", element);

                    if (index < chapter_array.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "chapter_id = :chapter_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':chapter_id' + index] = element
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "chapter_id = :chapter_id" + index
                        ExpressionAttributeValuesDynamic[':chapter_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_chapter_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["chapter_id", "prelearning_topic_id", "postlearning_topic_id"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}
exports.fetchChaptersIDandChapterTopicID2 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_chapter_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "chapter_id, prelearning_topic_id, postlearning_topic_id"
    };
    console.log({params});
    const data = await DATABASE_TABLE2.query(params);
    console.log({data});
    return data;

};