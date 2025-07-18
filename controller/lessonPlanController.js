const { formatResponse } = require("../helper/helper");
const { sectionServices, lessonPlannerService } = require("../services");


exports.getLessonPlan = async (req, res, next) => {
    try {
        let request = req.body;
        const update_section_res = await lessonPlannerService.generateLessonPlan(request);
        return formatResponse(res, update_section_res);
        // return res
    } catch (error) {
        next(error);
    }
}