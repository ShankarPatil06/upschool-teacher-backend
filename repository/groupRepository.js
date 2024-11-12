const dynamoDbCon = require('../awsConfig');
const { DATABASE_TABLE } = require('./baseRepository');
const { constant, indexes: { Indexes }, tables: { TABLE_NAMES } } = require('../constants');


exports.fetchGroupsData = function (request, callback) {

    dynamoDbCon.getDB(function (DBErr, dynamoDBCall) {
        if (DBErr) { 
            console.log("DigiCard Data Database Error");
            console.log(DBErr); 
            callback(500, constant.messages.DATABASE_ERROR);
        } else { 
            let docClient = dynamoDBCall;
            let FilterExpressionDynamic = "";
            let ExpressionAttributeValuesDynamic = {}; 
            let group_array = request.group_array; 
            
            if (group_array.length === 0) { 

                callback(400, constant.messages.NO_RELATED_DIGICARDS); 

            } else if (group_array.length === 1){ 
                let read_params = { 
                    TableName: TABLE_NAMES.upschool_group_table,
                    KeyConditionExpression: "group_id = :group_id", 
                    ExpressionAttributeValues: {
                        ":group_id": group_array[0],
                    }, 
                }
    
                DATABASE_TABLE.queryRecord(docClient, read_params, callback);

            } else { 
                group_array.forEach((element, index) => { 
                    if(index < group_array.length-1){ 
                        FilterExpressionDynamic = FilterExpressionDynamic + "(group_id = :group_id"+ index +") OR "
                        ExpressionAttributeValuesDynamic[':group_id'+ index] = element + '' 
                    } else{
                        FilterExpressionDynamic = FilterExpressionDynamic + "(group_id = :group_id"+ index +")"
                        ExpressionAttributeValuesDynamic[':group_id'+ index] = element;
                    }
                }); 

                let read_params = {
                    TableName: TABLE_NAMES.upschool_group_table,
                    FilterExpression: FilterExpressionDynamic,
                    ExpressionAttributeValues: ExpressionAttributeValuesDynamic,
                }

                DATABASE_TABLE.scanRecord(docClient, read_params, callback);

            }

        }
    });
}
