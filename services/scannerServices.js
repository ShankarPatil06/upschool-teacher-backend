const dynamoDbCon = require('../awsConfig');
const { userRepository, classTestRepository, scannerRepository, schoolRepository, testResultRepository, studentRepository, quizRepository, quizResultRepository } = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const ocrServices = require('./ocrServices');
let sendMail = require("./emailService");

exports.sendScannerLink = async (request) => {
    request.teacher_id = request.data.teacher_id;

    const userDataResponse = await userRepository.fetchUserDataByUserId2(request);

    if (userDataResponse.Items.length === 0 || userDataResponse.Items[0].user_status !== constant.common.Active) {
        return { statusCode: 400, message: constant.messages.TEACHER_DOESNOT_EXISTS };
    }

    request.data.school_id = userDataResponse.Items[0].school_id;

    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

    if (schoolDataRes.Items.length === 0 ||
        schoolDataRes.Items[0].school_status !== constant.common.Active ||
        schoolDataRes.Items[0].subscription_active !== constant.common.Yes) {
        console.log(constant.messages.SCHOOL_IS_INACTIVE);
        return { statusCode: 400, message: constant.messages.SCHOOL_IS_INACTIVE };
    }

    const mailPayload = {
        upload_url: request.data.upload_url,
        toMail: userDataResponse.Items[0].user_email,
        subject: constant.mailSubject.urlToScanAnswerSheets,
        mailFor: constant.mailFor.urlToUploadAnswerSheets,
    };

    const emailResponse = await sendMail.process(mailPayload);

    if (emailResponse.httpStatusCode === 200) {
        return { statusCode: 200, message: constant.messages.UPLOAD_URL_Sent };
    } else {
        return { statusCode: 400, message: constant.messages.SNS_ERROR };
    }

};

exports.sendOTPForScanning = async (request) => {
    request.teacher_id = request.data.teacher_id;

    const userDataResponse = await userRepository.fetchUserDataByUserId2(request);

    if (userDataResponse.Items.length === 0 || userDataResponse.Items[0].user_status !== constant.common.Active) {
        return { statusCode: 400, message: constant.messages.TEACHER_DOESNOT_EXISTS };
    }

    const user_otp = helper.getRandomOtp().toString();
    const mailPayload = {
        user_otp,
        toMail: userDataResponse.Items[0].user_email,
        subject: constant.mailSubject.otpToScanAnswerSheets,
        mailFor: constant.mailFor.otpToScanAnswerSheets,
    };

    const emailResponse = await sendMail.process(mailPayload);
    if (emailResponse.httpStatusCode !== 200) {
        return { statusCode: 400, message: constant.messages.SNS_ERROR };
    }

    const scannerSessionResponse = await scannerRepository.fetchScannerSessionData2(request);

    request.data.user_otp = user_otp;

    if (helper.isEmptyArray(scannerSessionResponse.Items)) {
        request.data.scanner_session_id = scannerSessionResponse.Items[0].scanner_session_id;
        const updateResponse = await scannerRepository.updateUserOtpScannerData2(request);
        return { statusCode: updateResponse ? 200 : 500, response: updateResponse };

    } else {
        const insertResponse = await scannerRepository.insertUserOtpScannerData2(request);
        return { statusCode: insertResponse ? 200 : 500, response: insertResponse };
    }

};

exports.validateOTPForScanning = async (request) => {

    const fetchScannerSessionDataResponse = await scannerRepository.fetchScannerSessionData2(request);

    if (!helper.isEmptyArray(fetchScannerSessionDataResponse.Items)) {
        throw new Error(constant.messages.SESSION_NOT_FOUND);
    }

    const { user_otp, otp_ts, scanner_session_id } = fetchScannerSessionDataResponse.Items[0];

    if (user_otp === request.data.entered_otp) {
        const currentTime = new Date(helper.getCurrentTimestamp());
        const otpGeneratedTime = new Date(otp_ts);

        const calculateTime = (currentTime - otpGeneratedTime) / (1000 * 60);

        if (calculateTime <= 10) {
            const user_reset_otp = helper.getRandomOtp().toString();
            request.data["scanner_session_id"] = scanner_session_id;
            request.data["user_reset_otp"] = user_reset_otp;

            await scannerRepository.resetUserOtpScannerData2(request);

            const jwtToken = helper.getJwtTokenForScanner(fetchScannerSessionDataResponse.Items[0]);
            request["user_jwt"] = jwtToken;
            request["scanner_session_id"] = scanner_session_id;

            await scannerRepository.updateScannerJwtToken2(request);
            return [{ jwt: jwtToken }];
        } else {
            throw new Error(constant.messages.OTP_EXPIRED);
        }
    } else {
        throw new Error(constant.messages.INVALID_OTP);
    }
};

exports.fetchSignedURLForAnswers = async (request) => {
    const folderPath = constant.testFolder.studAnswerSheets.replace("**REPLACE**", request.data.test_id);

    const extFilesS3 = await helper.PutObjectS3SigneUdrl(request.data.ext_file, folderPath);

    return [{
        file_name: request.data.ext_file,
        s3Url: extFilesS3.uploadURL,
        Key: extFilesS3.Key
    }];
};

