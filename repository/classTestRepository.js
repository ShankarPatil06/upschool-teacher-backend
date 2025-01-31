const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.getClassTestsBasedonStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Blue Print Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_class_test_table,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "class_test_status = :class_test_status AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":class_test_status": request.data.class_test_status
                },
                ProjectionExpression: ["class_test_id", "class_test_name", "class_test_mode", "question_paper_id"],
            }
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.getClassTestsBasedonStatus2 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
    let params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "class_test_id, class_test_name, class_test_mode, question_paper_id",

    };
    const data = await DATABASE_TABLE2.query(params);
    return data.Items;
}

exports.insertClassTest = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("DB ERROR : QUIZ TABLE");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let insert_standard_params = {
                TableName: TABLE_NAMES.upschool_class_test_table,
                Item: {
                    "class_test_id": request.data.class_test_id,
                    "question_paper_id": request.data.question_paper_id,
                    "client_class_id": request.data.client_class_id,
                    "section_id": request.data.section_id,
                    "subject_id": request.data.subject_id,
                    "class_test_name": request.data.class_test_name,
                    "lc_class_test_name": request.data.class_test_name.toLowerCase().replace(/ /g, ''),
                    "class_test_mode": request.data.class_test_mode,
                    "test_start_date": request.data.test_start_date === "N.A." ? "N.A." : { yyyy_mm_dd: request.data.test_start_date, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.test_start_date) },
                    "test_end_date": request.data.test_end_date === "N.A." ? "N.A." : { yyyy_mm_dd: request.data.test_end_date, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.test_end_date) },
                    "test_start_time": request.data.test_start_time,
                    "test_end_time": request.data.test_end_time,
                    "answer_sheet_template": request.data.answer_sheet_template,
                    "question_paper_template": request.data.question_paper_template,
                    "class_test_status": "Active",
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }

            DATABASE_TABLE.putRecord(docClient, insert_standard_params, callback);
        }
    });
}
exports.insertClassTest2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        Item: {
            "class_test_id": request.data.class_test_id,
            "question_paper_id": request.data.question_paper_id,
            "client_class_id": request.data.client_class_id,
            "section_id": request.data.section_id,
            "subject_id": request.data.subject_id,
            "class_test_name": request.data.class_test_name,
            "lc_class_test_name": request.data.class_test_name.toLowerCase().replace(/ /g, ''),
            "class_test_mode": request.data.class_test_mode,
            "test_start_date": request.data.test_start_date === "N.A." ? "N.A." : { yyyy_mm_dd: request.data.test_start_date, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.test_start_date) },
            "test_end_date": request.data.test_end_date === "N.A." ? "N.A." : { yyyy_mm_dd: request.data.test_end_date, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.test_end_date) },
            "test_start_time": request.data.test_start_time,
            "test_end_time": request.data.test_end_time,
            "answer_sheet_template": request.data.answer_sheet_template,
            "question_paper_template": request.data.question_paper_template,
            "class_test_status": "Active",
            "common_id": constant.constValues.common_id,
            "created_ts": helper.getCurrentTimestamp(),
            "updated_ts": helper.getCurrentTimestamp(),
        }

    }
    const data = (await DATABASE_TABLE2.putItem(params)).$metadata.httpStatusCode;
    return data;
}

exports.fetchClassTestByName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_class_test_table,

                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "lc_class_test_name = :lc_class_test_name AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id",
                ExpressionAttributeValues: {
                    ":lc_class_test_name": request.data.class_test_name.toLowerCase().replace(/ /g, ''),
                    ":client_class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":subject_id": request.data.subject_id,
                    ":common_id": constant.constValues.common_id,
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchClassTestByName2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "lc_class_test_name = :lc_class_test_name AND client_class_id = :client_class_id AND section_id = :section_id AND subject_id = :subject_id",
        ExpressionAttributeValues: {
            ":lc_class_test_name": request.data.class_test_name.toLowerCase().replace(/ /g, ''),
            ":client_class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":common_id": constant.constValues.common_id,
        }

    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
}

