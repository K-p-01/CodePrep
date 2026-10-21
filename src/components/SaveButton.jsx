import { Bookmark } from "lucide-react";

export default function SaveButton({ saved, onToggle, itemLabel }) {
  return <button
    type="button"
    className={`save-button${saved ? " saved" : ""}`}
    aria-pressed={saved}
    aria-label={`${saved ? "Remove from" : "Save to"} revision: ${itemLabel}`}
    onClick={(event) => { event.stopPropagation(); onToggle(); }}
  >
    <Bookmark size={16} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    {saved ? "Saved" : "Save for revision"}
  </button>;
}
