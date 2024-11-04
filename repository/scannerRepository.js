const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');

exports.fetchScannerSessionData = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Fetch Scanner Session Data Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_scanner_session_info,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "teacher_id = :teacher_id AND test_id = :test_id",
                ExpressionAttributeValues: {
                    ":teacher_id": request.data.teacher_id,
                    ":test_id": request.data.test_id,
                    ":common_id": constant.constValues.common_id
                }
            };

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchScannerSessionData2 = async (request) => {
    const read_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "teacher_id = :teacher_id AND test_id = :test_id",
        ExpressionAttributeValues: {
            ":teacher_id": request.data.teacher_id,
            ":test_id": request.data.test_id,
            ":common_id": constant.constValues.common_id
        }
    };

    return await DATABASE_TABLE2.query(read_params);
};


exports.updateUserOtpScannerData = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Scanner Data Table Error");
            console.log(DBErr);
            callback(500, constant.messages.SCANNER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_scanner_session_info,
                Key: {
                    "scanner_session_id": request.data.scanner_session_id
                },
                UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts, otp_ts = :otp_ts",
                ExpressionAttributeValues: {
                    ":user_otp": request.data.user_otp,
                    ":updated_ts": helper.getCurrentTimestamp(),
                    ":otp_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}

exports.updateUserOtpScannerData2 = async (request) => {
    const update_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        Key: {
            "scanner_session_id": request.data.scanner_session_id
        },
        UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts, otp_ts = :otp_ts",
        ExpressionAttributeValues: {
            ":user_otp": request.data.user_otp,
            ":updated_ts": helper.getCurrentTimestamp(),
            ":otp_ts": helper.getCurrentTimestamp(),
        }
    };

    return await DATABASE_TABLE2.updateService(update_params);
};


exports.resetUserOtpScannerData = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Scanner Data Table Error");
            console.log(DBErr);
            callback(500, constant.messages.SCANNER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_scanner_session_info,
                Key: {
                    "scanner_session_id": request.data.scanner_session_id
                },
                UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts, otp_ts = :otp_ts",
                ExpressionAttributeValues: {
                    ":user_otp": request.data.user_reset_otp,
                    ":updated_ts": helper.getCurrentTimestamp(),
                    ":otp_ts": helper.getCurrentTimestamp()
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}

exports.resetUserOtpScannerData2 = async (request) => {
    const update_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        Key: {
            "scanner_session_id": request.data.scanner_session_id
        },
        UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts, otp_ts = :otp_ts",
        ExpressionAttributeValues: {
            ":user_otp": request.data.user_reset_otp,
            ":updated_ts": helper.getCurrentTimestamp(),
            ":otp_ts": helper.getCurrentTimestamp()
        }
    };

    return await DATABASE_TABLE2.updateService(update_params);
};


exports.insertUserOtpScannerData = function (request, callback) {

    console.log("request : ", request);
    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let insert_user_otp_scanner_params = {
                TableName: TABLE_NAMES.upschool_scanner_session_info,
                Item: {
                    "scanner_session_id": await helper.getRandomString(),
                    "user_otp": request.data.user_otp,
                    "otp_ts": helper.getCurrentTimestamp(),
                    "user_jwt": "N.A.",
                    "jwt_ts": "N.A.",
                    "teacher_id": request.data.teacher_id,
                    "test_id": request.data.test_id,
                    "test_type": request.data.test_type,
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                },
            }
            DATABASE_TABLE.putRecord(docClient, insert_user_otp_scanner_params, callback);
        }
    });
}

exports.insertUserOtpScannerData2 = async (request) => {
    console.log("request : ", request);

    let insert_user_otp_scanner_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        Item: {
            "scanner_session_id": await helper.getRandomString(),
            "user_otp": request.data.user_otp,
            "otp_ts": helper.getCurrentTimestamp(),
            "user_jwt": "N.A.",
            "jwt_ts": "N.A.",
            "teacher_id": request.data.teacher_id,
            "test_id": request.data.test_id,
            "test_type": request.data.test_type,
            "common_id": constant.constValues.common_id,
            "created_ts": helper.getCurrentTimestamp(),
            "updated_ts": helper.getCurrentTimestamp(),
        },
    };

    return DATABASE_TABLE2.putItem(insert_user_otp_scanner_params);
};


exports.updateScannerJwtToken = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Login Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_LOGIN_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_scanner_session_info,
                Key: {
                    "scanner_session_id": request.scanner_session_id
                },
                UpdateExpression: "set user_jwt = :user_jwt, updated_ts = :updated_ts, jwt_ts = :jwt_ts",
                ExpressionAttributeValues: {
                    ":user_jwt": request.user_jwt,
                    ":jwt_ts": helper.getCurrentTimestamp(),
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    });
}

exports.updateScannerJwtToken2 = async (request) => {

    let update_params = {
        TableName: TABLE_NAMES.upschool_scanner_session_info,
        Key: {
            "scanner_session_id": request.scanner_session_id,
        },
        UpdateExpression: "set user_jwt = :user_jwt, updated_ts = :updated_ts, jwt_ts = :jwt_ts",
        ExpressionAttributeValues: {
            ":user_jwt": request.user_jwt,
            ":jwt_ts": helper.getCurrentTimestamp(),
            ":updated_ts": helper.getCurrentTimestamp(),
        },
    };

    return DATABASE_TABLE2.updateService(update_params);
};
