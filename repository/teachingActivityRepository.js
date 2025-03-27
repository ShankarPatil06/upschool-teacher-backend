const { getCurrentTimestamp, getRandomString } = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { common, constValues } = require('../constants/constant');

exports.fetchTeachingActivity2 = async (request) => {
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

exports.updateTeachingActivity2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teaching_activity,
        Key: {
            activity_id: request.data.activity_id
        },
        UpdateExpression: "set chapter_data = :chapter_data, updated_ts = :updated_ts, updated_by = :updated_by",
        ExpressionAttributeValues: {
            ":chapter_data": request.data.chapter_data,
            ":updated_by": request.data.teacher_id,
            ":updated_ts": getCurrentTimestamp()
        },
    };
    return await DATABASE_TABLE2.updateService(params);
}

exports.updateTeachingDigiCardActivity2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teaching_activity,
        Key: {
            activity_id: request.data.activity_id
        },
        UpdateExpression: "set digicard_activities = :digicard_activities, updated_ts = :updated_ts, updated_by = :updated_by",
        ExpressionAttributeValues: {
            ":digicard_activities": request.data.digicard_activities,
            ":updated_by": request.data.teacher_id,
            ":updated_ts": getCurrentTimestamp()
        },
    };
    return await DATABASE_TABLE2.updateService(params);
}

exports.addTeachingActivity2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_teaching_activity,
        Item: {
            activity_id: getRandomString(),
            client_class_id: request.data.client_class_id,
            section_id: request.data.section_id,
            subject_id: request.data.subject_id,
            chapter_data: request.data.chapter_data,
            digicard_activities: request.data.digicard_activities,
            activity_status: common.Active,
            updated_by: request.data.teacher_id,
            common_id: constValues.common_id,
            created_ts: getCurrentTimestamp(),
            updated_ts: getCurrentTimestamp(),
        }

    }
    return (await DATABASE_TABLE2.putItem(params)).$metadata.httpStatusCode;
}