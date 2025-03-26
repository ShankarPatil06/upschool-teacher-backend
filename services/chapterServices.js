const { chapterRepository, topicRepository, teacherRepository, schoolRepository, quizRepository, teachingActivityRepository } = require("../repository")
const { messages, prePostConstans, common } = require("../constants/constant");
const { isEmptyArray } = require("../helper/helper");

exports.fetchTopicsBasedonChapterNew = async (request) => {
  if (!request?.data?.client_class_id || !request.data.section_id || !request.data.subject_id || !request.data.teacher_id || !request.data.chapter_id) {
    return { status: 400, message: messages.INVALID_REQUEST };
  }

  const individualTeacherRes = await teacherRepository.fetchTeacherByID2(request);

  let teacher_info = individualTeacherRes.Items[0].teacher_info.filter((e) =>
    e.client_class_id == request.data.client_class_id &&
    e.section_id == request.data.section_id &&
    e.subject_id == request.data.subject_id
  );

  if (isEmptyArray(teacher_info) === 0) {
    return { status: 400, message: messages.SUBJECT_ISNOT_ALLOCATE_TO_TEACHER };
  }

  const teacher_activity_details_res = await teachingActivityRepository.fetchTeachingActivity2(request);
  const single_chapter_response = await chapterRepository.fetchChapterByID2(request);

  if (isEmptyArray(single_chapter_response)) {
    return { status: 400, message: messages.CHAPTER_COMBO_DOESNT_EXISTS };
  }
  const pre_topic_response = await topicRepository.fetchPreTopicData2(single_chapter_response.Items[0]);

  const post_topic_response = await topicRepository.fetchPostTopicData2(single_chapter_response.Items[0]);

  const finalPreTopicData = pre_topic_response.Items === undefined ? await exports.appendPreTopicsArchivedStatus2(request, teacher_activity_details_res, pre_topic_response, prePostConstans.preLearning) : await exports.appendPreTopicsArchivedStatus2(request, teacher_activity_details_res, pre_topic_response.Items, prePostConstans.preLearning)
  const finalPostTopicData = post_topic_response.Items === undefined ? await exports.appendPostTopicsArchivedStatus2(request, teacher_activity_details_res, post_topic_response, prePostConstans.postLearning) : await exports.appendPostTopicsArchivedStatus2(request, teacher_activity_details_res, post_topic_response.Items, prePostConstans.postLearning)

  request.data.learningType = prePostConstans.preLearningVal;
  const quizData_res = await quizRepository.fetchQuizData2(request);

  request.data.school_id = individualTeacherRes.Items[0].school_id;
  const SchoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

  let response = {
    preLearning: {
      topic_archive: SchoolDataRes.Items[0].pre_quiz_config ? SchoolDataRes.Items[0].pre_quiz_config.topic_archive : common.NA,
      quizExist: !isEmptyArray(quizData_res.Items) ? common.Yes : common.No,
      digicard_locked: common.Yes
    },
    postLearning: {
      topic_archive: SchoolDataRes.Items[0].post_quiz_config ? SchoolDataRes.Items[0].post_quiz_config.topic_archive : common.NA,
      choose_topic: SchoolDataRes.Items[0].post_quiz_config ? SchoolDataRes.Items[0].post_quiz_config.choose_topic : common.NA,
      digicard_locked: common.Yes
    },
    pre_topic_items: finalPreTopicData,
    post_topic_items: finalPostTopicData
  };

  if (!isEmptyArray(teacher_activity_details_res.Items) && !isEmptyArray(teacher_activity_details_res.Items[0].chapter_data)) {
    let chapter_activity = teacher_activity_details_res.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id);

    if (!isEmptyArray(chapter_activity)) {
      response.preLearning.digicard_locked = (chapter_activity[0].pre_learning.unlocked_digicard?.topics !== undefined) ? common.No : common.Yes;
      response.postLearning.digicard_locked = (!isEmptyArray(chapter_activity[0].post_learning.unlocked_digicard)) ? common.No : common.Yes;

      if (response.postLearning.choose_topic === common.Yes && !isEmptyArray(chapter_activity[0].post_learning.unlocked_digicard)) {
        let topics = chapter_activity[0].post_learning.unlocked_digicard.map(e => [...e.topics]);
        finalPostTopicData.map(e => topics.some(a => a.topic_id === e.topic_id) ? e.topic_locked = common.No : e.topic_locked = common.Yes);
      } else {
        finalPostTopicData.map(e => e.topic_locked = common.Yes);
      }
      response.post_topic_items = finalPostTopicData;
    }
  }
  return response;
};

