const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const helper = require('../helper/helper');
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');

exports.getContentCategories = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;
            
            let read_params = {
                TableName: TABLE_NAMES.upschool_content_category,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "category_type = :category_type AND category_status = :category_status", 
                ExpressionAttributeValues: { 
                    ":category_type": request.data.category_type,
                    ":category_status": request.data.category_status,
                    ":common_id": constant.constValues.common_id, 
                },
                ProjectionExpression: ["category_id", "category_name"], 
            }
            console.log("REQUEST : ", read_params);
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchCategoryByName = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_content_category,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "lc_category_name = :lc_category_name AND category_type = :category_type",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":category_type": request.data.category_type,
                    ":lc_category_name": request.data.category_name.toLowerCase().replace(/ /g,'')
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

exports.insertContentCategory = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let insert_chapter_params = {
                TableName: TABLE_NAMES.upschool_content_category,
                Item: {
                    "category_id": helper.getRandomString(),
                    "category_type": request.data.category_type,
                    "category_name": request.data.category_name,
                    "lc_category_name": request.data.category_name.toLowerCase().replace(/ /g,''),
                    "category_status": "Active",                                        
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }
            DATABASE_TABLE.putRecord(docClient, insert_chapter_params, callback);
        }
    });
}

exports.fetchCategoryById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_content_category,
                KeyConditionExpression: "category_id = :category_id",
                ExpressionAttributeValues: {
                    ":category_id": request.data.category_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.updateCategory = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_content_category,
                Key: {
                    "category_id": request.data.category_id
                },
                UpdateExpression: "set category_name = :category_name, lc_category_name = :lc_category_name, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":category_name": request.data.category_name,
                    ":lc_category_name": request.data.category_name.toLowerCase().replace(/ /g,''),
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}

exports.changeCategoryStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_content_category,
                Key: {
                    "category_id": request.data.category_id
                },
                UpdateExpression: "set category_status = :category_status, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":category_status": request.data.category_status,
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}

exports.getContentDisclaimers = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;
            
            let read_params = {
                TableName: TABLE_NAMES.upschool_content_disclaimer,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "disclaimer_type = :disclaimer_type AND disclaimer_status = :disclaimer_status", 
                ExpressionAttributeValues: { 
                    ":disclaimer_type": request.data.disclaimer_type,
                    ":disclaimer_status": request.data.disclaimer_status,
                    ":common_id": constant.constValues.common_id, 
                },
                ProjectionExpression: ["disclaimer_id", "disclaimer_label"], 
            }
            console.log("REQUEST : ", read_params);
            
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchDisclaimerByLabel = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_content_disclaimer,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "lc_disclaimer_label = :lc_disclaimer_label AND disclaimer_type = :disclaimer_type",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":disclaimer_type": request.data.disclaimer_type,
                    ":lc_disclaimer_label": request.data.disclaimer_label.toLowerCase().replace(/ /g,'')
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);

        }
    });
}

exports.insertContentDisclaimer = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let insert_chapter_params = {
                TableName: TABLE_NAMES.upschool_content_disclaimer,
                Item: {
                    "disclaimer_id": helper.getRandomString(),
                    "disclaimer_type": request.data.disclaimer_type,
                    "disclaimer_label": request.data.disclaimer_label,
                    "lc_disclaimer_label": request.data.disclaimer_label.toLowerCase().replace(/ /g,''),
                    "disclaimer": request.data.disclaimer,
                    "disclaimer_status": "Active",                                        
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }
            DATABASE_TABLE.putRecord(docClient, insert_chapter_params, callback);
        }
    });
}

exports.fetchDisclaimerById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_content_disclaimer,
                KeyConditionExpression: "disclaimer_id = :disclaimer_id",
                ExpressionAttributeValues: {
                    ":disclaimer_id": request.data.disclaimer_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.updateDisclaimer = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_content_disclaimer,
                Key: {
                    "disclaimer_id": request.data.disclaimer_id
                },
                UpdateExpression: "set disclaimer_label = :disclaimer_label, lc_disclaimer_label = :lc_disclaimer_label, disclaimer =:disclaimer, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":disclaimer_label": request.data.disclaimer_label,
                    ":lc_disclaimer_label": request.data.disclaimer_label.toLowerCase().replace(/ /g,''),
                    ":disclaimer": request.data.disclaimer,
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}

