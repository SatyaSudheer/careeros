import { useState, useCallback } from 'react';
import { GraduationCap, Plus, Trash2, ChevronDown } from 'lucide-react';
import { api } from '../../api.js';
import { useAutoSave } from '../../hooks/useAutoSave.js';
import SectionShell from './SectionShell.jsx';

function EduCard({ resumeId, edu, onSaving, onSaved, onRefresh }) {
  const [form, setForm] = useState(edu);
  const [open, setOpen] = useState(!edu.school);

  const saveFn = useCallback(async (d) => {
    onSaving?.();
    await api.education.update(resumeId, edu.id, d);
    onSaved?.('saved');
  }, [resumeId, edu.id, onSaving, onSaved]);

  const { schedule } = useAutoSave(saveFn);

  const set = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    schedule(next);
  };

  const del = async () => {
    if (!confirm(`Remove "${form.school || 'this education'}"?`)) return;
    await api.education.delete(resumeId, edu.id);
    onRefresh?.();
  };

  const isNew = !form.school;
  const subtitle = [form.degree, form.field].filter(Boolean).join(', ');

  return (
    <div className={`item-card transition-all ${open ? 'ring-1 ring-indigo-100' : ''}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50/80 transition-colors rounded-lg"
      >
        <div className="flex-1 min-w-0">
          {isNew ? (
            <p className="text-[13px] text-slate-400 italic">New education — click to fill in</p>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-slate-800 truncate">{form.school}</p>
              {subtitle && <p className="text-[11.5px] text-slate-400 truncate">{subtitle}</p>}
            </>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); del(); }}
          className="flex-shrink-0 p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 pb-4 pt-3 space-y-2.5 animate-slide-down">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className="field-label">School / University</label>
              <input value={form.school} onChange={e => set('school', e.target.value)}
                placeholder="MIT" className="input" autoFocus={isNew} />
            </div>
            <div>
              <label className="field-label">Degree</label>
              <input value={form.degree} onChange={e => set('degree', e.target.value)}
                placeholder="B.S." className="input" />
            </div>
            <div>
              <label className="field-label">Field of Study</label>
              <input value={form.field} onChange={e => set('field', e.target.value)}
                placeholder="Computer Science" className="input" />
            </div>
            <div>
              <label className="field-label">Start Date</label>
              <input value={form.start_date} onChange={e => set('start_date', e.target.value)}
                placeholder="Sep 2018" className="input" />
            </div>
            <div>
              <label className="field-label">End Date</label>
              <input value={form.end_date} onChange={e => set('end_date', e.target.value)}
                placeholder="May 2022" className="input" />
            </div>
            <div>
              <label className="field-label">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="Cambridge, MA" className="input" />
            </div>
            <div>
              <label className="field-label">GPA (optional)</label>
              <input value={form.gpa} onChange={e => set('gpa', e.target.value)}
                placeholder="3.8 / 4.0" className="input" />
            </div>
            <div className="col-span-2">
              <label className="field-label">Honors / Coursework (optional)</label>
              <textarea
                value={form.details}
                onChange={e => set('details', e.target.value)}
                placeholder="Dean's List, relevant coursework…"
                rows={2}
                className="input resize-none text-[13px] leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EducationSection({ resumeId, items, onSaving, onSaved, onRefresh }) {
  const addNew = async () => {
    await api.education.create(resumeId, {});
    onRefresh?.();
  };

  return (
    <SectionShell title="Education" icon={GraduationCap} badge={items.length}>
      <div className="space-y-2">
        {items.map(edu => (
          <EduCard key={edu.id} resumeId={resumeId} edu={edu} onSaving={onSaving} onSaved={onSaved} onRefresh={onRefresh} />
        ))}
        <button onClick={addNew} className="btn-add mt-1">
          <Plus className="h-3.5 w-3.5" />
          Add Education
        </button>
      </div>
    </SectionShell>
  );
}
