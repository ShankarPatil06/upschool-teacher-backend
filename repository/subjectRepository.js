const { DATABASE_TABLE2 } = require("./baseRepositoryNew");
const { tables: { TABLE_NAMES } } = require("../constants");
const { messages } = require("../constants/constant");

exports.getSubjetById2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_subject_table,
        KeyConditionExpression: "subject_id = :subject_id",
        ExpressionAttributeValues: {
            ":subject_id": request.data.subject_id
        }
    };

    return await DATABASE_TABLE2.query(params);
};

exports.getSubjectById3 = async (request) => {
    try {
        const params = {
            TableName: TABLE_NAMES.upschool_subject_table,
            KeyConditionExpression: "subject_id = :subject_id",
            ExpressionAttributeValues: {
                ":subject_id": request.data.subject_id,
            },
            ProjectionExpression: "subject_unit_id",
        };

        const result = await DATABASE_TABLE2.query(params);
        return result.Items[0].subject_unit_id;
    } catch (error) {
        throw new Error(messages.FAILED_TO_FETCH_SUBJECT_UNIT_ID);
    }
};