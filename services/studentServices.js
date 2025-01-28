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


exports.fetchAllStudents = function (request, callback) {
    /** FETCH USER BY EMAIL **/
    studentRepository.getAllStudentsData(request, function (fetch_teacher_section_students_err, fetch_teacher_section_students_response) {
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
                    totalMarks: expectedMarks || totalMarks,
                    studentEntry: studentEntry,
                    percentage: (((studentMark / (expectedMarks || totalMarks)) || 0) * 100).toFixed(2),
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
                                    Topics: [topic]
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
                                    Topics: [topic]
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
                                    Topics: [topic]
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