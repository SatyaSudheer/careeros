import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, Search, Plus, Calendar, CheckCircle2, ArrowLeft, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../api.js';

export default function PrepDashboard() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('');

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
    if (!q) return plans;
    return plans.filter(p => 
      [p.title, p.company, p.focus_areas, p.job_title].some(v => String(v || '').toLowerCase().includes(q))
    );
  }, [filter, plans]);

  async function createGeneralPlan() {
    setCreating(true);
    try {
      const plan = await api.prepPlans.create({
        scope: 'general',
        title: 'General interview preparation',
        status: 'active'
      });
      navigate(`/prep-plans/${plan.id}`);
    } finally {
      setCreating(false);
    }
  }

  const activePlans = plans.filter(p => p.status === 'active').length;

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
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={createGeneralPlan} disabled={creating} className="btn-primary text-[13px] !py-1.5">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              New General Plan
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Total Plans</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics?.prepPlans || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Active Plans</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{activePlans}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Total Tasks</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics?.prepItemsTotal || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Tasks Done</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{metrics?.prepItemsDone || 0}</p>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-300" />
            <input
              className="input pl-9"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search plans by title, company, or focus..."
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 mb-5">
              <BookOpen className="h-7 w-7 text-indigo-400" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900">No preparation plans yet</h2>
            <p className="mb-7 max-w-sm text-sm text-slate-400">
              Create a general preparation plan, or navigate to Job Tracker to create a targeted plan for a specific role.
            </p>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPlans.map(plan => {
              const targeted = !!plan.job_id;
              const totalItems = plan.total_items || 0;
              const doneItems = plan.done_items || 0;
              const percent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
              
              return (
                <button
                  key={plan.id}
                  onClick={() => navigate(`/prep-plans/${plan.id}`)}
                  className="group relative flex h-48 flex-col rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${
                      targeted ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}>
                      {targeted ? 'Targeted' : 'General'}
                    </span>
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${plan.status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {plan.status || 'active'}
                    </span>
                  </div>
                  
                  <h3 className="mb-1 truncate text-[15px] font-bold text-slate-800">{plan.title || 'Untitled plan'}</h3>
                  <p className="line-clamp-2 min-h-[34px] text-[12.5px] text-slate-500">
                    {plan.focus_areas || plan.company || (targeted ? plan.job_title : 'General interview prep')}
                  </p>
                  
                  <div className="mt-auto pt-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                      <span className="text-slate-400">{doneItems} of {totalItems} tasks</span>
                      <span className={percent === 100 ? 'text-emerald-500' : 'text-indigo-500'}>{percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full transition-all ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
