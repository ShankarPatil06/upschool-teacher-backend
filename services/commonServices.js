const dynamoDbCon = require('../awsConfig');
const { userRepository, schoolRepository } = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { nextTick } = require("process");
const { futimesSync } = require('fs');
let sendMail = require("./emailService");

// exports.userLogin = function (request, callback) {

//     userRepository.fetchUserDataByEmail(request, function (user_data_by_email_err, user_data_by_email_response) {
//         if (user_data_by_email_err) {
//             console.log(user_data_by_email_err);
//             callback(user_data_by_email_err, user_data_by_email_response);
//         } else {
//             console.log(user_data_by_email_response);
//             console.log("user_data_by_email_response.Items[0] : ", user_data_by_email_response.Items[0]);

//             if (user_data_by_email_response.Items.length > 0) {
//                 if (user_data_by_email_response.Items[0].user_status === "Active") {
//                     /** CHECK SCHOOL STATUS **/
//                     request.data.school_id = user_data_by_email_response.Items[0].school_id;
//                     schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
//                         if (schoolDataErr) {
//                             console.log(schoolDataErr);
//                             callback(schoolDataErr, schoolDataRes);
//                         }
//                         else {
//                             if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {
//                                 if (user_data_by_email_response.Items[0].user_pwd && user_data_by_email_response.Items[0].user_pwd != "") {
//                                     let hashReq = {
//                                         "salt": user_data_by_email_response.Items[0].user_salt,
//                                         "password": request.data.user_password
//                                     }

//                                     console.log("HASH REQ : ", hashReq);
//                                     console.log("user_data_by_email_response.Items[0].user_salt : ", user_data_by_email_response.Items[0].user_salt);
//                                     console.log("request.data.user_password : ", request.data.user_password);

//                                     console.log("user_data_by_email_response.Items[0].user_pwd : ", user_data_by_email_response.Items[0].user_pwd);
//                                     console.log("helper.hashingPassword(hashReq) : ", helper.hashingPassword(hashReq));
//                                     console.log("helper.hashingPassword(hashReq) : ", helper.hashingPassword(hashReq));


//                                     if (user_data_by_email_response.Items[0].user_pwd === helper.hashingPassword(hashReq)) {
//                                         console.log("Password Validated Successfully");
//                                         let jwtToken = helper.getJwtToken(user_data_by_email_response.Items[0]);

//                                         request["user_jwt"] = jwtToken;
//                                         request["teacher_id"] = user_data_by_email_response.Items[0].teacher_id;

//                                         console.log("request", request)

//                                         userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
//                                             if (update_jwt_err) {
//                                                 console.log(update_jwt_err);
//                                                 callback(update_jwt_err, update_jwt_response);
//                                             } else {
//                                                 console.log("Jwt Token Updated Successfully");
//                                                 callback(0, [{ jwt: jwtToken, teacher_id: user_data_by_email_response.Items[0].teacher_id, school_id: user_data_by_email_response.Items[0].school_id, school_name: schoolDataRes.Items[0].school_name }]);
//                                             }
//                                         })
//                                     } else {
//                                         console.log("Invalid Password");
//                                         callback(400, constant.messages.INVALID_PASSWORD);
//                                     }
//                                 }
//                                 else {
//                                     console.log("First Login");
//                                     callback(400, constant.messages.FIRST_LOGIN);
//                                 }
//                             }
//                             else {
//                                 console.log(constant.messages.SCHOOL_IS_INACTIVE);
//                                 callback(400, constant.messages.SCHOOL_IS_INACTIVE);
//                             }
//                         }
//                     })
//                     /** END CHECK SCHOOL STATUS **/
//                 }
//                 else {
//                     console.log(constant.messages.USER_DOESNOT_EXISTS);
//                     callback(400, constant.messages.USER_DOESNOT_EXISTS);
//                 }
//             } else {
//                 console.log("User Email Doesn't Exists");

