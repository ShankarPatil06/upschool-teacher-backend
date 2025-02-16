const { schoolRepository, studentRepository, subjectRepository, unitRepository, quizRepository, settingsRepository, questionRepository, quizResultRepository, classTestRepository, chapterRepository, topicRepository, conceptRepository, testResultRepository, testQuestionPaperRepository } = require("../repository");
const { formatDate } = require("../helper/helper");
const s3Services = require("./s3Service");

exports.getAssessmentDetails = async (request) => {
  const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

  if (!schoolDataRes.Items[0] || !schoolDataRes.Items[0].pre_quiz_config || !schoolDataRes.Items[0].post_quiz_config)
    return {};
  const classPercentagePre =
    schoolDataRes.Items[0].pre_quiz_config.class_percentage;
  const classPercentagePost =
    schoolDataRes.Items[0].post_quiz_config.class_percentage;
  ;
  const fetch_teacher_section_students_response =
    await studentRepository.getStudentsData2(request);
  const studentsCount = fetch_teacher_section_students_response.Items.length;

  const subject_res = await subjectRepository.getSubjetById2(request);
  let subject_unit_id = subject_res.Items[0].subject_unit_id;

  const unit_res = await unitRepository.fetchUnitData2({ subject_unit_id });

  const unit_chapter_id = [
    ...new Set(unit_res.flatMap((e) => e.unit_chapter_id)),
  ];
  const chapter_res = await chapterRepository.fetchBulkChaptersIDName2({
    unit_chapter_id,
  });

  let preLearningTopicsCount = 0;
  let postLearningTopicsCount = 0;
  let preLearningCompletedTopicsCount = 0;
  let postLearningCompletedTopicsCount = 0;
  let notConsideredTopicsPre = 0;
  let notConsideredTopicsPost = 0;

  chapter_res.forEach((ele) => {
    preLearningTopicsCount += ele.prelearning_topic_id.length;
    postLearningTopicsCount += ele.postlearning_topic_id.length;
  });

  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

  const quizIds = quizDataRes.Items.map((val) => val.quiz_id);

  const quizResultDataRes =
    quizIds.length &&
    (await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    }));

  quizDataRes.Items.forEach((val) => {
    const studentsAttendedQuiz = quizResultDataRes
      ? quizResultDataRes.filter((res) => res.quiz_id === val.quiz_id).length
      : 0;

    console.log("studentsAttendedQuiz - ", studentsAttendedQuiz);

    if (val.learningType === "preLearning") {
      if (val.not_considered_topics)
        notConsideredTopicsPre += val.not_considered_topics.length;
      if (
        studentsCount &&
        studentsAttendedQuiz >= classPercentagePre * studentsCount * 0.01
      ) {
        preLearningCompletedTopicsCount += val.selectedTopics.length;
      }
    } else {
      if (val.not_considered_topics)
        notConsideredTopicsPost += val.not_considered_topics.length;
      if (
        studentsCount &&
        studentsAttendedQuiz >= classPercentagePost * studentsCount * 0.01
      ) {
        postLearningCompletedTopicsCount += val.selectedTopics.length;
      }
    }
  });

  return {
    preLearningTopics: {
      content:
        (
          (preLearningCompletedTopicsCount / preLearningTopicsCount) *
          100
        ).toFixed(1) + "%",
      totalTopics: preLearningTopicsCount,
      completedTopics: preLearningCompletedTopicsCount,
      notConsideredTopics: notConsideredTopicsPre,
      remainingTopics:
        preLearningTopicsCount -
        preLearningCompletedTopicsCount -
        notConsideredTopicsPre,
    },
    postLearningTopics: {
      content:
        (
          (postLearningCompletedTopicsCount / postLearningTopicsCount) *
          100
        ).toFixed(1) + "%",
      totalTopics: postLearningTopicsCount,
      completedTopics: postLearningCompletedTopicsCount,
      notConsideredTopics: notConsideredTopicsPost,
      remainingTopics:
        postLearningTopicsCount -
        postLearningCompletedTopicsCount -
        notConsideredTopicsPost,
    },
    WorksheetsGenerated: {
      content: 28,
    },
    QuestionPapersGenerated: {
      content: 13,
    },
  };
};

exports.getTargetedLearningExpectation = async (request) => {
  let totalTopics = 0;
  let reachedTopics = 0;
  const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);
  if (!schoolDataRes.Items[0] || !schoolDataRes.Items[0].pre_quiz_config || !schoolDataRes.Items[0].post_quiz_config)
    return {};
  const classPercentagePre =
    schoolDataRes.Items[0].pre_quiz_config.class_percentage;
  const classPercentagePost =
    schoolDataRes.Items[0].post_quiz_config.class_percentage;

  if (!classPercentagePre || !classPercentagePost) return;
  const studentDataRes = await studentRepository.getStudentsData2(request);
  console.log("studentDataRes - ", studentDataRes);
  let classStrength = studentDataRes?.Items?.length;
  console.log("request - ", request);
  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);
  console.log("quizDataRes - ", quizDataRes);
  const quizIds = quizDataRes.Items.map((val) => val.quiz_id);

  console.log("quizIds - ", quizIds);


  const quizResultDataRes =
    quizIds.length &&
    (await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    }));

  console.log("quizResultDataRes123 - ", quizResultDataRes);

  totalTopics =
    quizDataRes &&
    quizDataRes.Items.reduce((acc, val) => acc + val.selectedTopics?.length, 0);

  quizDataRes.Items.forEach((quiz) => {
    const passedStudentsOfParticularQuiz = quizResultDataRes.filter(
      (val) => val.isPassed && val.evaluated == "Yes" && quiz.quiz_id == val.quiz_id
    ).length;

    const classPercentage =
      quiz.learningType === "preLearning"
        ? classPercentagePre
        : classPercentagePost;
    const passedThreshold = classPercentage
      ? classStrength * classPercentage * 0.01
      : 0;

    console.log("passedStudentsOfParticularQuiz - ", passedStudentsOfParticularQuiz);

    if (passedStudentsOfParticularQuiz >= passedThreshold) {
      reachedTopics += quiz.selectedTopics.length;
    }
  });
  return {
    totalTopics,
    reached: reachedTopics,
    classPercentagePre,
    classPercentagePost,
    totalStrength: classStrength,
  };
};

exports.getTargetedLearningExpectationDetails = async (request) => {
  const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

  if (!schoolDataRes.Items[0] || !schoolDataRes.Items[0].pre_quiz_config || !schoolDataRes.Items[0].post_quiz_config)
    return {};
  const classPercentagePre =
    schoolDataRes.Items[0].pre_quiz_config.class_percentage;
  const classPercentagePost =
    schoolDataRes.Items[0].post_quiz_config.class_percentage;
  const studentDataRes = await studentRepository.getStudentsData2(request);
  const classStrength = studentDataRes.Items.length;
  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

  const groupByChapterId = (data) => {
    data.sort((a, b) => a.chapter_id.localeCompare(b.chapter_id));
    const groupedData = data.reduce((acc, item) => {
      const chapterId = item.chapter_id;
      const chapterIndex = acc.findIndex((chapter) => chapter.id === chapterId);
      const quizData = {
        selectedTopics: item.selectedTopics,
        quiz_id: item.quiz_id,
        passedStudentsOfParticularQuiz: item.passedStudentsOfParticularQuiz,
        failedStudentsOfParticularQuiz: item.failedStudentsOfParticularQuiz,
        learningType: item.learningType,
        date: formatDate(item.created_ts),
      };

      if (chapterIndex === -1) {
        acc.push({
          id: chapterId,
          chapterName: "",
          classPercentagePost,
          classPercentagePre,
          totalStrength: classStrength,
          data: [quizData],
        });
      } else {
        acc[chapterIndex].data.push(quizData);
      }
      return acc;
    }, []);
    return groupedData;
  };
  const groupedData = groupByChapterId(quizDataRes.Items);
  const quizIds = groupedData.flatMap((chapter) =>
    chapter.data.map((quiz) => ({ quiz_id: quiz.quiz_id }))
  );
  const quizResultDataRes =
    await quizResultRepository.fetchBulkQuizResultsByID3({
      items: quizIds,
      condition: "OR",
    });
  const chapterIds = groupedData.map((chapter) => chapter.id);

  const chapterDataRes = await chapterRepository.fetchBulkChaptersIDName2({
    unit_chapter_id: chapterIds,
  });

  const allTopicIds = groupedData.flatMap((chapter) =>
    chapter.data.flatMap((quiz) =>
      quiz.selectedTopics.map((topic) => topic.topic_id)
    )
  );

  const topicDataRes = await topicRepository.fetchBulkTopicsIDName2({
    unit_Topic_id: allTopicIds,
  });

  groupedData.forEach((chapter) => {
    chapter.data.forEach((quiz) => {
      const results = quizResultDataRes.filter(
        (result) => result.quiz_id === quiz.quiz_id
      );
      const failedStudents = [];
      let passedStudentsOfParticularQuiz = 0;

      results.forEach((result) => {
        if (result.isPassed) {
          passedStudentsOfParticularQuiz++;
        } else {
          failedStudents.push(result.student_id);
        }
      });

      quiz.passedStudentsOfParticularQuiz = passedStudentsOfParticularQuiz;
      quiz.failedStudentsOfParticularQuiz = failedStudents.map((id) => {
        const student = studentDataRes.Items.find(
          (item) => item.student_id === id
        );
        return student
          ? `${student.user_firstname} ${student.user_lastname}`
          : "";
      });
    });
  });

  groupedData.forEach((chapter) => {
    const chapterData = chapterDataRes.find((c) => c.chapter_id === chapter.id);
    if (chapterData) {
      chapter.chapterName = chapterData.chapter_title;
    }
    chapter.data.forEach((quiz) => {
      quiz.selectedTopics.forEach((topic) => {
        const topicDetail = topicDataRes.find(
          (t) => t.topic_id === topic.topic_id
        );
        if (topicDetail) {
          topic.topic_title = topicDetail.topic_title;
        }
      });
    });
  });
  return groupedData;
};

// exports.getTargetedLearningExpectationDetails = async (request) => {
//   const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

//   if (!schoolDataRes.Items[0] || !schoolDataRes.Items[0].pre_quiz_config || !schoolDataRes.Items[0].post_quiz_config)
//     return {};

//   const classPercentagePre = schoolDataRes.Items[0].pre_quiz_config.class_percentage;
//   const classPercentagePost = schoolDataRes.Items[0].post_quiz_config.class_percentage;
//   const studentDataRes = await studentRepository.getStudentsData2(request);
//   const classStrength = studentDataRes.Items.length;

//   // Fetch all chapters related to the subject and extract unique topic IDs
//   const subjectRes = await subjectRepository.getSubjetById2(request);
//   let subjectUnitId = subjectRes.Items[0].subject_unit_id;

//   const unitRes = await unitRepository.fetchUnitData2({ subject_unit_id: subjectUnitId });
//   const unitChapterIds = [...new Set(unitRes.flatMap((e) => e.unit_chapter_id))];
//   const chapterRes = await chapterRepository.fetchBulkChaptersIDName2({
//     unit_chapter_id: unitChapterIds,
//   });

//   // Collect all unique topic IDs from prelearning and postlearning arrays
//   const allTopicIds = [...new Set(chapterRes.flatMap((chapter) =>
//     [...chapter.prelearning_topic_id, ...chapter.postlearning_topic_id]
//   ))];

