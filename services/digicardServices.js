const { chapterRepository, digicardRepository, digicardExtension, teachingActivityRepository, topicRepository, presetRepository, schoolRepository, commonRepository } = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { TABLE_NAMES } = require('../constants/tables');
const s3Services = require("./s3Service");

exports.fetchIndividualDigiCard = async (request) => {
    const singleDigicardResponse = await digicardRepository.fetchDigiCardByID2(request);
    if (!singleDigicardResponse.Items || singleDigicardResponse.Items.length === 0) {
        return singleDigicardResponse;
    }

    let digiContent = singleDigicardResponse.Items[0].digi_card_content || "";
    const presetDataRes = await presetRepository.getAllPresets2(request);

    let openTag = "", closeTag = "</p></div>";
    presetDataRes.Items.forEach(preset => {
        if (digiContent.includes(preset.preset_markup)) {
            openTag = `<div style='${preset.preset_bg_style}'><span style='${preset.preset_heading_style}'>${preset.preset_heading}</span><br><p style='${preset.preset_content_style}'>`;
            const replaceCondition = new RegExp(`${preset.preset_markup}(.*?)${preset.preset_markup}`, "g");
            digiContent = digiContent.replace(replaceCondition, `${openTag}$1${closeTag}`);
        }
    });

    singleDigicardResponse.Items[0].preview_content = digiContent;
    const { digicard_image, digicard_voice_note, digicard_document } = singleDigicardResponse.Items[0];

    if (digicard_image && digicard_image.includes("uploads/")) {
        singleDigicardResponse.Items[0].digicard_imageURL = await s3Services.getS3SignedUrl(digicard_image);
    }
    if (digicard_voice_note && digicard_voice_note.includes("uploads/")) {
        singleDigicardResponse.Items[0].digicard_voice_noteURL = await s3Services.getS3SignedUrl(digicard_voice_note);
    }
    if (digicard_document && digicard_document.includes("uploads/")) {
        singleDigicardResponse.Items[0].digicard_documentURL = await s3Services.getS3SignedUrl(digicard_document);
    }

    let digiCardContent = `<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css">` + digiContent;
    let audioTagIndex = 0;
    digiCardContent = digiCardContent.split("##audio##").map((segment, index) => {
        if (segment.startsWith("http")) {
            return `<i id="itag${audioTagIndex}" class="fa fa-volume-up" onclick="document.getElementById('audio${audioTagIndex}').play()" alt="Play">
                  <audio id="audio${audioTagIndex}" src="${segment}"></audio>
                </i>`;
        }
        return segment;
    }).join("");
    singleDigicardResponse.Items[0].preview_content = digiCardContent;
    return singleDigicardResponse;
};

exports.fetchRelatedDigiCards = async (request) => {
    let response = { data: [], statusCode: 400 };
    const singleDigiCardResponse = await digicardRepository.fetchDigiCardByID2(request);

    if (singleDigiCardResponse.Items.length > 0) {
        const relatedDigiCards = singleDigiCardResponse.Items[0].related_digi_cards;
        if (relatedDigiCards && relatedDigiCards.length > 0) {
            const relatedDigiCardResponse = await digicardRepository.fetchRelatedDigiCardData2({ related_digi_cards: relatedDigiCards });

            response.data = relatedDigiCardResponse.Items;
            response.message = constant.messages.RELATED_DIGICARDS;
            response.statusCode = 200;
            return response;
        } else {
            response.message = constant.messages.NO_RELATED_DIGICARDS;
            return response;
        }
    } else {
        response.message = constant.messages.INVALID_DIGICARD;
        response.statusCode = 401;
        return response;
    }
};

