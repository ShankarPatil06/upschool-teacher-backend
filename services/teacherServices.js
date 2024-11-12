const dynamoDbCon = require('../awsConfig');
const questionServices = require("./questionServices");
const { digicardExtension, userRepository, chapterRepository, topicRepository, subjectRepository, teacherRepository, schoolRepository, unitRepository, quizRepository, conceptRepository, digicardRepository, settingsRepository, groupRepository, teachingActivityRepository } = require("../repository")
const constant = require("../constants/constant");
const helper = require("../helper/helper");
const qs = require('qs');
const axios = require('axios');
let sendMail = require("./emailService");

// const { callbackPromise } = require("nodemailer/lib/shared");

exports.getTeacherClasses = async (request) => {
  const individual_teacher_response = await teacherRepository.fetchTeacherByID2(request)
  const client_class_id = individual_teacher_response.Items[0].teacher_section_allocation.map((val) => ({ "client_class_id": val.client_class_id }));

  return await teacherRepository.fetchTeacherClientClassData2({ items: client_class_id, condition: "OR" })
};
exports.getTeacherSectionsBasedonClass = async (request) => {
  const individual_teacher_response = await teacherRepository.fetchTeacherByID2(request)
  let section_ids = (individual_teacher_response.Items[0].teacher_section_allocation.filter((e) => e.client_class_id == request.data.client_class_id)).map(({ section_id }) => ({ section_id }));

  return await teacherRepository.fetchTeacherSectionData2({ items: section_ids, condition: "OR" })
};
exports.getTeacherSubjectsBasedonSection = async (request) => {
  const individual_teacher_response = await teacherRepository.fetchTeacherByID2(request)
  let subject_ids = individual_teacher_response.Items[0].teacher_info.filter((e) => e.client_class_id == request.data.client_class_id && e.section_id == request.data.section_id && e.info_status === "Active").map(({ subject_id }) => ({ subject_id }));

  return await teacherRepository.fetchTeacherSubjectData2({ items: subject_ids, condition: "OR" })
};
exports.teacherSubjectandActivityCheck = function (request, callback) {
  /** FETCH USER BY EMAIL **/
  teacherRepository.fetchTeacherByID(request, async function (individual_teacher_err, individual_teacher_response) {
    if (individual_teacher_err) {
      console.log(individual_teacher_err);
      callback(individual_teacher_err, individual_teacher_response);
    } else {
      if (individual_teacher_response.Items.length === 0) {
        callback(400, constant.messages.TEACHER_DOESNOT_EXISTS);
      } else {

        let allocationCheck = individual_teacher_response.Items[0].teacher_info.filter((e) => e.client_class_id == request.data.client_class_id && e.section_id == request.data.section_id && e.info_status === "Active");
        if (allocationCheck.length > 0) {

          teacherRepository.fetchTeacherActivityDetails(request, async function (teacher_activity_details_err, teacher_activity_details_res) {
            if (teacher_activity_details_err) {
              console.log(teacher_activity_details_err);
              callback(teacher_activity_details_err, teacher_activity_details_res);
            } else {
              console.log(teacher_activity_details_res.Items);
              callback(200, teacher_activity_details_res.Items);
            }
          })
        } else {
          callback(400, constant.messages.SUBJECT_ISNOT_ALLOCATE_TO_TEACHER);
        }
      }
    }
  }
  );
};
exports.archiveAndActivateTopicInChapter = async (request) => {
  const preOrPost = request.data.learningType === constant.prePostConstans.preLearningVal ? constant.prePostConstans.preLearning : request.data.learningType === constant.prePostConstans.postLearningVal ? constant.prePostConstans.postLearning : "N.A.";
  if (preOrPost === "N.A.") {
    throw helper.formatErrorResponse(constant.messages.INVALID_DATA, 400);
  }

  try {
    const teachActivityResponse = await teachingActivityRepository.fetchTeachingActivity2(request);
    let allChapter = teachActivityResponse.Items.length > 0 ? teachActivityResponse.Items[0].chapter_data : [];

    let chapterIndex = allChapter.findIndex(Chap => Chap.chapter_id === request.data.chapter_id);

    if (chapterIndex >= 0) {
      if (request.data.isArchived === "Yes") {
        allChapter[chapterIndex][preOrPost].archivedTopics.push(request.data.topic_id);
      } else {
        let archIndex = allChapter[chapterIndex][preOrPost].archivedTopics.findIndex(arTop => arTop === request.data.topic_id);
        if (archIndex >= 0) {
          allChapter[chapterIndex][preOrPost].archivedTopics.splice(archIndex, 1);
        }
      }
      allChapter[chapterIndex][preOrPost].archivedTopics = helper.removeDuplicates(allChapter[chapterIndex][preOrPost].archivedTopics);
    } else {
      const newChapterData = {
        chapter_id: request.data.chapter_id,
        chapter_locked: "Yes",
        pre_learning: {
          unlocked_digicard: {},
          archivedTopics: request.data.learningType === constant.prePostConstans.preLearningVal ? [request.data.topic_id] : []
        },
        post_learning: {
          unlocked_digicard: [],
          archivedTopics: request.data.learningType === constant.prePostConstans.postLearningVal ? [request.data.topic_id] : []
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
          throw new Error(constant.messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG);
      }

      const preQuizConfig = schoolDataRes.Items[0].pre_quiz_config;
      const teachActivityResponse = await teachingActivityRepository.fetchTeachingActivity2(request);
      const chapterActivity = teachActivityResponse.Items.length > 0 
          ? teachActivityResponse.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id) 
          : [];
      const unlockDigicards = chapterActivity.length > 0 ? chapterActivity[0].pre_learning.unlocked_digicard : {};
      const unlockTopicDigicard = unlockDigicards.topics || [];

      request.data.learningType = constant.prePostConstans.preLearningVal;
      const quizDataRes = await quizRepository.fetchQuizData2(request);
      if (quizDataRes.Items.length > 0) {
          throw new Error(constant.messages.PRE_QUIZ_ALREADY_GENERATED);
      }

      if (preQuizConfig.unlock_digicard_mandatory === "Yes" && unlockTopicDigicard.length <= 0) {
          throw new Error(constant.messages.DIGICARD_UNLOCK_MANDATORY);
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
          preQuizConfig.automated_type === "Enabled" ? constant.prePostConstans.automatedType : "N.A.",
          preQuizConfig.express_type === "Enabled" ? constant.prePostConstans.expressType : "N.A.",
          preQuizConfig.manual_type === "Enabled" ? constant.prePostConstans.manualType : "N.A."
      ].filter(type => type !== "N.A.");

      const preQuizMode = [
          preQuizConfig.offline_mode === "Enabled" ? constant.prePostConstans.offlineMode : "N.A.",
          preQuizConfig.online_mode === "Enabled" ? constant.prePostConstans.onlineMode : "N.A."
      ].filter(mode => mode !== "N.A.");

      const preQuizVarient = [
          preQuizConfig.randomized_order_varient === "Enabled" ? constant.prePostConstans.randomOrder : "N.A.",
          preQuizConfig.randomized_questions_varient === "Enabled" ? constant.prePostConstans.randomQuestion : "N.A."
      ].filter(varient => varient !== "N.A.");

      response.preLearning.quizModes = preQuizMode;
      response.preLearning.quizType = preQuizType;
      response.preLearning.quizVarient = preQuizVarient;

      console.log("PERMISSIONS : ", JSON.stringify(response));
      return response;

  } catch (error) {
      console.error(error);
      throw error; // or handle the error as per your application's error handling strategy
  }
};

exports.generateQuizForPreLearning = (request, callback) => {
  /** CHECK PRE QUIZ EXIST **/
  quizRepository.fetchQuizData(request, async function (quizData_err, quizData_res) {
    if (quizData_err) {
      console.log(quizData_err);
      callback(quizData_err, quizData_res);
    }
    else {
      if (quizData_res.Items.length > 0) {
        // If Quiz Already Generated : 
        console.log(constant.messages.PRE_QUIZ_ALREADY_GENERATED);
        callback(400, constant.messages.PRE_QUIZ_ALREADY_GENERATED);
      }
      else {
        schoolRepository.getSchoolDetailsById(request, async (schoolDataErr, schoolDataRes) => {
          if (schoolDataErr) {
            console.log(schoolDataErr);
            callback(schoolDataErr, schoolDataRes);
          }
          else {
            if (schoolDataRes.Items[0].pre_quiz_config) {
              request.data.pre_post_quiz_config = schoolDataRes.Items[0].pre_quiz_config;
              request.data.quiz_id = helper.getRandomString();
              request.data.quiz_duration = 0;

              if (request.data.quizType === constant.prePostConstans.automatedType) {

                // Automatic : 
                /** FETCH TEACHING ACTIVITY **/
                teachingActivityRepository.fetchTeachingActivity(request, async function (teachActivity_err, teachActivity_response) {

                  if (teachActivity_err) {

                    console.log(teachActivity_err);
                    callback(teachActivity_err, teachActivity_response);
                  } else {

                    let chapterActivity = teachActivity_response.Items.length > 0 ? teachActivity_response.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id) : [];
                    let archivedTopics = chapterActivity.length > 0 ? chapterActivity[0].pre_learning.archivedTopics : [];

                    /** FETCH CHAPTER DATA **/
                    chapterRepository.fetchChapterByID(request, async function (chapterData_err, chapterData_response) {
                      if (chapterData_err) {
                        console.log(chapterData_err);
                        callback(chapterData_err, chapterData_response);
                      } else {
                        let preLearningTopicIds = chapterData_response.Items.length > 0 ? chapterData_response.Items[0].prelearning_topic_id : [];

                        let AcitveTopics = await helper.getDifferenceValueFromTwoArray(preLearningTopicIds, archivedTopics);

                        if (AcitveTopics.length > 0) {
                          let selectedTop = [];
                          await AcitveTopics.forEach(actTop => {
                            selectedTop.push({ topic_id: actTop, noOfQuestions: "N.A." });
                          })

                          request.data.selectedTopics = selectedTop;
                          request.data.AcitveTopics = AcitveTopics;

                          exports.addAutomatedQuizBasedonVarient(request, (add_quiz_basedon_varient_err, add_quiz_basedon_varient_response) => {
                            if (add_quiz_basedon_varient_err) {
                              callback(add_quiz_basedon_varient_err, add_quiz_basedon_varient_response);
                            } else {

                              if (add_quiz_basedon_varient_response === 200) {
                                if (request.data.quizMode === "offline") {

                                  exports.createPDFandUpdateTemplateDetails(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {

                                    if (create_pdf_and_update_details_err) {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else if (request.data.quizMode === "online") {

                                  exports.sendMailtoTeacher(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                                    if (create_pdf_and_update_details_err) {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else {
                                  callback(400, constant.messages.INVALID_QUIZ_MODE)
                                }

                              } else {
                                callback(400, add_quiz_basedon_varient_response);
                              }
                            }
                          })
                        }
                        else {
                          console.log(constant.messages.NO_ACTIVE_TOPICS);
                          callback(400, constant.messages.NO_ACTIVE_TOPICS);
                        }
                      }
                    })
                    /** END FETCH CHAPTER DATA **/
                  }
                })
                /** END FETCH TEACHING ACTIVITY **/
              }
              else {

                // Fetch Topics Response : 
                // Fetch related Concept Response : 
                // Fetch Related groups
                let selectedTopics = request.data.selectedTopics.map((topicDetails) => topicDetails.topic_id);
                topicRepository.fetchTopicConceptIDData({ topic_array: selectedTopics }, async function (fetch_topics_err, fetch_topics_response) {
                  if (fetch_topics_err) {
                    console.log(fetch_topics_err);
                    callback(fetch_topics_err, fetch_topics_response);
                  } else {
                    let topic_concept_id = [];
                    await fetch_topics_response.Items.forEach((e) => topic_concept_id.push(...e.topic_concept_id));

                    conceptRepository.fetchConceptData({ topic_concept_id: topic_concept_id }, async function (fetch_concepts_err, fetch_concepts_response) {
                      if (fetch_concepts_err) {
                        console.log(fetch_concepts_err);
                        callback(fetch_concepts_err, fetch_concepts_response);
                      } else {

                        if (request.data.quizType === constant.prePostConstans.expressType) {
                          // Express : 
                          exports.addExpressQuizBasedonVarient(request, fetch_topics_response.Items, fetch_concepts_response.Items, (add_express_quiz_basedon_varient_err, add_express_quiz_basedon_varient_response) => {
                            if (add_express_quiz_basedon_varient_err) {
                              callback(add_express_quiz_basedon_varient_err, add_express_quiz_basedon_varient_response);
                            } else {
                              // callback(add_express_quiz_basedon_varient_err, 200); 
                              if (add_express_quiz_basedon_varient_response === 200) {

                                if (request.data.quizMode === "offline") {

                                  exports.createPDFandUpdateTemplateDetails(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {

                                    if (create_pdf_and_update_details_err) {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else if (request.data.quizMode === "online") {

                                  exports.sendMailtoTeacher(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                                    if (create_pdf_and_update_details_err) {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else {
                                  callback(400, constant.messages.INVALID_QUIZ_MODE)
                                }

                              } else {
                                callback(400, add_express_quiz_basedon_varient_response);
                              }

                            }
                          })

                        } else if (request.data.quizType === constant.prePostConstans.manualType) {
                          // Manual : 
                          exports.addManualQuizBasedonVarient(request, fetch_topics_response.Items, fetch_concepts_response.Items, (add_express_quiz_basedon_varient_err, add_express_quiz_basedon_varient_response) => {
                            if (add_express_quiz_basedon_varient_err) {
                              callback(add_express_quiz_basedon_varient_err, add_express_quiz_basedon_varient_response);
                            } else {
                              if (add_express_quiz_basedon_varient_response === 200) {

                                if (request.data.quizMode === "offline") {

                                  exports.createPDFandUpdateTemplateDetails(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {

                                    if (create_pdf_and_update_details_err) {

                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else if (request.data.quizMode === "online") {

                                  exports.sendMailtoTeacher(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                                    if (create_pdf_and_update_details_err) {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else {
                                  callback(400, constant.messages.INVALID_QUIZ_MODE)
                                }

                              } else {
                                callback(400, add_express_quiz_basedon_varient_response);
                              }
                            }
                          })
                        }

                      }
                    })
                  }
                })

              }

            } else {
              console.log(constant.messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG);
              callback(400, constant.messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG);
            }

          }
        })
      }
    }
  })
  /** END CHECK PRE QUIZ EXIST **/
}
exports.addAutomatedQuizBasedonVarient = async (request, callback) => {

  topicRepository.fetchTopicConceptIDData({ topic_array: request.data.AcitveTopics }, async function (fetch_topics_err, fetch_topics_response) {
    if (fetch_topics_err) {
      console.log(fetch_topics_err);
      callback(fetch_topics_err, fetch_topics_response);
    } else {
      let topic_concept_id = [];
      fetch_topics_response.Items.forEach((e) => topic_concept_id.push(...e.topic_concept_id));

      conceptRepository.fetchConceptData({ topic_concept_id: topic_concept_id }, async function (fetch_concepts_err, fetch_concepts_response) {
        if (fetch_concepts_err) {
          console.log(fetch_concepts_err);
          callback(fetch_concepts_err, fetch_concepts_response);
        } else {

          let basic_groups = [];
          let intermediate_groups = [];
          let advanced_groups = [];
          // Filter Basic, Intermediate, Advanced Groups : 
          await fetch_concepts_response.Items.forEach((e) => {
            basic_groups.push(...e.concept_group_id.basic)
            intermediate_groups.push(...e.concept_group_id.intermediate)
            advanced_groups.push(...e.concept_group_id.advanced)
          });

          basic_groups = helper.removeDuplicates(basic_groups);
          intermediate_groups = helper.removeDuplicates(intermediate_groups);
          advanced_groups = helper.removeDuplicates(advanced_groups);

          questionServices.calculateCountUsingMatrix(basic_groups, intermediate_groups, advanced_groups, request.data.pre_post_quiz_config, async function (matrix_count_err, matrix_count_response) {
            if (matrix_count_err) {
              console.log(matrix_count_err);
              callback(matrix_count_err, matrix_count_response);
            } else {
              // Filtering Groups based on the matrix count : 
              basic_groups = basic_groups.slice(0, Number(matrix_count_response.basic_count));
              intermediate_groups = intermediate_groups.slice(0, Number(matrix_count_response.intermediate_count));
              advanced_groups = advanced_groups.slice(0, Number(matrix_count_response.advance_count));
              // Combine All Group ID's : 
              let final_group_ids = [];
              final_group_ids.push(...basic_groups, ...intermediate_groups, ...advanced_groups);
              request.data.quiz_question_details = {};

              await groupRepository.fetchGroupsData({ group_array: final_group_ids }, async function (group_err, group_response) {
                if (group_err) {
                  console.log(group_err);
                  callback(group_err, group_response);
                } else {
                  let quiz_duration = 0;

                  let randomDupCheck = [];
                  request.data.question_track_details = {};
                  // Declcare all topics as selected in an Obj 
                  let non_considered_topic_data = {};
                  request.data.selectedTopics.forEach((topic) => {
                    non_considered_topic_data[topic.topic_id] = true
                  });

                  if (request.data.varient === "randomOrder") {

                    let questions_list = [];
                    let group_list = [];
                    let dupcheck = [];

                    async function getRandomGroups(i) {
                      if (group_list.length < Number(request.data.noOfQuestionsForAuto)) {

                        const randomIndexforGroup = Math.floor(Math.random() * group_response.Items.length);

                        if (dupcheck.includes(randomIndexforGroup)) {
                          i++;
                          getRandomGroups(i);
                        } else {
                          let randomGroup = group_response.Items[randomIndexforGroup];
                          group_list.push(randomGroup);
                          dupcheck.push(randomIndexforGroup);
                          i++;
                          getRandomGroups(i);
                        }

                      } else {
                        // Final 
                        await group_list.forEach((Grp) => quiz_duration += Number(Grp.question_duration));
                        request.data.quiz_duration += quiz_duration;

                        let indheck = [];
                        async function qtnLoop(ind) {
                          if (ind < group_list.length) {

                            if (indheck.length < group_list[ind].group_question_id.length) {
                              // Pick Random Questions out of each group : 
                              const randomIndex = Math.floor(Math.random() * group_list[ind].group_question_id.length);
                              let qtn_id = group_list[ind].group_question_id[randomIndex];
                              let dupCheck = randomDupCheck.filter((id) => id === qtn_id);

                              !indheck.includes(randomIndex) && indheck.push(randomIndex);

                              if (dupCheck.length > 0) {
                                qtnLoop(ind);
                              } else {
                                questions_list.push(qtn_id);
                                randomDupCheck.push(qtn_id);
                                ind++;
                                qtnLoop(ind);
                              }
                            } else {
                              console.log(constant.messages.INSUFFICIENT_QUESTIONS);
                              callback(0, constant.messages.INSUFFICIENT_QUESTIONS)
                            }

                          } else {

                            // Formatting Topic-Concept-Group-Question level DS 
                            let { res_questionTrackData, res_non_considered_topic_data } = await helper.getQuestionTrackForAutomatic(request.data.selectedTopics, fetch_topics_response.Items, fetch_concepts_response.Items, questions_list, non_considered_topic_data, group_list);
                            non_considered_topic_data = res_non_considered_topic_data;

                            res_questionTrackData = await helper.removeDuplicatesFromArrayOfObj(res_questionTrackData, 'question_id');

                            request.data.question_track_details.qp_set_a = res_questionTrackData
                            request.data.question_track_details.qp_set_b = res_questionTrackData
                            request.data.question_track_details.qp_set_c = res_questionTrackData

                            // Create Shuffled Orders of same questions based on admin -  no of random order :
                            // Later Changed to Fixed 3 sets by Vishal :  
                            request.data.quiz_question_details.qp_set_a = await helper.shuffleArray(questions_list);
                            request.data.quiz_question_details.qp_set_b = await helper.shuffleArray(questions_list);
                            request.data.quiz_question_details.qp_set_c = await helper.shuffleArray(questions_list);

                            // add Non considered topics to DB : 
                            request.data.not_considered_topics = [];
                            for (var i in non_considered_topic_data) {
                              non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
                            };

                            quizRepository.addQuiz(request, async function (addQuiz_err, addQuiz_response) {
                              if (addQuiz_err) {
                                console.log(addQuiz_err);
                                callback(addQuiz_err, addQuiz_response);
                              } else {
                                console.log("QUIZ GENERATED!");
                                callback(0, 200);
                              }
                            })

                          }
                        };
                        qtnLoop(0);
                      }
                    }
                    getRandomGroups(0);

                  } else if (request.data.varient === "randomQuestions") {

                    await helper.getRandomGroups(group_response.Items, request.data.noOfQuestionsForAuto, quiz_duration).then(async (data) => {
                      request.data.quiz_duration += data.quiz_duration;
                      request.data.question_track_details = {};
                      // Declcare all topics as selected in an Obj 
                      let non_considered_topic_data = {};
                      request.data.selectedTopics.forEach((topic) => {
                        non_considered_topic_data[topic.topic_id] = true
                      });

                      // Create 3 Sets of Question Paper : 
                      async function splitSetQuestions(setIndex) {
                        if (setIndex < 4) {

                          let indheck = [];
                          let questions_list = [];
                          randomDupCheck = [];

                          async function qtnLoop(ind) {
                            if (ind < data.group_list.length) {

                              if (indheck.length < data.group_list[ind].group_question_id.length) {
                                // Pick Random Questions out of each group : 
                                const randomIndex = Math.floor(Math.random() * data.group_list[ind].group_question_id.length);
                                let qtn_id = data.group_list[ind].group_question_id[randomIndex];
                                let dupCheck = randomDupCheck.filter((id) => id === qtn_id);

                                !indheck.includes(randomIndex) && indheck.push(randomIndex);

                                if (dupCheck.length > 0) {
                                  qtnLoop(ind);
                                } else {
                                  questions_list.push(qtn_id);
                                  randomDupCheck.push(qtn_id)

                                  ind++;
                                  qtnLoop(ind);
                                }
                              } else {
                                console.log(constant.messages.INSUFFICIENT_QUESTIONS);
                                callback(0, constant.messages.INSUFFICIENT_QUESTIONS)
                              }
                            } else {

                              // Formatting Topic-Concept-Group-Question level DS 
                              let { res_questionTrackData, res_non_considered_topic_data } = await helper.getQuestionTrackForAutomatic(request.data.selectedTopics, fetch_topics_response.Items, fetch_concepts_response.Items, questions_list, non_considered_topic_data, data.group_list);

                              res_questionTrackData = await helper.removeDuplicatesFromArrayOfObj(res_questionTrackData, 'question_id');

                              setIndex === 1
                              request.data.quiz_question_details.qp_set_a = questions_list
                              request.data.question_track_details.qp_set_a = res_questionTrackData
                              setIndex === 2
                              request.data.quiz_question_details.qp_set_b = questions_list
                              request.data.question_track_details.qp_set_b = res_questionTrackData
                              setIndex === 3
                              request.data.quiz_question_details.qp_set_c = questions_list
                              request.data.question_track_details.qp_set_c = res_questionTrackData

                              non_considered_topic_data = res_non_considered_topic_data;

                              setIndex++;
                              splitSetQuestions(setIndex);
                            }
                          };
                          qtnLoop(0);

                        } else {
                          // add Non considered topics to DB : 
                          request.data.not_considered_topics = [];
                          for (var i in non_considered_topic_data) {
                            non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
                          };

                          // Add Quiz : 
                          quizRepository.addQuiz(request, async function (addQuiz_err, addQuiz_response) {
                            if (addQuiz_err) {
                              console.log(addQuiz_err);
                              callback(addQuiz_err, addQuiz_response);
                            } else {
                              console.log("QUIZ GENERATED!");
                              callback(0, 200);
                            }
                          })

                        }
                      }
                      await splitSetQuestions(1);
                    })
                      .catch(function (err) {
                        console.log(err);
                        callback(400, err);
                      })
                  }
                }
              });
            }
          })
        }
      })
    }
  })
}
exports.addExpressQuizBasedonVarient = async (request, topic_response, concepts_response, callback) => {

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

  topic_response = await helper.assignNumberofQuestions(topic_response, request.data.selectedTopics, "topics");

  // Declcare all topics as selected in an Obj 
  let non_considered_topic_data = {};
  request.data.question_track_details = {};

  request.data.selectedTopics.forEach((topic) => {
    non_considered_topic_data[topic.topic_id] = true
  });

  async function topicLoop(topicIndex) {
    if (topicIndex < topic_response.length) {

      let topicData = topic_response[topicIndex];

      let splitGroups = await helper.splitGroups(topicData, concepts_response);

      let basic_groups = splitGroups.basic_groups;
      let intermediate_groups = splitGroups.intermediate_groups;
      let advanced_groups = splitGroups.advanced_groups;

      basic_groups = helper.removeDuplicates(basic_groups);
      intermediate_groups = helper.removeDuplicates(intermediate_groups);
      advanced_groups = helper.removeDuplicates(advanced_groups);

      questionServices.calculateCountUsingMatrix(basic_groups, intermediate_groups, advanced_groups, request.data.pre_post_quiz_config, async (matrix_err, matrix_response) => {
        if (matrix_err) {
          callback(400, matrix_err);
        } else {

          basic_groups = basic_groups.slice(0, Number(matrix_response.basic_count));
          intermediate_groups = intermediate_groups.slice(0, Number(matrix_response.intermediate_count));
          advanced_groups = advanced_groups.slice(0, Number(matrix_response.advance_count));

          let final_group_ids = [];
          final_group_ids.push(...basic_groups, ...intermediate_groups, ...advanced_groups);

          request.data.quiz_question_details = {};

          await groupRepository.fetchGroupsData({ group_array: final_group_ids }, async function (group_err, group_response) {
            if (group_err) {
              console.log(group_err);
              callback(group_err, group_response);
            } else {

              if (request.data.varient === "randomOrder") {

                await helper.getRandomQuestionsFromGroups(group_response.Items, topicData.noOfQuestions, randomDupCheck, quiz_duration).then((data) => {

                  if (data === constant.messages.INSUFFICIENT_QUESTIONS) {
                    callback(0, constant.messages.INSUFFICIENT_QUESTIONS);
                  } else {
                    randomOrderQuestions.push(...data.questions_list);
                    randomDupCheck = data.randomDupCheck;
                    request.data.quiz_duration += data.quiz_duration;

                    // getting Question tracking per each topic : 
                    let { res_topic, res_non_considered_topic_data } = helper.getQuestionTrackForExpress(topicData, topic_response, concepts_response, data.questions_list, non_considered_topic_data, data.group_list);

                    non_considered_topic_data = res_non_considered_topic_data;
                    questionTrackData.push(...res_topic);

                    topicIndex++;
                    topicLoop(topicIndex);
                  }
                })
                  .catch(function (err) {
                    console.log(err);
                    callback(400, err);
                  })

              } else if (request.data.varient === "randomQuestions") {

                await helper.getRandomGroups(group_response.Items, topicData.noOfQuestions, quiz_duration).then(async (data) => {
                  request.data.quiz_duration += data.quiz_duration;

                  // Create 3 Sets of Question Paper : 
                  async function splitSetQuestions(setIndex) {
                    if (setIndex < 4) {

                      let indheck = [];
                      let questions_list = [];

                      function qtnLoop(ind) {
                        if (ind < data.group_list.length) {

                          if (indheck.length < data.group_list[ind].group_question_id.length) {
                            // Pick Random Questions out of each group : 
                            const randomIndex = Math.floor(Math.random() * data.group_list[ind].group_question_id.length);
                            let qtn_id = data.group_list[ind].group_question_id[randomIndex];
                            let dupCheck = setIndex === 1 ? setADupCheck.filter((id) => id === qtn_id) : setIndex === 2 ? setBDupCheck.filter((id) => id === qtn_id) : setCDupCheck.filter((id) => id === qtn_id);

                            !indheck.includes(randomIndex) && indheck.push(randomIndex);

                            if (dupCheck.length > 0) {
                              qtnLoop(ind);
                            } else {
                              questions_list.push(qtn_id);
                              setIndex === 1 && setADupCheck.push(qtn_id)
                              setIndex === 2 && setBDupCheck.push(qtn_id)
                              setIndex === 3 && setCDupCheck.push(qtn_id)

                              ind++;
                              qtnLoop(ind);
                            }
                          } else {
                            console.log(constant.messages.INSUFFICIENT_QUESTIONS);
                            callback(0, constant.messages.INSUFFICIENT_QUESTIONS)
                          }

                        } else {
                          // getting Question tracking per each topic : 
                          let { res_topic, res_non_considered_topic_data } = helper.getQuestionTrackForExpress(topicData, topic_response, concepts_response, questions_list, non_considered_topic_data, data.group_list);
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
                    console.log(err);
                    callback(400, err);
                  })
              }

            }
          })
        }
      });

    } else {
      // After Topic Loop is Over : 
      if (request.data.varient === "randomOrder") {

        questionTrackData = await helper.removeDuplicatesFromArrayOfObj(questionTrackData, 'question_id');

        // // Formatting Topic-Concept-Group-Question level DS 
        request.data.question_track_details.qp_set_a = questionTrackData
        request.data.question_track_details.qp_set_b = questionTrackData
        request.data.question_track_details.qp_set_c = questionTrackData

        request.data.quiz_question_details.qp_set_a = await helper.shuffleArray(randomOrderQuestions);
        request.data.quiz_question_details.qp_set_b = await helper.shuffleArray(randomOrderQuestions);
        request.data.quiz_question_details.qp_set_c = await helper.shuffleArray(randomOrderQuestions);

        // add Non considered topics to DB : 
        request.data.not_considered_topics = [];
        for (var i in non_considered_topic_data) {
          non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
        };

        // Add Quiz : 
        quizRepository.addQuiz(request, async function (addQuiz_err, addQuiz_response) {
          if (addQuiz_err) {
            console.log(addQuiz_err);
            callback(addQuiz_err, addQuiz_response);
          } else {
            console.log("QUIZ GENERATED!");
            callback(0, 200);
          }
        })
      } else if (request.data.varient === "randomQuestions") {

        // get Questions track based on Set of Diff. questions 
        request.data.question_track_details.qp_set_a = await helper.removeDuplicatesFromArrayOfObj(setAQuestionTrackData, 'question_id');
        request.data.question_track_details.qp_set_b = await helper.removeDuplicatesFromArrayOfObj(setBQuestionTrackData, 'question_id');
        request.data.question_track_details.qp_set_c = await helper.removeDuplicatesFromArrayOfObj(setCQuestionTrackData, 'question_id');

        request.data.quiz_question_details.qp_set_a = setAQuestions;
        request.data.quiz_question_details.qp_set_b = setBQuestions;
        request.data.quiz_question_details.qp_set_c = setCQuestions;

        // Add Non considered topics to DB : 
        request.data.not_considered_topics = [];
        for (var i in non_considered_topic_data) {
          non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
        };

        // Add Quiz : 
        quizRepository.addQuiz(request, async function (addQuiz_err, addQuiz_response) {
          if (addQuiz_err) {
            console.log(addQuiz_err);
            callback(addQuiz_err, addQuiz_response);
          } else {
            console.log("QUIZ GENERATED!");
            callback(0, 200);
          }
        })
      }

    }
  }
  await topicLoop(0);
}
exports.addManualQuizBasedonVarient = async (request, topic_response, concepts_response, callback) => {

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

  concepts_response = await helper.assignNumberofQuestions(concepts_response, request.data.selectedTopics, "concepts");

  // Declcare all topics as selected in an Obj 
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

          basic_groups = helper.removeDuplicates(basic_groups);
          intermediate_groups = helper.removeDuplicates(intermediate_groups);
          advanced_groups = helper.removeDuplicates(advanced_groups);

          questionServices.calculateCountUsingMatrix(basic_groups, intermediate_groups, advanced_groups, request.data.pre_post_quiz_config, async (matrix_err, matrix_response) => {
            if (matrix_err) {
              callback(400, matrix_err);
            } else {

              basic_groups = basic_groups.slice(0, Number(matrix_response.basic_count));
              intermediate_groups = intermediate_groups.slice(0, Number(matrix_response.intermediate_count));
              advanced_groups = advanced_groups.slice(0, Number(matrix_response.advance_count));

              let final_group_ids = [];
              request.data.quiz_question_details = {};
              final_group_ids.push(...basic_groups, ...intermediate_groups, ...advanced_groups);

              await groupRepository.fetchGroupsData({ group_array: final_group_ids }, async function (group_err, group_response) {
                if (group_err) {
                  console.log(group_err);
                  callback(group_err, group_response);
                } else {

                  if (request.data.varient === "randomOrder") {

                    await helper.getRandomQuestionsFromGroups(group_response.Items, conceptData[0].noOfQuestions, randomDupCheck, quiz_duration).then(async (data) => {

                      if (data === constant.messages.INSUFFICIENT_QUESTIONS) {
                        callback(0, constant.messages.INSUFFICIENT_QUESTIONS);
                      } else {
                        randomOrderQuestions.push(...data.questions_list);
                        randomDupCheck = data.randomDupCheck;
                        request.data.quiz_duration += data.quiz_duration;

                        // getting Question tracking per each topic : 
                        let { res_concept, res_non_considered_topic_data } = await helper.getQuestionTrackForManual(request.data.selectedTopics[topicIndex].topic_id, conceptData, data.questions_list, non_considered_topic_data, data.group_list);

                        non_considered_topic_data = res_non_considered_topic_data;
                        questionTrackData.push(...res_concept);

                        topicIndex++;
                        topicLoop(topicIndex);
                      }

                    })
                      .catch(function (err) {
                        console.log(err);
                        callback(400, err);
                      })

                  } else if (request.data.varient === "randomQuestions") {

                    await helper.getRandomGroups(group_response.Items, conceptData[0].noOfQuestions, quiz_duration).then(async (data) => {
                      request.data.quiz_duration += data.quiz_duration;

                      // Create 3 Sets of Question Paper : 
                      function splitSetQuestions(setIndex) {
                        if (setIndex < 4) {

                          let indheck = [];
                          let questions_list = [];
                          async function qtnLoop(ind) {
                            if (ind < data.group_list.length) {

                              if (indheck.length < data.group_list[ind].group_question_id.length) {
                                // Pick Random Questions out of each group : 
                                const randomIndex = Math.floor(Math.random() * data.group_list[ind].group_question_id.length);
                                let qtn_id = data.group_list[ind].group_question_id[randomIndex];
                                let dupCheck = setIndex === 1 ? setADupCheck.filter((id) => id === qtn_id) : setIndex === 2 ? setBDupCheck.filter((id) => id === qtn_id) : setCDupCheck.filter((id) => id === qtn_id);

                                !indheck.includes(randomIndex) && indheck.push(randomIndex);

                                if (dupCheck.length > 0) {
                                  qtnLoop(ind);
                                } else {
                                  questions_list.push(qtn_id);
                                  setIndex === 1 && setADupCheck.push(qtn_id)
                                  setIndex === 2 && setBDupCheck.push(qtn_id)
                                  setIndex === 3 && setCDupCheck.push(qtn_id)
                                  ind++;
                                  qtnLoop(ind);
                                }
                              } else {
                                console.log(constant.messages.INSUFFICIENT_QUESTIONS);
                                callback(0, constant.messages.INSUFFICIENT_QUESTIONS)
                              }

                            } else {

                              // getting Question tracking per each topic : 
                              let { res_concept, res_non_considered_topic_data } = await helper.getQuestionTrackForManual(request.data.selectedTopics[topicIndex].topic_id, conceptData, questions_list, non_considered_topic_data, data.group_list);

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

                    })
                      .catch(function (err) {
                        console.log(err);
                        callback(400, err);
                      })

                  }

                }
              })
            }
          })

        } else {
          // Loop Topic : 
          topicIndex++;
          topicLoop(topicIndex);
        }

      }
      conceptLoop(0);

    } else {
      // After Topic Loop is Over : 
      if (request.data.varient === "randomOrder") {

        questionTrackData = await helper.removeDuplicatesFromArrayOfObj(questionTrackData, 'question_id');

        // // // Formatting Topic-Concept-Group-Question level DS 
        request.data.question_track_details.qp_set_a = questionTrackData
        request.data.question_track_details.qp_set_b = questionTrackData
        request.data.question_track_details.qp_set_c = questionTrackData

        request.data.quiz_question_details.qp_set_a = await helper.shuffleArray(randomOrderQuestions);
        request.data.quiz_question_details.qp_set_b = await helper.shuffleArray(randomOrderQuestions);
        request.data.quiz_question_details.qp_set_c = await helper.shuffleArray(randomOrderQuestions);

        // add Non considered topics to DB : 
        request.data.not_considered_topics = [];
        for (var i in non_considered_topic_data) {
          non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
        };

        // Add Quiz : 
        quizRepository.addQuiz(request, async function (addQuiz_err, addQuiz_response) {
          if (addQuiz_err) {
            console.log(addQuiz_err);
            callback(addQuiz_err, addQuiz_response);
          } else {
            console.log("QUIZ GENERATED!");
            callback(0, 200);
          }
        })
      } else if (request.data.varient === "randomQuestions") {

        // // get Questions track based on Set of Diff. questions 
        request.data.question_track_details.qp_set_a = await helper.removeDuplicatesFromArrayOfObj(setAQuestionTrackData, 'question_id');
        request.data.question_track_details.qp_set_b = await helper.removeDuplicatesFromArrayOfObj(setBQuestionTrackData, 'question_id');;
        request.data.question_track_details.qp_set_c = await helper.removeDuplicatesFromArrayOfObj(setCQuestionTrackData, 'question_id');;

        request.data.quiz_question_details.qp_set_a = setAQuestions;
        request.data.quiz_question_details.qp_set_b = setBQuestions;
        request.data.quiz_question_details.qp_set_c = setCQuestions;

        // add Non considered topics to DB : 
        request.data.not_considered_topics = [];
        for (var i in non_considered_topic_data) {
          non_considered_topic_data[i] && (request.data.not_considered_topics.push(i));
        };

        // Add Quiz : 
        quizRepository.addQuiz(request, async function (addQuiz_err, addQuiz_response) {
          if (addQuiz_err) {
            console.log(addQuiz_err);
            callback(addQuiz_err, addQuiz_response);
          } else {
            console.log("QUIZ GENERATED!");
            callback(0, 200);
          }
        })
      }
    }
  }
  await topicLoop(0);
}
exports.generateQuizForPostLearning = (request, callback) => {

  /** CHECK PRE QUIZ EXIST **/
  quizRepository.fetchQuizData(request, async function (postQuizData_err, postQuizData_res) {
    if (postQuizData_err) {
      console.log(postQuizData_err);
      callback(postQuizData_err, postQuizData_res);
    }
    else {
      schoolRepository.getSchoolDetailsById(request, async (schoolDataErr, schoolDataRes) => {
        if (schoolDataErr) {
          console.log(schoolDataErr);
          callback(schoolDataErr, schoolDataRes);
        }
        else {
          if (schoolDataRes.Items[0].post_quiz_config) {
            let postQuizConfig = schoolDataRes.Items[0].post_quiz_config;
            if (postQuizData_res.Items.length > 0 && postQuizConfig.choose_topic === "No") {
              console.log(constant.messages.POST_QUIZ_ALREADY_GENERATED);
              callback(400, constant.messages.POST_QUIZ_ALREADY_GENERATED);
            }
            else {
              request.data.pre_post_quiz_config = postQuizConfig;
              request.data.quiz_id = helper.getRandomString();
              request.data.quiz_duration = 0;

              if (request.data.quizType === constant.prePostConstans.automatedType) {
                let selectedTop = [];
                if (request.data.topicList.length > 0) {
                  await request.data.topicList.map(reqTop => {
                    selectedTop.push({ topic_id: reqTop, noOfQuestions: "N.A." });
                  })

                  request.data.selectedTopics = selectedTop;
                  request.data.AcitveTopics = request.data.topicList;

                  exports.addAutomatedQuizBasedonVarient(request, (add_quiz_basedon_varient_err, add_quiz_basedon_varient_response) => {
                    if (add_quiz_basedon_varient_err) {
                      callback(add_quiz_basedon_varient_err, 0);
                    } else {

                      if (add_quiz_basedon_varient_response === 200) {

                        if (request.data.quizMode === "offline") {
                          console.log("test 4");

                          exports.createPDFandUpdateTemplateDetails(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                            if (create_pdf_and_update_details_err) {

                              callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                            } else {
                              callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                            }
                          })

                        } else if (request.data.quizMode === "online") {

                          exports.sendMailtoTeacher(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                            if (create_pdf_and_update_details_err) {
                              callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                            } else {
                              callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                            }
                          })

                        } else {
                          callback(400, constant.messages.INVALID_QUIZ_MODE)
                        }

                      } else {
                        callback(400, add_quiz_basedon_varient_response);
                      }
                    }
                  })
                }
                else {
                  // Generate for All Post Topics for the Chapter : 
                  /** FETCH TEACHING ACTIVITY **/
                  teachingActivityRepository.fetchTeachingActivity(request, async function (teachActivity_err, teachActivity_response) {
                    if (teachActivity_err) {
                      console.log(teachActivity_err);
                      callback(teachActivity_err, teachActivity_response);
                    } else {
                      let chapterActivity = teachActivity_response.Items.length > 0 ? teachActivity_response.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id) : [];
                      let archivedTopics = chapterActivity.length > 0 ? chapterActivity[0].post_learning.archivedTopics : [];

                      /** FETCH CHAPTER DATA **/
                      chapterRepository.fetchChapterByID(request, async function (chapterData_err, chapterData_response) {
                        if (chapterData_err) {
                          console.log(chapterData_err);
                          callback(chapterData_err, chapterData_response);
                        } else {
                          let postLearningTopicIds = chapterData_response.Items.length > 0 ? chapterData_response.Items[0].postlearning_topic_id : [];

                          let AcitveTopics = await helper.getDifferenceValueFromTwoArray(postLearningTopicIds, archivedTopics);

                          if (AcitveTopics.length > 0) {
                            await AcitveTopics.forEach(actTop => {
                              selectedTop.push({ topic_id: actTop, noOfQuestions: "N.A." });
                            })

                            request.data.selectedTopics = selectedTop;
                            request.data.AcitveTopics = AcitveTopics;

                            exports.addAutomatedQuizBasedonVarient(request, (add_quiz_basedon_varient_err, add_quiz_basedon_varient_response) => {
                              if (add_quiz_basedon_varient_err) {
                                callback(add_quiz_basedon_varient_err, 0);
                              } else {

                                if (add_quiz_basedon_varient_response === 200) {

                                  if (request.data.quizMode === "offline") {

                                    exports.createPDFandUpdateTemplateDetails(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                                      if (create_pdf_and_update_details_err) {

                                        callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                      } else {
                                        callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                      }
                                    })

                                  } else if (request.data.quizMode === "online") {

                                    exports.sendMailtoTeacher(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                                      if (create_pdf_and_update_details_err) {
                                        callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                      } else {
                                        callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                      }
                                    })

                                  } else {
                                    callback(400, constant.messages.INVALID_QUIZ_MODE)
                                  }

                                } else {
                                  callback(400, add_quiz_basedon_varient_response);
                                }
                              }
                            })
                          }
                          else {
                            console.log(constant.messages.NO_ACTIVE_TOPICS);
                            callback(400, constant.messages.NO_ACTIVE_TOPICS);
                          }
                        }
                      })
                    }
                  })
                }
                // set selected topics to the request here 
              }
              else {
                let selectedTopics = request.data.selectedTopics.map((topicDetails) => topicDetails.topic_id);

                topicRepository.fetchTopicConceptIDData({ topic_array: selectedTopics }, async function (fetch_topics_err, fetch_topics_response) {
                  if (fetch_topics_err) {
                    console.log(fetch_topics_err);
                    callback(fetch_topics_err, fetch_topics_response);
                  } else {
                    let topic_concept_id = [];
                    await fetch_topics_response.Items.forEach((e) => topic_concept_id.push(...e.topic_concept_id));

                    conceptRepository.fetchConceptData({ topic_concept_id: topic_concept_id }, async function (fetch_concepts_err, fetch_concepts_response) {
                      if (fetch_concepts_err) {
                        console.log(fetch_concepts_err);
                        callback(fetch_concepts_err, fetch_concepts_response);
                      } else {

                        if (request.data.quizType === constant.prePostConstans.expressType) {
                          // Express : 
                          exports.addExpressQuizBasedonVarient(request, fetch_topics_response.Items, fetch_concepts_response.Items, (add_express_quiz_basedon_varient_err, add_express_quiz_basedon_varient_response) => {
                            if (add_express_quiz_basedon_varient_err) {
                              callback(add_express_quiz_basedon_varient_err, add_express_quiz_basedon_varient_response);
                            } else {

                              if (add_express_quiz_basedon_varient_response === 200) {

                                if (request.data.quizMode === "offline") {
                                  console.log("test 6");

                                  exports.createPDFandUpdateTemplateDetails(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                                    if (create_pdf_and_update_details_err) {

                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else if (request.data.quizMode === "online") {

                                  exports.sendMailtoTeacher(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                                    if (create_pdf_and_update_details_err) {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else {
                                  callback(400, constant.messages.INVALID_QUIZ_MODE)
                                }

                              } else {
                                callback(400, add_express_quiz_basedon_varient_response);
                              }
                            }
                          })

                        } else if (request.data.quizType === constant.prePostConstans.manualType) {
                          // Manual : 
                          exports.addManualQuizBasedonVarient(request, fetch_topics_response.Items, fetch_concepts_response.Items, (add_express_quiz_basedon_varient_err, add_express_quiz_basedon_varient_response) => {
                            if (add_express_quiz_basedon_varient_err) {
                              callback(add_express_quiz_basedon_varient_err, add_express_quiz_basedon_varient_response);
                            } else {

                              if (add_express_quiz_basedon_varient_response === 200) {

                                if (request.data.quizMode === "offline") {
                                  console.log("test 7");

                                  exports.createPDFandUpdateTemplateDetails(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                                    if (create_pdf_and_update_details_err) {

                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else if (request.data.quizMode === "online") {

                                  exports.sendMailtoTeacher(request, (create_pdf_and_update_details_err, create_pdf_and_update_details_response) => {
                                    if (create_pdf_and_update_details_err) {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    } else {
                                      callback(create_pdf_and_update_details_err, create_pdf_and_update_details_response);
                                    }
                                  })

                                } else {
                                  callback(400, constant.messages.INVALID_QUIZ_MODE)
                                }

                              } else {
                                callback(400, add_express_quiz_basedon_varient_response);
                              }
                            }
                          })
                        }

                      }
                    })
                  }
                })
              }
            }
          }
          else {
            console.log(constant.messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG);
            callback(400, constant.messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG);
          }
        }
      })
    }
  })
}
exports.addteacherDigicardExtension = async (request) => {
  try {
    const digiExtensionResponse = await digicardExtension.getExtensionDetails2(request);
    let digiExtension = JSON.parse(JSON.stringify(request.data.extensions));
    let finalResponse = [];
    
    for (let i = 0; i < digiExtension.length; i++) {
      let extFile = digiExtension[i].ext_file;

      if (!(JSON.stringify(extFile).includes("digicard_extension/")) && extFile && extFile !== "N.A.") {
        let extFilesS3 = await helper.PutObjectS3SigneUdrl(extFile, "digicard_extension");
        console.log({ extFilesS3 });

        request.data.extensions[i].ext_file = extFilesS3.Key;
        finalResponse.push({ file_name: extFile, s3Url: extFilesS3.uploadURL });
      }
    }

    if (digiExtensionResponse.Items.length > 0) {
      request.data.extension_id = digiExtensionResponse.Items[0].extension_id;
      await digicardExtension.updateDigiExtension2(request);
      console.log("Extension Updated Successfully");
    } else {
      await digicardExtension.addDigiExtension2(request);
      console.log("Extension Added Successfully");
    }

    return finalResponse;

  } catch (error) {
    console.error("Error handling digicard extension:", error);
    throw new Error(`Failed to handle digicard extension: ${error.message}`);
  }
};

exports.getTeacherPostLearningPermissions = function (request, callback) {

  if (request === undefined || request.data === undefined || request.data.client_class_id === undefined || request.data.client_class_id === "" || request.data.section_id === undefined || request.data.section_id === "" || request.data.subject_id === undefined || request.data.subject_id === "" || request.data.chapter_id === undefined || request.data.chapter_id === "" || request.data.school_id === undefined || request.data.school_id === "" || request.data.topics === undefined || request.data.topics === "") {
    callback(400, constant.messages.INVALID_REQUEST_FORMAT)
  } else {

    schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
      if (schoolDataErr) {
        console.log(schoolDataErr);
        callback(schoolDataErr, schoolDataRes);
      }
      else {
        console.log("schoolDataRes.Items[0] : ", schoolDataRes.Items[0]);

        if (schoolDataRes.Items[0].post_quiz_config) {
          let postQuizConfig = schoolDataRes.Items[0].post_quiz_config;

          teachingActivityRepository.fetchTeachingActivity(request, async function (teachActivity_err, teachActivity_response) {
            if (teachActivity_err) {
              console.log(teachActivity_err);
              callback(teachActivity_err, teachActivity_response);
            } else {
              console.log("TEACHER ACTIVITY : ", teachActivity_response);

              let requestTopics = request.data.topics.map((e) => e.topic_id);
              console.log("requestTopics : ", requestTopics);

              /** CHECK DIGICARDS UNLOCK **/
              let chapterActivity = teachActivity_response.Items.length > 0 ? await teachActivity_response.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id) : [];
              console.log("chapterActivity : ", chapterActivity);

              let archivedTopics = chapterActivity.length > 0 ? chapterActivity[0].post_learning.archivedTopics : [];
              let unlockDigicards = chapterActivity.length > 0 ? chapterActivity[0].post_learning.unlocked_digicard : [];
              console.log("unlockDigicards : ", unlockDigicards);

              let unlockTopicDigicard = unlockDigicards.length > 0 ? unlockDigicards : [];
              let UnlockedTopicIDs = [];
              await unlockTopicDigicard.map((e) => UnlockedTopicIDs.push(...e.topics.map((j) => j.topic_id)));
              console.log("UnlockedTopicIDs :", UnlockedTopicIDs);
              /////////////////
              /** CHECK QUIZ EXIST **/
              request.data.learningType = constant.prePostConstans.postLearningVal;

              quizRepository.fetchQuizData(request, async function (quizData_err, quizData_res) {
                if (quizData_err) {
                  console.log(quizData_err);
                  callback(quizData_err, quizData_res);
                }
                else {
                  console.log("QUIZ DATA : ", quizData_res);

                  if (postQuizConfig.choose_topic === "Yes") {

                    // requestTopics shouldn't be empty
                    // Check if they are archived or not and filter unarchived topics 
                    // check if requestTopics which are unlocked or not if unlock digicard is mandatory ,  if not, intimate user that, digicard is not unlocked 
                    // requestTopics shouldn't be empty , if yes, throw error 
                    // check quiz table, if there is data, check if the requestTopics id's are there in selectedTopics columns or not 
                    // If yes, throw error, that its already generated 
                    let quizGenerated = "No";
                    console.log("quizData_res.Items : ", quizData_res.Items)
                    console.log("requestTopics : ", requestTopics)

                    await quizData_res.Items.length > 0 && quizData_res.Items.forEach((e) => {
                      e.selectedTopics.length > 0 && e.selectedTopics.forEach((a) =>
                        requestTopics.filter((k) => k === a.topic_id).length > 0 && (quizGenerated = "Yes"))
                    })
                    console.log("ok****");
                    if (quizData_res.Items.length > 0 && quizGenerated === "Yes") {
                      callback(400, constant.messages.POST_QUIZ_ALREADY_GENERATED)
                    } else {
                      if (requestTopics.length > 0) {
                        // Filter UnArchived Topics : 
                        // console.log("postQuizConfig", postQuizConfig);
                        if (postQuizConfig.unlock_digicard_mandatory === "Yes") {
                          // if requestTopics topics are there in unlockTopicDigicard, then proceed 

                          const unlockAllTopicsCheck = await helper.checkOneArrayElementsinAnother(requestTopics, UnlockedTopicIDs);

                          if (unlockAllTopicsCheck) {
                            // Proceed : 
                            exports.generateResponse(postQuizConfig, (generate_err, generate_response) => {
                              if (generate_err) {
                                callback(400, generate_err);
                              } else {
                                callback(200, generate_response);
                              }
                            })
                          } else {
                            callback(400, constant.messages.DIDNT_UNLOCK_DIGICARD);
                          }
                        } else if (postQuizConfig.unlock_digicard_mandatory === "No") {
                          // Proceed : 
                          // assign to response , that do you want to generate quiz without unlocking digicard ? 
                          exports.generateResponse(postQuizConfig, (generate_err, generate_response) => {
                            if (generate_err) {
                              callback(400, generate_err);
                            } else {
                              console.log(generate_response);
                              callback(200, generate_response);
                            }
                          })

                        } else {
                          callback(400, constant.messages.DIDNT_SET_CONFIG);
                        }
                      } else {
                        console.log(constant.messages.NO_TOPICS_SELECTED);
                        callback(400, constant.messages.NO_TOPICS_SELECTED);
                      }
                    }
                  }
                  else if (postQuizConfig.choose_topic === "No") {

                    // if request.data.topics is [], fetch all post topics and removed archived topics 
                    // check digicads are unlocked for those topics or not if its mandatory
                    // check quiz table, if the there is data, throw error, that quiz already generated 
                    if (quizData_res.Items.length === 0) {

                      chapterRepository.fetchChapterByID(request, async function (single_chapter_err, single_chapter_response) {
                        if (single_chapter_err) {
                          console.log(single_chapter_err);
                          callback(single_chapter_err, single_chapter_response);
                        } else {
                          console.log("single_chapter_response : ", single_chapter_response);

                          topicRepository.fetchPostTopicData(single_chapter_response.Items[0], async function (post_topic_err, post_topic_response) {
                            if (post_topic_err) {
                              console.log("post_topic_err", post_topic_err);
                              callback(post_topic_err, post_topic_response);
                            } else {

                              if (requestTopics.length === 0) {

                                let topicIDs = post_topic_response.Items.map((e) => e.topic_id);

                                let AcitveTopics = await helper.getDifferenceValueFromTwoArray(topicIDs, archivedTopics);

                                if (postQuizConfig.unlock_digicard_mandatory === "Yes") {
                                  let unlockCheck = [];

                                  AcitveTopics.forEach((e) => UnlockedTopicIDs.filter((a) => e === a).length > 0 && unlockCheck.push(e));

                                  const unlockAllTopicsCheck = await helper.checkOneArrayElementsinAnother(AcitveTopics, unlockCheck);

                                  if (unlockAllTopicsCheck) {
                                    // Proceed : 
                                    exports.generateResponse(postQuizConfig, (generate_err, generate_response) => {
                                      if (generate_err) {
                                        callback(400, generate_err);
                                      } else {
                                        console.log(generate_response);
                                        callback(200, generate_response);
                                      }
                                    })

                                  } else {
                                    callback(400, constant.messages.DIDNT_UNLOCK_DIGICARD);
                                  }
                                } else if (postQuizConfig.unlock_digicard_mandatory === "No") {
                                  // Proceed : 
                                  // assign to response , that do you want to generate quiz without unlocking digicard ? 
                                  exports.generateResponse(postQuizConfig, (generate_err, generate_response) => {
                                    if (generate_err) {
                                      callback(400, generate_err);
                                    } else {
                                      console.log(generate_response);
                                      callback(200, generate_response);
                                    }
                                  })

                                } else {
                                  callback(400, constant.messages.DIDNT_SET_CONFIG);
                                }
                              } else {
                                let topicIDs = post_topic_response.Items.map((e) => e.topic_id);

                                let AcitveTopics = await helper.getDifferenceValueFromTwoArray(topicIDs, archivedTopics);
                                console.log("AcitveTopics : ", AcitveTopics);

                                const selectAllTopicsCheck = await helper.checkOneArrayElementsinAnother(AcitveTopics, requestTopics);

                                if (selectAllTopicsCheck === true) {
                                  exports.generateResponse(postQuizConfig, (generate_err, generate_response) => {
                                    if (generate_err) {
                                      callback(400, generate_err);
                                    } else {
                                      console.log(generate_response);
                                      callback(200, generate_response);
                                    }
                                  })
                                } else {
                                  callback(400, constant.messages.SELECT_ALL_TOPICS)
                                }
                              }
                            }
                          })
                        }
                      })
                    } else {
                      console.log("HERE : ================ ");
                      callback(400, constant.messages.POST_QUIZ_ALREADY_GENERATED)
                    }
                  }
                  /** CHECK DIGICARDS UNLOCK **/
                }
              })
              /** END CHECK QUIZ EXIST **/
            }
          })
        }
        else {
          console.log(constant.messages.SCHOOL_DOESNT_HAVE_POSTQUIZ_CONFIG);
          callback(400, constant.messages.SCHOOL_DOESNT_HAVE_POSTQUIZ_CONFIG);
        }
      }
    })
  }
}
exports.generateResponse = (postQuizConfig, callback) => {

  /** SET FINAL RESPONSE **/
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

  preQuizType.push(postQuizConfig.automated_type === "Enabled" ? constant.prePostConstans.automatedType : "N.A.");
  preQuizType.push(postQuizConfig.express_type === "Enabled" ? constant.prePostConstans.expressType : "N.A.");
  preQuizType.push(postQuizConfig.manual_type === "Enabled" ? constant.prePostConstans.manualType : "N.A.");

  preQuizMode.push(postQuizConfig.offline_mode === "Enabled" ? constant.prePostConstans.offlineMode : "N.A.");
  preQuizMode.push(postQuizConfig.online_mode === "Enabled" ? constant.prePostConstans.onlineMode : "N.A.");

  preQuizVarient.push(postQuizConfig.randomized_order_varient === "Enabled" ? constant.prePostConstans.randomOrder : "N.A.");
  preQuizVarient.push(postQuizConfig.randomized_questions_varient === "Enabled" ? constant.prePostConstans.randomQuestion : "N.A.");

  response.postLearning.quizModes = preQuizMode.filter(qMode => qMode !== "N.A.");
  response.postLearning.quizType = preQuizType.filter(qType => qType !== "N.A.");
  response.postLearning.quizVarient = preQuizVarient.filter(qVar => qVar !== "N.A.");

  response.postLearning.concept_mandatory = postQuizConfig.concept_mandatory;
  response.postLearning.min_qn_at_topic_level = postQuizConfig.min_qn_at_topic_level;
  response.postLearning.min_qn_at_chapter_level = postQuizConfig.min_qn_at_chapter_level;

  console.log("PERMISSIONS : ", JSON.stringify(response));
  callback(0, response);
  /** END SET FINAL RESPONSE **/

}
exports.changeDigiCardOrder = async function (request) {
  if (!request || !request.data || !request.data.client_class_id || !request.data.section_id || !request.data.subject_id || !request.data.chapter_id) {
    throw new Error(constant.messages.INVALID_REQUEST_FORMAT);
  }

  try {
    const teachActivity_response = await teachingActivityRepository.fetchTeachingActivity2(request);
    console.log("TEACHER ACTIVITY:", teachActivity_response);

    const digicard_activity_data = await exports.createDigicardActivityData2(request);
    console.log("digicard_activity_data:", digicard_activity_data);

    const allDigicardActivity = teachActivity_response.Items[0]?.digicard_activities || [];
    const digicardActivity = allDigicardActivity.filter(ce => ce.chapter_id === request.data.chapter_id);
    console.log("digicardActivity:", digicardActivity);

    let PrePOstActivity = digicardActivity.length > 0 ? (request.data.learningType === "Pre" ? [...digicardActivity[0].pre_learning] : [...digicardActivity[0].post_learning]) : [];
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
      request.data.learningType === "Pre" ? digicardActivity[0].pre_learning = PrePOstActivity : digicardActivity[0].post_learning = PrePOstActivity;
      allDigicardActivity.forEach((e, i) => e.chapter_id === request.data.chapter_id && (allDigicardActivity[i] = digicardActivity[0]));
      request.data.digicard_activities = allDigicardActivity;
    } else {
      allDigicardActivity.push(digicard_activity_data);
      request.data.digicard_activities = allDigicardActivity;
    }

    request.data.activity_id = teachActivity_response.Items[0].activity_id;

    await teachingActivityRepository.updateTeachingDigiCardActivity2(request);
    return constant.messages.DIGICARD_ORDER_CHANGED;

  } catch (error) {
    console.error(error);
    throw new Error(error.message || constant.messages.ERROR);
  }
};

exports.createDigicardActivityData2 = async (request) => {
  if (!request || !request.data || !request.data.chapter_id || !request.data.topic_id) {
    throw new Error(constant.messages.INVALID_REQUEST_FORMAT);
  }

  let individual_digicard_activity = {
    chapter_id: request.data.chapter_id,
    pre_learning: [],
    post_learning: []
  };

  const learningData = {
    topic_id: request.data.topic_id,
    digicardOrder: request.data.key === "toggle" ? [] : request.data.digicardOrder,
    archivedDigicard: request.data.key === "toggle" ? request.data.digi_card_id : []
  };

  if (request.data.learningType === "Pre") {
    individual_digicard_activity.pre_learning.push(learningData);
  } else if (request.data.learningType === "Post") {
    individual_digicard_activity.post_learning.push(learningData);
  } else {
    throw new Error(constant.messages.INVALID_REQUEST_FORMAT);
  }

  return individual_digicard_activity;
};


exports.activeAndArchiveDigicardsInTopic = async function (request) {
  if (!request?.data?.client_class_id || !request?.data?.section_id || !request?.data?.subject_id || !request?.data?.chapter_id || !request?.data?.action) {
    throw helper.formatErrorResponse(400, constant.messages.INVALID_REQUEST_FORMAT);
  }

  if (request.data.action !== "active" && request.data.action !== "delete") {
    throw helper.formatErrorResponse(400, constant.messages.INVALID_REQUEST_FORMAT);
  }

  try {
    const teachActivityResponse = await teachingActivityRepository.fetchTeachingActivity2(request);
    request.data.key = "toggle";

    const digicardActivityData = await exports.createDigicardActivityData2(request);
    let allDigicardActivity = teachActivityResponse.Items.length > 0 ? teachActivityResponse.Items[0].digicard_activities || [] : [];
    let digicardActivity = allDigicardActivity.filter(ce => ce.chapter_id === request.data.chapter_id);

    let archivedData = { topic_id: request.data.topic_id, digicardOrder: [], archivedDigicard: [] };
    let prePostActivity = request.data.learningType === "Pre" ? digicardActivity[0]?.pre_learning || [] : digicardActivity[0]?.post_learning || [];

    if (prePostActivity.some(e => e.topic_id === request.data.topic_id)) {
      prePostActivity = prePostActivity.map((e) => {
        if (e.topic_id === request.data.topic_id) {
          archivedData.digicardOrder = e.digicardOrder;
          if (request.data.action === "delete") {
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

    if (request.data.learningType === "Pre") {
      digicardActivity[0].pre_learning = prePostActivity;
    } else {
      digicardActivity[0].post_learning = prePostActivity;
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

    return request.data.action === "delete" ? constant.messages.DIGICARD_DELETED_IN_TOPIC : constant.messages.DIGICARD_ACTIVATED_IN_TOPIC;

  } catch (error) {
    console.error(error);
    throw helper.formatErrorResponse(error.statusCode || 500, error.message || "Internal Server Error");
  }
};

exports.getDigiCardstoReorder = function (request, callback) {

  if (request === undefined || request.data === undefined || request.data.client_class_id === undefined || request.data.client_class_id === "" || request.data.section_id === undefined || request.data.section_id === "" || request.data.subject_id === undefined || request.data.subject_id === "" || request.data.chapter_id === undefined || request.data.chapter_id === "") {
    callback(400, constant.messages.INVALID_REQUEST_FORMAT)
  } else {
    teachingActivityRepository.fetchTeachingActivity(request, async function (teachActivity_err, teachActivity_response) {
      if (teachActivity_err) {
        console.log(teachActivity_err);
        callback(teachActivity_err, teachActivity_response);
      } else {
        console.log("TEACHER ACTIVITY : ", teachActivity_response);

        let changedDigiCardOrder = [];
        let archivedDigiCardList = [];

        let myPromise = new Promise(async function (myResolve, myReject) {

          if (teachActivity_response.Items.length > 0) {
            // Take Digicard Data and Update it : 
            let allDigicardActivity = teachActivity_response.Items[0].digicard_activities;

            allDigicardActivity = allDigicardActivity === undefined ? [] : allDigicardActivity;

            let digicardActivity = await allDigicardActivity.filter(ce => ce.chapter_id === request.data.chapter_id);
            console.log("digicardActivity : ", digicardActivity);

            if (digicardActivity.length > 0) {
              // Update Activity : 
              // JSON.parse(JSON.stringify()) is to avoid pass by reference : 
              let PrePOstActivity = request.data.learningType === "Pre" ? JSON.parse(JSON.stringify(digicardActivity[0].pre_learning)) : JSON.parse(JSON.stringify(digicardActivity[0].post_learning));

              // Check if request topic is there in stored pre or post learning array and, replace it : 
              PrePOstActivity = PrePOstActivity === undefined ? [] : PrePOstActivity;

              if (PrePOstActivity.length > 0) {
                // Update Topic Digicard Data, if its already sorted once OR push new Topic Digicard Data to pre_learning array : 
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
              console.log("changedDigiCardOrder : ", changedDigiCardOrder);

              // Check the DigiCard Order and Filter Active List : 
              if (archivedDigiCardList.length > 0) {

                let archivedDigiCardSet = new Set(archivedDigiCardList);
                let FinalDigiCardList = await changedDigiCardOrder.filter((e) => { return !archivedDigiCardSet.has(e) });
                console.log("FinalDigiCardList : ", FinalDigiCardList);

                FinalDigiCardList = await helper.removeDuplicates(FinalDigiCardList);
                // DigiCard Names and Display Name : 
                digicardRepository.fetchDigiCardDisplayTitleID(FinalDigiCardList, async function (get_digicard_err, get_digicard_res) {
                  if (get_digicard_err) {
                    console.log(get_digicard_err);
                    callback(get_digicard_err, get_digicard_res);
                  } else {
                    console.log(constant.messages.DIGICARDS_FETCHED_FOR_REORDERING);
                    // Sort Array : 
                    get_digicard_res.Items = await helper.sortOneArrayBasedonAnother(get_digicard_res.Items, FinalDigiCardList, "digi_card_id");
                    callback(get_digicard_err, get_digicard_res);
                  }
                })
              } else {
                // DigiCard Names and Display Name : 
                changedDigiCardOrder = await helper.removeDuplicates(changedDigiCardOrder);
                digicardRepository.fetchDigiCardDisplayTitleID(changedDigiCardOrder, async function (get_digicard_err, get_digicard_res) {
                  if (get_digicard_err) {
                    console.log(get_digicard_err);
                    callback(get_digicard_err, get_digicard_res);
                  } else {
                    // Sort Array : 
                    get_digicard_res.Items = await helper.sortOneArrayBasedonAnother(get_digicard_res.Items, changedDigiCardOrder, "digi_card_id");
                    callback(get_digicard_err, get_digicard_res);
                  }
                })
              }
            } else {
              // send Topic Based Digicards and filter : 
              request.data.archivedDigiCardList = archivedDigiCardList.length > 0 ? archivedDigiCardList : [];

              exports.getAllDigicardsBasedonTopic(request, (digicard_list_err, digicard_list_response) => {
                if (digicard_list_err) {
                  callback(digicard_list_err, digicard_list_response)
                } else {
                  console.log("digicard_list_response : ", digicard_list_response);
                  callback(200, digicard_list_response);
                }
              })
            }

          },
          function (error) {
            callback(400, constant.messages.ERROR);
          }
        );
      }
    })
  }
}
exports.getAllDigicardsBasedonTopic = async function (request, callback) {

  request === undefined ? callback(400, constant.messages.INVALID_REQUEST) : request.data === undefined ? callback(400, constant.messages.INVALID_REQUEST) : (request.data.topic_id === undefined || request.data.topic_id === "") ? callback(400, constant.messages.INVALID_REQUEST) :

    /** FETCH USER BY EMAIL **/
    topicRepository.fetchTopicByID(request, async function (single_topic_err, single_topic_response) {
      if (single_topic_err) {
        console.log(single_topic_err);
        callback(single_topic_err, single_topic_response);
      } else {
        conceptRepository.fetchConceptData(single_topic_response.Items[0], async function (topic_related_concept_err, topic_related_concept_response) {
          if (topic_related_concept_err) {
            console.log(topic_related_concept_err);
            callback(topic_related_concept_err, topic_related_concept_response);
          } else {
            let concept_digicard_id = [];

            topic_related_concept_response.Items.map((e) => { concept_digicard_id.push(...e.concept_digicard_id) });

            digicardRepository.fetchDigiCardDisplayTitleID(concept_digicard_id, async function (get_digicard_err, get_digicard_res) {
              if (get_digicard_err) {
                console.log(get_digicard_err);
                callback(get_digicard_err, get_digicard_res);
              } else {
                // Sort Topic - Concepts - DigiCards : 
                exports.sortDigiCardsBasedonTopic(single_topic_response, topic_related_concept_response, get_digicard_res, (sorted_data_err, sorted_data_response) => {
                  if (sorted_data_err) {
                    callback(sorted_data_err, sorted_data_response);
                  } else {
                    let archivedDigiCardList = request.data.archivedDigiCardList;
                    let response = {};

                    if (archivedDigiCardList.length > 0) {

                      let archivedDigiCardSet = new Set(archivedDigiCardList);
                      let FinalDigiCardList = sorted_data_response.Items.filter((e) => { return !archivedDigiCardSet.has(e.digi_card_id) });
                      response.Items = FinalDigiCardList;
                      callback(single_topic_err, response);

                    } else {
                      callback(single_topic_err, sorted_data_response);
                    }
                  }
                })
              }
            }
            );
          }
        }
        );
      }
    }
    );
};

exports.sortDigiCardsBasedonTopic = async (topic_response, concept_response, digicard_response, callback) => {

  let topic_concept_id = topic_response.Items[0].topic_concept_id;
  let finalDigiCardData = {
    Items: []
  };

  let sortedConceptData = await helper.sortOneArrayBasedonAnother(concept_response.Items, topic_concept_id, "concept_id");

  let concept_digicard_id = [];

  await sortedConceptData.forEach(async (each_concept) => {
    concept_digicard_id.push(...each_concept.concept_digicard_id);
  });
  console.log(concept_digicard_id);

  concept_digicard_id = await helper.removeDuplicates(concept_digicard_id)

  let sortedDigiCardData = await helper.sortOneArrayBasedonAnother(digicard_response.Items, concept_digicard_id, "digi_card_id");
  console.log(sortedDigiCardData);
  finalDigiCardData.Items = sortedDigiCardData;

  callback(0, finalDigiCardData);
}

exports.getQuestionSourceandChapters = (request, callback) => {

  if (request.data.subject_id === "" || request.data.subject_id === undefined) {
    callback(400, constant.messages.INVALID_SUBJECT);
  } else {

    settingsRepository.getQuestionSources(request, function (source_err, source_res) {
      if (source_err) {
        console.log(source_err);
        callback(source_err, source_res);
      } else {
        let response = {
          "question_sources": source_res.Items,
        }
        subjectRepository.getSubjetById(request, function (subject_err, subject_res) {
          if (subject_err) {
            console.log(subject_err);
            callback(subject_err, subject_res);
          } else {
            if (subject_res.Items.length > 0) {
              let subject_unit_id = subject_res.Items[0].subject_unit_id;

              unitRepository.fetchUnitData({ subject_unit_id: subject_unit_id }, async function (unit_err, unit_res) {
                if (unit_err) {
                  console.log(unit_err);
                  callback(unit_err, unit_res);
                } else {
                  if (unit_res.Items.length > 0) {
                    let unit_chapter_id = [];

                    await unit_res.Items.forEach((e) => unit_chapter_id.push(...e.unit_chapter_id));

                    chapterRepository.fetchBulkChaptersIDName({ unit_chapter_id: unit_chapter_id }, function (chapter_err, chapter_res) {
                      if (chapter_err) {
                        console.log(chapter_err);
                        callback(chapter_err, chapter_res);
                      } else {
                        response.chapters = chapter_res.Items
                        callback(200, response);
                      }
                    })
                  } else {
                    response.chapters = unit_res.Items;
                    callback(200, response);
                  }
                }
              })
            } else {
              response.chapters = subject_res.Items;
              callback(200, response);
            }
          }
        })
      }
    })
  }
}

exports.createPDFandUpdateTemplateDetails = (request, callback) => {

  // Call API in EC2 Service and get Question and Answer Paper Paths : 
  const options = {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: qs.stringify(request),
    url: process.env.PDF_GENERATION_URL + '/createQuizQuestionAndAnswerPapers',
  };


  axios(options).then((pdfData) => {
    console.log("PDF'S Generated!", pdfData);
  }).catch((err) => {

    console.log("Errror in EC2 : ", err);
    callback(400, err)
  })
  console.log("Process Initiated Successfully!");
  callback(0, 200);
}

exports.sendMailtoTeacher = (request, callback) => {

  userRepository.fetchTeacherEmailById(request, async function (fetch_teacher_email_err, fetch_teacher_email_res) {
    if (fetch_teacher_email_err) {
      console.log(fetch_teacher_email_err);
      callback(fetch_teacher_email_err, fetch_teacher_email_res);
    } else {

      // Send Mail to the User : 
      var mailPayload = {
        "quiz_name": request.data.quiz_name,
        "toMail": fetch_teacher_email_res.Items[0].user_email,
        "subject": constant.mailSubject.quizGeneration,
        "mailFor": "quizGeneration",
      };
      console.log("MAIL PAYLAOD : ", mailPayload);
      let dataEmail = await sendMail.process(mailPayload)
      if (dataEmail.httpStatusCode == 200) {
        console.log("SNS PUBLISH SUCCESS");
        callback(200, constant.messages.QUIZ_GENERATED);
      }
      else {
        console.log(dataEmail)
        callback(400, "SNS ERROR");
      }
    }
  })

}
