const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = require("@aws-sdk/client-athena");
const { processRows } = require("../helper/helper");
// const { messages } = require('../constants/constant')

const client = new AthenaClient({
    credentials: {
        accessKeyId: "AKIAQREMEI3PTKK4GBG5",
        secretAccessKey: "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",
    },
    region: "ap-south-1",
    maxRetries: 2,
    httpOptions: {
        timeout: 60000,
        connectTimeout: 60000
    }
});

exports.executeQuery = async (query) => {
    try {
        const startParams = {
            QueryString: query, // Replace with your SQL query
            QueryExecutionContext: {
                Database: "default", // Replace with your database name
                Catalog: "UpschoolDynamoDBSource",
            },
            ResultConfiguration: {
                OutputLocation: "s3://upschooldbbucket/query-results/", // Replace with your S3 bucket URI for query results
                EncryptionConfiguration: {
                    EncryptionOption: 'SSE_S3', /* required */
                }
            }
        };

        // Create and send a StartQueryExecutionCommand
        const startCommand = new StartQueryExecutionCommand(startParams);
        const startData = await client.send(startCommand);

        const queryExecutionId = startData.QueryExecutionId;

        // Poll for the query execution status
        let status = "RUNNING";
        while (status === "RUNNING" || status === "QUEUED") {
            // Wait before checking the status again
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds

            // Define parameters to get query execution status
            const statusParams = {
                QueryExecutionId: queryExecutionId
            };

            // Create and send a GetQueryExecutionCommand
            const statusCommand = new GetQueryExecutionCommand(statusParams);
            const statusData = await client.send(statusCommand);
            status = statusData.QueryExecution.Status.State;

        }

        if (status === "SUCCEEDED") {
            // Fetch the results if the query succeeded
            const resultsParams = {
                QueryExecutionId: queryExecutionId
            };

            const resultsCommand = new GetQueryResultsCommand(resultsParams);
            const resultsData = await client.send(resultsCommand);

            // Get first batch of rows
            return processRows(resultsData);
        } else {
            throw status;
        }
    } catch (error) {
        throw error;
    }
}