const { change_dd_mm_yyyy, getCurrentTimestamp } = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { messages, common, constValues } = require('../constants/constant');
const { DATABASE_TABLE } = require('./baseRepository');

exports.fetchQuizData2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND quiz_status = :quiz_status AND chapter_id = :chapter_id AND learningType = :learningType",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":chapter_id": request.data.chapter_id,
            ":learningType": request.data.learningType,
            ":quiz_status": common.Active
        }
    };
    return await DATABASE_TABLE2.query(params);
};

exports.addQuiz2 = async (request) => {
    try {
        const { data } = request;

        if (!data || !data.quiz_id) {
            throw new Error(messages.INVALID_REQUEST);
        }

        const insert_standard_params = {
            TableName: TABLE_NAMES.upschool_quiz_table,
            Item: {
                quiz_id: data.quiz_id,
                quiz_name: data.quiz_name,
                lc_quiz_name: data.quiz_name.toLowerCase().replace(/ /g, ''),
                client_class_id: data.client_class_id,
                section_id: data.section_id,
                subject_id: data.subject_id,
                chapter_id: data.chapter_id,
                quizMode: data.quizMode,
                quizType: data.quizType,
                quizStartDate: { yyyy_mm_dd: data.quizStartDate, dd_mm_yyyy: change_dd_mm_yyyy(data.quizStartDate) },
                quizEndDate: { yyyy_mm_dd: data.quizEndDate, dd_mm_yyyy: change_dd_mm_yyyy(data.quizEndDate) },
                quizStartTime: data.quizStartTime,
                quizEndTime: data.quizEndTime,
                noOfQuestionsForAuto: data.noOfQuestionsForAuto,
                selectedTopics: data.selectedTopics,
                varient: data.varient,
                learningType: data.learningType,
                quiz_question_details: data.quiz_question_details,
                quiz_duration: data.quiz_duration,
                quiz_status: common.Active,
                question_track_details: data.question_track_details,
                not_considered_topics: data.not_considered_topics,
                common_id: constValues.common_id,
                created_ts: getCurrentTimestamp(),
                updated_ts: getCurrentTimestamp(),
            },
        };

        await DATABASE_TABLE2.putItem(insert_standard_params);
        return { message: messages.QUIZ_ADDED_SUCCESS };

    } catch (error) {
        throw new Error(messages.DATABASE_ERROR);
    }
};

exports.checkDuplicateQuizName2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "chapter_id = :chapter_id AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND  learningType = :learningType AND lc_quiz_name = :lc_quiz_name",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
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

exports.updateQuizStatus2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        Key: {
            quiz_id: request.data.quiz_id
        },
        UpdateExpression: "SET quiz_status = :quiz_status, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":quiz_status": request.data.quiz_status,
            ":updated_ts": await getCurrentTimestamp(),
        }
    };
    return await DATABASE_TABLE2.updateService(params);
}

exports.getQuizBasedonStatus2 = async (request) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    return reject(new Error(messages.DATABASE_ERROR));
                }
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
                ":common_id": constValues.common_id,
                ":client_class_id": request.data.client_class_id,
                ":section_id": request.data.section_id,
                ":subject_id": request.data.subject_id,
                ":quiz_status": request.data.quiz_status
            },
        };

        if (request?.data?.chapter_id) {
            read_params.FilterExpression += " AND chapter_id = :chapter_id";
            read_params.ExpressionAttributeValues[":chapter_id"] = request.data.chapter_id;
        }

        const result = await new Promise((resolve, reject) => {
            DATABASE_TABLE.queryRecord(docClient, read_params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });

        return result.Items;
    } catch (error) {
        throw new Error(error.message || messages.DATABASE_ERROR);
    }
};

exports.fetchQuizDataById2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        Key: {
            quiz_id: request.data.quiz_id
        }
    };

    return await DATABASE_TABLE2.getItem(params);
};

exports.getQuizResult2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id AND student_id = :student_id",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":quiz_id": request.data.quiz_id,
            ":student_id": request.data.student_id
        },
        ProjectionExpression: "answer_metadata, marks_details, result_id, evaluated"
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
}

