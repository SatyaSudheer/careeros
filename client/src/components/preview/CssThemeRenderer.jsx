/**
 * CssThemeRenderer — CSS custom-property-based resume renderer
 *
 * Renders resume data as semantic HTML styled entirely via CSS classes.
 * Designed to work with the /themes CSS custom property system.
 *
 * ATS safety guarantees:
 *   - Single-column flow — no floats, no CSS columns, no absolute-positioned text
 *   - All text is real DOM text — no SVG, canvas, or image-based content
 *   - Section titles use h2 elements only
 *   - Contact list is a <ul> for screen-reader / parser compatibility
 *   - Copy-paste from the rendered output produces linear readable text
 */

import '../../themes/base.css';
import '../../themes/theme-executive.css';
import '../../themes/theme-editorial.css';
import '../../themes/theme-minimal.css';
import '../../themes/theme-technical.css';
import '../../themes/theme-heritage.css';

// Safe inline-markdown → HTML (escapes HTML before applying patterns)
function mdHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function urlDisplay(url) {
  return String(url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

function formatDateRange(start, end, current) {
  const parts = [start, current ? 'Present' : end].filter(Boolean);
  return parts.join(' – ');
}

function certYear(s) {
  const m = String(s || '').match(/\b(20\d{2}|19\d{2})\b/);
  return m ? m[1] : '';
}

export default function CssThemeRenderer({ resume, themeClass = 'theme-minimal' }) {
  const p     = resume?.personal       || {};
  const his   = resume?.highlights     || [];
  const exps  = resume?.experiences    || [];
  const edus  = resume?.education      || [];
  const skls  = resume?.skills         || [];
  const pros  = resume?.projects       || [];
  const certs = resume?.certifications || [];

  const contactItems = [
    p.email,
    p.phone,
    p.location,
    p.website  ? urlDisplay(p.website)  : null,
    p.linkedin ? urlDisplay(p.linkedin) : null,
    p.github   ? urlDisplay(p.github)   : null,
  ].filter(Boolean);

  return (
    /* Paper card — matches the 816×1056px letter page geometry of ResumePreview */
    <div
      style={{
        width: 816,
        minHeight: 1056,
        background: '#ffffff',
        boxShadow: '0 2px 16px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
        borderRadius: 4,
        padding: '48px 44px',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {/* The semantic resume document, styled via CSS theme class */}
      <article className={`css-resume ${themeClass}`}>

        {/* ── HEADER ───────────────────────────────────────────────────── */}
        <header className="cr-header">
          <h1 className="cr-name">
            {p.full_name || <span style={{ color: '#CBD5E1', fontWeight: 400, fontSize: '0.7em' }}>Your Name</span>}
          </h1>

          {p.tagline && <p className="cr-title">{p.tagline}</p>}

          {contactItems.length > 0 && (
            <ul className="cr-contact" aria-label="Contact information">
              {contactItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}

          {p.summary && <p className="cr-summary">{p.summary}</p>}
        </header>

        {/* ── CAREER HIGHLIGHTS ────────────────────────────────────────── */}
        {his.length > 0 && (
          <section className="cr-section" aria-label="Career Highlights">
            <h2 className="cr-section-title">Career Highlights</h2>
            <ul className="cr-bullets">
              {his.map((h, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: mdHtml(h.text) }} />
              ))}
            </ul>
          </section>
        )}

        {/* ── EXPERIENCE ───────────────────────────────────────────────── */}
        {exps.length > 0 && (
          <section className="cr-section" aria-label="Work Experience">
            <h2 className="cr-section-title">Experience</h2>
            {exps.map((exp, i) => (
              <article key={exp.id || i} className="cr-entry">
                <div className="cr-entry-header">
                  <div className="cr-entry-main">
                    <strong className="cr-entry-company">{exp.company}</strong>
                    <span className="cr-entry-role">
                      {[exp.title, exp.location].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <time className="cr-entry-date">
                    {formatDateRange(exp.start_date, exp.end_date, exp.current_job)}
                  </time>
                </div>

                {exp.note && (
                  <span className="cr-entry-note">{exp.note}</span>
                )}

                {(exp.bullets || []).filter(Boolean).length > 0 && (
                  <ul className="cr-bullets">
                    {(exp.bullets || []).filter(Boolean).map((b, bi) => (
                      <li key={bi} dangerouslySetInnerHTML={{ __html: mdHtml(b) }} />
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>
        )}

        {/* ── EDUCATION ────────────────────────────────────────────────── */}
        {edus.length > 0 && (
          <section className="cr-section" aria-label="Education">
            <h2 className="cr-section-title">Education</h2>
            {edus.map((edu, i) => (
              <article key={edu.id || i} className="cr-entry">
                <div className="cr-entry-header">
                  <div className="cr-entry-main">
                    <strong className="cr-entry-company">{edu.school}</strong>
                    <span className="cr-entry-role">
                      {[edu.degree, edu.field].filter(Boolean).join(', ')}
                      {edu.gpa ? ` · GPA ${edu.gpa}` : ''}
                    </span>
                    {edu.details && (
                      <span style={{ display: 'block', fontSize: 'var(--font-size-meta)', color: 'var(--color-text-secondary)' }}>
                        {edu.details}
                      </span>
                    )}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <time className="cr-entry-date">
                      {formatDateRange(edu.start_date, edu.end_date)}
                    </time>
                    {edu.location && (
                      <span className="cr-entry-location">{edu.location}</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ── SKILLS ───────────────────────────────────────────────────── */}
        {skls.length > 0 && (
          <section className="cr-section" aria-label="Skills">
            <h2 className="cr-section-title">Skills</h2>
            <div className="cr-skills-list">
              {skls.map((s, i) => (
                <div key={i} className="cr-skill-group">
                  {s.category && (
                    <span className="cr-skill-category">{s.category}</span>
                  )}
                  <span className="cr-skill-items">
                    {(s.items || []).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── NOTABLE PROJECTS ─────────────────────────────────────────── */}
        {pros.length > 0 && (
          <section className="cr-section" aria-label="Notable Projects">
            <h2 className="cr-section-title">Notable Projects</h2>
            {pros.map((proj, i) => (
              <p key={proj.id || i} className="cr-project">
                <strong className="cr-project-name">{proj.name}</strong>
                {proj.description && (
                  <> — <span dangerouslySetInnerHTML={{ __html: mdHtml(proj.description) }} /></>
                )}
              </p>
            ))}
          </section>
        )}

        {/* ── CERTIFICATIONS ───────────────────────────────────────────── */}
        {certs.length > 0 && (
          <section className="cr-section" aria-label="Certifications and Training">
            <h2 className="cr-section-title">Certifications &amp; Training</h2>
            {certs.map((cert, i) => {
              const year = certYear(cert.issued_date || cert.expiry_date);
              return (
                <p key={cert.id || i} className="cr-cert-row">
                  <strong>{cert.name}</strong>
                  {cert.issuer && (
                    <span className="cr-cert-meta"> · {cert.issuer}</span>
                  )}
                  {year && (
                    <span className="cr-cert-meta"> · {year}</span>
                  )}
                </p>
              );
            })}
          </section>
        )}

        {/* Empty state */}
        {!p.full_name && !his.length && !exps.length && !edus.length && !skls.length && (
          <p style={{ textAlign: 'center', color: '#CBD5E1', paddingTop: 80, fontSize: 13 }}>
            Fill in your details on the left →
          </p>
        )}

      </article>
    </div>
  );
}
