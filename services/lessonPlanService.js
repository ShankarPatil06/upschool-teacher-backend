const fs = require('fs')
const { OpenAI } = require('openai');
const PDFDocument = require('pdfkit');

const { chapterRepository, classRepository, sectionRepository, topicRepository, schoolAdminRepository, conceptRepository, unitRepository, subjectRepository, groupRepository, schoolRepository, teachingActivityRepository, focusConceptsRepository } = require("../repository");
const { TABLE_NAMES } = require('../constants/tables');
const { isEmptyObject, formatErrorResponse } = require('../helper/helper');

const openAiClient = new OpenAI({
    apiKey: process.env.OPEN_AI_LESSON_PLANNER_KEY
})

const createPdf = (lessonData, outputPath = "lesson_plan.pdf") => {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(outputPath));

    doc.fontSize(16).text("Lesson plan", { align: "center" });
    doc.moveDown();

    doc.fontSize(10).text(lessonData, {
        align: 'left',
        lineGap: 4
    })

    doc.end();

    return outputPath
    // return doc
}

exports.generateLessonPlan = async (data) => {

    const chapterIds = [
        "89d03a7b-fa31-5fef-a81d-fc9ca017c131",
        "88f9fa55-7ec8-5ee7-906d-8669f6562900",
        "6308f5f6-caa3-5e23-9b5e-7f0a0077211e",
        "6001ea53-6c33-5224-ab0a-331d761886f5",
        "1d7c7c8d-47d6-5404-9e49-8b7eb14471ff",

        "c87c1b35-ffda-5d95-8339-ee33c3a4c244"
    ];

    const school_id = data?.school_id;

    const schoolDetails = await schoolRepository.getSchoolById(school_id);
    const school_board = schoolDetails?.school_board[0] ?? '';
    const schoolPrompt = schoolDetails?.schoolPrompt ?? "";

    // data need to be collected from principle nad chapterIds

    const subject = "maths";
    const forClass = "10";
    const numberOfSessions = 30;
    const timePerSession = "45 minutes";

    const chapterDetails = await chapterRepository.getChapterDetailsByIds(chapterIds);
    // const topicIds = (chapterDetails?.map(e => ([...(e?.postlearning_topic_id ?? []), ...(e?.prelearning_topic_id ?? [])])))?.flat();
    const topicIds = (chapterDetails?.map(e => ([...(e?.postlearning_topic_id ?? [])])))?.flat();
    const nonDuplicateTopicIds = [...(new Set(topicIds ?? []))]

    const topicDetails = await topicRepository.getTopicDetailsByIds(nonDuplicateTopicIds);
    const topicDetailsMap = new Map(topicDetails?.map(e => [e?.topic_id, e]))
    const conceptIds = (topicDetails?.map(topic => ([...(topic?.topic_concept_id ?? [])])))?.flat();
    const nonDuplicateConceptIds = [...new Set(conceptIds ?? [])]

    const conceptDetails = await conceptRepository.getConceptsByIds(nonDuplicateConceptIds);
    const conceptsDetailsMap = new Map(conceptDetails?.map(e => [e?.concept_id, e]))
    // const groupIds = (conceptDetails?.map(e => [...(e?.concept_group_id?.basic ?? []), ...(e?.concept_group_id?.intermediate ?? []), ...(e?.concept_group_id?.advanced ?? [])]))?.flat();
    // const nonDuplicateGroupIds = [...new Set(groupIds ?? [])]

    // const groupDetails = await groupRepository.getGroupByIds(nonDuplicateGroupIds);


    const prompts = await teachingActivityRepository.getAdminPrompt();
    const upperPrompt = prompts?.prompts ?? "Create a lesson plan session-wise based on the following details: ";
    const bottomPrompt = prompts?.bottomPrompt ?? "Ensure the plan is structured and ready for teaching, adhering to the guidelines.";

    const stringFormat = chapterDetails?.map((chap, chapterIndex) => {
        let chapterTitle = chap?.chapter_title;
        let topicIds = chap?.postlearning_topic_id;
        let topicDetails = topicIds?.map((topic, topicIndex) => {
            const topicDetail = topicDetailsMap.get(topic)
            const topicTitle = topicDetail?.topic_title;

            const conceptIds = topicDetail?.topic_concept_id;

            const conceptDetails = conceptIds?.map((e, conceptIndex) => {
                let concept = conceptsDetailsMap?.get(e);
                let conceptDetail = concept?.concept_details ?? "concept description";
                let conceptTitle = concept?.concept_title
                return `
                    concept ${conceptIndex + 1} :  ${conceptTitle}
                    description : ${conceptDetail}
                `
            })

            return `
                topic ${topicIndex + 1} : ${topicTitle}
                concepts : ${conceptDetails}
            `
        })

        return `
            chapter ${chapterIndex + 1} : ${chapterTitle}
            topics : ${topicDetails}
        `
    });

    const otherDetails = `
        board : ${school_board}
        subject : ${subject}
        class : ${forClass}
        number of session : ${numberOfSessions}
        time per session : ${timePerSession}
    `;

    const finalPrompt = `
        ${upperPrompt}

        ${schoolPrompt}

        ${otherDetails}

        ${stringFormat?.join(", ")}

        ${bottomPrompt}
    `;

    try {
        const completion = await openAiClient.chat.completions.create({
            model: "chatgpt-4o-latest",
            messages: [{ role: "user", content: finalPrompt }]
        })

        console.log({ lessonPlannerUsage: completion?.usage ?? {} });

        let response = completion?.choices[0]?.message?.content ?? ""

        if (!!response) {
            return {
                lesson_plan: response,
                pdf_path: null
            }
        } else {
            return ({
                lesson_plan: "",
                pdf_path: null
            });
        }

    } catch (error) {
        console.error('OpenAI API error:', error.message);
        return {
            lesson_plan: '',
            pdf_path: null
        };
    }
}

