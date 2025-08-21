// const dummyData = {
//     terms: [
//         { id: 'term1', name: 'Term 1', endDate: '2025-09-30' },
//         { id: 'term2', name: 'Term 2', endDate: '2025-12-15' },
//         { id: 'term3', name: 'Term 3', endDate: '2026-03-31' }
//     ],
//     classes: [
//         { id: 'class8', name: 'Class 8' },
//         { id: 'class9', name: 'Class 9' },
//         { id: 'class10', name: 'Class 10' }
//     ],
//     sections: {
//         'class8': [
//             { id: 'section8A', name: 'Section 8A' },
//             { id: 'section8B', name: 'Section 8B' }
//         ],
//         'class9': [
//             { id: 'section9A', name: 'Section 9A' },
//             { id: 'section9B', name: 'Section 9B' }
//         ],
//         'class10': [
//             { id: 'section10A', name: 'Section 10A' },
//             { id: 'section10B', name: 'Section 10B' }
//         ]
//     },
//     subjects: {
//         'class8': [
//             { id: 'math8', name: 'Mathematics', totalSessions: 60 },
//             { id: 'science8', name: 'Science', totalSessions: 50 }
//         ],
//         'class9': [
//             { id: 'math9', name: 'Mathematics', totalSessions: 70 },
//             { id: 'science9', name: 'Science', totalSessions: 65 }
//         ],
//         'class10': [
//             { id: 'math10', name: 'Mathematics', totalSessions: 80 },
//             { id: 'science10', name: 'Science', totalSessions: 75 }
//         ]
//     },
//     chapters: {
//         'math8': [
//             { id: 'ch1_math8', name: 'Algebra Basics', duration: 200 },
//             { id: 'ch2_math8', name: 'Geometry Fundamentals', duration: 300 },
//             { id: 'ch3_math8', name: 'Statistics Introduction', duration: 300 }
//         ],
//         'science8': [
//             { id: 'ch1_sci8', name: 'Physics Intro', duration: 800 },
//             { id: 'ch2_sci8', name: 'Chemistry Basics', duration: 999 },
//             { id: 'ch3_sci8', name: 'Biology Overview', duration: 700 }
//         ],
//         'math9': [
//             { id: 'ch1_math9', name: 'Advanced Algebra', duration: 1500 },
//             { id: 'ch2_math9', name: 'Trigonometry', duration: 1300 },
//             { id: 'ch3_math9', name: 'Calculus Preview', duration: 1000 }
//         ],
//         'science9': [
//             { id: 'ch1_sci9', name: 'Mechanics', duration: 1000 },
//             { id: 'ch2_sci9', name: 'Organic Chemistry', duration: 1100 },
//             { id: 'ch3_sci9', name: 'Ecology', duration: 9 }
//         ],
//         'math10': [
//             { id: 'ch1_math10', name: 'Complex Numbers', duration: 1800 },
//             { id: 'ch2_math10', name: 'Vectors', duration: 1600 },
//             { id: 'ch3_math10', name: 'Probability', duration: 1200 }
//         ],
//         'science10': [
//             { id: 'ch1_sci10', name: 'Electromagnetism', duration: 1200 },
//             { id: 'ch2_sci10', name: 'Biotechnology', duration: 1300 },
//             { id: 'ch3_sci10', name: 'Thermodynamics', duration: 1000 }
//         ]
//     },
//     curriculumPlans: [] // To store saved plans
// };

// const getTerms = async () => {
//     return { status: 200, data: dummyData.terms };
// };

// const getClasses = async () => {
//     return { status: 200, data: dummyData.classes };
// };

// const getSectionsByClass = async (classId) => {
//     const sections = dummyData.sections[classId] || [];
//     return { status: 200, data: sections };
// };

// const getSubjectsByClass = async (classId) => {
//     const subjects = dummyData.subjects[classId] || [];
//     return { status: 200, data: subjects };
// };

// const getChaptersBySubject = async (subjectId) => {
//     const chapters = dummyData.chapters[subjectId] || [];
//     return { status: 200, data: chapters };
// };

// const saveCurriculumPlan = async (plan) => {
//     // In a real application, you would save this to a database
//     // For now, we'll just add it to our dummyData array
//     const newPlan = { id: `plan_${dummyData.curriculumPlans.length + 1}`, ...plan, savedAt: new Date() };
//     dummyData.curriculumPlans.push(newPlan);
//     return { status: 200, data: { message: 'Curriculum plan saved successfully', planId: newPlan.id } };
// };

// const getCurriculumPlan = async (planId) => {
//     const plan = dummyData.curriculumPlans.find(p => p.id === planId);
//     if (plan) {
//         return { status: 200, data: plan };
//     } else {
//         return { status: 404, data: { message: 'Curriculum plan not found' } };
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