exports.changeDisclaimerStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_content_disclaimer,
                Key: {
                    "disclaimer_id": request.data.disclaimer_id
                },
                UpdateExpression: "set disclaimer_status = :disclaimer_status, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":disclaimer_status": request.data.disclaimer_status,
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}
/** Question Source */
exports.getQuestionSources = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;
            
            let read_params = {
                TableName: TABLE_NAMES.upschool_question_source,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "source_type = :source_type AND source_status = :source_status", 
                ExpressionAttributeValues: { 
                    ":source_type": request.data.source_type,
                    ":source_status": request.data.source_status,
                    ":common_id": constant.constValues.common_id, 
                },
                ProjectionExpression: ["source_id", "source_name"], 
            }
            console.log("REQUEST : ", read_params);
            
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}
// exports.getQuestionSources2 = async (request) => {
//     let params = {
//         TTableName: TABLE_NAMES.upschool_question_source,
//                 IndexName: Indexes.common_id_index,
//                 KeyConditionExpression: "common_id = :common_id",
//                 FilterExpression: "source_type = :source_type AND source_status = :source_status", 
//                 ExpressionAttributeValues: { 
//                     ":source_type": request.data.source_type,
//                     ":source_status": request.data.source_status,
//                     ":common_id": constant.constValues.common_id, 
//                 },
//                 ProjectionExpression: "source_id, source_name",

//     };
//     const data = await DATABASE_TABLE2.query(params);
//     return data;
// }
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
    console.log({params});
    const data =await DATABASE_TABLE2.query(params); 
    return data;
};

exports.fetchSourceByLabel = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let source_params = {
                TableName: TABLE_NAMES.upschool_question_source,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "lc_source_name = :lc_source_name AND source_type = :source_type",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":source_type": request.data.source_type,
                    ":lc_source_name": request.data.source_name.toLowerCase().replace(/ /g,'')
                }
            }

            DATABASE_TABLE.queryRecord(docClient, source_params, callback);

        }
    });
}

exports.insertSource = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let insert_source_params = {
                TableName: TABLE_NAMES.upschool_question_source,
                Item: {
                    "source_id": helper.getRandomString(),
                    "source_type": request.data.source_type,
                    "source_name": request.data.source_name,
                    "lc_source_name": request.data.source_name.toLowerCase().replace(/ /g,''),
                    "source_status": "Active",                                        
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }
            DATABASE_TABLE.putRecord(docClient, insert_source_params, callback);
        }
    });
}

exports.fetchQuestionSourceById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let read_params = {
                TableName: TABLE_NAMES.upschool_question_source,
                KeyConditionExpression: "source_id = :source_id",
                ExpressionAttributeValues: {
                    ":source_id": request.data.source_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.updateSource = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_question_source,
                Key: {
                    "source_id": request.data.source_id
                },
                UpdateExpression: "set source_name = :source_name, lc_source_name = :lc_source_name, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":source_name": request.data.source_name,
                    ":lc_source_name": request.data.source_name.toLowerCase().replace(/ /g,''),
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}

exports.changeSourceStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_question_source,
                Key: {
                    "source_id": request.data.source_id
                },
                UpdateExpression: "set source_status = :source_status, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":source_status": request.data.source_status,
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}
/** Cognitive Skill */
exports.getCognitiveSkills = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;
            
            let read_params = {
                TableName: TABLE_NAMES.upschool_cognitive_skill,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "cognitive_type = :cognitive_type AND cognitive_status = :cognitive_status", 
                ExpressionAttributeValues: { 
                    ":cognitive_type": request.data.cognitive_type,
                    ":cognitive_status": request.data.cognitive_status,
                    ":common_id": constant.constValues.common_id, 
                },
                ProjectionExpression: ["cognitive_id", "cognitive_name"], 
            }
            console.log("REQUEST : ", read_params);
            
            DATABASE_TABLE.queryRecord(docClient, read_params, callback);
        }
    });
}

exports.fetchCognitiveSkillByLabel = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let source_params = {
                TableName: TABLE_NAMES.upschool_cognitive_skill,
                IndexName: Indexes.common_id_index,
                KeyConditionExpression: "common_id = :common_id",
                FilterExpression: "lc_cognitive_name = :lc_cognitive_name AND cognitive_type = :cognitive_type",
                ExpressionAttributeValues: {
                    ":common_id": constant.constValues.common_id,
                    ":cognitive_type": request.data.cognitive_type,
                    ":lc_cognitive_name": request.data.cognitive_name.toLowerCase().replace(/ /g,'')
                }
            }

            DATABASE_TABLE.queryRecord(docClient, source_params, callback);

        }
    });
}

