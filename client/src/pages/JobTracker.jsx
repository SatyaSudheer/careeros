import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  CloudOff,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Plus,
  Search,
  Target,
  Trash2,
  BookOpen,
  X,
} from 'lucide-react';
import { api } from '../api.js';
import { useAutoSave } from '../hooks/useAutoSave.js';

const STATUSES = [
  { value: 'saved', label: 'Saved' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'closed', label: 'Closed' },
];

const EMPTY_JOB = {
  company: '',
  title: '',
  location: '',
  source: '',
  job_url: '',
  description: '',
  status: 'saved',
  applied_date: '',
  closing_date: '',
  contact_name: '',
  contact_email: '',
  notes: '',
  resumes: [],
  rounds: [],
  preparation_plans: [],
};

function statusClasses(status) {
  const map = {
    saved: 'bg-slate-100 text-slate-600 border-slate-200',
    applied: 'bg-blue-50 text-blue-700 border-blue-100',
    screening: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    interview: 'bg-violet-50 text-violet-700 border-violet-100',
    offer: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-red-50 text-red-700 border-red-100',
    closed: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return map[status] || map.saved;
}

function metricCount(jobs, status) {
  return jobs.filter(job => job.status === status).length;
}

// Active pipeline stages (clickable stepper) + terminal outcomes
const PIPELINE = ['saved', 'applied', 'screening', 'interview', 'offer'];
const END_STATES = ['rejected', 'closed'];

function SaveBadge({ state }) {
  if (state === 'idle') return null;
  if (state === 'pending' || state === 'saving') return (
    <span className="save-badge save-badge-saving"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
  );
  if (state === 'saved') return (
    <span className="save-badge save-badge-saved"><Check className="h-3 w-3" /> Saved</span>
  );
  return (
    <span className="save-badge save-badge-error"><CloudOff className="h-3 w-3" /> Save failed</span>
  );
}

function FieldGroup({ title, hint, children }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{title}</p>
        {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function StatusPipeline({ status, onChange }) {
  const activeIdx = PIPELINE.indexOf(status);
  const isEndState = END_STATES.includes(status);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-5 py-3">
      <div className="flex items-center">
        {PIPELINE.map((value, i) => {
          const label = STATUSES.find(s => s.value === value)?.label || value;
          const isActive = i === activeIdx;
          const isPast = activeIdx > -1 && i < activeIdx;
          return (
            <div key={value} className="flex items-center">
              {i > 0 && <ChevronRight className="mx-0.5 h-3 w-3 text-slate-200" />}
              <button
                onClick={() => onChange(value)}
                title={`Mark as ${label}`}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? statusClasses(value) + ' ring-1 ring-current/20'
                    : isPast
                      ? 'border-indigo-100 bg-indigo-50/50 text-indigo-400 hover:text-indigo-600'
                      : 'border-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                {label}
              </button>
            </div>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {END_STATES.map(value => {
          const label = STATUSES.find(s => s.value === value)?.label || value;
          return (
            <button
              key={value}
              onClick={() => onChange(value)}
              title={`Mark as ${label}`}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                status === value && isEndState
                  ? statusClasses(value) + ' ring-1 ring-current/20'
                  : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function normalizeJob(job) {
  return {
    ...EMPTY_JOB,
    ...job,
    resumes: job.resumes || [],
    rounds: job.rounds || [],
    preparation_plans: job.preparation_plans || [],
  };
}

export default function JobTracker() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [prepPlans, setPrepPlans] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_JOB);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    Promise.all([api.jobs.list(), api.resumes.list(), api.prepPlans.list()])
      .then(([jobsData, resumesData, prepData]) => {
        setJobs(jobsData);
        setResumes(resumesData);
        setPrepPlans(prepData);
        if (jobsData[0]) {
          setSelectedId(jobsData[0].id);
          setDraft(normalizeJob(jobsData[0]));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedJob = useMemo(
    () => jobs.find(job => job.id === selectedId) || null,
    [jobs, selectedId],
  );

  // JD match scores for the selected job (computed server-side from the stored JD)
  const [jdMatch, setJdMatch] = useState(null);
  useEffect(() => {
    if (!selectedId) { setJdMatch(null); return; }
    let cancelled = false;
    api.jobs.match(selectedId)
      .then(data => { if (!cancelled) setJdMatch(data); })
      .catch(() => { if (!cancelled) setJdMatch(null); });
    return () => { cancelled = true; };
  }, [selectedId, selectedJob?.updated_at]);

  const hasJdKeywords = (jdMatch?.keywords?.length || 0) > 0;
  const matchFor = (resumeId) => jdMatch?.matches?.find(m => m.resume_id === resumeId) || null;

  const filteredJobs = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(job =>
      [job.company, job.title, job.location, job.status].some(value =>
        String(value || '').toLowerCase().includes(q),
      ),
    );
  }, [filter, jobs]);

  // ── Autosave ────────────────────────────────────────────────
  // Field edits save automatically (debounced). Anything that refetches the
  // job from the server flushes pending edits first, so nothing is lost when
  // switching jobs, tagging resumes, or adding rounds.
  const draftRef = useRef(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  const saveStateRef = useRef('idle');

  const { schedule, flush, state: saveState } = useAutoSave(async (d) => {
    const updated = await api.jobs.update(d.id, d);
    // Update the list only — resetting the draft here would clobber keystrokes
    // typed while the request was in flight.
    setJobs(prev => prev.map(job => job.id === updated.id ? updated : job));
  }, 700);
  useEffect(() => { saveStateRef.current = saveState; }, [saveState]);

  function updateDraft(patch) {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      if (next.id) schedule(next);
      return next;
    });
  }

  async function flushPending() {
    if (saveStateRef.current === 'pending' && draftRef.current.id) {
      await flush(draftRef.current);
    }
  }

  async function selectJob(job) {
    await flushPending();
    setSelectedId(job.id);
    setDraft(normalizeJob(job));
  }

  async function refreshJob(id = draft.id) {
    if (!id) return null;
    await flushPending();
    const updated = await api.jobs.get(id);
    setJobs(prev => prev.map(job => job.id === updated.id ? updated : job));
    setDraft(normalizeJob(updated));
    return updated;
  }

  async function createJob() {
    setSaving(true);
    try {
      await flushPending();
      const job = await api.jobs.create({
        status: 'saved',
      });
      setJobs(prev => [job, ...prev]);
      setSelectedId(job.id);
      setDraft(normalizeJob(job));
    } finally {
      setSaving(false);
    }
  }

  async function deleteJob() {
    if (!draft.id || !confirm('Delete this job record?')) return;
    setSaving(true);
    try {
      await api.jobs.delete(draft.id);
      const nextJobs = jobs.filter(job => job.id !== draft.id);
      setJobs(nextJobs);
      if (nextJobs[0]) {
        setSelectedId(nextJobs[0].id);
        setDraft(normalizeJob(nextJobs[0]));
      } else {
        setSelectedId(null);
        setDraft(EMPTY_JOB);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleResume(resume) {
    if (!draft.id) return;
    await flushPending();
    const attached = draft.resumes.some(item => item.id === resume.id);
    const updated = attached
      ? await api.jobs.detachResume(draft.id, resume.id).then(() => api.jobs.get(draft.id))
      : await api.jobs.attachResume(draft.id, { resume_id: resume.id });
    setJobs(prev => prev.map(job => job.id === updated.id ? updated : job));
    setDraft(normalizeJob(updated));
  }

  async function addRound() {
    if (!draft.id) return;
    const roundNumber = (draft.rounds?.length || 0) + 1;
    await api.jobs.rounds.create(draft.id, {
      round_name: `Round ${roundNumber}`,
      round_type: 'technical',
      status: 'planned',
    });
    await refreshJob();
  }

  // Rounds autosave — per-round debounce, same pattern as prep plan items
  const roundTimers = useRef({});
  useEffect(() => () => Object.values(roundTimers.current).forEach(clearTimeout), []);

  function updateDraftRound(roundId, patch) {
    setDraft(prev => {
      const rounds = prev.rounds.map(round => round.id === roundId ? { ...round, ...patch } : round);
      const next = rounds.find(round => round.id === roundId);
      if (next && prev.id) {
        clearTimeout(roundTimers.current[roundId]);
        roundTimers.current[roundId] = setTimeout(() => {
          api.jobs.rounds.update(prev.id, roundId, next).catch(() => {});
        }, 700);
      }
      return { ...prev, rounds };
    });
  }

  async function deleteRound(roundId) {
    clearTimeout(roundTimers.current[roundId]);
    await api.jobs.rounds.delete(draft.id, roundId);
    await refreshJob();
  }

  async function createPrepPlan(scope) {
    const targeted = scope !== 'general' && draft.id;
    const plan = await api.prepPlans.create({
      job_id: targeted ? draft.id : null,
      scope: targeted ? scope : 'general',
      title: targeted ? `${draft.company || 'Company'} preparation` : 'General interview preparation',
      company: targeted ? draft.company : '',
      focus_areas: targeted ? draft.title : '',
      status: 'active',
    });
    setPrepPlans(prev => [plan, ...prev]);
    if (targeted) await refreshJob();
    navigate(`/prep-plans/${plan.id}?mode=edit`);
  }

  const metrics = [
    { label: 'Tracked', value: jobs.length },
    { label: 'Applied', value: metricCount(jobs, 'applied') },
    { label: 'Interviews', value: metricCount(jobs, 'interview') },
    { label: 'Offers', value: metricCount(jobs, 'offer') },
    { label: 'Closed', value: metricCount(jobs, 'closed') + metricCount(jobs, 'rejected') },
  ];

  const visiblePrepPlans = useMemo(() => (
    prepPlans.filter(plan => !plan.job_id || plan.job_id === draft.id)
  ), [prepPlans, draft.id]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div>
            <h1 className="text-[15px] font-semibold text-slate-900">Job Tracker</h1>
            <p className="text-[11.5px] text-slate-400">Pipeline, JDs, shared resumes, closure</p>
          </div>
          <button onClick={createJob} disabled={saving} className="btn-primary text-[13px] !py-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            New Job
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {metrics.map(item => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-h-[620px] rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-300" />
                <input
                  className="input pl-9"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Search jobs"
                />
              </div>
            </div>
            <div className="max-h-[720px] overflow-y-auto p-2">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="p-8 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No jobs yet</p>
                  <button onClick={createJob} className="btn-secondary mt-4">
                    <Plus className="h-4 w-4" />
                    Add Job
                  </button>
                </div>
              ) : filteredJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => selectJob(job)}
                  className={`mb-2 w-full rounded-lg border p-3 text-left transition-all ${
                    selectedId === job.id
                      ? 'border-indigo-200 bg-indigo-50/70'
                      : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-slate-900">{job.title || 'Untitled role'}</p>
                      <p className="truncate text-[12px] text-slate-500">{job.company || 'Company not set'}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${statusClasses(job.status)}`}>
                      {STATUSES.find(s => s.value === job.status)?.label || 'Saved'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11.5px] text-slate-400">
                    <span className="truncate">{job.location || job.source || 'No location'}</span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {job.resumes?.length || 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-xl border border-slate-200 bg-white">
            {!draft.id ? (
              <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
                <Briefcase className="h-10 w-10 text-slate-300" />
                <p className="mt-4 text-sm font-semibold text-slate-800">Select or create a job</p>
                <button onClick={createJob} className="btn-primary mt-5">
                  <Plus className="h-4 w-4" />
                  New Job
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-500">Application Record</p>
                    <h2 className="truncate text-xl font-bold text-slate-900">{draft.title || 'Untitled role'}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <SaveBadge state={saveState} />
                    {draft.job_url && (
                      <a href={draft.job_url} target="_blank" rel="noreferrer" className="btn-secondary" title="Open JD">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button onClick={deleteJob} disabled={saving} className="btn-ghost !text-red-500 hover:!bg-red-50" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <StatusPipeline status={draft.status} onChange={value => updateDraft({ status: value })} />

                <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-5">
                    <FieldGroup title="Role & posting">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label>
                          <span className="field-label">Role</span>
                          <input className="input" value={draft.title} onChange={e => updateDraft({ title: e.target.value })} placeholder="Senior Software Engineer" />
                        </label>
                        <label>
                          <span className="field-label">Company</span>
                          <input className="input" value={draft.company} onChange={e => updateDraft({ company: e.target.value })} placeholder="Acme Corp" />
                        </label>
                        <label>
                          <span className="field-label">Location</span>
                          <input className="input" value={draft.location} onChange={e => updateDraft({ location: e.target.value })} placeholder="Remote · Bengaluru" />
                        </label>
                        <label>
                          <span className="field-label">Source</span>
                          <input className="input" value={draft.source} onChange={e => updateDraft({ source: e.target.value })} placeholder="LinkedIn, referral…" />
                        </label>
                        <label className="md:col-span-2">
                          <span className="field-label">JD URL</span>
                          <input className="input" value={draft.job_url} onChange={e => updateDraft({ job_url: e.target.value })} placeholder="https://…" />
                        </label>
                      </div>
                    </FieldGroup>

                    <FieldGroup title="Timeline & contacts">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label>
                          <span className="field-label">Applied Date</span>
                          <input type="date" className="input" value={draft.applied_date || ''} onChange={e => updateDraft({ applied_date: e.target.value })} />
                        </label>
                        <label>
                          <span className="field-label">Target Close Date</span>
                          <input type="date" className="input" value={draft.closing_date || ''} onChange={e => updateDraft({ closing_date: e.target.value })} />
                        </label>
                        <label>
                          <span className="field-label">Contact Name</span>
                          <input className="input" value={draft.contact_name} onChange={e => updateDraft({ contact_name: e.target.value })} placeholder="Recruiter / hiring manager" />
                        </label>
                        <label>
                          <span className="field-label">Contact Email</span>
                          <input className="input" value={draft.contact_email} onChange={e => updateDraft({ contact_email: e.target.value })} />
                        </label>
                      </div>
                    </FieldGroup>

                    <FieldGroup title="Job description" hint="Powers the JD-match scores on tagged resumes">
                      <textarea
                        className="input min-h-[240px] resize-y leading-6"
                        value={draft.description}
                        onChange={e => updateDraft({ description: e.target.value })}
                        placeholder="Paste the full job description here…"
                      />
                    </FieldGroup>

                    <FieldGroup title="Closure notes">
                      <textarea
                        className="input min-h-[120px] resize-y leading-6"
                        value={draft.notes}
                        onChange={e => updateDraft({ notes: e.target.value })}
                        placeholder="Outcome, learnings, follow-ups…"
                      />
                    </FieldGroup>

                    <section className="rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-indigo-500" />
                          <h3 className="text-[13px] font-semibold text-slate-900">Hiring Rounds</h3>
                          <span className="text-[11px] text-slate-300">· saves automatically</span>
                        </div>
                        <button onClick={addRound} className="btn-secondary !py-1.5 !text-xs">
                          <Plus className="h-3.5 w-3.5" />
                          Add Round
                        </button>
                      </div>
                      <div className="space-y-3 p-4">
                        {draft.rounds.length === 0 ? (
                          <p className="text-[12.5px] text-slate-400">No rounds tracked yet.</p>
                        ) : draft.rounds.map(round => (
                          <div key={round.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                            <div className="grid gap-3 md:grid-cols-4">
                              <label className="md:col-span-2">
                                <span className="field-label">Round</span>
                                <input className="input" value={round.round_name} onChange={e => updateDraftRound(round.id, { round_name: e.target.value })} />
                              </label>
                              <label>
                                <span className="field-label">Type</span>
                                <select className="input" value={round.round_type} onChange={e => updateDraftRound(round.id, { round_type: e.target.value })}>
                                  <option value="recruiter">Recruiter</option>
                                  <option value="technical">Technical</option>
                                  <option value="system_design">System Design</option>
                                  <option value="leadership">Leadership</option>
                                  <option value="bar_raiser">Bar Raiser</option>
                                  <option value="hr">HR</option>
                                </select>
                              </label>
                              <label>
                                <span className="field-label">Status</span>
                                <select className="input" value={round.status} onChange={e => updateDraftRound(round.id, { status: e.target.value })}>
                                  <option value="planned">Planned</option>
                                  <option value="scheduled">Scheduled</option>
                                  <option value="completed">Completed</option>
                                  <option value="passed">Passed</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </label>
                              <label>
                                <span className="field-label">Date</span>
                                <input type="datetime-local" className="input" value={round.scheduled_at || ''} onChange={e => updateDraftRound(round.id, { scheduled_at: e.target.value })} />
                              </label>
                              <label className="md:col-span-3">
                                <span className="field-label">Interviewer / Panel</span>
                                <input className="input" value={round.interviewer} onChange={e => updateDraftRound(round.id, { interviewer: e.target.value })} />
                              </label>
                            </div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <label>
                                <span className="field-label">Round Notes</span>
                                <textarea className="input min-h-[110px] resize-y leading-6" value={round.notes} onChange={e => updateDraftRound(round.id, { notes: e.target.value })} />
                              </label>
                              <label>
                                <span className="field-label">Outcome / Follow-up</span>
                                <textarea className="input min-h-[110px] resize-y leading-6" value={round.outcome} onChange={e => updateDraftRound(round.id, { outcome: e.target.value })} />
                              </label>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <button onClick={() => deleteRound(round.id)} className="btn-ghost !text-red-500 hover:!bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <aside className="space-y-5">
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-[13px] font-semibold text-slate-900">Shared Resumes</h3>
                        <span className="text-[11.5px] text-slate-400">{draft.resumes.length} tagged</span>
                      </div>
                      <div className="space-y-2">
                        {resumes.length === 0 ? (
                          <button onClick={() => navigate('/')} className="btn-secondary w-full justify-center">
                            <FileText className="h-4 w-4" />
                            Create Resume
                          </button>
                        ) : resumes.map(resume => {
                          const attached = draft.resumes.some(item => item.id === resume.id);
                          const match = hasJdKeywords ? matchFor(resume.id) : null;
                          const coverageClasses = match
                            ? match.coverage >= 60
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : match.coverage >= 30
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-red-50 text-red-500 border-red-200'
                            : '';
                          return (
                            <button
                              key={resume.id}
                              onClick={() => toggleResume(resume)}
                              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                                attached ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                              }`}
                            >
                              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                                attached ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {attached ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[12.5px] font-semibold text-slate-800">{resume.title}</span>
                                <span className="block text-[11px] text-slate-400">{attached ? 'Tagged to this JD' : 'Available'}</span>
                              </span>
                              {match && (
                                <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${coverageClasses}`}>
                                  {match.coverage}%
                                </span>
                              )}
                              {attached && <X className="h-3.5 w-3.5 text-slate-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(() => {
                      if (!jdMatch) return null;
                      if (!hasJdKeywords) {
                        return (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
                              <Target className="h-4 w-4 text-slate-400" />
                              JD Match
                            </div>
                            <p className="mt-2 text-[12px] text-slate-400">Add a job description above to see how each resume matches its keywords.</p>
                          </div>
                        );
                      }
                      const attachedMatches = (jdMatch.matches || []).filter(m => m.linked);
                      const best = attachedMatches[0] || jdMatch.matches?.[0];
                      if (!best) return null;
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
                              <Target className="h-4 w-4 text-indigo-500" />
                              JD Match
                            </div>
                            <span className="text-[11px] text-slate-400">{jdMatch.keywords.length} keywords</span>
                          </div>
                          <p className="mt-2 text-[12px] text-slate-500">
                            Best fit: <span className="font-semibold text-slate-700">{best.title}</span>
                            <span className={`ml-1.5 font-bold ${best.coverage >= 60 ? 'text-emerald-600' : best.coverage >= 30 ? 'text-amber-600' : 'text-red-500'}`}>{best.coverage}%</span>
                            {!best.linked && <span className="ml-1 text-slate-400">(not tagged yet)</span>}
                          </p>
                          {best.missing.length > 0 && (
                            <div className="mt-2.5">
                              <p className="mb-1 text-[11px] font-semibold text-slate-400">Missing from it:</p>
                              <div className="flex flex-wrap gap-1">
                                {best.missing.slice(0, 8).map(kw => (
                                  <span key={kw} className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10.5px] text-red-500">{kw}</span>
                                ))}
                                {best.missing.length > 8 && <span className="text-[10.5px] text-slate-400">+{best.missing.length - 8} more</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        Timeline
                      </div>
                      <div className="mt-3 space-y-2 text-[12px] text-slate-500">
                        <p>Created: {selectedJob?.created_at ? new Date(selectedJob.created_at.replace(' ', 'T') + 'Z').toLocaleDateString() : '-'}</p>
                        <p>Updated: {selectedJob?.updated_at ? new Date(selectedJob.updated_at.replace(' ', 'T') + 'Z').toLocaleDateString() : '-'}</p>
                        <p>Applied: {draft.applied_date || '-'}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white">
                      <div className="border-b border-slate-100 p-4">
                        <div className="flex items-center justify-between text-[12px] font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-indigo-500" />
                            Preparation Plans
                          </div>
                          <button onClick={() => navigate('/prep')} className="text-indigo-600 hover:text-indigo-700">
                            View All
                          </button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button onClick={() => createPrepPlan('general')} className="btn-secondary justify-center !px-2 !py-1.5 !text-xs">
                            <BookOpen className="h-3.5 w-3.5" />
                            General
                          </button>
                          <button onClick={() => createPrepPlan('jd')} className="btn-secondary justify-center !px-2 !py-1.5 !text-xs">
                            <Target className="h-3.5 w-3.5" />
                            Targeted
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[520px] space-y-3 overflow-y-auto p-3">
                        {visiblePrepPlans.length === 0 ? (
                          <p className="px-1 py-2 text-[12.5px] text-slate-400">No preparation plans yet.</p>
                        ) : visiblePrepPlans.map(plan => (
                          <button
                            key={plan.id}
                            onClick={() => navigate(`/prep-plans/${plan.id}?mode=view`)}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/60"
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                                plan.job_id ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'
                              }`}>
                                {plan.job_id ? 'Targeted' : 'General'}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400">{plan.status || 'active'}</span>
                            </div>
                            <p className="truncate text-[12.5px] font-semibold text-slate-800">{plan.title || 'Untitled plan'}</p>
                            <p className="mt-1 line-clamp-2 text-[11.5px] text-slate-500">{plan.focus_areas || plan.company || 'Open preparation builder'}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
