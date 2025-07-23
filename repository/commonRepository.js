const dynamoDbCon = require("../awsConfig");
const { DATABASE_TABLE } = require("./baseRepository");
const helper = require("../helper/helper");
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.fetchBulkData = function (request, callback) {
  dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
    if (DBErr) {
      console.log(constant.messages.DATABASE_ERROR);
      console.log(DBErr);
      callback(500, constant.messages.DATABASE_ERROR);
    } else {
      let IdArray = request.IdArray;
      let fetchIdName = request.fetchIdName;
      let TableName = request.TableName;

      let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
      let expAttributeVal = {};

      let docClient = dynamoDBCall;
      let FilterExpressionDynamic = "";
      let ExpressionAttributeValuesDynamic = {};

      if (IdArray.length === 1) {
        expAttributeVal[":" + fetchIdName] = IdArray[0];

        let read_params = {
          TableName: TableName,
          KeyConditionExpression: "" + fetchIdName + " = :" + fetchIdName + "",
          ExpressionAttributeValues: expAttributeVal,
        };

        console.log("READ PARAMS : ", read_params);

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      } else {
        IdArray.forEach((element, index) => {
          if (index < IdArray.length - 1) {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + " OR ";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element + "";
          } else {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + "";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element;
          }
        });
        let read_params = {
          TableName: TableName,
          FilterExpression: FilterExpressionDynamic,
          ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
        };
        DATABASE_TABLE.scanRecord(docClient, read_params, callback);
      }
    }
  });
};



////chunking
// exports.fetchBulkData = function (request, callback) {
//   dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
//     if (DBErr) {
//       console.log(constant.messages.DATABASE_ERROR);
//       console.log(DBErr);
//       return callback(500, constant.messages.DATABASE_ERROR);
//     }

//     let IdArray = request.IdArray;
//     let fetchIdName = request.fetchIdName;
//     let TableName = request.TableName;

//     // Deduplicate IDs to avoid processing duplicates
//     IdArray = [...new Set(IdArray)];
//     console.log("ID Array:", IdArray);

//     if (IdArray.length === 0) {
//       console.log("EMPTY BULK ID");
//       return callback(0, { Items: [] });
//     }

//     let docClient = dynamoDBCall;

//     if (IdArray.length === 1) {
//       // Single ID - use query operation for better performance
//       let expAttributeVal = {};
//       expAttributeVal[":" + fetchIdName] = IdArray[0];

//       let read_params = {
//         TableName: TableName,
//         KeyConditionExpression: fetchIdName + " = :" + fetchIdName,
//         ExpressionAttributeValues: expAttributeVal,
//       };

//       console.log("READ PARAMS : ", read_params);
//       DATABASE_TABLE.queryRecord(docClient, read_params, callback);
//     } else {
//       // Multiple IDs - use chunking strategy
//       const CHUNK_SIZE = 25; // Optimal chunk size for scan operations
//       const idChunks = helper.chunkArray(IdArray, CHUNK_SIZE);

//       console.log(`Processing ${idChunks.length} chunks of max ${CHUNK_SIZE} items each`);

//       let allResults = [];
//       let completedChunks = 0;
//       let hasError = false;

//       // Process each chunk sequentially to avoid overwhelming DynamoDB
//       const processChunk = (chunkIndex) => {
//         if (hasError || chunkIndex >= idChunks.length) {
//           // All chunks processed successfully
//           if (!hasError && chunkIndex >= idChunks.length) {
//             console.log(`Total items retrieved: ${allResults.length}`);
//             return callback(0, { Items: allResults });
//           }
//           return;
//         }

//         const chunk = idChunks[chunkIndex];
//         let FilterExpressionDynamic = "";
//         let ExpressionAttributeValuesDynamic = {};

//         // Build filter expression for this chunk
//         chunk.forEach((element, index) => {
//           FilterExpressionDynamic += fetchIdName + " = :" + fetchIdName + index;
//           ExpressionAttributeValuesDynamic[":" + fetchIdName + index] = element;

//           if (index < chunk.length - 1) {
//             FilterExpressionDynamic += " OR ";
//           }
//         });

//         let read_params = {
//           TableName: TableName,
//           FilterExpression: FilterExpressionDynamic,
//           ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
//         };

//         console.log(`SCAN PARAMS for chunk ${chunkIndex + 1}/${idChunks.length}:`, JSON.stringify(read_params, null, 2));

//         // Process this chunk
//         DATABASE_TABLE.scanRecord(docClient, read_params, (err, data) => {
//           if (hasError) return; // Skip if another chunk already failed

