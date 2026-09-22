export default function PracticeFilters({ filters, options, onChange }) {
  return (
    <div className="practice-filters" aria-label="Practice filters">
      <label>
        <span>Type</span>
        <select value={filters.type} onChange={(event) => onChange({ type: event.target.value })}>
          <option value="all">All</option>
          {options.types.map((type) => (
            <option key={type} value={type}>
              {type === "mcq" ? "MCQ" : "Coding"}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Topic</span>
        <select value={filters.topic} onChange={(event) => onChange({ topic: event.target.value })}>
          <option value="all">All topics</option>
          {options.topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Difficulty</span>
        <select
          value={filters.difficulty}
          onChange={(event) => onChange({ difficulty: event.target.value })}
        >
          <option value="all">All levels</option>
          {options.difficulties.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

