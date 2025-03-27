const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.getQuestionSources2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_question_source,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "source_type = :source_type AND source_status = :source_status",
        ExpressionAttributeValues: {
            ":source_type": request.data.source_type,
            ":source_status": request.data.source_status,
            ":common_id": constant.constValues.common_id,
        },
        ProjectionExpression: "source_id, source_name",
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;
};

const CHUNK_SIZE = 25;

exports.fetchBulkCognitiveSkillNameById2 = async (request) => {
    const cognitive_ids = [...new Set(request.cognitive_id)];
    if (cognitive_ids.length === 1) {
        const params = {
            TableName: TABLE_NAMES.upschool_cognitive_skill,
            KeyConditionExpression: "cognitive_id = :cognitive_id",
            ExpressionAttributeValues: {
                ":cognitive_id": cognitive_ids[0]
            }
        };
        const result = await DATABASE_TABLE2.query(params);
        return result.Items;
    }

    const chunks = [];
    for (let i = 0; i < cognitive_ids.length; i += CHUNK_SIZE) {
        chunks.push(cognitive_ids.slice(i, i + CHUNK_SIZE));
    }

    try {
        const results = await Promise.all(chunks.map(async (chunk) => {
            const keys = chunk.map((id) => ({ cognitive_id: id }));

            const params = {
                RequestItems: {
                    [TABLE_NAMES.upschool_cognitive_skill]: {
                        Keys: keys
                    }
                }
            };

            const result = await DATABASE_TABLE2.getByObjects(params);
            return result.Responses[TABLE_NAMES.upschool_cognitive_skill] || [];
        }));

        return results.flat();
    } catch (error) {
        throw new Error(constant.messages.DATABASE_ERROR);
    }
};