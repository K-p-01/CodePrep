import { useEffect, useMemo, useState } from "react";
import { generateLcsSteps } from "../../data/visualizers/lcs.js";
import { DIJKSTRA_SAMPLE, generateDijkstraSteps, parseGraph } from "../../data/visualizers/dijkstra.js";
import { generateNQueensSteps } from "../../data/visualizers/nQueens.js";

const algorithms = {
  "dynamic-programming": { title: "Longest Common Subsequence", intro: "Find the longest sequence that appears in both strings in the same order, even when characters are not adjacent.", code: ["dp[0][j] = dp[i][0] = 0", "for i = 1..m, j = 1..n", "if A[i−1] == B[j−1]: dp[i][j] = 1 + dp[i−1][j−1]", "else: dp[i][j] = max(dp[i−1][j], dp[i][j−1])", "trace back from dp[m][n]", "reverse matched characters"], time: "O(m × n)", space: "O(m × n)" },
  graphs: { title: "Dijkstra’s Shortest Path", intro: "Find shortest paths from one source in a graph with nonnegative edge weights. This version uses linear selection over nodes.", code: ["dist[source] = 0; all others = ∞", "select unvisited node u with smallest dist", "for each neighbor v of u", "if dist[u] + weight(u,v) < dist[v]: update", "mark u visited", "stop when all reachable nodes are settled"], time: "O(V² + E)", space: "O(V + E)" },
  recursion: { title: "N-Queens Backtracking", intro: "Place one queen per row so no pair shares a column or diagonal. Try a safe square, recurse, and undo the choice when needed.", code: ["solve(row):", "for col = 0..n−1: check safety", "if safe: place queen", "solve(row + 1)", "if row == n: record solution", "remove queen; try next column"], time: "O(n!) upper bound", space: "O(n) search state" },
};

