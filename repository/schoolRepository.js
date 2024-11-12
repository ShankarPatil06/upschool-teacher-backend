const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.getSchoolDetailsById = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("School Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_school_info_table,
                KeyConditionExpression: "school_id = :school_id",
                ExpressionAttributeValues: {
                    ":school_id": request.data.school_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.getSchoolDetailsById2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_school_info_table,
        KeyConditionExpression: "school_id = :school_id",
        ExpressionAttributeValues: {
            ":school_id": request.data.school_id
        }
    };

    return await DATABASE_TABLE2.query(params);
}