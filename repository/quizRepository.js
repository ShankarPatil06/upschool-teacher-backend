const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.fetchQuizData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : QUIZ TABLE");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND quiz_status = :quiz_status AND chapter_id = :chapter_id AND learningType = :learningType",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":chapter_id": request.data.chapter_id,
                    ":learningType": request.data.learningType,
                    ":quiz_status": "Active"
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.fetchQuizData2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND quiz_status = :quiz_status AND chapter_id = :chapter_id AND learningType = :learningType",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":chapter_id": request.data.chapter_id,
                    ":learningType": request.data.learningType,
                    ":quiz_status": "Active"
                }
    };
    return await DATABASE_TABLE2.query(params); 
};

exports.addQuiz = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : QUIZ TABLE");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let insert_standard_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                Item: {
                    "quiz_id": request.data.quiz_id,
                    "quiz_name": request.data.quiz_name,
                    "lc_quiz_name": request.data.quiz_name.toLowerCase().replace(/ /g, ''),
                    "client_class_id": request.data.client_class_id,
                    "section_id": request.data.section_id,
                    "subject_id": request.data.subject_id,
                    "chapter_id": request.data.chapter_id,
                    "quizMode": request.data.quizMode,
                    "quizType": request.data.quizType,
                    "quizStartDate": { yyyy_mm_dd: request.data.quizStartDate, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.quizStartDate) },
                    "quizEndDate": { yyyy_mm_dd: request.data.quizEndDate, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.quizEndDate) },
                    "quizStartTime": request.data.quizStartTime,
                    "quizEndTime": request.data.quizEndTime,
                    "noOfQuestionsForAuto": request.data.noOfQuestionsForAuto,
                    "selectedTopics": request.data.selectedTopics,
                    "varient": request.data.varient,
                    "learningType": request.data.learningType,
                    "quiz_question_details": request.data.quiz_question_details,
                    "quiz_duration": request.data.quiz_duration,
                    "quiz_status": "Active",
                    "question_track_details": request.data.question_track_details,
                    "not_considered_topics": request.data.not_considered_topics,
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }

            DATABASE_TABLE.putRecord(docClient, insert_standard_params, callback);
        }
    });
}

exports.checkDuplicateQuizName = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : QUIZ TABLE");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        }
        else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "chapter_id = :chapter_id AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND  learningType = :learningType AND lc_quiz_name = :lc_quiz_name",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":chapter_id": request.data.chapter_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":learningType": request.data.learningType,
                    ":lc_quiz_name": request.data.quiz_name.toLowerCase().replace(/ /g, ''),
                }

            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    })
}
exports.checkDuplicateQuizName2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "chapter_id = :chapter_id AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND  learningType = :learningType AND lc_quiz_name = :lc_quiz_name",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":chapter_id": request.data.chapter_id,
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":learningType": request.data.learningType,
            ":lc_quiz_name": request.data.quiz_name.toLowerCase().replace(/ /g, ''),
        }

    };
    return await DATABASE_TABLE2.query(params);
}

exports.updateQuizTemplateDetails = function (request, callback) {
    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Error : updating class test Status!");
            callback(500, constant.messages.DATABASE_ERROR);
        }
        else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                Key: {
                    "quiz_id": request.data.quiz_id
                },
                UpdateExpression: "SET quiz_template_details = :quiz_template_details, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":quiz_template_details": request.data.quiz_template_details,
                    ":updated_ts": helper.getCurrentTimestamp()
                }
            }

            await DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    })
}

exports.updateQuizStatus = function (request, callback) {
    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Error : updating Quiz Status!");
            callback(500, constant.messages.DATABASE_ERROR);
        }
        else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                Key: {
                    "quiz_id": request.data.quiz_id
                },
                UpdateExpression: "SET quiz_status = :quiz_status, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":quiz_status": request.data.quiz_status,
                    ":updated_ts": await helper.getCurrentTimestamp(),
                }
            }
            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    })
}
exports.updateQuizStatus2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        Key: {
            "quiz_id": request.data.quiz_id
        },
        UpdateExpression: "SET quiz_status = :quiz_status, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":quiz_status": request.data.quiz_status,
            ":updated_ts": await helper.getCurrentTimestamp(),
        }
    };
 return await DATABASE_TABLE2.updateService(params);
}