exports.getLessonPlanForFocusedConcepts = async (request) => {
    const quiz_id = request?.quiz_id;

    const focusConcepts = await focusConceptsRepository.getFocusedConceptsByQuizId(quiz_id);
    if (isEmptyObject(focusConcepts)) {
        throw formatErrorResponse({ message: "results are not generated for the quiz" })
    }
    const chapter_id = focusConcepts?.chapter_id;
    const subject_id = focusConcepts?.subject_id;
    const conceptsDetails = focusConcepts?.concepts_to_focus;

    const timePerSession = '40 minutes';
    const numberOfSessions = 4;

    const subjectDetails = (await subjectRepository.getSubjetById2({ data: { subject_id } }))?.Items[0];
    const subjectName = subjectDetails?.subject_title;

    const prompts = await teachingActivityRepository.getAdminPrompt();
    const upperPrompt = prompts?.prompts ?? "Create a lesson plan session-wise based on the following details: ";
    const bottomPrompt = prompts?.bottomPrompt ?? "Ensure the plan is structured and ready for teaching, adhering to the guidelines.";
    const remedialPrompt = prompts?.remedialPrompt ?? "Create a lesson plan session-wise based on the following details: ";


    const dataFormat = conceptsDetails?.map((concept, index) => {
        return `
        concept ${index + 1} : ${concept?.concept_title}
        concept details : ${concept?.concept_details}
        `;
    })

    const otherData = `
        subject : ${subjectName}
        number of session : ${numberOfSessions}
        time per session : ${timePerSession}
    `;

    const finalPrompt = `
        ${remedialPrompt}

        ${otherData}

        concepts  : ${dataFormat?.join(", ")}

        ${bottomPrompt}
    `;

    try {
        const completion = await openAiClient.chat.completions.create({
            model: "chatgpt-4o-latest",
            messages: [{ role: "user", content: finalPrompt }]
        })

        console.log({ lessonPlannerUsage: completion?.usage ?? {} });

        let response = completion?.choices[0]?.message?.content ?? ""

        if (!!response) {
            return {
                lesson_plan: response,
                pdf_path: null
            }
        } else {
            return ({
                lesson_plan: "",
                pdf_path: null
            });
        }

    } catch (error) {
        console.error('OpenAI API error:', error.message);
        return {
            lesson_plan: '',
            pdf_path: null
        };
    }
}