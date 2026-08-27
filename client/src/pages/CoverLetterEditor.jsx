import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, CloudOff, FileDown, Plus, X, Tag } from 'lucide-react';
import { api } from '../api.js';
import { useAutoSave } from '../hooks/useAutoSave.js';

function SaveStatus({ state }) {
  if (state === 'idle') return null;
  if (state === 'saving') return (
    <span className="save-badge save-badge-saving animate-fade-in">
      <Loader2 className="h-3 w-3 animate-spin" /> Saving…
    </span>
  );
  if (state === 'saved') return (
    <span className="save-badge save-badge-saved animate-fade-in">
      <Check className="h-3 w-3" /> Saved
    </span>
  );
  if (state === 'error') return (
    <span className="save-badge save-badge-error animate-fade-in">
      <CloudOff className="h-3 w-3" /> Save failed
    </span>
  );
  return null;
}

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-[11.5px] font-semibold text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100";

export default function CoverLetterEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [letter, setLetter] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tagBusyId, setTagBusyId] = useState(null);

  const { schedule, flush, state: saveState } = useAutoSave(
    useCallback(async (data) => {
      const updated = await api.coverLetters.update(id, data);
      setLetter(prev => ({ ...prev, ...updated }));
    }, [id])
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([api.coverLetters.get(id), api.resumes.list()])
      .then(([l, r]) => {
        setLetter(l);
        setResumes(r);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const patch = useCallback((fields) => {
    setLetter(prev => {
      const next = { ...prev, ...fields };
      schedule(next);
      return next;
    });
  }, [schedule]);

  const updateParagraph = useCallback((idx, text) => {
    setLetter(prev => {
      const body = [...(prev.body || [])];
      body[idx] = text;
      const next = { ...prev, body };
      schedule(next);
      return next;
    });
  }, [schedule]);

  const addParagraph = useCallback(() => {
    setLetter(prev => {
      const body = [...(prev.body || []), ''];
      const next = { ...prev, body };
      schedule(next);
      return next;
    });
  }, [schedule]);

  const removeParagraph = useCallback((idx) => {
    setLetter(prev => {
      const body = (prev.body || []).filter((_, i) => i !== idx);
      const next = { ...prev, body };
      schedule(next);
      return next;
    });
  }, [schedule]);

  const taggedIds = useMemo(() => new Set((letter?.resumes || []).map(r => r.id)), [letter]);

  async function toggleTag(resumeId) {
    setTagBusyId(resumeId);
    try {
      if (taggedIds.has(resumeId)) {
        const updated = await api.coverLetters.untagResume(id, resumeId);
        setLetter(prev => ({ ...prev, resumes: updated.resumes ?? prev.resumes.filter(r => r.id !== resumeId) }));
      } else {
        const updated = await api.coverLetters.tagResume(id, resumeId);
        setLetter(prev => ({ ...prev, resumes: updated.resumes }));
      }
    } finally {
      setTagBusyId(null);
    }
  }

  async function exportPdf() {
    setExporting(true);
    try {
      await flush(letter);
      const response = await fetch(`/api/cover-letters/${id}/pdf`);
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || 'PDF generation failed');
      }
      const blob = await response.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `${letter.title || 'cover_letter'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  if (loading || !letter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  const reLine = [letter.role_title, letter.company].filter(Boolean).join(' — ');
  const recipientLines = [letter.recipient_name, letter.recipient_title, letter.company, letter.recipient_location]
    .filter(Boolean);
  const displayDate = letter.letter_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/cover-letters')} className="btn-ghost !p-1.5 !text-slate-500">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <input
              value={letter.title}
              onChange={e => patch({ title: e.target.value })}
              className="text-[15px] font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 min-w-0 truncate"
              style={{ width: `${Math.max(10, letter.title.length)}ch` }}
            />
            <SaveStatus state={saveState} />
          </div>
          <button onClick={exportPdf} disabled={exporting} className="btn-primary text-[13px] !py-1.5">
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Export PDF
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* ── Form ─────────────────────────────────────────── */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-[13px] font-bold text-slate-800 mb-3">Role</h2>
            <Field label="Company">
              <input className={inputCls} value={letter.company || ''} onChange={e => patch({ company: e.target.value })} />
            </Field>
            <Field label="Role title">
              <input className={inputCls} value={letter.role_title || ''} onChange={e => patch({ role_title: e.target.value })} />
            </Field>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-[13px] font-bold text-slate-800 mb-3">Recipient</h2>
            <Field label="Recipient name">
              <input className={inputCls} placeholder="Hiring Team" value={letter.recipient_name || ''} onChange={e => patch({ recipient_name: e.target.value })} />
            </Field>
            <Field label="Recipient title">
              <input className={inputCls} placeholder="e.g. Hiring Manager" value={letter.recipient_title || ''} onChange={e => patch({ recipient_title: e.target.value })} />
            </Field>
            <Field label="Recipient location">
              <input className={inputCls} value={letter.recipient_location || ''} onChange={e => patch({ recipient_location: e.target.value })} />
            </Field>
            <Field label="Date">
              <input className={inputCls} placeholder={displayDate} value={letter.letter_date || ''} onChange={e => patch({ letter_date: e.target.value })} />
            </Field>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-[13px] font-bold text-slate-800 mb-3">Sender</h2>
            <Field label="Name">
              <input className={inputCls} value={letter.sender_name || ''} onChange={e => patch({ sender_name: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={inputCls} value={letter.sender_email || ''} onChange={e => patch({ sender_email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={letter.sender_phone || ''} onChange={e => patch({ sender_phone: e.target.value })} />
            </Field>
            <Field label="Location">
              <input className={inputCls} value={letter.sender_location || ''} onChange={e => patch({ sender_location: e.target.value })} />
            </Field>
            <Field label="LinkedIn">
              <input className={inputCls} value={letter.sender_linkedin || ''} onChange={e => patch({ sender_linkedin: e.target.value })} />
            </Field>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-[13px] font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-indigo-400" />
              Tagged resumes
            </h2>
            <p className="text-[11.5px] text-slate-400 mb-3">Link this letter to the resume(s) it goes out with.</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {resumes.length === 0 && (
                <p className="text-[12px] text-slate-400">No resumes yet — create one first.</p>
              )}
              {resumes.map(r => {
                const tagged = taggedIds.has(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px] cursor-pointer transition-colors ${
                      tagged ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={tagged}
                      disabled={tagBusyId === r.id}
                      onChange={() => toggleTag(r.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                    />
                    <span className="truncate flex-1">{r.title}</span>
                    {tagBusyId === r.id && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Body + live preview ──────────────────────────── */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-bold text-slate-800">Salutation & Body</h2>
            </div>
            <Field label="Salutation">
              <input className={inputCls} value={letter.salutation || ''} onChange={e => patch({ salutation: e.target.value })} />
            </Field>
            <div className="space-y-2 mt-2">
              {(letter.body || []).map((p, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <textarea
                    value={p}
                    onChange={e => updateParagraph(idx, e.target.value)}
                    rows={3}
                    className={`${inputCls} resize-y`}
                    placeholder={`Paragraph ${idx + 1}`}
                  />
                  <button onClick={() => removeParagraph(idx)} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-red-500 mt-1">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={addParagraph} className="btn-secondary !text-[12px] !py-1.5 !px-3 mt-1">
                <Plus className="h-3.5 w-3.5" />
                Add paragraph
              </button>
            </div>
            <Field label="Closing">
              <input className={inputCls} value={letter.closing || ''} onChange={e => patch({ closing: e.target.value })} />
            </Field>
          </section>

          {/* Live preview — a simplified approximation of the exported PDF layout */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-2.5 text-[11.5px] font-semibold text-slate-400 uppercase tracking-wide">
              Preview
            </div>
            <div className="p-8 bg-white" style={{ fontFamily: "Aptos, 'Segoe UI', Arial, sans-serif" }}>
              <div className="text-center mb-5">
                <h1 className="text-[20px] font-bold" style={{ color: letter.accent_color || '#1E3A8A' }}>{letter.sender_name || 'Your Name'}</h1>
                <p className="text-[11px] text-slate-700 mt-1">
                  {[letter.sender_email, letter.sender_phone, letter.sender_location, letter.sender_linkedin]
                    .filter(Boolean).join('  |  ')}
                </p>
              </div>
              <p className="text-[12px] text-slate-700 mb-4">{displayDate}</p>
              {recipientLines.length > 0 && (
                <div className="mb-4">
                  {recipientLines.map((l, i) => <p key={i} className="text-[12px] text-slate-700 leading-snug">{l}</p>)}
                </div>
              )}
              {reLine && (
                <p className="text-[12px] font-bold mb-4" style={{ color: letter.accent_color || '#1E3A8A' }}>Re: {reLine}</p>
              )}
              <p className="text-[12px] text-slate-700 mb-3">{letter.salutation || 'Dear Hiring Team,'}</p>
              {(letter.body || []).filter(Boolean).map((p, i) => (
                <p key={i} className="text-[12px] leading-relaxed text-slate-700 mb-3">{p}</p>
              ))}
              <p className="text-[12px] text-slate-700 mt-4">{letter.closing || 'Sincerely,'}</p>
              <p className="text-[12px] text-slate-700">{letter.sender_name}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