exports.fetchAllPreTopicsAndItsDigicards = async (request) => {
    try {
        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

        if (!schoolDataRes.Items[0]?.pre_quiz_config) {
            throw { status: 400, message: constant.messages.SCHOOL_DOESNT_HAVE_PREQUIZ_CONFIG };
        }

        const teachActivityResponse = await teachingActivityRepository.fetchTeachingActivity2(request);

        let chapterActivity = teachActivityResponse.Items.length > 0
            ? teachActivityResponse.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id)
            : [];

        let archivedTopics = chapterActivity.length > 0 && chapterActivity[0].pre_learning.archivedTopics
            ? chapterActivity[0].pre_learning.archivedTopics
            : [];

        let isUnlocked = chapterActivity.length > 0 && chapterActivity[0].pre_learning.unlocked_digicard.topics
            ? chapterActivity[0].pre_learning.unlocked_digicard.topics
            : [];

        if (isUnlocked.length > 0) {
            throw { status: 400, message: constant.messages.DIGICARD_UNLOCKED_ALREADY };
        }

        const chapterDataResponse = await chapterRepository.fetchChapterByID2(request);
        let preLearningTopicIds = chapterDataResponse.Items.length > 0 ? chapterDataResponse.Items[0].prelearning_topic_id : [];

        let activeTopics = await helper.getDifferenceValueFromTwoArray(preLearningTopicIds, archivedTopics);

        if (activeTopics.length === 0) {
            throw { status: 400, message: constant.messages.NO_ACTIVE_TOPICS };
        }

        let fetchBulkTopicReq = {
            IdArray: activeTopics,
            fetchIdName: "topic_id",
            TableName: TABLE_NAMES.upschool_topic_table
        };

        const topicDataRes = await commonRepository.fetchBulkData2(fetchBulkTopicReq);
        return await exports.getPrePostTopicsAndItsDigicards(topicDataRes);

    } catch (error) {
        return { status: error.status || 500, message: error.message || "An error occurred" };
    }
};

exports.createTopicsAndItsCardsList = async (topicList, conceptList, DigicardList) => {
    try {
        let finalTopicAndCards = [];

        for (const topic of topicList) {
            let conceptIds = topic.topic_concept_id;
            let digiCardIds = conceptIds.flatMap(conId =>
                conceptList
                    .filter(cBlock => cBlock.concept_id === conId)
                    .flatMap(cBlock => cBlock.concept_digicard_id)
            );
            digiCardIds = helper.removeDuplicates(digiCardIds);

            let digicardDetails = digiCardIds.map(dId => {
                let dList = DigicardList.find(dList => dList.digi_card_id === dId);
                return dList
                    ? {
                        digicard_id: dList.digi_card_id,
                        digicard_name: dList.display_name ? dList.display_name : dList.digi_card_title
                    }
                    : null;
            }).filter(Boolean);

            finalTopicAndCards.push({
                topic_id: topic.topic_id,
                topic_name: topic.display_name,
                digicard_list: digicardDetails
            });
        }
        return finalTopicAndCards;
    } catch (error) {
        return { status: error.status || 500, message: error.message || "An error occurred" };
    }
};

