const SAMPLE = "A B 4\nA C 2\nB C 1\nB D 5\nC D 8\nC E 10\nD E 2\nD F 6\nE F 3";
export const DIJKSTRA_SAMPLE = SAMPLE;
export function parseGraph(text) {
  const edges = [], nodes = new Set();
  for (const [index, raw] of String(text).split(/\r?\n/).entries()) {
    const line = raw.trim(); if (!line) continue;
    const parts = line.split(/[\s,]+/);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !Number.isFinite(Number(parts[2]))) throw new Error(`Line ${index + 1}: enter “node node nonnegative-weight”.`);
    const [from, to, rawWeight] = parts; const weight = Number(rawWeight);
    if (weight < 0) throw new Error(`Line ${index + 1}: weights must be nonnegative.`);
    if (from === to) throw new Error(`Line ${index + 1}: self-edges are not supported.`);
    edges.push({ from, to, weight }); nodes.add(from); nodes.add(to);
  }
  if (!nodes.size || nodes.size > 12) throw new Error("Graph must have 1–12 nodes.");
  return { nodes: [...nodes].sort(), edges };
}
export function generateDijkstraSteps(text, source, destination) {
  const graph = parseGraph(text);
  if (!graph.nodes.includes(source) || !graph.nodes.includes(destination)) throw new Error("Choose source and destination nodes in the graph.");
  const adj = Object.fromEntries(graph.nodes.map((n) => [n, []]));
  graph.edges.forEach((e) => { adj[e.from].push({ node: e.to, weight: e.weight }); adj[e.to].push({ node: e.from, weight: e.weight }); });
  const dist = Object.fromEntries(graph.nodes.map((n) => [n, Infinity])); dist[source] = 0;
  const prev = {}, visited = new Set(), steps = [];
  const snap = (kind, current, edge, line, explanation) => steps.push({ kind, nodes: [...graph.nodes], edges: graph.edges.map((e) => ({ ...e })), distances: { ...dist }, visited: [...visited], current, edge, line, explanation, previous: { ...prev } });
  snap("start", null, null, 0, `Start at ${source}. All other tentative distances are infinity.`);
  while (visited.size < graph.nodes.length) {
    const candidates = graph.nodes.filter((n) => !visited.has(n)).sort((a, b) => dist[a] - dist[b] || a.localeCompare(b));
    const current = candidates[0];
    if (dist[current] === Infinity) { snap("unreachable", current, null, 1, "The remaining nodes cannot be reached from the source; stop when the smallest tentative distance is infinity."); break; }
    snap("select", current, null, 1, `Select ${current}, the unvisited node with the smallest tentative distance (${dist[current]}).`);
    for (const next of [...adj[current]].sort((a, b) => a.node.localeCompare(b.node))) {
      if (visited.has(next.node)) { snap("skip", current, { from: current, to: next.node, weight: next.weight }, 2, `${next.node} is already settled; its shortest distance cannot improve.`); continue; }
      const candidate = dist[current] + next.weight, improved = candidate < dist[next.node];
      if (improved) { dist[next.node] = candidate; prev[next.node] = current; }
      snap(improved ? "update" : "inspect", current, { from: current, to: next.node, weight: next.weight }, improved ? 3 : 4, improved ? `Route ${current} → ${next.node} costs ${candidate}, shorter than the previous distance; update it.` : `Route through ${current} costs ${candidate}, which does not improve ${next.node}'s current distance.`);
    }
    visited.add(current); snap("settle", current, null, 5, `Mark ${current} visited; its shortest distance is final.`);
  }
  const path = []; if (Number.isFinite(dist[destination])) { for (let n = destination; n; n = prev[n]) { path.unshift(n); if (n === source) break; } }
  const last = steps.at(-1); steps.push({ ...last, kind: "done", current: null, edge: null, path, destination, line: 6, explanation: path.length ? `Shortest path: ${path.join(" → ")} (distance ${dist[destination]}).` : `${destination} is unreachable from ${source}.` });
  return steps;
}