//   // Fetch topics using unique topic IDs
//   const topicDataRes = await topicRepository.fetchBulkTopicsIDName2({
//     unit_Topic_id: allTopicIds,
//   });

//   console.log("topicDataRes - ", topicDataRes);

//   const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

//   // Initialize groupedData with all chapters from chapterRes, adding quiz data only if it exists
//   const groupedData = chapterRes.map((chapter) => ({
//     id: chapter.chapter_id,
//     chapterName: chapter.chapter_title,
//     classPercentagePost,
//     classPercentagePre,
//     totalStrength: classStrength,
//     data: []  // Initialize with empty array, to be filled with quizzes if they exist
//   }));

//   // Map quizzes by chapter ID for easy grouping
//   const quizzesByChapter = quizDataRes.Items.reduce((acc, quiz) => {
//     if (!acc[quiz.chapter_id]) acc[quiz.chapter_id] = [];
//     acc[quiz.chapter_id].push(quiz);
//     return acc;
//   }, {});

//   // Populate groupedData with quizzes if available
//   groupedData.forEach((chapter) => {
//     const quizzes = quizzesByChapter[chapter.id] || []; // Get quizzes or empty array if none exist
//     quizzes.forEach((quiz) => {
//       const quizData = {
//         selectedTopics: quiz.selectedTopics,
//         quiz_id: quiz.quiz_id,
//         passedStudentsOfParticularQuiz: quiz.passedStudentsOfParticularQuiz,
//         failedStudentsOfParticularQuiz: quiz.failedStudentsOfParticularQuiz,
//         learningType: quiz.learningType,
//         date: formatDate(quiz.created_ts),
//       };
//       chapter.data.push(quizData);
//     });
//   });

//   // Fetch quiz results for each quiz
//   const quizIds = groupedData.flatMap((chapter) =>
//     chapter.data.map((quiz) => ({ quiz_id: quiz.quiz_id }))
//   );
//   const quizResultDataRes = await quizResultRepository.fetchBulkQuizResultsByID3({
//     items: quizIds,
//     condition: "OR",
//   });

//   // Populate quiz results and map topic titles in groupedData
//   groupedData.forEach((chapter) => {
//     chapter.data.forEach((quiz) => {
//       const results = quizResultDataRes.filter(
//         (result) => result.quiz_id === quiz.quiz_id
//       );
//       const failedStudents = [];
//       let passedStudentsOfParticularQuiz = 0;

//       results.forEach((result) => {
//         if (result.isPassed) {
//           passedStudentsOfParticularQuiz++;
//         } else {
//           failedStudents.push(result.student_id);
//         }
//       });

//       quiz.passedStudentsOfParticularQuiz = passedStudentsOfParticularQuiz;
//       quiz.failedStudentsOfParticularQuiz = failedStudents.map((id) => {
//         const student = studentDataRes.Items.find(
//           (item) => item.student_id === id
//         );
//         return student
//           ? `${student.user_firstname} ${student.user_lastname}`
//           : "";
//       });

//       // Add topic titles to each topic in selectedTopics
//       quiz.selectedTopics.forEach((topic) => {
//         const topicDetail = topicDataRes.find(
//           (t) => t.topic_id === topic.topic_id
//         );
//         if (topicDetail) {
//           topic.topic_title = topicDetail.topic_title;
//         }
//       });
//     });
//   });

//   return groupedData;
// };


exports.preLearningSummaryDetails = async (request) => {
  const studentsDataRes = await studentRepository.getStudentsData2(request);
  const studentsCount = studentsDataRes.Items.length;

  const subjectDataRes = await subjectRepository.getSubjetById2(request);

  if (!subjectDataRes.Items?.length) return;

  const subject_unit_id = subjectDataRes.Items[0].subject_unit_id;
  const unitDataRes = await unitRepository.fetchUnitData2({ subject_unit_id });

  if (!unitDataRes?.length) return;

  const unit_chapter_id = [
    ...new Set(unitDataRes.flatMap((e) => e.unit_chapter_id)),
  ];
  const chapterDataRes = await chapterRepository.fetchBulkChaptersIDName2({
    unit_chapter_id,
  });

  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

  const quizIds = [];
  quizDataRes.Items.forEach((quiz) => {
    if (quiz.learningType === request.data.type) {
      const chapter = chapterDataRes.find(
        (ch) => ch.chapter_id === quiz.chapter_id
      );
      if (chapter) {
        Object.assign(chapter, {
          quiz_id: quiz.quiz_id,
          startDate: formatDate(quiz.created_ts),
          notConsideredTopics: quiz.not_considered_topics,
        });
        quizIds.push(quiz.quiz_id);
      }
    }
  });

  const quizResultDataRes =
    await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    });

  const topicIds = [];
  chapterDataRes.forEach((val) => {
    val.totalStrength = studentsCount;
    if (val.notConsideredTopics) topicIds.push(...val.notConsideredTopics);

    if (val.quiz_id) {
      const quizResults = quizResultDataRes.filter(
        (result) => result.quiz_id === val.quiz_id && result.evaluated === "Yes"
      );

      val.student_attendance = quizResults.length;
      val.avgMarks = quizResults.length
        ? ((quizResults.reduce(
          (total, result) =>
            total + (result.marks_details[0]?.totalMark || 0),
          0
        ) / quizResults.length) / quizResults[0].marks_details[0]?.expectedMarks) * 100
        : 0;
    }
  });

  if (topicIds.length) {
    const topicDataRes = await topicRepository.fetchBulkTopicsIDName2({
      unit_Topic_id: topicIds,
    });

    chapterDataRes.forEach((val) => {
      if (val.notConsideredTopics) {
        val.notConsideredTopics = val.notConsideredTopics.map((id) => {
          const topic = topicDataRes.find((item) => item.topic_id === id);
          return topic ? topic.topic_title : id;
        });
      }
    });
  }

  return chapterDataRes;
};

exports.postLearningSummaryDetails = async (request) => {
  const studentsDataRes = await studentRepository.getStudentsData2(request);
  const studentsCount = studentsDataRes.Items.length;

  const subjectDataRes = await subjectRepository.getSubjetById2(request);
  if (!subjectDataRes.Items?.length) return;

  const subject_unit_id = subjectDataRes.Items[0].subject_unit_id;
  const unitDataRes = await unitRepository.fetchUnitData2({ subject_unit_id });
  if (!unitDataRes?.length) return;

  const unit_chapter_id = [
    ...new Set(unitDataRes.flatMap((e) => e.unit_chapter_id)),
  ];
  const chapterDataRes = await chapterRepository.fetchBulkChaptersIDName2({
    unit_chapter_id,
  });
  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

  const topicIds = [];
  quizDataRes.Items.forEach((quiz) => {
    if (quiz.not_considered_topics) {
      topicIds.push(...quiz.not_considered_topics);
    }
    if (quiz.learningType === request.data.type) {
      const chapter = chapterDataRes.find(
        (ch) => ch.chapter_id === quiz.chapter_id
      );
      if (chapter) {
        chapter.quiz_id = chapter.quiz_id || [];
        chapter.notConsideredTopics = chapter.notConsideredTopics || [];

        chapter.quiz_id.push({
          id: quiz.quiz_id,
          name: quiz.quiz_name,
        });
        chapter.notConsideredTopics.push(...(quiz.not_considered_topics || []));
        chapter.startDate = formatDate(quiz.created_ts);
      }
    }
  });

  const quizIds = chapterDataRes.flatMap(
    (val) => val.quiz_id?.map((quiz) => quiz.id) || []
  );
  const quizResultDataRes =
    await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    });

  chapterDataRes.forEach((val) => {
    val.totalStrength = studentsCount;

    if (Array.isArray(val.quiz_id)) {
      val.quiz_id.forEach((quiz) => {
        const quizResults = quizResultDataRes.filter(
          (result) => result.quiz_id === quiz.id && result.evaluated === "Yes"
        );
        const totalMarks = quizResults.reduce(
          (sum, result) => sum + (result.marks_details[0]?.totalMark || 0),
          0
        );
        const totalAttendance = quizResults.length;
        console.log("totalAttendance - ", totalAttendance);
        quizResults.map(val =>
          console.log("val - ", val.marks_details)
        )

        quiz.student_attendance = totalAttendance;
        quiz.avgMarks = quizResults.length
          ? ((quizResults.reduce(
            (total, result) =>
              total + (result.marks_details[0]?.totalMark || 0),
            0
          ) / quizResults.length) / quizResults[0].marks_details[0]?.expectedMarks) * 100
          : 0;
        console.log("quiz.avgMarks - ", quiz.avgMarks);
      });
    }
  });

  if (topicIds.length > 0) {
    const topicDataRes = await topicRepository.fetchBulkTopicsIDName2({
      unit_Topic_id: topicIds,
    });

    chapterDataRes.forEach((val) => {
      if (val.notConsideredTopics) {
        val.notConsideredTopics = val.notConsideredTopics.map((id) => {
          const topic = topicDataRes.find((item) => item.topic_id === id);
          return topic ? topic.topic_title : id;
        });
      }
    });
  }

  return chapterDataRes;
};

exports.viewAnalysisIndividualReport = async (request) => {
  const quizData = await quizRepository.fetchQuizDataById2(request);
  const studentsDataRes =
    await quizResultRepository.fetchQuizResultDataOfStudent2(request);

  if (quizData.Item && studentsDataRes.Items[0]) {
    const setKey = studentsDataRes.Items[0].marks_details[0].set_key;

    const questionTrackDetails = quizData.Item.question_track_details[setKey];
    const questionIds = questionTrackDetails.map((val) => val.question_id);
    const topicIds = questionTrackDetails.map((val) => val.topic_id);

    const questions = await questionRepository.fetchBulkQuestionsNameById2({
      question_id: questionIds,
    });
    console.log({ questions });

    const topicNames = await topicRepository.fetchBulkTopicsIDName2({
      unit_Topic_id: topicIds,
    });

    const cognitiveSkillNames =
      await settingsRepository.fetchBulkCognitiveSkillNameById2({
        cognitive_id: questions.map((que) => que.cognitive_skill),
      });

    await Promise.all(
      questions.map(async (que) => {
        const ans = questionTrackDetails.find(
          (val) => val.question_id == que.question_id
        );
        que.topic_title =
          topicNames.find((val) => val.topic_id == ans.topic_id)?.topic_title ||
          "";

        const cognitive_skill = cognitiveSkillNames.find(
          (val) => val.cognitive_id == que.cognitive_skill
        );
        que.cognitive_skill = cognitive_skill?.cognitive_name || "";

        const question = studentsDataRes.Items[0].marks_details[0].qa_details.find((val) => val.question_id == que.question_id);
        que.obtained_marks =
          question.modified_marks !== "N.A." ? question.modified_marks : question.obtained_marks !== "N.A." ? question.obtained_marks : 0;

        console.log(que.obtained_marks);

        await Promise.all(
          que.answers_of_question.map(async (ans) => {
            if (
              ans.answer_type === "Image" ||
              ans.answer_type === "Audio File"
            ) {
              ans.answer_content = await s3Services.getS3SignedUrl(ans.answer_content);
            }
          })
        );
      })
    );

    return questions;
  } else {
    return [];
  }
};

