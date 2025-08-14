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

exports.saveTimetableConfiguration = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Timetable Configuration Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let section_id = request.data.section_id;
            let timetable_config = request.data.timetable_config;

            let update_params = {
                TableName: TABLE_NAMES.upschool_section_table,
                Key: {
                    "section_id": section_id
                },
                UpdateExpression: "set timetable_config = :timetable_config, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":timetable_config": timetable_config,
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
                ReturnValues: "UPDATED_NEW"
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, function (err, data) {
                if (err) {
                    console.error("Unable to update timetable configuration. Error JSON:", JSON.stringify(err, null, 2));
                    callback(500, err);
                } else {
                    console.log("Timetable configuration updated successfully:", JSON.stringify(data, null, 2));
                    callback(null, data);
                }
            });
        }
    });
};


 exports.addCurriculumPlanToSection = async (request) => {
        const { section_id, term_title, curriculum_plan_data } = request;
    
         let params = {
             TableName: TABLE_NAMES.upschool_section_table,
        Key: {
                "section_id": section_id
             },
           UpdateExpression: "SET #cp = list_append(if_not_exists(#cp, :empty_list), :curriculum_plan_entry), updated_ts = :updated_ts",
           ExpressionAttributeNames: {
                "#cp": "curriculumPlan" 
            },
            ExpressionAttributeValues: {
                ":curriculum_plan_entry": [{ [term_title]: curriculum_plan_data }], 
                ":empty_list": [], 
                ":updated_ts": helper.getCurrentTimestamp() 
            },
            ReturnValues: "UPDATED_NEW" 
        };
   
        return await DATABASE_TABLE2.updateService(params);
    };