exports.uploadAnswerSheets = async function (request, callback) {

    let pageMetadata = {};

    ocrServices.readScannedPage(request, async function (scannedErr, scannedRes) {
        if (scannedErr) {
            console.log(scannedErr);
            callback(scannedErr, scannedRes);
        } else {
            if (scannedRes.data.text) {
                let words = await helper.formattingAnswer(scannedRes.data.text);

                exports.setValues(words, (pageDetailsErr, pageDetailsRes) => {
                    if (pageDetailsErr) {
                        console.log(pageDetailsErr);
                        callback(pageDetailsErr, pageDetailsRes);
                    }
                    else {

                        if (pageDetailsRes.page_no && pageDetailsRes.test_id && pageDetailsRes.roll_no && Number(pageDetailsRes.page_no)) {

                            pageMetadata.class_test_id = pageDetailsRes.test_id;
                            pageMetadata.roll_no = request.data.roll_no !== 'N.A.' ? request.data.roll_no.trim() : pageDetailsRes.roll_no.trim().toLowerCase();
                            pageMetadata.answer_metadata = [{
                                page_no: pageDetailsRes.page_no,
                                url: request.data.Key,
                                confidence_rate: scannedRes.data.confidence_rate,
                                studentAnswer: words
                            }];

                            request.data.roll_no = pageMetadata.roll_no;
                            request.data.class_test_id = pageDetailsRes.test_id;
                            request.data.answer_metadata = pageMetadata.answer_metadata;

                            classTestRepository.fetchClassTestDataById(request, function (fetch_class_test_data_err, fetch_class_test_data_response) {
                                if (fetch_class_test_data_err) {
                                    console.log(fetch_class_test_data_err);
                                    callback(fetch_class_test_data_err, fetch_class_test_data_response);
                                } else {

                                    if (helper.isEmptyObject(fetch_class_test_data_response.Item)) {
                                        callback(constant.messages.COULDNT_READ_TEST_ID, 0);
                                    } else {
                                        studentRepository.fetchStudentDataByRollNoClassSection(request, function (fetch_student_data_err, fetch_student_data_response) {
                                            if (fetch_student_data_err) {
                                                console.log(fetch_student_data_err);
                                                callback(fetch_student_data_err, fetch_student_data_response);
                                            } else {


                                                if (fetch_student_data_response.Items.length > 0) {
                                                    request.data.student_id = fetch_student_data_response.Items[0].student_id;
                                                    testResultRepository.fetchTestDataOfStudent(request, async function (fetch_test_result_err, fetch_test_result_response) {
                                                        if (fetch_test_result_err) {
                                                            console.log(fetch_test_result_err);
                                                            callback(fetch_test_result_err, fetch_test_result_response);
                                                        } else {
                                                            console.log(fetch_test_result_response);

                                                            if (fetch_test_result_response.Items.length === 0) {
                                                                testResultRepository.insertTestDataOfStudent(request, function (insert_test_data_of_student_err, insert_test_data_of_student_response) {
                                                                    if (insert_test_data_of_student_err) {
                                                                        console.log(insert_test_data_of_student_err);
                                                                        callback(insert_test_data_of_student_err, insert_test_data_of_student_response);
                                                                    } else {
                                                                        callback(insert_test_data_of_student_err, insert_test_data_of_student_response);
                                                                    }
                                                                });
                                                            } else {
                                                                console.log(fetch_test_result_response.Items[0].answer_metadata);

                                                                let pageExists = await fetch_test_result_response.Items[0].answer_metadata.filter(value => value.page_no === pageMetadata.answer_metadata[0].page_no);


                                                                if (pageExists.length === 0) {
                                                                    fetch_test_result_response.Items[0].answer_metadata.push({
                                                                        page_no: pageMetadata.answer_metadata[0].page_no,
                                                                        url: pageMetadata.answer_metadata[0].url,
                                                                        confidence_rate: pageMetadata.answer_metadata[0].confidence_rate,
                                                                        studentAnswer: pageMetadata.answer_metadata[0].studentAnswer
                                                                    });
                                                                } else {

                                                                    await fetch_test_result_response.Items[0].answer_metadata.forEach((meta, i) => {
                                                                        if (meta.page_no === pageMetadata.answer_metadata[0].page_no) {
                                                                            fetch_test_result_response.Items[0].answer_metadata[i].url = pageMetadata.answer_metadata[0].url;
                                                                            fetch_test_result_response.Items[0].answer_metadata[i].confidence_rate = pageMetadata.answer_metadata[0].confidence_rate;
                                                                            fetch_test_result_response.Items[0].answer_metadata[i].studentAnswer = pageMetadata.answer_metadata[0].studentAnswer;
                                                                        }
                                                                    });
                                                                }

                                                                /** UPDATE QUERY **/
                                                                let updateRequest = {
                                                                    data: {
                                                                        result_id: fetch_test_result_response.Items[0].result_id,
                                                                        answer_metadata: fetch_test_result_response.Items[0].answer_metadata,
                                                                    }
                                                                }
                                                                testResultRepository.updateTestDataOfStudent(updateRequest, function (update_test_data_of_student_err, update_test_data_of_student_response) {
                                                                    if (update_test_data_of_student_err) {
                                                                        console.log(update_test_data_of_student_err);
                                                                        callback(update_test_data_of_student_err, update_test_data_of_student_response);
                                                                    } else {
                                                                        callback(update_test_data_of_student_err, update_test_data_of_student_response);
                                                                    }
                                                                });
                                                                /** END UPDATE QUERY **/
                                                            }
                                                        }
                                                    });
                                                } else {
                                                    callback(constant.messages.COULDNT_READ_ROLL_NUMBER, 0);
                                                }
                                            }
                                        });
                                    }
                                }
                            });

                        } else {
                            callback(constant.messages.COULDNT_READ_PAGE_DETAILS, 0);
                        }

                    }
                });
            }
            else {
                console.log(constant.messages.COULDNT_EXTRACT_TEXT);
                callback(constant.messages.COULDNT_EXTRACT_TEXT, 0);
            }
        }
    })
}

