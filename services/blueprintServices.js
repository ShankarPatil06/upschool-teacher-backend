const { blueprintRepository, questionRepository, commonRepository, testQuestionPaperRepository, groupRepository, subjectRepository, unitRepository, chapterRepository, topicRepository, conceptRepository } = require("../repository")
const { TABLE_NAMES } = require('../constants/tables');
const constant = require('../constants/constant');
const helper = require('../helper/helper');


exports.getBlueprintByItsId = async (request, callback) => {
    try {
        // Step 1: Fetch the core blueprint data
        const singleBlueprint_res = await new Promise((resolve, reject) => {
            blueprintRepository.fetchBlueprintById(request, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });

        if (!singleBlueprint_res.Items || singleBlueprint_res.Items.length === 0) {
            console.log(constant.messages.NO_DATA);
            return callback(404, constant.messages.NO_DATA); // Use 404 for not found
        }

        const blueprint = singleBlueprint_res.Items[0];
        const questionSection = blueprint.sections || [];
        
        let catIds = [];
        let skillIds = [];

        // Step 2: Safely collect all category and skill IDs
        for (const section of questionSection) {
            if (Array.isArray(section.questions)) {
                for (const ques of section.questions) {
                    catIds.push(ques.category_id);
                    skillIds.push(ques.cognitive_id);
                }
            }
        }

        // --- THE CORE FIX ---
        // Step 3: Remove duplicates and filter out any invalid (undefined, null, or empty) IDs
        const uniqueCatIds = [...new Set(catIds)].filter(Boolean);
        const uniqueSkillIds = [...new Set(skillIds)].filter(Boolean);

        console.log("VALID CATEGORY IDs TO FETCH: ", uniqueCatIds);
        console.log("VALID SKILL IDs TO FETCH : ", uniqueSkillIds);

        // Step 4: Fetch category data
        const fetchBulkCatReq = {
            IdArray: uniqueCatIds,
            fetchIdName: "category_id",
            TableName: TABLE_NAMES.upschool_content_category,
            projectionExp: ["category_id", "category_name"]
        };
        
        const cateData_res = await new Promise((resolve, reject) => {
            commonRepository.fetchBulkDataWithProjection(fetchBulkCatReq, (err, res) => {
                if (err) return reject(err);
                resolve(res);
            });
        });

        // Step 5: Fetch cognitive skill data only if there are IDs to fetch
        let cognData_res = { Items: [] }; // Default to empty response
        if (uniqueSkillIds.length > 0) {
            const fetchBulkCogReq = {
                IdArray: uniqueSkillIds,
                fetchIdName: "cognitive_id",
                TableName: TABLE_NAMES.upschool_cognitive_skill,
                projectionExp: ["cognitive_id", "cognitive_name"]
            };
            cognData_res = await commonRepository.fetchBulkDataWithProjection3(fetchBulkCogReq);
        }

        // Step 6: Merge all the data together
        const finalSections = await new Promise((resolve, reject) => {
            exports.setBlueprintFinalData(questionSection, cateData_res.Items, cognData_res.Items || [], (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });

        // Step 7: Finalize the response and send it back
        blueprint.sections = finalSections;
        callback(null, singleBlueprint_res);

    } catch (error) {
        console.error("Error in getBlueprintByItsId:", error);
        // Pass the error to the callback, which will be sent as the response
        callback(500, { message: "An internal server error occurred while fetching the blueprint." });
    }
};




// exports.getBlueprintByItsId = (request, callback) => {    
//     blueprintRepository.fetchBlueprintById(request, async function (singleBlueprint_err, singleBlueprint_res) {
//         if (singleBlueprint_err) {
//             console.log(singleBlueprint_err);
//             callback(singleBlueprint_err, singleBlueprint_res);
//         } else {  
//             console.log("BLUEPRINT : ", singleBlueprint_res);

//             if(singleBlueprint_res.Items.length > 0)
//             {
//                 let questionSection = JSON.parse(JSON.stringify(singleBlueprint_res.Items[0].sections));
//                 let catIds = [];
//                 let skillIds = []; 

//                 async function getCatCon(i)
//                 {
//                     if(i < questionSection.length)
//                     {
//                         catIds = catIds.concat(await questionSection[i].questions.map(ques => ques.category_id));
//                         skillIds = skillIds.concat(await questionSection[i].questions.map(ques => ques.cognitive_id));  
//                         i++;
//                         getCatCon(i);
//                     }
//                     else
//                     {           
//                         catIds = helper.removeDuplicates(catIds);
//                         skillIds = helper.removeDuplicates(skillIds);
//                         skillIds = skillIds.filter(skill => skill != '');

//                         console.log("CATEGORY ID: ", catIds);
//                         console.log("SKILL IDS : ", skillIds);

//                         /** FETCH CATEGORY DATA **/
//                         let fetchBulkCatReq = {
//                             IdArray : catIds,
//                             fetchIdName : "category_id",
//                             TableName : TABLE_NAMES.upschool_content_category,
//                             projectionExp : ["category_id", "category_name"]
//                         }
            
//                         commonRepository.fetchBulkDataWithProjection(fetchBulkCatReq, async function (cateData_err, cateData_res) {
//                             if (cateData_err) {
//                                 console.log(cateData_err);
//                                 callback(cateData_err, cateData_res);
//                             } else {
//                                 console.log("CAT DATA : ", cateData_res);

//                                 /** FETCH SKILL DATA **/
//                                 let fetchBulkCogReq = {
//                                     IdArray : skillIds,
//                                     fetchIdName : "cognitive_id",
//                                     TableName : TABLE_NAMES.upschool_cognitive_skill,
//                                     projectionExp : ["cognitive_id", "cognitive_name"]
//                                 }
                    
//                                 let cognData_res = [];
//                                 if(skillIds.length > 0){
//                                     cognData_res = await commonRepository.fetchBulkDataWithProjection3(fetchBulkCogReq);
//                                 }
//                                 exports.setBlueprintFinalData(questionSection, cateData_res.Items, cognData_res?.Items || [], (blueErr, blueData) => {
//                                             if(blueErr)
//                                             {
//                                                 console.log(blueErr);
//                                                 callback(blueErr, blueData);
//                                             }
//                                             else
//                                             {
//                                                 console.log(blueData);
//                                                 singleBlueprint_res.Items[0].sections = blueData
//                                                 callback(blueErr, singleBlueprint_res);
//                                             }
//                                 })
//                             }
//                         })
//                         /** END FETCH CATEGORY DATA **/
//                     }
//                 }
//                 getCatCon(0);                
//             }
//             else
//             {
//                 console.log(constant.messages.NO_DATA);
//                 callback(400, constant.messages.NO_DATA);
//             }
//         }
//     }) 
// }

exports.fetchBlueprintDetailsBasedonId = async (request) => {
    const testData = await testQuestionPaperRepository.fetchTestQuestionPaperByID2(request)
    console.log({testData})
    // finding concepts and topics based on  question
    const questions = testData.Items[0].questions.map((question)=>question.question_id).flat(1)
    const uniqueQuestionArr = [...new Set(questions)];
    const conceptData = await conceptRepository.fetchConceptDatabasedonQuestionID3(uniqueQuestionArr)
    console.log(conceptData.length)
    const conceptids = conceptData.map(c=>c.concept_id)
    const TpoicData = await topicRepository.fetchTopicDatabasedonQuestionID3(conceptids)
    console.log({TpoicData})
    //creating new array with has based on concept ---no of questions and topic that it belongs to
    const blueprintData = conceptData.map((concept)=>{
        const commonItems = uniqueQuestionArr.filter(item => concept.concept_question_id.includes(item)).length;
        console.log(commonItems,concept.display_name)
        return {numOfQuestions: commonItems,concept : concept.display_name,conceptId:concept.concept_id}
       
    })
    TpoicData.map((topic)=>{
        topic.concepts = [];
        blueprintData.map((data)=>{
            if (topic.topic_concept_id.includes(data.conceptId)) {
                topic.concepts.push(data);
            }
        })
        console.log(topic.topic_title,topic.concepts.length)
    })
    request.data.subject_id = testData.Items[0].subject_id
    const subject_res = await subjectRepository.getSubjetById2(request);
  let subject_unit_id = subject_res.Items[0].subject_unit_id;

  const unit_res = await unitRepository.fetchUnitData2({ subject_unit_id });

  const unit_chapter_id = [
    ...new Set(unit_res.flatMap((e) => e.unit_chapter_id)),
  ];
  const chapter_res = await chapterRepository.fetchBulkChaptersIDName2({
    unit_chapter_id,
  });
  const topicIds = chapter_res.reduce((acc, chapter) => {
    // Concatenate prelearning and postlearning topic IDs
    return acc.concat(chapter.prelearning_topic_id, chapter.postlearning_topic_id);
}, []);

// Get unique topic IDs using Set
const uniqueTopicIds = [...new Set(topicIds)];

const Topic_res = await topicRepository.fetchBulkTopicsIDNameBlueprint({
    uniqueTopicIds,
  });
console.log(Topic_res.length,TpoicData.length);
Topic_res.map((topic)=>{
    topic.concepts = [];
    blueprintData.map((data)=>{
        if (topic.topic_concept_id.includes(data.conceptId)) {
            topic.concepts.push(data);
        }
    })
    console.log(topic.topic_title,topic.concepts.length)
})


    return {Topic_res}
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
                                        projectionExp : [ "question_id", "answers_of_question", "appears_in", "cognitive_skill", "difficulty_level", "marks", "question_active_status", "question_category", "question_content", "question_source", "question_status", "question_type", "sub_questions" ]
                                    }

                                    questionRepository.fetchBulkQuestionsWithPublishStatusAndProjection(fetchBulkquesReq, async function (questionsData_err, questionsData_res) {
                                        if (questionsData_err) {
                                            console.log(questionsData_err);
                                            callback(questionsData_err, questionsData_res);
                                        } else {
                                            console.log("PUBLISHED QUESTION DATA");
                                            
                                            let filteredQuestionData = await questionsData_res.Items.filter((qtn) => request.data.source_ids.includes(qtn.question_source));

                                            console.log({objectttt: filteredQuestionData});

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


// exports.createQuestionPaper = (priorities, request, blueprint, chapterData, topicData, conceptData, questionData, callback) => { 
    
//     console.log("CONCEPT DATA : ", conceptData);

//     let responseData = JSON.parse(JSON.stringify(request.data.question_details));
//     let reqSection = request.data.question_details;
//     let blueSection = blueprint.sections;
     
//     let exitingQuesIds = [];
//     let secPos = "";
//     let quePos = "";
//     async function mainLoop(i)
//     {
//         if(i < 3)
//         {   
//             async function priLoop(j){
//                 if(j < priorities.length)
//                 {
//                     secPos = priorities[j].sec;
//                     quePos = priorities[j].que;

//                     if(priorities[j].qStatus === "No")
//                     {
//                         if(priorities[j].pre === 0)
//                         {
//                             /** FIRST PRIORITY WITH CONCEPT IDS **/
//                             exports.getConceptAvailQuestions(reqSection[secPos].questions[quePos].concept_ids, conceptData, questionData, async(conAvail_err, conAvail_data) => {
//                                 if(conAvail_err)
//                                 {
//                                     console.log(conAvail_err);
//                                     callback(conAvail_err, conAvail_data);
//                                 }
//                                 else
//                                 {
//                                     exports.getResQuestionObj(conAvail_data, blueSection[secPos].questions[quePos], exitingQuesIds, (quesObj_err, quesObj_data) => {
//                                         if(quesObj_err)
//                                         {
//                                             console.log(quesObj_err);
//                                             callback(quesObj_err, quesObj_data);
//                                         }
//                                         else
//                                         {
//                                             responseData[secPos].questions[quePos] = quesObj_data.quesObj;
//                                             exitingQuesIds = quesObj_data.questionExistId;
//                                             priorities[j].qStatus = "Yes";

//                                             j++;
//                                             priLoop(j);
//                                         }
//                                     })
//                                 }
//                             })
//                             /** END FIRST PRIORITY WITH CONCEPT IDS **/
//                         }
//                         else if(priorities[j].pre === 1)
//                         {
//                             /** SECOND PRIORITY WITH TOPIC IDS **/
//                             exports.getTopicsAvailQuestions(reqSection[secPos].topic_ids, topicData, conceptData, questionData, async(topAvail_err, topAvail_data) => {
//                                 if(topAvail_err)
//                                 {
//                                     console.log(topAvail_err);
//                                     callback(topAvail_err, topAvail_data);
//                                 }
//                                 else
//                                 {
//                                     exports.getResQuestionObj(topAvail_data, blueSection[secPos].questions[quePos], exitingQuesIds, (quesTopObj_err, quesTopObj_data) => {
//                                         if(quesTopObj_err)
//                                         {
//                                             console.log(quesTopObj_err);
//                                             callback(quesTopObj_err, quesTopObj_data);
//                                         }
//                                         else
//                                         {
//                                             responseData[secPos].questions[quePos] = quesTopObj_data.quesObj;
//                                             exitingQuesIds = quesTopObj_data.questionExistId;
//                                             priorities[j].qStatus = "Yes";

//                                             j++;
//                                             priLoop(j);
//                                         }
//                                     })
//                                 }
//                             });
                            
//                             /** END SECOND PRIORITY WITH TOPIC IDS **/                            
//                         }
//                         else if(priorities[j].pre === 2)
//                         {
//                             /** THIRD PRIORITY WITH CHAPTER IDS **/
//                             exports.getResQuestionObj(questionData, blueSection[secPos].questions[quePos], exitingQuesIds, (quesObjChap_err, quesObjChap_data) => {
//                                 if(quesObjChap_err)
//                                 {
//                                     console.log(quesObjChap_err);
//                                     callback(quesObjChap_err, quesObjChap_data);
//                                 }
//                                 else
//                                 {
//                                     responseData[secPos].questions[quePos] = quesObjChap_data.quesObj;
//                                     exitingQuesIds = quesObjChap_data.questionExistId;
//                                     priorities[j].qStatus = "Yes";

//                                     j++;
//                                     priLoop(j);
//                                 }
//                             })
//                             /** END THIRD PRIORITY WITH CHAPTER IDS **/                            
//                         }
//                     }else{
//                         j++;
//                         priLoop(j);
//                     }
//                 }else{
//                     i++;
//                     mainLoop(i);
//                 }
//             }
//             priLoop(0);            
//         }else{
//             console.log("FINALLY GOT QUESTION :", responseData[0].questions[2]);
//             callback(0, responseData);
//         }
//     }
//     mainLoop(0)
// }


exports.createQuestionPaper = (priorities, request, blueprint, chapterData, topicData, conceptData, questionData, callback) => { 
    
    console.log("Starting question paper creation...");
    
    let responseData = JSON.parse(JSON.stringify(request.data.question_details));
    // let responseData = JSON.parse(JSON.stringify(blueprint.sections));
    let blueSections = blueprint.sections;
     
    let exitingQuesIds = []; // Holds all used question IDs to prevent duplicates across the entire paper.
    let secPos = "";
    let quePos = "";
    
    async function mainLoop(i)
    {
        if(i < 3) // This loop handles the 3 priority levels (Concept, Topic, Chapter)
        {   
            async function priLoop(j){
                if(j < priorities.length)
                {
                    // Only process for the current priority level
                    if (priorities[j].pre !== i) {
                        j++;
                        priLoop(j);
                        return;
                    }

                    secPos = priorities[j].sec;
                    quePos = priorities[j].que;

                    if(priorities[j].qStatus === "No")
                    {
                        let questionsToSearchFrom = [];

                        // Step 1: Determine the pool of available questions based on the current priority
                        if(priorities[j].pre === 0) {
                            console.log(`Priority 0: Fetching by Concept for Sec:${secPos}, Que:${quePos}`);
                            questionsToSearchFrom = await new Promise((resolve, reject) => {
                                exports.getConceptAvailQuestions(responseData[secPos].questions[quePos].concept_ids, conceptData, questionData, (err, data) => {
                                    if (err) return reject(err);
                                    resolve(data || []);
                                });
                            });
                        } else if(priorities[j].pre === 1) {
                            console.log(`Priority 1: Fetching by Topic for Sec:${secPos}, Que:${quePos}`);
                            questionsToSearchFrom = await new Promise((resolve, reject) => {
                            //     exports.getTopicsAvailQuestions(responseData[secPos].questions[quePos].topic_ids, topicData, conceptData, questionData, (err, data) => {
                            //         if (err) return reject(err);
                            //         resolve(data || []);
                            //     });
                            // });

                                exports.getTopicsAvailQuestions(responseData[secPos].topic_ids, topicData, conceptData, questionData, (err, data) => {
                                    if (err) return reject(err);
                                    resolve(data || []);
                                });
                            });
                        } else if(priorities[j].pre === 2) {
                            console.log(`Priority 2: Fetching by Chapter for Sec:${secPos}, Que:${quePos}`);
                            // For chapter level, the pool is all available questions.
                            questionsToSearchFrom = questionData;
                        }

                        // Step 2: Call the recursive function to process the blueprint node
                        try {
                            // This is the blueprint question structure we need to populate.
                            const blueprintQuestionNode = blueSections[secPos].questions[quePos];

                            // This single call handles all complexity (General, OR, Sub-Question, nesting).
                            const result = await exports.processAndFetchQuestion(blueprintQuestionNode, questionsToSearchFrom, exitingQuesIds);

                            // Update the final response with the fully populated question object/tree.
                            responseData[secPos].questions[quePos] = result.quesObj;
                            // Update the global list of used IDs.
                            exitingQuesIds = result.questionExistId;
                            priorities[j].qStatus = "Yes";

                            j++;
                            priLoop(j);
                        } catch (error) {
                            console.error("Error processing question node:", error);
                            return callback(error, null);
                        }
                    } else {
                        j++;
                        priLoop(j);
                    }
                } else {
                    i++;
                    mainLoop(i);
                }
            }
            priLoop(0);            
        } else {
            console.log("FINALLY CREATED QUESTION PAPER:", JSON.stringify(responseData, null, 2));
            callback(0, responseData);
        }
    }
    mainLoop(0);
}

exports.getConceptAvailQuestions = async (conceptId, conceptData, questionDatas, callback) => {

    if(!conceptId || conceptId.length === 0) {
        // If no concept IDs are provided, there are no questions to find. Return empty.
        return callback(0, []); 
    }
    
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
            console.log("AVAILABLE QUESTION : ", avalQuestion);
            callback(0, avalQuestion);
        }
    }
    conceptLoop(0);
}

exports.getTopicsAvailQuestions = async (topicId, topicData, conceptData, questionDatas, callback) => {

     if (!topicId || topicId.length === 0) {
        // If no topic IDs are provided, there are no questions to find. Return empty.
        return callback(0, []);
    }
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

// exports.getResQuestionObj = async (avalQues_data, blueQues, questionExistId, callback) => {
    
//     let endRes = {
//         quesObj: "N.A.",
//         questionExistId: []
//     };
//     console.log({objectttt123:avalQues_data, });
//     console.log({objectttt123:blueQues });
//     let getQuestion = await avalQues_data.filter(Qs => blueQues.category_ids.includes(Qs.question_category)  && (helper.isEmptyArray(blueQues.cognitive_ids) || blueQues.cognitive_ids.includes(Qs.cognitive_skill)) && (!blueQues.difficulty_level || blueQues.difficulty_level === "N.A." || blueQues.difficulty_level === "Select Question Difficulty" || Qs.difficulty_level === blueQues.difficulty_level) && Number(Qs.marks) === Number(blueQues.marks) && Qs.question_type === blueQues.question_type) 


//     getQuestion = await helper.removeExistObject(questionExistId, getQuestion, "question_id");

//     if(getQuestion.length > 0 && (!questionExistId.find(ext => ext === getQuestion[0].question_id)))
//     {
//         let contUrl = "N.A.";
//         if(blueQues.question_type === constant.questionKeys.objective)
//         {
//             await helper.getAnswerContentFileUrl(getQuestion[0].answers_of_question).then((curl) => {
//                 contUrl = curl
//             })
//             .catch(function(curlErr) {
//                 console.log(curlErr);  
//                 contUrl = "N.A.";
//             })
//         }

//         questionExistId.push(getQuestion[0].question_id); 
//         endRes = {
//             quesObj: {
//                 question_name : blueQues.question_name,
//                 question_type : blueQues.question_type,
//                 marks : blueQues.marks,
//                 difficulty_level : blueQues?.difficulty_level,
//                 question_id : getQuestion[0].question_id,
//                 question_content : getQuestion[0].question_content,
//                 answers_of_question : contUrl
//             },
//             questionExistId: questionExistId
//         }; 
//     }
//     else
//     {
//         endRes = {
//             quesObj: {      
//                 question_name : blueQues.question_name,
//                 question_type : blueQues.question_type,
//                 marks : blueQues.marks,
//                 difficulty_level : blueQues.difficulty_level,
//                 question_id : "N.A.",
//                 question_content : "N.A.",
//                 answers_of_question : "N.A."
//             },
//             questionExistId: questionExistId
//         };  
//     }

//     callback(0, endRes);
// }

exports.processAndFetchQuestion = async (blueQues, availableQuestions, existingQuestionIds) => {
    // --- Recursive Case 1: The node is a container for Sub-Questions ---
    if (blueQues.question_structure_type === 'Sub-Question' && blueQues.sub_questions) {
        const processedSubQuestions = [];
        // Loop through each child sub-question
        for (const subQuestion of blueQues.sub_questions) {
            // Recursively process the child. It might be a General question or another container (like an OR question).
            const fetchedResult = await exports.processAndFetchQuestion(subQuestion, availableQuestions, existingQuestionIds);
            processedSubQuestions.push(fetchedResult.quesObj);
            // CRUCIAL: Update the list of used IDs to pass to the next iteration.
            existingQuestionIds = fetchedResult.questionExistId;
        }
        // Return the original container, but with its children now fully processed and populated.
        return {
            quesObj: {
                ...blueQues, // Copy properties like question_description, question_number, etc.
                sub_questions: processedSubQuestions, // Overwrite with the populated children
            },
            questionExistId: existingQuestionIds
        };
    }

    // --- Recursive Case 2: The node is a container for OR-Questions ---
    if (blueQues.question_structure_type === 'OR Question' && blueQues.or_questions) {
        const processedOrQuestions = [];
        for (const orQuestion of blueQues.or_questions) {
            const fetchedResult = await exports.processAndFetchQuestion(orQuestion, availableQuestions, existingQuestionIds);
            processedOrQuestions.push(fetchedResult.quesObj);
            existingQuestionIds = fetchedResult.questionExistId;
        }
        return {
            quesObj: {
                ...blueQues,
                or_questions: processedOrQuestions,
            },
            questionExistId: existingQuestionIds
        };
    }

    // --- Base Case: The node is a "General Question" that needs to be fetched from the DB ---
    // Also handles nested General Questions (e.g., inside a sub_question array).
    if (blueQues.question_structure_type === 'General Question') {
        return new Promise((resolve, reject) => {
            // Use the existing function that filters and finds a single question match.
            exports.getResQuestionObj(availableQuestions, blueQues, existingQuestionIds, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });
    }
    
    // --- Fallback for any other case or malformed data ---
    // This will return the container as-is if it has no recognized children array.
    console.log(`Warning: Unhandled question structure type or malformed node for question number: ${blueQues.question_number}`);
    return { quesObj: blueQues, questionExistId: existingQuestionIds };
};


exports.getResQuestionObj = async (avalQues_data, blueQues, questionExistId, callback) => {
    
    let endRes = {
        quesObj: "N.A.",
        questionExistId: []
    };

    // If blueQues is not valid or doesn't have marks, it's likely a container. Return "N.A.".
    if (!blueQues || !blueQues.marks) {
         endRes = {
            quesObj: {      
                question_name : blueQues?.question_name || "N.A.",
                question_type : blueQues?.question_type || "N.A.",
                marks : blueQues?.marks || "N.A.",
                difficulty_level : blueQues?.difficulty_level || "N.A.",
                question_id : "N.A.",
                question_content : "N.A.",
                answers_of_question : "N.A.",
                sub_questions:"N.A."
            },
            questionExistId: questionExistId
        }; 
        return callback(0, endRes);
    }

    let getQuestion = await avalQues_data.filter(Qs => 
        // FIX: Add defensive checks. If the blueprint doesn't specify a filter, the condition passes.
        (!blueQues.category_ids || blueQues.category_ids.length === 0 || blueQues.category_ids.includes(Qs.question_category)) &&
        (helper.isEmptyArray(blueQues.cognitive_ids) || blueQues.cognitive_ids.includes(Qs.cognitive_skill)) && 
        (!blueQues.difficulty_level || blueQues.difficulty_level === "N.A." || blueQues.difficulty_level === "Select Question Difficulty" || Qs.difficulty_level === blueQues.difficulty_level) && 
        (Number(Qs.marks) === Number(blueQues.marks)) && 
        (Qs.question_type === blueQues.question_type)
    );

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
                question_structure_type: blueQues.question_structure_type,
                question_name : blueQues.question_name,
                question_type : blueQues.question_type,
                marks : blueQues.marks,
                difficulty_level : blueQues?.difficulty_level,
                question_id : getQuestion[0].question_id,
                question_content : getQuestion[0].question_content,
                answers_of_question : contUrl,
                sub_questions:getQuestion[0]?.sub_questions ??[]
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
                answers_of_question : "N.A.",
                sub_questions:"N.A."
            },
            questionExistId: questionExistId
        };  
    }

    callback(0, endRes);
}


// exports.getResQuestionObj = async (avalQues_data, blueQues, questionExistId, callback) => {
    
//     // Step 1: Filter available DB questions based on all criteria from the blueprint
//     let getQuestion = await avalQues_data.filter(dbQuestion => {
//         const criteriaMatch = 
//             (!blueQues.category_ids || blueQues.category_ids.length === 0 || blueQues.category_ids.includes(dbQuestion.question_category)) &&
//             (helper.isEmptyArray(blueQues.cognitive_ids) || blueQues.cognitive_ids.includes(dbQuestion.cognitive_skill)) && 
//             (!blueQues.difficulty_level || blueQues.difficulty_level === "N.A." || dbQuestion.difficulty_level === blueQues.difficulty_level) && 
//             (Number(dbQuestion.marks) === Number(blueQues.marks)) && 
//             (dbQuestion.question_type === blueQues.question_type);

//         if (!criteriaMatch) return false;
        
//         if (blueQues.question_structure_type === 'Sub-Question') {
//             return dbQuestion.sub_questions && dbQuestion.sub_questions.length > 0;
//         } 
        
//         if (blueQues.question_structure_type === 'General Question') {
//             return !dbQuestion.sub_questions || dbQuestion.sub_questions.length === 0;
//         }

//         return false;
//     });

//     // Step 2: From the candidates, remove any that have already been used
//     getQuestion = await helper.removeExistObject(questionExistId, getQuestion, "question_id");

//     let endRes;

//     if (getQuestion.length > 0) {
//         // --- Success: A matching, unused question was found ---
//         const foundQuestion = getQuestion[0];
        
//         // *** THIS IS THE RESTORED LOGIC THAT WAS MISSING ***
//         let processedAnswers = foundQuestion.answers_of_question; // Default to original answers
//         if (foundQuestion.question_type === constant.questionKeys.objective) {
//             try {
//                 // Call your helper to process the answers for objective questions
//                 const curl = await helper.getAnswerContentFileUrl(foundQuestion.answers_of_question);
//                 processedAnswers = curl;
//             } catch (curlErr) {
//                 console.log("Error getting answer content URL:", curlErr);
//                 processedAnswers = "N.A."; // Or handle the error as you see fit
//             }
//         }
//         // ******************************************************

//         questionExistId.push(foundQuestion.question_id); 
        
//         // Build the final object to send to the frontend
//         const finalQuestionObject = {
//             ...foundQuestion, // Copy the entire fetched DB record
//             question_structure_type: blueQues.question_structure_type, // Ensure structure type is set
//             answers_of_question: processedAnswers, // Use the processed answers
//         };

//         endRes = {
//             quesObj: finalQuestionObject,
//             questionExistId: questionExistId
//         }; 

//     } else {
//         // --- Failure: No matching question was found ---
//         endRes = {
//             quesObj: {      
//                 question_structure_type: blueQues.question_structure_type,
//                 question_id: "N.A.",
//                 marks: blueQues.marks,
//                 question_type: blueQues.question_type,
//             },
//             questionExistId: questionExistId
//         };  
//     }

//     callback(0, endRes);
// };

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
