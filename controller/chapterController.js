const { formatResponse } = require("../helper/helper");
const {chapterServices} = require("../services");

exports.fetchTopicsBasedonChapter = async (req, res, next) => {
    try {
        const request = req.body;
        const reportData = await chapterServices.fetchTopicsBasedonChapterNew(request);
        return formatResponse(res, reportData);
    } catch (error) {
        next(error)
    }
}



