const { blueprintRepository, questionRepository, commonRepository, testQuestionPaperRepository, groupRepository, subjectRepository, unitRepository, chapterRepository, topicRepository, conceptRepository } = require("../repository")
const { TABLE_NAMES } = require('../constants/tables');
const { messages, common, questionKeys, requestData, status } = require('../constants/constant');
const { isEmptyArray, removeDuplicates, getAnswerContentFileUrl, removeExistObject } = require('../helper/helper');

exports.getBlueprintByItsId = async (request) => {
    try {
        const singleBlueprint_res = await blueprintRepository.fetchBlueprintById2(request);

        if (isEmptyArray(singleBlueprint_res.Items)) {
            throw new Error(messages.NO_DATA);
        }

        let questionSection = JSON.parse(JSON.stringify(singleBlueprint_res.Items[0].sections));
        let catIds = [];
        let skillIds = [];

        for (const section of questionSection) {
            catIds.push(...section.questions.map(ques => ques.category_id));
            skillIds.push(...section.questions.map(ques => ques.cognitive_id));
        }

        catIds = removeDuplicates(catIds);
        skillIds = removeDuplicates(skillIds);

        const [cateData_res, cognData_res] = await Promise.all([
            commonRepository.fetchBulkDataWithProjection5({
                IdArray: catIds,
                fetchIdName: requestData.categoryId,
                TableName: TABLE_NAMES.upschool_content_category,
                projectionExp: [requestData.categoryId, requestData.categoryName],
            }),
            commonRepository.fetchBulkDataWithProjection5({
                IdArray: skillIds,
                fetchIdName: requestData.cognitiveId,
                TableName: TABLE_NAMES.upschool_cognitive_skill,
                projectionExp: [requestData.cognitiveId, requestData.cognitiveName],
            }),
        ]);

        // Set final blueprint data
        const finalBlueprintData = await exports.setBlueprintFinalData(
            questionSection,
            cateData_res,
            cognData_res
        );
        singleBlueprint_res.Items[0].sections = finalBlueprintData;
        return singleBlueprint_res;
    } catch (error) {
        throw error;
    }
};

exports.fetchBlueprintDetailsBasedonId = async (request) => {
    const testData = await testQuestionPaperRepository.fetchTestQuestionPaperByID2(request);
    const questions = testData.Items[0].questions.map((question) => question.question_id).flat(1)
    const uniqueQuestionArr = [...new Set(questions)];
    const conceptData = await conceptRepository.fetchConceptDatabasedonQuestionID3(uniqueQuestionArr)
    const conceptids = conceptData.map(c => c.concept_id)
    const TpoicData = await topicRepository.fetchTopicDatabasedonQuestionID3(conceptids)
    const blueprintData = conceptData.map((concept) => {
        const commonItems = uniqueQuestionArr.filter(item => concept.concept_question_id.includes(item)).length;
        return { numOfQuestions: commonItems, concept: concept.display_name, conceptId: concept.concept_id }

    })
    TpoicData.map((topic) => {
        topic.concepts = [];
        blueprintData.map((data) => {
            if (topic.topic_concept_id.includes(data.conceptId)) {
                topic.concepts.push(data);
            }
        })
    })
    request.data.subject_id = testData.Items[0].subject_id
    const subject_res = await subjectRepository.getSubjetById2(request);
    let subject_unit_id = subject_res.Items[0].subject_unit_id;

    const unit_res = await unitRepository.fetchUnitData2({ subject_unit_id });

    const unit_chapter_id = [
        ...new Set(unit_res.flatMap((e) => e.unit_chapter_id)),
    ];
    const chapter_res = await chapterRepository.fetchBulkChaptersIDName2({
        unit_chapter_id,
    });
    const topicIds = chapter_res.reduce((acc, chapter) => {
        return acc.concat(chapter.prelearning_topic_id, chapter.postlearning_topic_id);
    }, []);

    const uniqueTopicIds = [...new Set(topicIds)];

    const Topic_res = await topicRepository.fetchBulkTopicsIDNameBlueprint({
        uniqueTopicIds,
    });
    Topic_res.map((topic) => {
        topic.concepts = [];
        blueprintData.map((data) => {
            if (topic.topic_concept_id.includes(data.conceptId)) {
                topic.concepts.push(data);
            }
        })
    })


    return { Topic_res }
}

exports.setBlueprintFinalData = async (questionSection, catData, skillData) => {

    async function setCatCog(j) {
        if (j >= questionSection.length) {
            return questionSection;
        }

        async function questionLoop(k) {
            if (k >= questionSection[j].questions.length) {
                return;
            }

            const question = questionSection[j].questions[k];

            const category = catData.find(cat => cat.category_id === question.category_id);
            question.question_category = category ? category.category_name : common.NA;

            const skill = skillData.find(co => co.cognitive_id === question.cognitive_id);
            question.cognitive_skill = skill ? skill.cognitive_name : common.NA;

            await questionLoop(k + 1);
        }

        await questionLoop(0);
        return await setCatCog(j + 1);
    }

    return await setCatCog(0);
};

