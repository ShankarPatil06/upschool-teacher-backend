const { userRepository, classTestRepository, scannerRepository, schoolRepository, testResultRepository, studentRepository, quizRepository, quizResultRepository } = require("../repository")
const { messages, common, mailFor, mailSubject, commonConditionValue, requestData, signedUrlConstants, testFolder, quizSetDetails, quizFolder } = require('../constants/constant');
const helper = require('../helper/helper');
const ocrServices = require('./ocrServices');
let sendMail = require("./emailService");

exports.sendScannerLink = async (request) => {
    request.teacher_id = request.data.teacher_id;

    const userDataResponse = await userRepository.fetchUserDataByUserId2(request);

    if (helper.isEmptyArray(userDataResponse.Items) || userDataResponse.Items[0].user_status !== common.Active) {
        return { statusCode: 400, message: messages.TEACHER_DOESNOT_EXISTS };
    }

    request.data.school_id = userDataResponse.Items[0].school_id;

    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

    if (helper.isEmptyArray(schoolDataRes.Items) ||
        schoolDataRes.Items[0].school_status !== common.Active ||
        schoolDataRes.Items[0].subscription_active !== common.Yes) {
        return { statusCode: 400, message: messages.SCHOOL_IS_INACTIVE };
    }

    const mailPayload = {
        upload_url: request.data.upload_url,
        toMail: userDataResponse.Items[0].user_email,
        subject: mailSubject.urlToScanAnswerSheets,
        mailFor: mailFor.urlToUploadAnswerSheets,
    };

    const emailResponse = await sendMail.process(mailPayload);

    if (emailResponse.httpStatusCode === 200) {
        return { statusCode: 200, message: messages.UPLOAD_URL_Sent };
    } else {
        return { statusCode: 400, message: messages.SNS_ERROR };
    }

};