exports.insertCognitiveSkill = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;

            let insert_skill_params = {
                TableName: TABLE_NAMES.upschool_cognitive_skill,
                Item: {
                    "cognitive_id": helper.getRandomString(),
                    "cognitive_type": request.data.cognitive_type,
                    "cognitive_name": request.data.cognitive_name,
                    "lc_cognitive_name": request.data.cognitive_name.toLowerCase().replace(/ /g,''),
                    "cognitive_status": "Active",                                        
                    "common_id": constant.constValues.common_id,
                    "created_ts": helper.getCurrentTimestamp(),
                    "updated_ts": helper.getCurrentTimestamp(),
                }
            }
            DATABASE_TABLE.putRecord(docClient, insert_skill_params, callback);
        }
    });
}

exports.fetchCognitiveSkillById = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let fetch_skill_params = {
                TableName: TABLE_NAMES.upschool_cognitive_skill,
                KeyConditionExpression: "cognitive_id = :cognitive_id",
                ExpressionAttributeValues: {
                    ":cognitive_id": request.data.cognitive_id
                }
            }

            DATABASE_TABLE.queryRecord(docClient, fetch_skill_params, callback);
        }
    });
}

exports.updateCognitiveSkill = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_cognitive_skill,
                Key: {
                    "cognitive_id": request.data.cognitive_id
                },
                UpdateExpression: "set cognitive_name = :cognitive_name, lc_cognitive_name = :lc_cognitive_name, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":cognitive_name": request.data.cognitive_name,
                    ":lc_cognitive_name": request.data.cognitive_name.toLowerCase().replace(/ /g,''),
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}

exports.changeSkillStatus = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {

            let docClient = dynamoDBCall;

            let update_params = {
                TableName: TABLE_NAMES.upschool_cognitive_skill,
                Key: {
                    "cognitive_id": request.data.cognitive_id
                },
                UpdateExpression: "set cognitive_status = :cognitive_status, updated_ts = :updated_ts",
                ExpressionAttributeValues: {
                    ":cognitive_status": request.data.cognitive_status,
                    ":updated_ts": helper.getCurrentTimestamp(),
                },
            };

            DATABASE_TABLE.updateRecord(docClient, update_params, callback);
        }
    });
}



exports.fetchBulkCognitiveSkillNameById = function (request, callback) {

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
            let cognitive_id = request.cognitive_id;
            console.log("cognitive_id : ", cognitive_id);
            if(cognitive_id.length === 1){
                let read_params = {
                    TableName: TABLE_NAMES.upschool_cognitive_skill,
                    KeyConditionExpression: "cognitive_id = :cognitive_id",
                    ExpressionAttributeValues: { 
                        ":cognitive_id": cognitive_id[0]
                    },
                }
    
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            }else{
                console.log(" Chapter Else");
                cognitive_id.forEach((element, index) => { 
                    console.log("element : ", element);

                    if(index < cognitive_id.length-1){ 
                        FilterExpressionDynamic = FilterExpressionDynamic + "cognitive_id = :cognitive_id"+ index +" OR "
                        ExpressionAttributeValuesDynamic[':cognitive_id'+ index] = element
                    } else{
                        FilterExpressionDynamic = FilterExpressionDynamic + "cognitive_id = :cognitive_id"+ index
                        ExpressionAttributeValuesDynamic[':cognitive_id'+ index] = element;
                    }
                });

                let read_params = {
                    TableName: TABLE_NAMES.upschool_cognitive_skill,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                }
                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}

exports.fetchBulkCognitiveSkillNameById2 = async (request) => {
    const cognitive_ids = [...new Set(request.cognitive_id)]; // Remove duplicates

    if (cognitive_ids.length === 1) {
        // When there is only one cognitive ID
        const params = {
            TableName: TABLE_NAMES.upschool_cognitive_skill,
            KeyConditionExpression: "cognitive_id = :cognitive_id",
            ExpressionAttributeValues: { 
                ":cognitive_id": cognitive_ids[0]
            }
        };

        const result = await DATABASE_TABLE2.query(params);
        return result.Items;
    } else {
        // When there are multiple cognitive IDs
        const keys = cognitive_ids.map((id) => ({
            cognitive_id: id
        }));

        const params = {
            RequestItems: { 
                [TABLE_NAMES.upschool_cognitive_skill]: {
                    Keys: keys
                }
            }
        };

        const result = await DATABASE_TABLE2.getByObjects(params);
        return result.Responses[TABLE_NAMES.upschool_cognitive_skill];
    }
};



