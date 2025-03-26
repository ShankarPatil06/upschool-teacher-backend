const dynamoDbCon = require("../awsConfig");
const questionServices = require("./questionServices");
const { digicardExtension, userRepository, chapterRepository, topicRepository, subjectRepository, teacherRepository, schoolRepository, unitRepository, quizRepository, conceptRepository, digicardRepository, settingsRepository, groupRepository, teachingActivityRepository } = require("../repository")
const { common, commonConditionValue, contentType, mailSubject, messages, prePostConstans, signedUrlConstants, requestData } = require("../constants/constant");
const { assignNumberofQuestions, checkOneArrayElementsinAnother, formatErrorResponse, getDifferenceValueFromTwoArray, getQuestionTrackForAutomatic, getRandomGroups, getRandomQuestionsFromGroups, getRandomString, isEmptyArray, PutObjectS3SigneUdrl, removeDuplicates, removeDuplicatesFromArrayOfObj, sortOneArrayBasedonAnother, splitGroups, shuffleArray } = require("../helper/helper");
const qs = require("qs");
const axios = require("axios");
let sendMail = require("./emailService");

exports.getTeacherClasses = async (request) => {
  const individual_teacher_response = await teacherRepository.fetchTeacherByID2(request)
  request.data[requestData.schoolId] = individual_teacher_response?.Items[0]?.school_id;
  const schoolDetails = await schoolRepository.getSchoolDetailsById2(request)
  if (schoolDetails.Items[0].school_logo && schoolDetails.Items[0].school_logo !== "" && schoolDetails.Items[0].school_logo !== common.NA && schoolDetails.Items[0].school_logo.includes(signedUrlConstants.uploads)) {
    let Key = schoolDetails.Items[0].school_logo;
    let s3Params = {
      Bucket: process.env.BUCKET_NAME,
      Key,
    }
    let uploadURL = await dynamoDbCon.s3.getSignedUrlPromise(requestData.getObject, s3Params)
    schoolDetails.Items[0].school_logoURL = uploadURL;
  }
  const client_class_id = individual_teacher_response.Items[0].teacher_section_allocation.map((val) => ({ client_class_id: val.client_class_id }));
  const teacherResponse = await teacherRepository.fetchTeacherClientClassData2({ items: client_class_id, condition: common.OR })
  const teacherResponse2 = { ...teacherResponse, logo: schoolDetails.Items[0]?.school_labelling === common.Upschool ? false : schoolDetails.Items[0]?.school_logoURL }
  return teacherResponse2;
};

exports.getTeacherSectionsBasedonClass = async (request) => {
  const individual_teacher_response = await teacherRepository.fetchTeacherByID2(request)
  let section_ids = (individual_teacher_response.Items[0].teacher_section_allocation.filter((e) => e.client_class_id == request.data.client_class_id)).map(({ section_id }) => ({ section_id }));

  return await teacherRepository.fetchTeacherSectionData2({ items: section_ids, condition: common.OR })
};

exports.getTeacherSubjectsBasedonSection = async (request) => {
  const individual_teacher_response = await teacherRepository.fetchTeacherByID2(request)
  let subject_ids = individual_teacher_response.Items[0].teacher_info.filter((e) => e.client_class_id == request.data.client_class_id && e.section_id == request.data.section_id && e.info_status === common.Active).map(({ subject_id }) => ({ subject_id }));

  return await teacherRepository.fetchTeacherSubjectData2({ items: subject_ids, condition: common.OR })
};

exports.archiveAndActivateTopicInChapter = async (request) => {
  const preOrPost = request.data.learningType === prePostConstans.preLearningVal ? prePostConstans.preLearning : request.data.learningType === prePostConstans.postLearningVal ? prePostConstans.postLearning : common.NA;
  if (preOrPost === common.NA) {
    throw formatErrorResponse(messages.INVALID_DATA, 400);
  }

  try {
    const teachActivityResponse = await teachingActivityRepository.fetchTeachingActivity2(request);
    let allChapter = teachActivityResponse.Items.length > 0 ? teachActivityResponse.Items[0].chapter_data : [];

    let chapterIndex = allChapter.findIndex(Chap => Chap.chapter_id === request.data.chapter_id);

    if (chapterIndex >= 0) {
      if (request.data.isArchived === common.Yes) {
        allChapter[chapterIndex][preOrPost].archivedTopics.push(request.data.topic_id);
      } else {
        let archIndex = allChapter[chapterIndex][preOrPost].archivedTopics.findIndex(arTop => arTop === request.data.topic_id);
        if (archIndex >= 0) {
          allChapter[chapterIndex][preOrPost].archivedTopics.splice(archIndex, 1);
        }
      }
      allChapter[chapterIndex][preOrPost].archivedTopics = removeDuplicates(allChapter[chapterIndex][preOrPost].archivedTopics);
    } else {
      const newChapterData = {
        chapter_id: request.data.chapter_id,
        chapter_locked: common.Yes,
        pre_learning: {
          unlocked_digicard: {},
          archivedTopics: request.data.learningType === prePostConstans.preLearningVal ? [request.data.topic_id] : []
        },
        post_learning: {
          unlocked_digicard: [],
          archivedTopics: request.data.learningType === prePostConstans.postLearningVal ? [request.data.topic_id] : []
        }
      };
      allChapter.push(newChapterData);
    }

    request.data.activity_id = teachActivityResponse.Items.length > 0 ? teachActivityResponse.Items[0].activity_id : undefined;
    request.data.chapter_data = allChapter;

    if (teachActivityResponse.Items.length > 0) {
      await teachingActivityRepository.updateTeachingActivity2(request);
    } else {
      request.data.digicard_activities = [];
      await teachingActivityRepository.addTeachingActivity2(request);
    }
    return { status: 200 };
  } catch (error) {
    console.error(error);
    throw new Error(`Error processing topic archive/activation: ${error.message}`);
  }
};

exports.getTeacherPreLearningPermissions = async (request) => {
  try {
    const teacherDataResponse = await teacherRepository.fetchTeacherByID2(request);
    request.data.school_id = teacherDataResponse.Items[0].school_id;

    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
    if (!schoolDataRes.Items[0].pre_quiz_config) {
      throw new Error(messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG);
    }

    const preQuizConfig = schoolDataRes.Items[0].pre_quiz_config;
    const teachActivityResponse = await teachingActivityRepository.fetchTeachingActivity2(request);
    const chapterActivity = teachActivityResponse.Items.length > 0
      ? teachActivityResponse.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id)
      : [];
    const unlockDigicards = chapterActivity.length > 0 ? chapterActivity[0].pre_learning.unlocked_digicard : {};
    const unlockTopicDigicard = unlockDigicards.topics || [];

    request.data.learningType = prePostConstans.preLearningVal;
    const quizDataRes = await quizRepository.fetchQuizData2(request);
    if (quizDataRes.Items.length > 0) {
      throw new Error(messages.PRE_QUIZ_ALREADY_GENERATED);
    }

    if (preQuizConfig.unlock_digicard_mandatory === common.Yes && unlockTopicDigicard.length <= 0) {
      throw new Error(messages.DIGICARD_UNLOCK_MANDATORY);
    }

    const response = {
      preLearning: {
        quizModes: [],
        quizType: [],
        quizVarient: [],
        concept_mandatory: preQuizConfig.concept_mandatory,
        min_qn_at_topic_level: preQuizConfig.min_qn_at_topic_level,
        min_qn_at_chapter_level: preQuizConfig.min_qn_at_chapter_level,
      }
    };

    const preQuizType = [
      preQuizConfig.automated_type === common.Enabled ? prePostConstans.automatedType : common.NA,
      preQuizConfig.express_type === common.Enabled ? prePostConstans.expressType : common.NA,
      preQuizConfig.manual_type === common.Enabled ? prePostConstans.manualType : common.NA
    ].filter(type => type !== common.NA);

    const preQuizMode = [
      preQuizConfig.offline_mode === common.Enabled ? prePostConstans.offlineMode : common.NA,
      preQuizConfig.online_mode === common.Enabled ? prePostConstans.onlineMode : common.NA
    ].filter(mode => mode !== common.NA);

    const preQuizVarient = [
      preQuizConfig.randomized_order_varient === common.Enabled ? prePostConstans.randomOrder : common.NA,
      preQuizConfig.randomized_questions_varient === common.Enabled ? prePostConstans.randomQuestion : common.NA
    ].filter(varient => varient !== common.NA);

    response.preLearning.quizModes = preQuizMode;
    response.preLearning.quizType = preQuizType;
    response.preLearning.quizVarient = preQuizVarient;

    return response;

  } catch (error) {
    throw error;
  }
};

