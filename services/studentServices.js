const fs = require("fs");
const dynamoDbCon = require('../awsConfig');
const { studentRepository, quizRepository, quizResultRepository, questionRepository, classTestRepository , chapterRepository, subjectRepository, unitRepository  } = require("../repository");
const commonServices = require("../services/commonServices");
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { nextTick } = require("process");
const { response } = require("express");
const { fetchStudentresultMetadata3 } = require("../repository/testResultRepository");


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
        const subjectUnitID = await subjectRepository.getSubjectById3(request);
        console.log({ subjectUnitID });
        // subjectUnitID.forEach(async (unitId) => {
        //     console.log({ unitId });

            const chapterIDs = await unitRepository.fetchUnitData2({subject_unit_id: subjectUnitID});
            console.log({ chapterIDs });
            chapterIDs.forEach(async (chapterUnitId) => {
                const chapterDetails = await chapterRepository.fetchBulkChaptersIDName2(chapterUnitId);
                console.log({ chapterDetails });
                chapterDetails.forEach(async (chapterId) => {
                    request.data.chapter_id = chapterId.chapter_id;
                    const quizDetails = await quizRepository.fetchAllQuizBasedonChapter3(request);
                    const testDetails = await quizRepository.fetchAllQuizBasedonChapter3(request);
                    console.log({ quizDetails });
                    quizDetails.forEach(async (element) => {
                        const quizId = element.quiz_id;
                        const quizResults = await quizResultRepository.fetchStudentQuiRresultMetadata3({quiz_id: quizId});
                        
                        }
                    );
                    });
                }
            );
    } catch (error) {
        throw error;
    }
}