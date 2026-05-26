import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, Search, Plus, ArrowLeft, Loader2, Briefcase, Trash2, Clock, AlertTriangle, CheckCircle2, Play, X, Calendar, ArrowRight } from 'lucide-react';
import { api } from '../api.js';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'done', label: 'Done' },
];

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'general', label: 'General' },
  { value: 'targeted', label: 'Targeted' },
];

function planOverdue(plan) {
  if (!plan.target_date || plan.status === 'done') return false;
  return new Date(plan.target_date) < new Date().setHours(0, 0, 0, 0);
}

function planDueSoon(plan) {
  if (!plan.target_date || plan.status === 'done') return false;
  const due = new Date(plan.target_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 3 && diffDays >= 0;
}

export default function PrepDashboard() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      api.prepPlans.list(),
      api.metrics.get(),
    ]).then(([plansData, metricsData]) => {
      setPlans(plansData);
      setMetrics(metricsData);
    }).finally(() => setLoading(false));
  }, []);

  const filteredPlans = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let result = plans;

    if (q) {
      result = result.filter(p =>
        [p.title, p.company, p.focus_areas, p.job_title].some(v => String(v || '').toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    if (scopeFilter !== 'all') {
      result = result.filter(p => scopeFilter === 'targeted' ? !!p.job_id : !p.job_id);
    }

    return result;
  }, [filter, statusFilter, scopeFilter, plans]);

  async function createGeneralPlan() {
    setCreating(true);
    try {
      const plan = await api.prepPlans.create({
        scope: 'general',
        title: 'General interview preparation',
        status: 'active',
      });
      navigate(`/prep-plans/${plan.id}?mode=edit`);
    } finally {
      setCreating(false);
    }
  }

  async function deletePlan(e, planId) {
    e.stopPropagation();
    if (!confirm('Delete this preparation plan? This cannot be undone.')) return;
    setDeletingId(planId);
    try {
      await api.prepPlans.delete(planId);
      setPlans(prev => prev.filter(p => p.id !== planId));
    } finally {
      setDeletingId(null);
    }
  }

  const countsByStatus = useMemo(() => {
    const counts = { active: 0, paused: 0, done: 0 };
    plans.forEach(p => {
      if (counts[p.status] !== undefined) counts[p.status]++;
    });
    return counts;
  }, [plans]);

  const hasFilters = filter || statusFilter !== 'all' || scopeFilter !== 'all';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="btn-ghost !p-2" title="Dashboard">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-slate-900">Preparation Tracker</h1>
                <p className="text-[11.5px] text-slate-400">Plan, review, and close interview prep</p>
              </div>
            </div>
            {plans.length > 0 && (
              <span className="hidden sm:inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                {plans.length} plan{plans.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/jobs')} className="btn-secondary text-[13px] !py-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              Job Tracker
            </button>
            <button onClick={createGeneralPlan} disabled={creating} className="btn-primary text-[13px] !py-1.5">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              New General Plan
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Total Plans', value: metrics?.prepPlans || 0, icon: BookOpen, color: 'text-slate-900' },
            { label: 'Active', value: countsByStatus.active, icon: Play, color: 'text-indigo-600' },
            { label: 'Total Tasks', value: metrics?.prepItemsTotal || 0, icon: Target, color: 'text-slate-900' },
            { label: 'Completed', value: metrics?.prepItemsDone || 0, icon: CheckCircle2, color: 'text-emerald-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
                <Icon className={`h-4 w-4 ${color.replace('text-', 'text-')} opacity-50`} />
              </div>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-300" />
            <input
              className="input pl-9"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search plans..."
            />
          </div>
          <select
            className="input !w-auto !py-1.5 text-[12px]"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="input !w-auto !py-1.5 text-[12px]"
            value={scopeFilter}
            onChange={e => setScopeFilter(e.target.value)}
          >
            {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setFilter(''); setStatusFilter('all'); setScopeFilter('all'); }}
              className="btn-ghost !px-2 !py-1 !text-[11px]"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-44 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 mb-5">
              <BookOpen className="h-7 w-7 text-indigo-400" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900">
              {hasFilters ? 'No plans match your filters' : 'No preparation plans yet'}
            </h2>
            <p className="mb-7 max-w-sm text-sm text-slate-400">
              {hasFilters
                ? 'Try adjusting or clearing the filters above.'
                : 'Create a general preparation plan, or navigate to Job Tracker to create a targeted plan for a specific role.'
              }
            </p>
            {!hasFilters && (
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/jobs')} className="btn-secondary px-6 py-2.5">
                  <Target className="h-4 w-4" />
                  Targeted Plan
                </button>
                <button onClick={createGeneralPlan} disabled={creating} className="btn-primary px-6 py-2.5">
                  <BookOpen className="h-4 w-4" />
                  General Plan
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlans.map(plan => {
              const targeted = !!plan.job_id;
              const totalItems = plan.total_items || 0;
              const doneItems = plan.done_items || 0;
              const percent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
              const overdue = planOverdue(plan);
              const dueSoon = planDueSoon(plan);
              const deleting = deletingId === plan.id;

              return (
                <div
                  key={plan.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/prep-plans/${plan.id}?mode=view`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/prep-plans/${plan.id}?mode=view`);
                  }}
                  className="group grid w-full gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-md md:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.75fr)_160px]"
                >
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                        targeted ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}>
                        {targeted ? 'Targeted' : 'General'}
                      </span>
                      {(overdue || dueSoon) && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                          overdue ? 'border-red-100 bg-red-50 text-red-600' : 'border-amber-100 bg-amber-50 text-amber-600'
                        }`}>
                          {overdue ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                          {overdue ? 'Overdue' : 'Due soon'}
                        </span>
                      )}
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                        plan.status === 'active' ? 'text-emerald-500' : plan.status === 'paused' ? 'text-amber-500' : 'text-slate-400'
                      }`}>
                        {plan.status || 'active'}
                      </span>
                    </div>

                    <h3 className="truncate text-[15px] font-bold text-slate-900">{plan.title || 'Untitled plan'}</h3>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-slate-500">
                      {plan.focus_areas || plan.company || (targeted ? plan.job_title : 'General interview prep')}
                    </p>
                    {(plan.job_company || plan.job_title) && (
                      <p className="mt-2 truncate text-[11.5px] font-medium text-slate-400">
                        {[plan.job_company, plan.job_title].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {plan.target_date && (
                      <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        overdue ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-50'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(plan.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>

                  <div className="self-center">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-400">{doneItems} of {totalItems} tasks</span>
                      <span className={percent === 100 ? 'text-emerald-500' : 'text-indigo-500'}>{percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full transition-all duration-500 ${
                          percent === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 self-center md:justify-end">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600">
                      View plan
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <button
                      onClick={(e) => deletePlan(e, plan.id)}
                      disabled={deleting}
                      className="btn-ghost !p-1.5 !text-slate-300 opacity-100 hover:!bg-red-50 hover:!text-red-500 md:opacity-0 md:group-hover:opacity-100"
                      title="Delete plan"
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
