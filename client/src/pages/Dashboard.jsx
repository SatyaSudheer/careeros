import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Copy, Clock, ArrowRight, Sparkles, User, Briefcase, GraduationCap, Layers, Loader2, BarChart3, CheckCircle2, BookOpen } from 'lucide-react';

const STAT_LINKS = {
  Resumes: null,
  'Active Jobs': '/jobs',
  Applied: '/jobs',
  Interviews: '/jobs',
  'Prep Plans': '/prep',
};
import { api } from '../api.js';

function timeAgo(dateStr) {
  // SQLite CURRENT_TIMESTAMP returns "YYYY-MM-DD HH:MM:SS" in UTC with no timezone
  // marker — normalize to ISO 8601 so Date() parses it as UTC, not local time.
  const utc = String(dateStr).replace(' ', 'T') + 'Z';
  const diff = (Date.now() - new Date(utc).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-pink-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-indigo-600',
];

function ProfileBanner({ profile, onNewFromProfile, onOpenProfile }) {
  const [creating, setCreating] = useState(false);
  const p = profile.personal || {};
  const stats = [
    { icon: Briefcase,      count: profile.experiences?.length || 0, label: 'experiences' },
    { icon: GraduationCap, count: profile.education?.length    || 0, label: 'education' },
    { icon: Layers,         count: profile.skills?.length       || 0, label: 'skill groups' },
  ].filter(s => s.count > 0);

  async function handleCreate() {
    setCreating(true);
    try { await onNewFromProfile(); }
    finally { setCreating(false); }
  }

  return (
    <div className="mb-8 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 flex items-center gap-5">
      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
        <User className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-widest">Master Profile</span>
        </div>
        <p className="font-semibold text-slate-900 text-[15px] truncate">
          {p.full_name || 'Set up your profile →'}
        </p>
        {p.tagline && <p className="text-slate-500 text-[12px] truncate">{p.tagline}</p>}
        {stats.length > 0 && (
          <div className="flex items-center gap-3 mt-1.5">
            {stats.map(({ icon: Icon, count, label }) => (
              <span key={label} className="flex items-center gap-1 text-[11.5px] text-slate-400">
                <Icon className="h-3 w-3" />
                {count} {label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onOpenProfile}
          className="btn-ghost !text-indigo-600 !border !border-indigo-200 hover:!bg-indigo-50 !text-xs !py-1.5 !px-3"
        >
          Open Profile
        </button>
        <button
          onClick={handleCreate}
          disabled={creating || !p.full_name}
          title={!p.full_name ? 'Fill in your profile first' : undefined}
          className="btn-primary !text-xs !py-1.5 !px-3 disabled:opacity-40"
        >
          {creating
            ? <><Loader2 className="h-3 w-3 animate-spin" />Creating…</>
            : <><Plus className="h-3 w-3" />New from Profile</>
          }
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [resumes, setResumes]   = useState([]);
  const [profile, setProfile]   = useState(null);
  const [metrics, setMetrics]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [cloningId, setCloningId]   = useState(null);
  const [loadError, setLoadError]   = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.resumes.list(),
      api.profile.get(),
      api.metrics.get(),
    ]).then(([resumes, prof, metricData]) => {
      setResumes(resumes);
      setProfile(prof);
      setMetrics(metricData);
    }).catch((err) => {
      setLoadError(err.message || 'Failed to reach the CareerOS server');
    }).finally(() => setLoading(false));
  }, []);

  async function createResume() {
    setCreating(true);
    try {
      const resume = await api.resumes.create({ title: 'My Resume' });
      navigate(`/resumes/${resume.id}`);
    } finally {
      setCreating(false);
    }
  }

  const handleNewFromProfile = useCallback(async () => {
    const resume = await api.profile.createResume('Untitled Resume');
    navigate(`/resumes/${resume.id}`);
  }, [navigate]);

  async function deleteResume(e, id) {
    e.stopPropagation();
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    setDeletingId(id);
    await api.resumes.delete(id);
    setResumes(prev => prev.filter(r => r.id !== id));
    setDeletingId(null);
  }

  async function cloneResume(e, id) {
    e.stopPropagation();
    setCloningId(id);
    try {
      const cloned = await api.resumes.clone(id);
      setResumes(prev => [cloned, ...prev]);
    } finally {
      setCloningId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-slate-900">Dashboard</h1>
          <button onClick={createResume} disabled={creating} className="btn-primary text-[13px] !py-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Resume
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-10 flex flex-col items-center text-center gap-2">
            <p className="text-sm font-semibold text-rose-500">Couldn't reach the CareerOS server</p>
            <p className="text-xs text-slate-400 max-w-sm">{loadError} — make sure the server (port 3001) is running, then reload.</p>
            <button onClick={() => window.location.reload()} className="btn-secondary !py-1.5 !px-4 !text-xs mt-2">Retry</button>
          </div>
        ) : resumes.length === 0 && !profile ? (
          /* ── Empty state ─────────────────────────────────── */
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
              <Sparkles className="h-7 w-7 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Build your first resume</h2>
            <p className="text-slate-400 text-sm mb-7 max-w-xs">
              Start with your profile — one master record you can spin into tailored resumes.
            </p>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/profile')} className="btn-primary px-6 py-2.5">
                <User className="h-4 w-4" />
                Set Up Profile
              </button>
              <button onClick={createResume} disabled={creating} className="btn-secondary px-5 py-2.5">
                <Plus className="h-4 w-4" />
                Blank Resume
              </button>
            </div>
          </div>
        ) : (
          <>
            {profile && (
              <ProfileBanner
                profile={profile}
                onNewFromProfile={handleNewFromProfile}
                onOpenProfile={() => navigate('/profile')}
              />
            )}
            {!profile && (
              <button
                onClick={() => navigate('/profile')}
                className="mb-8 w-full rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 text-left hover:bg-indigo-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                    <User className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-indigo-700">Set up your master profile</p>
                    <p className="text-[11.5px] text-indigo-400">Fill in once, generate tailored resumes instantly</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-indigo-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )}

            <div className="mb-8 grid gap-4 lg:grid-cols-3">
              <button
                onClick={() => resumes[0] ? navigate(`/resumes/${resumes[0].id}`) : createResume()}
                disabled={creating}
                className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[15px] font-bold text-slate-900">Resume Builder</h2>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </div>
                    <p className="mt-1 text-[13px] text-slate-500">{resumes.length} tailored resume{resumes.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/jobs')}
                className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[15px] font-bold text-slate-900">Job Tracker</h2>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </div>
                    <p className="mt-1 text-[13px] text-slate-500">{metrics?.jobs || 0} tracked JD{metrics?.jobs === 1 ? '' : 's'} with {metrics?.resumeShares || 0} resume tag{metrics?.resumeShares === 1 ? '' : 's'}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigate('/prep')}
                className="group rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[15px] font-bold text-slate-900">Prep Tracker</h2>
                      <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                    </div>
                    <p className="mt-1 text-[13px] text-slate-500">{metrics?.prepPlans || 0} plan{metrics?.prepPlans === 1 ? '' : 's'}, {metrics?.prepItemsTotal || 0} task{metrics?.prepItemsTotal === 1 ? '' : 's'}</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { label: 'Resumes', value: metrics?.resumes ?? resumes.length, icon: FileText },
                { label: 'Active Jobs', value: metrics?.active ?? 0, icon: BarChart3 },
                { label: 'Applied', value: metrics?.applied ?? 0, icon: CheckCircle2 },
                { label: 'Interviews', value: metrics?.interview ?? 0, icon: Briefcase },
                { label: 'Prep Plans', value: metrics?.prepPlans ?? 0, icon: BookOpen },
              ].map(({ label, value, icon: Icon }) => {
                const to = STAT_LINKS[label];
                const Comp = to ? 'button' : 'div';
                return (
                  <Comp
                    key={label}
                    onClick={to ? () => navigate(to) : undefined}
                    className={`rounded-xl border border-slate-200 bg-white p-4 text-left transition-all ${to ? 'cursor-pointer hover:border-indigo-200 hover:shadow-sm' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
                      <Icon className="h-4 w-4 text-slate-300" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                  </Comp>
                );
              })}
            </div>

            <div className="mb-6 flex items-end justify-between">
              <div>
                <h1 className="text-[22px] font-bold text-slate-900">My Resumes</h1>
                <p className="text-slate-400 text-sm mt-0.5">{resumes.length} resume{resumes.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* New card */}
              <button
                onClick={createResume}
                disabled={creating}
                className="group h-44 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-500"
              >
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-current flex items-center justify-center transition-transform group-hover:scale-110">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-[13px] font-semibold">New Resume</span>
              </button>

              {resumes.map((resume, idx) => (
                <div
                  key={resume.id}
                  onClick={() => navigate(`/resumes/${resume.id}`)}
                  className="group relative h-44 rounded-xl bg-white border border-slate-200 cursor-pointer overflow-hidden transition-all duration-200 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${GRADIENTS[idx % GRADIENTS.length]}`} />

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]} flex items-center justify-center`}>
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => cloneResume(e, resume.id)}
                          disabled={cloningId === resume.id}
                          title="Duplicate resume"
                          className="btn-ghost !p-1.5 !text-slate-400 hover:!text-indigo-500 hover:!bg-indigo-50"
                        >
                          {cloningId === resume.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={e => deleteResume(e, resume.id)}
                          disabled={deletingId === resume.id}
                          title="Delete resume"
                          className="btn-ghost !p-1.5 !text-slate-400 hover:!text-red-500 hover:!bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-slate-800 text-[14px] truncate mb-1">{resume.title}</h3>
                    <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>Updated {timeAgo(resume.updated_at)}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[12px] font-semibold text-indigo-600 flex items-center gap-1">
                      Open editor <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
