import { forwardRef, useRef } from 'react';
import { Bold, Code2, Italic, Strikethrough } from 'lucide-react';

const ACTIONS = [
  { label: 'Bold', icon: Bold, before: '**', after: '**', sample: 'strong result' },
  { label: 'Italic', icon: Italic, before: '*', after: '*', sample: 'context' },
  { label: 'Code', icon: Code2, before: '`', after: '`', sample: 'tool' },
  { label: 'Strike', icon: Strikethrough, before: '~~', after: '~~', sample: 'remove' },
];

function mergeRefs(...refs) {
  return (node) => {
    refs.forEach(ref => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else ref.current = node;
    });
  };
}

const MarkdownTextarea = forwardRef(function MarkdownTextarea({
  value,
  onChange,
  rows = 4,
  placeholder,
  className = '',
  wrapperClassName = '',
  compact = false,
  helper = 'Markdown supported: bold, italic, code, and strike.',
  onKeyDown,
  ...props
}, ref) {
  const localRef = useRef(null);

  const applyToken = ({ before, after, sample }) => {
    const el = localRef.current;
    if (!el) return;

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const inner = selected || sample;
    const next = `${value.slice(0, start)}${before}${inner}${after}${value.slice(end)}`;

    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const from = start + before.length;
      const to = from + inner.length;
      el.setSelectionRange(from, to);
    });
  };

  return (
    <div className={`markdown-editor ${compact ? 'markdown-editor-compact' : ''} ${wrapperClassName}`}>
      <div className="markdown-toolbar" aria-label="Markdown formatting">
        {ACTIONS.map(({ label, icon: Icon, ...action }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => applyToken(action)}
            className="markdown-tool-btn"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        {!compact && <span className="ml-auto text-[11px] font-medium text-slate-400">{helper}</span>}
      </div>
      <textarea
        ref={mergeRefs(localRef, ref)}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`input markdown-textarea ${className}`}
        {...props}
      />
      {compact && helper && <p className="mt-1 text-[11px] text-slate-300">{helper}</p>}
    </div>
  );
});

export default MarkdownTextarea;