exports.getQuizBasedonStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Fetch Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_status = :quiz_status AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":quiz_status": request.data.quiz_status
                },
                ProjectionExpression: ["quizMode", "quiz_status", "learningType", "quiz_id", "quiz_name", "chapter_id"],
            }
            if (request?.data?.chapter_id) {
                read_params.FilterExpression += " AND chapter_id = :chapter_id";
                read_params.ExpressionAttributeValues[":chapter_id"] = request.data.chapter_id;
            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.getQuizBasedonStatus2 = async (request) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    console.error("Fetch Quiz Data Database Error:", DBErr);
                    return reject(new Error(constant.messages.DATABASE_ERROR));
                }
                console.log("DynamoDB Connection Established ✅");
                resolve(db);
            });
        });

        const docClient = dynamoDBCall;
        let read_params = {
            TableName: TABLE_NAMES.upschool_quiz_table,
            IndexName: Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: "quiz_status = :quiz_status AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id",
            ExpressionAttributeValues: {
                ":common_id": constant.constValues.common_id,
                ":client_class_id": request.data.client_class_id,
                ":section_id": request.data.section_id,
                ":subject_id": request.data.subject_id,
                ":quiz_status": request.data.quiz_status
            },
            // ProjectionExpression: "quizMode, quiz_status, learningType, quiz_id, quiz_name, chapter_id"
        };

        if (request?.data?.chapter_id) {
            read_params.FilterExpression += " AND chapter_id = :chapter_id";
            read_params.ExpressionAttributeValues[":chapter_id"] = request.data.chapter_id;
        }

        console.log("Executing Query with Parameters:", JSON.stringify(read_params, null, 2));

        const result = await new Promise((resolve, reject) => {
            DATABASE_TABLE.queryRecord(docClient, read_params, (err, data) => {
                if (err) {
                    console.error("Error querying database:", err);
                    return reject(err);
                }
                console.log("Query Successful ✅ Data Received:", JSON.stringify(data, null, 2));
                resolve(data);
            });
        });

        return result.Items;
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        throw new Error(error.message || constant.messages.DATABASE_ERROR);
    }
};

// exports.getQuizBasedonStatus2 = async (request) => {

//     let filterExpression = "quiz_status = :quiz_status AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id";

//     let expressionAttributeValues = {
//         ":common_id": constant.constValues.common_id,
//         ":client_class_id": request.data.client_class_id,
//         ":section_id": request.data.section_id,
//         ":subject_id": request.data.subject_id,
//         ":quiz_status": request.data.quiz_status
//     };
//     if (request.data.chapter_id) {
//         filterExpression += " AND chapter_id = :chapter_id";
//         expressionAttributeValues[":chapter_id"] = request.data.chapter_id;
//     }
//     let params = {
//         TableName: TABLE_NAMES.upschool_quiz_table,
//         IndexName: Indexes.common_id_index,
//         KeyConditionExpression: "common_id = :common_id",
//         FilterExpression: filterExpression,
//         ExpressionAttributeValues: expressionAttributeValues,
//         ProjectionExpression: "quizMode, quiz_status, learningType, quiz_id, quiz_name, chapter_id"
//     };
//     const data = await DATABASE_TABLE2.query(params);
//     return data.Items;
// };


exports.fetchQuizDataById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                Key: {
                    "quiz_id": request.data.quiz_id
                }
            }

            DATABASE_TABLE.getRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchQuizDataById2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        Key: {
            "quiz_id": request.data.quiz_id
        }
    };

    return await DATABASE_TABLE2.getItem(params);
};

exports.getQuizResult = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Test Result Database Error");
            console.log(DBErr);
            callback(500, constant.messages.QUIZ_RESULT_DATA_DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            console.log("request : ", request);

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_id = :quiz_id AND student_id = :student_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":quiz_id": request.data.quiz_id,
                    ":student_id": request.data.student_id
                },
                ProjectionExpression: ["answer_metadata", "marks_details", "result_id", "evaluated"]
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.getQuizResult2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_id = :quiz_id AND student_id = :student_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":quiz_id": request.data.quiz_id,
                    ":student_id": request.data.student_id
                },
                ProjectionExpression: "answer_metadata, marks_details, result_id, evaluated"
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
}
exports.modifyStudentMarks = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                Key: {
                    "result_id": request.data.result_id
                },
                UpdateExpression: "set marks_details = :marks_details, updated_ts = :updated_ts, isPassed = :isPassed",
                ExpressionAttributeValues: {
                    ":marks_details": request.data.marks_details,
                    ":isPassed": request.data.passStatus,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}
