const quizRepository = require("../repository/quizRepository");
const quizResultRepository = require("../repository/quizResultRepository");
const classTestServices = require("./classTestServices");
const constant = require("../constants/constant");
const helper = require('../helper/helper');
const { request } = require("http");
const commonRepository = require("../repository/commonRepository");
const { TABLE_NAMES } = require('../constants/tables');
const schoolRepository = require("../repository/schoolRepository");
const studentRepository = require("../repository/studentRepository");
const classTestRepository = require("../repository/classTestRepository");
const s3Services = require("./s3Service");

const { OpenAI } = require('openai');

// Initialize OpenAI Client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY, // Replace with your actual OpenAI API key
});

exports.checkDuplicateQuizName = async (request) => {
    const quizData_response = await quizRepository.checkDuplicateQuizName2(request)
    if (quizData_response.Items.length > 0) {
        throw helper.formatErrorResponse(constant.messages.DUPLICATE_QUIZ_NAME, 400);
    }
    return quizData_response
}

exports.updateQuizStatus = async (request) => {
    if (request.data.quiz_status !== constant.status.active) {
        return await quizRepository.updateQuizStatus2(request);
    }

    const preQuiz_response = await quizRepository.fetchQuizDataById2(request);
    if (!preQuiz_response.Item) throw new Error('Error fetching preQuiz data');

    const { client_class_id, chapter_id, subject_id, section_id, learningType, selectedTopics } = preQuiz_response.Item;
    Object.assign(request.data, { client_class_id, chapter_id, subject_id, section_id, learningType });

    const quizRes = await quizRepository.fetchQuizData2(request);
    if (quizRes.Items.length > 0) {
        if (learningType === constant.prePostConstans.preLearningVal) {
            throw new Error(constant.messages.PRE_QUIZ_ALREADY_GENERATED);
        }

        const resSelectedTop = quizRes.Items.flatMap(qData => qData.selectedTopics);
        const duplicatedTopics = await checkDuplicateTopics(resSelectedTop, selectedTopics);

        if (duplicatedTopics.length > 0) {
            throw new Error(constant.messages.POST_QUIZ_ALREADY_GENERATED);
        }
    }

    const statusRes = await quizRepository.updateQuizStatus2(request);
    console.log("status updated");
    return statusRes;
};


const checkDuplicateTopics = async (resTopics, checkTopics) => {
    let dupTopics = [];
    await checkTopics.forEach(cArr => {
        dupTopics = [...dupTopics, ...resTopics.filter(resTopics => resTopics.topic_id === cArr.topic_id)];
    })

    return dupTopics;
}

exports.fetchQuizBasedonStatus = async (request) => {
    try {
        // return await new Promise((resolve) => {
        return quizRepository.getQuizBasedonStatus2(request)
        //         if (response?.Items?.length > 0) {
        //             resolve(response?.Items);
        //         } else {
        //             resolve(response?.Items);
        //         }
        //     });
        // });
    } catch (error) {
        console.error("Error in fetchQuizBasedonStatus:", error);
        throw error;
    }
}

exports.getQuizResult = async (request) => {

    const result_response = await quizRepository.getQuizResult2(request);
    if (result_response.Items.length)
        await Promise.all(result_response.Items[0].answer_metadata.map(async (result) => {
            result.content_url = await s3Services.getS3SignedUrl(result.url);
            console.log(result.content_url)
        }));
    return result_response;
}


exports.editStudentQuizMarks = async (request) => {
    console.log("request000", request.data.marks_details[0].qa_details);

    try {
        const quizTestRes = await quizRepository.fetchQuizDataById2(request);
        // console.log("quizTestRes", quizTestRes.Item.question_track_details);        

        if (quizTestRes.Item.quiz_status !== "Active") {
            throw helper.formatErrorResponse(constant.messages.NO_DATA, 400);
        }

        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
        console.log("schoolDataRes", schoolDataRes.Items[0].pre_quiz_config);

        let classPassPercentage = 0;
        let passPassPercentage = 0;
        let groupPassPercentage = {};
        if (quizTestRes.Item.learningType === constant.prePostConstans.preLearningVal) {
            classPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].pre_quiz_config.group_pass_percentage
        } else {
            classPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].post_quiz_config.group_pass_percentage
        }

        const questionIds = request.data.marks_details[0].qa_details.map(qDetails => qDetails.question_id);
        // console.log("questionIds", questionIds);

        const fetchBulkQtnReq = {
            IdArray: questionIds,
            fetchIdName: "question_id",
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: ["question_id", "marks"]
        };

        const quizIds = fetchBulkQtnReq.IdArray.map((val) => ({ question_id: val }));
        console.log("quizIds", quizIds);

        const questionDataRes = await commonRepository.fetchBulkDataWithProjection2({ items: quizIds, condition: "OR" })
        console.log("questionDataRes", questionDataRes);

        const overallResult = await knowPassOrFail(request.data.marks_details[0], questionDataRes, classPassPercentage, passPassPercentage);
        request.data.marks_details[0].totalMark = overallResult.totalMarks;
        request.data.marks_details[0].expectedMarks = overallResult.expectedMarks;
        request.data.passStatus = overallResult.isPassed;

        const basicThreshold = groupPassPercentage.Basic / 100;
        const intermediateThreshold = groupPassPercentage.Intermediate / 100;
        const advancedThreshold = groupPassPercentage.Advanced / 100;

        let basicQuestions = 0, basicMarks = 0, basicObtained = 0;
        let intermediateQuestions = 0, intermediateMarks = 0, intermediateObtained = 0;
        let advancedQuestions = 0, advancedMarks = 0, advancedObtained = 0;

        const questionMarksMap = {};

        questionDataRes?.forEach(question => {
            if (question.question_id && typeof question.marks === 'number') {
                console.log("question.question_id", question.question_id);

                questionMarksMap[question.question_id] = question.marks;
            }
        });

        let questionSetData = [];

        request.data.marks_details.forEach((req) => {
            const { set_key } = req;
            if (quizTestRes.Item.question_track_details[set_key]) {
                questionSetData = quizTestRes.Item.question_track_details[set_key];
                req.qa_details.forEach((question) => {
                    const matchingQuestion = questionSetData.find(q => q.question_id === question.question_id);
                    if (matchingQuestion) {
                        question.type = matchingQuestion.type;
                    }
                });
            } else {
                console.log(`set_key: ${set_key} not found in quizTestRes`);
            }
        });

        request.data.marks_details.forEach(markDetail => {
            markDetail.qa_details.forEach((question) => {
                const marksPerQuestion = questionMarksMap[question.question_id] || 0;

                console.log("question - ", question);
                // console.log("marksPerQuestion - ", marksPerQuestion);
                // console.log("question.obtained_marks - ", question.modified_marks, " - question.type - ", question.type);
                switch (question.type) {
                    case 'Basic':
                        basicQuestions += 1;
                        basicMarks += marksPerQuestion;
                        basicObtained += question.modified_marks !== 'N.A.' ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                    case 'Intermediate':
                        intermediateQuestions += 1;
                        intermediateMarks += marksPerQuestion;
                        intermediateObtained += question.modified_marks !== 'N.A.' ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                    case 'Advanced':
                        advancedQuestions += 1;
                        advancedMarks += marksPerQuestion;
                        advancedObtained += question.modified_marks !== 'N.A.' ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                }
            });
        });
        console.log("basicQuestions - ", basicObtained, basicMarks, basicThreshold);
        console.log("intermediateQuestions - ", intermediateObtained, intermediateMarks, intermediateThreshold);
        console.log("advancedQuestions - ", advancedObtained, advancedMarks, advancedThreshold);

        const individualGroupPerformance = {
            Basic: {
                Ispassed: basicObtained >= basicMarks * basicThreshold,
                no_of_questions: basicQuestions,
                total_mark: basicMarks,
                total_obtained_mark: basicObtained
            },
            Intermediate: {
                Ispassed: intermediateObtained >= intermediateMarks * intermediateThreshold,
                no_of_questions: intermediateQuestions,
                total_mark: intermediateMarks,
                total_obtained_mark: intermediateObtained
            },
            Advanced: {
                Ispassed: advancedObtained >= advancedMarks * advancedThreshold,
                no_of_questions: advancedQuestions,
                total_mark: advancedMarks,
                total_obtained_mark: advancedObtained
            }
        };

        console.log("individualGroupPerformance - ", individualGroupPerformance);
        // Add the individualGroupPerformance object to the res object
        request.data.individual_group_performance = individualGroupPerformance;

        const fetchQuizDataRes = await quizRepository.modifyStudentMarks2(request);
        return fetchQuizDataRes.Items;

    } catch (error) {
        console.log(error);
        throw helper.formatErrorResponse(error.message || constant.messages.NO_DATA, 400);
    }
};



