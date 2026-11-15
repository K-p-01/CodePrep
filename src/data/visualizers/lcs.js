export function generateLcsSteps(inputA, inputB) {
  const a = String(inputA ?? "").toUpperCase();
  const b = String(inputB ?? "").toUpperCase();
  if (a.length > 12 || b.length > 12) throw new Error("Strings must be 12 characters or fewer.");
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  const steps = [{ kind: "start", dp: dp.map((r) => [...r]), i: 0, j: 0, line: 0, explanation: "The first row and column represent an empty prefix, so every value starts at zero." }];
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const match = a[i - 1] === b[j - 1];
    dp[i][j] = match ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    steps.push({ kind: "cell", dp: dp.map((r) => [...r]), i, j, line: match ? 2 : 3, explanation: match ? `${a[i - 1]} matches ${b[j - 1]}; extend the diagonal subsequence (${dp[i - 1][j - 1]} + 1).` : `The characters differ; keep the longer result above (${dp[i - 1][j]}) or to the left (${dp[i][j - 1]}).` });
  }
  let i = a.length, j = b.length;
  const lcs = [];
  while (i && j) {
    if (a[i - 1] === b[j - 1]) { lcs.unshift(a[i - 1]); steps.push({ kind: "reconstruct", dp: dp.map((r) => [...r]), i, j, line: 5, lcs: [...lcs], explanation: `Matching ${a[i - 1]} belongs to the subsequence; move diagonally.` }); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) { steps.push({ kind: "reconstruct", dp: dp.map((r) => [...r]), i, j, line: 5, lcs: [...lcs], explanation: "The cell above is at least as large; move up to follow an optimal subsequence." }); i--; }
    else { steps.push({ kind: "reconstruct", dp: dp.map((r) => [...r]), i, j, line: 5, lcs: [...lcs], explanation: "The cell to the left is larger; move left to follow an optimal subsequence." }); j--; }
  }
  steps.push({ kind: "done", dp: dp.map((r) => [...r]), i: 0, j: 0, line: 6, lcs, explanation: `The longest common subsequence is ${lcs.join("") || "empty"}, with length ${dp[a.length][b.length]}.` });
  return steps;
}
