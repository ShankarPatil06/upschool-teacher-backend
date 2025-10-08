const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES }, indexes } = require('../constants');

exports.CreateFocusConceptToDB = async (request) => {
    let params = {
        TableName: TABLE_NAMES.upschool_focus_concept,
        Item: {
            "focus_concept_id": helper.getRandomString(),
            "quiz_id": request?.quiz_id,
            "chapter_id": request?.chapter_id,
            "common_id": constant.constValues.common_id,
            "quiz_name": request?.quiz_name,
            "section_id": request?.section_id,
            "subject_id": request?.subject_id,
            "learningType": request?.learningType,
            "school_id": request?.school_id,
            "concepts_to_focus": request?.concepts_to_focus,
            "created_ts": helper.getCurrentTimestamp(),
            "updated_ts": helper.getCurrentTimestamp(),
        }
    }

    return await DATABASE_TABLE2.putItem(params)
}

exports.addNewFocusConceptToDB = async (request) => {
    const quizId = request?.quiz_id;

    // 1. Query to check if the quiz already exists
    const checkParams = {
        TableName: TABLE_NAMES.upschool_focus_concept,
        IndexName: indexes.Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":quiz_id": quizId
        }
    };

    const existing = await DATABASE_TABLE2.query(checkParams);

    // 2. Prepare item (shared for insert or update)
    const now = helper.getCurrentTimestamp();
    const item = {
        "quiz_id": quizId,
        "chapter_id": request?.chapter_id,
        "common_id": constant.constValues.common_id,
        "quiz_name": request?.quiz_name,
        "section_id": request?.section_id,
        "subject_id": request?.subject_id,
        "learningType": request?.learningType,
        "school_id": request?.school_id,
        "concepts_to_focus": request?.concepts_to_focus,
        "updated_ts": now,
        "created_ts": now
    };

    if (existing?.Items?.length > 0) {
        // 3a. Update existing item
        const updateParams = {
            TableName: TABLE_NAMES.upschool_focus_concept,
            Key: {
                focus_concept_id: existing.Items[0].focus_concept_id
            },
            UpdateExpression: `
                set 
                    concepts_to_focus = :concepts_to_focus,
                    updated_ts = :updated_ts
            `,
            ExpressionAttributeValues: {
                ":concepts_to_focus": item.concepts_to_focus,
                ":updated_ts": item.updated_ts
            }
        };

        return await DATABASE_TABLE2.updateService(updateParams);
    } else {
        // 3b. Insert new item
        const insertParams = {
            TableName: TABLE_NAMES.upschool_focus_concept,
            Item: {
                ...item,
                focus_concept_id: helper.getRandomString(),
                created_ts: now
            }
        };

        return await DATABASE_TABLE2.putItem(insertParams);
    }
};

exports.getFocusedConceptsByQuizId = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_focus_concept,
        IndexName: indexes.Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: "quiz_id = :quiz_id",
        ExpressionAttributeValues: {
            ":common_id": constant.constValues.common_id,
            ":quiz_id": request
        }
    };

    return (await DATABASE_TABLE2.query(params))?.Items[0] ?? {};
}
