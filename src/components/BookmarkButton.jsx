import { Bookmark, BookmarkCheck } from "lucide-react";

export default function BookmarkButton({ bookmarked, onToggle, label = "Bookmark" }) {
  return (
    <button
      type="button"
      className={bookmarked ? "icon-button bookmarked" : "icon-button"}
      onClick={onToggle}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? `Remove ${label}` : label}
      title={bookmarked ? `Remove ${label}` : label}
    >
      {bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
      <span>{bookmarked ? "Saved" : label}</span>
    </button>
  );
}

