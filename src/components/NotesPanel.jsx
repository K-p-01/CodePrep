export default function NotesPanel({ notes }) {
  if (!notes.length) {
    return <p className="muted">Short notes will be maintained as data for this topic.</p>;
  }

  return (
    <ul className="notes-list">
      {notes.map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
}

