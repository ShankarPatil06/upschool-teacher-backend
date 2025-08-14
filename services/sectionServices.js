const { formatResponse2 } = require("../helper/helper");
const { sectionRepository } = require("../repository")

exports.updateActionAndRecommendations = async (request) => {
    return await sectionRepository.updateActionAndRecommendations(request);
}

exports.addAcademicPlanToSections = async (request) => {
const sections = request?.selected_for?.map(section => {
    // const sections = request?.sections?.map(section => {
        return {
            section_id: section?.value,
            academic_plan: request.academic_plan
        }
    })
    await sections.forEach(async (section) => {
        await sectionRepository.addAcademicPlanToSections(section)
    })
    return formatResponse2({ message: "academic plan saved" })
}

exports.getSectionById = async (request) => await sectionRepository.getSectionById(request);

 exports.addCurriculumPlanToSection = async (request) => {
         const termTitle = request.term.label;
    
         const curriculumPlanData = {
         availableSessions: request.availableSessions,
            chapters: request.chapters,
           class: request.class,
            plannedEndDate: request.plannedEndDate,
            remedialSessions: request.remedialSessions,
            subject: request.subject,
            term: request.term,
            totalMinSessionsRequired: request.totalMinSessionsRequired
        };
   
        const sectionId = request.sections[0].value;
   
        const payload = {
            section_id: sectionId,
            term_title: termTitle,
            curriculum_plan_data: curriculumPlanData
        };
   
        await sectionRepository.addCurriculumPlanToSection(payload);
   
        return formatResponse2({ message: "Curriculum plan saved successfully" });
    };

exports.saveTimetableConfiguration = function (request, callback) {
    const section_ids = request.data.section_ids;
    const timetable_config = request.data.timetable_config;

    if (!Array.isArray(section_ids) || section_ids.length === 0) {
        return callback(400, { message: "section_ids must be a non-empty array" });
    }

    let results = [];
    let completed = 0;

    section_ids.forEach(section_id => {
        const reqCopy = JSON.parse(JSON.stringify(request));
        reqCopy.data.section_id = section_id;
        reqCopy.data.timetable_config = timetable_config;

        require("../repository/sectionRepository").saveTimetableConfiguration(reqCopy, function (err, response) {
            results.push({
                section_id,
                success: !err,
                error: err ? response : null
            });
            completed++;
            if (completed === section_ids.length) {
                callback(null, { results });
            }
        });
    });
};