//           if (err) {
//             console.error(`Error processing chunk ${chunkIndex + 1}:`, err);
//             hasError = true;
//             return callback(500, `Error fetching bulk data: ${err}`);
//           }

//           // Add this chunk's results to total results
//           if (data && data.Items) {
//             allResults = allResults.concat(data.Items);
//           }

//           completedChunks++;
//           console.log(`Completed chunk ${completedChunks}/${idChunks.length}, items so far: ${allResults.length}`);

//           // Process next chunk
//           processChunk(chunkIndex + 1);
//         });
//       };

//       // Start processing from first chunk
//       processChunk(0);
//     }
//   });
// };


exports.fetchBulkData2 = async function (request) {
  const { IdArray, fetchIdName, TableName } = request;

  if (!IdArray || IdArray.length === 0) {
    throw new Error(constant.messages.INVALID_PARAMETERS);
  }

  let response = { data: [] };

  if (IdArray.length === 1) {
    const readParams = {
      TableName,
      KeyConditionExpression: `${fetchIdName} = :${fetchIdName}`,
      ExpressionAttributeValues: {
        [`:${fetchIdName}`]: IdArray[0]
      }
    };

    const result = await DATABASE_TABLE2.query(readParams);
    response.data = result.Items || [];
  } else {
    const keys = IdArray.map(id => ({ [fetchIdName]: id }));
    const readParams = {
      RequestItems: {
        [TableName]: {
          Keys: keys
        }
      }
    };

    const result = await DATABASE_TABLE2.getByObjects(readParams);
    response.data = result.Responses ? result.Responses[TableName] : [];
  }

  return response;
};


exports.BulkInsert = function (final_data, userTable, callback) {
  if (final_data.length > 0) {
    dynamoDbCon.getDB(async function (DBErr, dynamoDBCall) {
      if (DBErr) {
        console.log(constant.messages.DATABASE_ERROR);
        console.log(DBErr);
        callback(500, constant.messages.DATABASE_ERROR);
      } else {
        let docClient = dynamoDBCall;

        const putReqs = final_data.map((item) => ({
          PutRequest: {
            Item: item,
          },
        }));

        let ItemsObjects = {};
        ItemsObjects[userTable] = putReqs;

        const req = {
          RequestItems: ItemsObjects,
        };

        await docClient.batchWrite(req).promise();
        console.log("Bulk Data Added/Updated!");
        callback(0, 200);
      }
    });
  } else {
    callback(0, 200);
  }
};

exports.fetchBulkDataUsingIndex = function (request, callback) {
  dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
    if (DBErr) {
      console.log(constant.messages.DATABASE_ERROR);
      console.log(DBErr);
      callback(500, constant.messages.DATABASE_ERROR);
    } else {
      let IdArray = request.IdArray;
      let fetchIdName = request.fetchIdName;
      let TableName = request.TableName;

      let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
      let expAttributeVal = {};

      let docClient = dynamoDBCall;
      let FilterExpressionDynamic = "";
      let ExpressionAttributeValuesDynamic = {};

      if (IdArray.length === 1) {
        expAttributeVal[":" + fetchIdName] = IdArray[0];
        expAttributeVal[":common_id"] = constant.constValues.common_id;

        let read_params = {
          TableName: TableName,
          IndexName: Indexes.common_id_index,
          KeyConditionExpression: "common_id = :common_id",
          FilterExpression: "" + fetchIdName + " = :" + fetchIdName + "",
          ExpressionAttributeValues: expAttributeVal,
        };

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      } else {
        IdArray.forEach((element, index) => {
          if (index < IdArray.length - 1) {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + " OR ";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element + "";
          } else {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + "";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element;
          }
        });
        ExpressionAttributeValuesDynamic[":common_id"] =
          constant.constValues.common_id;

        let read_params = {
          TableName: TableName,
          IndexName: Indexes.common_id_index,
          KeyConditionExpression: "common_id = :common_id",
          FilterExpression: FilterExpressionDynamic,
          ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
        };

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      }
    }
  });
};

