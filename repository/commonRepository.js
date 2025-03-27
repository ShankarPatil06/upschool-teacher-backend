const helper = require("../helper/helper");
const { DATABASE_TABLE2 } = require('./baseRepositoryNew');
const { indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');
const { constValues, messages, awsConstants } = require('../constants/constant');

exports.fetchBulkData2 = async (request) => {
  const { IdArray, fetchIdName, TableName } = request;

  if (!IdArray || IdArray.length === 0) {
    throw new Error(messages.INVALID_REQUEST);
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

exports.getBulkDataUsingIndexWithActiveStatus2 = async (request) => {

  const { IdArray, fetchIdName, TableName, isActiveFieldName, isActive } = request;

  let FilterExpressionDynamic = "";
  let ExpressionAttributeValuesDynamic = {};

  if (IdArray.length === 1) {
    ExpressionAttributeValuesDynamic[`:${fetchIdName}`] = IdArray[0];
    ExpressionAttributeValuesDynamic[":common_id"] = constValues.common_id;

    const readParams = {
      TableName: TableName,
      IndexName: Indexes.common_id_index,
      KeyConditionExpression: "common_id = :common_id",
      FilterExpression: `${fetchIdName} = :${fetchIdName}`,
      ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
    };

    return await DATABASE_TABLE2.query(readParams);
  } else {
    IdArray.forEach((element, index) => {
      FilterExpressionDynamic += `${fetchIdName} = :${fetchIdName}${index}`;
      ExpressionAttributeValuesDynamic[`:${fetchIdName}${index}`] = element;

      if (index < IdArray.length - 1) {
        FilterExpressionDynamic += " OR ";
      }
    });

    FilterExpressionDynamic += ` AND ${isActiveFieldName} = :${isActiveFieldName}`;
    ExpressionAttributeValuesDynamic[":" + isActiveFieldName] = isActive;
    ExpressionAttributeValuesDynamic[":common_id"] = constValues.common_id;

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

exports.fetchBulkDataWithProjection5 = async ({ IdArray, fetchIdName, TableName, projectionExp }) => {
  if (!Array.isArray(IdArray) || IdArray.length === 0) {
    throw new Error(messages.ID_ARRAY_REQUIRED);
  }

  const queryResults = await Promise.all(
    IdArray.map(async (id) => {
      const params = {
        TableName,
        KeyConditionExpression: `${fetchIdName} = :idVal`,
        ExpressionAttributeValues: {
          ":idVal": id,
        },
        ProjectionExpression: projectionExp.join(", "),
      };

      try {
        const result = await DATABASE_TABLE2.query(params);
        return result.Items;
      } catch (error) {
        console.error("DynamoDB Query Error:", error);
        throw error;
      }
    })
  );

  return queryResults.flat();
}

exports.fetchBulkDataWithProjection2 = async (request) => {
  try {
    const question_ids = [...new Set(request.items.map((item) => item.question_id))];

    if (question_ids.length === 0) {
      throw new Error(messages.NO_QUESTION_IDS_PROVIDED);
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
    throw new Error(messages.BULK_DATA_FETCH_FAILED);
  }
};

const chunkArray = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

exports.fetchBulkDataWithProjection3 = async (request) => {
  let { IdArray, fetchIdName, TableName, projectionExp } = request;

  IdArray = [...new Set(IdArray)];

  if (IdArray.length === 0) {
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

    const result = await DATABASE_TABLE2.query(read_params);
    return result.Items || [];
  } else {
    const idChunks = chunkArray(IdArray, 100);
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

    const batchSize = awsConstants.batchSize;
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
  } catch (error) {
    console.error(`Error in batch write: ${error.message}`);
  }
}