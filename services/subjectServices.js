const { subjectRepository, unitRepository, teacherRepository, chapterRepository, commonRepository } = require("../repository")
const { common, messages, requestData } = require('../constants/constant');
const { TABLE_NAMES } = require('../constants/tables');
const { isEmptyArray } = require("../helper/helper");

exports.getUnitsandChaptersBasedonSubjects2 = async (request) => {
    const teacherInfoRes = await teacherRepository.fetchTeacherByID2(request);

    if (isEmptyArray(teacherInfoRes.Items)) {
        return { statusCode: 400, message: messages.INVALID_TEACHER };
    }

    const allocationCheck = teacherInfoRes.Items[0].teacher_info.filter((e) =>
        e.client_class_id === request.data.client_class_id &&
        e.section_id === request.data.section_id &&
        e.subject_id === request.data.subject_id &&
        e.info_status === common.Active
    );

    if (isEmptyArray(allocationCheck)) {
        return { statusCode: 400, message: messages.SUBJECT_ISNOT_ALLOCATE_TO_TEACHER };
    }

    const teacherActivityDetailsRes = await teacherRepository.fetchTeacherActivityDetails2(request);
    const subjectFetchRes = await subjectRepository.getSubjetById2(request);

    if (isEmptyArray(subjectFetchRes.Items)) {
        return { statusCode: 400, message: messages.INVALID_SUBJECT_ID };
    }

    if (isEmptyArray(subjectFetchRes.Items[0].subject_unit_id)) {
        return subjectFetchRes;
    }

    const unitFetchRes = await unitRepository.fetchUnitData2(subjectFetchRes.Items[0]);
    let chapterIds = [...new Set(unitFetchRes.flatMap((unit) => unit.unit_chapter_id))];

    if (isEmptyArray(chapterIds)) {
        return;
    }

    const chapterFetchRes = await chapterRepository.fetchChapterData2({ unit_chapter_id: chapterIds });

    chapterFetchRes.forEach((chapter) => {
        const chapterLockStatus = teacherActivityDetailsRes.Items[0]?.chapter_data?.find(
            (item) => item.chapter_id === chapter.chapter_id
        );
        chapter.chapter_locked = chapterLockStatus && chapterLockStatus.chapter_locked === common.No ? common.No : common.Yes;
    });

    unitFetchRes.forEach((unit) => {
        if (!unit.unit_chapter_data)
            unit.unit_chapter_data = []
        unit.unit_chapter_data.push(chapterFetchRes.filter((chapter) =>
            unit.unit_chapter_id.includes(chapter.chapter_id)
        ));
    });
    return unitFetchRes;
};

exports.getExpressTopicsAndQuestionCount2 = async (request) => {

    const chapterDataRes = await chapterRepository.fetchChapterByID2(request);

    if (!chapterDataRes.Items || isEmptyArray(chapterDataRes.Items)) {
        return { statusCode: 404, message: messages.CHAPTER_NOT_FOUND };
    }

    const prelearningTopicIds = chapterDataRes.Items[0].prelearning_topic_id;

    if (isEmptyArray(prelearningTopicIds)) {
        return { statusCode: 200, data: [] };
    }

    const fetchBulkReq = {
        IdArray: prelearningTopicIds,
        fetchIdName: requestData.topicId,
        isActiveFieldName: requestData.topicStatus,
        isActive: common.Active,
        TableName: TABLE_NAMES.upschool_topic_table,
    };

    const topicDataRes = await commonRepository.getBulkDataUsingIndexWithActiveStatus2(fetchBulkReq);

    if (!topicDataRes.Items || isEmptyArray(topicDataRes.Items)) {
        return { statusCode: 404, message: messages.TOPIC_NOT_FOUND };
    }

    const topicConceptsIds = [...new Set(topicDataRes.Items.flatMap(item => item.topic_concept_id))];

    if (isEmptyArray(topicConceptsIds)) {
        return { statusCode: 200, data: [] };
    }

    const fetchBulkConceptReq = {
        IdArray: topicConceptsIds,
        fetchIdName: requestData.conceptId,
        TableName: TABLE_NAMES.upschool_concept_blocks_table,
    };

    const conceptDataRes = await commonRepository.fetchBulkData2(fetchBulkConceptReq);

    if (!conceptDataRes.Items || isEmptyArray(conceptDataRes.Items)) {
        return { statusCode: 404, message: messages.CONCEPT_NOT_FOUND };
    }
    return { statusCode: 200, data: conceptDataRes.Items };
};
