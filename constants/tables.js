let DBEnvPrefix = process.env.DB_PREFIX;
let DBNamePrefix = `${DBEnvPrefix}upschool_`;

exports.TABLE_NAMES = {
    upschool_users_table: `${DBNamePrefix}users_table`,  
    upschool_digi_card_table: `${DBNamePrefix}digi_card_table`,  
    upschool_topic_table: `${DBNamePrefix}topic_table`,  
    upschool_chapter_table: `${DBNamePrefix}chapter_table`,  
    upschool_unit_table: `${DBNamePrefix}unit_table`,  
    upschool_standard_table: `${DBNamePrefix}standard_table`,  
    
    upschool_parent_info: `${DBNamePrefix}parent_info`,
    upschool_student_info: `${DBNamePrefix}student_info`,
    upschool_teacher_info: `${DBNamePrefix}teacher_info`,
    upschool_school_info_table: `${DBNamePrefix}school_info_table`,
    upschool_class_table: `${DBNamePrefix}class_table`,
    upschool_client_class_table: `${DBNamePrefix}client_class_table`,
    upschool_section_table: `${DBNamePrefix}section_table`,
    upschool_concept_blocks_table: `${DBNamePrefix}concept_blocks_table`,
    upschool_subject_table: `${DBNamePrefix}subject_table`,
    upschool_teaching_activity: `${DBNamePrefix}teaching_activity`,
    upschool_digicard_teacher_extension: `${DBNamePrefix}digicard_teacher_extension`,
    upschool_quiz_table: `${DBNamePrefix}quiz_table`,
    upschool_question_source: `${DBNamePrefix}question_source`,
    upschool_blueprint_table: `${DBNamePrefix}blueprint_table`,
    upschool_question_table: `${DBNamePrefix}question_table`,
    upschool_cognitive_skill: `${DBNamePrefix}cognitive_skill`,
    upschool_content_category: `${DBNamePrefix}content_category`,
    upschool_group_table: `${DBNamePrefix}group_table`,
    upschool_test_question_paper: `${DBNamePrefix}test_question_paper`,
    upschool_class_test_table: `${DBNamePrefix}class_test_table`,
    upschool_scanner_session_info: `${DBNamePrefix}scanner_session_info`,
    upschool_test_result: `${DBNamePrefix}test_result`,
    upschool_quiz_result: `${DBNamePrefix}quiz_result`,
    upschool_presets_table: `${DBNamePrefix}presets_table`,

}