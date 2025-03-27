const { getCurrentTimestamp } = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { constValues, common } = require('../constants/constant');

exports.getResult2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_test_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "class_test_id = :class_test_id AND student_id = :student_id",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":class_test_id": request.data.class_test_id,
            ":student_id": request.data.student_id
        },
        ProjectionExpression: "answer_metadata, marks_details, result_id, evaluated"
    };

    const data = await DATABASE_TABLE2.query(params);
    return data;
};

exports.modifyStudentMarks2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_test_result,
        Key: {
            "result_id": request.data.result_id
        },
        UpdateExpression: "set marks_details = :marks_details, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":marks_details": request.data.marks_details,
            ":updated_ts": getCurrentTimestamp()
        },
    }

    const data = await DATABASE_TABLE2.updateService(params);
    return data;
}

exports.fetchTestResultUsingClassTestId = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_test_result,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "class_test_id = :class_test_id AND evaluated = :evaluated",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":evaluated": common.Yes,
            ":class_test_id": request.class_test_id
        }
    };

    const data = await DATABASE_TABLE2.query(params);
    return data.Items;
}