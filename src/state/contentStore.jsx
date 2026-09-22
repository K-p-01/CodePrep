import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api.js";
import { subjects as fallbackSubjects } from "../data/subjects.js";

const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const [subjects, setSubjects] = useState(fallbackSubjects);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState("builtin");
  const [updatedAt, setUpdatedAt] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const result = await api.getContent();
      if (Array.isArray(result.subjects) && result.subjects.length) {
        setSubjects(result.subjects);
        setSource(result.source || "database");
        setUpdatedAt(result.updatedAt || null);
      } else {
        setSubjects(fallbackSubjects);
        setSource("builtin");
      }
    } catch (error) {
      console.warn("Content API unavailable; using built-in catalog.", error);
      setSubjects(fallbackSubjects);
      setSource("builtin");
      setUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = { subjects, loading, source, updatedAt, refresh, setSubjects };
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) throw new Error("useContent must be used inside ContentProvider");
  return context;
}

