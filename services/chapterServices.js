const fs = require("fs");
const { chapterRepository, topicRepository, teacherRepository,schoolRepository,quizRepository,teachingActivityRepository} = require("../repository")  
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { nextTick } = require("process");
const { response } = require("express");

exports.chapterUnlockService = async function (request, callback) {
    /** FETCH USER BY EMAIL **/
    console.log("request : ", request);

    teacherRepository.fetchTeacherByID(request, async function (individual_teacher_err, individual_teacher_response) {
        if (individual_teacher_err) { 
            console.log(individual_teacher_err);
            callback(individual_teacher_err, individual_teacher_response);
        } else {
            if(individual_teacher_response.Items.length === 0){
                callback(400, constant.messages.TEACHER_DOESNOT_EXISTS); 
            } else { 
                let teacher_info = individual_teacher_response.Items[0].teacher_info.filter((e) => e.client_class_id == request.data.client_class_id && e.section_id == request.data.section_id && e.subject_id == request.data.subject_id); 
                if(teacher_info.length === 0){ 
                    callback(400, constant.messages.CLASS_SECTION_SUBJECT_COMBO_DOESNT_EXIST)
                }
                else{
                    let chapter_data = teacher_info[0].chapter_data.filter(e => e.chapter_id == request.data.chapter_id); 
                    
                    let tempObj; 
                    if(chapter_data.length === 0){ 
                        tempObj = { 
                            chapter_id : request.data.chapter_id,
                            chapter_locked : request.data.chapter_locked,
                            pre_learning : {
                                due_date : { 
                                    yyyy_mm_dd: request.data.chapter_locked == "Yes" ? "yyyy_mm_dd" : request.data.due_date,
                                    dd_mm_yyyy: request.data.chapter_locked == "Yes" ? "dd_mm_yyyy" : helper.change_dd_mm_yyyy(request.data.due_date),
                                },
                                topic_details : []
                            },
                            post_learning: { 
                                topic_details : []
                            }
                        }
                        teacher_info[0].chapter_data.push(tempObj); 
    
                    }
                    else
                    { 
                        teacher_info[0].chapter_data.forEach((ele, i) => { 
                            if(ele.chapter_id == request.data.chapter_id)
                            {
                                teacher_info[0].chapter_data[i].chapter_locked = request.data.chapter_locked;
                                teacher_info[0].chapter_data[i].pre_learning = {
                                    due_date: {
                                        yyyy_mm_dd: request.data.chapter_locked == "Yes" ? "yyyy_mm_dd" : request.data.due_date,
                                        dd_mm_yyyy: request.data.chapter_locked == "Yes" ? "dd_mm_yyyy" : helper.change_dd_mm_yyyy(request.data.due_date),
                                    }, 
                                    topic_details : teacher_info[0].chapter_data[i].pre_learning.topic_details
                                };
                                teacher_info[0].chapter_data[i].post_learning = {
                                    topic_details : teacher_info[0].chapter_data[i].post_learning.topic_details
                                }
                            }
                         });
                    } 
                    individual_teacher_response.Items[0].teacher_info.forEach((ele, i) => {
                        if(ele.client_class_id == request.data.client_class_id && ele.section_id == request.data.section_id && ele.subject_id == request.data.subject_id)
                        {
                            individual_teacher_response.Items[0].teacher_info[i] = teacher_info[0];
                        }
                    });
                    teacherRepository.updateTeacherInfo({teacher_info: individual_teacher_response.Items[0].teacher_info, teacher_id: request.data.teacher_id}, async function (teacher_info_err, teacher_info_response) {
                        if (teacher_info_err) { 
                            console.log(teacher_info_err);
                            callback(teacher_info_err, teacher_info_response);
                        } else { 
                            console.log("Success");
                            callback(0, teacher_info_response);
                        }
                    })
                }
            }
        }
    })
}

// exports.chapterUnlockService = async(request) => {
//     console.log("request : ", request);
  
