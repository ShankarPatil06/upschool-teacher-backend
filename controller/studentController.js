const {studentServices} = require("../services");

exports.fetchIndividualDigiCard = (req, res, next) => {
    let request = req.body;
    request["token"] = req.header('Authorization');
    
    studentServices.fetchIndividualDigiCard(request, function (individual_digicard_err, individual_digicard_response) {
        if (individual_digicard_err) {
            res.status(individual_digicard_err).json(individual_digicard_response);
        } else {
            console.log("DigiCard Fetched Successfully");
            res.json(individual_digicard_response);
        }
    });
};

exports.fetchAllStudents = async (req, res, next) => {
    try {
        let request = req.body;
        request["token"] = req.header('Authorization');
        const fetchAllStudentsResponse = await studentServices.fetchAllStudents(request);
        res.json(fetchAllStudentsResponse);
    } catch (error) {
        next(error);
    }
};

exports.topAndBottomPerformers = async (req, res, next) => {
    try {
        let request = req.body;
        request["token"] = req.header('Authorization');
        const topAndBottomPerformersResponse = await studentServices.topAndBottomPerformers(request);
        res.json(topAndBottomPerformersResponse);
    } catch (error) {
        next(error);
    }
};

exports.needAttention = async (req, res, next) => {
    let request = req.body;
    try {
        const result = await studentServices.needAttention(request);
        console.log("Fetch All Need Attention Students Successful");
        res.json(result);
    } catch (error) {
        console.error("Error fetching need attention students:", error);
        res.status(500).json({ message: "An error occurred while fetching data.", details: error.message });
    }
};
exports.studentChaptersPerformance = async (req, res, next) => {
    let request = req.body;
    try {
        const result = await studentServices.studentChaptersPerformance(request);
        console.log("Fetch studentPerformance Successful");
        res.json(result);
    } catch (error) {
        console.error("Error fetching studentPerformance students:", error);
        res.status(500).json({ message: "An error occurred while fetching data.", details: error.message });
    }
};

exports.studentAvgVsClassAvgChapterWise = async (req, res, next) => {
    let request = req.body;
    try {
        const result = await studentServices.studentAvgVsClassAvgChapterWise(request);
        console.log("Fetch student and class average Successful");
        res.json(result);
    } catch (error) {
        console.error("Error fetching student and class average students:", error);
        res.status(500).json({ message: "An error occurred while fetching data.", details: error.message });
    }
};

exports.customWorksheetGenerated = async (req, res, next) => {
    let request = req.body;
    try {
        const result = await studentServices.customWorksheetGenerated(request);
        console.log("generated customWorksheetGenerated Successful");
        res.json(result);
    } catch (error) {
        console.error("Error generated customWorksheetGenerated students:", error);
        res.status(500).json({ message: "An error occurred while generated data.", details: error.message });
    }
};
exports.fetchCustomWorksheet = async (req, res, next) => {
    let request = req.body;
    try {
        const result = await studentServices.fetchCustomWorksheet(request);
        console.log(" fetch CustomWorksheet Successful");
        res.json(result);
    } catch (error) {
        console.error("Error fetching  CustomWorksheet students:", error);
        res.status(500).json({ message: "An error occurred while fetching data.", details: error.message });
    }
};
exports.sendEmailToParent = async (req, res, next) => {
    let request = req.body;
    try {
        const result = await studentServices.sendEmailToParent(request);
        console.log(" sent email Successful");
        res.json(result);
    } catch (error) {
        console.error("Error while sending  email:", error);
        res.status(500).json({ message: "An error occurred while sending  email.", details: error.message });
    }
};