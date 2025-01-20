const fs = require("fs");
const dynamoDbCon = require('../awsConfig');
const { studentRepository, chapterRepository, quizRepository, subjectRepository, unitRepository, quizResultRepository } = require("../repository");
const commonServices = require("../services/commonServices");
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { nextTick } = require("process");
const { response } = require("express");


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