//                 /** FETCH USER BY PHONE NO **/
//                 userRepository.fetchUserDataByPhoneNo(request, function (user_data_by_phNo_err, user_data_by_phNo_response) {
//                     if (user_data_by_phNo_err) {
//                         console.log(user_data_by_phNo_err);
//                         callback(user_data_by_phNo_err, user_data_by_phNo_response);
//                     } else {
//                         if (user_data_by_phNo_response.Items.length > 0) {
//                             if (user_data_by_phNo_response.Items[0].user_status === "Active") {
//                                 /** CHECK SCHOOL STATUS **/
//                                 request.data.school_id = user_data_by_phNo_response.Items[0].school_id;
//                                 schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
//                                     if (schoolDataErr) {
//                                         console.log(schoolDataErr);
//                                         callback(schoolDataErr, schoolDataRes);
//                                     }
//                                     else {
//                                         if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {
//                                             if (user_data_by_phNo_response.Items[0].user_pwd && user_data_by_phNo_response.Items[0].user_pwd != "") {
//                                                 let hashReq = {
//                                                     "salt": user_data_by_phNo_response.Items[0].user_salt,
//                                                     "password": request.data.user_password
//                                                 }

//                                                 if (user_data_by_phNo_response.Items[0].user_pwd === helper.hashingPassword(hashReq)) {
//                                                     console.log("Password Validated Successfully");
//                                                     let jwtToken = helper.getJwtToken(user_data_by_phNo_response.Items[0]);

//                                                     request["user_jwt"] = jwtToken;
//                                                     request["teacher_id"] = user_data_by_phNo_response.Items[0].teacher_id;

//                                                     console.log("request", request)

//                                                     userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
//                                                         if (update_jwt_err) {
//                                                             console.log(update_jwt_err);
//                                                             callback(update_jwt_err, update_jwt_response);
//                                                         } else {
//                                                             console.log("Jwt Token Updated Successfully");
//                                                             callback(0, [{ jwt: jwtToken, teacher_id: user_data_by_phNo_response.Items[0].teacher_id, school_id: user_data_by_phNo_response.Items[0].school_id, school_name: schoolDataRes.Items[0].school_name }]);
//                                                         }
//                                                     })
//                                                 } else {
//                                                     console.log("Invalid Password");
//                                                     callback(400, constant.messages.INVALID_PASSWORD);
//                                                 }
//                                             }
//                                             else {
//                                                 console.log("First Login");
//                                                 callback(400, constant.messages.FIRST_LOGIN);
//                                             }
//                                         }
//                                         else {
//                                             console.log(constant.messages.SCHOOL_IS_INACTIVE);
//                                             callback(400, constant.messages.SCHOOL_IS_INACTIVE);
//                                         }
//                                     }
//                                 })
//                                 /** END CHECK SCHOOL STATUS **/
//                             }
//                             else {
//                                 console.log(constant.messages.USER_DOESNOT_EXISTS);
//                                 callback(400, constant.messages.USER_DOESNOT_EXISTS);
//                             }

//                         } else {
//                             console.log("User Phone Number Doesn't Exists");

//                             /** FETCH USER BY USER NAME **/
//                             userRepository.fetchUserDataByUserName(request, function (user_data_by_name_err, user_data_by_name_response) {
//                                 if (user_data_by_name_err) {
//                                     console.log(user_data_by_name_err);
//                                     callback(user_data_by_name_err, user_data_by_name_response);
//                                 } else {
//                                     if (user_data_by_name_response.Items.length > 0) {
//                                         if (user_data_by_name_response.Items[0].user_status === "Active") {
//                                             /** CHECK SCHOOL STATUS **/
//                                             request.data.school_id = user_data_by_name_response.Items[0].school_id;
//                                             schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
//                                                 if (schoolDataErr) {
//                                                     console.log(schoolDataErr);
//                                                     callback(schoolDataErr, schoolDataRes);
//                                                 }
//                                                 else {
//                                                     if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {
//                                                         if (user_data_by_name_response.Items[0].user_pwd && user_data_by_name_response.Items[0].user_pwd != "") {
//                                                             let hashReq = {
//                                                                 "salt": user_data_by_name_response.Items[0].user_salt,
//                                                                 "password": request.data.user_password
//                                                             }

//                                                             if (user_data_by_name_response.Items[0].user_pwd === helper.hashingPassword(hashReq)) {
//                                                                 console.log("Password Validated Successfully");
//                                                                 let jwtToken = helper.getJwtToken(user_data_by_name_response.Items[0]);

//                                                                 request["user_jwt"] = jwtToken;
//                                                                 request["teacher_id"] = user_data_by_name_response.Items[0].teacher_id;

