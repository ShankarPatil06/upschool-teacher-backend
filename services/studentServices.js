const fs = require("fs");
const dynamoDbCon = require('../awsConfig');
const { studentRepository, quizRepository, quizResultRepository, questionRepository, classTestRepository, chapterRepository, subjectRepository, unitRepository, classRepository, testQuestionPaperRepository, testResultRepository, topicRepository, conceptRepository, schoolRepository } = require("../repository");
const commonServices = require("../services/commonServices");
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { nextTick } = require("process");
const { response } = require("express");
const { fetchStudentresultMetadata3 } = require("../repository/testResultRepository");
const { get, request } = require("http");
const qs = require('qs');
const axios = require('axios');
const s3Services = require("./s3Service");

exports.fetchAllStudents = function (request, callback) {
    /** FETCH USER BY EMAIL **/
    studentRepository.getStudentsData(request, function (fetch_teacher_section_students_err, fetch_teacher_section_students_response) {
        if (fetch_teacher_section_students_err) {
            console.log(fetch_teacher_section_students_err);
            callback(fetch_teacher_section_students_err, fetch_teacher_section_students_response);
        } else {
            callback(0, fetch_teacher_section_students_response)
        }
    })
}

exports.topAndBottomPerformers = async function (request, callback) {
    try {
        const allquizs = await quizRepository.getQuizBasedonStatus2(request);
        if (!allquizs?.length) {
            console.log('No quizzes found');
            return callback(0, []);
        }

        const quiz_Ids = allquizs.map(quiz => quiz.quiz_id);
        request["unit_Quiz_id"] = quiz_Ids;

        let quiz_results = await quizResultRepository.fetchBulkQuizResultsByID2(request);
        const studentMap = new Map();

        quiz_results = quiz_results.sort((a, b) => {
            return new Date(b.created_ts) - new Date(a.created_ts);
        });

        const studentData = await studentRepository.getStudentsData2(request);

        for (const qResult of quiz_results) {
            const quizType = allquizs.find(quiz => quiz.quiz_id === qResult.quiz_id)?.learningType;

            const studentEntry = studentMap.get(qResult.student_id)?.studentEntry || {
                preLearning: null,
                postLearning: null,
            };

            if (request.data.isRecent && (quizType === "preLearning" && studentEntry.preLearning) ||
                (quizType === "postLearning" && studentEntry.postLearning)) {
                continue;
            }

            for (const mark_details of qResult.marks_details) {
                const questionIds = mark_details.qa_details.map(q => q.question_id);
                request["question_id"] = questionIds;

                const studentMark = mark_details.totalMark;
                const expectedMarks = mark_details.expectedMarks;
                let totalMarks = 0;
                const fetch_bulk_questions_response = await new Promise((resolve, reject) => {
                    questionRepository.fetchBulkQuestionsNameById(request, (err, response) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(response);
                        }
                    });
                });

                if (fetch_bulk_questions_response.Items?.length) {
                    totalMarks = fetch_bulk_questions_response.Items.reduce((sum, question) => sum + question.marks, 0);
                }

                let singleStudent = studentData.Items.find(student => student.student_id === qResult.student_id);
                if (!singleStudent) continue;

                if (quizType === "preLearning") {
                    studentEntry.preLearning = true;
                } else if (quizType === "postLearning") {
                    studentEntry.postLearning = true;
                }

                const student = {
                    student_id: singleStudent.student_id,
                    student_name: `${singleStudent.user_firstname} ${singleStudent.user_lastname}`,
                    studentMark: studentMark,
                    totalMarks: typeof expectedMarks === "string" ? totalMarks : expectedMarks || totalMarks,
                    studentEntry: studentEntry,
                    percentage: ((studentMark / (typeof expectedMarks === "string" ? totalMarks : expectedMarks || totalMarks)) * 100).toFixed(2),
                };

                if (!studentMap.has(student.student_id)) {
                    studentMap.set(student.student_id, student);
                } else {
                    const existingStudent = studentMap.get(student.student_id);
                    existingStudent.studentMark += student.studentMark;
                    existingStudent.totalMarks += student.totalMarks;
                    existingStudent.percentage = (((existingStudent.studentMark / existingStudent.totalMarks) || 0) * 100).toFixed(2);
                    existingStudent.studentEntry = studentEntry;
                    studentMap.set(student.student_id, existingStudent);
                }
            }
        }

        classTestRepository.getClassTestsBasedonStatus(request, async function (allTestErr, allTestResponse) {
            if (allTestErr) {
                console.log(allTestErr);
                callback(allTestErr, allTestResponse);
            } else {
                const allTests = allTestResponse.Items;
                const test_Ids = allTests.map(test => test.class_test_id);
                request["class_test_id"] = test_Ids;
                const testResults = await fetchStudentresultMetadata3(request);

                testResults.forEach(testResult => {
                    let singleStudent = studentData.Items.filter(student => student.student_id === testResult.student_id)
                    const testData = {
                        student_id: testResult.student_id,
                        student_name: `${singleStudent[0].user_firstname} ${singleStudent[0].user_lastname}`,
                        studentMark: testResult?.marks_details[0]?.totalMark,
                        totalMarks: testResult?.marks_details[0]?.expectedMarks,
                        percentage: (((testResult?.marks_details[0]?.totalMark / testResult?.marks_details[0]?.expectedMarks) || 0) * 100).toFixed(2),
                    };
                    if (!studentMap.has(testResult.student_id)) {
                        studentMap.set(testResult.student_id, testData);
                    } else {
                        const existingStudent = studentMap.get(testData.student_id);
                        existingStudent.studentMark += testData.studentMark;
                        existingStudent.totalMarks += testData.totalMarks;
                        existingStudent.percentage = (((existingStudent.studentMark / existingStudent.totalMarks) || 0) * 100).toFixed(2);

                        studentMap.set(testData.student_id, existingStudent);
                    }
                    if (request.data.isRecent) {
                        return;
                    }
                })
                const studentsArray = Array.from(studentMap.values());
                studentsArray.sort((a, b) => b.percentage - a.percentage);

                const topStudents = studentsArray.slice(0, 5);
                const bottomStudents = studentsArray.slice(-5);

                const result = {
                    topPerformers: topStudents,
                    bottomPerformers: bottomStudents.reverse(),
                };
                callback(0, result);
            }
        });
    } catch (error) {
        console.error('Error in topAndBottomPerformers:', error);
        callback(error, null);
    }
};
exports.needAttention = async (request) => {
    try {
        let needAttention = [];
        const schoolDetails = await schoolRepository.getSchoolDetailsById2(request)

        const pre_quiz_config = schoolDetails.Items[0].pre_quiz_config
        const post_quiz_config = schoolDetails.Items[0].post_quiz_config
        const test_config = schoolDetails.Items[0].test_config

        const studentData = await studentRepository.getStudentsData2(request)

        const testDetails = await classTestRepository.fetchAllTestBasedOnSubject(request);

        const quizDetails = await quizRepository.fetchAllQuizBasedOnSubject3(request);
        console.log({ quizDetails });
        const [recentQuiz, recentTest] = await Promise.all([
            getRecentQuiz(quizDetails),
            getRecentTest(testDetails)
        ]);

        if (!recentQuiz && !recentTest) {
            console.log("No recent Quiz or Test found");
        } else {
            const quizDate = recentQuiz?.created_ts ? new Date(recentQuiz.created_ts) : new Date("1900-12-18T10:56:11.143Z");
            const testDate = recentTest?.created_ts ? new Date(recentTest.created_ts) : new Date("1900-12-18T10:56:11.143Z");//new Date(recentTest.created_ts)
            if (quizDate > testDate) {
                // LOGIC FOR QUIZ
                request.data['chapter_id'] = recentQuiz.chapter_id
                const chapter = await chapterRepository.fetchChapterByID2(request)
                const chapterDetails = chapter.Items[0];

                const [pretopicDetails, posttopicDetails] = await Promise.all([
                    topicRepository.fetchPreTopicData2(chapterDetails),
                    topicRepository.fetchPostTopicData2(chapterDetails),
                ]);

                let preConceptDetails = [];
                let postConceptDetails = [];
                if (Array.isArray(pretopicDetails) && pretopicDetails.length > 0) {
                    preConceptDetails = await conceptRepository.fetchConceptUsingTopicId(pretopicDetails);
                }
                if (Array.isArray(posttopicDetails) && posttopicDetails.length > 0) {
                    postConceptDetails = await conceptRepository.fetchConceptUsingTopicId(posttopicDetails);
                }
                const quizResults = await quizResultRepository.fetchStudentQuizResultMetadata3({ quiz_id: recentQuiz.quiz_id });
                console.log({ recentQuiz });
                if (recentQuiz.learningType === 'postLearning') {
                    for (const quizResult of quizResults) {
                        const singleStudentDetails = studentData.Items.filter(student => student.student_id == quizResult.student_id);
                        if (singleStudentDetails.length === 0) continue;
                        let quizSet = (quizResult.quiz_set).toLowerCase();


                        const questionTrackDetails = recentQuiz.question_track_details;
                        const quizConceptQuestionDetails = questionTrackDetails[`qp_set_${quizSet}`];

                        let matchedConcepts = [];
                        for (const mark of quizResult.marks_details[0].qa_details) {
                            for (const type of quizConceptQuestionDetails) {
                                if (type.question_id === mark.question_id) {
                                    let conceptDetails = postConceptDetails.filter(concept => concept.concept_id === type.concept_id);

                                    let existingConcept = matchedConcepts.find(concept => concept.concept_id === conceptDetails[0].concept_id);

                                    const markValue = mark.modified_marks !== "N.A." ? mark.modified_marks : (mark.obtained_marks !== "N.A." ? mark.obtained_marks : 0);

                                    if (existingConcept) {
                                        existingConcept.question_id.push(mark.question_id);
                                        existingConcept.marks.push(markValue);
                                    } else {
                                        matchedConcepts.push({
                                            concept_id: conceptDetails[0].concept_id,
                                            concept_title: conceptDetails[0].concept_title,
                                            question_id: [mark.question_id],
                                            marks: [markValue],
                                        });
                                    }
                                }
                            }
                        }
                        if (matchedConcepts.length > 0) {
                            for (const matchConcept of matchedConcepts) {
                                let questionDetails = await questionRepository.fetchBulkQuestionsNameById2({ question_id: matchConcept.question_id })
                                const totalQuestionMarks = questionDetails.reduce((total, question) => total + question.marks, 0);
                                const totalConceptMarks = matchConcept.marks.reduce((total, mark) => total + mark, 0);
                                if (((totalConceptMarks / totalQuestionMarks) * 100) < post_quiz_config.pct_of_student_for_reteach) {
                                    const existingStudent = needAttention.find(attention => attention.student_id === singleStudentDetails[0].student_id);

                                    if (existingStudent) {
                                        if (!existingStudent.chapter_id.includes(chapterDetails.chapter_id)) {
                                            existingStudent.chapter_id.push(chapterDetails.chapter_id);
                                        }
                                        if (!existingStudent.chapter_name.includes(chapterDetails.chapter_title)) {
                                            existingStudent.chapter_name.push(chapterDetails.chapter_title);
                                        }
                                    } else {
                                        needAttention.push({
                                            student_id: singleStudentDetails[0].student_id,
                                            student_name: `${singleStudentDetails[0].user_firstname} ${singleStudentDetails[0].user_lastname}`,
                                            quiz_id: quizResult.quiz_id,
                                            chapter_id: [chapterDetails.chapter_id],
                                            chapter_name: [chapterDetails.chapter_title],
                                            recentExam: 'postQuiz',
                                        });
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    for (const quizResult of quizResults) {
                        const singleStudentDetails = studentData.Items.filter(student => student.student_id == quizResult.student_id);
                        if (singleStudentDetails.length === 0) continue;
                        let quizSet = (quizResult.quiz_set).toLowerCase();


                        const questionTrackDetails = recentQuiz.question_track_details;
                        const quizConceptQuestionDetails = questionTrackDetails[`qp_set_${quizSet}`];

                        let matchedConcepts = [];
                        for (const mark of quizResult.marks_details[0].qa_details) {
                            for (const type of quizConceptQuestionDetails) {
                                if (type.question_id === mark.question_id) {
                                    let conceptDetails = preConceptDetails.filter(concept => concept.concept_id === type.concept_id);

                                    let existingConcept = matchedConcepts.find(concept => concept.concept_id === conceptDetails[0].concept_id);

                                    const markValue = mark.modified_marks !== "N.A." ? mark.modified_marks : (mark.obtained_marks !== "N.A." ? mark.obtained_marks : 0);

                                    if (existingConcept) {
                                        existingConcept.question_id.push(mark.question_id);
                                        existingConcept.marks.push(markValue);
                                    } else {
                                        matchedConcepts.push({
                                            concept_id: conceptDetails[0].concept_id,
                                            concept_title: conceptDetails[0].concept_title,
                                            question_id: [mark.question_id],
                                            marks: [markValue],
                                        });
                                    }
                                }
                            }
                        }
                        if (matchedConcepts.length > 0) {
                            for (const matchConcept of matchedConcepts) {
                                let questionDetails = await questionRepository.fetchBulkQuestionsNameById2({ question_id: matchConcept.question_id })
                                const totalQuestionMarks = questionDetails.reduce((total, question) => total + question.marks, 0);
                                const totalConceptMarks = matchConcept.marks.reduce((total, mark) => total + mark, 0);

                                if (((totalConceptMarks / totalQuestionMarks) * 100) < pre_quiz_config.pct_of_student_for_reteach) {
                                    const existingStudent = needAttention.find(attention => attention.student_id === singleStudentDetails[0].student_id);

                                    if (existingStudent) {
                                        if (!existingStudent.chapter_id.includes(chapterDetails.chapter_id)) {
                                            existingStudent.chapter_id.push(chapterDetails.chapter_id);
                                        }
                                        if (!existingStudent.chapter_name.includes(chapterDetails.chapter_title)) {
                                            existingStudent.chapter_name.push(chapterDetails.chapter_title);
                                        }
                                    } else {
                                        needAttention.push({
                                            student_id: singleStudentDetails[0].student_id,
                                            student_name: `${singleStudentDetails[0].user_firstname} ${singleStudentDetails[0].user_lastname}`,
                                            quiz_id: quizResult.quiz_id,
                                            chapter_id: [chapterDetails.chapter_id],
                                            chapter_name: [chapterDetails.chapter_title],
                                            recentExam: 'preQuiz',
                                        });
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // LOGIC FOR TEST
                request.data['question_paper_id'] = recentTest.question_paper_id

                const questionPaper = await testQuestionPaperRepository.getTestQuestionPaperById2(request);

                const testResults = await testResultRepository.fetchTestResultOfAllStudent(recentTest)

                for (const chapterId of questionPaper.data[0].chapter_id) {
                    request.data['chapter_id'] = chapterId
                    const chapter = await chapterRepository.fetchChapterByID2(request)
                    const chapterDetails = chapter.Items[0]

                    const [pretopicDetails, posttopicDetails] = await Promise.all([
                        topicRepository.fetchPreTopicData2(chapterDetails),
                        topicRepository.fetchPostTopicData2(chapterDetails),
                    ]);

                    let preConceptDetails = [];
                    let postConceptDetails = [];
                    let allConcept = [];
                    if (Array.isArray(pretopicDetails) && pretopicDetails.length > 0) {
                        preConceptDetails = await conceptRepository.fetchConceptUsingTopicId(pretopicDetails);
                    }
                    if (Array.isArray(posttopicDetails) && posttopicDetails.length > 0) {
                        postConceptDetails = await conceptRepository.fetchConceptUsingTopicId(posttopicDetails);
                    }
                    allConcept = [...preConceptDetails, ...postConceptDetails]

                    for (const testResult of testResults) {
                        const singleStudentDetails = studentData.Items.filter(student => student.student_id === testResult.student_id);
                        if (singleStudentDetails.length === 0) continue;
                        let matchedConcepts = [];
                        for (const mark of testResult.marks_details[0].qa_details) {
                            for (const concept of allConcept) {
                                if (concept.concept_question_id.includes(mark.question_id)) {
                                    const existingConcept = matchedConcepts.find(item => item.concept_id === concept.concept_id);

                                    const markValue = mark.modified_marks !== 'N.A.' ? mark.modified_marks : (mark.obtained_marks !== ' N.A.' ? mark.obtained_marks : 0);

                                    if (existingConcept) {
                                        existingConcept.question_id.push(mark.question_id);
                                        existingConcept.marks.push(markValue);
                                    } else {
                                        matchedConcepts.push({
                                            concept_id: concept.concept_id,
                                            concept_title: concept.concept_title,
                                            question_id: [mark.question_id],
                                            marks: [markValue],
                                        });
                                    }
                                }
                            }
                        }
                        if (matchedConcepts.length > 0) {
                            for (const matchConcept of matchedConcepts) {
                                let questionDetails = await questionRepository.fetchBulkQuestionsNameById2({ question_id: matchConcept.question_id })
                                const totalQuestionMarks = questionDetails.reduce((total, question) => total + question.marks, 0);
                                const totalConceptMarks = matchConcept.marks.reduce((total, mark) => total + mark, 0);

                                if (((totalConceptMarks / totalQuestionMarks) * 100) < test_config.pct_of_student_for_reteach) {
                                    const existingStudent = needAttention.find(attention => attention.student_id === singleStudentDetails[0].student_id);

                                    if (existingStudent) {
                                        if (!existingStudent.chapter_id.includes(chapterDetails.chapter_id)) {
                                            existingStudent.chapter_id.push(chapterDetails.chapter_id);
                                        }
                                        if (!existingStudent.chapter_name.includes(chapterDetails.chapter_title)) {
                                            existingStudent.chapter_name.push(chapterDetails.chapter_title);
                                        }
                                    } else {
                                        needAttention.push({
                                            student_id: singleStudentDetails[0].student_id,
                                            student_name: `${singleStudentDetails[0].user_firstname} ${singleStudentDetails[0].user_lastname}`,
                                            class_test_id: testResult.class_test_id,
                                            chapter_id: [chapterDetails.chapter_id],
                                            chapter_name: [chapterDetails.chapter_title],
                                            recentExam: 'Test'
                                        });
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        console.log({ needAttention });
        return { needAttention };
    }
    catch (error) {
        throw error;
    }
}

const getRecentQuiz = async (quizDetails) => {
    let recentQuiz;
    for (const quiz of quizDetails) {
        const quizResults = await quizResultRepository.fetchStudentQuizResultMetadata3({ quiz_id: quiz.quiz_id });
        if (quizResults.length > 0) {
            recentQuiz = quiz;
            break;
        }
    }
    return recentQuiz;
}

const getRecentTest = async (testDetails) => {
    let recentTest;
    for (const test of testDetails) {
        const testResults = await classRepository.fetchTestResultUsingClassTestId({ class_test_id: test.class_test_id });
        if (testResults.length > 0) {
            recentTest = test
        }
    }
    return recentTest;
}

exports.studentChaptersPerformance = async (request) => {
    try {
        let studentChaptersPerformance = [];

        const schoolDetails = await schoolRepository.getSchoolDetailsById2(request)

        const pre_quiz_config = schoolDetails.Items[0].pre_quiz_config
        const post_quiz_config = schoolDetails.Items[0].post_quiz_config
        const test_config = schoolDetails.Items[0].test_config
        const requestStudentChapter = { data: {} };

        if (request.data.recentExam === 'Test') {

            let testResult = await classRepository.getResult2(request);

            const questionIds = testResult.Items[0].marks_details[0].qa_details.map((qa) => qa.question_id);

            const questionDetails = await questionRepository.fetchBulkQuestionsNameById2({
                question_id: [...new Set(questionIds)],
            });

            for (const chapter of request.data.chapter_id) {

                requestStudentChapter.data['chapter_id'] = chapter
                const chapterItem = await chapterRepository.fetchChapterByID2(requestStudentChapter)
                const chapterDetails = chapterItem.Items[0]
                let allTopics = [];

                const [pretopicDetails, posttopicDetails] = await Promise.all([
                    topicRepository.fetchPreTopicData2(chapterDetails),
                    topicRepository.fetchPostTopicData2(chapterDetails),
                ]);

                allTopics = [...pretopicDetails, ...posttopicDetails]

                let preConceptDetails = [];
                let postConceptDetails = [];
                let allConcept = [];
                if (Array.isArray(pretopicDetails) && pretopicDetails.length > 0) {
                    preConceptDetails = await conceptRepository.fetchConceptUsingTopicId(pretopicDetails);
                }
                if (Array.isArray(posttopicDetails) && posttopicDetails.length > 0) {
                    postConceptDetails = await conceptRepository.fetchConceptUsingTopicId(posttopicDetails);
                }
                allConcept = [...preConceptDetails, ...postConceptDetails]

                let matchedConcepts = [];
                for (const mark of testResult.Items[0].marks_details[0].qa_details) {
                    for (const concept of allConcept) {
                        if (concept.concept_question_id.includes(mark.question_id)) {
                            const existingConcept = matchedConcepts.find(item => item.concept_id === concept.concept_id);

                            const markValue = mark.modified_marks !== "N.A." ? mark.modified_marks : (mark.obtained_marks !== "N.A." ? mark.obtained_marks : 0);

                            if (existingConcept) {
                                existingConcept.question_id.push(mark.question_id);
                                existingConcept.marks.push(markValue);
                            } else {
                                matchedConcepts.push({
                                    concept_id: concept.concept_id,
                                    concept_title: concept.concept_title,
                                    question_id: [mark.question_id],
                                    marks: [markValue],
                                });
                            }
                        }
                    }
                }
                let matchedTopics = [];
                if (matchedConcepts.length > 0) {
                    for (const matchConcept of matchedConcepts) {
                        const questionForConcept = questionDetails.filter(question =>
                            matchConcept.question_id.includes(question.question_id)
                        );
                        const totalQuestionMarks = questionForConcept.reduce((total, question) => total + question.marks, 0);
                        const totalConceptMarks = matchConcept.marks.reduce((total, mark) => total + mark, 0);
                        const scoredPercentage = ((totalConceptMarks / totalQuestionMarks) * 100)

                        matchConcept.totalQuestionMarks = totalQuestionMarks;
                        matchConcept.totalConceptMarks = totalConceptMarks;
                        matchConcept.scoredPercentage = (scoredPercentage % 1 === 0)
                            ? parseInt(scoredPercentage)
                            : parseFloat(scoredPercentage.toFixed(2));

                        for (const topic of allTopics) {
                            if (topic.topic_concept_id.includes(matchConcept.concept_id)) {
                                const existingTopic = matchedTopics.find(t => t.topic_id === topic.topic_id)
                                if (existingTopic) {
                                    existingTopic.totalStudentMarks += totalConceptMarks;
                                    existingTopic.AllConceptQuestionMarks += totalQuestionMarks;
                                    console.log({ existingTopic });
                                    if (matchConcept.scoredPercentage < test_config.pct_of_student_for_reteach) {
                                        console.log({ existingTopic });
                                        console.log(existingTopic.concepts);
                                        existingTopic.concepts?.push(matchConcept);
                                    }
                                } else {
                                    matchedTopics.push({
                                        topic_id: topic.topic_id,
                                        topic_title: topic.topic_title,
                                        totalStudentMarks: totalConceptMarks,
                                        AllConceptQuestionMarks: totalQuestionMarks,
                                        concepts: (matchConcept.scoredPercentage < test_config.pct_of_student_for_reteach) ? [matchConcept] : [],
                                    });
                                }
                            }
                        }
                    }
                }
                console.log({ matchedTopics });
                if (matchedTopics.length > 0) {
                    for (const topic of matchedTopics) {
                        if (topic.concepts.length > 0) {
                            let scoredPercentage = ((topic.totalStudentMarks / topic.AllConceptQuestionMarks) * 100)
                            topic.scoredPercentage = (scoredPercentage % 1 === 0)
                                ? parseInt(scoredPercentage)
                                : parseFloat(scoredPercentage.toFixed(2));
                            let expectedPerformances = studentChaptersPerformance.find(s => s.chapter_id === chapterDetails.chapter_id);
                            if (expectedPerformances) {
                                expectedPerformances.Topics.push(topic)
                            } else {
                                studentChaptersPerformance.push({
                                    chapter_id: chapterDetails.chapter_id,
                                    chapter_title: chapterDetails.chapter_title,
                                    Topics: [topic],
                                    student_id: request.data.student_id
                                });
                            }
                        }
                    }
                }
            }

        } else {
            let quizResult = await quizResultRepository.fetchQuizResultDataOfStudent2(request);
            let quizDetails = await quizRepository.fetchQuizDataById2(request);

            console.log({ quizDetails });
            const questionIds = quizResult.Items[0].marks_details[0].qa_details.map((qa) => qa.question_id);

            const questionDetails = await questionRepository.fetchBulkQuestionsNameById2({
                question_id: [...new Set(questionIds)],
            });
            requestStudentChapter.data['chapter_id'] = request.data.chapter_id[0]
            const chapterItem = await chapterRepository.fetchChapterByID2(requestStudentChapter)
            const chapterDetails = chapterItem.Items[0]

            const [pretopicDetails, posttopicDetails] = await Promise.all([
                topicRepository.fetchPreTopicData2(chapterDetails),
                topicRepository.fetchPostTopicData2(chapterDetails),
            ]);

            let preConceptDetails = [];
            let postConceptDetails = [];
            if (Array.isArray(pretopicDetails) && pretopicDetails.length > 0) {
                preConceptDetails = await conceptRepository.fetchConceptUsingTopicId(pretopicDetails);
            }
            if (Array.isArray(posttopicDetails) && posttopicDetails.length > 0) {
                postConceptDetails = await conceptRepository.fetchConceptUsingTopicId(posttopicDetails);
            }

            let quizSet = (quizResult.Items[0].quiz_set).toLowerCase();
            const questionTrackDetails = quizDetails.Item.question_track_details;
            const quizConceptQuestionDetails = questionTrackDetails[`qp_set_${quizSet}`];

            if (request.data.recentExam === 'preQuiz') {
                let matchedConcepts = [];
                for (const mark of quizResult.Items[0].marks_details[0].qa_details) {
                    for (const type of quizConceptQuestionDetails) {
                        if (type.question_id === mark.question_id) {
                            let conceptDetails = preConceptDetails.filter(concept => concept.concept_id === type.concept_id);
                            const existingConcept = matchedConcepts.find(item => item.concept_id === type.concept_id);
                            const markValue = mark.modified_marks !== "N.A." ? mark.modified_marks : (mark.obtained_marks !== "N.A." ? mark.obtained_marks : 0);
                            if (existingConcept) {
                                existingConcept.question_id.push(mark.question_id);
                                existingConcept.marks.push(markValue);
                            } else {
                                matchedConcepts.push({
                                    concept_id: conceptDetails[0].concept_id,
                                    concept_title: conceptDetails[0].concept_title,
                                    question_id: [mark.question_id],
                                    marks: [markValue],
                                });

                            }
                        }
                    }
                }
                let matchedTopics = [];
                if (matchedConcepts.length > 0) {
                    for (const matchConcept of matchedConcepts) {
                        const questionForConcept = questionDetails.filter(question =>
                            matchConcept.question_id.includes(question.question_id)
                        );

                        const totalQuestionMarks = questionForConcept.reduce((total, question) => total + question.marks, 0);
                        const totalConceptMarks = matchConcept.marks.reduce((total, mark) => total + mark, 0);
                        const scoredPercentage = ((totalConceptMarks / totalQuestionMarks) * 100)
                        matchConcept.totalQuestionMarks = totalQuestionMarks;
                        matchConcept.totalConceptMarks = totalConceptMarks;
                        matchConcept.scoredPercentage = (scoredPercentage % 1 === 0)
                            ? parseInt(scoredPercentage)
                            : parseFloat(scoredPercentage.toFixed(2));

                        for (const topic of pretopicDetails) {
                            if (topic.topic_concept_id.includes(matchConcept.concept_id)) {
                                const existingTopic = matchedTopics.find(t => t.topic_id === topic.topic_id)
                                if (existingTopic) {
                                    existingTopic.totalStudentMarks += totalConceptMarks;
                                    existingTopic.AllConceptQuestionMarks += totalQuestionMarks;
                                    if (matchConcept.scoredPercentage < pre_quiz_config.pct_of_student_for_reteach) {
                                        existingTopic.concepts?.push(matchConcept);
                                    }
                                } else {
                                    matchedTopics.push({
                                        topic_id: topic.topic_id,
                                        topic_title: topic.topic_title,
                                        totalStudentMarks: totalConceptMarks,
                                        AllConceptQuestionMarks: totalQuestionMarks,
                                        concepts: (matchConcept.scoredPercentage < pre_quiz_config.pct_of_student_for_reteach) ? [matchConcept] : [],
                                    });
                                }
                            }
                        }
                    }
                }
                if (matchedTopics.length > 0) {
                    for (const topic of matchedTopics) {
                        if (topic.concepts.length > 0) {
                            let scoredPercentage = ((topic.totalStudentMarks / topic.AllConceptQuestionMarks) * 100)
                            topic.scoredPercentage = (scoredPercentage % 1 === 0)
                                ? parseInt(scoredPercentage)
                                : parseFloat(scoredPercentage.toFixed(2));
                            let expectedPerformances = studentChaptersPerformance.find(s => s.chapter_id === chapterDetails.chapter_id);
                            if (expectedPerformances) {
                                expectedPerformances.Topics.push(topic)
                            } else {
                                studentChaptersPerformance.push({
                                    chapter_id: chapterDetails.chapter_id,
                                    chapter_title: chapterDetails.chapter_title,
                                    Topics: [topic],
                                    student_id: request.data.student_id
                                });
                            }
                        }
                    }
                }
            } else {
                let matchedConcepts = [];
                for (const mark of quizResult.Items[0].marks_details[0].qa_details) {
                    for (const type of quizConceptQuestionDetails) {
                        if (type.question_id === mark.question_id) {
                            let conceptDetails = postConceptDetails.filter(concept => concept.concept_id === type.concept_id);
                            const existingConcept = matchedConcepts.find(item => item.concept_id === type.concept_id);
                            const markValue = mark.modified_marks !== "N.A." ? mark.modified_marks : (mark.obtained_marks !== "N.A." ? mark.obtained_marks : 0);
                            if (existingConcept) {
                                existingConcept.question_id.push(mark.question_id);
                                existingConcept.marks.push(markValue);
                            } else {
                                matchedConcepts.push({
                                    concept_id: conceptDetails[0].concept_id,
                                    concept_title: conceptDetails[0].concept_title,
                                    question_id: [mark.question_id],
                                    marks: [markValue],
                                });

                            }
                        }
                    }
                }
                let matchedTopics = [];
                if (matchedConcepts.length > 0) {
                    for (const matchConcept of matchedConcepts) {
                        const questionForConcept = questionDetails.filter(question =>
                            matchConcept.question_id.includes(question.question_id)
                        );

                        const totalQuestionMarks = questionForConcept.reduce((total, question) => total + question.marks, 0);
                        const totalConceptMarks = matchConcept.marks.reduce((total, mark) => total + mark, 0);
                        const scoredPercentage = ((totalConceptMarks / totalQuestionMarks) * 100)
                        matchConcept.totalQuestionMarks = totalQuestionMarks;
                        matchConcept.totalConceptMarks = totalConceptMarks;
                        matchConcept.scoredPercentage = (scoredPercentage % 1 === 0)
                            ? parseInt(scoredPercentage)
                            : parseFloat(scoredPercentage.toFixed(2));

                        for (const topic of posttopicDetails) {
                            if (topic.topic_concept_id.includes(matchConcept.concept_id)) {
                                const existingTopic = matchedTopics.find(t => t.topic_id === topic.topic_id)
                                if (existingTopic) {
                                    existingTopic.totalStudentMarks += totalConceptMarks;
                                    existingTopic.AllConceptQuestionMarks += totalQuestionMarks;
                                    if (matchConcept.scoredPercentage < post_quiz_config.pct_of_student_for_reteach) {
                                        existingTopic.concepts?.push(matchConcept);
                                    }
                                } else {
                                    matchedTopics.push({
                                        topic_id: topic.topic_id,
                                        topic_title: topic.topic_title,
                                        totalStudentMarks: totalConceptMarks,
                                        AllConceptQuestionMarks: totalQuestionMarks,
                                        concepts: (matchConcept.scoredPercentage < post_quiz_config.pct_of_student_for_reteach) ? [matchConcept] : [],
                                    });
                                }
                            }
                        }
                    }
                }
                console.log({ matchedTopics });
                if (matchedTopics.length > 0) {
                    for (const topic of matchedTopics) {
                        if (topic.concepts.length > 0) {
                            let scoredPercentage = ((topic.totalStudentMarks / topic.AllConceptQuestionMarks) * 100)
                            topic.scoredPercentage = (scoredPercentage % 1 === 0)
                                ? parseInt(scoredPercentage)
                                : parseFloat(scoredPercentage.toFixed(2));
                            let expectedPerformances = studentChaptersPerformance.find(s => s.chapter_id === chapterDetails.chapter_id);
                            if (expectedPerformances) {
                                expectedPerformances.Topics.push(topic)
                            } else {
                                studentChaptersPerformance.push({
                                    chapter_id: chapterDetails.chapter_id,
                                    chapter_title: chapterDetails.chapter_title,
                                    Topics: [topic],
                                    student_id: request.data.student_id
                                });
                            }
                        }
                    }
                }
            }
        }
        return { studentChaptersPerformance };
    } catch (error) {
        throw error;
    }
}

exports.studentAvgVsClassAvg = async (request) => {
    const allquizs = await quizRepository.getQuizBasedonStatus2(request);
    if (!allquizs?.length) {
        console.log('No quizzes found');
        return callback(0, []);
    }

    const quiz_Ids = allquizs.map(quiz => quiz.quiz_id);
    request["unit_Quiz_id"] = quiz_Ids;

    const studentData = await studentRepository.getStudentsData2(request);
    let quiz_results = await quizResultRepository.fetchBulkQuizResultsByID2(request);

    const questionIds = quiz_results.flatMap(quiz =>
        quiz.marks_details.flatMap(mark =>
            mark.qa_details.map(qa => qa.question_id)
        )
    );

    const questionDetails = await questionRepository.fetchBulkQuestionsNameById2({
        question_id: [...new Set(questionIds)],
    });

    const testDetails = await classTestRepository.fetchAllTestBasedOnSubject(request);

    const test_Ids = testDetails.map(test => test.class_test_id);
    request["class_test_id"] = test_Ids;

    const testResult = await testResultRepository.fetchStudentresultMetadata3(request);

    const quizDataMap = new Map();

    for (const qResult of quiz_results) {
        let currentQuiz = allquizs.find(quiz => quiz.quiz_id === qResult.quiz_id);
        if (!currentQuiz) continue;

        if (!quizDataMap.has(qResult.quiz_id)) {
            quizDataMap.set(qResult.quiz_id, {
                quiz_id: qResult.quiz_id,
                quiz_name: currentQuiz.quiz_name,
                total_marks: 0,
                total_obtained_marks: 0,
                students: []
            });
        }

        let quizEntry = quizDataMap.get(qResult.quiz_id);

        for (const mark_details of qResult.marks_details) {
            const questionIdsSet = new Set(mark_details.qa_details.map(q => q.question_id));
            const filteredQuestions = questionDetails.filter(q => questionIdsSet.has(q.question_id));

            const studentMark = mark_details.totalMark;
            const expectedMarks = mark_details.expectedMarks;
            let totalMarks = filteredQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

            let singleStudent = studentData.Items.find(student => student.student_id === qResult.student_id);
            if (!singleStudent) continue;

            const student = {
                student_id: singleStudent.student_id,
                student_name: `${singleStudent.user_firstname} ${singleStudent.user_lastname}`,
                studentMark: studentMark,
                totalMarks: typeof expectedMarks === "string" ? totalMarks : expectedMarks || totalMarks,
                percentage: ((studentMark / (typeof expectedMarks === "string" ? totalMarks : expectedMarks || totalMarks)) * 100).toFixed(2),
            };

            quizEntry.students.push(student);
            quizEntry.total_marks += student.totalMarks;
            quizEntry.total_obtained_marks += studentMark;
        }
        quizDataMap.set(qResult.quiz_id, quizEntry);
    }

    for (const tResult of testResult) {
        let currentTest = testDetails.find(test => test.class_test_id === tResult.class_test_id);
        if (!currentTest) continue;

        if (!quizDataMap.has(tResult.class_test_id)) {
            quizDataMap.set(tResult.class_test_id, {
                quiz_id: tResult.class_test_id,
                quiz_name: currentTest.class_test_name,
                total_marks: 0,
                total_obtained_marks: 0,
                students: []
            });
        }
        let quizEntry = quizDataMap.get(tResult.class_test_id);
        for (const mark_details of tResult?.marks_details) {
            const questionIdsSet = new Set(mark_details.qa_details.map(q => q.question_id));
            const filteredQuestions = questionDetails.filter(q => questionIdsSet.has(q.question_id));
            let totalMarks = filteredQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);

            const studentMark = mark_details.totalMark;
            const expectedMarks = mark_details.expectedMarks;
            let singleStudent = studentData.Items.find(student => student.student_id === tResult.student_id);
            if (!singleStudent) continue;
            const student = {
                student_id: tResult.student_id,
                student_name: `${singleStudent.user_firstname} ${singleStudent.user_lastname}`,
                studentMark: studentMark,
                totalMarks: typeof expectedMarks === "string" ? totalMarks : expectedMarks || totalMarks,
                percentage: ((studentMark / (typeof expectedMarks === "string" ? totalMarks : expectedMarks || totalMarks)) * 100).toFixed(2),
            };
            quizEntry.students.push(student);
            quizEntry.total_marks += student.totalMarks;
            quizEntry.total_obtained_marks += studentMark;
        }
    }

    const quizDataArray = Array.from(quizDataMap.values());
    quizDataArray.forEach(quiz => {
        quiz.class_average = ((quiz.total_obtained_marks / quiz.total_marks) * 100).toFixed(2);
    });

    return quizDataArray
}

exports.studentAvgVsClassAvgChapterWise = async (request) => {
    const allquizs = await quizRepository.getQuizBasedonStatus2(request);
    if (!allquizs?.length) {
        console.log('No quizzes found');
        return callback(0, []);
    }

    const quiz_Ids = allquizs.map(quiz => quiz.quiz_id);
    request["unit_Quiz_id"] = quiz_Ids;

    const chapterMap = allquizs.reduce((acc, quiz) => {
        if (!acc[quiz.chapter_id]) {
            acc[quiz.chapter_id] = new Set();
        }
        acc[quiz.chapter_id].add(quiz.quiz_id);
        return acc;
    }, {});

    const uniqueChapters = Object.entries(chapterMap).map(([chapter_id, quizIds]) => ({
        chapter_id: chapter_id,
        quiz_ids: [...quizIds]
    }));

    const chapter_Ids = [...new Set(allquizs.map(quiz => quiz.chapter_id))];
    request["unit_chapter_id"] = chapter_Ids;

    const studentData = await studentRepository.getStudentsData2(request);
    const quiz_results = await quizResultRepository.fetchBulkQuizResultsByID2(request);
    const testDetails = await classTestRepository.fetchAllTestBasedOnSubject(request);

    const question_paper_ids = testDetails.map(test => test.question_paper_id);
    const test_ids = testDetails.map(test => test.class_test_id);

    request['class_test_id'] = test_ids
    request['question_paper_ids'] = question_paper_ids;

    const testResult = await testResultRepository.fetchStudentresultMetadata3(request);
    const questionPaper = await testQuestionPaperRepository.getTestQuestionPaperById3(request);

    const testChapterMap = {};
    for (const paper of questionPaper.Items) {
        if (paper.chapter_id && Array.isArray(paper.chapter_id)) {
            // Find all matching test_ids for the question_paper_id
            const matchingTests = testDetails.filter(test => test.question_paper_id === paper.question_paper_id);

            for (const chapter of paper.chapter_id) {
                if (!testChapterMap[chapter]) {
                    testChapterMap[chapter] = new Set();
                }

                // Add all test_ids linked to the question_paper_id
                for (const test of matchingTests) {
                    testChapterMap[chapter].add(test.class_test_id);
                }
            }
        }
    }

    const uniqueTestChapters = Object.entries(testChapterMap).map(([chapter_id, testIds]) => ({
        chapter_id: chapter_id,
        test_ids: [...testIds]
    }));

    const questionIds = quiz_results.flatMap(quiz =>
        quiz.marks_details.flatMap(mark =>
            mark.qa_details.map(qa => qa.question_id)
        )
    );

    let questionDetails = [];
    if (questionIds.length > 0) {
        questionDetails = await questionRepository.fetchBulkQuestionsNameById2({
            question_id: [...new Set(questionIds)],
        });
    }

    let chapter_details = await chapterRepository.fetchBulkChaptersIDName2(request);

    const chapterResults = [];
    for (const uniqueChapter of uniqueChapters) {
        let total_marks = 0;
        let total_obtained_marks = 0;
        const studentMap = new Map();

        const current_chapter = chapter_details.find(chapter => chapter.chapter_id === uniqueChapter.chapter_id);

        for (const qResult of quiz_results) {
            if (uniqueChapter.quiz_ids.includes(qResult.quiz_id)) {
                for (const mark_details of qResult.marks_details) {
                    const questionIdsSet = new Set(mark_details.qa_details.map(q => q.question_id));
                    const filteredQuestions = questionDetails.filter(q => questionIdsSet.has(q.question_id));

                    const studentMark = mark_details.totalMark;
                    const expectedMarks = mark_details.expectedMarks;
                    let totalMarks = filteredQuestions[0]?.marks || 0;
                    total_marks += (typeof mark_details.expectedMarks === "string" ? filteredQuestions[0]?.marks : mark_details.expectedMarks || filteredQuestions[0]?.marks) || 0;
                    total_obtained_marks += studentMark;

                    let singleStudent = studentData.Items.find(student => student.student_id === qResult.student_id);
                    if (!singleStudent) continue;

                    const student = {
                        student_id: singleStudent.student_id,
                        student_name: `${singleStudent.user_firstname} ${singleStudent.user_lastname}`,
                        studentMark: studentMark,
                        totalMarks: typeof expectedMarks === "string" ? totalMarks : expectedMarks || totalMarks,
                        percentage: (((studentMark / (expectedMarks || totalMarks)) || 0) * 100).toFixed(2),
                    };

                    if (!studentMap.has(student.student_id)) {
                        studentMap.set(student.student_id, student);
                    } else {
                        const existingStudent = studentMap.get(student.student_id);
                        existingStudent.studentMark += student.studentMark;
                        existingStudent.totalMarks += student.totalMarks;
                        existingStudent.percentage = (((existingStudent.studentMark / existingStudent.totalMarks) || 0) * 100).toFixed(2);
                        studentMap.set(student.student_id, existingStudent);
                    }
                }
            }
        }
        chapterResults.push({
            chapter_id: uniqueChapter.chapter_id,
            chapter_name: current_chapter?.display_name || '',
            total_marks,
            total_obtained_marks,
            class_average: ((total_obtained_marks / total_marks) * 100).toFixed(2),
            students: Array.from(studentMap.values()),
        });
    }

    const chapterTestResults = [];
    for (const chapter of uniqueTestChapters) {
        let total_marks = 0;
        let total_obtained_marks = 0;
        const studentMap = new Map();

        const current_chapter = chapter_details.find(ch => ch.chapter_id === chapter.chapter_id);

        for (const test of testResult) {
            if (chapter.test_ids.includes(test.class_test_id)) {
                for (const marks of test.marks_details) {
                    total_marks += marks.expectedMarks || 0;
                    total_obtained_marks += marks.totalMark || 0;

                    let student = studentData.Items.find(s => s.student_id === test.student_id);
                    if (!student) continue;

                    const studentEntry = {
                        student_id: student.student_id,
                        student_name: `${student.user_firstname} ${student.user_lastname}`,
                        studentMark: marks.totalMark,
                        totalMarks: marks.expectedMarks || 0,
                        percentage: (((marks.totalMark / (marks.expectedMarks || 1)) * 100).toFixed(2))
                    };

                    if (!studentMap.has(student.student_id)) {
                        studentMap.set(student.student_id, studentEntry);
                    } else {
                        let existing = studentMap.get(student.student_id);
                        existing.studentMark += studentEntry.studentMark;
                        existing.totalMarks += studentEntry.totalMarks;
                        existing.percentage = (((existing.studentMark / existing.totalMarks) * 100).toFixed(2));
                        studentMap.set(student.student_id, existing);
                    }
                }
            }
        }

        chapterTestResults.push({
            chapter_id: chapter.chapter_id,
            chapter_name: current_chapter?.display_name || '',
            total_marks,
            total_obtained_marks,
            class_average: ((total_obtained_marks / total_marks) * 100).toFixed(2),
            students: Array.from(studentMap.values())
        });
    }
    const mergedResults = {};

    for (const result of [...chapterResults, ...chapterTestResults]) {
        const { chapter_id, total_marks, total_obtained_marks, students } = result;

        if (!mergedResults[chapter_id]) {
            mergedResults[chapter_id] = { ...result };
        } else {
            mergedResults[chapter_id].total_marks = (parseFloat(mergedResults[chapter_id].total_marks) || 0) + (parseFloat(total_marks) || 0);
            mergedResults[chapter_id].total_obtained_marks += total_obtained_marks;
            mergedResults[chapter_id].class_average = ((mergedResults[chapter_id].total_obtained_marks / mergedResults[chapter_id].total_marks) * 100).toFixed(2);

            const existingStudents = new Map(mergedResults[chapter_id].students.map(s => [s.student_id, s]));

            for (const student of students) {
                if (existingStudents.has(student.student_id)) {
                    const existing = existingStudents.get(student.student_id);
                    existing.studentMark += student.studentMark;
                    existing.totalMarks = parseFloat(existing.totalMarks) + parseFloat(student.totalMarks);
                    existing.percentage = ((existing.studentMark / existing.totalMarks) * 100).toFixed(2);
                } else {
                    existingStudents.set(student.student_id, { ...student });
                }
            }
            mergedResults[chapter_id].students = Array.from(existingStudents.values());
        }
    }

    // Convert object back to array
    const finalResults = Object.values(mergedResults);
    return finalResults;
}

exports.customWorksheetGenerated = async (request) => {
    try {
        let allQuestions = [];
        const inValidChapters = [];
        for (const chapter of request.data.chapters) {
            const uniqueQuestionsSet = new Set();
            const conceptDetails = await conceptRepository.fetchConceptIDDisplayName2({ concept_array: chapter.concept_ids });
            conceptDetails.forEach((concept) => {
                concept.concept_question_id.forEach((questionId) => {
                    uniqueQuestionsSet.add(questionId);
                });
            });
            const chapterQuestions = uniqueQuestionsSet.size
            if (chapterQuestions < chapter?.numberOfQuestion) {
                inValidChapters.push({
                    chapter_id: chapter.chapter_id,
                    chapter_name: chapter.chapter_name
                })
            }
            allQuestions = Array.from(new Set([
                ...allQuestions,
                ...conceptDetails.flatMap(item => item.concept_question_id),
            ]))
        }

        if (inValidChapters.length > 0) {
            if (inValidChapters.length === 1) {
                throw new Error(`There is not enough questions for the chapter: ${inValidChapters[0].chapter_name}.`);
            } else {
                throw new Error(`There are not enough questions for the following chapters: ${inValidChapters.map(i => i.chapter_name).join(', ')}.`);
            }
        }
        if (allQuestions.length < request.data.numberOfQuestionWorksheet) {
            throw new Error(`There are not enough questions to generate for worksheets.`);
        }
        const studentCustomWorksheet = await testQuestionPaperRepository.fetchStudentWorksheetBasedOnTestId(request)
        if (studentCustomWorksheet?.Items?.[0]) throw new Error(`Already Worksheet Generated for this student`);
        let numberOfQuestionsForWorksheet = request.data.numberOfQuestionWorksheet;
        let questions = [];
        let totalQuestions = 0;
        let chapterIndex = 0;
        let conceptQuestionTracker = {};
        while (totalQuestions < numberOfQuestionsForWorksheet) {
            let chapter = request.data.chapters[chapterIndex];
            let chapterQuestions = 0;
            let conceptDetails = await conceptRepository.fetchConceptIDDisplayName2({ concept_array: chapter.concept_ids });
            const conceptQuestions = conceptDetails.map((concept) => concept.concept_question_id);

            const totalConcepts = conceptDetails.length;

            let chapterMaxQuestions = chapter.numberOfQuestion;
            if (chapterMaxQuestions === null) {
                chapterMaxQuestions = numberOfQuestionsForWorksheet - totalQuestions;
            }

            for (let i = 0; i < totalConcepts; i++) {
                let questionList = conceptQuestions[i];

                if (questionList && questionList.length > 0) {
                    let lastUsedIndex = conceptQuestionTracker[chapter.chapter_id]?.[i] || 0;

                    const questionId = questionList[lastUsedIndex];

                    if (questionId !== undefined && !questions.includes(questionId)) {
                        questions.push(questionId);
                        totalQuestions++;
                        chapterQuestions++;

                        if (!conceptQuestionTracker[chapter.chapter_id]) {
                            conceptQuestionTracker[chapter.chapter_id] = {};
                        }
                        conceptQuestionTracker[chapter.chapter_id][i] = (lastUsedIndex + 1) % questionList.length;

                        if (totalQuestions >= numberOfQuestionsForWorksheet) {
                            break;
                        }
                    }
                }
            }
            if (chapterQuestions >= chapterMaxQuestions || totalQuestions < numberOfQuestionsForWorksheet) {
                console.log(chapter.chapter_name);
                chapterIndex = (chapterIndex + 1) % request.data.chapters.length;
            }
        }
        console.log({ questions });
        const studentWorksheet = await testQuestionPaperRepository.fetchStudentWorksheet(request)
        console.log({ studentWorksheet });
        if (questions.length > 0) {
            const studentFirstName = request.data.student_name.split(' ')[0];
            const existingName = studentWorksheet.Items[0]?.question_paper_name || `${studentFirstName}_worksheet_0`;
            const nameParts = existingName.match(/^(.*?)(_(\d+))?$/);
            const baseName = nameParts[1];
            const currentNumber = nameParts[3] ? parseInt(nameParts[3], 10) : 0;
            const question_paper_name = `${baseName}_${currentNumber + 1}`;


            request.data["questions"] = questions
            request.data["question_paper_status"] = "Active"
            request.data["question_paper_name"] = question_paper_name
            request.data["blueprint_type"] = "customWorksheet"

            if (studentWorksheet.Items.length > 0 && studentWorksheet.Items) {
                request.data["question_paper_id"] = studentWorksheet.Items[0].question_paper_id
                await testQuestionPaperRepository.updateCustomWorkSheetQuestionPaper(request)
            } else {
                request.data["question_paper_id"] = await helper.getRandomString();
                await testQuestionPaperRepository.insertCustomWorkSheetQuestionPaper(request)
            }

            request.data.class_test_id = request.data.test_id;

            let resultPdf = await createPDFandUpdateTemplateDetails(request);
            console.log(resultPdf.data);

            request.data["question_paper_template"] = resultPdf.data

            await testQuestionPaperRepository.updateTemplateDetails(request)
            return 200
        }
    } catch (error) {
        throw error;
    }
}

const createPDFandUpdateTemplateDetails = async (request) => {
    try {
        const options = {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            data: qs.stringify(request),
            url: process.env.PDF_GENERATION_URL + '/createCustomWorksheet',
        };

        const pdfData = await axios(options);
        // console.log("PDFs Generated!", pdfData);

        return pdfData;
    } catch (err) {
        console.error("Error in EC2:", err);
        return { status: 400, error: err };
    }
};

exports.fetchCustomWorksheet = async (request) => {
    try {
        const studentWorksheet = await testQuestionPaperRepository.fetchStudentWorksheetBasedOnTestId(request)
        if (studentWorksheet?.Items?.[0]) {
            let questionPaperTEmp = studentWorksheet.Items[0]?.question_paper_template || 'N.A.';
            let questionUrlCheck = constant.testFolder.customQuestionPapers.split("/")[0];
            console.log({ questionPaperTEmp }, studentWorksheet.Items[0], questionUrlCheck);

            studentWorksheet.Items[0].worksheet_template_url = questionPaperTEmp.includes(questionUrlCheck)
                ? await s3Services.getS3SignedUrl(questionPaperTEmp)
                : "N.A.";
            return studentWorksheet.Items[0];
        }
        return { status: 404, message: "No worksheet is available for this test for this student" };
    } catch (error) {
        throw error;
    }
}

exports.sendEmailToParent = async (request) => {
    try {
        const student_id = request.data.student_id;
        const studentDetails = await studentRepository.getAllStudents2(student_id);
        console.log({ studentDetails: studentDetails.Items[0] });
        if (studentDetails?.Items?.[0]) {
            request.data['parent_id'] = studentDetails.Items[0].parent_id;
            const parentDetails = await studentRepository.getParentDetailsById(request)
            console.log({ parentDetails });
            if (parentDetails.user_email) throw new Error('There is no parent email associated with the student');
            const emailData = {
                from: 'Your Email',
                to: parentDetails.user_email,
                subject: 'Your Test Results',
                text: 'Your test results are ready. Please download and review.',
                attachments: [
                    {
                        filename: 'test_results.pdf',
                        path: request.data.question_paper_template,
                        contentType: 'application/pdf',
                    },
                ],
            };
        }
    } catch (error) {
        throw error;
    }
}