//     const individual_teacher_response = await teacherRepository.fetchTeacherByID(request);
  
//     if (!individual_teacher_response || individual_teacher_response.Items.length === 0) {
//       return { statusCode: 400, message: constant.messages.TEACHER_DOESNOT_EXISTS };
//     }
  
//     let teacher_info = individual_teacher_response.Items[0].teacher_info.filter((e) =>
//       e.client_class_id == request.data.client_class_id &&
//       e.section_id == request.data.section_id &&
//       e.subject_id == request.data.subject_id
//     );
  
//     if (teacher_info.length === 0) {
//       return { statusCode: 400, message: constant.messages.CLASS_SECTION_SUBJECT_COMBO_DOESNT_EXIST };
//     }
  
//     let chapter_data = teacher_info[0].chapter_data.filter(e => e.chapter_id == request.data.chapter_id);
  
//     let tempObj;
//     if (chapter_data.length === 0) {
//       // If chapter data doesn't exist, create a new one
//       tempObj = {
//         chapter_id: request.data.chapter_id,
//         chapter_locked: request.data.chapter_locked,
//         pre_learning: {
//           due_date: {
//             yyyy_mm_dd: request.data.chapter_locked == "Yes" ? "yyyy_mm_dd" : request.data.due_date,
//             dd_mm_yyyy: request.data.chapter_locked == "Yes" ? "dd_mm_yyyy" : helper.change_dd_mm_yyyy(request.data.due_date),
//           },
//           topic_details: []
//         },
//         post_learning: {
//           topic_details: []
//         }
//       };
//       teacher_info[0].chapter_data.push(tempObj);
  
//     } else {
//       // If chapter data exists, update the existing one
//       teacher_info[0].chapter_data.forEach((ele, i) => {
//         if (ele.chapter_id == request.data.chapter_id) {
//           teacher_info[0].chapter_data[i].chapter_locked = request.data.chapter_locked;
//           teacher_info[0].chapter_data[i].pre_learning = {
//             due_date: {
//               yyyy_mm_dd: request.data.chapter_locked == "Yes" ? "yyyy_mm_dd" : request.data.due_date,
//               dd_mm_yyyy: request.data.chapter_locked == "Yes" ? "dd_mm_yyyy" : helper.change_dd_mm_yyyy(request.data.due_date),
//             },
//             topic_details: teacher_info[0].chapter_data[i].pre_learning.topic_details
//           };
//           teacher_info[0].chapter_data[i].post_learning = {
//             topic_details: teacher_info[0].chapter_data[i].post_learning.topic_details
//           };
//         }
//       });
//     }
  
//     individual_teacher_response.Items[0].teacher_info.forEach((ele, i) => {
//       if (ele.client_class_id == request.data.client_class_id &&
//         ele.section_id == request.data.section_id &&
//         ele.subject_id == request.data.subject_id) {
//         individual_teacher_response.Items[0].teacher_info[i] = teacher_info[0];
//       }
//     });
  
//     // Update teacher info
//     const teacher_info_response = await teacherRepository.updateTeacherInfo({
//       teacher_info: individual_teacher_response.Items[0].teacher_info,
//       teacher_id: request.data.teacher_id
//     });
  
//     console.log("Success");
//     return teacher_info_response;
//   };
  

