const http = require("http");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const fileUpload = require("express-fileupload");
dotenv.config();
const cors = require('cors');

const { commonController, digicardController, studentController, topicController, chapterController, blueprintController, conceptController, subjectController, teacherController, questionController, testQuestionPaperController, classTestController, scannerController, quizController, schoolAdminController, reportController, schoolController, sectionController,  } = require('./controller')

const validator = require('./middleware/validator');
const { ERROR } = require("./helper/helper");

app.use(express.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 100000,
}));

app.use(express.json({
    type: "application/json",
    limit: '50mb'
}));

app.use(haltOnTimedout);

app.use(fileUpload());

app.use(cors());

/** Login **/
app.post("/v1/login", commonController.userLogin); //n
app.post("/v1/loginWithOTP", commonController.userLoginWithoutPassword); //n
app.post("/v1/validateOTP", commonController.validateUserOtp); //n
app.post("/v1/logout", validator.validUser, commonController.userLogout);
app.post("/v1/resetOrCreatePassword", validator.validUser, commonController.resetOrCreatePassword); //n
app.post("/v1/changePassword", validator.validUser, commonController.changePassword);//n

/** SYLLABUS (SUBJECT) **/
app.post("/v1/fetchUnitsandChaptersBasedonSubjects", validator.validUser, subjectController.fetchUnitsandChaptersBasedonSubjects);//ch
app.post("/v1/fetchTopicsBasedonChapter", validator.validUser, chapterController.fetchTopicsBasedonChapter); //ch
app.post("/v1/fetchDigicardsBasedonTopic", validator.validUser, topicController.fetchDigicardsBasedonTopic); //n
app.post("/v1/fetchIndividualDigiCard", validator.validUser, digicardController.fetchIndividualDigiCard); //n
app.post("/v1/fetchRelatedDigiCards", validator.validUser, digicardController.fetchRelatedDigiCards); //n
// app.post("/v1/fetchTopicAndNoOfQuestions", validator.validUser, subjectController.fetchTopicAndNoOfQuestions); //ch   //not used
app.post("/v1/fetchAllStudents", studentController.fetchAllStudents); //n
app.post("/v1/fetchAllQuizDetails", quizController.fetchAllQuizDetails); //n

app.post("/v1/fetchAllChaptersBySubjectId", subjectController.fetchAllChaptersBySubjectId); 



// app.post("/v1/unlockChapterPreLearning", validator.validUser, chapterController.unlockChapterPreLearning); 
// app.post("/v1/chapterUnlock", validator.validUser, chapterController.chapterUnlock); // removed beacuse of not used
app.post("/v1/topicUnlock", validator.validUser, topicController.topicUnlock); //n
app.post("/v1/digicardUnlock", validator.validUser, digicardController.digicardUnlock); //n
app.post("/v1/fetchAvailableNumOfQuestions", validator.validUser, questionController.fetchAvailableNumOfQuestions); //ch

app.post("/v1/fetchTeacherClasses", validator.validUser, teacherController.fetchTeacherClasses); //n
app.post("/v1/fetchTeacherSectionsBasedonClass", validator.validUser, teacherController.fetchTeacherSectionsBasedonClass); //n
app.post("/v1/fetchTeacherSubjectsBasedonSection", validator.validUser, teacherController.fetchTeacherSubjectsBasedonSection); //n

app.post("/v1/fetchTopicsBasedonChapters", validator.validUser, topicController.fetchTopicsBasedonChapters);
app.post("/v1/fetchConceptsBasedonTopics", validator.validUser, conceptController.fetchConceptsBasedonTopics);
app.post("/v1/fetchPostLearningTopics", validator.validUser, topicController.fetchPostLearningTopicsBasedonChapters);

