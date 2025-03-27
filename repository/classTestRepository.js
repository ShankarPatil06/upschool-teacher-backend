const { getDataByFilterKey, change_dd_mm_yyyy, getCurrentTimestamp } = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { common, constValues } = require('../constants/constant');

exports.getClassTestsBasedonStatus2 = async (request) => {

    const fromatedRequest = await getDataByFilterKey(request);
    let params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "class_test_id, class_test_name, class_test_mode, question_paper_id",
    };

    const data = await DATABASE_TABLE2.query(params);
    return data.Items;
}

exports.insertClassTest2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        Item: {
            class_test_id: request.data.class_test_id,
            question_paper_id: request.data.question_paper_id,
            client_class_id: request.data.client_class_id,
            section_id: request.data.section_id,
            subject_id: request.data.subject_id,
            class_test_name: request.data.class_test_name,
            lc_class_test_name: request.data.class_test_name.toLowerCase().replace(/ /g, ''),
            class_test_mode: request.data.class_test_mode,
            test_start_date: request.data.test_start_date === common.NA ? common.NA : { yyyy_mm_dd: request.data.test_start_date, dd_mm_yyyy: change_dd_mm_yyyy(request.data.test_start_date) },
            test_end_date: request.data.test_end_date === common.NA ? common.NA : { yyyy_mm_dd: request.data.test_end_date, dd_mm_yyyy: change_dd_mm_yyyy(request.data.test_end_date) },
            test_start_time: request.data.test_start_time,
            test_end_time: request.data.test_end_time,
            answer_sheet_template: request.data.answer_sheet_template,
            question_paper_template: request.data.question_paper_template,
            key_answer_template: request.data.key_answer_template,
            class_test_status: common.Active,
            common_id: constValues.common_id,
            created_ts: getCurrentTimestamp(),
            updated_ts: getCurrentTimestamp(),
        }
    }

    const data = (await DATABASE_TABLE2.putItem(params)).$metadata.httpStatusCode;
    return data;
}

exports.fetchClassTestByName2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "lc_class_test_name = :lc_class_test_name AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id",
        ExpressionAttributeValues: {
            ":lc_class_test_name": request.data.class_test_name.toLowerCase().replace(/ /g, ''),
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":common_id": constValues.common_id,
        }

    };

    const data = await DATABASE_TABLE2.query(params);
    return data;
}

exports.getClassTestIdAndName2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_class_test_table,

        KeyConditionExpression: "class_test_id = :class_test_id",
        FilterExpression: "class_test_status = :class_test_status",
        ExpressionAttributeValues: {
            ":class_test_id": request.data.class_test_id,
            ":class_test_status": request.data.class_test_status,
        },
        ProjectionExpression: "class_test_id, class_test_name, question_paper_id, answer_sheet_template, question_paper_template, key_answer_template"
    };

    const data = await DATABASE_TABLE2.query(params);
    return data;
};

exports.getStudentInfo = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_student_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "section_id = :section_id AND class_id = :class_id",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":class_id": request.data.class_id,
            ":section_id": request.data.section_id,
        }
    }

    return await DATABASE_TABLE2.query(params);
}

exports.fetchClassTestDataById2 = async (request) => {
    const readParams = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        Key: {
            class_test_id: request.data.class_test_id
        }
    };

    const result = await DATABASE_TABLE2.getItem(readParams);
    return result;
};

exports.updateClassTestStatus2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        Key: {
            class_test_id: request.data.class_test_id
        },
        UpdateExpression: "SET class_test_status = :class_test_status, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":class_test_status": request.data.class_test_status,
            ":updated_ts": getCurrentTimestamp(),
        }

    }
    const data = (await DATABASE_TABLE2.updateService(params)).$metadata.httpStatusCode;
    return data;
}

exports.fetchAllTestBasedOnSubject = async (request) => {

    let filterConditions = ["client_class_id = :client_class_id", "subject_id = :subject_id", "section_id = :section_id", "class_test_status = :class_test_status"];
    let expressionAttributeValues = {
        ":common_id": constValues.common_id,
        ":section_id": request.data.section_id,
        ":subject_id": request.data.subject_id,
        ":client_class_id": request.data.client_class_id,
        ":class_test_status": common.Active,
    };

    if (request.data?.class_test_id) {
        filterConditions.push("class_test_id = :class_test_id");
        expressionAttributeValues[":class_test_id"] = request.data.class_test_id;
    }
    if (request.data?.start_date && request.data?.end_date) {
        filterConditions.push("created_ts BETWEEN :start_date AND :end_date");
        expressionAttributeValues[":start_date"] = request.data.start_date;
        expressionAttributeValues[":end_date"] = request.data.end_date;
    }

    const params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: filterConditions.join(" AND "),
        ExpressionAttributeValues: expressionAttributeValues,
    };

    const result = await DATABASE_TABLE2.query(params);
    const sortedItems = result.Items.sort(
        (a, b) => new Date(b.created_ts) - new Date(a.created_ts)
    );

    return sortedItems;
}
