const { getCurrentTimestamp, getRandomString } = require("../helper/helper");
const { DATABASE_TABLE2 } = require("./baseRepositoryNew");
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require("../constants");
const { common, constValues, messages } = require("../constants/constant");

exports.getTestQuestionPapersBasedonStatus2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND question_paper_status = :question_paper_status",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":question_paper_status": request.data.question_paper_status
        },
        ProjectionExpression: "question_paper_id, question_paper_name, blueprint_id , blueprint_type"
    };
    const data = await DATABASE_TABLE2.query(params);
    return data.Items;
};

exports.fetchTestQuestionPaperbyName2 = async (request) => {

    const readParams = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "lc_question_paper_name = :lc_question_paper_name",
        ExpressionAttributeValues: {
            ":lc_question_paper_name": request.data.question_paper_name.toLowerCase().replace(/ /g, ""),
            ":common_id": constValues.common_id,
        }
    };

    return await DATABASE_TABLE2.query(readParams);
};

exports.insertTestQuestionPaper2 = async (request) => {

    const insertQuestionPaperParams = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        Item: {
            question_paper_id: await getRandomString(),
            blueprint_id: request.data.blueprint_id,
            client_class_id: request.data.client_class_id,
            subject_id: request.data.subject_id,
            section_id: request.data.section_id,
            source_id: request.data.source_id,
            lc_question_paper_name: request.data.question_paper_name.toLowerCase().replace(/ /g, ""),
            question_paper_name: request.data.question_paper_name,
            question_paper_status: common.Active,
            chapter_id: request.data.chapter_ids,
            questions: request.data.questions,
            common_id: constValues.common_id,
            created_ts: getCurrentTimestamp(),
            updated_ts: getCurrentTimestamp(),
            blueprint_type: request.data.blueprint_type,
        }
    };

    await DATABASE_TABLE2.putItem(insertQuestionPaperParams);
    return { statusCode: 200, message: messages.INSERT_SUCCESS };

};

exports.fetchTestQuestionPaperByID2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        KeyConditionExpression: "question_paper_id = :question_paper_id",
        ExpressionAttributeValues: {
            ":question_paper_id": request.data.question_paper_id
        }

    };
    console.log(params);
    const data = await DATABASE_TABLE2.query(params);
    return data;
}

exports.getTestQuestionPaperById2 = async (request) => {

    const readParams = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        KeyConditionExpression: "question_paper_id = :question_paper_id",
        ExpressionAttributeValues: {
            ":question_paper_id": request.data.question_paper_id
        }
    };

    const result = await DATABASE_TABLE2.query(readParams);

    if (result.Items && result.Items.length > 0) {
        return { statusCode: 200, data: result.Items };
    } else {
        return { statusCode: 404, message: messages.QUESTION_PAPER_NOT_FOUND };
    }
};

exports.getTestQuestionPaperById3 = async (request) => {
    const question_paper_ids = [...new Set(request.question_paper_ids)]; // Remove duplicates

    if (question_paper_ids.length === 0) {
        return { statusCode: 400, message: messages.NO_QUESTION_PAPER_IDS_PROVIDED };
    }

    if (question_paper_ids.length === 1) {
        // Query directly if only one question_paper_id exists
        const readParams = {
            TableName: TABLE_NAMES.upschool_test_question_paper,
            KeyConditionExpression: "question_paper_id = :question_paper_id",
            ExpressionAttributeValues: {
                ":question_paper_id": question_paper_ids[0]
            }
        };

        const results = await DATABASE_TABLE2.query(readParams);
        return { statusCode: 200, data: results.Items };
    } else {
        const queryPromises = question_paper_ids.map((id) => {
            const readParams = {
                TableName: TABLE_NAMES.upschool_test_question_paper,
                KeyConditionExpression: "question_paper_id = :question_paper_id",
                ExpressionAttributeValues: {
                    ":question_paper_id": id
                }
            };
            return DATABASE_TABLE2.query(readParams);
        });

        const results = await Promise.all(queryPromises);
        const mergedResults = results.flatMap(result => result.Items || []);

        return { statusCode: 200, data: mergedResults };
    }
};

exports.getClassTestsBasedonIds2 = async (request) => {

    const readParams = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "class_test_status = :class_test_status AND question_paper_id = :question_paper_id",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":class_test_status": common.Active,
            ":question_paper_id": request.data.question_paper_id
        },
        ProjectionExpression: "class_test_name, question_paper_id",
    };

    return await DATABASE_TABLE2.query(readParams);
};

