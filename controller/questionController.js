const {questionServices} = require("../services");
exports.fetchAvailableNumOfQuestions = async (req, res, next) => {
    try {
        let request = req.body;
        const availableQuestionResponse = await questionServices.fetchAvailableQuestions(request);

        res.json(availableQuestionResponse);
    } catch (error) {
        res.status(error.status || 500).json(error.response || { message: "Internal Server Error" });
    }
};
