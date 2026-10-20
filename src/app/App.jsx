import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout.jsx";
import DashboardPage from "../pages/Dashboard.jsx";
import SubjectsPage from "../pages/SubjectsPage.jsx";
import SubjectPage from "../pages/SubjectPage.jsx";
import TopicPage from "../pages/TopicPage.jsx";
import PracticePage from "../pages/PracticePage.jsx";
import ProgressPage from "../pages/ProgressPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="subjects/:subjectId" element={<SubjectPage />} />
        <Route path="subjects/:subjectId/topics/:topicId" element={<TopicPage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
