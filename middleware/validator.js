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

    jwt.verify(token, process.env.SECRET_KEY, async (err, data) => {
        if (err) {
            console.log(err);
            res.status(400).json(constant.messages.INVALID_TOKEN);
        } else {
            let decode_token = helper.decodeJwtToken(token);
            console.log("decode_token : ", decode_token);

            request["teacher_id"] = decode_token.teacher_id;
            try {
                const fetchUserDataResponse = await userRepository.fetchUserDataByUserId2(request);

                if (!fetchUserDataResponse?.Items?.length) {
                    return res.status(400).json(constant.messages.INVALID_TOKEN);
                }

                if (fetchUserDataResponse.Items[0].user_jwt === token) {
                    return next();
                }

                return res.status(400).json(constant.messages.INVALID_TOKEN);
            } catch (error) {
                console.error("Error verifying user token:", error);
                return res.status(500).json(constant.messages.SERVER_ERROR);
            }
        }
    })
};

exports.validScannerUser = (req, res, next) => {
    let token = req.header('Authorization');
    let request = req.body;
    console.log("Token : ", token);
    console.log("request : ", request);

    jwt.verify(token, process.env.SECRET_KEY, async (err, data) => {
        if (err) {
            console.log(err);
            res.status(400).json(constant.messages.INVALID_TOKEN);
        } else {
            let decode_token = helper.decodeJwtToken(token);
            console.log("decode_token : ", decode_token);

            request.data = request.data || {};
            request.data["teacher_id"] = decode_token.teacher_id;
            request.data["test_id"] = decode_token.test_id;

            try {
                const fetchUserDataResponse = await scannerRepository.fetchScannerSessionData2(request);

                if (!fetchUserDataResponse || !fetchUserDataResponse.Items || fetchUserDataResponse.Items.length === 0) {
                    return res.status(400).json(constant.messages.INVALID_TOKEN);
                }

                const userSession = fetchUserDataResponse.Items[0];
                if (userSession.user_jwt !== token) {
                    return res.status(400).json(constant.messages.INVALID_TOKEN);
                }
                const currentTime = new Date(helper.getCurrentTimestamp());
                const previousJWTTime = new Date(userSession.jwt_ts);
                const calculateTime = (currentTime - previousJWTTime) / (1000 * 60);

                if (calculateTime > 120) {
                    return res.status(400).json(constant.messages.SESSION_EXPIRED);
                }

                next();
            } catch (error) {
                res.status(500).json(constant.messages.DATABASE_ERROR);
            }
        }
    })
};