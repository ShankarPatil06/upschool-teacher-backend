const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { tables: { TABLE_NAMES } } = require('../constants');
const { getCurrentTimestamp } = require('../helper/helper');

exports.updateActionAndRecommendations= async (request) => {

    let params = {
        TableName: TABLE_NAMES.upschool_section_table,
        Key: {
            "section_id": request.data.section_id
        },
        UpdateExpression: "set action_recommendations = :action_recommendations, updated_ts = :updated_ts",
        ExpressionAttributeValues: {
            ":action_recommendations": request.data.action_recommendations,
            ":updated_ts": getCurrentTimestamp()
        },
    }
    const data = await DATABASE_TABLE2.updateService(params);
    return data;
}
