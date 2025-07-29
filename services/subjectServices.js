const { subjectRepository, unitRepository, teacherRepository, chapterRepository, commonRepository } = require("../repository")
const constant = require('../constants/constant');
const helper = require('../helper/helper');
const { TABLE_NAMES } = require('../constants/tables');

exports.getUnitsandChaptersBasedonSubjects = function (request, callback) {

    teacherRepository.fetchTeacherByID(request, async function (teacher_info_err, teacher_info_res) {
        if (teacher_info_err) {
            console.log(teacher_info_err);
            callback(teacher_info_err, teacher_info_res);
        } else {
            if (teacher_info_res.Items.length > 0) {
                console.log("teacher_info_res : ", teacher_info_res);

                let allocationCheck = teacher_info_res.Items[0].teacher_info.filter((e) => (e.client_class_id === request.data.client_class_id) && (e.section_id === request.data.section_id) && (e.subject_id === request.data.subject_id) && e.info_status === "Active");
                console.log("allocationCheck : ", allocationCheck);

                if (allocationCheck.length > 0) {
                    teacherRepository.fetchTeacherActivityDetails(request, async function (teacher_activity_details_err, teacher_activity_details_res) {
                        if (teacher_activity_details_err) {
                            console.log(teacher_activity_details_err);
                            callback(teacher_activity_details_err, teacher_activity_details_res);
                        } else {
                            console.log("teacher_activity_details_res.Items", teacher_activity_details_res.Items);


                            subjectRepository.getSubjetById(request, function (subject_fecth_err, subject_fetch_response) {
                                if (subject_fecth_err) {
                                    console.log(subject_fecth_err);
                                    response.message = subject_fecth_err;
                                    callback(response, subject_fetch_response);
                                } else {
                                    if (subject_fetch_response.Items.length > 0) {
                                        if (subject_fetch_response.Items[0].subject_unit_id.length > 0) {
                                            /** FETCH UNIT DATA **/
                                            unitRepository.fetchUnitData(subject_fetch_response.Items[0], function (unit_fecth_err, unit_fetch_response) {
                                                if (unit_fecth_err) {
                                                    console.log(unit_fecth_err);
                                                    callback(unit_fecth_err, unit_fetch_response);
                                                }
                                                else {
                                                    let chapter_ids = [];

                                                    function collectChapterId(i) {
                                                        if (i < unit_fetch_response.Items.length) {
                                                            unit_fetch_response.Items[i].unit_chapter_data = [];
                                                            chapter_ids = chapter_ids.concat(unit_fetch_response.Items[i].unit_chapter_id);
                                                            i++;
                                                            collectChapterId(i);
                                                        }
                                                        else {
                                                            console.log("UNIT CHAPTER ID");
                                                            chapter_ids = [...new Set(chapter_ids)];
                                                            console.log(chapter_ids);

                                                            if (chapter_ids.length > 0) {
                                                                chapterRepository.fetchChapterData({ unit_chapter_id: chapter_ids }, function (chapter_fecth_err, chapter_fetch_response) {
                                                                    if (chapter_fecth_err) {
                                                                        console.log(chapter_fecth_err);
                                                                        callback(chapter_fecth_err, chapter_fetch_response);
                                                                    }
                                                                    else {
                                                                        console.log("CHAPTER DATA : ", chapter_fetch_response);
                                                                        let chapterLockStatus;


                                                                        function checkLockStatus(j) {
                                                                            if (j < chapter_fetch_response.Items.length) {
                                                                                if (teacher_activity_details_res.Items.length > 0 && teacher_activity_details_res.Items[0].chapter_data.length > 0) {

                                                                                    chapterLockStatus = teacher_activity_details_res.Items[0].chapter_data.filter(ce => ce.chapter_id === chapter_fetch_response.Items[j].chapter_id);
                                                                                    console.log("chapterLockStatus  : ", chapterLockStatus);

                                                                                    chapter_fetch_response.Items[j].chapter_locked = (chapterLockStatus.length > 0 && chapterLockStatus[0].chapter_locked == "No") ? "No" : "Yes";
                                                                                    // chapter_fetch_response.Items[j].due_date = (chapterLockStatus.length > 0 && chapterLockStatus[0].chapter_locked == "No") ? chapterLockStatus[0].pre_learning.unlocked_digicard.due_date.dd_mm_yyyy : "dd_mm_yyyy";  
                                                                                } else {

                                                                                    chapter_fetch_response.Items[j].chapter_locked = "Yes";
                                                                                    // chapter_fetch_response.Items[j].due_date = "dd_mm_yyyy"; 
                                                                                }
                                                                                j++;
                                                                                checkLockStatus(j);
                                                                            }
                                                                            else {
                                                                                /** END OF LOCK STATUS **/
                                                                                console.log("CHAPTER WITH LOCKED STATUS : ", chapter_fetch_response);

                                                                                function loadChapterToUnit(k) {
                                                                                    if (k < unit_fetch_response.Items.length) {
                                                                                        /** HERE **/

                                                                                        let unit_chapter_data = chapter_fetch_response.Items.filter(e => (unit_fetch_response.Items[k].unit_chapter_id.filter(a => a === e.chapter_id)).length > 0);
                                                                                        console.log("unit_chapter_data : ", unit_chapter_data);

                                                                                        unit_fetch_response.Items[k].unit_chapter_data.push(unit_chapter_data);

                                                                                        k++;
                                                                                        loadChapterToUnit(k);
                                                                                    }
                                                                                    else {
                                                                                        /** END OF SET CHAPTER **/
                                                                                        callback(200, unit_fetch_response.Items);

                                                                                        /** END OF SET CHAPTER ***/
                                                                                    }
                                                                                }
                                                                                loadChapterToUnit(0)
                                                                                /** END OF LOCK STATUS **/
                                                                            }
                                                                        }
                                                                        checkLockStatus(0);

                                                                    }
                                                                })
                                                            }
                                                            else {
                                                                console.log("EMPTY CHAPTER DATA");
                                                            }
                                                        }
                                                    }
                                                    collectChapterId(0)
                                                }
                                            })
                                            /** END FETCH UNIT DATA **/
                                        }
                                        else {
                                            console.log("EMPTY UNIT");
                                            callback(0, subject_fetch_response);
                                        }
                                    }
                                    else {
                                        console.log(constant.messages.INVALID_SUBJECT_ID);
                                        callback(400, constant.messages.INVALID_SUBJECT_ID);
                                    }
                                }
                            })
                            // }else{
                            //     // All Chapters are Locked 
                            //     callback(200, "No Chapter Lock")
                            // }
                        }
                    })
                } else {
                    callback(400, constant.messages.SUBJECT_ISNOT_ALLOCATE_TO_TEACHER);
                }
            } else {
                callback(400, constant.messages.INVALID_TEACHER)
            }

        }
    })


};