exports.viewClassReportQuestions = async (request) => {

  const [quizData, quizResult] = await Promise.all([
    quizRepository.fetchQuizDataById2(request),
    quizResultRepository.fetchQuizResultByQuizId(request),
  ]);
  // console.log("QUIZRESULT", quizResult.Items[1].marks_details[0]);
  // console.log("quizData", quizData);

  const quizResultMarksData = quizResult.Items.map(
    (item) => item.marks_details[0].qa_details
  );
  // console.log("quizResultMarksData", quizResultMarksData);  

  const { totalMarkObtainedByStudents, totalMarkExpectedFromStudents } = quizResult.Items.reduce(
    (acc, item) => {
      acc.totalMarkObtainedByStudents += item.marks_details[0].totalMark;
      acc.totalMarkExpectedFromStudents += item.marks_details[0].expectedMarks;
      return acc;
    },
    { totalMarkObtainedByStudents: 0, totalMarkExpectedFromStudents: 0 }
  );


  // console.log("totalMarkObtainedByStudents", totalMarkObtainedByStudents);
  // console.log("totalMarkExpectedFromStudents", totalMarkExpectedFromStudents);

  const totalStudents = quizResultMarksData.length;
  const questionMap = {};
  for (const [setName, questions] of Object.entries(
    quizData.Item.question_track_details
  )) {
    for (const { question_id } of questions) {
      if (!questionMap[question_id]) {
        questionMap[question_id] = [];
      }
      questionMap[question_id].push(setName);
    }
  }
  // console.log("QUESTIONS",quizData.Item.question_track_details)
  const uniqueArray = [
    ...new Set(Object.values(quizData.Item.question_track_details).flat()),
  ]; //all unique questions
  const uniqueArray1 = [...new Set(Object.keys(questionMap))]; //which set the questions belong to
  const questionSet = uniqueArray1.map((questionId) => ({
    question_id: questionId,
    sets: questionMap[questionId],
  }));
  // console.log("UNIQUE", uniqueArray)
  const questionIds = new Set(uniqueArray.map((item) => item.question_id));

  const conceptIds = uniqueArray.map((item) => item.concept_id);
  const topicIds = uniqueArray.map((item) => item.topic_id);
  //to get question_content and cognitive skillid
  // const questions = await new Promise((resolve, reject) => {
  //   questionRepository.fetchBulkQuestionsNameById({ question_id: questionIds }, (err, res) => {
  //     if (err) {
  //       console.log(err);
  //       return reject(err);
  //     }
  //     resolve(res);
  //   });
  // });
  const questions = await questionRepository.fetchBulkQuestionsNameById2({
    question_id: questionIds,
  });
  // console.log(questionIds.length, "Questions", questions)
  //concept,topic from conceptid,topicid and cognitiveskillid changed to its name and correctansweer
  const cognitive_id = questions.map((que) => que.cognitive_skill);
  console.log({ cognitive_id });

  const conceptNames = conceptIds.length && (await conceptRepository.fetchBulkConceptsIDName2({ unit_Concept_id: conceptIds }));
  const topicNames = topicIds.length && (await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: topicIds }));
  const cognitiveSkillNames = await new Promise((resolve, reject) => {
    settingsRepository.fetchBulkCognitiveSkillNameById({ cognitive_id: cognitive_id }, (err, res) => {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });

  let marksInTotal = 0;
  let possiblemarks = 0;
  questions.map((question, i) => {
    // console.log("question", question);
    // console.log("questionSet", questionSet);

    possiblemarks = possiblemarks + question.marks
    question.questionNo = (i + 1)
    question.set = questionSet.find((q) => q.question_id == question.question_id).sets

    const allAnswers = quizResultMarksData.flat().filter(ans => ans.question_id === question.question_id)
    question.cognitive_skill = cognitiveSkillNames.Items.find(e => e.cognitive_id == question.cognitive_skill).cognitive_name;
    //% of most common answer for objective (descriptive we wont show anything)
    question.answers_of_question.map((answer, i) => {
      let count = 0;
      allAnswers.map((eachAnswer) => {
        if (eachAnswer.question_id == question.question_id) {
          if (eachAnswer.student_answer === answer.answer_content) {
            count++;
          }
        }
      });
      question.answers_of_question[i].mostCommonPercentage =
        count > 0 ? (count / totalStudents) * 100 : 0;
    });

    //% of correct answers
    const correctAnswer = question.answers_of_question.find(
      (answer) => answer.answer_display === "Yes"
    );
    question.correctAnswer = correctAnswer
      ? correctAnswer.answer_content
      : "N.A";
    if (allAnswers.length === 0) {
      question.correctAnswerPercentage = 0;
    } else {
      const correct = allAnswers.reduce((count, answer) => {
        if (
          (String(answer.modified_marks) === "N.A." &&
            Number(answer.obtained_marks) === Number(question.marks)) ||
          (String(answer.modified_marks) !== "N.A." &&
            Number(answer.modified_marks) === Number(question.marks))
        ) {

          marksInTotal +=
            String(answer.obtained_marks) !== "N.A."
              ? Number(answer.obtained_marks)
              : 0;

          console.log("mark_cal", marksInTotal);
          return count + 1;
        } else {
          console.log(
            "missing mark",
            Number(answer.modified_marks),
            Number(answer.obtained_marks)
          );

          marksInTotal +=
            String(answer.modified_marks) !== "N.A."
              ? Number(answer.modified_marks)
              : String(answer.obtained_marks) !== "N.A."
                ? Number(answer.obtained_marks)
                : 0;

          // console.log("mark cal", marksInTotal);
          return count;
        }
      }, 0);

      const correctPercentage = (correct / allAnswers.length) * 100;


      question.correctAnswerPercentage = correctPercentage
      // totalStudents > 0 ? (correct / totalStudents) * 100 : 0;
    }
    // uniqueArray.map((item) => {
    let conceptID = uniqueArray.find((e) => question.question_id === e.question_id).concept_id;
    let topicID = uniqueArray.find((e) => question.question_id === e.question_id).topic_id;
    question.concept = conceptNames.find((e) => e.concept_id == conceptID).display_name;
    question.topic = topicNames.find((e) => e.topic_id == topicID).display_name;
    // });
  });
  //cognitive table and difficulty table data
  const averageData = questions.map((question) => ({
    skill: question.cognitive_skill,
    percentage: question.correctAnswerPercentage,
    level: question.difficulty_level,
  }));
  const skillTotals = {};
  const levelTotals = {};

  averageData.forEach(({ skill, percentage, level }) => {
    if (!skillTotals[skill]) {
      skillTotals[skill] = { total: 0, count: 0 };
    }

    skillTotals[skill].total += percentage;
    skillTotals[skill].count += 1;

    if (level !== "N.A") {
      if (!levelTotals[level]) {
        levelTotals[level] = { total: 0, count: 0 };
      }
      levelTotals[level].total += percentage;
      levelTotals[level].count += 1;
    }
  });

  const cognitiveResult = Object.keys(skillTotals).map((skill) => ({
    skill,
    averagePercentage: skillTotals[skill].total / skillTotals[skill].count,
    noOfQuestions: skillTotals[skill].count,
  }));

  const difficultyResult = Object.keys(levelTotals).map((level) => ({
    level,
    averagePercentage: levelTotals[level].total / levelTotals[level].count,
    noOfQuestions: levelTotals[level].count,
  }));
  // console.log("possiblemarks", possiblemarks);
  // console.log("marksInTotal", marksInTotal);
  // console.log("totalStudents", totalStudents);

  const pieValue = (totalMarkObtainedByStudents / totalMarkExpectedFromStudents) * 100

  return { questions: questions, cognitiveSkillAverageData: cognitiveResult, difficultyLevelAverageData: difficultyResult, pie: pieValue }
}

exports.viewClassReportFocusArea = async (request) => {
  const [quizData, quizResult, schoolDataRes, allStudentsData] = await Promise.all([
    quizRepository.fetchQuizDataById2(request),
    quizResultRepository.fetchQuizResultByQuizId(request),
    schoolRepository.getSchoolDetailsById2(request),
    studentRepository.getStudentsData2(request)
  ]);

  await studentRepository.getStudentsData2(request);
  const allStudentsCount = allStudentsData.Items.length;
  console.log("allStudentsCount - ",allStudentsCount);
  //numb of students who attendedgroupedMarks
  const quizResultMarksData = quizResult.Items.map((item) => {

    return {
      marks: item.marks_details[0].qa_details, // Accessing qa_details
      studentId: item.student_id, // Accessing student_id
    };
  });

  // console.log("quizResultMarksData - ",quizResultMarksData);

  const totalStudents = quizResultMarksData.length;
  const questionSetA = [
    ...new Set(
      Object.values(quizData.Item.question_track_details.qp_set_a).flat()
    ),
  ];

  // console.log("questionSetA - ",questionSetA);

  //only set a for focus area
  const conceptAndQuestions = questionSetA.reduce((acc, item) => {
    const existingConcept = acc.find(
      (concept) => concept.concept === item.concept_id
    );
    if (existingConcept) {
      existingConcept.questions.push(item.question_id);
    } else {
      acc.push({
        concept: item.concept_id,
        questions: [item.question_id],
      });
    }
    return acc;
  }, []);

  // console.log("conceptAndQuestions - ",conceptAndQuestions);

  const conceptIdsSetA = questionSetA.map((item) => item.concept_id); //concepts for set A
  const questionIdsSetA = questionSetA.map((item) => item.question_id); //concepts for set A

  const questions = await new Promise((resolve, reject) => {
    questionRepository.fetchBulkQuestionsNameById(
      { question_id: questionIdsSetA },
      (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      }
    );
  });

  const marksOfEachStudent = [];
  //get student marks based on question
  quizResultMarksData.map((qdata) => {
    qdata.marks.map((marks) => {
      questionIdsSetA.map((question) => {
        if (question === marks.question_id) {
          let marksValue;
          if (marks.modified_marks === "N.A.") {
            marksValue = marks.obtained_marks === "N.A." ? 0 : Number(marks.obtained_marks);
          } else {
            marksValue = Number(marks.modified_marks);
          }

          marksOfEachStudent.push({
            studentid: qdata.studentId,
            marks: marksValue,
            questionId: question,
          });
        }
      });
    });
  });

  // console.log("marksOfEachStudent - ", marksOfEachStudent);

  const groupedMarks = marksOfEachStudent.reduce((acc, item) => {
    // Find the existing student entry
    const existingStudent = acc.find(
      (student) => student.studentid === item.studentid
    );

    if (existingStudent) {
      // If the student exists, push the new marks and questionId into their array
      existingStudent.details.push({
        marks: item.marks,
        questionId: item.questionId,
      });
    } else {
      // If the student doesn't exist, create a new entry
      acc.push({
        studentid: item.studentid,
        details: [
          {
            marks: item.marks,
            questionId: item.questionId,
          },
        ],
      });
    }

    return acc;
  }, []);

  // console.log("groupedMarks - ",groupedMarks);
  // groupedMarks.forEach((student) => {
  // });

  const studentIds = groupedMarks.map((student) => student.studentid)

  const students = studentIds.length && await studentRepository.getStudentsByIdName2({ student_id: studentIds });
  const noOfQuestionsperConcept = conceptIdsSetA.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, []);

  // console.log("noOfQuestionsperConcept - ",noOfQuestionsperConcept);

  const conceptNames =
    conceptIdsSetA.length &&
    (await conceptRepository.fetchBulkConceptsIDName2({
      unit_Concept_id: conceptIdsSetA,
    }));

  let conceptsToFocus = [];
  // let failedStudents = [];

  console.log("conceptAndQuestions - ", conceptAndQuestions);

  let passPercentage = request.data.config === '"post_quiz_config"' ? schoolDataRes.Items[0].post_quiz_config.pct_of_student_for_reteach : schoolDataRes.Items[0].pre_quiz_config.pct_of_student_for_reteach;
  let classPercentage = request.data.config === '"post_quiz_config"' ? schoolDataRes.Items[0].post_quiz_config.class_percentage : schoolDataRes.Items[0].pre_quiz_config.class_percentage;
  conceptAndQuestions.map(async (item) => {
    item.numberOfQuestions = noOfQuestionsperConcept[item.concept] || 0;
    item.name = conceptNames.find(
      (c) => c.concept_id == item.concept
    ).display_name;

    //%cal for pass

    let studentsData = []
    item.passPercentage = passPercentage;
    item.classPercentage = classPercentage;
    item.allStudentsCount = allStudentsCount;

    console.log("groupedMarks - ", groupedMarks);

    groupedMarks.map((student) => {
      let marks = 0;
      let totalconceptMarks = 0;
      console.log("student.details =====  ", student.details);
      student.details.map((q) => {
        questions.map((questionData, i) => {
          if (q.questionId === questionData.question_id && item.questions.includes(q.questionId)) {
            console.log(i);
            totalconceptMarks = totalconceptMarks + questionData.marks;
          }
        })
        item.questions.map((question) => {
          if (q.questionId === question) {
            marks = marks + Number(q.marks)
          }
        })
      })

      let finalMarks = (marks / totalconceptMarks) * 100
      console.log({ marks }, item.questions.length, totalconceptMarks, { finalMarks }, { passPercentage });

      let passed = finalMarks >= passPercentage ? true : false;
      studentsData.push({ student: student.studentid, passed: passed });
    });

    const countPassed = studentsData.filter(student => student.passed).length;
    item.passed = (countPassed / totalStudents) * 100 //[%] value
    item.count = countPassed //pass % numerator
    item.totalStudents = totalStudents //pass % denominator
    let classPercentAchieved = (totalStudents/allStudentsCount) * 100;
    if (item.passed >= passPercentage && classPercentAchieved >= classPercentage) {
      item.successMatrix = "yes";
    } else {
      item.successMatrix = "no";
      conceptsToFocus.push(item.name);
    }
    const studentFailed = studentsData.filter((student) => student.passed == false)
    studentFailed.map((failedStudent) => {
      students.map((student) => {
        if (failedStudent.student === student.student_id) {
          failedStudent.student_name = student.user_firstname + student.user_lastname
        }
      })
    })
    item.failedStudent = studentFailed
  });
  return { conceptAndQuestions: conceptAndQuestions, conceptsToFocus: conceptsToFocus, quizData: quizData }
  // return groupedMarks
}