exports.fetchTopicsBasedonChapter = function (request, callback) {

    request === undefined || request.data === undefined || request.data.client_class_id === undefined || request.data.client_class_id === "" || request.data.section_id === undefined || request.data.section_id === "" || request.data.subject_id === undefined || request.data.subject_id === "" || request.data.teacher_id === undefined || request.data.teacher_id === "" || request.data.chapter_id === undefined || request.data.chapter_id === "" ? callback(400, constant.messages.INVALID_REQUEST) : 
    
    teacherRepository.fetchTeacherByID(request, async function (individual_teacher_err, individualTeacherRes) {
          if (individual_teacher_err) {
            console.log(individual_teacher_err);
            callback(individual_teacher_err, individualTeacherRes); 
          } else {
            
            let teacher_info = individualTeacherRes.Items[0].teacher_info.filter((e) => (e.client_class_id == request.data.client_class_id) && (e.section_id == request.data.section_id) && (e.subject_id == request.data.subject_id)); 
            if(teacher_info.length > 0){ 

                teachingActivityRepository.fetchTeachingActivity(request, async function (teacher_activity_details_err, teacher_activity_details_res) {
                    if (teacher_activity_details_err) { 
                    console.log(teacher_activity_details_err);
                    callback(teacher_activity_details_err, teacher_activity_details_res);
                    }
                    else
                    { 
                        chapterRepository.fetchChapterByID(request, async function (single_chapter_err, single_chapter_response) {
                            if (single_chapter_err) {
                                console.log(single_chapter_err);
                                callback(single_chapter_err, single_chapter_response);
                            } else {
                                console.log("single_chapter_response : ", single_chapter_response);
                                let newArrPre = [];
                                let newArrPost = [];
                                single_chapter_response.length === 0 ? callback(400, constant.messages.CHAPTER_COMBO_DOESNT_EXISTS) :

                                topicRepository.fetchPreTopicData(single_chapter_response.Items[0], async function (pre_topic_err, pre_topic_response) {
                                    if (pre_topic_err) {
                                        console.log(pre_topic_err);
                                        callback(pre_topic_err, pre_topic_response);
                                    } else {
                                        console.log("pre_topic_response : ", pre_topic_response);

                                        topicRepository.fetchPostTopicData(single_chapter_response.Items[0], async function (post_topic_err, post_topic_response) {
                                            if (post_topic_err) {
                                                console.log(post_topic_err);
                                                callback(post_topic_err, post_topic_response);
                                            } else {
                                                console.log("post_topic_response : ", post_topic_response);
                                                
                                                /** SET ARCHIVED STATUS **/
                                                let preLearning = constant.prePostConstans.preLearning;
                                                exports.appendPreTopicsArchivedStatus(request, teacher_activity_details_res, pre_topic_response, preLearning, (finalPreTopicErr, finalPreTopicData) => {
                                                    if(finalPreTopicErr)
                                                    {
                                                        console.log("ERROR : "+ finalPreTopicErr);
                                                        callback(finalPreTopicErr, finalPreTopicData);
                                                    }
                                                    else
                                                    {
                                                        let postLearning = constant.prePostConstans.postLearning; 
                                                        exports.appendPostTopicsArchivedStatus(request, teacher_activity_details_res, post_topic_response, postLearning, (finalPostTopicErr, finalPostTopicData) => {
                                                            if(finalPostTopicErr)
                                                            {
                                                                console.log("ERROR : "+ finalPostTopicErr);
                                                                callback(finalPostTopicErr, finalPostTopicData);
                                                            }
                                                            else
                                                            {
                                                                /** CHECK QUIZ EXIST **/
                                                                request.data.learningType = constant.prePostConstans.preLearningVal; 
                                                                quizRepository.fetchQuizData(request, async function (quizData_err, quizData_res)
                                                                {
                                                                    if(quizData_err)
                                                                    {
                                                                        console.log(quizData_err);
                                                                        callback(quizData_err, quizData_res);
                                                                    }
                                                                    else
                                                                    {
                                                                        console.log("QUIZ DATA : ", quizData_res);
                                                                        /** SET GRANTED ACCESS **/
                                                                        request.data.school_id = individualTeacherRes.Items[0].school_id;
                                                                        schoolRepository.getSchoolDetailsById(request, (schoolDataErr, SchoolDataRes) => {
                                                                            if(schoolDataErr)
                                                                            {
                                                                                console.log(schoolDataErr);
                                                                                callback(schoolDataErr, SchoolDataRes);
                                                                            }
                                                                            else
                                                                            {
                                                                                console.log("SCHOOL DATA : ", SchoolDataRes);
                                                                                let response = {
                                                                                    preLearning : {},
                                                                                    postLearning : {},
                                                                                    pre_topic_items : finalPreTopicData, 
                                                                                    post_topic_items : finalPostTopicData
                                                                                } 
                                                                                // Pre Learning : 
                                                                                response.preLearning.topic_archive = SchoolDataRes.Items[0].pre_quiz_config ? SchoolDataRes.Items[0].pre_quiz_config.topic_archive : "N.A.";
                                                                                response.preLearning.quizExist = quizData_res.Items.length > 0 ? "Yes" : "No"; 
                                                                                // Post Learning : 
                                                                                response.postLearning.topic_archive = SchoolDataRes.Items[0].post_quiz_config ? SchoolDataRes.Items[0].post_quiz_config.topic_archive : "N.A."; 
                                                                                response.postLearning.choose_topic = SchoolDataRes.Items[0].post_quiz_config ? SchoolDataRes.Items[0].post_quiz_config.choose_topic : "N.A."; 
                                                                        
                                                                                /** SEND FINAL RESPONSE **/
                                                                                if(teacher_activity_details_res.Items.length > 0 && teacher_activity_details_res.Items[0].chapter_data.length > 0){ 
                                                                        
                                                                                    let chapter_activity = teacher_activity_details_res.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id); 
                                                                                    console.log("chapter_activity  : ", chapter_activity);
                                                                        
                                                                                    if(chapter_activity.length > 0){
                                                                                        console.log("chapter_activity : ", chapter_activity); 
                                                                                        
                                                                                        response.preLearning.digicard_locked = (chapter_activity[0].pre_learning.unlocked_digicard !== undefined && chapter_activity[0].pre_learning.unlocked_digicard.topics !== undefined) ? "No" : "Yes";  
                                                                                        response.postLearning.digicard_locked = (chapter_activity[0].post_learning.unlocked_digicard !== undefined && chapter_activity[0].post_learning.unlocked_digicard.length > 0 && chapter_activity[0].post_learning.unlocked_digicard !== undefined) ? "No" : "Yes"; 
                                                                                        // Update Digicard Lock Status for Each Topic : 
                                                                                        if(response.postLearning.choose_topic === "Yes" && chapter_activity[0].post_learning.unlocked_digicard !== undefined && chapter_activity[0].post_learning.unlocked_digicard.length > 0){
                                                                                            let topics = []; 
                                                                                            chapter_activity[0].post_learning.unlocked_digicard.map((e) => topics.push(...e.topics)) 
                                                                                            finalPostTopicData.map((e) => {
                                                                                                topics.filter((a) => a.topic_id === e.topic_id).length > 0 ? (e.topic_locked = 'No') : e.topic_locked = 'Yes' 
                                                                                            })
                                                                                        }else{
                                                                                            finalPostTopicData.map((e) => e.topic_locked = "Yes"); 
                                                                                        }
                                                                        
                                                                                        response.post_topic_items = finalPostTopicData; 
                                                                                        callback(200, response); 
                                                                                    }else{
                                                                                        response.preLearning.digicard_locked = "Yes"; 
                                                                                        // No Chapter JSON out of Chapter Data 
                                                                                        callback(200, response); 
                                                                                    }
                                                                                } else {
                                                                                    response.preLearning.digicard_locked = "Yes"; 
                                                                                    // No Chapter data 
                                                                                    callback(200, response); 
                                                                                }
                                                                                /** END SEND FINAL RESPONSE **/
                                                                            }
                                                                        })
                                                                        
                                                                    }
                                                                })
                                                            }
                                                        }); 
                                                        /** SET GRANTED ACCESS **/
                                                        /** END SET GRANTED ACCESS **/                                                        
                                                    }
                                                })
                                                /** END SET ARCHIVED STATUS **/                                                
                                            }
                                        }); 
                                    }
                                })
                            }
                        })
                    }
                })
            } else { 
                callback(400, constant.messages.SUBJECT_ISNOT_ALLOCATE_TO_TEACHER)
            }
        }
    })
}

