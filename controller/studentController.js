const {studentServices} = require("../services");

exports.fetchIndividualDigiCard = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    studentServices.fetchIndividualDigiCard(request, function (individual_digicard_err, individual_digicard_response) {
        if (individual_digicard_err) {
            res.status(individual_digicard_err).json(individual_digicard_response);
        } else {
            console.log("DigiCard Fetched Successfully");
            res.json(individual_digicard_response);
        }
    });
};

exports.fetchAllStudents = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    studentServices.fetchAllStudents(request, function (fetch_all_digicard_err, fetch_all_digicard_response) {
        if (fetch_all_digicard_err) {
            res.status(fetch_all_digicard_err).json(fetch_all_digicard_response);
        } else {
            console.log("Fetch All DigiCards Successfull");
            res.json(fetch_all_digicard_response);
        }
    });
};