exports.viewQuizQuestionPaper = async (request) => {
    try {
        // Fetch quiz result data of student
        // const schoolInfo = await schoolRepository.getSchoolDetailsById2(request)
        const fetchQuizResultData = await quizResultRepository.fetchQuizResultDataOfStudent2(request);
        if (!fetchQuizResultData || fetchQuizResultData.Items.length === 0) {
            throw new Error(constant.messages.NO_ANSWER_SHEET_FOUND);
        }

        const quizType = fetchQuizResultData.Items[0].quiz_set;
        const quizSetName = await helper.fetchQuizSetName(quizType);

        // Fetch quiz data by ID
        const fetchQuizDataResponse = await quizRepository.fetchQuizDataById2(request);
        if (helper.isEmptyObject(fetchQuizDataResponse.Item)) {
            throw new Error(constant.messages.COULDNOT_READ_QUIZ_ID);
        }
        // Extract question details
        const questionsData = fetchQuizDataResponse.Item.quiz_question_details[quizSetName];
        const questionIDs = helper.removeDuplicates(questionsData);
        // Fetch questions data
        const fetchBulkCatReq = {
            IdArray: questionIDs,
            fetchIdName: "question_id",
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: ["question_id", "question_content", "answers_of_question", "question_type", "marks", "display_answer"]
        };
        const questionIds = fetchBulkCatReq.IdArray.map((val) => ({ question_id: val }));
        const fetchQuestionsRes = await commonRepository.fetchBulkDataWithProjection3(fetchBulkCatReq);
        console.log("LENGTh", questionIds.length, fetchQuestionsRes.length)
        const questionsRes = await exports.setQuestionPaperView(questionIDs, fetchQuestionsRes);
        // return { Items: questionsRes ,predictive_evaluation : schoolInfo?.Items[0].school_subscribtion_feature.predictive_evaluation};
        return { Items: questionsRes };

    } catch (error) {
        console.error(error);
        throw helper.formatErrorResponse(error.message || constant.messages.DEFAULT_ERROR, 400);
    }
};


exports.setQuestionPaperView = async (questionIDs, questionData) => {

    const individualQuestions = await Promise.all(
        questionIDs.map(async (questionID) => {
            const matchedQuestion = questionData.find((q) => q.question_id === questionID);

            if (!matchedQuestion) return null;

            try {
                const url = await helper.getAnswerContentFileUrl(matchedQuestion.answers_of_question);
                matchedQuestion.answers_of_question = url;
            } catch (err) {
                matchedQuestion.answers_of_question = "N.A.";
            }

            return matchedQuestion;
        })
    );

    return individualQuestions.filter(q => q !== null); // Remove null values (if any question IDs did not match)
};


