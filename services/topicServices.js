const { topicRepository, chapterRepository, teacherRepository, conceptRepository, digicardRepository, teachingActivityRepository } = require("../repository")
const teacherServices = require("../services/teacherServices");
const constant = require("../constants/constant");
const helper = require("../helper/helper");
const s3Services = require("./s3Service");

exports.topicUnlockService = async (request) =>{
  try {
    const individual_teacher_response = await teacherRepository.fetchTeacherByID2(request);

    if (helper.isEmptyArray(individual_teacher_response?.Items)) {
      throw { status: 400, message: constant.messages.TEACHER_DOESNOT_EXISTS };
    }

    let teacher_info = individual_teacher_response.Items[0].teacher_info.filter(
      (e) =>
        e.client_class_id == request.data.client_class_id &&
        e.section_id == request.data.section_id &&
        e.subject_id == request.data.subject_id
    );

    if (helper.isEmptyArray(teacher_info)) {
      throw { status: 400, message: constant.messages.CLASS_SECTION_SUBJECT_COMBO_DOESNT_EXIST };
    }

    let chapter_data = teacher_info[0].chapter_data.filter(
      (e) => e.chapter_id == request.data.chapter_id
    );

    if (helper.isEmptyArray(chapter_data)) {
      throw { status: 400, message: constant.messages.CHAPTER_COMBO_DOESNT_EXISTS };
    }

    let topic_data = chapter_data[0].post_learning.topic_details.filter(
      (e) => e.topic_id == request.data.topic_id
    );

    let tempObj;
    if (helper.isEmptyArray(topic_data)) {
      tempObj = {
        topic_id: request.data.topic_id,
        topic_locked: request.data.topic_locked,
        due_date: {
          yyyy_mm_dd:
            request.data.topic_locked == constant.common.Yes ? constant.common.YYYY_MM_DD: request.data.due_date,
          dd_mm_yyyy:
            request.data.topic_locked == constant.common.Yes
              ? constant.common.DD_MM_YYYY
              : helper.change_dd_mm_yyyy(request.data.due_date),
        },
      };
      chapter_data[0].post_learning.topic_details.push(tempObj);
    } else {
      chapter_data[0].post_learning.topic_details.forEach((ele, i) => {
        if (ele.topic_id == request.data.topic_id) {
          chapter_data[0].post_learning.topic_details[i] = {
            topic_id: request.data.topic_id,
            topic_locked: request.data.topic_locked,
            due_date: {
              yyyy_mm_dd:
                request.data.topic_locked == constant.common.Yes ? constant.common.YYYY_MM_DD: request.data.due_date,
              dd_mm_yyyy:
                request.data.topic_locked == constant.common.Yes
                  ? constant.common.DD_MM_YYYY
                  : helper.change_dd_mm_yyyy(request.data.due_date),
            },
          };
        }
      });
    }

    teacher_info[0].chapter_data.forEach((ele, i) => {
      if (ele.chapter_id == request.data.chapter_id) {
        teacher_info[0].chapter_data[i] = chapter_data[0];
      }
    });

    individual_teacher_response.Items[0].teacher_info.forEach((ele, i) => {
      if (
        ele.client_class_id == request.data.client_class_id &&
        ele.section_id == request.data.section_id &&
        ele.subject_id == request.data.subject_id
      ) {
        individual_teacher_response.Items[0].teacher_info[i] = teacher_info[0];
      }
    });

    const teacher_info_response = await teacherRepository.updateTeacherInfo2({
      teacher_info: individual_teacher_response.Items[0].teacher_info,
      teacher_id: request.data.teacher_id,
    });

    return teacher_info_response;
  } catch (error) {
    throw error;
  }
};

