const { classTestRepository, testQuestionPaperRepository, commonRepository, classRepository, testResultRepository, } = require("../repository")
const { TABLE_NAMES } = require("../constants/tables");
const constant = require("../constants/constant");
const helper = require("../helper/helper");
const qs = require("qs");
const axios = require("axios");
const s3Services = require("./s3Service");
const { OpenAI } = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

exports.addClassTest = async (request) => {
    const fetch_class_test_res = await classTestRepository.fetchClassTestByName2(request)
    if (fetch_class_test_res.Items.length === 0) {
        request.data.class_test_id = helper.getRandomString();
        const options = {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            data: qs.stringify(request),
            url: process.env.PDF_GENERATION_URL + "/createQuestionAndAnswerPapers",
            // url: "http://localhost:3005/v1" + "/createQuestionAndAnswerPapers",
        };
        const pdfData = await axios(options);
        request.data.answer_sheet_template = pdfData.data.answer_sheet_template;
        request.data.question_paper_template = pdfData.data.question_paper_template;
        request.data.key_answer_template = pdfData.data.key_answer_template;

        return await classTestRepository.insertClassTest2(request);
    }
};

exports.fetchClassTestsBasedonStatus = async (request) => await classTestRepository.getClassTestsBasedonStatus2({ items: [request.data], condition: constant.common.AND });

exports.fetchClassTestsBasedonStatus2 = async (request) => await classTestRepository.fetchAllTestBasedOnSubject(request);

exports.getClassTestbyId = async (request) => {
    request.data.class_test_status = constant.common.Active;
    const classTestRes = await classTestRepository.getClassTestIdAndName2(request)

    let questionPaperTEmp = classTestRes.Items[0].question_paper_template ? classTestRes.Items[0].question_paper_template : constant.common.NA;
    let answerSheetTemp = classTestRes.Items[0].answer_sheet_template ? classTestRes.Items[0].answer_sheet_template : constant.common.NA;
    let keyAnswerTemp = classTestRes.Items[0].key_answer_template ? classTestRes.Items[0].key_answer_template : constant.common.NA;

    let questionUrlCheck = constant.testFolder.questionPapers.split("/")[0];
    let answerUrlCheck = constant.testFolder.answerSheets.split("/")[0];
    let keyanswerUrlCheck = constant.testFolder.questionPapers.split("/")[0];

    classTestRes.Items[0].question_paper_template_url = questionPaperTEmp.includes(questionUrlCheck) ? await s3Services.getS3SignedUrl(questionPaperTEmp) : constant.common.NA;
    classTestRes.Items[0].answer_sheet_template_url = answerSheetTemp.includes(answerUrlCheck) ? await s3Services.getS3SignedUrl(answerSheetTemp) : constant.common.NA;
    classTestRes.Items[0].key_answer_template_url = keyAnswerTemp.includes(keyanswerUrlCheck) ? await s3Services.getS3SignedUrl(keyAnswerTemp) : constant.common.NA;

    return classTestRes
}