exports.generateQuizForPreLearning = async (request) => {
  try {
    const quizDataRes = await quizRepository.fetchQuizData2(request);

    if (!isEmptyArray(quizDataRes.Items)) {
      throw new Error(messages.PRE_QUIZ_ALREADY_GENERATED);
    }

    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

    if (schoolDataRes.Items[0].pre_quiz_config) {
      request.data.pre_post_quiz_config = schoolDataRes.Items[0].pre_quiz_config;
      request.data.quiz_id = getRandomString();
      request.data.quiz_duration = 0;

      if (request.data.quizType === prePostConstans.automatedType) {

        const teachActivityRes = await teachingActivityRepository.fetchTeachingActivity2(request);

        let chapterActivity = teachActivityRes.Items.length > 0
          ? teachActivityRes.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id)
          : [];

        let archivedTopics = chapterActivity.length > 0 ? chapterActivity[0].pre_learning.archivedTopics : [];

        const chapterDataRes = await chapterRepository.fetchChapterByID2(request);

        let preLearningTopicIds = chapterDataRes.Items.length > 0
          ? chapterDataRes.Items[0].prelearning_topic_id
          : [];

        let activeTopics = await getDifferenceValueFromTwoArray(preLearningTopicIds, archivedTopics);

        if (activeTopics.length === 0) {
          return { status: 400, message: messages.NO_ACTIVE_TOPICS };
        }

        let selectedTopics = activeTopics.map(topicId => ({
          topic_id: topicId,
          noOfQuestions: common.NA
        }));

        request.data.selectedTopics = selectedTopics;
        request.data.activeTopics = activeTopics;

        const add_quiz_basedon_varient_response = await this.addAutomatedQuizBasedonVarient(request);

        if (add_quiz_basedon_varient_response === 200) {
          if (request.data.quizMode === prePostConstans.offlineMode || request.data.quizMode === prePostConstans.onlineMode) {
            await exports.sendMailtoTeacher2(request);
            return await exports.createPDFandUpdateTemplateDetails2(request);
          } else {
            throw new Error(messages.INVALID_QUIZ_MODE);
          }
        } else {
          throw new Error(add_quiz_basedon_varient_response);
        }
      } else {
        let selectedTopics = request.data.selectedTopics.map((topicDetails) => topicDetails.topic_id);
        const fetch_topics_response = await topicRepository.fetchTopicConceptIDData2({ topic_array: selectedTopics });

        let topic_concept_id = [];
        fetch_topics_response.Items.forEach((e) => topic_concept_id.push(...e.topic_concept_id));
        const fetch_concepts_response = await conceptRepository.fetchConceptData3({ topic_concept_id });

        if (request.data.quizType === prePostConstans.expressType) {
          // Express : 
          const add_express_quiz_basedon_varient_response = await exports.addExpressQuizBasedonVarient(request, fetch_topics_response.Items, fetch_concepts_response);
          if (add_express_quiz_basedon_varient_response === 200) {
            if (request.data.quizMode === prePostConstans.offlineMode || request.data.quizMode === prePostConstans.onlineMode) {
              await exports.sendMailtoTeacher2(request);
              return await exports.createPDFandUpdateTemplateDetails2(request);
            } else {
              throw new Error(messages.INVALID_QUIZ_MODE);
            }
          } else {
            throw new Error(add_express_quiz_basedon_varient_response);
          }
        } else if (request.data.quizType === prePostConstans.manualType) {
          // Manual : 
          try {
            const addQuizResponse = await exports.addManualQuizBasedonVarient(request, fetch_topics_response.Items, fetch_concepts_response);
            if (addQuizResponse !== 200) {
              throw new Error(addQuizResponse);
            }

            if (request.data.quizMode === prePostConstans.offlineMode || request.data.quizMode === prePostConstans.onlineMode) {
              await exports.sendMailtoTeacher2(request);
              return await exports.createPDFandUpdateTemplateDetails2(request);
            }
            throw new Error(messages.INVALID_QUIZ_MODE);
          } catch (error) {
            throw error;
          }
        }
      }
    } else {
      return { status: 400, message: messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG };
    }
  } catch (quizDataErr) {
    throw quizDataErr;
  }
}