// exports.fetchTopicsBasedonChapterNew = async(request)=> {
//     if (!request?.data?.client_class_id || !request.data.section_id || !request.data.subject_id || !request.data.teacher_id || !request.data.chapter_id) {
//       return { status: 400, message: constant.messages.INVALID_REQUEST };
//     }
  
//     const individualTeacherRes = await teacherRepository.fetchTeacherByID(request);
    
//     let teacher_info = individualTeacherRes.Items[0].teacher_info.filter((e) => 
//       e.client_class_id == request.data.client_class_id &&
//       e.section_id == request.data.section_id &&
//       e.subject_id == request.data.subject_id
//     );
  
//     if (teacher_info.length === 0) {
//       return { status: 400, message: constant.messages.SUBJECT_ISNOT_ALLOCATE_TO_TEACHER };
//     }
  
//     const teacher_activity_details_res = await teachingActivityRepository.fetchTeachingActivity(request);
//     const single_chapter_response = await chapterRepository.fetchChapterByID(request);
  
//     if (single_chapter_response.length === 0) {
//       return { status: 400, message: constant.messages.CHAPTER_COMBO_DOESNT_EXISTS };
//     }
  
//     const pre_topic_response = await topicRepository.fetchPreTopicData(single_chapter_response.Items[0]);
//     const post_topic_response = await topicRepository.fetchPostTopicData(single_chapter_response.Items[0]);
  
