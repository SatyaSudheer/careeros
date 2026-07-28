// JD parsing & matching engine — single source of truth shared by the client
// (AtsScore panel) and the server (job match endpoint). ESM module: the client
// imports it directly; the CJS server loads it via dynamic import().

export const STOPWORDS = new Set(('a an the and or but if then else for of in on at to from by with without as is are was were be been being have has had do does did will would can could should may might must this that these those you your we our they their it its not no yes who whom whose which what when where why how all any both each few more most other some such than too very while just also etc about above after again against because before below between during into over under up down out off own same so only who while role job work team company candidate ideal experience years requirements responsibilities qualifications preferred required strong ability skills including knowledge plus bonus benefits salary equal opportunity employer apply').split(/\s+/));

// Extract the most signal-bearing keywords from a job description.
// Returns [{ key, label }] — key is lowercase for matching, label preserves
// the casing of the first occurrence for display.
export function extractKeywords(jd) {
  const counts = new Map();
  const display = new Map();
  const tokens = String(jd || '').split(/[^A-Za-z0-9+#./-]+/).filter(Boolean);
  for (const raw of tokens) {
    const token = raw.replace(/^[./-]+|[./-]+$/g, '');
    const key = token.toLowerCase();
    if (key.length < 2 || STOPWORDS.has(key) || /^\d+$/.test(key)) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!display.has(key)) display.set(key, token);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([key]) => ({ key, label: display.get(key) }));
}

// Flatten a full resume object into a lowercase text corpus for matching.
export function resumeCorpus(resume) {
  const p = resume.personal || {};
  const parts = [p.full_name, p.tagline, p.subtitle, p.summary];
  (resume.highlights || []).forEach(h => parts.push(h.text));
  (resume.experiences || []).forEach(e => parts.push(e.company, e.title, e.note, ...(e.bullets || [])));
  (resume.education || []).forEach(e => parts.push(e.school, e.degree, e.field, e.details));
  (resume.skills || []).forEach(s => parts.push(s.category, ...(s.items || [])));
  (resume.projects || []).forEach(pr => parts.push(pr.name, pr.description, ...(pr.technologies || [])));
  (resume.certifications || []).forEach(c => parts.push(c.name, c.issuer));
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Match a resume against a JD. Returns null when the JD yields no keywords;
// otherwise { keywords, matched, missing, coverage } with coverage as 0–100.
export function matchResume(jd, resume) {
  const keywords = extractKeywords(jd);
  if (!keywords.length) return null;
  const corpus = resumeCorpus(resume);
  const matched = [], missing = [];
  for (const kw of keywords) {
    const re = new RegExp(`\\b${escapeRegExp(kw.key)}\\b`, 'i');
    (re.test(corpus) ? matched : missing).push(kw);
  }
  return {
    keywords,
    matched,
    missing,
    coverage: Math.round((matched.length / keywords.length) * 100),
  };
}