exports.addAutomatedQuizBasedonVarient = async (request) => {
  try {
    const fetchTopicsResponse = await topicRepository.fetchTopicConceptIDData2({ topic_array: request.data.activeTopics });
    let topicConceptIds = fetchTopicsResponse.Items.flatMap(e => e.topic_concept_id);
    const fetchConceptsResponse = await conceptRepository.fetchConceptData3({ topic_concept_id: topicConceptIds });

    let basicGroups = [];
    let intermediateGroups = [];
    let advancedGroups = [];

    fetchConceptsResponse.forEach(e => {
      basicGroups.push(...e.concept_group_id.basic);
      intermediateGroups.push(...e.concept_group_id.intermediate);
      advancedGroups.push(...e.concept_group_id.advanced);
    });

    basicGroups = await questionServices.processGroups(basicGroups);
    intermediateGroups = await questionServices.processGroups(intermediateGroups);
    advancedGroups = await questionServices.processGroups(advancedGroups);

    const matrix_count_response = await questionServices.calculateCountUsingMatrix2(
      basicGroups,
      intermediateGroups,
      advancedGroups,
      request.data.pre_post_quiz_config
    );

    basicGroups = basicGroups.slice(0, Number(matrix_count_response.basic_count));
    intermediateGroups = intermediateGroups.slice(0, Number(matrix_count_response.intermediate_count));
    advancedGroups = advancedGroups.slice(0, Number(matrix_count_response.advance_count));

    let final_group_ids = [...basicGroups, ...intermediateGroups, ...advancedGroups];
    request.data.quiz_question_details = {};

    const group_response = await groupRepository.fetchGroupsData2({ group_array: final_group_ids });

    let quiz_duration = 0;
    let randomDupCheck = [];
    request.data.question_track_details = {};
    let non_considered_topic_data = {};

    request.data.selectedTopics.forEach((topic) => {
      non_considered_topic_data[topic.topic_id] = true;
    });

    if (request.data.varient === prePostConstans.randomQuestion) {
      let questions_list = [];
      let group_list = [];
      let dupcheck = [];

      const getRandomGroups = async () => {
        while (group_list.length < Number(request.data.noOfQuestionsForAuto)) {
          const randomIndex = Math.floor(Math.random() * group_response.length);
          if (!dupcheck.includes(randomIndex)) {
            let randomGroup = group_response[randomIndex];
            group_list.push(randomGroup);
            dupcheck.push(randomIndex);
          }
        }
      };

      await getRandomGroups();
      group_list.forEach((Grp) => (quiz_duration += Number(Grp.question_duration || 1)));
      request.data.quiz_duration += quiz_duration;

      const qtnLoop = async (ind) => {
        if (ind < group_list.length) {
          let availableQuestions = [...group_list[ind].group_question_id];
          if (randomDupCheck.length < Number(request.data.noOfQuestionsForAuto)) {
            const randomIndex = Math.floor(Math.random() * availableQuestions.length);
            let qtn_id = availableQuestions[randomIndex];

            if (!randomDupCheck.includes(qtn_id)) {
              questions_list.push(qtn_id);
              randomDupCheck.push(qtn_id);
            }

            await qtnLoop(ind + 1);
          } else {
            throw new Error(messages.INSUFFICIENT_QUESTIONS);
          }
        } else {
          let { res_questionTrackData, res_non_considered_topic_data } = await getQuestionTrackForAutomatic(
            request.data.selectedTopics,
            fetchTopicsResponse.Items,
            fetchConceptsResponse,
            questions_list,
            non_considered_topic_data,
            group_list
          );

          non_considered_topic_data = res_non_considered_topic_data;
          res_questionTrackData = await removeDuplicatesFromArrayOfObj(res_questionTrackData, requestData.questionId);

          request.data.question_track_details = {
            qp_set_a: res_questionTrackData,
            qp_set_b: res_questionTrackData,
            qp_set_c: res_questionTrackData,
          };

          request.data.quiz_question_details = {
            qp_set_a: await shuffleArray(questions_list),
            qp_set_b: await shuffleArray(questions_list),
            qp_set_c: await shuffleArray(questions_list),
          };

          request.data.not_considered_topics = Object.keys(non_considered_topic_data).filter(
            (key) => non_considered_topic_data[key]
          );

          await quizRepository.addQuiz2(request);
          return 200;
        }
      };
      await qtnLoop(0);
      return 200;
    } else if (request.data.varient === prePostConstans.randomQuestion) {
      try {
        const data = await getRandomGroups(group_response, request.data.noOfQuestionsForAuto, quiz_duration);
        request.data.quiz_duration = request.data.quiz_duration ? request.data.quiz_duration += data.quiz_duration : data.quiz_duration;

        const splitSetQuestions = async (setIndex) => {
          if (setIndex > 3) {
            request.data.not_considered_topics = Object.keys(non_considered_topic_data).filter(
              (key) => non_considered_topic_data[key]
            );
            await quizRepository.addQuiz2(request);
            return 200;
          }

          let questions_list = [];
          randomDupCheck = [];

          for (const group of data.group_list) {
            if (randomDupCheck.length < Number(request.data.noOfQuestionsForAuto)) {
              const randomIndex = Math.floor(Math.random() * group.group_question_id.length);
              let qtn_id = group.group_question_id[randomIndex];

              if (!randomDupCheck.includes(qtn_id)) {
                questions_list.push(qtn_id);
                randomDupCheck.push(qtn_id);
              }
            } else {
              throw new Error(messages.INSUFFICIENT_QUESTIONS);
            }
          }

          let { res_questionTrackData, res_non_considered_topic_data } = await getQuestionTrackForAutomatic(
            request.data.selectedTopics,
            fetchTopicsResponse.Items,
            fetchConceptsResponse,
            questions_list,
            non_considered_topic_data,
            data.group_list
          );

          res_questionTrackData = await removeDuplicatesFromArrayOfObj(res_questionTrackData, requestData.questionId);

          if (setIndex === 1) {
            request.data.quiz_question_details.qp_set_a = questions_list;
            request.data.question_track_details.qp_set_a = res_questionTrackData;
          } else if (setIndex === 2) {
            request.data.quiz_question_details.qp_set_b = questions_list;
            request.data.question_track_details.qp_set_b = res_questionTrackData;
          } else if (setIndex === 3) {
            request.data.quiz_question_details.qp_set_c = questions_list;
            request.data.question_track_details.qp_set_c = res_questionTrackData;
          }

          non_considered_topic_data = res_non_considered_topic_data;
          await splitSetQuestions(setIndex + 1);
        };
        await splitSetQuestions(1);
      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    }
  } catch (error) {
    throw error;
  }
}

exports.addExpressQuizBasedonVarient = async (request, topic_response, concepts_response) => {

  let randomOrderQuestions = [];
  let setAQuestions = [];
  let setBQuestions = [];
  let setCQuestions = [];

  let randomDupCheck = [];
  let setADupCheck = [];
  let setBDupCheck = [];
  let setCDupCheck = [];
  let quiz_duration = 0;

  let questionTrackData = [];
  let setAQuestionTrackData = [];
  let setBQuestionTrackData = [];
  let setCQuestionTrackData = [];

  topic_response = await assignNumberofQuestions(topic_response, request.data.selectedTopics, contentType.topics);

  let non_considered_topic_data = {};
  request.data.question_track_details = {};

  request.data.selectedTopics.forEach((topic) => {
    non_considered_topic_data[topic.topic_id] = true
  });

  async function topicLoop(topicIndex) {
    if (topicIndex < topic_response.length) {

      let topicData = topic_response[topicIndex];

      let splitGroup = await splitGroups(topicData, concepts_response);

      let basic_groups = splitGroup.basic_groups;
      let intermediate_groups = splitGroup.intermediate_groups;
      let advanced_groups = splitGroup.advanced_groups;

      basic_groups = await questionServices.processGroups(basic_groups);
      intermediate_groups = await questionServices.processGroups(intermediate_groups);
      advanced_groups = await questionServices.processGroups(advanced_groups);

      const matrix_response = await questionServices.calculateCountUsingMatrix2(
        basic_groups,
        intermediate_groups,
        advanced_groups,
        request.data.pre_post_quiz_config
      );

      basic_groups = basic_groups.slice(0, Number(matrix_response.basic_count));
      intermediate_groups = intermediate_groups.slice(0, Number(matrix_response.intermediate_count));
      advanced_groups = advanced_groups.slice(0, Number(matrix_response.advance_count));

      let final_group_ids = [];
      final_group_ids.push(...basic_groups, ...intermediate_groups, ...advanced_groups);

      request.data.quiz_question_details = {};
      const group_response = await groupRepository.fetchGroupsData2({ group_array: final_group_ids });

      if (request.data.varient === prePostConstans.randomQuestion) {

        await getRandomQuestionsFromGroups(group_response, topicData.noOfQuestions, randomDupCheck, quiz_duration).then((data) => {

          if (data === messages.INSUFFICIENT_QUESTIONS) {
            return { status: 200, data: messages.INSUFFICIENT_QUESTIONS };
          } else {
            randomOrderQuestions.push(...data.questions_list);
            randomDupCheck = data.randomDupCheck;
            request.data.quiz_duration += data.quiz_duration || 0;

            let { res_topic, res_non_considered_topic_data } = getQuestionTrackForExpress(topicData, topic_response, concepts_response, data.questions_list, non_considered_topic_data, data.group_list);

            non_considered_topic_data = res_non_considered_topic_data;
            questionTrackData.push(...res_topic);

            topicIndex++;
            topicLoop(topicIndex);
          }
        }).catch(function (err) {
          console.log(err);
          throw new Error(err);
        })
      } else if (request.data.varient === prePostConstans.randomQuestion) {

        await getRandomGroups(group_response, topicData.noOfQuestions, quiz_duration).then(async (data) => {
          request.data.quiz_duration += data.quiz_duration || 0;

          // Create 3 Sets of Question Paper : 
          async function splitSetQuestions(setIndex) {
            if (setIndex < 4) {

              let indheck = [];
              let questions_list = [];

              function qtnLoop(ind) {
                if (ind < data.group_list.length) {

                  if (indheck.length < Number(topicData.noOfQuestions)) {
                    if (data.group_list[ind].group_question_id.length > 0) {

                      // Pick Random Questions out of each group : 
                      const randomIndex = Math.floor(Math.random() * data.group_list[ind].group_question_id.length);
                      let qtn_id = data.group_list[ind].group_question_id[randomIndex];
                      let dupCheck = setIndex === 1 ? setADupCheck.filter((id) => id === qtn_id) : setIndex === 2 ? setBDupCheck.filter((id) => id === qtn_id) : setCDupCheck.filter((id) => id === qtn_id);

                      !indheck.includes(randomIndex) && indheck.push(randomIndex);

                      if (dupCheck.length > 0) {
                        qtnLoop(ind);
                      } else {
                        questions_list.push(qtn_id);
                        if (setIndex === 1) {
                          setADupCheck.push(qtn_id)
                        } else if (setIndex === 2) {
                          setBDupCheck.push(qtn_id)
                        } else if (setIndex === 3) {
                          setCDupCheck.push(qtn_id)
                        }

                        ind++;
                        qtnLoop(ind);
                      }
                    } else {
                      ind++;
                      qtnLoop(ind)
                    }
                  } else {
                    return { status: 200, data: messages.INSUFFICIENT_QUESTIONS };
                  }
                } else {
                  // getting Question tracking per each topic : 
                  let { res_topic, res_non_considered_topic_data } = getQuestionTrackForExpress(topicData, topic_response, concepts_response, questions_list, non_considered_topic_data, data.group_list);
                  non_considered_topic_data = res_non_considered_topic_data;

                  if (setIndex === 1) {
                    setAQuestions.push(...questions_list);
                    setAQuestionTrackData.push(...res_topic);
                  }
                  if (setIndex === 2) {
                    setBQuestions.push(...questions_list);
                    setBQuestionTrackData.push(...res_topic);
                  }
                  if (setIndex === 3) {
                    setCQuestions.push(...questions_list);
                    setCQuestionTrackData.push(...res_topic);
                  }

                  setIndex++;
                  splitSetQuestions(setIndex);
                }
              };
              qtnLoop(0);

            } else {
              topicIndex++;
              topicLoop(topicIndex);
            }
          }
          await splitSetQuestions(1);
        })
          .catch(function (err) {
            throw new Error(err);
          })
      }
    } else {
      if (request.data.varient === prePostConstans.randomQuestion) {

        questionTrackData = await removeDuplicatesFromArrayOfObj(questionTrackData, requestData.questionId);

        // // Formatting Topic-Concept-Group-Question level DS 
        request.data.question_track_details.qp_set_a = questionTrackData
        request.data.question_track_details.qp_set_b = questionTrackData
        request.data.question_track_details.qp_set_c = questionTrackData

        request.data.quiz_question_details.qp_set_a = await shuffleArray(randomOrderQuestions);
        request.data.quiz_question_details.qp_set_b = await shuffleArray(randomOrderQuestions);
        request.data.quiz_question_details.qp_set_c = await shuffleArray(randomOrderQuestions);

        // add Non considered topics to DB : 
        request.data.not_considered_topics = [];
        for (var i in non_considered_topic_data) {
          non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
        };

        // Add Quiz : 
        try {
          await quizRepository.addQuiz2(request);
          return 200;
        } catch (addQuizErr) {
          throw new Error(addQuizErr);
        }
      } else if (request.data.varient === prePostConstans.randomQuestion) {

        // get Questions track based on Set of Diff. questions 
        request.data.question_track_details.qp_set_a = await removeDuplicatesFromArrayOfObj(setAQuestionTrackData, requestData.questionId);
        request.data.question_track_details.qp_set_b = await removeDuplicatesFromArrayOfObj(setBQuestionTrackData, requestData.questionId);
        request.data.question_track_details.qp_set_c = await removeDuplicatesFromArrayOfObj(setCQuestionTrackData, requestData.questionId);

        request.data.quiz_question_details.qp_set_a = setAQuestions;
        request.data.quiz_question_details.qp_set_b = setBQuestions;
        request.data.quiz_question_details.qp_set_c = setCQuestions;

        // Add Non considered topics to DB : 
        request.data.not_considered_topics = [];
        for (var i in non_considered_topic_data) {
          non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
        };

        try {
          await quizRepository.addQuiz2(request);
          return 200;
        } catch (addQuizErr) {
          throw new Error(addQuizErr);
        }
      }
    }
  }
  await topicLoop(0);
  return 200;
}

exports.addManualQuizBasedonVarient = async (request, topic_response, concepts_response) => {
  let randomOrderQuestions = [];
  let setAQuestions = [];
  let setBQuestions = [];
  let setCQuestions = [];

  let randomDupCheck = [];
  let setADupCheck = [];
  let setBDupCheck = [];
  let setCDupCheck = [];
  let quiz_duration = 0;

  let questionTrackData = [];
  let setAQuestionTrackData = [];
  let setBQuestionTrackData = [];
  let setCQuestionTrackData = [];

  concepts_response = await assignNumberofQuestions(concepts_response, request.data.selectedTopics, contentType.concepts);

  let non_considered_topic_data = {};
  request.data.question_track_details = {};

  request.data.selectedTopics.forEach((topic) => {
    non_considered_topic_data[topic.topic_id] = true
  });

  async function topicLoop(topicIndex) {
    if (topicIndex < topic_response.length) {

      async function conceptLoop(conceptIndex) {

        if (conceptIndex < request.data.selectedTopics[topicIndex].selectedConcepts.length) {

          let conceptId = request.data.selectedTopics[topicIndex].selectedConcepts[conceptIndex].concept_id;
          let conceptData = await concepts_response.filter((concept) => concept.concept_id === conceptId);

          let basic_groups = conceptData[0].concept_group_id.basic;
          let intermediate_groups = conceptData[0].concept_group_id.intermediate;
          let advanced_groups = conceptData[0].concept_group_id.advanced;

          // basic_groups = removeDuplicates(basic_groups);
          // intermediate_groups = removeDuplicates(intermediate_groups);
          // advanced_groups = removeDuplicates(advanced_groups);

          basic_groups = await questionServices.processGroups(basic_groups);
          intermediate_groups = await questionServices.processGroups(intermediate_groups);
          advanced_groups = await questionServices.processGroups(advanced_groups);

          const matrix_response = await questionServices.calculateCountUsingMatrix2(basic_groups, intermediate_groups, advanced_groups, request.data.pre_post_quiz_config);

          basic_groups = basic_groups.slice(0, Number(matrix_response.basic_count));
          intermediate_groups = intermediate_groups.slice(0, Number(matrix_response.intermediate_count));
          advanced_groups = advanced_groups.slice(0, Number(matrix_response.advance_count));

          let final_group_ids = [];
          request.data.quiz_question_details = {};
          final_group_ids.push(...basic_groups, ...intermediate_groups, ...advanced_groups);

          const group_response = await groupRepository.fetchGroupsData2({ group_array: final_group_ids });

          if (request.data.varient === prePostConstans.randomQuestion) {

            await getRandomQuestionsFromGroups(group_response, conceptData[0].noOfQuestions, randomDupCheck, quiz_duration).then(async (data) => {

              if (data === messages.INSUFFICIENT_QUESTIONS) {
                throw new Error(messages.INSUFFICIENT_QUESTIONS);
              } else {
                randomOrderQuestions.push(...data.questions_list);
                randomDupCheck = data.randomDupCheck;
                request.data.quiz_duration += data.quiz_duration;

                // getting Question tracking per each topic : 
                let { res_concept, res_non_considered_topic_data } = await getQuestionTrackForManual(request.data.selectedTopics[topicIndex].topic_id, conceptData, data.questions_list, non_considered_topic_data, data.group_list);

                non_considered_topic_data = res_non_considered_topic_data;
                questionTrackData.push(...res_concept);

                conceptIndex++;
                conceptLoop(conceptIndex);
              }
            }).catch(function (err) {
              throw err;
            })
          } else if (request.data.varient === prePostConstans.randomQuestion) {

            await getRandomGroups(group_response, conceptData[0].noOfQuestions, quiz_duration).then(async (data) => {
              request.data.quiz_duration += data.quiz_duration || 0;

              // Create 3 Sets of Question Paper : 
              function splitSetQuestions(setIndex) {
                if (setIndex < 4) {

                  let indheck = [];
                  let questions_list = [];
                  async function qtnLoop(ind) {
                    if (ind < data.group_list.length) {

                      if (indheck.length < Number(conceptData[0].noOfQuestions)) { // data.group_list[ind].group_question_id.length
                        // Pick Random Questions out of each group : 
                        const randomIndex = Math.floor(Math.random() * data.group_list[ind].group_question_id.length);
                        let qtn_id = data.group_list[ind].group_question_id[randomIndex];
                        let dupCheck = setIndex === 1 ? setADupCheck.filter((id) => id === qtn_id) : setIndex === 2 ? setBDupCheck.filter((id) => id === qtn_id) : setCDupCheck.filter((id) => id === qtn_id);

                        !indheck.includes(randomIndex) && indheck.push(randomIndex);

                        if (dupCheck.length > 0) {
                          qtnLoop(ind);
                        } else {
                          questions_list.push(qtn_id);
                          if (setIndex === 1) {
                            setADupCheck.push(qtn_id)
                          } else if (setIndex === 2) {
                            setBDupCheck.push(qtn_id)
                          } else if (setIndex === 3) {
                            setCDupCheck.push(qtn_id)
                          }
                          ind++;
                          qtnLoop(ind);
                        }
                      } else {
                        throw new Error(messages.INSUFFICIENT_QUESTIONS);
                      }
                    } else {

                      // getting Question tracking per each topic : 
                      let { res_concept, res_non_considered_topic_data } = await getQuestionTrackForManual(request.data.selectedTopics[topicIndex].topic_id, conceptData, questions_list, non_considered_topic_data, data.group_list);

                      non_considered_topic_data = res_non_considered_topic_data;
                      if (setIndex === 1) {
                        setAQuestions.push(...questions_list);
                        setAQuestionTrackData.push(...res_concept)
                      };
                      if (setIndex === 2) {
                        setBQuestions.push(...questions_list);
                        setBQuestionTrackData.push(...res_concept)
                      };
                      if (setIndex === 3) {
                        setCQuestions.push(...questions_list);
                        setCQuestionTrackData.push(...res_concept)
                      };
                      setIndex++;
                      splitSetQuestions(setIndex);
                    }
                  };
                  qtnLoop(0);
                } else {
                  conceptIndex++;
                  conceptLoop(conceptIndex);
                }
              }
              await splitSetQuestions(1);
            }).catch(function (err) {
              throw err;
            })
          }
        } else {
          topicIndex++;
          topicLoop(topicIndex);
        }
      }
      conceptLoop(0);
    } else {
      // After Topic Loop is Over : 
      if (request.data.varient === prePostConstans.randomQuestion) {

        questionTrackData = await removeDuplicatesFromArrayOfObj(questionTrackData, requestData.questionId);

        // // // Formatting Topic-Concept-Group-Question level DS 
        request.data.question_track_details.qp_set_a = questionTrackData
        request.data.question_track_details.qp_set_b = questionTrackData
        request.data.question_track_details.qp_set_c = questionTrackData

        request.data.quiz_question_details.qp_set_a = await shuffleArray(randomOrderQuestions);
        request.data.quiz_question_details.qp_set_b = await shuffleArray(randomOrderQuestions);
        request.data.quiz_question_details.qp_set_c = await shuffleArray(randomOrderQuestions);

        // add Non considered topics to DB : 
        request.data.not_considered_topics = [];
        for (var i in non_considered_topic_data) {
          non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
        };

        // Add Quiz : 
        await quizRepository.addQuiz2(request);
        return 200;
      } else if (request.data.varient === prePostConstans.randomQuestion) {

        // // get Questions track based on Set of Diff. questions 
        request.data.question_track_details.qp_set_a = await removeDuplicatesFromArrayOfObj(setAQuestionTrackData, requestData.questionId);
        request.data.question_track_details.qp_set_b = await removeDuplicatesFromArrayOfObj(setBQuestionTrackData, requestData.questionId);;
        request.data.question_track_details.qp_set_c = await removeDuplicatesFromArrayOfObj(setCQuestionTrackData, requestData.questionId);;

        request.data.quiz_question_details.qp_set_a = setAQuestions;
        request.data.quiz_question_details.qp_set_b = setBQuestions;
        request.data.quiz_question_details.qp_set_c = setCQuestions;

        // add Non considered topics to DB : 
        request.data.not_considered_topics = [];
        for (var i in non_considered_topic_data) {
          non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
        };

        // Add Quiz : 
        await quizRepository.addQuiz2(request);
        return 200;
      }
    }
  }
  await topicLoop(0);
  return 200;
}

exports.generateQuizForPostLearning = async (request) => {
  try {
    const postQuizData_res = await quizRepository.fetchQuizData2(request);

    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
    if (schoolDataRes.Items[0].post_quiz_config) {
      let postQuizConfig = schoolDataRes.Items[0].post_quiz_config;
      if (postQuizData_res.Items.length > 0 && postQuizConfig.choose_topic === common.No) {
        throw new Error(messages.POST_QUIZ_ALREADY_GENERATED);
      }
      else {
        request.data.pre_post_quiz_config = postQuizConfig;
        request.data.quiz_id = getRandomString();
        request.data.quiz_duration = 0;

        if (request.data.quizType === prePostConstans.automatedType) {
          let selectedTop = [];
          if (request.data.topicList.length > 0) {
            await request.data.topicList.map(reqTop => {
              selectedTop.push({ topic_id: reqTop, noOfQuestions: common.NA });
            })

            request.data.selectedTopics = selectedTop;
            request.data.AcitveTopics = request.data.topicList;

            const add_quiz_basedon_varient_response = await exports.addAutomatedQuizBasedonVarient(request);

            if (add_quiz_basedon_varient_response === 200) {
              if (request.data.quizMode === prePostConstans.offlineMode || request.data.quizMode === prePostConstans.onlineMode) {
                await exports.sendMailtoTeacher2(request);
                return await exports.createPDFandUpdateTemplateDetails2(request);
              } else {
                throw new Error(messages.INVALID_QUIZ_MODE);
              }
            } else {
              throw new Error(add_quiz_basedon_varient_response);
            }
          } else {
            try {
              const teachActivity_response = await teachingActivityRepository.fetchTeachingActivity2(request);

              let chapterActivity = teachActivity_response.Items.length > 0 ? teachActivity_response.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id) : [];
              let archivedTopics = chapterActivity.length > 0 ? chapterActivity[0].post_learning.archivedTopics : [];

              /** FETCH CHAPTER DATA **/
              const chapterData_response = await chapterRepository.fetchChapterByID2(request);
              let postLearningTopicIds = chapterData_response.Items.length > 0 ? chapterData_response.Items[0].postlearning_topic_id : [];
              let AcitveTopics = await getDifferenceValueFromTwoArray(postLearningTopicIds, archivedTopics);

              if (AcitveTopics.length > 0) {
                await AcitveTopics.forEach(actTop => {
                  selectedTop.push({ topic_id: actTop, noOfQuestions: common.NA });
                })

                request.data.selectedTopics = selectedTop;
                request.data.AcitveTopics = AcitveTopics;

                const add_quiz_basedon_varient_response = await exports.addAutomatedQuizBasedonVarient(request);

                if (add_quiz_basedon_varient_response === 200) {
                  if (request.data.quizMode === prePostConstans.offlineMode || request.data.quizMode === prePostConstans.onlineMode) {
                    await exports.sendMailtoTeacher2(request);
                    return await exports.createPDFandUpdateTemplateDetails2(request);
                  } else {
                    throw new Error(messages.INVALID_QUIZ_MODE);
                  }
                } else {
                  throw new Error(add_quiz_basedon_varient_response);
                }
              }
              else {
                throw new Error(messages.NO_ACTIVE_TOPICS);
              }
            } catch (error) {
              throw error;
            }
          }
        } else {
          let selectedTopics = request.data.selectedTopics.map((topicDetails) => topicDetails.topic_id);

          try {
            const fetch_topics_response = await topicRepository.fetchTopicConceptIDData2({ topic_array: selectedTopics });
            let topicConceptIds = [];
            fetch_topics_response.Items.forEach(e => topicConceptIds.push(...e.topic_concept_id));
            const fetch_concepts_response = await conceptRepository.fetchConceptData3({ topic_concept_id: topicConceptIds });

            if (request.data.quizType === prePostConstans.expressType) {
              // Express : 
              const add_express_quiz_basedon_varient_response = await exports.addExpressQuizBasedonVarient(request, fetch_topics_response.Items, fetch_concepts_response);
              if (add_express_quiz_basedon_varient_response === 200) {
                if (request.data.quizMode === prePostConstans.offlineMode || request.data.quizMode === prePostConstans.onlineMode) {
                  await exports.sendMailtoTeacher2(request);
                  return await exports.createPDFandUpdateTemplateDetails2(request);
                } else {
                  throw new Error(messages.INVALID_QUIZ_MODE);
                }
              } else {
                throw new Error(add_express_quiz_basedon_varient_response);
              }
            } else if (request.data.quizType === prePostConstans.manualType) {
              // Manual : 
              try {
                const addQuizResponse = await exports.addManualQuizBasedonVarient(request, fetch_topics_response.Items, fetch_concepts_response);
                if (addQuizResponse !== 200) {
                  throw new Error(addQuizResponse);
                }
                if (request.data.quizMode === prePostConstans.offlineMode || request.data.quizMode === prePostConstans.onlineMode) {
                  await exports.sendMailtoTeacher2(request);
                  return await exports.createPDFandUpdateTemplateDetails2(request);
                }
                throw new Error(messages.INVALID_QUIZ_MODE);
              } catch (error) {
                throw error;
              }
            }
          } catch (error) {
            throw error;
          }
        }
      }
    } else {
      throw new Error(messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG);
    }
  } catch (error) {
    throw error;
  }
}

