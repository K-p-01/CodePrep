import { describe, expect, it } from "vitest";
import { subjects } from "../src/data/subjects.js";
import { dsaPatterns } from "../src/data/dsaPatterns.js";

const difficulties = new Set(["Easy", "Medium", "Hard"]);

function allRecords(selector) {
  return subjects.flatMap((subject) => subject.topics.flatMap((topic) => selector(subject, topic)));
}

describe("learning catalog", () => {
  it("has unique stable IDs and the expected subject and topic references", () => {
    expect(subjects).toHaveLength(7);
    expect(new Set(subjects.map(({ id }) => id)).size).toBe(subjects.length);
    expect(subjects.reduce((sum, subject) => sum + subject.topics.length, 0)).toBe(53);
    expect(new Set(allRecords((subject, topic) => [`${subject.id}:${topic.id}`])).size).toBe(53);

    for (const subject of subjects) {
      expect(subject.id).toBeTruthy();
      for (const topic of subject.topics) {
        expect(topic.id).toBeTruthy();
        expect(topic.practice).toBeTruthy();
        expect(Array.isArray(topic.practice.problems)).toBe(true);
        expect(Array.isArray(topic.practice.questions)).toBe(true);
      }
    }
  });

  it("has unique problem and question IDs, valid difficulty labels, and valid topic mapping", () => {
    const problems = allRecords((subject, topic) => (topic.practice.problems ?? []).map((problem) => ({ subject, topic, problem })));
    const questions = allRecords((subject, topic) => (topic.practice.questions ?? []).map((question) => ({ subject, topic, question })));
    expect(new Set(problems.map(({ problem }) => problem.id)).size).toBe(problems.length);
    expect(new Set(questions.map(({ question }) => question.id)).size).toBe(questions.length);

    for (const { subject, topic, problem } of problems) {
      expect(difficulties.has(problem.difficulty), problem.id).toBe(true);
      expect(problem.topic, problem.id).toBe(topic.title);
      expect(subject.topics).toContain(topic);
      expect(new URL(problem.url).protocol).toMatch(/^https?:$/);
    }
    for (const { subject, topic, question } of questions) {
      expect(difficulties.has(question.difficulty), question.id).toBe(true);
      expect(question.topic, question.id).toBe(topic.title);
      expect(subject.topics).toContain(topic);
      expect(question.options.length, question.id).toBeGreaterThanOrEqual(2);
      expect(new Set(question.options).size, question.id).toBe(question.options.length);
      expect(question.options, question.id).toContain(question.correctAnswer);
      expect(question.explanation?.trim(), question.id).toBeTruthy();
    }
  });

  it("has unique resource IDs and usable, described HTTP(S) resources", () => {
    const resources = allRecords((subject, topic) => (topic.resources ?? []).map((resource) => ({ subject, topic, resource })));
    expect(resources.length).toBeGreaterThan(0);
    expect(new Set(resources.map(({ resource }) => resource.id)).size).toBe(resources.length);
    for (const { resource } of resources) {
      expect(resource.id).toBeTruthy();
      expect(resource.title?.trim()).toBeTruthy();
      expect(resource.source?.trim()).toBeTruthy();
      expect(resource.type?.trim()).toBeTruthy();
      expect(resource.description?.trim()).toBeTruthy();
      expect(["http:", "https:"], resource.url).toContain(new URL(resource.url).protocol);
    }
  });

  it("meets coding difficulty targets without inventing code practice for theory subjects", () => {
    const dsa = subjects.find((subject) => subject.id === "dsa");
    const codingTopics = dsa.topics.filter((topic) => topic.practice.problems.length > 0);
    expect(codingTopics).toHaveLength(12);
    for (const topic of codingTopics) {
      const count = (difficulty) => topic.practice.problems.filter((problem) => problem.difficulty === difficulty).length;
      expect(count("Easy"), topic.id).toBeGreaterThanOrEqual(2);
      expect(count("Medium"), topic.id).toBeGreaterThanOrEqual(2);
      expect(count("Hard"), topic.id).toBeGreaterThanOrEqual(1);
    }
    for (const subject of subjects.filter((item) => item.id !== "dsa")) {
      expect(subject.topics.every((topic) => topic.practice.problems.length === 0)).toBe(true);
    }
  });

  it("resolves DSA pattern references and counts shared problems only once", () => {
    const dsa = subjects.find((subject) => subject.id === "dsa");
    expect(new Set(dsaPatterns.map((pattern) => pattern.id)).size).toBe(dsaPatterns.length);
    const referencedKeys = [];
    for (const pattern of dsaPatterns) {
      expect(pattern.references.length, pattern.id).toBeGreaterThan(0);
      for (const reference of pattern.references) {
        const topic = dsa.topics.find((item) => item.id === reference.topicId);
        expect(topic, `${pattern.id}:${reference.topicId}`).toBeTruthy();
        for (const problemId of reference.problemIds) {
          expect(topic.practice.problems.some((problem) => problem.id === problemId), `${pattern.id}:${problemId}`).toBe(true);
          referencedKeys.push(`${dsa.id}:${topic.id}:${problemId}`);
        }
      }
    }
    const uniqueLinkedProblems = new Set(referencedKeys);
    expect(uniqueLinkedProblems.size).toBeLessThan(referencedKeys.length);
    expect([...uniqueLinkedProblems].every((key) => key.split(":").length === 3)).toBe(true);
  });
});
