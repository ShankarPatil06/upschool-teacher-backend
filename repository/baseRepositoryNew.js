const { client } = require('../awsConfig');
const { QueryCommand, UpdateCommand, BatchWriteCommand, DynamoDBDocumentClient, DeleteCommand, PutCommand, GetCommand, BatchGetCommand} = require('@aws-sdk/lib-dynamodb');

// Configure the AWS SDK to use the local DynamoDB instance

const ddbDocClient = DynamoDBDocumentClient.from(client);

const createMany =async(params)=> await client.send(new BatchWriteCommand(params));

const deleteItem = async (params) => await client.send(new DeleteCommand(params));

const deleteMany = async (params) =>  await ddbDocClient.send(new BatchWriteCommand(params));

const getByObjects = async (params) => await client.send(new BatchGetCommand(params))

const getItem = async (params) => await client.send(new GetCommand(params));

const putItem = async (params) => await ddbDocClient.send(new PutCommand(params));

const query = async (params) => await ddbDocClient.send(new QueryCommand(params));

const scanTable = async (params) => await client.send(new ScanCommand(params));

const updateService = async (params) => await ddbDocClient.send(new UpdateCommand(params));
      

exports.DATABASE_TABLE2 = {
    createMany,
    
    deleteItem,
    deleteMany,

    getByObjects,
    getItem,

    putItem,

    query,

    scanTable,
    
    updateService,
    
}