import { Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout.jsx";
import DashboardPage from "../pages/Dashboard.jsx";
import SubjectsPage from "../pages/SubjectsPage.jsx";
import SubjectPage from "../pages/SubjectPage.jsx";
import TopicPage from "../pages/TopicPage.jsx";
import PracticePage from "../pages/PracticePage.jsx";
import ProgressPage from "../pages/ProgressPage.jsx";
import RevisionPage from "../pages/RevisionPage.jsx";
import PatternExplorerPage from "../pages/PatternExplorerPage.jsx";
import PlacementSimulationPage from "../pages/PlacementSimulationPage.jsx";
import NotFoundState from "../components/layout/NotFoundState.jsx";

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
        <Route path="revision" element={<RevisionPage />} />
        <Route path="patterns" element={<PatternExplorerPage />} />
        <Route path="simulation" element={<PlacementSimulationPage />} />
        <Route path="*" element={<NotFoundState title="Page not found" message="This CodePrep page does not exist. Choose a subject or return to the dashboard." backTo="/" backLabel="Go to dashboard" />} />
      </Route>
    </Routes>
  );
}