/** TEACHER ACTIVITY **/
app.post("/v1/archivedActiveTopicsInChapter", validator.validUser, teacherController.archivedActiveTopicsInChapter); //n
app.post("/v1/getPreGrantedTeacherPermissions", validator.validUser, teacherController.getPreGrantedTeacherPermissions); //n
app.post("/v1/getPostGrantedTeacherPermissions", validator.validUser, teacherController.getPostGrantedTeacherPermissions); //n
app.post("/v1/generatePrePostQuiz", teacherController.generatePrePostQuiz); // validator.validUser, //n
app.post("/v1/reArrangeDigiCardOrder", validator.validUser, teacherController.reArrangeDigiCardOrder); //n
app.post("/v1/toggleDigicardsInTopic", validator.validUser, teacherController.toggleDigicardsInTopic); //n
app.post("/v1/fetchDigiCardstoReorder", validator.validUser, teacherController.fetchDigiCardstoReorder); //n
app.post("/v1/fetchDigiCardstoReorder", validator.validUser, teacherController.fetchDigiCardstoReorder); //n
app.post("/v1/fetchTodayAttendanceByUserId", validator.validUser, teacherController.getTodayAttendance); //n
app.post("/v1/insertClockInRecord", validator.validUser, teacherController.clockIn);
app.post("/v1/updateClockOutTime", validator.validUser, teacherController.clockOut);

/** DIGICARD EXTENSION **/
app.post("/v1/fetchAllPreTopicDigicards", validator.validUser, digicardController.fetchAllPreTopicDigicards); //ch
app.post("/v1/fetchAllPostTopicDigicards", validator.validUser, digicardController.fetchAllPostTopicDigicards);  //ch 
app.post("/v1/addDigicardExtension", validator.validUser, teacherController.addDigicardExtension); //n
app.post("/v1/fetchDigicardExtension", validator.validUser, digicardController.fetchDigicardExtension); //n
app.post("/v1/fetchQuestionSourceandChapters", validator.validUser, teacherController.fetchQuestionSourceandChapters); //n

// TEST QUESTION PAPER : 
app.post("/v1/fetchTestQuestionPapersBasedonStatus", validator.validUser, testQuestionPaperController.fetchTestQuestionPapersBasedonStatus);  //ch
app.post("/v1/addTestQuestionPaper", validator.validUser, testQuestionPaperController.addTestQuestionPaper); //n
app.post("/v1/validateQuestionPaperName", validator.validUser, testQuestionPaperController.validateQuestionPaperName); //n
app.post("/v1/viewTestQuestionPaper", validator.validUser, testQuestionPaperController.viewTestQuestionPaper); //ch a
app.post("/v1/toggleQuestionPaper", validator.validUser, testQuestionPaperController.toggleQuestionPaper); //n

/** BLUE PRINT **/
app.post("/v1/fetchBlueprintById", validator.validUser, blueprintController.fetchBlueprintById);  //cha
app.post("/v1/fetchBlueprintDetailsBasedonId", blueprintController.fetchBlueprintDetailsBasedonId); //ch
app.post("/v1/fetchQuestionBasedOnBlueprint", blueprintController.fetchQuestionBasedOnBlueprint); // validator.validUser,  //ch a
app.post("/v1/fetchAllBluePrints", validator.validUser, blueprintController.fetchAllBluePrints); // n

// CLASS TEST : 
app.post("/v1/addClassTest", validator.validUser, classTestController.addClassTest); //n
app.post("/v1/fetchClassTestsBasedonStatus", validator.validUser, classTestController.fetchClassTestsBasedonStatus); //n
app.post("/v1/fetchClassTestById", classTestController.fetchClassTestById); //n
app.post("/v1/fetchQuestionsBasedonQuestionPaper", validator.validUser, classTestController.fetchQuestionsBasedonQuestionPaper); //ch
app.post("/v1/startEvaluation", validator.validUser, classTestController.startEvaluation); //ch
app.post("/v1/getStudentsBasedOnSection", validator.validUser, classTestController.getStudentsBasedOnSection); //n
app.post("/v1/getStudentResultData", validator.validUser, classTestController.getStudentResultData); //n
app.post("/v1/updateStudentMarks", validator.validUser, classTestController.updateStudentMarks); //n
app.post("/v1/resetEvaluationStatus", validator.validUser, classTestController.resetEvaluationStatus); //n
app.post("/v1/toggleClassTestStatus", validator.validUser, classTestController.toggleClassTestStatus); //n

