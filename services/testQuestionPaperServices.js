const { blueprintRepository, testQuestionPaperRepository, commonRepository } = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { TABLE_NAMES } = require('../constants/tables');

exports.fetchTestQuestionPapersBasedonStatus = (request, callback) => {

  testQuestionPaperRepository.getTestQuestionPapersBasedonStatus(request, async function (test_question_paper_err, test_question_paper_res) {
    if (test_question_paper_err) {
      console.log(test_question_paper_err);
      callback(test_question_paper_err, test_question_paper_res);
    } else {

      if (test_question_paper_res.Items.length > 0) {

        let blueprint_array = await test_question_paper_res.Items.map((e) => e.blueprint_id);

        blueprintRepository.fetchBluePrintData({ blueprint_array: blueprint_array }, async function (fetch_blue_print_err, fetch_blue_print_res) {
          if (fetch_blue_print_err) {
            console.log(fetch_blue_print_err);
            callback(fetch_blue_print_err, fetch_blue_print_res);
          } else {

            await test_question_paper_res.Items.forEach((test_paper, index) => {
              let bluePrint = fetch_blue_print_res.Items.filter((blue_print) => blue_print.blueprint_id === test_paper.blueprint_id)
              if (bluePrint.length > 0) {
                test_question_paper_res.Items[index].blueprint_name = bluePrint[0].blueprint_name
                delete test_question_paper_res.Items[index].blueprint_id;
              }
            })
            callback(200, test_question_paper_res.Items);
          }
        })
      } else {
        callback(200, test_question_paper_res.Items);
      }
    }
  })
}

exports.fetchTestQuestionPapersBasedonStatus2 = async (request) => {

  const testQuestionPaperRes = await testQuestionPaperRepository.getTestQuestionPapersBasedonStatus2(request);

  console.log("testQuestionPaperRes - ", testQuestionPaperRes);
  if (!testQuestionPaperRes || testQuestionPaperRes.length === 0) {
    return [];
  }

  let blueprintArray = [...new Set(testQuestionPaperRes.map((e) => e.blueprint_id))];

  blueprintArray = blueprintArray.filter(blueprint => blueprint !== undefined);

  const fetchBluePrintRes = await blueprintRepository.fetchBluePrintData3({ blueprint_array: blueprintArray });

  console.log("fetchBluePrintRes - ", fetchBluePrintRes);

  testQuestionPaperRes.forEach((testPaper) => {
    const bluePrint = fetchBluePrintRes.find((bp) => bp.blueprint_id === testPaper.blueprint_id);
    console.log("bluePrint - ", bluePrint);
    if (bluePrint) {
      testPaper.blueprint_name = bluePrint.blueprint_name;
      delete testPaper.blueprint_id;
    }
  });

  return testQuestionPaperRes;
};

exports.addTestQuestionPaper = (request, callback) => {

  testQuestionPaperRepository.fetchTestQuestionPaperbyName(request, function (fetch_question_paper_err, fetch_question_paper_res) {
    if (fetch_question_paper_err) {
      console.log(fetch_question_paper_err);
      callback(fetch_question_paper_err, fetch_question_paper_res);
    } else {
      if (fetch_question_paper_res.Items.length === 0) {

        testQuestionPaperRepository.insertTestQuestionPaper(request, function (add_question_paper_err, add_question_paper_res) {
          if (add_question_paper_err) {
            console.log(add_question_paper_err);
            callback(add_question_paper_err, add_question_paper_res);
          } else {
            callback(add_question_paper_err, add_question_paper_res);
          }
        })
      } else {
        callback(400, constant.messages.TEST_QUESTION_PAPER_NAME_ALREADY_EXISTS);
      }
    }
  })
}

