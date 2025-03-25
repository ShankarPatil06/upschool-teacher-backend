const quizRepository = require("../repository/quizRepository");
const quizResultRepository = require("../repository/quizResultRepository");
const classTestServices = require("./classTestServices");
const { messages, prePostConstans, groupTypes, question, quizSetDetails, quizFolder, quizSets, status } = require("../constants/constant");
const { concatAnswers, fetchQuizSetName, formatErrorResponse, getAnswerContentFileUrl, getCurrentTimestamp, getQuizMarksDetailsFormat, isEmptyObject, removeDuplicates, splitStudentQuizAnswer } = require("../helper/helper");
const commonRepository = require("../repository/commonRepository");
const { TABLE_NAMES } = require("../constants/tables");
const schoolRepository = require("../repository/schoolRepository");
const s3Services = require("./s3Service");
const { OpenAI } = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

exports.checkDuplicateQuizName = async (request) => {
    const quizData_response = await quizRepository.checkDuplicateQuizName2(request)
    if (!isEmptyArray(quizData_response.Items)) {
        throw formatErrorResponse(messages.DUPLICATE_QUIZ_NAME, 400);
    }
    return quizData_response
}

exports.updateQuizStatus = async (request) => {
    if (request.data.quiz_status !== status.active) {
        return await quizRepository.updateQuizStatus2(request);
    }

    const preQuiz_response = await quizRepository.fetchQuizDataById2(request);
    if (!preQuiz_response.Item) throw new Error(messages.ERROR_IN_FETCHING_QUIZ);

    const { client_class_id, chapter_id, subject_id, section_id, learningType, selectedTopics } = preQuiz_response.Item;
    Object.assign(request.data, { client_class_id, chapter_id, subject_id, section_id, learningType });

    const quizRes = await quizRepository.fetchQuizData2(request);
    if (!isEmptyArray(quizRes.Items)) {
        if (learningType === prePostConstans.preLearningVal) {
            throw new Error(messages.PRE_QUIZ_ALREADY_GENERATED);
        }

        const resSelectedTop = quizRes.Items.flatMap(qData => qData.selectedTopics);
        const duplicatedTopics = await checkDuplicateTopics(resSelectedTop, selectedTopics);

        if (!isEmptyArray(duplicatedTopics)) {
            throw new Error(messages.POST_QUIZ_ALREADY_GENERATED);
        }
    }

    const statusRes = await quizRepository.updateQuizStatus2(request);
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
        return quizRepository.getQuizBasedonStatus2(request)
    } catch (error) {
        throw error;
    }
}

exports.getQuizResult = async (request) => {

    const result_response = await quizRepository.getQuizResult2(request);
    if (!isEmptyArray(result_response.Items))
        await Promise.all(result_response.Items[0].answer_metadata.map(async (result) => {
            result.content_url = await s3Services.getS3SignedUrl(result.url);
        }));
    return result_response;
}


