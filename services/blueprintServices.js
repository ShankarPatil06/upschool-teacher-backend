const { blueprintRepository, questionRepository, commonRepository } = require("../repository")
const { TABLE_NAMES } = require('../constants/tables');
const constant = require('../constants/constant');
const helper = require('../helper/helper');

exports.getBlueprintByItsId = (request, callback) => {    
    blueprintRepository.fetchBlueprintById(request, async function (singleBlueprint_err, singleBlueprint_res) {
        if (singleBlueprint_err) {
            console.log(singleBlueprint_err);
            callback(singleBlueprint_err, singleBlueprint_res);
        } else {  
            console.log("BLUEPRINT : ", singleBlueprint_res);

            if(singleBlueprint_res.Items.length > 0)
            {
                let questionSection = JSON.parse(JSON.stringify(singleBlueprint_res.Items[0].sections));
                let catIds = [];
                let skillIds = []; 

                async function getCatCon(i)
                {
                    if(i < questionSection.length)
                    {
                        catIds = catIds.concat(await questionSection[i].questions.map(ques => ques.category_id));
                        skillIds = skillIds.concat(await questionSection[i].questions.map(ques => ques.cognitive_id));  
                        i++;
                        getCatCon(i);
                    }
                    else
                    {           
                        catIds = helper.removeDuplicates(catIds);
                        skillIds = helper.removeDuplicates(skillIds);

                        console.log("CATEGORY ID: ", catIds);
                        console.log("SKILL IDS : ", skillIds);

                        /** FETCH CATEGORY DATA **/
                        let fetchBulkCatReq = {
                            IdArray : catIds,
                            fetchIdName : "category_id",
                            TableName : TABLE_NAMES.upschool_content_category,
                            projectionExp : ["category_id", "category_name"]
                        }
            
                        commonRepository.fetchBulkDataWithProjection(fetchBulkCatReq, async function (cateData_err, cateData_res) {
                            if (cateData_err) {
                                console.log(cateData_err);
                                callback(cateData_err, cateData_res);
                            } else {
                                console.log("CAT DATA : ", cateData_res);

                                /** FETCH SKILL DATA **/
                                let fetchBulkCogReq = {
                                    IdArray : skillIds,
                                    fetchIdName : "cognitive_id",
                                    TableName : TABLE_NAMES.upschool_cognitive_skill,
                                    projectionExp : ["cognitive_id", "cognitive_name"]
                                }
                    
                                commonRepository.fetchBulkDataWithProjection(fetchBulkCogReq, async function (cognData_err, cognData_res) {
                                    if (cognData_err) {
                                        console.log(cognData_err);
                                        callback(cognData_err, cognData_res);
                                    } else {
                                        console.log("COGNITIVE DATA : ", cognData_res);                              

                                        /** SET FINAL BLUEPRINT DATA **/
                                        exports.setBlueprintFinalData(questionSection, cateData_res.Items, cognData_res.Items, (blueErr, blueData) => {
                                            if(blueErr)
                                            {
                                                console.log(blueErr);
                                                callback(blueErr, blueData);
                                            }
                                            else
                                            {
                                                console.log(blueData);
                                                singleBlueprint_res.Items[0].sections = blueData
                                                callback(blueErr, singleBlueprint_res);
                                            }
                                        })
                                        /** END SET FINAL BLUEPRINT DATA **/
                                    }
                                })
                                /** END FETCH SKILL DATA **/
                            }
                        })
                        /** END FETCH CATEGORY DATA **/
                    }
                }
                getCatCon(0);                
            }
            else
            {
                console.log(constant.messages.NO_DATA);
                callback(400, constant.messages.NO_DATA);
            }
        }
    }) 
}

exports.setBlueprintFinalData = (questionSection, catData, skillData, callback) => {
    async function setCatCog(j)
    {
        if(j < questionSection.length)
        {
            async function questionLoop(k)
            {
                if(k < questionSection[j].questions.length)
                {
                    questionSection[j].questions[k].question_category = await catData.filter(cat => cat.category_id === questionSection[j].questions[k].category_id).length > 0 ?
                    await catData.filter(cat => cat.category_id === questionSection[j].questions[k].category_id)[0].category_name : "N.A.";

                    // questionSection[j].questions[k].cognitive_skill = await skillData.filter(co => co.cognitive_id === questionSection[j].questions[k].cognitive_id)[0].cognitive_name;

                    questionSection[j].questions[k].cognitive_skill = await skillData.filter(co => co.cognitive_id === questionSection[j].questions[k].cognitive_id).length > 0 ?
                    await skillData.filter(co => co.cognitive_id === questionSection[j].questions[k].cognitive_id)[0].cognitive_name : "N.A.";

                    k++;
                    questionLoop(k);
                }
                else
                {
                    j++;
                    setCatCog(j);
                }
            }
            questionLoop(0);            
        }
        else
        {
            console.log("GOT DATA : ", questionSection);
            callback(0, questionSection);
        }
    }
    setCatCog(0)
}

