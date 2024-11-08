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

exports.fetchQuizBasedonStatus = async (request) => await quizRepository.getQuizBasedonStatus2(request)

exports.getQuizResult = async (request) => {
    const result_response = await quizRepository.getQuizResult2(request)

    if (result_response.Items.length > 0) {
        let contentURL;
        async function setContentURL(index) {

            if (index < result_response.Items[0].answer_metadata.length) {
                contentURL = "";
                if (((JSON.stringify(result_response.Items[0].answer_metadata[index].url).includes("quiz_uploads/")) && (JSON.stringify(result_response.Items[0].answer_metadata[index].url).includes("student_answered_sheets/"))) && result_response.Items[0].answer_metadata[index].url != "" && result_response.Items[0].answer_metadata[index].url != "N.A.") {
                    contentURL = await s3Services.getS3SignedUrl(result_response.Items[0].answer_metadata[index].url);
                    console.log("contentURL", contentURL);
                    result_response.Items[0].answer_metadata[index]["content_url"] = contentURL;

                    index++;
                    setContentURL(index);
                } else {
                    index++;
                    setContentURL(index);
                }
            } else {
                console.log("Loop ended!", result_response.Items[0].answer_metadata);
            }
        } setContentURL(0);
    }
    return result_response;
}


exports.editStudentQuizMarks = async (request) => {
    try {
        const quizTestRes = await quizRepository.fetchQuizDataById2(request);

        if (quizTestRes.Item.quiz_status !== "Active") {
            throw helper.formatErrorResponse(constant.messages.NO_DATA, 400);
        }

        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

        let classPassPercentage = 0;
        let passPassPercentage = 0;
        let groupPassPercentage = {};
        if (quizTestRes.Item.learningType === constant.prePostConstans.preLearningVal) {
            classPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].pre_quiz_config.test_matrix
        } else {
            classPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].post_quiz_config.test_matrix
        }

        const questionIds = request.data.marks_details[0].qa_details.map(qDetails => qDetails.question_id);
        const fetchBulkQtnReq = {
            IdArray: questionIds,
            fetchIdName: "question_id",
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: ["question_id", "marks"]
        };
        const quizIds = fetchBulkQtnReq.IdArray.map((val) => ({ question_id: val }));
        const questionDataRes = await commonRepository.fetchBulkDataWithProjection2({ items: quizIds, condition: "OR" })

        const overallResult = await knowPassOrFail(request.data.marks_details[0], questionDataRes.Items, classPassPercentage , passPassPercentage);
        console.log("-----------------------------------------------------");
        console.log("overallResult.studentResult - ",overallResult.studentResult);
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
        questionDataRes?.Items?.forEach(question => {
            console.log("question - ",question);
            if (question.question_id && typeof question.marks === 'number') {
                questionMarksMap[question.question_id] = question.marks;
            }
        });

        request.data.marks_details.forEach(markDetail => {
            markDetail.qa_details.forEach((question) => {
                const marksPerQuestion = questionMarksMap[question.question_id] || 0;

                console.log("question - ", question);
                console.log("marksPerQuestion - ",marksPerQuestion );
                console.log("question.obtained_marks - ",question.modified_marks ," - question.type - ",question.type);
                switch (question.type) {
                    case 'basic':
                        basicQuestions += 1;
                        basicMarks += marksPerQuestion;
                        basicObtained += question.modified_marks ? parseFloat(question.modified_marks) || 0 :  parseFloat(question.obtained_marks) || 0;
                        break;
                    case 'intermediate':
                        intermediateQuestions += 1;
                        intermediateMarks += marksPerQuestion;
                        intermediateObtained += question.modified_marks ? parseFloat(question.modified_marks) || 0 :  parseFloat(question.obtained_marks) || 0;
                        break;
                    case 'advanced':
                        advancedQuestions += 1;
                        advancedMarks += marksPerQuestion;
                        advancedObtained += question.modified_marks ? parseFloat(question.modified_marks) || 0 :  parseFloat(question.obtained_marks) || 0;
                        break;
                }
            });
        });

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
        console.log({ fetchQuizDataResponse });
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
        const fetchQuestionsRes = await commonRepository.fetchBulkDataWithProjection2({ items: questionIds, condition: "OR", TableName: fetchBulkCatReq.TableName });

        // Set final question paper view data
        const questionsRes = await exports.setQuestionPaperView(questionIDs, fetchQuestionsRes.Items);

        // Return the result
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
        console.log("request - ",request);
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

