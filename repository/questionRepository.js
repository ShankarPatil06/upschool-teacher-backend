const dynamoDbCon = require("../awsConfig");
const { DATABASE_TABLE } = require("./baseRepository");
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.REFfetchBulkQuestionsWithPublishStatusAndProjection = function (request, callback) {

    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log(constant.messages.DATABASE_ERROR);
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let { IdArray, fetchIdName, TableName, projectionExp, questionStatus } = request;
            
            let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
            let expAttributeVal = {};

            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {};

            IdArray = [...new Set(IdArray)];

            console.log("IdArray : ", IdArray);
            if (IdArray.length === 0) {
                console.log("EMPTY BULK ID");
                callback(0, { Items: [] });
            } 
            else if (IdArray.length === 1) 
            {
                expAttributeVal[":" + fetchIdName] = IdArray[0];
                expAttributeVal[":question_status"] = questionStatus;
                expAttributeVal[":question_source0"] = "71416d29-c96b-5889-9b90-580567446dbc";
                expAttributeVal[":question_source1"] = "71416d29-c96b-5889-9b90-580567446dc";

                let read_params = {
                    TableName: TableName,
                    FilterExpression: "" + fetchIdName + " = :" + fetchIdName + " AND question_status = :question_status AND (question_source = :question_source0 OR question_source = :question_source1)",
                    ExpressionAttributeValues: expAttributeVal,
                    ProjectionExpression: projectionExp,
                };

                console.log("READ PARAMS : ", read_params);

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            } 
            else {
                IdArray.forEach((element, index) => {
                    if (index < IdArray.length - 1) {
                        FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index + " OR ";
                        ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element + "";
                        ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus + "";
                    } else {
                        FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index;
                        ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element;
                        ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus;
                    }
                });

                let read_params = {
                    TableName: TableName,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                    ProjectionExpression: projectionExp,
                };

                console.log("READ PARAMETER : ", read_params);

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);
            }
        }
    });
}

// exports.fetchBulkQuestionsWithPublishStatusAndProjection = function (request, callback) {

//     dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
//         if (DBErr) {
//             console.log(constant.messages.DATABASE_ERROR);
//             console.log(DBErr);
//             callback(500, constant.messages.DATABASE_ERROR);
//         } else {
//             let { IdArray, fetchIdName, TableName, projectionExp, questionStatus, sourceIds } = request;
            
//             let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
//             let expAttributeVal = {};

//             let docClient = dynamoDBCall;
//             let FilterExpressionDynamic = "";
//             let ExpressionAttributeValuesDynamic = {};

//             IdArray = [...new Set(IdArray)];

//             if (IdArray.length === 0) {
//                 console.log("EMPTY BULK ID");
//                 callback(0, { Items: [] });
//             } 
//             else if (IdArray.length === 1) 
//             {
//                 /** SINGLE DATA **/
//                 expAttributeVal[":" + fetchIdName] = IdArray[0];
//                 expAttributeVal[":question_status"] = questionStatus;

//                 let read_params = {
//                     TableName: TableName,
//                     FilterExpression: "" + fetchIdName + " = :" + fetchIdName + " AND question_status = :question_status",
//                     ExpressionAttributeValues: expAttributeVal,
//                     ProjectionExpression: projectionExp,
//                 };

//                 DATABASE_TABLE.scanRecord(docClient, read_params, callback);
//                 /** END SINGLE DATA **/
//             } 
//             else {
//                 let multiSourceFilter = "";
//                 async function multiset(index)
//                 {
//                     if(index < IdArray.length)
//                     {
//                         if (index < IdArray.length - 1) {
//                             FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index + "" +" OR ";
//                             ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = IdArray[index] + "";
//                             ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus + "";
//                         } else {
//                             FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index + ""; 
//                             ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = IdArray[index];
//                             ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus;
//                         }

//                         index++;
//                         multiset(index);
//                     }
//                     else
//                     {

//                         /** THE END **/
//                         let read_params = {
//                             TableName: TableName,
//                             FilterExpression: FilterExpressionDynamic,
//                             ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
//                             ProjectionExpression: projectionExp,
//                         };