/** NEW **/ 
exports.fetchBlueprintQuestions = (request, callback) => {    
    blueprintRepository.fetchBlueprintById(request, function (blueprint_err, blueprint_res) {
        if (blueprint_err) {
            console.log(blueprint_err);
            callback(blueprint_err, blueprint_res);
        } else {  
            console.log("BLUEPRINT SECTION : ", blueprint_res.Items[0].sections);
            
            /** FETCH CHAPTER DATA **/
            let fetchBulkChapReq = {
                IdArray : request.data.chapter_ids,
                fetchIdName : "chapter_id",
                TableName : TABLE_NAMES.upschool_chapter_table,
                projectionExp : ["chapter_id", "chapter_status", "postlearning_topic_id", "prelearning_topic_id"]
            }

            commonRepository.fetchBulkDataWithProjection(fetchBulkChapReq, async function (chapData_err, chapData_res) {
                if (chapData_err) {
                    console.log(chapData_err);
                    callback(chapData_err, chapData_res);
                } else {
                    console.log("CHAPTER DATA");
                    console.log(chapData_res.Items);
                    
                    /** COLLECT TOPICS ID **/
                    let topicIds = [];
                    await chapData_res.Items.forEach(cItem => {
                        if(cItem.chapter_status === constant.status.active)
                        {
                            topicIds = topicIds.concat(cItem.postlearning_topic_id);
                            topicIds = topicIds.concat(cItem.prelearning_topic_id);
                        }                                
                    });

                    topicIds = await helper.removeDuplicates(topicIds);

                    /** FETCH TOPIC DATA **/
                    let fetchBulkTopReq = {
                        IdArray : topicIds,
                        fetchIdName : "topic_id",
                        TableName : TABLE_NAMES.upschool_topic_table,
                        projectionExp : ["topic_id", "topic_status", "topic_concept_id"]
                    }

                    commonRepository.fetchBulkDataWithProjection(fetchBulkTopReq, async function (topicData_err, topicData_res) {
                        if (topicData_err) {
                            console.log(topicData_err);
                            callback(topicData_err, topicData_res);
                        } else {
                            console.log("TOPICS DATA");
                            console.log(topicData_res.Items);
                            
                            /** COLLECT CONCEPT ID **/
                            let conceptIds = [];
                            await topicData_res.Items.forEach(topItem => {
                                if(topItem.topic_status === constant.status.active)
                                {
                                    conceptIds = conceptIds.concat(topItem.topic_concept_id);
                                } 
                            });

                            conceptIds = await helper.removeDuplicates(conceptIds);

                            /** FETCH CONCEPT DATA **/
                            let fetchBulkConReq = {
                                IdArray : conceptIds,
                                fetchIdName : "concept_id",
                                TableName : TABLE_NAMES.upschool_concept_blocks_table,
                                projectionExp : ["concept_id", "concept_question_id", "concept_status"]
                            }
        
                            commonRepository.fetchBulkDataWithProjection(fetchBulkConReq, async function (conceptData_err, conceptData_res) {
                                if (conceptData_err) {
                                    console.log(conceptData_err);
                                    callback(conceptData_err, conceptData_res);
                                } else {
                                    console.log("CONCEPT DATA");
                                    console.log(conceptData_res.Items);
                                    
                                    /** COLLECT QUESTION ID **/
                                    let workQuesIds = [];
                                    await conceptData_res.Items.forEach(conItem => {
                                        if(conItem.concept_status === constant.status.active && conItem.concept_question_id)
                                        {
                                            workQuesIds = workQuesIds.concat(conItem.concept_question_id);
                                        }
                                    });

                                    workQuesIds = await helper.removeDuplicates(workQuesIds);
                                    console.log("WORKSHEET QUESTION ID : ", workQuesIds);
                                    
                                    /** FETCH QUESTION DATA **/
                                    let fetchBulkquesReq = {
                                        IdArray : workQuesIds,
                                        fetchIdName : "question_id",
                                        TableName : TABLE_NAMES.upschool_question_table,
                                        questionStatus : "Publish",
                                        sourceIds : request.data.source_ids,
                                        projectionExp : [ "question_id", "answers_of_question", "appears_in", "cognitive_skill", "difficulty_level", "marks", "question_active_status", "question_category", "question_content", "question_source", "question_status", "question_type" ]
                                    }

                                    questionRepository.fetchBulkQuestionsWithPublishStatusAndProjection(fetchBulkquesReq, async function (questionsData_err, questionsData_res) {
                                        if (questionsData_err) {
                                            console.log(questionsData_err);
                                            callback(questionsData_err, questionsData_res);
                                        } else {
                                            console.log("PUBLISHED QUESTION DATA");
                                            
                                            let filteredQuestionData = await questionsData_res.Items.filter((qtn) => request.data.source_ids.includes(qtn.question_source));

                                            let priorities = [];
                                            await helper.checkPriorityQuestions(request.data.question_details).then((priData) => {
                                                priorities = priData;
                                            })                                            

                                            console.log("PRIORITY : ", priorities);

                                            /** GET QUESTION PAPER **/
                                            exports.createQuestionPaper(priorities, request, blueprint_res.Items[0], chapData_res.Items, topicData_res.Items, conceptData_res.Items, filteredQuestionData, (createQues_err, createQues_data) => {
                                                if(createQues_err)
                                                {
                                                    console.log(createQues_err)
                                                    callback(createQues_err, createQues_data);
                                                }
                                                else
                                                {
                                                    console.log("QUESTION PAPER CREATED!");
                                                    callback(createQues_err, createQues_data);
                                                }
                                            })
                                            /** END GET QUESTION PAPER **/
                                        }
                                    })
                                    /** END FETCH QUESTION DATA **/
                                }
                            })
                            /** END FETCH CONCEPT DATA **/
                        }
                    })
                    /** END FETCH TOPIC DATA **/
                }
            })
            /** END FETCH CHAPTER DATA **/
        }
    }) 
}
/** END NEW **/

