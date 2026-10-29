import { describe, expect, it } from "vitest";
import {
  CODING_ATTEMPT_LIMIT,
  CODING_ATTEMPTS_PER_PROBLEM_LIMIT,
  appendCodingAttempt,
  codingProblemKey,
  createCodingAttempt,
  getCodingPracticeRecord,
  getNextIncompleteProblem,
  getSafeCodingProblemUrl,
  saveCodingNotes,
} from "../src/data/codingPractice.js";

const ids = ["dsa", "arrays", "two-sum"];
const at = (minute = 0) => new Date(Date.UTC(2026, 9, 30, 10, minute));
const notes = { approach: "Use a map.", keyInsight: "Store earlier values.", timeComplexity: "O(n)", spaceComplexity: "O(n)", learned: "Check before insert.", mistakeToAvoid: "Do not reuse the same item." };
const attempt = (id, minute, outcome = "still-working") => createCodingAttempt({ id, now: at(minute), outcome, reflection: `Reflection ${id}` });

describe("coding practice workspace data", () => {
  it("saves notes under the matching problem key while preserving completion and legacy fields", () => {
    const progress = { "coding:dsa:arrays:two-sum": true, "dsa:arrays": true, savedItems: [{ type: "coding", ...{ subjectId: "dsa", topicId: "arrays", itemId: "two-sum" } }], customLegacyValue: 7 };
    const saved = saveCodingNotes(progress, ...ids, notes, at().toISOString());
    const other = saveCodingNotes(saved, "dsa", "arrays", "move-zeroes", { approach: "Different problem notes." }, at(1).toISOString());
    expect(codingProblemKey(...ids)).toBe(JSON.stringify(ids));
    expect(getCodingPracticeRecord(other, ...ids).notes).toEqual(notes);
    expect(getCodingPracticeRecord(other, "dsa", "arrays", "move-zeroes").notes.approach).toBe("Different problem notes.");
    expect(other["coding:dsa:arrays:two-sum"]).toBe(true);
    expect(other["dsa:arrays"]).toBe(true);
    expect(other.customLegacyValue).toBe(7);
    expect(other.savedItems).toEqual(progress.savedItems);
  });

  it("records multiple attempts, sorts latest first, and derives a durable total count", () => {
    let progress = {};
    progress = appendCodingAttempt(progress, ...ids, attempt("a1", 1, "still-working"));
    progress = appendCodingAttempt(progress, ...ids, attempt("a2", 2, "solved-with-hints"));
    progress = appendCodingAttempt(progress, ...ids, attempt("a3", 3, "solved-independently"));
    const record = getCodingPracticeRecord(progress, ...ids);
    expect(record.attemptCount).toBe(3);
    expect(record.attempts.map((entry) => entry.id)).toEqual(["a3", "a2", "a1"]);
    expect(record.attempts[0].outcome).toBe("solved-independently");
    expect(record.attempts[0].reflection).toBe("Reflection a3");
  });

  it("deduplicates a replayed state update but permits a distinct deliberate attempt", () => {
    const first = appendCodingAttempt({}, ...ids, attempt("one", 1));
    const duplicate = appendCodingAttempt(first, ...ids, attempt("one", 1));
    const second = appendCodingAttempt(duplicate, ...ids, attempt("two", 2));
    expect(duplicate).toBe(first);
    expect(getCodingPracticeRecord(second, ...ids).attemptCount).toBe(2);
  });

  it("caps retained attempts per problem and globally without touching completion records", () => {
    let progress = { "coding:dsa:arrays:two-sum": true };
    for (let index = 0; index < CODING_ATTEMPTS_PER_PROBLEM_LIMIT + 4; index += 1) {
      progress = appendCodingAttempt(progress, ...ids, attempt(`attempt-${index}`, index));
    }
    expect(getCodingPracticeRecord(progress, ...ids).attempts).toHaveLength(CODING_ATTEMPTS_PER_PROBLEM_LIMIT);
    expect(getCodingPracticeRecord(progress, ...ids).attemptCount).toBe(CODING_ATTEMPTS_PER_PROBLEM_LIMIT + 4);
    expect(progress["coding:dsa:arrays:two-sum"]).toBe(true);

    for (let index = 0; index < CODING_ATTEMPT_LIMIT + 1; index += 1) {
      progress = appendCodingAttempt(progress, "dsa", "topic", `problem-${index}`, attempt(`global-${index}`, index));
    }
    const retained = Object.values(progress.codingPractice).reduce((count, record) => count + record.attempts.length, 0);
    expect(retained).toBeLessThanOrEqual(CODING_ATTEMPT_LIMIT);
    expect(progress["coding:dsa:arrays:two-sum"]).toBe(true);
  });

  it("handles legacy and malformed optional coding data without losing unrelated progress", () => {
    const legacy = { "coding:dsa:arrays:two-sum": true, savedItems: [] };
    expect(getCodingPracticeRecord(legacy, ...ids)).toMatchObject({ notes: { approach: "" }, attempts: [], attemptCount: 0 });
    const saved = saveCodingNotes(legacy, ...ids, notes, at().toISOString());
    expect(saved["coding:dsa:arrays:two-sum"]).toBe(true);
    const malformed = { ...legacy, codingPractice: "malformed-map" };
    expect(getCodingPracticeRecord(malformed, ...ids).attempts).toEqual([]);
    const repaired = appendCodingAttempt(malformed, ...ids, attempt("safe", 2));
    expect(repaired.codingPracticeMalformedBackup).toBe("malformed-map");
    expect(repaired["coding:dsa:arrays:two-sum"]).toBe(true);
    expect(repaired.savedItems).toEqual([]);
    expect(appendCodingAttempt(legacy, ...ids, { id: "bad", outcome: "solved", timestamp: "invalid" })).toBe(legacy);
  });

  it("handles invalid note fields, timestamps, and outcomes safely", () => {
    expect(saveCodingNotes({}, ...ids, "not-an-object")).toEqual({});
    expect(createCodingAttempt({ id: "bad-date", outcome: "still-working", now: "invalid" })).toBeNull();
    expect(createCodingAttempt({ id: "bad-outcome", outcome: "verified", now: at() })).toBeNull();
    const saved = saveCodingNotes({}, ...ids, { approach: "A".repeat(5000) }, at().toISOString());
    expect(getCodingPracticeRecord(saved, ...ids).notes.approach).toHaveLength(4000);
  });

  it("chooses the next incomplete problem in catalog order and returns none when exhausted", () => {
    const problems = [{ id: "one" }, { id: "two" }, { id: "three" }];
    expect(getNextIncompleteProblem(problems, "one", (id) => id === "one")).toEqual({ id: "two" });
    expect(getNextIncompleteProblem(problems, "three", (id) => id === "one" || id === "three")).toEqual({ id: "two" });
    expect(getNextIncompleteProblem(problems, "two", () => true)).toBeNull();
    expect(getNextIncompleteProblem(problems, "missing", () => false)).toBeNull();
  });

  it("accepts only HTTP(S) external practice links", () => {
    expect(getSafeCodingProblemUrl("https://leetcode.com/problems/two-sum/")).toBe("https://leetcode.com/problems/two-sum/");
    expect(getSafeCodingProblemUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeCodingProblemUrl("not a url")).toBeNull();
  });
});