exports.getBulkDataUsingIndexWithActiveStatus = function (request, callback) {
  dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
    if (DBErr) {
      console.log(constant.messages.DATABASE_ERROR);
      console.log(DBErr);
      callback(500, constant.messages.DATABASE_ERROR);
    } else {
      let { IdArray, fetchIdName, TableName, isActiveFieldName, isActive } = request;
      //   let IdArray = request.IdArray;
      //   let fetchIdName = request.fetchIdName;
      //   let TableName = request.TableName;
      //   let isActiveFieldName = request.isActiveFieldName;
      //   let isActive = request.isActive;

      let filterExpDynamic = fetchIdName + "= :" + fetchIdName;
      let expAttributeVal = {};

      let docClient = dynamoDBCall;
      let FilterExpressionDynamic = "";
      let ExpressionAttributeValuesDynamic = {};

      if (IdArray.length === 1) {
        expAttributeVal[":" + fetchIdName] = IdArray[0];
        expAttributeVal[":common_id"] = constant.constValues.common_id;

        let read_params = {
          TableName: TableName,
          IndexName: Indexes.common_id_index,
          KeyConditionExpression: "common_id = :common_id",
          FilterExpression: "" + fetchIdName + " = :" + fetchIdName + "",
          ExpressionAttributeValues: expAttributeVal,
        };

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      } else {
        IdArray.forEach((element, index) => {
          if (index < IdArray.length - 1) {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + " OR ";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element + "";
          } else {
            FilterExpressionDynamic =
              FilterExpressionDynamic + filterExpDynamic + index + "";
            ExpressionAttributeValuesDynamic[":" + fetchIdName + "" + index] =
              element;
          }
        });
        FilterExpressionDynamic =
          FilterExpressionDynamic +
          " AND " +
          isActiveFieldName +
          "= :" +
          isActiveFieldName;
        ExpressionAttributeValuesDynamic[":" + isActiveFieldName] = isActive;
        ExpressionAttributeValuesDynamic[":common_id"] =
          constant.constValues.common_id;

        let read_params = {
          TableName: TableName,
          IndexName: Indexes.common_id_index,
          KeyConditionExpression: "common_id = :common_id",
          FilterExpression: FilterExpressionDynamic,
          ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
        };

        DATABASE_TABLE.queryRecord(docClient, read_params, callback);
      }
    }
  });
};

exports.getBulkDataUsingIndexWithActiveStatus2 = async (request) => {

  const { IdArray, fetchIdName, TableName, isActiveFieldName, isActive } = request;

  let FilterExpressionDynamic = "";
  let ExpressionAttributeValuesDynamic = {};

  if (IdArray.length === 1) {
    ExpressionAttributeValuesDynamic[`:${fetchIdName}`] = IdArray[0];
    ExpressionAttributeValuesDynamic[":common_id"] = constant.constValues.common_id;

    const readParams = {
      TableName: TableName,
      IndexName: Indexes.common_id_index,
      KeyConditionExpression: "common_id = :common_id",
      FilterExpression: `${fetchIdName} = :${fetchIdName}`,
      ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
    };

    return await DATABASE_TABLE2.query(readParams);
  }

  else {
    IdArray.forEach((element, index) => {
      FilterExpressionDynamic += `${fetchIdName} = :${fetchIdName}${index}`;
      ExpressionAttributeValuesDynamic[`:${fetchIdName}${index}`] = element;

      if (index < IdArray.length - 1) {
        FilterExpressionDynamic += " OR ";
      }
    });

    FilterExpressionDynamic += ` AND ${isActiveFieldName} = :${isActiveFieldName}`;
    ExpressionAttributeValuesDynamic[":" + isActiveFieldName] = isActive;
    ExpressionAttributeValuesDynamic[":common_id"] = constant.constValues.common_id;

    const readParams = {
      TableName: TableName,
      IndexName: Indexes.common_id_index,
      KeyConditionExpression: "common_id = :common_id",
      FilterExpression: FilterExpressionDynamic,
      ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
    };

    return await DATABASE_TABLE2.query(readParams);
  }
};

// ///////////////chunk
// exports.getBulkDataUsingIndexWithActiveStatus2 = async (request) => {
//   let { IdArray, fetchIdName, TableName, isActiveFieldName, isActive } = request;

//   // Deduplicate IDs to avoid processing duplicates
//   IdArray = [...new Set(IdArray)];
//   console.log("IdArray : ", IdArray);

//   if (IdArray.length === 0) {
//     console.log("EMPTY BULK ID");
//     return { Items: [] };
//   } else if (IdArray.length === 1) {
//     let ExpressionAttributeValuesDynamic = {};
//     ExpressionAttributeValuesDynamic[`:${fetchIdName}`] = IdArray[0];
//     ExpressionAttributeValuesDynamic[":common_id"] = constant.constValues.common_id;
//     ExpressionAttributeValuesDynamic[`:${isActiveFieldName}`] = isActive;

//     const readParams = {
//       TableName: TableName,
//       IndexName: Indexes.common_id_index,
//       KeyConditionExpression: "common_id = :common_id",
//       FilterExpression: `${fetchIdName} = :${fetchIdName} AND ${isActiveFieldName} = :${isActiveFieldName}`,
//       ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
//     };