exports.uploadAnswerSheets2 = async (request) => {
    let pageMetadata = {};

    const scannedRes = await ocrServices.readOpenAiPage(request);

    if (scannedRes?.content) {
        let pageDetailsRes = await helper.extractValuesFromInput(scannedRes.content);
        const answers = await helper.extractAnswersFromInput(scannedRes.content);

        const pageNo = pageDetailsRes.find(item => item.label === constant.commonConditionValue.pageNo)?.value;
        const testId = pageDetailsRes.find(item => item.label === constant.commonConditionValue.testID)?.value;
        const rollNo = pageDetailsRes.find(item => item.label === constant.commonConditionValue.rollNo)?.value;

        if (pageNo && testId && rollNo) {
            pageMetadata = {
                class_test_id: testId,
                roll_no: request.data.roll_no !== constant.common.NA ? request.data.roll_no.trim() : rollNo.trim(),
                answer_metadata: [{
                    page_no: pageNo,
                    url: request.data.Key,
                    confidence_rate: 0,
                    studentAnswer: answers
                }]
            };

            request.data = { ...request.data, roll_no: pageMetadata.roll_no, class_test_id: testId, answer_metadata: pageMetadata.answer_metadata };

            const classTestData = await classTestRepository.fetchClassTestDataById2(request);

            if (helper.isEmptyObject(classTestData.Item)) {
                return (constant.messages.COULDNT_READ_TEST_ID);
            }

            const studentData = await studentRepository.fetchStudentDataByRollNoClassSection2(request);

            if (helper.isEmptyArray(studentData.Items)) {
                request.data.student_id = studentData.Items[0].student_id;
                const testResultData = await testResultRepository.fetchTestDataOfStudent2(request);

                if (!helper.isEmptyArray(testResultData.Items)) {
                    const insertResponse = await testResultRepository.insertTestDataOfStudent2(request);
                    if (insertResponse.$metadata.httpStatusCode === 200) {
                        return (constant.messages.IMAGE_UPLOADED_SUCCESSFULLY)
                    } else {
                        return (constant.messages.NEW_STUDENT_RECORD_NOT_ADDED)
                    }
                } else {
                    let pageExists = testResultData.Items[0].answer_metadata.find(value => value.page_no === pageMetadata.answer_metadata[0].page_no);

                    if (!pageExists) {
                        testResultData.Items[0].answer_metadata.push(pageMetadata.answer_metadata[0]);
                    } else {
                        testResultData.Items[0].answer_metadata = testResultData.Items[0].answer_metadata.map(meta => (
                            meta.page_no === pageMetadata.answer_metadata[0].page_no
                                ? { ...meta, ...pageMetadata.answer_metadata[0] }
                                : meta
                        ));
                    }

                    testResultData.Items[0].answer_metadata.sort((a, b) => a.page_no - b.page_no);

                    const updateRequest = {
                        data: {
                            result_id: testResultData.Items[0].result_id,
                            answer_metadata: testResultData.Items[0].answer_metadata,
                        }
                    };

                    const updateResponse = await testResultRepository.updateTestDataOfStudent2(updateRequest);

                    if (updateResponse) {
                        return (constant.messages.IMAGE_SUCCESSFULLY_UPDATED)
                    } else {
                        return (constant.messages.IMAGE_UPDATED_ISSUE)
                    }
                }
            } else {
                return (constant.messages.COULDNT_READ_ROLL_NUMBER);
            }
        } else {
            return (constant.messages.COULDNT_READ_PAGE_DETAILS);
        }
    }
    else {
        return (constant.messages.COULDNT_EXTRACT_TEXT);
    }

};

