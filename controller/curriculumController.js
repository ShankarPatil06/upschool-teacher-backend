// const curriculumServices = require('../services/curriculumServices');
// const { SUCCESS, ERROR } = require("../helper/helper");

// const getTerms = async (req, res) => {
//     try {
//         const result = await curriculumServices.getTerms();
//         return res.status(result.status).send(result.data);
//     } catch (error) {
//         console.error("Error fetching terms:", error);
//         return res.status(ERROR.INTERNAL_SERVER_ERROR).send({ message: error.message });
//     }
// };

// const getClasses = async (req, res) => {
//     try {
//         const result = await curriculumServices.getClasses();
//         return res.status(result.status).send(result.data);
//     } catch (error) {
//         console.error("Error fetching classes:", error);
//         return res.status(ERROR.INTERNAL_SERVER_ERROR).send({ message: error.message });
//     }
// };

// const getSectionsByClass = async (req, res) => {
//     try {
//         const { classId } = req.params; // Assuming classId comes from URL params
//         const result = await curriculumServices.getSectionsByClass(classId);
//         return res.status(result.status).send(result.data);
//     } catch (error) {
//         console.error("Error fetching sections by class:", error);
//         return res.status(ERROR.INTERNAL_SERVER_ERROR).send({ message: error.message });
//     }
// };

// const getSubjectsByClass = async (req, res) => {
//     try {
//         const { classId } = req.params; // Assuming classId comes from URL params
//         const result = await curriculumServices.getSubjectsByClass(classId);
//         return res.status(result.status).send(result.data);
//     } catch (error) {
//         console.error("Error fetching subjects by class:", error);
//         return res.status(ERROR.INTERNAL_SERVER_ERROR).send({ message: error.message });
//     }
// };

// const getChaptersBySubject = async (req, res) => {
//     try {
//         const { subjectId } = req.params; // Assuming subjectId comes from URL params
//         const result = await curriculumServices.getChaptersBySubject(subjectId);
//         return res.status(result.status).send(result.data);
//     } catch (error) {
//         console.error("Error fetching chapters by subject:", error);
//         return res.status(ERROR.INTERNAL_SERVER_ERROR).send({ message: error.message });
//     }
// };

// const saveCurriculumPlan = async (req, res) => {
//     try {
//         const plan = req.body; // Assuming the entire plan is sent in the request body
//         const result = await curriculumServices.saveCurriculumPlan(plan);
//         return res.status(result.status).send(result.data);
//     } catch (error) {
//         console.error("Error saving curriculum plan:", error);
//         return res.status(ERROR.INTERNAL_SERVER_ERROR).send({ message: error.message });
//     }
// };

// const getCurriculumPlan = async (req, res) => {
//     try {
//         const { planId } = req.params; // Assuming planId comes from URL params
//         const result = await curriculumServices.getCurriculumPlan(planId);
//         return res.status(result.status).send(result.data);
//     } catch (error) {
//         console.error("Error fetching curriculum plan:", error);
//         return res.status(ERROR.INTERNAL_SERVER_ERROR).send({ message: error.message });
//     }
// };

// module.exports = {
//     getTerms,
//     getClasses,
//     getSectionsByClass,
//     getSubjectsByClass,
//     getChaptersBySubject,
//     saveCurriculumPlan,
//     getCurriculumPlan
// };