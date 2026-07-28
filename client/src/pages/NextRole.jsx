import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Plus,
  X,
  Check,
  Minus,
  ChevronLeft,
  ChevronRight,
  Target,
  ExternalLink,
  Briefcase,
  Loader2,
  CloudOff,
} from 'lucide-react';
import { api } from '../api.js';
import { useAutoSave } from '../hooks/useAutoSave.js';

// Lara Hogan's "4 lists to identify your next role" —
// larahogan.me/blog/four-steps-identifying-your-new-role/
const BUCKETS = [
  {
    key: 'must',
    title: 'Must-Haves',
    hint: 'Non-negotiables. If you’d pass on a role missing one of these, it belongs here. This should be a short list.',
    chip: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    dot: 'bg-indigo-500',
  },
  {
    key: 'nice',
    title: 'Nice-to-Haves',
    hint: 'Things you really want to acquire or achieve — but you’d still consider a role without them.',
    chip: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    dot: 'bg-emerald-500',
  },
  {
    key: 'dont',
    title: 'Don’t-Cares',
    hint: 'Might matter a lot to others — or mattered to you in the past, and may again — but not required right now.',
    chip: 'bg-slate-50 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
  },
];

const BUCKET_ORDER = BUCKETS.map(b => b.key);

function SaveBadge({ state }) {
  if (state === 'idle') return null;
  if (state === 'pending' || state === 'saving') return (
    <span className="save-badge save-badge-saving"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
  );
  if (state === 'saved') return (
    <span className="save-badge save-badge-saved"><Check className="h-3 w-3" /> Saved</span>
  );
  return <span className="save-badge save-badge-error"><CloudOff className="h-3 w-3" /> Save failed</span>;
}

