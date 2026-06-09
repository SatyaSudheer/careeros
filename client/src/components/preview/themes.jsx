import { Fragment } from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';

// ── Shared tokens ─────────────────────────────────────────────────────────────
const sans  = { fontFamily: "'Aptos', 'Segoe UI', Arial, sans-serif" };
const serif = { fontFamily: "'Aptos', 'Segoe UI', Arial, sans-serif" };

// Inline markdown renderer — supports **bold**, *italic*, ~~strike~~, `code`
function InlineMarkdown({ text }) {
  if (!text) return null;
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|~~([^~]+)~~|`([^`]+)`/g;
  const parts = [];
  let last = 0, key = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if      (m[1] != null) parts.push(<strong key={key++}>{m[1]}</strong>);
    else if (m[2] != null) parts.push(<em key={key++}>{m[2]}</em>);
    else if (m[3] != null) parts.push(<del key={key++}>{m[3]}</del>);
    else if (m[4] != null) parts.push(<code key={key++} style={{ fontFamily: 'monospace', fontSize: '0.9em', background: '#f1f5f9', padding: '0 2px 1px', borderRadius: 2 }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function certYear(s) {
  const m = String(s || '').match(/\b(20\d{2}|19\d{2})\b/);
  return m ? m[1] : '';
}

function ProjectEntry({ proj, nameColor, descColor = '#475569', fontSize = 11.5, lineHeight = 1.5, margin = 0 }) {
  return (
    <p style={{ ...sans, fontSize, lineHeight, color: descColor, margin }}>
      <strong style={{ color: nameColor }}>{proj.name}</strong>
      {proj.description && <>{' '}<InlineMarkdown text={proj.description} /></>}
    </p>
  );
}

function compactBullets(items, max = 4) {
  return (items || []).filter(Boolean).slice(0, max);
}

function groupCerts(certs) {
  const groups = [], map = {};
  for (const c of (certs || [])) {
    const g = (c.cert_group || '').trim();
    if (!g) { groups.push({ label: '', items: [c] }); }
    else if (map[g]) { map[g].items.push(c); }
    else { const e = { label: g, items: [c] }; map[g] = e; groups.push(e); }
  }
  return groups;
}

function CertGroups({ certs, spacers = {}, header, nameColor = '#1e293b', issuerColor = '#64748b', yearColor = '#94a3b8', fontSize = 11.5 }) {
  if (!certs || !certs.length) return null;
  const groups = groupCerts(certs);
  return (
    <>
      {groups.map((grp, gi) => (
        <div key={gi}>
          {spacers[`cert-${gi}`] > 0 && <div style={{ height: spacers[`cert-${gi}`] }} />}
          <div data-block={`cert-${gi}`}>
            {gi === 0 && header}
            <div style={{ ...sans, fontSize, lineHeight: 1.5, color: nameColor }}>
              {grp.label && <strong>{grp.label}: </strong>}
              {grp.items.map((c, ci) => {
                const year = certYear(c.issued_date || c.expiry_date);
                return (
                  <span key={c.id}>
                    {ci > 0 && <span style={{ color: '#94a3b8', padding: '0 5px' }}>—</span>}
                    {c.name}
                    {c.issuer && <span style={{ color: issuerColor }}> · {c.issuer}</span>}
                    {year && <span style={{ color: yearColor }}> · {year}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// Shared sub-components used across multiple themes
function DateLabel({ start, end, current }) {
  const parts = [start, current ? 'Present' : end].filter(Boolean);
  if (!parts.length) return null;
  return (
    <span style={{ ...sans, fontSize: 10.2, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0, paddingLeft: 12 }}>
      {parts.join(' – ')}
    </span>
  );
}

function Bullets({ items, spacers = {}, blockPrefix, dash = false, fontSize = 11.8 }) {
  const filled = (items || []).filter(Boolean);
  if (!filled.length) return null;
  return (
    <ul style={{ marginTop: 5, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      {filled.map((b, i) => {
        const key = blockPrefix ? `${blockPrefix}-bullet-${i}` : undefined;
        return (
          <Fragment key={i}>
            {key && spacers[key] > 0 && <li aria-hidden="true" style={{ height: spacers[key], listStyle: 'none', padding: 0, margin: 0 }} />}
            <li data-block={key} data-atomic="true" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              {dash
                ? <span style={{ ...sans, fontSize: 10, color: '#94a3b8', flexShrink: 0, lineHeight: 1.56 }}>–</span>
                : <span style={{ ...sans, fontSize: 11, color: '#94a3b8', flexShrink: 0, lineHeight: 1.56 }}>•</span>
              }
              <span style={{ ...serif, fontSize, lineHeight: 1.56, color: '#475569' }}><InlineMarkdown text={b} /></span>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASSIC THEME
// ══════════════════════════════════════════════════════════════════════════════

function ClassicSectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: 2 }}>
      <span style={{ ...sans, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
    </div>
  );
}

function urlDisplay(value) {
  return (value || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function ContactItem({ icon: Icon, value }) {
  if (!value) return null;
  const display = urlDisplay(value);
  return (
    <span style={{ ...sans, display: 'inline-flex', alignItems: 'center', gap: 3, color: '#64748b' }}>
      <Icon size={9} style={{ flexShrink: 0, opacity: 0.7 }} />
      <span>{display}</span>
    </span>
  );
}

export function ClassicBody({ resume, spacers = {} }) {
  const p = resume.personal || {}, highlights = resume.highlights || [], exps = resume.experiences || [], edus = resume.education || [], skills = resume.skills || [], projects = resume.projects || [], certs = resume.certifications || [];
  const isEmpty = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h1 style={{ ...sans, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
          {p.full_name || <span style={{ color: '#cbd5e1', fontWeight: 400, fontSize: 18, fontStyle: 'italic' }}>Your Name</span>}
        </h1>
        {p.tagline && <p style={{ ...sans, fontSize: 12.2, color: '#64748b', letterSpacing: '0.02em', margin: '5px 0 0' }}>{p.tagline}</p>}
        {p.subtitle && <p style={{ ...sans, fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{p.subtitle}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '3px 14px', fontSize: 10.2, marginTop: 5 }}>
          <ContactItem icon={Mail} value={p.email} /><ContactItem icon={Phone} value={p.phone} />
          <ContactItem icon={MapPin} value={p.location} /><ContactItem icon={Globe} value={p.website} />
          <ContactItem icon={Linkedin} value={p.linkedin} /><ContactItem icon={Github} value={p.github} />
        </div>
      </div>
      {p.summary && <div style={{ marginBottom: 14 }}><ClassicSectionTitle>Summary</ClassicSectionTitle><p style={{ ...serif, fontSize: 12.2, lineHeight: 1.56, color: '#475569', margin: 0 }}><InlineMarkdown text={p.summary} /></p></div>}
      {highlights.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <ClassicSectionTitle>Career Highlights</ClassicSectionTitle>
          <Bullets items={highlights.map(h => h.text)} spacers={spacers} blockPrefix="highlight" fontSize={12.2} />
        </div>
      )}
      {exps.length > 0 && (
        <div style={{ marginBottom: 14, order: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exps.map((exp, i) => (
              <div key={exp.id}>
                {spacers[`exp-${i}`] > 0 && <div style={{ height: spacers[`exp-${i}`] }} />}
                <div data-block={`exp-${i}`}>
                  {i === 0 && <ClassicSectionTitle>Experience</ClassicSectionTitle>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...sans, fontSize: 12.2, fontWeight: 700, color: '#1e293b', margin: 0 }}>{exp.company}</p>
                      <p style={{ ...serif, fontSize: 11.8, color: '#64748b', fontStyle: 'italic', margin: '1px 0 0' }}>{[exp.title, exp.location].filter(Boolean).join(' · ')}</p>
                    </div>
                    <DateLabel start={exp.start_date} end={exp.end_date} current={exp.current_job} />
                  </div>
                  {exp.note && <p style={{ ...sans, fontSize: 11, fontStyle: 'italic', color: '#64748b', lineHeight: 1.5, margin: '4px 0 2px' }}>{exp.note}</p>}
                  <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`exp-${i}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {edus.length > 0 && (
        <div style={{ marginBottom: 14, order: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {edus.map((edu, i) => (
              <div key={edu.id}>
                {spacers[`edu-${i}`] > 0 && <div style={{ height: spacers[`edu-${i}`] }} />}
                <div data-block={`edu-${i}`}>
                  {i === 0 && <ClassicSectionTitle>Education</ClassicSectionTitle>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ ...sans, fontSize: 12.2, fontWeight: 700, color: '#1e293b', margin: 0 }}>{edu.school}</p>
                      <p style={{ ...serif, fontSize: 11.8, color: '#64748b', margin: '1px 0 0' }}>{[edu.degree, edu.field].filter(Boolean).join(', ')}{edu.gpa && <span style={{ color: '#94a3b8', marginLeft: 8 }}>· GPA {edu.gpa}</span>}</p>
                      {edu.details && <p style={{ ...serif, fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '2px 0 0' }}>{edu.details}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 12 }}>
                      <DateLabel start={edu.start_date} end={edu.end_date} />
                      {edu.location && <p style={{ ...sans, fontSize: 10.2, color: '#94a3b8', margin: '2px 0 0' }}>{edu.location}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {skills.length > 0 && (
        <div style={{ marginBottom: 14, order: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {skills.map((s, i) => (
              <div key={s.id}>
                {spacers[`skill-${i}`] > 0 && <div style={{ height: spacers[`skill-${i}`] }} />}
                <div data-block={`skill-${i}`}>
                  {i === 0 && <ClassicSectionTitle>Skills</ClassicSectionTitle>}
                  <div style={{ display: 'flex', gap: 8, fontSize: 11.8 }}>
                    {s.category && <span style={{ ...sans, fontWeight: 600, color: '#374151', minWidth: 90, flexShrink: 0 }}>{s.category}</span>}
                    <span style={{ ...serif, color: '#475569' }}>{(s.items || []).join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {projects.length > 0 && (
        <div style={{ marginBottom: 14, order: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((proj, i) => (
              <div key={proj.id}>
                {spacers[`proj-${i}`] > 0 && <div style={{ height: spacers[`proj-${i}`] }} />}
                <div data-block={`proj-${i}`}>
                  {i === 0 && <ClassicSectionTitle>Notable Projects</ClassicSectionTitle>}
                  <ProjectEntry proj={proj} nameColor="#1e293b" descColor="#475569" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {certs.length > 0 && (
        <div style={{ marginBottom: 14, order: 50 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <CertGroups certs={certs} spacers={spacers}
              header={<ClassicSectionTitle>Certifications &amp; Training</ClassicSectionTitle>}
              nameColor="#1e293b" issuerColor="#64748b" yearColor="#94a3b8" fontSize={11.5} />
          </div>
        </div>
      )}
      {isEmpty && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}><p style={{ ...sans, fontSize: 12.2, color: '#cbd5e1' }}>Fill in your details on the left →</p></div>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODERN THEME  — left-aligned, strong indigo accents
// ══════════════════════════════════════════════════════════════════════════════

function ModernSection({ children, label, order }) {
  return (
    <div style={{ marginBottom: 12, order }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2, flexShrink: 0 }} />
        <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6366f1' }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
      </div>
      {children}
    </div>
  );
}

export function ModernBody({ resume, spacers = {} }) {
  const p = resume.personal || {}, highlights = resume.highlights || [], exps = resume.experiences || [], edus = resume.education || [], skills = resume.skills || [], projects = resume.projects || [], certs = resume.certifications || [];
  const isEmpty = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;

  const contactLine = [p.email, p.phone, p.location, p.website?.replace(/^https?:\/\//, '')].filter(Boolean);

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 14, borderBottom: '2px solid #6366f1', paddingBottom: 14 }}>
        <h1 style={{ ...sans, fontSize: 23, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {p.full_name || <span style={{ color: '#e0e7ff', fontWeight: 400, fontSize: 18, fontStyle: 'italic' }}>Your Name</span>}
        </h1>
        {p.tagline && <p style={{ ...sans, fontSize: 12.2, fontWeight: 500, color: '#6366f1', margin: '4px 0 0', letterSpacing: '0.01em' }}>{p.tagline}</p>}
        {p.subtitle && <p style={{ ...sans, fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{p.subtitle}</p>}
        {contactLine.length > 0 && (
          <p style={{ ...sans, fontSize: 10, color: '#64748b', margin: '8px 0 0', letterSpacing: '0.02em' }}>
            {contactLine.join('  ·  ')}
            {p.linkedin && <span>  ·  {urlDisplay(p.linkedin)}</span>}
            {p.github && <span>  ·  {urlDisplay(p.github)}</span>}
          </p>
        )}
      </div>

      {p.summary && (
        <ModernSection label="Summary">
          <p style={{ ...serif, fontSize: 12.2, lineHeight: 1.56, color: '#475569', margin: 0 }}><InlineMarkdown text={p.summary} /></p>
        </ModernSection>
      )}

      {highlights.length > 0 && (
        <ModernSection label="Career Highlights">
          <Bullets items={highlights.map(h => h.text)} spacers={spacers} blockPrefix="highlight" fontSize={12.2} />
        </ModernSection>
      )}

      {exps.length > 0 && (
        <div style={{ marginBottom: 12, order: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exps.map((exp, i) => (
              <div key={exp.id}>
                {spacers[`exp-${i}`] > 0 && <div style={{ height: spacers[`exp-${i}`] }} />}
                <div data-block={`exp-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6366f1' }}>Experience</span>
                      <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ ...sans, fontSize: 12.2, fontWeight: 700, color: '#1e293b', margin: 0 }}>{exp.company}</p>
                      <p style={{ ...sans, fontSize: 11.2, color: '#6366f1', fontWeight: 500, margin: '1px 0 0' }}>{[exp.title, exp.location].filter(Boolean).join(' · ')}</p>
                    </div>
                    <DateLabel start={exp.start_date} end={exp.end_date} current={exp.current_job} />
                  </div>
                  {exp.note && <p style={{ ...sans, fontSize: 11, fontStyle: 'italic', color: '#64748b', lineHeight: 1.5, margin: '4px 0 2px' }}>{exp.note}</p>}
                  <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`exp-${i}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {edus.length > 0 && (
        <div style={{ marginBottom: 12, order: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {edus.map((edu, i) => (
              <div key={edu.id}>
                {spacers[`edu-${i}`] > 0 && <div style={{ height: spacers[`edu-${i}`] }} />}
                <div data-block={`edu-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6366f1' }}>Education</span>
                      <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ ...sans, fontSize: 12.2, fontWeight: 700, color: '#1e293b', margin: 0 }}>{edu.school}</p>
                      <p style={{ ...sans, fontSize: 11.2, color: '#6366f1', fontWeight: 500, margin: '1px 0 0' }}>{[edu.degree, edu.field].filter(Boolean).join(', ')}{edu.gpa && <span style={{ color: '#94a3b8', marginLeft: 6 }}>· GPA {edu.gpa}</span>}</p>
                    </div>
                    <DateLabel start={edu.start_date} end={edu.end_date} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div style={{ marginBottom: 12, order: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {skills.map((s, i) => (
              <div key={s.id}>
                {spacers[`skill-${i}`] > 0 && <div style={{ height: spacers[`skill-${i}`] }} />}
                <div data-block={`skill-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6366f1' }}>Skills</span>
                      <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {s.category && <span style={{ ...sans, fontSize: 11, fontWeight: 700, color: '#374151', minWidth: 90, flexShrink: 0, paddingTop: 1 }}>{s.category}</span>}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 6px' }}>
                      {(s.items || []).map(item => (
                        <span key={item} style={{ ...sans, fontSize: 10.2, background: '#eef2ff', color: '#4f46e5', padding: '1px 7px', borderRadius: 99, border: '1px solid #c7d2fe' }}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 12, order: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((proj, i) => (
              <div key={proj.id}>
                {spacers[`proj-${i}`] > 0 && <div style={{ height: spacers[`proj-${i}`] }} />}
                <div data-block={`proj-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6366f1' }}>Notable Projects</span>
                      <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
                    </div>
                  )}
                  <ProjectEntry proj={proj} nameColor="#1e293b" descColor="#475569" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {certs.length > 0 && (
        <div style={{ marginBottom: 12, order: 50 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <CertGroups certs={certs} spacers={spacers}
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#6366f1' }}>Certifications &amp; Training</span>
                  <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
                </div>
              }
              nameColor="#1e293b" issuerColor="#6366f1" yearColor="#94a3b8" fontSize={11.5} />
          </div>
        </div>
      )}
      {isEmpty && <div style={{ textAlign: 'center', paddingTop: 80, color: '#e0e7ff', ...sans, fontSize: 12.2 }}>Fill in your details on the left →</div>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXECUTIVE THEME  — dark header band, bold hierarchy
// ══════════════════════════════════════════════════════════════════════════════

const EXEC_PAD = 44; // must match PAD_X in ResumePreview

function ExecSection({ children, label, order }) {
  return (
    <div style={{ marginBottom: 14, order }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
        <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#1e293b' }}>{label}</span>
        <div style={{ flex: 1, height: 1.5, background: '#1e293b', opacity: 0.15 }} />
      </div>
      {children}
    </div>
  );
}

export function ExecutiveBody({ resume, spacers = {} }) {
  const p = resume.personal || {}, highlights = resume.highlights || [], exps = resume.experiences || [], edus = resume.education || [], skills = resume.skills || [], projects = resume.projects || [], certs = resume.certifications || [];
  const isEmpty = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;

  const contactLine = [p.email, p.phone, p.location,
    p.linkedin && urlDisplay(p.linkedin),
    p.github && urlDisplay(p.github),
  ].filter(Boolean).join('   ·   ');

  return (
    <>
      {/* Dark header — negative margin to bleed full width */}
      <div style={{ margin: `0 -${EXEC_PAD}px 22px`, background: '#1e293b', padding: `22px ${EXEC_PAD}px 18px` }}>
        <h1 style={{ ...sans, fontSize: 23, fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {p.full_name || <span style={{ color: '#475569', fontWeight: 400, fontStyle: 'italic', fontSize: 18 }}>Your Name</span>}
        </h1>
        {p.tagline && <p style={{ ...sans, fontSize: 12.2, color: '#94a3b8', margin: '5px 0 0', fontWeight: 400, letterSpacing: '0.03em' }}>{p.tagline}</p>}
        {p.subtitle && <p style={{ ...sans, fontSize: 11, color: '#64748b', margin: '2px 0 0', letterSpacing: '0.02em' }}>{p.subtitle}</p>}
        {contactLine && <p style={{ ...sans, fontSize: 10, color: '#64748b', margin: '10px 0 0', letterSpacing: '0.04em' }}>{contactLine}</p>}
      </div>

      {p.summary && (
        <ExecSection label="Summary">
          <p style={{ ...serif, fontSize: 12.2, lineHeight: 1.56, color: '#475569', margin: 0 }}><InlineMarkdown text={p.summary} /></p>
        </ExecSection>
      )}

      {highlights.length > 0 && (
        <ExecSection label="Career Highlights">
          <Bullets items={highlights.map(h => h.text)} spacers={spacers} blockPrefix="highlight" fontSize={12.2} />
        </ExecSection>
      )}

      {exps.length > 0 && (
        <div style={{ marginBottom: 14, order: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exps.map((exp, i) => (
              <div key={exp.id}>
                {spacers[`exp-${i}`] > 0 && <div style={{ height: spacers[`exp-${i}`] }} />}
                <div data-block={`exp-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
                      <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#1e293b' }}>Experience</span>
                      <div style={{ flex: 1, height: 1.5, background: '#1e293b', opacity: 0.15 }} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ ...sans, fontSize: 12.2, fontWeight: 700, color: '#0f172a', margin: 0 }}>{exp.company}</p>
                      <p style={{ ...serif, fontSize: 11.8, color: '#64748b', fontStyle: 'italic', margin: '1px 0 0' }}>{[exp.title, exp.location].filter(Boolean).join(' · ')}</p>
                    </div>
                    <DateLabel start={exp.start_date} end={exp.end_date} current={exp.current_job} />
                  </div>
                  {exp.note && <p style={{ ...sans, fontSize: 11, fontStyle: 'italic', color: '#64748b', lineHeight: 1.5, margin: '4px 0 2px' }}>{exp.note}</p>}
                  <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`exp-${i}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {edus.length > 0 && (
        <div style={{ marginBottom: 14, order: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {edus.map((edu, i) => (
              <div key={edu.id}>
                {spacers[`edu-${i}`] > 0 && <div style={{ height: spacers[`edu-${i}`] }} />}
                <div data-block={`edu-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
                      <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#1e293b' }}>Education</span>
                      <div style={{ flex: 1, height: 1.5, background: '#1e293b', opacity: 0.15 }} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ ...sans, fontSize: 12.2, fontWeight: 700, color: '#0f172a', margin: 0 }}>{edu.school}</p>
                      <p style={{ ...serif, fontSize: 11.8, color: '#64748b', margin: '1px 0 0' }}>{[edu.degree, edu.field].filter(Boolean).join(', ')}{edu.gpa && <span style={{ color: '#94a3b8', marginLeft: 8 }}>· GPA {edu.gpa}</span>}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 12 }}>
                      <DateLabel start={edu.start_date} end={edu.end_date} />
                      {edu.location && <p style={{ ...sans, fontSize: 10.2, color: '#94a3b8', margin: '2px 0 0' }}>{edu.location}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div style={{ marginBottom: 14, order: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {skills.map((s, i) => (
              <div key={s.id}>
                {spacers[`skill-${i}`] > 0 && <div style={{ height: spacers[`skill-${i}`] }} />}
                <div data-block={`skill-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}>
                      <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#1e293b' }}>Skills</span>
                      <div style={{ flex: 1, height: 1.5, background: '#1e293b', opacity: 0.15 }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, fontSize: 11.8 }}>
                    {s.category && <span style={{ ...sans, fontWeight: 700, color: '#1e293b', minWidth: 90, flexShrink: 0 }}>{s.category}</span>}
                    <span style={{ ...serif, color: '#475569' }}>{(s.items || []).join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 14, order: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((proj, i) => (
              <div key={proj.id}>
                {spacers[`proj-${i}`] > 0 && <div style={{ height: spacers[`proj-${i}`] }} />}
                <div data-block={`proj-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#1e293b' }}>Notable Projects</span>
                      <div style={{ flex: 1, height: 1.5, background: '#1e293b', opacity: 0.15 }} />
                    </div>
                  )}
                  <ProjectEntry proj={proj} nameColor="#0f172a" descColor="#475569" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {certs.length > 0 && (
        <div style={{ marginBottom: 14, order: 50 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <CertGroups certs={certs} spacers={spacers}
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#1e293b' }}>Certifications &amp; Training</span>
                  <div style={{ flex: 1, height: 1.5, background: '#1e293b', opacity: 0.15 }} />
                </div>
              }
              nameColor="#0f172a" issuerColor="#64748b" yearColor="#94a3b8" fontSize={11.5} />
          </div>
        </div>
      )}
      {isEmpty && <div style={{ textAlign: 'center', paddingTop: 80, color: '#94a3b8', ...sans, fontSize: 12.2 }}>Fill in your details on the left →</div>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MINIMAL THEME  — ultra-clean, whitespace-first
// ══════════════════════════════════════════════════════════════════════════════

function MinimalSection({ children, label, order }) {
  return (
    <div style={{ marginBottom: 14, order }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <p style={{ ...sans, fontSize: 8.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#334155', margin: 0 }}>{label}</p>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>
      {children}
    </div>
  );
}

export function MinimalBody({ resume, spacers = {} }) {
  const p = resume.personal || {}, highlights = resume.highlights || [], exps = resume.experiences || [], edus = resume.education || [], skills = resume.skills || [], projects = resume.projects || [], certs = resume.certifications || [];
  const isEmpty = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;

  const contactParts = [p.email, p.phone, p.location,
    p.website && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github && urlDisplay(p.github)].filter(Boolean);

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 13 }}>
        <h1 style={{ ...sans, fontSize: 23, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.12 }}>
          {p.full_name || <span style={{ color: '#e2e8f0' }}>Your Name</span>}
        </h1>
        {p.tagline && <p style={{ ...sans, fontSize: 12, color: '#334155', margin: '4px 0 0', fontWeight: 600 }}>{p.tagline}</p>}
        {p.subtitle && <p style={{ ...sans, fontSize: 10.8, color: '#64748b', margin: '2px 0 0' }}>{p.subtitle}</p>}
        <div style={{ height: 1, background: '#cbd5e1', margin: '9px 0 6px' }} />
        {contactParts.length > 0 && (
          <p style={{ ...sans, fontSize: 10.2, color: '#475569', margin: 0, letterSpacing: '0.01em', lineHeight: 1.35 }}>{contactParts.join('  ·  ')}</p>
        )}
      </div>

      {p.summary && (
        <MinimalSection label="Profile">
          <p style={{ ...serif, fontSize: 11.8, lineHeight: 1.48, color: '#334155', margin: 0 }}><InlineMarkdown text={p.summary} /></p>
        </MinimalSection>
      )}

      {highlights.length > 0 && (
        <MinimalSection label="Career Highlights">
          <Bullets items={highlights.map(h => h.text)} spacers={spacers} blockPrefix="highlight" dash fontSize={12.2} />
        </MinimalSection>
      )}

      {exps.length > 0 && (
        <div style={{ marginBottom: 14, order: 30 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {exps.map((exp, i) => (
              <div key={exp.id}>
                {spacers[`exp-${i}`] > 0 && <div style={{ height: spacers[`exp-${i}`] }} />}
                <div data-block={`exp-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                      <p style={{ ...sans, fontSize: 8.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#334155', margin: 0 }}>Experience</p>
                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ ...sans, fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{exp.title}</p>
                      <p style={{ ...sans, fontSize: 10.8, color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>{[exp.company, exp.location].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span style={{ ...sans, fontSize: 10.2, color: '#64748b', whiteSpace: 'nowrap', paddingLeft: 12 }}>
                      {[exp.start_date, exp.current_job ? 'Present' : exp.end_date].filter(Boolean).join(' – ')}
                    </span>
                  </div>
                  {exp.note && <p style={{ ...sans, fontSize: 10.8, fontStyle: 'italic', color: '#64748b', lineHeight: 1.45, margin: '4px 0 2px' }}>{exp.note}</p>}
                  <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`exp-${i}`} dash />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {edus.length > 0 && (
        <div style={{ marginBottom: 14, order: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {edus.map((edu, i) => (
              <div key={edu.id}>
                {spacers[`edu-${i}`] > 0 && <div style={{ height: spacers[`edu-${i}`] }} />}
                <div data-block={`edu-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                      <p style={{ ...sans, fontSize: 8.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#334155', margin: 0 }}>Education</p>
                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ ...sans, fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>{edu.school}</p>
                      <p style={{ ...sans, fontSize: 10.8, color: '#64748b', margin: '2px 0 0' }}>{[edu.degree, edu.field].filter(Boolean).join(', ')}{edu.gpa && ` · GPA ${edu.gpa}`}</p>
                    </div>
                    <span style={{ ...sans, fontSize: 10.2, color: '#64748b', whiteSpace: 'nowrap', paddingLeft: 12 }}>
                      {[edu.start_date, edu.end_date].filter(Boolean).join(' – ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div style={{ marginBottom: 14, order: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {skills.map((s, i) => (
              <div key={s.id}>
                {spacers[`skill-${i}`] > 0 && <div style={{ height: spacers[`skill-${i}`] }} />}
                <div data-block={`skill-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                      <p style={{ ...sans, fontSize: 8.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#334155', margin: 0 }}>Skills</p>
                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '108px 1fr', columnGap: 10, alignItems: 'baseline', lineHeight: 1.42 }}>
                    {s.category && <span style={{ ...sans, fontSize: 10, fontWeight: 700, color: '#334155', minWidth: 0 }}>{s.category}</span>}
                    <span style={{ ...sans, fontSize: 11.2, color: '#475569' }}>{(s.items || []).join('  ·  ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 14, order: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((proj, i) => (
              <div key={proj.id}>
                {spacers[`proj-${i}`] > 0 && <div style={{ height: spacers[`proj-${i}`] }} />}
                <div data-block={`proj-${i}`}>
                  {i === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                      <p style={{ ...sans, fontSize: 8.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#334155', margin: 0 }}>Notable Projects</p>
                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    </div>
                  )}
                  <ProjectEntry proj={proj} nameColor="#0f172a" descColor="#475569" fontSize={11.2} lineHeight={1.45} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {certs.length > 0 && (
        <div style={{ marginBottom: 14, order: 50 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <CertGroups certs={certs} spacers={spacers}
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                  <p style={{ ...sans, fontSize: 8.4, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#334155', margin: 0 }}>Certifications</p>
                  <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                </div>
              }
              nameColor="#0f172a" issuerColor="#64748b" yearColor="#64748b" fontSize={11.2} />
          </div>
        </div>
      )}
      {isEmpty && <div style={{ textAlign: 'center', paddingTop: 80, color: '#e2e8f0', ...sans, fontSize: 12.2 }}>Fill in your details on the left →</div>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LEADERSHIP THEME  — ATS-optimized single-column for senior engineering leaders
// ══════════════════════════════════════════════════════════════════════════════

const NAVY     = '#1E3A8A';
const CHARCOAL = '#1F2937';
const MUTED    = '#6B7280';

function LeadershipSectionTitle({ children }) {
  return (
    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>
        {children}
      </span>
    </div>
  );
}

function LeadershipBullets({ items, spacers = {}, blockPrefix, fontSize = 10.5, lineHeight = 1.35, gap = 3 }) {
  const filled = (items || []).filter(Boolean);
  if (!filled.length) return null;
  return (
    <ul style={{ marginTop: 4, listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap }}>
      {filled.map((b, i) => {
        const key = blockPrefix ? `${blockPrefix}-bullet-${i}` : undefined;
        return (
          <Fragment key={i}>
            {key && spacers[key] > 0 && <li aria-hidden="true" style={{ height: spacers[key], listStyle: 'none', padding: 0, margin: 0 }} />}
            <li data-block={key} data-atomic="true" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize, lineHeight, color: CHARCOAL, ...sans }}>
              <span style={{ flexShrink: 0, color: MUTED, fontSize: 10, lineHeight }}>•</span>
              <span><InlineMarkdown text={b} /></span>
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}

export function LeadershipBody({ resume, spacers = {} }) {
  const p          = resume.personal       || {};
  const highlights = resume.highlights     || [];
  const exps       = resume.experiences    || [];
  const edus       = resume.education      || [];
  const skills     = resume.skills         || [];
  const projects   = resume.projects       || [];
  const certs      = resume.certifications || [];
  const isEmpty    = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;
  const recent      = exps.slice(0, 3);
  const prior       = exps.slice(3);

  // Full domain URLs, pipe-separated — ATS-safe (no icons)
  const contactParts = [
    p.email, p.phone, p.location,
    p.website && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github && urlDisplay(p.github),
  ].filter(Boolean);

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ ...sans, fontSize: 22, fontWeight: 700, color: NAVY, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {p.full_name || <span style={{ color: '#d1d5db', fontWeight: 400, fontStyle: 'italic', fontSize: 18 }}>Your Name</span>}
        </h1>
        {p.tagline && (
          <p style={{ ...sans, fontSize: 12, fontWeight: 500, color: CHARCOAL, margin: '4px 0 0', letterSpacing: '0.01em' }}>
            {p.tagline}
          </p>
        )}
        {p.subtitle && (
          <p style={{ ...sans, fontSize: 11, color: MUTED, margin: '2px 0 0' }}>
            {p.subtitle}
          </p>
        )}
        {contactParts.length > 0 && (
          <p style={{ ...sans, fontSize: 10, color: CHARCOAL, margin: '5px 0 0', lineHeight: 1.35 }}>
            {contactParts.join('  |  ')}
          </p>
        )}
      </div>

      {/* Summary */}
      {p.summary && (
        <div style={{ marginBottom: 12 }}>
          <LeadershipSectionTitle>Summary</LeadershipSectionTitle>
          <p style={{ ...sans, fontSize: 10.5, lineHeight: 1.45, color: CHARCOAL, margin: '6px 0 0' }}><InlineMarkdown text={p.summary} /></p>
        </div>
      )}

      {/* Career Highlights */}
      {highlights.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <LeadershipSectionTitle>Career Highlights</LeadershipSectionTitle>
          <LeadershipBullets items={highlights.map(h => h.text)} spacers={spacers} blockPrefix="highlight" />
        </div>
      )}

      {/* Skills — BEFORE Experience for leadership candidates */}
      {skills.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {skills.map((s, i) => (
              <div key={s.id}>
                {spacers[`skill-${i}`] > 0 && <div style={{ height: spacers[`skill-${i}`] }} />}
                <div data-block={`skill-${i}`}>
                  {i === 0 && (
                    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Core Competencies</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '128px 1fr', columnGap: 8, alignItems: 'baseline', fontSize: 10.2, lineHeight: 1.32, color: CHARCOAL }}>
                    {s.category && (
                      <span style={{ ...sans, fontWeight: 700, minWidth: 0 }}>
                        {s.category}:
                      </span>
                    )}
                    <span style={{ ...sans }}>{(s.items || []).join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Professional Experience */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            {recent.map((exp, i) => (
              <div key={exp.id}>
                {spacers[`exp-${i}`] > 0 && <div style={{ height: spacers[`exp-${i}`] }} />}
                <div data-block={`exp-${i}`}>
                  {i === 0 && (
                    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Professional Experience</span>
                    </div>
                  )}
                  <p style={{ ...sans, fontSize: 11, margin: 0, color: CHARCOAL }}>
                    <strong style={{ fontWeight: 700 }}>{exp.title}</strong>
                    {exp.title && exp.company && <span style={{ color: MUTED, margin: '0 5px' }}>·</span>}
                    <span style={{ fontWeight: 400 }}>{exp.company}</span>
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 1 }}>
                    <span style={{ ...sans, fontSize: 10, color: MUTED }}>{exp.location || ''}</span>
                    <span style={{ ...sans, fontSize: 10, color: MUTED, flexShrink: 0 }}>
                      {[exp.start_date, exp.current_job ? 'Present' : exp.end_date].filter(Boolean).join(' – ')}
                    </span>
                  </div>
                  {exp.note && <p style={{ ...sans, fontSize: 11, fontStyle: 'italic', color: MUTED, lineHeight: 1.5, margin: '4px 0 2px' }}>{exp.note}</p>}
                  <LeadershipBullets items={compactBullets(exp.bullets)} spacers={spacers} blockPrefix={`exp-${i}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earlier Career */}
      {prior.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {prior.map((exp, i) => {
              const idx = i + recent.length;
              return (
                <div key={exp.id}>
                  {spacers[`exp-${idx}`] > 0 && <div style={{ height: spacers[`exp-${idx}`] }} />}
                  <div data-block={`exp-${idx}`}>
                    {i === 0 && (
                      <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                        <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Earlier Career</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                      <span style={{ ...sans, fontSize: 10.5, lineHeight: 1.32, color: CHARCOAL }}>
                        <strong style={{ fontWeight: 600 }}>{exp.title}</strong>
                        {exp.company && <span style={{ color: MUTED }}> · {exp.company}</span>}
                        {exp.location && <span style={{ color: MUTED }}>, {exp.location}</span>}
                      </span>
                      <span style={{ ...sans, fontSize: 10, color: MUTED, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {[exp.start_date, exp.current_job ? 'Present' : exp.end_date].filter(Boolean).join(' – ')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notable Projects */}
      {projects.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
            {projects.map((proj, i) => (
              <div key={proj.id}>
                {spacers[`proj-${i}`] > 0 && <div style={{ height: spacers[`proj-${i}`] }} />}
                <div data-block={`proj-${i}`}>
                  {i === 0 && (
                    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Notable Projects</span>
                    </div>
                  )}
                  <ProjectEntry proj={proj} nameColor={CHARCOAL} descColor={CHARCOAL} fontSize={10} lineHeight={1.28} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education — last section */}
      {edus.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {edus.map((edu, i) => (
              <div key={edu.id}>
                {spacers[`edu-${i}`] > 0 && <div style={{ height: spacers[`edu-${i}`] }} />}
                <div data-block={`edu-${i}`}>
                  {i === 0 && (
                    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Education</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ ...sans, fontSize: 11, fontWeight: 700, color: CHARCOAL, margin: 0 }}>{edu.school}</p>
                      <p style={{ ...sans, fontSize: 10.5, color: CHARCOAL, fontWeight: 400, margin: '1px 0 0' }}>
                        {[edu.degree, edu.field].filter(Boolean).join(', ')}
                        {edu.gpa && <span style={{ color: MUTED, marginLeft: 8 }}>· GPA {edu.gpa}</span>}
                      </p>
                      {edu.details && <p style={{ ...sans, fontSize: 10, color: MUTED, margin: '2px 0 0' }}>{edu.details}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 12 }}>
                      <span style={{ ...sans, fontSize: 10, color: MUTED, whiteSpace: 'nowrap' }}>
                        {[edu.start_date, edu.end_date].filter(Boolean).join(' – ')}
                      </span>
                      {edu.location && <p style={{ ...sans, fontSize: 10, color: MUTED, margin: '2px 0 0' }}>{edu.location}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications — after Education */}
      {certs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            <CertGroups certs={certs} spacers={spacers}
              header={
                <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                  <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>
                    Certifications &amp; Training
                  </span>
                </div>
              }
              nameColor={CHARCOAL} issuerColor={MUTED} yearColor={MUTED} fontSize={11} />
          </div>
        </div>
      )}

      {isEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
          <p style={{ ...sans, fontSize: 12.2, color: '#d1d5db' }}>Fill in your details on the left →</p>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPACT THEME — Leadership-style; top 3 experiences full, rest condensed
// ══════════════════════════════════════════════════════════════════════════════

export function CompactBody({ resume, spacers = {} }) {
  const p          = resume.personal       || {};
  const highlights = resume.highlights     || [];
  const exps       = resume.experiences    || [];
  const edus       = resume.education      || [];
  const skills     = resume.skills         || [];
  const projects   = resume.projects       || [];
  const certs      = resume.certifications || [];
  const isEmpty    = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;

  // First 3 (display order = most recent first) get full bullets; rest condensed
  const recent = exps.slice(0, 3);
  const prior  = exps.slice(3);

  const contactParts = [
    p.email, p.phone, p.location,
    p.website  && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <h1 style={{ ...sans, fontSize: 22, fontWeight: 700, color: NAVY, margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {p.full_name || <span style={{ color: '#d1d5db', fontWeight: 400, fontStyle: 'italic', fontSize: 18 }}>Your Name</span>}
        </h1>
        {p.tagline  && <p style={{ ...sans, fontSize: 12,   fontWeight: 500, color: CHARCOAL, margin: '4px 0 0' }}>{p.tagline}</p>}
        {p.subtitle && <p style={{ ...sans, fontSize: 11,   color: MUTED,    margin: '2px 0 0' }}>{p.subtitle}</p>}
        {contactParts.length > 0 && (
          <p style={{ ...sans, fontSize: 10, color: CHARCOAL, margin: '5px 0 0', lineHeight: 1.35 }}>
            {contactParts.join('  |  ')}
          </p>
        )}
      </div>

      {/* Summary */}
      {p.summary && (
        <div style={{ marginBottom: 12 }}>
          <LeadershipSectionTitle>Summary</LeadershipSectionTitle>
          <p style={{ ...sans, fontSize: 10.5, lineHeight: 1.45, color: CHARCOAL, margin: '6px 0 0' }}><InlineMarkdown text={p.summary} /></p>
        </div>
      )}

      {/* Career Highlights */}
      {highlights.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <LeadershipSectionTitle>Career Highlights</LeadershipSectionTitle>
          <LeadershipBullets items={highlights.map(h => h.text)} spacers={spacers} blockPrefix="highlight" />
        </div>
      )}

      {/* Core Competencies */}
      {skills.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {skills.map((s, i) => (
              <div key={s.id}>
                {spacers[`skill-${i}`] > 0 && <div style={{ height: spacers[`skill-${i}`] }} />}
                <div data-block={`skill-${i}`}>
                  {i === 0 && (
                    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Core Competencies</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '128px 1fr', columnGap: 8, alignItems: 'baseline', fontSize: 10.2, lineHeight: 1.32, color: CHARCOAL }}>
                    {s.category && <span style={{ ...sans, fontWeight: 700, minWidth: 0 }}>{s.category}:</span>}
                    <span style={{ ...sans }}>{(s.items || []).join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Professional Experience — top 3 with full bullets */}
      {recent.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            {recent.map((exp, i) => (
              <div key={exp.id}>
                {spacers[`exp-${i}`] > 0 && <div style={{ height: spacers[`exp-${i}`] }} />}
                <div data-block={`exp-${i}`}>
                  {i === 0 && (
                    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Professional Experience</span>
                    </div>
                  )}
                  <p style={{ ...sans, fontSize: 11, margin: 0, color: CHARCOAL }}>
                    <strong style={{ fontWeight: 700 }}>{exp.title}</strong>
                    {exp.title && exp.company && <span style={{ color: MUTED, margin: '0 5px' }}>·</span>}
                    <span style={{ fontWeight: 400 }}>{exp.company}</span>
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 1 }}>
                    <span style={{ ...sans, fontSize: 10, color: MUTED }}>{exp.location || ''}</span>
                    <span style={{ ...sans, fontSize: 10, color: MUTED, flexShrink: 0 }}>
                      {[exp.start_date, exp.current_job ? 'Present' : exp.end_date].filter(Boolean).join(' – ')}
                    </span>
                  </div>
                  {exp.note && <p style={{ ...sans, fontSize: 11, fontStyle: 'italic', color: MUTED, lineHeight: 1.5, margin: '4px 0 2px' }}>{exp.note}</p>}
                  <LeadershipBullets items={compactBullets(exp.bullets)} spacers={spacers} blockPrefix={`exp-${i}`} fontSize={10.2} lineHeight={1.3} gap={2} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earlier Career — condensed one-liners */}
      {prior.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {prior.map((exp, i) => (
              <div key={exp.id}>
                {spacers[`prior-${i}`] > 0 && <div style={{ height: spacers[`prior-${i}`] }} />}
                <div data-block={`prior-${i}`}>
                  {i === 0 && (
                    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 7, marginTop: 2 }}>
                      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Earlier Career</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ ...sans, fontSize: 10.5, color: CHARCOAL, lineHeight: 1.4 }}>
                      <strong style={{ fontWeight: 600 }}>{exp.title}</strong>
                      {exp.company  && <span style={{ color: MUTED }}> · {exp.company}</span>}
                      {exp.location && <span style={{ color: MUTED }}>, {exp.location}</span>}
                    </span>
                    <span style={{ ...sans, fontSize: 10, color: MUTED, flexShrink: 0, paddingLeft: 12, whiteSpace: 'nowrap' }}>
                      {[exp.start_date, exp.current_job ? 'Present' : exp.end_date].filter(Boolean).join(' – ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notable Projects */}
      {projects.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
            {projects.map((proj, i) => (
              <div key={proj.id}>
                {spacers[`proj-${i}`] > 0 && <div style={{ height: spacers[`proj-${i}`] }} />}
                <div data-block={`proj-${i}`}>
                  {i === 0 && (
                    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Notable Projects</span>
                    </div>
                  )}
                  <ProjectEntry proj={proj} nameColor={CHARCOAL} descColor={CHARCOAL} fontSize={10} lineHeight={1.28} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {edus.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {edus.map((edu, i) => (
              <div key={edu.id}>
                {spacers[`edu-${i}`] > 0 && <div style={{ height: spacers[`edu-${i}`] }} />}
                <div data-block={`edu-${i}`}>
                  {i === 0 && (
                    <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                      <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>Education</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ ...sans, fontSize: 11, fontWeight: 700, color: CHARCOAL, margin: 0 }}>{edu.school}</p>
                      <p style={{ ...sans, fontSize: 10.5, color: CHARCOAL, fontWeight: 400, margin: '1px 0 0' }}>
                        {[edu.degree, edu.field].filter(Boolean).join(', ')}
                        {edu.gpa && <span style={{ color: MUTED, marginLeft: 8 }}>· GPA {edu.gpa}</span>}
                      </p>
                      {edu.details && <p style={{ ...sans, fontSize: 10, color: MUTED, margin: '2px 0 0' }}>{edu.details}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 12 }}>
                      <span style={{ ...sans, fontSize: 10, color: MUTED, whiteSpace: 'nowrap' }}>
                        {[edu.start_date, edu.end_date].filter(Boolean).join(' – ')}
                      </span>
                      {edu.location && <p style={{ ...sans, fontSize: 10, color: MUTED, margin: '2px 0 0' }}>{edu.location}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            <CertGroups certs={certs} spacers={spacers}
              header={
                <div style={{ borderBottom: `0.5px solid ${NAVY}`, paddingBottom: 3, marginBottom: 8, marginTop: 2 }}>
                  <span style={{ ...sans, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: NAVY }}>
                    Certifications &amp; Training
                  </span>
                </div>
              }
              nameColor={CHARCOAL} issuerColor={MUTED} yearColor={MUTED} fontSize={11} />
          </div>
        </div>
      )}

      {isEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
          <p style={{ ...sans, fontSize: 12.2, color: '#d1d5db' }}>Fill in your details on the left →</p>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LUXE THEME  — rich gradient header + per-page background graphics
// ══════════════════════════════════════════════════════════════════════════════

const LUXE_PAD = 44; // must match PAD_X in ResumePreview

function LuxeSectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 2 }}>
      <span style={{ color: '#6366f1', fontSize: 9, lineHeight: 1, flexShrink: 0 }}>◆</span>
      <span style={{ ...sans, fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#6366f1', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: '#e0e7ff' }} />
    </div>
  );
}

export function LuxePageBg({ accentColor }) {
  const c = accentColor || '#6366f1';
  const dotsTR = [];
  const dotsBL = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      dotsTR.push(
        <circle key={`tr-${row}-${col}`} cx={666 + col * 22} cy={190 + row * 20} r="1.8" fill={c} fillOpacity="0.28" />
      );
    }
  }
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      dotsBL.push(
        <circle key={`bl-${row}-${col}`} cx={12 + col * 10} cy={876 + row * 22} r="1.4" fill={c} fillOpacity="0.22" />
      );
    }
  }
  return (
    <svg width={816} height={1056} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} aria-hidden="true">
      {/* Left accent strip */}
      <rect x="0" y="0" width="5" height="1056" fill={c} />
      {/* Top-right decorative circles */}
      <circle cx="800" cy="20"   r="200" fill={c} fillOpacity="0.05" />
      <circle cx="816" cy="160"  r="130" fill={c} fillOpacity="0.04" />
      <circle cx="680" cy="60"   r="90"  fill={c} fillOpacity="0.03" />
      {/* Bottom-left decorative circles */}
      <circle cx="30"  cy="1040" r="180" fill={c} fillOpacity="0.04" />
      <circle cx="160" cy="1056" r="110" fill={c} fillOpacity="0.03" />
      {/* Dot grids */}
      {dotsTR}
      {dotsBL}
      {/* Bottom-right corner triangles */}
      <polygon points="816,1056 816,992 752,1056" fill={c} fillOpacity="0.06" />
      <polygon points="816,1056 816,1024 784,1056" fill={c} fillOpacity="0.09" />
      {/* Top-left corner accent */}
      <polygon points="5,0 5,48 44,0" fill={c} fillOpacity="0.14" />
    </svg>
  );
}

export function LuxeBody({ resume, spacers = {} }) {
  const p        = resume.personal       || {};
  const highlights = resume.highlights   || [];
  const exps     = resume.experiences    || [];
  const edus     = resume.education      || [];
  const skills   = resume.skills         || [];
  const projects = resume.projects       || [];
  const certs    = resume.certifications || [];
  const isEmpty  = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;

  const contactItems = [
    { icon: Mail,     value: p.email    },
    { icon: Phone,    value: p.phone    },
    { icon: MapPin,   value: p.location },
    { icon: Globe,    value: p.website  },
    { icon: Linkedin, value: p.linkedin },
    { icon: Github,   value: p.github   },
  ].filter(x => x.value);

  const headerDots = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      headerDots.push(
        <circle key={`hd-${row}-${col}`} cx={160 + col * 22} cy={20 + row * 18} r="2" fill="white" fillOpacity="0.7" />
      );
    }
  }

  return (
    <>
      {/* Full-bleed gradient header with SVG decorations */}
      <div style={{
        margin: `0 -${LUXE_PAD}px 20px`,
        padding: `22px ${LUXE_PAD}px 20px`,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a8a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <svg width="400" height="120" style={{ position: 'absolute', top: 0, right: 0, opacity: 0.15, pointerEvents: 'none' }} aria-hidden="true">
          <circle cx="350" cy="0"   r="140" fill="white" />
          <circle cx="400" cy="90"  r="90"  fill="white" />
          <circle cx="240" cy="-20" r="80"  fill="white" />
          {headerDots}
        </svg>
        <h1 style={{ ...sans, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc', margin: 0, lineHeight: 1.15, position: 'relative' }}>
          {p.full_name || <span style={{ color: 'rgba(248,250,252,0.3)', fontWeight: 400, fontSize: 18, fontStyle: 'italic' }}>Your Name</span>}
        </h1>
        {p.tagline && (
          <p style={{ ...sans, fontSize: 12.2, color: '#a5b4fc', fontWeight: 500, margin: '5px 0 0', position: 'relative' }}>{p.tagline}</p>
        )}
        {p.subtitle && (
          <p style={{ ...sans, fontSize: 11, color: '#c7d2fe', margin: '2px 0 0', position: 'relative' }}>{p.subtitle}</p>
        )}
        {contactItems.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px', marginTop: 8, position: 'relative' }}>
            {contactItems.map(({ icon: Icon, value }, idx) => (
              <span key={idx} style={{ ...sans, fontSize: 10.2, display: 'inline-flex', alignItems: 'center', gap: 3, color: '#94a3b8' }}>
                <Icon size={9} style={{ flexShrink: 0, opacity: 0.7 }} />
                <span>{urlDisplay(value)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {p.summary && (
        <div style={{ marginBottom: 14 }}>
          {spacers['summary'] > 0 && <div style={{ height: spacers['summary'] }} />}
          <div data-block="summary">
            <LuxeSectionTitle>Summary</LuxeSectionTitle>
            <p style={{ ...sans, fontSize: 12.2, lineHeight: 1.56, color: '#475569', margin: 0 }}><InlineMarkdown text={p.summary} /></p>
          </div>
        </div>
      )}

      {highlights.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {highlights.map((h, i) => (
              <Fragment key={i}>
                {spacers[`highlight-${i}`] > 0 && <li aria-hidden="true" style={{ height: spacers[`highlight-${i}`], listStyle: 'none', padding: 0, margin: 0 }} />}
                <li data-block={`highlight-${i}`} data-atomic="true" style={{ listStyle: 'none' }}>
                  {i === 0 && <LuxeSectionTitle>Career Highlights</LuxeSectionTitle>}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ ...sans, fontSize: 11, color: '#94a3b8', flexShrink: 0, lineHeight: 1.56 }}>•</span>
                    <span style={{ ...sans, fontSize: 12.2, lineHeight: 1.56, color: '#475569' }}><InlineMarkdown text={h.text} /></span>
                  </div>
                </li>
              </Fragment>
            ))}
          </ul>
        </div>
      )}

      {exps.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exps.map((exp, i) => (
              <div key={exp.id}>
                {spacers[`exp-${i}`] > 0 && <div style={{ height: spacers[`exp-${i}`] }} />}
                <div data-block={`exp-${i}`}>
                  {i === 0 && <LuxeSectionTitle>Experience</LuxeSectionTitle>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...sans, fontSize: 12.2, fontWeight: 700, color: '#1e293b', margin: 0 }}>{exp.company}</p>
                      <p style={{ ...sans, fontSize: 11.8, color: '#6366f1', fontStyle: 'italic', margin: '1px 0 0' }}>
                        {[exp.title, exp.location].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <DateLabel start={exp.start_date} end={exp.end_date} current={exp.current_job} />
                  </div>
                  {exp.note && <p style={{ ...sans, fontSize: 11, fontStyle: 'italic', color: '#64748b', lineHeight: 1.5, margin: '4px 0 2px' }}>{exp.note}</p>}
                  <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`exp-${i}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {edus.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {edus.map((edu, i) => (
              <div key={edu.id}>
                {spacers[`edu-${i}`] > 0 && <div style={{ height: spacers[`edu-${i}`] }} />}
                <div data-block={`edu-${i}`} data-atomic="true">
                  {i === 0 && <LuxeSectionTitle>Education</LuxeSectionTitle>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ ...sans, fontSize: 12.2, fontWeight: 700, color: '#1e293b', margin: 0 }}>{edu.school}</p>
                      <p style={{ ...sans, fontSize: 11.8, color: '#64748b', margin: '1px 0 0' }}>
                        {[edu.degree, edu.field].filter(Boolean).join(', ')}
                        {edu.gpa && <span style={{ color: '#94a3b8', marginLeft: 8 }}>· GPA {edu.gpa}</span>}
                      </p>
                      {edu.details && <p style={{ ...sans, fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '2px 0 0' }}>{edu.details}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 12 }}>
                      <DateLabel start={edu.start_date} end={edu.end_date} />
                      {edu.location && <p style={{ ...sans, fontSize: 10.2, color: '#94a3b8', margin: '2px 0 0' }}>{edu.location}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {skills.map((s, i) => (
              <div key={s.id || i}>
                {spacers[`skill-${i}`] > 0 && <div style={{ height: spacers[`skill-${i}`] }} />}
                <div data-block={`skill-${i}`}>
                  {i === 0 && <LuxeSectionTitle>Skills</LuxeSectionTitle>}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {s.category && (
                      <span style={{ ...sans, fontSize: 11, fontWeight: 700, color: '#374151', minWidth: 90, flexShrink: 0, paddingTop: 1 }}>
                        {s.category}
                      </span>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 6px' }}>
                      {(s.items || []).map((item, j) => (
                        <span key={j} style={{ ...sans, fontSize: 10.2, background: '#eef2ff', color: '#4f46e5', padding: '1px 7px', borderRadius: 99, border: '1px solid #c7d2fe' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {projects.map((proj, i) => (
            <div key={proj.id || i}>
              {spacers[`proj-${i}`] > 0 && <div style={{ height: spacers[`proj-${i}`] }} />}
              <div data-block={`proj-${i}`}>
                {i === 0 && <LuxeSectionTitle>Notable Projects</LuxeSectionTitle>}
                <ProjectEntry proj={proj} nameColor="#4f46e5" margin="0 0 8px" />
              </div>
            </div>
          ))}
        </div>
      )}

      {certs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <CertGroups
              certs={certs}
              spacers={spacers}
              header={<LuxeSectionTitle>Certifications &amp; Training</LuxeSectionTitle>}
              nameColor="#1e293b"
              issuerColor="#6366f1"
              yearColor="#94a3b8"
              fontSize={11.5}
            />
          </div>
        </div>
      )}

      {isEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
          <p style={{ ...sans, fontSize: 12.2, color: '#d1d5db' }}>Fill in your details on the left →</p>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRESTIGE THEME  — editorial / consulting style, typography-first
// ══════════════════════════════════════════════════════════════════════════════

function PrestigeSectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6, marginBottom: 10, marginTop: 2, borderBottom: '1.5px solid #6366f1' }}>
      <div style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 1, flexShrink: 0 }} />
      <span style={{ ...sans, fontSize: 7.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: '#6366f1' }}>
        {children}
      </span>
    </div>
  );
}

export function PrestigePageBg({ accentColor }) {
  const c = accentColor || '#6366f1';
  const squaresTR = [];
  const squaresBL = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      squaresTR.push(
        <rect key={`sq-${row}-${col}`} x={672 + col * 18} y={28 + row * 18} width="9" height="9" fill={c} fillOpacity={0.07 + row * 0.015} rx="1.5" />
      );
    }
  }
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      squaresBL.push(
        <rect key={`sqb-${row}-${col}`} x={16 + col * 18} y={952 + row * 18} width="9" height="9" fill={c} fillOpacity="0.07" rx="1.5" />
      );
    }
  }
  return (
    <svg width={816} height={1056} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} aria-hidden="true">
      {/* Top accent strip */}
      <rect x="0" y="0" width="816" height="4" fill={c} />
      {/* Right accent strip */}
      <rect x="812" y="0" width="4" height="1056" fill={c} />
      {/* Corner squares */}
      <rect x="0"   y="0"    width="12" height="12" fill={c} />
      <rect x="804" y="0"    width="12" height="12" fill={c} />
      <rect x="0"   y="1044" width="12" height="12" fill={c} fillOpacity="0.35" />
      <rect x="804" y="1044" width="12" height="12" fill={c} fillOpacity="0.35" />
      {/* Structured square grids */}
      {squaresTR}
      {squaresBL}
    </svg>
  );
}

export function PrestigeBody({ resume, spacers = {} }) {
  const p          = resume.personal       || {};
  const highlights = resume.highlights     || [];
  const exps       = resume.experiences    || [];
  const edus       = resume.education      || [];
  const skills     = resume.skills         || [];
  const projects   = resume.projects       || [];
  const certs      = resume.certifications || [];
  const isEmpty    = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;

  const contactParts = [
    p.email,
    p.phone,
    p.location,
    p.website  && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  return (
    <>
      {/* Typography-led header — no bleed, no dark background */}
      <div style={{ paddingTop: 22, paddingBottom: 18, marginBottom: 16, borderBottom: '1.5px solid #e2e8f0' }}>
        <h1 style={{ ...sans, fontSize: 26, fontWeight: 900, letterSpacing: '-0.025em', color: '#0f172a', margin: 0, lineHeight: 1.1 }}>
          {p.full_name || <span style={{ color: '#cbd5e1', fontWeight: 400, fontSize: 18, fontStyle: 'italic' }}>Your Name</span>}
        </h1>
        {p.tagline && (
          <p style={{ ...sans, fontSize: 12.5, fontWeight: 600, color: '#64748b', margin: '7px 0 0', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            {p.tagline}
          </p>
        )}
        {p.subtitle && (
          <p style={{ ...sans, fontSize: 11, color: '#94a3b8', margin: '3px 0 0', letterSpacing: '0.02em' }}>
            {p.subtitle}
          </p>
        )}
        {contactParts.length > 0 && (
          <p style={{ ...sans, fontSize: 10, color: '#64748b', margin: '10px 0 0', lineHeight: 1.5 }}>
            {contactParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: '#d1d5db', margin: '0 7px' }}>|</span>}
                {part}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* Summary */}
      {p.summary && (
        <div style={{ marginBottom: 14 }}>
          {spacers['psummary'] > 0 && <div style={{ height: spacers['psummary'] }} />}
          <div data-block="psummary">
            <PrestigeSectionTitle>Summary</PrestigeSectionTitle>
            <p style={{ ...sans, fontSize: 12, lineHeight: 1.62, color: '#374151', margin: 0 }}>
              <InlineMarkdown text={p.summary} />
            </p>
          </div>
        </div>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {highlights.map((h, i) => (
              <Fragment key={i}>
                {spacers[`phighlight-${i}`] > 0 && <li aria-hidden="true" style={{ height: spacers[`phighlight-${i}`], listStyle: 'none', padding: 0, margin: 0 }} />}
                <li data-block={`phighlight-${i}`} data-atomic="true" style={{ listStyle: 'none' }}>
                  {i === 0 && <PrestigeSectionTitle>Career Highlights</PrestigeSectionTitle>}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ ...sans, fontSize: 10, color: '#94a3b8', flexShrink: 0, lineHeight: 1.62 }}>•</span>
                    <span style={{ ...sans, fontSize: 12, lineHeight: 1.62, color: '#374151' }}><InlineMarkdown text={h.text} /></span>
                  </div>
                </li>
              </Fragment>
            ))}
          </ul>
        </div>
      )}

      {/* Experience */}
      {exps.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exps.map((exp, i) => (
              <div key={exp.id}>
                {spacers[`pexp-${i}`] > 0 && <div style={{ height: spacers[`pexp-${i}`] }} />}
                <div data-block={`pexp-${i}`}>
                  {i === 0 && <PrestigeSectionTitle>Experience</PrestigeSectionTitle>}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...sans, fontSize: 12.5, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>{exp.company}</p>
                      <p style={{ ...sans, fontSize: 11.5, fontWeight: 500, color: '#6366f1', fontStyle: 'italic', margin: '1px 0 0' }}>
                        {[exp.title, exp.location].filter(Boolean).join('  ·  ')}
                      </p>
                    </div>
                    <DateLabel start={exp.start_date} end={exp.end_date} current={exp.current_job} />
                  </div>
                  {exp.note && <p style={{ ...sans, fontSize: 11, fontStyle: 'italic', color: '#64748b', lineHeight: 1.5, margin: '4px 0 2px' }}>{exp.note}</p>}
                  <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`pexp-${i}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {edus.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {edus.map((edu, i) => (
              <div key={edu.id}>
                {spacers[`pedu-${i}`] > 0 && <div style={{ height: spacers[`pedu-${i}`] }} />}
                <div data-block={`pedu-${i}`} data-atomic="true">
                  {i === 0 && <PrestigeSectionTitle>Education</PrestigeSectionTitle>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ ...sans, fontSize: 12.5, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>{edu.school}</p>
                      <p style={{ ...sans, fontSize: 11.5, fontWeight: 400, color: '#475569', margin: '1px 0 0' }}>
                        {[edu.degree, edu.field].filter(Boolean).join(', ')}
                        {edu.gpa && <span style={{ color: '#94a3b8', marginLeft: 8 }}>· GPA {edu.gpa}</span>}
                      </p>
                      {edu.details && <p style={{ ...sans, fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '2px 0 0' }}>{edu.details}</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 12 }}>
                      <DateLabel start={edu.start_date} end={edu.end_date} />
                      {edu.location && <p style={{ ...sans, fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>{edu.location}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills — outlined chips, uppercase category labels */}
      {skills.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {skills.map((s, i) => (
              <div key={s.id || i}>
                {spacers[`pskill-${i}`] > 0 && <div style={{ height: spacers[`pskill-${i}`] }} />}
                <div data-block={`pskill-${i}`}>
                  {i === 0 && <PrestigeSectionTitle>Skills</PrestigeSectionTitle>}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    {s.category && (
                      <span style={{ ...sans, fontSize: 10, fontWeight: 800, color: '#374151', minWidth: 90, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: 2 }}>
                        {s.category}
                      </span>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px' }}>
                      {(s.items || []).map((item, j) => (
                        <span key={j} style={{ ...sans, fontSize: 10.2, color: '#4f46e5', padding: '2px 8px', borderRadius: 3, border: '1px solid #6366f1' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {projects.map((proj, i) => (
            <div key={proj.id || i}>
              {spacers[`pproj-${i}`] > 0 && <div style={{ height: spacers[`pproj-${i}`] }} />}
              <div data-block={`pproj-${i}`}>
                {i === 0 && <PrestigeSectionTitle>Notable Projects</PrestigeSectionTitle>}
                <ProjectEntry proj={proj} nameColor="#4f46e5" margin="0 0 8px" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {certs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <CertGroups
              certs={certs}
              spacers={spacers}
              header={<PrestigeSectionTitle>Certifications &amp; Training</PrestigeSectionTitle>}
              nameColor="#1e293b"
              issuerColor="#6366f1"
              yearColor="#94a3b8"
              fontSize={11.5}
            />
          </div>
        </div>
      )}

      {isEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
          <p style={{ ...sans, fontSize: 12.2, color: '#d1d5db' }}>Fill in your details on the left →</p>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FOLIO THEME  — two-column sidebar with decorative watermark initial
// ══════════════════════════════════════════════════════════════════════════════

const FOLIO_L = 230; // left column width (px in content area)
const FOLIO_G = 28;  // column gap

function FolioSidebarTitle({ children }) {
  return (
    <div style={{ marginTop: 18, marginBottom: 8 }}>
      <span style={{ ...sans, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.13em', color: '#6366f1', display: 'block', paddingBottom: 5, borderBottom: '1px solid rgba(99,102,241,0.25)' }}>
        {children}
      </span>
    </div>
  );
}

function FolioContentTitle({ children }) {
  return (
    <div style={{ marginBottom: 12, marginTop: 2, paddingBottom: 6, borderBottom: '1.5px solid #e2e8f0' }}>
      <span style={{ ...sans, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#334155' }}>
        {children}
      </span>
    </div>
  );
}

export function FolioPageBg({ accentColor }) {
  const c  = accentColor || '#6366f1';
  const sw = 44 + FOLIO_L; // sidebar right edge in page-card coords (44px left pad + 230px col)
  return (
    <svg width={816} height={1056} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} aria-hidden="true">
      <rect x="0" y="0" width={sw} height="1056" fill={c} fillOpacity="0.08" />
      <rect x={sw - 0.75} y="0" width="1.5" height="1056" fill={c} fillOpacity="0.18" />
    </svg>
  );
}

export function FolioBody({ resume, spacers = {} }) {
  const p          = resume.personal       || {};
  const highlights = resume.highlights     || [];
  const exps       = resume.experiences    || [];
  const edus       = resume.education      || [];
  const skills     = resume.skills         || [];
  const projects   = resume.projects       || [];
  const certs      = resume.certifications || [];
  const isEmpty    = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;
  const initial    = (p.full_name || '').trim()[0]?.toUpperCase() || '';

  const contactItems = [
    p.location,
    p.linkedin ? urlDisplay(p.linkedin) : null,
    p.email,
    p.phone,
    p.website  ? urlDisplay(p.website)  : null,
    p.github   ? urlDisplay(p.github)   : null,
  ].filter(Boolean);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${FOLIO_L}px 1fr`, gap: `0 ${FOLIO_G}px` }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{ paddingTop: 24, paddingRight: 18, paddingLeft: 4 }}>

        {/* Name block — watermark initial floats at bottom-right of name area */}
        <div style={{ position: 'relative', marginBottom: 4, minHeight: 80 }}>
          {initial && (
            <div aria-hidden="true" style={{
              position: 'absolute', bottom: -14, right: -10,
              fontSize: 128, fontWeight: 900, lineHeight: 1,
              color: '#6366f1', opacity: 0.07,
              userSelect: 'none', pointerEvents: 'none',
            }}>
              {initial}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <h1 style={{ ...sans, fontSize: 21, fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              {p.full_name || <span style={{ color: '#cbd5e1', fontWeight: 400 }}>Your Name</span>}
            </h1>
            {p.tagline && (
              <p style={{ ...sans, fontSize: 11, fontWeight: 600, color: '#6366f1', margin: '6px 0 0', lineHeight: 1.4 }}>
                {p.tagline}
              </p>
            )}
            {p.subtitle && (
              <p style={{ ...sans, fontSize: 10.5, color: '#94a3b8', margin: '3px 0 0', lineHeight: 1.4 }}>
                {p.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Contact */}
        {contactItems.length > 0 && (
          <>
            <FolioSidebarTitle>Contact</FolioSidebarTitle>
            {contactItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: '#6366f1', opacity: 0.45, flexShrink: 0, marginTop: 5.5 }} />
                <p style={{ ...sans, fontSize: 10.5, color: '#475569', margin: 0, lineHeight: 1.5, wordBreak: 'break-all' }}>
                  {item}
                </p>
              </div>
            ))}
          </>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <>
            <FolioSidebarTitle>Skills</FolioSidebarTitle>
            {skills.map((s, i) => (
              <div key={i} style={{ marginBottom: 9 }}>
                {s.category && (
                  <p style={{ ...sans, fontSize: 10.5, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>
                    {s.category}
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 4px' }}>
                  {(s.items || []).map((item, j) => (
                    <span key={j} style={{ ...sans, fontSize: 9.5, color: '#4f46e5', background: 'rgba(99,102,241,0.09)', borderRadius: 3, padding: '2px 6px', lineHeight: 1.5, border: '0.5px solid rgba(99,102,241,0.15)' }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── RIGHT CONTENT ── */}
      <div style={{ paddingTop: 24, paddingRight: 4 }}>

        {/* Summary — accent left-border paragraph */}
        {p.summary && (
          <div style={{ marginBottom: 18 }}>
            {spacers['fsummary'] > 0 && <div style={{ height: spacers['fsummary'] }} />}
            <div data-block="fsummary" style={{ paddingLeft: 12, borderLeft: '3px solid #6366f1', borderRadius: 1 }}>
              <p style={{ ...sans, fontSize: 12, lineHeight: 1.68, color: '#374151', margin: 0 }}>
                <InlineMarkdown text={p.summary} />
              </p>
            </div>
          </div>
        )}

        {/* Career Highlights */}
        {highlights.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {highlights.map((h, i) => (
              <Fragment key={i}>
                {spacers[`fhighlight-${i}`] > 0 && <div style={{ height: spacers[`fhighlight-${i}`] }} />}
                <div data-block={`fhighlight-${i}`} data-atomic="true">
                  {i === 0 && <FolioContentTitle>Career Highlights</FolioContentTitle>}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <span style={{ ...sans, fontSize: 10, color: '#6366f1', flexShrink: 0, lineHeight: 1.65, marginTop: 0.5 }}>▸</span>
                    <span style={{ ...sans, fontSize: 11.5, lineHeight: 1.65, color: '#374151' }}>
                      <InlineMarkdown text={h.text} />
                    </span>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>
        )}

        {/* Experience */}
        {exps.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {exps.map((exp, i) => (
              <div key={exp.id || i}>
                {spacers[`fexp-${i}`] > 0 && <div style={{ height: spacers[`fexp-${i}`] }} />}
                <div data-block={`fexp-${i}`} style={{ marginBottom: 13 }}>
                  {i === 0 && <FolioContentTitle>Experience</FolioContentTitle>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...sans, fontSize: 12.5, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.005em' }}>
                        {exp.company}
                      </p>
                      <p style={{ ...sans, fontSize: 11.5, color: '#6366f1', fontWeight: 500, margin: '1px 0 0' }}>
                        {[exp.title, exp.location].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <DateLabel start={exp.start_date} end={exp.end_date} current={exp.current_job} />
                  </div>
                  {exp.note && (
                    <p style={{ ...sans, fontSize: 11, fontStyle: 'italic', color: '#64748b', lineHeight: 1.5, margin: '4px 0 2px' }}>
                      {exp.note}
                    </p>
                  )}
                  <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`fexp-${i}`} fontSize={11.5} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {edus.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {edus.map((edu, i) => (
              <div key={edu.id || i}>
                {spacers[`fedu-${i}`] > 0 && <div style={{ height: spacers[`fedu-${i}`] }} />}
                <div data-block={`fedu-${i}`} data-atomic="true" style={{ marginBottom: 10 }}>
                  {i === 0 && <FolioContentTitle>Education</FolioContentTitle>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ ...sans, fontSize: 12.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>{edu.school}</p>
                      <p style={{ ...sans, fontSize: 11.5, color: '#64748b', margin: '1px 0 0' }}>
                        {[edu.degree, edu.field].filter(Boolean).join(', ')}
                        {edu.gpa && <span style={{ color: '#94a3b8', marginLeft: 6 }}>· GPA {edu.gpa}</span>}
                      </p>
                      {edu.details && (
                        <p style={{ ...sans, fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '2px 0 0' }}>{edu.details}</p>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
                      <DateLabel start={edu.start_date} end={edu.end_date} />
                      {edu.location && (
                        <p style={{ ...sans, fontSize: 10.2, color: '#94a3b8', margin: '2px 0 0' }}>{edu.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {projects.map((proj, i) => (
              <div key={proj.id || i}>
                {spacers[`fproj-${i}`] > 0 && <div style={{ height: spacers[`fproj-${i}`] }} />}
                <div data-block={`fproj-${i}`} style={{ marginBottom: 7 }}>
                  {i === 0 && <FolioContentTitle>Notable Projects</FolioContentTitle>}
                  <ProjectEntry proj={proj} nameColor="#4f46e5" margin="0 0 5px" fontSize={11.5} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certifications */}
        {certs.length > 0 && (
          <CertGroups
            certs={certs}
            spacers={spacers}
            header={<FolioContentTitle>Certifications &amp; Training</FolioContentTitle>}
            nameColor="#1e293b"
            issuerColor="#6366f1"
            yearColor="#94a3b8"
            fontSize={11.5}
          />
        )}

        {isEmpty && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
            <p style={{ ...sans, fontSize: 12.2, color: '#d1d5db' }}>Fill in your details on the left →</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EDITORIAL THEME  — serif typographic richness, creative / media roles
// ══════════════════════════════════════════════════════════════════════════════

const edSerif = { fontFamily: "'Georgia', 'Garamond', 'Times New Roman', serif" };

function EditorialSectionTitle({ children }) {
  return (
    <div style={{ paddingLeft: 10, borderLeft: '3px solid #4A5568', marginBottom: 10, marginTop: 2 }}>
      <span style={{ ...edSerif, fontSize: 11.5, fontWeight: 700, fontVariant: 'small-caps', letterSpacing: '0.08em', color: '#4A5568', display: 'block', lineHeight: 1.3 }}>
        {children}
      </span>
    </div>
  );
}

export function EditorialBody({ resume, spacers = {} }) {
  const p = resume.personal || {}, highlights = resume.highlights || [], exps = resume.experiences || [], edus = resume.education || [], skills = resume.skills || [], projects = resume.projects || [], certs = resume.certifications || [];
  const isEmpty = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;
  const contactParts = [p.email, p.phone, p.location, p.website && urlDisplay(p.website), p.linkedin && urlDisplay(p.linkedin), p.github && urlDisplay(p.github)].filter(Boolean);

  return (
    <>
      {/* Header — centered serif */}
      <div style={{ textAlign: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ ...edSerif, fontSize: 28, fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.15, letterSpacing: '0.01em' }}>
          {p.full_name || <span style={{ color: '#cbd5e1', fontWeight: 400, fontStyle: 'italic' }}>Your Name</span>}
        </h1>
        {p.tagline  && <p style={{ ...edSerif, fontSize: 13, fontStyle: 'italic', color: '#64748b', margin: '6px 0 0' }}>{p.tagline}</p>}
        {p.subtitle && <p style={{ ...sans, fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>{p.subtitle}</p>}
        {contactParts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', fontSize: 10.5, color: '#64748b', margin: '8px 0 0' }}>
            {contactParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: '#cbd5e1', padding: '0 8px' }}>|</span>}
                {part}
              </span>
            ))}
          </div>
        )}
      </div>

      {p.summary && (
        <div style={{ marginBottom: 14 }}>
          {spacers['edsummary'] > 0 && <div style={{ height: spacers['edsummary'] }} />}
          <div data-block="edsummary">
            <EditorialSectionTitle>Summary</EditorialSectionTitle>
            <p style={{ ...edSerif, fontSize: 11.5, lineHeight: 1.62, color: '#374151', margin: 0 }}><InlineMarkdown text={p.summary} /></p>
          </div>
        </div>
      )}

      {highlights.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {highlights.map((h, i) => (
            <Fragment key={i}>
              {spacers[`edhighlight-${i}`] > 0 && <div style={{ height: spacers[`edhighlight-${i}`] }} />}
              <div data-block={`edhighlight-${i}`} data-atomic="true">
                {i === 0 && <EditorialSectionTitle>Career Highlights</EditorialSectionTitle>}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                  <span style={{ color: '#94a3b8', flexShrink: 0, lineHeight: 1.6, fontSize: 11 }}>•</span>
                  <span style={{ ...edSerif, fontSize: 11.5, lineHeight: 1.6, color: '#374151' }}><InlineMarkdown text={h.text} /></span>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {exps.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {exps.map((exp, i) => (
            <div key={exp.id || i}>
              {spacers[`edexp-${i}`] > 0 && <div style={{ height: spacers[`edexp-${i}`] }} />}
              <div data-block={`edexp-${i}`} style={{ marginBottom: 12 }}>
                {i === 0 && <EditorialSectionTitle>Experience</EditorialSectionTitle>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ ...edSerif, fontSize: 12.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>{exp.company}</p>
                    <p style={{ ...edSerif, fontSize: 11.5, fontStyle: 'italic', color: '#4A5568', margin: '1px 0 0' }}>{[exp.title, exp.location].filter(Boolean).join(' · ')}</p>
                  </div>
                  <DateLabel start={exp.start_date} end={exp.end_date} current={exp.current_job} />
                </div>
                {exp.note && <p style={{ ...edSerif, fontSize: 11, fontStyle: 'italic', color: '#64748b', lineHeight: 1.5, margin: '3px 0 2px' }}>{exp.note}</p>}
                <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`edexp-${i}`} fontSize={11.5} />
              </div>
            </div>
          ))}
        </div>
      )}

      {edus.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {edus.map((edu, i) => (
            <div key={edu.id || i}>
              {spacers[`ededu-${i}`] > 0 && <div style={{ height: spacers[`ededu-${i}`] }} />}
              <div data-block={`ededu-${i}`} data-atomic="true" style={{ marginBottom: 8 }}>
                {i === 0 && <EditorialSectionTitle>Education</EditorialSectionTitle>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ ...edSerif, fontSize: 12.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>{edu.school}</p>
                    <p style={{ ...edSerif, fontSize: 11.5, fontStyle: 'italic', color: '#64748b', margin: '1px 0 0' }}>
                      {[edu.degree, edu.field].filter(Boolean).join(', ')}
                      {edu.gpa && <span style={{ color: '#94a3b8', marginLeft: 6 }}>· GPA {edu.gpa}</span>}
                    </p>
                    {edu.details && <p style={{ ...edSerif, fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '2px 0 0' }}>{edu.details}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
                    <DateLabel start={edu.start_date} end={edu.end_date} />
                    {edu.location && <p style={{ ...sans, fontSize: 10.2, color: '#94a3b8', margin: '2px 0 0' }}>{edu.location}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {skills.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {skills.map((s, i) => (
            <div key={s.id || i}>
              {spacers[`edskill-${i}`] > 0 && <div style={{ height: spacers[`edskill-${i}`] }} />}
              <div data-block={`edskill-${i}`}>
                {i === 0 && <EditorialSectionTitle>Skills</EditorialSectionTitle>}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
                  {s.category && <span style={{ ...edSerif, fontSize: 11.5, fontWeight: 700, fontVariant: 'small-caps', color: '#0f172a', minWidth: 90, flexShrink: 0 }}>{s.category}</span>}
                  <span style={{ ...edSerif, fontSize: 11.5, color: '#475569', flex: 1 }}>{(s.items || []).join(', ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {projects.map((proj, i) => (
            <div key={proj.id || i}>
              {spacers[`edproj-${i}`] > 0 && <div style={{ height: spacers[`edproj-${i}`] }} />}
              <div data-block={`edproj-${i}`} style={{ marginBottom: 6 }}>
                {i === 0 && <EditorialSectionTitle>Notable Projects</EditorialSectionTitle>}
                <ProjectEntry proj={proj} nameColor="#4A5568" margin="0 0 5px" fontSize={11.5} />
              </div>
            </div>
          ))}
        </div>
      )}

      {certs.length > 0 && (
        <CertGroups certs={certs} spacers={spacers} header={<EditorialSectionTitle>Certifications &amp; Training</EditorialSectionTitle>} nameColor="#0f172a" issuerColor="#4A5568" yearColor="#94a3b8" fontSize={11.5} />
      )}

      {isEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
          <p style={{ ...sans, fontSize: 12.2, color: '#d1d5db' }}>Fill in your details on the left →</p>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TECHNICAL THEME  — engineering, data, devops, ML/AI roles
// ══════════════════════════════════════════════════════════════════════════════

const tcMono = { fontFamily: "'Courier New', 'Consolas', 'Menlo', 'Monaco', monospace" };

function TechnicalSectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 2, borderBottom: '2px solid #BFDBFE', paddingBottom: 4 }}>
      <span style={{ ...sans, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#1D4ED8' }}>
        {children}
      </span>
    </div>
  );
}

export function TechnicalBody({ resume, spacers = {} }) {
  const p = resume.personal || {}, highlights = resume.highlights || [], exps = resume.experiences || [], edus = resume.education || [], skills = resume.skills || [], projects = resume.projects || [], certs = resume.certifications || [];
  const isEmpty = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;
  const contactParts = [p.email, p.phone, p.location, p.website && urlDisplay(p.website), p.linkedin && urlDisplay(p.linkedin), p.github && urlDisplay(p.github)].filter(Boolean);

  return (
    <>
      {/* Header — left-aligned, engineering precision */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ ...sans, fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          {p.full_name || <span style={{ color: '#cbd5e1', fontWeight: 400 }}>Your Name</span>}
        </h1>
        {p.tagline  && <p style={{ ...sans, fontSize: 12.5, fontWeight: 500, color: '#1D4ED8', margin: '4px 0 0' }}>{p.tagline}</p>}
        {p.subtitle && <p style={{ ...tcMono, fontSize: 10.5, color: '#64748b', margin: '3px 0 0' }}>{p.subtitle}</p>}
        {contactParts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 10.5, color: '#475569', margin: '7px 0 0' }}>
            {contactParts.map((part, i) => (
              <span key={i} style={{ ...tcMono }}>
                {i > 0 && <span style={{ color: '#BFDBFE', padding: '0 8px' }}>·</span>}
                {part}
              </span>
            ))}
          </div>
        )}
        <div style={{ height: 2, background: '#BFDBFE', marginTop: 12 }} />
      </div>

      {p.summary && (
        <div style={{ marginBottom: 12 }}>
          {spacers['tcsummary'] > 0 && <div style={{ height: spacers['tcsummary'] }} />}
          <div data-block="tcsummary">
            <TechnicalSectionTitle>Summary</TechnicalSectionTitle>
            <p style={{ ...sans, fontSize: 11.5, lineHeight: 1.56, color: '#374151', margin: 0 }}><InlineMarkdown text={p.summary} /></p>
          </div>
        </div>
      )}

      {/* Skills first for technical roles */}
      {skills.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {skills.map((s, i) => (
            <div key={s.id || i}>
              {spacers[`tcskill-${i}`] > 0 && <div style={{ height: spacers[`tcskill-${i}`] }} />}
              <div data-block={`tcskill-${i}`}>
                {i === 0 && <TechnicalSectionTitle>Technical Skills</TechnicalSectionTitle>}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                  {s.category && <span style={{ ...tcMono, fontSize: 10.5, fontWeight: 700, color: '#1D4ED8', minWidth: 88, flexShrink: 0 }}>{s.category}</span>}
                  <span style={{ ...tcMono, fontSize: 10.5, color: '#334155', flex: 1, lineHeight: 1.5 }}>{(s.items || []).join('  ·  ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {highlights.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {highlights.map((h, i) => (
            <Fragment key={i}>
              {spacers[`tchighlight-${i}`] > 0 && <div style={{ height: spacers[`tchighlight-${i}`] }} />}
              <div data-block={`tchighlight-${i}`} data-atomic="true">
                {i === 0 && <TechnicalSectionTitle>Career Highlights</TechnicalSectionTitle>}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 4 }}>
                  <span style={{ ...tcMono, color: '#BFDBFE', flexShrink: 0, lineHeight: 1.6, fontSize: 10 }}>▸</span>
                  <span style={{ ...sans, fontSize: 11.5, lineHeight: 1.56, color: '#374151' }}><InlineMarkdown text={h.text} /></span>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {exps.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {exps.map((exp, i) => (
            <div key={exp.id || i}>
              {spacers[`tcexp-${i}`] > 0 && <div style={{ height: spacers[`tcexp-${i}`] }} />}
              <div data-block={`tcexp-${i}`} style={{ marginBottom: 10 }}>
                {i === 0 && <TechnicalSectionTitle>Experience</TechnicalSectionTitle>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ ...sans, fontSize: 12.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>{exp.company}</p>
                    <p style={{ ...tcMono, fontSize: 10.5, fontStyle: 'italic', color: '#475569', margin: '1px 0 0' }}>{[exp.title, exp.location].filter(Boolean).join(' · ')}</p>
                  </div>
                  <DateLabel start={exp.start_date} end={exp.end_date} current={exp.current_job} />
                </div>
                {exp.note && <p style={{ ...sans, fontSize: 11, fontStyle: 'italic', color: '#64748b', lineHeight: 1.5, margin: '3px 0 2px' }}>{exp.note}</p>}
                <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`tcexp-${i}`} fontSize={11.5} />
              </div>
            </div>
          ))}
        </div>
      )}

      {edus.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {edus.map((edu, i) => (
            <div key={edu.id || i}>
              {spacers[`tcedu-${i}`] > 0 && <div style={{ height: spacers[`tcedu-${i}`] }} />}
              <div data-block={`tcedu-${i}`} data-atomic="true" style={{ marginBottom: 8 }}>
                {i === 0 && <TechnicalSectionTitle>Education</TechnicalSectionTitle>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ ...sans, fontSize: 12.5, fontWeight: 700, color: '#0f172a', margin: 0 }}>{edu.school}</p>
                    <p style={{ ...sans, fontSize: 11.5, color: '#64748b', margin: '1px 0 0' }}>
                      {[edu.degree, edu.field].filter(Boolean).join(', ')}
                      {edu.gpa && <span style={{ color: '#94a3b8', marginLeft: 6 }}>· GPA {edu.gpa}</span>}
                    </p>
                  </div>
                  <DateLabel start={edu.start_date} end={edu.end_date} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {projects.map((proj, i) => (
            <div key={proj.id || i}>
              {spacers[`tcproj-${i}`] > 0 && <div style={{ height: spacers[`tcproj-${i}`] }} />}
              <div data-block={`tcproj-${i}`} style={{ marginBottom: 5 }}>
                {i === 0 && <TechnicalSectionTitle>Notable Projects</TechnicalSectionTitle>}
                <p style={{ ...sans, fontSize: 11.5, lineHeight: 1.5, margin: '0 0 5px' }}>
                  <strong style={{ ...tcMono, fontSize: 11, color: '#1D4ED8' }}>{proj.name}</strong>
                  {proj.description && <> — <InlineMarkdown text={proj.description} /></>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {certs.length > 0 && (
        <CertGroups certs={certs} spacers={spacers} header={<TechnicalSectionTitle>Certifications &amp; Training</TechnicalSectionTitle>} nameColor="#0f172a" issuerColor="#1D4ED8" yearColor="#94a3b8" fontSize={11.5} />
      )}

      {isEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
          <p style={{ ...sans, fontSize: 12.2, color: '#d1d5db' }}>Fill in your details on the left →</p>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HERITAGE THEME  — finance, law, consulting, classical sectors
// ══════════════════════════════════════════════════════════════════════════════

const hgSerif    = { fontFamily: "'Georgia', 'Garamond', 'Times New Roman', serif" };
const HG_BURG    = '#7C2D12';  // burgundy — NOT in ACCENT_HEXES, stays constant
const HG_RULE    = '#9CA3AF';

function HeritageSectionTitle({ children }) {
  return (
    <div style={{ margin: '2px 0 10px' }}>
      <div style={{ height: 1, background: HG_RULE }} />
      <div style={{ textAlign: 'center', padding: '4px 8px' }}>
        <span style={{ ...hgSerif, fontSize: 11.5, fontWeight: 600, fontVariant: 'small-caps', letterSpacing: '0.12em', color: HG_BURG, display: 'inline-block' }}>
          {children}
        </span>
      </div>
      <div style={{ height: 1, background: HG_RULE }} />
    </div>
  );
}

export function HeritageBody({ resume, spacers = {} }) {
  const p = resume.personal || {}, highlights = resume.highlights || [], exps = resume.experiences || [], edus = resume.education || [], skills = resume.skills || [], projects = resume.projects || [], certs = resume.certifications || [];
  const isEmpty = !p.full_name && !highlights.length && !exps.length && !edus.length && !skills.length && !projects.length;
  const contactParts = [p.email, p.phone, p.location, p.website && urlDisplay(p.website), p.linkedin && urlDisplay(p.linkedin), p.github && urlDisplay(p.github)].filter(Boolean);

  return (
    <>
      {/* Header — centered, classical symmetry */}
      <div style={{ textAlign: 'center', marginBottom: 22 }}>
        <h1 style={{ ...hgSerif, fontSize: 30, fontWeight: 600, color: '#1C1917', margin: 0, lineHeight: 1.15, letterSpacing: '0.02em' }}>
          {p.full_name || <span style={{ color: '#d1d5db', fontWeight: 400, fontStyle: 'italic' }}>Your Name</span>}
        </h1>
        {p.tagline  && <p style={{ ...hgSerif, fontSize: 12.5, fontVariant: 'small-caps', letterSpacing: '0.1em', color: '#57534E', margin: '5px 0 0' }}>{p.tagline}</p>}
        {p.subtitle && <p style={{ ...hgSerif, fontSize: 11, fontStyle: 'italic', color: '#78716C', margin: '3px 0 0' }}>{p.subtitle}</p>}
        {contactParts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', fontSize: 10.5, color: '#57534E', margin: '8px 0 0' }}>
            {contactParts.map((part, i) => (
              <span key={i} style={{ ...hgSerif }}>
                {i > 0 && <span style={{ color: HG_RULE, padding: '0 8px' }}>·</span>}
                {part}
              </span>
            ))}
          </div>
        )}
        {/* Double-rule closing the header */}
        <div style={{ margin: '14px auto 0', maxWidth: 420 }}>
          <div style={{ height: 1, background: HG_RULE }} />
          <div style={{ height: 3 }} />
          <div style={{ height: 1, background: HG_RULE }} />
        </div>
      </div>

      {p.summary && (
        <div style={{ marginBottom: 18 }}>
          {spacers['hgsummary'] > 0 && <div style={{ height: spacers['hgsummary'] }} />}
          <div data-block="hgsummary">
            <HeritageSectionTitle>Summary</HeritageSectionTitle>
            <p style={{ ...hgSerif, fontSize: 12, lineHeight: 1.65, color: '#1C1917', margin: '8px 0 0' }}><InlineMarkdown text={p.summary} /></p>
          </div>
        </div>
      )}

      {highlights.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {highlights.map((h, i) => (
            <Fragment key={i}>
              {spacers[`hghighlight-${i}`] > 0 && <div style={{ height: spacers[`hghighlight-${i}`] }} />}
              <div data-block={`hghighlight-${i}`} data-atomic="true">
                {i === 0 && <HeritageSectionTitle>Career Highlights</HeritageSectionTitle>}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5, marginTop: i === 0 ? 8 : 0 }}>
                  <span style={{ color: HG_BURG, flexShrink: 0, lineHeight: 1.65, fontSize: 11 }}>•</span>
                  <span style={{ ...hgSerif, fontSize: 12, lineHeight: 1.65, color: '#1C1917' }}><InlineMarkdown text={h.text} /></span>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {exps.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {exps.map((exp, i) => (
            <div key={exp.id || i}>
              {spacers[`hgexp-${i}`] > 0 && <div style={{ height: spacers[`hgexp-${i}`] }} />}
              <div data-block={`hgexp-${i}`} style={{ marginBottom: 13 }}>
                {i === 0 && <HeritageSectionTitle>Experience</HeritageSectionTitle>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: i === 0 ? 8 : 0 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ ...hgSerif, fontSize: 13, fontWeight: 700, color: '#1C1917', margin: 0 }}>{exp.company}</p>
                    <p style={{ ...hgSerif, fontSize: 12, fontStyle: 'italic', color: '#57534E', margin: '1px 0 0' }}>{[exp.title, exp.location].filter(Boolean).join(' · ')}</p>
                  </div>
                  <DateLabel start={exp.start_date} end={exp.end_date} current={exp.current_job} />
                </div>
                {exp.note && <p style={{ ...hgSerif, fontSize: 11.5, fontStyle: 'italic', color: '#78716C', lineHeight: 1.5, margin: '3px 0 2px' }}>{exp.note}</p>}
                <Bullets items={exp.bullets} spacers={spacers} blockPrefix={`hgexp-${i}`} fontSize={12} />
              </div>
            </div>
          ))}
        </div>
      )}

      {edus.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {edus.map((edu, i) => (
            <div key={edu.id || i}>
              {spacers[`hgedu-${i}`] > 0 && <div style={{ height: spacers[`hgedu-${i}`] }} />}
              <div data-block={`hgedu-${i}`} data-atomic="true" style={{ marginBottom: 8 }}>
                {i === 0 && <HeritageSectionTitle>Education</HeritageSectionTitle>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: i === 0 ? 8 : 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ ...hgSerif, fontSize: 13, fontWeight: 700, color: '#1C1917', margin: 0 }}>{edu.school}</p>
                    <p style={{ ...hgSerif, fontSize: 12, fontStyle: 'italic', color: '#57534E', margin: '1px 0 0' }}>
                      {[edu.degree, edu.field].filter(Boolean).join(', ')}
                      {edu.gpa && <span style={{ color: '#94a3b8', marginLeft: 6 }}>· GPA {edu.gpa}</span>}
                    </p>
                    {edu.details && <p style={{ ...hgSerif, fontSize: 11, color: '#78716C', fontStyle: 'italic', margin: '2px 0 0' }}>{edu.details}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 8 }}>
                    <DateLabel start={edu.start_date} end={edu.end_date} />
                    {edu.location && <p style={{ ...sans, fontSize: 10.2, color: '#94a3b8', margin: '2px 0 0' }}>{edu.location}</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {skills.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {skills.map((s, i) => (
            <div key={s.id || i}>
              {spacers[`hgskill-${i}`] > 0 && <div style={{ height: spacers[`hgskill-${i}`] }} />}
              <div data-block={`hgskill-${i}`}>
                {i === 0 && <HeritageSectionTitle>Skills</HeritageSectionTitle>}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 5, marginTop: i === 0 ? 8 : 0 }}>
                  {s.category && <span style={{ ...hgSerif, fontSize: 12, fontWeight: 700, fontVariant: 'small-caps', color: HG_BURG, minWidth: 90, flexShrink: 0, letterSpacing: '0.06em' }}>{s.category}</span>}
                  <span style={{ ...hgSerif, fontSize: 12, color: '#374151', flex: 1 }}>{(s.items || []).join(' · ')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {projects.map((proj, i) => (
            <div key={proj.id || i}>
              {spacers[`hgproj-${i}`] > 0 && <div style={{ height: spacers[`hgproj-${i}`] }} />}
              <div data-block={`hgproj-${i}`} style={{ marginBottom: 6 }}>
                {i === 0 && <HeritageSectionTitle>Notable Projects</HeritageSectionTitle>}
                <p style={{ ...hgSerif, fontSize: 12, lineHeight: 1.55, margin: '8px 0 0' }}>
                  <strong style={{ color: HG_BURG }}>{proj.name}</strong>
                  {proj.description && <> — <InlineMarkdown text={proj.description} /></>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {certs.length > 0 && (
        <CertGroups certs={certs} spacers={spacers} header={<HeritageSectionTitle>Certifications &amp; Training</HeritageSectionTitle>} nameColor="#1C1917" issuerColor="#57534E" yearColor="#94a3b8" fontSize={12} />
      )}

      {isEmpty && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 }}>
          <p style={{ ...sans, fontSize: 12.2, color: '#d1d5db' }}>Fill in your details on the left →</p>
        </div>
      )}
    </>
  );
}

// ── Theme registry ─────────────────────────────────────────────────────────────

export const THEMES = {
  classic:    { label: 'Classic',    description: 'Traditional & balanced',      accent: '#94a3b8', body: null, pageBg: null },
  modern:     { label: 'Modern',     description: 'Bold with indigo accents',    accent: '#6366f1', body: null, pageBg: null },
  executive:  { label: 'Executive',  description: 'Dark header, sharp look',     accent: '#1e293b', body: null, pageBg: null },
  minimal:    { label: 'Minimal',    description: 'Ultra-clean, whitespace',     accent: '#e2e8f0', body: null, pageBg: null },
  leadership: { label: 'Leadership', description: 'ATS-optimized, senior roles', accent: '#1E3A8A', body: null, pageBg: null },
  compact:    { label: 'Compact',    description: 'Top 3 full · rest condensed', accent: '#1E3A8A', body: null, pageBg: null },
  luxe:       { label: 'Luxe',       description: 'Gradient header + graphics',  accent: '#6366f1', body: null, pageBg: null },
  prestige:   { label: 'Prestige',   description: 'Editorial, typography-first', accent: '#6366f1', body: null, pageBg: null },
  folio:      { label: 'Folio',      description: 'Two-column sidebar layout',   accent: '#6366f1', body: null, pageBg: null },
  editorial:  { label: 'Editorial',  description: 'Serif, creative & media roles', accent: '#4A5568', body: null, pageBg: null },
  technical:  { label: 'Technical',  description: 'Engineering & data precision',  accent: '#1D4ED8', body: null, pageBg: null },
  heritage:   { label: 'Heritage',   description: 'Classical, finance & law',      accent: '#7C2D12', body: null, pageBg: null },
};
// body refs set after declarations to avoid hoisting issues
THEMES.classic.body    = ClassicBody;
THEMES.modern.body     = ModernBody;
THEMES.executive.body  = ExecutiveBody;
THEMES.minimal.body    = MinimalBody;
THEMES.leadership.body = LeadershipBody;
THEMES.compact.body    = CompactBody;
THEMES.luxe.body       = LuxeBody;
THEMES.luxe.pageBg     = LuxePageBg;
THEMES.prestige.body   = PrestigeBody;
THEMES.prestige.pageBg = PrestigePageBg;
THEMES.folio.body      = FolioBody;
THEMES.folio.pageBg    = FolioPageBg;
THEMES.editorial.body  = EditorialBody;
THEMES.technical.body  = TechnicalBody;
THEMES.heritage.body   = HeritageBody;

export function getThemeBody(name) {
  return THEMES[name]?.body ?? ClassicBody;
}