exports.startEvaluationProcess = async (request) => {
    try {
        request.data.class_test_status = constant.common.Active;

        const classTestRes = await classTestRepository.getClassTestIdAndName2(request);
        const classTest = classTestRes.Items[0];

        if (!classTest) {
            throw helper.formatErrorResponse(constant.messages.NO_DATA, 400);
        }

        const studentMetaRes = await testResultRepository.fetchStudentresultMetadata2(request);
        if (studentMetaRes.Items.length === 0) {
            throw helper.formatErrorResponse(constant.messages.NO_ANSWER_SHEET_FOUND, 400);
        }

        request.data.question_paper_id = classTest.question_paper_id;
        const questionPaperRes = await testQuestionPaperRepository.fetchTestQuestionPaperByID2(request);
        const questionPaper = questionPaperRes.Items[0];

        if (!questionPaper) {
            throw helper.formatErrorResponse(constant.messages.NO_QUESTION_PAPER_FOUND, 400);
        }

        const questionArray = questionPaper.questions.flatMap((e) => e.question_id);

        const fetchBulkQtnReq = {
            IdArray: questionArray,
            fetchIdName: constant.question.question_id,
            TableName: TABLE_NAMES.upschool_question_table,
            projectionExp: [constant.question.question_id, constant.question.answers_of_question  , constant.question.answers_of_question, constant.question.question_content, constant.question.question_disclaimer, constant.question.question_type, constant.question.marks],
        };

        const questionDataRes = await commonRepository.fetchBulkDataWithProjection3(fetchBulkQtnReq);
        if (questionDataRes.length === 0) {
            throw helper.formatErrorResponse(constant.messages.NO_QUESTION_DATA_FOUND, 400);
        }
        const marksFormat = await exports.assigningMarks(questionPaperRes.Items[0])

        for (let studentMarkDetail of studentMetaRes.Items) {
            if (!studentMarkDetail.marks_details) studentMarkDetail.marks_details = [];
            studentMarkDetail.marks_details = [marksFormat];
            const marksToUpdate = marksFormat.qa_details;
            const allStudentAnswers = studentMarkDetail.answer_metadata.flatMap(item => item.studentAnswer);
            const mergedAnswers = allStudentAnswers.reduce((acc, curr) => {
                const existing = acc.find(item => item.question === curr.question);
                if (existing) {
                    existing.answer += " " + curr.answer; // Merge answers with a space if it is in 2 pages
                } else {
                    acc.push({ ...curr });
                }
                return acc;
            }, []);

            const studentAnswers = mergedAnswers.map((mark, i) => {
                const questionDetail = studentMarkDetail.marks_details[0].qa_details[mergedAnswers[i]?.question - 1]
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
                    if (question.question_type === constant.question.Descriptive) {
                        correctAnswer = question.answers_of_question
                            .filter((ans) => ans.answer_weightage > 0)
                            .map((ans) => ans.answer_content) // Extract all answer_content
                            .join(" ");
                    } else if (question.question_type === constant.question.Objective) {
                        const index = question.answers_of_question.findIndex(
                            (ans) => ans.answer_display === constant.common.Yes || !ans.answer_display
                        );
                        const indexLetter = String.fromCharCode(97 + index);
                        correctAnswer = index !== -1 ? `${question.answers_of_question[index].answer_content} or ${indexLetter} or ${indexLetter.toUpperCase()} or ${indexLetter}. or ${indexLetter.toUpperCase()}. or ${indexLetter}.${question.answers_of_question[index].answer_content}` : "";
                    } else if (question.question_type === constant.question.Subjective) {
                        correctAnswer = question.answers_of_question
                            .filter((ans) => ans.answer_display === constant.common.Yes)  // Filter answers with answer_display as constant.common.Yes
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
                    question_type: type,
                };
            });

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
            Ensure different words or concepts are not mistakenly considered similar. If the student"s answer does not match any of the meanings in the correct answer, the similarity score should be 0.
            
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
                    { role: "system", content: "You are a helpful assistant that compares answers and provides similarity scores between 0 and 100." },
                    { role: "user", content: userPrompt },
                ],
            });

            const scores = response.choices[0].message.content.split("\n").map(score => parseFloat(score.trim())).filter(value => !isNaN(value));

            let totalMarks = 0;
            let totalExpectedMarks = 0;
            marksToUpdate.forEach((mark, index) => {
                totalExpectedMarks += questionAnswerPairs[index].marks;

                if (questionAnswerPairs[index].question_type === constant.question.Descriptive) {
                    const range = 100 / Number(questionAnswerPairs[index].marks);
                    if (isNaN(scores[index]) || scores[index] < 10) {
                        mark.obtained_marks = 0;
                    } else {
                        for (let i = 1; i <= questionAnswerPairs[index].marks; i++) {
                            if (scores[index] <= i * range) {
                                mark.obtained_marks = i;
                                totalMarks += i;
                                break;
                            }
                        }
                    }
                } else {
                    if (scores[index] > 80) {
                        mark.obtained_marks = questionAnswerPairs[index].marks;
                        totalMarks += questionAnswerPairs[index].marks;
                    } else {
                        mark.obtained_marks = 0;
                    }
                }
                mark.student_answer = questionAnswerPairs[index].studentAnswer;
            });
            studentMarkDetail.marks_details[0].qa_details = marksToUpdate;
            studentMarkDetail.evaluated = constant.common.Yes;
            studentMarkDetail.marks_details[0].expectedMarks = totalExpectedMarks;
            studentMarkDetail.marks_details[0].totalMark = totalMarks;
            studentMarkDetail.isPassed = (totalMarks / totalExpectedMarks) * 100 > classTest.classPassPercentage;
        }
        await commonRepository.bulkBatchWrite(studentMetaRes.Items, TABLE_NAMES.upschool_test_result);
        return { status: 200 };
    } catch (error) {
        console.error(error);
        throw error;
    }
};