exports.uploadQuizAnswerSheetsNew = async function (request) {
    let quizPageMetadata = {};
    const scannedRes = await ocrServices.readOpenAiPage(request);

    if (scannedRes?.content) {
        let pageDetailsRes = await helper.extractValuesFromInputNew(scannedRes.content);
        const answers = await helper.extractAnswersFromInputNew(scannedRes.content);

        const pageNo = pageDetailsRes.find(item => item.label === constant.commonConditionValue.pageNo)?.value;
        const quizId = request.data?.exam_id;
        const rollNo = request.data?.roll_no || "";
        const set = request.data?.set || "A";

        if (pageNo && quizId && rollNo) {
            quizPageMetadata.quiz_id = quizId;
            quizPageMetadata.quiz_set = set;
            quizPageMetadata.roll_no = request.data.roll_no !== constant.common.NA ? request.data.roll_no.trim() : rollNo.trim();
            quizPageMetadata.answer_metadata = [{
                page_no: pageNo,
                url: request.data.Key,
                confidence_rate: 0,
                studentAnswer: answers,
                set: set
            }];

            request.data.roll_no = quizPageMetadata.roll_no;
            request.data.quiz_id = quizId;
            request.data.quiz_set = set;
            request.data.answer_metadata = quizPageMetadata.answer_metadata;
            console.log(request.data.answer_metadata)
            const fetchQuizDataResponse = await quizRepository.fetchQuizDataById2(request);

            if (helper.isEmptyObject(fetchQuizDataResponse.Item)) {
                return (constant.messages.COULDNOT_READ_QUIZ_ID);
            }
            const fetchStudentDataResponse = await studentRepository.fetchStudentDataByRollNoClassSection2(request);
            
            if (fetchStudentDataResponse.Items.length > 0) {
                request.data.student_id = fetchStudentDataResponse.Items[0].student_id;

                const fetchQuizResultResponse = await quizResultRepository.fetchQuizResultDataOfStudent2(request);

                if (fetchQuizResultResponse.Items.length === 0) {
                    const insertQuizDataResponse = await quizResultRepository.insertQuizDataOfStudent2(request);

                    if (insertQuizDataResponse === 200) {
                        return (constant.messages.IMAGE_UPLOADED_SUCCESSFULLY);
                    } else {
                        return (constant.messages.NEW_STUDENT_RECORD_NOT_ADDED);
                    }

                } else {
                    console.log(fetchQuizResultResponse.Items[0].answer_metadata);

                    let pageExists = await fetchQuizResultResponse.Items[0].answer_metadata.filter(value => value.page_no === quizPageMetadata.answer_metadata[0].page_no);

                    if (pageExists.length === 0) {
                        fetchQuizResultResponse.Items[0].answer_metadata.push({
                            page_no: quizPageMetadata.answer_metadata[0].page_no,
                            url: quizPageMetadata.answer_metadata[0].url,
                            confidence_rate: 0,
                            studentAnswer: quizPageMetadata.answer_metadata[0].studentAnswer,
                            set: quizPageMetadata.answer_metadata[0].set
                        });
                    } else {
                        await fetchQuizResultResponse.Items[0].answer_metadata.forEach((meta, i) => {
                            if (meta.page_no === quizPageMetadata.answer_metadata[0].page_no) {
                                fetchQuizResultResponse.Items[0].answer_metadata[i].url = quizPageMetadata.answer_metadata[0].url;
                                fetchQuizResultResponse.Items[0].answer_metadata[i].confidence_rate = 0;
                                fetchQuizResultResponse.Items[0].answer_metadata[i].studentAnswer = quizPageMetadata.answer_metadata[0].studentAnswer;
                                fetchQuizResultResponse.Items[0].answer_metadata[i].set = quizPageMetadata.answer_metadata[0].set;
                                fetchQuizResultResponse.Items[0].quiz_set = quizPageMetadata.quiz_set;
                            }
                        });
                    }

                    fetchQuizResultResponse.Items[0].answer_metadata.sort((a, b) => a.page_no - b.page_no);

                    let updateRequest = {
                        data: {
                            result_id: fetchQuizResultResponse.Items[0].result_id,
                            answer_metadata: fetchQuizResultResponse.Items[0].answer_metadata,
                            quiz_set: fetchQuizResultResponse.Items[0].quiz_set
                        }
                    };

                    const updateQuizDataResponse = await quizResultRepository.updateQuizDataOfStudent2(updateRequest);
                    console.log({ firsttttt: updateQuizDataResponse })
                    if (updateQuizDataResponse === 200) {
                        return (constant.messages.IMAGE_SUCCESSFULLY_UPDATED)
                    }
                    else { return (constant.messages.IMAGE_UPDATED_ISSUE) }

                }
            } else {
                return (constant.messages.COULDNT_READ_ROLL_NUMBER);
            }
        }
        else { return (constant.messages.UNABLE_TO_READ_PAGE_DETAILS); }
    } else {
        console.log(constant.messages.UNABLE_TO_EXTRACT_TEXT);
        return (constant.messages.UNABLE_TO_EXTRACT_TEXT);
    }
}

