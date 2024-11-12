const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.getAllPresets = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Preset Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_presets_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "preset_status = :preset_status",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":preset_status": "Active",
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.getAllPresets2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_presets_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "preset_status = :preset_status",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":preset_status": "Active",
                }

    };
    console.log({params});
    const data = await DATABASE_TABLE2.query(params);
    console.log({data});
    return data;
}
