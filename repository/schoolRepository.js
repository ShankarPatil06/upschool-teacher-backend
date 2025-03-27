const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { tables: { TABLE_NAMES } } = require('../constants');

exports.getSchoolDetailsById2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_school_info_table,
        KeyConditionExpression: "school_id = :school_id",
        ExpressionAttributeValues: {
            ":school_id": request.data.school_id
        }
    };
    return await DATABASE_TABLE2.query(params);
}