exports.uploadAnswerSheets2New = async (request) => {
    let pageMetadata = {};

    const scannedRes = await ocrServices.readOpenAiPage(request);
    if (scannedRes?.content) {
        let pageDetailsRes = await helper.extractValuesFromInputNew(scannedRes.content);
        const answers = await helper.extractAnswersFromInputNew(scannedRes.content);

        const pageNo = pageDetailsRes.find(item => item.label === constant.commonConditionValue.pageNo)?.value;
        const testId = request.data?.exam_id;
        const rollNo = request.data?.roll_no || "";

        if (pageNo && testId && rollNo) {
            pageMetadata = {
                class_test_id: testId,
                roll_no: request.data.roll_no !== constant.common.NA ? request.data.roll_no.trim() : rollNo.trim(),
                answer_metadata: [{
                    page_no: pageNo,
                    url: request.data.Key,
                    confidence_rate: 0,
                    studentAnswer: answers
                }]
            };

            request.data = { ...request.data, roll_no: pageMetadata.roll_no, class_test_id: testId, answer_metadata: pageMetadata.answer_metadata };

            const classTestData = await classTestRepository.fetchClassTestDataById2(request);

            if (helper.isEmptyObject(classTestData.Item)) {
                return (constant.messages.COULDNT_READ_TEST_ID);
            }

            const studentData = await studentRepository.fetchStudentDataByRollNoClassSection2(request);
            
            if (studentData.Items.length > 0) {
                request.data.student_id = studentData.Items[0].student_id;
                const testResultData = await testResultRepository.fetchTestDataOfStudent2(request);

                if (testResultData.Items.length === 0) {
                    const insertResponse = await testResultRepository.insertTestDataOfStudent2(request);
                    if (insertResponse === 200) {
                        return (constant.messages.IMAGE_UPLOADED_SUCCESSFULLY)
                    } else { 
                        return (constant.messages.NEW_STUDENT_RECORD_NOT_ADDED) 
                    }
                } else {

                    let pageExists = testResultData.Items[0].answer_metadata.find(value => value.page_no === pageMetadata.answer_metadata[0].page_no);

                    if (!pageExists) {
                        testResultData.Items[0].answer_metadata.push(pageMetadata.answer_metadata[0]);
                    } else {
                        testResultData.Items[0].answer_metadata = testResultData.Items[0].answer_metadata.map(meta => (
                            meta.page_no === pageMetadata.answer_metadata[0].page_no
                                ? { ...meta, ...pageMetadata.answer_metadata[0] }
                                : meta
                        ));
                    }

                    testResultData.Items[0].answer_metadata.sort((a, b) => a.page_no - b.page_no);

                    const updateRequest = {
                        data: {
                            result_id: testResultData.Items[0].result_id,
                            answer_metadata: testResultData.Items[0].answer_metadata,
                        }
                    };
                    
                    const updateResponse = await testResultRepository.updateTestDataOfStudent2(updateRequest);
                    
                    if (updateResponse) {
                        return constant.messages.IMAGE_SUCCESSFULLY_UPDATED
                    } else {
                        return (constant.messages.IMAGE_UPDATED_ISSUE)
                    }
                }
            } else {
                return (constant.messages.COULDNT_READ_ROLL_NUMBER);
            }
        } else {
            return (constant.messages.COULDNT_READ_PAGE_DETAILS);
        }
    }
    else {
        return (constant.messages.COULDNT_EXTRACT_TEXT);
    }
};

exports.setValues = async function (words, callback) {

    let pageNo, testID, rollNo, quizID, quiz_set;
    await words.forEach((word, index) => {
        if (index <= 7) {
            if (word.startsWith(constant.commonConditionValue.page_no) && word.split(":")[1]) {
                pageNo = word.split(":")[1].split("/")[0];
            } else if (word.startsWith(constant.commonConditionValue.test_id) && word.split(":")[1]) {
                testID = word.split(":")[1]
            } else if (word.startsWith(constant.commonConditionValue.roll_no) && word.split(":")[1]) {
                rollNo = word.split(":")[1]
            } else if (word.startsWith(constant.commonConditionValue.quiz_id) && word.split(":")[1]) {
                quizID = word.split(":")[1]
            } else if (word.startsWith(constant.commonConditionValue.set) && (word.split(":").length === 2 && word.split(":")[1] === (constant.commonConditionValue.a || constant.commonConditionValue.b || constant.commonConditionValue.c))) {
                quiz_set = word.split(":")[1]
            }
        }
    })

    callback(0, { page_no: pageNo, test_id: testID, roll_no: rollNo, quiz_id: quizID, set: quiz_set })

}

exports.setValues2 = async function (words) {
    let pageNo, testID, rollNo, quizID, quiz_set;

    for (const [index, word] of words.entries()) {
        if (word.startsWith(constant.commonConditionValue.page_no)) {
            const pagePart = word.slice(6);
            pageNo = pagePart.split("/")[0];
        }
        else if (word.startsWith(constant.commonConditionValue.test_id)) {
            testID = word.slice(6);
        }
        else if (word.startsWith(constant.commonConditionValue.roll_no)) {
            rollNo = word.slice(6);
        }
        else if (word.startsWith(constant.commonConditionValue.quiz_id)) {
            quizID = word.slice(6);
        } else if (word.startsWith(constant.commonConditionValue.set)) {
            quiz_set = word.slice(3);
        }
    }

    return { page_no: pageNo, test_id: testID, roll_no: rollNo, quiz_id: quizID, set: quiz_set };
}

exports.fetchSignedURLForQuizAnswers = async (request) => {
    const folderPath = constant.quizFolder.studAnswerSheets.replace("**REPLACE**", request.data.quiz_id);

    const extFilesS3 = await helper.PutObjectS3SigneUdrl(request.data.ext_file, folderPath);
    console.log({ extFilesS3 });

    return [{
        file_name: request.data.ext_file,
        s3Url: extFilesS3.uploadURL,
        Key: extFilesS3.Key
    }];
};