exports.getDigicardsBasedonTopic = async function (request) {
  try {
    if (!request?.data?.topic_id) {
      throw { status: 400, message: constant.messages.INVALID_REQUEST };
    }

    const singleTopicResponse = await topicRepository.fetchTopicByID2(request);
    if (helper.isEmptyArray(singleTopicResponse?.Items)) {
      throw { status: 404, message: constant.messages.TOPICS_NOT_FOUND };
    }

    const topicRelatedConceptResponse = await conceptRepository.fetchConceptData3(singleTopicResponse.Items[0]);
    if (helper.isEmptyArray(topicRelatedConceptResponse?.Items)) {
      throw { status: 404, message: constant.messages.NO_RELATED_CONCEPTS_FOUND };
    }

    const conceptDigicardIds = topicRelatedConceptResponse.Items.flatMap(e => e.concept_digicard_id);

    const digicardResponse = await digicardRepository.fetchDigiCardData2(conceptDigicardIds);
    if (helper.isEmptyArray(digicardResponse?.Items)) {
      throw { status: 404, message: constant.messages.NO_DIGICARDS_FOUND };
    }

    const defaultOrderData = await teacherServices.sortDigiCardsBasedonTopic(
      singleTopicResponse,
      topicRelatedConceptResponse,
      digicardResponse
    );

    if (helper.isEmptyArray(defaultOrderData?.Items)) {
      throw { status: 404, message: constant.messages.NO_SORTED_DIGICARDS_FOUND };
    }

    let digicardList = defaultOrderData.Items;

    for (let digicard of digicardList) {
      if (
        digicard.digicard_image &&
        digicard.digicard_image !== "" &&
        digicard.digicard_image !== constant.common.NA &&
        digicard.digicard_image.includes(constant.signedUrlConstants.uploads)
      ) {
        digicard.digicard_imageURL = await s3Services.getS3SignedUrl(digicard.digicard_image);
      }
      delete digicard.digicard_image;
    }

    digicardList = await helper.removeDuplicatesFromArrayOfObj(digicardList, constant.messages.DIGI_CARD_ID);

    const finalResponse = await exports.splitActiveAndArchivedDigicards(request, digicardList);

    return finalResponse;
  } catch (error) {
    return { status: error.status || 500, message: error.message || constant.messages.INTERNAL_SERVER_ERROR };
  }
};

exports.splitActiveAndArchivedDigicards = async (request, digicardList) => {
  let reqData = request.data;
  try {
    let teachActivity_response = await teachingActivityRepository.fetchTeachingActivity2(request);

    let finalDigiList = {
      activeDigicards: [],
      archivedDigicards: []
    };

    let digicardActivities = !helper.isEmptyArray(teachActivity_response.Items) && teachActivity_response.Items[0].digicard_activities
      ? teachActivity_response.Items[0].digicard_activities
      : [];

    let chapterData = !helper.isEmptyArray(digicardActivities)
      ? digicardActivities.filter(chap => chap.chapter_id === reqData.chapter_id)
      : [];

    let prePostData = !helper.isEmptyArray(chapterData)
      ? chapterData[0][reqData.learningType === constant.prePostConstans.preLearningVal
        ? constant.prePostConstans.preLearning
        : constant.prePostConstans.postLearning]
      : [];

    let topicData = !helper.isEmptyArray(prePostData)
      ? prePostData.filter(prePost => prePost.topic_id === reqData.topic_id)
      : [];

    if (!helper.isEmptyArray(topicData)) {
      if (helper.isEmptyArray(topicData[0].digicardOrder)) {
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

exports.getTopicsBasedonChapters = async (request) => {
  try {
    if (!Array.isArray(request.data.chapter_array) || helper.isEmptyArray(request.data.chapter_array)) {
      throw helper.formatErrorResponse(constant.messages.INVALID_REQUEST_FORMAT, 400);
    }
    const chapter_array = request.data.chapter_array.map((val) => ({ chapter_id: val }));
    const chapter_response = await chapterRepository.fetchChaptersIDandChapterTopicID2({ items: chapter_array, condition: constant.common.OR });
    if (helper.isEmptyArray(chapter_response.Items)) {
      return chapter_response.Items;
    }

    const topic_array = chapter_response.Items.reduce((acc, e) => {
      acc.push(...e.prelearning_topic_id, ...e.postlearning_topic_id);
      return acc;
    }, []);

    const formatted_topic_array = topic_array.map((val) => ({ topic_id: val }));
    const topic_response = await topicRepository.fetchTopicIDDisplayTitleData2({ items: formatted_topic_array, condition: constant.common.OR });
    return topic_response.Items;

  } catch (error) {
    throw helper.formatErrorResponse(error.message || constant.messages.INVALID_REQUEST_FORMAT, 400);
  }
};