exports.addTestQuestionPaper2 = async (request) => {

  console.log("request - ", request);

  const fetchQuestionPaperRes = await testQuestionPaperRepository.fetchTestQuestionPaperbyName2(request);

  console.log("fetchQuestionPaperRes - ", fetchQuestionPaperRes);
  if (fetchQuestionPaperRes.Items.length > 0 && request.section_id == fetchQuestionPaperRes.Items[0].section_id) {
    return {
      statusCode: 400,
      message: constant.messages.TEST_QUESTION_PAPER_NAME_ALREADY_EXISTS,
    };
  }
  const addQuestionPaperRes = await testQuestionPaperRepository.insertTestQuestionPaper2(request);

  return {
    statusCode: 200,
    data: addQuestionPaperRes,
  };

};

exports.validateQuestionPaperName = (request, callback) => {

  testQuestionPaperRepository.fetchTestQuestionPaperbyName(request, function (fetch_question_paper_err, fetch_question_paper_res) {
    if (fetch_question_paper_err) {
      console.log(fetch_question_paper_err);
      callback(fetch_question_paper_err, fetch_question_paper_res);
    } else {
      if (fetch_question_paper_res.Items.length === 0) {
        callback(0, 200);
      } else {
        callback(400, constant.messages.TEST_QUESTION_PAPER_NAME_ALREADY_EXISTS);
      }
    }
  })
}

exports.validateQuestionPaperName2 = async (request) => {

  const fetchQuestionPaperRes = await testQuestionPaperRepository.fetchTestQuestionPaperbyName2(request);

  if (fetchQuestionPaperRes.Items.length === 0) {
    return { statusCode: 200 };
  } else {
    return {
      statusCode: 400,
      message: constant.messages.TEST_QUESTION_PAPER_NAME_ALREADY_EXISTS,
    };
  }

};

// exports.viewTestQuestionPaper = (request, callback) => {

//   testQuestionPaperRepository.fetchTestQuestionPaperByID(request, function (fetch_question_paper_err, fetch_question_paper_res) {
//     if (fetch_question_paper_err) {
//       console.log(fetch_question_paper_err);
//       callback(fetch_question_paper_err, fetch_question_paper_res);
//     } else {
//       console.log(fetch_question_paper_res.Items[0]);

//       if (fetch_question_paper_res.Items.length > 0) {
//         let questionsData = JSON.parse(JSON.stringify(fetch_question_paper_res.Items[0].questions));
//         let queationIDs = [];

//         async function fetchAllQuestionIDs(i) {
//           if (i < questionsData.length) {
//             queationIDs = queationIDs.concat(await questionsData[i].question_id.map(ques => ques));
//             i++;
//             fetchAllQuestionIDs(i);
//           }
//           else {
//             queationIDs = helper.removeDuplicates(queationIDs);

//             /** FETCH Questions DATA **/
//             let fetchBulkCatReq = {
//               IdArray: queationIDs,
//               fetchIdName: "question_id",
//               TableName: TABLE_NAMES.upschool_question_table,
//               projectionExp: ["question_id", "question_content", "answers_of_question", "question_type", "marks", "display_answer"]
//             }

//             commonRepository.fetchBulkDataWithProjection(fetchBulkCatReq, async function (fetch_questions_err, fetch_questions_res) {
//               if (fetch_questions_err) {
//                 console.log(fetch_questions_err);
//                 callback(fetch_questions_err, fetch_questions_res);
//               } else {

//                 /** SET FINAL Question Paper View DATA **/
//                 exports.setQuestionPaperView(questionsData, fetch_questions_res.Items, (questionsErr, questionsRes) => {
//                   if (questionsErr) {
//                     console.log(questionsErr);
//                     callback(questionsErr, questionsRes);
//                   }
//                   else {
//                     console.log(questionsRes);
//                     fetch_question_paper_res.Items[0].questions = questionsRes
//                     callback(questionsErr, fetch_question_paper_res);
//                   }
//                 })
//                 /** END SET FINAL Question Paper View DATA **/
//               }
//             })
//             /** END FETCH Questions DATA **/
//           }
//         }
//         fetchAllQuestionIDs(0);
//       }
//       else {
//         console.log(constant.messages.NO_DATA);
//         callback(400, constant.messages.NO_DATA);
//       }