exports.createQuestionPaper = (priorities, request, blueprint, chapterData, topicData, conceptData, questionData, callback) => { 
    
    console.log("CONCEPT DATA : ", conceptData);

    let responseData = JSON.parse(JSON.stringify(request.data.question_details));
    let reqSection = request.data.question_details;
    let blueSection = blueprint.sections;
     
    let exitingQuesIds = [];
    let secPos = "";
    let quePos = "";
    async function mainLoop(i)
    {
        if(i < 3)
        {   
            async function priLoop(j)
            {       

                if(j < priorities.length)
                {
                    secPos = priorities[j].sec;
                    quePos = priorities[j].que;

                    if(priorities[j].qStatus === "No")
                    {
                        if(priorities[j].pre === 0)
                        {
                            /** FIRST PRIORITY WITH CONCEPT IDS **/
                            exports.getConceptAvailQuestions(reqSection[secPos].questions[quePos].concept_ids, conceptData, questionData, async(conAvail_err, conAvail_data) => {
                                if(conAvail_err)
                                {
                                    console.log(conAvail_err);
                                    callback(conAvail_err, conAvail_data);
                                }
                                else
                                {
                                    exports.getResQuestionObj(conAvail_data, blueSection[secPos].questions[quePos], exitingQuesIds, (quesObj_err, quesObj_data) => {
                                        if(quesObj_err)
                                        {
                                            console.log(quesObj_err);
                                            callback(quesObj_err, quesObj_data);
                                        }
                                        else
                                        {
                                            responseData[secPos].questions[quePos] = quesObj_data.quesObj;
                                            exitingQuesIds = quesObj_data.questionExistId;
                                            priorities[j].qStatus = "Yes";

                                            j++;
                                            priLoop(j);
                                        }
                                    })
                                }
                            })
                            /** END FIRST PRIORITY WITH CONCEPT IDS **/
                        }
                        else if(priorities[j].pre === 1)
                        {
                            /** SECOND PRIORITY WITH TOPIC IDS **/
                            exports.getTopicsAvailQuestions(reqSection[secPos].topic_ids, topicData, conceptData, questionData, async(topAvail_err, topAvail_data) => {
                                if(topAvail_err)
                                {
                                    console.log(topAvail_err);
                                    callback(topAvail_err, topAvail_data);
                                }
                                else
                                {
                                    exports.getResQuestionObj(topAvail_data, blueSection[secPos].questions[quePos], exitingQuesIds, (quesTopObj_err, quesTopObj_data) => {
                                        if(quesTopObj_err)
                                        {
                                            console.log(quesTopObj_err);
                                            callback(quesTopObj_err, quesTopObj_data);
                                        }
                                        else
                                        {
                                            responseData[secPos].questions[quePos] = quesTopObj_data.quesObj;
                                            exitingQuesIds = quesTopObj_data.questionExistId;
                                            priorities[j].qStatus = "Yes";

                                            j++;
                                            priLoop(j);
                                        }
                                    })
                                }
                            });
                            
                            /** END SECOND PRIORITY WITH TOPIC IDS **/                            
                        }
                        else if(priorities[j].pre === 2)
                        {
                            /** THIRD PRIORITY WITH CHAPTER IDS **/
                            exports.getResQuestionObj(questionData, blueSection[secPos].questions[quePos], exitingQuesIds, (quesObjChap_err, quesObjChap_data) => {
                                if(quesObjChap_err)
                                {
                                    console.log(quesObjChap_err);
                                    callback(quesObjChap_err, quesObjChap_data);
                                }
                                else
                                {
                                    responseData[secPos].questions[quePos] = quesObjChap_data.quesObj;
                                    exitingQuesIds = quesObjChap_data.questionExistId;
                                    priorities[j].qStatus = "Yes";

                                    j++;
                                    priLoop(j);
                                }
                            })
                            /** END THIRD PRIORITY WITH CHAPTER IDS **/                            
                        }
                    }       
                    else
                    {
                        j++;
                        priLoop(j);
                    }
                }
                else
                {
                    i++;
                    mainLoop(i);
                }
            }
            priLoop(0);            
        }
        else
        {
            console.log("FINALLY GOT QUESTION :", responseData);
            callback(0, responseData);
        }
    }
    mainLoop(0)
}

