exports.messages = {
    TEST_RESULT_DATA_DATABASE_ERROR: "Test Result Database Error",
    QUIZ_RESULT_DATA_DATABASE_ERROR: "Quiz Result Database Error",
    USER_DATA_DATABASE_ERROR: "User Data Database Error",
    SCANNER_DATA_DATABASE_ERROR: "Scanner Data Database Error",
    USER_EMAIL_DOESNOT_EXISTS: "User Email Doesn't Exist",
    DATABASE_ERROR: "DB Error",
    USER_DOESNOT_EXISTS: "User Doesn't Exist",
    TEACHER_DOESNOT_EXISTS: "Teacher Doesn't Exist",
    CLASS_SECTION_SUBJECT_COMBO_DOESNT_EXIST: "No Comination of this Class, Section, Subject Exists for the Teacher",
    INVALID_PASSWORD: "Invalid Password",
    FIRST_LOGIN: "Password doesn't exist, please login with OTP or create a password!",
    INVALID_TOKEN: "Invalid Token",
    SESSION_EXPIRED: "Session Expired",
    ERROR_UPLOADING_FILES_TO_S3: "Error Uploading Files to S3",
    USER_LOGIN_DATABASE_ERROR: "User Login Database Error",
    CLIENT_NAME_ALREADY_EXISTS: "Client Name Already Exist",
    NO_DATA: "NO DATA",
    INVALID_DATA: "Invalid Data",
    PASSWORD_MISSMATCH: "Password Missmatch",
    INCORRECT_OLDPASSWORD: "Invalid Current Password!",
    INTERNAL_SERVER_ERROR: "Internal Server Error",
    ACCESS_DENIED: "Access Denied!",

    // School : 
    SCHOOL_NAME_ALREADY_EXIST: "School Name Already Exist",
    SCHOOL_IS_ACTIVE: "Unable to delete the school as subscription status is active!",
    SCHOOL_IS_INACTIVE: "School is not active",
    INVALID_REQUEST_FORMAT: "Invaid Request Format",
    ERROR: "Error",
    DIDNT_SET_CONFIG: "Post Configuration is not set by School",
    PERMISSION_DENIED: "Permission denied!",

    SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG: "School doesn't have pre learning quiz configurations!",
    SCHOOL_DOESNT_HAVE_POSTQUIZ_CONFIG: "School doesn't have post learning quiz configurations!",

    // DigiCard : 
    DIGICARD_DATABASE_ERROR: "DigiCard Database Error",
    INVALID_DIGICARD_TITLE: "Invalid Digicard Title",
    INVALID_DIGICARD_IMAGE: "Invalid Digicard Image",
    NO_DIGICARD_TO_DELETE: "No DigitCard is Selected to Delete",
    DIGICARD_NAME_ALREADY_EXISTS: "Digicard Name Already Exists",
    INVALID_DIGICARD: "No Digicard on this ID / Invalid DIgicard",
    UNABLE_TO_DELETE_THE_DIGICARD: "Unable to delete the digi card as it is mapped with the concept blocks: **REPLACE**",
    DIGICARD_UNLOCK_MANDATORY : "Please, unlock Digicard to generate Quiz!",
    PRE_DIGICARDS_UNLOCKED: "Pre Learning Digicards Unlocked",
    POST_DIGICARDS_UNLOCKED: "Post Learning Digicards Unlocked",
    // DIGICARD_UNLOCK_MANDATORY: "Please, unlock digicards to generate Quiz!",
    DIGICARD_UNLOCKED_ALREADY: "Digicards has been unlocked already!",
    UNABLE_TO_UNLOCK_DIGICARD: "Unable to unlock Digicards for **REPLACE** as it is unlocked",
    UNABLE_TO_UNLOCK_DIGICARDS: "Unable to unlock Digicards for **REPLACE** as they are unlocked",
    DIDNT_UNLOCK_DIGICARD: "Digicards haven't been unlocked for the selected Topics!",
    DIGICARDS_FETCHED_FOR_REORDERING: "DigiCard Fetched for Reordering",

    // Quiz : 
    PRE_QUIZ_ALREADY_GENERATED: "Pre learning quiz has been generated already!",
    POST_QUIZ_ALREADY_GENERATED: "Post learning quiz has been generated already!",
    SELECT_ALL_TOPICS: "Select All Topics to generate Quiz",
    DIGICARD_ORDER_CHANGED: "DigiCards Order Changed",
    DIGICARD_DELETED_IN_TOPIC: "DigiCards Deleted",
    DIGICARD_ACTIVATED_IN_TOPIC: "DigiCards Activated",
    INSUFFICIENT_QUESTIONS: "Insufficient Questions!", 
    ERROR_IN_GENERATING_QUIZ: "Error in Generating Quiz", 
    NO_ANSWER_SHEET_FOUND: "No answer sheets to evaluate!",
    DUPLICATE_QUIZ_NAME: "Quiz name exists already!",
    COULDNOT_READ_QUIZ_ID: "Couldn't extract Quiz ID, please re-upload!",
    UNABLE_TO_EXTRACT_TEXT: "Unable to extract text, please re-upload!",
    UNABLE_TO_READ_PAGE_DETAILS: "Unable to extract basic page details, please re-upload!",
    UNABLE_TO_READ_ROLL_NUMBER: "Unable to extract student roll no, please enter it manually!",

    // Topic : 
    TOPIC_DATABASE_ERROR: "Topic Database Error",
    INVALID_TOPIC_TITLE: "Invalid Standard Title",
    TOPIC_COMBO_DOESNT_EXISTS: "No Comination of this Class, Section, Subject, Chapter, Topic Exists for the Teacher",
    NO_TOPIC_TO_DELETE: "No Topic is Selected to Delete",
    TOPIC_NAME_ALREADY_EXISTS: "Topic Name Already Exists",
    UNABLE_TO_DELETE_THE_TOPIC: "Unable to delete the topic as it is mapped with the chapters: **REPLACE**",
    NO_ACTIVE_TOPICS: "Topics are inactive!",
    NO_TOPICS_SELECTED: "No Topics Selected",
    NO_TOPIC_IS_SELECTED: "No topic has been selected!",
    TOPICS_ALREADY_UNLOCKED: "**REPLACE** topics's digicards have already been unlocked!",

    // Chapter :
    CHAPTER_DATABASE_ERROR: "Chapter Database Error",
    CHAPTER_COMBO_DOESNT_EXISTS: "No Comination of this Class, Section, Subject and Chapter Exists for the Teacher",
    INVALID_CHAPTER_TITLE: "Invalid Standard Title",
    NO_CHAPTER_TO_DELETE: "No Chapter is Selected to Delete",
    NO_CHAPTER_TO_UNLOCK: "No Chapter is Selected to Delete",
    CHAPTER_NAME_ALREADY_EXISTS: "Chapter Name Already Exists",
    UNABLE_TO_DELETE_THE_CHAPTER: "Unable to delete the chapter as it is mapped with the units: **REPLACE**",
    INVALID_REQUEST: "Invalid Request",

    // Unit :
    UNIT_DATABASE_ERROR: "Unit Database Error",
    INVALID_UNIT_TITLE: "Invalid Standard Title",
    NO_UNIT_TO_DELETE: "No Unit is Selected to Delete",
    UNIT_NAME_ALREADY_EXISTS: "Unit Name Already Exists",
    UNABLE_TO_DELETE_THE_UNIT: "Unable to delete the unit as it is mapped with the subjects: **REPLACE**",


    STANDARD_DATABASE_ERROR: "Standard Database Error",
    INVALID_STANDARD_TITLE: "Invalid Standard Title",
    NO_STANDARD_TO_DELETE: "No Standard is Selected to Delete",
    STANDARD_NAME_ALREADY_EXISTS: "Standard Name Already Exists",

    // Users :
    PHONE_NO_ALREADY_EXIST: "Phone No Already Exist",
    EMAIL_ID_ALREADY_EXIST: "Email Id Already Exist",
    INVALID_USER_ROLE: "Invalid User Role",
    PHONE_NO_ALREADY_IN_USE: "Phone Number Already In Use",
    EMAIL_ALREADY_IN_USE: "Email Id Already In Use",
    PARENT_DOESNT_EXIST: "Parent Doesn't Exist For This Phone Number",
    INVALID_USER_STATUS: "Invalid User Status to toggle",

    // Concept : 
    CONCEPT_TITLE_ALREADY_EXIST: "Concept Title Already Exist!",
    UNABLE_TO_DELETE_THE_CONCEPT: "Unable to delete the concept as it is mapped with the topics: **REPLACE**",

    // Subject : 
    SUBJECT_TITLE_ALREADY_EXIST: "Subject Title Already Exist!",
    UNABLE_TO_DELETE_THE_SUBJECT: "Unable to delete the subject as it is mapped with the classes: **REPLACE**",
    INVALID_SUBJECT: "Invalid Subject",

    // Class : 
    CLASS_NAME_ALREADY_EXIST: "Class Name Already Exist!",
    UNABLE_TO_DELETE_THE_CLASS: "Unable to delete the class as it is subscribed with a client class!",

    Reference_Number_Database_Error: "Reference Number Database Error",

    // Teacher : 
    TEACHER_TO_CLASS_NOT_ALLOCATED: "Teacher is not allocated to any Class",
    TEACHER_NOT_ALLOCATED_TO_SECTION: "Teacher is not allocated to Sections in this Class",
    SUBJECT_ISNOT_ALLOCATE_TO_TEACHER: "Subject is not allocated to the teacher!",
    NO_SUBJECTS_FOR_TEACHER: "No Subjects allocated for Teacher",
    INVALID_TEACHER: "Invalid Teacher Input",
    TEACHER_ACTIVITY_ERROR: "Error in Unlocking Digicards",

    // Test Question Paper : 
    TEST_QUESTION_PAPER_NAME_ALREADY_EXISTS: "Question Paper Name Already Exists",
    CANNOT_DELETE_QUESTION_PAPER: "Unable to delete the Question Paper, as it is mapped to a class test!",

    NO_ENOUGH_QUESTIONS: "No enough Questions found!", 
    
    // CLASS TEST
    CLASS_TEST_EXISTS: "Class Test Name Already Exists!",
    COULDNT_EXTRACT_TEXT: "Couldn't extract text, please re-upload!",
    COULDNT_READ_PAGE_DETAILS: "Couldn't extract basic page details, please re-upload!",
    COULDNT_READ_TEST_ID: "Couldn't extract Test ID, please re-upload!",
    COULDNT_READ_ROLL_NUMBER: "Couldn't extract student roll no, please enter it manually!",

    // Scanner
    UPLOAD_URL_Sent: "Please, check your email to access the URL to upload Answer Sheets!",
    OTP_EXPIRED: "OTP Expired!",
    INVALID_OTP: "Invalid OTP!",

    // School Admin
    SCHOOL_USER_EXISTS_ALREADY: 'User exists already, please use a different email Id!', 

    // Athena
    QUERY_FAILED: "Query failed with status: **status**", 
    QUERY_EXECUTION_FAILED: "Error executing query: **error**",

    INVALID_SUBJECT_ID:"INVALID SUBJECT ID"
}

