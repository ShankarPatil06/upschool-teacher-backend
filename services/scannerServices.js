const dynamoDbCon = require('../awsConfig');
const { userRepository, classTestRepository, scannerRepository, schoolRepository, testResultRepository, studentRepository, quizRepository, quizResultRepository } = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const ocrServices = require('./ocrServices');
let sendMail = require("./emailService");

// exports.sendScannerLink = function (request, callback) {
//     console.log("sendScannerLink Services : ", request);
//     request["teacher_id"] = request.data.teacher_id;
//     userRepository.fetchUserDataByUserId(request, function (fetch_user_data_err, fetch_user_data_response) {
//         if (fetch_user_data_err) {
//             console.log(fetch_user_data_err);
//             callback(fetch_user_data_err, fetch_user_data_response);
//         } else {
//             if (fetch_user_data_response.Items.length > 0 && fetch_user_data_response.Items[0].user_status == "Active") {

//                 /** CHECK SCHOOL STATUS **/
//                 request.data.school_id = fetch_user_data_response.Items[0].school_id;
//                 schoolRepository.getSchoolDetailsById(request, async (schoolDataErr, schoolDataRes) => {
//                     if (schoolDataErr) {
//                         console.log(schoolDataErr);
//                         callback(schoolDataErr, schoolDataRes);
//                     }
//                     else {
//                         console.log("SCHOOL DATA : ", request.data.upload_url);
//                         if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {

//                             var mailPayload = {
//                                 "upload_url": request.data.upload_url,
//                                 "toMail": fetch_user_data_response.Items[0].user_email,
//                                 "subject": constant.mailSubject.urlToScanAnswerSheets,
//                                 "mailFor": "urlToUploadAnswerSheets",
//                             };

//                             console.log("MAIL PAYLAOD : ", mailPayload);
//                             let dataEmail = await sendMail.process(mailPayload)
//                             if (dataEmail.httpStatusCode == 200) {
//                                 callback(200, constant.messages.UPLOAD_URL_Sent);
//                             }
//                             else {
//                                 console.log(dataEmail)
//                                 callback(400, "SNS ERROR");
//                             }
//                         }
//                         else {
//                             console.log(constant.messages.SCHOOL_IS_INACTIVE);
//                             callback(400, constant.messages.SCHOOL_IS_INACTIVE);
//                         }
//                     }
//                 })
//                 /** END CHECK SCHOOL STATUS **/

//             } else {
//                 callback(400, constant.messages.TEACHER_DOESNOT_EXISTS);
//             }
//         }
//     });
// }

exports.sendScannerLink = async function (request) {
    console.log("sendScannerLink Services:", request);
    request.teacher_id = request.data.teacher_id;

    const userDataResponse = await userRepository.fetchUserDataByUserId2(request);

        if (userDataResponse.Items.length === 0 || userDataResponse.Items[0].user_status !== "Active") {
            return { statusCode: 400, message: constant.messages.TEACHER_DOESNOT_EXISTS };
        }

        request.data.school_id = userDataResponse.Items[0].school_id;

        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
        
        if (schoolDataRes.Items.length === 0 || 
            schoolDataRes.Items[0].school_status !== "Active" || 
            schoolDataRes.Items[0].subscription_active !== "Yes") {
            console.log(constant.messages.SCHOOL_IS_INACTIVE);
            return { statusCode: 400, message: constant.messages.SCHOOL_IS_INACTIVE };
        }

        const mailPayload = {
            upload_url: request.data.upload_url,
            toMail: userDataResponse.Items[0].user_email,
            subject: constant.mailSubject.urlToScanAnswerSheets,
            mailFor: "urlToUploadAnswerSheets",
        };

        console.log("MAIL PAYLOAD:", mailPayload);
        const emailResponse = await sendMail.process(mailPayload);

        if (emailResponse.httpStatusCode === 200) {
            return { statusCode: 200, message: constant.messages.UPLOAD_URL_Sent };
        } else {
            console.log("Email sending error:", emailResponse);
            return { statusCode: 400, message: "SNS ERROR" };
        }

};


