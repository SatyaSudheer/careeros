import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  Target,
  Trash2,
  X,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { api } from '../api.js';
import { useAutoSave } from '../hooks/useAutoSave.js';

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

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  ...STATUSES,
];

function priorityClasses(priority) {
  if (priority === 'high') return 'bg-red-50 text-red-700 border-red-100';
  if (priority === 'low') return 'bg-white text-slate-500 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

function statusClasses(status) {
  const map = {
    todo: 'bg-white text-slate-500 border-slate-200',
    doing: 'bg-blue-50 text-blue-700 border-blue-100',
    blocked: 'bg-red-50 text-red-700 border-red-100',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };
  return map[status] || map.todo;
}

function statusIcon(status) {
  if (status === 'done') return <CheckCircle2 className="h-3 w-3" />;
  if (status === 'doing') return <Loader2 className="h-3 w-3 animate-spin" />;
  if (status === 'blocked') return <AlertTriangle className="h-3 w-3" />;
  return <Clock className="h-3 w-3" />;
}

function dueDateBadge(dateStr) {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[10.5px] font-semibold text-red-600">
        <AlertTriangle className="h-2.5 w-2.5" />
        Overdue
      </span>
    );
  }
  if (diffDays <= 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-600">
        <Clock className="h-2.5 w-2.5" />
        {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays}d`}
      </span>
    );
  }
  return null;
}

export default function PrepPlanBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plan, setPlan] = useState(EMPTY_PLAN);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [viewMode, setViewMode] = useState(searchParams.get('mode') !== 'edit');
  const planRef = useRef(plan);

  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  const { schedule: schedulePlanSave, state: planSaveState } = useAutoSave(
    async (planData) => {
      await api.prepPlans.update(id, planData);
    },
    800
  );

  const itemTimers = useRef({});

  useEffect(() => {
    api.prepPlans.get(id)
      .then(data => setPlan({ ...EMPTY_PLAN, ...data, items: data.items || [] }))
      .finally(() => setLoading(false));

    return () => {
      Object.values(itemTimers.current).forEach(clearTimeout);
    };
  }, [id]);

  useEffect(() => {
    setViewMode(searchParams.get('mode') !== 'edit');
  }, [searchParams]);

  const stats = useMemo(() => {
    const total = plan.items.length;
    const done = plan.items.filter(item => item.status === 'done').length;
    const blocked = plan.items.filter(item => item.status === 'blocked').length;
    const doing = plan.items.filter(item => item.status === 'doing').length;
    const todo = plan.items.filter(item => item.status === 'todo').length;
    return { total, done, blocked, doing, todo, percent: total ? Math.round((done / total) * 100) : 0 };
  }, [plan.items]);

  const categoryBreakdown = useMemo(() => {
    const counts = {};
    plan.items.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return CATEGORIES.map(c => ({ ...c, count: counts[c.value] || 0 })).filter(c => c.count > 0);
  }, [plan.items]);

  const visibleItems = useMemo(() => {
    let items = plan.items;
    if (statusFilter !== 'all') {
      items = items.filter(item => item.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }
    return items;
  }, [statusFilter, categoryFilter, plan.items]);

  function onChangePlanField(field, value) {
    if (viewMode) return;
    setPlan(prev => {
      const updated = { ...prev, [field]: value };
      schedulePlanSave(updated);
      return updated;
    });
  }

  function onChangeItem(itemId, patch) {
    if (viewMode) return;
    setPlan(prev => {
      const newItems = prev.items.map(item =>
        item.id === itemId ? { ...item, ...patch } : item
      );
      const newItem = newItems.find(i => i.id === itemId);
      if (newItem) {
        clearTimeout(itemTimers.current[itemId]);
        itemTimers.current[itemId] = setTimeout(async () => {
          await api.prepPlans.items.update(id, itemId, newItem);
        }, 500);
      }
      return { ...prev, items: newItems };
    });
  }

  function toggleExpand(itemId) {
    if (viewMode) return;
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function addItem(category = 'core') {
    if (viewMode) return;
    await api.prepPlans.items.create(id, {
      title: '',
      category,
      priority: 'medium',
      status: 'todo',
    });
    const updated = await api.prepPlans.get(id);
    setPlan({ ...EMPTY_PLAN, ...updated, items: updated.items || [] });
    if (updated.items?.length) {
      const newItem = updated.items[updated.items.length - 1];
      setExpandedItems(prev => new Set([...prev, newItem.id]));
    }
  }

  async function deleteItem(itemId) {
    if (viewMode) return;
    await api.prepPlans.items.delete(id, itemId);
    setPlan(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  }

  async function deletePlan() {
    if (!confirm('Delete this preparation plan? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.prepPlans.delete(id);
      navigate('/prep');
    } finally {
      setDeleting(false);
    }
  }

  async function bulkComplete() {
    if (viewMode) return;
    const todoItems = plan.items.filter(i => i.status !== 'done');
    if (todoItems.length === 0) return;
    for (const item of todoItems) {
      await api.prepPlans.items.update(id, item.id, { ...item, status: 'done' });
    }
    const updated = await api.prepPlans.get(id);
    setPlan({ ...EMPTY_PLAN, ...updated, items: updated.items || [] });
  }

  async function bulkDeleteDone() {
    if (viewMode) return;
    const doneItems = plan.items.filter(i => i.status === 'done');
    if (doneItems.length === 0) return;
    if (!confirm(`Delete all ${doneItems.length} completed task${doneItems.length !== 1 ? 's' : ''}?`)) return;
    for (const item of doneItems) {
      await api.prepPlans.items.delete(id, item.id);
    }
    setPlan(prev => ({ ...prev, items: prev.items.filter(i => i.status !== 'done') }));
  }

  function toggleItemStatus(itemId) {
    if (viewMode) return;
    const item = plan.items.find(i => i.id === itemId);
    if (!item) return;
    const newStatus = item.status === 'done' ? 'todo' : 'done';
    onChangeItem(itemId, { status: newStatus });
  }

  const hasFilters = statusFilter !== 'all' || categoryFilter !== 'all';
  const isTargeted = !!plan.job_id;

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
            <button onClick={() => navigate('/prep')} className="btn-ghost !p-2" title="Back to Prep Plans">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold text-slate-900">{plan.title || 'Preparation Plan'}</h1>
              <p className="truncate text-[11.5px] text-slate-400">
                {plan.job ? `${plan.job.company || 'Company'} \u00b7 ${plan.job.title || 'Role'}` : 'General interview preparation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!viewMode && planSaveState === 'saving' && <span className="text-[11px] text-amber-600">Saving...</span>}
            {!viewMode && planSaveState === 'saved' && <span className="text-[11px] text-emerald-600">Saved</span>}
            {viewMode ? (
              <button onClick={() => setSearchParams({ mode: 'edit' })} className="btn-primary text-[13px] !py-1.5">
                <Edit3 className="h-3.5 w-3.5" />
                Edit Plan
              </button>
            ) : (
              <>
                <button onClick={() => setSearchParams({ mode: 'view' })} className="btn-secondary text-[13px] !py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Done Editing
                </button>
                <button onClick={deletePlan} disabled={deleting} className="btn-ghost !text-red-500 hover:!bg-red-50">
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-6 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                isTargeted ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}>
                {isTargeted ? 'Targeted Plan' : 'General Plan'}
              </span>
              <span className="text-[12px] font-semibold text-slate-400">{stats.percent}% done</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${stats.percent}%`,
                  background: stats.percent === 100
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                }}
              />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { label: 'To Do', value: stats.todo, color: 'text-slate-600' },
                { label: 'Doing', value: stats.doing, color: 'text-blue-600' },
                { label: 'Blocked', value: stats.blocked, color: 'text-red-600' },
                { label: 'Done', value: stats.done, color: 'text-emerald-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            {categoryBreakdown.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-400">Categories</p>
                <div className="space-y-1.5">
                  {categoryBreakdown.map(({ value, label, count }) => (
                    <div key={value} className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-semibold text-slate-400">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="space-y-4">
              <div>
                <span className="field-label">Plan Title</span>
                {viewMode ? (
                  <p className="py-2 text-[13.5px] font-semibold text-slate-800">{plan.title || 'Untitled plan'}</p>
                ) : (
                  <input
                    className="input"
                    value={plan.title}
                    onChange={e => onChangePlanField('title', e.target.value)}
                    placeholder="e.g. Senior Engineer Interview Prep"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="field-label">Status</span>
                  {viewMode ? (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold capitalize ${
                      plan.status === 'active' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' :
                      plan.status === 'paused' ? 'border-amber-100 bg-amber-50 text-amber-700' :
                      'border-slate-200 bg-slate-50 text-slate-600'
                    }`}>
                      {plan.status || 'active'}
                    </span>
                  ) : (
                    <select className="input" value={plan.status} onChange={e => onChangePlanField('status', e.target.value)}>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="done">Done</option>
                    </select>
                  )}
                </div>
                <div>
                  <span className="field-label">Target Date</span>
                  {viewMode ? (
                    <p className="py-2 text-[13.5px] text-slate-600">
                      {plan.target_date ? new Date(plan.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-slate-300">Not set</span>}
                    </p>
                  ) : (
                    <input type="date" className="input" value={plan.target_date || ''} onChange={e => onChangePlanField('target_date', e.target.value)} />
                  )}
                </div>
              </div>
              <div>
                <span className="field-label">Focus Areas</span>
                {viewMode ? (
                  <p className="py-2 text-[13.5px] leading-6 text-slate-600 whitespace-pre-wrap">
                    {plan.focus_areas || <span className="text-slate-300">No focus areas set</span>}
                  </p>
                ) : (
                  <textarea
                    className="input min-h-[90px] resize-y leading-6"
                    value={plan.focus_areas}
                    onChange={e => onChangePlanField('focus_areas', e.target.value)}
                    placeholder="e.g. React, system design, leadership stories..."
                  />
                )}
              </div>
              <div>
                <span className="field-label">Strategy Notes</span>
                {viewMode ? (
                  <p className="py-2 text-[13.5px] leading-6 text-slate-600 whitespace-pre-wrap">
                    {plan.plan || <span className="text-slate-300">No strategy notes</span>}
                  </p>
                ) : (
                  <textarea
                    className="input min-h-[110px] resize-y leading-6"
                    value={plan.plan}
                    onChange={e => onChangePlanField('plan', e.target.value)}
                    placeholder="Your preparation strategy and notes..."
                  />
                )}
              </div>
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
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">
                Tasks <span className="font-normal text-slate-400">({stats.total})</span>
              </h2>
              {hasFilters && (
                <button
                  onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-400 hover:border-slate-300 hover:text-slate-600"
                >
                  <X className="h-2.5 w-2.5" />
                  Clear filters
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {STATUS_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setStatusFilter(value)}
                    className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-all ${
                      statusFilter === value
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <select
                className="input !w-auto !py-1.5 text-[12px]"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">All categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {!viewMode && (
                <>
                  <div className="h-6 w-px bg-slate-200" />
                  <button onClick={() => addItem('core')} className="btn-primary text-[13px] !py-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Task
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-3 p-5">
            {visibleItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
                <Target className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  {hasFilters ? 'No tasks match the current filters' : 'No preparation tasks yet'}
                </p>
                <p className="mt-1 text-[12px] text-slate-400">
                  {hasFilters ? 'Try clearing the filters above.' : viewMode ? 'Click "Edit Plan" above to start adding tasks.' : 'Add tasks organized by category to start your prep.'}
                </p>
                {!hasFilters && !viewMode && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.value} onClick={() => addItem(cat.value)} className="btn-secondary text-[12px]">
                        <Plus className="h-3.5 w-3.5" />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {!viewMode && stats.total > 2 && (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-2">
                    <span className="text-[11.5px] text-slate-500">{stats.todo} to do, {stats.done} done</span>
                    <div className="flex items-center gap-2">
                      <button onClick={bulkComplete} disabled={stats.todo === 0} className="btn-ghost !px-2 !py-1 !text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        Complete all
                      </button>
                      <button onClick={bulkDeleteDone} disabled={stats.done === 0} className="btn-ghost !px-2 !py-1 !text-[11px] !text-red-400 hover:!text-red-600 hover:!bg-red-50">
                        <Trash2 className="h-3 w-3" />
                        Clear done
                      </button>
                    </div>
                  </div>
                )}
                {visibleItems.map(item => {
                  const expanded = viewMode ? false : expandedItems.has(item.id);
                  const category = CATEGORIES.find(c => c.value === item.category);
                  return (
                    <div key={item.id} className={`rounded-lg border transition-all ${expanded ? 'border-indigo-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'}`}>
                      <div className={`flex items-center gap-3 px-4 py-3 ${viewMode ? 'cursor-default' : 'cursor-pointer'}`} onClick={() => { if (!viewMode) toggleExpand(item.id); }}>
                        <button
                          onClick={e => { e.stopPropagation(); toggleItemStatus(item.id); }}
                          disabled={viewMode}
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                            item.status === 'done'
                              ? 'border-emerald-400 bg-emerald-500 text-white'
                              : `border-slate-300 bg-white ${viewMode ? '' : 'hover:border-indigo-300'}`
                          }`}
                          title={viewMode ? 'Open edit mode to update status' : item.status === 'done' ? 'Reopen task' : 'Mark done'}
                        >
                          {item.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`truncate text-[13.5px] font-semibold ${item.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {item.title || 'Untitled task'}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${priorityClasses(item.priority)}`}>
                              {item.priority === 'high' ? '!' : item.priority === 'low' ? '' : ''}
                              {item.priority}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                              {category?.label || item.category}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${statusClasses(item.status)}`}>
                              {statusIcon(item.status)}
                              {STATUSES.find(s => s.value === item.status)?.label}
                            </span>
                            {dueDateBadge(item.due_date)}
                            {item.resource_url && (
                              <a
                                href={item.resource_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-0.5 rounded-full border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-100"
                                title={item.resource_url}
                              >
                                <Link2 className="h-2.5 w-2.5" />
                                Resource
                              </a>
                            )}
                          </div>
                          {viewMode && (item.notes || item.resource_url || item.due_date) && (
                            <div className="mt-2 flex flex-col gap-1 text-[12px] leading-5 text-slate-500">
                              {item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
                              {item.due_date && <p>Due {new Date(item.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                              {item.resource_url && (
                                <a
                                  href={item.resource_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex w-fit items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Open resource
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        {!viewMode && (
                          <button
                            onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                            className="btn-ghost !p-1.5 !text-slate-300 hover:!text-red-500 hover:!bg-red-50"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!viewMode && (expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />)}
                      </div>

                      {expanded && (
                        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px_130px_130px]">
                            <label>
                              <span className="field-label">Title</span>
                              <input
                                className="input"
                                value={item.title}
                                onChange={e => onChangeItem(item.id, { title: e.target.value })}
                                placeholder="What do you need to prepare?"
                              />
                            </label>
                            <label>
                              <span className="field-label">Category</span>
                              <select className="input" value={item.category} onChange={e => onChangeItem(item.id, { category: e.target.value })}>
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                              </select>
                            </label>
                            <label>
                              <span className="field-label">Priority</span>
                              <select className={`input border ${priorityClasses(item.priority)}`} value={item.priority} onChange={e => onChangeItem(item.id, { priority: e.target.value })}>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </label>
                            <label>
                              <span className="field-label">Status</span>
                              <select className={`input border ${statusClasses(item.status)}`} value={item.status} onChange={e => onChangeItem(item.id, { status: e.target.value })}>
                                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </label>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                            <label>
                              <span className="field-label">Due Date</span>
                              <input type="date" className="input" value={item.due_date || ''} onChange={e => onChangeItem(item.id, { due_date: e.target.value })} />
                            </label>
                            <label>
                              <span className="field-label">Resource URL</span>
                              <input className="input" value={item.resource_url || ''} onChange={e => onChangeItem(item.id, { resource_url: e.target.value })} placeholder="https://..." />
                            </label>
                          </div>
                          <label className="mt-3 block">
                            <span className="field-label">Notes</span>
                            <textarea
                              className="input min-h-[80px] resize-y leading-6"
                              value={item.notes || ''}
                              onChange={e => onChangeItem(item.id, { notes: e.target.value })}
                              placeholder="Key points, follow-up questions, or chase notes..."
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