exports.appendPreTopicsArchivedStatus4 = async (request, teacherActivityData, preTopicData, prePostType) => {
  let newPreTopic = [];
  if (!isEmptyArray(teacherActivityData.Items)) {
    let chapterActivity = teacherActivityData.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id);

    if (!isEmptyArray(chapterActivity)) {
      let preArchivedTopics = chapterActivity[0][prePostType]?.archivedTopics || [];

      newPreTopic = preTopicData.Items.map(preTop => {
        preTop.isArchived = preArchivedTopics.includes(preTop.topic_id)
          ? common.Yes
          : common.No;
        return preTop;
      });
    } else {
      newPreTopic = preTopicData.Items.map(preTop => {
        preTop.isArchived = common.No;
        return preTop;
      });
    }
  } else {
    newPreTopic = preTopicData.Items.map(preTop => {
      preTop.isArchived = common.No;
      return preTop;
    });
  }

  return newPreTopic;
};

exports.appendPostTopicsArchivedStatus3 = async function (request, teacherActivityData, postTopicData, prePostType) {
  let newPostTopic = [];

  if (!isEmptyArray(teacherActivityData.Items)) {
    let chapterActivity = teacherActivityData.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id);

    if (!isEmptyArray(chapterActivity)) {
      let preArchivedTopics = chapterActivity[0][prePostType]?.archivedTopics || [];

      if (!isEmptyArray(preArchivedTopics)) {
        newPostTopic = postTopicData.Items.map(postTop => {
          postTop.isArchived = preArchivedTopics.includes(postTop.topic_id)
            ? common.Yes
            : common.No;
          return postTop;
        });
      } else {
        newPostTopic = postTopicData.Items.map(postTop => {
          postTop.isArchived = common.No;
          return postTop;
        });
      }
    } else {
      newPostTopic = postTopicData.Items.map(postTop => {
        postTop.isArchived = common.No;
        return postTop;
      });
    }
  } else {
    newPostTopic = postTopicData.Items.map(postTop => {
      postTop.isArchived = common.No;
      return postTop;
    });
  }

  return newPostTopic;
};

exports.appendPostTopicsArchivedStatus2 = async (request, teacherActivityData, postTopicData, prePostType) => {
  const chapterId = request.data.chapter_id;
  const chapterActivity = getChapterActivity2(teacherActivityData, chapterId);
  const preArchivedTopics = getArchivedTopics2(chapterActivity, prePostType);

  const newPostTopic = postTopicData.map(postTop => ({
    ...postTop,
    isArchived: preArchivedTopics.includes(postTop.topic_id) ? common.Yes : common.No,
  }));

  return newPostTopic;
};

const getChapterActivity2 = (teacherActivityData, chapterId) => {
  if (isEmptyArray(teacherActivityData.Items)) return null;
  return teacherActivityData.Items[0].chapter_data.find(ce => ce.chapter_id === chapterId) || null;
};

const getArchivedTopics2 = (chapterActivity, prePostType) => chapterActivity && chapterActivity[prePostType] ? chapterActivity[prePostType].archivedTopics || [] : [];

const getChapterActivity = (teacherActivityData, chapterId) => {
  if (isEmptyArray(teacherActivityData.Items)) return null;

  const activity = teacherActivityData.Items[0].chapter_data.filter(
    (ce) => ce.chapter_id === chapterId
  );

  return !isEmptyArray(activity) ? activity[0] : null;
};

const getArchivedTopics = (chapterActivity, prePostType) => {
  if (!chapterActivity || !chapterActivity[prePostType]) return [];
  return chapterActivity[prePostType].archivedTopics || [];
};

exports.appendPreTopicsArchivedStatus2 = async (request, teacherActivityData, preTopicData, prePostType) => {
  try {
    const chapterId = request.data.chapter_id;
    const chapterActivity = getChapterActivity(teacherActivityData, chapterId);
    const preArchivedTopics = getArchivedTopics(chapterActivity, prePostType);

    const newPreTopic = preTopicData.map((preTop) => ({
      ...preTop,
      isArchived: preArchivedTopics.includes(preTop.topic_id) ? common.Yes : common.No,
    }));

    return newPreTopic;
  } catch (error) {
    return [];
  }
};