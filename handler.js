const http = require("http");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const fileUpload = require("express-fileupload");
dotenv.config();
const cors = require('cors');

const { commonController, digicardController, studentController,topicController,chapterController,blueprintController,conceptController,subjectController,teacherController,questionController,testQuestionPaperController,classTestController,scannerController,quizController,schoolAdminController,reportController, schoolController, sectionController } = require('./controller')

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
app.post("/v1/login", commonController.userLogin);
app.post("/v1/loginWithOTP", commonController.userLoginWithoutPassword);
app.post("/v1/validateOTP", commonController.validateUserOtp);
app.post("/v1/logout", validator.validUser, commonController.userLogout);
app.post("/v1/resetOrCreatePassword", validator.validUser, commonController.resetOrCreatePassword);
app.post("/v1/changePassword", validator.validUser, commonController.changePassword);

/** SYLLABUS (SUBJECT) **/
app.post("/v1/fetchUnitsandChaptersBasedonSubjects", validator.validUser, subjectController.fetchUnitsandChaptersBasedonSubjects);
app.post("/v1/fetchTopicsBasedonChapter", validator.validUser, chapterController.fetchTopicsBasedonChapter);
app.post("/v1/fetchDigicardsBasedonTopic", validator.validUser, topicController.fetchDigicardsBasedonTopic);
app.post("/v1/fetchIndividualDigiCard", validator.validUser, digicardController.fetchIndividualDigiCard);
app.post("/v1/fetchRelatedDigiCards", validator.validUser, digicardController.fetchRelatedDigiCards);
app.post("/v1/fetchTopicAndNoOfQuestions", validator.validUser, subjectController.fetchTopicAndNoOfQuestions);
app.post("/v1/fetchAllStudents",  studentController.fetchAllStudents);
app.post("/v1/fetchAllQuizDetails", quizController.fetchAllQuizDetails);


// app.post("/v1/unlockChapterPreLearning", validator.validUser, chapterController.unlockChapterPreLearning); 
// app.post("/v1/chapterUnlock", validator.validUser, chapterController.chapterUnlock); // removed beacuse of not used
app.post("/v1/topicUnlock", validator.validUser, topicController.topicUnlock);
app.post("/v1/digicardUnlock", validator.validUser, digicardController.digicardUnlock);
app.post("/v1/fetchAvailableNumOfQuestions", validator.validUser, questionController.fetchAvailableNumOfQuestions);

app.post("/v1/fetchTeacherClasses", validator.validUser, teacherController.fetchTeacherClasses);
app.post("/v1/fetchTeacherSectionsBasedonClass", validator.validUser, teacherController.fetchTeacherSectionsBasedonClass);
app.post("/v1/fetchTeacherSubjectsBasedonSection", validator.validUser, teacherController.fetchTeacherSubjectsBasedonSection);

app.post("/v1/fetchTopicsBasedonChapters", validator.validUser, topicController.fetchTopicsBasedonChapters);
app.post("/v1/fetchConceptsBasedonTopics", validator.validUser, conceptController.fetchConceptsBasedonTopics);

/** TEACHER ACTIVITY **/
app.post("/v1/archivedActiveTopicsInChapter", validator.validUser, teacherController.archivedActiveTopicsInChapter);
app.post("/v1/getPreGrantedTeacherPermissions", validator.validUser, teacherController.getPreGrantedTeacherPermissions);
app.post("/v1/getPostGrantedTeacherPermissions", validator.validUser, teacherController.getPostGrantedTeacherPermissions);
app.post("/v1/generatePrePostQuiz", teacherController.generatePrePostQuiz); // validator.validUser,
app.post("/v1/reArrangeDigiCardOrder", validator.validUser, teacherController.reArrangeDigiCardOrder);
app.post("/v1/toggleDigicardsInTopic", validator.validUser, teacherController.toggleDigicardsInTopic);
app.post("/v1/fetchDigiCardstoReorder", validator.validUser, teacherController.fetchDigiCardstoReorder);