exports.modifyStudentMarks2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
                Key: {
                    "result_id": request.data.result_id
                },
        UpdateExpression: "set marks_details = :marks_details, updated_ts = :updated_ts, isPassed = :isPassed, individual_group_performance = :individual_group_performance",
                ExpressionAttributeValues: {
                    ":marks_details": request.data.marks_details,
                    ":isPassed": request.data.passStatus,
                    ":updated_ts": helper.getCurrentTimestamp(),
                    ":individual_group_performance": request.data.individual_group_performance,
                },
    };
    const data = await DATABASE_TABLE2.updateService(params);
    return data;
}

exports.fetchQuizTemplates = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,

                KeyConditionExpression: "quiz_id = :quiz_id",
                FilterExpression: "quiz_status = :quiz_status",
                ExpressionAttributeValues: {
                    ":quiz_id": request.data.quiz_id,
                    ":quiz_status": request.data.quiz_status,
                },
                ProjectionExpression: ["quiz_id", "quiz_name", "quiz_template_details",]
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.fetchQuizTemplates2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,

                KeyConditionExpression: "quiz_id = :quiz_id",
                // FilterExpression: "quiz_status = :quiz_status",
                ExpressionAttributeValues: {
                    ":quiz_id": request.data.quiz_id,
                    // ":quiz_status": request.data.quiz_status,
                },
                ProjectionExpression: "quiz_id, quiz_name, quiz_template_details",
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
}


exports.checkPreQuiz = function(request, callback){
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            console.log("request", request);
            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "subject_id = :subject_id AND section_id = :section_id AND chapter_id = :chapter_id AND client_class_id = :client_class_id AND quiz_status = :quiz_status AND learningType = :learningType",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":quiz_status": request.data.quiz_status,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":chapter_id": request.data.chapter_id,
                    ":client_class_id": request.data.client_class_id,
                    ":learningType": request.data.learningType
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}


exports.fetchAllQuizBasedonSubject = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Quiz Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            console.log("request", request);
            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "subject_id = :subject_id AND section_id = :section_id AND client_class_id = :client_class_id AND quiz_status = :quiz_status",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":quiz_status": request.data.quiz_status,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":client_class_id": request.data.client_class_id,
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

// exports.fetchAllQuizBasedonSubject2 = async (request) => {
//     let filterExpression = "subject_id = :subject_id AND section_id = :section_id AND client_class_id = :client_class_id AND quiz_status = :quiz_status";

//     let expressionAttributeValues = {
//         ":common_id": constant.constValues.common_id,
//         ":quiz_status": request.data.quiz_status,
//         ":section_id": request.data.section_id,
//         ":subject_id": request.data.subject_id,
//         ":client_class_id": request.data.client_class_id,
//     };

//     if (request.data.learningType !== undefined) {
//         filterExpression += " AND learningType = :learningType";
//         expressionAttributeValues[":learningType"] = request.data.learningType;
//     }

//     if (request.data.quiz_id !== undefined && request.data.quiz_id !== "") {
//         filterExpression += " AND quiz_id = :quiz_id";
//         expressionAttributeValues[":quiz_id"] = request.data.quiz_id;
//     }

//     let params = {
//         TableName: TABLE_NAMES.upschool_quiz_table,
//         IndexName: Indexes.common_id_index,
//         KeyConditionExpression: "common_id = :common_id",
//         FilterExpression: filterExpression,
//         ExpressionAttributeValues: expressionAttributeValues
//     };

//     return await DATABASE_TABLE2.query(params);
// }