exports.addteacherDigicardExtension = async (request) => {
  try {
    const digiExtensionResponse = await digicardExtension.getExtensionDetails2(request);
    let digiExtension = JSON.parse(JSON.stringify(request.data.extensions));
    let finalResponse = [];

    for (let i = 0; i < digiExtension.length; i++) {
      let extFile = digiExtension[i].ext_file;

      if (!(JSON.stringify(extFile).includes(signedUrlConstants.digicardExtension)) && extFile && extFile !== common.NA) {
        let extFilesS3 = await PutObjectS3SigneUdrl(extFile, contentType.digiCardExtension);

        request.data.extensions[i].ext_file = extFilesS3.Key;
        finalResponse.push({ file_name: extFile, s3Url: extFilesS3.uploadURL });
      }
    }

    if (digiExtensionResponse.Items.length > 0) {
      request.data.extension_id = digiExtensionResponse.Items[0].extension_id;
      await digicardExtension.updateDigiExtension2(request);
    } else {
      await digicardExtension.addDigiExtension2(request);
    }
    return finalResponse;
  } catch (error) {
    throw new Error(`Failed to handle digicard extension: ${error.message}`);
  }
};

exports.getTeacherPostLearningPermissions = async (request) => {

  try {
    if (!request?.data || !request.data.client_class_id || !request.data.section_id || !request.data.subject_id || !request.data.chapter_id || !request.data.school_id || !request.data.topics) {
      throw { status: 400, message: messages.INVALID_REQUEST_FORMAT };
    }

    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

    if (!schoolDataRes.Items || schoolDataRes.Items.length === 0) {
      throw { status: 400, message: messages.SCHOOL_NOT_FOUND };
    }

    if (schoolDataRes.Items[0].post_quiz_config) {
      let postQuizConfig = schoolDataRes.Items[0].post_quiz_config;

      const teachActivity_response = await teachingActivityRepository.fetchTeachingActivity2(request);

      let requestTopics = request.data.topics.map((e) => e.topic_id);
      let chapterActivity = teachActivity_response.Items.length > 0 ? await teachActivity_response.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id) : [];

      let archivedTopics = chapterActivity.length > 0 ? chapterActivity[0].post_learning.archivedTopics : [];
      let unlockDigicards = chapterActivity.length > 0 ? chapterActivity[0].post_learning.unlocked_digicard : [];

      let unlockTopicDigicard = unlockDigicards.length > 0 ? unlockDigicards : [];
      let UnlockedTopicIDs = [];
      await unlockTopicDigicard.map((e) => UnlockedTopicIDs.push(...e.topics.map((j) => j.topic_id)));
      request.data.learningType = prePostConstans.postLearningVal;

      const quizData_res = await quizRepository.fetchQuizData2(request);

      if (postQuizConfig.choose_topic === common.Yes) {

        let quizGenerated = common.No;

        await quizData_res.Items.length > 0 && quizData_res.Items.forEach((e) => {
          e.selectedTopics.length > 0 && e.selectedTopics.forEach((a) =>
            requestTopics.filter((k) => k === a.topic_id).length > 0 && (quizGenerated = common.Yes))
        })
        if (quizData_res.Items.length > 0 && quizGenerated === common.Yes) {
          throw new Error(messages.POST_QUIZ_ALREADY_GENERATED);
        } else {
          if (requestTopics.length === 0) {
            console.log(messages.NO_TOPICS_SELECTED);
            return { status: 400, message: messages.NO_TOPICS_SELECTED };
          }
          if (postQuizConfig.unlock_digicard_mandatory === common.Yes) {
            const unlockAllTopicsCheck = await checkOneArrayElementsinAnother(requestTopics, UnlockedTopicIDs);
            if (!unlockAllTopicsCheck) {
              return { status: 400, message: messages.DIDNT_UNLOCK_DIGICARD };
            }
          } else if (postQuizConfig.unlock_digicard_mandatory !== common.No) {
            return { status: 400, message: messages.DIDNT_SET_CONFIG };
          }

          const generateResponse = await exports.generateResponse(postQuizConfig);
          return { status: 200, data: generateResponse };
        }
      } else if (postQuizConfig.choose_topic === common.No) {

        // if request.data.topics is [], fetch all post topics and removed archived topics 
        // check digicads are unlocked for those topics or not if its mandatory
        // check quiz table, if the there is data, throw error, that quiz already generated 
        if (quizData_res.Items.length === 0) {

          const singleChapterResponse = await chapterRepository.fetchChapterByID2(request);

          if (!singleChapterResponse.Items || singleChapterResponse.Items.length === 0) {
            return { status: 400, message: messages.CHAPTER_NOT_FOUND };
          }

          const post_topic_response = await topicRepository.fetchPostTopicData2(singleChapterResponse.Items[0]);

          if (requestTopics.length === 0) {
            let topicIDs = post_topic_response.Items.map((e) => e.topic_id);

            let AcitveTopics = await getDifferenceValueFromTwoArray(topicIDs, archivedTopics);

            if (postQuizConfig.unlock_digicard_mandatory === common.Yes) {
              let unlockCheck = [];

              AcitveTopics.forEach((e) => UnlockedTopicIDs.filter((a) => e === a).length > 0 && unlockCheck.push(e));

              const unlockAllTopicsCheck = await checkOneArrayElementsinAnother(AcitveTopics, unlockCheck);

              if (unlockAllTopicsCheck) {
                return await exports.generateResponse(postQuizConfig);
              } else {
                throw new Error(messages.DIDNT_UNLOCK_DIGICARD);
              }
            } else if (postQuizConfig.unlock_digicard_mandatory === common.No) {
              return await exports.generateResponse(postQuizConfig);
            } else {
              throw new Error(messages.DIDNT_SET_CONFIG);
            }
          } else {
            let topicIDs = post_topic_response.Items.map((e) => e.topic_id);
            let AcitveTopics = await getDifferenceValueFromTwoArray(topicIDs, archivedTopics);
            const selectAllTopicsCheck = await checkOneArrayElementsinAnother(AcitveTopics, requestTopics);

            if (selectAllTopicsCheck === true) {
              return await exports.generateResponse(postQuizConfig);
            } else {
              throw new Error(messages.SELECT_ALL_TOPICS);
            }
          }
        } else {
          throw new Error(messages.POST_QUIZ_ALREADY_GENERATED);
        }
      }
    }
    else {
      throw new Error(messages.SCHOOL_DOESNT_HAVE_POSTQUIZ_CONFIG);
    }
  } catch (error) {
    throw error;
  }
}

