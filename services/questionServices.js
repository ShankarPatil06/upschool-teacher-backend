const chapterServices = require("../services/chapterServices");
const { schoolRepository,chapterRepository,topicRepository,teachingActivityRepository,conceptRepository } = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');

// New Code : 
exports.fetchAvailabeQuestions = function (request, callback) {  

    // Get School Details : 
    schoolRepository.getSchoolDetailsById(request, function (school_details_err, school_details_res) {
    if (school_details_err) {
        console.log(school_details_err);
        callback(school_details_err, school_details_res);
    } else {

        // Fetch Teacher Activity : 
        teachingActivityRepository.fetchTeachingActivity(request, async function (teacher_activity_details_err, teacher_activity_details_res) {
            if (teacher_activity_details_err) { 
            console.log(teacher_activity_details_err);
            callback(teacher_activity_details_err, teacher_activity_details_res);
            }
            else
            {  
                // Fetch Chapter Details : 
                chapterRepository.fetchChapterByID(request, async function (single_chapter_err, single_chapter_response) {
                    if (single_chapter_err) { 
                        console.log(single_chapter_err);
                        callback(single_chapter_err, single_chapter_response);
                    } else { 
                        console.log("single_chapter_response : ", single_chapter_response);
                        // Check if we have Chapter on the ID given : 
                        if(single_chapter_response.Items.length === 0){
                            callback(400, constant.messages.CHAPTER_COMBO_DOESNT_EXISTS)
                        }else{
                            if(request.data.test_stage === "Pre"){ 

                                // Fetching Pre Topic Related No of Questions :
                                topicRepository.fetchPreTopicData(single_chapter_response.Items[0], async function (pre_topic_err, pre_topic_response) {
                                    if (pre_topic_err) {
                                        console.log(pre_topic_err);
                                        callback(pre_topic_err, pre_topic_response);
                                    } else {
                                                /** SET ARCHIVED STATUS **/
                                                let prePostType = constant.prePostConstans.preLearning; 
                                                let pre_quiz_config = school_details_res.Items[0].pre_quiz_config; 

                                                chapterServices.appendPreTopicsArchivedStatus(request, teacher_activity_details_res, pre_topic_response, prePostType, (finalPreTopicErr, finalPreTopicData) => {
                                                    if(finalPreTopicErr)
                                                    {
                                                        console.log("ERROR : "+ finalPreTopicErr);
                                                        callback(finalPreTopicErr, finalPreTopicData);
                                                    }
                                                    else
                                                    {
                                                        // Fetch Concepts for Topics : 
                                                        let topic_concept_id = []; 
                                                        
                                                        finalPreTopicData.map((e) => e.isArchived === "No" && topic_concept_id.push(...e.topic_concept_id)); 
            
                                                        exports.fetchCountofQuestions(request, finalPreTopicData, pre_quiz_config, topic_concept_id, (fetch_count_error, fetch_count_response) => {
                                                            if(fetch_count_error)
                                                            {
                                                                console.log("ERROR : "+ fetch_count_error);
                                                                callback(fetch_count_error, fetch_count_response);
                                                            }
                                                            else
                                                            {
                                                                callback(200, fetch_count_response); 
                                                            }
                                                        })
                                                       
                                                    }
                                                })
                                                /** END SET ARCHIVED STATUS **/                                                
                                    }
                                })
                            }else if(request.data.test_stage === "Post"){ 

                                // Fetching Post Topic Related No of Questions : 
                                // Fetch Only Request.topics data : 

                                if(request.data.topics && request.data.topics.length > 0){
                                    topicRepository.fetchPostTopicData({ postlearning_topic_id: request.data.topics }, async function (post_topic_err, post_topic_response) {
                                        if (post_topic_err) {
                                            console.log(post_topic_err);
                                            callback(post_topic_err, post_topic_response);
                                        } else {
                                                    
                                            /** SET ARCHIVED STATUS **/
                                            let prePostType = constant.prePostConstans.postLearning; 
                                            let post_quiz_config = school_details_res.Items[0].post_quiz_config; 

                                            chapterServices.appendPostTopicsArchivedStatus(request, teacher_activity_details_res, post_topic_response, prePostType, (finalPostTopicErr, finalPostTopicData) => {
                                                if(finalPostTopicErr)
                                                {
                                                    console.log("ERROR : "+ finalPostTopicErr);
                                                    callback(finalPostTopicErr, finalPostTopicData);
                                                }
                                                else
                                                {
                                                    // Fetch Concepts for Topics : 
                                                    let topic_concept_id = []; 

                                                    finalPostTopicData.map((e) => e.isArchived === "No" && topic_concept_id.push(...e.topic_concept_id));  
        
                                                    exports.fetchCountofQuestions(request, finalPostTopicData, post_quiz_config, topic_concept_id, (fetch_count_error, fetch_count_response) => {
                                                        if(fetch_count_error)
                                                        {
                                                            console.log("ERROR : --- "+ fetch_count_error);
                                                            callback(fetch_count_error, fetch_count_response);
                                                        }
                                                        else
                                                        {
                                                            // Sample Function 
                                                            callback(200, fetch_count_response); 
                                                        }
                                                    })
                                                    
                                                }
                                            })
                                            /** END SET ARCHIVED STATUS **/                                                
                                        }
                                    })
                                }else{
                                    callback(400, constant.messages.NO_TOPICS_SELECTED)
                                }
                              
                            }
                         
                        }
                        // fetch Pre Topic Data : 
                    }
                })
            }
        })
    }
})
}
exports.fetchCountofQuestions = (request, finalPreTopicData, pre_post_quiz_config, topic_concept_id, callback) => {

    conceptRepository.fetchConceptData({ topic_concept_id: topic_concept_id }, async function (concept_err, concept_response) {        
        if (concept_err) {
            console.log(concept_err);
            callback(concept_err, concept_response);
        } else {
            
            switch(request.data.quiz_type) {
                case "automated":
                    console.log("automated : ");
                    // Fetch All groups for a chapter : 

                    let basic_groups = []; 
                    let intermediate_groups = []; 
                    let advanced_groups = []; 

                    finalPreTopicData.map((e) => {
                        e.isArchived === "No" && e.topic_concept_id.map((f) => {
                            
                            concept_response.Items.map((a) => {
                                a.concept_id === f && basic_groups.push(...a.concept_group_id.basic)
                                a.concept_id === f && intermediate_groups.push(...a.concept_group_id.intermediate)
                                a.concept_id === f && advanced_groups.push(...a.concept_group_id.advanced)
                            }); 
                        })
                    });

                    basic_groups = helper.removeDuplicates(basic_groups); 
                    intermediate_groups = helper.removeDuplicates(intermediate_groups); 
                    advanced_groups = helper.removeDuplicates(advanced_groups); 
                
                    exports.calculateMatrix(basic_groups, intermediate_groups, advanced_groups, pre_post_quiz_config, (matrix_err, matrix_response) => {
                    if(matrix_err){
                        callback(400, matrix_err); 
                    }else{
                        let response = {
                            minNoOfQuestions: pre_post_quiz_config.min_qn_at_chapter_level,
                            totalNoOfQuestions: matrix_response
                        }; 
                        callback(0, response); 
                    }
                    }); 
                    break;
                case "express":
                    
                    console.log("express : ");
                    // code block
                    let topicData = []; 

                    finalPreTopicData.map((e) => {
                        let basic_groups = []; 
                        let intermediate_groups = []; 
                        let advanced_groups = []; 
                        
                        e.isArchived === "No" && e.topic_concept_id.map((f) => {
                            
                            concept_response.Items.map((a) => {
                                a.concept_id === f && basic_groups.push(...a.concept_group_id.basic)
                                a.concept_id === f && intermediate_groups.push(...a.concept_group_id.intermediate)
                                a.concept_id === f && advanced_groups.push(...a.concept_group_id.advanced)
                            }); 
                        })
                    
                        basic_groups = helper.removeDuplicates(basic_groups); 
                        intermediate_groups = helper.removeDuplicates(intermediate_groups); 
                        advanced_groups = helper.removeDuplicates(advanced_groups); 
                    
                        exports.calculateMatrix(basic_groups, intermediate_groups, advanced_groups, pre_post_quiz_config, (matrix_err, matrix_response) => {
                            if(matrix_err){
                                callback(400, matrix_err); 
                            }else{
                                e.isArchived === "No" && topicData.push( 
                                    {
                                        topic_name: e.topic_title,
                                        topic_id: e.topic_id,
                                        totalNumOfQuestions: matrix_response
                                    }
                                    )
                            }
                        }); 
                    }); 
                    
                    let response = {
                    minNoOfQuestions : pre_post_quiz_config.min_qn_at_topic_level,
                    topicData: topicData
                    }
                    callback(200, response); 
                    break;
                case "manual": 
                    // code block 
                    let topicArray = []; 

                    finalPreTopicData.map((e) => {
                        
                        let conceptData = []; 

                        e.topic_concept_id.map((f) => {
                            concept_response.Items.map((a) => { 
      
                                a.concept_group_id.basic = helper.removeDuplicates(a.concept_group_id.basic); 
                                a.concept_group_id.intermediate = helper.removeDuplicates(a.concept_group_id.intermediate); 
                                a.concept_group_id.advanced = helper.removeDuplicates(a.concept_group_id.advanced); 
                            
                                a.concept_id === f && exports.calculateMatrix(a.concept_group_id.basic, a.concept_group_id.intermediate, a.concept_group_id.advanced, pre_post_quiz_config, (matrix_err, matrix_response) => {
                                    if(matrix_err){
                                        callback(400, matrix_err); 
                                    }else{
                                        // console.log("a.concept_title : ", a.concept_title);
                                        conceptData.push(
                                            {
                                                concept_id:  a.concept_id, 
                                                concept_name:  a.concept_title, 
                                                totalNumOfQuestions:  matrix_response 
                                            }
                                        ) 
                                    }
                                    }); 
                            }); 
                        }) 
                        e.isArchived === "No" && topicArray.push(
                            {
                                topic_name: e.topic_title,
                                topic_id: e.topic_id,
                                conceptData: conceptData
                            })
                    }) 
                    let finalResponse = {
                        minNoOfQuestions : pre_post_quiz_config.min_qn_at_topic_level,
                        topicData: topicArray
                        }
                        callback(200, finalResponse); 
                    
                    break; 
                default:
                    // code block
                    callback(400, constant.messages.INVALID_REQUEST_FORMAT); 
                }
        }
    })
}