exports.fetchAllQuizBasedonSubject2 = async (request) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    console.error("Fetch Quiz Data Database Error:", DBErr);
                    return reject(new Error(constant.messages.DATABASE_ERROR));
                }
                console.log("DynamoDB Connection Established ✅");
                resolve(db);
            });
        });

        const docClient = dynamoDBCall;
        let filterExpression = "subject_id = :subject_id AND section_id = :section_id AND client_class_id = :client_class_id AND quiz_status = :quiz_status";
        let expressionAttributeValues = {
            ":common_id": constant.constValues.common_id,
            ":quiz_status": request.data.quiz_status,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":client_class_id": request.data.client_class_id,
        };

        if (request.data.learningType !== undefined) {
            filterExpression += " AND learningType = :learningType";
            expressionAttributeValues[":learningType"] = request.data.learningType;
        }

        if (request.data.quiz_id !== undefined && request.data.quiz_id !== "") {
            filterExpression += " AND quiz_id = :quiz_id";
            expressionAttributeValues[":quiz_id"] = request.data.quiz_id;
        }

        if (request.data?.start_date && request.data?.end_date) {
            filterExpression += " AND created_ts >= :start_date AND created_ts <= :end_date";
            expressionAttributeValues[":start_date"] = request.data.start_date;
            expressionAttributeValues[":end_date"] = request.data.end_date;
        }    

        let params = {
            TableName: TABLE_NAMES.upschool_quiz_table,
            IndexName: Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: filterExpression,
            ExpressionAttributeValues: expressionAttributeValues,
        };
        const result = await new Promise((resolve, reject) => {
            DATABASE_TABLE.queryRecord(docClient, params, (err, data) => {
                if (err) {
                    console.error("Error querying database:", err);
                    return reject(err);
                }
                console.log("Query Successful ✅ Data Received:", JSON.stringify(data, null, 2));
                resolve(data);
            });
        });

        return result;
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        throw new Error(error.message || constant.messages.DATABASE_ERROR);
    }
};