/** DIGICARD EXTENSION **/
app.post("/v1/fetchAllPreTopicDigicards", validator.validUser, digicardController.fetchAllPreTopicDigicards);
app.post("/v1/fetchAllPostTopicDigicards", validator.validUser, digicardController.fetchAllPostTopicDigicards);
app.post("/v1/addDigicardExtension", validator.validUser, teacherController.addDigicardExtension);
app.post("/v1/fetchDigicardExtension", validator.validUser, digicardController.fetchDigicardExtension);
app.post("/v1/fetchQuestionSourceandChapters", validator.validUser, teacherController.fetchQuestionSourceandChapters);

// TEST QUESTION PAPER : 
app.post("/v1/fetchTestQuestionPapersBasedonStatus", validator.validUser, testQuestionPaperController.fetchTestQuestionPapersBasedonStatus);
app.post("/v1/addTestQuestionPaper", validator.validUser, testQuestionPaperController.addTestQuestionPaper);
app.post("/v1/validateQuestionPaperName", validator.validUser, testQuestionPaperController.validateQuestionPaperName);
app.post("/v1/viewTestQuestionPaper", validator.validUser, testQuestionPaperController.viewTestQuestionPaper);
app.post("/v1/toggleQuestionPaper", validator.validUser, testQuestionPaperController.toggleQuestionPaper);

/** BLUE PRINT **/
app.post("/v1/fetchBlueprintById", validator.validUser, blueprintController.fetchBlueprintById);
app.post("/v1/fetchBlueprintDetailsBasedonId", blueprintController.fetchBlueprintDetailsBasedonId);
app.post("/v1/fetchQuestionBasedOnBlueprint", blueprintController.fetchQuestionBasedOnBlueprint); // validator.validUser,
app.post("/v1/fetchAllBluePrints", validator.validUser, blueprintController.fetchAllBluePrints);

// CLASS TEST : 
app.post("/v1/addClassTest",validator.validUser, classTestController.addClassTest);
app.post("/v1/fetchClassTestsBasedonStatus",validator.validUser, classTestController.fetchClassTestsBasedonStatus);
app.post("/v1/fetchClassTestById",  classTestController.fetchClassTestById);
app.post("/v1/fetchQuestionsBasedonQuestionPaper", validator.validUser, classTestController.fetchQuestionsBasedonQuestionPaper);
app.post("/v1/startEvaluation", validator.validUser, classTestController.startEvaluation);
app.post("/v1/getStudentsBasedOnSection", validator.validUser, classTestController.getStudentsBasedOnSection);
app.post("/v1/getStudentResultData", validator.validUser, classTestController.getStudentResultData);
app.post("/v1/updateStudentMarks", validator.validUser, classTestController.updateStudentMarks);
app.post("/v1/resetEvaluationStatus", validator.validUser, classTestController.resetEvaluationStatus);
app.post("/v1/toggleClassTestStatus", validator.validUser, classTestController.toggleClassTestStatus);

// Scanner
app.post("/v1/sendScannerLink", validator.validUser, scannerController.sendScannerLink); // Test & Quiz
app.post("/v1/sendOTPForScanning", scannerController.sendOTPForScanning);  // Test & Quiz
app.post("/v1/validateOTPForScanning", scannerController.validateOTPForScanning); // Test & Quiz
app.post("/v1/fetchSignedURLForAnswers", validator.validScannerUser, scannerController.fetchSignedURLForAnswers);
app.post("/v1/uploadAnswerSheets", validator.validScannerUser, scannerController.uploadAnswerSheets2);
app.post("/v1/fetchSignedURLForQuizAnswers", validator.validScannerUser, scannerController.fetchSignedURLForQuizAnswers) //Quiz
app.post("/v1/uploadQuizAnswerSheets", scannerController.uploadQuizAnswerSheets2); // Quiz  validator.validScannerUser,

