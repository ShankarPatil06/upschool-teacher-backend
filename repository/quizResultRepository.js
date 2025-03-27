const { getCurrentTimestamp, getDataByFilterKey, getRandomString } = require("../helper/helper");
const { DATABASE_TABLE2 } = require("./baseRepositoryNew");
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require("../constants");
const { common, constValues } = require("../constants/constant");

exports.fetchQuizResultDataOfStudent2 = async (request) => {

    const params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id AND student_id = :student_id",
        ExpressionAttributeValues: {
            ":quiz_id": request.data.quiz_id,
            ":student_id": request.data.student_id,
            ":common_id": constValues.common_id
        }
    };
    return await DATABASE_TABLE2.query(params);
};

exports.insertQuizDataOfStudent2 = async (request) => {

    const insertQuizResultsParams = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        Item: {
            result_id: getRandomString(),
            student_id: request.data.student_id,
            quiz_id: request.data.quiz_id,
            answer_metadata: request.data.answer_metadata,
            common_id: constValues.common_id,
            evaluated: common.No,
            quiz_set: request.data.quiz_set,
            created_ts: getCurrentTimestamp(),
            updated_ts: getCurrentTimestamp(),
        }
    };

    const result = await DATABASE_TABLE2.putItem(insertQuizResultsParams);
    return result;

};

exports.updateQuizDataOfStudent2 = async (request) => {

    const updateParams = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        Key: {
            result_id: request.data.result_id
        },
        UpdateExpression: "SET answer_metadata = :answer_metadata, updated_ts = :updated_ts, evaluated = :evaluated, quiz_set = :quiz_set",
        ExpressionAttributeValues: {
            ":answer_metadata": request.data.answer_metadata,
            ":evaluated": common.No,
            ":updated_ts": getCurrentTimestamp(),
            ":quiz_set": request.data.quiz_set
        },
    };

    const result = await DATABASE_TABLE2.updateService(updateParams);
    return result;

};

exports.resetQuizEvaluationStatus2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        Key: {
            result_id: request.data.result_id
        },
        UpdateExpression: "set updated_ts = :updated_ts, evaluated = :evaluated",
        ExpressionAttributeValues: {
            ":evaluated": common.No,
            ":updated_ts": getCurrentTimestamp(),
        },

    }
    const data = (await DATABASE_TABLE2.updateService(params)).$metadata.httpStatusCode;
    return data;
}

exports.fetchStudentQuiRresultMetadata2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id AND evaluated = :evaluated",
        ExpressionAttributeValues: {
            ":quiz_id": request.data.quiz_id,
            ":evaluated": common.No,
            ":common_id": constValues.common_id
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
            ":common_id": constValues.common_id
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
            ":common_id": constValues.common_id
        }
    };

    return await DATABASE_TABLE2.query(params);
}

exports.fetchBulkQuizResultsByID3 = async (request) => {
    const fromatedRequest = await getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
    };

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
    const unit_Quiz_id = [...new Set(request.unit_Quiz_id)];
    const common_id = constValues.common_id;

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

exports.fetchBulkQuizResultsByID4 = async (request) => {
    const unit_Quiz_id = [...new Set(request.unit_Quiz_id)];
    const common_id = constValues.common_id;

    const filterExpression = `(${unit_Quiz_id.map((_, index) => `quiz_id = :quiz_id${index}`).join(" OR ")}) AND evaluated = :evaluated`;

    const expressionAttributeValues = unit_Quiz_id.reduce((acc, quizId, index) => {
        acc[`:quiz_id${index}`] = quizId;
        return acc;
    }, {
        ":common_id": common_id,
        ":evaluated": common.Yes
    });

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

exports.fetchStudentQuizResultMetadata3 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_quiz_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id AND evaluated = :evaluated",
        ExpressionAttributeValues: {
            ":quiz_id": request.quiz_id,
            ":evaluated": common.Yes,
            ":common_id": constValues.common_id
        }
    };

    let result = await DATABASE_TABLE2.query(params);
    return result.Items;
}