exports.uploadQuizAnswerSheets = function (request, callback) {
    let quizPageMetadata = {};

    ocrServices.readScannedPage(request, async function (scannedErr, scannedRes) {
        if (scannedErr) {
            console.log(scannedErr);
            callback(scannedErr, scannedRes);
        }
        else {
            console.log("BEFORE FORMATTING : ", scannedRes.data.text);
            if (scannedRes.data.text) {
                let words = await helper.formattingAnswer(scannedRes.data.text);
                exports.setValues(words, (pageDetailsErr, pageDetailsRes) => {
                    if (pageDetailsErr) {
                        console.log(pageDetailsErr);
                        callback(pageDetailsErr, pageDetailsRes);
                    }
                    else {
                        console.log("PAGE DETAILS in quizanswersheets: ", pageDetailsRes);

                        if (pageDetailsRes.page_no && pageDetailsRes.quiz_id && pageDetailsRes.roll_no && pageDetailsRes.set && Number(pageDetailsRes.page_no)) {

                            quizPageMetadata.quiz_id = pageDetailsRes.quiz_id;
                            quizPageMetadata.quiz_set = pageDetailsRes.set;
                            quizPageMetadata.roll_no = request.data.roll_no !== 'N.A.' ? request.data.roll_no.trim() : pageDetailsRes.roll_no.trim().toLowerCase();
                            quizPageMetadata.answer_metadata = [{
                                page_no: pageDetailsRes.page_no,
                                url: request.data.Key,
                                confidence_rate: scannedRes.data.confidence_rate,
                                studentAnswer: words,
                            }];

                            request.data.roll_no = quizPageMetadata.roll_no;
                            request.data.quiz_id = pageDetailsRes.quiz_id;
                            request.data.quiz_set = pageDetailsRes.set;
                            request.data.answer_metadata = quizPageMetadata.answer_metadata;

                            quizRepository.fetchQuizDataById(request, function (fetch_quiz_data_err, fetch_quiz_data_response) {
                                if (fetch_quiz_data_err) {
                                    console.log(fetch_quiz_data_err);
                                    callback(fetch_quiz_data_err, fetch_quiz_data_response);
                                }
                                else {
                                    if (helper.isEmptyObject(fetch_quiz_data_response.Item)) {
                                        callback(constant.messages.COULDNOT_READ_QUIZ_ID, 0);
                                    }
                                    else {


                                        studentRepository.fetchStudentDataByRollNoClassSection(request, function (fetch_student_data_err, fetch_student_data_response) {
                                            if (fetch_student_data_err) {
                                                console.log(fetch_student_data_err);
                                                callback(fetch_student_data_err, fetch_student_data_response);
                                            } else {

                                                if (fetch_student_data_response.Items.length > 0) {
                                                    request.data.student_id = fetch_student_data_response.Items[0].student_id;
                                                    quizResultRepository.fetchQuizResultDataOfStudent(request, async function (fetch_quiz_result_err, fetch_quiz_result_response) {
                                                        if (fetch_quiz_result_err) {
                                                            console.log(fetch_quiz_result_err);
                                                            callback(fetch_quiz_result_err, fetch_quiz_result_response);
                                                        }
                                                        else {
                                                            console.log(fetch_quiz_result_response);

                                                            if (fetch_quiz_result_response.Items.length === 0) {

                                                                quizResultRepository.insertQuizDataOfStudent(request, function (insert_quiz_data_of_student_err, insert_quiz_data_of_student_response) {
                                                                    if (insert_quiz_data_of_student_err) {
                                                                        console.log(insert_quiz_data_of_student_err);
                                                                        callback(insert_quiz_data_of_student_err, insert_quiz_data_of_student_response);
                                                                    } else {
                                                                        callback(insert_quiz_data_of_student_err, insert_quiz_data_of_student_response);
                                                                    }
                                                                });
                                                            }
                                                            else {
                                                                console.log(fetch_quiz_result_response.Items[0].answer_metadata);

                                                                let pageExists = await fetch_quiz_result_response.Items[0].answer_metadata.filter(value => value.page_no === quizPageMetadata.answer_metadata[0].page_no);

                                                                if (pageExists.length === 0) {
                                                                    fetch_quiz_result_response.Items[0].answer_metadata.push({
                                                                        page_no: quizPageMetadata.answer_metadata[0].page_no,
                                                                        url: quizPageMetadata.answer_metadata[0].url,
                                                                        confidence_rate: quizPageMetadata.answer_metadata[0].confidence_rate,
                                                                        studentAnswer: quizPageMetadata.answer_metadata[0].studentAnswer
                                                                    });
                                                                }
                                                                else {

                                                                    await fetch_quiz_result_response.Items[0].answer_metadata.forEach((meta, i) => {
                                                                        if (meta.page_no === quizPageMetadata.answer_metadata[0].page_no) {
                                                                            fetch_quiz_result_response.Items[0].answer_metadata[i].url = quizPageMetadata.answer_metadata[0].url;
                                                                            fetch_quiz_result_response.Items[0].answer_metadata[i].confidence_rate = quizPageMetadata.answer_metadata[0].confidence_rate;
                                                                            fetch_quiz_result_response.Items[0].answer_metadata[i].studentAnswer = quizPageMetadata.answer_metadata[0].studentAnswer;
                                                                            fetch_quiz_result_response.Items[0].quiz_set = quizPageMetadata.quiz_set;
                                                                        }
                                                                    });
                                                                }
                                                                /** UPDATE QUERY **/
                                                                let updateRequest = {
                                                                    data: {
                                                                        result_id: fetch_quiz_result_response.Items[0].result_id,
                                                                        answer_metadata: fetch_quiz_result_response.Items[0].answer_metadata,
                                                                        quiz_set: fetch_quiz_result_response.Items[0].quiz_set
                                                                    }
                                                                }

                                                                console.log("UPDATE PAGE!");
                                                                console.log(fetch_quiz_result_response.Items[0].answer_metadata);

                                                                quizResultRepository.updateQuizDataOfStudent(updateRequest, function (update_quiz_data_of_student_err, update_quiz_data_of_student_response) {
                                                                    if (update_quiz_data_of_student_err) {
                                                                        console.log(update_quiz_data_of_student_err);
                                                                        callback(update_quiz_data_of_student_err, update_quiz_data_of_student_response);
                                                                    } else {
                                                                        callback(update_quiz_data_of_student_err, update_quiz_data_of_student_response);
                                                                    }
                                                                });
                                                                /** END UPDATE QUERY **/
                                                            }
                                                        }
                                                    })
                                                }
                                                else {
                                                    console.log("ERROR sunil")
                                                    callback(constant.messages.COULDNT_READ_ROLL_NUMBER, 0);
                                                }
                                            }
                                        })
                                    }
                                }

                            })
                        }
                        else {
                            callback(constant.messages.UNABLE_TO_READ_PAGE_DETAILS, 0);
                        }
                    }
                })
            }
            else {
                console.log(constant.messages.UNABLE_TO_EXTRACT_TEXT);
                callback(constant.messages.UNABLE_TO_EXTRACT_TEXT, 0);
            }
        }
    })
}