exports.viewChapterwisePerformanceTracking = async (request) => {

  const subject_res = await subjectRepository.getSubjetById2(request);
  let subject_unit_id = subject_res.Items[0].subject_unit_id;
  const unit_res = await unitRepository.fetchUnitData2({ subject_unit_id });
  const unit_chapter_id = [...new Set(unit_res.flatMap(e => e.unit_chapter_id))];
  const chapter_res = await chapterRepository.fetchBulkChaptersIDName2({ unit_chapter_id });
  const chapter_ids = chapter_res.map(chapter => chapter.chapter_id)
  console.log({ chapter_ids });

  const quizDataRes = await quizRepository.fetchAllQuizBasedonChapter2(request, chapter_ids);

  const quizids = quizDataRes.Items.map(q => q.quiz_id)
  const questionMarksforeachQuiz = await Promise.all(quizDataRes.Items.map(async (quizData) => {
    let overallMarks = 0;
    // Get all unique question IDs from question_track_details
    const uniqueArray = [...new Set(Object.values(quizData.question_track_details).flat())];
    const questionIds = uniqueArray.map(item => item.question_id);
    console.log("questionsids", questionIds.length)
    // Fetch question
    const questions = await new Promise((resolve, reject) => {
      questionRepository.fetchBulkQuestionsNameById({ question_id: questionIds }, (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      });
    });
    // Calculate overall marks
    // console.log("considered",questions);

    // overallMarks = questions.Items.reduce((total, question) => total + question.marks, 0);

    return { quizId: quizData.quiz_id, overallMarks: questions };
  }));
  const quizResultDataRes = quizids.length && await quizResultRepository.fetchBulkQuizResultsByID2({ unit_Quiz_id: quizids })
  const totalStudentsforAllChapters = quizResultDataRes.length
  const totalStudentsforeachChapter = chapter_ids.map(chapter => {
    let AvgDataSummary = [];
    let marksTotal = 0;
    let Avgpercentage = 0;
    let possiblemarks = 0;
    let increAvg = 0;
    let quizCount = 0;
    let marksinTotal = 0;
    quizDataRes.Items.map(quiz => {
      if (chapter === quiz.chapter_id) {
        marksTotal = 0;
        possiblemarks = 0
        quizCount++;
        quizResultDataRes.map(result => {
          if (quiz.quiz_id === result.quiz_id && result.evaluated === "Yes") {
            //marks in each chapter
            result.marks_details[0].qa_details.map(marks => {
              // console.log(marks.obtained_marks)
              const newObtained = marks.obtained_marks === 'N.A.' ? 0 : marks.obtained_marks
              String(marks.modified_marks) === 'N.A.' ? marksTotal = marksTotal + Number(newObtained) : marksTotal = marksTotal + Number(marks.modified_marks)
              // console.log(marksTotal)
              questionMarksforeachQuiz.map(marksForEachQuiz => {
                if (quiz.quiz_id === marksForEachQuiz.quizId) {
                  marksForEachQuiz.overallMarks.map(marking => {
                    if (marks.question_id === marking.question_id) {
                      possiblemarks = possiblemarks + marking.marks
                    }
                  })
                }
              })
            })
          }
        })

        marksinTotal = marksinTotal + marksTotal
        Avgpercentage = possiblemarks === 0 ? 0 : (marksTotal / (possiblemarks))
        console.log(chapter, { marksTotal, possiblemarks, Avgpercentage })
        increAvg = increAvg + Avgpercentage
        //Data for post and prelearning summary page avg
        let summaryAverage = (Avgpercentage * 100).toFixed(2)
        AvgDataSummary.push({
          quiz: quiz.quiz_id,
          average: summaryAverage
        })

      }

    })
    let finalAverage = (increAvg / quizCount) * 100 //all pre and pos quiz avg for each chapterS

    return { chapterId: chapter, averagePercentage: finalAverage.toFixed(2), SummaryData: AvgDataSummary }
  })
  chapter_res.map(chapter => {
    totalStudentsforeachChapter.map(student => {
      if (chapter.chapter_id === student.chapterId) {
        chapter.averagePercentage = student.averagePercentage
        chapter.SummaryData = student.SummaryData
      }
    })
  })

  return { chapter_res }
}

exports.preLearningBlueprintDetails = async (request) => {
  const quizData = await quizRepository.fetchQuizDataById2(request);

  const quizResultData = await quizResultRepository.fetchQuizResultByQuizId(
    request
  );

  const aggregatedData = {};
  const questionIds = new Set();

  if (quizData.Item.question_track_details)
    for (const [setKey, questions] of Object.entries(
      quizData.Item.question_track_details
    )) {
      questions.forEach((question, index) => {
        if (!aggregatedData[question.question_id]) {
          questionIds.add(question.question_id);
          aggregatedData[question.question_id] = {
            topic_id: question?.topic_id,
            concept_id: question?.concept_id,
            total_marks: 0,
            count: 0,
          };
        }
      });
    }

  const questions = await questionRepository.fetchBulkQuestionsNameById2({
    question_id: [...questionIds],
  });

  quizResultData.Items.length > 0 &&
    quizResultData.Items.forEach((result, i) => {
      if (result.marks_details) {
        const marksDetails = result.marks_details;
        marksDetails[0].qa_details.forEach((question) => {
          const questionId = question.question_id;
          const obtainedMarks = parseFloat(question.obtained_marks) || 0;
          const modifiedMarks = parseFloat(question.modified_marks) || 0;

          if (!aggregatedData[questionId]) {
            const trackDetails = quizData.Item.question_track_details;

            const topicConceptGroup = trackDetails[
              marksDetails[0].set_key
            ].find((q) => q.question_id === questionId);

            aggregatedData[questionId] = {
              topic_id: topicConceptGroup?.topic_id,
              concept_id: topicConceptGroup?.concept_id,
              total_marks: obtainedMarks ? obtainedMarks : modifiedMarks,
              count: 1,
            };
          } else {
            aggregatedData[questionId].total_marks += obtainedMarks
              ? obtainedMarks
              : modifiedMarks;
            aggregatedData[questionId].count += 1;
          }
        });
      }
    });

  const averages = Object.keys(aggregatedData).map((questionId) => {
    const data = aggregatedData[questionId];
    const marksData = questions.find(
      (question) => question.question_id == questionId
    );
    const marks = marksData?.marks;

    console.log(marks, " - ", data.count, " - data.total_marks - ", data.total_marks, "/", data.count * marks);
    return {
      question_id: questionId,
      topic_id: data.topic_id,
      concept_id: data.concept_id,
      average_marks: data.count
        ? (data.total_marks / (data.count * marks)) * 100
        : 0,
      studentsCount: data.count
    };
  });

  console.log("averages - ", averages);

  const conceptIds = [];
  const topicIds = [];

  averages.forEach((item) => {
    conceptIds.push(item.concept_id);
    topicIds.push(item.topic_id);
  });

  const topicNames =
    topicIds.length &&
    (await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: topicIds }));

  const conceptNames =
    conceptIds.length &&
    (await conceptRepository.fetchBulkConceptsIDName2({
      unit_Concept_id: conceptIds,
    }));

  averages.map((item) => {
    item.topic_title = topicNames.find(
      (val) => val.topic_id == item.topic_id
    ).topic_title;
    item.concept_title = conceptNames.find(
      (val) => val.concept_id == item.concept_id
    ).concept_title;
  });

  const conceptMap = new Map();

  // Step 1: Calculate concept averages
  averages.forEach(
    ({ concept_id, topic_id, topic_title, average_marks, studentsCount, concept_title }) => {
      const conceptData = conceptMap.get(concept_id) || {
        totalScore: 0,
        count: 0,
        topic_id,
        topic_title,
        concept_title,
      };
      conceptData.totalScore += average_marks;
      if (studentsCount)
        conceptData.count += 1;
      conceptMap.set(concept_id, conceptData);
    }
  );

  const conceptAverages = [...conceptMap].map(
    ([
      concept_id,
      { totalScore, count, topic_id, topic_title, concept_title },
    ]) => ({
      concept_id,
      topic_id,
      topic_title,
      concept_title,
      average_score: totalScore / count,
      number_of_questions: count,
    })
  );

  // Step 2: Calculate topic averages based on concept averages
  const topicMap = new Map();

  conceptAverages.forEach(({ topic_id, topic_title, average_score }) => {
    const topicData = topicMap.get(topic_id) || {
      totalScore: 0,
      count: 0,
      topic_title,
    };
    topicData.totalScore += average_score;
    topicData.count += 1;
    topicMap.set(topic_id, topicData);
  });

  const topicAverages = [...topicMap].map(
    ([topic_id, { totalScore, count, topic_title }]) => ({
      topic_id,
      topic_title,
      topic_average_score: totalScore / count,
      number_of_concepts: count,
    })
  );

  // Step 3: Combine topic and concept data for UI display
  const displayData = topicAverages.map((topic) => ({
    ...topic,
    concepts: conceptAverages.filter(
      (concept) => concept.topic_id === topic.topic_id
    ),
  }));

  return displayData;
};

