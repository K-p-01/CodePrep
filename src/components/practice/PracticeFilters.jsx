import { DEFAULT_PRACTICE_FILTERS, hasActivePracticeFilters } from "./practiceUtils.js";

const FILTERS = {
  subject: ["Subject", "subjects"],
  topic: ["Topic", "topics"],
  type: ["Practice type", "types"],
  difficulty: ["Difficulty", "difficulties"],
  status: ["Completion status", null],
};

function labelFor(value) {
  return ({ coding: "Coding", mcq: "MCQ", easy: "Easy", medium: "Medium", hard: "Hard" })[value] ?? value;
}

export default function PracticeFilters({ filters, options, onChange, visibleFilters = ["type", "difficulty", "status"] }) {
  const controls = visibleFilters.filter((key) => {
    if (key === "status") return options.hasCompletionStatus;
    return (options[FILTERS[key]?.[1]]?.length ?? 0) > 1;
  });

  if (!controls.length) return null;

  function setFilter(key, value) {
    onChange({ ...filters, [key]: value, ...(key === "subject" ? { topic: "all" } : {}) });
  }

  return (
    <div className="practice-filter-toolbar">
      <div className="practice-filters">
        {controls.map((key) => {
          const [label, optionsKey] = FILTERS[key] ?? [];
          const values = key === "status"
            ? [{ value: "all", label: "All status" }, { value: "incomplete", label: "Incomplete" }, { value: "completed", label: "Completed" }]
            : [{ value: "all", label: `All ${label.toLowerCase()}` }, ...options[optionsKey].map((value) => typeof value === "string" ? { value, label: labelFor(value) } : value)];
          return <label key={key}>{label}<select value={filters[key]} onChange={(event) => setFilter(key, event.target.value)}>
            {values.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select></label>;
        })}
      </div>
      {hasActivePracticeFilters(filters) && <button type="button" className="clear-practice-filters" onClick={() => onChange({ ...DEFAULT_PRACTICE_FILTERS })}>Clear filters</button>}
    </div>
  );
}
