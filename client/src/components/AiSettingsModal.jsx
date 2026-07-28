import { useEffect, useState } from 'react';
import { Sparkles, X, Loader2, Check, AlertTriangle, KeyRound, Trash2 } from 'lucide-react';
import { api } from '../api.js';

const MODEL_HINTS = {
  anthropic: 'claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5…',
  openai: 'gpt-4o, gpt-4o-mini…',
  gemini: 'gemini-2.5-flash, gemini-2.5-pro…',
  custom: 'llama3.3, mistral-large… (whatever your endpoint serves)',
};

// Configure which LLM powers the AI features — bring any key.
// The key is sent once on save and stored server-side; the UI only ever
// receives has_key + a …last4 hint back.
export default function AiSettingsModal({ onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [provider, setProvider] = useState('anthropic');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState(null); // { ok, message }

  useEffect(() => {
    api.ai.getSettings().then(s => {
      setSettings(s);
      setProvider(s.provider);
      setModel(s.model || '');
      setBaseUrl(s.base_url || '');
    }).catch(() => setSettings({ providers: [], has_key: false }));
  }, []);

  const providerDef = settings?.providers?.find(p => p.key === provider);

  const pickProvider = (key) => {
    setProvider(key);
    setTest(null);
    const def = settings?.providers?.find(p => p.key === key);
    setModel(def?.default_model || '');
  };

  const save = async (thenTest = false) => {
    setBusy(true);
    setTest(null);
    try {
      const payload = { provider, model, base_url: baseUrl };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      const updated = await api.ai.saveSettings(payload);
      setSettings(updated);
      setApiKey('');
      if (thenTest) {
        const result = await api.ai.testSettings();
        setTest({ ok: true, message: `Connected — ${result.provider} · ${result.model}` });
      } else {
        setTest({ ok: true, message: 'Saved' });
      }
      onSaved?.(updated);
    } catch (err) {
      setTest({ ok: false, message: err.message || 'Failed' });
    } finally {
      setBusy(false);
    }
  };

  const clearKey = async () => {
    setBusy(true);
    try {
      const updated = await api.ai.saveSettings({ api_key: null });
      setSettings(updated);
      setApiKey('');
      setTest({ ok: true, message: 'Key removed' });
      onSaved?.(updated);
    } catch (err) {
      setTest({ ok: false, message: err.message || 'Failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h2 className="text-[14px] font-semibold text-slate-900">AI Settings</h2>
          </div>
          <button onClick={onClose} className="btn-ghost !p-1.5 !text-slate-400 hover:!text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!settings ? (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-[12.5px]">Loading…</span>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <p className="text-[12px] leading-snug text-slate-500">
              Bring your own LLM key to power bullet rewriting and other AI features.
              The key is stored locally on this machine and never leaves your server.
            </p>

            <div>
              <label className="field-label">Provider</label>
              <select className="input" value={provider} onChange={e => pickProvider(e.target.value)}>
                {(settings.providers || []).map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>

            {provider === 'custom' && (
              <div>
                <label className="field-label">Base URL</label>
                <input
                  className="input"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1"
                />
                <p className="mt-1 text-[11px] text-slate-400">Any OpenAI-compatible endpoint: Ollama, OpenRouter, Groq, LM Studio, vLLM…</p>
              </div>
            )}

            <div>
              <label className="field-label">Model</label>
              <input
                className="input"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder={providerDef?.default_model || 'model name'}
              />
              <p className="mt-1 text-[11px] text-slate-400">{MODEL_HINTS[provider]}</p>
            </div>

            <div>
              <label className="field-label">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="input flex-1"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={settings.has_key ? `saved (${settings.key_hint}) — paste to replace` : provider === 'custom' ? 'optional for local endpoints' : 'sk-…'}
                  autoComplete="off"
                />
                {settings.has_key && (
                  <button onClick={clearKey} disabled={busy} title="Remove saved key"
                    className="btn-ghost !px-2.5 !text-red-500 hover:!bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {settings.has_key && (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                  <KeyRound className="h-3 w-3" /> A key is saved for this server
                </p>
              )}
            </div>

            {test && (
              <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] ${
                test.ok ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-600'
              }`}>
                {test.ok ? <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />}
                <span className="leading-snug">{test.message}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="btn-ghost !text-xs">Close</button>
          <button onClick={() => save(false)} disabled={busy || !settings} className="btn-secondary !py-1.5 !px-3 !text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
          </button>
          <button onClick={() => save(true)} disabled={busy || !settings} className="btn-primary !py-1.5 !px-4 !text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save & Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