exports.fetchBlueprintQuestions = async (request) => {
    try {
        const blueprint_res = await blueprintRepository.fetchBlueprintById2(request);
        if (isEmptyArray(blueprint_res?.Items)) {
            return null;
        }


        /** FETCH CHAPTER DATA **/
        const fetchBulkChapReq = {
            IdArray: request.data.chapter_ids,
            fetchIdName: requestData.chapterId,
            TableName: TABLE_NAMES.upschool_chapter_table,
            projectionExp: [requestData.chapterId, requestData.chapterStatus, requestData.postLearningTopicId, requestData.preLearningTopicId]
        };

        const chapData_res = await commonRepository.fetchBulkDataWithProjection5(fetchBulkChapReq);

        let topicIds = [];
        chapData_res.forEach(cItem => {
            if (cItem.chapter_status === status.active) {
                topicIds = topicIds.concat(cItem.postlearning_topic_id, cItem.prelearning_topic_id);
            }
        });

        topicIds = await removeDuplicates(topicIds);

        /** FETCH TOPIC DATA **/
        const fetchBulkTopReq = {
            IdArray: topicIds,
            fetchIdName: requestData.topicId,
            TableName: TABLE_NAMES.upschool_topic_table,
            projectionExp: [requestData.topicId, requestData.topicStatus, requestData.topicConceptId]
        };

        const topicData_res = await commonRepository.fetchBulkDataWithProjection5(fetchBulkTopReq);

        let conceptIds = [];
        topicData_res.forEach(topItem => {
            if (topItem.topic_status === status.active) {
                conceptIds = conceptIds.concat(topItem.topic_concept_id);
            }
        });

        conceptIds = await removeDuplicates(conceptIds);

        const fetchBulkConReq = {
            IdArray: conceptIds,
            fetchIdName: requestData.conceptId,
            TableName: TABLE_NAMES.upschool_concept_blocks_table,
            projectionExp: [requestData.conceptId, requestData.conceptQuestionId, requestData.conceptStatus]
        };

        const conceptData_res = await commonRepository.fetchBulkDataWithProjection5(fetchBulkConReq);

        let workQuesIds = [];
        conceptData_res.forEach(conItem => {
            if (conItem.concept_status === status.active && conItem.concept_question_id) {
                workQuesIds = workQuesIds.concat(conItem.concept_question_id);
            }
        });

        workQuesIds = await removeDuplicates(workQuesIds);

        const fetchBulkquesReq = {
            IdArray: workQuesIds,
            fetchIdName: requestData.questionId,
            TableName: TABLE_NAMES.upschool_question_table,
            questionStatus: requestData.publish,
            sourceIds: request.data.source_ids,
            projectionExp: [
                requestData.questionId, requestData.answersOfQuestion, requestData.appearsIn, requestData.cognitiveSkill, requestData.difficultyLevel,
                requestData.marks, requestData.questionActiveStatus, requestData.questionCategory, requestData.questionContent,
                requestData.questionSource, requestData.questionStatus, requestData.questionType
            ]
        };

        const questionsData_res = await questionRepository.fetchBulkQuestionsWithPublishStatusAndProjection2(fetchBulkquesReq);

        const filteredQuestionData = questionsData_res.Items.filter(qtn => request.data.source_ids.includes(qtn.question_source));

        const priorities = await checkPriorityQuestions(request.data.question_details);

        const questionPaper = await exports.createQuestionPaper(
            priorities,
            request,
            blueprint_res.Items[0],
            chapData_res.Items,
            topicData_res.Items,
            conceptData_res.Items,
            filteredQuestionData
        );

        return questionPaper;
    } catch (error) {
        throw new Error(error.message || messages.BLUEPRINT_QUESTIONS_FETCH_FAILED);
    }
};