//     const finalPreTopicData = await exports.appendPreTopicsArchivedStatus(request, teacher_activity_details_res, pre_topic_response, constant.prePostConstans.preLearning);
//     const finalPostTopicData = await exports.appendPostTopicsArchivedStatus(request, teacher_activity_details_res, post_topic_response, constant.prePostConstans.postLearning);
  
//     request.data.learningType = constant.prePostConstans.preLearningVal;
//     const quizData_res = await quizRepository.fetchQuizData(request);
  
//     request.data.school_id = individualTeacherRes.Items[0].school_id;
//     const SchoolDataRes = await schoolRepository.getSchoolDetailsById(request);
  
//     let response = {
//       preLearning: {
//         topic_archive: SchoolDataRes.Items[0].pre_quiz_config ? SchoolDataRes.Items[0].pre_quiz_config.topic_archive : "N.A.",
//         quizExist: quizData_res.Items.length > 0 ? "Yes" : "No",
//         digicard_locked: "Yes"
//       },
//       postLearning: {
//         topic_archive: SchoolDataRes.Items[0].post_quiz_config ? SchoolDataRes.Items[0].post_quiz_config.topic_archive : "N.A.",
//         choose_topic: SchoolDataRes.Items[0].post_quiz_config ? SchoolDataRes.Items[0].post_quiz_config.choose_topic : "N.A.",
//         digicard_locked: "Yes"
//       },
//       pre_topic_items: finalPreTopicData,
//       post_topic_items: finalPostTopicData
//     };
  
//     if (teacher_activity_details_res.Items.length > 0 && teacher_activity_details_res.Items[0].chapter_data.length > 0) {
//       let chapter_activity = teacher_activity_details_res.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id);
  
//       if (chapter_activity.length > 0) {
//         response.preLearning.digicard_locked = (chapter_activity[0].pre_learning.unlocked_digicard?.topics !== undefined) ? "No" : "Yes";
//         response.postLearning.digicard_locked = (chapter_activity[0].post_learning.unlocked_digicard?.length > 0) ? "No" : "Yes";
  
//         if (response.postLearning.choose_topic === "Yes" && chapter_activity[0].post_learning.unlocked_digicard?.length > 0) {
//           let topics = chapter_activity[0].post_learning.unlocked_digicard.map(e => [...e.topics]);
//           finalPostTopicData.map(e => topics.some(a => a.topic_id === e.topic_id) ? e.topic_locked = 'No' : e.topic_locked = 'Yes');
//         } else {
//           finalPostTopicData.map(e => e.topic_locked = "Yes");
//         }
  
