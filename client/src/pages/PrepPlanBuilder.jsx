import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Target,
  Trash2,
} from 'lucide-react';
import { api } from '../api.js';

const EMPTY_PLAN = {
  title: '',
  scope: 'general',
  company: '',
  focus_areas: '',
  plan: '',
  target_date: '',
  status: 'active',
  items: [],
  job: null,
};

const CATEGORIES = [
  { value: 'core', label: 'Core' },
  { value: 'coding', label: 'Coding' },
  { value: 'system_design', label: 'System Design' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'domain', label: 'Domain' },
  { value: 'company', label: 'Company' },
  { value: 'behavioral', label: 'Behavioral' },
];

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'doing', label: 'Doing' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
];

function priorityClasses(priority) {
  if (priority === 'high') return 'border-red-100 bg-red-50 text-red-700';
  if (priority === 'low') return 'border-slate-200 bg-white text-slate-500';
  return 'border-amber-100 bg-amber-50 text-amber-700';
}

function statusClasses(status) {
  const map = {
    todo: 'border-slate-200 bg-white text-slate-500',
    doing: 'border-blue-100 bg-blue-50 text-blue-700',
    blocked: 'border-red-100 bg-red-50 text-red-700',
    done: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  };
  return map[status] || map.todo;
}

export default function PrepPlanBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.prepPlans.get(id)
      .then(data => setPlan({ ...EMPTY_PLAN, ...data, items: data.items || [] }))
      .finally(() => setLoading(false));
  }, [id]);

  const stats = useMemo(() => {
    const total = plan.items.length;
    const done = plan.items.filter(item => item.status === 'done').length;
    const blocked = plan.items.filter(item => item.status === 'blocked').length;
    const doing = plan.items.filter(item => item.status === 'doing').length;
    return { total, done, blocked, doing, percent: total ? Math.round((done / total) * 100) : 0 };
  }, [plan.items]);

  const visibleItems = useMemo(() => {
    if (filter === 'all') return plan.items;
    return plan.items.filter(item => item.status === filter || item.category === filter);
  }, [filter, plan.items]);

  async function refresh() {
    const updated = await api.prepPlans.get(id);
    setPlan({ ...EMPTY_PLAN, ...updated, items: updated.items || [] });
  }

  async function savePlan() {
    setSaving(true);
    try {
      const updated = await api.prepPlans.update(id, plan);
      setPlan(prev => ({ ...prev, ...updated, items: prev.items }));
    } finally {
      setSaving(false);
    }
  }

  async function addItem(category = 'core') {
    await api.prepPlans.items.create(id, {
      title: '',
      category,
      priority: 'medium',
      status: 'todo',
    });
    await refresh();
  }

  function updateItem(itemId, patch) {
    setPlan(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === itemId ? { ...item, ...patch } : item),
    }));
  }

  async function saveItem(item) {
    await api.prepPlans.items.update(id, item.id, item);
    await refresh();
  }

  async function deleteItem(itemId) {
    await api.prepPlans.items.delete(id, itemId);
    await refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => navigate('/jobs')} className="btn-ghost !p-2" title="Job Tracker">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold text-slate-900">{plan.title || 'Preparation Plan'}</h1>
              <p className="truncate text-[11.5px] text-slate-400">
                {plan.job ? `${plan.job.company || 'Company'} · ${plan.job.title || 'Role'}` : 'General interview preparation'}
              </p>
            </div>
          </div>
          <button onClick={savePlan} disabled={saving} className="btn-primary text-[13px] !py-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Plan
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-6 py-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                plan.job_id ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}>
                {plan.job_id ? 'Targeted Plan' : 'General Plan'}
              </span>
              <span className="text-[12px] font-semibold text-slate-400">{stats.percent}% done</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${stats.percent}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">Doing</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{stats.doing}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">Blocked</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{stats.blocked}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">Done</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{stats.done}</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="space-y-4">
              <label>
                <span className="field-label">Plan Title</span>
                <input className="input" value={plan.title} onChange={e => setPlan({ ...plan, title: e.target.value })} />
              </label>
              <label>
                <span className="field-label">Status</span>
                <select className="input" value={plan.status} onChange={e => setPlan({ ...plan, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="done">Done</option>
                </select>
              </label>
              <label>
                <span className="field-label">Target Date</span>
                <input type="date" className="input" value={plan.target_date || ''} onChange={e => setPlan({ ...plan, target_date: e.target.value })} />
              </label>
              <label>
                <span className="field-label">Focus Areas</span>
                <textarea className="input min-h-[110px] resize-y leading-6" value={plan.focus_areas} onChange={e => setPlan({ ...plan, focus_areas: e.target.value })} />
              </label>
              <label>
                <span className="field-label">Strategy Notes</span>
                <textarea className="input min-h-[140px] resize-y leading-6" value={plan.plan} onChange={e => setPlan({ ...plan, plan: e.target.value })} />
              </label>
              {plan.job?.job_url && (
                <a href={plan.job.job_url} target="_blank" rel="noreferrer" className="btn-secondary w-full justify-center">
                  <ExternalLink className="h-4 w-4" />
                  Open JD
                </a>
              )}
            </div>
          </section>
        </aside>

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-500">Preparation Builder</p>
              <h2 className="text-xl font-bold text-slate-900">Track And Chase Items</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className="input !w-auto !py-1.5 text-[12px]" value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="all">All items</option>
                {STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                {CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
              <button onClick={() => addItem('core')} className="btn-primary text-[13px] !py-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-5">
            {visibleItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
                <Target className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No preparation items yet</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {['coding', 'system_design', 'leadership'].map(category => (
                    <button key={category} onClick={() => addItem(category)} className="btn-secondary">
                      <Plus className="h-4 w-4" />
                      {CATEGORIES.find(item => item.value === category)?.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : visibleItems.map(item => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px_140px_130px]">
                  <label>
                    <span className="field-label">Item</span>
                    <input className="input" value={item.title} onChange={e => updateItem(item.id, { title: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Category</span>
                    <select className="input" value={item.category} onChange={e => updateItem(item.id, { category: e.target.value })}>
                      {CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Priority</span>
                    <select className={`input border ${priorityClasses(item.priority)}`} value={item.priority} onChange={e => updateItem(item.id, { priority: e.target.value })}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Status</span>
                    <select className={`input border ${statusClasses(item.status)}`} value={item.status} onChange={e => updateItem(item.id, { status: e.target.value })}>
                      {STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                  <label>
                    <span className="field-label">Due Date</span>
                    <input type="date" className="input" value={item.due_date || ''} onChange={e => updateItem(item.id, { due_date: e.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Resource URL</span>
                    <input className="input" value={item.resource_url} onChange={e => updateItem(item.id, { resource_url: e.target.value })} />
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="field-label">Notes / Chase Log</span>
                  <textarea className="input min-h-[96px] resize-y leading-6" value={item.notes} onChange={e => updateItem(item.id, { notes: e.target.value })} />
                </label>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <button onClick={() => updateItem(item.id, { status: item.status === 'done' ? 'todo' : 'done' })} className="btn-ghost !px-2 !py-1.5 !text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {item.status === 'done' ? 'Reopen' : 'Done'}
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => deleteItem(item.id)} className="btn-ghost !text-red-500 hover:!bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => saveItem(item)} className="btn-secondary">
                      <Save className="h-3.5 w-3.5" />
                      Save Item
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