exports.getConceptAvailQuestions = async (conceptId, conceptData, questionDatas, callback) => {
    
    // console.log("CONCEPT ID : ", conceptId);
    let conceptBlock = "";
    let avalQuestion = [];
    let singleQues = "";
    async function conceptLoop(i)
    {
        if(i < conceptId.length)
        {
            // console.log("conceptId[i] : ", conceptId[i]);
            conceptBlock = await conceptData.filter(con => con.concept_id === conceptId[i].value);
            // console.log("conceptBlock : ", conceptBlock);

            if(conceptBlock.length > 0 && conceptBlock[0].concept_question_id)
            {
                await conceptBlock[0].concept_question_id.forEach(async cq => {
                    singleQues = await questionDatas.find(ques => ques.question_id === cq);
                    if(singleQues != undefined)
                    {
                        avalQuestion.push(singleQues);
                    }                    
                })
            }
            i++;
            conceptLoop(i);
        }
        else
        {
            /** END **/
            // console.log("AVAILABLE QUESTION : ", avalQuestion);
            callback(0, avalQuestion);
        }
    }
    conceptLoop(0);
}

exports.getTopicsAvailQuestions = async (topicId, topicData, conceptData, questionDatas, callback) => {
    // console.log("TOPIC ID : ", topicId);
    let foundTopic = "";
    let avalConcept = [];
    let avalConIds = [];
    let singleCon = "";

    async function topicLoop(i)
    {
        if(i < topicId.length)
        {
            foundTopic = await topicData.filter(con => con.topic_id === topicId[i].value);
            // console.log("foundTopic : ", foundTopic);
            if(foundTopic.length > 0)
            {                
                await foundTopic[0].topic_concept_id.forEach(async tc => {
                    singleCon = await conceptData.find(cons => cons.concept_id === tc);
                    // console.log("singleCon : ", singleCon);
                    if(singleCon != undefined)
                    {
                        avalConcept.push(singleCon);
                        avalConIds.push({value: tc});
                    }                        
                })      
            }
            i++;
            topicLoop(i);
        }
        else
        {
            /** END **/
            // console.log("AVAILABLE CONCEPT ID : ", avalConIds);
            // console.log("AVAILABLE CONCEPT : ", avalConcept);            

            exports.getConceptAvailQuestions(avalConIds, avalConcept, questionDatas, async(conQuesAvail_err, conQuesAvail_data) => {
                if(conQuesAvail_err)
                {
                    console.log(conQuesAvail_err);
                    callback(conQuesAvail_err, conQuesAvail_data);
                }
                else
                {
                    callback(0, conQuesAvail_data);
                }
            })
        }
    }
    topicLoop(0);
}

exports.getResQuestionObj = async (avalQues_data, blueQues, questionExistId, callback) => {
    
    let endRes = {
        quesObj: "N.A.",
        questionExistId: []
    };
    let getQuestion = blueQues.cognitive_id != "N.A." ? 
    await avalQues_data.filter(Qs => Qs.question_category === blueQues.category_id && Qs.cognitive_skill === blueQues.cognitive_id && Qs.difficulty_level === blueQues.difficulty_level && Number(Qs.marks) === Number(blueQues.marks) && Qs.question_type === blueQues.question_type) : 
    await avalQues_data.filter(Qs => Qs.question_category === blueQues.category_id && Qs.difficulty_level === blueQues.difficulty_level && Number(Qs.marks) === Number(blueQues.marks) && Qs.question_type === blueQues.question_type)

    getQuestion = await helper.removeExistObject(questionExistId, getQuestion, "question_id");

    if(getQuestion.length > 0 && (!questionExistId.find(ext => ext === getQuestion[0].question_id)))
    {
        let contUrl = "N.A.";
        if(blueQues.question_type === constant.questionKeys.objective)
        {
            await helper.getAnswerContentFileUrl(getQuestion[0].answers_of_question).then((curl) => {
                contUrl = curl
            })
            .catch(function(curlErr) {
                console.log(curlErr);  
                contUrl = "N.A.";
            })
        }

        questionExistId.push(getQuestion[0].question_id); 
        endRes = {
            quesObj: {
                question_name : blueQues.question_name,
                question_type : blueQues.question_type,
                marks : blueQues.marks,
                difficulty_level : blueQues.difficulty_level,
                question_id : getQuestion[0].question_id,
                question_content : getQuestion[0].question_content,
                answers_of_question : contUrl
            },
            questionExistId: questionExistId
        };
               
    }
    else
    {
        endRes = {
            quesObj: {      
                question_name : blueQues.question_name,
                question_type : blueQues.question_type,
                marks : blueQues.marks,
                difficulty_level : blueQues.difficulty_level,
                question_id : "N.A.",
                question_content : "N.A.",
                answers_of_question : "N.A."
            },
            questionExistId: questionExistId
        };  
    }

    callback(0, endRes);
}

