import { Activity, Bookmark, Brain, CheckCircle2, Clock3, Flame, Target, Trophy } from "lucide-react";
import ProgressBar from "../components/ProgressBar.jsx";
import { useContent } from "../state/contentStore.jsx";
import { useProgress } from "../state/progressStore.js";

function formatDate(date) {
  return new Intl.DateTimeFormat([], { month: "short", day: "numeric" }).format(new Date(date));
}

export default function AnalyticsPage() {
  const { subjects } = useContent();
  const progressApi = useProgress();
  const analytics = progressApi.getAnalytics();

  return (
    <div className="stack">
      <section className="analytics-hero">
        <div>
          <span className="eyebrow">Progress Analytics</span>
          <h2>See what you have learned, practiced, and what to focus on next.</h2>
          <p>Your analytics are calculated from the same roadmap, practice, bookmark, and activity data used throughout CodePrep.</p>
        </div>
        <div className="analytics-score">
          <span>Overall</span>
          <strong>{analytics.overallPercent}%</strong>
          <small>{analytics.completedTopics} of {analytics.totalTopics} topics completed</small>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card"><Flame size={22} /><strong>{analytics.currentStreak}</strong><span>Current streak</span></div>
        <div className="stat-card"><CheckCircle2 size={22} /><strong>{analytics.practiceCompleted}</strong><span>Practice completed</span></div>
        <div className="stat-card"><Brain size={22} /><strong>{analytics.mcqAccuracy}%</strong><span>MCQ accuracy</span></div>
        <div className="stat-card"><Bookmark size={22} /><strong>{analytics.bookmarks}</strong><span>Saved for revision</span></div>
        <div className="stat-card"><Activity size={22} /><strong>{analytics.activeDays}</strong><span>Active study days</span></div>
        <div className="stat-card"><Target size={22} /><strong>{analytics.subjectsStarted}</strong><span>Subjects started</span></div>
      </section>

      <section className="analytics-grid">
        <div className="content-section flush">
          <div className="section-title"><div><h2>Subject performance</h2><p>Completion is calculated from topic progress.</p></div></div>
          <div className="analytics-list">
            {subjects.map((subject) => {
              const item = analytics.subjects.find((entry) => entry.id === subject.id);
              return (
                <div key={subject.id} className="analytics-row">
                  <div className="analytics-row-main">
                    <strong>{subject.name}</strong>
                    <span>{item.completedTopics}/{item.totalTopics} topics · {item.practiceCompleted} practice items</span>
                  </div>
                  <div className="analytics-row-bar"><ProgressBar value={item.percent} label={`${item.percent}%`} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="content-section flush">
          <div className="section-title"><div><h2>Recent activity</h2><p>Your latest learning actions.</p></div><Clock3 size={20} /></div>
          {analytics.recentActivity.length ? (
            <div className="activity-list">
              {analytics.recentActivity.map((item) => (
                <div className="activity-item" key={item.id}>
                  <div className="activity-dot" />
                  <div><strong>{item.label}</strong><span>{item.subjectName}{item.topicTitle ? ` · ${item.topicTitle}` : ""}</span></div>
                  <small>{formatDate(item.at)}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><Activity size={28} /><h3>No activity yet</h3><p>Start a topic or practice question and your activity will appear here.</p></div>
          )}
        </div>
      </section>

      <section className="content-section flush">
        <div className="section-title"><div><h2>Next focus</h2><p>A simple, data-driven recommendation from your current roadmap.</p></div><Trophy size={20} /></div>
        <div className="focus-card">
          {analytics.nextFocus ? (
            <>
              <div><span className="eyebrow">Recommended</span><h3>{analytics.nextFocus.topic.title}</h3><p>{analytics.nextFocus.subject.name} · {analytics.nextFocus.reason}</p></div>
              <div className="focus-meta"><span>{analytics.nextFocus.topic.duration}</span><span>{analytics.nextFocus.topic.level}</span></div>
            </>
          ) : <p>You have no available roadmap topics yet.</p>}
        </div>
      </section>
    </div>
  );
}

