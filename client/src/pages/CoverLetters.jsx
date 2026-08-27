import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Plus, Trash2, Copy, Clock, ArrowRight, Loader2, FileText } from 'lucide-react';
import { api } from '../api.js';

const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-pink-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-indigo-600',
];

function timeAgo(dateStr) {
  const utc = String(dateStr).replace(' ', 'T') + 'Z';
  const diff = (Date.now() - new Date(utc).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function CoverLetters() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [cloningId, setCloningId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.coverLetters.list()
      .then(setLetters)
      .catch(err => setLoadError(err.message || 'Failed to reach the CareerOS server'))
      .finally(() => setLoading(false));
  }, []);

  async function createLetter() {
    setCreating(true);
    try {
      const letter = await api.coverLetters.create({ title: 'Untitled Cover Letter' });
      navigate(`/cover-letters/${letter.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function deleteLetter(e, id) {
    e.stopPropagation();
    if (!confirm('Delete this cover letter? This cannot be undone.')) return;
    setDeletingId(id);
    await api.coverLetters.delete(id);
    setLetters(prev => prev.filter(l => l.id !== id));
    setDeletingId(null);
  }

  async function doClone(e, id) {
    e.stopPropagation();
    setCloningId(id);
    try {
      const cloned = await api.coverLetters.clone(id);
      setLetters(prev => [cloned, ...prev]);
    } finally {
      setCloningId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-slate-900">Cover Letters</h1>
          <button onClick={createLetter} disabled={creating} className="btn-primary text-[13px] !py-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Cover Letter
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-10 flex flex-col items-center text-center gap-2">
            <p className="text-sm font-semibold text-rose-500">Couldn't reach the CareerOS server</p>
            <p className="text-xs text-slate-400 max-w-sm">{loadError} — make sure the server (port 3001) is running, then reload.</p>
            <button onClick={() => window.location.reload()} className="btn-secondary !py-1.5 !px-4 !text-xs mt-2">Retry</button>
          </div>
        ) : letters.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
              <Mail className="h-7 w-7 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Write your first cover letter</h2>
            <p className="text-slate-400 text-sm mb-7 max-w-xs">
              Draft a cover letter, tag it to one of your resumes, and export it as a PDF alongside your application.
            </p>
            <button onClick={createLetter} disabled={creating} className="btn-primary px-6 py-2.5">
              <Plus className="h-4 w-4" />
              New Cover Letter
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h1 className="text-[22px] font-bold text-slate-900">My Cover Letters</h1>
                <p className="text-slate-400 text-sm mt-0.5">{letters.length} letter{letters.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={createLetter}
                disabled={creating}
                className="group h-44 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-white text-slate-400 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-500"
              >
                <div className="h-10 w-10 rounded-full border-2 border-dashed border-current flex items-center justify-center transition-transform group-hover:scale-110">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-[13px] font-semibold">New Cover Letter</span>
              </button>

              {letters.map((letter, idx) => (
                <div
                  key={letter.id}
                  onClick={() => navigate(`/cover-letters/${letter.id}`)}
                  className="group relative h-44 rounded-xl bg-white border border-slate-200 cursor-pointer overflow-hidden transition-all duration-200 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${GRADIENTS[idx % GRADIENTS.length]}`} />

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]} flex items-center justify-center`}>
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => doClone(e, letter.id)}
                          disabled={cloningId === letter.id}
                          title="Duplicate cover letter"
                          className="btn-ghost !p-1.5 !text-slate-400 hover:!text-indigo-500 hover:!bg-indigo-50"
                        >
                          {cloningId === letter.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={e => deleteLetter(e, letter.id)}
                          disabled={deletingId === letter.id}
                          title="Delete cover letter"
                          className="btn-ghost !p-1.5 !text-slate-400 hover:!text-red-500 hover:!bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-slate-800 text-[14px] truncate mb-1">{letter.title}</h3>
                    {(letter.company || letter.role_title) && (
                      <p className="text-[12px] text-slate-500 truncate mb-1">
                        {[letter.role_title, letter.company].filter(Boolean).join(' — ')}
                      </p>
                    )}
                    {letter.resumes?.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-indigo-500 mb-1">
                        <FileText className="h-3 w-3" />
                        <span className="truncate">Tagged: {letter.resumes.map(r => r.title).join(', ')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>Updated {timeAgo(letter.updated_at)}</span>
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[12px] font-semibold text-indigo-600 flex items-center gap-1">
                      Open editor <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
