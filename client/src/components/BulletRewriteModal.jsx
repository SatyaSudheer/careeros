import { useEffect, useState } from 'react';
import { Sparkles, X, Loader2, AlertTriangle, Check, Quote } from 'lucide-react';
import { api } from '../api.js';

// Diff-review modal for AI bullet rewrites. The agent proposes, the user
// disposes: candidates are editable before applying, nothing is written
// until the user clicks Apply, and every accepted change is audit-logged.
export default function BulletRewriteModal({ resumeId, flag, resume, onClose, onApplied }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [edited, setEdited] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.ai.rewriteBullet(resumeId, {
      bullet: flag.text,
      issue: flag.issue,
      exp_id: flag.ref?.kind === 'exp' ? flag.ref.expId : null,
    })
      .then(data => { if (!cancelled) { setResult(data); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message || 'Rewrite failed'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [resumeId, flag]);

  const pick = (i) => {
    setSelected(i);
    setEdited(result.candidates[i].text);
  };

  const hasPlaceholder = /\[ADD METRIC\]/i.test(edited);

  const apply = async () => {
    if (!edited.trim() || hasPlaceholder) return;
    setApplying(true);
    try {
      const ref = flag.ref;
      if (ref.kind === 'highlight') {
        await api.highlights.update(resumeId, ref.id, { text: edited });
      } else {
        const exp = (resume.experiences || []).find(e => e.id === ref.expId);
        if (!exp) throw new Error('Experience not found');
        const bullets = [...(exp.bullets || [])];
        bullets[ref.index] = edited;
        await api.experiences.update(resumeId, exp.id, { ...exp, bullets });
      }
      await api.ai.recordChange(resumeId, {
        workflow: 'bullet_rewrite',
        field: flag.where,
        before_text: flag.text,
        after_text: edited,
        accepted: true,
      });
      onApplied?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply');
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h2 className="text-[14px] font-semibold text-slate-900">Improve bullet</h2>
            <span className="text-[11.5px] text-slate-400">· {flag.where}</span>
          </div>
          <button onClick={onClose} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Original + issue */}
          <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-[12.5px] text-slate-600 leading-snug">{flag.text}</p>
            <p className="mt-1.5 text-[11.5px] text-amber-600 flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {flag.issue}
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[12.5px]">Asking the panel…</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-[12.5px] text-red-600">
              {error}
            </div>
          )}

          {result && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Suggestions — pick one, then edit freely</p>
              <div className="space-y-2">
                {result.candidates.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selected === i ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-[12.5px] text-slate-700 leading-snug">{c.text}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {c.needs_metric && (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10.5px] text-amber-600">needs your metric</span>
                      )}
                      {(c.unverified_numbers || []).map(n => (
                        <span key={n} className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10.5px] text-red-500">verify: {n}</span>
                      ))}
                      {(c.facts_used || []).slice(0, 3).map((f, fi) => (
                        <span key={fi} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] text-slate-500">
                          <Quote className="h-2.5 w-2.5" />{f.length > 32 ? `${f.slice(0, 32)}…` : f}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {result.coaching_note && (
                <p className="text-[11.5px] text-slate-500 italic">💡 {result.coaching_note}</p>
              )}

              {selected != null && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Final text</p>
                  <textarea
                    value={edited}
                    onChange={e => setEdited(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12.5px] text-slate-700 leading-snug focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-y"
                  />
                  {hasPlaceholder && (
                    <p className="mt-1 text-[11.5px] text-amber-600">Replace [ADD METRIC] with your real number before applying — never guess.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="btn-ghost !text-xs">Cancel</button>
          <button
            onClick={apply}
            disabled={selected == null || !edited.trim() || hasPlaceholder || applying}
            className="btn-primary !py-1.5 !px-4 !text-xs min-w-[90px] justify-center disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5" />Apply</>}
          </button>
        </div>
      </div>
    </div>
  );
}
