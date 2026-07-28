import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library,
  Search,
  CheckCircle2,
  Circle,
  RotateCcw,
  Loader2,
  StickyNote,
  BookOpen,
  X,
  Flame,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { api } from '../api.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'todo', label: 'To practice' },
  { key: 'done', label: 'Practiced' },
];

const UNGROUPED = 'Other questions';

function timeAgo(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function levelBadge(level) {
  if (/7/.test(level)) return 'bg-violet-50 text-violet-600 border-violet-200';
  if (/6/.test(level)) return 'bg-indigo-50 text-indigo-600 border-indigo-200';
  if (/4/.test(level)) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  return 'bg-slate-50 text-slate-500 border-slate-200';
}

function ProgressRing({ pct }) {
  const r = 19, c = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="flex-shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle
        cx="24" cy="24" r={r} fill="none"
        stroke={pct === 100 ? '#10b981' : '#6366f1'} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        transform="rotate(-90 24 24)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}>
        {pct}%
      </text>
    </svg>
  );
}

// ── Add / edit a custom question ──────────────────────────────────────────────

function QuestionFormModal({ categories, initial, defaultCategory, onClose, onSaved }) {
  const editing = Boolean(initial);
  const [form, setForm] = useState({
    question: initial?.question || '',
    category: initial?.category || defaultCategory || 'General',
    archetype: initial?.archetype || '',
    level: initial?.level || '',
    companies: initial?.companies || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function save() {
    if (!form.question.trim()) return;
    setSaving(true);
    try {
      const saved = editing
        ? await api.questions.updateCustom(initial.source_id, form)
        : await api.questions.create(form);
      onSaved(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-500" />
            <h2 className="text-[14px] font-semibold text-slate-900">{editing ? 'Edit question' : 'Add question'}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 px-5 py-4">
          <label className="block">
            <span className="field-label">Question</span>
            <textarea
              className="input min-h-[70px] resize-y leading-relaxed"
              value={form.question}
              onChange={e => set('question', e.target.value)}
              placeholder="e.g. Tell me about a time you disagreed with your manager"
              autoFocus
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Category</span>
              <input
                className="input"
                list="qb-categories"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                placeholder="General"
              />
              <datalist id="qb-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </label>
            <label className="block">
              <span className="field-label">Level</span>
              <input className="input" value={form.level} onChange={e => set('level', e.target.value)} placeholder="L5–L6" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="field-label">Group <span className="font-normal normal-case text-slate-300">(optional)</span></span>
              <input className="input" value={form.archetype} onChange={e => set('archetype', e.target.value)} placeholder="Archetype or theme" />
            </label>
            <label className="block">
              <span className="field-label">Companies</span>
              <input className="input" value={form.companies} onChange={e => set('companies', e.target.value)} placeholder="Meta, Google…" />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button onClick={onClose} className="btn-ghost !text-xs">Cancel</button>
          <button onClick={save} disabled={saving || !form.question.trim()} className="btn-primary !py-1.5 !px-4 !text-xs min-w-[90px] justify-center disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Save' : 'Add question'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Prep plan generator ───────────────────────────────────────────────────────

// Map a bank category onto the prep-plan item categories the Prep Tracker uses
function prepItemCategory(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('behav') || n.includes('leadership')) return 'behavioral';
  if (n.includes('coding') || n.includes('algorithm')) return 'coding';
  if (n.includes('domain')) return 'domain';
  if (n.includes('design') || n.includes('pattern')) return 'system_design';
  return 'core';
}

const groupKey = (q) => `${q.category}::${q.archetype || UNGROUPED}`;

function PrepPlanModal({ questions, jobs, category, defaultGroup, onClose }) {
  const navigate = useNavigate();
  // Categories start at the active tab but any combination can be selected,
  // so one plan can span System Design + ML + Behavioural in a single drill.
  const [selectedCats, setSelectedCats] = useState(
    () => new Set(category ? [category] : questions.map(q => q.category)),
  );
  const [selectedGroups, setSelectedGroups] = useState(
    () => new Set(category && defaultGroup ? [`${category}::${defaultGroup}`] : []),
  );
  const [onlyUnpracticed, setOnlyUnpracticed] = useState(true);
  const [jobId, setJobId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [creating, setCreating] = useState(false);

  const categories = useMemo(() => {
    const counts = new Map();
    for (const q of questions) counts.set(q.category, (counts.get(q.category) || 0) + 1);
    return [...counts.entries()].map(([name, total]) => ({ name, total }));
  }, [questions]);

  function toggleCategory(name) {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        // Drop any group refinements belonging to the removed category
        setSelectedGroups(g => new Set([...g].filter(k => !k.startsWith(`${name}::`))));
      } else {
        next.add(name);
      }
      return next;
    });
  }

  const toggleGroup = (key) => setSelectedGroups(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  // Groups available for refinement, only within the selected categories
  const groupsByCategory = useMemo(() => {
    const out = [];
    const index = new Map();
    for (const q of questions) {
      if (!selectedCats.has(q.category)) continue;
      if (!index.has(q.category)) {
        const entry = { category: q.category, groups: [], seen: new Map() };
        index.set(q.category, entry);
        out.push(entry);
      }
      const entry = index.get(q.category);
      const name = q.archetype || UNGROUPED;
      if (!entry.seen.has(name)) {
        entry.seen.set(name, { name, key: groupKey(q), count: 0 });
        entry.groups.push(entry.seen.get(name));
      }
      entry.seen.get(name).count += 1;
    }
    return out;
  }, [questions, selectedCats]);

  const included = useMemo(() => questions.filter(q => {
    if (!selectedCats.has(q.category)) return false;
    // Group refinements apply per-category: a category with no groups picked
    // contributes all of its questions.
    const catHasRefinement = [...selectedGroups].some(k => k.startsWith(`${q.category}::`));
    if (catHasRefinement && !selectedGroups.has(groupKey(q))) return false;
    if (onlyUnpracticed && q.practiced) return false;
    return true;
  }), [questions, selectedCats, selectedGroups, onlyUnpracticed]);

  const job = jobs.find(j => String(j.id) === String(jobId)) || null;
  const catList = [...selectedCats];

  async function create() {
    if (included.length === 0) return;
    setCreating(true);
    try {
      const focus = selectedGroups.size
        ? [...selectedGroups].map(k => k.split('::')[1]).join(', ')
        : (catList.join(', ') || 'All categories');
      const subject = catList.length === 1 ? catList[0] : `${catList.length}-track`;
      const plan = await api.prepPlans.create({
        job_id: job ? job.id : null,
        scope: job ? 'company' : 'general',
        title: job ? `${job.company || 'Interview'} — ${subject} drill` : `${subject} drill`,
        company: job ? (job.company || '') : '',
        focus_areas: focus,
        plan: 'Generated from the CareerOS Question Bank. Drill the pattern, not the question — one canonical walkthrough per group, then variants cold against a timer.',
        target_date: targetDate,
        status: 'active',
      });
      for (const q of included) {
        await api.prepPlans.items.create(plan.id, {
          title: q.number ? `#${q.number} — ${q.question}` : q.question,
          category: prepItemCategory(q.category),
          priority: /6|7/.test(q.level || '') ? 'high' : 'medium',
          status: 'todo',
          notes: [q.category, q.archetype, q.level, q.companies].filter(Boolean).join(' · '),
        });
      }
      navigate(`/prep-plans/${plan.id}?mode=edit`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            <h2 className="text-[14px] font-semibold text-slate-900">Create prep plan</h2>
          </div>
          <button onClick={onClose} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <p className="field-label mb-1.5">Categories <span className="font-normal normal-case text-slate-300">— mix as many as you like</span></p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(c => (
                <button
                  key={c.name}
                  onClick={() => toggleCategory(c.name)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    selectedCats.has(c.name)
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {c.name} <span className="opacity-60">{c.total}</span>
                </button>
              ))}
            </div>
          </div>

          {groupsByCategory.length > 0 && (
            <div>
              <p className="field-label mb-1.5">Narrow by group <span className="font-normal normal-case text-slate-300">(optional)</span></p>
              <div className="max-h-44 space-y-2.5 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                {groupsByCategory.map(entry => (
                  <div key={entry.category}>
                    {groupsByCategory.length > 1 && (
                      <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{entry.category}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {entry.groups.map(g => (
                        <button
                          key={g.key}
                          onClick={() => toggleGroup(g.key)}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                            selectedGroups.has(g.key)
                              ? 'border-indigo-300 bg-white text-indigo-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {g.name} <span className="opacity-50">{g.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2.5">
            <input type="checkbox" checked={onlyUnpracticed} onChange={e => setOnlyUnpracticed(e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-600" />
            <span className="text-[13px] text-slate-600">Only questions I haven’t practiced yet</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="field-label">Target interview</span>
              <select className="input" value={jobId} onChange={e => setJobId(e.target.value)}>
                <option value="">General practice</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{[j.company, j.title].filter(Boolean).join(' · ') || `Job #${j.id}`}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Target date</span>
              <input type="date" className="input" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
            </label>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="mb-3 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-[12px] text-indigo-700">
            {included.length === 0 ? (
              <span className="text-slate-500">Pick at least one category to build a plan.</span>
            ) : (
              <>
                <span className="font-bold">{included.length}</span> question{included.length === 1 ? '' : 's'} from{' '}
                <span className="font-semibold">{catList.length}</span> categor{catList.length === 1 ? 'y' : 'ies'} will be added as trackable prep items
                {job && <> for <span className="font-semibold">{job.company || job.title}</span></>}.
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-ghost !text-xs">Cancel</button>
            <button onClick={create} disabled={creating || included.length === 0}
              className="btn-primary !py-1.5 !px-4 !text-xs min-w-[110px] justify-center disabled:opacity-50">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><BookOpen className="h-3.5 w-3.5" />Create plan</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [categoryList, setCategoryList] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(null); // null = all
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState(null);
  const [notesOpen, setNotesOpen] = useState(new Set());
  const [planModal, setPlanModal] = useState(false);
  const [formModal, setFormModal] = useState(null); // { editing } | true
  const [resetting, setResetting] = useState(false);

  const notesTimers = useRef({});
  useEffect(() => () => Object.values(notesTimers.current).forEach(clearTimeout), []);

  useEffect(() => {
    Promise.all([api.questions.list(), api.jobs.list()])
      .then(([qs, js]) => {
        setQuestions(qs.questions || []);
        setCategoryList(qs.categories || []);
        setJobs(js);
        const cats = [...new Set((qs.questions || []).map(q => q.category))];
        if (cats.length) setCategory(cats[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Categories present in the data, ordered by the server's suggested list first
  const categories = useMemo(() => {
    const counts = new Map();
    for (const q of questions) counts.set(q.category, (counts.get(q.category) || 0) + 1);
    const present = [...counts.keys()];
    const ordered = [
      ...categoryList.filter(c => counts.has(c)),
      ...present.filter(c => !categoryList.includes(c)).sort(),
    ];
    return ordered.map(name => ({
      name,
      total: counts.get(name),
      done: questions.filter(q => q.category === name && q.practiced).length,
    }));
  }, [questions, categoryList]);

  const inCategory = useMemo(
    () => questions.filter(q => !category || q.category === category),
    [questions, category],
  );

  const practiced = inCategory.filter(q => q.practiced).length;
  const pct = inCategory.length ? Math.round((practiced / inCategory.length) * 100) : 0;
  const thisWeek = inCategory.filter(q =>
    q.practiced && q.practiced_at && (Date.now() - new Date(q.practiced_at).getTime()) < 7 * 86400000
  ).length;

  // Groups (archetypes) within the active category
  const groups = useMemo(() => {
    const order = [];
    const map = new Map();
    for (const q of inCategory) {
      const name = q.archetype || UNGROUPED;
      if (!map.has(name)) {
        map.set(name, { name, probe: q.probe || '', items: [] });
        order.push(name);
      }
      const g = map.get(name);
      if (!g.probe && q.probe) g.probe = q.probe;
      g.items.push(q);
    }
    return order.map(n => map.get(n));
  }, [inCategory]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups
      .filter(g => !groupFilter || g.name === groupFilter)
      .map(g => ({
        ...g,
        filtered: g.items.filter(item => {
          if (filter === 'todo' && item.practiced) return false;
          if (filter === 'done' && !item.practiced) return false;
          if (needle && ![item.question, item.companies, item.level, item.notes, item.category]
            .some(v => String(v || '').toLowerCase().includes(needle))) return false;
          return true;
        }),
      }))
      .filter(g => g.filtered.length > 0);
  }, [groups, groupFilter, filter, query]);

  function upsertQuestion(saved) {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.key === saved.key);
      if (idx === -1) return [...prev, saved];
      const copy = [...prev];
      copy[idx] = saved;
      return copy;
    });
    setCategory(saved.category);
  }

  async function toggle(item) {
    const next = item.practiced ? 0 : 1;
    setQuestions(prev => prev.map(q => q.key === item.key
      ? { ...q, practiced: next, practiced_at: next ? new Date().toISOString() : null }
      : q));
    try {
      await api.questions.update(item.key, { practiced: next });
    } catch {
      setQuestions(prev => prev.map(q => q.key === item.key ? item : q));
    }
  }

  function editNotes(key, notes) {
    setQuestions(prev => prev.map(q => q.key === key ? { ...q, notes } : q));
    clearTimeout(notesTimers.current[key]);
    notesTimers.current[key] = setTimeout(() => {
      api.questions.update(key, { notes }).catch(() => {});
    }, 700);
  }

  function toggleNotes(key) {
    setNotesOpen(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function deleteCustom(item) {
    if (!confirm(`Delete “${item.question}”? This removes the question and its notes.`)) return;
    setQuestions(prev => prev.filter(q => q.key !== item.key));
    await api.questions.deleteCustom(item.source_id);
  }

  async function resetScope(scope, label) {
    if (!confirm(`Reset practice progress for ${label}? Notes are kept.`)) return;
    setResetting(true);
    try {
      await api.questions.reset(scope);
      const affects = (q) =>
        (!scope.category || q.category === scope.category)
        && (!scope.archetype || (q.archetype || UNGROUPED) === scope.archetype);
      setQuestions(prev => prev.map(q => affects(q) ? { ...q, practiced: 0, practiced_at: null } : q));
    } finally {
      setResetting(false);
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-3">
            <ProgressRing pct={pct} />
            <div>
              <h1 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                <Library className="h-4 w-4 text-indigo-500" />
                Question Bank
              </h1>
              <p className="text-[11.5px] text-slate-400">
                <span className="font-semibold text-slate-600">{practiced}/{inCategory.length}</span> practiced
                {category && <span className="text-slate-300"> · {category}</span>}
                {thisWeek > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-amber-500">
                    <Flame className="h-3 w-3" /> {thisWeek} this week
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => resetScope(category ? { category } : {}, category || 'all questions')}
              disabled={resetting || practiced === 0}
              className="btn-ghost !text-xs !text-slate-500 hover:!bg-red-50 hover:!text-red-500 disabled:opacity-40"
              title={category ? `Reset ${category}` : 'Reset all practice progress'}
            >
              {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Reset
            </button>
            <button onClick={() => setFormModal(true)} className="btn-secondary !py-1.5 !text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add question
            </button>
            <button onClick={() => setPlanModal(true)} className="btn-primary !py-1.5 !text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Prep plan
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            <button
              onClick={() => { setCategory(null); setGroupFilter(null); }}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                category === null ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              All <span className="ml-1 text-[11px] opacity-60">{questions.length}</span>
            </button>
            {categories.map(c => (
              <button
                key={c.name}
                onClick={() => { setCategory(c.name); setGroupFilter(null); }}
                className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  category === c.name ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {c.name}
                <span className="ml-1 text-[11px] opacity-60">{c.done}/{c.total}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-6 py-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-300" />
            <input
              className="input pl-9"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search questions, companies, levels, notes…"
            />
          </div>
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  filter === f.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Group cards — only meaningful when the category has several groups */}
        {groups.length > 1 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {groups.map(g => {
              const done = g.items.filter(i => i.practiced).length;
              const active = groupFilter === g.name;
              return (
                <button
                  key={g.name}
                  onClick={() => setGroupFilter(active ? null : g.name)}
                  title={g.probe}
                  className={`rounded-lg border px-3 py-2 text-left transition-all ${
                    active
                      ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                      : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
                  }`}
                >
                  <p className={`truncate text-[11px] font-semibold ${active ? 'text-indigo-700' : 'text-slate-600'}`}>{g.name}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full transition-all ${done === g.items.length ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                        style={{ width: `${(done / g.items.length) * 100}%` }} />
                    </div>
                    <span className="text-[10.5px] font-semibold text-slate-400">{done}/{g.items.length}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {groupFilter && (
          <button onClick={() => setGroupFilter(null)} className="flex items-center gap-1.5 text-[12px] text-indigo-500 hover:text-indigo-700">
            <X className="h-3.5 w-3.5" /> Showing {groupFilter} only — clear filter
          </button>
        )}

        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white py-14 text-center">
            <p className="text-[13px] text-slate-400">
              {inCategory.length === 0 ? 'No questions in this category yet.' : 'No questions match.'}
            </p>
            <button onClick={() => setFormModal(true)} className="btn-secondary mt-3">
              <Plus className="h-4 w-4" /> Add a question
            </button>
          </div>
        )}

        {visible.map(g => {
          const done = g.items.filter(i => i.practiced).length;
          return (
            <section key={g.name} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
                <div className="min-w-0">
                  <h2 className="text-[13.5px] font-semibold text-slate-800">
                    {g.name}
                    <span className="ml-2 text-[11.5px] font-medium text-slate-400">{done}/{g.items.length}</span>
                  </h2>
                  {g.probe && <p className="mt-0.5 text-[11.5px] italic text-slate-400">{g.probe}</p>}
                </div>
                {done > 0 && (
                  <button
                    onClick={() => resetScope({ archetype: g.name === UNGROUPED ? '' : g.name, category }, `“${g.name}”`)}
                    className="flex-shrink-0 rounded-md p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                    title={`Reset ${g.name}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-50">
                {g.filtered.map(item => {
                  const open = notesOpen.has(item.key);
                  const hasNotes = Boolean((item.notes || '').trim());
                  const custom = item.source === 'custom';
                  return (
                    <div key={item.key} className="group px-5 py-2.5 transition-colors hover:bg-slate-50/70">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggle(item)} title={item.practiced ? 'Mark unpracticed' : 'Mark practiced'} className="flex-shrink-0">
                          {item.practiced
                            ? <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
                            : <Circle className="h-[18px] w-[18px] text-slate-200 transition-colors group-hover:text-slate-300" />}
                        </button>
                        <span className="w-8 flex-shrink-0 text-[11px] font-bold text-slate-300">
                          {item.number ? `#${item.number}` : '—'}
                        </span>
                        <button
                          onClick={() => toggle(item)}
                          className={`min-w-0 flex-1 text-left text-[13px] ${item.practiced ? 'text-slate-400' : 'text-slate-700'}`}
                        >
                          {item.question}
                        </button>
                        {item.companies && (
                          <span className="hidden flex-shrink-0 truncate text-[11px] text-slate-300 lg:inline lg:max-w-[180px]" title={item.companies}>
                            {item.companies}
                          </span>
                        )}
                        {item.level && (
                          <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${levelBadge(item.level)}`}>
                            {item.level}
                          </span>
                        )}
                        {item.practiced === 1 && item.practiced_at && (
                          <span className="hidden w-14 flex-shrink-0 text-right text-[10.5px] text-emerald-500 sm:inline">{timeAgo(item.practiced_at)}</span>
                        )}
                        <div className="flex flex-shrink-0 items-center gap-0.5">
                          <button
                            onClick={() => toggleNotes(item.key)}
                            title={hasNotes ? 'Edit notes' : 'Add notes'}
                            className={`rounded-md p-1 transition-all ${
                              hasNotes ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-200 opacity-0 hover:text-slate-400 group-hover:opacity-100'
                            } ${open ? 'bg-amber-50 !text-amber-500 opacity-100' : ''}`}
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                          </button>
                          {custom && (
                            <>
                              <button onClick={() => setFormModal({ editing: item })} title="Edit question"
                                className="rounded-md p-1 text-slate-200 opacity-0 transition-all hover:text-indigo-500 group-hover:opacity-100">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => deleteCustom(item)} title="Delete question"
                                className="rounded-md p-1 text-slate-200 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {open && (
                        <div className="ml-[74px] mt-2 pb-1">
                          <textarea
                            value={item.notes || ''}
                            onChange={e => editNotes(item.key, e.target.value)}
                            rows={2}
                            autoFocus
                            placeholder="Approach, gotchas, what to revisit… saves automatically"
                            className="w-full resize-y rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-[12.5px] leading-relaxed text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-300"
                          />
                        </div>
                      )}
                      {!open && hasNotes && (
                        <button onClick={() => toggleNotes(item.key)} className="ml-[74px] mt-1 block max-w-full truncate text-left text-[11.5px] italic text-amber-600/80 hover:text-amber-700">
                          {item.notes}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {planModal && (
        <PrepPlanModal
          questions={questions}
          jobs={jobs}
          category={category}
          defaultGroup={groupFilter}
          onClose={() => setPlanModal(false)}
        />
      )}

      {formModal && (
        <QuestionFormModal
          categories={[...new Set([...categoryList, ...categories.map(c => c.name)])]}
          initial={formModal.editing}
          defaultCategory={category}
          onClose={() => setFormModal(null)}
          onSaved={upsertQuestion}
        />
      )}
    </div>
  );
}
