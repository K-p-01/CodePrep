import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout.jsx";
import DashboardPage from "../pages/Dashboard.jsx";
import NotFoundState from "../components/layout/NotFoundState.jsx";

const SubjectsPage = lazy(() => import("../pages/SubjectsPage.jsx"));
const SubjectPage = lazy(() => import("../pages/SubjectPage.jsx"));
const TopicPage = lazy(() => import("../pages/TopicPage.jsx"));
const PracticePage = lazy(() => import("../pages/PracticePage.jsx"));
const ProgressPage = lazy(() => import("../pages/ProgressPage.jsx"));
const RevisionPage = lazy(() => import("../pages/RevisionPage.jsx"));
const PatternExplorerPage = lazy(() => import("../pages/PatternExplorerPage.jsx"));
const PlacementSimulationPage = lazy(() => import("../pages/PlacementSimulationPage.jsx"));
const ReadinessPage = lazy(() => import("../pages/ReadinessPage.jsx"));
const AnalyticsPage = lazy(() => import("../pages/AnalyticsPage.jsx"));
const CodingProblemWorkspacePage = lazy(() => import("../pages/CodingProblemWorkspacePage.jsx"));

function RouteLoadingFallback() {
  return <div className="route-loading" role="status" aria-live="polite" aria-busy="true">Loading page…</div>;
}

function LazyPage({ component: Page }) {
  return <Suspense fallback={<RouteLoadingFallback />}><Page /></Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="subjects" element={<LazyPage component={SubjectsPage} />} />
        <Route path="subjects/:subjectId" element={<LazyPage component={SubjectPage} />} />
        <Route path="subjects/:subjectId/topics/:topicId" element={<LazyPage component={TopicPage} />} />
        <Route path="practice" element={<LazyPage component={PracticePage} />} />
        <Route path="practice/:subjectId/:topicId/:problemId" element={<LazyPage component={CodingProblemWorkspacePage} />} />
        <Route path="progress" element={<LazyPage component={ProgressPage} />} />
        <Route path="revision" element={<LazyPage component={RevisionPage} />} />
        <Route path="patterns" element={<LazyPage component={PatternExplorerPage} />} />
        <Route path="simulation" element={<LazyPage component={PlacementSimulationPage} />} />
        <Route path="readiness" element={<LazyPage component={ReadinessPage} />} />
        <Route path="analytics" element={<LazyPage component={AnalyticsPage} />} />
        <Route path="*" element={<NotFoundState title="Page not found" message="This CodePrep page does not exist. Choose a subject or return to the dashboard." backTo="/" backLabel="Go to dashboard" />} />
      </Route>
    </Routes>
  );
}