exports.fetchIndividualQuizReport = async (request) => {
  const quizResults = await quizResultRepository.fetchQuizResultByQuizId(
    request
  );
  console.log("quizResults123", quizResults.Items[0].individual_group_performance);

  const allStudentsData = await classTestRepository.getStudentInfo(request);

  const quizResultsMap = new Map();
  quizResults.Items.forEach((quizResult) => {
    quizResultsMap.set(
      quizResult.student_id,
      quizResult.individual_group_performance
    );
  });

  allStudentsData.Items.forEach((studentData) => {
    let performance = quizResultsMap.get(studentData.student_id);
    if (performance) {
      studentData.individual_group_performance = performance;
    } else {
      studentData.individual_group_performance = {
        Basic: {
          Ispassed: "N.A.",
        },
        Intermediate: {
          Ispassed: "N.A.",
        },
        Advanced: {
          Ispassed: "N.A.",
        },
      };
    }
  });

  return allStudentsData;
};

exports.comprehensivePerformanceChapterWise = async (request) => {
  const allStudentsData = await studentRepository.getStudentsData2(request);

  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);

  const allQuestionIds = quizDataRes.Items.flatMap((quiz) => [
    ...quiz.question_track_details.qp_set_a.map((q) => q.question_id),
    ...quiz.question_track_details.qp_set_b.map((q) => q.question_id),
    ...quiz.question_track_details.qp_set_c.map((q) => q.question_id),
  ]);
  // if(allQuestionIds.length ==0)return [];

  const questions = allQuestionIds.length && await questionRepository.fetchBulkQuestionsNameById2({
    question_id: [...new Set(allQuestionIds)],
  });

  const quizIds = quizDataRes.Items.map((val) => val.quiz_id);

  const quizResultDataRes =
    quizIds.length > 0 &&
    (await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    }));

  const performance = {};
  if (!quizResultDataRes) return {};
  const quizResultsByStudent = quizResultDataRes.reduce((acc, result) => {
    if (result.evaluated === "Yes") {
      if (!acc[result.student_id]) acc[result.student_id] = [];
      acc[result.student_id].push(result);
    }
    return acc;
  }, {});

  const quizDataByQuizId = quizDataRes.Items.reduce((acc, quiz) => {
    acc[quiz.quiz_id] = quiz;
    return acc;
  }, {});

  const chapterIds = new Set();
  allStudentsData.Items.forEach((student) => {
    const { student_id, user_firstname, user_lastname } = student;
    const studentResults = quizResultsByStudent[student_id] || [];
    const studentPerformance = {};

    studentResults &&
      studentResults.forEach((result) => {
        const { quiz_id, marks_details } = result;
        const quizInfo = quizDataByQuizId[quiz_id];
        const chapterId = quizInfo ? quizInfo.chapter_id : null;

        if (!chapterId) return;

        chapterIds.add(chapterId);
        if (!studentPerformance[chapterId]) {
          studentPerformance[chapterId] = {
            totalQuestions: 0,
            totalMarks: 0,
            obtainedMarks: 0,
          };
        }

        marks_details &&
          marks_details.forEach((markDetail) => {
            markDetail.qa_details.forEach((qa) => {
              const marksData = questions.find(
                (question) => question.question_id == qa.question_id
              );
              const obtainedMarks = parseFloat(qa.obtained_marks) || 0;
              const modifiedMarks = parseFloat(qa.modified_marks) || 0;

              studentPerformance[chapterId].totalQuestions += 1;
              studentPerformance[chapterId].totalMarks += marksData?.marks;
              studentPerformance[chapterId].obtainedMarks += modifiedMarks
                ? modifiedMarks
                : obtainedMarks;
            });
          });
      });

    performance[student_id] = {
      name: `${user_firstname} ${user_lastname}`,
      performance: studentPerformance,
    };
  });
  console.log("***", chapterIds.length, chapterIds.size);
  if (!chapterIds.size) return [];
  const chapterData = chapterIds.size > 0 && await chapterRepository.fetchBulkChaptersIDName2({
    unit_chapter_id: [...chapterIds],
  });

  Object.values(performance).forEach((student) => {
    Object.keys(student.performance).forEach((chapterId) => {
      const chapter = chapterData.find((c) => c.chapter_id === chapterId);
      if (chapter) {
        student.performance[chapterId].title = chapter.chapter_title;
      }
    });
  });

  return performance;
};

exports.comprehensivePerformanceChapterWiseForTest = async (request) => {
  const studentData = await studentRepository.getStudentsData2(request);
  const testDetails = await classTestRepository.fetchAllTestBasedOnSubject(request);
  const question_paper_ids = testDetails.map(test => test.question_paper_id);
  const test_ids = testDetails.map(test => test.class_test_id);
  request['class_test_id'] = test_ids
  request['question_paper_ids'] = question_paper_ids;
  let testResult = [];
  if (test_ids.length > 0) {
    testResult = await testResultRepository.fetchStudentresultMetadata3(request);
  }

  const questionPaper = await testQuestionPaperRepository.getTestQuestionPaperById3(request);
  const test_chapter_ids = questionPaper?.data?.map(question => question.chapter_id).flat();
  let chapter_Ids = [...new Set([...test_chapter_ids])];
  chapter_Ids = chapter_Ids.filter(chapter_Id => chapter_Id !== undefined);
  request["unit_chapter_id"] = chapter_Ids;
  const testChapterMap = {};
  if (questionPaper?.data?.length > 0) {
    for (const paper of questionPaper.data) {
      if (paper.chapter_id && Array.isArray(paper.chapter_id)) {
        const matchingTests = testDetails.filter(test => test.question_paper_id === paper.question_paper_id);
        for (const chapter of paper.chapter_id) {
          if (!testChapterMap[chapter]) {
            testChapterMap[chapter] = new Set();
          }
          for (const test of matchingTests) {
            testChapterMap[chapter].add(test.class_test_id);
          }
        }
      }
    }
  }
  const uniqueTestChapters = Object.entries(testChapterMap).map(([chapter_id, testIds]) => ({
    chapter_id: chapter_id,
    test_ids: [...testIds]
  }));

  const questionIds1 = testResult.flatMap(test =>
    test.marks_details.flatMap(mark =>
      mark.qa_details.map(qa => qa.question_id)
    )
  );
  const allQuestionIds = [...new Set([...questionIds1])];
  let questionDetails = [];
  if (allQuestionIds.length > 0) {
    questionDetails = await questionRepository.fetchBulkQuestionsNameById2({
      question_id: allQuestionIds,
    });
  }

  let chapter_details = [];
  if (chapter_Ids.length > 0) {
    chapter_details = await chapterRepository.fetchBulkChaptersIDName2(request);
    const chapter_array = chapter_details.map(val => ({ "chapter_id": val.chapter_id }));
    const chapter_response = await chapterRepository.fetchChaptersIDandChapterTopicID2({ items: chapter_array, condition: "OR" });

    if (chapter_response.Items.length > 0) {
      for (const chapter of chapter_response.Items) {
        testChapterMap[chapter.chapter_id] = [
          ...(chapter.prelearning_topic_id || []),
          ...(chapter.postlearning_topic_id || [])
        ];
      }
    }

    const topic_array = Object.values(testChapterMap).flat().map(val => ({ topic_id: val }));
    let topicMap = { ...testChapterMap };
    if (topic_array.length > 0) {
      const topic_response = await topicRepository.fetchTopicIDDisplayTitleData2({ items: topic_array, condition: "OR" });

      if (topic_response?.Items?.length > 0) {
        const concept_response = await conceptRepository.fetchConceptUsingTopicId(topic_response.Items);

        Object.keys(testChapterMap).forEach(chapter => {
          testChapterMap[chapter] = [];
        });

        for (const concept of concept_response) {
          for (const topic of topic_response.Items) {
            if (topic?.topic_concept_id?.includes(concept.concept_id)) {
              for (const chapter in topicMap) {
                if (topicMap[chapter].includes(topic.topic_id)) {
                  if (!testChapterMap[chapter]) {
                    testChapterMap[chapter] = [];
                  }
                  testChapterMap[chapter].push(concept.concept_id);
                }
              }
            }
          }
        }

        Object.keys(testChapterMap).forEach(chapter => {
          let updatedConceptQuestions = [];
          testChapterMap[chapter].forEach(concept_id => {
            const concept = concept_response.find(c => c.concept_id === concept_id);
            if (concept && Array.isArray(concept.concept_question_id)) {
              updatedConceptQuestions = [...updatedConceptQuestions, ...concept.concept_question_id];
            }
          });
          testChapterMap[chapter] = updatedConceptQuestions;
        });
      }
    }
  }

  const chapterTestResults = [];
  for (const chapter of uniqueTestChapters) {
    let total_marks = 0;
    let total_obtained_marks = 0;
    const studentMap = new Map();
    const current_chapter = chapter_details.find(ch => ch.chapter_id === chapter.chapter_id);

    for (const test of testResult) {
      if (chapter.test_ids.includes(test.class_test_id)) {
        for (const marks of test.marks_details) {
          for (const question of marks.qa_details) {
            const questionId = question.question_id;
            if (testChapterMap[chapter.chapter_id]?.includes(questionId)) {
              const quest = questionDetails.find(q => q.question_id === questionId);
              if (quest) {
                let total_student_marks = quest?.marks || 0;
                let total_student_obtained_marks = question?.modified_marks !== "N.A." ? question?.modified_marks : question?.obtained_marks;

                total_marks += parseInt(total_student_marks);
                total_obtained_marks += parseInt(total_student_obtained_marks);
                let student = studentData.Items.find(s => s.student_id === test.student_id);
                if (!student) continue;

                const studentEntry = {
                  student_id: student.student_id,
                  student_name: `${student.user_firstname} ${student.user_lastname}`,
                  studentMark: parseInt(total_student_obtained_marks),
                  totalMarks: parseInt(total_student_marks) || 0,
                  percentage: (((parseInt(total_student_obtained_marks) / (parseInt(total_student_marks) || 1)) * 100).toFixed(2))
                };

                if (!studentMap.has(student.student_id)) {
                  studentMap.set(student.student_id, studentEntry);
                } else {
                  let existing = studentMap.get(student.student_id);
                  existing.studentMark += parseInt(studentEntry.studentMark);
                  existing.totalMarks += parseInt(studentEntry.totalMarks);
                  existing.percentage = (((existing.studentMark / existing.totalMarks) * 100).toFixed(2));
                  studentMap.set(student.student_id, existing);
                }
              }
            }
          }
        }
      }
    }
    chapterTestResults.push({
      chapter_id: chapter.chapter_id,
      chapter_name: current_chapter?.display_name || '',
      total_marks,
      total_obtained_marks,
      class_average: ((total_obtained_marks / total_marks) * 100).toFixed(2),
      students: Array.from(studentMap.values())
    });
  }
  return chapterTestResults;
}

