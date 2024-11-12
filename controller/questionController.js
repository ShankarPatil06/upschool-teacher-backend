const {questionServices} = require("../services");

exports.fetchAvailableNumOfQuestions = (req, res, next) => {
    let request = req.body;
    questionServices.fetchAvailabeQuestions(request, function (addQuestion_err, addQuestion_response) {
        if (addQuestion_err) {
            res.status(addQuestion_err).json(addQuestion_response);
        } else {
            console.log("Question Added Successfully");
            res.json(addQuestion_response);
        }
    });
};

