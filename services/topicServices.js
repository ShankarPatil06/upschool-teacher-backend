const {topicRepository,chapterRepository,teacherRepository,conceptRepository,digicardRepository,teachingActivityRepository} = require("../repository")
const teacherServices = require("../services/teacherServices");
const constant = require("../constants/constant");
const helper = require("../helper/helper");
const s3Services = require("./s3Service");

exports.topicUnlockService = async function (request, callback) {
  /** FETCH USER BY EMAIL **/

  teacherRepository.fetchTeacherByID(request, async function (individual_teacher_err, individual_teacher_response) {
    if (individual_teacher_err) {
      console.log(individual_teacher_err);
      callback(individual_teacher_err, individual_teacher_response);
    } else {
      if (individual_teacher_response.Items.length === 0) {
        callback(400, constant.messages.TEACHER_DOESNOT_EXISTS);
      } else {
        let teacher_info = individual_teacher_response.Items[0].teacher_info.filter((e) => e.client_class_id == request.data.client_class_id && e.section_id == request.data.section_id && e.subject_id == request.data.subject_id);

        if (teacher_info.length === 0) {
          callback(400,
            constant.messages.CLASS_SECTION_SUBJECT_COMBO_DOESNT_EXIST
          );
        } else {
          let chapter_data = teacher_info[0].chapter_data.filter(
            (e) => e.chapter_id == request.data.chapter_id
          );
          if (chapter_data.length == 0) {
            callback(400, constant.messages.CHAPTER_COMBO_DOESNT_EXISTS);
          } else {
            // Check for Post Learning - topic_details Here :

            let topic_data =
              chapter_data[0].post_learning.topic_details.filter(
                (e) => e.topic_id == request.data.topic_id
              );
            let tempObj;
            if (topic_data.length == 0) {
              tempObj = {
                topic_id: request.data.topic_id,
                topic_locked: request.data.topic_locked,
                due_date: {
                  yyyy_mm_dd: request.data.topic_locked == "Yes" ? "yyyy_mm_dd" : request.data.due_date,
                  dd_mm_yyyy: request.data.topic_locked == "Yes" ? "dd_mm_yyyy" : helper.change_dd_mm_yyyy(request.data.due_date),
                },
              };
              chapter_data[0].post_learning.topic_details.push(tempObj);
            } else {
              chapter_data[0].post_learning.topic_details.forEach(
                (ele, i) => {
                  if (ele.topic_id == request.data.topic_id) {
                    chapter_data[0].post_learning.topic_details[i] = {
                      topic_id: request.data.topic_id,
                      topic_locked: request.data.topic_locked,
                      due_date: {
                        yyyy_mm_dd: request.data.topic_locked == "Yes" ? "yyyy_mm_dd" : request.data.due_date,
                        dd_mm_yyyy: request.data.topic_locked == "Yes" ? "dd_mm_yyyy" : helper.change_dd_mm_yyyy(request.data.due_date),
                      },
                    };
                  }
                }
              );
            }
          }

          teacher_info[0].chapter_data.forEach((ele, i) => {
            if (ele.chapter_id == request.data.chapter_id) {
              teacher_info[0].chapter_data[i] = chapter_data[0];
            }
          });
          individual_teacher_response.Items[0].teacher_info.forEach(
            (ele, i) => {
              if (
                ele.client_class_id == request.data.client_class_id &&
                ele.section_id == request.data.section_id &&
                ele.subject_id == request.data.subject_id
              ) {
                individual_teacher_response.Items[0].teacher_info[i] =
                  teacher_info[0];
              }
            }
          );
          teacherRepository.updateTeacherInfo(
            {
              teacher_info: individual_teacher_response.Items[0].teacher_info,
              teacher_id: request.data.teacher_id,
            },
            async function (teacher_info_err, teacher_info_response) {
              if (teacher_info_err) {
                console.log(teacher_info_err);
                callback(teacher_info_err, teacher_info_response);
              } else {
                console.log("Success");
                callback(0, teacher_info_response);
              }
            }
          );
        }
      }
    }
  }
  );
};

