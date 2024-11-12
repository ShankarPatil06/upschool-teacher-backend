const { formatResponse } = require("../helper/helper");
const {commonServices} = require("../services");


exports.userLogin = async (req, res, next) => {
    try {
        let request = req.body;
        const login_response = await commonServices.userLogin(request);
        console.log("login_response - ",login_response);
        return formatResponse(res, login_response);
    } catch (error) {
        next(error)
    }
};

// exports.userLogout = (req, res, next) => {
//     console.log("LOGOUT");
//     console.log(req.body);
//     let request = req.body;
//     request["token"] = req.header('Authorization');
    
//     commonServices.userLogout(request, function (logout_err, logout_response) {
//         if (logout_err) {
//             res.status(logout_err).json(logout_response);
//         } else {
//             console.log("user logged out Successfully");
//             res.json(logout_response);
//         }
//     });
// };

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

// exports.userLoginWithoutPassword = (req, res, next) => {
//     console.log("LOGIN WITH OTP");
//     console.log(req.body);
//     let request = req.body;
//     commonServices.LoginWithoutPassword(request, function (loginWithoutPasswordErr, loginWithoutPasswordRes) {
//         if (loginWithoutPasswordErr) {
//             res.status(loginWithoutPasswordErr).json(loginWithoutPasswordRes);
//         } else {
//             console.log("OTP sent successfully");
//             res.json(loginWithoutPasswordRes);
//         }
//     });
// };

exports.userLoginWithoutPassword = async (req, res, next) => {
    
    let request = req.body;
    try {
        const loginWithoutPasswordRes = await commonServices.LoginWithoutPassword2(request);
        formatResponse(res,loginWithoutPasswordRes);
    } catch (error) {
       next(error);
    }
};

// exports.validateUserOtp = (req, res, next) => {
//     console.log("VALIDATE OTP");
//     console.log(req.body);
//     let request = req.body;
//     commonServices.validateOtpForLogin(request, function (validate_forgot_password_err, validate_forgot_password_response) {
//         if (validate_forgot_password_err) {
//             res.status(validate_forgot_password_err).json(validate_forgot_password_response);
//         } else {
//             console.log("OTP verified  successfully");
//             res.json(validate_forgot_password_response);
//         }
//     });
// };

exports.validateUserOtp = async (req, res, next) => {
    console.log("VALIDATE OTP");
    console.log(req.body);
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


// exports.resetOrCreatePassword = (req, res, next) => {
//     console.log("VALIDATE Forgot OTP and Password"); 
//     console.log(req.body);
//     let request = req.body;
//     commonServices.passwordCreateOrReset(request, function (validate_and_reset_password_err, validate_and_reset_password_response) {
//         if (validate_and_reset_password_err) {
//             res.status(validate_and_reset_password_err).json(validate_and_reset_password_response);
//         } else {
//             console.log("OTP verified and password updated successfully");
//             res.json(validate_and_reset_password_response);
//         }
//     });
// };

exports.resetOrCreatePassword = async (req, res, next) => {
    console.log("VALIDATE Forgot OTP and Password"); 
    console.log(req.body);
    let request = req.body;
    try{
        const passwordCreateOrResetRes = await commonServices.passwordCreateOrReset(request);
        console.log("passwordCreateOrResetRes - ",passwordCreateOrResetRes);
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

// exports.changePassword = (req, res, next) => {
//     console.log("Change Password"); 
//     console.log(req.body);
//     let request = req.body;
//     commonServices.updatePassword(request, function (updatePassword_err, updatePassword_response) {
//         if (updatePassword_err) {
//             res.status(updatePassword_err).json(updatePassword_response);
//         } else {
//             console.log("Password Changed!");
//             res.json(updatePassword_response);
//         }
//     });
// };

exports.changePassword = async (req, res, next) => {
    console.log("Change Password"); 
    console.log(req.body);
    let request = req.body;
    const updatePasswordRes = await commonServices.updatePassword(request);
    if (updatePasswordRes.statusCode && updatePasswordRes.statusCode !== 200) {
        formatResponse(res,updatePasswordRes.message,updatePasswordRes.statusCode);
     } else {
         formatResponse(res,updatePasswordRes);
     }
};


