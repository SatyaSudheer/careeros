import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Editor from './pages/Editor.jsx';
import Profile from './pages/Profile.jsx';
import JobTracker from './pages/JobTracker.jsx';
import PrepDashboard from './pages/PrepDashboard.jsx';
import PrepPlanBuilder from './pages/PrepPlanBuilder.jsx';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<JobTracker />} />
        <Route path="/prep" element={<PrepDashboard />} />
        <Route path="/prep-plans/:id" element={<PrepPlanBuilder />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/resumes/:id" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  );
}