exports.getUnitsandChaptersBasedonSubjects2 = async (request) => {

    const teacherInfoRes = await teacherRepository.fetchTeacherByID2(request);

    if (teacherInfoRes.Items.length === 0) {
        return { statusCode: 400, message: constant.messages.INVALID_TEACHER };
    }

    const allocationCheck = teacherInfoRes.Items[0].teacher_info.filter((e) =>
        e.client_class_id === request.data.client_class_id &&
        e.section_id === request.data.section_id &&
        e.subject_id === request.data.subject_id &&
        e.info_status === "Active"
    );

    if (allocationCheck.length === 0) {
        return { statusCode: 400, message: constant.messages.SUBJECT_ISNOT_ALLOCATE_TO_TEACHER };
    }

    const teacherActivityDetailsRes = await teacherRepository.fetchTeacherActivityDetails2(request);
    const subjectFetchRes = await subjectRepository.getSubjetById2(request);

    if (subjectFetchRes.Items.length === 0) {
        return { statusCode: 400, message: constant.messages.INVALID_SUBJECT_ID };
    }

    if (subjectFetchRes.Items[0].subject_unit_id.length === 0) {
        console.log("EMPTY UNIT");
        return subjectFetchRes;
    }

    const unitFetchRes = await unitRepository.fetchUnitData2(subjectFetchRes.Items[0]);
    let chapterIds = [...new Set(unitFetchRes.flatMap((unit) => unit.unit_chapter_id))];

    if (chapterIds.length === 0) {
        console.log("EMPTY CHAPTER DATA");
        return;
    }

    const chapterFetchRes = await chapterRepository.fetchChapterData2({ unit_chapter_id: chapterIds });

    chapterFetchRes.forEach((chapter) => {
        const chapterLockStatus = teacherActivityDetailsRes.Items[0]?.chapter_data?.find(
            (item) => item.chapter_id === chapter.chapter_id
        );
        chapter.chapter_locked = chapterLockStatus && chapterLockStatus.chapter_locked === "No" ? "No" : "Yes";
    });

    unitFetchRes.forEach((unit) => {
        if (!unit.unit_chapter_data)
            unit.unit_chapter_data = []
        unit.unit_chapter_data.push(chapterFetchRes.filter((chapter) =>
            unit.unit_chapter_id.includes(chapter.chapter_id)
        ));
        unit.unit_chapter_data[0]?.sort((a, b) =>
            a.display_name.localeCompare(b.display_name, undefined, { numeric: true, sensitivity: 'base' })
        );
        console.log("----", unit.unit_chapter_data);
    });

    return unitFetchRes;
};

