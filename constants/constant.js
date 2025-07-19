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
    CLASS_TEST_ALREADY_EXISTS: "Class Test Already Exists",
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
    DIGICARD_UNLOCK_MANDATORY: "Please, unlock Digicard to generate Quiz!",
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

    ANSWER_DATA_WAS_NOT_FOUND: "Answer Data not Found!",
    STUDENT_DATA_NOT_FOUND: "Student Data not Found!",
    TEST_DATA_NOT_FOUND: "Test Data not Found!",
    QUIZ_DATA_NOT_FOUND: "Quiz Data not Found!",
    UPLOADED_ANSWER_REMOVED: "Uploaded Answer Removed Successfully!",
    UPLOADED_ANSWER_REMOVEAL_ISSUE: "Uploaded Answer Removeal Issue!",

    // Scanner
    UPLOAD_URL_Sent: "Please, check your email to access the URL to upload Answer Sheets!",
    OTP_EXPIRED: "OTP Expired!",
    INVALID_OTP: "Invalid OTP!",

    // School Admin
    SCHOOL_USER_EXISTS_ALREADY: 'User exists already, please use a different email Id!',

    // Athena
    QUERY_FAILED: "Query failed with status: **status**",
    QUERY_EXECUTION_FAILED: "Error executing query: **error**",

    INVALID_SUBJECT_ID: "INVALID SUBJECT ID"
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
    customQuestionPapers: 'custom_uploads/**REPLACE**/question_paper_template/',
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

exports.awsConstants = {
    batchSize: 25
}

exports.OCRPrompts = {

    Mathematics: "1. First, extract the “Page No:” (a numeral) carefully from the answersheet. Check top, bottom, or corners.2. Extract all mathematical content, including:- Equations: Render in consistent LaTeX using `\( ... \)` or `$$ ... $$`. Ensure no partial formatting. - Tables: Convert to LaTeX tabular using `\begin{array}...\end{array}`. - Graphs or diagrams: If visible, describe structure briefly (e.g., 'a bar graph showing...'), do not attempt to draw them. 3. Ensure consistent formatting of LaTeX symbols (e.g., avoid mixing `\frac{}` and `/`, or `\times` and `x`). 4. For variables or numerals that look unclear, give multiple interpretations (e.g., `1/l`, `x/y`). 5. Omit scratched-out or crossed portions. Include alternate answers if they appear nearby and are clearly written. 6. Do **not** correct mathematical logic. Only fix grammar in instructions/statements and highlight changes using `<span style='color:red;'>word</span>`. 7. Preserve structure of the answer (step-by-step logic, layout). 8. Output only the extracted and cleaned content — no added labels, explanations, or headers.",

    Science: "1. Extract the “Page No:” carefully from the top, bottom, or corners of the answersheet. 2. Extract all content including: - Chemical or physical equations: Format using LaTeX (e.g., `\ce{H2 + O2 -> H2O}` for chemical equations). - Scientific terms: Preserve original spelling unless clearly incorrect. Avoid replacing technical words. - Diagrams: If clearly visible and labeled, describe them textually (e.g., “a diagram of the heart showing… with labels…”). Otherwise, omit. - Tables: Convert to LaTeX using `\begin{array}...\end{array}`. 3. Do **not** alter scientific facts or terminology. Fix only grammar or spelling in non-technical narrative sentences. Highlight changes using `<span style='color:red;'>word</span>`. 4. For any unclear words (e.g., smudged names or terms), provide multiple likely options (e.g., “chloroplast/chromoplast”). 5. Exclude all scribbled/crossed content. If rewritten content is clearly beside it, include that instead. 6. Respect the flow and sequence of the original answer; do not reorder steps unless clearly out of order. 7. Output only the refined content — no headings, extra symbols, or meta commentary.",

    English: "1. Extract the “Page No:” from the answersheet image. Look carefully in the top, bottom, or corners. 2. Extract all visible written content exactly as written by the student — essays, letters, narratives, etc. Do **not** correct spelling, punctuation, or grammar. 3. For **unclear or ambiguously written words**, do the following: - Underline the ambiguous word using HTML underline tags: `<u>word</u>` - Immediately after the word, provide 2–3 possible interpretations in brackets. Example: `<u>worcl</u> (word/world/would)` 4. Omit any content that is scratched out, scribbled over, or manually struck through. 5. If there is a clearly rewritten or alternate response beside the scratched-out content, and it is legible, include that instead of the struck content. 6. Preserve the **format and layout** of the student's original writing — including paragraph breaks, indentation, and line spacing. 7. Output only the extracted and refined content. Do not add any metadata, labels, or extra commentary.",

    "Social Science": "1. Extract the “Page No:” from the image — look top/bottom/corners for it. 2. Extract all legible content from the image, including: - Names, places, historical dates — do not auto-correct unless clearly misspelled. If uncertain, offer options (e.g., “Ashoka/Asoka”). - Tables, timelines — render them using the LaTeX tabular format `\begin{array}...\end{array}`. - Charts or maps — describe structure if identifiable. Do not attempt to redraw. 3. Fix only grammar or spelling in non-factual narrative — highlight corrections using `<span style='color:red;'>corrected word</span>`. 4. For any ambiguous or unclear handwriting, provide bracketed options. 5. Omit content that has been struck out or crossed. If another nearby response is visible and legible, include that. 6. Do not alter or interpret factual content — retain the student's original phrasing and chronology. 7. Maintain answer formatting (e.g., bullet points, paragraph breaks). 8. Provide only the extracted and refined student answer — do not add explanations, formatting headers, or extra commentary.",

    Default: '1. First, extract the "Page No:" , which will be a numeral. Do it very carefully and precisely from the answersheet. Pay utmost attention and try your best to extract this "Page No:" first. 2. Second extract text, images, and equations(Provide Equations in Latex) from the image and For any **tables**, convert and extract them in proper **LaTeX/KaTeX tabular format** (i.e., use \begin{array}...\end{array} syntax) so they are renderable in math environments. 3. Correct spelling and grammar mistakes and highlight the corrected words in red using inline CSS (e.g., <span style="color:red;">corrected word</span>). 4. For unclear handwriting, provide multiple possible interpretations of ambiguous words or phrases, displaying them in parentheses (e.g., word1/word2). 5. Omit content that is scratched, scribbled over, or manually crossed out. Do not include parts of the text that are visibly altered by strikethroughs or manual cuts, as these indicate the student intent to remove them. 6. If an answer is written by the student below or beside the scratched-out or manually cut part, include it in the output as part of the student response, provided it is clearly legible and not crossed out. 7. Apply predictive corrections only to the final content clearly intended by the student while excluding manually crossed-out portions. Correct the intended response to improve readability while maintaining accuracy. 8. Ensure the output provides the complete answer of the student response while balancing predictive assistance with accuracy and respecting the student original intent. 9. Do not give any extra characters or symbols in the answersheet , just give the extracted content as it is.'
}