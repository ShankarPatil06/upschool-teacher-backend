const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const helper = require('../helper/helper');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.fetchPreTopicData = function (request, callback) {

    console.log("fetchPreTopicData : ", request);

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};

            let chapter_topic_id = request.prelearning_topic_id;
            request["chapter_topic_id"] = chapter_topic_id;

            if (chapter_topic_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    KeyConditionExpression: "topic_id = :topic_id",
                    FilterExpression: "topic_status = :topic_status AND pre_post_learning = :pre_post_learning",
                    ExpressionAttributeValues: {
                        ":topic_id": chapter_topic_id[0],
                        ":topic_status": "Active",
                        ":pre_post_learning": "Pre-Learning"
                    },
                    ProjectionExpression: ["topic_id", "topic_title", "pre_post_learning", "topic_description", "display_name", "topic_concept_id"],

                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log("Else");
                chapter_topic_id.forEach((element, index) => {
                    if (index < chapter_topic_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "( topic_id = :topic_id" + index + " AND topic_status = :topic_status  AND pre_post_learning = :pre_post_learning ) OR "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(topic_id = :topic_id" + index + "  AND topic_status = :topic_status AND pre_post_learning = :pre_post_learning) "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[':topic_status'] = 'Active'
                ExpressionAttributeValuesDynamic[':pre_post_learning'] = 'Pre-Learning'

                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["topic_id", "topic_title", "pre_post_learning", "topic_description", "display_name", "topic_concept_id"],

                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}


exports.fetchPreTopicData2 = async (request) => {

        const chapterTopicIds = request.prelearning_topic_id;

        if (chapterTopicIds.length === 1) {
            const readParams = {
                TableName: TABLE_NAMES.upschool_topic_table,
                KeyConditionExpression: "topic_id = :topic_id",
                FilterExpression: "topic_status = :topic_status AND pre_post_learning = :pre_post_learning",
                ExpressionAttributeValues: {
                    ":topic_id": chapterTopicIds[0],
                    ":topic_status": "Active",
                    ":pre_post_learning": "Pre-Learning"
                },
                ProjectionExpression: "topic_id, topic_title, pre_post_learning, topic_description, display_name, topic_concept_id, topic_status",
            };
            return await DATABASE_TABLE2.query(readParams);
        }

        const keys = chapterTopicIds.map((id) => ({
            topic_id: id,
        }));

        const readParams = {
            RequestItems: {
                [TABLE_NAMES.upschool_topic_table]: {
                    Keys: keys,
                    ProjectionExpression: "topic_id, topic_title, pre_post_learning, topic_description, display_name, topic_concept_id, topic_status"
                }
            }
        };

        const data = await DATABASE_TABLE2.getByObjects(readParams);

        const filteredData = data.Responses[TABLE_NAMES.upschool_topic_table].filter(
            item => item.topic_status === "Active" && item.pre_post_learning === "Pre-Learning"
        );

        return filteredData;

};



exports.fetchPostTopicData = function (request, callback) {

    console.log("fetchPostTopicData : ", request);

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};

            let chapter_topic_id = (request.postlearning_topic_id);

            if (chapter_topic_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    KeyConditionExpression: "topic_id = :topic_id",
                    FilterExpression: "topic_status = :topic_status AND pre_post_learning = :pre_post_learning",
                    ExpressionAttributeValues: {
                        ":topic_id": chapter_topic_id[0],
                        ":topic_status": "Active",
                        ":pre_post_learning": "Post-Learning"
                    },
                    ProjectionExpression: ["topic_id", "topic_title", "pre_post_learning", "topic_description", "topic_concept_id", "display_name"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log("Else");
                chapter_topic_id.forEach((element, index) => {
                    if (index < chapter_topic_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "( topic_id = :topic_id" + index + " AND topic_status = :topic_status  AND pre_post_learning = :pre_post_learning ) OR "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(topic_id = :topic_id" + index + "  AND topic_status = :topic_status AND pre_post_learning = :pre_post_learning) "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[':topic_status'] = 'Active'
                ExpressionAttributeValuesDynamic[':pre_post_learning'] = 'Post-Learning'

                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["topic_id", "topic_title", "pre_post_learning", "topic_description", "topic_concept_id", "display_name"],
                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}

exports.fetchPostTopicData2 = async (request) => { 
    console.log("request.postlearning_topic_id - ", request.postlearning_topic_id);
    const chapter_topic_ids = request.postlearning_topic_id;
    let params;

    if (chapter_topic_ids.length === 1) {
        params = {
            TableName: TABLE_NAMES.upschool_topic_table,
            KeyConditionExpression: "topic_id = :topic_id",
            FilterExpression: "topic_status = :topic_status AND pre_post_learning = :pre_post_learning",
            ExpressionAttributeValues: {
                ":topic_id": chapter_topic_ids[0],
                ":topic_status": "Active",
                ":pre_post_learning": "Post-Learning",
            },
            ProjectionExpression: "topic_id, topic_title, pre_post_learning, topic_description, topic_concept_id, display_name",
        };
        return await DATABASE_TABLE2.query(params);
    } else {
        const keys = chapter_topic_ids.map((id) => ({ topic_id: id }));

        const params = {
            RequestItems: {
                [TABLE_NAMES.upschool_topic_table]: {
                    Keys: keys,
                    ProjectionExpression: "topic_id, topic_title, pre_post_learning, topic_description, topic_concept_id, display_name",
                },
            },
        };

        console.log("params - ", params);
        const data = await DATABASE_TABLE2.getByObjects(params);
        return data.Responses[TABLE_NAMES.upschool_topic_table];
    }
};



exports.fetchTopicIDDisplayTitleData = function (request, callback) {

    console.log("fetchTopicData : ", request);

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};

            let topic_array = (request.topic_array);

            if (topic_array.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    KeyConditionExpression: "topic_id = :topic_id",
                    FilterExpression: "topic_status = :topic_status",
                    ExpressionAttributeValues: {
                        ":topic_id": topic_array[0],
                        ":topic_status": "Active",
                    },
                    ProjectionExpression: ["topic_id", "topic_title", "display_name",],
                }
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {

                topic_array.forEach((element, index) => {
                    if (index < topic_array.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "( topic_id = :topic_id" + index + " AND topic_status = :topic_status ) OR "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(topic_id = :topic_id" + index + "  AND topic_status = :topic_status ) "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[':topic_status'] = 'Active'

                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["topic_id", "topic_title", "display_name"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }
        }
    });
}
exports.fetchTopicIDDisplayTitleData2 = async (request) => {
    const fromatedRequest = await helper.getDataByFilterKey(request);
    const params = {
        TableName: TABLE_NAMES.upschool_topic_table,
        IndexName: Indexes.common_id_index,
        KeyConditionExpression: "common_id = :common_id",
        FilterExpression: fromatedRequest.FilterExpression,
        ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
        ProjectionExpression: "topic_id, topic_title, display_name"
    };
    const data = await DATABASE_TABLE2.query(params);
    return data;

};
exports.fetchTopicConceptIDData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};

            let topic_array = (request.topic_array);

            if (topic_array.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    KeyConditionExpression: "topic_id = :topic_id",
                    FilterExpression: "topic_status = :topic_status",
                    ExpressionAttributeValues: {
                        ":topic_id": topic_array[0],
                        ":topic_status": "Active",
                    },
                    ProjectionExpression: ["topic_id", "topic_concept_id",],
                }
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {

                topic_array.forEach((element, index) => {
                    if (index < topic_array.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "( topic_id = :topic_id" + index + " AND topic_status = :topic_status ) OR "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(topic_id = :topic_id" + index + "  AND topic_status = :topic_status ) "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[':topic_status'] = 'Active'

                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["topic_id", "topic_concept_id"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }
        }
    });
}
exports.fetchTopicIDandTopicConceptID = function (request, callback) {

    console.log("fetchTopicData : ", request);

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};

            let topic_array = (request.topic_array);

            if (topic_array.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    KeyConditionExpression: "topic_id = :topic_id",
                    FilterExpression: "topic_status = :topic_status",
                    ExpressionAttributeValues: {
                        ":topic_id": topic_array[0],
                        ":topic_status": "Active",
                    },
                    ProjectionExpression: ["topic_id", "topic_concept_id"],
                }
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {

                topic_array.forEach((element, index) => {
                    if (index < topic_array.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "( topic_id = :topic_id" + index + " AND topic_status = :topic_status ) OR "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element + ''
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "(topic_id = :topic_id" + index + "  AND topic_status = :topic_status ) "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element;
                    }
                });
                ExpressionAttributeValuesDynamic[':topic_status'] = 'Active'

                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["topic_id", "topic_concept_id"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }
        }
    });
}

exports.fetchTopicIDandTopicConceptID2 = async (request) => {
    console.log("fetchTopicData : ", request);

    const topic_array = request.topic_array;

    if (!Array.isArray(topic_array) || topic_array.length === 0) {
        throw new Error(constant.messages.INVALID_REQUEST);
    }

    let readParams;

    if (topic_array.length === 1) {
        readParams = {
            TableName: TABLE_NAMES.upschool_topic_table,
            KeyConditionExpression: "topic_id = :topic_id",
            FilterExpression: "topic_status = :topic_status",
            ExpressionAttributeValues: {
                ":topic_id": topic_array[0],
                ":topic_status": "Active",
            },
            ProjectionExpression: "topic_id, topic_concept_id",
        };

        return await DATABASE_TABLE2.query(readParams);
    } else {
        const keys = topic_array.map(id => ({
            topic_id: id,
        }));

        readParams = {
            RequestItems: {
                [TABLE_NAMES.upschool_topic_table]: {
                    Keys: keys,
                    ProjectionExpression: "topic_id, topic_concept_id, topic_status",
                },
            },
        };

        const data = await DATABASE_TABLE2.getByObjects(readParams);

        const filteredData = data.Responses[TABLE_NAMES.upschool_topic_table].filter(
            item => item.topic_status === "Active"
        );

        return filteredData; 
    }
};




exports.fetchTopicByID = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.TOPIC_DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.TOPIC_DATABASE_ERROR)
        } else {
            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_topic_table,

                KeyConditionExpression: "topic_id = :topic_id",
                ExpressionAttributeValues: {
                    ":topic_id": request.data.topic_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}
exports.fetchTopicByID2 = async (request) => {
    const params = {
        TableName: TABLE_NAMES.upschool_topic_table,

        KeyConditionExpression: "topic_id = :topic_id",
        ExpressionAttributeValues: {
            ":topic_id": request.data.topic_id
        }
    };
    return await DATABASE_TABLE2.query(params);
};

exports.fetchBulkTopicsIDName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};
            console.log("fetchChapterData request : ", request);
            let unit_Topic_id = request.unit_Topic_id;
            console.log("unit_Topic_id : ", unit_Topic_id);
            if (unit_Topic_id.length === 1) {
                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    KeyConditionExpression: "topic_id = :topic_id",
                    ExpressionAttributeValues: {
                        ":topic_id": unit_Topic_id[0]
                    },
                    ProjectionExpression: ["topic_id", "topic_title", "pre_post_learning", "display_name"],
                }

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                console.log(" Chapter Else");
                unit_Topic_id.forEach((element, index) => {
                    console.log("element : ", element);

                    if (index < unit_Topic_id.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + "topic_id = :topic_id" + index + " OR "
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + "topic_id = :topic_id" + index
                        ExpressionAttributeValuesDynamic[':topic_id' + index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_topic_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: ["topic_id", "topic_title", "pre_post_learning", "display_name"],
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}


exports.fetchBulkTopicsIDName2 = async (request) => {
    const unit_Topic_id = [...new Set(request.unit_Topic_id)];

    if (unit_Topic_id.length === 1) {
        const params = {
            TableName: TABLE_NAMES.upschool_topic_table,
            KeyConditionExpression: "topic_id = :topic_id",
            ExpressionAttributeValues: {
                ":topic_id": unit_Topic_id[0]
            },
            ProjectionExpression: "topic_id, topic_title, pre_post_learning, display_name",
        };

        const result = await DATABASE_TABLE2.query(params);
        return result.Items;
    } else {
        const keys = unit_Topic_id.map((id) => ({
            topic_id: id
        }));

        const params = {
            RequestItems: {
                [TABLE_NAMES.upschool_topic_table]: {
                    Keys: keys,
                    ProjectionExpression: "topic_id, topic_title, pre_post_learning, display_name"
                }
            }
        };
        const result = await DATABASE_TABLE2.getByObjects(params);

        return result.Responses[TABLE_NAMES.upschool_topic_table];
    }
};

