const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { common, constValues, messages } = require('../constants/constant');

exports.fetchActiveBluePrints2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_blueprint_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "blueprint_status = :blueprint_status AND blueprint_type = :blueprint_type",
        ExpressionAttributeValues: {
            ":common_id": constValues.common_id,
            ":blueprint_status": common.Active,
            ":blueprint_type": request.data.blueprint_type
        },
        ProjectionExpression: "blueprint_id, blueprint_name, description, test_duration, display_name",

    };
    const data = await DATABASE_TABLE2.query(params);
    return data.Items;
}

exports.fetchBlueprintById2 = async (request) => {
    try {
        const read_params = {
            TableName: TABLE_NAMES.upschool_blueprint_table,
            KeyConditionExpression: "blueprint_id = :blueprint_id",
            ExpressionAttributeValues: {
                ":blueprint_id": request.data.blueprint_id
            }
        };

        const result = await DATABASE_TABLE2.query(read_params);
        if (result && result.Items) {
            return { Items: result.Items };
        }

        return result;
    } catch (error) {
        console.error("DATABASE ERROR:", error);
        throw new Error(messages.DATABASE_ERROR);
    }
};

exports.fetchBluePrintData3 = async (request) => {
    const blueprintArray = request.blueprint_array;

    if (blueprintArray.length === 1) {
        const readParams = {
            TableName: TABLE_NAMES.upschool_blueprint_table,
            KeyConditionExpression: "blueprint_id = :blueprint_id",
            ExpressionAttributeValues: {
                ":blueprint_id": blueprintArray[0]
            },
            ProjectionExpression: "blueprint_id, blueprint_name",
        };

        const result = await DATABASE_TABLE2.query(readParams);
        return result.Items;

    } else {

        const batchGetParams = {
            RequestItems: {
                [TABLE_NAMES.upschool_blueprint_table]: {
                    Keys: blueprintArray.map(id => ({ blueprint_id: id })),
                    ProjectionExpression: "blueprint_id, blueprint_name",
                }
            }
        };

        const result = await DATABASE_TABLE2.getByObjects(batchGetParams);
        return result.Responses[TABLE_NAMES.upschool_blueprint_table] || [];
    }
};