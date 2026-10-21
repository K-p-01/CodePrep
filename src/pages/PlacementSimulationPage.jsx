import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Clock3, Play, ShieldAlert } from "lucide-react";
import SimulationRunner from "../components/simulation/SimulationRunner.jsx";
import { SimulationHistory, SimulationResult } from "../components/simulation/SimulationResult.jsx";
import {
  calculateSimulationResult,
  createSimulationAttempt,
  getEligibleCodingProblems,
  getEligibleQuestions,
  getRemainingSeconds,
  getSimulationHistory,
  getSimulationQuestionCountOptions,
  isValidActiveSimulation,
  selectSimulationCodingProblems,
  selectSimulationQuestions,
  simulationCodingKey,
  simulationQuestionKey,
  SIMULATION_DURATIONS,
  SIMULATION_FOCUS_PRESETS,
  updateSimulationAttempt,
} from "../data/placementSimulation.js";
import { subjects } from "../data/subjects.js";
import { useProgress } from "../state/progressStore.js";

function makeFocusOptions(catalog) {
  const presets = SIMULATION_FOCUS_PRESETS.filter((focus) => getEligibleQuestions(catalog, focus.id).length > 0);
  const individual = catalog.filter((subject) => getEligibleQuestions(catalog, `subject:${subject.id}`).length > 0)
    .map((subject) => ({ id: `subject:${subject.id}`, label: `${subject.name} only` }));
  return [...presets, ...individual];
}

function initialConfig(savedConfig, focusOptions, catalog) {
  const focusId = focusOptions.some((focus) => focus.id === savedConfig?.focusId) ? savedConfig.focusId : focusOptions[0]?.id ?? "full-placement";
  const poolSize = getEligibleQuestions(catalog, focusId).length;
  const choices = getSimulationQuestionCountOptions(poolSize);
  const questionCount = choices.includes(savedConfig?.questionCount) ? savedConfig.questionCount : choices[0] ?? 0;
  return {
    focusId,
    focusLabel: focusOptions.find((focus) => focus.id === focusId)?.label ?? "Full Placement",
    durationMinutes: SIMULATION_DURATIONS.includes(savedConfig?.durationMinutes) ? savedConfig.durationMinutes : 30,
    questionCount,
    includeCodingRound: Boolean(savedConfig?.includeCodingRound && focusId === "full-placement" && getEligibleCodingProblems(catalog).length),
  };
}

function resolveAttemptQuestions(attempt) {
  return attempt.questionRefs.map((ref) => {
    const subject = subjects.find((entry) => entry.id === ref.subjectId);
    const topic = subject?.topics?.find((entry) => entry.id === ref.topicId);
    const question = topic?.practice?.questions?.find((entry) => entry.id === ref.questionId);
    const availableQuestion = question && typeof question.prompt === "string" && Array.isArray(question.options) && question.options.length ? question : null;
    return { ref, subject, topic, question: availableQuestion };
  });
}

function resolveAttemptCoding(attempt) {
  return attempt.codingRefs.map((ref) => {
    const subject = subjects.find((entry) => entry.id === ref.subjectId);
    const topic = subject?.topics?.find((entry) => entry.id === ref.topicId);
    const problem = topic?.practice?.problems?.find((entry) => entry.id === ref.problemId);
    return { ref, topic, problem: problem ?? null };
  });
}

