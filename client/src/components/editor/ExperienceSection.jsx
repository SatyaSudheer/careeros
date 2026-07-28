import { useState, useCallback, useRef } from 'react';
import { Briefcase, Plus, Trash2, ChevronDown, X } from 'lucide-react';
import { api } from '../../api.js';
import { useAutoSave } from '../../hooks/useAutoSave.js';
import SectionShell from './SectionShell.jsx';
import MarkdownTextarea from './MarkdownTextarea.jsx';

// ── Smart bullet editor ──────────────────────────────────────────────────────

function BulletEditor({ bullets, onChange }) {
  const refs = useRef([]);
  const items = bullets.length ? bullets : [''];

  const update = (i, val) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };

  const handleKeyDown = (e, i) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const next = [...items.slice(0, i + 1), '', ...items.slice(i + 1)];
      onChange(next);
      setTimeout(() => refs.current[i + 1]?.focus(), 20);
    } else if (e.key === 'Backspace' && !items[i] && items.length > 1) {
      e.preventDefault();
      onChange(items.filter((_, j) => j !== i));
      setTimeout(() => refs.current[Math.max(0, i - 1)]?.focus(), 20);
    }
  };

  const remove = (i) => {
    const next = items.filter((_, j) => j !== i);
    onChange(next.length ? next : ['']);
  };

  const addBullet = () => {
    const next = [...items, ''];
    onChange(next);
    setTimeout(() => refs.current[next.length - 1]?.focus(), 20);
  };

  return (
    <div className="space-y-1.5">
      {items.map((b, i) => (
        <div key={i} className="group/bullet flex items-start gap-2">
          <span className="mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300 group-focus-within/bullet:bg-indigo-400 transition-colors" />
          <MarkdownTextarea
            ref={el => { refs.current[i] = el; }}
            value={b}
            onChange={value => update(i, value)}
            onKeyDown={e => handleKeyDown(e, i)}
            placeholder={i === 0 ? 'Led a team of 5 engineers to ship…' : 'Another achievement or responsibility…'}
            rows={2}
            wrapperClassName="flex-1"
            className="resize-none text-[13px] !py-1.5"
            compact
            helper="Enter adds another bullet."
          />
          {items.length > 1 && (
            <button
              onClick={() => remove(i)}
              tabIndex={-1}
              className="mt-1 flex-shrink-0 p-1 text-slate-300 hover:text-red-400 opacity-0 group-hover/bullet:opacity-100 transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addBullet}
        className="ml-3.5 mt-0.5 flex items-center gap-1 text-[12px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
      >
        <Plus className="h-3 w-3" /> Add bullet  <kbd className="ml-1 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-400">↵ Enter</kbd>
      </button>
    </div>
  );
}

// ── Single experience card ───────────────────────────────────────────────────

function ExpCard({ resumeId, exp, onSaving, onSaved, onRefresh, onItemChange }) {
  const [form, setForm] = useState(exp);
  const [open, setOpen] = useState(!exp.company);

  const saveFn = useCallback(async (d) => {
    onSaving?.();
    await api.experiences.update(resumeId, exp.id, d);
    onSaved?.('saved');
  }, [resumeId, exp.id, onSaving, onSaved]);

  const { schedule } = useAutoSave(saveFn);

  const set = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    onItemChange?.(next);
    schedule(next);
  };

  const del = async () => {
    if (!confirm(`Remove "${form.company || 'this experience'}"?`)) return;
    await api.experiences.delete(resumeId, exp.id);
    onRefresh?.();
  };

  const isNew = !form.company && !form.title;

  return (
    <div className={`item-card transition-all ${open ? 'ring-1 ring-indigo-100' : ''}`}>
      {/* Card header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50/80 transition-colors rounded-lg"
      >
        <div className="flex-1 min-w-0">
          {isNew ? (
            <p className="text-[13px] text-slate-400 italic">New experience — click to fill in</p>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-slate-800 truncate">{form.company}</p>
              <p className="text-[11.5px] text-slate-400 truncate">
                {[form.title, [form.start_date, form.current_job ? 'Present' : form.end_date].filter(Boolean).join('–')].filter(Boolean).join(' · ')}
              </p>
            </>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); del(); }}
          className="flex-shrink-0 p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded transition-all"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Card body */}
      {open && (
        <div className="border-t border-slate-100 px-3 pb-4 pt-3 space-y-3 animate-slide-down">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="field-label">Company</label>
              <input value={form.company} onChange={e => set('company', e.target.value)}
                placeholder="Acme Corp" className="input" autoFocus={isNew} />
            </div>
            <div>
              <label className="field-label">Job Title</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="Senior Engineer" className="input" />
            </div>
            <div>
              <label className="field-label">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="Remote" className="input" />
            </div>
            <div>
              <label className="field-label">Start Date</label>
              <input value={form.start_date} onChange={e => set('start_date', e.target.value)}
                placeholder="Jan 2022" className="input" />
            </div>
            <div>
              <label className="field-label">End Date</label>
              <input
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                placeholder="Present"
                disabled={form.current_job}
                className="input"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={!!form.current_job}
              onChange={e => set('current_job', e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-indigo-600"
            />
            <span className="text-[12.5px] text-slate-600">Currently working here</span>
          </label>

          <div>
            <label className="field-label">Context Note <span className="text-slate-300 font-normal">(optional — shown before bullets)</span></label>
            <MarkdownTextarea
              value={form.note || ''}
              onChange={value => set('note', value)}
              placeholder="e.g. Brought in to own X; moved on after Y."
              rows={3}
              className="resize-none text-[13px] leading-relaxed"
              compact
            />
          </div>

          <div>
            <label className="field-label mb-2">Achievements & Responsibilities</label>
            <BulletEditor
              bullets={form.bullets || []}
              onChange={v => set('bullets', v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────────────────────

export default function ExperienceSection({ resumeId, items, onSaving, onSaved, onRefresh, onItemChange }) {
  const [adding, setAdding] = useState(false);

  const addNew = async () => {
    setAdding(true);
    try {
      await api.experiences.create(resumeId, { bullets: [''] });
      onRefresh?.();
    } finally {
      setAdding(false);
    }
  };

  return (
    <SectionShell title="Work Experience" icon={Briefcase} badge={items.length}>
      <div className="space-y-2">
        {items.map(exp => (
          <ExpCard
            key={exp.id}
            resumeId={resumeId}
            exp={exp}
            onSaving={onSaving}
            onSaved={onSaved}
            onRefresh={onRefresh}
            onItemChange={onItemChange}
          />
        ))}
        <button onClick={addNew} disabled={adding} className="btn-add mt-1">
          <Plus className="h-3.5 w-3.5" />
          {adding ? 'Adding…' : 'Add Experience'}
        </button>
      </div>
    </SectionShell>
  );
}
