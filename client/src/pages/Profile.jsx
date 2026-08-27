import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, Loader2, CloudOff, UserCircle, Plus, Pencil, Trash2,
  Mail, Phone, MapPin, Globe, Linkedin, Github, X, ExternalLink,
  Briefcase, GraduationCap, Layers, FolderOpen, Award,
} from 'lucide-react';
import { api } from '../api.js';
import { useAutoSave } from '../hooks/useAutoSave.js';
import MarkdownTextarea from '../components/editor/MarkdownTextarea.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function dateRange(start, end, current) {
  const parts = [start, current ? 'Present' : end].filter(Boolean);
  return parts.join(' – ');
}

function InlineMarkdown({ text }) {
  if (!text) return null;
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|`([^`]+)`/g;
  const parts = [];
  let last = 0, key = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] != null) parts.push(<strong key={key++}>{m[1]}</strong>);
    else if (m[2] != null) parts.push(<em key={key++}>{m[2]}</em>);
    else if (m[3] != null) parts.push(<del key={key++}>{m[3]}</del>);
    else if (m[4] != null) parts.push(<code key={key++} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.92em]">{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function getProfileProgress(profile) {
  const p = profile?.personal || {};
  const skills = profile?.skills || [];
  const checks = [
    !!p.full_name,
    !!p.email,
    !!p.phone,
    !!p.location,
    !!p.tagline,
    !!(p.summary && p.summary.trim().length >= 40),
    (profile?.experiences || []).length > 0,
    (profile?.education || []).length > 0,
    skills.some(s => (s.items || []).length > 0),
    (profile?.projects || []).length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
}

// ── Small shared components ───────────────────────────────────────────────────

function SaveBtn({ saving, onClick }) {
  return (
    <button onClick={onClick} disabled={saving} className="btn-primary !py-1.5 !px-4 !text-xs min-w-[72px] justify-center">
      {saving ? <><Loader2 className="h-3 w-3 animate-spin" />Saving</> : <><Check className="h-3 w-3" />Save</>}
    </button>
  );
}

function SaveStatus({ state }) {
  if (state === 'saving') return <span className="save-badge save-badge-saving animate-fade-in"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>;
  if (state === 'saved')  return <span className="save-badge save-badge-saved animate-fade-in"><Check className="h-3 w-3" /> Saved</span>;
  if (state === 'error')  return <span className="save-badge save-badge-error animate-fade-in"><CloudOff className="h-3 w-3" /> Error</span>;
  return null;
}

function SectionHeader({ icon: Icon, title, count, onAdd, adding }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <h2 className="truncate text-[15px] font-semibold text-slate-900">{title}</h2>
        {count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-500">{count}</span>
        )}
      </div>
      <button onClick={onAdd} disabled={adding} className="btn-secondary !py-1.5 !px-2.5 !text-xs !text-slate-600">
        {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {adding ? 'Adding' : 'Add'}
      </button>
    </div>
  );
}

function SectionPanel({ children, className = '' }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function ProfileMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-[18px] font-semibold leading-none text-slate-900">{value}</p>
    </div>
  );
}

function ProfileWorkspaceHeader({ profile, progress, totalSkills, onCreateResume, creating }) {
  const p = profile.personal || {};
  const counts = [
    { label: 'Roles', value: profile.experiences?.length || 0 },
    { label: 'Skills', value: totalSkills },
    { label: 'Projects', value: profile.projects?.length || 0 },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-indigo-500" />
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Profile workspace</p>
          </div>
          <h1 className="truncate text-xl font-semibold text-slate-900">{p.full_name || 'Master Profile'}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Maintain the reusable source profile here, then generate tailored resumes from a stronger baseline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[150px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold text-slate-500">Core profile</span>
              <span className="text-[11px] font-bold text-indigo-600">{progress.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
          {counts.map(item => (
            <div key={item.label} className="min-w-[76px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
              <p className="text-base font-semibold leading-none text-slate-800">{item.value}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-400">{item.label}</p>
            </div>
          ))}
          <button
            onClick={onCreateResume}
            disabled={creating}
            className="btn-primary !h-[54px] justify-center !px-4 !text-xs"
          >
            {creating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Creating</> : <><Plus className="h-3.5 w-3.5" />New Resume</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePreviewCard({ profile, totalSkills }) {
  const p = profile.personal || {};
  const exps = profile.experiences || [];
  const skills = profile.skills || [];

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-20 max-h-[calc(100vh-96px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Profile snapshot</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-900 text-[16px] font-semibold text-white">
            {initials(p.full_name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-slate-900">{p.full_name || 'Profile'}</p>
            <p className="truncate text-[12px] text-slate-400">{p.tagline || p.email || 'Master record'}</p>
          </div>
        </div>

        {p.summary && (
          <p className="mt-4 border-t border-slate-100 pt-4 text-[12.5px] leading-relaxed text-slate-600">
            <InlineMarkdown text={p.summary} />
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
            <p className="text-sm font-semibold text-slate-800">{exps.length}</p>
            <p className="text-[10.5px] text-slate-400">Roles</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
            <p className="text-sm font-semibold text-slate-800">{totalSkills}</p>
            <p className="text-[10.5px] text-slate-400">Skills</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2 text-center">
            <p className="text-sm font-semibold text-slate-800">{profile.certifications?.length || 0}</p>
            <p className="text-[10.5px] text-slate-400">Certs</p>
          </div>
        </div>

        {exps.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Recent experience</p>
            <div className="space-y-3">
              {exps.slice(0, 3).map(exp => (
                <div key={exp.id} className="border-l-2 border-indigo-200 pl-3">
                  <p className="truncate text-[12.5px] font-semibold text-slate-800">{exp.company}</p>
                  <p className="truncate text-[11.5px] text-slate-500">{exp.title}</p>
                  <p className="mt-0.5 text-[10.5px] text-slate-400">{dateRange(exp.start_date, exp.end_date, exp.current_job)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {skills.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Top skills</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.flatMap(s => s.items || []).slice(0, 16).map((item, i) => (
                <span key={`${item}-${i}`} className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{item}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Bullet editor (used in experience forms) ──────────────────────────────────

function BulletEditor({ bullets, onChange }) {
  const refs = useRef([]);
  const items = bullets?.length ? bullets : [''];

  const update = (i, val) => { const n = [...items]; n[i] = val; onChange(n); };
  const handleKey = (e, i) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const n = [...items.slice(0, i + 1), '', ...items.slice(i + 1)];
      onChange(n);
      setTimeout(() => refs.current[i + 1]?.focus(), 20);
    } else if (e.key === 'Backspace' && !items[i] && items.length > 1) {
      e.preventDefault();
      onChange(items.filter((_, j) => j !== i));
      setTimeout(() => refs.current[Math.max(0, i - 1)]?.focus(), 20);
    }
  };

  return (
    <div className="space-y-1.5">
      {items.map((b, i) => (
        <div key={i} className="group/b flex items-start gap-2">
          <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-slate-300 flex-shrink-0" />
          <MarkdownTextarea
            ref={el => { refs.current[i] = el; }}
            value={b}
            onChange={value => update(i, value)}
            onKeyDown={e => handleKey(e, i)}
            placeholder={i === 0 ? 'Led a team of 5 to ship…' : 'Another achievement…'}
            rows={2}
            wrapperClassName="flex-1"
            className="resize-none !py-1.5 text-[12.5px]"
            compact
            helper="Enter adds another bullet."
          />
          {items.length > 1 && (
            <button tabIndex={-1} onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="mt-1 flex-shrink-0 p-1 text-slate-300 hover:text-red-400 opacity-0 group-hover/b:opacity-100 transition-all">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => { onChange([...items, '']); setTimeout(() => refs.current[items.length]?.focus(), 20); }}
        className="ml-3.5 flex items-center gap-1 text-[12px] text-indigo-500 hover:text-indigo-700">
        <Plus className="h-3 w-3" /> Add bullet
      </button>
    </div>
  );
}

// ── Personal / Profile hero card ──────────────────────────────────────────────

function PersonalCard({ data, onSaving, onSaved, onChange }) {
  const EMPTY = { full_name: '', tagline: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', summary: '' };
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);

  useEffect(() => { if (data) setForm({ ...EMPTY, ...data }); }, [data]);

  const saveFn = useCallback(async (d) => { onSaving?.(); await api.profile.updatePersonal(d); onSaved?.(); }, [onSaving, onSaved]);
  const { schedule } = useAutoSave(saveFn);

  const set = (k, v) => {
    const n = { ...form, [k]: v };
    setForm(n);
    onChange?.(n);
    if (editing) schedule(n);
  };

  const chips = [
    { Icon: Mail,     val: form.email },
    { Icon: Phone,    val: form.phone },
    { Icon: MapPin,   val: form.location },
    { Icon: Globe,    val: form.website?.replace(/^https?:\/\/(www\.)?/, '') },
    { Icon: Linkedin, val: form.linkedin && 'LinkedIn' },
    { Icon: Github,   val: form.github && 'GitHub' },
  ].filter(c => c.val);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
            <span className="select-none text-[22px] font-semibold tracking-tight text-white">{initials(form.full_name)}</span>
          </div>

          <div className="flex-1 min-w-0">
            {form.full_name
              ? <h1 className="text-[24px] font-semibold leading-tight text-slate-950">{form.full_name}</h1>
              : <h1 className="text-[20px] font-normal italic text-slate-300">Your name</h1>
            }
            {form.tagline && <p className="mt-1 text-[14px] text-slate-500">{form.tagline}</p>}

            {chips.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {chips.map(({ Icon, val }) => (
                  <span key={val} className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[12px] text-slate-600">
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{val}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setEditing(e => !e)}
            className={`btn-secondary !px-3 !py-1.5 !text-xs flex-shrink-0 ${editing ? '!text-red-500' : ''}`}
            title={editing ? 'Close' : 'Edit'}
          >
            {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editing ? 'Close' : 'Edit'}
          </button>
        </div>

        {form.summary && !editing && (
          <p className="mt-5 border-t border-slate-100 pt-5 text-[13.5px] leading-relaxed text-slate-600">
            <InlineMarkdown text={form.summary} />
          </p>
        )}
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className="animate-slide-down space-y-3.5 border-t border-slate-100 bg-slate-50 px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="field-label">Full Name</label><input value={form.full_name} onChange={e => set('full_name', e.target.value)} className="input" autoFocus /></div>
            <div><label className="field-label">Tagline / Headline</label><input value={form.tagline} onChange={e => set('tagline', e.target.value)} className="input" maxLength={100} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="field-label">Email</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input" /></div>
            <div><label className="field-label">Phone</label><input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="input" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="field-label">Location</label><input value={form.location} onChange={e => set('location', e.target.value)} className="input" /></div>
            <div><label className="field-label">Website</label><input value={form.website} onChange={e => set('website', e.target.value)} className="input" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="field-label">LinkedIn</label><input value={form.linkedin} onChange={e => set('linkedin', e.target.value)} className="input" /></div>
            <div><label className="field-label">GitHub</label><input value={form.github} onChange={e => set('github', e.target.value)} className="input" /></div>
          </div>
          <div>
            <label className="field-label">Professional Summary</label>
            <MarkdownTextarea
              value={form.summary}
              onChange={value => set('summary', value)}
              rows={8}
              className="leading-relaxed"
              placeholder="Summarize your role, years of experience, domains, and strongest career themes."
            />
          </div>
          <div className="flex justify-end">
            <button onClick={() => setEditing(false)} className="btn-ghost !text-xs !text-slate-500">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Experience ────────────────────────────────────────────────────────────────

function ExpForm({ initial, onSave, onCancel, label = 'Save' }) {
  const EMPTY = { company: '', title: '', location: '', start_date: '', end_date: '', current_job: false, note: '', bullets: [''] };
  const [form, setForm] = useState({ ...EMPTY, ...initial, bullets: initial?.bullets?.length ? initial.bullets : [''] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-3.5" style={{ boxShadow: '0 2px 10px rgba(99,102,241,0.09)' }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="field-label">Company</label><input value={form.company} onChange={e => set('company', e.target.value)} className="input" autoFocus /></div>
        <div><label className="field-label">Job Title</label><input value={form.title} onChange={e => set('title', e.target.value)} className="input" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="field-label">Location</label><input value={form.location} onChange={e => set('location', e.target.value)} className="input" /></div>
        <div><label className="field-label">Start Date</label><input value={form.start_date} onChange={e => set('start_date', e.target.value)} className="input" placeholder="Jan 2022" /></div>
        <div>
          <label className="field-label">End Date</label>
          {form.current_job
            ? <div className="input bg-slate-50 text-slate-400 text-[12px]">Present</div>
            : <input value={form.end_date} onChange={e => set('end_date', e.target.value)} className="input" placeholder="Dec 2023" />
          }
          <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
            <input type="checkbox" checked={!!form.current_job} onChange={e => set('current_job', e.target.checked)} className="rounded accent-indigo-600" />
            <span className="text-[11px] text-slate-500">Current role</span>
          </label>
        </div>
      </div>
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
        <label className="field-label mb-2">Highlights</label>
        <BulletEditor bullets={form.bullets} onChange={v => set('bullets', v)} />
      </div>
      <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
        <button onClick={onCancel} className="btn-ghost !text-xs">Cancel</button>
        <SaveBtn saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

function ExpItem({ exp, onRefresh, onSaving, onSaved }) {
  const [editing, setEditing] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Remove "${exp.company || 'this experience'}"?`)) return;
    await api.profile.experiences.delete(exp.id);
    onRefresh?.();
  };

  const handleSave = async (form) => {
    onSaving?.();
    await api.profile.experiences.update(exp.id, form);
    onSaved?.();
    setEditing(false);
    onRefresh?.();
  };

  if (editing) return <ExpForm initial={exp} onSave={handleSave} onCancel={() => setEditing(false)} />;

  return (
    <div className="group flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="w-1 flex-shrink-0 self-stretch rounded-full bg-indigo-400 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-[14px] truncate">{exp.company}</p>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              {exp.title}{exp.location ? ` · ${exp.location}` : ''}
            </p>
          </div>
          <span className="flex-shrink-0 whitespace-nowrap pt-0.5 text-[11.5px] text-slate-400">
            {dateRange(exp.start_date, exp.end_date, exp.current_job)}
          </span>
        </div>
        {exp.bullets?.filter(Boolean).length > 0 && (
          <ul className="mt-2.5 space-y-1">
            {exp.bullets.filter(Boolean).slice(0, 3).map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600 leading-relaxed">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                <span><InlineMarkdown text={b} /></span>
              </li>
            ))}
            {exp.bullets.filter(Boolean).length > 3 && (
              <li className="text-[11.5px] text-slate-400 ml-3">+{exp.bullets.filter(Boolean).length - 3} more…</li>
            )}
          </ul>
        )}
      </div>
      <div className="flex flex-shrink-0 items-start gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={handleDelete} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// ── Education ─────────────────────────────────────────────────────────────────