//                         DATABASE_TABLE.scanRecord(docClient, read_params, callback);
//                         /** END THE END **/
//                     }
//                 }
//                 multiset(0);
//             }
//         }
//     });
// }


const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

exports.fetchBulkQuestionsWithPublishStatusAndProjection = async function (request, callback) {
    try {
        const { IdArray, fetchIdName, TableName, projectionExp, questionStatus } = request;

        const uniqueIds = [...new Set(IdArray)];

        if (uniqueIds.length === 0) {
            console.log("EMPTY BULK ID");
            return callback(null, { Items: [] });
        }

        if (uniqueIds.length === 1) {
            const getParams = {
                TableName,
                Key: { [fetchIdName]: uniqueIds[0] },
                ProjectionExpression: projectionExp.join(', '),
            };

            const response = await DATABASE_TABLE2.getItem(getParams);
            if (response.Item && response.Item.question_status === questionStatus) {
                return callback(null, { Items: [response.Item] });
            }
            return callback(null, { Items: [] });
        }

        // ** Split into batches of 100 to avoid AWS limit **
        const idChunks = chunkArray(uniqueIds, 100);
        let allItems = [];

        for (const chunk of idChunks) {
            const keys = chunk.map((id) => ({ [fetchIdName]: id }));
            const batchParams = {
                RequestItems: {
                    [TableName]: {
                        Keys: keys,
                        ProjectionExpression: projectionExp.join(', '),
                    },
                },
            };

            const batchResponse = await DATABASE_TABLE2.getByObjects(batchParams);
            const items = batchResponse.Responses?.[TableName] || [];

            // **Filter only items that match the question_status**
            const filteredItems = items.filter((item) => item.question_status === questionStatus);
            allItems = allItems.concat(filteredItems);
        }

        callback(null, { Items: allItems });
    } catch (error) {
        console.error("Error fetching questions:", error);
        callback(500, error.message || "Error fetching questions.");
    }
};



// exports.fetchBulkQuestionsWithPublishStatusAndProjection = function (request, callback) {

//     dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
//         if (DBErr) {
//             console.log(constant.messages.DATABASE_ERROR);
//             console.log(DBErr);
//             callback(500, constant.messages.DATABASE_ERROR);
//         } else {
//             let { IdArray, fetchIdName, TableName, projectionExp, questionStatus } = request;
            
//             let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
//             let expAttributeVal = {};

//             let docClient = dynamoDBCall;
//             let FilterExpressionDynamic = "";
//             let ExpressionAttributeValuesDynamic = {};

//             IdArray = [...new Set(IdArray)];

//             console.log("IdArray : ", IdArray);
//             if (IdArray.length === 0) {
//                 console.log("EMPTY BULK ID");
//                 callback(0, { Items: [] });
//             } 
//             else if (IdArray.length === 1) 
//             {
//                 expAttributeVal[":" + fetchIdName] = IdArray[0];
//                 expAttributeVal[":question_status"] = questionStatus;

//                 let read_params = {
//                     TableName: TableName,
//                     FilterExpression: "" + fetchIdName + " = :" + fetchIdName + " AND question_status = :question_status",
//                     ExpressionAttributeValues: expAttributeVal,
//                     ProjectionExpression: projectionExp,
//                 };

//                 console.log("READ PARAMS : ", read_params);

//                 DATABASE_TABLE.scanRecord(docClient, read_params, callback);
//             } 
//             else {
//                 IdArray.forEach((element, index) => {
//                     if (index < IdArray.length - 1) {
//                         FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index + " OR ";
//                         ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element + "";
//                         ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus + "";
//                     } else {
//                         FilterExpressionDynamic = FilterExpressionDynamic + filterExpDynamic + index + " AND question_status = :question_status" + index;
//                         ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] = element;
//                         ExpressionAttributeValuesDynamic[":question_status" + index] = questionStatus;
//                     }
//                 });

