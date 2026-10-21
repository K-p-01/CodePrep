const PILLARS = [
  { id: "dsa", title: "DSA & Problem Solving", subjectIds: ["dsa"], href: "/subjects/dsa", tone: "blue" },
  { id: "core-cs", title: "Core CS", subjectIds: ["dbms", "os", "cn", "oop"], tone: "violet" },
  { id: "aptitude", title: "Aptitude", subjectIds: ["aptitude"], href: "/subjects/aptitude", tone: "amber" },
  { id: "interview-prep", title: "Interview Preparation", subjectIds: ["interview-prep"], href: "/subjects/interview-prep", tone: "green" },
];

function uniqueTopics(subjects) {
  const seen = new Set();
  return subjects.flatMap((subject) => (Array.isArray(subject.topics) ? subject.topics : [])
    .filter((topic) => {
      if (typeof subject.id !== "string" || !subject.id || typeof topic?.id !== "string" || !topic.id) return false;
      const key = `${subject.id}:${topic.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((topic) => ({ subject, topic })));
}

export function getPlacementPillars(catalog, progressApi) {
  const byId = new Map((Array.isArray(catalog) ? catalog : []).filter((subject) => subject?.id).map((subject) => [subject.id, subject]));

  return PILLARS.map((pillar) => {
    const availableSubjects = pillar.subjectIds.map((id) => byId.get(id)).filter(Boolean);
    const topics = uniqueTopics(availableSubjects);
    const codingProblems = new Map();
    const mcqQuestions = new Map();
    let completedTopics = 0;
    let answeredQuestions = 0;
    let correctAnswers = 0;

    for (const { subject, topic } of topics) {
      if (progressApi.isTopicComplete(subject.id, topic.id)) completedTopics += 1;
      const problems = Array.isArray(topic.practice?.problems) ? topic.practice.problems : [];
      for (const problem of problems) {
        if (typeof problem?.id !== "string" || !problem.id) continue;
        const key = `${subject.id}:${topic.id}:${problem.id}`;
        if (!codingProblems.has(key)) codingProblems.set(key, { subject, topic, problem });
      }

      const questions = Array.isArray(topic.practice?.questions) ? topic.practice.questions : [];
      const attempt = progressApi.getMcqAttempt(subject.id, topic.id);
      for (const question of questions) {
        if (typeof question?.id !== "string" || !question.id || !Array.isArray(question.options) || typeof question.correctAnswer !== "string") continue;
        const key = `${subject.id}:${topic.id}:${question.id}`;
        if (mcqQuestions.has(key)) continue;
        mcqQuestions.set(key, { subject, topic, question });
        const answer = attempt.answers?.[question.id];
        if (typeof answer?.selectedAnswer !== "string" || !question.options.includes(answer.selectedAnswer)) continue;
        answeredQuestions += 1;
        if (answer.selectedAnswer === question.correctAnswer) correctAnswers += 1;
      }
    }

    const completedCodingProblems = [...codingProblems.values()].filter(({ subject, topic, problem }) =>
      progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id),
    ).length;

    return {
      ...pillar,
      availableSubjects,
      completedTopics,
      totalTopics: topics.length,
      completedCodingProblems,
      totalCodingProblems: codingProblems.size,
      answeredQuestions,
      correctAnswers,
      totalQuestions: mcqQuestions.size,
      accuracy: answeredQuestions ? Math.round((correctAnswers / answeredQuestions) * 100) : null,
    };
  });
}
