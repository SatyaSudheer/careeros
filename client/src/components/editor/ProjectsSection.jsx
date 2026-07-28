import { useState, useCallback, useRef, useEffect } from 'react';
import { Code2, Plus, Trash2, ChevronDown, X, GripVertical } from 'lucide-react';
import { api } from '../../api.js';
import { useAutoSave } from '../../hooks/useAutoSave.js';
import SectionShell from './SectionShell.jsx';
import MarkdownTextarea from './MarkdownTextarea.jsx';

function TechInput({ technologies, onChange }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const add = (val) => {
    const t = val.trim();
    if (!t || technologies.includes(t)) return false;
    onChange([...technologies, t]);
    return true;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (add(input)) setInput('');
    } else if (e.key === 'Backspace' && !input && technologies.length) {
      onChange(technologies.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const tags = text.split(/[,\n]+/).map(t => t.trim()).filter(Boolean);
    const next = [...technologies];
    tags.forEach(t => { if (!next.includes(t)) next.push(t); });
    onChange(next);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="min-h-[38px] w-full cursor-text rounded-lg border border-slate-200 bg-white px-2 py-1.5 transition-all focus-within:border-indigo-400 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
    >
      <div className="flex flex-wrap gap-1.5 items-center">
        {technologies.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-600">
            {t}
            <button onClick={e => { e.stopPropagation(); onChange(technologies.filter((_, j) => j !== i)); }} tabIndex={-1}
              className="text-slate-400 hover:text-slate-700">
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => {
            const v = e.target.value;
            if (v.includes(',')) {
              v.split(',').slice(0, -1).forEach(p => add(p));
              setInput(v.split(',').pop());
            } else {
              setInput(v);
            }
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={technologies.length === 0 ? 'React, Node.js, PostgreSQL…' : ''}
          className="flex-1 min-w-[100px] border-none bg-transparent text-[13px] text-slate-700 placeholder-slate-300 outline-none py-0.5"
        />
      </div>
    </div>
  );
}

function ProjectCard({ resumeId, project, onSaving, onSaved, onRefresh, onItemChange, isDragging, isOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [form, setForm] = useState(project);
  const [open, setOpen] = useState(!project.name);

  const saveFn = useCallback(async (d) => {
    onSaving?.();
    await api.projects.update(resumeId, project.id, d);
    onSaved?.('saved');
  }, [resumeId, project.id, onSaving, onSaved]);

  const { schedule } = useAutoSave(saveFn);

  const set = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    onItemChange?.(next);
    schedule(next);
  };

  const del = async () => {
    if (!confirm(`Remove "${form.name || 'this project'}"?`)) return;
    await api.projects.delete(resumeId, project.id);
    onRefresh?.();
  };

  const isNew = !form.name;

  return (
    <div className="relative" onDragOver={onDragOver} onDrop={onDrop}>
      {isOver && (
        <div className="pointer-events-none absolute -top-1 left-0 right-0 z-10 h-0.5 rounded-full bg-indigo-400" />
      )}
      <div className={`item-card transition-all ${open ? 'ring-1 ring-indigo-100' : ''} ${isDragging ? 'opacity-30' : 'opacity-100'}`}>
        <div className="flex w-full items-center gap-1 px-2 py-2.5">
          <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="flex-shrink-0 cursor-grab text-slate-300 hover:text-slate-500 transition-colors active:cursor-grabbing p-0.5"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex flex-1 items-center gap-2 text-left min-w-0"
          >
            <div className="flex-1 min-w-0">
              {isNew ? (
                <p className="text-[13px] text-slate-400 italic">New project — click to fill in</p>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{form.name}</p>
                  {form.technologies?.length > 0 && (
                    <p className="text-[11.5px] text-slate-400 truncate">{form.technologies.slice(0, 4).join(', ')}</p>
                  )}
                </>
              )}
            </div>
          </button>
          <button
            onClick={e => { e.stopPropagation(); del(); }}
            className="flex-shrink-0 p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setOpen(o => !o)} className="flex-shrink-0 p-0.5">
            <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-100 px-3 pb-4 pt-3 space-y-2.5 animate-slide-down">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="col-span-2">
                <label className="field-label">Project Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="My Awesome App" className="input" autoFocus={isNew} />
              </div>
              <div className="col-span-2">
                <label className="field-label">URL / Link (optional)</label>
                <input value={form.url} onChange={e => set('url', e.target.value)}
                  placeholder="github.com/you/project" className="input" />
              </div>
              <div>
                <label className="field-label">Start Date</label>
                <input value={form.start_date} onChange={e => set('start_date', e.target.value)}
                  placeholder="Jan 2024" className="input" />
              </div>
              <div>
                <label className="field-label">End Date</label>
                <input value={form.end_date} onChange={e => set('end_date', e.target.value)}
                  placeholder="Present" className="input" />
              </div>
              <div className="col-span-2">
                <label className="field-label">Description</label>
                <MarkdownTextarea
                  value={form.description}
                  onChange={value => set('description', value)}
                  placeholder="What it does, key achievements, impact…"
                  rows={4}
                  className="resize-none text-[13px] leading-relaxed"
                  compact
                />
              </div>
              <div className="col-span-2">
                <label className="field-label">Tech Stack</label>
                <TechInput technologies={form.technologies || []} onChange={v => set('technologies', v)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsSection({ resumeId, items, onSaving, onSaved, onRefresh, onItemChange, onItemsChange }) {
  const [localItems, setLocalItems] = useState(items);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  useEffect(() => { setLocalItems(items); }, [items]);

  const handleDragStart = useCallback((id, e) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  }, []);

  const handleDragOver = useCallback((id, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragId) setOverId(id);
  }, [dragId]);

  const handleDrop = useCallback(async (targetId, e) => {
    e.preventDefault();
    const srcId = dragId;
    setDragId(null);
    setOverId(null);
    if (!srcId || srcId === targetId) return;

    const from = localItems.findIndex(p => p.id === srcId);
    const to   = localItems.findIndex(p => p.id === targetId);
    if (from === -1 || to === -1) return;

    const next = [...localItems];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLocalItems(next);
    onItemsChange?.(next);

    await api.projects.reorder(resumeId, next.map(p => p.id));
  }, [dragId, localItems, resumeId]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setOverId(null);
  }, []);

  const addNew = async () => {
    await api.projects.create(resumeId, { technologies: [] });
    onRefresh?.();
  };

  return (
    <SectionShell title="Notable Projects" icon={Code2} badge={localItems.length || undefined}>
      <div
        className="space-y-2"
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOverId(null);
        }}
      >
        {localItems.map(p => (
          <ProjectCard
            key={p.id}
            resumeId={resumeId}
            project={p}
            onSaving={onSaving}
            onSaved={onSaved}
            onRefresh={onRefresh}
            onItemChange={onItemChange}
            isDragging={dragId === p.id}
            isOver={overId === p.id}
            onDragStart={(e) => handleDragStart(p.id, e)}
            onDragOver={(e) => handleDragOver(p.id, e)}
            onDrop={(e) => handleDrop(p.id, e)}
            onDragEnd={handleDragEnd}
          />
        ))}
        <button onClick={addNew} className="btn-add mt-1">
          <Plus className="h-3.5 w-3.5" />
          Add Project
        </button>
      </div>
    </SectionShell>
  );
}