exports.generateResponse = (postQuizConfig) => {

  let response = {
    postLearning: {
      quizModes: [],
      quizType: [],
      quizVarient: [],
    }
  }

  let preQuizMode = [];
  let preQuizType = [];
  let preQuizVarient = [];

  preQuizType.push(postQuizConfig.automated_type === common.Enabled ? prePostConstans.automatedType : common.NA);
  preQuizType.push(postQuizConfig.express_type === common.Enabled ? prePostConstans.expressType : common.NA);
  preQuizType.push(postQuizConfig.manual_type === common.Enabled ? prePostConstans.manualType : common.NA);

  preQuizMode.push(postQuizConfig.offline_mode === common.Enabled ? prePostConstans.offlineMode : common.NA);
  preQuizMode.push(postQuizConfig.online_mode === common.Enabled ? prePostConstans.onlineMode : common.NA);

  preQuizVarient.push(postQuizConfig.randomized_order_varient === common.Enabled ? prePostConstans.randomOrder : common.NA);
  preQuizVarient.push(postQuizConfig.randomized_questions_varient === common.Enabled ? prePostConstans.randomQuestion : common.NA);

  response.postLearning.quizModes = preQuizMode.filter(qMode => qMode !== common.NA);
  response.postLearning.quizType = preQuizType.filter(qType => qType !== common.NA);
  response.postLearning.quizVarient = preQuizVarient.filter(qVar => qVar !== common.NA);

  response.postLearning.concept_mandatory = postQuizConfig.concept_mandatory;
  response.postLearning.min_qn_at_topic_level = postQuizConfig.min_qn_at_topic_level;
  response.postLearning.min_qn_at_chapter_level = postQuizConfig.min_qn_at_chapter_level;

  return response;
}
exports.changeDigiCardOrder = async (request) => {
  if (!request || !request.data || !request.data.client_class_id || !request.data.section_id || !request.data.subject_id || !request.data.chapter_id) {
    throw new Error(messages.INVALID_REQUEST_FORMAT);
  }
  try {
    const teachActivity_response = await teachingActivityRepository.fetchTeachingActivity2(request);
    const digicard_activity_data = await exports.createDigicardActivityData2(request);

    const allDigicardActivity = teachActivity_response.Items[0]?.digicard_activities || [];
    const digicardActivity = allDigicardActivity.filter(ce => ce.chapter_id === request.data.chapter_id);

    let PrePOstActivity = digicardActivity.length > 0 ? (request.data.learningType === common.Pre ? [...digicardActivity[0].pre_learning] : [...digicardActivity[0].post_learning]) : [];
    let reordered_data = {
      topic_id: request.data.topic_id,
      digicardOrder: request.data.digicardOrder,
      archivedDigicard: []
    };

    if (PrePOstActivity.length > 0) {
      const existingTopicIndex = PrePOstActivity.findIndex(e => e.topic_id === request.data.topic_id);
      if (existingTopicIndex > -1) {
        reordered_data.archivedDigicard = PrePOstActivity[existingTopicIndex].archivedDigicard;
        PrePOstActivity[existingTopicIndex] = reordered_data;
      } else {
        PrePOstActivity.push(reordered_data);
      }
    } else {
      PrePOstActivity.push(reordered_data);
    }

    if (digicardActivity.length > 0) {
      request.data.learningType === common.Pre ? digicardActivity[0].pre_learning = PrePOstActivity : digicardActivity[0].post_learning = PrePOstActivity;
      allDigicardActivity.forEach((e, i) => e.chapter_id === request.data.chapter_id && (allDigicardActivity[i] = digicardActivity[0]));
      request.data.digicard_activities = allDigicardActivity;
    } else {
      allDigicardActivity.push(digicard_activity_data);
      request.data.digicard_activities = allDigicardActivity;
    }

    request.data.activity_id = teachActivity_response.Items[0].activity_id;

    await teachingActivityRepository.updateTeachingDigiCardActivity2(request);
    return messages.DIGICARD_ORDER_CHANGED;
  } catch (error) {
    throw new Error(error.message || messages.ERROR);
  }
};