exports.changeDigicardLockStatus = async (request) => {
    if (!request?.data?.client_class_id || !request?.data?.section_id || !request?.data?.subject_id ||
        !request?.data?.chapter_id || !request?.data?.digicard_stage || !request?.data?.topics || !request?.data?.due_date) {
        throw { status: 400, message: constant.messages.INVALID_REQUEST_FORMAT };
    }

    if (!["Pre", "Post"].includes(request.data.digicard_stage)) {
        throw { status: 400, message: constant.messages.INVALID_REQUEST_FORMAT };
    }

    try {
        const teacherActivityDetails = await teachingActivityRepository.fetchTeachingActivity2(request);
        let individualChapterData = [{
            chapter_id: request.data.chapter_id,
            chapter_locked: "No",
            pre_learning: { archivedTopics: [], unlocked_digicard: {} },
            post_learning: { archivedTopics: [], unlocked_digicard: [] }
        }];

        if (request.data.digicard_stage === "Pre") {
            individualChapterData[0].pre_learning.unlocked_digicard = {
                topics: request.data.topics,
                due_date: {
                    yyyy_mm_dd: request.data.due_date,
                    dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.due_date)
                }
            };
        } else {
            individualChapterData[0].post_learning.unlocked_digicard.push({
                topics: request.data.topics,
                due_date: {
                    yyyy_mm_dd: request.data.due_date,
                    dd_mm_yyyy: helper.change_dd_mm_yyyy(request.data.due_date)
                }
            });
        }

        if (teacherActivityDetails.Items.length > 0) {
            let allChapterData = teacherActivityDetails.Items[0].chapter_data;
            let chapterData = allChapterData.find(e => e.chapter_id === request.data.chapter_id);

            if (chapterData) {
                if (request.data.digicard_stage === "Pre" && chapterData.pre_learning?.unlocked_digicard?.topics) {
                    throw { status: 400, message: constant.messages.DIGICARD_UNLOCKED_ALREADY };
                }

                if (request.data.digicard_stage === "Post" && chapterData.post_learning?.unlocked_digicard?.length > 0) {
                    let topics = chapterData.post_learning.unlocked_digicard.flatMap(e => e.topics);
                    let existingTopics = topics.filter(e => request.data.topics.some(a => a.topic_id === e.topic_id));

                    if (existingTopics.length > 0) {
                        const postTopicResponse = await topicRepository.fetchPostTopicData2({ postlearning_topic_id: existingTopics.map(e => e.topic_id) });
                        let topicNames = postTopicResponse.Items.map(e => e.topic_title).join(", ");
                        throw { status: 400, message: constant.messages.UNABLE_TO_UNLOCK_DIGICARDS.replace("**REPLACE**", topicNames) };
                    }
                    chapterData.post_learning.unlocked_digicard.push({ topics: request.data.topics, due_date: request.data.due_date });
                } else {
                    Object.assign(chapterData, individualChapterData[0]);
                }
            } else {
                allChapterData.push(individualChapterData[0]);
            }
            request.data.activity_id = teacherActivityDetails.Items[0].activity_id;
            request.data.chapter_data = allChapterData;
            await teachingActivityRepository.updateTeachingActivity2(request);
        } else {
            request.data.chapter_data = individualChapterData;
            await teachingActivityRepository.addTeachingActivity2(request);
        }
        return { status: 200, message: request.data.digicard_stage === "Pre" ? constant.messages.PRE_DIGICARDS_UNLOCKED : constant.messages.POST_DIGICARDS_UNLOCKED };
    } catch (error) {
        throw error.status ? error : { status: 400, message: constant.messages.ERROR };
    }
};