//                                                                 console.log("request", request)

//                                                                 userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
//                                                                     if (update_jwt_err) {
//                                                                         console.log(update_jwt_err);
//                                                                         callback(update_jwt_err, update_jwt_response);
//                                                                     } else {
//                                                                         console.log("Jwt Token Updated Successfully");
//                                                                         callback(0, [{ jwt: jwtToken, teacher_id: user_data_by_name_response.Items[0].teacher_id, school_id: user_data_by_name_response.Items[0].school_id, school_name: schoolDataRes.Items[0].school_name }]);
//                                                                     }
//                                                                 })
//                                                             } else {
//                                                                 console.log("Invalid Password");
//                                                                 callback(400, constant.messages.INVALID_PASSWORD);
//                                                             }
//                                                         }
//                                                         else {
//                                                             console.log("First Login");
//                                                             callback(400, constant.messages.FIRST_LOGIN);
//                                                         }
//                                                     }
//                                                     else {
//                                                         console.log(constant.messages.SCHOOL_IS_INACTIVE);
//                                                         callback(400, constant.messages.SCHOOL_IS_INACTIVE);
//                                                     }
//                                                 }
//                                             })
//                                             /** END CHECK SCHOOL STATUS **/
//                                         }
//                                         else {
//                                             console.log(constant.messages.USER_DOESNOT_EXISTS);
//                                             callback(400, constant.messages.USER_DOESNOT_EXISTS);
//                                         }
//                                     } else {
//                                         console.log("User Name Doesn't Exists");
//                                         callback(400, constant.messages.TEACHER_DOESNOT_EXISTS);
//                                     }
//                                 }
//                             });
//                             /** FETCH USER BY USER NAME **/
//                         }
//                     }
//                 });
//                 /** FETCH USER BY PHONE NO **/
//             }
//         }
//     });
//     /** END FETCH USER BY EMAIL **/
// }

exports.userLogin = async (request)=> {
    try {
        const user_data_by_email_response = await userRepository.fetchUserDataByEmail2(request);
         console.log("---1------",user_data_by_email_response);
        if (user_data_by_email_response.Items.length === 0) {
            const user_data_by_phNo_response = await userRepository.fetchUserDataByPhoneNo2(request);
            console.log("---2------");

            if (user_data_by_phNo_response.Items.length === 0) {
                const user_data_by_name_response = await userRepository.fetchUserDataByUserName2(request);
                console.log("---3------");

                if (user_data_by_name_response.Items.length === 0) {
                    throw { status: 400, message: constant.messages.TEACHER_DOESNOT_EXISTS };
                }
                return await handleUserDataResponse(user_data_by_name_response, request);
            }
            return await handleUserDataResponse(user_data_by_phNo_response, request);
        }
        return await handleUserDataResponse(user_data_by_email_response, request);
    } catch (error) {
        console.log(error);
        throw error;
    }
};

 const handleUserDataResponse = async(userResponse, request)=> {
    const user = userResponse.Items[0];
    if (user.user_status !== "Active") throw { status: 400, message: constant.messages.USER_DOESNOT_EXISTS };

    request.data.school_id = user.school_id;
    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
    console.log("schoolDataRes - ", schoolDataRes);

    const school = schoolDataRes.Items[0];
    if (school.school_status !== "Active" || school.subscription_active !== "Yes") {
        throw { status: 400, message: constant.messages.SCHOOL_IS_INACTIVE };
    }

    if (!user.user_pwd) throw { status: 400, message: constant.messages.FIRST_LOGIN };

    const hashReq = { salt: user.user_salt, password: request.data.user_password };
    if (user.user_pwd !== helper.hashingPassword(hashReq)) {
        throw { status: 400, message: constant.messages.INVALID_PASSWORD };
    }

    const jwtToken = helper.getJwtToken(user);
    request.user_jwt = jwtToken;
    request.teacher_id = user.teacher_id;
    await userRepository.updateJwtToken2(request);

    return [{
        jwt: jwtToken,
        teacher_id: user.teacher_id,
        school_id: user.school_id,
        school_name: school.school_name,
    }];
}


// exports.userLogout = function (request, callback) {

//     let decode_token = helper.decodeJwtToken(request.token);
//     console.log("request - : ", request);

//     request["user_jwt"] = "";
//     request["teacher_id"] = decode_token.teacher_id;

