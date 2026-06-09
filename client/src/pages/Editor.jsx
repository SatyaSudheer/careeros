import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, CloudOff, FileDown, FileText, UserCircle, Palette, Type, Minus, Plus, X, ChevronDown, AlignJustify } from 'lucide-react';
import { THEMES } from '../components/preview/themes.jsx';
import { api } from '../api.js';
import PersonalSection from '../components/editor/PersonalSection.jsx';
import CareerHighlightsSection from '../components/editor/CareerHighlightsSection.jsx';
import ExperienceSection from '../components/editor/ExperienceSection.jsx';
import EducationSection from '../components/editor/EducationSection.jsx';
import SkillsSection from '../components/editor/SkillsSection.jsx';
import ProjectsSection from '../components/editor/ProjectsSection.jsx';
import CertificationsSection from '../components/editor/CertificationsSection.jsx';
import ResumePreview from '../components/preview/ResumePreview.jsx';
import AtsScore from '../components/AtsScore.jsx';

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

const STYLE_COLORS = [
  { label: 'Slate', value: '' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Teal', value: '#0f766e' },
  { label: 'Emerald', value: '#047857' },
  { label: 'Rose', value: '#be123c' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Charcoal', value: '#1f2937' },
];

function percentScale(value) {
  return `${Math.round((Number(value || 1)) * 100)}%`;
}

const SECTION_DEFS = [
  { key: 'summary',        label: 'Professional Summary' },
  { key: 'highlights',     label: 'Career Highlights' },
  { key: 'experiences',    label: 'Experience' },
  { key: 'education',      label: 'Education' },
  { key: 'skills',         label: 'Skills' },
  { key: 'projects',       label: 'Projects' },
  { key: 'certifications', label: 'Certifications & Training' },
];

function sectionHasContent(resume, key) {
  if (key === 'summary') return !!(resume?.personal?.summary);
  if (key === 'highlights') return (resume?.highlights?.length || 0) > 0;
  if (key === 'experiences') return (resume?.experiences?.length || 0) > 0;
  if (key === 'education') return (resume?.education?.length || 0) > 0;
  if (key === 'skills') return (resume?.skills?.length || 0) > 0;
  if (key === 'projects') return (resume?.projects?.length || 0) > 0;
  if (key === 'certifications') return (resume?.certifications?.length || 0) > 0;
  return false;
}

function PdfExportModal({ resume, onConfirm, onCancel, exporting }) {
  const [selected, setSelected] = useState(() =>
    new Set(SECTION_DEFS.filter(d => sectionHasContent(resume, d.key)).map(d => d.key))
  );

  const toggle = (key) => setSelected(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const availableSections = SECTION_DEFS.filter(d => sectionHasContent(resume, d.key));
  const emptySections     = SECTION_DEFS.filter(d => !sectionHasContent(resume, d.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-[14px] font-semibold text-slate-900">Export PDF</h2>
            <p className="text-[11.5px] text-slate-400 mt-0.5">Choose which sections to include</p>
          </div>
          <button onClick={onCancel} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-1">
          {/* Always included note */}
          <div className="mb-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
            <p className="text-[11.5px] text-slate-500">
              <span className="font-semibold text-slate-700">Always included:</span> name, contact info, tagline
            </p>
          </div>

          {availableSections.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors group">
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() => toggle(key)}
                className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
              />
              <span className="text-[13px] text-slate-700 font-medium select-none">{label}</span>
            </label>
          ))}

          {emptySections.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              {emptySections.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <div className="h-4 w-4 rounded border border-slate-200 bg-slate-50 flex-shrink-0" />
                  <span className="text-[13px] text-slate-300 select-none">{label} <span className="text-[11px]">(no content)</span></span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onCancel} className="btn-ghost !text-xs">Cancel</button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={exporting || selected.size === 0}
            className="btn-primary !py-1.5 !px-4 !text-xs min-w-[110px] justify-center"
          >
            {exporting
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generating…</>
              : <><FileDown className="h-3.5 w-3.5" />Export PDF</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle');
  const [editingTitle, setEditingTitle] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingKind, setExportingKind] = useState(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(() =>
    api.resumes.get(id).then(setResume).finally(() => setLoading(false))
  , [id]);

  useEffect(() => { load(); }, [load]);

  const onSaved = useCallback((state = 'saved') => setSaveState(state), []);
  const onSaving = useCallback(() => setSaveState('saving'), []);

  useEffect(() => {
    if (saveState === 'saved') {
      const t = setTimeout(() => setSaveState('idle'), 2500);
      return () => clearTimeout(t);
    }
  }, [saveState]);

  const updateTitle = async (e) => {
    const title = e.target.value.trim() || 'Untitled Resume';
    setEditingTitle(false);
    if (title === resume.title) return;
    await api.resumes.update(id, { title });
    setResume(prev => ({ ...prev, title }));
    onSaved();
  };

  // Full refresh for structural changes (add/delete items)
  const refresh = useCallback(async () => {
    const updated = await api.resumes.get(id);
    setResume(updated);
  }, [id]);

  const handleThemeSelect = useCallback(async (template) => {
    setThemeOpen(false);
    await api.resumes.update(id, { template });
    setResume(prev => ({ ...prev, template }));
  }, [id]);

  const updateStyle = useCallback(async (patch) => {
    onSaving();
    setResume(prev => ({ ...prev, ...patch }));
    try {
      const updated = await api.resumes.update(id, patch);
      setResume(prev => ({ ...prev, ...updated }));
      onSaved();
    } catch (err) {
      onSaved('error');
    }
  }, [id, onSaving, onSaved]);

  const bumpFontScale = useCallback((delta) => {
    const current = Number(resume?.font_scale || 1);
    const next = Math.min(1.18, Math.max(0.88, Math.round((current + delta) * 100) / 100));
    updateStyle({ font_scale: next });
  }, [resume?.font_scale, updateStyle]);

  const exportFile = useCallback(async (kind, sections) => {
    setExporting(true);
    setExportingKind(kind);
    try {
      let url = `/api/resumes/${id}/${kind}`;
      if (kind === 'pdf' && sections) {
        url += `?sections=${[...sections].join(',')}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({}));
        throw new Error(error || `${kind.toUpperCase()} generation failed`);
      }
      const blob = await response.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `${resume.title || 'resume'}.${kind}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      alert(`Export failed: ${err.message}\n\nFallback: use File > Print → Save as PDF.`);
    } finally {
      setExporting(false);
      setExportingKind(null);
      setPdfModalOpen(false);
    }
  }, [id, resume?.title]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
        <p className="text-sm text-slate-400">Loading resume…</p>
      </div>
    </div>
  );

  if (!resume) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <p className="text-slate-500 font-medium">Resume not found</p>
      <button onClick={() => navigate('/')} className="btn-secondary">← Back</button>
    </div>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 z-10 bg-white border-b border-slate-200 px-4 h-12 flex items-center gap-3"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

        <button onClick={() => navigate('/')} className="btn-ghost !py-1 !px-2 !gap-1 text-slate-500">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-xs hidden sm:inline">Resumes</span>
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {resume.is_profile && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
            <UserCircle className="h-3 w-3" /> Master Profile
          </span>
        )}

        {/* Editable title */}
        {editingTitle ? (
          <input
            defaultValue={resume.title}
            onBlur={updateTitle}
            onKeyDown={e => e.key === 'Enter' && e.target.blur()}
            className="rounded-md border border-indigo-300 px-2 py-0.5 text-sm font-semibold text-slate-800 outline-none ring-2 ring-indigo-100 min-w-[160px] max-w-[280px]"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className="text-[13.5px] font-semibold text-slate-800 hover:text-indigo-600 transition-colors truncate max-w-[200px]"
            title="Click to rename"
          >
            {resume.title}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <SaveStatus state={saveState} />

          {/* Resume style controls */}
          <div className="relative">
            <button
              onClick={() => {
                setStyleOpen(o => !o);
                setThemeOpen(false);
                setExportOpen(false);
              }}
              className={`btn-ghost !py-1.5 !px-3 !text-xs !gap-1.5 ${styleOpen ? '!text-indigo-600 !bg-indigo-50' : '!text-slate-500'}`}
              title="Resume style"
            >
              <Type className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Style</span>
            </button>
            {styleOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStyleOpen(false)} />
                <div className="absolute right-0 top-9 z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">Resume style</p>
                    <span className="text-[11px] font-semibold text-slate-500">{percentScale(resume.font_scale)}</span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => bumpFontScale(-0.02)}
                      className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center"
                      title="Decrease font size"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="range"
                      min="0.88"
                      max="1.18"
                      step="0.01"
                      value={resume.font_scale || 1}
                      onChange={e => updateStyle({ font_scale: Number(e.target.value) })}
                      className="flex-1 accent-indigo-600"
                      aria-label="Resume font size"
                    />
                    <button
                      onClick={() => bumpFontScale(0.02)}
                      className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 inline-flex items-center justify-center"
                      title="Increase font size"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">Accent color</p>
                    <div className="grid grid-cols-4 gap-2">
                      {STYLE_COLORS.map(color => {
                        const active = (resume.accent_color || '') === color.value;
                        return (
                          <button
                            key={color.label}
                            onClick={() => updateStyle({ accent_color: color.value })}
                            className={`h-9 rounded-lg border text-[11px] font-semibold transition-all ${active ? 'border-slate-900 ring-2 ring-slate-200' : 'border-slate-200 hover:border-slate-300'}`}
                            style={{
                              background: color.value || '#f8fafc',
                              color: color.value ? '#ffffff' : '#475569',
                            }}
                            title={color.label}
                          >
                            {color.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlignJustify className="h-3.5 w-3.5 text-slate-400" />
                        <div>
                          <p className="text-[11px] font-semibold text-slate-700 leading-tight">Compact mode</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Top 3 roles full · earlier roles condensed</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateStyle({ compact_mode: !resume.compact_mode })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${resume.compact_mode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        role="switch"
                        aria-checked={!!resume.compact_mode}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${resume.compact_mode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme picker */}
          <div className="relative">
            <button
              onClick={() => {
                setThemeOpen(o => !o);
                setStyleOpen(false);
                setExportOpen(false);
              }}
              className={`btn-ghost !py-1.5 !px-3 !text-xs !gap-1.5 ${themeOpen ? '!text-indigo-600 !bg-indigo-50' : '!text-slate-500'}`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{THEMES[resume.template]?.label ?? 'Classic'}</span>
            </button>
            {themeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
                <div className="absolute right-0 top-9 z-50 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-xl animate-fade-in">
                  <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">Choose theme</p>
                  {Object.entries(THEMES).map(([key, { label, description, accent }]) => {
                    const active = (resume.template || 'classic') === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleThemeSelect(key)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${active ? 'bg-indigo-50' : ''}`}
                      >
                        <span className="h-6 w-6 rounded flex-shrink-0 border border-slate-200"
                          style={{ background: accent === '#e2e8f0' ? '#f8fafc' : accent }} />
                        <div className="min-w-0">
                          <p className={`text-[13px] font-semibold ${active ? 'text-indigo-700' : 'text-slate-700'}`}>{label}</p>
                          <p className="text-[11px] text-slate-400 truncate">{description}</p>
                        </div>
                        {active && <Check className="h-3.5 w-3.5 text-indigo-500 ml-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setExportOpen(o => !o); setThemeOpen(false); setStyleOpen(false); }}
              disabled={exporting}
              className={`btn-secondary !py-1.5 !text-xs !gap-1.5 ${exportOpen ? '!text-indigo-600 !bg-indigo-50 !border-indigo-200' : ''}`}
            >
              {exporting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileDown className="h-3.5 w-3.5" />
              }
              Export
              <ChevronDown className="h-3 w-3" />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-fade-in">
                  <p className="px-3 pt-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-widest text-slate-400">Format</p>
                  <button
                    onClick={() => { setPdfModalOpen(true); setExportOpen(false); }}
                    disabled={exporting}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5 text-slate-400" />
                    PDF
                    <span className="ml-auto text-[10.5px] text-slate-400">Formatted</span>
                  </button>
                  <button
                    onClick={() => { exportFile('docx'); setExportOpen(false); }}
                    disabled={exporting}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    DOCX
                    <span className="ml-auto text-[10.5px] text-slate-400">Word</span>
                  </button>
                  <button
                    onClick={() => { exportFile('txt'); setExportOpen(false); }}
                    disabled={exporting}
                    className="flex w-full items-center gap-2.5 px-3 pb-3 pt-2.5 text-left text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    TXT
                    <span className="ml-auto text-[10.5px] text-slate-400">Plain text</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel: Editor */}
        <div className="w-[440px] flex-shrink-0 overflow-y-auto editor-scroll bg-slate-50 border-r border-slate-200 p-3 space-y-2.5">
          <AtsScore resume={resume} />
          <PersonalSection resumeId={id} data={resume.personal} onSaving={onSaving} onSaved={onSaved} />
          <CareerHighlightsSection resumeId={id} items={resume.highlights || []} onSaving={onSaving} onSaved={onSaved} onRefresh={refresh} />
          <EducationSection resumeId={id} items={resume.education} onSaving={onSaving} onSaved={onSaved} onRefresh={refresh} />
          <SkillsSection resumeId={id} items={resume.skills} onSaving={onSaving} onSaved={onSaved} onRefresh={refresh} />
          <ExperienceSection resumeId={id} items={resume.experiences} onSaving={onSaving} onSaved={onSaved} onRefresh={refresh} />
          <ProjectsSection resumeId={id} items={resume.projects} onSaving={onSaving} onSaved={onSaved} onRefresh={refresh} />
          <CertificationsSection resumeId={id} items={resume.certifications || []} onSaving={onSaving} onSaved={onSaved} onRefresh={refresh} />
        </div>

        {/* Right panel: Preview */}
        <div className="flex-1 overflow-y-auto preview-scroll bg-[#E8ECF0]">
          <div className="mx-auto py-8 px-6" style={{ maxWidth: 828 }}>
            <ResumePreview resume={resume} />
          </div>
        </div>
      </div>

      {pdfModalOpen && (
        <PdfExportModal
          resume={resume}
          exporting={exporting && exportingKind === 'pdf'}
          onConfirm={(sections) => exportFile('pdf', sections)}
          onCancel={() => setPdfModalOpen(false)}
        />
      )}
    </div>
  );
}