// exports.sendOTPForScanning = function (request, callback) {
//     console.log("sendOTPForScanning Services : ", request);
//     request["teacher_id"] = request.data.teacher_id;
//     userRepository.fetchUserDataByUserId(request, async function (fetch_user_data_err, fetch_user_data_response) {
//         if (fetch_user_data_err) {
//             console.log(fetch_user_data_err);
//             callback(fetch_user_data_err, fetch_user_data_response);
//         } else {
//             if (fetch_user_data_response.Items.length > 0 && fetch_user_data_response.Items[0].user_status == "Active") {

//                 let user_otp = helper.getRandomOtp().toString();

//                 var mailPayload = {
//                     "user_otp": user_otp,
//                     "toMail": fetch_user_data_response.Items[0].user_email,
//                     "subject": constant.mailSubject.otpToScanAnswerSheets,
//                     "mailFor": "otpToScanAnswerSheets",
//                 };

//                 console.log("MAIL PAYLAOD : ", mailPayload);
//                 let dataEmail = await sendMail.process(mailPayload)
//                 if (dataEmail.httpStatusCode == 200) {
//                     {
//                         console.log("SNS PUBLISH SUCCESS");

//                         // Fetch upschool_scanner_session_info data to either insert or update the OTP

//                         scannerRepository.fetchScannerSessionData(request, function (fetch_scanner_session_data_err, fetch_scanner_session_data_response) {
//                             if (fetch_scanner_session_data_err) {
//                                 console.log(fetch_scanner_session_data_err);
//                                 callback(fetch_scanner_session_data_err, fetch_scanner_session_data_response);
//                             } else {
//                                 console.log(fetch_scanner_session_data_response);
//                                 if (fetch_scanner_session_data_response.Items?.length >= 1) {

//                                     // Update user_otp and ts to the existing record

//                                     let scanner_session_id = fetch_scanner_session_data_response.Items[0].scanner_session_id;
//                                     request.data["user_otp"] = user_otp;
//                                     request.data["scanner_session_id"] = scanner_session_id;

//                                     scannerRepository.updateUserOtpScannerData(request, function (update_user_otp_scanner_table_err, update_user_otp_scanner_table_response) {
//                                         if (update_user_otp_scanner_table_err) {
//                                             console.log(update_user_otp_scanner_table_err);
//                                             callback(update_user_otp_scanner_table_err, update_user_otp_scanner_table_response);
//                                         } else {
//                                             callback(update_user_otp_scanner_table_err, update_user_otp_scanner_table_response);
//                                         }
//                                     })
//                                 } else {

//                                     // Insert new record

//                                     request.data["user_otp"] = user_otp;

//                                     scannerRepository.insertUserOtpScannerData(request, function (insert_user_otp_scanner_table_err, insert_user_otp_scanner_table_response) {
//                                         if (insert_user_otp_scanner_table_err) {
//                                             console.log(insert_user_otp_scanner_table_err);
//                                             callback(insert_user_otp_scanner_table_err, insert_user_otp_scanner_table_response);
//                                         } else {
//                                             callback(insert_user_otp_scanner_table_err, insert_user_otp_scanner_table_response);
//                                         }
//                                     })

//                                 }
//                             }
//                         });

//                     }
//                 }
//                 else {
//                     console.log(dataEmail)
//                     callback(400, "SNS ERROR");
//                 }

//             } else {
//                 callback(400, constant.messages.TEACHER_DOESNOT_EXISTS);
//             }
//         }
//     });
// }

exports.sendOTPForScanning = async function (request) {
    console.log("sendOTPForScanning Services:", request);
    request.teacher_id = request.data.teacher_id;

        const userDataResponse = await userRepository.fetchUserDataByUserId2(request);

        if (userDataResponse.Items.length === 0 || userDataResponse.Items[0].user_status !== "Active") {
            return { statusCode: 400, message: constant.messages.TEACHER_DOESNOT_EXISTS };
        }

        const user_otp = helper.getRandomOtp().toString();
        const mailPayload = {
            user_otp,
            toMail: userDataResponse.Items[0].user_email,
            subject: constant.mailSubject.otpToScanAnswerSheets,
            mailFor: "otpToScanAnswerSheets",
        };

        console.log("MAIL PAYLOAD:", mailPayload);

        const emailResponse = await sendMail.process(mailPayload);
        if (emailResponse.httpStatusCode !== 200) {
            console.log("Email sending error:", emailResponse);
            return { statusCode: 400, message: "SNS ERROR" };
        }

        console.log("SNS PUBLISH SUCCESS");

        const scannerSessionResponse = await scannerRepository.fetchScannerSessionData2(request);

        request.data.user_otp = user_otp;

        if (scannerSessionResponse.Items?.length >= 1) {
            request.data.scanner_session_id = scannerSessionResponse.Items[0].scanner_session_id;
            const updateResponse = await scannerRepository.updateUserOtpScannerData2(request);
            return { statusCode: updateResponse ? 200 : 500, response: updateResponse };

        } else {
            const insertResponse = await scannerRepository.insertUserOtpScannerData2(request);
            return { statusCode: insertResponse ? 200 : 500, response: insertResponse };
        }

};