exports.getAllQuizData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Test Result Database Error");
            console.log(DBErr);
            callback(500, constant.messages.QUIZ_RESULT_DATA_DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            console.log("request : ", request);

            let read_params = {
                TableName: TABLE_NAMES.upschool_quiz_result,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "quiz_id = :quiz_id ",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":quiz_id": request.data.quiz_id,
                },
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

// exports.fetchAllQuizBasedonChapter = async (request) => {
//     let filterExpression = "chapter_id = :chapter_id AND quiz_status = :quiz_status AND subject_id = :subject_id AND client_class_id = :client_class_id AND section_id = :section_id AND learningType = :learningType";
//     let expressionAttributeValues = {
//         ":common_id": constant.constValues.common_id,
//         ":client_class_id": request.data.client_class_id,
//         ":subject_id": request.data.subject_id,
//         ":section_id": request.data.section_id,
//         ":chapter_id": request.data.chapter_id,
//         ":learningType": request.data.learningType,
//         ":quiz_status": "Active",
//     };

//     if (request.data.quiz_id !== undefined && request.data.quiz_id !== "") {
//         filterExpression += " AND quiz_id = :quiz_id";
//         expressionAttributeValues[":quiz_id"] = request.data.quiz_id;
//     }

//     let params = {
//         TableName: TABLE_NAMES.upschool_quiz_table,
//         IndexName: Indexes.common_id_index,
//         KeyConditionExpression: "common_id = :common_id",
//         FilterExpression: filterExpression,
//         ExpressionAttributeValues: expressionAttributeValues
//     };

//     return await DATABASE_TABLE2.query(params);
// };

// exports.fetchAllQuizBasedonChapter2 = async (request, chapterIds) => {
//     // Create placeholders for the chapter IDs
//     const chapterPlaceholders = chapterIds.map((_, index) => `:chapter_id_${index}`).join(", ");
//     console.log({ chapterPlaceholders });

//     // Initialize expression attribute values
//     const expressionAttributeValues = {
//         ":common_id": constant.constValues.common_id,
//         ":client_class_id": request.data.client_class_id,
//         ":subject_id": request.data.subject_id,
//         ":quiz_status": "Active",
//         ":section_id": request.data.section_id,
//     };

//     // Add chapter IDs to expression attribute values
//     chapterIds.forEach((id, index) => {
//         expressionAttributeValues[`:chapter_id_${index}`] = id;
//     });

//     console.log("expressionAttributeValues - ", expressionAttributeValues);

//     // Define params for DynamoDB query
//     let params = {
//         TableName: TABLE_NAMES.upschool_quiz_table,
//         IndexName: Indexes.common_id_index,
//         KeyConditionExpression: "common_id = :common_id",
//         FilterExpression: `chapter_id IN (${chapterPlaceholders}) AND quiz_status = :quiz_status AND subject_id = :subject_id AND client_class_id = :client_class_id AND section_id = :section_id`,
//         ExpressionAttributeValues: expressionAttributeValues, // Use the constructed object here
//     };

//     // Make the query call to DynamoDB
//     return await DATABASE_TABLE2.query(params);
// };


// exports.fetchAllQuizBasedonChapter2 = async (request, chapterIds) => {
//     const expressionAttributeValues = {
//         ":common_id": constant.constValues.common_id,
//         ":client_class_id": request.data.client_class_id,
//         ":subject_id": request.data.subject_id,
//         ":quiz_status": "Active",
//         ":section_id": request.data.section_id,
//     };

//     chapterIds.forEach((id, index) => {
//         expressionAttributeValues[`:chapter_id_${index}`] = id;
//     });

//     const chapterFilter = chapterIds.map((_, i) => `chapter_id = :chapter_id_${i}`).join(" OR ");

//     let params = {
//         TableName: TABLE_NAMES.upschool_quiz_table,
//         IndexName: Indexes.common_id_index,
//         KeyConditionExpression: "common_id = :common_id",
//         FilterExpression: `(${chapterFilter}) 
//                            AND quiz_status = :quiz_status 
//                            AND subject_id = :subject_id 
//                            AND client_class_id = :client_class_id 
//                            AND section_id = :section_id`,
//         ExpressionAttributeValues: expressionAttributeValues,
//     };
//     console.log("===================",await DATABASE_TABLE2.query(params));

//     return await DATABASE_TABLE2.query(params);
// };

exports.fetchAllQuizBasedonChapter = async (request) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    console.error("Fetch Quiz Data Database Error:", DBErr);
                    return reject(new Error(constant.messages.DATABASE_ERROR));
                }
                console.log("DynamoDB Connection Established ✅");
                resolve(db);
            });
        });

        const docClient = dynamoDBCall;
        let filterExpression = "chapter_id = :chapter_id AND quiz_status = :quiz_status AND subject_id = :subject_id AND client_class_id = :client_class_id AND section_id = :section_id AND learningType = :learningType";
        let expressionAttributeValues = {
            ":common_id": constant.constValues.common_id,
            ":client_class_id": request.data.client_class_id,
            ":subject_id": request.data.subject_id,
            ":section_id": request.data.section_id,
            ":chapter_id": request.data.chapter_id,
            // ":quiz_id": request.data.quiz_id, quiz_id = :quiz_id AND
            ":learningType": request.data.learningType,
            ":quiz_status": "Active",
        };

        if (request.data.quiz_id !== undefined && request.data.quiz_id !== "") {
            filterExpression += " AND quiz_id = :quiz_id";
            expressionAttributeValues[":quiz_id"] = request.data.quiz_id;
        }
        
        if (request.data?.start_date && request.data?.end_date) {
            filterExpression += " AND created_ts >= :start_date AND created_ts <= :end_date";
            expressionAttributeValues[":start_date"] = request.data.start_date;
            expressionAttributeValues[":end_date"] = request.data.end_date;
        } 

        let params = {
            TableName: TABLE_NAMES.upschool_quiz_table,
            IndexName: Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: filterExpression,
            ExpressionAttributeValues: expressionAttributeValues,
        };

        const result = await new Promise((resolve, reject) => {
            DATABASE_TABLE.queryRecord(docClient, params, (err, data) => {
                if (err) {
                    console.error("Error querying database:", err);
                    return reject(err);
                }
                console.log("Query Successful ✅ Data Received:", JSON.stringify(data, null, 2));
                resolve(data);
            });
        });

        return result;
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        throw new Error(error.message || constant.messages.DATABASE_ERROR);
    }
};