exports.updateQuestionPaperStatus2 = async function (request) {

    const updatedParams = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        Key: { question_paper_id: request.data.question_paper_id },
        UpdateExpression: "set question_paper_status = :question_paper_status, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":question_paper_status": request.data.question_paper_status,
            ":updated_ts": getCurrentTimestamp()
        }
    };

    await DATABASE_TABLE2.updateService(updatedParams);

    return { statusCode: 200, message: messages.QUESTION_PAPER_STATUS_UPDATED_SUCCESSFULLY };
};

exports.fetchAllTestsBasedonSubject2 = async (request) => {
    let filterExpression = "subject_id = :subject_id AND section_id = :section_id AND client_class_id = :client_class_id";

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

    let params = {
        TableName: TABLE_NAMES.upschool_quiz_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues
    };

    return await DATABASE_TABLE2.query(params);
}
exports.insertCustomWorkSheetQuestionPaper = async (request) => {
    console.log({ request });
    const insertQuestionPaperParams = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        Item: {
            question_paper_id: request.data.question_paper_id,
            student_id: request.data.student_id,
            student_name: request.data.student_name,
            section_id: request.data.section_id,
            subject_id: request.data.subject_id,
            client_class_id: request.data.client_class_id,
            test_id: request.data.test_id,
            questions: request.data.questions,
            question_paper_status: request.data.question_paper_status,
            question_paper_name: request.data.question_paper_name,
            blueprint_type: request.data.blueprint_type,
            question_paper_template: "",
            common_id: constValues.common_id,
            created_ts: getCurrentTimestamp(),
            updated_ts: getCurrentTimestamp(),
        }
    };

    await DATABASE_TABLE2.putItem(insertQuestionPaperParams);
    return { statusCode: 200, message: messages.INSERT_SUCCESS };

};

exports.fetchStudentWorksheet = async (request) => {
    let filterExpression = "subject_id = :subject_id AND section_id = :section_id AND client_class_id = :client_class_id AND blueprint_type=:blueprint_type AND student_id=:student_id AND question_paper_status=:question_paper_status";

    let expressionAttributeValues = {
        ":common_id": constValues.common_id,
        ":section_id": request.data.section_id,
        ":subject_id": request.data.subject_id,
        ":student_id": request.data.student_id,
        ":client_class_id": request.data.client_class_id,
        ":blueprint_type": common.customWorksheet,
        ":question_paper_status": common.customActive,
    };

    let params = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues
    };

    return await DATABASE_TABLE2.query(params);
}

exports.updateCustomWorkSheetQuestionPaper = async (request) => {
    const updateQuestionPaperParams = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        Key: {
            question_paper_id: request.data.question_paper_id,
        },
        UpdateExpression: "SET questions = :questions, updated_ts = :updated_ts ,test_id=:test_id,question_paper_name=:question_paper_name ,question_paper_template=:question_paper_template",
        ExpressionAttributeValues: {
            ":questions": request.data.questions,
            ":question_paper_name": request.data.question_paper_name,
            ":test_id": request.data.test_id,
            ":question_paper_template": "",
            ":updated_ts": getCurrentTimestamp(),
        }
    };
    await DATABASE_TABLE2.updateService(updateQuestionPaperParams);
    return { statusCode: 200, message: messages.UPDATE_SUCCESS };
}
exports.updateTemplateDetails = async (request) => {
    console.log({ request });
    const updateQuestionPaperParams = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        Key: {
            question_paper_id: request.data.question_paper_id,
        },
        UpdateExpression: "SET question_paper_template = :question_paper_template , updated_ts = :updated_ts , key_answer_template = :key_answer_template",
        ExpressionAttributeValues: {
            ":question_paper_template": request.data.question_paper_template,
            ":key_answer_template": request.data.key_answer_template,
            ":updated_ts": getCurrentTimestamp(),
        }
    };
    await DATABASE_TABLE2.updateService(updateQuestionPaperParams);
    return { statusCode: 200, message: messages.UPDATE_SUCCESS };
}

exports.fetchStudentWorksheetBasedOnTestId = async (request) => {
    let filterExpression = "subject_id = :subject_id AND section_id = :section_id AND client_class_id = :client_class_id AND blueprint_type=:blueprint_type AND student_id=:student_id AND test_id=:test_id AND question_paper_status = :question_paper_status";

    let expressionAttributeValues = {
        ":common_id": constValues.common_id,
        ":section_id": request.data.section_id,
        ":subject_id": request.data.subject_id,
        ":student_id": request.data.student_id,
        ":client_class_id": request.data.client_class_id,
        ":test_id": request.data.test_id,
        ":question_paper_status": common.customActive,
        ":blueprint_type": common.customWorksheet,
    };

    let params = {
        TableName: TABLE_NAMES.upschool_test_question_paper,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues
    };

    return await DATABASE_TABLE2.query(params);
}