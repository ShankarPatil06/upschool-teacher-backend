const scanData = (docClient, params, callback) => {
    docClient.scan(params, (err, data) => {
        if (err) {
            console.log(err);
            callback(err, data);
        } else {
            callback(err, data);
        }
    });
};

const queryData = (docClient, params, callback) => {
    queryWithPagination(docClient, params, (err, data) => {
        if (err) {
            console.log(err);
            callback(err, data);
        } else {
            callback(err, data);
        }
    });
};

const putData = (docClient, params, callback) => {
    docClient.put(params, (err, data) => {
        if (err) {
            console.log(err);
            callback(err, data);
        } else {
            callback(0, 200);
        }
    });
};

const updateData = (docClient, params, callback) => {
    docClient.update(params, (err, data) => {
        if (err) {
            callback(err, data);
        } else {
            callback(0, 200);
        }
    });
};

const deleteData = (docClient, params, callback) => {
    docClient.delete(params, (err, data) => {
        if (err) {
            console.log(err);
            callback(err, data);
        } else {
            callback(0, 200);
        }
    });
};
const deleteMultiData = (docClient, params, callback) => {
    docClient.delete(params, (err, data) => {
        if (err) {
            console.log(err);
            callback(err, data);
        } else {
            callback(0, 200);
        }
    });
};
const batchReadData = (docClient, params, callback) => {
    docClient.batchGet(params, (err, data) => {
        if (err) {
            console.log(err);
            callback(err, data);
        } else {
            callback(0, 200);
        }
    });
};

const getData = (docClient, params, callback) => {
    docClient.get(params, (err, data) => {
        if (err) {
            console.log(err);
            callback(err, data);
        } else {
            callback(err, data);
        }
    });
};

const queryWithPagination = async (docClient, params, callback) => {
    const results = [];

    while (true) {
        try {
            const data = await docClient.query(params).promise();
            results.push(...data.Items);

            if (!data.LastEvaluatedKey) {
                break;
            }

            params.ExclusiveStartKey = data.LastEvaluatedKey;
        } catch (error) {
            console.error('Error querying with pagination:', error);
            console.log(error);
            callback(error, 0);
        }
    }
    
    callback(0, { Items: results });
};

exports.DATABASE_TABLE = {
    scanRecord: scanData,
    queryRecord: queryData,
    putRecord: putData,
    updateRecord: updateData,
    deleteRecord: deleteData,
    deleteMultiRecord: deleteMultiData,
    batchReadRecord: batchReadData,
    getRecord: getData
}