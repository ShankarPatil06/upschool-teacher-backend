const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { helper } = require('../helper');

exports.getSectionIdAndName = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Section Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_section_table,
                KeyConditionExpression: "section_id = :section_id",
                ExpressionAttributeValues: {
                    ":section_id": request.data.section_id
                },
                ProjectionExpression: ["section_id", "section_name"]
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.getSectionDetailsById = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Section Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_section_table,
                KeyConditionExpression: "section_id = :section_id",
                ExpressionAttributeValues: {
                    ":section_id": request.data.section_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

exports.updateActionAndRecommendations = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_section_table,
        Key: {
            "section_id": request.data.section_id
        },
        UpdateExpression: "set action_recommendations = :action_recommendations, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":action_recommendations": request.data.action_recommendations,
            ":updated_ts": helper.getCurrentTimestamp()
        },

    }
    const data = await DATABASE_TABLE2.updateService(params);
    return data;
}

exports.addAcademicPlanToSections = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_section_table,
        Key: {
            "section_id": request.section_id
        },
        UpdateExpression: "set academic_plan = :academic_plan, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":academic_plan": request.academic_plan,
            ":updated_ts": helper.getCurrentTimestamp()
        },
    }

    return await DATABASE_TABLE2.updateService(params)
}

exports.getSectionById = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_section_table,
        Key: { "section_id": request?.section_id },
    }
    return await DATABASE_TABLE2.getItem(params)
}