exports.fetchQuizTemplates = async (request) => {
    try {
        // if(!request.data.quiz_status)
        // request.data.quiz_status = "Active";
        console.log("request - ", request);
        const quizRes = await quizRepository.fetchQuizTemplates2(request);
        console.log("quizRes", quizRes);

        if (quizRes.Items[0]?.quiz_template_details) {
            for (let k = 97; k <= 99; k++) {
                const set_code = String.fromCharCode(k);
                const questionSheetKey = `set_${set_code}`;
                const quizTemplate = quizRes.Items[0].quiz_template_details[questionSheetKey] || {};

                const questionTemp = quizTemplate.question_sheet || "N.A.";
                const questionUrlCheck = constant.quizFolder[`questionPapersSet${set_code.toUpperCase()}`].split("/")[0];
                quizTemplate.question_sheet_url = questionTemp.includes(questionUrlCheck)
                    ? await s3Services.getS3SignedUrl(questionTemp)
                    : "N.A.";

                const answerTemp = quizTemplate.answer_sheet || "N.A.";
                const answerUrlCheck = constant.quizFolder[`questionPapersSet${set_code.toUpperCase()}`].split("/")[0];
                quizTemplate.answer_sheet_url = answerTemp.includes(answerUrlCheck)
                    ? await s3Services.getS3SignedUrl(answerTemp)
                    : "N.A.";

                const keyanswerTemp = quizTemplate.key_answer || "N.A.";
                const keyanswerUrlCheck = constant.quizFolder[`questionPapersSet${set_code.toUpperCase()}`].split("/")[0];
                quizTemplate.key_answer_url = answerTemp.includes(keyanswerUrlCheck)
                    ? await s3Services.getS3SignedUrl(keyanswerTemp)
                    : "N.A.";
            }
        } else {
            quizRes.Items[0].quiz_template_details = {};
        }

        return quizRes;
    } catch (error) {
        console.log(error);
        throw helper.formatErrorResponse(error.message, 400);
    }
};



exports.resetQuizEvaluationStatus = async (request) => await quizResultRepository.resetQuizEvaluationStatus2(request)


/** EVALUATION API'S **/
const mergeStudentAnswers = (answerMetadata) => {
    const lastOccurrence = {};
    const mergedAnswers = {};

    // Step 1: Track the latest occurrence of each question and collect answers
    answerMetadata.forEach(meta => {
        meta.studentAnswer.forEach(ans => {
            if (!mergedAnswers[ans.question]) {
                mergedAnswers[ans.question] = { page_no: meta.page_no, answer: ans.answer };
            } else {
                mergedAnswers[ans.question].answer += " " + ans.answer; // Merge answers
                mergedAnswers[ans.question].page_no = meta.page_no; // Update latest page_no
            }
        });
    });

    // Step 2: Distribute answers back to their latest occurrence
    return answerMetadata.map(meta => {
        return {
            ...meta,
            studentAnswer: meta.studentAnswer
                .filter(ans => mergedAnswers[ans.question].page_no === meta.page_no)
                .map(ans => ({
                    question: ans.question,
                    answer: mergedAnswers[ans.question].answer
                }))
        };
    });
};
// basicQuestions -  2 4 0.6
// intermediateQuestions -  2 8 0.3
// advancedQuestions -  9 12 0.4

function addIndividualGroupPerformance(markAssignRes, questionDataRes, group_pass_percentage, quizTestRes) {
    // console.log("questionDataRes", questionDataRes);
    const questionMarksMap = {};

    markAssignRes[0].answer_metadata = mergeStudentAnswers(markAssignRes[0].answer_metadata);

    questionDataRes?.forEach(question => {
        if (question.question_id && typeof question.marks === 'number') {
            questionMarksMap[question.question_id] = question.marks;
        }
    });

    // console.log("questionMarksMap - ", questionMarksMap);
    const basicThreshold = group_pass_percentage.Basic / 100;
    const intermediateThreshold = group_pass_percentage.Intermediate / 100;
    const advancedThreshold = group_pass_percentage.Advanced / 100;



    markAssignRes.forEach(res => {
        let basicQuestions = 0, basicMarks = 0, basicObtained = 0;
        let intermediateQuestions = 0, intermediateMarks = 0, intermediateObtained = 0;
        let advancedQuestions = 0, advancedMarks = 0, advancedObtained = 0;
        console.log(" res.marks_details - ", res.marks_details);

        let questionSetData = [];
        res.marks_details.forEach((req) => {
            const { set_key } = req;
            if (quizTestRes.Item.question_track_details[set_key]) {
                questionSetData = quizTestRes.Item.question_track_details[set_key];
                req.qa_details.forEach((question) => {
                    const matchingQuestion = questionSetData.find(q => q.question_id === question.question_id);
                    if (matchingQuestion) {
                        question.type = matchingQuestion.type;
                    }
                });
            } else {
                console.log(`set_key: ${set_key} not found in quizTestRes`);
            }
        });

        res.marks_details.forEach(markDetail => {
            markDetail.qa_details.forEach((question) => {
                const marksPerQuestion = questionMarksMap[question.question_id] || 0;

                console.log("question - ", question);
                // console.log("marksPerQuestion - ", marksPerQuestion);
                // console.log("question.obtained_marks - ", question.modified_marks, " - question.type - ", question.type);
                switch (question.type) {
                    case 'Basic':
                        basicQuestions += 1;
                        basicMarks += marksPerQuestion;
                        basicObtained += question.modified_marks !== 'N.A.' ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                    case 'Intermediate':
                        intermediateQuestions += 1;
                        intermediateMarks += marksPerQuestion;
                        intermediateObtained += question.modified_marks !== 'N.A.' ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                    case 'Advanced':
                        advancedQuestions += 1;
                        advancedMarks += marksPerQuestion;
                        advancedObtained += question.modified_marks !== 'N.A.' ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                }
            });
        });

        console.log("basicQuestions - ", basicObtained, basicMarks, basicThreshold);
        console.log("intermediateQuestions - ", intermediateObtained, intermediateMarks, intermediateThreshold);
        console.log("advancedQuestions - ", advancedObtained, advancedMarks, advancedThreshold);


        const individualGroupPerformance = {
            Basic: {
                Ispassed: basicObtained >= basicMarks * basicThreshold,
                no_of_questions: basicQuestions,
                total_mark: basicMarks,
                total_obtained_mark: basicObtained
            },
            Intermediate: {
                Ispassed: intermediateObtained >= intermediateMarks * intermediateThreshold,
                no_of_questions: intermediateQuestions,
                total_mark: intermediateMarks,
                total_obtained_mark: intermediateObtained
            },
            Advanced: {
                Ispassed: advancedObtained >= advancedMarks * advancedThreshold,
                no_of_questions: advancedQuestions,
                total_mark: advancedMarks,
                total_obtained_mark: advancedObtained
            }
        };


        // Add the individualGroupPerformance object to the res object
        res.individual_group_performance = individualGroupPerformance;
    });

    // request.data.marks_details.forEach(markDetail => {
    //     markDetail.qa_details.forEach((question) => {
    //         const marksPerQuestion = questionMarksMap[question.question_id] || 0;

    //         console.log("question - ", question);
    //         // console.log("marksPerQuestion - ", marksPerQuestion);
    //         // console.log("question.obtained_marks - ", question.modified_marks, " - question.type - ", question.type);
    //         switch (question.type) {
    //             case 'Basic':
    //                 basicQuestions += 1;
    //                 basicMarks += marksPerQuestion;
    //                 basicObtained += question.modified_marks !== 'N.A.' ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
    //                 break;
    //             case 'Intermediate':
    //                 intermediateQuestions += 1;
    //                 intermediateMarks += marksPerQuestion;
    //                 intermediateObtained += question.modified_marks !== 'N.A.' ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
    //                 break;
    //             case 'Advanced':
    //                 advancedQuestions += 1;
    //                 advancedMarks += marksPerQuestion;
    //                 advancedObtained += question.modified_marks !== 'N.A.' ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
    //                 break;
    //         }
    //     });
    // });
    // console.log("basicQuestions - ", basicObtained, basicMarks, basicThreshold);
    // console.log("intermediateQuestions - ", intermediateObtained, intermediateMarks, intermediateThreshold);
    // console.log("advancedQuestions - ", advancedObtained, advancedMarks, advancedThreshold);

    // const individualGroupPerformance = {
    //     Basic: {
    //         Ispassed: basicObtained >= basicMarks * basicThreshold,
    //         no_of_questions: basicQuestions,
    //         total_mark: basicMarks,
    //         total_obtained_mark: basicObtained
    //     },
    //     Intermediate: {
    //         Ispassed: intermediateObtained >= intermediateMarks * intermediateThreshold,
    //         no_of_questions: intermediateQuestions,
    //         total_mark: intermediateMarks,
    //         total_obtained_mark: intermediateObtained
    //     },
    //     Advanced: {
    //         Ispassed: advancedObtained >= advancedMarks * advancedThreshold,
    //         no_of_questions: advancedQuestions,
    //         total_mark: advancedMarks,
    //         total_obtained_mark: advancedObtained
    //     }
    // };

    // console.log("individualGroupPerformance - ", individualGroupPerformance);
    // // Add the individualGroupPerformance object to the res object
    // request.data.individual_group_performance = individualGroupPerformance;
    return markAssignRes;
}