//     }
//   })
// }

exports.viewTestQuestionPaper2 = async (request) => {
  const fetchQuestionPaperRes = await testQuestionPaperRepository.fetchTestQuestionPaperByID2(request);

  if (!fetchQuestionPaperRes.Items || fetchQuestionPaperRes.Items.length === 0) {
    return { statusCode: 400, message: constant.messages.NO_DATA };
  }

  const questionPaper = fetchQuestionPaperRes.Items[0];
  const { blueprint_id, questions } = questionPaper;

  // Fetch blueprint data (for section/question instructions)
  const blueprintData = await blueprintRepository.fetchBlueprintById2({ data: { blueprint_id } });

  // Collect all question IDs including Sub & OR
  let questionIDs = [];
  questions.forEach(section => {
    section.question_id.forEach(q => {
      if (typeof q === "string") questionIDs.push(q);
      else if (q["Sub-Question"]) questionIDs.push(...q["Sub-Question"]);
      else if (q["OR Question"]) questionIDs.push(...q["OR Question"]);
    });
  });
  questionIDs = helper.removeDuplicates(questionIDs);

  if (questionIDs.length === 0) return fetchQuestionPaperRes;

  // Fetch question data from question table
  const fetchBulkCatReq = {
    IdArray: questionIDs,
    fetchIdName: "question_id",
    TableName: TABLE_NAMES.upschool_question_table,
    projectionExp: [
      "question_id",
      "question_content",
      "answers_of_question",
      "question_type",
      "marks",
      "display_answer",
      "sub_questions"
    ]
  };

  const fetchQuestionsRes = await commonRepository.fetchBulkDataWithProjection3(fetchBulkCatReq);

  if (!fetchQuestionsRes || fetchQuestionsRes.length === 0) {
    return { statusCode: 400, message: "Questions not found." };
  }

  // Generate final structured data
  const structuredData = await exports.setQuestionPaperView2(questions, fetchQuestionsRes, blueprintData);

  questionPaper.questions = structuredData;
  return fetchQuestionPaperRes;
};


exports.setQuestionPaperView = (questionsSectionData, questionData, callback) => {

  let tempQuestionArr = [];
  let individualQuestion = [];

  function setSectionsData(i) {

    tempQuestionArr = [];

    if (i < questionsSectionData.length) {
      async function setQuestionsData(j) {
        individualQuestion = [];
        if (j < questionsSectionData[i].question_id.length) {
          individualQuestion = questionData.filter(value => value.question_id === questionsSectionData[i].question_id[j])[0];

          await helper.getAnswerContentFileUrl(individualQuestion.answers_of_question)
            .then(url => {
              individualQuestion.answers_of_question = url;
              tempQuestionArr.push(individualQuestion);
              j++;
              setQuestionsData(j);
            })
            .catch(err => {
              individualQuestion.answers_of_question = "N.A.";
              tempQuestionArr.push(individualQuestion);
              j++;
              setQuestionsData(j);
            });

        } else {
          questionsSectionData[i].questions = tempQuestionArr;
          i++;
          setSectionsData(i);
        }
      } setQuestionsData(0);

    } else {

      callback(0, questionsSectionData);

    }

  } setSectionsData(0);

}

