const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { common, constValues } = require('../constants/constant');


exports.getAllPresets2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_presets_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "preset_status = :preset_status",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":preset_status": common.Active,
        }

    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
}
