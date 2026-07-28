import { useState, useEffect, useCallback } from 'react';
import { User } from 'lucide-react';
import { api } from '../../api.js';
import { useAutoSave } from '../../hooks/useAutoSave.js';
import SectionShell from './SectionShell.jsx';
import MarkdownTextarea from './MarkdownTextarea.jsx';

const EMPTY = { full_name: '', tagline: '', subtitle: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', summary: '' };

function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

export default function PersonalSection({ resumeId, data, onSaving, onSaved, onChange }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data });
  }, [data]);

  const saveFn = useCallback(async (d) => {
    onSaving?.();
    await api.personal.update(resumeId, d);
    onSaved?.('saved');
  }, [resumeId, onSaving, onSaved]);

  const { schedule } = useAutoSave(saveFn);

  const set = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    onChange?.(next);
    schedule(next);
  };

  return (
    <SectionShell title="Personal Info" icon={User} defaultOpen>
      <div className="space-y-3">
        <Field label="Full Name">
          <input
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
            placeholder="Jane Doe"
            className="input"
            autoComplete="name"
          />
        </Field>

        <Field label="Tagline / Headline">
          <input
            value={form.tagline}
            onChange={e => set('tagline', e.target.value)}
            placeholder="Staff Engineer · 8 yrs · Open to remote"
            maxLength={100}
            className="input"
          />
        </Field>

        <Field label="Subtitle">
          <input
            value={form.subtitle}
            onChange={e => set('subtitle', e.target.value)}
            placeholder="Available for remote · Top Secret clearance · Open to relocation"
            className="input"
          />
          <p className="mt-1 text-[11px] text-slate-300">
            Optional second line under your tagline.
          </p>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jane@example.com"
              className="input"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="(555) 000-0000"
              className="input"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Location">
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="San Francisco, CA"
              className="input"
            />
          </Field>
          <Field label="Website">
            <input
              value={form.website}
              onChange={e => set('website', e.target.value)}
              placeholder="janedoe.com"
              className="input"
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="LinkedIn">
            <input
              value={form.linkedin}
              onChange={e => set('linkedin', e.target.value)}
              placeholder="linkedin.com/in/jane"
              className="input"
            />
          </Field>
          <Field label="GitHub">
            <input
              value={form.github}
              onChange={e => set('github', e.target.value)}
              placeholder="github.com/jane"
              className="input"
            />
          </Field>
        </div>

        <Field label="Professional Summary">
          <MarkdownTextarea
            value={form.summary}
            onChange={value => set('summary', value)}
            placeholder="Results-driven engineer with X years of experience in… Tailor this to the job description for best ATS results."
            rows={8}
            className="leading-relaxed"
          />
          <p className="mt-1 text-[11px] text-slate-300">
            Tip: 2–4 sentences. Include your title, years of experience, and 1–2 key strengths.
          </p>
        </Field>
      </div>
    </SectionShell>
  );
}
