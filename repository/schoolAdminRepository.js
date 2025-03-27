const { getCurrentTimestamp, getRandomString } = require("../helper/helper");
const { DATABASE_TABLE2 } = require("./baseRepositoryNew");
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require("../constants");
const { constValues, common } = require("../constants/constant");

exports.checkDuplicateAdminEmail2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "user_email = :user_email",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":user_email": request.data.school_admin_email
        }
    };
    return await DATABASE_TABLE2.query(params);
};

exports.insertSchoolAdmin2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        Item: {
            teacher_id: getRandomString(),
            school_id: request.data.school_id.toString(),
            user_email: request.data.school_admin_email.toLowerCase(),
            user_role: common.SchoolAdmin,
            user_status: common.Active,
            common_id: constValues.common_id,
            created_ts: getCurrentTimestamp(),
            updated_ts: getCurrentTimestamp()
        }
    };
    return (await DATABASE_TABLE2.putItem(params)).$metadata.httpStatusCode;
}

exports.updateSchoolAdmin2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        Key: {
            teacher_id: request.data.school_admin_id
        },
        UpdateExpression: "set user_email = :user_email, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":user_email": request.data.school_admin_email.toLowerCase(),
            ":updated_ts": getCurrentTimestamp()
        },
    };
    return await DATABASE_TABLE2.updateService(params);
}