function usePlayback(steps, resetKey) {
  const [index, setIndex] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  useEffect(() => { setIndex(0); setPlaying(false); }, [resetKey]);
  useEffect(() => {
    if (!playing) return undefined;
    if (index >= steps.length - 1) { setPlaying(false); return undefined; }
    const timer = window.setTimeout(() => setIndex((n) => Math.min(n + 1, steps.length - 1)), 1100 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, index, speed, steps.length]);
  return { index, setIndex, playing, setPlaying, speed, setSpeed };
}

function Controls({ state, steps, jumpTargets = [] }) {
  const { index, setIndex, playing, setPlaying, speed, setSpeed } = state;
  return <div className="viz-controls" aria-label="Visualization controls">
    <button className="secondary-button" onClick={() => { setPlaying(false); setIndex(0); }}>Reset</button>
    <button className="secondary-button" disabled={index === 0} onClick={() => { setPlaying(false); setIndex((i) => i - 1); }}>Previous</button>
    <button className="primary-button" onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
    <button className="secondary-button" disabled={index >= steps.length - 1} onClick={() => { setPlaying(false); setIndex((i) => Math.min(i + 1, steps.length - 1)); }}>Next</button>
    <label>Speed <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
    {jumpTargets.length > 0 && <label>Solution <select value={jumpTargets.some((item) => item.index === index) ? jumpTargets.find((item) => item.index === index).number : ""} onChange={(e) => { setPlaying(false); setIndex(jumpTargets.find((t) => t.number === Number(e.target.value))?.index ?? index); }}><option value="">Choose…</option>{jumpTargets.map((t) => <option key={t.number} value={t.number}>{t.number}</option>)}</select></label>}
    <span className="viz-step-count" aria-live="polite">Step {index + 1} of {steps.length}</span>
  </div>;
}

function LcsView({ step, a, b }) {
  const highlighted = new Set(step.kind === "cell" ? [`${step.i},${step.j}`, `${step.i - 1},${step.j}`, `${step.i},${step.j - 1}`, `${step.i - 1},${step.j - 1}`] : step.kind === "reconstruct" ? [`${step.i},${step.j}`] : []);
  return <div className="viz-table-wrap"><table className="viz-dp-table"><thead><tr><th> </th><th>ε</th>{[...b].map((c, i) => <th key={i}>{c}</th>)}</tr></thead><tbody>{step.dp.map((row, i) => <tr key={i}><th>{i ? a[i - 1] : "ε"}</th>{row.map((v, j) => <td key={j} className={highlighted.has(`${i},${j}`) ? (i === step.i && j === step.j ? "viz-current" : "viz-dependency") : step.kind !== "start" && (i < step.i || i === step.i && j < step.j) ? "viz-processed" : ""}>{v}</td>)}</tr>)}</tbody></table></div>;
}

function DijkstraView({ step, source, destination }) {
  const coords = Object.fromEntries(step.nodes.map((n, i) => { const angle = 2 * Math.PI * i / step.nodes.length - Math.PI / 2; return [n, { x: 180 + Math.cos(angle) * 132, y: 150 + Math.sin(angle) * 105 }]; }));
  const pathEdges = new Set((step.path ?? []).slice(1).map((n, i) => [step.path[i], n].sort().join("-")));
  return <div className="viz-graph-layout"><svg className="viz-graph" viewBox="0 0 360 300" role="img" aria-label="Weighted graph and shortest path">
    {step.edges.map((e, i) => { const a = coords[e.from], b = coords[e.to], key = [e.from, e.to].sort().join("-"); const current = step.edge && ((step.edge.from === e.from && step.edge.to === e.to) || (step.edge.from === e.to && step.edge.to === e.from)); return <g key={i}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={pathEdges.has(key) ? "viz-path-edge" : current ? "viz-current-edge" : "viz-edge"}/><text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 5} className="viz-edge-label">{e.weight}</text></g>; })}
    {step.nodes.map((n) => { const p = coords[n], visited = step.visited.includes(n), current = step.current === n; return <g key={n}><circle cx={p.x} cy={p.y} r="23" className={current ? "viz-node-current" : visited ? "viz-node-visited" : "viz-node"}/><text x={p.x} y={p.y + 5} className="viz-node-label">{n}</text><text x={p.x} y={p.y + 40} className="viz-distance">{n === source ? "source · " : n === destination ? "target · " : ""}{Number.isFinite(step.distances[n]) ? step.distances[n] : "∞"}</text></g>; })}
  </svg><p className="viz-legend">∞ means no route has been found yet. Visited nodes have a settled shortest distance.</p></div>;
}

function QueensView({ step, size }) {
  const queens = step.board.flatMap((col, row) => col >= 0 ? [{ row, col }] : []);
  return <div className="viz-queens-wrap"><div className="viz-chessboard" role="grid" aria-label={`${size} by ${size} chessboard`} style={{ "--board-size": size }}>{Array.from({ length: size * size }, (_, index) => { const row = Math.floor(index / size), col = index % size, queen = step.board[row] === col, candidate = step.row === row && step.col === col, rejected = candidate && step.kind === "reject", attacked = !queen && queens.some((q) => q.col === col || Math.abs(q.row - row) === Math.abs(q.col - col)); return <div role="gridcell" key={index} aria-label={`Row ${row + 1}, column ${col + 1}${queen ? ", queen placed" : attacked ? ", attacked square" : ""}`} className={`viz-square ${(row + col) % 2 ? "dark" : "light"}${queen ? " queen" : ""}${attacked ? " attacked" : ""}${candidate ? " candidate" : ""}${rejected ? " rejected" : ""}`}>{queen ? "♛" : rejected ? "×" : candidate ? "·" : ""}</div>; })}</div><p className="viz-legend">Queens currently placed: {step.board.filter((x) => x >= 0).length} · Recursion depth: {step.depth} · Solutions found so far: {step.solutions}. Muted red squares are attacked.</p></div>;
}

