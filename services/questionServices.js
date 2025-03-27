const chapterServices = require("../services/chapterServices");
const { schoolRepository, chapterRepository, topicRepository, teachingActivityRepository, conceptRepository, groupRepository } = require("../repository")
const { prePostConstans, messages, common, commonConditionValue } = require('../constants/constant');
const { isEmptyArray, removeDuplicates } = require('../helper/helper');

exports.fetchAvailableQuestions = async function (request) {
    try {
        const schoolDetails = await schoolRepository.getSchoolDetailsById2(request);
        const teacherActivityDetails = await teachingActivityRepository.fetchTeachingActivity2(request);
        const chapterResponse = await chapterRepository.fetchChapterByID2(request);

        if (isEmptyArray(chapterResponse.Items)) {
            throw new Error(messages.CHAPTER_COMBO_DOESNT_EXISTS);
        }

        const chapterData = chapterResponse.Items[0];

        if (request.data.test_stage === common.Pre) {
            let preTopicData = await topicRepository.fetchPreTopicData2(chapterData);
            const prePostType = prePostConstans.preLearning;
            const preQuizConfig = schoolDetails.Items[0].pre_quiz_config;
            const finalPreTopicData = await chapterServices.appendPreTopicsArchivedStatus4(
                request,
                teacherActivityDetails,
                preTopicData,
                prePostType
            );

            const topicConceptIds = finalPreTopicData
                .filter(e => e.isArchived === common.No)
                .flatMap(e => e.topic_concept_id);

            return await exports.fetchCountofQuestions2(request, finalPreTopicData, preQuizConfig, topicConceptIds);
        }

        if (request.data.test_stage === common.Post) {
            if (isEmptyArray(request.data.topics)) {
                throw new Error(messages.NO_TOPICS_SELECTED);
            }

            const postTopicData = await topicRepository.fetchPostTopicData2({ postlearning_topic_id: request.data.topics });

            const postPostType = prePostConstans.postLearning;
            const postQuizConfig = schoolDetails.Items[0].post_quiz_config;

            const finalPostTopicData = await chapterServices.appendPostTopicsArchivedStatus3(
                request,
                teacherActivityDetails,
                postTopicData,
                postPostType
            );

            const topicConceptIds = finalPostTopicData
                .filter(e => e.isArchived === common.No)
                .flatMap(e => e.topic_concept_id);

            return await exports.fetchCountofQuestions2(request, finalPostTopicData, postQuizConfig, topicConceptIds);
        }

        throw new Error(messages.INVALID_REQUEST_FORMAT);
    } catch (error) {
        throw error;
    }
};