// exports.startQuizEvaluationProcess = async (request) => {
//     try {
//         const quizTestRes = await quizRepository.fetchQuizDataById2(request);

//         if (!quizTestRes || !quizTestRes.Item || quizTestRes.Item.quiz_status !== "Active") {
//             throw helper.formatErrorResponse(constant.messages.NO_DATA, 400);
//         }

//         /** FETCH SCHOOL DATA **/
//         const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

//         let classPassPercentage = quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal
//             ? Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage)
//             : Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);

//         let groupPassPercentage = quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal
//             ? Number(schoolDataRes.Items[0].pre_quiz_config.group_pass_percentage)
//             : Number(schoolDataRes.Items[0].post_quiz_config.group_pass_percentage);

//         /** FETCH STUDENT QUIZ METADATA **/
//         const studentMetaRes = await quizResultRepository.fetchStudentQuiRresultMetadata2(request);

//         if (studentMetaRes.Items.length === 0) {
//             throw helper.formatErrorResponse(constant.messages.NO_ANSWER_SHEET_FOUND, 400);
//         }

//         const questionArray = await getQuizQuestionIds(quizTestRes.Item.quiz_question_details);

//         /** FETCH CATEGORY DATA **/
//         const fetchBulkQtnReq = {
//             IdArray: questionArray,
//             fetchIdName: "question_id",
//             TableName: TABLE_NAMES.upschool_question_table,
//             projectionExp: ["question_id", "question_label", "answers_of_question", "question_content", "question_disclaimer", "question_type", "marks"]
//         };
//         const quizIds = fetchBulkQtnReq.IdArray.map((val) => ({ question_id: val }));

//         const questionDataRes = await commonRepository.fetchBulkDataWithProjection2({ items: quizIds, condition: "AND" });

//         /** ASSIGNING QUIZ MARKS **/
//         let markAssignRes = await exports.assigningQuizMarks(
//             studentMetaRes.Items,
//             quizTestRes.Item.quiz_question_details,
//             questionDataRes.Items,
//             classPassPercentage,
//             groupPassPercentage,
//             quizTestRes.Item.question_track_details
//         );

//         markAssignRes = addIndividualGroupPerformance(markAssignRes, questionDataRes, groupPassPercentage);

//         /** BATCH UPDATE **/
//         await commonRepository.bulkBatchWrite(markAssignRes, TABLE_NAMES.upschool_quiz_result);

//         return { status: 200 };
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// };



// exports.startQuizEvaluationProcess = async (request) => {
//     try {
//         const quizTestRes = await quizRepository.fetchQuizDataById2(request);

//         if (!quizTestRes || !quizTestRes.Item || quizTestRes.Item.quiz_status !== "Active") {
//             throw helper.formatErrorResponse(constant.messages.NO_DATA, 400);
//         }

//         const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

//         let classPassPercentage = quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal
//             ? Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage)
//             : Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);

//         let groupPassPercentage = quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal
//             ? Number(schoolDataRes.Items[0].pre_quiz_config.group_pass_percentage)
//             : Number(schoolDataRes.Items[0].post_quiz_config.group_pass_percentage);

//         const studentMetaRes = await quizResultRepository.fetchStudentQuiRresultMetadata2(request);

//         if (studentMetaRes.Items.length === 0) {
//             throw helper.formatErrorResponse(constant.messages.NO_ANSWER_SHEET_FOUND, 400);
//         }

//         const questionArray = await getQuizQuestionIds(quizTestRes.Item.quiz_question_details);
//         console.log({ questionArray })
//         const fetchBulkQtnReq = {
//             IdArray: questionArray,
//             fetchIdName: "question_id",
//             TableName: TABLE_NAMES.upschool_question_table,
//             projectionExp: ["question_id", "question_label", "answers_of_question", "question_content", "question_disclaimer", "question_type", "marks"]
//         };
//         const questionIds = fetchBulkQtnReq.IdArray.map((val) => ({ question_id: val }));

