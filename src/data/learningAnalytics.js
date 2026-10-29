import { buildReadinessReport } from "./readinessCoach.js";
import { aggregateActivityTrend, aggregateDailyActivity, calculateCurrentStreak, getActivityEvents, getActivityTrackingStart } from "./activityHistory.js";
import { buildRevisionQueue } from "./revisionQueue.js";

function safeCall(callback, fallback) {
  try {
    const value = callback();
    return value && typeof value === "object" ? value : fallback;
  } catch { return fallback; }
}

function validTopic(subject, topic) {
  return Boolean(subject?.id && topic && typeof topic.id === "string" && topic.id);
}

export function getSubjectAnalytics(catalogInput, progressApi, activityEvents = [], tracked = false) {
  const catalog = Array.isArray(catalogInput) ? catalogInput : [];
  return catalog.filter((subject) => subject?.id).map((subject) => {
    const topics = [...new Map((Array.isArray(subject.topics) ? subject.topics : [])
      .filter((topic) => validTopic(subject, topic)).map((topic) => [topic.id, topic])).values()];
    const subjectProgress = safeCall(() => progressApi?.getSubjectProgress?.(subject), {
      totalTopics: topics.length,
      completedTopics: topics.filter((topic) => progressApi?.isTopicComplete?.(subject.id, topic.id) === true).length,
    });
    const topicSummaries = topics.map((topic) => {
      const summary = safeCall(() => progressApi?.getPracticeSummary?.(subject.id, topic.id, topic.practice), {
        answeredQuestions: 0, correctAnswers: 0, accuracy: null, totalQuestions: 0,
        completedProblems: 0, totalProblems: Array.isArray(topic.practice?.problems) ? topic.practice.problems.length : 0,
      });
      return { topic, summary };
    });
    const answeredQuestions = topicSummaries.reduce((total, item) => total + (Number.isInteger(item.summary.answeredQuestions) ? item.summary.answeredQuestions : 0), 0);
    const correctAnswers = topicSummaries.reduce((total, item) => total + (Number.isInteger(item.summary.correctAnswers) ? item.summary.correctAnswers : Number.isInteger(item.summary.score) ? item.summary.score : 0), 0);
    const totalQuestions = topicSummaries.reduce((total, item) => total + (Number.isInteger(item.summary.totalQuestions) ? item.summary.totalQuestions : 0), 0);
    const completedCodingProblems = topicSummaries.reduce((total, item) => total + (Number.isInteger(item.summary.completedProblems) ? item.summary.completedProblems : 0), 0);
    const totalCodingProblems = topicSummaries.reduce((total, item) => total + (Number.isInteger(item.summary.totalProblems) ? item.summary.totalProblems : 0), 0);
    const answerEvents = tracked ? activityEvents.filter((event) => event.type === "mcq_answered" && event.subjectId === subject.id).length : null;
    const attentionTopics = topicSummaries.filter(({ topic, summary }) =>
      Number.isInteger(summary.answeredQuestions) && summary.answeredQuestions >= 3 && Number.isFinite(summary.accuracy) && summary.accuracy <= 60,
    ).map(({ topic, summary }) => ({ topic, accuracy: summary.accuracy, answered: summary.answeredQuestions }));
    const completion = Number.isInteger(subjectProgress.completedTopics) ? subjectProgress.completedTopics : 0;
    const total = Number.isInteger(subjectProgress.totalTopics) ? subjectProgress.totalTopics : topics.length;
    return {
      subject,
      completedTopics: completion,
      totalTopics: total,
      completionPercent: total ? Math.round(completion / total * 100) : null,
      answeredQuestions,
      correctAnswers,
      accuracy: answeredQuestions ? Math.round(correctAnswers / answeredQuestions * 100) : null,
      totalQuestions,
      mcqSubmissionEvents: answerEvents,
      completedCodingProblems,
      totalCodingProblems,
      attentionTopics,
    };
  });
}

export function buildLearningAnalytics(catalogInput, progressApi, { days = 7, now = new Date() } = {}) {
  const catalog = Array.isArray(catalogInput) ? catalogInput : [];
  const progress = progressApi?.progress && typeof progressApi.progress === "object" ? progressApi.progress : {};
  const events = getActivityEvents(progress, now);
  const trackingStartedAt = getActivityTrackingStart(progress, now);
  const tracked = Boolean(trackingStartedAt);
  const studySummary = safeCall(() => progressApi?.getStudySummary?.(), {
    totalTopics: 0, completedTopics: 0, totalCodingProblems: 0, completedCodingProblems: 0,
    answeredQuestions: 0, correctAnswers: 0, mcqAccuracy: null,
  });
  const readiness = buildReadinessReport(catalog, progressApi, now);
  const subjectMetrics = getSubjectAnalytics(catalog, progressApi, events, tracked);
  const trend = aggregateActivityTrend(progress, days, now);
  const dailyActivity = aggregateDailyActivity(progress, days, now);
  const streak = calculateCurrentStreak(progress, now);
  return {
    period: days === 30 ? 30 : 7,
    trackingStartedAt,
    trackingAvailable: tracked,
    topicCoverage: {
      completed: Number.isInteger(studySummary.completedTopics) ? studySummary.completedTopics : 0,
      total: Number.isInteger(studySummary.totalTopics) ? studySummary.totalTopics : 0,
      percent: Number.isInteger(studySummary.totalTopics) && studySummary.totalTopics > 0
        ? Math.round((studySummary.completedTopics ?? 0) / studySummary.totalTopics * 100) : null,
    },
    practice: {
      answeredQuestions: Number.isInteger(studySummary.answeredQuestions) ? studySummary.answeredQuestions : 0,
      correctAnswers: Number.isInteger(studySummary.correctAnswers) ? studySummary.correctAnswers : 0,
      accuracy: Number.isFinite(studySummary.mcqAccuracy) ? studySummary.mcqAccuracy : null,
      completedCodingProblems: Number.isInteger(studySummary.completedCodingProblems) ? studySummary.completedCodingProblems : 0,
      totalCodingProblems: Number.isInteger(studySummary.totalCodingProblems) ? studySummary.totalCodingProblems : 0,
    },
    activity: {
      ...dailyActivity,
      streak,
      totalEventsInPeriod: trend.series.reduce((sum, day) => sum + day.total, 0),
    },
    trend,
    subjectMetrics,
    simulations: readiness.simulations,
    revision: readiness.revision,
    recommendations: readiness.recommendations,
  };
}