exports.getDigicardsBasedonTopic = async function (request, callback) {

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

            digicardRepository.fetchDigiCardData(concept_digicard_id, async function (get_digicard_err, get_digicard_res) {
              if (get_digicard_err) {
                console.log(get_digicard_err);
                callback(get_digicard_err, get_digicard_res);
              } else {

                /** GET DEFAULT DIGICARD ORDER **/
                teacherServices.sortDigiCardsBasedonTopic(single_topic_response, topic_related_concept_response, get_digicard_res, (defaultOrderErr, defaultOrderData) => {
                  if (defaultOrderErr) {
                    console.log(defaultOrderErr);
                    callback(defaultOrderErr, defaultOrderData);
                  }
                  else {
                    /** S3 URLS **/
                    let digicardResponse = defaultOrderData.Items;

                    async function loop2(j) {
                      if (j < digicardResponse.length) {

                        if (digicardResponse[j].digicard_image && digicardResponse[j].digicard_image !== "" && digicardResponse[j].digicard_image !== "N.A." && digicardResponse[j].digicard_image.includes("uploads/")) {
                          digicardResponse[j].digicard_imageURL = await s3Services.getS3SignedUrl(digicardResponse[j].digicard_image);
                        }

                        delete digicardResponse[j].digicard_image;
                        j++;
                        loop2(j);
                      } else {

                        digicardResponse = await helper.removeDuplicatesFromArrayOfObj(digicardResponse, "digi_card_id");
                        /** SEND FINAL RESPONSE **/
                        exports.splitActiveAndArchivedDigicards(request, digicardResponse, (finalResErr, finalResData) => {
                          if (finalResErr) {
                            console.log(finalResErr);
                            callback(finalResErr, finalResData);
                          }
                          else {
                            console.log(finalResData);
                            callback(finalResErr, finalResData);
                          }
                        })
                        /** END SEND FINAL RESPONSE **/
                      }
                    }
                    loop2(0);
                    /** END S3 URLS **/
                  }
                })
                /** END GET DEFAULT DIGICARD ORDER **/
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

exports.splitActiveAndArchivedDigicards = async function (request, digicardList, callback) {
  console.log("DIGICARD LIST : ", digicardList);
  let reqData = request.data;
  teachingActivityRepository.fetchTeachingActivity(request, async function (teachActivity_err, teachActivity_response) {
    if (teachActivity_err) {
      console.log(teachActivity_err);
      callback(teachActivity_err, teachActivity_response);
    } else {
      let finalDigiList = {
        activeDigicards: [],
        archivedDigicards: []
      };

      let digicardActivities = teachActivity_response.Items.length > 0 && teachActivity_response.Items[0].digicard_activities ? teachActivity_response.Items[0].digicard_activities : [];

      let chapterData = digicardActivities.length > 0 ? digicardActivities.filter(chap => chap.chapter_id === reqData.chapter_id) : [];

      let prePostData = chapterData.length > 0 ? chapterData[0][reqData.learningType === constant.prePostConstans.preLearningVal ? constant.prePostConstans.preLearning : constant.prePostConstans.postLearning] : [];

      let topicData = prePostData.length > 0 ? prePostData.filter(prePost => prePost.topic_id === reqData.topic_id) : [];

      if (topicData.length > 0) {
        if (topicData[0].digicardOrder.length == 0) {
          await digicardList.map(defaultOrder => {
            topicData[0].digicardOrder.push(defaultOrder.digi_card_id);
          })
        }

        topicData[0].digicardOrder = await helper.removeDuplicates(topicData[0].digicardOrder);
        topicData[0].archivedDigicard = await helper.removeDuplicates(topicData[0].archivedDigicard);

        let AcitveCardOrder = await helper.getDifferenceValueFromTwoArray(topicData[0].digicardOrder, topicData[0].archivedDigicard);
        let archivedCards = topicData[0].archivedDigicard;

        let actDigiCard = [];
        let archivDigiCard = [];

        await AcitveCardOrder.map(async ActOrd => {
          actDigiCard = [];
          actDigiCard = await digicardList.filter(aDList => aDList.digi_card_id === ActOrd);
          if (actDigiCard.length > 0) {
            finalDigiList.activeDigicards.push(actDigiCard[0]);
          }
        })

        await archivedCards.map(async arcOrd => {
          archivDigiCard = [];
          archivDigiCard = await digicardList.filter(arDList => arDList.digi_card_id === arcOrd);
          if (archivDigiCard.length > 0) {
            finalDigiList.archivedDigicards.push(archivDigiCard[0]);
          }
        })

        console.log(finalDigiList);
        callback(0, finalDigiList);
      }
      else {
        finalDigiList.activeDigicards = digicardList;
        callback(0, finalDigiList);
      }
    }
  });
}

exports.splitActiveAndArchivedDigicards2 = async function (request, digicardList) {
  let reqData = request.data;
  try {
    let teachActivity_response = await teachingActivityRepository.fetchTeachingActivity2(request);

    let finalDigiList = {
      activeDigicards: [],
      archivedDigicards: []
    };

    let digicardActivities = teachActivity_response.Items.length > 0 && teachActivity_response.Items[0].digicard_activities
      ? teachActivity_response.Items[0].digicard_activities
      : [];

    let chapterData = digicardActivities.length > 0
      ? digicardActivities.filter(chap => chap.chapter_id === reqData.chapter_id)
      : [];

    let prePostData = chapterData.length > 0
      ? chapterData[0][reqData.learningType === constant.prePostConstans.preLearningVal
        ? constant.prePostConstans.preLearning
        : constant.prePostConstans.postLearning]
      : [];

    let topicData = prePostData.length > 0
      ? prePostData.filter(prePost => prePost.topic_id === reqData.topic_id)
      : [];

    if (topicData.length > 0) {
      if (topicData[0].digicardOrder.length === 0) {
        topicData[0].digicardOrder = digicardList.map(defaultOrder => defaultOrder.digi_card_id);
      }

      topicData[0].digicardOrder = await helper.removeDuplicates(topicData[0].digicardOrder);
      topicData[0].archivedDigicard = await helper.removeDuplicates(topicData[0].archivedDigicard);

      let activeCardOrder = await helper.getDifferenceValueFromTwoArray(
        topicData[0].digicardOrder,
        topicData[0].archivedDigicard
      );

      let archivedCards = topicData[0].archivedDigicard;

      finalDigiList.activeDigicards = digicardList.filter(d => activeCardOrder.includes(d.digi_card_id));
      finalDigiList.archivedDigicards = digicardList.filter(d => archivedCards.includes(d.digi_card_id));

      console.log(finalDigiList);
      return finalDigiList;
    } else {
      finalDigiList.activeDigicards = digicardList;
      return finalDigiList;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

exports.getTopicsBasedonChapters = async (request)=> {
  try {
    if (!Array.isArray(request.data.chapter_array) || request.data.chapter_array.length === 0) {
      throw helper.formatErrorResponse(constant.messages.INVALID_REQUEST_FORMAT, 400);
    }
         const chapter_array = request.data.chapter_array.map((val) => ({ "chapter_id": val }));
        const chapter_response = await chapterRepository.fetchChaptersIDandChapterTopicID2({ items: chapter_array ,condition:"OR"});
    if (chapter_response.Items.length === 0) {
      return chapter_response.Items;
    }

    const topic_array = chapter_response.Items.reduce((acc, e) => {
      acc.push(...e.prelearning_topic_id, ...e.postlearning_topic_id);
      return acc;
    }, []);
    const formatted_topic_array = topic_array.map((val) => ({ topic_id: val }));
    const topic_response = await topicRepository.fetchTopicIDDisplayTitleData2({items: formatted_topic_array ,condition:"OR"});
    return topic_response.Items;

  } catch (error) {
    console.error(error);
    throw helper.formatErrorResponse(error.message || constant.messages.INVALID_REQUEST_FORMAT, 400);
  }
};