// Scanner
app.post("/v1/sendScannerLink", validator.validUser, scannerController.sendScannerLink); // Test & Quiz   //n
app.post("/v1/sendOTPForScanning", scannerController.sendOTPForScanning);  // Test & Quiz  //n
app.post("/v1/validateOTPForScanning", scannerController.validateOTPForScanning); // Test & Quiz //n
app.post("/v1/fetchSignedURLForAnswers", validator.validScannerUser, scannerController.fetchSignedURLForAnswers); //n
app.post("/v1/uploadAnswerSheets", validator.validScannerUser, scannerController.uploadAnswerSheets2); //n
app.post("/v1/fetchSignedURLForQuizAnswers", validator.validScannerUser, scannerController.fetchSignedURLForQuizAnswers) //Quiz //n
app.post("/v1/uploadQuizAnswerSheets", scannerController.uploadQuizAnswerSheets2); // Quiz  validator.validScannerUser, //n
app.post("/v1/removeUploadedAnswerData", scannerController.removeUploadedAnswerData); // Quiz  validator.validScannerUser, //n

// Quiz
app.post("/v1/checkDuplicateQuizName", validator.validUser, quizController.checkDuplicateQuizName); //n
app.post("/v1/toggleQuizStatus", validator.validUser, quizController.toggleQuizStatus); //n
app.post("/v1/fetchQuizBasedonStatus", validator.validUser, quizController.fetchQuizBasedonStatus); //n
app.post("/v1/viewQuizQuestionPaper", validator.validUser, quizController.viewQuizQuestionPaper);  //ch a
app.post("/v1/getStudentQuizResultData", validator.validUser, quizController.getStudentQuizResultData);  //n
app.post("/v1/updateStudentQuizMarks", quizController.updateStudentQuizMarks); // validator.validUser,  //ch fet
app.post("/v1/fetchQuizTemplates", validator.validUser, quizController.fetchQuizTemplates);
app.post("/v1/resetQuizEvaluationStatus", validator.validUser, quizController.resetQuizEvaluationStatus);
app.post("/v1/startQuizEvaluation", quizController.startQuizEvaluation); // validator.validUser,

app.post("/v1/getIndividualQuizReport", reportController.getIndividualQuizReport) //ch

// School admin
app.post("/v1/createSchoolAdmin", validator.validUser, schoolAdminController.createSchoolAdmin); //n
app.post("/v1/updateSchoolAdmin", validator.validUser, schoolAdminController.updateSchoolAdmin); //n
app.post("/v1/toggleSchoolAdminStatus", validator.validUser, schoolAdminController.toggleSchoolAdminStatus); //n