//         const questionDataRes = await commonRepository.fetchBulkDataWithProjection2({ items: questionIds, condition: "AND" });
//         let answerCompareArray = [];
//         const marksToUpdate = studentMetaRes.Items[0].marks_details[0].qa_details
//         marksToUpdate.map((marks, index) => {
//             questionDataRes.map((question) => { 
//                     if (question.question_id == marks.question_id) {
//                        const answer = question.answers_of_question.filter((ans) => ans.answer_display === "Yes")
//                         studentMetaRes.Items[0].answer_metadata.map(async (metadata) => {
//                             //*******// if(metadata.set == marks.set)this should be done once you update upload process

//                             // const response = await openai.chat.completions.create({
//                             //     model: 'gpt-4o',  // You can use GPT-4 or any other model that suits your needs
//                             //     messages: [
//                             //       {
//                             //         role: 'system',
//                             //         content: 'You are a helpful assistant that compares two answers for similarity.',
//                             //       },
//                             //       {
//                             //         role: 'user',
//                             //         content: `Please compare the following two answers for similarity. Provide a similarity score between 0 and 100.\n\nAnswer 1: ${metadata.studentAnswer[index].answer}\n\nAnswer 2: ${answer[0].answer_content}.mention only score`,
//                             //       },
//                             //     ],
//                             //   });
//                             //   console.log(response.choices[0].message.content)
//                             // //if matching scenario
//                             // if (response.choices[0].message.content > 80) {
//                             //     marks.obtained_marks = question.marks.toString()
//                             // }
//                             answerCompareArray.push({
//                                 question_id:question.question_id,
//                                 extractedAns:metadata.studentAnswer[index].answer,
//                                 actualAns:answer[0].answer_content
//                             })
//                         })


//                     }

//             })


//         })

//         console.log({ answerCompareArray });

//         return { status: 200, marksToUpdate: marksToUpdate, questionDataRes: questionDataRes, studentMetaRes: studentMetaRes.Items };
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// };


// this will work for openai call for single question at a time
// exports.startQuizEvaluationProcess = async (request) => {
//     try {
//         const quizTestRes = await quizRepository.fetchQuizDataById2(request);

//         if (!quizTestRes || !quizTestRes.Item || quizTestRes.Item.quiz_status !== "Active") {
//             throw helper.formatErrorResponse(constant.messages.NO_DATA, 400);
//         }

//         /** FETCH SCHOOL DATA **/
//         const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

//         let classPassPercentage = quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal
//             ? Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage)
//             : Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);

//         let groupPassPercentage = quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal
//             ? Number(schoolDataRes.Items[0].pre_quiz_config.group_pass_percentage)
//             : Number(schoolDataRes.Items[0].post_quiz_config.group_pass_percentage);

//         /** FETCH STUDENT QUIZ METADATA **/
//         const studentMetaRes = await quizResultRepository.fetchStudentQuiRresultMetadata2(request);

//         if (studentMetaRes.Items.length === 0) {
//             throw helper.formatErrorResponse(constant.messages.NO_ANSWER_SHEET_FOUND, 400);
//         }

//         console.log("++++++++studentMetaRes++++++++++++++", studentMetaRes);

//         const questionArray = await getQuizQuestionIds(quizTestRes.Item.quiz_question_details);
//         console.log({ questionArray });

//         /** FETCH CATEGORY DATA **/
//         const fetchBulkQtnReq = {
//             IdArray: questionArray,
//             fetchIdName: "question_id",
//             TableName: TABLE_NAMES.upschool_question_table,
//             projectionExp: ["question_id", "question_label", "answers_of_question", "question_content", "question_disclaimer", "question_type", "marks"]
//         };
//         const questionIds = fetchBulkQtnReq.IdArray.map((val) => ({ question_id: val }));

//         const questionDataRes = await commonRepository.fetchBulkDataWithProjection2({ items: questionIds, condition: "AND" });
//         let answerCompareArray = [];

//         for (let studentMarkDetail of studentMetaRes.Items) {
//         const marksToUpdate = studentMarkDetail.marks_details[0].qa_details;

//         for (let i = 0; i < marksToUpdate.length; i++) {
//             const marks = marksToUpdate[i];

//             for (const question of questionDataRes) {
//                 if (question.question_id === marks.question_id) {
//                     const correctAnswers = question.answers_of_question.filter((ans) => ans.answer_display === "Yes");

//                     for (let j = 0; j < studentMetaRes.Items[0].answer_metadata.length; j++) {
//                         const metadata = studentMetaRes.Items[0].answer_metadata[j];

//                         console.log(correctAnswers[0].answer_content, " - - - ", metadata.studentAnswer[i]?.answer);

//                         const response = await openai.chat.completions.create({
//                             model: 'gpt-4o',
//                             messages: [
//                                 {
//                                     role: 'system',
//                                     content: 'You are a helpful assistant that compares two answers for similarity.',
//                                 },
//                                 {
//                                     role: 'user',
//                                     content: `Please compare the following two answers for similarity. Provide a similarity score between 0 and 100.\n\nAnswer 1: ${metadata.studentAnswer[i]?.answer}\n\nAnswer 2: ${correctAnswers[0].answer_content}. Mention only score.`,
//                                 },
//                             ],
//                         });

//                         const score = parseFloat(response.choices[0].message.content);

//                         if (score > 80) {
//                             marks.obtained_marks = question.marks.toString();
//                         }

//                         answerCompareArray.push({
//                             question_id: question.question_id,
//                             extractedAns: metadata.studentAnswer[i]?.answer,
//                             actualAns: correctAnswers[0].answer_content
//                         });
//                     }
//                 }
//             }
//         }
//         studentMarkDetail.marks_details[0].qa_details = marksToUpdate;
//     }

//     for (let studentMarkDetail of studentMetaRes.Items) {
//         const marksToUpdate = studentMarkDetail.marks_details[0].qa_details;
//         console.log("marksToUpdate - ",marksToUpdate);
//     }
//         const markAssignRes = addIndividualGroupPerformance(studentMetaRes.Items, questionDataRes, groupPassPercentage);

