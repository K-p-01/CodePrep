import { useState } from "react";
import { ArrowRight, BookOpen, Check, CheckCircle2, Clock3, Compass, RefreshCw, Target } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar.jsx";
import {
  generateDailyMission,
  getLocalDateKey,
  MISSION_DURATIONS,
  MISSION_FOCUSES,
  missionTaskDone,
  resolveMissionTask,
} from "./dailyMission.js";

const TASK_ICONS = { learn: BookOpen, practice: Target, revise: RefreshCw };
const TASK_LABELS = { learn: "Learn", practice: "Practice", revise: "Revise" };

function formatMissionDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date(year, month - 1, day));
}

function getEmptyReason(focus) {
  if (focus === "revision") return "Save a topic, resource, coding problem, or MCQ, or start a topic to create revision material.";
  if (focus === "dsa") return "There are no available DSA learning or unsolved coding items in the current catalog.";
  if (focus === "core-cs" || focus === "aptitude" || focus === "interview-prep") return "There are no incomplete learning or MCQ tasks for this focus in the current catalog.";
  return "There is no incomplete learning or practice content available in the current catalog.";
}

function MissionTask({ task, mission, progressApi, resolved }) {
  const Icon = TASK_ICONS[task.type] ?? Compass;
  const done = missionTaskDone(task, resolved, progressApi, mission.completedTaskIds);
  const mcqNeedsAnswers = task.type === "practice" && task.targetType === "mcq" && !done;
  const markDone = () => {
    if (task.type === "practice" && task.targetType === "coding" && !progressApi.isCodingProblemComplete(task.subjectId, task.topicId, task.targetId)) {
      progressApi.toggleCodingProblem(task.subjectId, task.topicId, task.targetId);
    }
    progressApi.completeDailyMissionTask(mission.date, task.id);
  };

  return (
    <article className={`mission-task${done ? " is-done" : ""}${!resolved.available ? " is-unavailable" : ""}`}>
      <div className="mission-task-icon">{done ? <Check size={17} /> : <Icon size={17} />}</div>
      <div className="mission-task-copy">
        <div className="mission-task-kicker"><span>{TASK_LABELS[task.type] ?? "Task"}</span><span>{resolved.available ? `${resolved.minutes} min${resolved.estimated ? " estimated" : " · resource duration"}` : "Unavailable"}</span></div>
        <h4>{resolved.available ? resolved.title : "Mission item unavailable"}</h4>
        {resolved.available ? <p>{resolved.subject.name} · {resolved.topic.title}</p> : <p>{resolved.reason}</p>}
        {mcqNeedsAnswers && <small className="mission-task-hint">Answer all questions in this topic using the existing MCQ practice to complete this task.</small>}
      </div>
      <div className="mission-task-actions">
        {resolved.available ? <Link className="secondary-button" to={resolved.href}>Open / Continue<ArrowRight size={14} /></Link> : <Link className="secondary-button" to="/subjects">Browse subjects<ArrowRight size={14} /></Link>}
        <button type="button" className={`mission-done-button${done ? " done" : ""}`} onClick={markDone} disabled={!resolved.available || done || mcqNeedsAnswers}>
          {done ? <><CheckCircle2 size={15} />Done</> : mcqNeedsAnswers ? "Finish in practice" : "Mark done"}
        </button>
      </div>
    </article>
  );
}

export default function DailyMission({ catalog, progressApi, recommendation }) {
  const date = getLocalDateKey();
  const activeMission = progressApi.progress.dailyMission?.date === date ? progressApi.progress.dailyMission : null;
  const [duration, setDuration] = useState(activeMission?.duration ?? 45);
  const [focus, setFocus] = useState(activeMission?.focus ?? "balanced");
  const mission = activeMission && Array.isArray(activeMission.tasks) ? activeMission : null;
  const focusLabel = MISSION_FOCUSES.find((option) => option.id === (mission?.focus ?? focus))?.label ?? "Balanced preparation";
  const resolvedTasks = (mission?.tasks ?? []).map((task) => ({ task, resolved: resolveMissionTask(task, catalog) }));
  const completed = resolvedTasks.filter(({ task, resolved }) => missionTaskDone(task, resolved, progressApi, mission?.completedTaskIds)).length;
  const totalMinutes = resolvedTasks.reduce((sum, { resolved }) => sum + (resolved.available ? resolved.minutes : 0), 0);
  const overBudget = totalMinutes > (mission?.duration ?? duration);

  function generate() {
    const plan = generateDailyMission({ catalog, progressApi, duration, focus, recommendation });
    progressApi.setDailyMission(plan);
  }

  return (
    <section className="daily-mission" aria-labelledby="daily-mission-heading">
      <div className="daily-mission-heading">
        <div className="daily-mission-title">
          <span className="eyebrow">A focused study session</span>
          <h2 id="daily-mission-heading">Daily mission</h2>
          <p>Build a practical session from your roadmap, practice, and saved items.</p>
        </div>
        {mission && <div className="mission-date"><Clock3 size={15} />{formatMissionDate(mission.date)}</div>}
      </div>

      <div className="mission-builder">
        <label>Available time
          <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
            {MISSION_DURATIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
          </select>
        </label>
        <label>Preparation focus
          <select value={focus} onChange={(event) => setFocus(event.target.value)}>
            {MISSION_FOCUSES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <button type="button" className="primary-button" onClick={generate}>
          {mission ? "Regenerate today's mission" : "Generate mission"}<ArrowRight size={16} />
        </button>
      </div>

      {mission ? (
        <div className="mission-plan">
          <div className="mission-summary">
            <div className="mission-summary-copy">
              <span className="eyebrow">{focusLabel} · {mission.duration} min available</span>
              <strong>{totalMinutes} min estimated{overBudget ? " · exceeds selected time" : ""}</strong>
              <small>{completed} of {resolvedTasks.length} tasks done{resolvedTasks.some(({ resolved }) => !resolved.available) ? " · some saved content is unavailable" : ""}</small>
            </div>
            {resolvedTasks.length > 0 && <div className="mission-progress"><ProgressBar value={Math.round((completed / resolvedTasks.length) * 100)} label="Daily mission completion" /></div>}
          </div>
          {resolvedTasks.length > 0 && completed === resolvedTasks.length && <div className="mission-complete-note"><CheckCircle2 size={17} /><span>Today's mission is complete. Your learning progress and saved items are ready for your next session.</span></div>}
          {resolvedTasks.length ? <div className="mission-task-list">
            {resolvedTasks.map(({ task, resolved }) => <MissionTask key={task.id} task={task} mission={mission} progressApi={progressApi} resolved={resolved} />)}
          </div> : <div className="mission-empty"><div><strong>No suitable tasks for this focus yet</strong><p>{getEmptyReason(mission.focus)}</p></div><Link className="secondary-button" to={mission.focus === "revision" ? "/revision" : "/subjects"}>{mission.focus === "revision" ? "Open revision" : "Browse subjects"}<ArrowRight size={14} /></Link></div>}
          <p className="mission-regenerate-note">Regenerating replaces today's mission checklist only. Topic progress, practice answers, and saved items stay intact.</p>
        </div>
      ) : <p className="mission-date-note">Today · {formatMissionDate(date)}. Choose a time and focus to generate a session from your current preparation.</p>}
    </section>
  );
}