//         response.post_topic_items = finalPostTopicData;
//       }
//     }
  
//     return { status: 200, data: response };
//   };
  

exports.appendPreTopicsArchivedStatus = async function (request, teacherActivityData, preTopicData, prePostType, callback) {
    let newPreTopic = [];
    let activeOrNot = "";
    
    if(teacherActivityData.Items.length > 0)
    {
        let chapterActivity = teacherActivityData.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id); 
        console.log("chapterActivity : ", chapterActivity);

        if(chapterActivity.length > 0)
        { 
            let preArchivedTopics = chapterActivity[0][prePostType].archivedTopics !== undefined ? chapterActivity[0][prePostType].archivedTopics : []; 
            console.log("preArchivedTopics : ", preArchivedTopics);
            
            if(preArchivedTopics.length > 0)
            {
                await preTopicData.Items.map(async preTop => {
                    activeOrNot = "";
                    activeOrNot = await preArchivedTopics.filter(arcTop => arcTop === preTop.topic_id);
                    if(activeOrNot.length > 0)
                    {
                        preTop.isArchived = "Yes"
                        newPreTopic.push(preTop);
                    }
                    else
                    {
                        preTop.isArchived = "No"
                        newPreTopic.push(preTop);
                    }
                })                
            }
            else
            {
                /** EMPTY ARCHIVED TOPIC **/
                await preTopicData.Items.map(preTop => {
                    preTop.isArchived = "No"
                    newPreTopic.push(preTop);
                })
                /** END EMPTY ARCHIVED TOPIC **/
            }

            callback(0, newPreTopic);
        }
        else
        {
            console.log("NO CHAPTER ACTIVITY");
            await preTopicData.Items.map(preTop => {
                preTop.isArchived = "No"
                newPreTopic.push(preTop);
            })

            callback(0, newPreTopic);
        }
    }
    else
    {
        /** NO ACTIVITY **/
        console.log("NO SUBJECT ACTIVITY");
        await preTopicData.Items.map(preTop => {
            preTop.isArchived = "No";
            newPreTopic.push(preTop);
        })

        callback(0, newPreTopic);
        /** END NO ACTIVITY **/
    }
}
exports.appendPostTopicsArchivedStatus = async function (request, teacherActivityData, postTopicData, prePostType, callback) {
    let newPostTopic = [];
    let activeOrNot = "";
    
    if(teacherActivityData.Items.length > 0)
    {
        let chapterActivity = teacherActivityData.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id); 
        console.log("chapterActivity : ", chapterActivity);

        if(chapterActivity.length > 0)
        { 
            let preArchivedTopics = chapterActivity[0][prePostType].archivedTopics !== undefined ? chapterActivity[0][prePostType].archivedTopics : []; 
            console.log("preArchivedTopics : ", preArchivedTopics);
            
            if(preArchivedTopics.length > 0)
            {
                await postTopicData.Items.map(async postTop => {
                    activeOrNot = "";
                    activeOrNot = await preArchivedTopics.filter(arcTop => arcTop === postTop.topic_id);
                    if(activeOrNot.length > 0)
                    {
                        postTop.isArchived = "Yes"
                        newPostTopic.push(postTop);
                    }
                    else
                    {
                        postTop.isArchived = "No"
                        newPostTopic.push(postTop);
                    }
                })                
            }
            else
            {
                /** EMPTY ARCHIVED TOPIC **/
                await postTopicData.Items.map(postTop => {
                    postTop.isArchived = "No"
                    newPostTopic.push(postTop);
                })
                /** END EMPTY ARCHIVED TOPIC **/
            }

            callback(0, newPostTopic);
        }
        else
        {
            console.log("NO CHAPTER ACTIVITY");
            await postTopicData.Items.map(postTop => {
                postTop.isArchived = "No"
                newPostTopic.push(postTop);
            })

            callback(0, newPostTopic);
        }
    }
    else
    {
        /** NO ACTIVITY **/
        console.log("NO SUBJECT ACTIVITY");
        await postTopicData.Items.map(postTop => {
            postTop.isArchived = "No";
            newPostTopic.push(postTop);
        })

        callback(0, newPostTopic);
        /** END NO ACTIVITY **/
    }
}
exports.chapterPrelearningUnlock = function (request, callback) {
    teachingActivityRepository.fetchTeachingActivity(request, async function (teachActivity_err, teachActivity_response) {
        if (teachActivity_err) { 
            console.log(teachActivity_err);
            callback(teachActivity_err, teachActivity_response);
        } else {
            console.log("TEACHING ACTIVITY : ");
            console.log(teachActivity_response);
            
            if(request.data.unlockType === constant.unlockChapterValues.automatedUnlock)
            {
                /** AUTOMATED UNLOCK **/
                let chapterIndex = "";
                let AllChapter = "";
                if(teachActivity_response.Items.length > 0)
                {
                    AllChapter = teachActivity_response.Items[0].chapter_data;                    
                    chapterIndex = await AllChapter.findIndex(Chap => Chap.chapter_id === request.data.chapter_id);
                    console.log("CHAPTER INDEX : ", chapterIndex);

                    if(JSON.stringify(chapterIndex).length > 0)
                    {
                        AllChapter[chapterIndex].chapter_locked = request.data.isLocked;                        
                        AllChapter[chapterIndex].pre_learning.due_date = (request.data.isLocked === "No") ? { yyyy_mm_dd: request.data.due_date, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.due_date) } : AllChapter[chapterIndex].pre_learning.due_date;
                    }
                    else
                    {
                        AllChapter.push({
                            chapter_id : request.data.chapter_id,
						    chapter_locked : request.data.isLocked,
                            pre_learning : {
                                unlockType : request.data.unlockType,
                                due_date : { yyyy_mm_dd: request.data.due_date, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.due_date) }
                            },
                            post_learning : [],
                        });
                    }

                    /** UPDATE AUTOMATED CHAPTER LOCKED **/
                    request.data.activity_id = teachActivity_response.Items[0].activity_id;
                    request.data.chapter_data = AllChapter;
                    teachingActivityRepository.updateTeachingActivity(request, async function (updateActivity_err, updateActivity_response) {
                        if (updateActivity_err) { 
                            console.log(updateActivity_err);
                            callback(updateActivity_err, updateActivity_response);
                        } else {
                            console.log("Chapter lock status updated to ", request.data.isLocked + "!");
                            callback(0, 200);
                        }
                    })
                    /** END UPDATE AUTOMATED CHAPTER LOCKED **/
                }
                else
                {
                    /** ADD NEW CHAPTER TO BE AUTOMATED LOCKED **/
                    request.data.chapter_data = [{
                        chapter_id : request.data.chapter_id,
                        chapter_locked : request.data.isLocked,
                        pre_learning : {
                            unlockType : request.data.unlockType,
                            due_date : { yyyy_mm_dd: request.data.due_date, dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.due_date) }
                        },
                        post_learning : [],
                    }]
                    request.data.digicard_activities = []; 
                    
                    teachingActivityRepository.addTeachingActivity(request, async function (addActivity_err, addActivity_response) {
                        if (addActivity_err) { 
                            console.log(addActivity_err);
                            callback(addActivity_err, addActivity_response);
                        } else {
                            console.log("Chapter locked as automated!");
                            callback(0, 200);
                        }
                    })
                    /** ADD NEW CHAPTER TO BE AUTOMATED LOCKED **/
                }
                /** END AUTOMATED UNLOCK **/
            }
            else
            {
                console.log(constant.unlockChapterValues.automatedUnlock);
                callback(0, 200);
            }
        }
    })    
}
