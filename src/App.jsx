import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SubjectPage from "./pages/SubjectPage.jsx";
import TopicPage from "./pages/TopicPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import RevisionPage from "./pages/RevisionPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import PlannerPage from "./pages/PlannerPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="login" element={<AuthPage />} />
        <Route path="register" element={<AuthPage />} />
        <Route index element={<Dashboard />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="revision" element={<RevisionPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="subjects/:subjectId" element={<SubjectPage />} />
        <Route path="subjects/:subjectId/topics/:topicId" element={<TopicPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