//         // console.log("--^^^^^----", markAssignRes[0].individual_group_performance);
//         // console.log({ answerCompareArray });
//         await commonRepository.bulkBatchWrite(markAssignRes, TABLE_NAMES.upschool_quiz_result);

//         // return { status: 200, questionDataRes, studentMetaRes: studentMetaRes.Items };
//         return { status: 200};

//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// };

exports.startQuizEvaluationProcess = async (request) => {
    try {
        const quizSets = constant.quizSets;
        const quizTestRes = await quizRepository.fetchQuizDataById2(request);

        if (!quizTestRes || !quizTestRes.Item || quizTestRes.Item.quiz_status !== "Active") {
            throw helper.formatErrorResponse(constant.messages.NO_DATA, 400);
        }

        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

        // let classPassPercentage = quizTestRes.Item.learningType === constant.prePostConstans.preLearningVal
        //     ? Number(schoolDataRes.Items[0].pre_quiz_config.pct_of_student_for_reteach)
        //     : Number(schoolDataRes.Items[0].post_quiz_config.pct_of_student_for_reteach);

        // let groupPassPercentage = quizTestRes.Item.learningType === constant.prePostConstans.preLearningVal
        //     ? Number(schoolDataRes.Items[0].pre_quiz_config.group_pass_percentage)
        //     : Number(schoolDataRes.Items[0].post_quiz_config.group_pass_percentage);

        let classPassPercentage = 0;
        let passPassPercentage = 0;
        let groupPassPercentage = {};
        if (quizTestRes.Item.learningType === constant.prePostConstans.preLearningVal) {
            classPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].pre_quiz_config.group_pass_percentage
        } else {
            classPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].post_quiz_config.group_pass_percentage
        }

        const studentMetaRes = await quizResultRepository.fetchStudentQuiRresultMetadata2(request);

        if (studentMetaRes.Items.length === 0) {
            throw helper.formatErrorResponse(constant.messages.NO_ANSWER_SHEET_FOUND, 400);
        }

        const questionArray = await getQuizQuestionIds(quizTestRes.Item.quiz_question_details);

        const fetchBulkQtnReq = {
            IdArray: questionArray,
            fetchIdName: "question_id",
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: ["question_id", "question_label", "answers_of_question", "question_content", "question_disclaimer", "question_type", "marks"]
        };

        const questionIds = fetchBulkQtnReq.IdArray.map((val) => ({ question_id: val }));
        const questionDataRes = await commonRepository.fetchBulkDataWithProjection3(fetchBulkQtnReq);

        let answerCompareArray = [];
        const setsMarkFormat = await helper.getQuizMarksDetailsFormat(quizTestRes.Item.quiz_question_details);

        console.log("setsMarkFormat - ", setsMarkFormat);

        let i = 0;
        for (let studentMarkDetail of studentMetaRes.Items) {
            const studentData = studentMetaRes.Items[i++];
            const quizSetKey = quizSets[studentData.quiz_set.toLowerCase()];

            const markDetails = setsMarkFormat.filter(markForm => markForm.set_key === quizSetKey);
            studentMarkDetail.marks_details = markDetails;
            const marksToUpdate = studentMarkDetail.marks_details[0].qa_details;
            const allStudentAnswers = studentMarkDetail.answer_metadata.flatMap(item => item.studentAnswer);

            const mergedAnswers = allStudentAnswers.reduce((acc, curr) => {
                const existing = acc.find(item => item.question === curr.question);
                if (existing) {
                    existing.answer += ' ' + curr.answer; // Merge answers with a space
                } else {
                    acc.push({ ...curr });
                }
                return acc;
            }, []);

            const studentAnswers = mergedAnswers.map((mark, i) => {
                const questionDetail = markDetails[0].qa_details[mergedAnswers[i]?.question - 1]
                return { question_id: questionDetail?.question_id, answers: mergedAnswers[i].answer }
            })

            const questionAnswerPairs = marksToUpdate.map((mark, i) => {

                let studentAnswer = "";
                studentAnswers.forEach(ans => {
                    if (ans.question_id === mark.question_id) {
                        studentAnswer = ans.answers;
                    }
                })

                let correctAnswer = "";

                const question = questionDataRes.find(
                    (q) => q.question_id === mark.question_id
                );

                if (question) {
                    if (question.question_type === "Descriptive") {
                        correctAnswer = question.answers_of_question
                            .filter((ans) => ans.answer_weightage > 0)
                            .map((ans) => ans.answer_content) // Extract all answer_content
                            .join(" ");
                        console.log("DESCRIPTIKJKJN", correctAnswer)
                    } else if (question.question_type === "Objective") {
                        const index = question.answers_of_question.findIndex(
                            (ans) => ans.answer_display === "Yes" || !ans.answer_display
                        );
                        const indexLetter = String.fromCharCode(97 + index);
                        correctAnswer = index !== -1 ? `${question.answers_of_question[index].answer_content} or ${indexLetter} or ${indexLetter.toUpperCase()} or ${indexLetter}. or ${indexLetter.toUpperCase()}. or ${indexLetter}.${question.answers_of_question[index].answer_content}` : "";
                        console.log("objective", question.answers_of_question, correctAnswer)
                    } else if (question.question_type === "Subjective") {
                        correctAnswer = question.answers_of_question
                            .filter((ans) => ans.answer_display === "Yes")  // Filter answers with answer_display as "Yes"
                            .map((ans) => ans.answer_content)               // Extract the answer_content
                            .join(" ");                                     // Join the answer contents into a single string

                        console.log(correctAnswer);
                    }
                }
                console.log("correct answers:::", correctAnswer)
                const marks = questionDataRes.find((q) => q.question_id === mark.question_id)?.marks || "";
                const type = questionDataRes.find((q) => q.question_id === mark.question_id)?.question_type || "";
                return {
                    question_id: mark.question_id,
                    studentAnswer: studentAnswer,
                    correctAnswer: correctAnswer,
                    marks: marks,
                    question_type: type
                };
            });

            // console.log("correct answers:::",correctAnswer)

            // const userPrompt = `Please compare the following answers for similarity. Provide a similarity score between 0 and 100 for each.\n\n` +
            //     questionAnswerPairs.map(
            //         (pair, index) => `Question ${index + 1}:\nAnswer 1 (Student): ${pair.studentAnswer}\nAnswer 2 (Correct): ${pair.correctAnswer}\n`
            //     ).join("\n") + `.In the response content just return similarity score without any key or Question No (like 100\n + 85\n etc ) and donot consider html and css which are provided in answer.`;

            const normalizeAnswer = (answer) => {
                if (!answer) return " ";
                let normalized = answer.trim().toLowerCase();
                if (!isNaN(normalized)) {
                    return parseFloat(normalized).toString();
                }
                normalized = normalized.replace(/[,;!?]/g, "");
                return normalized;
            };

            const extractValidAnswers = (correctAnswer) => {
                return correctAnswer
                    ?.split(/\s*or\s*/i)
                    ?.map(normalizeAnswer)
                    .filter(Boolean);
            };

            const userPrompt = `Please compare the following answers for similarity. 
            Ignore numbering, placeholders, minor formatting differences such as "1." before the answer, extra spaces, full stops, or punctuation marks that do not affect the meaning. 
            Ensure different words or concepts are not mistakenly considered similar. If the student's answer does not match any of the meanings in the correct answer, the similarity score should be 0.

            Provide a similarity score between 0 and 100 for each comparison.\n\n` +
                questionAnswerPairs.map((pair, index) => {
                    const correctAnswers = extractValidAnswers(pair.correctAnswer);
                    return `Question ${index + 1}:
            Student Answer: "${normalizeAnswer(pair.studentAnswer)}"
            Correct Answers: ${correctAnswers.map(ans => `"${ans}"`).join(", ")}\n`;
                }).join("\n") + `.
            In the response content, just return the similarity scores as numbers separated by new lines (e.g., "100\n85\n") without any additional text, labels, or question numbers. Just Similarity Scores in the specified format.`;

            const response = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that compares answers and provides similarity scores between 0 and 100.'
                    },
                    { role: 'user', content: userPrompt }
                ],
            });
            console.log("response - ", response.choices[0].message);

            const scores = response.choices[0].message.content.split("\n").map(score => parseFloat(score.trim())).filter(value => !isNaN(value));
            console.log("scores - ", scores);
            let totalMarks = 0;
            let totalExpectedMarks = 0;
            marksToUpdate.forEach((mark, index) => {
                totalExpectedMarks += questionAnswerPairs[index].marks;
                // console.log("type", questionAnswerPairs[index].question_type)

                if (questionAnswerPairs[index].question_type === "Descriptive") {
                    console.log("Descriptive -  ", questionAnswerPairs[index].marks);
                    const range = 100 / Number(questionAnswerPairs[index].marks)
                    if (scores[index] === NaN || scores[index] < 10) mark.obtained_marks = 0;
                    else {
                        for (let i = 1; i <= questionAnswerPairs[index].marks; i++) {
                            if (scores[index] <= i * range) {
                                // console.log("questiondesc - ",scores[index], i);
                                mark.obtained_marks = i;
                                // totalMarks += i;
                                // totalMarks -= (i-1);
                                break;
                            }
                        }
                        console.log("mark for that question  -- - ", totalMarks);
                    }
                }
                else {
                    if (scores[index] > 80) {
                        // console.log("questionAnswerPairs[index].marks - ", questionAnswerPairs[index].marks);
                        mark.obtained_marks = questionAnswerPairs[index].marks;
                        // totalMarks += questionAnswerPairs[index].marks;
                        console.log("mark for that question  -- - ", totalMarks);
                        console.log("non Descriptive ");

                    }
                    if (scores[index] === NaN) {
                        mark.obtained_marks = 0;
                    }
                }

                totalMarks += mark.obtained_marks !== "N.A." ? mark.obtained_marks : 0;
                mark.obtained_marks = mark.obtained_marks === "N.A." ? 0 : mark.obtained_marks;
                mark.student_answer = questionAnswerPairs[index].studentAnswer;
                // console.log("scores[index] - ", scores[index]);

                answerCompareArray.push({
                    question_id: questionAnswerPairs[index].question_id,
                    extractedAns: questionAnswerPairs[index].studentAnswer,
                    actualAns: questionAnswerPairs[index].correctAnswer,
                    similarityScore: scores[index]
                });
            });

            console.log("totalMark -- - ", totalMarks);
            studentMarkDetail.marks_details[0].qa_details = marksToUpdate;
            studentMarkDetail.evaluated = "Yes";
            studentMarkDetail.marks_details[0].expectedMarks = totalExpectedMarks;
            studentMarkDetail.marks_details[0].totalMark = totalMarks;
            studentMarkDetail.isPassed = (totalMarks / totalExpectedMarks) * 100 > classPassPercentage;
        }

        // console.log("Answer Comparison Details: ", answerCompareArray);

        const markAssignRes = addIndividualGroupPerformance(studentMetaRes.Items, questionDataRes, groupPassPercentage, quizTestRes);

        // console.log("markAssignRes - ", markAssignRes);
        await commonRepository.bulkBatchWrite(markAssignRes, TABLE_NAMES.upschool_quiz_result);

        return { status: 200 };

    } catch (error) {
        console.error(error);
        throw error;
    }
};