exports.createQuestionPaper = async (priorities, request, blueprint, chapterData, topicData, conceptData, questionData) => {

    let responseData = JSON.parse(JSON.stringify(request.data.question_details));
    let reqSection = request.data.question_details;
    let blueSection = blueprint.sections;

    let exitingQuesIds = [];

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < priorities.length; j++) {
            let secPos = priorities[j].sec;
            let quePos = priorities[j].que;

            if (priorities[j].qStatus === common.No) {
                if (priorities[j].pre === 0) {
                    try {
                        const conAvailData = await exports.getConceptAvailQuestions(reqSection[secPos].questions[quePos].concept_ids, conceptData, questionData);
                        const quesObjData = await exports.getResQuestionObj(conAvailData, blueSection[secPos].questions[quePos], exitingQuesIds);

                        responseData[secPos].questions[quePos] = quesObjData.quesObj;
                        exitingQuesIds = quesObjData.questionExistId;
                        priorities[j].qStatus = common.Yes;
                    } catch (error) {
                        throw error;
                    }
                }
                else if (priorities[j].pre === 1) {
                    try {
                        const topAvailData = await exports.getTopicsAvailQuestions(reqSection[secPos].topic_ids, topicData, conceptData, questionData);
                        const quesTopObjData = await exports.getResQuestionObj(topAvailData, blueSection[secPos].questions[quePos], exitingQuesIds);

                        responseData[secPos].questions[quePos] = quesTopObjData.quesObj;
                        exitingQuesIds = quesTopObjData.questionExistId;
                        priorities[j].qStatus = common.Yes;
                    } catch (error) {
                        throw error;
                    }
                }
                else if (priorities[j].pre === 2) {
                    try {
                        const quesObjChapData = await exports.getResQuestionObj(questionData, blueSection[secPos].questions[quePos], exitingQuesIds);

                        responseData[secPos].questions[quePos] = quesObjChapData.quesObj;
                        exitingQuesIds = quesObjChapData.questionExistId;
                        priorities[j].qStatus = common.Yes;
                    } catch (error) {
                        throw error;
                    }
                }
            }
        }
    }

    return responseData;
};

exports.getConceptAvailQuestions = async (conceptId, conceptData, questionDatas) => {
    let avalQuestion = [];

    for (const concept of conceptId) {
        let conceptBlock = conceptData.filter(con => con.concept_id === concept.value);

        if (!isEmptyArray(conceptBlock) && conceptBlock[0].concept_question_id) {
            for (const cq of conceptBlock[0].concept_question_id) {
                let singleQues = questionDatas.find(ques => ques.question_id === cq);
                if (singleQues !== undefined) {
                    avalQuestion.push(singleQues);
                }
            }
        }
    }

    return avalQuestion;
};

exports.getTopicsAvailQuestions = async (topicId, topicData, conceptData, questionDatas) => {
    let avalConcept = [];
    let avalConIds = [];

    for (const topic of topicId) {
        const foundTopic = topicData.filter(con => con.topic_id === topic.value);
        if (!isEmptyArray(foundTopic)) {
            for (const tc of foundTopic[0].topic_concept_id) {
                const singleCon = conceptData.find(cons => cons.concept_id === tc);
                if (singleCon) {
                    avalConcept.push(singleCon);
                    avalConIds.push({ value: tc });
                }
            }
        }
    }

    return await exports.getConceptAvailQuestions(avalConIds, avalConcept, questionDatas);
};

exports.getResQuestionObj = async (avalQues_data, blueQues, questionExistId) => {
    let endRes = {
        quesObj: common.NA,
        questionExistId: []
    };

    let getQuestion = blueQues.cognitive_id !== common.NA ?
        avalQues_data.filter(Qs => Qs.question_category === blueQues.category_id &&
            Qs.cognitive_skill === blueQues.cognitive_id &&
            Qs.difficulty_level === blueQues.difficulty_level &&
            Number(Qs.marks) === Number(blueQues.marks) &&
            Qs.question_type === blueQues.question_type) :
        avalQues_data.filter(Qs => Qs.question_category === blueQues.category_id &&
            Qs.difficulty_level === blueQues.difficulty_level &&
            Number(Qs.marks) === Number(blueQues.marks) &&
            Qs.question_type === blueQues.question_type);

    getQuestion = await removeExistObject(questionExistId, getQuestion, requestData.questionId);

    if (!isEmptyArray(getQuestion) && (!questionExistId.includes(getQuestion[0].question_id))) {
        let contUrl = common.NA;

        if (blueQues.question_type === questionKeys.objective) {
            try {
                contUrl = await getAnswerContentFileUrl(getQuestion[0].answers_of_question);
            } catch (curlErr) {
                console.log(curlErr);
            }
        }

        questionExistId.push(getQuestion[0].question_id);
        endRes = {
            quesObj: {
                question_name: blueQues.question_name,
                question_type: blueQues.question_type,
                marks: blueQues.marks,
                difficulty_level: blueQues.difficulty_level,
                question_id: getQuestion[0].question_id,
                question_content: getQuestion[0].question_content,
                answers_of_question: contUrl
            },
            questionExistId: questionExistId
        };
    } else {
        endRes = {
            quesObj: {
                question_name: blueQues.question_name,
                question_type: blueQues.question_type,
                marks: blueQues.marks,
                difficulty_level: blueQues.difficulty_level,
                question_id: common.NA,
                question_content: common.NA,
                answers_of_question: common.NA
            },
            questionExistId: questionExistId
        };
    }

    return endRes;
};

exports.getAllBluePrints = async (request) => await blueprintRepository.fetchActiveBluePrints2(request)

