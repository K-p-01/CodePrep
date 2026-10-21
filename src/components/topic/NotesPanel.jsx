const noteFields = [
  ["definition", "Definition"],
  ["example", "Example"],
  ["formula", "Formula"],
  ["complexity", "Complexity"],
  ["commonMistake", "Common mistake"],
];

function renderNote(note, index) {
  if (typeof note === "string") {
    return (
      <li className="note-card" key={`${index}-${note}`}>
        <span className="note-number">{String(index + 1).padStart(2, "0")}</span>
        <p>{note}</p>
      </li>
    );
  }

  if (!note || typeof note !== "object") return null;

  const heading = note.heading ?? note.title;
  const body = note.body ?? note.text;
  const bullets = Array.isArray(note.bullets) ? note.bullets : [];
  const fields = noteFields.filter(([key]) => note[key]);

  return (
    <li className="note-card structured-note" key={note.id ?? `${index}-${heading ?? "note"}`}>
      <span className="note-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="note-content">
        {heading && <h3>{heading}</h3>}
        {body && <p>{body}</p>}
        {bullets.length > 0 && (
          <ul>
            {bullets.map((bullet, bulletIndex) => (
              <li key={`${bulletIndex}-${bullet}`}>{bullet}</li>
            ))}
          </ul>
        )}
        {fields.length > 0 && (
          <dl className="note-facts">
            {fields.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{note[key]}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
}

export default function NotesPanel({ notes }) {
  if (!Array.isArray(notes) || !notes.length) {
    return (
      <div className="topic-empty-state">
        <strong>No revision notes yet</strong>
        <p>Short notes for this topic will appear here when they are added.</p>
      </div>
    );
  }

  return (
    <ul className="notes-list">
      {notes.map((note, index) => renderNote(note, index))}
    </ul>
  );
}
