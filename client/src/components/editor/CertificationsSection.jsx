import { useState, useCallback } from 'react';
import { Award, Plus, Trash2, ChevronDown } from 'lucide-react';
import { api } from '../../api.js';
import { useAutoSave } from '../../hooks/useAutoSave.js';
import SectionShell from './SectionShell.jsx';

const EMPTY = { name: '', issuer: '', issued_date: '', expiry_date: '', credential_id: '', cert_group: '' };

function CertCard({ resumeId, cert, onSaving, onSaved, onRefresh, onItemChange }) {
  const [form, setForm] = useState(cert);
  const [open, setOpen] = useState(!cert.name);

  const saveFn = useCallback(async (d) => {
    onSaving?.();
    await api.certifications.update(resumeId, cert.id, d);
    onSaved?.('saved');
  }, [resumeId, cert.id, onSaving, onSaved]);

  const { schedule } = useAutoSave(saveFn);

  const set = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    onItemChange?.(next);
    schedule(next);
  };

  const del = async () => {
    if (!confirm(`Remove "${form.name || 'this certification'}"?`)) return;
    await api.certifications.delete(resumeId, cert.id);
    onRefresh?.();
  };

  const subtitle = [form.cert_group, form.issuer, form.issued_date].filter(Boolean).join(' · ');

  return (
    <div className={`item-card transition-all ${open ? 'ring-1 ring-indigo-100' : ''}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50/80 transition-colors rounded-lg"
      >
        <div className="flex-1 min-w-0">
          {!form.name ? (
            <p className="text-[13px] text-slate-400 italic">New certification — click to fill in</p>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-slate-800 truncate">{form.name}</p>
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
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="field-label">Certification / Training Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="AWS Certified Solutions Architect" className="input" autoFocus={!cert.name} />
            </div>
            <div className="col-span-2">
              <label className="field-label">Issuing Organization</label>
              <input value={form.issuer} onChange={e => set('issuer', e.target.value)}
                placeholder="Amazon Web Services" className="input" />
            </div>
            <div>
              <label className="field-label">Date Issued</label>
              <input value={form.issued_date} onChange={e => set('issued_date', e.target.value)}
                placeholder="Jan 2023" className="input" />
            </div>
            <div>
              <label className="field-label">Expiry Date</label>
              <input value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)}
                placeholder="Jan 2026 (or No Expiry)" className="input" />
            </div>
            <div className="col-span-2">
              <label className="field-label">Group (optional)</label>
              <input value={form.cert_group || ''} onChange={e => set('cert_group', e.target.value)}
                placeholder="Cloud, Infrastructure & Platform, Agile…" className="input" />
            </div>
            <div className="col-span-2">
              <label className="field-label">Credential ID (optional)</label>
              <input value={form.credential_id} onChange={e => set('credential_id', e.target.value)}
                placeholder="ABC-123-XYZ" className="input" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CertificationsSection({ resumeId, items, onSaving, onSaved, onRefresh, onItemChange }) {
  const addNew = async () => {
    await api.certifications.create(resumeId, {});
    onRefresh?.();
  };

  return (
    <SectionShell title="Certifications & Training" icon={Award} badge={items.length}>
      <div className="space-y-2">
        {items.map(cert => (
          <CertCard key={cert.id} resumeId={resumeId} cert={cert}
            onSaving={onSaving} onSaved={onSaved} onRefresh={onRefresh} onItemChange={onItemChange} />
        ))}
        <button onClick={addNew} className="btn-add mt-1">
          <Plus className="h-3.5 w-3.5" />
          Add Certification
        </button>
      </div>
    </SectionShell>
  );
}
