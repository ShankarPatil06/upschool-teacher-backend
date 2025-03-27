const { getDataByFilterKey } = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { common, messages } = require('../constants/constant');

exports.fetchDigiCardData2 = async (request) => {
    let concept_digicard_id = request;

    if (concept_digicard_id.length === 1) {
        const readParams = {
            TableName: TABLE_NAMES.upschool_digi_card_table,
            KeyConditionExpression: "digi_card_id = :digi_card_id",
            FilterExpression: "digicard_status = :digicard_status",
            ExpressionAttributeValues: {
                ":digi_card_id": concept_digicard_id[0],
                ":digicard_status": common.Active
            },
            ProjectionExpression: "digi_card_id, digi_card_title, digicard_image, display_name"
        };

        const result = await DATABASE_TABLE2.query(readParams);
        return result.Items || [];
    } else {
        const keys = concept_digicard_id.map((id) => ({
            digi_card_id: id
        }));

        const batchParams = {
            RequestItems: {
                [TABLE_NAMES.upschool_digi_card_table]: {
                    Keys: keys,
                    ProjectionExpression: "digi_card_id, digi_card_title, digicard_image, display_name",
                    ExpressionAttributeValues: {
                        ":digicard_status": common.Active
                    },
                    FilterExpression: "digicard_status = :digicard_status"
                }
            }
        };

        const result = await DATABASE_TABLE2.getByObjects(batchParams);
        return result.Responses[TABLE_NAMES.upschool_digi_card_table] || [];
    }
};

exports.fetchDigiCardDisplayTitleID2 = async (request) => {

    const concept_digicard_items = request;
    const fromatedRequest = await getDataByFilterKey(concept_digicard_items);

    const params = {
        TableName: TABLE_NAMES.upschool_digi_card_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: `${fromatedRequest.FilterExpression} AND digicard_status = :digicard_status`,
        ExpressionAttributeValues: {
            ...fromatedRequest.ExpressionAttributeValues,
            ":digicard_status": common.Active
        },
        ProjectionExpression: "digi_card_id, digi_card_title, display_name",
    };
    return await DATABASE_TABLE2.query(params);
};

exports.fetchRelatedDigiCardData2 = async (request) => {

    const related_digi_cards = request.related_digi_cards;
    if (related_digi_cards.length === 0) {
        throw new Error(messages.NO_RELATED_DIGICARDS);
    }

    if (related_digi_cards.length === 1) {
        const readParams = {
            TableName: TABLE_NAMES.upschool_digi_card_table,
            KeyConditionExpression: "digi_card_id = :digi_card_id",
            FilterExpression: "digicard_status = :digicard_status",
            ExpressionAttributeValues: {
                ":digi_card_id": related_digi_cards[0],
                ":digicard_status": common.Active
            },
            ProjectionExpression: "digi_card_id, digi_card_title"
        };

        const result = await DATABASE_TABLE2.query(readParams);
        return result.Items || [];
    } else {
        const keys = related_digi_cards.map((id) => ({
            digi_card_id: id
        }));

        const batchParams = {
            RequestItems: {
                [TABLE_NAMES.upschool_digi_card_table]: {
                    Keys: keys,
                    ProjectionExpression: "digi_card_id, digi_card_title",
                    ExpressionAttributeValues: {
                        ":digicard_status": common.Active
                    },
                    FilterExpression: "digicard_status = :digicard_status"
                }
            }
        };

        const result = await DATABASE_TABLE2.getByObjects(batchParams);
        return result.Responses[TABLE_NAMES.upschool_digi_card_table] || [];
    }
};

exports.fetchDigiCardByID2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_digi_card_table,
        KeyConditionExpression: "digi_card_id = :digi_card_id",
        ExpressionAttributeValues: {
            ":digi_card_id": request.data.digi_card_id
        },
    };

    const data = await DATABASE_TABLE2.query(params);
    return data;
}
