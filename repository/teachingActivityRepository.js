const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.fetchTeachingActivity = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : TEACHING ACTIVITY");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
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
exports.fetchTeachingActivity2 = async (request) => {
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

exports.updateTeachingActivity = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : TEACHING ACTIVITY");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_teaching_activity,
                Key: {
                    "activity_id": request.data.activity_id
                },
                UpdateExpression: "set chapter_data = :chapter_data, updated_ts = :updated_ts, updated_by = :updated_by",
                ExpressionAttributeValues: { 
                    ":chapter_data": request.data.chapter_data, 
                    ":updated_by": request.data.teacher_id,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            };
            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}
exports.updateTeachingActivity2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teaching_activity,
                Key: {
                    "activity_id": request.data.activity_id
                },
                UpdateExpression: "set chapter_data = :chapter_data, updated_ts = :updated_ts, updated_by = :updated_by",
                ExpressionAttributeValues: { 
                    ":chapter_data": request.data.chapter_data, 
                    ":updated_by": request.data.teacher_id,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
    };
 return await DATABASE_TABLE2.updateService(params);
}
exports.updateTeachingDigiCardActivity = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : TEACHING ACTIVITY");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_teaching_activity,
                Key: {
                    "activity_id": request.data.activity_id
                },
                UpdateExpression: "set digicard_activities = :digicard_activities, updated_ts = :updated_ts, updated_by = :updated_by",
                ExpressionAttributeValues: { 
                    ":digicard_activities": request.data.digicard_activities, 
                    ":updated_by": request.data.teacher_id,
                    ":updated_ts": helper.getCurrentTimestamp()
                },
            };
            console.log(update_params);
            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}
exports.updateTeachingDigiCardActivity2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_teaching_activity,
        Key: {
            "activity_id": request.data.activity_id
        },
        UpdateExpression: "set digicard_activities = :digicard_activities, updated_ts = :updated_ts, updated_by = :updated_by",
        ExpressionAttributeValues: { 
            ":digicard_activities": request.data.digicard_activities, 
            ":updated_by": request.data.teacher_id,
            ":updated_ts": helper.getCurrentTimestamp()
        },
    };
 return await DATABASE_TABLE2.updateService(params);
}
exports.addTeachingActivity = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : TEACHING ACTIVITY");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let insert_client_params = {
                TableName: TABLE_NAMES.upschool_teaching_activity,
                Item: {
                    "activity_id": helper.getRandomString(),
                    "client_class_id": request.data.client_class_id,
                    "section_id": request.data.section_id,
                    "subject_id" : request.data.subject_id,
                    "chapter_data": request.data.chapter_data,
                    "digicard_activities": request.data.digicard_activities,
                    "activity_status": "Active",
                    "updated_by": request.data.teacher_id, 
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }

            DATABASE_TABLE.putRecord(docClient, insert_client_params, callback);
        }
    });
}
exports.addTeachingActivity2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_teaching_activity,
                Item: {
                    "activity_id": helper.getRandomString(),
                    "client_class_id": request.data.client_class_id,
                    "section_id": request.data.section_id,
                    "subject_id" : request.data.subject_id,
                    "chapter_data": request.data.chapter_data,
                    "digicard_activities": request.data.digicard_activities,
                    "activity_status": "Active",
                    "updated_by": request.data.teacher_id, 
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }

    }
    return (await DATABASE_TABLE2.putItem(params)).$metadata.httpStatusCode;
   
}