exports.constValues = {
    common_id: "61692656"
}

exports.mailSubject = {
    otpForLogin: "OTP for Login",
    urlToScanAnswerSheets: "URL to Scan and Upload Answer Sheets",
    otpToScanAnswerSheets: "OTP to Scan and Upload Answer Sheets",
    otpForResettingPassword: "OTP for Creating/Resetting Password",
    otpForCreatingPassword: "OTP for Creating Password", 
    quizGeneration: "Quiz Generation"

}

exports.unlockChapterValues = {
    automatedUnlock: "Automated",
    customizedUnlock: "Customised",
    chapterLevel: "Chapter",
    topicLevel: "Topic",
    expressQuiz: "Express",
    manualQuiz: "Manual",
}

exports.prePostConstans = {
    preLearning: "pre_learning",
    postLearning: "post_learning",
    onlineMode: "online",
    offlineMode: "offline",
    automatedType: "automated",
    expressType: "express",
    manualType: "manual",
    randomOrder: "randomOrder",
    randomQuestion: "randomQuestions",
    preLearningVal: "preLearning",
    postLearningVal: "postLearning"
}

exports.questionKeys = {
    objective: "Objective",
    subjective: "Subjective",
    desctiptive: "Desctiptive",
    lessDifficult: "lessDifficult",
    moderatelyDifficult: "moderatelyDifficult",
    highlyDifficult: "highlyDifficult",
    classTest: 'classTest',
    workSheet: 'workSheet',
    quiz: 'quiz'
}

