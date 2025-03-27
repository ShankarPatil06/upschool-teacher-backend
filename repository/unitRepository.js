const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { tables: { TABLE_NAMES } } = require('../constants');
const { common } = require('../constants/constant');

exports.fetchUnitData2 = async (request) => {

    const subject_unit_id = request.subject_unit_id;

    if (subject_unit_id.length === 1) {
        const params = {
            TableName: TABLE_NAMES.upschool_unit_table,
            KeyConditionExpression: "unit_id = :unit_id",
            FilterExpression: "unit_status = :unit_status",
            ExpressionAttributeValues: {
                ":unit_id": subject_unit_id[0],
                ":unit_status": common.Active,
            },
            ProjectionExpression: "unit_id, unit_chapter_id, display_name, unit_status, unit_title, unit_updated_ts",
        };
        const unit_data = await DATABASE_TABLE2.query(params);
        return unit_data.Items;
    } else {
        const keys = subject_unit_id.map((id) => ({ unit_id: id }));
        const params = {
            RequestItems: {
                [TABLE_NAMES.upschool_unit_table]: {
                    Keys: keys,
                    ProjectionExpression: "unit_id, unit_chapter_id, display_name, unit_status, unit_title, unit_updated_ts",
                },
            },
        };
        const data = await DATABASE_TABLE2.getByObjects(params);

        const activeUnits = data.Responses[TABLE_NAMES.upschool_unit_table].filter(
            (item) => item.unit_status === common.Active
        );
        return activeUnits;
    }
};