//     userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
//         if (update_jwt_err) {
//             console.log(update_jwt_err);
//             callback(update_jwt_err, update_jwt_response);
//         } else {
//             console.log("OTP send for login without password");
//             callback(0, 200);
//         }
//     })
// }

exports.userLogout = async (request) => {

        let decode_token = helper.decodeJwtToken(request.token);

        request["user_jwt"] = "";
        request["teacher_id"] = decode_token.teacher_id;

        await userRepository.updateJwtToken2(request);
        return { status: 200 }; 
};


exports.LoginWithoutPassword = function (request, callback)  {
    userRepository.fetchUserDataByEmail(request, function (fetch_user_data_err, fetch_user_data_response) {
        if (fetch_user_data_err) {
            console.log(fetch_user_data_err);
            callback(fetch_user_data_err, fetch_user_data_response);
        } else {
            if (fetch_user_data_response.Items.length > 0 && fetch_user_data_response.Items[0].user_status == "Active") {

                /** CHECK SCHOOL STATUS **/
                request.data.school_id = fetch_user_data_response.Items[0].school_id;
                schoolRepository.getSchoolDetailsById(request, async (schoolDataErr, schoolDataRes) => {
                    if (schoolDataErr) {
                        console.log(schoolDataErr);
                        callback(schoolDataErr, schoolDataRes);
                    }
                    else {
                        if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {
                            let user_otp = helper.getRandomOtp().toString();

                            var mailPayload = {
                                "user_otp": user_otp,
                                "toMail": request.data.user_email,
                                "subject": (request.data.otpSubject && request.data.otpSubject === "reset") ? constant.mailSubject.otpForResettingPassword : (request.data.otpSubject && request?.data?.otpSubject === "create") ? constant.mailSubject.otpForCreatingPassword : constant.mailSubject.otpForLogin,
                                "mailFor": "Send OTP",
                            };

                            let dataEmail = await sendMail.process(mailPayload)
                            if (dataEmail.httpStatusCode == 200) {
                                let teacher_id = fetch_user_data_response.Items[0].teacher_id
                                request.data["user_otp"] = user_otp;
                                request.data["teacher_id"] = teacher_id;
                                userRepository.updateUserOtp(request, function (update_user_otp_err, update_user_otp_response) {
                                    if (update_user_otp_err) {
                                        console.log(update_user_otp_err);
                                        callback(update_user_otp_err, update_user_otp_response);
                                    } else {
                                        callback(update_user_otp_err, update_user_otp_response);
                                    }
                                })
                            }
                            else{
                                console.log(dataEmail)
                                callback(400, "SNS ERROR");
                            }
                        }
                        else {
                            console.log(constant.messages.SCHOOL_IS_INACTIVE);
                            callback(400, constant.messages.SCHOOL_IS_INACTIVE);
                        }
                    }
                })
                /** END CHECK SCHOOL STATUS **/

            } else {
                callback(400, constant.messages.TEACHER_DOESNOT_EXISTS);
            }
        }
    });
}

exports.LoginWithoutPassword2 = async (request)=> {

        const fetch_user_data_response = await userRepository.fetchUserDataByEmail2(request);

        if (fetch_user_data_response.Items.length > 0 && fetch_user_data_response.Items[0].user_status === "Active") {

            request.data.school_id = fetch_user_data_response.Items[0].school_id;
            const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

            if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status === "Active" && schoolDataRes.Items[0].subscription_active === "Yes") {
                const user_otp = helper.getRandomOtp().toString();

                const mailPayload = {
                    "user_otp": user_otp,
                    "toMail": request.data.user_email,
                    "subject": (request.data.otpSubject === "reset") ? constant.mailSubject.otpForResettingPassword : 
                                (request.data.otpSubject === "create") ? constant.mailSubject.otpForCreatingPassword : 
                                constant.mailSubject.otpForLogin,
                    "mailFor": "Send OTP",
                };

                const dataEmail = await sendMail.process(mailPayload);

                if (dataEmail.httpStatusCode === 200) {
                    const teacher_id = fetch_user_data_response.Items[0].teacher_id;
                    request.data["user_otp"] = user_otp;
                    request.data["teacher_id"] = teacher_id;

                    await userRepository.updateUserOtp2(request);
                    return { status: 200, message: "OTP sent successfully." };
                } else {
                    console.log(dataEmail);
                    throw new Error("SNS ERROR");
                }
            } else {
                console.log(constant.messages.SCHOOL_IS_INACTIVE);
                throw new Error(constant.messages.SCHOOL_IS_INACTIVE);
            }
        } else {
            throw new Error(constant.messages.TEACHER_DOESNOT_EXISTS);
        }

};


