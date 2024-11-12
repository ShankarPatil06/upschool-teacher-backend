const {answerServices} = require("../services");

exports.fetchBlueprintById = (req, res, next) => {
    let request = req.body;    
    answerServices.getBlueprintByItsId(request, function (fetch_blueprint_err, fetch_blueprint_response) {
        if (fetch_blueprint_err) {
            res.status(fetch_blueprint_err).json(fetch_blueprint_response);
        } else {
            console.log("Got Blueprint!");
            res.json(fetch_blueprint_response);
        }
    });
};