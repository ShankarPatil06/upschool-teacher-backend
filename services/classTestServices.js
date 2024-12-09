const dynamoDbCon = require('../awsConfig');
const { classTestRepository,testQuestionPaperRepository,commonRepository,classRepository,testResultRepository,} = require("../repository")
const commonServices = require("../services/commonServices");
const { TABLE_NAMES } = require('../constants/tables');
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const qs = require('qs');
const axios = require('axios');
const ocrServices = require('./ocrServices');
const { resolve } = require('bluebird');
const { postAPICall } = require('../apiHelper/httpCommon');
const s3Services = require("./s3Service");

exports.addClassTest = async (request) => {
    const fetch_class_test_res = await classTestRepository.fetchClassTestByName2(request)
    console.log("fetch_class_test_res - ",fetch_class_test_res);
    if (fetch_class_test_res.Items.length === 0) {
        request.data.class_test_id = helper.getRandomString();
        console.log("request.data.class_test_id - ",request.data.class_test_id);
        // const options = {
        //     method: 'POST',
        //     headers: { 'content-type': 'application/x-www-form-urlencoded' },
        //     data: qs.stringify(request),
        //     url: process.env.PDF_GENERATION_URL + '/createQuestionAndAnswerPapers',
        // };
        const headers = { 'content-type': 'application/x-www-form-urlencoded' }
        console.log("qs.stringify(request) - ",qs.stringify(request));
        // const pdfData = await axios(options);
        // const pdfData = await postAPICall('http://13.233.9.196:3002/v1' + '/createQuestionAndAnswerPapers',qs.stringify(request),headers)
        const pdfData = await postAPICall('http://localhost:3005/v1' + '/createQuestionAndAnswerPapers',qs.stringify(request),headers)
        request.data.answer_sheet_template = pdfData.data.answer_sheet_template;
        request.data.question_paper_template = pdfData.data.question_paper_template;  

        return await classTestRepository.insertClassTest2(request);
    }

};

exports.fetchClassTestsBasedonStatus = async (request) => await classTestRepository.getClassTestsBasedonStatus2({ items: [request.data], condition: "AND" });


exports.getClassTestbyId = async (request) => {
    request.data.class_test_status = "Active";
    const classTestRes = await classTestRepository.getClassTestIdAndName2(request)

    let questionPaperTEmp = classTestRes.Items[0].question_paper_template ? classTestRes.Items[0].question_paper_template : "N.A.";
    let answerSheetTemp = classTestRes.Items[0].answer_sheet_template ? classTestRes.Items[0].answer_sheet_template : "N.A.";

    let questionUrlCheck = constant.testFolder.questionPapers.split("/")[0];
    let answerUrlCheck = constant.testFolder.answerSheets.split("/")[0];

    classTestRes.Items[0].question_paper_template_url = questionPaperTEmp.includes(questionUrlCheck) ? await s3Services.getS3SignedUrl(questionPaperTEmp) : "N.A.";
    classTestRes.Items[0].answer_sheet_template_url = answerSheetTemp.includes(answerUrlCheck) ? await s3Services.getS3SignedUrl(answerSheetTemp) : "N.A.";

    return classTestRes

}

exports.startEvaluationProcess = async (request) => {
    try{
    request.data.class_test_status = "Active";
    const classTestRes = await classTestRepository.getClassTestIdAndName2(request)
   
        let classTest = classTestRes.Items[0];
        const studentMetaRes = await testResultRepository.fetchStudentresultMetadata2(request)
        console.log("STUDENT METADATA : ", studentMetaRes);
            request.data.question_paper_id = classTest.question_paper_id;
            const questionPaperRes = await testQuestionPaperRepository.fetchTestQuestionPaperByID2(request)
            console.log("QUESTION PAPER : ", questionPaperRes.Items);
            let questionArray = [];
            await questionPaperRes.Items[0].questions.forEach((e) => questionArray.push(...e.question_id))
            console.log("QUESTION IDS : ", questionArray);
            let fetchBulkQtnReq = {
                IdArray: questionArray,
                fetchIdName: "question_id",
                TableName: TABLE_NAMES.upschool_question_table,
                projectionExp: ["question_id", "question_label", "answers_of_question", "question_content", "question_disclaimer", "question_type"]
            }
            const quizIds = fetchBulkQtnReq.IdArray.map((val) => ({ quiz_id: val }));

            const questionDataRes = await commonRepository.fetchBulkDataWithProjection2({ items: quizIds, condition: "AND" })
            console.log("QUESTION DATA : ", questionDataRes.Items);

           const markAssignRes  = await exports.assigningMarks(studentMetaRes.Items, questionPaperRes.Items[0], questionDataRes.Items)
               
                    console.log(markAssignRes);

                    /** BATCH UPDATE **/
                    let resultTable = TABLE_NAMES.upschool_test_result;
                    commonRepository.bulkBatchWrite(markAssignRes, resultTable)
                        return { status: 200 };
                    } catch (error) {
                        console.error(error);
                        throw error;
                    }                 

            
        
        
    
   

}

