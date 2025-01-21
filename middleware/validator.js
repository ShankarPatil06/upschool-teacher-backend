const jwt = require('jsonwebtoken');
const constant = require('../constants/constant');
const userRepository = require("../repository/userRepository");
const scannerRepository = require("../repository/scannerRepository");
const helper = require('../helper/helper');

exports.validUser = (req, res, next) => {
    let token = req.header('Authorization');
    let request = req.body;
    console.log("Token : ", token);
    console.log("request : ", request);

    jwt.verify(token, process.env.SECRET_KEY, (err, data) => {
        if (err) {
            console.log(err);
            res.status(400).json(constant.messages.INVALID_TOKEN);
        } else {
            let decode_token = helper.decodeJwtToken(token);
            console.log("decode_token : ", decode_token);

            request["teacher_id"] = decode_token.teacher_id;

            userRepository.fetchUserDataByUserId(request, function (fetch_user_data_err, fetch_user_data_response) {
                if (fetch_user_data_err) {
                    console.log(fetch_user_data_err);
                    res.status(400).json(constant.messages.INVALID_TOKEN);
                } else {
                    if (fetch_user_data_response.Items.length > 0) {
                        if (fetch_user_data_response.Items[0].user_jwt === token) {
                            next();
                        } else {
                            res.status(400).json(constant.messages.INVALID_TOKEN);
                        }

                    } else {
                        res.status(400).json(constant.messages.INVALID_TOKEN);
                    }

                }
            })
        }
    })
};

exports.validScannerUser = (req, res, next) => {
    let token = req.header('Authorization');
    let request = req.body;
    console.log("Token : ", token);
    console.log("request : ", request);

    jwt.verify(token, process.env.SECRET_KEY, (err, data) => {
        if (err) {
            console.log(err);
            res.status(400).json(constant.messages.INVALID_TOKEN);
        } else {
            let decode_token = helper.decodeJwtToken(token);
            console.log("decode_token : ", decode_token);

            request.data["teacher_id"] = decode_token.teacher_id;
            request.data["test_id"] = decode_token.test_id;

            scannerRepository.fetchScannerSessionData(request, function (fetch_user_data_err, fetch_user_data_response) {
                if (fetch_user_data_err) {
                    console.log(fetch_user_data_err);
                    res.status(400).json(constant.messages.INVALID_TOKEN);
                } else {
                    if (fetch_user_data_response.Items.length > 0) {
                        if (fetch_user_data_response.Items[0].user_jwt === token) {

                            let currentTime = new Date(helper.getCurrentTimestamp());
                            let previousJWTTime = new Date(fetch_user_data_response.Items[0].jwt_ts);

                            let calculateTime = (currentTime - previousJWTTime) / (1000 * 60);

                            if (calculateTime <= 120) {
                                next();
                            } else {
                                res.status(400).json(constant.messages.SESSION_EXPIRED);
                            }

                        } else {
                            res.status(400).json(constant.messages.INVALID_TOKEN);
                        }

                    } else {
                        res.status(400).json(constant.messages.INVALID_TOKEN);
                    }

                }
            })
        }
    })
};