exports.createDigicardActivityData2 = async (request) => {
  if (!request || !request.data || !request.data.chapter_id || !request.data.topic_id) {
    throw new Error(messages.INVALID_REQUEST_FORMAT);
  }

  let individual_digicard_activity = {
    chapter_id: request.data.chapter_id,
    pre_learning: [],
    post_learning: []
  };

  const learningData = {
    topic_id: request.data.topic_id,
    digicardOrder: request.data.key === commonConditionValue.toggle ? [] : request.data.digicardOrder,
    archivedDigicard: request.data.key === commonConditionValue.toggle ? request.data.digi_card_id : []
  };

  if (request.data.learningType === common.Pre) {
    individual_digicard_activity.pre_learning.push(learningData);
  } else if (request.data.learningType === common.Post) {
    individual_digicard_activity.post_learning.push(learningData);
  } else {
    throw new Error(messages.INVALID_REQUEST_FORMAT);
  }

  return individual_digicard_activity;
};

exports.activeAndArchiveDigicardsInTopic = async (request) => {
  if (!request?.data?.client_class_id || !request?.data?.section_id || !request?.data?.subject_id || !request?.data?.chapter_id || !request?.data?.action) {
    throw formatErrorResponse(400, messages.INVALID_REQUEST_FORMAT);
  }

  if (request.data.action !== commonConditionValue.active && request.data.action !== common.delete) {
    throw formatErrorResponse(400, messages.INVALID_REQUEST_FORMAT);
  }

  try {
    const teachActivityResponse = await teachingActivityRepository.fetchTeachingActivity2(request);
    request.data.key = commonConditionValue.toggle;

    const digicardActivityData = await exports.createDigicardActivityData2(request);
    let allDigicardActivity = teachActivityResponse.Items.length > 0 ? teachActivityResponse.Items[0].digicard_activities || [] : [];
    let digicardActivity = allDigicardActivity.filter(ce => ce.chapter_id === request.data.chapter_id);

    let archivedData = { topic_id: request.data.topic_id, digicardOrder: [], archivedDigicard: [] };
    let prePostActivity = request.data.learningType === common.Pre ? digicardActivity[0]?.pre_learning || [] : digicardActivity[0]?.post_learning || [];

    if (prePostActivity.some(e => e.topic_id === request.data.topic_id)) {
      prePostActivity = prePostActivity.map((e) => {
        if (e.topic_id === request.data.topic_id) {
          archivedData.digicardOrder = e.digicardOrder;
          if (request.data.action === common.delete) {
            e.archivedDigicard.push(...request.data.digi_card_id);
          } else {
            const digiCardList = new Set(request.data.digi_card_id);
            e.archivedDigicard = e.archivedDigicard.filter(d => !digiCardList.has(d));
          }
          archivedData.archivedDigicard = e.archivedDigicard;
          return archivedData;
        }
        return e;
      });
    } else {
      archivedData.archivedDigicard.push(...request.data.digi_card_id);
      prePostActivity.push(archivedData);
    }

    if (request.data.learningType === common.Pre) {
      digicardActivity[0][prePostConstans.preLearning] = prePostActivity;
    } else {
      digicardActivity[0][prePostConstans.postLearning] = prePostActivity;
    }

    if (digicardActivity.length > 0) {
      allDigicardActivity = allDigicardActivity.map(e => e.chapter_id === request.data.chapter_id ? digicardActivity[0] : e);
      request.data.digicard_activities = allDigicardActivity;
      request.data.activity_id = teachActivityResponse.Items[0].activity_id;

      await teachingActivityRepository.updateTeachingDigiCardActivity2(request);
    } else {
      allDigicardActivity.push(digicardActivityData);
      request.data.digicard_activities = allDigicardActivity;
      request.data.activity_id = teachActivityResponse.Items[0].activity_id;

      await teachingActivityRepository.updateTeachingDigiCardActivity2(request);
    }
    return request.data.action === common.delete ? messages.DIGICARD_DELETED_IN_TOPIC : messages.DIGICARD_ACTIVATED_IN_TOPIC;
  } catch (error) {
    throw formatErrorResponse(error.statusCode || 500, error.message || messages.INTERNAL_SERVER_ERROR);
  }
};

