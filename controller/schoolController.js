const { formatResponse } = require("../helper/helper");
const {schoolServices} = require("../services");

exports.fetchSchoolDetails = async (req, res, next) => {
    console.log("Fetch fetchUnitsandChaptersBasedonSubjects");
    console.log(req.body);
    let request = req.body;
    try{
        const fetch_school_res = await schoolServices.fetchSchoolDetails(request);
        console.log("aaaaaa",fetch_school_res);
        formatResponse(res, fetch_school_res);
    }catch(error)
    {
        next(error);
    }
};