// Dashboard Reports
app.post("/v1/fetchAssessmentSummary", reportController.fetchAssessmentSummary); //ch
app.post("/v1/getTargetedLearningExpectation", reportController.getTargetedLearningExpectation); //ch
app.post("/v1/getTargetedLearningExpectationDetails", reportController.getTargetedLearningExpectationDetails); //ch
app.post("/v1/preLearningSummaryDetails", reportController.preLearningSummaryDetails); //ch
app.post("/v1/postLearningSummaryDetails", reportController.postLearningSummaryDetails); //ch
app.post("/v1/preLearningBlueprintDetails", reportController.preLearningBlueprintDetails); //ch
app.post("/v1/viewAnalysisIndividualReport", reportController.viewAnalysisIndividualReport); //ch
app.post("/v1/comprehensivePerformanceChapterWise", reportController.comprehensivePerformanceChapterWise); //ch
app.post("/v1/comprehensivePerformanceChapterWiseForTest", reportController.comprehensivePerformanceChapterWiseForTest); //ch
app.post("/v1/comprehensivePerformanceTopicWise", reportController.comprehensivePerformanceTopicWise); //ch
app.post("/v1/comprehensivePerformanceTopicWiseForTest", reportController.comprehensivePerformanceTopicWiseForTest); //ch
app.post("/v1/comprehensivePerformanceConceptWise", reportController.comprehensivePerformanceConceptWise); //ch
app.post("/v1/comprehensivePerformanceConceptWiseForTest", reportController.comprehensivePerformanceConceptWiseForTest);
app.post("/v1/viewClassReportQuestions", reportController.viewClassReportQuestions); //ch 
app.post("/v1/viewClassReportFocusArea", reportController.viewClassReportFocusArea); //nud
app.post("/v1/viewChapterwisePerformanceTracking", reportController.viewChapterwisePerformanceTracking); //ch fet
app.post("/v1/getActionsAndRecommendations", reportController.getActionsAndRecommendations); //ch
app.post("/v1/getActionsAndRecommendationDetail", reportController.getActionsAndRecommendationDetail);//ch fet
app.post("/v1/fetchSchoolDetails", schoolController.fetchSchoolDetails); //nnd

// Student Dashboard
app.post("/v1/topAndBottomPerformers", studentController.topAndBottomPerformers); //ch
app.post("/v1/needAttention", studentController.needAttention);//ch
app.post("/v1/studentChaptersPerformance", studentController.studentChaptersPerformance);  //ch
app.post("/v1/customWorksheetGenerated", studentController.customWorksheetGenerated); //ch
app.post("/v1/fetchCustomWorksheet", studentController.fetchCustomWorksheet); // n
app.post("/v1/sendEmailToParent", studentController.sendEmailToParent); //n
app.post("/v1/studentAvgVsClassAvg", studentController.studentAvgVsClassAvg);  //ch
app.post("/v1/studentAvgVsClassAvgChapterWise", studentController.studentAvgVsClassAvgChapterWise); //ch op

app.post("/v1/updateActionAndRecommendations", sectionController.updateActionAndRecommendations); //n

// academic planner and time table planner

app.post("/v1/addAcademicPlanToSections", sectionController.addAcademicPlanToSections)
app.post("/v1/getSectionById", sectionController.getSectionById)
app.post('/v1/addCurriculumPlanToSection', sectionController.addCurriculumPlanToSection);
//Section
app.post("/v1/saveTimetableConfiguration", validator.validUser, sectionController.saveTimetableConfiguration);

// update attendence
app.post("/v1/upsertTeacherAttendance", teacherController.upsertTeacherAttendance);
app.post("/v1/fetchTeacherAttendance", teacherController.fetchTeacherAttendance);
// app.post("/v1/sendWhatsAppToParent", studentController.sendWhatsAppToParent);



function haltOnTimedout(req, res, next) {
    if (!req.timedout) next()
}

app.use((err, req, res, next) => {
    console.log(`Path: ${req.path} -> Status Code: ${err.status || ERROR.INTERNAL_SERVER_ERROR} -> Stack: ${err.stack}`)
    res.status(err.status || ERROR.INTERNAL_SERVER_ERROR).send(err.message);
});

const NODE_ENV = process.env.NODE_ENV || 'development';

// if (NODE_ENV === 'development' || NODE_ENV === Environment.Testing) {
//     const swaggerOptions = {
//         explorer: true, // Enable Swagger UI explorer in development and testing environments
//     };
//     app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerJSDocs, swaggerOptions));
// }

if (NODE_ENV === 'development') {

    app.set("port", process.env.PORT || 3002);
    let server = http.createServer(app);

    server.listen(app.get("port"), "0.0.0.0", () => {
        console.log(`Express server listening on http://localhost:${app.get("port")}`);
    });
}
else {
    const serverless = require("serverless-http");
    module.exports.upschoolTeacherServer = serverless(app);
}