exports.getDigiCardstoReorder = async (request) => {

  if (request === undefined || request.data === undefined || request.data.client_class_id === undefined || request.data.client_class_id === "" || request.data.section_id === undefined || request.data.section_id === "" || request.data.subject_id === undefined || request.data.subject_id === "" || request.data.chapter_id === undefined || request.data.chapter_id === "") {
    return { status: 400, message: messages.INVALID_REQUEST_FORMAT };
  } else {
    try {
      const teachActivity_response = await teachingActivityRepository.fetchTeachingActivity2(request);
      let changedDigiCardOrder = [];
      let archivedDigiCardList = [];

      let myPromise = new Promise(async function (myResolve, myReject) {

        if (teachActivity_response.Items.length > 0) {
          let allDigicardActivity = teachActivity_response.Items[0].digicard_activities;

          allDigicardActivity = allDigicardActivity === undefined ? [] : allDigicardActivity;
          let digicardActivity = await allDigicardActivity.filter(ce => ce.chapter_id === request.data.chapter_id);

          if (digicardActivity.length > 0) {
            let PrePOstActivity = request.data.learningType === common.Pre ? JSON.parse(JSON.stringify(digicardActivity[0].pre_learning)) : JSON.parse(JSON.stringify(digicardActivity[0].post_learning));
            PrePOstActivity = PrePOstActivity === undefined ? [] : PrePOstActivity;

            if (PrePOstActivity.length > 0) {
              if (PrePOstActivity.filter((e) => e.topic_id === request.data.topic_id).length > 0) {

                PrePOstActivity.forEach((e, i) => {
                  if (e.topic_id === request.data.topic_id) {
                    changedDigiCardOrder.push(...e.digicardOrder);
                    archivedDigiCardList.push(...e.archivedDigicard);
                  }
                });
                myResolve();
              } else {
                myResolve();
              }
            } else {
              myResolve();
            }
          } else {
            myResolve();
          }
        } else {
          myResolve();
        }
      });

      await myPromise.then(
        async function (value) {
          if (changedDigiCardOrder.length > 0) {
            if (archivedDigiCardList.length > 0) {
              let archivedDigiCardSet = new Set(archivedDigiCardList);
              let FinalDigiCardList = changedDigiCardOrder.filter((e) => { return !archivedDigiCardSet.has(e) });

              FinalDigiCardList = removeDuplicates(FinalDigiCardList);
              const get_digicard_res = await digicardRepository.fetchDigiCardDisplayTitleID2(FinalDigiCardList);
              get_digicard_res.Items = await sortOneArrayBasedonAnother(get_digicard_res.Items, FinalDigiCardList, messages.DIGI_CARD_ID);
              return get_digicard_res;
            } else {
              changedDigiCardOrder = removeDuplicates(changedDigiCardOrder);
              const get_digicard_res = await digicardRepository.fetchDigiCardDisplayTitleID2(FinalDigiCardList);
              get_digicard_res.Items = await sortOneArrayBasedonAnother(get_digicard_res.Items, changedDigiCardOrder, messages.DIGI_CARD_ID);
              return get_digicard_res;
            }
          } else {
            request.data.archivedDigiCardList = archivedDigiCardList.length > 0 ? archivedDigiCardList : [];
            const digicard_list_response = await getAllDigicardsBasedonTopic(request);
            return { status: 200, data: digicard_list_response };
          }
        }, (error) => {
          throw error;
        }
      );
    } catch (err) {
      throw err
    }
  }
}

