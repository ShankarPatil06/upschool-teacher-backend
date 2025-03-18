const { formatResponse } = require("../helper/helper");
const {commonServices} = require("../services");

exports.userLogin = async (req, res, next) => {
    try {
        let request = req.body;
        const login_response = await commonServices.userLogin(request);
        return formatResponse(res, login_response);
    } catch (error) {
        next(error)
    }
};

exports.userLogout = async (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');

    try {
        const logout_response = await commonServices.userLogout(request);
        formatResponse(res,logout_response);
    } catch (logout_err) {
       next(error)
    }
};

exports.userLoginWithoutPassword = async (req, res, next) => {
    let request = req.body;
    try {
        const loginWithoutPasswordRes = await commonServices.LoginWithoutPassword2(request);
        formatResponse(res,loginWithoutPasswordRes);
    } catch (error) {
       next(error);
    }
};

exports.validateUserOtp = async (req, res, next) => {
    const request = req.body;
    try {
        const validateResponse = await commonServices.validateOtpForLogin2(request);
        if (validateResponse.statusCode && validateResponse.statusCode !== 200) {
           formatResponse(res,validateResponse.message,validateResponse.statusCode);
        } else {
            formatResponse(res,validateResponse);
        }
    } catch (error) {
      next(error);
    }
};

exports.resetOrCreatePassword = async (req, res, next) => {
    let request = req.body;
    try{
        const passwordCreateOrResetRes = await commonServices.passwordCreateOrReset(request);
        if (passwordCreateOrResetRes.statusCode && passwordCreateOrResetRes.statusCode !== 200) {
            formatResponse(res,passwordCreateOrResetRes.message,passwordCreateOrResetRes.statusCode);
         } else {
             formatResponse(res,passwordCreateOrResetRes);
         }
       }
    catch(error)
     {
      next(error);
     }
};

exports.changePassword = async (req, res, next) => {
    let request = req.body;
    const updatePasswordRes = await commonServices.updatePassword(request);
    if (updatePasswordRes.statusCode && updatePasswordRes.statusCode !== 200) {
        formatResponse(res,updatePasswordRes.message,updatePasswordRes.statusCode);
     } else {
         formatResponse(res,updatePasswordRes);
     }
};


