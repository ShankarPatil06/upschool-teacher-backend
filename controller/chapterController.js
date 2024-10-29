const {chapterServices} = require("../services");

exports.chapterUnlock = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    chapterServices.chapterUnlockService(request, function (unlock_chapter_err, unlock_chapter_response) {
        if (unlock_chapter_err) {
            res.status(unlock_chapter_err).json(unlock_chapter_response);
        } else {
            console.log("Chapter Lock Status Changed Successfully");
            res.json(unlock_chapter_response);
        }
    });
};

exports.comprehensivePerformanceConceptWise = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await reportServices.comprehensivePerformanceConceptWise(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
};

// exports.fetchTopicsBasedonChapter = async (req, res, next) => {
//     try {
//         const request = req.body;
//         const reportData = await chapterServices.fetchTopicsBasedonChapter(request);
//         return formatResponse(res, reportData);
//     } catch (error) {
//         next(error)
//     }
// }


exports.fetchTopicsBasedonChapter = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    chapterServices.fetchTopicsBasedonChapter(request, function (individual_chapter_err, individual_chapter_response) {
        if (individual_chapter_err) {
            res.status(individual_chapter_err).json(individual_chapter_response);
        } else {
            console.log("Chapter Related Topics Fetched Successfully");
            res.json(individual_chapter_response);
        }
    });
};

exports.unlockChapterPreLearning = (req, res, next) => {
    console.log("Chapter prelearning unlock!");
    let request = req.body;    
    chapterServices.chapterPrelearningUnlock(request, function (unlockChapterPre_err, unlockChapterPre_response) {
        if (unlockChapterPre_err) {
            res.status(unlockChapterPre_err).json(unlockChapterPre_response);
        } else {
            console.log("Unlocked Chapter Prelearning!");
            res.json(unlockChapterPre_response);
        }
    });
};