exports.validateOtpForLogin = function (request, callback) {
    console.log("validateOtpForLogin : ", request);

    userRepository.fetchUserDataByEmail(request, function (fetch_user_data_err, fetch_user_data_response) {
        if (fetch_user_data_err) {
            console.log(fetch_user_data_err);
            callback(fetch_user_data_err, fetch_user_data_response);
        } else {
            console.log("fetch_user_data_response", fetch_user_data_response);
            if (fetch_user_data_response.Items.length > 0) {
                if (fetch_user_data_response.Items[0].user_otp === request.data.entered_otp) {

                    request.data.school_id = fetch_user_data_response.Items[0].school_id;
                    schoolRepository.getSchoolDetailsById(request, (schoolDataErr, schoolDataRes) => {
                        if (schoolDataErr) {
                            console.log(schoolDataErr);
                            callback(schoolDataErr, schoolDataRes);
                        }
                        else {
                            if (schoolDataRes.Items.length > 0 && schoolDataRes.Items[0].school_status == "Active" && schoolDataRes.Items[0].subscription_active == "Yes") {

                                let user_reset_otp = helper.getRandomOtp().toString();
                                request.data["teacher_id"] = fetch_user_data_response.Items[0].teacher_id
                                request.data["user_reset_otp"] = user_reset_otp;
                                userRepository.resetUserOtp(request, function (reset_user_otp_err, reset_user_otp_response) {
                                    if (reset_user_otp_err) {
                                        console.log(reset_user_otp_err);
                                        callback(reset_user_otp_err, reset_user_otp_response);
                                    } else {
                                        let jwtToken = helper.getJwtToken(fetch_user_data_response.Items[0]);

                                        request["user_jwt"] = jwtToken;
                                        request["teacher_id"] = fetch_user_data_response.Items[0].teacher_id;

                                        let firstLogin = (fetch_user_data_response.Items[0].user_pwd && fetch_user_data_response.Items[0].user_pwd != "") ? "No" : "Yes";

                                        userRepository.updateJwtToken(request, function (update_jwt_err, update_jwt_response) {
                                            if (update_jwt_err) {
                                                console.log(update_jwt_err);
                                                callback(update_jwt_err, update_jwt_response);
                                            } else {
                                                console.log("Jwt Token Updated Successfully");
                                                callback(0, [{ jwt: jwtToken, isFirstTimeLogin: firstLogin, teacher_id: fetch_user_data_response.Items[0].teacher_id, school_id: fetch_user_data_response.Items[0].school_id, school_name: schoolDataRes.Items[0].school_name }]);
                                            }
                                        })
                                    }
                                })

                            }
                            else {
                                console.log(constant.messages.SCHOOL_IS_INACTIVE);
                                callback(400, constant.messages.SCHOOL_IS_INACTIVE);
                            }
                        }
                    })



                } else {
                    callback(400, "Invalid OTP")
                }
            } else {
                callback(400, "User Email does not Exits");
            }
        }
    })
}