exports.fetchAllPostTopicsAndItsDigicards = async (request) => {
    try {
        const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
        if (!schoolDataRes.Items[0]?.post_quiz_config) {
            throw { status: 400, message: constant.messages.SCHOOL_DOESNT_HAVE_POSTQUIZ_CONFIG };
        }

        const activityTeachRes = await teachingActivityRepository.fetchTeachingActivity2(request);
        let chapterActivity = activityTeachRes.Items.length > 0
            ? activityTeachRes.Items[0].chapter_data.filter(ce => ce.chapter_id === request.data.chapter_id)
            : [];

        let archivedTopics = chapterActivity.length > 0 ? chapterActivity[0].post_learning.archivedTopics : [];
        let unlockedDetails = (chapterActivity.length > 0 && chapterActivity[0].post_learning.unlocked_digicard)
            ? chapterActivity[0].post_learning.unlocked_digicard
            : [];

        let activeTopics = await helper.getDifferenceValueFromTwoArray(request.data.topicList, archivedTopics);

        if (request.data.topicList.length > 0) {
            if (schoolDataRes.Items[0].post_quiz_config.choose_topic === "Yes") {
                if (activeTopics.length > 0) {
                    let unlockedTopicCards = [];

                    for (const unDetails of unlockedDetails) {
                        for (const topDigi of unDetails.topics) {
                            if (activeTopics.includes(topDigi.topic_id)) {
                                unlockedTopicCards.push(topDigi.topic_id);
                            }
                        }
                    }

                    let toFetchTopicsIds = unlockedTopicCards.length > 0 ? unlockedTopicCards : activeTopics;
                    let fetchBulkTopicReq = {
                        IdArray: toFetchTopicsIds,
                        fetchIdName: "topic_id",
                        TableName: TABLE_NAMES.upschool_topic_table
                    };

                    const topicDataRes = await commonRepository.fetchBulkData2(fetchBulkTopicReq);

                    if (unlockedTopicCards.length > 0) {
                        let unlockedTopicNames = topicDataRes.Items.map(errTop =>
                            errTop.display_name || errTop.topic_title
                        ).join(", ");

                        throw { status: 400, message: constant.messages.TOPICS_ALREADY_UNLOCKED.replace("**REPLACE**", unlockedTopicNames) };
                    } else {
                        return await exports.getPrePostTopicsAndItsDigicards(topicDataRes);
                    }
                } else {
                    throw { status: 400, message: constant.messages.NO_ACTIVE_TOPICS };
                }
            } else {
                throw { status: 400, message: constant.messages.PERMISSION_DENIED };
            }
        } else {
            if (schoolDataRes.Items[0].post_quiz_config.choose_topic === "No") {
                if (unlockedDetails.length > 0) {
                    throw { status: 400, message: constant.messages.DIGICARD_UNLOCKED_ALREADY };
                } else {
                    const chapterDataResponse = await chapterRepository.fetchChapterByID2(request);
                    let postLearningTopicIds = chapterDataResponse.Items.length > 0
                        ? chapterDataResponse.Items[0].postlearning_topic_id
                        : [];

                    let topicsActive = await helper.getDifferenceValueFromTwoArray(postLearningTopicIds, archivedTopics);

                    if (topicsActive.length > 0) {
                        let fetchBulkTopicReq = {
                            IdArray: topicsActive,
                            fetchIdName: "topic_id",
                            TableName: TABLE_NAMES.upschool_topic_table
                        };

                        const topicDataRes = await commonRepository.fetchBulkData2(fetchBulkTopicReq);
                        return await exports.getPrePostTopicsAndItsDigicards(topicDataRes);
                    } else {
                        throw { status: 400, message: constant.messages.NO_ACTIVE_TOPICS };
                    }
                }
            } else {
                throw { status: 400, message: constant.messages.NO_TOPIC_IS_SELECTED };
            }
        }
    } catch (error) {
        throw error.status ? error : { status: 500, message: "Internal Server Error" };
    }
};

exports.getPrePostTopicsAndItsDigicards = async (topicData_res) => {
    try {
        let topicConceptsIds = topicData_res.Items.flatMap(topData => topData.topic_concept_id);
        topicConceptsIds = [...new Set(topicConceptsIds)];
        let fetchBulkConceptReq = {
            IdArray: topicConceptsIds,
            fetchIdName: "concept_id",
            TableName: TABLE_NAMES.upschool_concept_blocks_table
        };
        const conceptDataRes = await commonRepository.fetchBulkData2(fetchBulkConceptReq);
        let digicardsIds = conceptDataRes.Items.flatMap(conData => conData.concept_digicard_id);
        digicardsIds = [...new Set(digicardsIds)];

        let fetchBulkDigiReq = {
            IdArray: digicardsIds,
            fetchIdName: "digi_card_id",
            TableName: TABLE_NAMES.upschool_digi_card_table,
            projectionExp: ["digi_card_id", "digi_card_title", "display_name"]
        };
        const digiDataRes = await commonRepository.fetchBulkDataWithProjection5(fetchBulkDigiReq);
        return await exports.createTopicsAndItsCardsList(topicData_res.Items, conceptDataRes.Items, digiDataRes.Items);
    } catch (error) {
        return { status: error.status || 500, message: error.message || "An error occurred" };
    }
};

exports.getExtensionOfDigicard = async (request) => {
    try {
        const digiExtensionResponse = await digicardExtension.getExtensionDetails2(request);

        if (digiExtensionResponse.Items.length === 0) {
            return digiExtensionResponse;
        }

        const extensions = digiExtensionResponse.Items[0].extensions;
        for (let i = 0; i < extensions.length; i++) {
            const extFile = extensions[i].ext_file;
            extensions[i].ext_file_url = extFile.includes("digicard_extension/")
                ? await s3Services.getS3SignedUrl(extFile)
                : "N.A.";
        }
        return digiExtensionResponse;
    } catch (error) {
        throw error;
    }
};
