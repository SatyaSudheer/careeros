import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Editor from './pages/Editor.jsx';
import Profile from './pages/Profile.jsx';
import JobTracker from './pages/JobTracker.jsx';
import PrepDashboard from './pages/PrepDashboard.jsx';
import PrepPlanBuilder from './pages/PrepPlanBuilder.jsx';
import NextRole from './pages/NextRole.jsx';
import QuestionBank from './pages/QuestionBank.jsx';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/jobs" element={<Layout><JobTracker /></Layout>} />
        <Route path="/prep" element={<Layout><PrepDashboard /></Layout>} />
        <Route path="/next-role" element={<Layout><NextRole /></Layout>} />
        <Route path="/questions" element={<Layout><QuestionBank /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        {/* Detail views — full screen, no sidebar */}
        <Route path="/resumes/:id" element={<Editor />} />
        <Route path="/prep-plans/:id" element={<PrepPlanBuilder />} />
      </Routes>
    </BrowserRouter>
  );
}
