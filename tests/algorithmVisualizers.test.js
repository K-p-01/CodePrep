import { describe, expect, it } from "vitest";
import { generateLcsSteps } from "../src/data/visualizers/lcs.js";
import { DIJKSTRA_SAMPLE, generateDijkstraSteps, parseGraph } from "../src/data/visualizers/dijkstra.js";
import { generateNQueensSteps } from "../src/data/visualizers/nQueens.js";
import { getTopic } from "../src/data/subjects.js";

describe("LCS visualization snapshots", () => {
  it("computes the sample subsequence and stable recurrence snapshots", () => {
    const steps = generateLcsSteps("AGGTAB", "GXTXAYB");
    expect(steps.at(-1).lcs.join("")).toBe("GTAB");
    expect(steps.at(-1).dp[6][7]).toBe(4);
    expect(steps.filter((s) => s.kind === "cell")).toHaveLength(42);
    const prior = steps[1].dp[0][0]; steps[2].dp[0][0] = 99;
    expect(steps[1].dp[0][0]).toBe(prior);
  });
  it("handles empty and nonmatching strings and rejects oversized input", () => {
    expect(generateLcsSteps("", "ABC").at(-1).lcs).toEqual([]);
    expect(generateLcsSteps("ABC", "XYZ").at(-1).dp[3][3]).toBe(0);
    expect(() => generateLcsSteps("A".repeat(13), "B")).toThrow();
  });
});

describe("Dijkstra visualization snapshots", () => {
  it("finds sample shortest path with deterministic tie handling", () => {
    const steps = generateDijkstraSteps(DIJKSTRA_SAMPLE, "A", "F");
    expect(steps.at(-1).path).toEqual(["A", "C", "B", "D", "E", "F"]);
    expect(steps.at(-1).distances.F).toBe(13);
    expect(generateDijkstraSteps("A B 1\nA C 1\nB D 1\nC D 1", "A", "D").at(-1).path).toEqual(["A", "B", "D"]);
  });
  it("reports unreachable nodes and validates weights and graph input", () => {
    const steps = generateDijkstraSteps("A B 2\nC D 1", "A", "D");
    expect(steps.at(-1).path).toEqual([]);
    expect(() => parseGraph("A B -1")).toThrow(/nonnegative/);
    expect(() => parseGraph("bad edge")).toThrow();
    expect(() => parseGraph("")).toThrow();
  });
  it("keeps step distance snapshots independent", () => {
    const steps = generateDijkstraSteps("A B 2\nB C 3", "A", "C");
    const first = steps[0].distances.B; steps.at(-1).distances.B = 88;
    expect(steps[0].distances.B).toBe(first);
  });
});

describe("N-Queens visualization snapshots", () => {
  it.each([[4, 2], [5, 10], [6, 4], [7, 40], [8, 92]])("finds %i-Queens solutions", (n, count) => {
    const steps = generateNQueensSteps(n);
    expect(steps.at(-1).solutions).toBe(count);
    for (const solution of steps.at(-1).solutionBoards) {
      expect(solution).toHaveLength(n);
      expect(new Set(solution).size).toBe(n);
      for (let r = 0; r < n; r++) for (let other = 0; other < r; other++) expect(Math.abs(solution[r] - solution[other])).not.toBe(r - other);
    }
  });
  it("shows rejected, placed, backtracked and completed search states", () => {
    const steps = generateNQueensSteps(4);
    expect(new Set(steps.map((s) => s.kind))).toEqual(new Set(["attempt", "reject", "place", "solution", "backtrack", "done"]));
    expect(steps.find((s) => s.kind === "solution").solutions).toBe(1);
    expect(() => generateNQueensSteps(3)).toThrow();
  });
});

describe("visualizer topic integration", () => {
  it.each(["dynamic-programming", "graphs", "recursion"])("uses the existing DSA topic %s", (topicId) => {
    expect(getTopic("dsa", topicId)).toBeTruthy();
  });
});