exports.comprehensivePerformanceTopicWise = async (request) => {
  const allStudentsData = await studentRepository.getStudentsData2(request);
  const quizDataRes = await quizRepository.fetchAllQuizBasedonChapter(request);

  const allQuestionIds = quizDataRes.Items.flatMap((quiz) => [
    ...quiz.question_track_details.qp_set_a.map((q) => q.question_id),
    ...quiz.question_track_details.qp_set_b.map((q) => q.question_id),
    ...quiz.question_track_details.qp_set_c.map((q) => q.question_id),
  ]);

  if (allQuestionIds.length == 0) return [];
  const questions = await questionRepository.fetchBulkQuestionsNameById2({
    question_id: [...new Set(allQuestionIds)],
  });

  const quizIds = quizDataRes.Items.map((val) => val.quiz_id);
  const quizResultDataRes =
    quizIds.length > 0 &&
    (await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    }));

  const performance = {};

  if (!quizResultDataRes) return {};
  const quizResultsByStudent = quizResultDataRes?.reduce((acc, result) => {
    if (result.evaluated === "Yes") {
      if (!acc[result.student_id]) acc[result.student_id] = [];
      acc[result.student_id].push(result);
    }
    return acc;
  }, {});

  const quizDataByQuizId = quizDataRes.Items.reduce((acc, quiz) => {
    acc[quiz.quiz_id] = quiz;
    return acc;
  }, {});

  const topicIds = new Set();

  allStudentsData.Items.forEach((student) => {
    const { student_id, user_firstname, user_lastname } = student;
    const studentResults = quizResultsByStudent[student_id] || [];
    const studentPerformance = {};

    studentResults.forEach((result, i) => {
      const { quiz_id, marks_details } = result;
      const quizInfo = quizDataByQuizId[quiz_id];

      if (!quizInfo || !marks_details) return;

      const questionTrackDetails = quizInfo.question_track_details || {};

      marks_details.forEach((markDetail) => {
        const { set_key, qa_details } = markDetail;

        if (!qa_details || !set_key) return;

        const questionsForSet = questionTrackDetails[set_key] || [];

        questionsForSet.forEach((question) => {
          const { topic_id, question_id } = question;
          if (!topic_id) return;

          topicIds.add(topic_id);

          if (!studentPerformance[topic_id]) {
            studentPerformance[topic_id] = {
              totalQuestions: 0,
              totalMarks: 0,
              obtainedMarks: 0,
            };
          }

          qa_details.forEach((qa) => {
            if (qa.question_id === question_id) {
              const marksData = questions.find(
                (question) => question.question_id == qa.question_id
              );
              const obtainedMarks = parseFloat(qa.obtained_marks) || 0;
              const modifiedMarks = parseFloat(qa.modified_marks) || 0;

              studentPerformance[topic_id].totalQuestions += 1;
              studentPerformance[topic_id].totalMarks += marksData?.marks;
              studentPerformance[topic_id].obtainedMarks += modifiedMarks
                ? modifiedMarks
                : obtainedMarks;
            }
          });
        });
      });
    });

    performance[student_id] = {
      name: `${user_firstname} ${user_lastname}`,
      performance: studentPerformance,
    };
  });

  const topicData =
    topicIds.size &&
    (await topicRepository.fetchBulkTopicsIDName2({
      unit_Topic_id: [...topicIds],
    }));

  Object.values(performance).forEach((student) => {
    Object.keys(student.performance).forEach((topicId) => {
      const topic = topicData.find((t) => t.topic_id === topicId);
      if (topic) {
        student.performance[topicId].title = topic.topic_title;
      }
    });
  });

  return performance;
};

exports.comprehensivePerformanceTopicWiseForTest = async (request) => {
  const testDetails = await classTestRepository.fetchAllTestBasedOnSubject(request);
  const studentData = await studentRepository.getStudentsData2(request);
  const question_paper_ids = testDetails.map(test => test.question_paper_id);
  const test_ids = testDetails.map(test => test.class_test_id);

  request['class_test_id'] = test_ids
  request['question_paper_ids'] = question_paper_ids;

  let testResult = [];
  if (test_ids.length > 0) {
    testResult = await testResultRepository.fetchStudentresultMetadata3(request);
  }

  const questionPaper = await testQuestionPaperRepository.getTestQuestionPaperById3(request);
  const test_chapter_ids = questionPaper?.data?.map(question => question.chapter_id).flat();
  let chapter_Ids = [...new Set([...test_chapter_ids])];

  chapter_Ids = chapter_Ids.filter(chapter_Id => chapter_Id !== undefined && chapter_Id === request.data.chapter_id);
  request["unit_chapter_id"] = chapter_Ids;

  const testChapterMap = {};
  if (questionPaper?.data?.length > 0) {
    for (const paper of questionPaper.data) {
      if (paper.chapter_id && Array.isArray(paper.chapter_id)) {
        const matchingTests = testDetails.filter(test => test.question_paper_id === paper.question_paper_id);

        for (const chapter of paper.chapter_id) {
          if (!testChapterMap[chapter]) {
            testChapterMap[chapter] = new Set();
          }

          for (const test of matchingTests) {
            testChapterMap[chapter].add(test.class_test_id);
          }
        }
      }
    }
  }

  const uniqueTestChapters = Object.entries(testChapterMap).map(([chapter_id, testIds]) => ({
    chapter_id: chapter_id,
    test_ids: [...testIds]
  }));

  const questionIds1 = testResult.flatMap(test =>
    test.marks_details.flatMap(mark =>
      mark.qa_details.map(qa => qa.question_id)
    )
  );

  const allQuestionIds = [...new Set([...questionIds1])];
  let questionDetails = [];
  if (allQuestionIds.length > 0) {
    questionDetails = await questionRepository.fetchBulkQuestionsNameById2({
      question_id: allQuestionIds,
    });
  }

  let chapter_details = [];
  if (chapter_Ids.length > 0) {
    chapter_details = await chapterRepository.fetchBulkChaptersIDName2(request);
    const chapter_array = chapter_details.map(val => ({ "chapter_id": val.chapter_id }));
    const chapter_response = await chapterRepository.fetchChaptersIDandChapterTopicID2({ items: chapter_array, condition: "OR" });

    if (chapter_response.Items.length > 0) {
      for (const chapter of chapter_response.Items) {
        testChapterMap[chapter.chapter_id] = [
          ...(chapter.prelearning_topic_id || []),
          ...(chapter.postlearning_topic_id || [])
        ];
      }
    }
  }
  const topic_array = Object.values(testChapterMap).flat().map(val => ({ topic_id: val }));
  const chapterTestResults = [];
  if (topic_array.length > 0) {
    const topic_response = await topicRepository.fetchTopicIDDisplayTitleData2({ items: topic_array, condition: "OR" });

    if (topic_response?.Items?.length > 0) {
      const topicToConceptMap = {};
      topic_response.Items.forEach(topic => {
        if (topic.topic_concept_id && Array.isArray(topic.topic_concept_id)) {
          topicToConceptMap[topic.topic_id] = topic.topic_concept_id;
        }
      });

      concept_response = await conceptRepository.fetchConceptUsingTopicId(topic_response.Items);

      if (concept_response?.length > 0) {
        const conceptToQuestionMap = {};
        concept_response.forEach(concept => {
          if (concept.concept_question_id && Array.isArray(concept.concept_question_id)) {
            conceptToQuestionMap[concept.concept_id] = concept.concept_question_id;
          }
        });

        Object.keys(testChapterMap).forEach(chapter => {
          let topicMappings = [];

          testChapterMap[chapter].forEach(topic_id => {
            let topicQuestions = new Set();
            const relatedConcepts = topicToConceptMap[topic_id] || [];
            relatedConcepts.forEach(concept_id => {
              if (conceptToQuestionMap[concept_id]) {
                conceptToQuestionMap[concept_id].forEach(question_id => topicQuestions.add(question_id));
              }
            });
            topicMappings.push({ [topic_id]: [...topicQuestions] });
          });
          testChapterMap[chapter] = topicMappings;
        });
      }
    }

    for (const chapter of uniqueTestChapters) {
      const current_chapter = chapter_details.find(ch => ch.chapter_id === chapter.chapter_id);
      let chapterObject = {
        chapter_id: chapter.chapter_id,
        chapter_name: current_chapter?.display_name || '',
        topics: []
      };

      if (!testChapterMap[chapter.chapter_id]) continue;

      for (const topicObj of testChapterMap[chapter.chapter_id]) {
        const topic_id = Object.keys(topicObj)[0];
        const topic_details = topic_response?.Items?.find(topic => topic.topic_id === topic_id);
        const topicQuestions = topicObj[topic_id];
        let total_marks = 0;
        let total_obtained_marks = 0;
        const studentMap = new Map();

        for (const test of testResult) {
          if (chapter.test_ids.includes(test.class_test_id)) {
            for (const marks of test.marks_details) {
              for (const question of marks.qa_details) {
                const questionId = question.question_id;
                if (topicQuestions.includes(questionId)) {
                  const quest = questionDetails.find(q => q.question_id === questionId);
                  if (quest) {
                    let total_student_marks = quest?.marks || 0;
                    let total_student_obtained_marks = question?.modified_marks !== "N.A." ? question?.modified_marks : question?.obtained_marks;

                    total_marks += parseInt(total_student_marks);
                    total_obtained_marks += parseInt(total_student_obtained_marks);
                    let student = studentData.Items.find(s => s.student_id === test.student_id);
                    if (!student) continue;

                    const studentEntry = {
                      student_id: student.student_id,
                      student_name: `${student.user_firstname} ${student.user_lastname}`,
                      studentMark: parseInt(total_student_obtained_marks),
                      totalMarks: parseInt(total_student_marks) || 0,
                      percentage: (((parseInt(total_student_obtained_marks) / (parseInt(total_student_marks) || 1)) * 100).toFixed(2))
                    };

                    if (!studentMap.has(student.student_id)) {
                      studentMap.set(student.student_id, studentEntry);
                    } else {
                      let existing = studentMap.get(student.student_id);
                      existing.studentMark += parseInt(studentEntry.studentMark);
                      existing.totalMarks += parseInt(studentEntry.totalMarks);
                      existing.percentage = (((existing.studentMark / existing.totalMarks) * 100).toFixed(2));
                      studentMap.set(student.student_id, existing);
                    }
                  }
                }
              }
            }
          }
        }

        chapterObject.topics.push({
          topic_id: topic_id,
          topic_name: topic_details?.display_name || "",
          total_marks,
          total_obtained_marks,
          class_average: total_marks ? ((total_obtained_marks / total_marks) * 100).toFixed(2) : "0.00",
          students: Array.from(studentMap.values())
        });
      }

      chapterTestResults.push(chapterObject);
    }
  }
  return chapterTestResults;
}

