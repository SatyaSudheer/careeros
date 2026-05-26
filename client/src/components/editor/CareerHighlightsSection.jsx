import { useState, useCallback } from 'react';
import { Award, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api.js';
import { useAutoSave } from '../../hooks/useAutoSave.js';
import SectionShell from './SectionShell.jsx';

function HighlightCard({ resumeId, item, onSaving, onSaved, onRefresh }) {
  const [text, setText] = useState(item.text || '');

  const saveFn = useCallback(async (value) => {
    onSaving?.();
    await api.highlights.update(resumeId, item.id, { text: value });
    onSaved?.('saved');
  }, [resumeId, item.id, onSaving, onSaved]);

  const { schedule } = useAutoSave(saveFn, 500);

  const update = (value) => {
    setText(value);
    schedule(value);
  };

  const del = async () => {
    if (!confirm('Remove this career highlight?')) return;
    await api.highlights.delete(resumeId, item.id);
    onRefresh?.();
  };

  return (
    <div className="item-card px-3 py-3">
      <div className="flex items-start gap-2">
        <textarea
          value={text}
          onChange={e => update(e.target.value)}
          placeholder="Led a platform modernization that improved release quality by 30%."
          rows={2}
          className="input flex-1 resize-none text-[13px] leading-relaxed"
        />
        <button onClick={del} className="mt-1 flex-shrink-0 p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded transition-all">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function CareerHighlightsSection({ resumeId, items = [], onSaving, onSaved, onRefresh }) {
  const addNew = async () => {
    await api.highlights.create(resumeId, { text: '' });
    onRefresh?.();
  };

  return (
    <SectionShell title="Career Highlights" icon={Award} badge={items.length}>
      <div className="space-y-2">
        {items.map(item => (
          <HighlightCard
            key={item.id}
            resumeId={resumeId}
            item={item}
            onSaving={onSaving}
            onSaved={onSaved}
            onRefresh={onRefresh}
          />
        ))}
        <button onClick={addNew} className="btn-add mt-1">
          <Plus className="h-3.5 w-3.5" />
          Add Highlight
        </button>
      </div>
    </SectionShell>
  );
}