exports.getAllBluePrints = async(request) => await blueprintRepository.fetchActiveBluePrints2(request)

/** OLD **/
// exports.fetchBlueprintQuestions = (request, callback) => {    
//     blueprintRepository.fetchBlueprintById(request, function (blueprint_err, blueprint_res) {
//         if (blueprint_err) {
//             console.log(blueprint_err);
//             callback(blueprint_err, blueprint_res);
//         } else {  
//             console.log("BLUEPRINT SECTION : ", blueprint_res.Items[0].sections);
            
//             /** FETCH CHAPTER DATA **/
//             let fetchBulkChapReq = {
//                 IdArray : request.data.chapter_ids,
//                 fetchIdName : "chapter_id",
//                 TableName : TABLE_NAMES.upschool_chapter_table,
//                 projectionExp : ["chapter_id", "chapter_status", "postlearning_topic_id", "prelearning_topic_id"]
//             }

//             commonRepository.fetchBulkDataWithProjection(fetchBulkChapReq, async function (chapData_err, chapData_res) {
//                 if (chapData_err) {
//                     console.log(chapData_err);
//                     callback(chapData_err, chapData_res);
//                 } else {
//                     console.log("CHAPTER DATA");
//                     console.log(chapData_res.Items);
                    
//                     /** COLLECT TOPICS ID **/
//                     let topicIds = [];
//                     await chapData_res.Items.forEach(cItem => {
//                         if(cItem.chapter_status === constant.status.active)
//                         {
//                             topicIds = topicIds.concat(cItem.postlearning_topic_id);
//                             topicIds = topicIds.concat(cItem.prelearning_topic_id);
//                         }                                
//                     });

//                     topicIds = await helper.removeDuplicates(topicIds);

//                     /** FETCH TOPIC DATA **/
//                     let fetchBulkTopReq = {
//                         IdArray : topicIds,
//                         fetchIdName : "topic_id",
//                         TableName : TABLE_NAMES.upschool_topic_table,
//                         projectionExp : ["topic_id", "topic_status", "topic_concept_id"]
//                     }

//                     commonRepository.fetchBulkDataWithProjection(fetchBulkTopReq, async function (topicData_err, topicData_res) {
//                         if (topicData_err) {
//                             console.log(topicData_err);
//                             callback(topicData_err, topicData_res);
//                         } else {
//                             console.log("TOPICS DATA");
//                             console.log(topicData_res.Items);
                            
//                             /** COLLECT CONCEPT ID **/
//                             let conceptIds = [];
//                             await topicData_res.Items.forEach(topItem => {
//                                 if(topItem.topic_status === constant.status.active)
//                                 {
//                                     conceptIds = conceptIds.concat(topItem.topic_concept_id);
//                                 } 
//                             });

//                             conceptIds = await helper.removeDuplicates(conceptIds);

//                             /** FETCH CONCEPT DATA **/
//                             let fetchBulkConReq = {
//                                 IdArray : conceptIds,
//                                 fetchIdName : "concept_id",
//                                 TableName : TABLE_NAMES.upschool_concept_blocks_table,
//                                 projectionExp : ["concept_id", "concept_question_id", "concept_status"]
//                             }
        
//                             commonRepository.fetchBulkDataWithProjection(fetchBulkConReq, async function (conceptData_err, conceptData_res) {
//                                 if (conceptData_err) {
//                                     console.log(conceptData_err);
//                                     callback(conceptData_err, conceptData_res);
//                                 } else {
//                                     console.log("CONCEPT DATA");
//                                     console.log(conceptData_res.Items);
                                    
//                                     /** COLLECT QUESTION ID **/
//                                     let workQuesIds = [];
//                                     await conceptData_res.Items.forEach(conItem => {
//                                         if(conItem.concept_status === constant.status.active && conItem.concept_question_id)
//                                         {
//                                             workQuesIds = workQuesIds.concat(conItem.concept_question_id);
//                                         }
//                                     });

//                                     workQuesIds = await helper.removeDuplicates(workQuesIds);
//                                     console.log("WORKSHEET QUESTION ID : ", workQuesIds);

