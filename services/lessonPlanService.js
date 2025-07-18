const fs = require('fs')
const { OpenAI } = require('openai');
const PDFDocument = require('pdfkit');

const { } = require("../repository");

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
    const systemPrompt = `
    Create a lesson plan session-wise based on the following details:

    - Board: ${data.board}
    - Grade: ${data.grade}
    - Subject: ${data.subject}
    - Sub-Subject: ${data.subSubject}
    - Unit: ${data.unit}
    - Chapter: ${data.chapter}
    - Topics: ${data.topics.map(t => t.topic).join(', ')}
    - Session Type: ${data.sessionType}
    - Number of Sessions: ${data.noOfSession}
    - Duration per Session: ${data.duration} minutes

    Ensure the plan is structured and ready for teaching, adhering to the guidelines.
    `;

    // const systemPrompt = `
    // Create a detailed, session-wise lesson plan based on the following input data.
    // The response must be formatted in the exact structure shown below, ready for direct use in a document or PDF:

    // Board: ${data.board}
    // Grade: ${data.grade}
    // Subject: ${data.subject}
    // Sub-Subject: ${data.subSubject}
    // Unit: ${data.unit}
    // Chapter: ${data.chapter}
    // Topics: ${data.topics.map(t => t.topic).join(', ')}
    // Session Type: ${data.sessionType}
    // Number of Sessions: ${data.noOfSession}
    // Duration per Session: ${data.duration} minutes

    // Provide the lesson plan in a session-wise format with the following subheadings for each session:

    // Session [number]: [Topic or Title]

    // Objective

    // Materials Required

    // Teaching Process

    // Warm-up

    // Introduction

    // Guided Practice

    // Student Activity

    // Recap and Conclusion

    // Assessment

    // Homework

    // Include Final Notes at the end.
    // If topic names are missing or placeholders, assume a relevant Grade-${data.grade} topic appropriate for ${data.subject}, and proceed accordingly. Keep the language teacher-friendly and the format printable.
    // `;

    try {
        const completion = await openAiClient.chat.completions.create({
            model: "chatgpt-4o-latest",
            messages: [
                {
                    role: "user", content: systemPrompt
                }
            ]
        })

        console.log({ lessonPlannerUsage: completion?.usage ?? {} });

        let response = completion?.choices[0]?.message?.content ?? ""

        if (!!response) {
            // Generate PDF and get the file path
            // const pdfPath = createPdf(response);

            // Return both lesson plan content and PDF path
            return {
                lesson_plan: response,
                // pdf_path: pdfPath
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