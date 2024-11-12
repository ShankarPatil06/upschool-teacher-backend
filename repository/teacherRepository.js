const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.fetchTeacherClientClassData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            let client_class_id = request;

            if (client_class_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_client_class_table,
                    KeyConditionExpression: "client_class_id = :client_class_id",
                    ExpressionAttributeValues: {
                        ":client_class_id": client_class_id[0]
                    },
                    ProjectionExpression: ["client_class_id", "client_class_name"]
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            }
            else {
                console.log("Else");
                client_class_id.forEach((element, index) => {
                    if (index < client_class_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "client_class_id = :client_class_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':client_class_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "client_class_id = :client_class_id" + index + ""
                        ExpressionAttributeValuesDynamic[':client_class_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_client_class_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["client_class_id", "client_class_name"]

                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}
exports.fetchTeacherClientClassData2 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
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

exports.fetchTeacherSectionData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            let section_id = request;

            if (section_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_section_table,
                    KeyConditionExpression: "section_id = :section_id",
                    ExpressionAttributeValues: {
                        ":section_id": section_id[0]
                    },
                    ProjectionExpression: ["section_id", "section_name"]
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log("Else");
                section_id.forEach((element, index) => {
                    if (index < section_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "section_id = :section_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':section_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "section_id = :section_id" + index + ""
                        ExpressionAttributeValuesDynamic[':section_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_section_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["section_id", "section_name"]

                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}
exports.fetchTeacherSectionData2 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_section_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "section_id, section_name"
    };
    console.log({params});
    const data = await DATABASE_TABLE2.query(params);
    return data;

};
exports.fetchTeacherSubjectData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            let subject_id = request;

            if (subject_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_subject_table,
                    KeyConditionExpression: "subject_id = :subject_id",
                    ExpressionAttributeValues: {
                        ":subject_id": subject_id[0]
                    },
                    ProjectionExpression: ["subject_id", "subject_title"]
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log("Else");
                subject_id.forEach((element, index) => {
                    if (index < subject_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "subject_id = :subject_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':subject_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "subject_id = :subject_id" + index + ""
                        ExpressionAttributeValuesDynamic[':subject_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_subject_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["subject_id", "subject_title"]

                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}
exports.fetchTeacherSubjectData2 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_subject_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "subject_id, subject_title"
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;

};
exports.fetchTeacherByID = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.TOPIC_DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.TOPIC_DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,

                KeyConditionExpression: "teacher_id = :teacher_id",
                ExpressionAttributeValues: {
                    ":teacher_id": request.data.teacher_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
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
exports.updateTeacherInfo = function (request, callback) {

    console.log("updateTeacherInfo : ", request);

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : Update Teacher");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_teacher_info,
                Key: {
                    "teacher_id": request.teacher_id
                },
                UpdateExpression: "set teacher_info = :teacher_info, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":teacher_info": request.teacher_info,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            };
            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    });
}
exports.fetchTeacherActivityDetails = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.TOPIC_DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.TOPIC_DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_teaching_activity,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND activity_status = :activity_status",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":activity_status": "Active"
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.fetchTeacherActivityDetails2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teaching_activity,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND activity_status = :activity_status",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":activity_status": "Active"
        }
    };

    return await DATABASE_TABLE2.query(params);
}