exports.assigningMarks = async (studResultData, questionPaper, quesAns) => {
    try {
        console.log("assigningMarksquesAns", quesAns);

        // Get the final data format
        const markDetails = await helper.getMarksDetailsFormat(questionPaper.questions);
        console.log("STUDENT RESULT STRUCTURE : ", markDetails);

        // Get concatenated answers
        const overallAns = await helper.concatAnswers(studResultData);
        studResultData = overallAns;
        console.log("CONCAT STUDENT ANSWERS : ", studResultData);

        // Loop through each student's result data
        for (let i = 0; i < studResultData.length; i++) {
            if (studResultData[i].overall_answer.length > 0) {
                const finalMarks = await exports.comparingAnswer(studResultData[i].overall_answer, markDetails, questionPaper, quesAns);
                console.log("FINAL MARKS : " + studResultData[i].student_id, finalMarks);
                studResultData[i].marks_details = finalMarks;
            } else {
                console.log("EMPTY OVERALL ANSWER");
                studResultData[i].marks_details = markDetails;
            }

            // Set evaluated status and timestamp for each student
            studResultData[i].evaluated = "Yes";
            studResultData[i].updated_ts = helper.getCurrentTimestamp();
        }

        console.log("DONE!");
        console.log(studResultData);
        
        // Return the modified student result data
        return studResultData;

    } catch (error) {
        console.error("Error in assigning marks:", error);
        throw error;
    }
};


exports.comparingAnswer = async (studAns, markDetails, questionPaper, quesAns) => {
    return new Promise(async (resolve, reject) => {
        await helper.splitSectionAnswer(studAns, questionPaper.questions).then((splitedAns) => {
            console.log("SPLITED ANSWER : ", splitedAns);
            // resolve(splitedAns);

            async function sectionLoop(i) {
                if (i < markDetails.length) {
                    if (splitedAns[i].individualAns && splitedAns[i].individualAns.length > 0) {
                        await exports.setQaDetails(markDetails[i].qa_details, splitedAns[i].individualAns, quesAns).then((secQaDetails) => {
                            console.log("SECTION QA DETAILS : ", secQaDetails);
                            markDetails[i].qa_details = secQaDetails;
                        })
                    }
                    i++;
                    sectionLoop(i);
                }
                else {
                    /** LOOP END **/
                    console.log("OVERALL QA DETAILS : ", markDetails);

                    /** call another function to calculate pass and fail mark **/

                    resolve(markDetails);
                    /** Send mark_details of one student*/
                }
            }
            sectionLoop(0);
        })
    })
}

exports.setQaDetails = (qaDetails, indAns, quesAns) => {
    let localQuestion = "";
    let localType = "";

    return new Promise(async (resolve, reject) => {
        async function qaLoop(i) {
            if (i < qaDetails.length) {

                localQuestion = quesAns.filter(ques => ques.question_id === qaDetails[i].question_id);

                if (localQuestion.length > 0 && indAns[i]) {
                    await exports.compareAnswer(localQuestion[0], indAns[i],).then((obMark) => {
                        console.log("OBTAINED MARKS : ", obMark);
                        qaDetails[i].obtained_marks = obMark;
                        qaDetails[i].student_answer = indAns[i];
                    })
                }
                i++;
                qaLoop(i);
            }
            else {
                console.log("End setQaDetails");
                resolve(qaDetails);
            }
        }
        qaLoop(0)
    })
}