//                                     exports.fetchQuestionAndCreateTestPaper(workQuesIds, blueprint_res.Items[0], request.data.source_ids, (testPaper_err, testPaper_data) =>
//                                     {
//                                         if(testPaper_err)
//                                         {
//                                             console.log(testPaper_err);
//                                             callback(testPaper_err, testPaper_data);
//                                         }
//                                         else
//                                         {
//                                             console.log("GOT QUESTION PAPER!");
//                                             console.log(testPaper_data);
//                                             callback(testPaper_err, testPaper_data);
//                                         }
//                                     })
//                                 }
//                             })
//                             /** END FETCH CONCEPT DATA **/
//                         }
//                     })
//                     /** END FETCH TOPIC DATA **/
//                 }
//             })
//             /** END FETCH CHAPTER DATA **/
//         }
//     }) 
// }
/** END OLD **/

// exports.fetchQuestionAndCreateTestPaper = (questionIds, blueprint, source_ids, callback) => {    
//     /** FETCH QUESTION DATA **/
//     let fetchBulkquesReq = {
//         IdArray : questionIds,
//         fetchIdName : "question_id",
//         TableName : TABLE_NAMES.upschool_question_table,
//         questionStatus : "Publish",
//         sourceIds : source_ids,
//         projectionExp : [ "question_id", "answers_of_question", "appears_in", "cognitive_skill", "difficulty_level", "marks", "question_active_status", "question_category", "question_content", "question_source", "question_status", "question_type" ]
//     }

//     questionRepository.fetchBulkQuestionsWithPublishStatusAndProjection(fetchBulkquesReq, async function (questionsData_err, questionsData_res) {
//         if (questionsData_err) {
//             console.log(questionsData_err);
//             callback(questionsData_err, questionsData_res);
//         } else {
//             console.log("PUBLISHED QUESTION DATA");
//             console.log(questionsData_res.Items);

//             let queSection = blueprint.sections;
//             let questionExistId = [];
//             let getQuestion = [];
//             let blueQues = "";
//             let finalQuestions = [];
//             let questionArr = [];
//             let contUrl = "";

//             /** SECTION LOOP **/
//             function secLoop(i)
//             {
//                 if(i < queSection.length)
//                 {
//                     finalQuestions.push({section_name : queSection[i].section_name});
//                     questionArr = [];

//                     /** QUESTION LOOP **/
//                     async function quesLoop(j)
//                     {
//                         if(j < queSection[i].questions.length)
//                         {
//                             blueQues = queSection[i].questions[j];                            
//                             getQuestion = [];
//                             contUrl = "N.A.";
                            
//                             getQuestion = blueQues.cognitive_id != "N.A." ? 
//                             await questionsData_res.Items.filter(Qs => Qs.question_category === blueQues.category_id && Qs.cognitive_skill === blueQues.cognitive_id && Qs.difficulty_level === blueQues.difficulty_level && Number(Qs.marks) === Number(blueQues.marks) && Qs.question_type === blueQues.question_type) : 
//                             await questionsData_res.Items.filter(Qs => Qs.question_category === blueQues.category_id && Qs.difficulty_level === blueQues.difficulty_level && Number(Qs.marks) === Number(blueQues.marks) && Qs.question_type === blueQues.question_type)

//                             getQuestion = await helper.removeExistObject(questionExistId, getQuestion, "question_id");

//                             if(getQuestion.length > 0 && (!questionExistId.find(ext => ext === getQuestion[0].question_id)))
//                             {
//                                 contUrl = "N.A.";
//                                 if(blueQues.question_type === constant.questionKeys.objective)
//                                 {
//                                     await helper.getAnswerContentFileUrl(getQuestion[0].answers_of_question).then((curl) => {
//                                         contUrl = curl
//                                     })
//                                     .catch(function(curlErr) {
//                                         console.log(curlErr);  
//                                         contUrl = "N.A.";
//                                     })
//                                 }
//                                 // contUrl = await blueQues.question_type === constant.questionKeys.objective ? await helper.getAnswerContentFileUrl(getQuestion[0].answers_of_question) : "N.A."
                                
//                                 questionArr.push({      
//                                     question_name : blueQues.question_name,
//                                     question_type : blueQues.question_type,
//                                     marks : blueQues.marks,
//                                     difficulty_level : blueQues.difficulty_level,
//                                     question_id : getQuestion[0].question_id,
//                                     question_content : getQuestion[0].question_content,
//                                     answers_of_question : contUrl
//                                 })       
                                
//                                 questionExistId.push(getQuestion[0].question_id);
//                             }
//                             else
//                             {
//                                 questionArr.push({
//                                     question_name : blueQues.question_name,
//                                     question_type : blueQues.question_type,
//                                     marks : blueQues.marks,
//                                     difficulty_level : blueQues.difficulty_level,
//                                     question_id : "N.A.",
//                                     question_content : "N.A.",
//                                     answers_of_question : "N.A."
//                                 })         
                                
