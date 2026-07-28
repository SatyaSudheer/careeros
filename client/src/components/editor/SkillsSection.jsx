import { useState, useCallback, useRef, useEffect } from 'react';
import { Zap, Plus, Trash2, X, GripVertical } from 'lucide-react';
import { api } from '../../api.js';
import { useAutoSave } from '../../hooks/useAutoSave.js';
import SectionShell from './SectionShell.jsx';

// ── Tag input with CSV paste support ─────────────────────────────────────────

function TagInput({ items, onChange, placeholder = 'Add skill, press Enter or comma…' }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const addTag = (val) => {
    const trimmed = val.trim().replace(/,$/, '');
    if (!trimmed || items.includes(trimmed)) return false;
    onChange([...items, trimmed]);
    return true;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (addTag(input)) setInput('');
    } else if (e.key === 'Backspace' && !input && items.length) {
      onChange(items.slice(0, -1));
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const tags = text.split(/[,\n]+/).map(t => t.trim()).filter(Boolean);
    const newItems = [...items];
    tags.forEach(t => { if (!newItems.includes(t)) newItems.push(t); });
    onChange(newItems);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.includes(',')) {
      const parts = val.split(',');
      parts.slice(0, -1).forEach(p => addTag(p));
      setInput(parts[parts.length - 1]);
    } else {
      setInput(val);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="min-h-[38px] w-full cursor-text rounded-lg border border-slate-200 bg-white px-2 py-1.5 transition-all focus-within:border-indigo-400 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
    >
      <div className="flex flex-wrap gap-1.5 items-center">
        {items.map((item, i) => (
          <span key={i} className="group/tag inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[12px] font-medium text-indigo-700">
            {item}
            <button
              onClick={e => { e.stopPropagation(); onChange(items.filter((_, j) => j !== i)); }}
              className="text-indigo-400 hover:text-indigo-700 transition-colors"
              tabIndex={-1}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={items.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] border-none bg-transparent text-[13px] text-slate-700 placeholder-slate-300 outline-none py-0.5"
        />
      </div>
    </div>
  );
}

// ── Skill group card ──────────────────────────────────────────────────────────

function SkillCard({ resumeId, skill, onSaving, onSaved, onRefresh, onItemChange, isDragging, isOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const [category, setCategory] = useState(skill.category || '');
  const [items, setItems] = useState(skill.items || []);

  const saveFn = useCallback(async (d) => {
    onSaving?.();
    await api.skills.update(resumeId, skill.id, d);
    onSaved?.('saved');
  }, [resumeId, skill.id, onSaving, onSaved]);

  const { schedule } = useAutoSave(saveFn, 500);

  const updateCategory = (val) => {
    setCategory(val);
    onItemChange?.({ ...skill, category: val, items });
    schedule({ category: val, items });
  };

  const updateItems = (val) => {
    setItems(val);
    onItemChange?.({ ...skill, category, items: val });
    schedule({ category, items: val });
  };

  const del = async () => {
    if (!confirm(`Remove "${category || 'this skill group'}"?`)) return;
    await api.skills.delete(resumeId, skill.id);
    onRefresh?.();
  };

  return (
    <div className="relative" onDragOver={onDragOver} onDrop={onDrop}>
      {/* Drop indicator line */}
      {isOver && (
        <div className="pointer-events-none absolute -top-1 left-0 right-0 z-10 h-0.5 rounded-full bg-indigo-400" />
      )}
      <div className={`item-card px-3 py-3 space-y-2 transition-opacity ${isDragging ? 'opacity-30' : 'opacity-100'}`}>
        <div className="flex items-center gap-2">
          <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className="flex-shrink-0 -ml-0.5 cursor-grab text-slate-300 hover:text-slate-500 transition-colors active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <input
            value={category}
            onChange={e => updateCategory(e.target.value)}
            placeholder="Category  (e.g. Languages)"
            className="input flex-1 text-[13px] font-medium"
          />
          <button onClick={del} className="flex-shrink-0 p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded transition-all">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <TagInput items={items} onChange={updateItems} />
        {items.length === 0 && (
          <p className="text-[11px] text-slate-300 pl-0.5">Paste a comma-separated list or type and press Enter</p>
        )}
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function SkillsSection({ resumeId, items, onSaving, onSaved, onRefresh, onItemChange, onItemsChange }) {
  const [localItems, setLocalItems] = useState(items);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  // Sync from parent when items change (e.g. after refresh)
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

    const from = localItems.findIndex(s => s.id === srcId);
    const to   = localItems.findIndex(s => s.id === targetId);
    if (from === -1 || to === -1) return;

    const next = [...localItems];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setLocalItems(next); // optimistic update
    onItemsChange?.(next);

    await api.skills.reorder(resumeId, next.map(s => s.id));
  }, [dragId, localItems, resumeId]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setOverId(null);
  }, []);

  const addNew = async () => {
    await api.skills.create(resumeId, { category: '', items: [] });
    onRefresh?.();
  };

  const totalSkills = localItems.reduce((n, s) => n + (s.items?.length ?? 0), 0);

  return (
    <SectionShell title="Skills" icon={Zap} badge={totalSkills || localItems.length || undefined}>
      <div
        className="space-y-2"
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOverId(null);
        }}
      >
        {localItems.map(skill => (
          <SkillCard
            key={skill.id}
            resumeId={resumeId}
            skill={skill}
            onSaving={onSaving}
            onSaved={onSaved}
            onRefresh={onRefresh}
            onItemChange={onItemChange}
            isDragging={dragId === skill.id}
            isOver={overId === skill.id}
            onDragStart={(e) => handleDragStart(skill.id, e)}
            onDragOver={(e) => handleDragOver(skill.id, e)}
            onDrop={(e) => handleDrop(skill.id, e)}
            onDragEnd={handleDragEnd}
          />
        ))}
        <button onClick={addNew} className="btn-add mt-1">
          <Plus className="h-3.5 w-3.5" />
          Add Skill Group
        </button>
      </div>
    </SectionShell>
  );
}