exports.editStudentQuizMarks = async (request) => {

    try {
        const quizTestRes = await quizRepository.fetchQuizDataById2(request);

        if (quizTestRes.Item.quiz_status !== status.active) {
            throw formatErrorResponse(messages.NO_DATA, 400);
        }

        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

        let classPassPercentage = 0;
        let passPassPercentage = 0;
        let groupPassPercentage = {};
        if (quizTestRes.Item.learningType === prePostConstans.preLearningVal) {
            classPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].pre_quiz_config.group_pass_percentage
        } else {
            classPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].post_quiz_config.group_pass_percentage
        }

        const questionIds = request.data.marks_details[0].qa_details.map(qDetails => qDetails.question_id);

        const fetchBulkQtnReq = {
            IdArray: questionIds,
            fetchIdName: question.question_id,
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: [question.question_id, question.marks]
        };

        const quizIds = fetchBulkQtnReq.IdArray.map((val) => ({ question_id: val }));

        const questionDataRes = await commonRepository.fetchBulkDataWithProjection2({ items: quizIds, condition: common.OR })

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
            if (question.question_id && typeof question.marks === common.Number) {

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
            }
        });

        request.data.marks_details.forEach(markDetail => {
            markDetail.qa_details.forEach((question) => {
                const marksPerQuestion = questionMarksMap[question.question_id] || 0;

                switch (question.type) {
                    case groupTypes.Basic:
                        basicQuestions += 1;
                        basicMarks += marksPerQuestion;
                        basicObtained += question.modified_marks !== common.NA ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                    case groupTypes.Intermediate:
                        intermediateQuestions += 1;
                        intermediateMarks += marksPerQuestion;
                        intermediateObtained += question.modified_marks !== common.NA ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                    case groupTypes.Advanced:
                        advancedQuestions += 1;
                        advancedMarks += marksPerQuestion;
                        advancedObtained += question.modified_marks !== common.NA ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
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
        request.data.individual_group_performance = individualGroupPerformance;

        const fetchQuizDataRes = await quizRepository.modifyStudentMarks2(request);
        return fetchQuizDataRes.Items;

    } catch (error) {
        throw formatErrorResponse(error.message || messages.NO_DATA, 400);
    }
};



exports.viewQuizQuestionPaper = async (request) => {
    try {
        // Fetch quiz result data of student
        // const schoolInfo = await schoolRepository.getSchoolDetailsById2(request)
        const fetchQuizResultData = await quizResultRepository.fetchQuizResultDataOfStudent2(request);
        if (!fetchQuizResultData || isEmptyArray(fetchQuizResultData.Items)) {
            throw new Error(messages.NO_ANSWER_SHEET_FOUND);
        }

        const quizType = fetchQuizResultData.Items[0].quiz_set;
        const quizSetName = await fetchQuizSetName(quizType);

        // Fetch quiz data by ID
        const fetchQuizDataResponse = await quizRepository.fetchQuizDataById2(request);
        if (isEmptyObject(fetchQuizDataResponse.Item)) {
            throw new Error(messages.COULDNOT_READ_QUIZ_ID);
        }
        // Extract question details
        const questionsData = fetchQuizDataResponse.Item.quiz_question_details[quizSetName];
        const questionIDs = removeDuplicates(questionsData);
        // Fetch questions data
        const fetchBulkCatReq = {
            IdArray: questionIDs,
            fetchIdName: question.question_id,
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: [question.question_id, question.question_content, question.answers_of_question, question.question_type, question.marks, requestData.displayAnswer]
        };
        const questionIds = fetchBulkCatReq.IdArray.map((val) => ({ question_id: val }));
        const fetchQuestionsRes = await commonRepository.fetchBulkDataWithProjection3(fetchBulkCatReq);
        const questionsRes = await exports.setQuestionPaperView(questionIDs, fetchQuestionsRes);
        // return { Items: questionsRes ,predictive_evaluation : schoolInfo?.Items[0].school_subscribtion_feature.predictive_evaluation};
        return { Items: questionsRes };

    } catch (error) {
        throw formatErrorResponse(error.message || messages.DEFAULT_ERROR, 400);
    }
};


exports.setQuestionPaperView = async (questionIDs, questionData) => {

    const individualQuestions = await Promise.all(
        questionIDs.map(async (questionID) => {
            const matchedQuestion = questionData.find((q) => q.question_id === questionID);

            if (!matchedQuestion) return null;

            try {
                const url = await getAnswerContentFileUrl(matchedQuestion.answers_of_question);
                matchedQuestion.answers_of_question = url;
            } catch (err) {
                matchedQuestion.answers_of_question = common.NA;
            }

            return matchedQuestion;
        })
    );

    return individualQuestions.filter(q => q !== null); // Remove null values (if any question IDs did not match)
};


exports.fetchQuizTemplates = async (request) => {
    try {
        // if(!request.data.quiz_status)
        // request.data.quiz_status = status.active;
        const quizRes = await quizRepository.fetchQuizTemplates2(request);

        if (quizRes.Items[0]?.quiz_template_details) {
            for (let k = 97; k <= 99; k++) {
                const set_code = String.fromCharCode(k);
                const questionSheetKey = `set_${set_code}`;
                const quizTemplate = quizRes.Items[0].quiz_template_details[questionSheetKey] || {};

                const questionTemp = quizTemplate.question_sheet || common.NA;
                const questionUrlCheck = quizFolder[`questionPapersSet${set_code.toUpperCase()}`].split("/")[0];
                quizTemplate.question_sheet_url = questionTemp.includes(questionUrlCheck)
                    ? await s3Services.getS3SignedUrl(questionTemp)
                    : common.NA;

                const answerTemp = quizTemplate.answer_sheet || common.NA;
                const answerUrlCheck = quizFolder[`questionPapersSet${set_code.toUpperCase()}`].split("/")[0];
                quizTemplate.answer_sheet_url = answerTemp.includes(answerUrlCheck)
                    ? await s3Services.getS3SignedUrl(answerTemp)
                    : common.NA;

                const keyanswerTemp = quizTemplate.key_answer || common.NA;
                const keyanswerUrlCheck = quizFolder[`questionPapersSet${set_code.toUpperCase()}`].split("/")[0];
                quizTemplate.key_answer_url = answerTemp.includes(keyanswerUrlCheck)
                    ? await s3Services.getS3SignedUrl(keyanswerTemp)
                    : common.NA;
            }
        } else {
            quizRes.Items[0].quiz_template_details = {};
        }

        return quizRes;
    } catch (error) {
        throw formatErrorResponse(error.message, 400);
    }
};

exports.resetQuizEvaluationStatus = async (request) => await quizResultRepository.resetQuizEvaluationStatus2(request)

const mergeStudentAnswers = (answerMetadata) => {
    const mergedAnswers = {};

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

const addIndividualGroupPerformance = (markAssignRes, questionDataRes, group_pass_percentage, quizTestRes) => {
    const questionMarksMap = {};
    markAssignRes[0].answer_metadata = mergeStudentAnswers(markAssignRes[0].answer_metadata);

    questionDataRes?.forEach(question => {
        if (question.question_id && typeof question.marks === common.Number) {
            questionMarksMap[question.question_id] = question.marks;
        }
    });

    const basicThreshold = group_pass_percentage.Basic / 100;
    const intermediateThreshold = group_pass_percentage.Intermediate / 100;
    const advancedThreshold = group_pass_percentage.Advanced / 100;

    markAssignRes.forEach(res => {
        let basicQuestions = 0, basicMarks = 0, basicObtained = 0;
        let intermediateQuestions = 0, intermediateMarks = 0, intermediateObtained = 0;
        let advancedQuestions = 0, advancedMarks = 0, advancedObtained = 0;

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
            }
        });

        res.marks_details.forEach(markDetail => {
            markDetail.qa_details.forEach((question) => {
                const marksPerQuestion = questionMarksMap[question.question_id] || 0;

                switch (question.type) {
                    case groupTypes.Basic:
                        basicQuestions += 1;
                        basicMarks += marksPerQuestion;
                        basicObtained += question.modified_marks !== common.NA ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                    case groupTypes.Intermediate:
                        intermediateQuestions += 1;
                        intermediateMarks += marksPerQuestion;
                        intermediateObtained += question.modified_marks !== common.NA ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
                        break;
                    case groupTypes.Advanced:
                        advancedQuestions += 1;
                        advancedMarks += marksPerQuestion;
                        advancedObtained += question.modified_marks !== common.NA ? parseFloat(question.modified_marks) || 0 : parseFloat(question.obtained_marks) || 0;
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

        res.individual_group_performance = individualGroupPerformance;
    });

    return markAssignRes;
}

exports.startQuizEvaluationProcess = async (request) => {
    try {
        const allQuizSets = quizSets;
        const quizTestRes = await quizRepository.fetchQuizDataById2(request);

        if (!quizTestRes || !quizTestRes.Item || quizTestRes.Item.quiz_status !== status.active) {
            throw formatErrorResponse(messages.NO_DATA, 400);
        }

        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

        let classPassPercentage = 0;
        let groupPassPercentage = {};
        if (quizTestRes.Item.learningType === prePostConstans.preLearningVal) {
            classPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].pre_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].pre_quiz_config.group_pass_percentage
        } else {
            classPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.class_percentage);
            passPassPercentage = Number(schoolDataRes.Items[0].post_quiz_config.pct_of_student_for_reteach);
            groupPassPercentage = schoolDataRes.Items[0].post_quiz_config.group_pass_percentage
        }

        let studentMetaRes = await quizResultRepository.fetchStudentQuiRresultMetadata2(request);

        if (isEmptyArray(studentMetaRes.Items)) {
            throw formatErrorResponse(messages.NO_ANSWER_SHEET_FOUND, 400);
        }

        const questionArray = await getQuizQuestionIds(quizTestRes.Item.quiz_question_details);

        const fetchBulkQtnReq = {
            IdArray: questionArray,
            fetchIdName: question.question_id,
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: [question.question_id, question.question_label, question.answers_of_question, question.question_content, question.question_disclaimer, question.question_type, question.marks]
        };

        const questionDataRes = await commonRepository.fetchBulkDataWithProjection3(fetchBulkQtnReq);

        let answerCompareArray = [];
        const setsMarkFormat = await getQuizMarksDetailsFormat(quizTestRes.Item.quiz_question_details);

        let totalMarkCopyArray = []
        let qa_detailsCopyArray = []
        for (const [i, studentMarkDetail] of studentMetaRes.Items.entries()) {
            const studentData = studentMarkDetail;
            const quizSetKey = allQuizSets[studentData.quiz_set.toLowerCase()];

            const markDetails = setsMarkFormat.filter(markForm => markForm.set_key === quizSetKey);
            studentMarkDetail.marks_details = markDetails;
            const marksToUpdate = studentMarkDetail.marks_details[0].qa_details;
            const allStudentAnswers = studentMarkDetail.answer_metadata.flatMap(item => item.studentAnswer);

            const mergedAnswers = allStudentAnswers.reduce((acc, curr) => {
                const existing = acc.find(item => item.question === curr.question);
                if (existing) {
                    existing.answer += " " + curr.answer; // Merge answers with a space
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
                    if (question.question_type === question.Descriptive) {
                        correctAnswer = question.answers_of_question
                            .filter((ans) => ans.answer_weightage > 0)
                            .map((ans) => ans.answer_content) // Extract all answer_content
                            .join(" ");
                    } else if (question.question_type === question.Objective) {
                        const index = question.answers_of_question.findIndex(
                            (ans) => ans.answer_display === common.Yes || !ans.answer_display
                        );
                        const indexLetter = String.fromCharCode(97 + index);
                        correctAnswer = index !== -1 ? `${question.answers_of_question[index].answer_content} or ${indexLetter} or ${indexLetter.toUpperCase()} or ${indexLetter}. or ${indexLetter.toUpperCase()}. or ${indexLetter}.${question.answers_of_question[index].answer_content}` : "";
                    } else if (question.question_type === question.Subjective) {
                        correctAnswer = question.answers_of_question
                            .filter((ans) => ans.answer_display === common.Yes)  // Filter answers with answer_display as common.Yes
                            .map((ans) => ans.answer_content)               // Extract the answer_content
                            .join(" ");                                     // Join the answer contents into a single string

                    }
                }
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

            const userPrompt = `Please compare the following answers for similarity. The student"s response should be analyzed properly, compare it with the Correct Answers (which is very important) provided in the correct answer to perform a semantic evaluation and provide a similarity score. - Ensure different phrases or concepts are not mistakenly considered similar, don"t override the student"s response by more than 5%. If the student"s answer does not match any of the meanings as per the Correct Answers present in the correct answer, the similarity score should be 0. 

            Provide a similarity score between 0 and 100 for each comparison.\n\n` +
                questionAnswerPairs.map((pair, index) => {
                    const correctAnswers = extractValidAnswers(pair.correctAnswer);
                    return `Question ${index + 1}:
            Student Answer: "${normalizeAnswer(pair.studentAnswer)}"
            Correct Answers: ${correctAnswers.map(ans => `"${ans}"`).join(", ")}\n`;
                }).join("\n") + `.
            In the response content, just return the similarity scores as numbers separated by new lines (e.g., "100\n85\n") without any additional text, labels, or question numbers. Just Similarity Scores in the specified format.`;

            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that compares answers and provides similarity scores between 0 and 100."
                    },
                    { role: "user", content: userPrompt }
                ],
            });

            const scores = response.choices[0].message.content.split("\n").map(score => parseFloat(score.trim())).filter(value => !isNaN(value));
            let totalMarks = 0;
            let totalExpectedMarks = 0;
            qa_detailsCopyArray.push([]);
            marksToUpdate.forEach((mark, index) => {
                totalExpectedMarks += questionAnswerPairs[index].marks;

                if (questionAnswerPairs[index].question_type === question.Descriptive) {
                    const range = 100 / Number(questionAnswerPairs[index].marks)
                    if (Number.isNaN(scores[index]) || scores[index] < 10) mark.obtained_marks = 0;
                    else {
                        for (let i = 1; i <= questionAnswerPairs[index].marks; i++) {
                            if (scores[index] <= i * range) {
                                mark.obtained_marks = i;
                                break;
                            }
                        }
                    }
                }
                else {
                    if (scores[index] > 80) {
                        mark.obtained_marks = questionAnswerPairs[index].marks;
                    }
                    if (scores[index] === NaN) {
                        mark.obtained_marks = 0;
                    }
                }

                totalMarks += mark.obtained_marks !== common.NA ? mark.obtained_marks : 0;
                mark.obtained_marks = mark.obtained_marks === common.NA ? 0 : mark.obtained_marks;
                mark.student_answer = questionAnswerPairs[index]?.studentAnswer;
                let newMarksData = { ...mark }
                qa_detailsCopyArray[i].push(newMarksData);

                answerCompareArray.push({
                    question_id: questionAnswerPairs[index].question_id,
                    extractedAns: questionAnswerPairs[index].studentAnswer,
                    actualAns: questionAnswerPairs[index].correctAnswer,
                    similarityScore: scores[index]
                });
            });

            studentMetaRes.Items[i].marks_details[0].qa_details = marksToUpdate;
            studentMetaRes.Items[i].evaluated = common.Yes;
            studentMetaRes.Items[i].marks_details[0].expectedMarks = totalExpectedMarks;
            studentMetaRes.Items[i].marks_details[0].totalMark = totalMarks;
            studentMetaRes.Items[i].isPassed = (totalMarks / totalExpectedMarks) * 100 > classPassPercentage;

            totalMarkCopyArray.push({ totalMark: studentMetaRes.Items[i].marks_details[0].totalMark })
        }

        qa_detailsCopyArray.forEach((marksDataArray, i) => {
            if (!studentMetaRes.Items[i] || !totalMarkCopyArray[i]) return;

            studentMetaRes.Items[i] = {
                ...studentMetaRes.Items[i],
                marks_details: [
                    {
                        ...studentMetaRes.Items[i].marks_details[0],
                        qa_details: JSON.parse(JSON.stringify(marksDataArray)),
                        totalMark: totalMarkCopyArray[i].totalMark ?? 0
                    }
                ]
            };
        });

        const markAssignRes = addIndividualGroupPerformance(studentMetaRes.Items, questionDataRes, groupPassPercentage, quizTestRes);
        await commonRepository.bulkBatchWrite(markAssignRes, TABLE_NAMES.upschool_quiz_result);
        return { status: 200 };
    } catch (error) {
        throw error;
    }
};

const getQuizQuestionIds = async (quiz_question_details) => {
    let allQuizSetDetails = quizSetDetails;
    let questionArr = [];

    await allQuizSetDetails.forEach(indSet => {
        questionArr.push(...quiz_question_details[indSet.setKey]);
    })
    questionArr = await removeDuplicates(questionArr);
    return questionArr;
}

exports.assigningQuizMarks = async (studResultData, quizQuestionSets, quesAns, classPassPercentage, groupPassPercentage, questionTrackDetails) => {
    try {
        const allQuizSets = quizSets;
        const setsMarkFormat = await getQuizMarksDetailsFormat(quizQuestionSets);
        studResultData = await concatAnswers(studResultData);

        for (let i = 0; i < studResultData.length; i++) {
            const studentData = studResultData[i];
            const quizSetKey = allQuizSets[studentData.quiz_set.toLowerCase()];
            const questionPaper = quizQuestionSets[quizSetKey];
            const questionPaperTrack = questionTrackDetails[quizSetKey];
            const markDetails = setsMarkFormat.filter(markForm => markForm.set_key === quizSetKey);

            if (!isEmptyArray(studentData.overall_answer)) {
                const finalMarksDetails = await exports.comparingQuizAnswer(
                    studentData.overall_answer,
                    markDetails,
                    questionPaper,
                    quesAns,
                    classPassPercentage,
                    groupPassPercentage,
                    questionPaperTrack
                );

                studentData.marks_details = finalMarksDetails.markDetails;
                studentData.isPassed = finalMarksDetails.isPassed;
            } else {
                studentData.marks_details = markDetails;
                studentData.isPassed = false;
            }
            studentData.evaluated = common.Yes;
            studentData.updated_ts = getCurrentTimestamp();
        }
        return studResultData;
    } catch (error) {
        throw error;
    }
};

exports.comparingQuizAnswer = async (studAns, markDetails, questionPaper, quesAns, classPassPercentage, group_pass_percentage, questionPaperTrack) => {
    return new Promise(async (resolve, reject) => {
        await splitStudentQuizAnswer(studAns).then((splitedAns) => {
            let passStatus = false;
            const sectionLoop = async (i) => {
                if (i < markDetails.length) {
                    if (splitedAns[i] && splitedAns[i].individualAns && !isEmptyArray(splitedAns[i].individualAns)) {
                        await exports.setQizQaDetails(markDetails[i].qa_details, splitedAns[i].individualAns, quesAns, questionPaperTrack).then(async (secQaDetails) => {
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
                    resolve({ markDetails, isPassed: passStatus });
                }
            }
            sectionLoop(0);
        }).catch((error) => {
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
                qaDetails[i].obtained_marks = obMark;
                qaDetails[i].student_answer = indAns[i];
                qaDetails[i].type = localType ? localType.type : null;
            }
        }
        return qaDetails;
    } catch (error) {
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
            if (item?.modified_marks != common.NA)
                return acc + parseFloat(item?.modified_marks)
            if (item?.obtained_marks != common.NA)
                return acc + parseFloat(item?.obtained_marks)
            return acc;
        }, 0);
        const isPassed = (studentResult / totalMarks) * 100 >= individualPassPercentage;
        resolve({ isPassed, studentResult, totalMarks: studentResult, expectedMarks: totalMarks });
    })
};

exports.fetchAllQuizDetails = async (request) => {
    try {
        const fetchQuizResponse = await quizRepository.getAllQuizData2(request);
        return fetchQuizResponse;
    } catch (error) {
        throw error;
    }
};