exports.contentType = {
    question: "question"
}

exports.status = {
    active: "Active",
    archived: "Archived"
}

exports.externalURLs = {
    mathpixURL: "https://api.mathpix.com/v3/text"
}

exports.answerSheet = {
    studtIdBlank: "_________________________",
    first: "_________________________________________,",
    second: " __________________________________________,",
    odd: "__________________________________________,",
    even: " _______________________________________________,",
    descriptiveSpace: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
    findBlank: "(\\$\\$)",
}

exports.testFolder = {
    questionPapers: 'test_uploads/**REPLACE**/question_paper_template/',
    answerSheets: 'test_uploads/**REPLACE**/answer_sheet_template/',
    studAnswerSheets: 'test_uploads/**REPLACE**/student_answered_sheets',
}

exports.quizFolder = {
    questionPapersSetA: 'quiz_uploads/**REPLACE**/question_paper_template/set_a/',
    questionPapersSetB: 'quiz_uploads/**REPLACE**/question_paper_template/set_b/',
    questionPapersSetC: 'quiz_uploads/**REPLACE**/question_paper_template/set_c/',
    answerSheetSetA: 'quiz_uploads/**REPLACE**/answer_sheet_template/set_a/',
    answerSheetSetB: 'quiz_uploads/**REPLACE**/answer_sheet_template/set_b/',
    answerSheetSetC: 'quiz_uploads/**REPLACE**/answer_sheet_template/set_c/',
    studAnswerSheets: 'quiz_uploads/**REPLACE**/student_answered_sheets',
}

exports.evalConstant = {
    ans: 'ans:',
    splitLines: '<SPLIT>',
    empty: "<EMPTY>"
}

exports.quizSets = {
    a: "qp_set_a",
    b: "qp_set_b",
    c: "qp_set_c"
}

exports.quizSetDetails = [
    {
        setKey: this.quizSets.a,
        setName: "A",
        setFolder: this.quizFolder.answerSheetSetA,
        fieldName: "answerPapersSetA"
    },
    {
        setKey: this.quizSets.b,
        setName: "B",
        setFolder: this.quizFolder.answerSheetSetB,
        fieldName: "answerPapersSetB" 
    },
    {
        setKey: this.quizSets.c,
        setName: "C",
        setFolder: this.quizFolder.answerSheetSetC,
        fieldName: "answerPapersSetC"  
    }
];

exports.groupTypes = {
    Basic: "Basic", 
    Intermediate: "Intermediate", 
    Advanced: "Advanced"
}; 

exports.awsConstants ={
    batchSize : 25
}