exports.modifyStudentMarks2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        Key: {
            result_id: request.data.result_id
        },
        UpdateExpression: "set marks_details = :marks_details, updated_ts = :updated_ts, isPassed = :isPassed, individual_group_performance = :individual_group_performance",
        ExpressionAttributeValues: {
            ":marks_details": request.data.marks_details,
            ":isPassed": request.data.passStatus,
            ":updated_ts": getCurrentTimestamp(),
            ":individual_group_performance": request.data.individual_group_performance,
        },
    };
    const data = await DATABASE_TABLE2.updateService(params);
    return data;
}

exports.fetchQuizTemplates2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,

        KeyConditionExpression: "quiz_id = :quiz_id",
        ExpressionAttributeValues: {
            ":quiz_id": request.data.quiz_id,
        },
        ProjectionExpression: "quiz_id, quiz_name, quiz_template_details",
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
}

exports.fetchAllQuizBasedonSubject2 = async (request) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    return reject(new Error(messages.DATABASE_ERROR));
                }
                resolve(db);
            });
        });

        const docClient = dynamoDBCall;
        let filterExpression = "subject_id = :subject_id AND section_id = :section_id AND client_class_id = :client_class_id AND quiz_status = :quiz_status";
        let expressionAttributeValues = {
            ":common_id": constValues.common_id,
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
                    return reject(err);
                }
                resolve(data);
            });
        });

        return result;
    } catch (error) {
        throw new Error(error.message || messages.DATABASE_ERROR);
    }
};

exports.getAllQuizData2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":quiz_id": request.data.quiz_id,
        },
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
};

exports.fetchAllQuizBasedonChapter = async (request) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    return reject(new Error(messages.DATABASE_ERROR));
                }
                resolve(db);
            });
        });

        const docClient = dynamoDBCall;
        let filterExpression = "chapter_id = :chapter_id AND quiz_status = :quiz_status AND subject_id = :subject_id AND client_class_id = :client_class_id AND section_id = :section_id AND learningType = :learningType";
        let expressionAttributeValues = {
            ":common_id": constValues.common_id,
            ":client_class_id": request.data.client_class_id,
            ":subject_id": request.data.subject_id,
            ":section_id": request.data.section_id,
            ":chapter_id": request.data.chapter_id,
            ":learningType": request.data.learningType,
            ":quiz_status": common.Active,
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
                    return reject(err);
                }
                resolve(data);
            });
        });

        return result;
    } catch (error) {
        throw new Error(error.message || messages.DATABASE_ERROR);
    }
};

exports.fetchAllQuizBasedonChapter2 = async (request, chapterIds) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    return reject(new Error(messages.DATABASE_ERROR));
                }
                resolve(db);
            });
        });

        const docClient = dynamoDBCall;

        let expressionAttributeValues = {
            ":common_id": constValues.common_id,
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":quiz_status": common.Active,
        };

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

        const result = await new Promise((resolve, reject) => {
            DATABASE_TABLE.queryRecord(docClient, read_params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });

        const sortedItems = result.Items.sort(
            (a, b) => new Date(b.created_ts) - new Date(a.created_ts)
        );

        return { Items: sortedItems };
    } catch (error) {
        throw new Error(error.message || messages.DATABASE_ERROR);
    }
};

exports.fetchAllQuizBasedOnSubject3 = async (request) => {
    try {
        const dynamoDBCall = await new Promise((resolve, reject) => {
            dynamoDbCon.getDB((DBErr, db) => {
                if (DBErr) {
                    return reject(new Error(messages.DATABASE_ERROR));
                }
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
                ":common_id": constValues.common_id,
                ":client_class_id": request.data.client_class_id,
                ":section_id": request.data.section_id,
                ":subject_id": request.data.subject_id,
                ":quiz_status": common.Active
            },
        };
        const result = await new Promise((resolve, reject) => {
            DATABASE_TABLE.queryRecord(docClient, read_params, (err, data) => {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });
        const sortedItems = result.Items.sort(
            (a, b) => new Date(b.created_ts) - new Date(a.created_ts)
        );
        return sortedItems;
    } catch (error) {
        throw new Error(error.message || messages.DATABASE_ERROR);
    }
};