//     console.log("READ PARAMS : ", readParams);
//     const result = await DATABASE_TABLE2.query(readParams);
//     return result.Items || [];
//   } else {
//     // Use chunking to optimize large ID arrays
//     // Smaller chunk size for query operations due to filter expression complexity
//     const idChunks = helper.chunkArray(IdArray, 100);
//     let allResponses = [];

//     console.log(`Processing ${idChunks.length} chunks of max 25 items each`);

//     // Process chunks sequentially to avoid overwhelming DynamoDB
//     for (const chunk of idChunks) {
//       let FilterExpressionDynamic = "";
//       let ExpressionAttributeValuesDynamic = {};

//       // Build OR condition for this chunk
//       chunk.forEach((element, index) => {
//         FilterExpressionDynamic += `${fetchIdName} = :${fetchIdName}${index}`;
//         ExpressionAttributeValuesDynamic[`:${fetchIdName}${index}`] = element;

//         if (index < chunk.length - 1) {
//           FilterExpressionDynamic += " OR ";
//         }
//       });

//       // Add active status filter and common_id
//       FilterExpressionDynamic += ` AND ${isActiveFieldName} = :${isActiveFieldName}`;
//       ExpressionAttributeValuesDynamic[`:${isActiveFieldName}`] = isActive;
//       ExpressionAttributeValuesDynamic[":common_id"] = constant.constValues.common_id;

//       const readParams = {
//         TableName: TableName,
//         IndexName: Indexes.common_id_index,
//         KeyConditionExpression: "common_id = :common_id",
//         FilterExpression: FilterExpressionDynamic,
//         ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
//       };

//       console.log(`QUERY PARAMS for chunk: `, JSON.stringify(readParams, null, 2));

//       try {
//         const response = await DATABASE_TABLE2.query(readParams);
//         if (response.Items && response.Items.length > 0) {
//           allResponses = allResponses.concat(response.Items);
//         }
//       } catch (error) {
//         console.error(`Error processing chunk:`, error);
//         throw error;
//       }
//     }

//     console.log(`Total items retrieved: ${allResponses.length}`);
//     return allResponses;
//   }
// };




exports.fetchBulkDataWithProjection = function (request, callback) {
  dynamoDbCon.getDB(async function (DBErr, docClient) {
    if (DBErr) {
      console.log(constant.messages.DATABASE_ERROR);
      console.log(DBErr);
      return callback(500, constant.messages.DATABASE_ERROR);
    }

    let { IdArray, fetchIdName, TableName, projectionExp } = request;
    IdArray = [...new Set(IdArray)];

    console.log("IdArray:", IdArray);

    if (IdArray.length === 0) {
      console.log("EMPTY BULK ID");
      return callback(0, { Items: [] });
    }

    const idChunks = helper.chunkArray(IdArray, 100);
    const allItems = [];

    let completed = 0;
    let hasError = false;

    idChunks.forEach((chunk) => {
      const keys = chunk.map(id => ({ [fetchIdName]: id }));
      const params = {
        RequestItems: {
          [TableName]: {
            Keys: keys,
            ProjectionExpression: projectionExp
          }
        }
      };

      DATABASE_TABLE.batchReadRecord(docClient, params, (err, data) => {
        if (hasError) return;

        if (err) {
          console.error("BatchRead Error:", err);
          hasError = true;
          return callback(500, "Error fetching data from DynamoDB");
        }

        const items = (data?.Responses && data.Responses[TableName]) || [];
        allItems.push(...items);

        completed++;
        if (completed === idChunks.length) {
          return callback(0, { Items: allItems });
        }
      });
    });
  });
};

// exports.fetchBulkDataWithProjection2 = async (request) => {
//   // const fromatedRequest = await helper.getDataByFilterKey(request);
//   // const params = {
//   //   TableName: TABLE_NAMES.upschool_question_table,
//   //   IndexName: Indexes.common_id_index,
//   //   KeyConditionExpression: "common_id = :common_id",
//   //   FilterExpression: fromatedRequest.FilterExpression,
//   //   ExpressionAttributeValues: fromatedRequest.ExpressionAttributeValues,
//   // };
//   // try {
//   //   console.log("params",params)
//   //   return await DATABASE_TABLE2.query(params);    
//   // } catch (error) {
//   //   console.error(`Error fetching quiz results:`, error);
//   //   throw error;
//   // }
//   const unit_Quiz_id = [...new Set(request.items)]; // Remove duplicates

//   const common_id = constant.constValues.common_id;

//   // Create filter expression for multiple quiz_id
//   const filterExpression = unit_Quiz_id.map((_, index) => `question_id = :question_id${index}`).join(" OR ");
//   console.log("filterExpression",filterExpression);