exports.assigningMarks = async (questionPaper) => {
    try {
        const markDetails = await helper.getMarksDetailsFormat(questionPaper.questions);
        return markDetails;
    } catch (error) {
        throw error;
    }
};

exports.compareAnswer = (question, studAns) => {
    return new Promise(async (resolve, reject) => {
        let multiAns = await studAns.split(constant.evalConstant.splitLines).filter(emptyEle => emptyEle !== "");
        if (question.question_type === constant.questionKeys.objective) {
            await helper.getIndexOfStudentAns(multiAns).then(async (studentAnswer) => {
                await helper.getOptionsWrightAnswers(question.answers_of_question).then(async (correctAns) => {
                    (async () => {
                        await helper.getObjectiveMarks(correctAns, studentAnswer).then(async (scoredMark) => {
                            resolve(scoredMark > question.marks ? question.marks : scoredMark);
                        })
                    })();
                })
            })
        }
        else if (question.question_type === constant.questionKeys.subjective) {
            await exports.subjectiveAnswerCorrection(question.answers_of_question, multiAns, question.question_content).then(async (scoredMark) => {
                resolve(scoredMark > question.marks ? question.marks : scoredMark);
            })
        }
        else {
            await exports.descriptiveAnswerCorrection(question.answers_of_question, studAns).then(async (scoredMark) => {
                resolve(scoredMark > question.marks ? question.marks : scoredMark);
            })
        }
    })
}

exports.descriptiveAnswerCorrection = async (answersOfQuestion, studentAns) => {
    return new Promise(async (resolve, reject) => {
        let totalMarks = 0;
        await answersOfQuestion.forEach((dAns, i) => {
            if (studentAns.toLowerCase().replace(/ /g, "").includes(dAns.answer_content.toLowerCase().replace(/ /g, ""))) {
                totalMarks += Number(dAns.answer_weightage);
            }
        })
        resolve(totalMarks);
    })
}

exports.subjectiveAnswerCorrection = async (answersOfQuestion, studentAnsArr, questionContent) => {
    return new Promise(async (resolve, reject) => {
        let blankAns = "";
        let totalMarks = 0;

        let reg = new RegExp((constant.answerSheet.findBlank) + ("(.*?)") + (constant.answerSheet.findBlank), "g");
        let blanklist = (questionContent.match(reg) || []);
        await blanklist.forEach(async (bName, i) => {
            blankAns = await answersOfQuestion.filter(bAns => bAns.answer_option === bName);
            if (blankAns.length > 0 && studentAnsArr[i]) {
                totalMarks += blankAns[0].answer_content.toLowerCase().replace(/ /g, "") == studentAnsArr[i].replace(/^,/, "").toLowerCase().replace(/ /g, "") ? Number(blankAns[0].answer_weightage) : 0;
            }
        })
        resolve(totalMarks);
    })
}

exports.fetchGetStudentData = async (request) => {
    const studentData = await classTestRepository.getStudentInfo(request);
    studentData?.Items?.sort((a, b) => a.roll_no.localeCompare(b.roll_no));
    return { Items: studentData?.Items?.filter(student => student.user_status === constant.common.Active) };
};

exports.getResult = async (request) => {
    const result_response = await classRepository.getResult2(request)
    if (result_response.Items.length == 0) return result_response;
    await Promise.all(result_response.Items[0].answer_metadata.map(async (result) => {
        result.content_url = await s3Services.getS3SignedUrl(result.url);
    }));
    return result_response;
}

exports.changeStudentMarks = async (request) => await classRepository.modifyStudentMarks2(request)

exports.resetResultEvaluateStatus = async (request) => await testResultRepository.changeTestEvaluationStatus2(request)

exports.updateClassTestStatus = async (request) => await classTestRepository.updateClassTestStatus2(request)