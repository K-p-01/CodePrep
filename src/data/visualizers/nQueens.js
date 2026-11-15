export function generateNQueensSteps(size) {
  const n = Number(size); if (!Number.isInteger(n) || n < 4 || n > 8) throw new Error("Board size must be an integer from 4 to 8.");
  const board = Array(n).fill(-1), steps = [], solutions = [];
  const columns = new Set(), descending = new Set(), ascending = new Set();
  const safe = (row, col) => !columns.has(col) && !descending.has(row - col) && !ascending.has(row + col);
  const snap = (kind, row, col, line, explanation) => steps.push({ kind, board: [...board], row, col, line, solutions: solutions.length, solutionBoards: solutions.map((s) => [...s]), depth: Math.min(row + 1, n), explanation });
  function search(row) {
    if (row === n) { solutions.push([...board]); snap("solution", n - 1, board[n - 1], 4, `All ${n} queens are safely placed. Solution ${solutions.length} found.`); return; }
    for (let col = 0; col < n; col++) {
      const valid = safe(row, col); snap(valid ? "attempt" : "reject", row, col, 1, valid ? `Try row ${row + 1}, column ${col + 1}; no earlier queen attacks this square.` : `Reject row ${row + 1}, column ${col + 1}; a queen in an earlier row shares its column or diagonal.`);
      if (!valid) continue;
      board[row] = col; columns.add(col); descending.add(row - col); ascending.add(row + col); snap("place", row, col, 2, `Place a queen at row ${row + 1}, column ${col + 1}; recurse to row ${row + 2}.`);
      search(row + 1);
      board[row] = -1; columns.delete(col); descending.delete(row - col); ascending.delete(row + col); snap("backtrack", row, col, 3, `Remove the queen from row ${row + 1}, column ${col + 1} and try the next choice.`);
    }
  }
  search(0);
  steps.push({ ...steps.at(-1), kind: "done", row: null, col: null, board: Array(n).fill(-1), line: 5, solutions: solutions.length, solutionBoards: solutions.map((s) => [...s]), explanation: `Search complete: ${solutions.length} solutions found for ${n}-Queens.` });
  return steps;
}