exports.comprehensivePerformanceConceptWise = async (request) => {
  const allStudentsData = await studentRepository.getStudentsData2(request);
  const quizDataRes = await quizRepository.fetchAllQuizBasedonChapter(request);

  const allQuestionIds = quizDataRes.Items.flatMap((quiz) => [
    ...quiz.question_track_details.qp_set_a.map((q) => q.question_id),
    ...quiz.question_track_details.qp_set_b.map((q) => q.question_id),
    ...quiz.question_track_details.qp_set_c.map((q) => q.question_id),
  ]);

  if (allQuestionIds.length == 0) return [];
  const questions = await questionRepository.fetchBulkQuestionsNameById2({
    question_id: [...new Set(allQuestionIds)],
  });

  const quizIds = quizDataRes.Items.map((val) => val.quiz_id);
  const quizResultDataRes =
    quizIds.length > 0 &&
    (await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    }));

  const performance = {};

  const quizResultsByStudent = quizResultDataRes.reduce((acc, result) => {
    if (result.evaluated === "Yes") {
      if (!acc[result.student_id]) acc[result.student_id] = [];
      acc[result.student_id].push(result);
    }
    return acc;
  }, {});

  const quizDataByQuizId = quizDataRes.Items.reduce((acc, quiz) => {
    acc[quiz.quiz_id] = quiz;
    return acc;
  }, {});

  const conceptIds = new Set();

  allStudentsData.Items.forEach((student) => {
    const { student_id, user_firstname, user_lastname } = student;
    const studentResults = quizResultsByStudent[student_id] || [];
    const studentPerformance = {};

    studentResults.forEach((result) => {
      const { quiz_id, marks_details } = result;
      const quizInfo = quizDataByQuizId[quiz_id];

      if (!quizInfo || !marks_details) return;

      const questionTrackDetails = quizInfo.question_track_details || {};

      marks_details.forEach((markDetail) => {
        const { set_key, qa_details } = markDetail;

        if (!qa_details || !set_key) return;

        const questionsForSet = questionTrackDetails[set_key] || [];

        questionsForSet.forEach((question) => {
          const { concept_id, question_id } = question;
          if (!concept_id) return;

          conceptIds.add(concept_id);

          if (!studentPerformance[concept_id]) {
            studentPerformance[concept_id] = {
              totalQuestions: 0,
              totalMarks: 0,
              obtainedMarks: 0,
            };
          }

          qa_details.forEach((qa) => {
            if (qa.question_id === question_id) {
              const marksData = questions.find(
                (question) => question.question_id == qa.question_id
              );

              const obtainedMarks = parseFloat(qa.obtained_marks) || 0;
              const modifiedMarks = parseFloat(qa.modified_marks) || 0;

              studentPerformance[concept_id].totalQuestions += 1;
              studentPerformance[concept_id].totalMarks += marksData?.marks;
              studentPerformance[concept_id].obtainedMarks += modifiedMarks
                ? modifiedMarks
                : obtainedMarks;
            }
          });
        });
      });
    });

    performance[student_id] = {
      name: `${user_firstname} ${user_lastname}`,
      performance: studentPerformance,
    };
  });

  const conceptData =
    conceptIds.size &&
    (await conceptRepository.fetchBulkConceptsIDName2({
      unit_Concept_id: [...conceptIds],
    }));

  Object.values(performance).forEach((student) => {
    Object.keys(student.performance).forEach((conceptId) => {
      const concept = conceptData.find((c) => c.concept_id === conceptId);
      if (concept) {
        student.performance[conceptId].title = concept.concept_title;
      }
    });
  });

  return performance;
};

exports.comprehensivePerformanceConceptWiseForTest = async (request) => {
  const testDetails = await classTestRepository.fetchAllTestBasedOnSubject(request);
  const studentData = await studentRepository.getStudentsData2(request);
  const question_paper_ids = testDetails.map(test => test.question_paper_id);
  const test_ids = testDetails.map(test => test.class_test_id);

  request['class_test_id'] = test_ids
  request['question_paper_ids'] = question_paper_ids;

  let testResult = [];
  if (test_ids.length > 0) {
    testResult = await testResultRepository.fetchStudentresultMetadata3(request);
  }

  const questionPaper = await testQuestionPaperRepository.getTestQuestionPaperById3(request);
  const test_chapter_ids = questionPaper?.data?.map(question => question.chapter_id).flat();
  let chapter_Ids = [...new Set([...test_chapter_ids])];

  chapter_Ids = chapter_Ids.filter(chapter_Id => chapter_Id !== undefined && chapter_Id === request.data.chapter_id);
  request["unit_chapter_id"] = chapter_Ids;

  const testChapterMap = {};
  if (questionPaper?.data?.length > 0) {
    for (const paper of questionPaper.data) {
      if (paper.chapter_id && Array.isArray(paper.chapter_id)) {
        const matchingTests = testDetails.filter(test => test.question_paper_id === paper.question_paper_id);

        for (const chapter of paper.chapter_id) {
          if (!testChapterMap[chapter]) {
            testChapterMap[chapter] = new Set();
          }

          for (const test of matchingTests) {
            testChapterMap[chapter].add(test.class_test_id);
          }
        }
      }
    }
  }

  const uniqueTestChapters = Object.entries(testChapterMap).map(([chapter_id, testIds]) => ({
    chapter_id: chapter_id,
    test_ids: [...testIds]
  }));

  const questionIds1 = testResult.flatMap(test =>
    test.marks_details.flatMap(mark =>
      mark.qa_details.map(qa => qa.question_id)
    )
  );

  const allQuestionIds = [...new Set([...questionIds1])];
  let questionDetails = [];
  if (allQuestionIds.length > 0) {
    questionDetails = await questionRepository.fetchBulkQuestionsNameById2({
      question_id: allQuestionIds,
    });
  }

  let chapter_details = [];
  if (chapter_Ids.length > 0) {
    chapter_details = await chapterRepository.fetchBulkChaptersIDName2(request);
    const chapter_array = chapter_details.map(val => ({ "chapter_id": val.chapter_id }));
    const chapter_response = await chapterRepository.fetchChaptersIDandChapterTopicID2({ items: chapter_array, condition: "OR" });

    if (chapter_response.Items.length > 0) {
      for (const chapter of chapter_response.Items) {
        testChapterMap[chapter.chapter_id] = [
          ...(chapter.prelearning_topic_id || []),
          ...(chapter.postlearning_topic_id || [])
        ];
      }
    }
  }
  const topic_array = Object.values(testChapterMap).flat().map(val => ({ topic_id: val }));
  const chapterTestResults = [];
  if (topic_array.length > 0) {
    const topic_response = await topicRepository.fetchTopicIDDisplayTitleData2({ items: topic_array, condition: "OR" });

    if (topic_response?.Items?.length > 0) {
      const topicToConceptMap = {};

      topic_response.Items.forEach(topic => {
        if (topic.topic_concept_id && Array.isArray(topic.topic_concept_id)) {
          topicToConceptMap[topic.topic_id] = topic.topic_concept_id;
        }
      });

      const concept_response = await conceptRepository.fetchConceptUsingTopicId(topic_response.Items);

      if (concept_response?.length > 0) {
        const conceptToQuestionMap = {};

        concept_response.forEach(concept => {
          if (concept.concept_question_id && Array.isArray(concept.concept_question_id)) {
            conceptToQuestionMap[concept.concept_id] = concept.concept_question_id;
          }
        });

        Object.keys(testChapterMap).forEach(chapter => {
          let conceptMappings = [];

          testChapterMap[chapter].forEach(topic_id => {
            const relatedConcepts = topicToConceptMap[topic_id] || [];

            relatedConcepts.forEach(concept_id => {
              let conceptQuestions = new Set();

              if (conceptToQuestionMap[concept_id]) {
                conceptToQuestionMap[concept_id].forEach(question_id => conceptQuestions.add(question_id));
              }

              conceptMappings.push({ [concept_id]: [...conceptQuestions] });
            });
          });

          testChapterMap[chapter] = conceptMappings;
        });
        for (const chapter of uniqueTestChapters) {
          const current_chapter = chapter_details.find(ch => ch.chapter_id === chapter.chapter_id);
          let chapterObject = {
            chapter_id: chapter.chapter_id,
            chapter_name: current_chapter?.display_name || '',
            concepts: []
          };

          if (!testChapterMap[chapter.chapter_id]) continue;

          for (const conceptObj of testChapterMap[chapter.chapter_id]) {
            const concept_id = Object.keys(conceptObj)[0];
            const concept_details = concept_response?.find(concept => concept.concept_id === concept_id);
            const conceptQuestions = conceptObj[concept_id];
            let total_marks = 0;
            let total_obtained_marks = 0;
            const studentMap = new Map();

            for (const test of testResult) {
              if (chapter.test_ids.includes(test.class_test_id)) {
                for (const marks of test.marks_details) {
                  for (const question of marks.qa_details) {
                    const questionId = question.question_id;
                    if (conceptQuestions.includes(questionId)) {
                      const quest = questionDetails.find(q => q.question_id === questionId);
                      if (quest) {
                        let total_student_marks = quest?.marks || 0;
                        let total_student_obtained_marks = question?.modified_marks !== "N.A." ? question?.modified_marks : question?.obtained_marks;

                        total_marks += parseInt(total_student_marks);
                        total_obtained_marks += parseInt(total_student_obtained_marks);
                        let student = studentData.Items.find(s => s.student_id === test.student_id);
                        if (!student) continue;

                        const studentEntry = {
                          student_id: student.student_id,
                          student_name: `${student.user_firstname} ${student.user_lastname}`,
                          studentMark: parseInt(total_student_obtained_marks),
                          totalMarks: parseInt(total_student_marks) || 0,
                          percentage: (((parseInt(total_student_obtained_marks) / (parseInt(total_student_marks) || 1)) * 100).toFixed(2))
                        };

                        if (!studentMap.has(student.student_id)) {
                          studentMap.set(student.student_id, studentEntry);
                        } else {
                          let existing = studentMap.get(student.student_id);
                          existing.studentMark += parseInt(studentEntry.studentMark);
                          existing.totalMarks += parseInt(studentEntry.totalMarks);
                          existing.percentage = (((existing.studentMark / existing.totalMarks) * 100).toFixed(2));
                          studentMap.set(student.student_id, existing);
                        }
                      }
                    }
                  }
                }
              }
            }

            chapterObject.concepts.push({
              concept_id: concept_id,
              concept_name: concept_details?.display_name || "",
              total_marks,
              total_obtained_marks,
              class_average: total_marks ? ((total_obtained_marks / total_marks) * 100).toFixed(2) : "0.00",
              students: Array.from(studentMap.values())
            });
          }
          chapterTestResults.push(chapterObject);
        }
      }
    }

  }
  return chapterTestResults;
}

