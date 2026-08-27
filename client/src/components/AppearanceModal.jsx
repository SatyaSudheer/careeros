import { useEffect, useState } from 'react';
import { Type, X, RotateCcw, Check, Minus, Plus } from 'lucide-react';
import { UI_SCALES, DEFAULT_UI_SCALE, getUiScale, setUiScale, clampUiScale } from '../uiScale.js';

// Interface scale settings. Changes apply live as you pick them so you can
// judge the size against the real UI behind the dialog.
export default function AppearanceModal({ onClose }) {
  const [scale, setScale] = useState(getUiScale);

  // Keep the live UI in sync with the current choice
  useEffect(() => { setUiScale(scale); }, [scale]);

  const step = (delta) => setScale(s => clampUiScale(Math.round((s + delta) * 100) / 100));
  const pct = Math.round(scale * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-indigo-500" />
            <h2 className="text-[14px] font-semibold text-slate-900">Appearance</h2>
          </div>
          <button onClick={onClose} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="field-label !mb-0">Interface size</p>
              <span className="text-[12px] font-semibold text-indigo-600">{pct}%</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => step(-0.05)}
                disabled={scale <= 0.9}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
                title="Decrease"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min="0.9" max="1.5" step="0.05"
                value={scale}
                onChange={e => setScale(clampUiScale(e.target.value))}
                className="flex-1 accent-indigo-600"
                aria-label="Interface size"
              />
              <button
                onClick={() => step(0.05)}
                disabled={scale >= 1.5}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
                title="Increase"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {UI_SCALES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setScale(s.value)}
                  className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                    Math.abs(scale - s.value) < 0.001
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] leading-snug text-slate-500">
            Scales all app text, buttons, and spacing. The resume preview keeps its true
            Letter size so it still matches the exported PDF — use{' '}
            <span className="font-semibold text-slate-600">Style</span> in the editor to change the
            resume’s own font size.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button
            onClick={() => setScale(DEFAULT_UI_SCALE)}
            disabled={scale === DEFAULT_UI_SCALE}
            className="btn-ghost !text-xs disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button onClick={onClose} className="btn-primary !py-1.5 !px-4 !text-xs">
            <Check className="h-3.5 w-3.5" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
