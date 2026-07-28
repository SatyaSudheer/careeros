import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ChevronDown, Target, AlertTriangle, Sparkles } from 'lucide-react';
import { matchResume } from '../../../shared/jdMatch.js';
import { api } from '../api.js';
import BulletRewriteModal from './BulletRewriteModal.jsx';

// AI availability can change at runtime (AI Settings modal) — check per mount
function getAiStatus() {
  return api.ai.status().catch(() => ({ configured: false }));
}

// ── Text helpers ──────────────────────────────────────────────────────────────

function filled(items) {
  return (items || []).map(s => String(s ?? '').trim()).filter(Boolean);
}

function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function stripMd(text) {
  return String(text || '').replace(/\*\*|\*|~~|`/g, '');
}

// Strong opening verbs a FAANG panel expects (past tense + common variants)
const ACTION_VERBS = new Set([
  'accelerated', 'achieved', 'architected', 'automated', 'boosted', 'built',
  'championed', 'consolidated', 'created', 'cut', 'decreased', 'defined',
  'delivered', 'deployed', 'designed', 'developed', 'directed', 'drove',
  'eliminated', 'enabled', 'engineered', 'established', 'expanded', 'founded',
  'generated', 'grew', 'implemented', 'improved', 'increased', 'initiated',
  'instrumented', 'integrated', 'introduced', 'launched', 'led', 'managed',
  'mentored', 'migrated', 'modernized', 'negotiated', 'optimized',
  'orchestrated', 'overhauled', 'owned', 'partnered', 'pioneered', 'prototyped',
  'rearchitected', 'redesigned', 'reduced', 'refactored', 'released',
  'restructured', 'saved', 'scaled', 'shipped', 'simplified', 'spearheaded',
  'standardized', 'streamlined', 'transformed', 'unified',
]);

const WEAK_STARTS = [
  'responsible for', 'worked on', 'worked with', 'helped', 'assisted',
  'participated in', 'involved in', 'tasked with', 'duties included',
  'in charge of', 'was part of',
];

const BUZZWORDS = [
  'team player', 'hard-working', 'hard working', 'results-driven', 'go-getter',
  'detail-oriented', 'detail oriented', 'self-starter', 'think outside the box',
  'synergy', 'dynamic individual', 'proven track record',
];

const HAS_METRIC = /\d|%|\$/;
const FIRST_PERSON = /\b(I|me|my|we|our)\b/;

// ── Bullet review (per-bullet lint, like inline panel feedback) ───────────────

function reviewBullet(text, where, ref) {
  const plain = stripMd(text);
  const lower = plain.toLowerCase();
  const count = words(plain).length;
  const issues = [];

  const weak = WEAK_STARTS.find(w => lower.startsWith(w));
  if (weak) issues.push({ where, text, ref, issue: `Starts with “${weak}” — open with a strong verb (Led, Built, Reduced…)` });
  if (FIRST_PERSON.test(plain)) issues.push({ where, text, ref, issue: 'Avoid first-person pronouns (I, my, we) — write in implied first person' });
  if (count > 0 && count < 6) issues.push({ where, text, ref, issue: 'Too short — add scope or outcome (what changed, by how much)' });
  if (count > 34) issues.push({ where, text, ref, issue: `Too long (${count} words) — recruiters skim; aim for one line, under ~30 words` });
  const buzz = BUZZWORDS.find(b => lower.includes(b));
  if (buzz) issues.push({ where, text, ref, issue: `Drop the cliché “${buzz}” — replace with concrete evidence` });

  return issues;
}

function analyzeBullets(resume) {
  const sources = [];
  (resume.highlights || []).forEach((h, i) => {
    if (h.text?.trim()) sources.push({ where: `Highlight ${i + 1}`, text: h.text, ref: { kind: 'highlight', id: h.id } });
  });
  (resume.experiences || []).forEach((e, ei) => {
    // Iterate raw bullets so ref.index maps to the stored array position
    (e.bullets || []).forEach((b, bi) => {
      if (!String(b ?? '').trim()) return;
      sources.push({ where: `${e.company || `Job ${ei + 1}`} · bullet ${bi + 1}`, text: b, ref: { kind: 'exp', expId: e.id, index: bi } });
    });
  });

  const flags = sources.flatMap(s => reviewBullet(s.text, s.where, s.ref));
  const total = sources.length;
  const quantified = sources.filter(s => HAS_METRIC.test(stripMd(s.text))).length;
  const strongStart = sources.filter(s => {
    const plain = stripMd(s.text);
    const first = (words(plain)[0] || '').toLowerCase().replace(/[^a-z]/g, '');
    return ACTION_VERBS.has(first);
  }).length;
  const goodLength = sources.filter(s => {
    const n = words(stripMd(s.text)).length;
    return n >= 6 && n <= 34;
  }).length;

  return { total, quantified, strongStart, goodLength, flags };
}

// ── Rubric ────────────────────────────────────────────────────────────────────

function getGroups(resume, bulletStats, jdCoverage) {
  const p = resume.personal || {};
  const experiences = resume.experiences || [];
  const skills = resume.skills || [];
  const filledExperiences = experiences.filter(e => e.company || e.title || filled(e.bullets).length);
  const allJobsHaveBasics = filledExperiences.length > 0 && filledExperiences.every(e =>
    e.company && e.title && e.start_date && (e.current_job || e.end_date)
  );
  const allJobsHaveBullets = filledExperiences.length > 0 && filledExperiences.every(e => filled(e.bullets).length >= 2);
  const totalSkills = skills.reduce((n, s) => n + filled(s.items).length, 0);
  const { total, quantified, strongStart, goodLength } = bulletStats;
  const pct = n => (total ? Math.round((n / total) * 100) : 0);

  const groups = [
    {
      name: 'Recruiter screen', weight: 25,
      checks: [
        { label: 'Name, email & phone', pass: !!(p.full_name && p.email && p.phone), tip: 'ATS needs all three in the header to file you correctly' },
        { label: 'Location', pass: !!p.location, tip: 'Location filters are applied before a human ever looks' },
        { label: 'LinkedIn or website', pass: !!(p.linkedin || p.website), tip: 'Panels cross-check LinkedIn — include it' },
        { label: 'Summary (40+ chars)', pass: !!(p.summary && p.summary.length >= 40), tip: '2–3 line summary with role, years, and specialty' },
        { label: 'Title tagline', pass: !!p.tagline, tip: 'A one-line title (e.g. "Senior Software Engineer · Distributed Systems") aids keyword match' },
      ],
    },
    {
      name: 'Impact & writing', weight: 40,
      checks: [
        { label: `Strong opening verbs (${pct(strongStart)}%)`, pass: total > 0 && strongStart / total >= 0.7, tip: 'Start ≥70% of bullets with verbs like Led, Built, Reduced, Shipped' },
        { label: `Quantified results (${pct(quantified)}%)`, pass: total > 0 && quantified / total >= 0.5, tip: 'At least half your bullets should carry a number: %, $, latency, users, headcount' },
        { label: `Scannable length (${pct(goodLength)}%)`, pass: total > 0 && goodLength / total >= 0.8, tip: 'Keep bullets between ~6 and 30 words — one idea per line' },
        { label: 'No weak phrases', pass: total > 0 && !bulletStats.flags.some(f => f.issue.startsWith('Starts with')), tip: 'Remove "responsible for", "helped", "worked on"' },
        { label: 'No first-person / clichés', pass: total > 0 && !bulletStats.flags.some(f => f.issue.startsWith('Avoid') || f.issue.startsWith('Drop')), tip: 'No "I/my/we", no "team player"-style filler' },
        { label: 'Career highlights (2+)', pass: filled((resume.highlights || []).map(h => h.text)).length >= 2, tip: 'Lead with 2–4 headline wins — panels anchor on these' },
      ],
    },
    {
      name: 'Structure & parsing', weight: 25,
      checks: [
        { label: 'Work experience listed', pass: filledExperiences.length > 0 },
        { label: 'Titles, companies & dates', pass: allJobsHaveBasics, tip: 'Every role needs title + company + start/end dates or ATS drops it' },
        { label: '2+ bullets per job', pass: allJobsHaveBullets, tip: 'Roles without bullets read as filler' },
        { label: 'Education', pass: (resume.education || []).length > 0 },
        { label: '8+ skills, categorized', pass: totalSkills >= 8 && skills.some(s => s.category), tip: 'Group skills (Languages, Cloud, Leadership) — ATS keyword density lives here' },
        { label: 'Projects or portfolio', pass: (resume.projects || []).length > 0 || !!(p.website || p.github) },
      ],
    },
  ];

  if (jdCoverage != null) {
    groups.push({
      name: 'Job match', weight: 10,
      checks: [
        { label: `JD keyword coverage (${jdCoverage.matched.length}/${jdCoverage.keywords.length})`, pass: jdCoverage.keywords.length > 0 && jdCoverage.matched.length / jdCoverage.keywords.length >= 0.6, tip: 'Work the missing terms into skills and bullets — honestly' },
      ],
    });
  }

  return groups;
}

function scoreGroups(groups) {
  const totalWeight = groups.reduce((n, g) => n + g.weight, 0);
  const weighted = groups.reduce((n, g) => {
    const passed = g.checks.filter(c => c.pass).length;
    return n + (g.checks.length ? (passed / g.checks.length) * g.weight : 0);
  }, 0);
  return Math.round((weighted / totalWeight) * 100);
}

function scoreColor(score) {
  if (score >= 80) return { text: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50', ring: 'ring-emerald-200' };
  if (score >= 55) return { text: 'text-amber-600',   bar: 'bg-amber-400',   bg: 'bg-amber-50',   ring: 'ring-amber-200' };
  return              { text: 'text-red-500',          bar: 'bg-red-400',     bg: 'bg-red-50',     ring: 'ring-red-200' };
}

function scoreLabel(score) {
  if (score >= 90) return 'Strong hire';
  if (score >= 80) return 'Hire';
  if (score >= 55) return 'Leaning hire';
  return 'Needs work';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AtsScore({ resume, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [jd, setJd] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [rewriteFlag, setRewriteFlag] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAiStatus().then(s => { if (!cancelled) setAiEnabled(Boolean(s.configured)); });
    return () => { cancelled = true; };
  }, []);

  const jdStorageKey = resume?.id ? `careeros-jd-${resume.id}` : null;
  useEffect(() => {
    if (jdStorageKey) setJd(localStorage.getItem(jdStorageKey) || '');
  }, [jdStorageKey]);
  const onJdChange = (value) => {
    setJd(value);
    if (jdStorageKey) localStorage.setItem(jdStorageKey, value);
  };

  const bulletStats = useMemo(() => analyzeBullets(resume), [resume]);

  const jdCoverage = useMemo(() => matchResume(jd, resume), [jd, resume]);

  const groups = getGroups(resume, bulletStats, jdCoverage);
  const score = scoreGroups(groups);
  const c = scoreColor(score);
  const flags = bulletStats.flags;

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
            <span className="text-[13px] font-semibold text-slate-700">Hiring Panel Score</span>
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
        <div className="border-t border-slate-100 px-4 pb-3 pt-2.5 animate-slide-down space-y-3">
          {groups.map(group => {
            const passed = group.checks.filter(ch => ch.pass).length;
            return (
              <div key={group.name}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{group.name}</span>
                  <span className="text-[11px] font-semibold text-slate-400">{passed}/{group.checks.length} · {group.weight}% weight</span>
                </div>
                <div className="space-y-1">
                  {group.checks.map(({ label, pass, tip }) => (
                    <div key={label} className="flex items-start gap-2">
                      <div className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${pass ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                      <div className="min-w-0">
                        <span className={`text-[12px] ${pass ? 'text-slate-600' : 'text-slate-500 font-medium'}`}>{label}</span>
                        {!pass && tip && <p className="text-[11px] text-slate-400 leading-snug">{tip}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {flags.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
              <p className="text-[11.5px] font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> Panel notes ({flags.length})
              </p>
              <ul className="space-y-1">
                {flags.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-start justify-between gap-2 text-[11.5px] text-amber-700 leading-snug">
                    <span><span className="font-semibold">{f.where}:</span> {f.issue}</span>
                    {aiEnabled && f.ref && (
                      <button
                        onClick={() => setRewriteFlag(f)}
                        title="Get AI rewrite suggestions"
                        className="flex-shrink-0 inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                      >
                        <Sparkles className="h-2.5 w-2.5" /> Fix
                      </button>
                    )}
                  </li>
                ))}
                {flags.length > 5 && <li className="text-[11px] text-amber-500">…and {flags.length - 5} more</li>}
              </ul>
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Target className="h-3 w-3" /> Match a job description
            </p>
            <textarea
              value={jd}
              onChange={e => onJdChange(e.target.value)}
              placeholder="Paste the JD here to check keyword coverage…"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-y"
            />
            {jdCoverage && (
              <div className="mt-2 space-y-1.5">
                {jdCoverage.missing.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">Missing:</span>
                    {jdCoverage.missing.map(kw => (
                      <span key={kw.key} className="rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-[10.5px] text-red-500">{kw.label}</span>
                    ))}
                  </div>
                )}
                {jdCoverage.matched.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[11px] font-semibold text-slate-400 mr-1">Covered:</span>
                    {jdCoverage.matched.map(kw => (
                      <span key={kw.key} className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10.5px] text-emerald-600">{kw.label}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {rewriteFlag && (
        <BulletRewriteModal
          resumeId={resume.id}
          flag={rewriteFlag}
          resume={resume}
          onClose={() => setRewriteFlag(null)}
          onApplied={onRefresh}
        />
      )}
    </div>
  );
}
