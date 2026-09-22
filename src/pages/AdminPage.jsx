import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, Check, Clipboard, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../state/authStore.jsx";
import { useContent } from "../state/contentStore.jsx";

const emptyResource = () => ({ id: `resource-${Date.now()}`, type: "Lecture", title: "New Resource", source: "", url: "", minutes: 30 });
const emptyTopic = (order) => ({
  id: `topic-${Date.now()}`,
  title: "New Topic",
  order,
  level: "Foundation",
  duration: "2 hours",
  summary: "Add a short description.",
  resources: [],
  notes: [],
  practice: { type: "mcq", problems: [], questions: [] },
});
const emptySubject = () => ({
  id: `subject-${Date.now()}`,
  name: "New Subject",
  fullName: "New Subject",
  description: "Describe this subject.",
  accent: "#2563eb",
  stats: { topics: 0, estimatedHours: 0 },
  topics: [],
});
const emptyMcq = () => ({
  id: `mcq-${Date.now()}`,
  topic: "",
  difficulty: "Easy",
  prompt: "New question",
  options: ["Option A", "Option B", "Option C", "Option D"],
  correctAnswer: "Option A",
  explanation: "Add the explanation.",
});
const emptyCoding = () => ({
  id: `problem-${Date.now()}`,
  title: "New Coding Problem",
  topic: "",
  platform: "LeetCode",
  difficulty: "Easy",
  url: "",
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export default function AdminPage() {
  const { user } = useAuth();
  const { subjects: liveSubjects, source, updatedAt, refresh } = useContent();
  const [catalog, setCatalog] = useState(() => clone(liveSubjects));
  const [subjectId, setSubjectId] = useState(liveSubjects[0]?.id || "");
  const [topicId, setTopicId] = useState(liveSubjects[0]?.topics?.[0]?.id || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = clone(liveSubjects);
    setCatalog(next);
    if (!subjectId && next[0]) setSubjectId(next[0].id);
  }, [liveSubjects]);

  const selectedSubject = useMemo(() => catalog.find((item) => item.id === subjectId), [catalog, subjectId]);
  const selectedTopic = useMemo(() => selectedSubject?.topics?.find((item) => item.id === topicId), [selectedSubject, topicId]);

  useEffect(() => {
    if (selectedSubject && !selectedSubject.topics.some((topic) => topic.id === topicId)) {
      setTopicId(selectedSubject.topics[0]?.id || "");
    }
  }, [selectedSubject, topicId]);

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  function updateSubject(patch) {
    setCatalog((current) => current.map((item) => (item.id === subjectId ? { ...item, ...patch } : item)));
  }

  function updateTopic(patch) {
    setCatalog((current) => current.map((subject) => {
      if (subject.id !== subjectId) return subject;
      return { ...subject, topics: subject.topics.map((topic) => topic.id === topicId ? { ...topic, ...patch } : topic) };
    }));
  }

  function replaceTopics(topics) {
    updateSubject({ topics });
  }

  function addSubject() {
    const next = emptySubject();
    setCatalog((current) => [...current, next]);
    setSubjectId(next.id);
    setTopicId("");
    setMessage("New subject added locally. Save the catalog to persist it.");
  }

  function deleteSubject() {
    if (!selectedSubject) return;
    const nextSubjects = catalog.filter((subject) => subject.id !== selectedSubject.id);
    setCatalog(nextSubjects);
    setSubjectId(nextSubjects[0]?.id || "");
    setTopicId(nextSubjects[0]?.topics?.[0]?.id || "");
  }

  function addTopic() {
    if (!selectedSubject) return;
    const next = emptyTopic(selectedSubject.topics.length + 1);
    replaceTopics([...selectedSubject.topics, next]);
    setTopicId(next.id);
  }

  function deleteTopic() {
    if (!selectedSubject || !selectedTopic) return;
    const nextTopics = selectedSubject.topics.filter((topic) => topic.id !== selectedTopic.id);
    replaceTopics(nextTopics);
    setTopicId(nextTopics[0]?.id || "");
  }

  function addResource() {
    if (!selectedTopic) return;
    updateTopic({ resources: [...(selectedTopic.resources || []), emptyResource()] });
  }

  function updateResource(index, patch) {
    const resources = clone(selectedTopic.resources || []);
    resources[index] = { ...resources[index], ...patch };
    updateTopic({ resources });
  }

  function removeResource(index) {
    const resources = (selectedTopic.resources || []).filter((_, itemIndex) => itemIndex !== index);
    updateTopic({ resources });
  }

  function addNote() {
    if (!selectedTopic) return;
    updateTopic({ notes: [...(selectedTopic.notes || []), "New note"] });
  }

  function updateNote(index, value) {
    const notes = [...(selectedTopic.notes || [])];
    notes[index] = value;
    updateTopic({ notes });
  }

  function removeNote(index) {
    updateTopic({ notes: (selectedTopic.notes || []).filter((_, itemIndex) => itemIndex !== index) });
  }

  function addCodingProblem() {
    if (!selectedTopic) return;
    updateTopic({
      practice: {
        ...(selectedTopic.practice || {}),
        type: "coding",
        problems: [...(selectedTopic.practice?.problems || []), emptyCoding()],
        questions: [],
      },
    });
  }

  function addMcq() {
    if (!selectedTopic) return;
    updateTopic({
      practice: {
        ...(selectedTopic.practice || {}),
        type: "mcq",
        problems: [],
        questions: [...(selectedTopic.practice?.questions || []), emptyMcq()],
      },
    });
  }

  function updatePractice(patch) {
    updateTopic({ practice: { ...(selectedTopic.practice || {}), ...patch } });
  }

  async function saveCatalog() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await api.saveContent(catalog);
      setCatalog(clone(result.subjects));
      await refresh();
      setMessage("Content saved to MongoDB.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function seedBuiltInContent() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await api.seedContent();
      setCatalog(clone(result.subjects));
      await refresh();
      setSubjectId(result.subjects[0]?.id || "");
      setTopicId(result.subjects[0]?.topics?.[0]?.id || "");
      setMessage("Built-in CodePrep catalog copied into the database.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const practice = selectedTopic?.practice || { type: "mcq", problems: [], questions: [] };

  return (
    <div className="stack">
      <section className="admin-hero">
        <div>
          <span className="eyebrow">Admin Content Studio</span>
          <h2>Manage the learning catalog without editing source code.</h2>
          <p>Create subjects, roadmap topics, resources, notes, coding problems, and MCQs from one place.</p>
        </div>
        <div className="admin-actions">
          <button className="secondary-button" type="button" onClick={seedBuiltInContent} disabled={saving}>
            <Clipboard size={16} /> Seed built-in catalog
          </button>
          <button className="primary-button" type="button" onClick={saveCatalog} disabled={saving}>
            <Save size={16} /> {saving ? "Saving…" : "Save to MongoDB"}
          </button>
        </div>
      </section>

      <section className="admin-status">
        <span>Source: <strong>{source === "database" ? "MongoDB" : "Built-in catalog"}</strong></span>
        {updatedAt ? <span>Last published: {new Date(updatedAt).toLocaleString()}</span> : <span>Not published yet</span>}
        <button type="button" className="icon-button" title="Refresh content" onClick={() => refresh()}><RefreshCw size={16} /></button>
      </section>

      {error ? <div className="error-banner"><AlertCircle size={18} />{error}</div> : null}
      {message ? <div className="success-banner"><Check size={18} />{message}</div> : null}

      <section className="content-section admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-head">
            <div><span className="eyebrow">Catalog</span><h3>{catalog.length} subjects</h3></div>
            <button type="button" className="icon-button" onClick={addSubject} title="Add subject"><Plus size={17} /></button>
          </div>
          <div className="admin-subject-list">
            {catalog.map((subject) => (
              <button key={subject.id} type="button" className={subject.id === subjectId ? "admin-subject active" : "admin-subject"} onClick={() => { setSubjectId(subject.id); setTopicId(subject.topics?.[0]?.id || ""); }}>
                <span className="admin-dot" style={{ background: subject.accent || "#2563eb" }} />
                <span><strong>{subject.name}</strong><small>{subject.topics?.length || 0} topics</small></span>
              </button>
            ))}
          </div>
        </aside>

        <div className="admin-editor">
          {selectedSubject ? (
            <>
              <div className="admin-editor-head">
                <div><span className="eyebrow">Subject</span><h3>{selectedSubject.name}</h3></div>
                <button type="button" className="danger-button" onClick={deleteSubject}><Trash2 size={15} /> Delete subject</button>
              </div>

              <div className="admin-form-grid">
                <label>Short name<input value={selectedSubject.name} onChange={(e) => updateSubject({ name: e.target.value })} /></label>
                <label>Full name<input value={selectedSubject.fullName || ""} onChange={(e) => updateSubject({ fullName: e.target.value })} /></label>
                <label>Accent<input value={selectedSubject.accent || ""} onChange={(e) => updateSubject({ accent: e.target.value })} /></label>
                <label>Description<textarea value={selectedSubject.description || ""} onChange={(e) => updateSubject({ description: e.target.value })} rows={3} /></label>
              </div>

              <div className="admin-topic-toolbar">
                <div><span className="eyebrow">Roadmap</span><h3>{selectedSubject.topics?.length || 0} topics</h3></div>
                <button type="button" className="secondary-button" onClick={addTopic}><Plus size={15} /> Add topic</button>
              </div>

              <div className="admin-topic-tabs">
                {selectedSubject.topics?.map((topic) => (
                  <button key={topic.id} type="button" className={topic.id === topicId ? "filter-chip active" : "filter-chip"} onClick={() => setTopicId(topic.id)}>
                    {topic.order}. {topic.title}
                  </button>
                ))}
              </div>

              {selectedTopic ? (
                <div className="admin-topic-editor">
                  <div className="admin-editor-head compact">
                    <div><span className="eyebrow">Topic</span><h3>{selectedTopic.title}</h3></div>
                    <button type="button" className="danger-button" onClick={deleteTopic}><Trash2 size={15} /> Delete topic</button>
                  </div>

                  <div className="admin-form-grid topic-grid">
                    <label>Title<input value={selectedTopic.title} onChange={(e) => updateTopic({ title: e.target.value })} /></label>
                    <label>Level<select value={selectedTopic.level || "Foundation"} onChange={(e) => updateTopic({ level: e.target.value })}><option>Foundation</option><option>Intermediate</option><option>Advanced</option></select></label>
                    <label>Duration<input value={selectedTopic.duration || ""} onChange={(e) => updateTopic({ duration: e.target.value })} /></label>
                    <label>Order<input type="number" min="1" value={selectedTopic.order || 1} onChange={(e) => updateTopic({ order: Number(e.target.value) || 1 })} /></label>
                    <label className="wide">Summary<textarea value={selectedTopic.summary || ""} rows={3} onChange={(e) => updateTopic({ summary: e.target.value })} /></label>
                  </div>

                  <div className="admin-subsection">
                    <div className="admin-editor-head compact"><div><span className="eyebrow">Resources</span><h4>{selectedTopic.resources?.length || 0}</h4></div><button className="secondary-button" type="button" onClick={addResource}><Plus size={15} /> Resource</button></div>
                    <div className="admin-item-list">
                      {(selectedTopic.resources || []).map((item, index) => (
                        <div className="admin-item-card" key={item.id || index}>
                          <div className="admin-form-grid compact-grid">
                            <label>Title<input value={item.title || ""} onChange={(e) => updateResource(index, { title: e.target.value })} /></label>
                            <label>Type<select value={item.type || "Lecture"} onChange={(e) => updateResource(index, { type: e.target.value })}><option>Lecture</option><option>Resource</option><option>Practice Set</option></select></label>
                            <label>Source<input value={item.source || ""} onChange={(e) => updateResource(index, { source: e.target.value })} /></label>
                            <label>URL<input value={item.url || ""} onChange={(e) => updateResource(index, { url: e.target.value })} /></label>
                          </div>
                          <button className="icon-button danger" type="button" onClick={() => removeResource(index)} title="Remove resource"><Trash2 size={15} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="admin-subsection">
                    <div className="admin-editor-head compact"><div><span className="eyebrow">Short notes</span><h4>{selectedTopic.notes?.length || 0}</h4></div><button className="secondary-button" type="button" onClick={addNote}><Plus size={15} /> Note</button></div>
                    <div className="admin-note-list">
                      {(selectedTopic.notes || []).map((note, index) => (
                        <div className="admin-note-row" key={`${index}-${note.slice(0, 10)}`}>
                          <textarea rows={2} value={note} onChange={(e) => updateNote(index, e.target.value)} />
                          <button className="icon-button danger" type="button" onClick={() => removeNote(index)} title="Remove note"><Trash2 size={15} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="admin-subsection">
                    <div className="admin-editor-head compact"><div><span className="eyebrow">Practice</span><h4>{practice.type === "mcq" ? `${practice.questions?.length || 0} MCQs` : `${practice.problems?.length || 0} coding problems`}</h4></div><div className="inline-actions"><select value={practice.type || "mcq"} onChange={(e) => updatePractice({ type: e.target.value })}><option value="mcq">MCQ</option><option value="coding">Coding</option></select>{practice.type === "mcq" ? <button className="secondary-button" type="button" onClick={addMcq}><Plus size={15} /> MCQ</button> : <button className="secondary-button" type="button" onClick={addCodingProblem}><Plus size={15} /> Problem</button>}</div></div>

                    {practice.type === "mcq" ? (
                      <div className="admin-question-list">
                        {(practice.questions || []).map((question, index) => (
                          <div className="admin-item-card" key={question.id || index}>
                            <div className="admin-form-grid compact-grid">
                              <label className="wide">Question<textarea rows={2} value={question.prompt || ""} onChange={(e) => { const questions = clone(practice.questions || []); questions[index].prompt = e.target.value; updatePractice({ questions }); }} /></label>
                              {question.options?.map((option, optionIndex) => <label key={optionIndex}>Option {String.fromCharCode(65 + optionIndex)}<input value={option} onChange={(e) => { const questions = clone(practice.questions || []); questions[index].options[optionIndex] = e.target.value; if (questions[index].correctAnswer === question.options[optionIndex]) questions[index].correctAnswer = e.target.value; updatePractice({ questions }); }} /></label>)}
                              <label>Correct answer<select value={question.correctAnswer || ""} onChange={(e) => { const questions = clone(practice.questions || []); questions[index].correctAnswer = e.target.value; updatePractice({ questions }); }}>{(question.options || []).map((option) => <option key={option}>{option}</option>)}</select></label>
                              <label>Difficulty<select value={question.difficulty || "Easy"} onChange={(e) => { const questions = clone(practice.questions || []); questions[index].difficulty = e.target.value; updatePractice({ questions }); }}><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
                              <label className="wide">Explanation<textarea rows={2} value={question.explanation || ""} onChange={(e) => { const questions = clone(practice.questions || []); questions[index].explanation = e.target.value; updatePractice({ questions }); }} /></label>
                            </div>
                            <button className="icon-button danger" type="button" onClick={() => updatePractice({ questions: (practice.questions || []).filter((_, questionIndex) => questionIndex !== index) })} title="Remove question"><Trash2 size={15} /></button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="admin-question-list">
                        {(practice.problems || []).map((problem, index) => (
                          <div className="admin-item-card" key={problem.id || index}>
                            <div className="admin-form-grid compact-grid">
                              <label>Title<input value={problem.title || ""} onChange={(e) => { const problems = clone(practice.problems || []); problems[index].title = e.target.value; updatePractice({ problems }); }} /></label>
                              <label>Platform<input value={problem.platform || ""} onChange={(e) => { const problems = clone(practice.problems || []); problems[index].platform = e.target.value; updatePractice({ problems }); }} /></label>
                              <label>Difficulty<select value={problem.difficulty || "Easy"} onChange={(e) => { const problems = clone(practice.problems || []); problems[index].difficulty = e.target.value; updatePractice({ problems }); }}><option>Easy</option><option>Medium</option><option>Hard</option></select></label>
                              <label>URL<input value={problem.url || ""} onChange={(e) => { const problems = clone(practice.problems || []); problems[index].url = e.target.value; updatePractice({ problems }); }} /></label>
                            </div>
                            <button className="icon-button danger" type="button" onClick={() => updatePractice({ problems: (practice.problems || []).filter((_, problemIndex) => problemIndex !== index) })} title="Remove problem"><Trash2 size={15} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-state"><BookOpen size={28} /><h3>No topic selected</h3><p>Add a topic to start editing learning content.</p></div>
              )}
            </>
          ) : (
            <div className="empty-state"><BookOpen size={28} /><h3>No subjects yet</h3><p>Create your first subject.</p></div>
          )}
        </div>
      </section>
    </div>
  );
}