exports.fetchAllQuizBasedonChapter2 = async (request, chapterIds) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    console.error("Fetch Quiz Data Database Error:", DBErr);
                    return reject(new Error(constant.messages.DATABASE_ERROR));
                }
                console.log("DynamoDB Connection Established ✅");
                resolve(db);
            });
        });

        const docClient = dynamoDBCall;
        
        // Constructing Expression Attribute Values
        let expressionAttributeValues = {
            ":common_id": constant.constValues.common_id,
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":quiz_status": "Active",
        };

        // Constructing Chapter ID Filter
        const chapterFilter = chapterIds.map((id, index) => {
            expressionAttributeValues[`:chapter_id_${index}`] = id;
            return `chapter_id = :chapter_id_${index}`;
        }).join(" OR ");

        let read_params = {
            TableName: TABLE_NAMES.upschool_quiz_table,
            IndexName: Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: `(${chapterFilter}) 
                               AND quiz_status = :quiz_status 
                               AND subject_id = :subject_id 
                               AND client_class_id = :client_class_id 
                               AND section_id = :section_id`,
            ExpressionAttributeValues: expressionAttributeValues,
        };

        console.log("Executing Query with Parameters:", JSON.stringify(read_params, null, 2));

        const result = await new Promise((resolve, reject) => {
            DATABASE_TABLE.queryRecord(docClient, read_params, (err, data) => {
                if (err) {
                    console.error("Error querying database:", err);
                    return reject(err);
                }
                console.log("Query Successful ✅ Data Received:", JSON.stringify(data, null, 2));
                resolve(data);
            });
        });

        // Sorting by created timestamp (descending order)
        const sortedItems = result.Items.sort(
            (a, b) => new Date(b.created_ts) - new Date(a.created_ts)
        );

        return {Items : sortedItems};
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        throw new Error(error.message || constant.messages.DATABASE_ERROR);
    }
};





// exports.fetchAllQuizBasedOnSubject3 = async (request) => {
//     let filterExpression = "quiz_status = :quiz_status AND subject_id = :subject_id AND client_class_id = :client_class_id AND section_id = :section_id ";
//     let expressionAttributeValues = {
//         ":common_id": constant.constValues.common_id,
//         ":client_class_id": request.data.client_class_id,
//         ":subject_id": request.data.subject_id,
//         ":section_id": request.data.section_id,
//         ":quiz_status": "Active",
//     };

//     let params = {
//         TableName: TABLE_NAMES.upschool_quiz_table,
//         IndexName: Indexes.common_id_index,
//         KeyConditionExpression: "common_id = :common_id",
//         FilterExpression: filterExpression,
//         ExpressionAttributeValues: expressionAttributeValues
//     };

//     let result = await DATABASE_TABLE2.query(params);
//     const sortedItems = result.Items.sort(
//         (a, b) => new Date(b.created_ts) - new Date(a.created_ts)
//     );
//     return sortedItems;
// };

exports.fetchAllQuizBasedOnSubject3 = async (request) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    console.error("Fetch Quiz Data Database Error:", DBErr);
                    return reject(new Error(constant.messages.DATABASE_ERROR));
                }
                console.log("DynamoDB Connection Established ✅");
                resolve(db);
            });
        });

        const docClient = dynamoDBCall;
        let read_params = {
            TableName: TABLE_NAMES.upschool_quiz_table,
            IndexName: Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: "quiz_status = :quiz_status AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id",
            ExpressionAttributeValues: {
                ":common_id": constant.constValues.common_id,
                ":client_class_id": request.data.client_class_id,
                ":section_id": request.data.section_id,
                ":subject_id": request.data.subject_id,
                ":quiz_status": "Active"
            },
        };

        console.log("Executing Query with Parameters:", JSON.stringify(read_params, null, 2));

        const result = await new Promise((resolve, reject) => {
            DATABASE_TABLE.queryRecord(docClient, read_params, (err, data) => {
                if (err) {
                    console.error("Error querying database:", err);
                    return reject(err);
                }
                console.log("Query Successful ✅ Data Received:", JSON.stringify(data, null, 2));
                resolve(data);
            });
        });
        const sortedItems = result.Items.sort(
            (a, b) => new Date(b.created_ts) - new Date(a.created_ts)
        );
        return sortedItems;
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        throw new Error(error.message || constant.messages.DATABASE_ERROR);
    }
};