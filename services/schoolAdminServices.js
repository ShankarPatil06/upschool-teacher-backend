const { schoolAdminRepository, userRepository } = require("../repository")
const helper = require('../helper/helper');
const { messages, common } = require("../constants/constant");

exports.addSchoolAdmin = async (request) => {
    const email_exists_response = await schoolAdminRepository.checkDuplicateAdminEmail2(request)
    if (!helper.isEmptyArray(email_exists_response.Items)) {
        throw helper.formatErrorResponse(messages.SCHOOL_USER_EXISTS_ALREADY, 400);
    }
    return await schoolAdminRepository.insertSchoolAdmin2(request)
}
exports.editSchoolAdmin = async (request) => {
    const check_email_response = await schoolAdminRepository.checkDuplicateAdminEmail2(request)

    if (!helper.isEmptyArray(check_email_response.Items) && (check_email_response.Items[0].teacher_id !== request.data.school_admin_id)) {
        throw helper.formatErrorResponse(messages.SCHOOL_USER_EXISTS_ALREADY, 400);
    }
    return await schoolAdminRepository.updateSchoolAdmin2(request)
}

exports.changeSchoolAdminStatus = async function (request) {
    try {
        const { user_status, school_admin_id } = request.data;
        if (user_status !== common.Active && user_status !== common.Archived) {
            throw helper.formatErrorResponse(messages.INVALID_USER_STATUS, 400);
        }

        const user_data_response = await userRepository.fetchUserDataByUserId2(request);
        if (helper.isEmptyArray(user_data_response.Items)) {
            throw helper.formatErrorResponse(messages.USER_DOESNOT_EXISTS, 400);
        }

        const user = user_data_response.Items[0];
        if (user.user_role !== common.MasterAdmin || user.teacher_id === school_admin_id) {
            throw helper.formatErrorResponse(messages.ACCESS_DENIED, 400);
        }

        return await userRepository.changeUserStatus2(request);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

