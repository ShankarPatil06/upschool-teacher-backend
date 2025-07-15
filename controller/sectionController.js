const { formatResponse } = require("../helper/helper");
const { sectionServices } = require("../services");

exports.updateActionAndRecommendations = async (req, res, next) => {
    try {
        let request = req.body;
        const update_section_res = await sectionServices.updateActionAndRecommendations(request);
        return formatResponse(res, update_section_res);
    } catch (error) {
        next(error);
    }
};

exports.addAcademicPlanToSections = async (req, res, next) => {
    try {
        let request = req.body;
        const update_section_res = await sectionServices.addAcademicPlanToSections(request);
        return formatResponse(res, update_section_res);
    } catch (error) {
        next(error);
    }
}

exports.addHolidays = async (req, res, next) => {
    try {
        let request = req.body;
        const update_section_res = await sectionServices.addHolidays(request);
        return formatResponse(res, update_section_res);
    } catch (error) {
        next(error);
    }
}

exports.addEvents = async (req, res, next) => {
    try {
        let request = req.body;
        const update_section_res = await sectionServices.addEvents(request);
        return formatResponse(res, update_section_res);
    } catch (error) {
        next(error);
    }
}

exports.getSectionByIds = async (req, res, next) => {
    try {
        let request = req.body;
        const update_section_res = await sectionServices.getSectionByIds(request);
        return formatResponse(res, update_section_res);
    } catch (error) {
        next(error);
    }
}

exports.getSectionById = async (req, res, next) => {
    try {
        let request = req.body;
        const update_section_res = await sectionServices.getSectionById(request);
        return formatResponse(res, update_section_res);
    } catch (error) {
        next(error);
    }
}

exports.addAdditionalSessions = async (req, res, next) => {
    try {
        let request = req.body;
        const update_section_res = await sectionServices.addAdditionalSessions(request);
        return formatResponse(res, update_section_res);
    } catch (error) {
        next(error);
    }
}

exports.saveTimetableConfiguration = (req, res, next) => {
    let request = req.body;
    sectionServices.saveTimetableConfiguration(request, function (err, response) {
        if (err) {
            res.status(err).json(response);
        } else {
            res.json(response);
        }
    });
};