exports.getAllDigicardsBasedonTopic = async (request) => {

  try {
    if (!request?.data?.topic_id) {
      return { status: 400, message: messages.INVALID_REQUEST };
    }

    const single_topic_response = await topicRepository.fetchTopicByID2(request);
    if (!single_topic_response?.Items?.length) {
      return { status: 404, message: messages.TOPIC_NOT_FOUND };
    }
    const topic_related_concept_response = await conceptRepository.fetchConceptData3(single_topic_response.Items[0]);
    if (!topic_related_concept_response?.Items?.length) {
      return { status: 404, message: messages.CONCEPTS_NOT_FOUND };
    }
    let concept_digicard_id = [];

    topic_related_concept_response.map((e) => { concept_digicard_id.push(...e.concept_digicard_id) });

    const get_digicard_res = await digicardRepository.fetchDigiCardDisplayTitleID2(concept_digicard_id);
    if (!get_digicard_res?.Items?.length) {
      return { status: 404, message: messages.DIGICARDS_NOT_FOUND };
    }

    const sorted_data_response = await exports.sortDigiCardsBasedonTopic(single_topic_response, topic_related_concept_response, get_digicard_res);
    let { archivedDigiCardList } = request.data;
    let response = {};

    if (archivedDigiCardList.length > 0) {
      let archivedDigiCardSet = new Set(archivedDigiCardList);
      response.Items = sorted_data_response.Items.filter((e) => !archivedDigiCardSet.has(e.digi_card_id));
    } else {
      response = sorted_data_response;
    }
    return { status: 200, data: response };
  } catch (err) {
    throw err;
  }
};

exports.sortDigiCardsBasedonTopic = async (topic_response, concept_response, digicard_response) => {

  let topic_concept_id = topic_response.Items[0].topic_concept_id;
  let finalDigiCardData = {
    Items: []
  };

  let sortedConceptData = await sortOneArrayBasedonAnother(concept_response, topic_concept_id, requestData.conceptId);

  let concept_digicard_id = [];

  await sortedConceptData.forEach(async (each_concept) => {
    concept_digicard_id.push(...each_concept.concept_digicard_id);
  });

  concept_digicard_id = await removeDuplicates(concept_digicard_id)

  let sortedDigiCardData = await sortOneArrayBasedonAnother(digicard_response.Items, concept_digicard_id, messages.DIGI_CARD_ID);
  finalDigiCardData.Items = sortedDigiCardData;

  return { status: 200, data: finalDigiCardData };
}

exports.getQuestionSourceandChapters = async (request) => {
  try {
    if (!request?.data?.subject_id) {
      return { status: 400, message: messages.INVALID_SUBJECT };
    }
    const source_res = await settingsRepository.getQuestionSources2(request);
    const response = { question_sources: source_res.Items };

    const subject_res = await subjectRepository.getSubjetById2(request);
    if (!subject_res?.Items?.length) {
      response.chapters = subject_res.Items;
      return { status: 200, data: response };
    }
    const subject_unit_id = subject_res.Items[0].subject_unit_id;
    const unit_res = await unitRepository.fetchUnitData2({ subject_unit_id });

    if (!unit_res?.Items?.length) {
      response.chapters = unit_res.Items;
      return { status: 200, data: response };
    }

    const unit_chapter_id = unit_res.Items.flatMap(e => e.unit_chapter_id);
    const chapter_res = await chapterRepository.fetchBulkChaptersIDName2({ unit_chapter_id });
    response.chapters = chapter_res.Items;
    return { status: 200, data: response };
  } catch (error) {
    return { status: error.status || 500, message: error.message || messages.INTERNAL_SERVER_ERROR };
  }
}

exports.createPDFandUpdateTemplateDetails2 = async (request) => {
  try {
    // Call API in EC2 Service and get Question and Answer Paper Paths
    const options = {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: qs.stringify(request),
      url: process.env.PDF_GENERATION_URL + "/createQuizQuestionAndAnswerPapers",
    };

    await axios(options);
    return 200;
  } catch (error) {
    throw error;
  }
};

exports.sendMailtoTeacher2 = async (request) => {
  try {
    const fetchTeacherEmailRes = await userRepository.fetchTeacherEmailById2(request);
    if (!fetchTeacherEmailRes.Items || fetchTeacherEmailRes.Items.length === 0) {
      throw new Error(messages.TEACHER_EMAIL_DOESNOT_EXISTS);
    }

    const mailPayload = {
      quiz_name: request.data.quiz_name,
      toMail: fetchTeacherEmailRes.Items[0].user_email,
      subject: mailSubject.quizGeneration,
      mailFor: common.quizGeneration,
    };

    const dataEmail = await sendMail.process(mailPayload);

    if (dataEmail.httpStatusCode === 200) {
      return messages.QUIZ_GENERATED;
    } else {
      throw new Error(messages.SNS_ERROR);
    }
  } catch (error) {
    throw error;
  }
};
