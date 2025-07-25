const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { helper } = require('../helper');


exports.fetchUnitData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            console.log("fetchUnitData request : ", request);
            let subject_unit_id = request.subject_unit_id;
            console.log("subject_unit_id : ", subject_unit_id);
            if (subject_unit_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_unit_table,
                    KeyConditionExpression: "unit_id = :unit_id",
                    FilterExpression: "unit_status = :unit_status",
                    ExpressionAttributeValues: {
                        ":unit_id": subject_unit_id[0],
                        ":unit_status": "Active",
                    },
                    ProjectionExpression: ["unit_id", "unit_chapter_id", "unit_status", "unit_title", "display_name", "unit_updated_ts"],
                }
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                subject_unit_id.forEach((element, index) => {
                    if (index < subject_unit_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(unit_id = :unit_id" + index + " AND unit_status = :unit_status) OR "
                        ExpressionAttributeValuesDynamic[':unit_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(unit_id = :unit_id" + index + " AND unit_status = :unit_status)"
                        ExpressionAttributeValuesDynamic[':unit_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[":unit_status"] = "Active";

                let read_params = {
                    TableName: TABLE_NAMES.upschool_unit_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["unit_id", "unit_chapter_id", "unit_status", "unit_title", "display_name", "unit_updated_ts"],
                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}

// exports.fetchUnitData2 = async (request) => {

//     const subject_unit_id = request.subject_unit_id;

//     if (subject_unit_id.length === 1) {
//         const params = {
//             TableName: TABLE_NAMES.upschool_unit_table,
//             KeyConditionExpression: "unit_id = :unit_id",
//             FilterExpression: "unit_status = :unit_status",
//             ExpressionAttributeValues: {
//                 ":unit_id": subject_unit_id[0],
//                 ":unit_status": "Active",
//             },
//             ProjectionExpression: "unit_id, unit_chapter_id, display_name, unit_status, unit_title, unit_updated_ts",
//         };
//         const unit_data = await DATABASE_TABLE2.query(params);
//         return unit_data.Items;
//     } else {
//         const keys = subject_unit_id.map((id) => ({ unit_id: id }));
//         const params = {
//             RequestItems: {
//                 [TABLE_NAMES.upschool_unit_table]: {
//                     Keys: keys,
//                     ProjectionExpression: "unit_id, unit_chapter_id, display_name, unit_status, unit_title, unit_updated_ts",
//                 },
//             },
//         };
//         const data = await DATABASE_TABLE2.getByObjects(params);

//         const activeUnits = data.Responses[TABLE_NAMES.upschool_unit_table].filter(
//             (item) => item.unit_status === "Active"
//         );
//         return activeUnits;
//     }
// };


//chunk
exports.fetchUnitData2 = async (request) => {
    const subject_unit_id = [...new Set(request.subject_unit_id)]; // Remove duplicates for efficiency

    if (subject_unit_id.length === 1) {
        // Single unit ID - use query with FilterExpression for better performance
        const params = {
            TableName: TABLE_NAMES.upschool_unit_table,
            KeyConditionExpression: "unit_id = :unit_id",
            FilterExpression: "unit_status = :unit_status",
            ExpressionAttributeValues: {
                ":unit_id": subject_unit_id[0],
                ":unit_status": "Active",
            },
            ProjectionExpression: "unit_id, unit_chapter_id, display_name, unit_status, unit_title, unit_updated_ts",
        };

        const unit_data = await DATABASE_TABLE2.query(params);
        return unit_data.Items || [];
    } else {
        // Multiple unit IDs - use parallel chunking
        const CHUNK_SIZE = 100; // DynamoDB batch limit
        const chunks = helper.chunkArray(subject_unit_id, CHUNK_SIZE);
        const allActiveUnits = [];

        // Process chunks in parallel for better performance
        const chunkPromises = chunks.map(async (chunk) => {
            const keys = chunk.map((id) => ({ unit_id: id }));

            const params = {
                RequestItems: {
                    [TABLE_NAMES.upschool_unit_table]: {
                        Keys: keys,
                        ProjectionExpression: "unit_id, unit_chapter_id, display_name, unit_status, unit_title, unit_updated_ts",
                    },
                },
            };

            const data = await DATABASE_TABLE2.getByObjects(params);

            // Filter for active units from this chunk
            const chunkData = data.Responses && data.Responses[TABLE_NAMES.upschool_unit_table]
                ? data.Responses[TABLE_NAMES.upschool_unit_table]
                : [];

            return chunkData.filter((item) => item.unit_status === "Active");
        });

        // Wait for all chunks to complete and flatten results
        const chunkResults = await Promise.all(chunkPromises);

        // Flatten all active units from all chunks
        for (const chunkActiveUnits of chunkResults) {
            allActiveUnits.push(...chunkActiveUnits);
        }

        return allActiveUnits;
    }
};