exports.getActionsAndRecommendations = async (request) => {

  const quizDataRes = await quizRepository.fetchAllQuizBasedonSubject2(request);
  const schoolDataRes = await schoolRepository.getSchoolDetailsById2(request);

  const studentDataRes = await studentRepository.getStudentsData2(request);
  const totalStudents = studentDataRes.Items.length;

  const allQuizQuestionSetA = quizDataRes.Items.flatMap((quiz) =>
    Object.values(quiz.question_track_details.qp_set_a).flat()
  );

  const conceptAndQuestions = allQuizQuestionSetA.reduce((acc, item) => {
    const existingConcept = acc.find((concept) => concept.concept === item.concept_id);
    if (existingConcept) {
      existingConcept.questions.push(item.question_id);
    } else {
      acc.push({
        concept: item.concept_id,
        topic_id: item.topic_id,
        questions: [item.question_id],
      });
    }
    return acc;
  }, []);

  const conceptIdsSetA = [...new Set(allQuizQuestionSetA.map((item) => item.concept_id))];
  const questionIdsSetA = [...new Set(allQuizQuestionSetA.map((item) => item.question_id))];

  const questions = await new Promise((resolve, reject) => {
    questionIdsSetA.length > 0 && questionRepository.fetchBulkQuestionsNameById(
      { question_id: questionIdsSetA },
      (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      }
    );
  });

  const chapterIds = [...new Set(quizDataRes.Items.map((quiz) => quiz.chapter_id))];
  const chapterData = await chapterRepository.fetchBulkChaptersIDName2({
    unit_chapter_id: chapterIds,
  });

  console.log("chapterData - ", chapterData);

  const topicIdsSetA = [...new Set(allQuizQuestionSetA.map((item) => item.topic_id))];
  const topicData = await topicRepository.fetchBulkTopicsIDName2({
    unit_Topic_id: topicIdsSetA,
  });

  const quizIds = quizDataRes.Items.map((val) => val.quiz_id);
  const quizResultsRes =
    quizIds.length &&
    (await quizResultRepository.fetchBulkQuizResultsByID2({
      unit_Quiz_id: quizIds,
    }));


  const quizResultMarksData = quizResultsRes
    .filter((item) => item.evaluated === "Yes")
    .map((item) => {
      return {
        marks: item.marks_details[0].qa_details,
        studentId: item.student_id,
      };
    });

  const marksOfEachStudent = [];
  quizResultMarksData.map((qdata) => {
    qdata.marks.map((marks) => {
      questionIdsSetA.map((question) => {
        if (question === marks.question_id) {
          let marksValue;
          if (marks.modified_marks === "N.A.") {
            marksValue = marks.obtained_marks === "N.A." ? "0" : marks.obtained_marks;
          } else {
            marksValue = marks.modified_marks;
          }

          marksOfEachStudent.push({
            studentid: qdata.studentId,
            marks: marksValue,
            questionId: question,
          });
        }
      });
    });
  });
  console.log("marksOfEachStudent - ", marksOfEachStudent);

  const groupedMarks = marksOfEachStudent.reduce((acc, item) => {
    const existingStudent = acc.find((student) => student.studentid === item.studentid);

    if (existingStudent) {
      existingStudent.details.push({
        marks: item.marks,
        questionId: item.questionId,
      });
    } else {
      acc.push({
        studentid: item.studentid,
        details: [
          {
            marks: item.marks,
            questionId: item.questionId,
          },
        ],
      });
    }

    return acc;
  }, []);

  const conceptNames = await conceptRepository.fetchBulkConceptsIDName2({
    unit_Concept_id: conceptIdsSetA,
  });

  let conceptsToFocus = [];
  conceptAndQuestions.map((item) => {
    let studentsData = [];
    item.name = conceptNames.find((c) => c.concept_id == item.concept)?.display_name || "Unknown Concept";

    const relatedTopic = topicData.find((topic) => topic.topic_id == item.topic_id);
    console.log("relatedTopic - ", relatedTopic);

    // const relatedChapter = chapterData.find((chapter) => chapter.chapter_id === quizDataRes.Items.find((quiz) => quiz.chapter_id)?.chapter_id);
    const relatedChapter = chapterData.find(
      (chapter) =>
        chapter.prelearning_topic_id.includes(item.topic_id) ||
        chapter.postlearning_topic_id.includes(item.topic_id)
    );
    console.log("relatedChapter - ", relatedChapter);

    item.topic_name = relatedTopic?.topic_title || "Unknown Topic";
    item.chapter_name = relatedChapter?.chapter_title || "Unknown Chapter";

    const relatedQuiz = quizDataRes.Items.find((quiz) =>
      Object.values(quiz.question_track_details.qp_set_a).flat().some((q) => q.concept_id === item.concept)
    );
    item.learningType = relatedQuiz?.learningType || "Unknown Learning Type";
    const quizId = relatedQuiz?.quiz_id;

    const passPercentage = item.learningType === "preLearning"
      ? schoolDataRes.Items[0].pre_quiz_config.class_percentage
      : schoolDataRes.Items[0].post_quiz_config.class_percentage;

    const studentPassPercentage = item.learningType === "preLearning"
      ? schoolDataRes.Items[0].pre_quiz_config.pct_of_student_for_reteach
      : schoolDataRes.Items[0].post_quiz_config.pct_of_student_for_reteach;

    const totalMarksForThisQuiz = relatedQuiz.question_track_details.qp_set_a.reduce(
      (total, question) => {
        const questionDetail = questions.find(q => q.question_id === question.question_id);
        return questionDetail ? total + questionDetail.marks : total;
      }, 0
    );

    groupedMarks.map((student) => {
      let marks = 0;
      student.details.map((q) => {
        item.questions.map((question) => {
          if (q.questionId === question) {
            marks += Number(q.marks);
          }
        });
      });
      let finalMarks = (marks / totalMarksForThisQuiz) * 100;
      let passed = finalMarks >= studentPassPercentage ? true : false;
      studentsData.push({ student: student.studentid, passed: passed });
    });

    const countPassed = studentsData.filter((student) => student.passed).length;
    const passedPercentage = (countPassed / totalStudents) * 100;

    if (passedPercentage < passPercentage) {
      conceptsToFocus.push({
        concept: item.name,
        topic: item.topic_name,
        chapter: item.chapter_name,
        learningType: item.learningType,
        passedPercentage: passedPercentage.toFixed(2),
        quizDate: relatedQuiz?.created_ts,
        quizId: quizId,
      });
    }
  });

  return {
    conceptsToFocus,
  };
};


exports.getActionsAndRecommendationDetail = async (request) => {
  const [quizData, quizResult, schoolDataRes] = await Promise.all([
    quizRepository.fetchQuizDataById2(request),
    quizResultRepository.fetchQuizResultByQuizId(request),
    schoolRepository.getSchoolDetailsById2(request),
  ]);

  const studentDataRes = await studentRepository.getStudentsData2(request);
  const totalStudents = studentDataRes.Items.length;

  let learningType = quizData.Item.learningType || "Unknown Learning Type";

  const passPercentage = learningType === "preLearning"
    ? schoolDataRes.Items[0].pre_quiz_config.class_percentage
    : schoolDataRes.Items[0].post_quiz_config.class_percentage;

  const studentPassPercentage = learningType === "preLearning"
    ? schoolDataRes.Items[0].pre_quiz_config.pct_of_student_for_reteach
    : schoolDataRes.Items[0].post_quiz_config.pct_of_student_for_reteach;

  const questionSetA = [
    ...new Set(Object.values(quizData.Item.question_track_details.qp_set_a).flat())
  ];

  const conceptAndQuestions = questionSetA.reduce((acc, item) => {
    const existingConcept = acc.find((concept) => concept.concept === item.concept_id);
    if (existingConcept) {
      existingConcept.questions.push(item.question_id);
    } else {
      acc.push({
        concept: item.concept_id,
        topic_id: item.topic_id,
        questions: [item.question_id],
      });
    }
    return acc;
  }, []);

  const conceptIdsSetA = questionSetA.map((item) => item.concept_id);
  const questionIdsSetA = questionSetA.map((item) => item.question_id);

  const questions = await new Promise((resolve, reject) => {
    questionRepository.fetchBulkQuestionsNameById(
      { question_id: questionIdsSetA },
      (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        resolve(res);
      }
    );
  });

  const topicIdsSetA = [...new Set(questionSetA.map((item) => item.topic_id))];
  const topicData = await topicRepository.fetchBulkTopicsIDName2({ unit_Topic_id: topicIdsSetA });
  const chapterData = await chapterRepository.fetchBulkChaptersIDName2({ unit_chapter_id: [quizData.Item.chapter_id] });

  const quizResultMarksData = quizResult.Items.map((item) => {
    return {
      marks: item.marks_details[0].qa_details,
      studentId: item.student_id,
    };
  });

  const marksOfEachStudent = [];
  quizResultMarksData.forEach((qdata) => {
    qdata.marks.forEach((marks) => {
      questionIdsSetA.forEach((question) => {
        if (question === marks.question_id) {
          let marksValue = marks.modified_marks === "N.A."
            ? marks.obtained_marks === "N.A." ? "0" : marks.obtained_marks
            : marks.modified_marks;

          const student = studentDataRes.Items.find((student) => student.student_id === qdata.studentId);
          const studentFullName = student ? `${student.user_firstname} ${student.user_lastname}` : "Unknown Student";

          marksOfEachStudent.push({
            studentName: studentFullName,
            marks: marksValue,
            questionId: question,
          });
        }
      });
    });
  });

  const groupedMarks = marksOfEachStudent.reduce((acc, item) => {
    const existingStudent = acc.find((student) => student.studentName === item.studentName);
    if (existingStudent) {
      existingStudent.details.push({ marks: item.marks, questionId: item.questionId });
    } else {
      acc.push({
        studentName: item.studentName,
        details: [{ marks: item.marks, questionId: item.questionId }],
      });
    }
    return acc;
  }, []);

  const conceptNames = await conceptRepository.fetchBulkConceptsIDName2({ unit_Concept_id: conceptIdsSetA });

  let conceptsToFocus = [];

  let chapterName = chapterData.find((chapter) => chapter.chapter_id === quizData.Item.chapter_id)?.chapter_title || "Unknown Chapter";

  conceptAndQuestions.forEach((item) => {
    let studentsData = [];
    let studentPerformance = [];
    item.name = conceptNames.find((c) => c.concept_id == item.concept)?.display_name || "Unknown Concept";

    const relatedTopic = topicData.find((topic) => topic.topic_id == item.topic_id);
    item.topic_name = relatedTopic?.topic_title || "Unknown Topic";

    const totalMarksForThisQuiz = quizData.Item.question_track_details.qp_set_a.reduce(
      (total, question) => {
        const questionDetail = questions.Items.find(q => q.question_id === question.question_id);
        return questionDetail ? total + questionDetail.marks : total;
      }, 0
    );

    groupedMarks.forEach((student) => {
      let marks = 0;
      student.details.forEach((q) => {
        if (item.questions.includes(q.questionId)) {
          marks += Number(q.marks);
        }
      });

      let marksPercentage = (marks / totalMarksForThisQuiz) * 100;
      let passed = marksPercentage >= studentPassPercentage;
      studentsData.push({ student: student.studentName, passed });

      studentPerformance.push({
        student_name: student.studentName,
        marks_percentage: marksPercentage.toFixed(2),
        obtained_marks: marks.toFixed(2),
        total_marks: totalMarksForThisQuiz.toFixed(2),
      });
    });

    const countPassed = studentsData.filter((student) => student.passed).length;
    const passedPercentageValue = (countPassed / totalStudents) * 100;

    if (passedPercentageValue < passPercentage) {
      conceptsToFocus.push({
        concept: item.name,
        topic: item.topic_name,
        passedPercentage: passedPercentageValue.toFixed(2),
        quizDate: quizData.Item.created_ts,
        student_performance: studentPerformance,
      });
    }
  });

  return {
    conceptsToFocus,
    learningType,
    chapterName,
    passPercentage,
    studentPassPercentage,
  };
};









