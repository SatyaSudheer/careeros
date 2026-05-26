import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SectionShell({ title, icon: Icon, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="section-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50"
      >
        {Icon && (
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-indigo-50">
            <Icon className="h-3.5 w-3.5 text-indigo-500" />
          </div>
        )}
        <span className="flex-1 text-[13px] font-semibold text-slate-700">{title}</span>
        {badge != null && badge > 0 && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 leading-none">
            {badge}
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-300 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 animate-slide-down">
          <div className="px-4 pb-4 pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}