// exports.validateOTPForScanning = function (request, callback) {
//     console.log("validateOTPForScanning Services : ", request);
//     scannerRepository.fetchScannerSessionData(request, function (fetch_scanner_session_data_err, fetch_scanner_session_data_response) {
//         if (fetch_scanner_session_data_err) {
//             console.log(fetch_scanner_session_data_err);
//             callback(fetch_scanner_session_data_err, fetch_scanner_session_data_response);
//         } else {
//             console.log(fetch_scanner_session_data_response);

//             if (fetch_scanner_session_data_response.Items[0].user_otp === request.data.entered_otp) {

//                 let currentTime = new Date(helper.getCurrentTimestamp());
//                 let otpGeneratedTime = new Date(fetch_scanner_session_data_response.Items[0].otp_ts);

//                 let calculateTime = (currentTime - otpGeneratedTime) / (1000 * 60);

//                 if (calculateTime <= 10) {
//                     let user_reset_otp = helper.getRandomOtp().toString();
//                     request.data["scanner_session_id"] = fetch_scanner_session_data_response.Items[0].scanner_session_id
//                     request.data["user_reset_otp"] = user_reset_otp;
//                     scannerRepository.resetUserOtpScannerData(request, function (reset_user_otp_err, reset_user_otp_response) {
//                         if (reset_user_otp_err) {
//                             console.log(reset_user_otp_err);
//                             callback(reset_user_otp_err, reset_user_otp_response);
//                         } else {
//                             let jwtToken = helper.getJwtTokenForScanner(fetch_scanner_session_data_response.Items[0]);

//                             request["user_jwt"] = jwtToken;
//                             request["scanner_session_id"] = fetch_scanner_session_data_response.Items[0].scanner_session_id;

//                             scannerRepository.updateScannerJwtToken(request, function (update_jwt_err, update_jwt_response) {
//                                 if (update_jwt_err) {
//                                     console.log(update_jwt_err);
//                                     callback(update_jwt_err, update_jwt_response);
//                                 } else {
//                                     console.log("Jwt Token Updated Successfully");
//                                     callback(0, [{ jwt: jwtToken }]);
//                                 }
//                             })
//                         }
//                     })
//                 } else {
//                     callback(400, constant.messages.OTP_EXPIRED);
//                 }
//             } else {
//                 callback(400, constant.messages.INVALID_OTP);
//             }
//         }
//     });
// }

