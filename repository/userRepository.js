const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.fetchUserDataByEmail = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_DATA_DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            console.log("request : ", request);

            let read_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "user_email = :user_email",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":user_email": request.data.user_email.toLowerCase()
                },
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

exports.fetchUserDataByEmail2 = async (request) => {

        const queryParams = {
            TableName: TABLE_NAMES.upschool_teacher_info,
            IndexName: Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: "user_email = :user_email",
            ExpressionAttributeValues: {
                ":common_id": constant.constValues.common_id,
                ":user_email": request.data.user_email.toLowerCase()
            },
        };

        const result = await DATABASE_TABLE2.query(queryParams);
        return result;

};

exports.fetchUserDataByPhoneNo = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                // IndexName: indexName.Indexes.user_phone_no_index,
                // KeyConditionExpression: "user_phone_no = :user_phone_no",
                // ExpressionAttributeValues: {
                //     ":user_phone_no": request.data.user_email
                // }
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "user_phone_no = :user_phone_no",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":user_phone_no": request.data.user_email
                },
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

exports.fetchUserDataByPhoneNo2 = async (request) => {

    console.log("request - ",request);
        const queryParams = {
            TableName: TABLE_NAMES.upschool_teacher_info,
            IndexName: Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: "user_phone_no = :user_phone_no",
            ExpressionAttributeValues: {
                ":common_id": constant.constValues.common_id,
                ":user_phone_no": request.data.user_email 
            },
        };

        const result = await DATABASE_TABLE2.query(queryParams);
        return result;
};


exports.fetchUserDataByUserName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                // IndexName: indexName.Indexes.user_name_index,
                // KeyConditionExpression: "user_name = :user_name",
                // ExpressionAttributeValues: {
                //     ":user_name": request.data.user_email
                // } 
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "user_name = :user_name",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":user_name": request.data.user_email
                },
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

exports.fetchUserDataByUserName2 = async (request) => {

        const queryParams = {
            TableName: TABLE_NAMES.upschool_teacher_info,
            IndexName: Indexes.common_id_index,
            KeyConditionExpression: "common_id = :common_id",
            FilterExpression: "user_name = :user_name",
            ExpressionAttributeValues: {
                ":common_id": constant.constValues.common_id,
                ":user_name": request.data.user_email 
            },
        };

        const result = await DATABASE_TABLE2.query(queryParams);
        return result;
};


exports.fetchUserDataByUserId = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                KeyConditionExpression: "teacher_id = :teacher_id",
                ExpressionAttributeValues: {
                    ":teacher_id": request.teacher_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
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

exports.updateJwtToken = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Login Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_LOGIN_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                Key: {
                    "teacher_id": request.teacher_id
                },
                UpdateExpression: "set user_jwt = :user_jwt, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":user_jwt": request.user_jwt,
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    });
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
                ":updated_ts": helper.getCurrentTimestamp(),
            },
        };

        const result = await DATABASE_TABLE2.updateService(params);
        return result;
};


exports.updateUserOtp = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                Key: {
                    "teacher_id": request.data.teacher_id
                },
                UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":user_otp": request.data.user_otp,
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}

exports.updateUserOtp2 = async (request) => {

        const params = {
            TableName: TABLE_NAMES.upschool_teacher_info,
            Key: {
                "teacher_id": request.data.teacher_id,
            },
            UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts",
            ExpressionAttributeValues: {
                ":user_otp": request.data.user_otp,
                ":updated_ts": helper.getCurrentTimestamp(),
            },
        };

        await DATABASE_TABLE2.updateService(params);
        return { statusCode: 200, body: "OTP updated successfully." };
};


exports.resetUserOtp = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                Key: {
                    "teacher_id": request.data.teacher_id
                },
                UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":user_otp": request.data.user_reset_otp,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    });
}

exports.resetUserOtp2 = async (request) => {

    const params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        Key: { "teacher_id": request.data.teacher_id },
        UpdateExpression: "set user_otp = :user_otp, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":user_otp": request.data.user_reset_otp,
            ":updated_ts": helper.getCurrentTimestamp()
        },
    };

    await DATABASE_TABLE2.updateService(params); 
    return { statusCode: 200, message: "OTP updated successfully" };

};

exports.resetPassword = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                Key: {
                    "teacher_id": request.data.teacher_id
                },
                UpdateExpression: "set user_jwt = :user_jwt, user_salt = :user_salt, user_pwd = :user_pwd, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":user_jwt": request.data.user_jwt,
                    ":user_salt": request.data.user_salt,
                    ":user_pwd": request.data.user_pwd,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    });
}

exports.resetPassword2 = async (request) => {
 
        const params = {
            TableName: TABLE_NAMES.upschool_teacher_info,
            Key: { "teacher_id": request.data.teacher_id },
            UpdateExpression: "set user_jwt = :user_jwt, user_salt = :user_salt, user_pwd = :user_pwd, updated_ts = :updated_ts",
            ExpressionAttributeValues: {
                ":user_jwt": request.data.user_jwt,
                ":user_salt": request.data.user_salt,
                ":user_pwd": request.data.user_pwd,
                ":updated_ts": helper.getCurrentTimestamp()
            },
        };

        await DATABASE_TABLE2.updateService(params);
        return { statusCode: 200, message: "Password reset successfully" };
};


exports.fetchTeacherEmailById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("User Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.USER_DATA_DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                KeyConditionExpression: "teacher_id = :teacher_id",
                ExpressionAttributeValues: {
                    ":teacher_id": request.data.teacher_id
                },
                ProjectionExpression: ["teacher_id", "user_email"],
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

exports.changeUserStatus = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("ERROR : Change Teacher Status");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                Key: {
                    "teacher_id": request.data.school_admin_id
                },
                UpdateExpression: "set user_status = :user_status, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":user_status": request.data.user_status,
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}
exports.changeUserStatus2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teacher_info,
        Key: {
            "teacher_id": request.data.school_admin_id
        },
        UpdateExpression: "set user_status = :user_status, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":user_status": request.data.user_status,
            ":updated_ts": helper.getCurrentTimestamp(),
        },
    };
    return await DATABASE_TABLE2.updateService(params);
}

exports.fetchBulkUserssData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.UPSCHOOL_USER_DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.UPSCHOOL_USER_DATABASE_ERROR)
        } else {
            let userIdArray = request.data.userIdArray;
            let tableUserID = request.data.tableUserID;
            let userTableName = request.data.userTableName;

            let filterExpDynamic = tableUserID + "= :" + tableUserID;
            let expAttributeVal = {};

            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};

            if (userIdArray.length === 1) {

                expAttributeVal[':' + tableUserID] = userIdArray[0];

                let read_params = {
                    TableName: userTableName,
                    KeyConditionExpression: "" + tableUserID + " = :" + tableUserID + "",
                    ExpressionAttributeValues: expAttributeVal,
                }

                console.log("READ PARAMS : ", read_params);

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);
            }
            else {
                userIdArray.forEach((element, index) => {
                    if (index < userIdArray.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " OR "
                        ExpressionAttributeValuesDynamic[':' + tableUserID + '' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + ""
                        ExpressionAttributeValuesDynamic[':' + tableUserID + '' + index] = element;
                    }
                });
                let read_params = {
                    TableName: userTableName,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}