exports.sendOTPForScanning = async (request) => {
    request.teacher_id = request.data.teacher_id;

    const userDataResponse = await userRepository.fetchUserDataByUserId2(request);

    if (helper.isEmptyArray(userDataResponse.Items) || userDataResponse.Items[0].user_status !== common.Active) {
        return { statusCode: 400, message: messages.TEACHER_DOESNOT_EXISTS };
    }

    const user_otp = helper.getRandomOtp().toString();
    const mailPayload = {
        user_otp,
        toMail: userDataResponse.Items[0].user_email,
        subject: mailSubject.otpToScanAnswerSheets,
        mailFor: mailFor.otpToScanAnswerSheets,
    };

    const emailResponse = await sendMail.process(mailPayload);
    if (emailResponse.httpStatusCode !== 200) {
        return { statusCode: 400, message: messages.SNS_ERROR };
    }

    const scannerSessionResponse = await scannerRepository.fetchScannerSessionData2(request);

    request.data.user_otp = user_otp;

    if (!helper.isEmptyArray(scannerSessionResponse.Items)) {
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

    if (helper.isEmptyArray(fetchScannerSessionDataResponse.Items)) {
        throw new Error(messages.SESSION_NOT_FOUND);
    }

    const { user_otp, otp_ts, scanner_session_id } = fetchScannerSessionDataResponse.Items[0];

    if (user_otp === request.data.entered_otp) {
        const currentTime = new Date(helper.getCurrentTimestamp());
        const otpGeneratedTime = new Date(otp_ts);

        const calculateTime = (currentTime - otpGeneratedTime) / (1000 * 60);

        if (calculateTime <= 10) {
            const user_reset_otp = helper.getRandomOtp().toString();
            request.data[requestData.scannerSessionId] = scanner_session_id;
            request.data[requestData.userResetOtp] = user_reset_otp;

            await scannerRepository.resetUserOtpScannerData2(request);

            const jwtToken = helper.getJwtTokenForScanner(fetchScannerSessionDataResponse.Items[0]);
            request[requestData.userJwt] = jwtToken;
            request[requestData.scannerSessionId] = scanner_session_id;

            await scannerRepository.updateScannerJwtToken2(request);
            return [{ jwt: jwtToken }];
        } else {
            throw new Error(messages.OTP_EXPIRED);
        }
    } else {
        throw new Error(messages.INVALID_OTP);
    }
};

exports.fetchSignedURLForAnswers = async (request) => {
    const folderPath = testFolder.studAnswerSheets.replace(signedUrlConstants.replace, request.data.test_id);

    const extFilesS3 = await helper.PutObjectS3SigneUdrl(request.data.ext_file, folderPath);

    return [{
        file_name: request.data.ext_file,
        s3Url: extFilesS3.uploadURL,
        Key: extFilesS3.Key
    }];
};

exports.uploadQuizAnswerSheetsNew = async (request) => {
    let quizPageMetadata = {};
    const scannedRes = await ocrServices.readOpenAiPage(request);

    if (scannedRes?.content) {
        let pageDetailsRes = await helper.extractValuesFromInputNew(scannedRes.content);
        const answers = await helper.extractAnswersFromInputNew(scannedRes.content);

        const pageNo = pageDetailsRes.find(item => item.label === commonConditionValue.pageNo)?.value;
        const quizId = request.data?.exam_id;
        const rollNo = request.data?.roll_no || "";
        const set = request.data?.set || quizSetDetails[0].setName;

        if (pageNo && quizId && rollNo) {
            quizPageMetadata.quiz_id = quizId;
            quizPageMetadata.quiz_set = set;
            quizPageMetadata.roll_no = request.data.roll_no !== common.NA ? request.data.roll_no.trim() : rollNo.trim();
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

            const fetchQuizDataResponse = await quizRepository.fetchQuizDataById2(request);

            if (helper.isEmptyObject(fetchQuizDataResponse.Item)) {
                return (messages.COULDNOT_READ_QUIZ_ID);
            }
            const fetchStudentDataResponse = await studentRepository.fetchStudentDataByRollNoClassSection2(request);

            if (!helper.isEmptyArray(fetchStudentDataResponse.Items)) {
                request.data.student_id = fetchStudentDataResponse.Items[0].student_id;

                const fetchQuizResultResponse = await quizResultRepository.fetchQuizResultDataOfStudent2(request);

                if (helper.isEmptyArray(fetchQuizResultResponse.Items)) {
                    const insertQuizDataResponse = await quizResultRepository.insertQuizDataOfStudent2(request);

                    if (insertQuizDataResponse === 200) {
                        return (messages.IMAGE_UPLOADED_SUCCESSFULLY);
                    } else {
                        return (messages.NEW_STUDENT_RECORD_NOT_ADDED);
                    }

                } else {

                    let pageExists = await fetchQuizResultResponse.Items[0].answer_metadata.filter(value => value.page_no === quizPageMetadata.answer_metadata[0].page_no);

                    if (helper.isEmptyArray(pageExists)) {
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
                    if (updateQuizDataResponse === 200) {
                        return (messages.IMAGE_SUCCESSFULLY_UPDATED)
                    }
                    else { return (messages.IMAGE_UPDATED_ISSUE) }

                }
            } else {
                return (messages.COULDNT_READ_ROLL_NUMBER);
            }
        }
        else { return (messages.UNABLE_TO_READ_PAGE_DETAILS); }
    } else {
        return (messages.UNABLE_TO_EXTRACT_TEXT);
    }
}

exports.uploadAnswerSheets2New = async (request) => {
    let pageMetadata = {};

    const scannedRes = await ocrServices.readOpenAiPage(request);
    if (scannedRes?.content) {
        let pageDetailsRes = await helper.extractValuesFromInputNew(scannedRes.content);
        const answers = await helper.extractAnswersFromInputNew(scannedRes.content);

        const pageNo = pageDetailsRes.find(item => item.label === commonConditionValue.pageNo)?.value;
        const testId = request.data?.exam_id;
        const rollNo = request.data?.roll_no || "";

        if (pageNo && testId && rollNo) {
            pageMetadata = {
                class_test_id: testId,
                roll_no: request.data.roll_no !== common.NA ? request.data.roll_no.trim() : rollNo.trim(),
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
                return (messages.COULDNT_READ_TEST_ID);
            }

            const studentData = await studentRepository.fetchStudentDataByRollNoClassSection2(request);

            if (!helper.isEmptyArray(studentData.Items)) {
                request.data.student_id = studentData.Items[0].student_id;
                const testResultData = await testResultRepository.fetchTestDataOfStudent2(request);

                if (helper.isEmptyArray(testResultData.Items)) {
                    const insertResponse = await testResultRepository.insertTestDataOfStudent2(request);
                    if (insertResponse === 200) {
                        return (messages.IMAGE_UPLOADED_SUCCESSFULLY)
                    } else {
                        return (messages.NEW_STUDENT_RECORD_NOT_ADDED)
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
                        return messages.IMAGE_SUCCESSFULLY_UPDATED
                    } else {
                        return (messages.IMAGE_UPDATED_ISSUE)
                    }
                }
            } else {
                return (messages.COULDNT_READ_ROLL_NUMBER);
            }
        } else {
            return (messages.COULDNT_READ_PAGE_DETAILS);
        }
    }
    else {
        return (messages.COULDNT_EXTRACT_TEXT);
    }
};

exports.fetchSignedURLForQuizAnswers = async (request) => {
    const folderPath = quizFolder.studAnswerSheets.replace(signedUrlConstants.replace, request.data.quiz_id);

    const extFilesS3 = await helper.PutObjectS3SigneUdrl(request.data.ext_file, folderPath);

    return [{
        file_name: request.data.ext_file,
        s3Url: extFilesS3.uploadURL,
        Key: extFilesS3.Key
    }];
};

exports.removeUploadedAnswerData = async (request) => {

    const studentData = await studentRepository.fetchStudentDataByRollNoClassSection2(request);

    if (!helper.isEmptyArray(studentData.Items)) {
        request.data.student_id = studentData.Items[0].student_id;

        if (request.data.test_type === commonConditionValue.classTest) {
            request.data.class_test_id = request.data.exam_id;

            const testResultData = await testResultRepository.fetchTestDataOfStudent2(request);
            if (!helper.isEmptyArray(testResultData.Items)) {

                let pageDataExists = testResultData.Items[0].answer_metadata.find(value => value.url === request.data.Key[0]);

                if (pageDataExists) {
                    testResultData.Items[0].answer_metadata = testResultData.Items[0].answer_metadata.filter(value => value.url !== request.data.Key[0]);

                    const updateRequest = {
                        data: {
                            result_id: testResultData.Items[0].result_id,
                            answer_metadata: testResultData.Items[0].answer_metadata,
                        }
                    };
                    const updateResponse = await testResultRepository.updateTestDataOfStudent2(updateRequest);

                    if (updateResponse) {
                        return (messages.UPLOADED_ANSWER_REMOVED);
                    } else {
                        return (messages.UPLOADED_ANSWER_REMOVEAL_ISSUE);
                    }
                } else {
                    return (messages.ANSWER_DATA_WAS_NOT_FOUND);
                }
            } else {
                return (messages.TEST_DATA_NOT_FOUND);
            }
        } else if (request.data.test_type === commonConditionValue.quiz) {
            request.data.quiz_id = request.data.exam_id;

            const fetchQuizResultResponse = await quizResultRepository.fetchQuizResultDataOfStudent2(request);

            if (!helper.isEmptyArray(fetchQuizResultResponse.Items)) {

                let pageDataExists = fetchQuizResultResponse.Items[0].answer_metadata.find(value => value.url === request.data.Key[0]);

                if (pageDataExists) {
                    fetchQuizResultResponse.Items[0].answer_metadata = fetchQuizResultResponse.Items[0].answer_metadata.filter(value => value.url !== request.data.Key[0]);

                    const updateRequest = {
                        data: {
                            result_id: fetchQuizResultResponse.Items[0].result_id,
                            answer_metadata: fetchQuizResultResponse.Items[0].answer_metadata,
                            quiz_set: request.data.set
                        }
                    };
                    
                    const updateQuizDataResponse = await quizResultRepository.updateQuizDataOfStudent2(updateRequest);

                    if (updateQuizDataResponse) {
                        return (messages.UPLOADED_ANSWER_REMOVED);
                    } else {
                        return (messages.UPLOADED_ANSWER_REMOVEAL_ISSUE);
                    }
                } else {
                    return (messages.ANSWER_DATA_WAS_NOT_FOUND);
                }
            } else {
                return (messages.TEST_DATA_NOT_FOUND);
            }
        }
    } else {
        return (messages.STUDENT_DATA_NOT_FOUND);
    }
}