function EduForm({ initial, onSave, onCancel }) {
  const EMPTY = { school: '', degree: '', field: '', location: '', start_date: '', end_date: '', gpa: '', details: '' };
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => { setSaving(true); try { await onSave(form); } finally { setSaving(false); } };

  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-3.5" style={{ boxShadow: '0 2px 10px rgba(99,102,241,0.09)' }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="field-label">School / University</label><input value={form.school} onChange={e => set('school', e.target.value)} className="input" autoFocus /></div>
        <div><label className="field-label">Location</label><input value={form.location} onChange={e => set('location', e.target.value)} className="input" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="field-label">Degree</label><input value={form.degree} onChange={e => set('degree', e.target.value)} className="input" placeholder="B.S." /></div>
        <div><label className="field-label">Field of Study</label><input value={form.field} onChange={e => set('field', e.target.value)} className="input" /></div>
        <div><label className="field-label">GPA</label><input value={form.gpa} onChange={e => set('gpa', e.target.value)} className="input" placeholder="3.8" /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="field-label">Start</label><input value={form.start_date} onChange={e => set('start_date', e.target.value)} className="input" /></div>
        <div><label className="field-label">End</label><input value={form.end_date} onChange={e => set('end_date', e.target.value)} className="input" /></div>
      </div>
      <div>
        <label className="field-label">Additional Details</label>
        <MarkdownTextarea
          value={form.details}
          onChange={value => set('details', value)}
          rows={3}
          className="resize-none text-[13px] leading-relaxed"
          compact
        />
      </div>
      <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
        <button onClick={onCancel} className="btn-ghost !text-xs">Cancel</button>
        <SaveBtn saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

function EduItem({ edu, onRefresh, onSaving, onSaved }) {
  const [editing, setEditing] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Remove "${edu.school}"?`)) return;
    await api.profile.education.delete(edu.id);
    onRefresh?.();
  };

  const handleSave = async (form) => {
    onSaving?.(); await api.profile.education.update(edu.id, form); onSaved?.();
    setEditing(false); onRefresh?.();
  };

  if (editing) return <EduForm initial={edu} onSave={handleSave} onCancel={() => setEditing(false)} />;

  return (
    <div className="group flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="w-1 flex-shrink-0 self-stretch rounded-full bg-emerald-400 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-slate-800 text-[14px]">{edu.school}</p>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              {[edu.degree, edu.field].filter(Boolean).join(', ')}
              {edu.gpa ? <span className="text-slate-400"> · GPA {edu.gpa}</span> : null}
            </p>
            {edu.details && <p className="text-[12px] text-slate-400 mt-0.5 italic"><InlineMarkdown text={edu.details} /></p>}
          </div>
          <span className="text-[11.5px] text-slate-400 whitespace-nowrap flex-shrink-0 pt-0.5">{dateRange(edu.start_date, edu.end_date)}</span>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-start gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={handleDelete} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// ── Skills ────────────────────────────────────────────────────────────────────

function SkillForm({ initial, onSave, onCancel }) {
  const [category, setCategory] = useState(initial?.category || '');
  const [raw, setRaw] = useState((initial?.items || []).join(', '));
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try { await onSave({ category, items: raw.split(',').map(s => s.trim()).filter(Boolean) }); }
    finally { setSaving(false); }
  };
  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3" style={{ boxShadow: '0 2px 10px rgba(99,102,241,0.09)' }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="field-label">Category</label><input value={category} onChange={e => setCategory(e.target.value)} className="input" placeholder="Languages" autoFocus /></div>
        <div className="sm:col-span-2"><label className="field-label">Skills (comma-separated)</label><input value={raw} onChange={e => setRaw(e.target.value)} className="input" placeholder="Python, JavaScript, Go" /></div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
        <button onClick={onCancel} className="btn-ghost !text-xs">Cancel</button>
        <SaveBtn saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

function SkillItem({ skill, onRefresh, onSaving, onSaved }) {
  const [editing, setEditing] = useState(false);
  const handleDelete = async () => { await api.profile.skills.delete(skill.id); onRefresh?.(); };
  const handleSave = async (form) => {
    onSaving?.(); await api.profile.skills.update(skill.id, form); onSaved?.();
    setEditing(false); onRefresh?.();
  };

  if (editing) return <SkillForm initial={skill} onSave={handleSave} onCancel={() => setEditing(false)} />;

  return (
    <div className="group flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-3">
      {skill.category && (
        <span className="text-[12.5px] font-semibold text-slate-600 min-w-[100px] flex-shrink-0">{skill.category}</span>
      )}
      <div className="flex-1 flex flex-wrap gap-1.5">
        {(skill.items || []).map(item => (
          <span key={item} className="bg-indigo-50 text-indigo-700 text-[11.5px] font-medium px-2.5 py-0.5 rounded-full border border-indigo-100">
            {item}
          </span>
        ))}
      </div>
      <div className="flex flex-shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={handleDelete} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// ── Projects ──────────────────────────────────────────────────────────────────

function ProjectForm({ initial, onSave, onCancel }) {
  const EMPTY = { name: '', description: '', url: '', technologies: [], start_date: '', end_date: '' };
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [rawTech, setRawTech] = useState((initial?.technologies || []).join(', '));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => {
    setSaving(true);
    try { await onSave({ ...form, technologies: rawTech.split(',').map(s => s.trim()).filter(Boolean) }); }
    finally { setSaving(false); }
  };
  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-3.5" style={{ boxShadow: '0 2px 10px rgba(99,102,241,0.09)' }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="field-label">Project Name</label><input value={form.name} onChange={e => set('name', e.target.value)} className="input" autoFocus /></div>
        <div><label className="field-label">URL</label><input value={form.url} onChange={e => set('url', e.target.value)} className="input" placeholder="github.com/…" /></div>
      </div>
      <div>
        <label className="field-label">Description</label>
        <MarkdownTextarea
          value={form.description}
          onChange={value => set('description', value)}
          rows={4}
          className="resize-none text-[13px] leading-relaxed"
          compact
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="field-label">Tech Stack</label><input value={rawTech} onChange={e => setRawTech(e.target.value)} className="input" placeholder="React, Node, Postgres" /></div>
        <div><label className="field-label">Start</label><input value={form.start_date} onChange={e => set('start_date', e.target.value)} className="input" /></div>
        <div><label className="field-label">End</label><input value={form.end_date} onChange={e => set('end_date', e.target.value)} className="input" /></div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
        <button onClick={onCancel} className="btn-ghost !text-xs">Cancel</button>
        <SaveBtn saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

function ProjectItem({ proj, onRefresh, onSaving, onSaved }) {
  const [editing, setEditing] = useState(false);
  const handleDelete = async () => {
    if (!confirm(`Remove "${proj.name}"?`)) return;
    await api.profile.projects.delete(proj.id); onRefresh?.();
  };
  const handleSave = async (form) => {
    onSaving?.(); await api.profile.projects.update(proj.id, form); onSaved?.();
    setEditing(false); onRefresh?.();
  };

  if (editing) return <ProjectForm initial={proj} onSave={handleSave} onCancel={() => setEditing(false)} />;

  return (
    <div className="group flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="w-1 flex-shrink-0 self-stretch rounded-full bg-violet-400 opacity-70" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-slate-800 text-[14px] truncate">{proj.name}</p>
              {proj.url && (
                <a href={proj.url.startsWith('http') ? proj.url : `https://${proj.url}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-600 flex-shrink-0">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {proj.description && <p className="text-[12.5px] text-slate-500 mt-0.5 leading-relaxed"><InlineMarkdown text={proj.description} /></p>}
            {proj.technologies?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {proj.technologies.map(t => (
                  <span key={t} className="bg-violet-50 text-violet-700 text-[11px] font-medium px-2 py-0.5 rounded border border-violet-100">{t}</span>
                ))}
              </div>
            )}
          </div>
          <span className="text-[11.5px] text-slate-400 whitespace-nowrap flex-shrink-0 pt-0.5">{dateRange(proj.start_date, proj.end_date)}</span>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-start gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={handleDelete} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// ── Certifications ────────────────────────────────────────────────────────────

function CertForm({ initial, onSave, onCancel }) {
  const EMPTY = { name: '', issuer: '', issued_date: '', expiry_date: '', credential_id: '', cert_group: '' };
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => { setSaving(true); try { await onSave(form); } finally { setSaving(false); } };

  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-3.5" style={{ boxShadow: '0 2px 10px rgba(99,102,241,0.09)' }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="field-label">Certification / Training Name</label><input value={form.name} onChange={e => set('name', e.target.value)} className="input" autoFocus placeholder="AWS Certified Solutions Architect" /></div>
        <div className="sm:col-span-2"><label className="field-label">Issuing Organization</label><input value={form.issuer} onChange={e => set('issuer', e.target.value)} className="input" placeholder="Amazon Web Services" /></div>
        <div><label className="field-label">Date Issued</label><input value={form.issued_date} onChange={e => set('issued_date', e.target.value)} className="input" placeholder="Jan 2023" /></div>
        <div><label className="field-label">Expiry Date</label><input value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className="input" placeholder="Jan 2026 (or No Expiry)" /></div>
        <div className="sm:col-span-2"><label className="field-label">Group (optional)</label><input value={form.cert_group || ''} onChange={e => set('cert_group', e.target.value)} className="input" placeholder="Cloud, Infrastructure & Platform, Agile…" /></div>
        <div className="sm:col-span-2"><label className="field-label">Credential ID (optional)</label><input value={form.credential_id} onChange={e => set('credential_id', e.target.value)} className="input" placeholder="ABC-123-XYZ" /></div>
      </div>
      <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
        <button onClick={onCancel} className="btn-ghost !text-xs">Cancel</button>
        <SaveBtn saving={saving} onClick={handleSave} />
      </div>
    </div>
  );
}

