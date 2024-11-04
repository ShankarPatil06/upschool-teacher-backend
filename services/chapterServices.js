const fs = require("fs");
const { chapterRepository, topicRepository, teacherRepository,schoolRepository,quizRepository,teachingActivityRepository} = require("../repository")  
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { nextTick } = require("process");
const { response } = require("express");


exports.fetchTopicsBasedonChapterNew = async(request)=> {
    if (!request?.data?.client_class_id || !request.data.section_id || !request.data.subject_id || !request.data.teacher_id || !request.data.chapter_id) {
      return { status: 400, message: constant.messages.INVALID_REQUEST };
    }
  
    const individualTeacherRes = await teacherRepository.fetchTeacherByID2(request);

    let teacher_info = individualTeacherRes.Items[0].teacher_info.filter((e) => 
      e.client_class_id == request.data.client_class_id &&
      e.section_id == request.data.section_id &&
      e.subject_id == request.data.subject_id
    );
  
    if (teacher_info.length === 0) {
      return { status: 400, message: constant.messages.SUBJECT_ISNOT_ALLOCATE_TO_TEACHER };
    }
  
    const teacher_activity_details_res = await teachingActivityRepository.fetchTeachingActivity2(request);
    const single_chapter_response = await chapterRepository.fetchChapterByID2(request);
  
    if (single_chapter_response.length === 0) {
      return { status: 400, message: constant.messages.CHAPTER_COMBO_DOESNT_EXISTS };
    }
    const pre_topic_response = await topicRepository.fetchPreTopicData2(single_chapter_response.Items[0]);
   
    const post_topic_response = await topicRepository.fetchPostTopicData2(single_chapter_response.Items[0]);
  
    const finalPreTopicData = await exports.appendPreTopicsArchivedStatus2(request, teacher_activity_details_res, pre_topic_response, constant.prePostConstans.preLearning);
    const finalPostTopicData = await exports.appendPostTopicsArchivedStatus2(request, teacher_activity_details_res, post_topic_response, constant.prePostConstans.postLearning);
  
    request.data.learningType = constant.prePostConstans.preLearningVal;
    const quizData_res = await quizRepository.fetchQuizData2(request);
  
    request.data.school_id = individualTeacherRes.Items[0].school_id;
    const SchoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
  
    let response = {
      preLearning: {
        topic_archive: SchoolDataRes.Items[0].pre_quiz_config ? SchoolDataRes.Items[0].pre_quiz_config.topic_archive : "N.A.",
        quizExist: quizData_res.Items.length > 0 ? "Yes" : "No",
        digicard_locked: "Yes"
      },
      postLearning: {
        topic_archive: SchoolDataRes.Items[0].post_quiz_config ? SchoolDataRes.Items[0].post_quiz_config.topic_archive : "N.A.",
        choose_topic: SchoolDataRes.Items[0].post_quiz_config ? SchoolDataRes.Items[0].post_quiz_config.choose_topic : "N.A.",
        digicard_locked: "Yes"
      },
      pre_topic_items: finalPreTopicData,
      post_topic_items: finalPostTopicData
    };
  
    if (teacher_activity_details_res.Items.length > 0 && teacher_activity_details_res.Items[0].chapter_data.length > 0) {
      let chapter_activity = teacher_activity_details_res.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id);
  
      if (chapter_activity.length > 0) {
        response.preLearning.digicard_locked = (chapter_activity[0].pre_learning.unlocked_digicard?.topics !== undefined) ? "No" : "Yes";
        response.postLearning.digicard_locked = (chapter_activity[0].post_learning.unlocked_digicard?.length > 0) ? "No" : "Yes";
  
        if (response.postLearning.choose_topic === "Yes" && chapter_activity[0].post_learning.unlocked_digicard?.length > 0) {
          let topics = chapter_activity[0].post_learning.unlocked_digicard.map(e => [...e.topics]);
          finalPostTopicData.map(e => topics.some(a => a.topic_id === e.topic_id) ? e.topic_locked = 'No' : e.topic_locked = 'Yes');
        } else {
          finalPostTopicData.map(e => e.topic_locked = "Yes");
        }
  
        response.post_topic_items = finalPostTopicData;
      }
    }

    return response;
  };
  

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

exports.appendPostTopicsArchivedStatus2 = async (request, teacherActivityData, postTopicData, prePostType) => {
      const chapterId = request.data.chapter_id;
      const chapterActivity = getChapterActivity2(teacherActivityData, chapterId);
      const preArchivedTopics = getArchivedTopics2(chapterActivity, prePostType);
  
      console.log("postTopicData - ",postTopicData);
      const newPostTopic = postTopicData.map(postTop => ({
        ...postTop,
        isArchived: preArchivedTopics.includes(postTop.topic_id) ? "Yes" : "No",
      }));
  
      return newPostTopic;

  };
  
  const getChapterActivity2 = (teacherActivityData, chapterId) => {
    if (teacherActivityData.Items.length === 0) return null;
  
    return teacherActivityData.Items[0].chapter_data.find(ce => ce.chapter_id === chapterId) || null;
  };
  
  const getArchivedTopics2 = (chapterActivity, prePostType) => 
    chapterActivity && chapterActivity[prePostType] 
      ? chapterActivity[prePostType].archivedTopics || [] 
      : [];
  


exports.appendPreTopicsArchivedStatus = async function (request, teacherActivityData, preTopicData, prePostType) {
    try {
      const chapterId = request.data.chapter_id;
      const chapterActivity = getChapterActivity(teacherActivityData, chapterId);
      const preArchivedTopics = getArchivedTopics(chapterActivity, prePostType);
  
      const newPreTopic = preTopicData.Items.map((preTop) => ({
        ...preTop,
        isArchived: preArchivedTopics.includes(preTop.topic_id) ? "Yes" : "No",
      }));
  
      return newPreTopic;
    } catch (error) {
      console.error("Error in appendPreTopicsArchivedStatus:", error);
      return [];
    }
  };
  
  const getChapterActivity = (teacherActivityData, chapterId) => {
    if (teacherActivityData.Items.length === 0) return null;
  
    const activity = teacherActivityData.Items[0].chapter_data.filter(
      (ce) => ce.chapter_id === chapterId
    );
  
    return activity.length > 0 ? activity[0] : null;
  };
  
  const getArchivedTopics = (chapterActivity, prePostType) => {
    if (!chapterActivity || !chapterActivity[prePostType]) return [];
  
    return chapterActivity[prePostType].archivedTopics || [];
  };

 exports.appendPreTopicsArchivedStatus2 = async (request, teacherActivityData, preTopicData, prePostType)=> {
  try {
    const chapterId = request.data.chapter_id;
    const chapterActivity = getChapterActivity(teacherActivityData, chapterId);
    const preArchivedTopics = getArchivedTopics(chapterActivity, prePostType);

    console.log("preTopicData - ",preTopicData);
    const newPreTopic = preTopicData.map((preTop) => ({
      ...preTop,
      isArchived: preArchivedTopics.includes(preTop.topic_id) ? "Yes" : "No",
    }));

    return newPreTopic;
  } catch (error) {
    console.error("Error in appendPreTopicsArchivedStatus:", error);
    return [];
  }
};