//   const expressionAttributeValues = unit_Quiz_id.reduce((acc, quizId, index) => {
//       acc[`:question_id${index}`] = quizId.question_id;
//       return acc;
//   },
//    { ":common_id": common_id });
//   console.log("expressionAttributeValues",expressionAttributeValues);


//   const params = {
//       TableName: TABLE_NAMES.upschool_question_table,
//       IndexName: Indexes.common_id_index,
//       KeyConditionExpression: "common_id = :common_id",
//       FilterExpression: filterExpression,
//       ExpressionAttributeValues: expressionAttributeValues,
//       // ProjectionExpression:["question_id","question_type","marks","answers_of_question"]
//   };
//   // console.log("params",params)

//       const result = await DATABASE_TABLE2.query(params);
//       return result.Items;
// };

exports.fetchBulkDataWithProjection2 = async (request) => {
  try {
    const question_ids = [...new Set(request.items.map((item) => item.question_id))];

    if (question_ids.length === 0) {
      throw new Error("No question IDs provided.");
    }

    const queries = question_ids.map((question_id) => {
      const params = {
        TableName: TABLE_NAMES.upschool_question_table,
        KeyConditionExpression: "question_id = :question_id",
        ExpressionAttributeValues: {
          ":question_id": question_id
        }
      };
      return DATABASE_TABLE2.query(params);
    });

    const results = await Promise.all(queries);

    const allResults = results.flatMap(result => result.Items || []);

    return allResults;
  } catch (error) {
    throw new Error("Failed to fetch bulk data.");
  }
};

exports.fetchBulkDataWithProjection3 = async (request) => {
  let { IdArray, fetchIdName, TableName, projectionExp } = request;

  IdArray = [...new Set(IdArray)];
  console.log("IdArray : ", IdArray);

  if (IdArray.length === 0) {
    console.log("EMPTY BULK ID");
    return { Items: [] };
  } else if (IdArray.length === 1) {
    let expAttributeVal = {};
    expAttributeVal[`:${fetchIdName}`] = IdArray[0];

    let read_params = {
      TableName: TableName,
      KeyConditionExpression: `${fetchIdName} = :${fetchIdName}`,
      ExpressionAttributeValues: expAttributeVal,
      ProjectionExpression: projectionExp.join(", "),
    };

    console.log("READ PARAMS : ", read_params);
    const result = await DATABASE_TABLE2.query(read_params);
    return result.Items || [];
  } else {
    const idChunks = helper.chunkArray(IdArray, 100);
    let allResponses = [];

    for (const chunk of idChunks) {
      const keys = chunk.map(id => ({ [fetchIdName]: id }));

      let batchParams = {
        RequestItems: {
          [TableName]: {
            Keys: keys,
            ProjectionExpression: projectionExp.join(", "),
          },
        },
      };

      console.log("BATCH GET PARAMS : ", JSON.stringify(batchParams, null, 2));
      const response = await DATABASE_TABLE2.getByObjects(batchParams);
      if (response.Responses && response.Responses[TableName]) {
        allResponses = allResponses.concat(response.Responses[TableName]);
      }
    }

    return allResponses;
  }
};

exports.bulkBatchWrite = async (itemsToWrite, userTable) => {
  if (itemsToWrite.length > 0) {

    const batchSize = constant.awsConstants.batchSize;
    const promises = [];

    for (let i = 0; i < itemsToWrite.length; i += batchSize) {
      const batch = itemsToWrite.slice(i, i + batchSize);
      console.log({ batch });
      promises.push(exports.performBatchWrite(batch, userTable));
    }

    try {
      await Promise.all(promises);
      return 200;
    } catch (error) {
      throw helper.formatErrorResponse(error.message, 400);

    }
  } else {
    return 200;
  }
};


// async function performBatchWrite(batch, userTable) {
//     const params = { RequestItems: { 'YourTableName': batch } };
//     try {
//         await dynamoDB.batchWrite(params).promise();
//         console.log('Batch write successful.');
//     } catch (error) {
//         console.error(`Error in batch write: ${error.message}`);
//     }
// }

exports.performBatchWrite = async (batch, userTable) => {

  const putReqs = await batch.map((item) => ({
    PutRequest: {
      Item: item,
    },
  }));

  let ItemsObjects = {};
  ItemsObjects[userTable] = putReqs;

  const req = {
    RequestItems: ItemsObjects,
  };

  try {
    await DATABASE_TABLE2.createMany(req);
    console.log("Done batch wirte");
  } catch (error) {
    console.error(`Error in batch write: ${error.message}`);
  }
}