// Quiz
app.post("/v1/checkDuplicateQuizName",  validator.validUser, quizController.checkDuplicateQuizName);
app.post("/v1/toggleQuizStatus", validator.validUser, quizController.toggleQuizStatus); 
app.post("/v1/fetchQuizBasedonStatus", validator.validUser, quizController.fetchQuizBasedonStatus); 
app.post("/v1/viewQuizQuestionPaper", validator.validUser, quizController.viewQuizQuestionPaper); 
app.post("/v1/getStudentQuizResultData",  validator.validUser, quizController.getStudentQuizResultData);
app.post("/v1/updateStudentQuizMarks", quizController.updateStudentQuizMarks); // validator.validUser,
app.post("/v1/fetchQuizTemplates", validator.validUser, quizController.fetchQuizTemplates);
app.post("/v1/resetQuizEvaluationStatus", validator.validUser, quizController.resetQuizEvaluationStatus);
app.post("/v1/startQuizEvaluation", quizController.startQuizEvaluation); // validator.validUser,

app.post("/v1/getIndividualQuizReport",reportController.getIndividualQuizReport)

// School admin
app.post("/v1/createSchoolAdmin", validator.validUser, schoolAdminController.createSchoolAdmin);
app.post("/v1/updateSchoolAdmin", validator.validUser, schoolAdminController.updateSchoolAdmin);
app.post("/v1/toggleSchoolAdminStatus", validator.validUser, schoolAdminController.toggleSchoolAdminStatus);

// Dashboard Reports
app.post("/v1/fetchAssessmentSummary", reportController.fetchAssessmentSummary);
app.post("/v1/getTargetedLearningExpectation",reportController.getTargetedLearningExpectation);
app.post("/v1/getTargetedLearningExpectationDetails",reportController.getTargetedLearningExpectationDetails);
app.post("/v1/preLearningSummaryDetails",reportController.preLearningSummaryDetails);
app.post("/v1/postLearningSummaryDetails",reportController.postLearningSummaryDetails);
app.post("/v1/preLearningBlueprintDetails",reportController.preLearningBlueprintDetails);
app.post("/v1/viewAnalysisIndividualReport",reportController.viewAnalysisIndividualReport);
app.post("/v1/comprehensivePerformanceChapterWise",reportController.comprehensivePerformanceChapterWise);
app.post("/v1/comprehensivePerformanceChapterWiseForTest",reportController.comprehensivePerformanceChapterWiseForTest);
app.post("/v1/comprehensivePerformanceTopicWise",reportController.comprehensivePerformanceTopicWise);
app.post("/v1/comprehensivePerformanceTopicWiseForTest",reportController.comprehensivePerformanceTopicWiseForTest);
app.post("/v1/comprehensivePerformanceConceptWise",reportController.comprehensivePerformanceConceptWise);
app.post("/v1/comprehensivePerformanceConceptWiseForTest",reportController.comprehensivePerformanceConceptWiseForTest);
app.post("/v1/viewClassReportQuestions",reportController.viewClassReportQuestions);
app.post("/v1/viewClassReportFocusArea",reportController.viewClassReportFocusArea);
app.post("/v1/viewChapterwisePerformanceTracking",reportController.viewChapterwisePerformanceTracking);
app.post("/v1/getActionsAndRecommendations",reportController.getActionsAndRecommendations);
app.post("/v1/getActionsAndRecommendationDetail",reportController.getActionsAndRecommendationDetail);
app.post("/v1/fetchSchoolDetails",schoolController.fetchSchoolDetails);

// Student Dashboard
app.post("/v1/topAndBottomPerformers", studentController.topAndBottomPerformers);
app.post("/v1/needAttention",studentController.needAttention);
app.post("/v1/studentChaptersPerformance",studentController.studentChaptersPerformance);
app.post("/v1/customWorksheetGenerated",studentController.customWorksheetGenerated);
app.post("/v1/fetchCustomWorksheet",studentController.fetchCustomWorksheet);
app.post("/v1/sendEmailToParent",studentController.sendEmailToParent);
app.post("/v1/studentAvgVsClassAvg", studentController.studentAvgVsClassAvg);
app.post("/v1/studentAvgVsClassAvgChapterWise", studentController.studentAvgVsClassAvgChapterWise);


app.post("/v1/updateActionAndRecommendations", sectionController.updateActionAndRecommendations);

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
