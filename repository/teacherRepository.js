const { getCurrentTimestamp, getDataByFilterKey } = require("../helper/helper");
const { DATABASE_TABLE2 } = require("./baseRepositoryNew");
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require("../constants");
const { common, constValues, messages } = require("../constants/constant");

exports.fetchTeacherClientClassData2 = async (request) => {
    const fromatedRequest = await getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_client_class_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "client_class_id, client_class_name"
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
};

exports.fetchTeacherSectionData2 = async (request) => {
    const fromatedRequest = await getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_section_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "section_id, section_name"
    };
    console.log({ params });
    const data = await DATABASE_TABLE2.query(params);
    return data;
};

exports.fetchTeacherSubjectData2 = async (request) => {
    const fromatedRequest = await getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_subject_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "subject_id, display_name"
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
};

exports.fetchTeacherByID2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        KeyConditionExpression: "teacher_id = :teacher_id",
        ExpressionAttributeValues: {
            ":teacher_id": request.data.teacher_id
        }
    };

    return await DATABASE_TABLE2.query(params);
}

exports.updateTeacherInfo2 = async function (request) {
    try {

        let update_params = {
            TableName: TABLE_NAMES.upschool_teacher_info,
            Key: {
                teacher_id: request.teacher_id
            },
            UpdateExpression: "set teacher_info = :teacher_info, updated_ts = :updated_ts",
            ExpressionAttributeValues: {
                ":teacher_info": request.teacher_info,
                ":updated_ts": getCurrentTimestamp()
            },
        };

        const response = await DATABASE_TABLE2.updateService(update_params);
        return response;
    } catch (error) {
        throw { status: 500, message: messages.DATABASE_ERROR };
    }
};

exports.fetchTeacherActivityDetails2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teaching_activity,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND activity_status = :activity_status",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":activity_status": common.Active
        }
    };

    return await DATABASE_TABLE2.query(params);
}