function CertItem({ cert, onRefresh, onSaving, onSaved }) {
  const [editing, setEditing] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Remove "${cert.name || 'this certification'}"?`)) return;
    await api.profile.certifications.delete(cert.id);
    onRefresh?.();
  };

  const handleSave = async (form) => {
    onSaving?.(); await api.profile.certifications.update(cert.id, form); onSaved?.();
    setEditing(false); onRefresh?.();
  };

  if (editing) return <CertForm initial={cert} onSave={handleSave} onCancel={() => setEditing(false)} />;

  return (
    <div className="group flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="w-1 flex-shrink-0 self-stretch rounded-full bg-amber-400 opacity-70" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-[14px] truncate">{cert.name}</p>
        <p className="text-[12.5px] text-slate-500 mt-0.5">
          {[cert.issuer, cert.issued_date].filter(Boolean).join(' · ')}
          {cert.expiry_date && <span className="text-slate-400"> → {cert.expiry_date}</span>}
        </p>
        {cert.cert_group && <p className="text-[11.5px] text-indigo-400 mt-0.5">{cert.cert_group}</p>}
        {cert.credential_id && <p className="text-[11.5px] text-slate-400 mt-0.5 font-mono">ID: {cert.credential_id}</p>}
      </div>
      <div className="flex flex-shrink-0 items-start gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-indigo-600"><Pencil className="h-3.5 w-3.5" /></button>
        <button onClick={handleDelete} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

// ── Main Profile page ─────────────────────────────────────────────────────────

export default function Profile() {
  const navigate  = useNavigate();
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saveState, setSaveState] = useState('idle');
  const [creating, setCreating] = useState(false);

  // Add-form visibility per section
  const [addingExp,   setAddingExp]   = useState(false);
  const [addingEdu,   setAddingEdu]   = useState(false);
  const [addingSkill, setAddingSkill] = useState(false);
  const [addingProj,  setAddingProj]  = useState(false);
  const [addingCert,  setAddingCert]  = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    api.profile.init()
      .then(setProfile)
      .catch((err) => setLoadError(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const onSaving = useCallback(() => setSaveState('saving'), []);
  const onSaved  = useCallback(() => {
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2500);
  }, []);

  const refresh = useCallback(async () => {
    const updated = await api.profile.get();
    setProfile(updated);
  }, []);

  const patchPersonal = useCallback((personal) => {
    setProfile(prev => prev ? ({ ...prev, personal }) : prev);
  }, []);

  const handleCreateResume = useCallback(async () => {
    setCreating(true);
    try {
      const resume = await api.profile.createResume('Untitled Resume');
      navigate(`/resumes/${resume.id}`);
    } finally { setCreating(false); }
  }, [navigate]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
        <p className="text-sm text-slate-400">Loading profile…</p>
      </div>
    </div>
  );

  if (loadError || !profile) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <CloudOff className="h-7 w-7 text-rose-400" />
        <p className="text-sm font-semibold text-slate-700">Couldn't load your profile</p>
        <p className="text-xs text-slate-400">
          {loadError || 'Unknown error'} — make sure the CareerOS server is running (port 3001).
        </p>
        <button onClick={() => window.location.reload()} className="btn-secondary !py-1.5 !px-4 !text-xs mt-2">
          Retry
        </button>
      </div>
    </div>
  );

  const exps     = profile.experiences    || [];
  const edus     = profile.education     || [];
  const skills   = profile.skills        || [];
  const projects = profile.projects      || [];
  const certs    = profile.certifications || [];
  const p = profile.personal || {};
  const totalSkills = skills.reduce((n, s) => n + (s.items?.length || 0), 0);
  const progress = getProfileProgress(profile);
  const populatedSections = [
    p.full_name || p.email || p.phone,
    exps.length,
    edus.length,
    totalSkills,
    projects.length,
  ].filter(Boolean).length;

  const sharedProps = { onSaving, onSaved, onRefresh: refresh };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sticky header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900">
              <UserCircle className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-slate-900">Master Profile</p>
              <p className="hidden text-[11px] text-slate-400 sm:block">{populatedSections}/5 sections populated</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SaveStatus state={saveState} />
            <button
              onClick={handleCreateResume}
              disabled={creating}
              className="btn-primary !min-w-[128px] justify-center !py-1.5 !text-xs sm:!min-w-[172px]"
            >
              {creating
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Creating</>
                : <><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">New Resume from Profile</span><span className="sm:hidden">New Resume</span></>
              }
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="mx-auto grid max-w-[1480px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,820px)_minmax(320px,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-[15px] font-semibold text-white">
                {initials(p.full_name)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-slate-900">{p.full_name || 'Profile'}</p>
                <p className="truncate text-[12px] text-slate-400">{p.tagline || p.email || 'Master record'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <ProfileMetric icon={Briefcase} label="Experience" value={exps.length} />
            <ProfileMetric icon={GraduationCap} label="Education" value={edus.length} />
            <ProfileMetric icon={Layers} label="Skills" value={totalSkills} />
            <ProfileMetric icon={FolderOpen} label="Projects" value={projects.length} />
            <ProfileMetric icon={Award} label="Certs" value={certs.length} />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
        <ProfileWorkspaceHeader
          profile={profile}
          progress={progress}
          totalSkills={totalSkills}
          onCreateResume={handleCreateResume}
          creating={creating}
        />

        {/* Personal hero */}
        <PersonalCard data={profile.personal} onSaving={onSaving} onSaved={onSaved} onChange={patchPersonal} />

        {/* Experience */}
        <SectionPanel>
          <SectionHeader icon={Briefcase} title="Experience" count={exps.length} adding={addingExp} onAdd={() => setAddingExp(true)} />
          <div className="space-y-3 p-4 sm:p-5">
            {addingExp && (
              <ExpForm
                initial={null}
                onSave={async (form) => { onSaving(); await api.profile.experiences.create(form); onSaved(); setAddingExp(false); refresh(); }}
                onCancel={() => setAddingExp(false)}
              />
            )}
            {exps.map(exp => <ExpItem key={exp.id} exp={exp} {...sharedProps} />)}
            {exps.length === 0 && !addingExp && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[13px] text-slate-400">
                No experience yet
              </p>
            )}
          </div>
        </SectionPanel>

        {/* Education */}
        <SectionPanel>
          <SectionHeader icon={GraduationCap} title="Education" count={edus.length} adding={addingEdu} onAdd={() => setAddingEdu(true)} />
          <div className="space-y-3 p-4 sm:p-5">
            {addingEdu && (
              <EduForm
                initial={null}
                onSave={async (form) => { onSaving(); await api.profile.education.create(form); onSaved(); setAddingEdu(false); refresh(); }}
                onCancel={() => setAddingEdu(false)}
              />
            )}
            {edus.map(edu => <EduItem key={edu.id} edu={edu} {...sharedProps} />)}
            {edus.length === 0 && !addingEdu && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[13px] text-slate-400">
                No education yet
              </p>
            )}
          </div>
        </SectionPanel>

        {/* Skills */}
        <SectionPanel>
          <SectionHeader icon={Layers} title="Skills" count={skills.length} adding={addingSkill} onAdd={() => setAddingSkill(true)} />
          <div className="space-y-2.5 p-4 sm:p-5">
            {addingSkill && (
              <SkillForm
                initial={null}
                onSave={async (form) => { onSaving(); await api.profile.skills.create(form); onSaved(); setAddingSkill(false); refresh(); }}
                onCancel={() => setAddingSkill(false)}
              />
            )}
            {skills.map(s => <SkillItem key={s.id} skill={s} {...sharedProps} />)}
            {skills.length === 0 && !addingSkill && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[13px] text-slate-400">
                No skills yet
              </p>
            )}
          </div>
        </SectionPanel>

        {/* Projects */}
        <SectionPanel>
          <SectionHeader icon={FolderOpen} title="Projects" count={projects.length} adding={addingProj} onAdd={() => setAddingProj(true)} />
          <div className="space-y-3 p-4 sm:p-5">
            {addingProj && (
              <ProjectForm
                initial={null}
                onSave={async (form) => { onSaving(); await api.profile.projects.create(form); onSaved(); setAddingProj(false); refresh(); }}
                onCancel={() => setAddingProj(false)}
              />
            )}
            {projects.map(p => <ProjectItem key={p.id} proj={p} {...sharedProps} />)}
            {projects.length === 0 && !addingProj && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[13px] text-slate-400">
                No projects yet
              </p>
            )}
          </div>
        </SectionPanel>

        {/* Certifications */}
        <SectionPanel>
          <SectionHeader icon={Award} title="Certifications & Notable Trainings" count={certs.length} adding={addingCert} onAdd={() => setAddingCert(true)} />
          <div className="space-y-3 p-4 sm:p-5">
            {addingCert && (
              <CertForm
                initial={null}
                onSave={async (form) => { onSaving(); await api.profile.certifications.create(form); onSaved(); setAddingCert(false); refresh(); }}
                onCancel={() => setAddingCert(false)}
              />
            )}
            {certs.map(c => <CertItem key={c.id} cert={c} {...sharedProps} />)}
            {certs.length === 0 && !addingCert && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-[13px] text-slate-400">
                No certifications yet
              </p>
            )}
          </div>
        </SectionPanel>

        <div className="h-12" />
        </div>
        <ProfilePreviewCard profile={profile} totalSkills={totalSkills} />
      </main>
    </div>
  );
}