exports.validateOtpForLogin2 = async (request) => {
console.log("------1-----",request);
        const fetchUserDataResponse = await userRepository.fetchUserDataByEmail2(request);
console.log("++++==",fetchUserDataResponse.Items);
        if (fetchUserDataResponse.Items.length === 0) {
            // throw new Error("User Email does not exist");
            return { statusCode: 400, message: "User Email does not exist" };
        }

        if (fetchUserDataResponse.Items[0].user_otp !== request.data.entered_otp) {
            // throw new Error("Invalid OTP");
            return { statusCode: 400, message: "Invalid OTP" };
        }
        console.log("------2-----");

        request.data.school_id = fetchUserDataResponse.Items[0].school_id;
        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

        if (schoolDataRes.Items.length === 0 || 
            schoolDataRes.Items[0].school_status !== "Active" || 
            schoolDataRes.Items[0].subscription_active !== "Yes") {
            // throw new Error(constant.messages.SCHOOL_IS_INACTIVE);
            return { statusCode: 400, message: constant.messages.SCHOOL_IS_INACTIVE };
        }

        const userResetOtp = helper.getRandomOtp().toString();
        request.data.teacher_id = fetchUserDataResponse.Items[0].teacher_id;
        request.data.user_reset_otp = userResetOtp;
        console.log("------3-----");
        
        await userRepository.resetUserOtp2(request);
        
        const jwtToken = helper.getJwtToken(fetchUserDataResponse.Items[0]);
        request.user_jwt = jwtToken;
        request.teacher_id = fetchUserDataResponse.Items[0].teacher_id;

        const firstLogin = !fetchUserDataResponse.Items[0].user_pwd ? "Yes" : "No";
        console.log("------4-----");

        await userRepository.updateJwtToken2(request);
        console.log("Jwt Token Updated Successfully");

        return [{
            jwt: jwtToken,
            isFirstTimeLogin: firstLogin,
            teacher_id: fetchUserDataResponse.Items[0].teacher_id,
            school_id: fetchUserDataResponse.Items[0].school_id,
            school_name: schoolDataRes.Items[0].school_name
        }];
};


// exports.passwordCreateOrReset = function (request, callback) {
//     userRepository.fetchUserDataByEmail(request, function (fetch_user_data_err, fetch_user_data_response) {
//         if (fetch_user_data_err) {
//             console.log(fetch_user_data_err);
//             callback(fetch_user_data_err, fetch_user_data_response);
//         } else {
//             if (fetch_user_data_response.Items.length > 0) {
//                 if (request.data.new_password === request.data.confirm_password) {
//                     var user_salt = helper.getRandomString();
//                     let hashReq = {
//                         "salt": user_salt,
//                         "password": request.data.new_password
//                     }

//                     console.log("helper.hashingPassword(hashReq) : ", helper.hashingPassword(hashReq));
//                     console.log("CHANGE HASH REQ : ", hashReq);
//                     console.log("user_salt : ", user_salt);

//                     let user_pwd = helper.hashingPassword(hashReq);
//                     request.data["user_salt"] = user_salt;
//                     request.data["user_pwd"] = user_pwd;

//                     request.data["teacher_id"] = fetch_user_data_response.Items[0].teacher_id;
//                     request.data["user_jwt"] = "";

//                     userRepository.resetPassword(request, function (reset_forgot_otp_and_pwd_err, reset_forgot_otp_and_pwd_response) {
//                         if (reset_forgot_otp_and_pwd_err) {
//                             console.log(reset_forgot_otp_and_pwd_err);
//                             callback(reset_forgot_otp_and_pwd_err, reset_forgot_otp_and_pwd_response);
//                         } else {
//                             console.log("PASSWORD RESET!");
//                             callback(0, 200);
//                         }
//                     })
//                 }
//                 else {
//                     callback(403, constant.messages.PASSWORD_MISSMATCH);
//                 }
//             } else {
//                 callback(402, constant.messages.USER_EMAIL_DOESNOT_EXISTS);
//             }
//         }
//     })
// }

exports.passwordCreateOrReset = async (request)=> {
        const fetchUserDataResponse = await userRepository.fetchUserDataByEmail2(request);

        if (fetchUserDataResponse.Items.length === 0) {
            return { statusCode: 402, message: constant.messages.USER_EMAIL_DOESNOT_EXISTS };
        }

        if (request.data.new_password !== request.data.confirm_password) {
            return { statusCode: 403, message: constant.messages.PASSWORD_MISSMATCH };
        }

        const userSalt = helper.getRandomString();
        const userPwd = helper.hashingPassword({ salt: userSalt, password: request.data.new_password });

        request.data.user_salt = userSalt;
        request.data.user_pwd = userPwd;
        request.data.teacher_id = fetchUserDataResponse.Items[0].teacher_id;
        request.data.user_jwt = ""; 

        await userRepository.resetPassword2(request);

        console.log("PASSWORD RESET!");
        return { statusCode: 200, message: "Password reset successfully" };

};


