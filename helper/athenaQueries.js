const { TABLE_NAMES } = require("../constants/tables");

exports.getQuizResultsQuery = (quizId) => `
  SELECT 
      CAST(q1.question_track_details AS json) AS question_track_details, 
      CAST(q2.marks_details AS json) AS marks_details 
  FROM 
      ${TABLE_NAMES.upschool_quiz_table} q1
  INNER JOIN 
      ${TABLE_NAMES.upschool_quiz_result} q2
  ON 
      q1.quiz_id = q2.quiz_id
  WHERE 
      q1.quiz_id = '${quizId}'
`;

exports.getQuizResults = (quizId, class_id ,section_id) => `
SELECT 
    t1.student_id,
    t1.user_firstname,
    CAST(t2.individual_group_performance AS json) AS individual_group_performance
FROM 
    ${TABLE_NAMES.upschool_student_info} t1
LEFT OUTER JOIN  
    ${TABLE_NAMES.upschool_quiz_result} t2
ON 
    t1.student_id = t2.student_id AND t2.quiz_id = '${quizId}'
WHERE 
    t1.class_id = '${class_id}' AND 
    t1.section_id = '${section_id}';
`;