const dynamoDbCon = require('../awsConfig');   
const {conceptRepository,topicRepository}= require("../repository")
const commonServices = require("../services/commonServices");
const constant = require('../constants/constant');
const helper = require('../helper/helper');

exports.getConceptsBasedonTopics = (request, callback) => {
    
    if(Array.isArray(request.data.topic_array)){
       if(request.data.topic_array.length > 0){

         topicRepository.fetchTopicIDandTopicConceptID({ topic_array: request.data.topic_array }, async function (topic_err, topic_res) {
            if (topic_err) {
                console.log(topic_err);
                callback(topic_err, topic_res);
            } else {  
                if(topic_res.Items.length > 0){ 
                    let concept_array = []; 
    
                    await topic_res.Items.forEach((e) => concept_array.push(...e.topic_concept_id)); 
                    
                    conceptRepository.fetchConceptIDDisplayName({ concept_array: concept_array }, function (topic_err, topic_res) {
                        if (topic_err) {
                            console.log(topic_err);
                            callback(topic_err, topic_res);
                        } else {  
                            callback(topic_err, topic_res.Items); 
                        }
                      }) 
                }else{
                    callback(200, topic_res.Items); 
                }
            }
          }) 
       }else{
         callback(200, request.data.topic_array); 
       }
   }else{
    callback(400, constant.messages.INVALID_REQUEST); 
   }
  }
  

  exports.getConceptsBasedonTopicsNew = async (request) => {
    if (!Array.isArray(request.data.topic_array) || request.data.topic_array.length === 0) {
        return {
            statusCode: 400,
            body: constant.messages.INVALID_REQUEST,
        };
    }

        const topic_res = await topicRepository.fetchTopicIDandTopicConceptID2({ topic_array: request.data.topic_array });
        
        console.log("topic_res - ",topic_res);

        if (topic_res.length === 0) {
            return {
                statusCode: 200,
                body: topic_res,
            };
        }

        const concept_array = topic_res.flatMap(e => e.topic_concept_id);

        const concept_res = await conceptRepository.fetchConceptIDDisplayName2({ concept_array });
        
        console.log("concept_res - ",concept_res);
        return concept_res;
};
