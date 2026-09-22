import { useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, ListPlus, PlayCircle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "../state/contentStore.jsx";
import { useProgress } from "../state/progressStore.js";

function todayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PlannerPage() {
  const { subjects } = useContent();
  const progressApi = useProgress();
  const planner = progressApi.getPlannerSummary();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [dueDate, setDueDate] = useState(todayString());
  const [dueTime, setDueTime] = useState("");
  const [kind, setKind] = useState("Study");

  const selectedSubject = subjects.find((subject) => subject.id === subjectId);
  const topicOptions = selectedSubject?.topics || [];
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }), []);

  function addTask(event) {
    event.preventDefault();
    if (!title.trim()) return;
    progressApi.addPlannerTask({ title: title.trim(), subjectId, topicId, dueDate, dueTime, kind });
    setTitle("");
    setDueTime("");
  }

  function quickPlan() {
    progressApi.planNextTopic();
  }

  return (
    <div className="stack">
      <section className="planner-hero">
        <div>
          <span className="eyebrow">Study Planner</span>
          <h2>Turn your roadmap into a daily study plan.</h2>
          <p>Set learning and practice tasks, give them a date, and keep your preparation moving one session at a time.</p>
        </div>
        <div className="planner-hero-actions">
          <button type="button" className="primary-button" onClick={quickPlan}>
            <PlayCircle size={18} />
            Plan next topic
          </button>
          <span className="planner-hero-note"><Clock3 size={15} /> Cloud-synced with your progress</span>
        </div>
      </section>

      {planner.overdue.length > 0 ? (
        <section className="planner-alert">
          <div>
            <strong>{planner.overdue.length} overdue task{planner.overdue.length === 1 ? "" : "s"}</strong>
            <p>Move these forward or finish them today so your plan stays realistic.</p>
          </div>
        </section>
      ) : null}

      <section className="planner-grid">
        <div className="content-section planner-form-card">
          <div className="section-title compact">
            <ListPlus size={20} />
            <div><h2>Add a study task</h2><p>Keep the task small enough to finish in one sitting.</p></div>
          </div>
          <form className="planner-form" onSubmit={addTask}>
            <label className="wide">Task title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Revise normalization notes" /></label>
            <label>Subject
              <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId(""); }}>
                <option value="">General study</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </label>
            <label>Topic
              <select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={!selectedSubject}>
                <option value="">No specific topic</option>
                {topicOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
              </select>
            </label>
            <label>Date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
            <label>Time <span className="label-hint">optional</span><input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} /></label>
            <label>Type
              <select value={kind} onChange={(event) => setKind(event.target.value)}>
                <option>Study</option><option>Learn</option><option>Practice</option><option>Revision</option><option>Interview</option>
              </select>
            </label>
            <button className="primary-button wide" type="submit"><Plus size={17} /> Add task</button>
          </form>
        </div>

        <div className="content-section planner-summary-card">
          <div className="section-title compact">
            <CalendarDays size={20} />
            <div><h2>Today</h2><p>{dateFormatter.format(new Date())}</p></div>
          </div>
          <div className="planner-summary-number">{planner.todayCompleted}<span> / {planner.todayTotal} done</span></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${planner.todayTotal ? Math.round((planner.todayCompleted / planner.todayTotal) * 100) : 0}%` }} /></div>
          <p className="planner-summary-copy">{planner.todayTotal ? `${Math.round((planner.todayCompleted / planner.todayTotal) * 100)}% of today's plan is complete.` : "You have no tasks planned for today."}</p>
          <div className="planner-stat-row"><span>Upcoming</span><strong>{planner.upcoming.length}</strong></div>
          <div className="planner-stat-row"><span>Overdue</span><strong>{planner.overdue.length}</strong></div>
          <div className="planner-stat-row"><span>Total tasks</span><strong>{planner.tasks.length}</strong></div>
        </div>
      </section>

      <section className="content-section">
        <div className="section-title">
          <div><h2>Today's plan</h2><p>Complete tasks here and your study activity will also contribute to your progress analytics.</p></div>
          {planner.tasks.some((task) => task.completed) ? <button className="secondary-button" onClick={progressApi.clearCompletedPlannerTasks}><RotateCcw size={16} /> Clear completed</button> : null}
        </div>
        <TaskList tasks={planner.todayTasks} progressApi={progressApi} emptyMessage="Nothing planned today. Add a task or use Plan next topic." />
      </section>

      <section className="content-section">
        <div className="section-title"><div><h2>Overdue</h2><p>These tasks are past their planned date.</p></div></div>
        <TaskList tasks={planner.overdue} progressApi={progressApi} emptyMessage="No overdue tasks. Nice." />
      </section>

      <section className="content-section">
        <div className="section-title"><div><h2>Upcoming</h2><p>Your next study sessions.</p></div></div>
        <TaskList tasks={planner.upcoming} progressApi={progressApi} emptyMessage="No upcoming tasks yet." />
      </section>
    </div>
  );
}

function TaskList({ tasks, progressApi, emptyMessage }) {
  if (!tasks.length) return <div className="empty-state"><CalendarDays size={30} /><h3>{emptyMessage}</h3><p>Use the planner above to create a focused preparation queue.</p></div>;
  return (
    <div className="planner-task-list">
      {tasks.map((task) => {
        const canOpenTopic = Boolean(task.subjectId && task.topicId);
        const topicLink = canOpenTopic ? `/subjects/${task.subjectId}/topics/${task.topicId}` : null;
        return (
          <article className={`planner-task ${task.completed ? "completed" : ""}`} key={task.id}>
            <button className={`task-check ${task.completed ? "done" : ""}`} type="button" aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"} onClick={() => progressApi.togglePlannerTask(task.id)}>
              <Check size={16} />
            </button>
            <div className="planner-task-copy">
              <div className="planner-task-topline"><span className="status-badge inProgress">{task.kind}</span>{task.dueTime ? <span><Clock3 size={13} /> {task.dueTime}</span> : <span>Any time</span>}</div>
              <h3>{task.title}</h3>
              <p>{task.subjectId ? `${task.subjectId.toUpperCase()}${task.topicId ? ` · ${task.topicId.replaceAll("-", " ")}` : ""}` : "General study"}</p>
              {topicLink ? <Link className="inline-link" to={topicLink}><PlayCircle size={14} /> Open topic</Link> : null}
            </div>
            <button className="icon-button" type="button" aria-label="Delete task" onClick={() => progressApi.deletePlannerTask(task.id)}><Trash2 size={16} /></button>
          </article>
        );
      })}
    </div>
  );
}