export default function AlgorithmVisualizer({ topicId }) {
  const config = algorithms[topicId];
  const [a, setA] = useState("AGGTAB"), [b, setB] = useState("GXTXAYB"), [graphText, setGraphText] = useState(DIJKSTRA_SAMPLE), [size, setSize] = useState(4), [error, setError] = useState("");
  const graph = useMemo(() => { try { return parseGraph(graphText); } catch { return { nodes: [] }; } }, [graphText]);
  const [source, setSource] = useState("A"), [destination, setDestination] = useState("F");
  useEffect(() => { if (graph.nodes.length) { if (!graph.nodes.includes(source)) setSource(graph.nodes[0]); if (!graph.nodes.includes(destination)) setDestination(graph.nodes.at(-1)); } }, [graphText]);
  const inputKey = topicId === "dynamic-programming" ? `${a}|${b}` : topicId === "graphs" ? `${graphText}|${source}|${destination}` : String(size);
  const result = useMemo(() => { try { const steps = topicId === "dynamic-programming" ? generateLcsSteps(a, b) : topicId === "graphs" ? generateDijkstraSteps(graphText, source, destination) : generateNQueensSteps(size); return { steps, error: "" }; } catch (e) { return { steps: [], error: e.message }; } }, [topicId, inputKey]);
  const playback = usePlayback(result.steps, `${topicId}:${inputKey}`);
  const step = result.steps[playback.index];
  const queensJumps = topicId === "recursion" ? result.steps.flatMap((s, i) => s.kind === "solution" ? [{ index: i, number: s.solutions }] : []) : [];
  const validationError = error || result.error;
  function update(fn) { setError(""); fn(); }
  if (!config) return null;
  return <section id="algorithm-lab" className="algorithm-visualizer content-section" aria-labelledby="visualizer-title">
    <header className="viz-heading"><span className="eyebrow">Interactive algorithm lab</span><h2 id="visualizer-title">{config.title}</h2><p>{config.intro}</p></header>
    <div className="viz-inputs">{topicId === "dynamic-programming" ? <><label>String A<input maxLength="12" value={a} onChange={(e) => update(() => setA(e.target.value.toUpperCase().replace(/[^A-Z]/g, "")))} /></label><label>String B<input maxLength="12" value={b} onChange={(e) => update(() => setB(e.target.value.toUpperCase().replace(/[^A-Z]/g, "")))} /></label><span>Use up to 12 letters A–Z.</span></> : topicId === "graphs" ? <><label className="viz-graph-editor">Edges <textarea value={graphText} onChange={(e) => update(() => setGraphText(e.target.value))} rows="5" aria-describedby="graph-format" /></label><small id="graph-format">One undirected edge per line: <code>A B 4</code></small><label>Source<select value={source} onChange={(e) => update(() => setSource(e.target.value))}>{graph.nodes.map((n) => <option key={n}>{n}</option>)}</select></label><label>Destination<select value={destination} onChange={(e) => update(() => setDestination(e.target.value))}>{graph.nodes.map((n) => <option key={n}>{n}</option>)}</select></label></> : <label>Board size<select value={size} onChange={(e) => update(() => setSize(Number(e.target.value)))}>{[4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} × {n}</option>)}</select></label>}</div>
    {validationError && <p className="viz-error" role="alert">{validationError}</p>}
    {step && <><div className="viz-main"><div className="viz-stage">{topicId === "dynamic-programming" ? <><LcsView step={step} a={a} b={b}/><div className="viz-result"><strong>Current LCS:</strong> {step.lcs?.join("") || (step.kind === "done" ? "(empty)" : "building…")} {step.kind === "done" && `· Length ${step.lcs.length}`}</div></> : topicId === "graphs" ? <DijkstraView step={step} source={source} destination={destination}/> : <QueensView step={step} size={size}/>}<div className="viz-operation" aria-live="polite"><span className="eyebrow">Current operation</span><p>{step.explanation}</p></div></div><aside className="viz-aside"><h3>Pseudocode</h3><ol className="viz-pseudocode">{config.code.map((line, i) => <li key={i} className={step.line === i ? "active" : ""}>{line}</li>)}</ol><div className="viz-complexity"><strong>Complexity</strong><span>Time: {config.time}</span><span>Space: {config.space}</span></div></aside></div><Controls state={playback} steps={result.steps} jumpTargets={queensJumps}/></>}
  </section>;
}