function fitFor(job, criteria, checks) {
  const get = (cid) => checks[`${job.id}:${cid}`] || 0;
  const musts = criteria.filter(c => c.bucket === 'must');
  const nices = criteria.filter(c => c.bucket === 'nice');
  const mustMet  = musts.filter(c => get(c.id) === 1).length;
  const mustMiss = musts.filter(c => get(c.id) === -1).length;
  const niceMet  = nices.filter(c => get(c.id) === 1).length;
  const evaluated = [...musts, ...nices].some(c => get(c.id) !== 0);
  let badge;
  if (mustMiss > 0) badge = { label: 'Ruled out', cls: 'bg-red-50 text-red-600 border-red-200' };
  else if (musts.length > 0 && mustMet === musts.length) badge = { label: 'Meets all musts', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
  else if (evaluated) badge = { label: 'Evaluating', cls: 'bg-amber-50 text-amber-600 border-amber-200' };
  else badge = { label: 'Not evaluated', cls: 'bg-slate-50 text-slate-400 border-slate-200' };
  return { mustMet, mustMiss, mustTotal: musts.length, niceMet, niceTotal: nices.length, badge, ruledOut: mustMiss > 0 };
}

export default function NextRole() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [checks, setChecks] = useState({}); // `${jobId}:${criteriaId}` -> 1 | -1
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [newItem, setNewItem] = useState({ must: '', nice: '', dont: '' });

  const { schedule: scheduleOptimizing, state: optimizingState } = useAutoSave(
    (value) => api.nextRole.update({ optimizing_for: value }), 800
  );

  const textTimers = useRef({});
  useEffect(() => () => Object.values(textTimers.current).forEach(clearTimeout), []);

  useEffect(() => {
    Promise.all([api.nextRole.get(), api.jobs.list()])
      .then(([data, jobsData]) => {
        setOptimizing(data.optimizing_for || '');
        setCriteria(data.criteria || []);
        setChecks(Object.fromEntries((data.checks || []).map(c => [`${c.job_id}:${c.criteria_id}`, c.met])));
        setJobs(jobsData);
        if (jobsData[0]) setSelectedJobId(jobsData[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const byBucket = useMemo(() => {
    const map = { must: [], nice: [], dont: [] };
    criteria.forEach(c => { (map[c.bucket] || map.must).push(c); });
    return map;
  }, [criteria]);

  function changeOptimizing(value) {
    setOptimizing(value);
    scheduleOptimizing(value);
  }

  async function addCriteria(bucket) {
    const text = newItem[bucket].trim();
    if (!text) return;
    setNewItem(prev => ({ ...prev, [bucket]: '' }));
    const created = await api.nextRole.addCriteria({ bucket, text });
    setCriteria(prev => [...prev, created]);
  }

  function editCriteriaText(id, text) {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, text } : c));
    clearTimeout(textTimers.current[id]);
    textTimers.current[id] = setTimeout(() => {
      api.nextRole.updateCriteria(id, { text }).catch(() => {});
    }, 700);
  }

  async function moveCriteria(item, direction) {
    const idx = BUCKET_ORDER.indexOf(item.bucket);
    const nextBucket = BUCKET_ORDER[idx + direction];
    if (!nextBucket) return;
    setCriteria(prev => prev.map(c => c.id === item.id ? { ...c, bucket: nextBucket } : c));
    await api.nextRole.updateCriteria(item.id, { bucket: nextBucket });
  }

  async function removeCriteria(id) {
    setCriteria(prev => prev.filter(c => c.id !== id));
    setChecks(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.endsWith(`:${id}`))));
    await api.nextRole.deleteCriteria(id);
  }

  async function setCheck(jobId, criteriaId, met) {
    const key = `${jobId}:${criteriaId}`;
    const current = checks[key] || 0;
    const next = current === met ? 0 : met; // clicking again clears
    setChecks(prev => {
      const copy = { ...prev };
      if (next === 0) delete copy[key];
      else copy[key] = next;
      return copy;
    });
    await api.nextRole.setCheck(jobId, { criteria_id: criteriaId, met: next });
  }

  const rankedJobs = useMemo(() => {
    return jobs
      .map(job => ({ job, fit: fitFor(job, criteria, checks) }))
      .sort((a, b) => {
        if (a.fit.ruledOut !== b.fit.ruledOut) return a.fit.ruledOut ? 1 : -1;
        if (b.fit.mustMet !== a.fit.mustMet) return b.fit.mustMet - a.fit.mustMet;
        return b.fit.niceMet - a.fit.niceMet;
      });
  }, [jobs, criteria, checks]);

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;
  const checkable = useMemo(() => criteria.filter(c => c.bucket !== 'dont'), [criteria]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div>
            <h1 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <Compass className="h-4 w-4 text-indigo-500" />
              Next Role
            </h1>
            <p className="text-[11.5px] text-slate-400">Four lists to figure out what’s next — then score your tracked jobs against them</p>
          </div>
          <div className="flex items-center gap-3">
            <SaveBadge state={optimizingState} />
            <a
              href="https://larahogan.me/blog/four-steps-identifying-your-new-role/"
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11.5px] text-slate-400 hover:text-indigo-500 transition-colors"
            >
              Framework by Lara Hogan <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* Optimizing for — the #1 thing */}
        <section className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5">
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" />
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-indigo-500">I’m optimizing for…</p>
          </div>
          <input
            className="w-full rounded-lg border border-indigo-100 bg-white px-4 py-3 text-[15px] font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            value={optimizing}
            onChange={e => changeOptimizing(e.target.value)}
            placeholder="e.g. Scope that sets up a Director title within 2 years"
          />
          <p className="mt-2 text-[11.5px] leading-snug text-slate-500">
            At the end of the day, the #1 thing you’re optimizing for above <em>everything</em> else — the one thing you cannot budge on.
          </p>
        </section>

        {/* The three lists */}
        <section className="grid gap-4 lg:grid-cols-3">
          {BUCKETS.map((bucket, bi) => (
            <div key={bucket.key} className="flex flex-col rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${bucket.dot}`} />
                    <h2 className="text-[13.5px] font-semibold text-slate-800">{bucket.title}</h2>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${bucket.chip}`}>
                    {byBucket[bucket.key].length}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-snug text-slate-400">{bucket.hint}</p>
              </div>

              <div className="flex-1 space-y-1.5 p-3">
                {byBucket[bucket.key].length === 0 && (
                  <p className="px-1 py-2 text-center text-[12px] text-slate-300">Nothing here yet</p>
                )}
                {byBucket[bucket.key].map(item => (
                  <div key={item.id} className="group flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1.5 hover:border-slate-200">
                    <button
                      onClick={() => moveCriteria(item, -1)}
                      disabled={bi === 0}
                      title={bi > 0 ? `Move to ${BUCKETS[bi - 1].title}` : ''}
                      className="rounded p-0.5 text-slate-300 hover:text-indigo-500 disabled:invisible"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <input
                      className="min-w-0 flex-1 bg-transparent text-[12.5px] text-slate-700 focus:outline-none"
                      value={item.text}
                      onChange={e => editCriteriaText(item.id, e.target.value)}
                    />
                    <button
                      onClick={() => moveCriteria(item, 1)}
                      disabled={bi === BUCKETS.length - 1}
                      title={bi < BUCKETS.length - 1 ? `Move to ${BUCKETS[bi + 1].title}` : ''}
                      className="rounded p-0.5 text-slate-300 hover:text-indigo-500 disabled:invisible"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeCriteria(item.id)}
                      className="rounded p-0.5 text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 p-3">
                <div className="flex gap-1.5">
                  <input
                    className="input !py-1.5 text-[12.5px]"
                    value={newItem[bucket.key]}
                    onChange={e => setNewItem(prev => ({ ...prev, [bucket.key]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addCriteria(bucket.key)}
                    placeholder="Add an item…"
                  />
                  <button onClick={() => addCriteria(bucket.key)} className="btn-secondary !px-2.5 !py-1.5">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Job fit */}
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-500" />
              <h2 className="text-[13.5px] font-semibold text-slate-800">Job Fit</h2>
            </div>
            <p className="text-[11.5px] text-slate-400">Score tracked jobs against your must- and nice-to-haves</p>
          </div>

          {jobs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[13px] text-slate-400">No tracked jobs yet.</p>
              <button onClick={() => navigate('/jobs')} className="btn-secondary mt-3">
                <Briefcase className="h-4 w-4" /> Open Job Tracker
              </button>
            </div>
          ) : checkable.length === 0 ? (
            <p className="p-8 text-center text-[13px] text-slate-400">
              Add some must-haves or nice-to-haves above to start scoring jobs.
            </p>
          ) : (
            <div className="grid gap-5 p-5 lg:grid-cols-[300px_minmax(0,1fr)]">
              {/* Ranked jobs */}
              <div className="space-y-2">
                {rankedJobs.map(({ job, fit }) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedJobId === job.id ? 'border-indigo-200 bg-indigo-50/70' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-800">{job.title || 'Untitled role'}</p>
                        <p className="truncate text-[11.5px] text-slate-400">{job.company || 'Company not set'}</p>
                      </div>
                      <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${fit.badge.cls}`}>
                        {fit.badge.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Musts <span className="font-bold text-slate-700">{fit.mustMet}/{fit.mustTotal}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      Nices <span className="font-bold text-slate-700">{fit.niceMet}/{fit.niceTotal}</span>
                    </p>
                  </button>
                ))}
              </div>

              {/* Checklist for selected job */}
              {selectedJob && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="mb-3 text-[12.5px] font-semibold text-slate-700">
                    Does <span className="text-indigo-600">{selectedJob.title || 'this role'}</span>
                    {selectedJob.company ? ` at ${selectedJob.company}` : ''} give you…
                  </p>
                  <div className="space-y-1.5">
                    {checkable.map(item => {
                      const met = checks[`${selectedJob.id}:${item.id}`] || 0;
                      const isMust = item.bucket === 'must';
                      return (
                        <div key={item.id} className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-3 py-2">
                          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isMust ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                            title={isMust ? 'Must-have' : 'Nice-to-have'} />
                          <span className="min-w-0 flex-1 text-[12.5px] text-slate-700">{item.text}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCheck(selectedJob.id, item.id, 1)}
                              title="Yes"
                              className={`rounded-md border p-1 transition-colors ${met === 1 ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-300 hover:text-emerald-500'}`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setCheck(selectedJob.id, item.id, -1)}
                              title="No"
                              className={`rounded-md border p-1 transition-colors ${met === -1 ? 'border-red-300 bg-red-50 text-red-500' : 'border-slate-200 text-slate-300 hover:text-red-500'}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            {met !== 0 && (
                              <button
                                onClick={() => setCheck(selectedJob.id, item.id, met)}
                                title="Clear"
                                className="rounded-md border border-transparent p-1 text-slate-300 hover:text-slate-500"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[11px] leading-snug text-slate-400">
                    A single ✗ on a must-have rules a role out — that’s the point of the list. Unanswered items count as unknown, not failures.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
