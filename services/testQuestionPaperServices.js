const { blueprintRepository, testQuestionPaperRepository, commonRepository } = require("../repository")
const { messages, requestData, common } = require('../constants/constant');
const { isEmptyArray, getAnswerContentFileUrl, removeDuplicates } = require('../helper/helper');
const { TABLE_NAMES } = require('../constants/tables');

exports.fetchTestQuestionPapersBasedonStatus2 = async (request) => {

  const testQuestionPaperRes = await testQuestionPaperRepository.getTestQuestionPapersBasedonStatus2(request);

  if (isEmptyArray(testQuestionPaperRes)) {
    return [];
  }

  let blueprintArray = [...new Set(testQuestionPaperRes.map((e) => e.blueprint_id))];

  blueprintArray = blueprintArray.filter(blueprint => blueprint !== undefined);

  const fetchBluePrintRes = await blueprintRepository.fetchBluePrintData3({ blueprint_array: blueprintArray });

  testQuestionPaperRes.forEach((testPaper) => {
    const bluePrint = fetchBluePrintRes.find((bp) => bp.blueprint_id === testPaper.blueprint_id);
    if (bluePrint) {
      testPaper.blueprint_name = bluePrint.blueprint_name;
      delete testPaper.blueprint_id;
    }
  });

  return testQuestionPaperRes;
};

exports.addTestQuestionPaper2 = async (request) => {

  const fetchQuestionPaperRes = await testQuestionPaperRepository.fetchTestQuestionPaperbyName2(request);

  if (isEmptyArray(fetchQuestionPaperRes.Items) && request.section_id == fetchQuestionPaperRes.Items[0].section_id) {
    return {
      statusCode: 400,
      message: messages.TEST_QUESTION_PAPER_NAME_ALREADY_EXISTS,
    };
  }
  const addQuestionPaperRes = await testQuestionPaperRepository.insertTestQuestionPaper2(request);
  return {
    statusCode: 200,
    data: addQuestionPaperRes,
  };
};

exports.validateQuestionPaperName2 = async (request) => {

  const fetchQuestionPaperRes = await testQuestionPaperRepository.fetchTestQuestionPaperbyName2(request);

  if (!isEmptyArray(fetchQuestionPaperRes.Items)) {
    return { statusCode: 200 };
  } else {
    return {
      statusCode: 400,
      message: messages.TEST_QUESTION_PAPER_NAME_ALREADY_EXISTS,
    };
  }
};

exports.viewTestQuestionPaper2 = async (request) => {

  const fetchQuestionPaperRes = await testQuestionPaperRepository.fetchTestQuestionPaperByID2(request);

  if (isEmptyArray(fetchQuestionPaperRes.Items)) {
    return { statusCode: 400, message: messages.NO_DATA };
  }

  const questionsData = fetchQuestionPaperRes.Items[0].questions;
  let questionIDs = [];

  questionsData.forEach(questionSet => {
    if (Array.isArray(questionSet.question_id)) {
      questionIDs = questionIDs.concat(questionSet.question_id);
    }
  });

  questionIDs = removeDuplicates(questionIDs);

  if (isEmptyArray(questionIDs)) {
    return fetchQuestionPaperRes;
  }

  const fetchBulkCatReq = {
    IdArray: questionIDs,
    fetchIdName: requestData.questionId,
    TableName: TABLE_NAMES.upschool_question_table,
    projectionExp: [requestData.questionId, requestData.questionContent, requestData.answersOfQuestion, requestData.questionType, requestData.marks, requestData.displayAnswer]
  };

  const fetchQuestionsRes = await commonRepository.fetchBulkDataWithProjection3(fetchBulkCatReq);


  if (isEmptyArray(fetchQuestionsRes)) {
    return { statusCode: 400, message: messages.QUESTIONS_NOT_FOUND };
  }

  const finalQuestionsData = await exports.setQuestionPaperView2(questionsData, fetchQuestionsRes);

  fetchQuestionPaperRes.Items[0].questions = finalQuestionsData;

  return fetchQuestionPaperRes;
};

exports.setQuestionPaperView2 = async (questionsSectionData, questionData) => {
  const tempQuestionArr = [];

  for (let i = 0; i < questionsSectionData.length; i++) {
    const section = questionsSectionData[i];

    const questionsPromises = section.question_id.map(async (questionId) => {
      const individualQuestion = questionData.find(value => value.question_id === questionId) || {};

      try {
        if (individualQuestion.answers_of_question) {
          const url = await getAnswerContentFileUrl(individualQuestion.answers_of_question);
          individualQuestion.answers_of_question = url;
        }
      } catch (err) {
        individualQuestion.answers_of_question = common.NA;
      }

      return individualQuestion;
    });

    const resolvedQuestions = await Promise.all(questionsPromises);

    questionsSectionData[i].questions = resolvedQuestions;
  }

  return questionsSectionData;
};

exports.toggleQuestionPaperBasedOnId2 = async (request) => {

  const fetchClassTestResponse = await testQuestionPaperRepository.getClassTestsBasedonIds2(request);

  if (isEmptyArray(fetchClassTestResponse.Items)) {
    const updateQuestionResponse = await testQuestionPaperRepository.updateQuestionPaperStatus2(request);
    return { statusCode: 200, body: updateQuestionResponse };
  } else {
    return { statusCode: 400, body: fetchClassTestResponse };
  }
};