exports.getExpressTopicsAndQuestionCount = function (request, callback) {
    chapterRepository.fetchChapterByID(request, async (chapterDataErr, chapterDataRes) => {
        if (chapterDataErr) {
            console.log(chapterDataErr);
            callback(chapterDataErr, chapterDataRes);
        }
        else {
            console.log("CHAPTER DATA");
            console.log(chapterDataRes.Items);
            if (chapterDataRes.Items[0].prelearning_topic_id.length > 0) {
                let fetchBulkReq = {
                    IdArray: chapterDataRes.Items[0].prelearning_topic_id,
                    fetchIdName: "topic_id",
                    isActiveFieldName: "topic_status",
                    isActive: "Active",
                    TableName: TABLE_NAMES.upschool_topic_table
                }

                commonRepository.getBulkDataUsingIndexWithActiveStatus(fetchBulkReq, async function (topicData_err, topicData_res) {
                    if (topicData_err) {
                        console.log(topicData_err);
                        callback(topicData_err, topicData_res);
                    } else {
                        console.log("TOPIC DATA");
                        console.log(topicData_res.Items);

                        let topicConceptsIds = [];
                        await topicData_res.Items.map(topData => {
                            topicConceptsIds = topicConceptsIds.concat(topData.topic_concept_id);
                        })

                        topicConceptsIds = [...new Set(topicConceptsIds)];
                        console.log({ topicConceptsIds });

                        /** FETCH CONCEPT DATA **/
                        let fetchBulkConceptReq = {
                            IdArray: topicConceptsIds,
                            fetchIdName: "concept_id",
                            TableName: TABLE_NAMES.upschool_concept_blocks_table
                        }

                        commonRepository.fetchBulkData(fetchBulkConceptReq, function (conceptData_err, conceptData_res) {
                            if (conceptData_err) {
                                console.log(conceptData_err);
                                callback(conceptData_err, conceptData_res);
                            } else {
                                console.log("CONCEPT BLOCK DATA");
                                console.log(conceptData_res.Items);
                            }
                        })
                        /** END FETCH CONCEPT DATA **/
                    }
                })
            }
            else {
                console.log("EMPTY TOPIC ID");
                callback(0, []);
            }
        }
    })
}


exports.getExpressTopicsAndQuestionCount2 = async (request) => {

    const chapterDataRes = await chapterRepository.fetchChapterByID2(request);

    if (!chapterDataRes.Items || chapterDataRes.Items.length === 0) {
        console.log("No chapter data found");
        return { statusCode: 404, message: "Chapter not found" };
    }

    const prelearningTopicIds = chapterDataRes.Items[0].prelearning_topic_id;

    if (prelearningTopicIds.length === 0) {
        console.log("EMPTY TOPIC ID");
        return { statusCode: 200, data: [] };
    }

    const fetchBulkReq = {
        IdArray: prelearningTopicIds,
        fetchIdName: "topic_id",
        isActiveFieldName: "topic_status",
        isActive: "Active",
        TableName: TABLE_NAMES.upschool_topic_table,
    };

    const topicDataRes = await commonRepository.getBulkDataUsingIndexWithActiveStatus2(fetchBulkReq);

    if (!topicDataRes.Items || topicDataRes.Items.length === 0) {
        console.log("No topic data found");
        return { statusCode: 404, message: "Topics not found" };
    }

    const topicConceptsIds = [...new Set(topicDataRes.Items.flatMap(item => item.topic_concept_id))];
    console.log({ topicConceptsIds });

    if (topicConceptsIds.length === 0) {
        console.log("No concept IDs found in topics");
        return { statusCode: 200, data: [] };
    }

    const fetchBulkConceptReq = {
        IdArray: topicConceptsIds,
        fetchIdName: "concept_id",
        TableName: TABLE_NAMES.upschool_concept_blocks_table,
    };

    const conceptDataRes = await commonRepository.fetchBulkData2(fetchBulkConceptReq);

    if (!conceptDataRes.Items || conceptDataRes.Items.length === 0) {
        console.log("No concept data found");
        return { statusCode: 404, message: "Concepts not found" };
    }

    console.log("CONCEPT BLOCK DATA", conceptDataRes.Items);

    return { statusCode: 200, data: conceptDataRes.Items };
};
