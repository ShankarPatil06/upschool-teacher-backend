const { formatResponse2 } = require("../helper/helper");
const { sectionRepository } = require("../repository")

exports.updateActionAndRecommendations = async (request) => {
    return await sectionRepository.updateActionAndRecommendations(request);
}

exports.addAcademicPlanToSections = async (request) => {

    const sections = request?.academic_plan?.selected_for?.map(section => {
        let planDate = request.academic_plan
        delete planDate?.selected_for ?? true
        return {
            section_id: section?.value,
            academic_plan: planDate
        }
    })

    await sections.forEach(async (section) => {
        await sectionRepository.addAcademicPlanToSections(section)
    })

    return formatResponse2({ message: "academic plan saved" })
}

exports.getSectionById = async (request) => await sectionRepository.getSectionById(request);
