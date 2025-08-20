const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.getStudentsData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Database Error : Fetch All Active Students");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_student_info,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "user_status = :user_status AND section_id = :section_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":user_status": "Active",
                    ":section_id": request.data.section_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
// exports.getStudentsData2 = async (request) => {
//     let params = {
//         TableName: TABLE_NAMES.upschool_student_info,
//         IndexName: Indexes.common_id_index,
//         KeyConditionExpression: "common_id = :common_id",
//         FilterExpression: "user_status = :user_status AND section_id = :section_id",
//         ExpressionAttributeValues: {
//             ":common_id": constant.constValues.common_id,
//             ":user_status": "Active",
//             ":section_id": request.data.section_id
//         }
//     };

//     return await baseRepositoryNew.DATABASE_TABLE2.query(params);
// }

exports.getStudentsData2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_student_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "user_status = :user_status AND section_id = :section_id",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":user_status": "Active",
            ":section_id": request.data.section_id
        }
    };
    console.log({ params });

    return await DATABASE_TABLE2.query(params);
};

exports.fetchStudentDataByRollNoClassSection = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Database Error : Fetch Individual Students");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_student_info,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "class_id = :class_id AND section_id = :section_id AND roll_no = :roll_no",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":class_id": request.data.client_class_id,
                    ":section_id": request.data.section_id,
                    ":roll_no": request.data.roll_no
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

exports.fetchStudentDataByRollNoClassSection2 = async (request) => {

    const readParams = {
        TableName: TABLE_NAMES.upschool_student_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "class_id = :class_id AND section_id = :section_id AND roll_no = :roll_no",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":class_id": request.data.client_class_id,
            ":section_id": request.data.section_id,
            ":roll_no": request.data.roll_no
        }
    };

    const result = await DATABASE_TABLE2.query(readParams);
    return result;
};


exports.getAllStudents = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Database Error : Fetch All Active Students");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_student_info,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "user_status = :user_status AND student_id = :student_id",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":user_status": "Active",
                    ":student_id": request,

                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}


exports.getAllStudents2 = async (request) => {
    const readParams = {
        TableName: TABLE_NAMES.upschool_student_info,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "user_status = :user_status AND student_id = :student_id",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":user_status": "Active",
            ":student_id": request,
        }
    };

    const result = await DATABASE_TABLE2.query(readParams);
    return result;

};

exports.getStudentsByIdName2 = async function (request) {
    const studentArray = request.student_id;
    console.log("studentArray : ", studentArray);

    if (studentArray.length === 1) {

        const readParams = {
            TableName: TABLE_NAMES.upschool_student_info,
            KeyConditionExpression: "student_id = :student_id",
            ExpressionAttributeValues: {
                ":student_id": studentArray[0]
            },
            ProjectionExpression: "student_id, user_firstname,user_lastname",
        };

        const result = await DATABASE_TABLE2.query(readParams);
        return result.Items;

    } else {

        const batchGetParams = {
            RequestItems: {
                [TABLE_NAMES.upschool_student_info]: {
                    Keys: studentArray.map(student => ({ student_id: student })),
                    ProjectionExpression: "student_id, user_firstname,user_lastname",
                }
            }
        };

        const result = await DATABASE_TABLE2.getByObjects(batchGetParams);
        return result.Responses[TABLE_NAMES.upschool_student_info] || [];
    }
};



exports.getParentDetailsById = async (request) => {
    const readParams = {
        TableName: TABLE_NAMES.upschool_parent_info,
        KeyConditionExpression: "parent_id = :parent_id",
        ExpressionAttributeValues: {
            ":parent_id": request.data.parent_id
        }
    };

    const result = await DATABASE_TABLE2.query(readParams);
    return result.Items[0];
};

exports.fetchStudentsByIds = async (studentIds) => {

    const readParams = {
        RequestItems: {
            [TABLE_NAMES.upschool_student_info]: {
                Keys: studentIds.map((id) => ({
                    student_id: id
                }))
            }
        }
    };

    const result = await DATABASE_TABLE2.getByObjects(readParams);
    return result.Responses[TABLE_NAMES.upschool_student_info] || [];
};

exports.fetchParentsByIds = async (parentIds) => {

    const readParams = {
        RequestItems: {
            [TABLE_NAMES.upschool_parent_info]: {
                Keys: parentIds.map((id) => ({
                    parent_id: id
                }))
            }
        }
    };

    const result = await DATABASE_TABLE2.getByObjects(readParams);
    return result.Responses[TABLE_NAMES.upschool_parent_info] || [];
};