exports.getClassTestIdAndName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_class_test_table,

                KeyConditionExpression: "class_test_id = :class_test_id",
                FilterExpression: "class_test_status = :class_test_status",
                ExpressionAttributeValues: {
                    ":class_test_id": request.data.class_test_id,
                    ":class_test_status": request.data.class_test_status,
                },
                ProjectionExpression: ["class_test_id", "class_test_name", "question_paper_id", "answer_sheet_template", "question_paper_template"]
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
exports.getClassTestIdAndName2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_class_test_table,

                KeyConditionExpression: "class_test_id = :class_test_id",
                FilterExpression: "class_test_status = :class_test_status",
                ExpressionAttributeValues: {
                    ":class_test_id": request.data.class_test_id,
                    ":class_test_status": request.data.class_test_status,
                },
                ProjectionExpression: "class_test_id, class_test_name, question_paper_id, answer_sheet_template, question_paper_template"

    };
    return await DATABASE_TABLE2.query(params);    
}
exports.getClassTestIdAndName2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_class_test_table,

        KeyConditionExpression: "class_test_id = :class_test_id",
        FilterExpression: "class_test_status = :class_test_status",
        ExpressionAttributeValues: {
            ":class_test_id": request.data.class_test_id,
            ":class_test_status": request.data.class_test_status,
        },
        ProjectionExpression: "class_test_id, class_test_name, question_paper_id, answer_sheet_template, question_paper_template"
    };

    const data = await DATABASE_TABLE2.query(params);
    return data;
};

exports.getStudentInfo = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_student_info,

        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "section_id = :section_id AND class_id = :class_id",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":class_id": request.data.class_id,
            ":section_id": request.data.section_id,
        },
        // ProjectionExpression: ["student_id", "user_firstname", "user_lastname", "roll_no"]
    }

    return await DATABASE_TABLE2.query(params);
    

}

exports.fetchClassTestDataById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_class_test_table,
                Key: {
                    "class_test_id": request.data.class_test_id
                }
            }

            DATABASE_TABLE.getRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchClassTestDataById2 = async (request) => {
        const readParams = {
            TableName: TABLE_NAMES.upschool_class_test_table,
            Key: {
                "class_test_id": request.data.class_test_id
            }
        };

        const result = await DATABASE_TABLE2.getItem(readParams);
        return result;
};



exports.updateClassTestStatus = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Error : updating class test Status!");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        }
        else {
            let docClient = dynamoDBCall;
            update_params = {
                TableName: TABLE_NAMES.upschool_class_test_table,
                Key: {
                    "class_test_id": request.data.class_test_id
                },
                UpdateExpression: "SET class_test_status = :class_test_status, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":class_test_status": request.data.class_test_status,
                    ":updated_ts": helper.getCurrentTimestamp(),
                }
            }
            DATABASE_TABLE.updateRecord(docClient, update_params, callback);

        }
    })
}
exports.updateClassTestStatus2 = async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        Key: {
            "class_test_id": request.data.class_test_id
        },
        UpdateExpression: "SET class_test_status = :class_test_status, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":class_test_status": request.data.class_test_status,
            ":updated_ts": helper.getCurrentTimestamp(),
        }

    }
    const data = (await DATABASE_TABLE2.updateService(params)).$metadata.httpStatusCode;
    return data;
}

exports.fetchAllTestBasedOnSubject = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_class_test_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: ":client_class_id=client_class_id AND subject_id = :subject_id AND section_id = :section_id AND class_test_status = :class_test_status",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":section_id": request.data.section_id,
            ":subject_id": request.data.subject_id,
            ":client_class_id": request.data.client_class_id,
            ":class_test_status": "Active",
        },
    };
    const result = await DATABASE_TABLE2.query(params);
    const sortedItems = result.Items.sort(
        (a, b) => new Date(b.created_ts) - new Date(a.created_ts)
    );
    return sortedItems;
}
