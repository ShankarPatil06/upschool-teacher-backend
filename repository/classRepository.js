const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.getClientClassIdAndName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_client_class_table,

                KeyConditionExpression: "client_class_id = :client_class_id",
                ExpressionAttributeValues: {
                    ":client_class_id": request.data.client_class_id
                },
                ProjectionExpression: ["client_class_id", "client_class_name"]
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.getIndividualClientClassById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_client_class_table,

                KeyConditionExpression: "client_class_id = :client_class_id",
                ExpressionAttributeValues: {
                    ":client_class_id": request.data.client_class_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.getResult2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_test_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "class_test_id = :class_test_id AND student_id = :student_id",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":class_test_id": request.data.class_test_id,
            ":student_id": request.data.student_id
        },
        ProjectionExpression: "answer_metadata, marks_details, result_id, evaluated"
    };

    const data = await DATABASE_TABLE2.query(params);
    return data;
};
exports.modifyStudentMarks = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_test_result,
                Key: {
                    "result_id": request.data.result_id
                },
                UpdateExpression: "set marks_details = :marks_details, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":marks_details": request.data.marks_details,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}
exports.modifyStudentMarks2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_test_result,
        Key: {
            "result_id": request.data.result_id
        },
        UpdateExpression: "set marks_details = :marks_details, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":marks_details": request.data.marks_details,
            ":updated_ts": helper.getCurrentTimestamp()
        },

    }
    const data = await DATABASE_TABLE2.updateService(params);
    return data;
}