const getQuizQuestionIds = async (quiz_question_details) => {
    let quizSetDetails = constant.quizSetDetails;
    let questionArr = [];

    await quizSetDetails.forEach(indSet => {
        questionArr.push(...quiz_question_details[indSet.setKey]);
    })
    console.log("LENGTH : ", questionArr.length);
    questionArr = await helper.removeDuplicates(questionArr);
    return questionArr;
}

exports.assigningQuizMarks = async (studResultData, quizQuestionSets, quesAns, classPassPercentage, groupPassPercentage, questionTrackDetails) => {
    try {
        const quizSets = constant.quizSets;

        /** GET FINAL DATA FORMAT **/
        const setsMarkFormat = await helper.getQuizMarksDetailsFormat(quizQuestionSets);
        console.log("SET MARK FORMAT : ", setsMarkFormat);

        /** GET CONCAT ANSWERS **/
        studResultData = await helper.concatAnswers(studResultData);
        console.log("CONCAT STUDENT QUIZ ANSWERS : ", studResultData);

        /** PROCESS EACH STUDENT **/
        for (let i = 0; i < studResultData.length; i++) {
            const studentData = studResultData[i];
            const quizSetKey = quizSets[studentData.quiz_set.toLowerCase()];
            const questionPaper = quizQuestionSets[quizSetKey];
            const questionPaperTrack = questionTrackDetails[quizSetKey];
            const markDetails = setsMarkFormat.filter(markForm => markForm.set_key === quizSetKey);

            console.log("QUESTION PAPER : ", questionPaper);
            console.log("MARK DETAILS : ", markDetails);

            if (studentData.overall_answer.length > 0) {
                const finalMarksDetails = await exports.comparingQuizAnswer(
                    studentData.overall_answer,
                    markDetails,
                    questionPaper,
                    quesAns,
                    classPassPercentage,
                    groupPassPercentage,
                    questionPaperTrack
                );

                console.log("FINAL MARKS : " + studentData.student_id, finalMarksDetails);
                studentData.marks_details = finalMarksDetails.markDetails;
                studentData.isPassed = finalMarksDetails.isPassed;
            } else {
                console.log("EMPTY OVERALL ANSWER");
                studentData.marks_details = markDetails;
                studentData.isPassed = false;
            }

            studentData.evaluated = "Yes";
            studentData.updated_ts = helper.getCurrentTimestamp();
        }

        console.log("DONE!");
        console.log(studResultData);
        return studResultData;
    } catch (error) {
        console.error("Error in assigningQuizMarks:", error);
        throw error;
    }
};


