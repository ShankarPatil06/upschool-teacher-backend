const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.fetchTestDataOfStudent = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Fetch Test Data Of Student Error");
            console.log(DBErr);
            callback(500, constant.messages.TEST_RESULT_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_test_result,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "class_test_id = :class_test_id AND student_id = :student_id",
                ExpressionAttributeValues: {
                    ":class_test_id": request.data.class_test_id,
                    ":student_id": request.data.student_id,
                    ":common_id": constant.constValues.common_id
                }
            };

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchTestDataOfStudent2 = async (request) => {

        const readParams = {
            TableName: TABLE_NAMES.upschool_test_result,
            IndexName: Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: "class_test_id = :class_test_id AND student_id = :student_id",
            ExpressionAttributeValues: {
                ":class_test_id": request.data.class_test_id,
                ":student_id": request.data.student_id,
                ":common_id": constant.constValues.common_id
            }
        };

        const result = await DATABASE_TABLE2.query(readParams);
        return result;
};


exports.insertTestDataOfStudent = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : insert Test Data Of Student");
            console.log(DBErr);
            callback(500, constant.messages.TEST_RESULT_DATA_DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let insert_test_results_params = {
                TableName: TABLE_NAMES.upschool_test_result,
                Item: {
                    "result_id": helper.getRandomString(),
                    "student_id": request.data.student_id,
                    "class_test_id": request.data.class_test_id,
                    "answer_metadata": request.data.answer_metadata,
                    "common_id": constant.constValues.common_id,
                    "evaluated": "No",
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }

            DATABASE_TABLE.putRecord(docClient, insert_test_results_params, callback);
        }
    });
}
exports.insertTestDataOfStudent2 = async (request) => {
        const insertTestResultsParams = {
            TableName: TABLE_NAMES.upschool_test_result,
            Item: {
                "result_id": helper.getRandomString(),
                "student_id": request.data.student_id,
                "class_test_id": request.data.class_test_id,
                "answer_metadata": request.data.answer_metadata,
                "common_id": constant.constValues.common_id,
                "evaluated": "No",
                "created_ts": helper.getCurrentTimestamp(),
                "updated_ts": helper.getCurrentTimestamp(),
            }
        };

        const result = await DATABASE_TABLE2.putItem(insertTestResultsParams);
        return result;
};


exports.updateTestDataOfStudent = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Update Test Data Of Student Database Error");
            console.log(DBErr);
            callback(500, constant.messages.TEST_RESULT_DATA_DATABASE_ERROR)
        } else {

            console.log(request.data.answer_metadata);
            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_test_result,
                Key: {
                    "result_id": request.data.result_id
                },
                UpdateExpression: "set answer_metadata = :answer_metadata, updated_ts = :updated_ts, evaluated = :evaluated",
                ExpressionAttributeValues: {
                    ":answer_metadata": request.data.answer_metadata,
                    ":evaluated": "No",
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    });
}

exports.updateTestDataOfStudent2 = async function (request) {

        const updateParams = {
            TableName: TABLE_NAMES.upschool_test_result,
            Key: {
                "result_id": request.data.result_id
            },
            UpdateExpression: "set answer_metadata = :answer_metadata, updated_ts = :updated_ts, evaluated = :evaluated",
            ExpressionAttributeValues: {
                ":answer_metadata": request.data.answer_metadata,
                ":evaluated": "No",
                ":updated_ts": helper.getCurrentTimestamp(),
            },
        };

        const result = await DATABASE_TABLE2.updateService(updateParams);
        return result;

};


exports.fetchStudentresultMetadata = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Fetch Test Data Of Student Error");
            console.log(DBErr);
            callback(500, constant.messages.TEST_RESULT_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_test_result,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "class_test_id = :class_test_id AND evaluated = :evaluated",
                ExpressionAttributeValues: {
                    ":class_test_id": request.data.class_test_id,
                    ":evaluated": "No",
                    ":common_id": constant.constValues.common_id
                }
            };

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.fetchStudentresultMetadata2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_test_result,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "class_test_id = :class_test_id AND evaluated = :evaluated",
                ExpressionAttributeValues: {
                    ":class_test_id": request.data.class_test_id,
                    ":evaluated": "No",
                    ":common_id": constant.constValues.common_id
                }
        

    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
}

exports.fetchStudentresultMetadata3 = async (request) => {
    const class_test_id = [...new Set(request.class_test_id)]; // Remove duplicates
    const common_id = constant.constValues.common_id;

    // Create filter expression for multiple class_test_id
    const filterExpression = `(${class_test_id.map((_, index) => `class_test_id = :class_test_id${index}`).join(" OR ")}) AND evaluated = :evaluated`;
    
    const expressionAttributeValues = class_test_id.reduce((acc, testId, index) => {
        acc[`:class_test_id${index}`] = testId;
        return acc;
    }, { 
        ":common_id": common_id,
        ":evaluated": "Yes"
    });

    const params = {
        TableName: TABLE_NAMES.upschool_test_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
    };

    const result = await DATABASE_TABLE2.query(params);
    return result.Items;
};

exports.changeTestEvaluationStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Error : Reset Evaluate Status!");
            console.log(DBErr);
            callback(500, constant.messages.TEST_RESULT_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_test_result,
                Key: {
                    "result_id": request.data.result_id
                },
                UpdateExpression: "set updated_ts = :updated_ts, evaluated = :evaluated",
                ExpressionAttributeValues: {
                    ":evaluated": "No",
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    });
}
exports.changeTestEvaluationStatus2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_test_result,
                Key: {
                    "result_id": request.data.result_id
                },
                UpdateExpression: "set updated_ts = :updated_ts, evaluated = :evaluated",
                ExpressionAttributeValues: {
                    ":evaluated": "No",
                    ":updated_ts": helper.getCurrentTimestamp(),
                },

    }
    const data = (await DATABASE_TABLE2.updateService(params)).$metadata.httpStatusCode;
    return data;
}

exports.fetchTestResultOfAllStudent = async (request) => {

    const readParams = {
        TableName: TABLE_NAMES.upschool_test_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "class_test_id = :class_test_id  AND evaluated=:evaluated",
        ExpressionAttributeValues: {
            ":class_test_id": request.class_test_id,
            ":common_id": constant.constValues.common_id,
            ":evaluated": "Yes",
        }
    };

    const result = await DATABASE_TABLE2.query(readParams);
    return result.Items;
};