export default function PlacementSimulationPage() {
  const progressApi = useProgress();
  const metadata = progressApi.progress.placementSimulation && typeof progressApi.progress.placementSimulation === "object" && !Array.isArray(progressApi.progress.placementSimulation)
    ? progressApi.progress.placementSimulation : {};
  const focusOptions = useMemo(() => makeFocusOptions(subjects), []);
  const [config, setConfig] = useState(() => initialConfig(metadata.config, focusOptions, subjects));
  const [now, setNow] = useState(Date.now());
  const [selectedResultId, setSelectedResultId] = useState(null);
  const submitLock = useRef(null);
  const activeAttempt = metadata.activeAttempt ?? null;
  const activeIsValid = isValidActiveSimulation(activeAttempt);
  const activeAttemptRef = useRef(activeAttempt);
  activeAttemptRef.current = activeAttempt;
  const history = getSimulationHistory(metadata);
  const selectedResult = history.find((attempt) => attempt.id === selectedResultId) ?? null;
  const pool = getEligibleQuestions(subjects, config.focusId);
  const codingPool = useMemo(() => getEligibleCodingProblems(subjects), []);
  const countOptions = getSimulationQuestionCountOptions(pool.length);
  const questions = useMemo(() => activeIsValid ? resolveAttemptQuestions(activeAttempt) : [], [activeAttempt, activeIsValid]);
  const codingProblems = useMemo(() => activeIsValid ? resolveAttemptCoding(activeAttempt) : [], [activeAttempt, activeIsValid]);
  const remainingSeconds = activeIsValid ? getRemainingSeconds(activeAttempt.expiresAt, now) : 0;

  function persistConfig(next) {
    setConfig(next);
    progressApi.setPlacementSimulationConfig(next);
  }

  function onFocusChange(focusId) {
    const focusLabel = focusOptions.find((focus) => focus.id === focusId)?.label ?? focusId;
    const nextPool = getEligibleQuestions(subjects, focusId);
    const nextChoices = getSimulationQuestionCountOptions(nextPool.length);
    persistConfig({ ...config, focusId, focusLabel, questionCount: nextChoices.includes(config.questionCount) ? config.questionCount : nextChoices[0] ?? 0, includeCodingRound: focusId === "full-placement" && config.includeCodingRound });
  }

  function startSimulation() {
    const selected = selectSimulationQuestions(pool, config.questionCount);
    const coding = config.includeCodingRound && config.focusId === "full-placement"
      ? selectSimulationCodingProblems(codingPool, 3)
      : [];
    const attempt = createSimulationAttempt({ config, questions: selected, codingProblems: coding });
    if (attempt) {
      submitLock.current = null;
      setSelectedResultId(null);
      progressApi.startPlacementSimulation(attempt);
    }
  }

  function updateAttempt(patch) {
    if (!activeIsValid) return;
    progressApi.updateActivePlacementSimulation(activeAttempt.id, (current) => updateSimulationAttempt(current, patch));
  }

  function submitAttempt(reason) {
    const attempt = activeAttemptRef.current;
    if (!isValidActiveSimulation(attempt) || submitLock.current === attempt.id) return;
    submitLock.current = attempt.id;
    const result = calculateSimulationResult(attempt, subjects, new Date().toISOString(), reason === "time" ? "time" : "manual");
    progressApi.submitPlacementSimulation(result);
    setSelectedResultId(result.id);
  }

  useEffect(() => {
    if (!activeIsValid) return undefined;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (getRemainingSeconds(activeAttemptRef.current?.expiresAt, time) <= 0) submitAttempt("time");
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [activeIsValid, activeAttempt?.expiresAt]);

  function discardAttempt() {
    if (window.confirm("Discard this active simulation? Its draft answers and timer will be removed.")) {
      progressApi.discardActivePlacementSimulation(activeAttempt?.id ?? null);
      submitLock.current = null;
    }
  }

  if (activeAttempt && !activeIsValid) return <div className="stack simulation-page">
    <header className="simulation-page-heading"><span className="eyebrow">Timed practice · local progress</span><h2>Placement Simulation</h2></header>
    <section className="simulation-malformed-state"><AlertTriangle size={22} /><div><h3>Saved simulation could not be resumed</h3><p>The active attempt metadata is incomplete or malformed. Its content has not been changed. Confirm below to remove this draft and configure a new simulation.</p><button type="button" className="secondary-button" onClick={discardAttempt}>Discard saved draft</button></div></section>
    <SimulationHistory attempts={history} onOpen={setSelectedResultId} />
  </div>;

  if (activeIsValid) return <div className="stack simulation-page">
    <div className="simulation-resume-banner"><span><Clock3 size={16} />Active assessment · refreshing keeps the same questions, answers, and expiry time.</span><button type="button" className="simulation-discard-link" onClick={discardAttempt}>Discard attempt</button></div>
    <SimulationRunner attempt={activeAttempt} questions={questions} codingProblems={codingProblems} remainingSeconds={remainingSeconds}
      onQuestion={(index) => updateAttempt({ currentIndex: index })}
      onAnswer={(key, answer) => updateAttempt({ answers: { ...activeAttempt.answers, [key]: answer } })}
      onClearAnswer={(key) => { const answers = { ...activeAttempt.answers }; delete answers[key]; updateAttempt({ answers }); }}
      onToggleReview={(key) => updateAttempt({ markedForReview: { ...activeAttempt.markedForReview, [key]: !activeAttempt.markedForReview[key] } })}
      onCodingAttempt={(key, attempted) => updateAttempt({ codingAttempts: { ...activeAttempt.codingAttempts, [key]: attempted } })}
      onPrevious={() => updateAttempt({ currentIndex: Math.max(0, activeAttempt.currentIndex - 1) })}
      onNext={() => updateAttempt({ currentIndex: Math.min(questions.length - 1, activeAttempt.currentIndex + 1) })}
      onSubmit={submitAttempt} />
  </div>;

  if (selectedResult) return <SimulationResult attempt={selectedResult} onBack={() => setSelectedResultId(null)} />;

  return <div className="stack simulation-page">
    <header className="simulation-page-heading"><div><span className="eyebrow">Placement practice · client-side simulation</span><h2>Placement Simulation</h2><p>Take a timed mixed assessment using questions from the CodePrep catalog.</p></div></header>
    <div className="simulation-practice-notice"><ShieldAlert size={17} /><span>This is an unproctored practice tool. MCQs are graded by CodePrep on submission; external coding work is self-reported and stays outside the score.</span></div>
    <section className="simulation-setup-panel"><div className="section-title"><div><span className="eyebrow">Configure your assessment</span><h3>Choose a focus and time</h3><p>Question availability is calculated from valid catalog questions. Counts never exceed the selected focus pool.</p></div></div>
      <div className="simulation-setup-grid">
        <label>Focus<select value={config.focusId} onChange={(event) => onFocusChange(event.target.value)}>{focusOptions.map((focus) => <option value={focus.id} key={focus.id}>{focus.label}</option>)}</select></label>
        <label>Duration<select value={config.durationMinutes} onChange={(event) => persistConfig({ ...config, durationMinutes: Number(event.target.value) })}>{SIMULATION_DURATIONS.map((duration) => <option value={duration} key={duration}>{duration} minutes</option>)}</select></label>
        <label>MCQ count<select value={config.questionCount} onChange={(event) => persistConfig({ ...config, questionCount: Number(event.target.value) })} disabled={!countOptions.length}>{countOptions.length ? countOptions.map((count) => <option value={count} key={count}>{count} questions</option>) : <option value={0}>No valid questions</option>}</select></label>
      </div>
      <div className="simulation-setup-summary"><div><span>Available questions</span><strong>{pool.length}</strong></div><div><span>Selected questions</span><strong>{Math.min(config.questionCount, pool.length)}</strong></div><div><span>Focus</span><strong>{config.focusLabel}</strong></div><div><span>Duration</span><strong>{config.durationMinutes} min</strong></div></div>
      {pool.length > 0 && pool.length < 10 && <p className="simulation-small-pool-note">This focus has a smaller eligible pool. The simulation will use all {pool.length} available questions.</p>}
      {config.focusId === "full-placement" && <label className="simulation-coding-toggle"><input type="checkbox" checked={config.includeCodingRound && codingPool.length > 0} disabled={!codingPool.length} onChange={(event) => persistConfig({ ...config, includeCodingRound: event.target.checked })} /><span><strong>Include optional DSA coding round</strong><small>{codingPool.length ? `Up to 3 existing external problems · ${codingPool.length} available` : "No valid external DSA problem links are available."} Coding status is self-reported and is not part of the MCQ score.</small></span></label>}
      <button type="button" className="primary-button simulation-start-button" onClick={startSimulation} disabled={!pool.length || !config.questionCount}><Play size={16} />Start Simulation<ArrowRight size={15} /></button>
    </section>
    {selectedResultId && !selectedResult && <p className="simulation-history-notice" role="status">That saved result is unavailable. Choose another history entry.</p>}
    <SimulationHistory attempts={history} onOpen={setSelectedResultId} />
  </div>;
}
