const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.fetchActiveBluePrints = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Blue Print Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_blueprint_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "blueprint_status = :blueprint_status",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":blueprint_status": request.data.blueprint_status
                },
                ProjectionExpression: ["blueprint_id", "blueprint_name", "description", "test_duration", "display_name"],
            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
// exports.fetchActiveBluePrints2 = async (request) => {
//     let params = {
//         TableName: TABLE_NAMES.upschool_blueprint_table,
//         IndexName: Indexes.common_id_index,
//         KeyConditionExpression: "common_id = :common_id",
//         FilterExpression: "blueprint_status = :blueprint_status AND blueprint_type = :blueprint_type",
//         ExpressionAttributeValues: {
//             ":common_id": constant.constValues.common_id,
//             ":blueprint_status": "Active",
//             ":blueprint_type": request.data.blueprint_type
//         },
//         ProjectionExpression: "blueprint_id, blueprint_name, description, test_duration, display_name",

//     };
//     const data = await DATABASE_TABLE2.query(params);
//     return data.Items;
// }

exports.fetchActiveBluePrints2 = async (request) => {
    // Base parameters for the query
    let params = {
        TableName: TABLE_NAMES.upschool_blueprint_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "blueprint_status = :blueprint_status AND blueprint_type = :blueprint_type AND subject_id = :subject_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":blueprint_status": "Active",
                    ":blueprint_type" : request.data.blueprint_type,
                    ":subject_id" : request.data.subject_id,

                },
                ProjectionExpression: "blueprint_id, blueprint_name, description, test_duration, display_name, school_ids",

    };
    const data= await DATABASE_TABLE2.query(params);
    return data.Items;
}
exports.fetchBlueprintById = function (request, callback) {
    console.log({ objecttttt: request });
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_blueprint_table,

                KeyConditionExpression: "blueprint_id = :blueprint_id",
                ExpressionAttributeValues: {
                    ":blueprint_id": request.data?.blueprint_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.fetchBluePrintData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};

            let blueprint_array = request.blueprint_array;
            console.log("blueprint_array : ", blueprint_array);

            if (blueprint_array.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_blueprint_table,
                    KeyConditionExpression: "blueprint_id = :blueprint_id",
                    ExpressionAttributeValues: {
                        ":blueprint_id": blueprint_array[0]
                    },
                    ProjectionExpression: ["blueprint_id", "blueprint_name"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log(" Chapter Else");
                blueprint_array.forEach((element, index) => {
                    console.log("element : ", element);

                    if (index < blueprint_array.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "blueprint_id = :blueprint_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':blueprint_id' + index] = element
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "blueprint_id = :blueprint_id" + index
                        ExpressionAttributeValuesDynamic[':blueprint_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_blueprint_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["blueprint_id", "blueprint_name"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}

// exports.fetchBluePrintData3 = async function (request) {
//     const blueprintArray = request.blueprint_array;
//     console.log("blueprint_array : ", blueprintArray);

//     if (blueprintArray.length === 1) {

//         const readParams = {
//             TableName: TABLE_NAMES.upschool_blueprint_table,
//             KeyConditionExpression: "blueprint_id = :blueprint_id",
//             ExpressionAttributeValues: {
//                 ":blueprint_id": blueprintArray[0]
//             },
//             ProjectionExpression: "blueprint_id, blueprint_name",
//         };

//         const result = await DATABASE_TABLE2.query(readParams);
//         return result.Items;

//     } else {

//         const batchGetParams = {
//             RequestItems: {
//                 [TABLE_NAMES.upschool_blueprint_table]: {
//                     Keys: blueprintArray.map(id => ({ blueprint_id: id })),
//                     ProjectionExpression: "blueprint_id, blueprint_name",
//                 }
//             }
//         };

//         const result = await DATABASE_TABLE2.getByObjects(batchGetParams);
//         return result.Responses[TABLE_NAMES.upschool_blueprint_table] || [];
//     }
// };




////////////////////////////////////////////////////////////////chunking
exports.fetchBluePrintData3 = async function (request) {
    const blueprintArray = request.blueprint_array;
    console.log("blueprint_array : ", blueprintArray);

    if (blueprintArray.length === 1) {
        const readParams = {
            TableName: TABLE_NAMES.upschool_blueprint_table,
            KeyConditionExpression: "blueprint_id = :blueprint_id",
            ExpressionAttributeValues: {
                ":blueprint_id": blueprintArray[0]
            },
            ProjectionExpression: "blueprint_id, blueprint_name",
        };

        const result = await DATABASE_TABLE2.query(readParams);
        return result.Items;
    } else {
        const chunkSize = 100;
        const chunks = [];

        for (let i = 0; i < blueprintArray.length; i += chunkSize) {
            chunks.push(blueprintArray.slice(i, i + chunkSize));
        }

        const allResults = [];

        // Process each chunk
        for (const chunk of chunks) {
            const batchGetParams = {
                RequestItems: {
                    [TABLE_NAMES.upschool_blueprint_table]: {
                        Keys: chunk.map(id => ({ blueprint_id: id })),
                        ProjectionExpression: "blueprint_id, blueprint_name",
                    }
                }
            };

            const result = await DATABASE_TABLE2.getByObjects(batchGetParams);
            const items = result.Responses[TABLE_NAMES.upschool_blueprint_table] || [];
            allResults.push(...items);
        }

        return allResults;
    }
};



exports.fetchBluePrintData2 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
    let params = {
        TableName: TABLE_NAMES.upschool_blueprint_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "blueprint_id, blueprint_name",

    };
    const data = await DATABASE_TABLE2.query(params);
    console.log("data - ", data);
    return data.Items;
}