exports.compareAnswer = (question, studAns) => {
    return new Promise(async (resolve, reject) => {
        let multiAns = await studAns.split(constant.evalConstant.splitLines).filter(emptyEle => emptyEle !== "");
        if (question.question_type === constant.questionKeys.objective) {
            /** OBJECTIVE **/
            await helper.getIndexOfStudentAns(multiAns).then(async (studentAnswer) => {

                console.log("STUDENT ANSWER : ", studentAnswer);
                await helper.getOptionsWrightAnswers(question.answers_of_question).then(async (correctAns) => {
                    console.log("CORRECT ANSWER : ", correctAns);

                    (async () => {
                        await helper.getObjectiveMarks(correctAns, studentAnswer).then(async (scoredMark) => {
                            console.log("OBJECTIVE MARK : ", scoredMark);
                            resolve(scoredMark > question.marks ? question.marks : scoredMark);
                        })
                    })();
                })
            })
            /** END OBJECTIVE **/
        }
        else if (question.question_type === constant.questionKeys.subjective) {
            /** SUBJECTIVE **/
            await exports.subjectiveAnswerCorrection(question.answers_of_question, multiAns, question.question_content).then(async (scoredMark) => {
                console.log("SUBJECTIVE MARK : ", scoredMark);
                resolve(scoredMark > question.marks ? question.marks : scoredMark);
            })
            /** END SUBJECTIVE **/
        }
        else {
            /** DESCRIPTIVE **/
            await exports.descriptiveAnswerCorrection(question.answers_of_question, studAns).then(async (scoredMark) => {
                console.log("DESCRIPTIVE MARK : ", scoredMark);
                resolve(scoredMark > question.marks ? question.marks : scoredMark);
            })
            /** END DESCRIPTIVE **/
        }
    })
}

exports.descriptiveAnswerCorrection = async (answersOfQuestion, studentAns) => {
    return new Promise(async (resolve, reject) => {
        let totalMarks = 0;
        await answersOfQuestion.forEach((dAns, i) => {
            if (studentAns.toLowerCase().replace(/ /g, '').includes(dAns.answer_content.toLowerCase().replace(/ /g, ''))) {
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

        let reg = new RegExp((constant.answerSheet.findBlank) + ("(.*?)") + (constant.answerSheet.findBlank), 'g');
        let blanklist = (questionContent.match(reg) || []);
        await blanklist.forEach(async (bName, i) => {
            blankAns = await answersOfQuestion.filter(bAns => bAns.answer_option === bName);
            if (blankAns.length > 0 && studentAnsArr[i]) {
                totalMarks += blankAns[0].answer_content.toLowerCase().replace(/ /g, '') == studentAnsArr[i].replace(/^,/, '').toLowerCase().replace(/ /g, '') ? Number(blankAns[0].answer_weightage) : 0;
            }
        })

        resolve(totalMarks);
    })
}

exports.readStudentAnswerSheets = (request, callback) => {

    function entireStudentsData(i) {

        if (i < request.Items.length) {

            function eachStudentData(j) {

                if (j < request.Items[i].answer_metadata.length) {

                    console.log(request.Items[i].answer_metadata[j].url);

                    let key = {
                        data: {
                            Key: request.Items[i].answer_metadata[j].url
                        }
                    }

                    ocrServices.readScannedPage(key, async function (scannedErr, scannedRes) {
                        if (scannedErr) {
                            console.log(scannedErr);
                            // callback(scannedErr, scannedRes);
                            j++;
                            eachStudentData(j);
                        } else {
                            console.log("SCANNED RESPONSE : ", scannedRes);
                            let words = await helper.formattingAnswer(scannedRes.data.text);

                            console.log("words", words);
                            request.Items[i].answer_metadata[j]['studentAnswer'] = words;
                            j++;
                            eachStudentData(j);
                        }
                    });
                } else {
                    i++;
                    entireStudentsData(i);
                }

            } eachStudentData(0);

        } else {

            console.log("Loop Ended!", request);
            callback(0, request);

        }

    } entireStudentsData(0);
}

exports.fetchGetStudentData = async (request) => await classTestRepository.getStudentInfo(request);


exports.getResult = async (request) => {
    console.log("request - ", request);
    const result_response = await classRepository.getResult2(request)
    console.log("result_response - ",result_response);
    if(result_response.Items.length == 0)
    return result_response;
    await Promise.all(result_response.Items[0].answer_metadata.map(async (result) => {
        result.content_url = await s3Services.getS3SignedUrl(result.url);
    }));
    return result_response;

}

exports.changeStudentMarks = async (request) => await classRepository.modifyStudentMarks2(request)

exports.resetResultEvaluateStatus = async (request) => await testResultRepository.changeTestEvaluationStatus2(request)

exports.updateClassTestStatus = async (request) => await classTestRepository.updateClassTestStatus2(request)