//                             }  
//                             j++;
//                             quesLoop(j);                                
//                         }
//                         else
//                         {
//                             finalQuestions[i].questions = questionArr;
//                             i++;
//                             secLoop(i);
//                         }
//                     } 
//                     quesLoop(0);
//                     /** END QUESTION LOOP **/                    
//                 }
//                 else
//                 {
//                     /** TEH END **/
//                     console.log("FINAL QUESTION DATA");
//                     console.log(finalQuestions);
//                     callback(0, finalQuestions);
//                 }
//             }
//             secLoop(0);
//             /** END SECTION LOOP **/
//         }
//     })
//     /** END FETCH QUESTION DATA **/
// }

// exports.fetchConceptBasedQuestions = async (request, callback) => {
//     blueprintRepository.fetchBlueprintById(request, async function (blueprint_err, blueprint_res) {
//         if (blueprint_err) {
//             console.log(blueprint_err);
//             callback(blueprint_err, blueprint_res);
//         } else {  
//             console.log("BLUEPRINT SECTION : ", blueprint_res.Items[0].sections);

//             let questionDetails = request.data.question_details;
//             let conceptIds = [];

//             async function detailsLoop(i)
//             {
//                 if(i < questionDetails.length)
//                 {
//                     await questionDetails[i].questions.forEach(qItem => {
//                         conceptIds = conceptIds.concat(qItem.concept_ids);
//                     });
//                     i++;
//                     detailsLoop(i);
//                 }
//                 else
//                 {
//                     conceptIds = await helper.removeDuplicates(conceptIds);
//                     console.log("CONCEPT IDS : ", conceptIds);

//                     /** FETCH CONCEPT DATA **/
//                     let fetchBulkConReq = {
//                         IdArray : conceptIds,
//                         fetchIdName : "concept_id",
//                         TableName : TABLE_NAMES.upschool_concept_blocks_table,
//                         projectionExp : ["concept_id", "concept_question_id", "concept_status"]
//                     }

//                     commonRepository.fetchBulkDataWithProjection(fetchBulkConReq, async function (conceptData_err, conceptData_res) {
//                         if (conceptData_err) {
//                             console.log(conceptData_err);
//                             callback(conceptData_err, conceptData_res);
//                         } else {
//                             console.log("CONCEPT DATA : ",conceptData_res.Items);

//                             /** COLLECT QUESTION ID **/
//                             let workQuesIds = [];
//                             await conceptData_res.Items.forEach(conItem => {
//                                 if(conItem.concept_status === constant.status.active && conItem.concept_question_id)
//                                 {
//                                     workQuesIds = workQuesIds.concat(conItem.concept_question_id);
//                                 }
//                             });

//                             workQuesIds = await helper.removeDuplicates(workQuesIds);
//                             console.log("WORKSHEET QUESTION ID : ", workQuesIds);

//                             exports.fetchConceptBasedQuestionAndCreateTestPaper(workQuesIds, blueprint_res.Items[0], request.data, conceptData_res.Items, (testPaper_err, testPaper_data) =>
//                             {
//                                 if(testPaper_err)
//                                 {
//                                     console.log(testPaper_err);
//                                     callback(testPaper_err, testPaper_data);
//                                 }
//                                 else
//                                 {
//                                     console.log("GOT QUESTION PAPER!");
//                                     console.log(testPaper_data);
//                                     callback(testPaper_err, testPaper_data);
//                                 }
//                             })
//                         }
//                     })
//                 }
//             }
//             detailsLoop(0);
//         }
//     })
// }

// exports.fetchConceptBasedQuestionAndCreateTestPaper = async (questionIds, blueprint, request, conceptData, callback) => {
//     /** FETCH QUESTION DATA **/
//     let fetchBulkquesReq = {
//         IdArray : questionIds,
//         fetchIdName : "question_id",
//         TableName : TABLE_NAMES.upschool_question_table,
//         questionStatus : "Publish",
//         sourceIds : request.source_ids,
//         projectionExp : [ "question_id", "answers_of_question", "appears_in", "cognitive_skill", "difficulty_level", "marks", "question_active_status", "question_category", "question_content", "question_source", "question_status", "question_type" ]
//     }

//     let question_details = request.question_details;
//     questionRepository.fetchBulkQuestionsWithPublishStatusAndProjection(fetchBulkquesReq, async function (questionsData_err, questionsData_res) {
//         if (questionsData_err) {
//             console.log(questionsData_err);
//             callback(questionsData_err, questionsData_res);
//         } else {
//             console.log("PUBLISHED QUESTION DATA");
//             console.log(questionsData_res.Items);

//             let queSection = blueprint.sections;
//             let questionExistId = [];
//             let getQuestion = [];
//             let blueQues = "";
//             let finalQuestions = [];
//             let questionArr = [];
//             let contUrl = "";