//                 let read_params = {
//                     TableName: TableName,
//                     FilterExpression: FilterExpressionDynamic,
//                     ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
//                     ProjectionExpression: projectionExp,
//                 };

//                 console.log("READ PARAMETER : ", read_params);

//                 DATABASE_TABLE.scanRecord(docClient, read_params, callback);
//             }
//         }
//     });
// }

// exports.fetchBulkQuestionsNameById = function (request, callback) {

//     dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
//         if (DBErr) {
//             console.log("Class Data Database Error");
//             console.log(DBErr);
//             callback(500, constant.messages.DATABASE_ERROR);
//         } else {
//             let docClient = dynamoDBCall;
//             let FilterExpressionDynamic = "";
//             let ExpressionAttributeValuesDynamic = {}; 
//             console.log("fetchChapterData request : ", request);
//             let question_id = request.question_id;
//             console.log("question_id : ", question_id);
//             if(question_id.length === 1){
//                 let read_params = {
//                     TableName: TABLE_NAMES.upschool_question_table,
//                     KeyConditionExpression: "question_id = :question_id",
//                     ExpressionAttributeValues: { 
//                         ":question_id": question_id[0]
//                     },
//                     ProjectionExpression: ["answers_of_question", "cognitive_skill", "question_id" ,"question_type" , "marks" , "difficulty_level" , "question_content"],
//                 }
    
//                 DATABASE_TABLE.queryRecord(docClient, read_params, callback);

//             }else{
//                 console.log(" Chapter Else");
//                 question_id.forEach((element, index) => { 
//                     console.log("element : ", element);

//                     if(index < question_id.length-1){ 
//                         FilterExpressionDynamic = FilterExpressionDynamic + "question_id = :question_id"+ index +" OR "
//                         ExpressionAttributeValuesDynamic[':question_id'+ index] = element
//                     } else{
//                         FilterExpressionDynamic = FilterExpressionDynamic + "question_id = :question_id"+ index
//                         ExpressionAttributeValuesDynamic[':question_id'+ index] = element;
//                     }
//                 });

//                 let read_params = {
//                     TableName: TABLE_NAMES.upschool_question_table,
//                     FilterExpression: FilterExpressionDynamic,
//                     ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
//                     ProjectionExpression: ["answers_of_question", "cognitive_skill", "question_id" ,"question_type" , "marks" , "difficulty_level" , "question_content"],
//                 }
//                 DATABASE_TABLE.scanRecord(docClient, read_params, callback);
//             }
//         }
//     });
// }

exports.fetchBulkQuestionsNameById = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let question_id = request.question_id;
            console.log("fetchChapterData request : ", request);
            console.log("question_id : ", question_id);

            if (question_id.length === 1) {
                // Single question_id - use Query
                let read_params = {
                    TableName: TABLE_NAMES.upschool_question_table,
                    KeyConditionExpression: "question_id = :question_id",
                    ExpressionAttributeValues: {
                        ":question_id": question_id[0]
                    },
                    ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
                };

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                let uniqueIds = [...new Set(question_id)];
                let keys = uniqueIds.map(id => ({ question_id: id }));

                let read_params = {
                    RequestItems: {
                        [TABLE_NAMES.upschool_question_table]: {
                            Keys: keys,
                            ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
                        }
                    }
                };

                docClient.batchGet(read_params, function (err, data) {
                    if (err) {
                        console.log("BatchGet Error: ", err);
                        callback(500, constant.messages.DATABASE_ERROR);
                    } else {
                        console.log("BatchGet Data: ", data);
                        callback(null, data.Responses[TABLE_NAMES.upschool_question_table]);
                    }
                });
            }
        }
    });
};

