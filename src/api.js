const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

async function request(path, options = {}) {
  const token = window.localStorage.getItem("codeprep-auth-token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  updateProfile: (payload) => request("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),
  getProgress: () => request("/progress"),
  saveProgress: (progress) => request("/progress", { method: "PUT", body: JSON.stringify({ progress }) }),
  getContent: () => request("/content"),
  seedContent: () => request("/content/seed", { method: "POST" }),
  saveContent: (subjects) => request("/content", { method: "PUT", body: JSON.stringify({ subjects }) }),
};

