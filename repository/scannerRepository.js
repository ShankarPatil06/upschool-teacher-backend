const { getCurrentTimestamp, getRandomString } = require("../helper/helper");
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require("../constants");
const { DATABASE_TABLE2 } = require("./baseRepositoryNew");
const { common, constValues } = require("../constants/constant");

exports.fetchScannerSessionData2 = async (request) => {
    const read_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "teacher_id = :teacher_id AND test_id = :test_id",
        ExpressionAttributeValues: {
            ":teacher_id": request.data.teacher_id,
            ":test_id": request.data.test_id,
            ":common_id": constValues.common_id
        }
    };
    return await DATABASE_TABLE2.query(read_params);
};

exports.updateUserOtpScannerData2 = async (request) => {
    const update_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        Key: {
            scanner_session_id: request.data.scanner_session_id
        },
        UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts, otp_ts = :otp_ts",
        ExpressionAttributeValues: {
            ":user_otp": request.data.user_otp,
            ":updated_ts": getCurrentTimestamp(),
            ":otp_ts": getCurrentTimestamp(),
        }
    };
    return await DATABASE_TABLE2.updateService(update_params);
};

exports.resetUserOtpScannerData2 = async (request) => {
    const update_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        Key: {
            scanner_session_id: request.data.scanner_session_id
        },
        UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts, otp_ts = :otp_ts",
        ExpressionAttributeValues: {
            ":user_otp": request.data.user_reset_otp,
            ":updated_ts": getCurrentTimestamp(),
            ":otp_ts": getCurrentTimestamp()
        }
    };
    return await DATABASE_TABLE2.updateService(update_params);
};

exports.insertUserOtpScannerData2 = async (request) => {
    let insert_user_otp_scanner_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        Item: {
            scanner_session_id: await getRandomString(),
            user_otp: request.data.user_otp,
            otp_ts: getCurrentTimestamp(),
            user_jwt: common.NA,
            jwt_ts: common.NA,
            teacher_id: request.data.teacher_id,
            test_id: request.data.test_id,
            test_type: request.data.test_type,
            common_id: constValues.common_id,
            created_ts: getCurrentTimestamp(),
            updated_ts: getCurrentTimestamp(),
        },
    };
    return DATABASE_TABLE2.putItem(insert_user_otp_scanner_params);
};

exports.updateScannerJwtToken2 = async (request) => {

    let update_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        Key: {
            scanner_session_id: request.scanner_session_id,
        },
        UpdateExpression: "set user_jwt = :user_jwt, updated_ts = :updated_ts, jwt_ts = :jwt_ts",
        ExpressionAttributeValues: {
            ":user_jwt": request.user_jwt,
            ":jwt_ts": getCurrentTimestamp(),
            ":updated_ts": getCurrentTimestamp(),
        },
    };
    return DATABASE_TABLE2.updateService(update_params);
};