exports.uploadQuizAnswerSheets2 = async function (request) {
    let quizPageMetadata = {};

    const scannedRes = await ocrServices.readOpenAiPage(request);
    console.log("OPENAI scanned Data:", scannedRes);
    if (scannedRes?.content) {
        let pageDetailsRes = await helper.extractValuesFromInput(scannedRes.content);
        const answers = await helper.extractAnswersFromInput(scannedRes.content);

        console.log("PAGE DETAILS in openai: ", pageDetailsRes);
        const pageNo = pageDetailsRes.find(item => item.label === 'pageNo')?.value;
        // const pageNo = pageDetailsRes.find(item => item.label === 'Page No' || item.label === 'pageNo')?.value;
        // const pageNo = 1;
        const quizId = pageDetailsRes.find(item => item.label === 'Quiz ID')?.value;
        // const rollNo = pageDetailsRes.find(item => item.label === 'Roll No')?.value.replace(/\s+/g, '');
        const rollNo = pageDetailsRes.find(item => item.label === 'Roll No')?.value;
        const set = pageDetailsRes.find(item => item.label === 'set')?.value;
        console.log("CHECK THESE VALUES", pageNo, quizId, rollNo, set);

        if (pageNo && quizId && rollNo) {
            quizPageMetadata.quiz_id = quizId;
            quizPageMetadata.quiz_set = set;
            // quizPageMetadata.roll_no = request.data.roll_no !== 'N.A.' ? request.data.roll_no.trim() : rollNo.trim().toLowerCase();
            quizPageMetadata.roll_no = request.data.roll_no !== 'N.A.' ? request.data.roll_no.trim() : rollNo.trim();
            // quizPageMetadata.roll_no = rollNo;
            quizPageMetadata.answer_metadata = [{
                page_no: pageNo,
                url: request.data.Key,
                confidence_rate: 0,
                studentAnswer: answers,
                set: set
            }];

            request.data.roll_no = quizPageMetadata.roll_no;
            // request.data.roll_no = "Roll001";
            request.data.quiz_id = quizId;
            request.data.quiz_set = set;
            request.data.answer_metadata = quizPageMetadata.answer_metadata;
            console.log(request)
            const fetchQuizDataResponse = await quizRepository.fetchQuizDataById2(request);
            console.log("quiz?", fetchQuizDataResponse)

            if (helper.isEmptyObject(fetchQuizDataResponse.Item)) {
                return (constant.messages.COULDNOT_READ_QUIZ_ID);
            }
            console.log(request.data.roll_no)
            const fetchStudentDataResponse = await studentRepository.fetchStudentDataByRollNoClassSection2(request);
            console.log("fetchStudentDataResponse - ", fetchStudentDataResponse);
            if (fetchStudentDataResponse.Items.length > 0) {
                request.data.student_id = fetchStudentDataResponse.Items[0].student_id;

                const fetchQuizResultResponse = await quizResultRepository.fetchQuizResultDataOfStudent2(request);

                if (fetchQuizResultResponse.Items.length === 0) {
                    const insertQuizDataResponse = await quizResultRepository.insertQuizDataOfStudent2(request);
                    if (insertQuizDataResponse.$metadata.httpStatusCode === 200) {
                        return ("Image Uploaded successfully");
                    } else {
                        return ("New Student Insert issue in quiz");
                    }

                } else {
                    console.log(fetchQuizResultResponse.Items[0].answer_metadata);

                    let pageExists = await fetchQuizResultResponse.Items[0].answer_metadata.filter(value => value.page_no === quizPageMetadata.answer_metadata[0].page_no);

                    if (pageExists.length === 0) {
                        fetchQuizResultResponse.Items[0].answer_metadata.push({
                            page_no: quizPageMetadata.answer_metadata[0].page_no,
                            url: quizPageMetadata.answer_metadata[0].url,
                            confidence_rate: 0,
                            studentAnswer: quizPageMetadata.answer_metadata[0].studentAnswer,
                            set: quizPageMetadata.answer_metadata[0].set
                        });
                    } else {
                        await fetchQuizResultResponse.Items[0].answer_metadata.forEach((meta, i) => {
                            if (meta.page_no === quizPageMetadata.answer_metadata[0].page_no) {
                                fetchQuizResultResponse.Items[0].answer_metadata[i].url = quizPageMetadata.answer_metadata[0].url;
                                fetchQuizResultResponse.Items[0].answer_metadata[i].confidence_rate = 0;
                                fetchQuizResultResponse.Items[0].answer_metadata[i].studentAnswer = quizPageMetadata.answer_metadata[0].studentAnswer;
                                fetchQuizResultResponse.Items[0].answer_metadata[i].set = quizPageMetadata.answer_metadata[0].set;
                                fetchQuizResultResponse.Items[0].quiz_set = quizPageMetadata.quiz_set;
                            }
                        });
                    }

                    fetchQuizResultResponse.Items[0].answer_metadata.sort((a, b) => a.page_no - b.page_no);

                    let updateRequest = {
                        data: {
                            result_id: fetchQuizResultResponse.Items[0].result_id,
                            answer_metadata: fetchQuizResultResponse.Items[0].answer_metadata,
                            quiz_set: fetchQuizResultResponse.Items[0].quiz_set
                        }
                    };

                    console.log("UPDATE PAGE!");
                    console.log(fetchQuizResultResponse.Items[0].answer_metadata);

                    const updateQuizDataResponse = await quizResultRepository.updateQuizDataOfStudent2(updateRequest);
                    if (updateQuizDataResponse.$metadata.httpStatusCode === 200) {
                        return ("Image Successfully uploaded")
                    }
                    else { return ("error in updating image") }

                }
            } else {
                return (constant.messages.COULDNT_READ_ROLL_NUMBER);
            }
        }
        else { return (constant.messages.UNABLE_TO_READ_PAGE_DETAILS); }


    } else {
        console.log(constant.messages.UNABLE_TO_EXTRACT_TEXT);
        return (constant.messages.UNABLE_TO_EXTRACT_TEXT);
    }
}

