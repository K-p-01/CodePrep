import { describe, expect, it } from "vitest";
import {
  ACTIVITY_HISTORY_LIMIT,
  ACTIVITY_RETENTION_DAYS,
  aggregateActivityTrend,
  aggregateDailyActivity,
  appendActivityEvent,
  calculateCurrentStreak,
  createActivityEvent,
  getActivityEvents,
} from "../src/data/activityHistory.js";

const at = (day, hour = 12) => new Date(2026, 9, day, hour, 0, 0);
const event = (id, type, date, metadata = { subjectId: "dsa", topicId: "arrays" }) =>
  createActivityEvent(type, metadata, date, id);

describe("prospective activity history", () => {
  it("appends a minimal event while preserving legacy progress and deduplicates retries", () => {
    const legacy = { "dsa:arrays": true, savedItems: [{ type: "topic", subjectId: "dsa", topicId: "arrays", itemId: "arrays" }], opaqueField: 42 };
    const completed = event("complete-1", "topic_completed", at(29));
    const once = appendActivityEvent(legacy, completed, at(29));
    const twice = appendActivityEvent(once, completed, at(29));
    expect(once).toMatchObject({ ...legacy, activityTrackingStartedAt: completed.timestamp, activityHistory: [completed] });
    expect(twice).toBe(once);
    expect(completed).not.toHaveProperty("title");
    expect(completed).not.toHaveProperty("answer");
  });

  it("keeps at most 500 valid events and prunes records older than approximately 90 days", () => {
    const now = at(30);
    const recent = Array.from({ length: ACTIVITY_HISTORY_LIMIT + 3 }, (_, index) =>
      event(`recent-${index}`, "topic_completed", new Date(now.getTime() - (index + 1) * 1000)),
    );
    const old = event("old", "topic_completed", new Date(now.getTime() - (ACTIVITY_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000));
    const progress = { activityHistory: [old, ...recent], activityTrackingStartedAt: old.timestamp };
    const appended = appendActivityEvent(progress, event("newest", "mcq_answered", now, { subjectId: "dsa", topicId: "arrays", questionId: "q1", correct: true }), now);
    expect(appended.activityHistory).toHaveLength(ACTIVITY_HISTORY_LIMIT);
    expect(getActivityEvents(appended, now)).toHaveLength(ACTIVITY_HISTORY_LIMIT);
    expect(getActivityEvents(appended, now).some((item) => item.id === "old")).toBe(false);
    expect(getActivityEvents(appended, now).at(-1).id).toBe("newest");
  });

  it("handles missing and malformed optional history without resetting existing progress", () => {
    const legacy = { "dsa:arrays": true, savedItems: [], dailyMission: { date: "2026-10-30" } };
    const first = event("first", "coding_problem_completed", at(30), { subjectId: "dsa", topicId: "arrays", problemId: "two-sum" });
    const upgraded = appendActivityEvent(legacy, first, at(30));
    expect(upgraded["dsa:arrays"]).toBe(true);
    expect(upgraded.dailyMission).toEqual(legacy.dailyMission);
    expect(upgraded.activityHistory).toEqual([first]);

    const malformed = { ...legacy, activityHistory: { bad: "shape" } };
    expect(getActivityEvents(malformed, at(30))).toEqual([]);
    const repaired = appendActivityEvent(malformed, first, at(30));
    expect(repaired.activityHistory).toEqual([first]);
    expect(repaired.activityHistoryMalformedBackup).toEqual({ bad: "shape" });
    expect(repaired["dsa:arrays"]).toBe(true);
  });

  it("marks pre-tracking days unknown, tracked empty days inactive, and today pending", () => {
    const progress = appendActivityEvent({}, event("oct-27", "topic_completed", at(27)), at(27));
    const withSecond = appendActivityEvent(progress, event("oct-29", "revision_reviewed", at(29), { subjectId: "dbms", topicId: "normalization", itemType: "topic" }), at(30));
    const activity = aggregateDailyActivity(withSecond, 7, at(30));
    expect(activity.days.find((day) => day.date === "2026-10-26").status).toBe("unknown");
    expect(activity.days.find((day) => day.date === "2026-10-27").status).toBe("active");
    expect(activity.days.find((day) => day.date === "2026-10-28").status).toBe("inactive");
    expect(activity.days.find((day) => day.date === "2026-10-29").status).toBe("active");
    expect(activity.days.find((day) => day.date === "2026-10-30").status).toBe("pending");
    expect(activity).toMatchObject({ activeDays: 2, inactiveDays: 1, unknownDays: 3, pendingToday: true, consistencyPercent: 67 });
  });

  it("calculates a consecutive streak and resets it across an inactive-day gap", () => {
    let progress = appendActivityEvent({}, event("day-27", "topic_completed", at(27)), at(30));
    progress = appendActivityEvent(progress, event("day-28", "mcq_answered", at(28), { subjectId: "dsa", topicId: "arrays", questionId: "q1", correct: false }), at(30));
    expect(calculateCurrentStreak(progress, at(29))).toBe(2);
    const gap = appendActivityEvent({}, event("day-29", "topic_completed", at(29)), at(30));
    expect(calculateCurrentStreak(gap, at(30))).toBe(1);
    expect(calculateCurrentStreak({}, at(30))).toBeNull();
  });

  it("builds a dated event trend and never creates historical topic completions", () => {
    const progress = { "dsa:arrays": true };
    const empty = aggregateActivityTrend(progress, 7, at(30));
    expect(empty.series.every((day) => day.total === 0 && day.topicCompletions === 0)).toBe(true);
    const tracked = appendActivityEvent({}, event("topic", "topic_completed", at(29)), at(30));
    const trend = aggregateActivityTrend(tracked, 7, at(30));
    expect(trend.series.find((day) => day.date === "2026-10-29").topicCompletions).toBe(1);
    expect(trend.series.find((day) => day.date === "2026-10-28").topicCompletions).toBe(0);
    expect(trend.series.find((day) => day.date === "2026-10-28").status).toBe("unknown");
  });
});
