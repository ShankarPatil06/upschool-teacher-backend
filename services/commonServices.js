
const { userRepository, schoolRepository } = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');
let sendMail = require("./emailService");

exports.userLogin = async (request) => {
    try {
        const user_data_by_email_response = await userRepository.fetchUserDataByEmail2(request);
        if (helper.isEmptyArray(user_data_by_email_response.Items)) {
            const user_data_by_phNo_response = await userRepository.fetchUserDataByPhoneNo2(request);

            if (helper.isEmptyArray(user_data_by_phNo_response.Items)) {
                const user_data_by_name_response = await userRepository.fetchUserDataByUserName2(request);

                if (helper.isEmptyArray(user_data_by_name_response.Items)) {
                    throw { status: 400, message: constant.messages.TEACHER_DOESNOT_EXISTS };
                }
                return await handleUserDataResponse(user_data_by_name_response, request);
            }
            return await handleUserDataResponse(user_data_by_phNo_response, request);
        }
        return await handleUserDataResponse(user_data_by_email_response, request);
    } catch (error) {
        throw error;
    }
};

const handleUserDataResponse = async (userResponse, request) => {
    const user = userResponse.Items[0];
    if (user.user_status !== constant.common.Active) throw { status: 400, message: constant.messages.USER_DOESNOT_EXISTS };

    request.data.school_id = user.school_id;
    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

    const school = schoolDataRes.Items[0];
    if (school.school_status !== constant.common.Active || school.subscription_active !== constant.common.Yes) {
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

exports.userLogout = async (request) => {

    let decode_token = helper.decodeJwtToken(request.token);

    request[constant.requestData.userJwt] = "";
    request[constant.requestData.teacherId] = decode_token.teacher_id;

    await userRepository.updateJwtToken2(request);
    return { status: 200 };
};

exports.LoginWithoutPassword2 = async (request) => {

    const fetch_user_data_response = await userRepository.fetchUserDataByEmail2(request);

    if (!helper.isEmptyArray(fetch_user_data_response.Items) && fetch_user_data_response.Items[0].user_status === constant.common.Active) {

        request.data.school_id = fetch_user_data_response.Items[0].school_id;
        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

        if (!helper.isEmptyArray(schoolDataRes.Items) && schoolDataRes.Items[0].school_status === constant.common.Active && schoolDataRes.Items[0].subscription_active === constant.common.Yes) {
            const user_otp = helper.getRandomOtp().toString();

            const mailPayload = {
                user_otp: user_otp,
                toMail: request.data.user_email,
                subject: (request.data.otpSubject === constant.requestData.reset) ? constant.mailSubject.otpForResettingPassword :
                    (request.data.otpSubject === constant.requestData.create) ? constant.mailSubject.otpForCreatingPassword :
                        constant.mailSubject.otpForLogin,
                mailFor: constant.requestData.sendOTP,
            };

            const dataEmail = await sendMail.process(mailPayload);

            if (dataEmail.httpStatusCode === 200) {
                const teacher_id = fetch_user_data_response.Items[0].teacher_id;
                request.data[constant.requestData.userOTP] = user_otp;
                request.data[constant.requestData.teacherId] = teacher_id;

                await userRepository.updateUserOtp2(request);
                return { status: 200, message: constant.messages.OTP_SENT_SUCCESS };
            } else {
                throw new Error(constant.messages.SNS_ERROR);
            }
        } else {
            throw new Error(constant.messages.SCHOOL_IS_INACTIVE);
        }
    } else {
        throw new Error(constant.messages.TEACHER_DOESNOT_EXISTS);
    }

};

exports.validateOtpForLogin2 = async (request) => {
    const fetchUserDataResponse = await userRepository.fetchUserDataByEmail2(request);
    if (helper.isEmptyArray(fetchUserDataResponse.Items)) {
        return { statusCode: 400, message: constant.messages.USER_EMAIL_NOT_EXIST };
    }

    if (fetchUserDataResponse.Items[0].user_otp !== request.data.entered_otp) {
        return { statusCode: 400, message: constant.messages.INVALID_OTP };
    }

    request.data.school_id = fetchUserDataResponse.Items[0].school_id;
    const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

    if (helper.isEmptyArray(schoolDataRes.Items) ||
        schoolDataRes.Items[0].school_status !== constant.common.Active ||
        schoolDataRes.Items[0].subscription_active !== constant.common.Yes) {
        return { statusCode: 400, message: constant.messages.SCHOOL_IS_INACTIVE };
    }

    const userResetOtp = helper.getRandomOtp().toString();
    request.data.teacher_id = fetchUserDataResponse.Items[0].teacher_id;
    request.data.user_reset_otp = userResetOtp;

    await userRepository.resetUserOtp2(request);

    const jwtToken = helper.getJwtToken(fetchUserDataResponse.Items[0]);
    request.user_jwt = jwtToken;
    request.teacher_id = fetchUserDataResponse.Items[0].teacher_id;

    const firstLogin = !fetchUserDataResponse.Items[0].user_pwd ? constant.common.Yes : constant.common.No;

    await userRepository.updateJwtToken2(request);

    return [{
        jwt: jwtToken,
        isFirstTimeLogin: firstLogin,
        teacher_id: fetchUserDataResponse.Items[0].teacher_id,
        school_id: fetchUserDataResponse.Items[0].school_id,
        school_name: schoolDataRes.Items[0].school_name
    }];
};

exports.passwordCreateOrReset = async (request) => {
    const fetchUserDataResponse = await userRepository.fetchUserDataByEmail2(request);

    if (helper.isEmptyArray(fetchUserDataResponse.Items)) {
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

    return { statusCode: 200, message: constant.messages.PASSWORD_RESET_SUCCESS };

};

exports.updatePassword = async (request) => {
    try {
        request.teacher_id = request.data.teacher_id;
        const teacherDataResponse = await userRepository.fetchUserDataByUserId2(request);

        if (helper.isEmptyArray(teacherDataResponse.Items)) {
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

        return { statusCode: 200, message: constant.messages.PASSWORD_CHANGED_SUCCESS };

    } catch (error) {
        throw error;
    }
};