// exports.updatePassword = function (request, callback) {
//     request["teacher_id"] = request.data.teacher_id;
//     userRepository.fetchUserDataByUserId(request, function (teacherData_err, teacherData_response) {
//         if (teacherData_err) {
//             console.log(teacherData_err);
//             callback(teacherData_err, teacherData_response);
//         } else {
//             if (teacherData_response.Items.length > 0) {
//                 if (teacherData_response.Items[0].user_pwd && teacherData_response.Items[0].user_pwd != "") {
//                     let hashReq = {
//                         "salt": teacherData_response.Items[0].user_salt,
//                         "password": request.data.oldPassword
//                     }
//                     let oldHashPassword = helper.hashingPassword(hashReq);

//                     if (teacherData_response.Items[0].user_pwd === oldHashPassword) {
//                         if (request.data.newPassword === request.data.confirmPassword) {
//                             var user_salt = helper.getRandomString();
//                             let newHashReq = {
//                                 "salt": user_salt,
//                                 "password": request.data.newPassword
//                             }

//                             let user_pwd = helper.hashingPassword(newHashReq);
//                             request.data["user_salt"] = user_salt;
//                             request.data["user_pwd"] = user_pwd;

//                             request.data["teacher_id"] = teacherData_response.Items[0].teacher_id;
//                             request.data["user_jwt"] = teacherData_response.Items[0].user_jwt;

//                             userRepository.resetPassword(request, function (changedPassword_err, changedPassword_response) {
//                                 if (changedPassword_err) {
//                                     console.log(changedPassword_err);
//                                     callback(changedPassword_err, changedPassword_response);
//                                 } else {
//                                     console.log("PASSWORD CHANGED!");
//                                     callback(0, 200);
//                                 }
//                             })
//                         }
//                         else {
//                             console.log(constant.messages.PASSWORD_MISSMATCH);
//                             callback(403, constant.messages.PASSWORD_MISSMATCH);
//                         }
//                     }
//                     else {
//                         console.log(constant.messages.INCORRECT_OLDPASSWORD);
//                         callback(400, constant.messages.INCORRECT_OLDPASSWORD);
//                     }
//                 }
//                 else {
//                     console.log("First Login");
//                     callback(400, constant.messages.FIRST_LOGIN);
//                 }
//             } else {
//                 console.log(constant.messages.USER_DOESNOT_EXISTS);
//                 callback(402, constant.messages.USER_DOESNOT_EXISTS);
//             }
//         }
//     })
// }


exports.updatePassword = async (request)=> {
    try {
        request.teacher_id = request.data.teacher_id;
        const teacherDataResponse = await userRepository.fetchUserDataByUserId2(request);

        if (teacherDataResponse.Items.length === 0) {
            return { statusCode: 402, message: constant.messages.USER_DOESNOT_EXISTS };
        }

        const teacherData = teacherDataResponse.Items[0];

        if (!teacherData.user_pwd) {
            return { statusCode: 400, message: constant.messages.FIRST_LOGIN };
        }

        const oldHashPassword = helper.hashingPassword({
            salt: teacherData.user_salt,
            password: request.data.oldPassword
        });

        if (teacherData.user_pwd !== oldHashPassword) {
            return { statusCode: 400, message: constant.messages.INCORRECT_OLDPASSWORD };
        }

        if (request.data.newPassword !== request.data.confirmPassword) {
            return { statusCode: 403, message: constant.messages.PASSWORD_MISSMATCH };
        }

        const newSalt = helper.getRandomString();
        const newHashedPassword = helper.hashingPassword({
            salt: newSalt,
            password: request.data.newPassword
        });

        request.data.user_salt = newSalt;
        request.data.user_pwd = newHashedPassword;
        request.data.teacher_id = teacherData.teacher_id;
        request.data.user_jwt = teacherData.user_jwt;

        await userRepository.resetPassword2(request);
        console.log("PASSWORD CHANGED!");

        return { statusCode: 200, message: "Password changed successfully" };

    } catch (error) {
        console.error("Error updating password:", error);
        throw error;
    }
};




// exports.checkQuestionPaperMapping = function (request, callback) {
//     console.log("request", request);
//     classTestData = request.arrayToCheck;
//     finalRes = "";
//     classTestData.forEach((Items, index) => {
//         if (Items.question_paper_id === request.question_paper_id) {
//             finalRes += ", " + Items.class_test_name;
//         }
//     })
//     console.log("finalRes", finalRes);
//     callback(0, finalRes)
// }
