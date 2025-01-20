const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.fetchQuizResultDataOfStudent = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Fetch Quiz Data Of Student Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_id = :quiz_id AND student_id = :student_id",
                ExpressionAttributeValues: {
                    ":quiz_id": request.data.quiz_id,
                    ":student_id": request.data.student_id,
                    ":common_id": constant.constValues.common_id
                }
            };

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchQuizResultDataOfStudent2 = async (request) => {

    const params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id AND student_id = :student_id",
        ExpressionAttributeValues: {
            ":quiz_id": request.data.quiz_id,
            ":student_id": request.data.student_id,
            ":common_id": constant.constValues.common_id
        }
    };

    return await DATABASE_TABLE2.query(params);
};


exports.insertQuizDataOfStudent = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : insert Quiz Data Of Student");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let insert_quiz_results_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                Item: {
                    "result_id": helper.getRandomString(),
                    "student_id": request.data.student_id,
                    "quiz_id": request.data.quiz_id,
                    "answer_metadata": request.data.answer_metadata,
                    "common_id": constant.constValues.common_id,
                    "evaluated": "No",
                    "quiz_set": request.data.quiz_set,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }

            DATABASE_TABLE.putRecord(docClient, insert_quiz_results_params, callback);
        }
    });
}

exports.insertQuizDataOfStudent2 = async (request) => {

    const insertQuizResultsParams = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        Item: {
            "result_id": helper.getRandomString(),
            "student_id": request.data.student_id,
            "quiz_id": request.data.quiz_id,
            "answer_metadata": request.data.answer_metadata,
            "common_id": constant.constValues.common_id,
            "evaluated": "No",
            "quiz_set": request.data.quiz_set,
            "created_ts": helper.getCurrentTimestamp(),
            "updated_ts": helper.getCurrentTimestamp(),
        }
    };

    const result = await DATABASE_TABLE2.putItem(insertQuizResultsParams);
    return result;

};



exports.updateQuizDataOfStudent = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Update Quiz Data Of Student Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            console.log(request.data.answer_metadata);
            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                Key: {
                    "result_id": request.data.result_id
                },
                UpdateExpression: "SET answer_metadata = :answer_metadata, updated_ts = :updated_ts, evaluated = :evaluated, quiz_set = :quiz_set",
                ExpressionAttributeValues: {
                    ":answer_metadata": request.data.answer_metadata,
                    ":evaluated": "No",
                    ":updated_ts": helper.getCurrentTimestamp(),
                    ":quiz_set": request.data.quiz_set
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    });
}

exports.updateQuizDataOfStudent2 = async (request) => {

    const updateParams = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        Key: {
            "result_id": request.data.result_id
        },
        UpdateExpression: "SET answer_metadata = :answer_metadata, updated_ts = :updated_ts, evaluated = :evaluated, quiz_set = :quiz_set",
        ExpressionAttributeValues: {
            ":answer_metadata": request.data.answer_metadata,
            ":evaluated": "No",
            ":updated_ts": helper.getCurrentTimestamp(),
            ":quiz_set": request.data.quiz_set
        },
    };

    const result = await DATABASE_TABLE2.updateService(updateParams);
    return result;

};


exports.resetQuizEvaluationStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Error : Reset Quiz Evaluate Status!");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
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
exports.resetQuizEvaluationStatus2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
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

exports.fetchStudentQuiRresultMetadata = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Fetch Test Data Of Student Error");
            console.log(DBErr);
            callback(500, constant.messages.TEST_RESULT_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_id = :quiz_id AND evaluated = :evaluated",
                ExpressionAttributeValues: {
                    ":quiz_id": request.data.quiz_id,
                    ":evaluated": "No",
                    ":common_id": constant.constValues.common_id
                }
            };

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchStudentQuiRresultMetadata2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id AND evaluated = :evaluated",
        ExpressionAttributeValues: {
            ":quiz_id": request.data.quiz_id,
            ":evaluated": "No",
            ":common_id": constant.constValues.common_id
        }
    };

    return await DATABASE_TABLE2.query(params);
}

exports.fetchQuizResultByQuizId = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id",
        ExpressionAttributeValues: {
            ":quiz_id": request.data.quiz_id,
            ":common_id": constant.constValues.common_id
        }
    };

    return await DATABASE_TABLE2.query(params);
}

exports.fetchQuizResultDataOfStudentNew = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id AND student_id = :student_id",
        ExpressionAttributeValues: {
            ":quiz_id": request.data.quiz_id,
            ":student_id": request.data.student_id,
            ":common_id": constant.constValues.common_id
        }
    };

    return await DATABASE_TABLE2.query(params);
}

exports.fetchBulkQuizResultsByID = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            console.log("fetchQuizData request : ", request);
            let unit_Quiz_id = request.unit_Quiz_id;
            console.log("unit_Quiz_id : ", unit_Quiz_id);
            if (unit_Quiz_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_quiz_result,
                    IndexName: Indexes.common_id_index,
                    KeyConditionExpression: "common_id = :common_id",
                    FilterExpression: "quiz_id = :quiz_id",
                    ExpressionAttributeValues: {
                        ":quiz_id": unit_Quiz_id[0],
                        ":common_id": constant.constValues.common_id
                    }
                };

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log(" Chapter Else");
                unit_Quiz_id.forEach((element, index) => {
                    console.log("element : ", element);

                    if (index < unit_Quiz_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "quiz_id = :quiz_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':quiz_id' + index] = element
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "quiz_id = :quiz_id" + index
                        ExpressionAttributeValuesDynamic[':quiz_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_quiz_result,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    // ProjectionExpression: ["quiz_id", "isPassed", "student_id" ],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}
exports.fetchBulkQuizResultsByID3 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
    console.log("testrequest", request);
    const params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
    };

    console.log({ params });

    try {
        const result = await DATABASE_TABLE2.query(params);
        console.log({ result });

        return result.Items;
    } catch (error) {
        console.error(`Error fetching quiz results:`, error);
        throw error;
    }
};

exports.fetchBulkQuizResultsByID2 = async (request) => {
    const unit_Quiz_id = [...new Set(request.unit_Quiz_id)]; // Remove duplicates
    const common_id = constant.constValues.common_id;

    // Create filter expression for multiple quiz_id
    const filterExpression = unit_Quiz_id.map((_, index) => `quiz_id = :quiz_id${index}`).join(" OR ");
    const expressionAttributeValues = unit_Quiz_id.reduce((acc, quizId, index) => {
        acc[`:quiz_id${index}`] = quizId;
        return acc;
    }, { ":common_id": common_id });

    const params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
    };

    const result = await DATABASE_TABLE2.query(params);
    return result.Items;
};

exports.fetchStudentQuiRresultMetadata3 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_id = :quiz_id AND evaluated = :evaluated",
                ExpressionAttributeValues: {
                    ":quiz_id": request.quiz_id,
                    ":evaluated": "Yes",
                    ":common_id": constant.constValues.common_id
                }
    };

    let result= await DATABASE_TABLE2.query(params);
    return result.Items;
}