exports.comparingQuizAnswer = async (studAns, markDetails, questionPaper, quesAns, classPassPercentage, group_pass_percentage, questionPaperTrack) => {
    return new Promise(async (resolve, reject) => {
        await helper.splitStudentQuizAnswer(studAns).then((splitedAns) => {
            console.log("SPLITED ANSWER : ", splitedAns);

            let passStatus = false;

            async function sectionLoop(i) {
                if (i < markDetails.length) {
                    if (splitedAns[i] && splitedAns[i].individualAns && splitedAns[i].individualAns.length > 0) {
                        await exports.setQizQaDetails(markDetails[i].qa_details, splitedAns[i].individualAns, quesAns, questionPaperTrack).then(async (secQaDetails) => {
                            console.log("SECTION QA DETAILS : ", secQaDetails);
                            markDetails[i].qa_details = secQaDetails;

                            await knowPassOrFail(markDetails[i], quesAns, classPassPercentage, group_pass_percentage).then((overallResult) => {
                                markDetails[i].totalMark = overallResult.studentResult;
                                passStatus = overallResult.isPassed;
                            });
                        });
                    }

                    i++;
                    sectionLoop(i);
                } else {
                    /** LOOP END **/
                    console.log("End comparingAnswer");
                    console.log("OVERALL QA DETAILS : ", markDetails);

                    resolve({ markDetails, isPassed: passStatus });
                }
            }

            sectionLoop(0);
        }).catch((error) => {
            console.error("Error in splitStudentQuizAnswer:", error);
            reject(error);
        });
    });
};


exports.setQizQaDetails = async (qaDetails, indAns, quesAns, questionPaperTrack) => {
    try {
        for (let i = 0; i < qaDetails.length; i++) {
            const localQuestion = quesAns.find(ques => ques.question_id === qaDetails[i].question_id);
            const localType = questionPaperTrack.find(ques => ques.question_id === qaDetails[i].question_id);

            if (localQuestion && indAns[i]) {
                const obMark = await classTestServices.compareAnswer(localQuestion, indAns[i]);
                console.log("OBTAINED MARKS : ", obMark);
                qaDetails[i].obtained_marks = obMark;
                qaDetails[i].student_answer = indAns[i];
                qaDetails[i].type = localType ? localType.type : null;
            }
        }
        console.log("End setQaDetails");
        return qaDetails;
    } catch (error) {
        console.error("Error in setQizQaDetails:", error);
        throw error;
    }
};


const knowPassOrFail = (marks_details, quesAndAns, classPercentage, individualPassPercentage = 50) => {

    return new Promise((resolve, reject) => {
        let totalMarks = quesAndAns?.reduce((acc, item) => {
            return item.marks ? acc + Number(item.marks) : acc;
        }, 0);

        const studentResult = marks_details?.qa_details?.filter(studentProgress => {
            return quesAndAns.some(question => question?.question_id === studentProgress?.question_id);
        }).reduce((acc, item) => {
            if (item?.modified_marks != 'N.A.')
                return acc + parseFloat(item?.modified_marks)
            if (item?.obtained_marks != 'N.A.')
                return acc + parseFloat(item?.obtained_marks)
            return acc;
        }, 0);

        console.log("studentResult - ", studentResult);
        const isPassed = (studentResult / totalMarks) * 100 >= individualPassPercentage;
        console.log("isPassed - ", isPassed);
        console.log("-m marks - ", { totalMarks });
        console.log({ studentResult });

        resolve({ isPassed, studentResult, totalMarks: studentResult, expectedMarks: totalMarks });
    })
};

exports.fetchAllQuizDetails = function (request, callback) {
    /** FETCH USER BY EMAIL **/
    quizRepository.getAllQuizData(request, function (fetch_quiz_err, fetch_quiz_response) {
        if (fetch_quiz_err) {
            console.log(fetch_quiz_err);
            callback(fetch_quiz_err, fetch_quiz_response);
        } else {
            callback(0, fetch_quiz_response)
        }
    })
}


// exports.comparingQuizAnswer = async (markDetails, quesAns, individualPassPercentage) => {
//     const qaDetails = markDetails.qa_details;

//     let totalObtainedMarks = 0;

//     quesAns.forEach(ques => {
//         const matchingDetail = qaDetails.find(detail => detail.question_id === ques.question_id);
//         if (matchingDetail) {
//             totalObtainedMarks += matchingDetail.obtained_marks > ques.marks ? ques.marks : matchingDetail.obtained_marks;
//         }
//     });

//     const totalMarks = (totalObtainedMarks / quesAns.reduce((acc, cur) => acc + cur.marks, 0)) * 100;

//     // Compare the calculated percentage with the individual pass percentage
//     const pass = totalMarks >= individualPassPercentage;

//     return pass ? "Pass" : "Fail";
// }



