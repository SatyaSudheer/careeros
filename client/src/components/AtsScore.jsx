import { useState } from 'react';
import { ShieldCheck, ChevronDown } from 'lucide-react';

function filled(items) {
  return (items || []).filter(Boolean);
}

function hasMetric(text) {
  return /\d|%|\$|\b(increased|decreased|reduced|improved|grew|saved|cut|launched|shipped|scaled)\b/i.test(text || '');
}

function getChecks(resume) {
  const p = resume.personal || {};
  const experiences = resume.experiences || [];
  const highlights = resume.highlights || [];
  const skills = resume.skills || [];
  const projects = resume.projects || [];
  const filledExperiences = experiences.filter(e => e.company || e.title || filled(e.bullets).length);
  const allJobsHaveBasics = filledExperiences.length > 0 && filledExperiences.every(e =>
    e.company && e.title && e.start_date && (e.current_job || e.end_date)
  );
  const allJobsHaveBullets = filledExperiences.length > 0 && filledExperiences.every(e => filled(e.bullets).length >= 2);
  const hasMeasurableImpact = filledExperiences.some(e => filled(e.bullets).some(hasMetric));
  const totalSkills = skills.reduce((n, s) => n + filled(s.items).length, 0);

  return [
    { label: 'Name, email & phone',  pass: !!(p.full_name && p.email && p.phone) },
    { label: 'Location',             pass: !!p.location },
    { label: 'Summary (40+ chars)',  pass: !!(p.summary && p.summary.length >= 40) },
    { label: 'Career highlights',    pass: filled(highlights.map(h => h.text)).length >= 2 },
    { label: 'Work experience',      pass: filledExperiences.length > 0 },
    { label: 'Titles, companies & dates', pass: allJobsHaveBasics },
    { label: '2+ bullets per job',   pass: allJobsHaveBullets },
    { label: 'Measurable impact',    pass: hasMeasurableImpact },
    { label: 'Education',            pass: resume.education?.length > 0 },
    { label: '5+ skills added',      pass: totalSkills >= 5 },
    { label: 'Projects or portfolio', pass: projects.length > 0 || !!(p.website || p.github) },
    { label: 'LinkedIn or website',  pass: !!(p.linkedin || p.website) },
  ];
}

function scoreColor(score) {
  if (score >= 80) return { text: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-200' };
  if (score >= 50) return { text: 'text-amber-600',   bar: 'bg-amber-400',   bg: 'bg-amber-50',   ring: 'ring-amber-200' };
  return              { text: 'text-red-500',          bar: 'bg-red-400',     bg: 'bg-red-50',     ring: 'ring-red-200' };
}

function scoreLabel(score) {
  if (score >= 80) return 'Great';
  if (score >= 50) return 'Fair';
  return 'Weak';
}

export default function AtsScore({ resume }) {
  const [expanded, setExpanded] = useState(false);
  const checks = getChecks(resume);
  const passed = checks.filter(c => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  const c = scoreColor(score);
  const missing = checks.filter(ch => !ch.pass);

  return (
    <div className="section-card overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ring-1 ${c.bg} ${c.ring}`}>
          <ShieldCheck className={`h-4 w-4 ${c.text}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[13px] font-semibold text-slate-700">ATS Score</span>
            <span className={`text-[13px] font-bold ${c.text}`}>{score}% · {scoreLabel(score)}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-300 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-3 pt-2.5 animate-slide-down">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {checks.map(({ label, pass }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${pass ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                <span className={`text-[12px] ${pass ? 'text-slate-600' : 'text-slate-400'}`}>{label}</span>
              </div>
            ))}
          </div>
          {missing.length > 0 && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-[11.5px] font-semibold text-amber-700 mb-1">Next up:</p>
              <ul className="space-y-0.5">
                {missing.slice(0, 3).map(m => (
                  <li key={m.label} className="text-[11.5px] text-amber-600 flex items-start gap-1.5">
                    <span className="mt-0.5">→</span> {m.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