exports.validateOTPForScanning = async (request) => {

    const fetchScannerSessionDataResponse = await scannerRepository.fetchScannerSessionData2(request);
    
    console.log("fetchScannerSessionDataResponse - ",fetchScannerSessionDataResponse.Items[0]);

    if (!fetchScannerSessionDataResponse.Items.length) {
        throw new Error(constant.messages.SESSION_NOT_FOUND);
    }

    const { user_otp, otp_ts, scanner_session_id } = fetchScannerSessionDataResponse.Items[0];
console.log(user_otp ," - ",request.data.entered_otp );
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
            console.log("Jwt Token Updated Successfully");
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
        console.log({ extFilesS3 });

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
            console.log("BEFORE FORMATTING : ", scannedRes.data.text);
            if (scannedRes.data.text) {
                let words = await helper.formattingAnswer(scannedRes.data.text);

                exports.setValues(words, (pageDetailsErr, pageDetailsRes) => {
                    if (pageDetailsErr) {
                        console.log(pageDetailsErr);
                        callback(pageDetailsErr, pageDetailsRes);
                    }
                    else {
                        console.log("PAGE DETAILS", pageDetailsRes);

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

                                    console.log("Test object", fetch_class_test_data_response);
                                    if (helper.isEmptyObject(fetch_class_test_data_response.Item)) {
                                        callback(constant.messages.COULDNT_READ_TEST_ID, 0);
                                    } else {
                                        studentRepository.fetchStudentDataByRollNoClassSection(request, function (fetch_student_data_err, fetch_student_data_response) {
                                            if (fetch_student_data_err) {
                                                console.log(fetch_student_data_err);
                                                callback(fetch_student_data_err, fetch_student_data_response);
                                            } else {

                                                console.log("Student data based on ", fetch_student_data_response);

                                                if (fetch_student_data_response.Items.length > 0) {
                                                    request.data.student_id = fetch_student_data_response.Items[0].student_id;
                                                    testResultRepository.fetchTestDataOfStudent(request, async function (fetch_test_result_err, fetch_test_result_response) {
                                                        if (fetch_test_result_err) {
                                                            console.log(fetch_test_result_err);
                                                            callback(fetch_test_result_err, fetch_test_result_response);
                                                        } else {
                                                            console.log(fetch_test_result_response);

                                                            if (fetch_test_result_response.Items.length === 0) {
                                                                console.log("New Student Record for this test!");
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

                                                                console.log("pageExists", pageExists);
                                                                console.log("pageExists.length", pageExists.length);
                                                                console.log("pageMetadata", pageMetadata.answer_metadata[0]);

                                                                if (pageExists.length === 0) {
                                                                    console.log("New Page!")
                                                                    fetch_test_result_response.Items[0].answer_metadata.push({
                                                                        page_no: pageMetadata.answer_metadata[0].page_no,
                                                                        url: pageMetadata.answer_metadata[0].url,
                                                                        confidence_rate: pageMetadata.answer_metadata[0].confidence_rate,
                                                                        studentAnswer: pageMetadata.answer_metadata[0].studentAnswer
                                                                    });
                                                                } else {

                                                                    console.log("Page already exists!", fetch_test_result_response.Items[0].answer_metadata);
                                                                    await fetch_test_result_response.Items[0].answer_metadata.forEach((meta, i) => {
                                                                        if (meta.page_no === pageMetadata.answer_metadata[0].page_no) {
                                                                            fetch_test_result_response.Items[0].answer_metadata[i].url = pageMetadata.answer_metadata[0].url;
                                                                            fetch_test_result_response.Items[0].answer_metadata[i].confidence_rate = pageMetadata.answer_metadata[0].confidence_rate;
                                                                            fetch_test_result_response.Items[0].answer_metadata[i].studentAnswer = pageMetadata.answer_metadata[0].studentAnswer;
                                                                        }
                                                                    });
                                                                    console.log("pageMetadata after loop", pageMetadata);
                                                                    console.log("fetch_test_result_response.Items[0].answer_metadata : ", fetch_test_result_response.Items[0].answer_metadata);
                                                                }

                                                                /** UPDATE QUERY **/
                                                                let updateRequest = {
                                                                    data: {
                                                                        result_id: fetch_test_result_response.Items[0].result_id,
                                                                        answer_metadata: fetch_test_result_response.Items[0].answer_metadata,
                                                                    }
                                                                }

                                                                console.log("UPDATE PAGE!");
                                                                console.log(fetch_test_result_response.Items[0].answer_metadata);

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

    try {
        const scannedRes = await ocrServices.readScannedPage2(request);
        console.log("BEFORE FORMATTING2:", scannedRes.data.text);

        if (scannedRes.data.text) {
            const words = await helper.formattingAnswer(scannedRes.data.text);
            const pageDetailsRes = await exports.setValues2(words);

            console.log("PAGE DETAILS222 in uploadanswersheets2:", pageDetailsRes);

            if (pageDetailsRes.page_no && pageDetailsRes.roll_no) {
                pageMetadata = {
                    class_test_id: pageDetailsRes.test_id,
                    roll_no: request.data.roll_no !== 'N.A.' ? request.data.roll_no.trim() : pageDetailsRes.roll_no.trim().toLowerCase(),
                    answer_metadata: [{
                        page_no: pageDetailsRes.page_no,
                        url: request.data.Key,
                        confidence_rate: scannedRes.data.confidence_rate,
                        studentAnswer: words
                    }]
                };

                request.data = { ...request.data, roll_no: pageMetadata.roll_no, class_test_id: pageDetailsRes.test_id, answer_metadata: pageMetadata.answer_metadata };

                const classTestData = await classTestRepository.fetchClassTestDataById2(request);
                console.log("Test object:", classTestData);

                if (helper.isEmptyObject(classTestData.Item)) {
                    throw new Error(constant.messages.COULDNT_READ_TEST_ID);
                }

                const studentData = await studentRepository.fetchStudentDataByRollNoClassSection2(request);
                console.log("Student data:", studentData);

                if (studentData.Items.length > 0) {
                    request.data.student_id = studentData.Items[0].student_id;
                    const testResultData = await testResultRepository.fetchTestDataOfStudent2(request);

                    console.log("Test result data:", testResultData);

                    if (testResultData.Items.length === 0) {
                        console.log("New Student Record for this test!");
                        const insertResponse = await testResultRepository.insertTestDataOfStudent2(request);
                        return insertResponse;
                    } else {
                        console.log("Existing Student Record - Updating metadata");

                        let pageExists = testResultData.Items[0].answer_metadata.find(value => value.page_no === pageMetadata.answer_metadata[0].page_no);

                        if (!pageExists) {
                            console.log("New Page!");
                            testResultData.Items[0].answer_metadata.push(pageMetadata.answer_metadata[0]);
                        } else {
                            console.log("Page already exists!", testResultData.Items[0].answer_metadata);
                            testResultData.Items[0].answer_metadata = testResultData.Items[0].answer_metadata.map(meta => (
                                meta.page_no === pageMetadata.answer_metadata[0].page_no
                                    ? { ...meta, ...pageMetadata.answer_metadata[0] }
                                    : meta
                            ));
                        }

                        const updateRequest = {
                            data: {
                                result_id: testResultData.Items[0].result_id,
                                answer_metadata: testResultData.Items[0].answer_metadata,
                            }
                        };

                        console.log("Updating Page Metadata:", updateRequest.data.answer_metadata);

                        const updateResponse = await testResultRepository.updateTestDataOfStudent2(updateRequest);
                        return updateResponse;
                    }
                } else {
                    throw new Error(constant.messages.COULDNT_READ_ROLL_NUMBER);
                }
            } else {
                throw new Error(constant.messages.COULDNT_READ_PAGE_DETAILS);
            }
        } else {
            throw new Error(constant.messages.COULDNT_EXTRACT_TEXT);
        }
    } catch (error) {
        console.error("Error in uploadAnswerSheets:", error.message || error);
        throw error; // or return specific error handling if needed
    }
};


exports.setValues = async function (words, callback) {

    let pageNo, testID, rollNo, quizID, quiz_set;
    await words.forEach((word, index) => {
        if (index <= 7) {
            if (word.startsWith("pageno") && word.split(":")[1]) {
                pageNo = word.split(":")[1].split("/")[0];
            } else if (word.startsWith("testid") && word.split(":")[1]) {
                testID = word.split(":")[1]
            } else if (word.startsWith("rollno") && word.split(":")[1]) {
                rollNo = word.split(":")[1]
            } else if (word.startsWith("quizid") && word.split(":")[1]) {
                quizID = word.split(":")[1]
            } else if (word.startsWith("set") && (word.split(":").length === 2 && word.split(":")[1] === ("a" || "b" || "c"))) {
                quiz_set = word.split(":")[1]
            }
        }
    })

    callback(0, { "page_no": pageNo, "test_id": testID, "roll_no": rollNo, "quiz_id": quizID, "set": quiz_set })

}

exports.setValues2 = async function (words) {
    let pageNo, testID, rollNo, quizID, quiz_set;

    for (const [index, word] of words.entries()) {
      console.log(index,word)
        // if (index <= 7) {
          if (word.startsWith("pageno")) {
            const pagePart = word.slice(6);
            pageNo = pagePart.split("/")[0];}
          //  else if (word.startsWith("testid") && word.split(":")[1]) {
          //       testID = word.split(":")[1];
          //   } 
            else if (word.startsWith("rollno")) {
              rollNo = word.slice(6);
            }
             else if (word.startsWith("quizid")) {
              quizID = word.slice(6);
            } else if (word.startsWith("set")) {
                quiz_set = word.slice(3);
            }
        // }
    }
    console.log( pageNo, testID, rollNo, quizID, quiz_set)
  
    return { "page_no": pageNo, "test_id": testID, "roll_no": rollNo, "quiz_id": quizID, "set": quiz_set };
}



// exports.fetchSignedURLForQuizAnswers = async function (request, callback) {

//     // const folderPath = `${'quiz_uploads'}/${request.data.quiz_id}/${'student_answer_sheets'}`
//     const folderPath = constant.quizFolder.studAnswerSheets.replace("**REPLACE**", request.data.quiz_id);

//     const extFilesS3 = await helper.PutObjectS3SigneUdrl(request.data.ext_file, folderPath);
//     console.log({ extFilesS3 });
//     const finalResponse = [{ file_name: request.data.ext_file, s3Url: extFilesS3.uploadURL, Key: extFilesS3.Key }];
//     callback(0, finalResponse);
// }

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

        const scannedRes = await ocrServices.readScannedPage2(request);
        console.log("BEFORE FORMATTING : ", scannedRes.data.text);

        if (scannedRes.data.text) {
            let words = await helper.formattingAnswer(scannedRes.data.text);
            const pageDetailsRes = await exports.setValues2(words);

            console.log("PAGE DETAILS in quizanswer2: ", pageDetailsRes);

            if (pageDetailsRes.page_no && pageDetailsRes.quiz_id && pageDetailsRes.roll_no) {
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

                const fetchQuizDataResponse = await quizRepository.fetchQuizDataById2(request);
                
                if (helper.isEmptyObject(fetchQuizDataResponse.Item)) {
                    throw new Error(constant.messages.COULDNOT_READ_QUIZ_ID);
                }

                const fetchStudentDataResponse = await studentRepository.fetchStudentDataByRollNoClassSection2(request);
                
                if (fetchStudentDataResponse.Items.length > 0) {
                    request.data.student_id = fetchStudentDataResponse.Items[0].student_id;

                    const fetchQuizResultResponse = await quizResultRepository.fetchQuizResultDataOfStudent2(request);

                    if (fetchQuizResultResponse.Items.length === 0) {
                        const insertQuizDataResponse = await quizResultRepository.insertQuizDataOfStudent2(request);
                        return insertQuizDataResponse;
                    } else {
                        console.log(fetchQuizResultResponse.Items[0].answer_metadata);

                        let pageExists = await fetchQuizResultResponse.Items[0].answer_metadata.filter(value => value.page_no === quizPageMetadata.answer_metadata[0].page_no);

                        if (pageExists.length === 0) {
                            fetchQuizResultResponse.Items[0].answer_metadata.push({
                                page_no: quizPageMetadata.answer_metadata[0].page_no,
                                url: quizPageMetadata.answer_metadata[0].url,
                                confidence_rate: quizPageMetadata.answer_metadata[0].confidence_rate,
                                studentAnswer: quizPageMetadata.answer_metadata[0].studentAnswer
                            });
                        } else {
                            await fetchQuizResultResponse.Items[0].answer_metadata.forEach((meta, i) => {
                                if (meta.page_no === quizPageMetadata.answer_metadata[0].page_no) {
                                    fetchQuizResultResponse.Items[0].answer_metadata[i].url = quizPageMetadata.answer_metadata[0].url;
                                    fetchQuizResultResponse.Items[0].answer_metadata[i].confidence_rate = quizPageMetadata.answer_metadata[0].confidence_rate;
                                    fetchQuizResultResponse.Items[0].answer_metadata[i].studentAnswer = quizPageMetadata.answer_metadata[0].studentAnswer;
                                    fetchQuizResultResponse.Items[0].quiz_set = quizPageMetadata.quiz_set;
                                }
                            });
                        }

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
                        return updateQuizDataResponse;
    
                    }
                } else {
                    throw new Error(constant.messages.COULDNT_READ_ROLL_NUMBER);
                }
            } else {
                throw new Error(constant.messages.UNABLE_TO_READ_PAGE_DETAILS);
            }
        } else {
            console.log(constant.messages.UNABLE_TO_EXTRACT_TEXT);
            throw new Error(constant.messages.UNABLE_TO_EXTRACT_TEXT);
        }
}
