import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Briefcase, BookOpen, User, LayoutDashboard, Sparkles, Compass, Library, Type, Mail } from 'lucide-react';
import AiSettingsModal from './AiSettingsModal.jsx';
import AppearanceModal from './AppearanceModal.jsx';

const NAV = [
  { path: '/',      icon: LayoutDashboard, label: 'Dashboard',    exact: true },
  { path: '/jobs',  icon: Briefcase,       label: 'Job Tracker',  exact: false },
  { path: '/cover-letters', icon: Mail,      label: 'Cover Letters', exact: false },
  { path: '/prep',  icon: BookOpen,        label: 'Prep Tracker', exact: false },
  { path: '/questions', icon: Library,     label: 'Question Bank', exact: false },
  { path: '/next-role', icon: Compass,     label: 'Next Role',    exact: false },
];

const BOTTOM = [
  { path: '/profile', icon: User, label: 'Profile', exact: false },
];

function NavItem({ path, icon: Icon, label, exact }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <button
      onClick={() => navigate(path)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition-all ${
        active
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-indigo-500' : 'text-slate-400'}`} />
      {label}
    </button>
  );
}

export default function Sidebar() {
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  return (
    <aside className="flex h-screen w-[216px] flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
          <FileText className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-[15px] font-semibold text-slate-900">CareerOS</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 pt-3">
        <div className="space-y-0.5">
          {NAV.map(item => <NavItem key={item.path} {...item} />)}
        </div>
      </nav>

      <div className="border-t border-slate-100 p-2 pb-3">
        {BOTTOM.map(item => <NavItem key={item.path} {...item} />)}
        <button
          onClick={() => setAppearanceOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          <Type className="h-4 w-4 flex-shrink-0 text-slate-400" />
          Appearance
        </button>
        <button
          onClick={() => setAiSettingsOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
        >
          <Sparkles className="h-4 w-4 flex-shrink-0 text-slate-400" />
          AI Settings
        </button>
      </div>

      {appearanceOpen && <AppearanceModal onClose={() => setAppearanceOpen(false)} />}
      {aiSettingsOpen && <AiSettingsModal onClose={() => setAiSettingsOpen(false)} />}
    </aside>
  );
}
