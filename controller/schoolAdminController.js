const {schoolAdminServices} = require("../services");
const { formatResponse } = require("../helper/helper");

exports.createSchoolAdmin = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await schoolAdminServices.addSchoolAdmin(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

exports.updateSchoolAdmin = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await schoolAdminServices.editSchoolAdmin(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};


exports.toggleSchoolAdminStatus = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await schoolAdminServices.changeSchoolAdminStatus(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};