exports.setQuestionPaperView2 = async (sectionsData, questionData, blueprintData) => {
  const result = [];

  for (let s = 0; s < sectionsData.length; s++) {
    const section = sectionsData[s];
    const structuredQuestions = [];
    let questionNumber = 1;

    for (const qItem of section.question_id) {
      // CASE 1: General Question
      if (typeof qItem === "string") {
        const q = await resolveSingleQuestion(qItem, questionData);
        structuredQuestions.push({
          question_structure_type: "General Question",
          question_number: `${questionNumber++}`,
          ...q
        });
      }

      // CASE 2: Sub-Question
      else if (qItem["Sub-Question"]) {
        const subQuestionIds = qItem["Sub-Question"];
        const subQuestions = await Promise.all(
          subQuestionIds.map(async (id) => {
            const q = await resolveSingleQuestion(id, questionData);
            return { question_structure_type: "General Question", ...q };
          })
        );

        const blueprintInstruction = getBlueprintInstruction(blueprintData, section.section_name, "Sub-Question");

        structuredQuestions.push({
          question_structure_type: "Sub-Question",
          question_number: `${questionNumber++}`,
          question_description: blueprintInstruction || "Answer all the following:",
          sub_questions: subQuestions
        });
      }

      // CASE 3: OR Question
      else if (qItem["OR Question"]) {
        const orQuestionIds = qItem["OR Question"];
        const orQuestions = await Promise.all(
          orQuestionIds.map(async (id) => {
            const q = await resolveSingleQuestion(id, questionData);
            return { question_structure_type: "General Question", ...q };
          })
        );

        const blueprintInstruction = getBlueprintInstruction(blueprintData, section.section_name, "OR Question");

        structuredQuestions.push({
          question_structure_type: "OR Question",
          question_description: blueprintInstruction || "Answer any one:",
          or_questions: orQuestions
        });
      }
    }

    result.push({
      section_name: section.section_name,
      questions: structuredQuestions
    });
  }

  return result;
};
// Helper to resolve a single question
async function resolveSingleQuestion(questionId, questionData) {
  const q = questionData.find(v => v.question_id === questionId) || {};

  try {
    if (q.answers_of_question) {
      const url = await helper.getAnswerContentFileUrl(q.answers_of_question);
      q.answers_of_question = url;
    }
  } catch (err) {
    q.answers_of_question = "N.A.";
    console.error(`Error fetching answer content for question ID ${questionId}:`, err);
  }

  return q;
}
// fetch instructions from blueprint
function getBlueprintInstruction(blueprintData, sectionName, type) {
  if (!blueprintData || !blueprintData.Items || blueprintData.Items.length === 0)
    return null;

  const blueprint = blueprintData.Items[0];
  const section = (blueprint.sections || []).find(
    (s) => s.section_name === sectionName
  );

  if (!section) return null;

  if (type === "Sub-Question") {
    return section.sub_question_description || section.sub_question_instruction;
  }

  if (type === "OR Question") {
    return section.or_question_description || section.or_question_instruction;
  }

  return null;
}


exports.toggleQuestionPaperBasedOnId = function (request, callback) {
  testQuestionPaperRepository.getClassTestsBasedonIds(request, function (fetch_class_test_err, fetch_class_test_response) {
    if (fetch_class_test_err) {
      console.log("getClassTestsBasedonIds", fetch_class_test_err);
    } else {
      if (fetch_class_test_response.Items.length === 0) {
        testQuestionPaperRepository.updateQuestionPaperStatus(request, function (update_question_err, update_question_response) {
          if (update_question_err) {
            console.log("update_question_err", update_question_err);
          } else {
            console.log("update_question_response", update_question_response);
            callback(update_question_err, update_question_response)
          }
        })
      } else {
        callback(400, fetch_class_test_response)
      }
    }
  })
}

exports.toggleQuestionPaperBasedOnId2 = async (request) => {

  const fetchClassTestResponse = await testQuestionPaperRepository.getClassTestsBasedonIds2(request);

  console.log("fetchClassTestResponse - ", fetchClassTestResponse);
  if (fetchClassTestResponse.Items.length === 0) {
    const updateQuestionResponse = await testQuestionPaperRepository.updateQuestionPaperStatus2(request);
    console.log("update_question_response", updateQuestionResponse);
    return { statusCode: 200, body: updateQuestionResponse };
  } else {
    return { statusCode: 400, body: fetchClassTestResponse };
  }
};