exports.calculateMatrix = function (basic_groups, intermediate_groups, advanced_groups, pre_post_quiz_config, callback) {  

    console.log("Groups : ", basic_groups, intermediate_groups, advanced_groups);
    // Matrix : 
    let basic_percent = pre_post_quiz_config.test_matrix.Basic
    let intermediate_percent = pre_post_quiz_config.test_matrix.Intermediate
    let advanced_percent = pre_post_quiz_config.test_matrix.Advanced
    console.log("Percentage : ", basic_percent, intermediate_percent, advanced_percent);

    let basic_count = Math.round((basic_groups.length/100) * basic_percent); 
    let intermediate_count = Math.round((intermediate_groups.length/100) * intermediate_percent); 
    let advance_count = Math.round((advanced_groups.length/100) * advanced_percent); 
    console.log("Count : ", basic_count, intermediate_count, advance_count);
    
    let totalNoOfQuestions = basic_count + intermediate_count + advance_count;  

    callback(0, totalNoOfQuestions); 
}

exports.calculateCountUsingMatrix = function (basic_groups, intermediate_groups, advanced_groups, pre_post_quiz_config, callback) {  

   
    // console.log("Groups : ", basic_groups, intermediate_groups, advanced_groups);
    // Matrix : 
    let basic_percent = pre_post_quiz_config.test_matrix.Basic
    let intermediate_percent = pre_post_quiz_config.test_matrix.Intermediate
    let advanced_percent = pre_post_quiz_config.test_matrix.Advanced
    // console.log("Percentage : ", basic_percent, intermediate_percent, advanced_percent);

    let basic_count = Math.round((basic_groups.length/100) * basic_percent); 
    let intermediate_count = Math.round((intermediate_groups.length/100) * intermediate_percent); 
    let advance_count = Math.round((advanced_groups.length/100) * advanced_percent); 
    // console.log("Count : ", basic_count, intermediate_count, advance_count);
    
    let questionsCount = {
        basic_count, 
        intermediate_count, 
        advance_count
    }
    // console.log("questionsCount : ", questionsCount); 

    callback(0, questionsCount); 
}




