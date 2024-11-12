const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.getExtensionDetails = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_digicard_teacher_extension,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND chapter_id = :chapter_id AND topic_id = :topic_id AND digi_card_id = :digi_card_id AND learningType = :learningType AND extension_status = :extension_status AND school_id = :school_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":chapter_id": request.data.chapter_id,
                    ":topic_id": request.data.topic_id,
                    ":digi_card_id": request.data.digi_card_id,
                    ":learningType": request.data.learningType,
                    ":school_id": request.data.school_id,
                    ":extension_status": "Active"
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.getExtensionDetails2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_digicard_teacher_extension,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id AND chapter_id = :chapter_id AND topic_id = :topic_id AND digi_card_id = :digi_card_id AND learningType = :learningType AND extension_status = :extension_status AND school_id = :school_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":chapter_id": request.data.chapter_id,
                    ":topic_id": request.data.topic_id,
                    ":digi_card_id": request.data.digi_card_id,
                    ":learningType": request.data.learningType,
                    ":school_id": request.data.school_id,
                    ":extension_status": "Active"
                }
    };
    return await DATABASE_TABLE2.query(params); 
};

exports.updateDigiExtension = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_digicard_teacher_extension,
                Key: {
                    "extension_id": request.data.extension_id 
                },
                UpdateExpression: "set extensions = :extensions, updated_by = :updated_by, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":updated_ts": helper.getCurrentTimestamp(),
                    ":updated_by": request.data.teacher_id,
                    ":extensions": request.data.extensions
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}
exports.updateDigiExtension2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_digicard_teacher_extension,
                Key: {
                    "extension_id": request.data.extension_id 
                },
                UpdateExpression: "set extensions = :extensions, updated_by = :updated_by, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":updated_ts": helper.getCurrentTimestamp(),
                    ":updated_by": request.data.teacher_id,
                    ":extensions": request.data.extensions
                },
    };
 return await DATABASE_TABLE2.updateService(params);
}

exports.addDigiExtension = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let insert_client_params = {
                TableName: TABLE_NAMES.upschool_digicard_teacher_extension,
                Item: {
                    "extension_id": helper.getRandomString(),
                    "client_class_id": request.data.client_class_id,
                    "section_id": request.data.section_id,
                    "subject_id": request.data.subject_id,
                    "chapter_id" : request.data.chapter_id,
                    "topic_id": request.data.topic_id,
                    "digi_card_id": request.data.digi_card_id,
                    "extension_status": "Active",
                    "learningType": request.data.learningType, 
                    "extensions": request.data.extensions,
                    "school_id": request.data.school_id,
                    "common_id": constant.constValues.common_id,
                    "updated_by": request.data.teacher_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }

            DATABASE_TABLE.putRecord(docClient, insert_client_params, callback);

        }
    });
}
exports.addDigiExtension2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_digicard_teacher_extension,
                Item: {
                    "extension_id": helper.getRandomString(),
                    "client_class_id": request.data.client_class_id,
                    "section_id": request.data.section_id,
                    "subject_id": request.data.subject_id,
                    "chapter_id" : request.data.chapter_id,
                    "topic_id": request.data.topic_id,
                    "digi_card_id": request.data.digi_card_id,
                    "extension_status": "Active",
                    "learningType": request.data.learningType, 
                    "extensions": request.data.extensions,
                    "school_id": request.data.school_id,
                    "common_id": constant.constValues.common_id,
                    "updated_by": request.data.teacher_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }

    }
    return (await DATABASE_TABLE2.putItem(params)).$metadata.httpStatusCode;
   
}