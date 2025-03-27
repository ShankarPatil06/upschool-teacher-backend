const { getDataByFilterKey } = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.fetchChapterByID2 = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_chapter_table,
        KeyConditionExpression: "chapter_id = :chapter_id",
        ExpressionAttributeValues: {
            ":chapter_id": request.data.chapter_id
        }
    };

    return await DATABASE_TABLE2.query(params);
}

exports.fetchChapterData2 = async (request) => {
    const { unit_chapter_id } = request;

    if (unit_chapter_id.length === 1) {
        const readParams = {
            TableName: TABLE_NAMES.upschool_chapter_table,
            KeyConditionExpression: "chapter_id = :chapter_id",
            ExpressionAttributeValues: {
                ":chapter_id": unit_chapter_id[0]
            },
            ProjectionExpression: "chapter_id, display_name, chapter_status, chapter_updated_ts",
        };

        const result = await DATABASE_TABLE2.query(readParams);
        return result.Items;
    } else {
        const readParams = {
            RequestItems: {
                [TABLE_NAMES.upschool_chapter_table]: {
                    Keys: unit_chapter_id.map(id => ({ chapter_id: id })),
                    ProjectionExpression: "chapter_id, display_name, chapter_title, chapter_status, chapter_updated_ts"
                }
            }
        };

        const result = await DATABASE_TABLE2.getByObjects(readParams);
        return result.Responses[TABLE_NAMES.upschool_chapter_table] || [];
    }
};


exports.fetchBulkChaptersIDName2 = async (request) => {
    const unit_chapter_id = request.unit_chapter_id;

    console.log("unit_chapter_id34", unit_chapter_id);

    if (unit_chapter_id.length === 1) {

        const params = {
            TableName: TABLE_NAMES.upschool_chapter_table,
            KeyConditionExpression: "chapter_id = :chapter_id",
            ExpressionAttributeValues: {
                ":chapter_id": unit_chapter_id[0]
            },
            ProjectionExpression: "chapter_id, chapter_title, display_name, prelearning_topic_id, postlearning_topic_id",
        };

        const chapterData = await DATABASE_TABLE2.query(params);
        return chapterData.Items;
    } else {
        const keys = unit_chapter_id.map((id) => ({ chapter_id: id }));
        const params = {
            RequestItems: {
                [TABLE_NAMES.upschool_chapter_table]: {
                    Keys: keys,
                    ProjectionExpression: "chapter_id, chapter_title, display_name, prelearning_topic_id, postlearning_topic_id",
                },
            },
        };

        const data = await DATABASE_TABLE2.getByObjects(params);
        return data.Responses[TABLE_NAMES.upschool_chapter_table];
    }
};

exports.fetchChaptersIDandChapterTopicID2 = async (request) => {
    const fromatedRequest = await getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_chapter_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "chapter_id, prelearning_topic_id, postlearning_topic_id"
    };

    const data = await DATABASE_TABLE2.query(params);
    return data;
};