const { getCurrentTimestamp } = require("../helper/helper");
const { DATABASE_TABLE2 } = require("./baseRepositoryNew");
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require("../constants");
const { constValues, messages } = require("../constants/constant");

exports.fetchUserDataByEmail2 = async (request) => {

    const queryParams = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "user_email = :user_email",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":user_email": request.data.user_email.toLowerCase()
        },
    };

    const result = await DATABASE_TABLE2.query(queryParams);
    return result;
};

exports.fetchUserDataByPhoneNo2 = async (request) => {

    const queryParams = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "user_phone_no = :user_phone_no",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":user_phone_no": request.data.user_email
        },
    };

    const result = await DATABASE_TABLE2.query(queryParams);
    return result;
};

exports.fetchUserDataByUserName2 = async (request) => {

    const queryParams = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "user_name = :user_name",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":user_name": request.data.user_email
        },
    };

    const result = await DATABASE_TABLE2.query(queryParams);
    return result;
};

exports.fetchUserDataByUserId2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        KeyConditionExpression: "teacher_id = :teacher_id",
        ExpressionAttributeValues: {
            ":teacher_id": request.teacher_id
        }
    };

    return await DATABASE_TABLE2.query(params);
}

exports.updateJwtToken2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        Key: {
            "teacher_id": request.teacher_id
        },
        UpdateExpression: "set user_jwt = :user_jwt, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":user_jwt": request.user_jwt,
            ":updated_ts": getCurrentTimestamp(),
        },
    };

    const result = await DATABASE_TABLE2.updateService(params);
    return result;
};

exports.updateUserOtp2 = async (request) => {

    const params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        Key: {
            "teacher_id": request.data.teacher_id,
        },
        UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":user_otp": request.data.user_otp,
            ":updated_ts": getCurrentTimestamp(),
        },
    };

    await DATABASE_TABLE2.updateService(params);
    return { statusCode: 200, body: messages.OTP_UPDATED_SUCCESSFULLY };
};

exports.resetUserOtp2 = async (request) => {

    const params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        Key: { "teacher_id": request.data.teacher_id },
        UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":user_otp": request.data.user_reset_otp,
            ":updated_ts": getCurrentTimestamp()
        },
    };

    await DATABASE_TABLE2.updateService(params);
    return { statusCode: 200, message: messages.OTP_UPDATED_SUCCESSFULLY };
};

exports.resetPassword2 = async (request) => {

    const params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        Key: { teacher_id: request.data.teacher_id },
        UpdateExpression: "set user_jwt = :user_jwt, user_salt = :user_salt, user_pwd = :user_pwd, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":user_jwt": request.data.user_jwt,
            ":user_salt": request.data.user_salt,
            ":user_pwd": request.data.user_pwd,
            ":updated_ts": getCurrentTimestamp()
        },
    };

    await DATABASE_TABLE2.updateService(params);
    return { statusCode: 200, message: messages.PASSWORD_RESET_SUCCESS };
};

exports.fetchTeacherEmailById2 = async (request) => {
    try {
        const params = {
            TableName: TABLE_NAMES.upschool_teacher_info,
            KeyConditionExpression: "teacher_id = :teacher_id",
            ExpressionAttributeValues: {
                ":teacher_id": request.data.teacher_id,
            },
            ProjectionExpression: "teacher_id, user_email",
        };
        return await DATABASE_TABLE2.query(params);
    } catch (error) {
        throw new Error(messages.FAILED_TO_FETCH_TEACHER_EMAIL);
    }
};

exports.changeUserStatus2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        Key: {
            "teacher_id": request.data.school_admin_id
        },
        UpdateExpression: "set user_status = :user_status, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":user_status": request.data.user_status,
            ":updated_ts": getCurrentTimestamp(),
        },
    };
    return await DATABASE_TABLE2.updateService(params);
}