export const DEFAULT_PRACTICE_FILTERS = {
  subject: "all",
  topic: "all",
  type: "all",
  difficulty: "all",
  status: "all",
};

export function topicFilterValue(subject, topic) {
  return `${subject.id}:${topic.id}`;
}

export function getPracticeFilterOptions(contexts, progressApi) {
  const subjects = new Map();
  const topics = new Map();
  const types = new Set();
  const difficulties = new Set();
  let hasItems = false;

  for (const { subject, topic, practice } of contexts) {
    subjects.set(subject.id, { value: subject.id, label: subject.name });
    topics.set(topicFilterValue(subject, topic), {
      value: topicFilterValue(subject, topic),
      label: `${subject.name} · ${topic.title}`,
    });

    for (const problem of practice?.problems ?? []) {
      hasItems = true;
      types.add("coding");
      if (problem.difficulty) difficulties.add(problem.difficulty);
    }

    for (const question of practice?.questions ?? []) {
      hasItems = true;
      types.add("mcq");
      if (question.difficulty) difficulties.add(question.difficulty);
    }
  }

  return {
    subjects: [...subjects.values()],
    topics: [...topics.values()],
    types: [...types],
    difficulties: [...difficulties],
    hasItems,
    hasCompletionStatus: Boolean(hasItems && progressApi),
  };
}

export function filterPracticeItems({ subject, topic, practice, filters, progressApi }) {
  const matchesContext =
    (filters.subject === "all" || filters.subject === subject.id) &&
    (filters.topic === "all" || filters.topic === topicFilterValue(subject, topic));
  if (!matchesContext) return { problems: [], questions: [] };

  const matchesItem = (item, type, completed) =>
    (filters.type === "all" || filters.type === type) &&
    (filters.difficulty === "all" || item.difficulty === filters.difficulty) &&
    (filters.status === "all" || (filters.status === "completed" ? completed : !completed));

  const problems = (practice?.problems ?? []).filter((problem) => {
    const completed = progressApi.isCodingProblemComplete(subject.id, topic.id, problem.id);
    return matchesItem(problem, "coding", completed);
  });
  const attempt = progressApi.getMcqAttempt(subject.id, topic.id);
  const questions = (practice?.questions ?? []).filter((question) => {
    const completed = Boolean(question.options?.includes(attempt.answers?.[question.id]?.selectedAnswer));
    return matchesItem(question, "mcq", completed);
  });

  return { problems, questions };
}

export function hasActivePracticeFilters(filters) {
  return Object.entries(DEFAULT_PRACTICE_FILTERS).some(([key, value]) => filters[key] !== value);
}