function addIndividualGroupPerformance(markAssignRes, questionDataRes, group_pass_percentage) {
    console.log("questionDataRes", questionDataRes);
    const questionMarksMap = {};

    questionDataRes?.Items?.forEach(question => {
        if (question.question_id && typeof question.marks === 'number') {
            questionMarksMap[question.question_id] = question.marks;
        }
    });

    console.log("questionMarksMap", questionMarksMap);

    // Convert group pass percentages to decimal thresholds
    const basicThreshold = group_pass_percentage.Basic / 100;
    const intermediateThreshold = group_pass_percentage.Intermediate / 100;
    const advancedThreshold = group_pass_percentage.Advanced / 100;

    markAssignRes.forEach(res => {
        let basicQuestions = 0, basicMarks = 0, basicObtained = 0;
        let intermediateQuestions = 0, intermediateMarks = 0, intermediateObtained = 0;
        let advancedQuestions = 0, advancedMarks = 0, advancedObtained = 0;

        res.marks_details.forEach(markDetail => {
            markDetail.qa_details.forEach((question) => {
                const marksPerQuestion = questionMarksMap[question.question_id] || 0;
                switch (question.type) {
                    case 'basic':
                        basicQuestions += 1;
                        basicMarks += marksPerQuestion;
                        basicObtained += question.obtained_marks;
                        break;
                    case 'intermediate':
                        intermediateQuestions += 1;
                        intermediateMarks += marksPerQuestion;
                        intermediateObtained += question.obtained_marks;
                        break;
                    case 'advanced':
                        advancedQuestions += 1;
                        advancedMarks += marksPerQuestion;
                        advancedObtained += question.obtained_marks;
                        break;
                }
            });
        });

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

    return markAssignRes;
}


exports.startQuizEvaluationProcess = async (request) => {
    try {
        const quizTestRes = await quizRepository.fetchQuizDataById2(request);

        if (!quizTestRes || !quizTestRes.Item || quizTestRes.Item.quiz_status !== "Active") {
            throw helper.formatErrorResponse(constant.messages.NO_DATA, 400);
        }

        /** FETCH SCHOOL DATA **/
        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

        let classPassPercentage = quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal
            ? Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage)
            : Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);

        let groupPassPercentage = quizTestRes.Item.learningType == constant.prePostConstans.preLearningVal
            ? Number(schoolDataRes.Items[0].pre_quiz_config.group_pass_percentage)
            : Number(schoolDataRes.Items[0].post_quiz_config.group_pass_percentage);

        /** FETCH STUDENT QUIZ METADATA **/
        const studentMetaRes = await quizResultRepository.fetchStudentQuiRresultMetadata2(request);

        if (studentMetaRes.Items.length === 0) {
            throw helper.formatErrorResponse(constant.messages.NO_ANSWER_SHEET_FOUND, 400);
        }

        const questionArray = await getQuizQuestionIds(quizTestRes.Item.quiz_question_details);

        /** FETCH CATEGORY DATA **/
        const fetchBulkQtnReq = {
            IdArray: questionArray,
            fetchIdName: "question_id",
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: ["question_id", "question_label", "answers_of_question", "question_content", "question_disclaimer", "question_type", "marks"]
        };
        const quizIds = fetchBulkQtnReq.IdArray.map((val) => ({ question_id: val }));

        const questionDataRes = await commonRepository.fetchBulkDataWithProjection2({ items: quizIds, condition: "AND" });

        /** ASSIGNING QUIZ MARKS **/
        let markAssignRes = await exports.assigningQuizMarks(
            studentMetaRes.Items,
            quizTestRes.Item.quiz_question_details,
            questionDataRes.Items,
            classPassPercentage,
            groupPassPercentage,
            quizTestRes.Item.question_track_details
        );

        markAssignRes = addIndividualGroupPerformance(markAssignRes, questionDataRes, groupPassPercentage);

        /** BATCH UPDATE **/
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


const knowPassOrFail = (marks_details, quesAndAns,classPercentage , individualPassPercentage =50) => {

    return new Promise((resolve, reject) => {
        let totalMarks = quesAndAns?.reduce((acc, item) => {
            return item.marks ? acc + Number(item.marks) : acc;
        }, 0);

        const studentResult = marks_details?.qa_details?.filter(studentProgress => {
            return quesAndAns.some(question => question?.question_id === studentProgress?.question_id);
        }).reduce((acc, item) => {
            if(item?.modified_marks != 'N.A.')
            return acc + parseFloat(item?.modified_marks)
            if(item?.obtained_marks != 'N.A.')
            return acc + parseFloat(item?.obtained_marks)
        return acc;
        }, 0);

        console.log("studentResult - ",studentResult);
        const isPassed = (studentResult/totalMarks)*100 >= individualPassPercentage;
        console.log("isPassed - ",isPassed);
        console.log("-m marks - ",{ totalMarks });
        console.log({ studentResult });

        resolve({ isPassed, studentResult,totalMarks : studentResult ,expectedMarks :totalMarks  });
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