exports.fetchBulkQuestionsNameById3 = function (request, callback) {
    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) {
            console.log("Class Data Database Error");
            console.log(DBErr);
            callback(500, constant.messages.DATABASE_ERROR);
        } else {
            let docClient = dynamoDBCall;
            let question_id = request.question_id;
            console.log("fetchChapterData request : ", request);
            console.log("question_id : ", question_id);

            if (question_id.length === 1) {
                // Single question_id - use Query
                let read_params = {
                    TableName: TABLE_NAMES.upschool_question_table,
                    KeyConditionExpression: "question_id = :question_id",
                    ExpressionAttributeValues: {
                        ":question_id": question_id[0]
                    },
                    ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
                };

                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else {
                let uniqueIds = [...new Set(question_id)];
                let keys = uniqueIds.map(id => ({ question_id: id }));

                const MAX_BATCH_SIZE = 100;
                let batches = [];
                for (let i = 0; i < keys.length; i += MAX_BATCH_SIZE) {
                    batches.push(keys.slice(i, i + MAX_BATCH_SIZE));
                }
                let results = [];
                let batchErrors = [];

                const processBatch = (index) => {
                    if (index >= batches.length) {
                        if (batchErrors.length > 0) {
                            return callback(500, "Some batches failed", batchErrors);
                        }
                        return callback(null, results);
                    }

                    let read_params = {
                        RequestItems: {
                            [TABLE_NAMES.upschool_question_table]: {
                                Keys: batches[index],
                                ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
                            }
                        }
                    };

                    docClient.batchGet(read_params, function (err, data) {
                        if (err) {
                            console.error(`BatchGet Error for batch ${index}:`, err);
                            batchErrors.push(err);
                        } else {
                            console.log(`BatchGet Data for batch ${index}:`, data);
                            if (data.Responses[TABLE_NAMES.upschool_question_table]) {
                                results = results.concat(data.Responses[TABLE_NAMES.upschool_question_table]);
                            }
                        }
                        processBatch(index + 1);
                    });
                };

                processBatch(0);
            }
        }
    });
};



exports.fetchBulkQuestionsNameById2 = async (request) => {
        const question_ids = [...new Set(request.question_id)]; // Remove duplicates

        if (question_ids.length === 1) {
            // When there is only one question ID
            const params = {
                TableName: TABLE_NAMES.upschool_question_table,
                KeyConditionExpression: "question_id = :question_id",
                ExpressionAttributeValues: { 
                    ":question_id": question_ids[0]
                },
                ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
            };

            const result = await DATABASE_TABLE2.query(params);
            return result.Items;
        } else {
            // When there are multiple question IDs
            const keys = question_ids.map((id) => ({
                question_id: id
            }));

            const params = {
                RequestItems: { 
                    [TABLE_NAMES.upschool_question_table]: {
                        Keys: keys,
                        ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
                    }
                }
            };

            const result = await DATABASE_TABLE2.getByObjects(params);
            return result.Responses[TABLE_NAMES.upschool_question_table];
        }

};
exports.fetchBulkQuestionsNameById5 = async (request) => {
    const question_ids = [...new Set(request.question_id)]; // Remove duplicates

    if (question_ids.length === 1) {
        // When there is only one question ID
        const params = {
            TableName: TABLE_NAMES.upschool_question_table,
            KeyConditionExpression: "question_id = :question_id",
            ExpressionAttributeValues: {
                ":question_id": question_ids[0]
            },
            ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
        };

        const result = await DATABASE_TABLE2.query(params);
        return result.Items;
    } else {
        const BATCH_SIZE = 100;
        let allResults = [];

        // Process the question_ids in batches to avoid large queries
        for (let i = 0; i < question_ids.length; i += BATCH_SIZE) {
            const batchIds = question_ids.slice(i, i + BATCH_SIZE);

            const params = {
                RequestItems: {
                    [TABLE_NAMES.upschool_question_table]: {
                        Keys: batchIds.map(id => ({ question_id: id })),
                        ProjectionExpression: "answers_of_question, cognitive_skill, question_id, question_type, marks, difficulty_level, question_content"
                    }
                }
            };

            try {
                const result = await DATABASE_TABLE2.getByObjects(params);
                // Concatenate the results to allResults
                allResults = allResults.concat(result.Responses[TABLE_NAMES.upschool_question_table] || []);
            } catch (err) {
                console.error("BatchGet Error: ", err);
                throw new Error("Error fetching questions from database");
            }
        }

        return allResults;
    }

};