exports.removeUploadedAnswerData = async function (request) {

    console.log("request data:----", request);
    const studentData = await studentRepository.fetchStudentDataByRollNoClassSection2(request);
    console.log("Student data:----", studentData.Items);

    if (studentData.Items.length > 0) {
        request.data.student_id = studentData.Items[0].student_id;

        if (request.data.test_type === 'classTest') {
            request.data.class_test_id = request.data.exam_id;

            // console.log("testResultData data:----", studentData.Items);
            const testResultData = await testResultRepository.fetchTestDataOfStudent2(request);
            if (testResultData.Items.length > 0) {

                let pageDataExists = testResultData.Items[0].answer_metadata.find(value => value.url === request.data.Key[0]);

                console.log("pageDataExists ---", pageDataExists);

                if (pageDataExists) {
                    testResultData.Items[0].answer_metadata = testResultData.Items[0].answer_metadata.filter(value => value.url !== request.data.Key[0]);

                    const updateRequest = {
                        data: {
                            result_id: testResultData.Items[0].result_id,
                            answer_metadata: testResultData.Items[0].answer_metadata,
                        }
                    };
                    console.log("Updating Page Metadata:", updateRequest.data.answer_metadata);
                    const updateResponse = await testResultRepository.updateTestDataOfStudent2(updateRequest);

                    console.log("updateResponse - ", updateResponse);

                    if (updateResponse) {
                        console.log("Uploaded test Answer Removed Successfully");
                        return (constant.messages.UPLOADED_ANSWER_REMOVED);
                    } else {
                        console.log("Uploaded test Answer Removeal Issue");
                        return (constant.messages.UPLOADED_ANSWER_REMOVEAL_ISSUE);
                    }
                } else {
                    return (constant.messages.ANSWER_DATA_WAS_NOT_FOUND);
                }
            } else {
                return (constant.messages.TEST_DATA_NOT_FOUND);
            }
        } else if (request.data.test_type === 'quiz') {
            request.data.quiz_id = request.data.exam_id;

            // console.log("testResultData data:----", studentData.Items);
            const fetchQuizResultResponse = await quizResultRepository.fetchQuizResultDataOfStudent2(request);

            if (fetchQuizResultResponse.Items.length > 0) {

                let pageDataExists = fetchQuizResultResponse.Items[0].answer_metadata.find(value => value.url === request.data.Key[0]);

                console.log("pageDataExists --- quiz", pageDataExists);

                if (pageDataExists) {
                    fetchQuizResultResponse.Items[0].answer_metadata = fetchQuizResultResponse.Items[0].answer_metadata.filter(value => value.url !== request.data.Key[0]);

                    const updateRequest = {
                        data: {
                            result_id: fetchQuizResultResponse.Items[0].result_id,
                            answer_metadata: fetchQuizResultResponse.Items[0].answer_metadata,
                            quiz_set: request.data.set
                        }
                    };
                    console.log("Updating Page Metadata: quiz", updateRequest.data.answer_metadata);
                    const updateQuizDataResponse = await quizResultRepository.updateQuizDataOfStudent2(updateRequest);

                    console.log("updateResponse - quiz", updateQuizDataResponse);

                    if (updateQuizDataResponse) {
                        console.log("Uploaded quiz Answer Removed Successfully");
                        return (constant.messages.UPLOADED_ANSWER_REMOVED);
                    } else {
                        console.log("Uploaded quiz Answer Removeal Issue");
                        return (constant.messages.UPLOADED_ANSWER_REMOVEAL_ISSUE);
                    }
                } else {
                    return (constant.messages.ANSWER_DATA_WAS_NOT_FOUND);
                }
            } else {
                return (constant.messages.TEST_DATA_NOT_FOUND);
            }
        }

    } else {
        return (constant.messages.STUDENT_DATA_NOT_FOUND);
    }
}