//             /** SECTION LOOP **/
//             function secLoop(i)
//             {
//                 if(i < queSection.length)
//                 {
//                     finalQuestions.push({section_name : queSection[i].section_name});
//                     questionArr = [];

//                     /** QUESTION LOOP **/
//                     async function quesLoop(j)
//                     {
//                         if(j < queSection[i].questions.length)
//                         {
//                             blueQues = queSection[i].questions[j];                            
//                             getQuestion = [];
//                             contUrl = "";

//                             exports.getAvalQuestions(question_details[i].questions[j].concept_ids, conceptData, questionsData_res.Items, async (avalQues_err, avalQues_data) => {
//                                 if(avalQues_err)
//                                 {
//                                     console.log(avalQues_err);
//                                     callback(avalQues_err, avalQues_data);
//                                 }
//                                 else
//                                 {
//                                     console.log("GOT AVAILABLE QUESTION : ", avalQues_data);
//                                     getQuestion = blueQues.cognitive_id != "N.A." ? 
//                                     await avalQues_data.filter(Qs => Qs.question_category === blueQues.category_id && Qs.cognitive_skill === blueQues.cognitive_id && Qs.difficulty_level === blueQues.difficulty_level && Number(Qs.marks) === Number(blueQues.marks) && Qs.question_type === blueQues.question_type) : 
//                                     await avalQues_data.filter(Qs => Qs.question_category === blueQues.category_id && Qs.difficulty_level === blueQues.difficulty_level && Number(Qs.marks) === Number(blueQues.marks) && Qs.question_type === blueQues.question_type)

//                                     getQuestion = await helper.removeExistObject(questionExistId, getQuestion, "question_id");

//                                     if(getQuestion.length > 0 && (!questionExistId.find(ext => ext === getQuestion[0].question_id)))
//                                     {
//                                         contUrl = "N.A.";
//                                         if(blueQues.question_type === constant.questionKeys.objective)
//                                         {
//                                             await helper.getAnswerContentFileUrl(getQuestion[0].answers_of_question).then((curl) => {
//                                                 contUrl = curl
//                                             })
//                                             .catch(function(curlErr) {
//                                                 console.log(curlErr);  
//                                                 contUrl = "N.A.";
//                                             })
//                                         }
                                        
//                                         questionArr.push({      
//                                             question_name : blueQues.question_name,
//                                             question_type : blueQues.question_type,
//                                             marks : blueQues.marks,
//                                             difficulty_level : blueQues.difficulty_level,
//                                             question_id : getQuestion[0].question_id,
//                                             question_content : getQuestion[0].question_content,
//                                             answers_of_question : contUrl
//                                         })       
                                        
//                                         questionExistId.push(getQuestion[0].question_id);
//                                     }
//                                     else
//                                     {
//                                         questionArr.push({
//                                             question_name : blueQues.question_name,
//                                             question_type : blueQues.question_type,
//                                             marks : blueQues.marks,
//                                             difficulty_level : blueQues.difficulty_level,
//                                             question_id : "N.A.",
//                                             question_content : "N.A.",
//                                             answers_of_question : "N.A."
//                                         })         
                                        
//                                     }  
//                                     j++;
//                                     quesLoop(j);  
//                                 }
//                             })
//                         }
//                         else
//                         {
//                             finalQuestions[i].questions = questionArr;
//                             i++;
//                             secLoop(i);
//                         }
//                     } 
//                     quesLoop(0);
//                     /** END QUESTION LOOP **/                    
//                 }
//                 else
//                 {
//                     /** TEH END **/
//                     console.log("FINAL QUESTION DATA");
//                     console.log(finalQuestions);
//                     callback(0, finalQuestions);
//                 }
//             }
//             secLoop(0);
//             /** END SECTION LOOP **/
//         }
//     })
//     /** END FETCH QUESTION DATA **/
// }

// exports.getAvalQuestions = async (conceptId, conceptData, questionDatas, callback) => {
//     console.log("CON ID : ", conceptId);

//     let conceptBlock = "";
//     let avalQuestion = [];
//     let singleQues = "";
//     async function conceptLoop(i)
//     {
//         if(i < conceptId.length)
//         {
//             conceptBlock = await conceptData.filter(con => con.concept_id === conceptId[i]);
//             if(conceptBlock.length > 0)
//             {                
//                 await conceptBlock[0].concept_question_id.forEach(async cq => {
//                     singleQues = await questionDatas.find(ques => ques.question_id === cq);
//                     if(singleQues != undefined)
//                     {
//                         avalQuestion.push(singleQues);
//                     }
//                 })        
//             }
//             i++;
//             conceptLoop(i);
//         }
//         else
//         {
//             /** END **/
//             console.log("AVAILABLE QUESTION : ", avalQuestion);
//             callback(0, avalQuestion);
//         }
//     }
//     conceptLoop(0);
// }