exports.fetchCountofQuestions2 = async (request, finalPreTopicData, pre_post_quiz_config, topic_concept_id) => {
    try {
        const concept_response = await conceptRepository.fetchConceptData3({ topic_concept_id });

        switch (request.data.quiz_type) {
            case commonConditionValue.automated:

                let basic_groups = [];
                let intermediate_groups = [];
                let advanced_groups = [];

                finalPreTopicData.forEach((e) => {
                    if (e.isArchived === common.No) {
                        e.topic_concept_id.forEach((f) => {
                            concept_response.forEach((a) => {
                                if (a.concept_id === f) {
                                    basic_groups.push(...a.concept_group_id.basic);
                                    intermediate_groups.push(...a.concept_group_id.intermediate);
                                    advanced_groups.push(...a.concept_group_id.advanced);
                                }
                            });
                        });
                    }
                });

                basic_groups = await exports.processGroups(basic_groups);
                intermediate_groups = await exports.processGroups(intermediate_groups);
                advanced_groups = await exports.processGroups(advanced_groups);

                const totalNoOfQuestions = exports.calculateMatrix(
                    basic_groups, intermediate_groups, advanced_groups, pre_post_quiz_config
                );

                return {
                    minNoOfQuestions: pre_post_quiz_config.min_qn_at_chapter_level,
                    totalNoOfQuestions
                };

            case commonConditionValue.express:
                let topicData = [];

                await Promise.all(finalPreTopicData.map(async (e) => {
                    if (e.isArchived === common.No) {
                        let basic_groups = [];
                        let intermediate_groups = [];
                        let advanced_groups = [];

                        e.topic_concept_id.forEach((f) => {
                            concept_response.forEach((a) => {
                                if (a.concept_id === f) {
                                    basic_groups.push(...a.concept_group_id.basic);
                                    intermediate_groups.push(...a.concept_group_id.intermediate);
                                    advanced_groups.push(...a.concept_group_id.advanced);
                                }
                            });
                        });

                        basic_groups = await exports.processGroups(basic_groups);
                        intermediate_groups = await exports.processGroups(intermediate_groups);
                        advanced_groups = await exports.processGroups(advanced_groups);

                        const totalNumOfQuestions = exports.calculateMatrix(
                            basic_groups, intermediate_groups, advanced_groups, pre_post_quiz_config
                        );

                        topicData.push({
                            topic_name: e.display_name,
                            topic_id: e.topic_id,
                            totalNumOfQuestions
                        });
                    }
                }));

                return {
                    minNoOfQuestions: pre_post_quiz_config.min_qn_at_topic_level,
                    topicData
                };

            case commonConditionValue.manual:
                let topicArray = [];

                await Promise.all(finalPreTopicData.map(async (e) => {
                    let conceptData = [];

                    await Promise.all(e.topic_concept_id.map(async (f) => {
                        await Promise.all(concept_response.map(async (a) => {
                            if (a.concept_id === f) {
                                a.concept_group_id.basic = await exports.processGroups(a.concept_group_id.basic);
                                a.concept_group_id.intermediate = await exports.processGroups(a.concept_group_id.intermediate);
                                a.concept_group_id.advanced = await exports.processGroups(a.concept_group_id.advanced);

                                const totalNumOfQuestions = exports.calculateMatrix(
                                    a.concept_group_id.basic,
                                    a.concept_group_id.intermediate,
                                    a.concept_group_id.advanced,
                                    pre_post_quiz_config
                                );

                                conceptData.push({
                                    concept_id: a.concept_id,
                                    concept_name: a.display_name,
                                    totalNumOfQuestions
                                });
                            }
                        }));
                    }));

                    if (e.isArchived === common.No) {
                        topicArray.push({
                            topic_name: e.display_name,
                            topic_id: e.topic_id,
                            conceptData
                        });
                    }
                }));

                return {
                    minNoOfQuestions: pre_post_quiz_config.min_qn_at_topic_level,
                    topicData: topicArray
                };

            default:
                throw new Error(messages.INVALID_REQUEST_FORMAT);
        }
    } catch (error) {
        throw error;
    }
};

exports.processGroups = async (groupArray) => {
    groupArray = removeDuplicates(groupArray);

    if (isEmptyArray(groupArray)) return [];

    const groupDetails = await groupRepository.fetchGroupsData2({ group_array: groupArray });

    const questionIdCount = new Map();

    groupDetails.forEach(group => {
        group.group_question_id.forEach(questionId => {
            questionIdCount.set(questionId, (questionIdCount.get(questionId) || 0) + 1);
        });
    });

    return groupDetails
        .filter(group => group.group_question_id.some(questionId => questionIdCount.get(questionId) === 1))
        .map(group => group.group_id);
};


exports.calculateMatrix = (basic_groups, intermediate_groups, advanced_groups, pre_post_quiz_config) => {
    const { Basic, Intermediate, Advanced } = pre_post_quiz_config.test_matrix;

    const basic_count = Math.round((basic_groups.length / 100) * Basic);
    const intermediate_count = Math.round((intermediate_groups.length / 100) * Intermediate);
    const advance_count = Math.round((advanced_groups.length / 100) * Advanced);

    return basic_count + intermediate_count + advance_count;
};

exports.calculateCountUsingMatrix = function (basic_groups, intermediate_groups, advanced_groups, pre_post_quiz_config, callback) {
    let basic_percent = pre_post_quiz_config.test_matrix.Basic
    let intermediate_percent = pre_post_quiz_config.test_matrix.Intermediate
    let advanced_percent = pre_post_quiz_config.test_matrix.Advanced

    let basic_count = Math.round((basic_groups.length / 100) * basic_percent);
    let intermediate_count = Math.round((intermediate_groups.length / 100) * intermediate_percent);
    let advance_count = Math.round((advanced_groups.length / 100) * advanced_percent);

    let questionsCount = {
        basic_count,
        intermediate_count,
        advance_count
    }

    callback(0, questionsCount);
}

exports.calculateCountUsingMatrix2 = (basic_groups, intermediate_groups, advanced_groups, pre_post_quiz_config) => {
    const { Basic, Intermediate, Advanced } = pre_post_quiz_config.test_matrix;

    const basic_count = Math.round((basic_groups.length / 100) * Basic);
    const intermediate_count = Math.round((intermediate_groups.length / 100) * Intermediate);
    const advance_count = Math.round((advanced_groups.length / 100) * Advanced);

    return { basic_count, intermediate_count, advance_count };
};