const fs = require('fs');
const { execSync } = require('child_process');

// ── Locate system Chrome ──────────────────────────────────────────────────────

function findChrome() {
  // macOS Spotlight (finds Chrome regardless of install location)
  try {
    const result = execSync(
      'mdfind "kMDItemCFBundleIdentifier == \'com.google.Chrome\'"',
      { timeout: 3000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim().split('\n')[0];
    if (result) {
      const bin = `${result}/Contents/MacOS/Google Chrome`;
      if (fs.existsSync(bin)) return bin;
    }
  } catch {}

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

// ── HTML template ─────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Inline markdown → HTML. Escape HTML first so user angle brackets are safe,
// then apply markdown patterns (*, ~, ` survive esc unchanged).
function mdHtml(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,     '<em>$1</em>')
    .replace(/~~([^~]+)~~/g,     '<del>$1</del>')
    .replace(/`([^`]+)`/g,       '<span style="font-family:monospace;font-size:0.9em;background:#f1f5f9;padding:0 3px;border-radius:2px;">$1</span>');
}

function certYear(s) {
  const m = String(s || '').match(/\b(20\d{2}|19\d{2})\b/);
  return m ? m[1] : '';
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

function urlDisplay(s) {
  return String(s || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

const ACCENT_HEXES = [
  '#6366f1', '#4f46e5', '#e0e7ff', '#eef2ff', '#c7d2fe', '#a5b4fc',
  '#1e293b', '#0f172a', '#334155',
  '#94a3b8', '#cbd5e1', '#e2e8f0',
  // Theme-specific accents: leadership, editorial, technical, heritage,
  // graduate, academic, swiss — so every theme follows the accent picker
  '#1e3a8a', '#4a5568', '#1d4ed8', '#bfdbfe', '#7c2d12', '#9ca3af',
  '#047857', '#a7f3d0', '#d1fae5', '#14532d', '#dc2626',
];
const LIGHT_TINTS = ['#e0e7ff', '#eef2ff', '#c7d2fe', '#e2e8f0', '#bfdbfe', '#a7f3d0', '#d1fae5'];
const MID_TINTS   = ['#a5b4fc', '#94a3b8', '#cbd5e1', '#9ca3af'];

function clampScale(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1.18, Math.max(0.88, n)) : 1;
}

function tint(hex, amount) {
  const raw = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return hex;
  const target = amount >= 0 ? 255 : 0;
  const mix = Math.abs(amount);
  const parts = [0, 2, 4].map(i => parseInt(raw.slice(i, i + 2), 16));
  return `#${parts.map(c => Math.round(c + (target - c) * mix).toString(16).padStart(2, '0')).join('')}`;
}

function mapAccentColor(color, accent) {
  if (!accent) return color;
  const lower = String(color).toLowerCase();
  if (LIGHT_TINTS.includes(lower)) return tint(accent, 0.86);
  if (MID_TINTS.includes(lower)) return tint(accent, 0.45);
  return accent;
}

function applyResumeAppearance(html, resume) {
  const scale = clampScale(resume.font_scale);
  const accent = String(resume.accent_color || '').trim();
  let next = html.replace(/font-size:\s*([0-9.]+)px/g, (_, size) => {
    const scaled = Math.round(Number(size) * scale * 10) / 10;
    return `font-size:${scaled}px`;
  });
  if (accent) {
    ACCENT_HEXES.forEach(hex => {
      next = next.replace(new RegExp(hex, 'ig'), mapAccentColor(hex, accent));
    });
  }
  return next;
}

function sectionHeader(title) {
  return `
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:9px;margin-top:2px;">
      <span style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.13em;color:#94a3b8;white-space:nowrap;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(title)}</span>
      <div style="flex:1;height:1px;background:#e2e8f0;"></div>
    </div>`;
}

function dateSpan(start, end, current) {
  const parts = [start, current ? 'Present' : end].filter(Boolean);
  return parts.length ? `<span style="font-size:10.2px;color:#94a3b8;white-space:nowrap;flex-shrink:0;margin-left:12px;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(parts.join(' – '))}</span>` : '';
}

function bulletList(items, fontSize = 11.8) {
  const filled = (items || []).filter(Boolean);
  if (!filled.length) return '';
  return `<ul style="margin-top:5px;list-style:none;padding:0;display:flex;flex-direction:column;gap:3px;">
    ${filled.map(b => `
      <li style="display:flex;align-items:flex-start;gap:7px;font-size:${fontSize}px;line-height:1.56;color:#475569;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
        <span style="flex-shrink:0;color:#94a3b8;font-size:11px;line-height:1.56;">&#8226;</span>
        <span>${mdHtml(b)}</span>
      </li>`).join('')}
  </ul>`;
}

// ── Theme-specific helpers ────────────────────────────────────────────────────

function modernSection(title, content) {
  return `<div style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:9px;">
      <div style="width:3px;height:14px;background:#6366f1;border-radius:2px;flex-shrink:0;"></div>
      <span style="font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#6366f1;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(title)}</span>
      <div style="flex:1;height:1px;background:#e0e7ff;"></div>
    </div>${content}</div>`;
}

function execSection(title, content) {
  return `<div style="margin-bottom:14px;">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:9px;">
      <span style="font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.18em;color:#1e293b;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(title)}</span>
      <div style="flex:1;height:1.5px;background:#1e293b;opacity:0.15;"></div>
    </div>${content}</div>`;
}

function minimalSection(title, content) {
  return `<div style="margin-bottom:14px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;">
      <p style="font-size:8.4px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#334155;margin:0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(title)}</p>
      <div style="flex:1;height:1px;background:#e2e8f0;"></div>
    </div>
    ${content}</div>`;
}

function bulletListDash(items, fontSize = 11.8) {
  const filled = (items || []).filter(Boolean);
  if (!filled.length) return '';
  return `<ul style="margin-top:5px;list-style:none;padding:0;display:flex;flex-direction:column;gap:5px;">
    ${filled.map(b => `<li style="display:flex;gap:7px;font-size:${fontSize}px;line-height:1.55;color:#475569;font-family:Aptos,'Segoe UI',Arial,sans-serif;"><span style="flex-shrink:0;color:#94a3b8;margin-top:1px;line-height:1.55;font-size:10px;">—</span><span>${mdHtml(b)}</span></li>`).join('')}
  </ul>`;
}

// ── Luxe ──────────────────────────────────────────────────────────────────────

function luxeSection(title, content) {
  const F = "font-family:Aptos,'Segoe UI',Arial,sans-serif;";
  return `<div style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;">
      <span style="color:#6366f1;font-size:9px;line-height:1;flex-shrink:0;">◆</span>
      <span style="${F}font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;color:#6366f1;white-space:nowrap;">${esc(title)}</span>
      <div style="flex:1;height:1px;background:#e0e7ff;"></div>
    </div>${content}</div>`;
}

function buildLuxeHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  const contactItems = [
    p.email,
    p.phone,
    p.location,
    p.website  && p.website.replace(/^https?:\/\/(www\.)?/, ''),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const contactHtml = contactItems.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:3px 14px;font-size:10.2px;color:#94a3b8;margin-top:8px;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
        ${contactItems.map(item => `<span>${esc(item)}</span>`).join('<span style="color:#475569;padding:0 4px;">·</span>')}
      </div>`
    : '';

  const summaryHtml    = p.summary    ? luxeSection('Summary', `<p style="font-size:12.2px;line-height:1.56;color:#475569;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${mdHtml(p.summary)}</p>`) : '';
  const highlightsHtml = his.length   ? luxeSection('Career Highlights', bulletList(his.map(h => h.text), 12.2)) : '';
  const experienceHtml = exps.length  ? luxeSection('Experience', expRows(exps, { titleItalic: true, titleColor: '#6366f1' })) : '';
  const educationHtml  = edus.length  ? luxeSection('Education', eduRows(edus)) : '';
  const skillsHtml     = skls.length  ? luxeSection('Skills', skillRows(skls, { chips: true })) : '';
  const projectsHtml   = pros.length  ? luxeSection('Notable Projects', projRows(pros, { nameColor: '#4f46e5' })) : '';
  const certsHtml      = certs.length ? luxeSection('Certifications & Training', certRows(certs, { nameColor: '#1e293b', metaColor: '#6366f1' })) : '';

  const pageDotsTR = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) =>
      `<circle cx="${666 + c * 22}" cy="${190 + r * 20}" r="1.8" fill="#6366f1" fill-opacity="0.28"/>`
    ).join('')
  ).join('');
  const pageDotsBL = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) =>
      `<circle cx="${12 + c * 10}" cy="${876 + r * 22}" r="1.4" fill="#6366f1" fill-opacity="0.22"/>`
    ).join('')
  ).join('');
  const headerDots = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 5 }, (_, c) =>
      `<circle cx="${130 + c * 22}" cy="${20 + r * 18}" r="2" fill="white" fill-opacity="0.7"/>`
    ).join('')
  ).join('');

  const bgSvg = `
  <svg style="position:fixed;top:-0.45in;left:-0.45in;width:calc(100% + 0.9in);height:calc(100% + 0.9in);z-index:-1;pointer-events:none;" viewBox="0 0 816 1056" preserveAspectRatio="xMinYMin slice" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="5" height="1056" fill="#6366f1"/>
    <circle cx="800" cy="20"   r="200" fill="#6366f1" fill-opacity="0.05"/>
    <circle cx="816" cy="160"  r="130" fill="#6366f1" fill-opacity="0.04"/>
    <circle cx="680" cy="60"   r="90"  fill="#6366f1" fill-opacity="0.03"/>
    <circle cx="30"  cy="1040" r="180" fill="#6366f1" fill-opacity="0.04"/>
    <circle cx="160" cy="1056" r="110" fill="#6366f1" fill-opacity="0.03"/>
    ${pageDotsTR}${pageDotsBL}
    <polygon points="816,1056 816,992 752,1056"  fill="#6366f1" fill-opacity="0.06"/>
    <polygon points="816,1056 816,1024 784,1056" fill="#6366f1" fill-opacity="0.09"/>
    <polygon points="5,0 5,48 44,0"              fill="#6366f1" fill-opacity="0.14"/>
  </svg>`;

  const headerSvg = `
  <svg width="350" height="120" style="position:absolute;top:0;right:0;opacity:0.15;pointer-events:none;" xmlns="http://www.w3.org/2000/svg">
    <circle cx="310" cy="0"   r="140" fill="white"/>
    <circle cx="350" cy="90"  r="90"  fill="white"/>
    <circle cx="200" cy="-20" r="80"  fill="white"/>
    ${headerDots}
  </svg>`;

  const extraCss = `
    .luxe-header {
      background: linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#1e3a8a 100%);
      margin:-0.45in -0.45in 0;
      padding:0.45in 0.45in 20px;
      position:relative;
      overflow:hidden;
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
    }
  `;

  const body = `
  ${bgSvg}
  <div class="luxe-header">
    ${headerSvg}
    <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#f8fafc;font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:0;position:relative;">${esc(p.full_name || '')}</h1>
    ${p.tagline  ? `<p style="font-size:12.2px;color:#a5b4fc;font-weight:500;margin:5px 0 0;position:relative;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.tagline)}</p>` : ''}
    ${p.subtitle ? `<p style="font-size:11px;color:#c7d2fe;margin:2px 0 0;position:relative;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.subtitle)}</p>` : ''}
    ${contactHtml}
  </div>
  <div style="margin-top:20px;">
    ${summaryHtml}${highlightsHtml}${educationHtml}${skillsHtml}${experienceHtml}${projectsHtml}${certsHtml}
  </div>`;

  return wrap(body, extraCss);
}

// ── Prestige ──────────────────────────────────────────────────────────────────

function prestigeSection(title, content) {
  const F = "font-family:Aptos,'Segoe UI',Arial,sans-serif;";
  return `<div style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:8px;padding-bottom:6px;margin-bottom:10px;border-bottom:1.5px solid #6366f1;">
      <div style="width:3px;height:14px;background:#6366f1;border-radius:1px;flex-shrink:0;"></div>
      <span style="${F}font-size:7.5px;font-weight:900;text-transform:uppercase;letter-spacing:0.3em;color:#6366f1;">${esc(title)}</span>
    </div>${content}</div>`;
}

function buildPrestigeHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  const contactParts = [
    p.email,
    p.phone,
    p.location,
    p.website  && p.website.replace(/^https?:\/\/(www\.)?/, ''),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const contactHtml = contactParts.length
    ? `<p style="font-size:10px;color:#64748b;margin:10px 0 0;line-height:1.5;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${contactParts.map((p, i) => `${i > 0 ? '<span style="color:#d1d5db;margin:0 7px;">|</span>' : ''}${esc(p)}`).join('')}</p>`
    : '';

  const skllPrestige = skls.length ? `<div style="display:flex;flex-direction:column;gap:7px;">${skls.map(s => `
    <div style="display:flex;align-items:flex-start;gap:8px;">
      ${s.category ? `<span style="font-size:10px;font-weight:800;color:#374151;min-width:90px;flex-shrink:0;text-transform:uppercase;letter-spacing:0.07em;padding-top:2px;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(s.category)}</span>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:4px 6px;">${(s.items||[]).map(item => `<span style="font-size:10.2px;color:#4f46e5;padding:2px 8px;border-radius:3px;border:1px solid #6366f1;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(item)}</span>`).join('')}</div>
    </div>`).join('')}</div>` : '';

  const summaryHtml    = p.summary    ? prestigeSection('Summary', `<p style="font-size:12px;line-height:1.62;color:#374151;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${mdHtml(p.summary)}</p>`) : '';
  const highlightsHtml = his.length   ? prestigeSection('Career Highlights', bulletList(his.map(h => h.text), 12)) : '';
  const experienceHtml = exps.length  ? prestigeSection('Experience', expRows(exps, { titleItalic: true, titleColor: '#6366f1', companyColor: '#0f172a' })) : '';
  const educationHtml  = edus.length  ? prestigeSection('Education', eduRows(edus, { schoolColor: '#0f172a' })) : '';
  const skillsHtml     = skls.length  ? prestigeSection('Skills', skllPrestige) : '';
  const projectsHtml   = pros.length  ? prestigeSection('Notable Projects', projRows(pros, { nameColor: '#4f46e5' })) : '';
  const certsHtml      = certs.length ? prestigeSection('Certifications & Training', certRows(certs, { nameColor: '#1e293b', metaColor: '#6366f1' })) : '';

  const squaresTR = Array.from({ length: 4 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) =>
      `<rect x="${672 + c * 18}" y="${28 + r * 18}" width="9" height="9" fill="#6366f1" fill-opacity="${(0.07 + r * 0.015).toFixed(3)}" rx="1.5"/>`
    ).join('')
  ).join('');
  const squaresBL = Array.from({ length: 3 }, (_, r) =>
    Array.from({ length: 4 }, (_, c) =>
      `<rect x="${16 + c * 18}" y="${952 + r * 18}" width="9" height="9" fill="#6366f1" fill-opacity="0.07" rx="1.5"/>`
    ).join('')
  ).join('');

  const bgSvg = `
  <svg style="position:fixed;top:-0.45in;left:-0.45in;width:calc(100% + 0.9in);height:calc(100% + 0.9in);z-index:-1;pointer-events:none;" viewBox="0 0 816 1056" preserveAspectRatio="xMinYMin slice" xmlns="http://www.w3.org/2000/svg">
    <rect x="0"   y="0"    width="816" height="4"    fill="#6366f1"/>
    <rect x="812" y="0"    width="4"   height="1056" fill="#6366f1"/>
    <rect x="0"   y="0"    width="12"  height="12"   fill="#6366f1"/>
    <rect x="804" y="0"    width="12"  height="12"   fill="#6366f1"/>
    <rect x="0"   y="1044" width="12"  height="12"   fill="#6366f1" fill-opacity="0.35"/>
    <rect x="804" y="1044" width="12"  height="12"   fill="#6366f1" fill-opacity="0.35"/>
    ${squaresTR}${squaresBL}
  </svg>`;

  const extraCss = `
    .prestige-header {
      padding-top:22px;
      padding-bottom:18px;
      margin-bottom:16px;
      border-bottom:1.5px solid #e2e8f0;
    }
  `;

  const body = `
  ${bgSvg}
  <div class="prestige-header">
    <h1 style="font-size:26px;font-weight:900;letter-spacing:-0.025em;color:#0f172a;font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:0;line-height:1.1;">${esc(p.full_name || '')}</h1>
    ${p.tagline  ? `<p style="font-size:12.5px;font-weight:600;color:#64748b;margin:7px 0 0;letter-spacing:0.07em;text-transform:uppercase;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.tagline)}</p>` : ''}
    ${p.subtitle ? `<p style="font-size:11px;color:#94a3b8;margin:3px 0 0;letter-spacing:0.02em;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.subtitle)}</p>` : ''}
    ${contactHtml}
  </div>
  ${summaryHtml}${highlightsHtml}${educationHtml}${skillsHtml}${experienceHtml}${projectsHtml}${certsHtml}`;

  return wrap(body, extraCss);
}

// ── Folio ─────────────────────────────────────────────────────────────────────

function buildFolioHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];
  const F     = "font-family:Aptos,'Segoe UI',Arial,sans-serif;";

  const initial = (p.full_name || '').trim()[0] || '';

  const contactItems = [
    p.location,
    p.linkedin ? urlDisplay(p.linkedin) : null,
    p.email,
    p.phone,
    p.website  ? urlDisplay(p.website)  : null,
    p.github   ? urlDisplay(p.github)   : null,
  ].filter(Boolean);

  const sideTitle = (t) =>
    `<div style="margin-top:18px;margin-bottom:8px;">
       <span style="${F}font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.13em;color:#6366f1;display:block;padding-bottom:5px;border-bottom:1px solid rgba(99,102,241,0.25);">${esc(t)}</span>
     </div>`;

  const rightTitle = (t) =>
    `<div style="margin-bottom:12px;margin-top:2px;padding-bottom:6px;border-bottom:1.5px solid #e2e8f0;">
       <span style="${F}font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#334155;">${esc(t)}</span>
     </div>`;

  const contactHtml = contactItems.length
    ? contactItems.map(item =>
        `<div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;">
           <div style="width:3.5px;height:3.5px;border-radius:50%;background:#6366f1;opacity:0.45;flex-shrink:0;margin-top:5.5px;"></div>
           <p style="${F}font-size:10.5px;color:#475569;margin:0;line-height:1.5;word-break:break-all;">${esc(item)}</p>
         </div>`).join('')
    : '';

  const skillsHtml = skls.length ? skls.map(s => `
    <div style="margin-bottom:9px;">
      ${s.category ? `<p style="${F}font-size:10.5px;font-weight:700;color:#1e293b;margin:0 0 4px;">${esc(s.category)}</p>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:3px 4px;">
        ${(s.items||[]).map(item => `<span style="${F}font-size:9.5px;color:#4f46e5;background:rgba(99,102,241,0.09);border-radius:3px;padding:2px 6px;line-height:1.5;border:0.5px solid rgba(99,102,241,0.15);">${esc(item)}</span>`).join('')}
      </div>
    </div>`).join('') : '';

  const summaryHtml = p.summary
    ? `<div style="margin-bottom:18px;padding-left:12px;border-left:3px solid #6366f1;border-radius:1px;">
         <p style="${F}font-size:12px;line-height:1.68;color:#374151;margin:0;">${mdHtml(p.summary)}</p>
       </div>` : '';

  const highlightsHtml = his.length
    ? `<div style="margin-bottom:16px;">
         ${rightTitle('Career Highlights')}
         ${his.map(h => `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">
           <span style="${F}font-size:10px;color:#6366f1;flex-shrink:0;line-height:1.65;">&#9658;</span>
           <span style="${F}font-size:11.5px;line-height:1.65;color:#374151;">${mdHtml(h.text)}</span>
         </div>`).join('')}
       </div>` : '';

  const expHtml = exps.length
    ? `<div style="margin-bottom:16px;">
         ${rightTitle('Experience')}
         ${exps.map(e => `
           <div style="margin-bottom:13px;page-break-inside:avoid;">
             <div style="display:flex;justify-content:space-between;align-items:flex-start;">
               <div style="flex:1;min-width:0;">
                 <p style="${F}font-size:12.5px;font-weight:800;color:#0f172a;margin:0;letter-spacing:-0.005em;">${esc(e.company)}</p>
                 <p style="${F}font-size:11.5px;color:#6366f1;font-weight:500;margin:1px 0 0;">${esc([e.title, e.location].filter(Boolean).join(' · '))}</p>
               </div>
               ${dateSpan(e.start_date, e.end_date, e.current_job)}
             </div>
             ${e.note ? `<p style="${F}font-size:11px;font-style:italic;color:#64748b;line-height:1.5;margin:4px 0 2px;">${mdHtml(e.note)}</p>` : ''}
             ${bulletList(e.bullets, 11.5)}
           </div>`).join('')}
       </div>` : '';

  const eduHtml = edus.length
    ? `<div style="margin-bottom:16px;">
         ${rightTitle('Education')}
         ${eduRows(edus)}
       </div>` : '';

  const projHtml = pros.length
    ? `<div style="margin-bottom:16px;">
         ${rightTitle('Notable Projects')}
         ${projRows(pros, { nameColor: '#4f46e5' })}
       </div>` : '';

  const certsHtml = certs.length
    ? `<div style="margin-bottom:16px;">
         ${rightTitle('Certifications & Training')}
         ${certRows(certs, { nameColor: '#1e293b', metaColor: '#6366f1' })}
       </div>` : '';

  // Fixed SVG: sidebar tint (0.08 opacity) + separator line; repeats on every PDF page
  // 0.45in margin ≈ 43px; sidebar column = 230px → edge at 273px
  const bgSvg = `
  <svg style="position:fixed;top:-0.45in;left:-0.45in;width:calc(100% + 0.9in);height:calc(100% + 0.9in);z-index:-1;pointer-events:none;" viewBox="0 0 816 1056" preserveAspectRatio="xMinYMin slice" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="274" height="1056" fill="#6366f1" fill-opacity="0.08"/>
    <rect x="273.25" y="0" width="1.5" height="1056" fill="#6366f1" fill-opacity="0.18"/>
  </svg>`;

  const leftCol = `
  <div style="padding-top:24px;padding-right:18px;padding-left:4px;position:relative;">
    <div style="position:relative;margin-bottom:4px;min-height:80px;">
      ${initial ? `<div aria-hidden="true" style="position:absolute;bottom:-14px;right:-10px;font-size:128px;font-weight:900;color:#6366f1;opacity:0.07;line-height:1;user-select:none;pointer-events:none;${F}">${esc(initial)}</div>` : ''}
      <div style="position:relative;">
        <h1 style="${F}font-size:21px;font-weight:900;color:#0f172a;margin:0;line-height:1.2;letter-spacing:-0.01em;">${esc(p.full_name || '')}</h1>
        ${p.tagline ? `<p style="${F}font-size:11px;font-weight:600;color:#6366f1;margin:6px 0 0;line-height:1.4;">${esc(p.tagline)}</p>` : ''}
        ${p.subtitle ? `<p style="${F}font-size:10.5px;color:#94a3b8;margin:3px 0 0;line-height:1.4;">${esc(p.subtitle)}</p>` : ''}
      </div>
    </div>
    ${contactItems.length ? sideTitle('Contact') + contactHtml : ''}
    ${skls.length ? sideTitle('Skills') + skillsHtml : ''}
  </div>`;

  const rightCol = `
  <div style="padding-top:24px;padding-right:4px;">
    ${summaryHtml}${highlightsHtml}${expHtml}${eduHtml}${projHtml}${certsHtml}
  </div>`;

  const body = `
  ${bgSvg}
  <div style="display:grid;grid-template-columns:230px 1fr;gap:0 28px;">
    ${leftCol}
    ${rightCol}
  </div>`;

  return wrap(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITORIAL — serif, creative / media roles
// ─────────────────────────────────────────────────────────────────────────────

const ED_SERIF = "font-family:Georgia,'Garamond','Times New Roman',serif;";
const ED_COLOR = '#4A5568';

function editorialSection(title, content) {
  return `<div style="margin-bottom:14px;">
    <div style="padding-left:10px;border-left:3px solid ${ED_COLOR};margin-bottom:10px;margin-top:2px;">
      <span style="${ED_SERIF}font-size:11.5px;font-weight:700;font-variant:small-caps;letter-spacing:0.08em;color:${ED_COLOR};">${esc(title)}</span>
    </div>${content}</div>`;
}

function buildEditorialHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  const contactParts = [p.email, p.phone, p.location,
    p.website  && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const header = `
    <div style="text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e2e8f0;">
      <h1 style="${ED_SERIF}font-size:28px;font-weight:600;color:#0f172a;margin:0;line-height:1.15;letter-spacing:0.01em;">${esc(p.full_name || '')}</h1>
      ${p.tagline  ? `<p style="${ED_SERIF}font-size:13px;font-style:italic;color:#64748b;margin:6px 0 0;">${esc(p.tagline)}</p>` : ''}
      ${p.subtitle ? `<p style="font-size:11px;color:#94a3b8;margin:3px 0 0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.subtitle)}</p>` : ''}
      ${contactParts.length ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;font-size:10.5px;color:#64748b;margin:8px 0 0;${ED_SERIF}">
        ${contactParts.map((part, i) => `${i > 0 ? '<span style="color:#cbd5e1;padding:0 8px;">|</span>' : ''}${esc(part)}`).join('')}
      </div>` : ''}
    </div>`;

  const summaryBlock = p.summary ? editorialSection('Summary',
    `<p style="${ED_SERIF}font-size:11.5px;line-height:1.62;color:#374151;">${mdHtml(p.summary)}</p>`) : '';

  const highlightsBlock = his.length ? editorialSection('Career Highlights',
    `<ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:5px;">
      ${his.map(h => `<li style="display:flex;align-items:flex-start;gap:8px;${ED_SERIF}font-size:11.5px;line-height:1.6;color:#374151;">
        <span style="color:#94a3b8;flex-shrink:0;line-height:1.6;font-size:11px;">•</span><span>${mdHtml(h.text)}</span></li>`).join('')}
    </ul>`) : '';

  const expBlock = exps.length ? editorialSection('Experience',
    exps.map(exp => `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <p style="${ED_SERIF}font-size:12.5px;font-weight:700;color:#0f172a;margin:0;">${esc(exp.company)}</p>
            <p style="${ED_SERIF}font-size:11.5px;font-style:italic;color:${ED_COLOR};margin:1px 0 0;">${esc([exp.title, exp.location].filter(Boolean).join(' · '))}</p>
          </div>
          ${dateSpan(exp.start_date, exp.end_date, exp.current_job)}
        </div>
        ${exp.note ? `<p style="${ED_SERIF}font-size:11px;font-style:italic;color:#64748b;line-height:1.5;margin:3px 0 2px;">${esc(exp.note)}</p>` : ''}
        ${bulletList(exp.bullets, 11.5)}
      </div>`).join('')) : '';

  const eduBlock = edus.length ? editorialSection('Education',
    edus.map(edu => `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <p style="${ED_SERIF}font-size:12.5px;font-weight:700;color:#0f172a;margin:0;">${esc(edu.school)}</p>
          <p style="${ED_SERIF}font-size:11.5px;font-style:italic;color:#64748b;margin:1px 0 0;">${esc([edu.degree, edu.field].filter(Boolean).join(', '))}${edu.gpa ? ` <span style="color:#94a3b8;">· GPA ${esc(edu.gpa)}</span>` : ''}</p>
          ${edu.details ? `<p style="${ED_SERIF}font-size:11px;font-style:italic;color:#94a3b8;margin:2px 0 0;">${esc(edu.details)}</p>` : ''}
        </div>
        ${dateSpan(edu.start_date, edu.end_date)}
      </div>`).join('')) : '';

  const skillsBlock = skls.length ? editorialSection('Skills',
    skls.map(s => `
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:5px;">
        ${s.category ? `<span style="${ED_SERIF}font-size:11.5px;font-weight:700;font-variant:small-caps;color:#0f172a;min-width:90px;flex-shrink:0;">${esc(s.category)}</span>` : ''}
        <span style="${ED_SERIF}font-size:11.5px;color:#475569;">${esc((s.items || []).join(', '))}</span>
      </div>`).join('')) : '';

  const projBlock = pros.length ? editorialSection('Notable Projects',
    pros.map(proj => `
      <p style="${ED_SERIF}font-size:11.5px;line-height:1.55;margin:0 0 5px;">
        <strong style="color:${ED_COLOR};">${esc(proj.name)}</strong>${proj.description ? ` — ${mdHtml(proj.description)}` : ''}
      </p>`).join('')) : '';

  const certGroups = groupCerts(certs);
  const certBlock = certGroups.length ? editorialSection('Certifications &amp; Training',
    certGroups.map(g => `
      ${g.label ? `<p style="${ED_SERIF}font-size:10.5px;font-weight:700;font-variant:small-caps;color:${ED_COLOR};margin-bottom:3px;">${esc(g.label)}</p>` : ''}
      ${g.items.map(c => `<p style="${ED_SERIF}font-size:11.5px;color:#374151;line-height:1.5;margin-bottom:3px;">
        <strong>${esc(c.name)}</strong>${c.issuer ? ` · <span style="color:${ED_COLOR};">${esc(c.issuer)}</span>` : ''}${certYear(c.date) ? ` <span style="color:#94a3b8;">${certYear(c.date)}</span>` : ''}
      </p>`).join('')}`).join('')) : '';

  const body = `${header}${summaryBlock}${highlightsBlock}${expBlock}${eduBlock}${skillsBlock}${projBlock}${certBlock}`;
  return wrap(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICAL — engineering, data, devops, ML/AI
// ─────────────────────────────────────────────────────────────────────────────

const TC_MONO  = "font-family:'Courier New',Consolas,Menlo,Monaco,monospace;";
const TC_BLUE  = '#1D4ED8';

function technicalSection(title, content) {
  return `<div style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;margin-top:2px;border-bottom:2px solid #BFDBFE;padding-bottom:4px;">
      <span style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:${TC_BLUE};">${esc(title)}</span>
    </div>${content}</div>`;
}

function buildTechnicalHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  const contactParts = [p.email, p.phone, p.location,
    p.website  && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const header = `
    <div style="margin-bottom:16px;">
      <h1 style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:26px;font-weight:800;color:#0f172a;margin:0;line-height:1.15;letter-spacing:-0.01em;">${esc(p.full_name || '')}</h1>
      ${p.tagline  ? `<p style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:12.5px;font-weight:500;color:${TC_BLUE};margin:4px 0 0;">${esc(p.tagline)}</p>` : ''}
      ${p.subtitle ? `<p style="${TC_MONO}font-size:10.5px;color:#64748b;margin:3px 0 0;">${esc(p.subtitle)}</p>` : ''}
      ${contactParts.length ? `<div style="display:flex;flex-wrap:wrap;font-size:10.5px;color:#475569;margin:7px 0 0;${TC_MONO}">
        ${contactParts.map((part, i) => `${i > 0 ? '<span style="color:#BFDBFE;padding:0 8px;">·</span>' : ''}${esc(part)}`).join('')}
      </div>` : ''}
      <div style="height:2px;background:#BFDBFE;margin-top:12px;"></div>
    </div>`;

  const summaryBlock = p.summary ? technicalSection('Summary',
    `<p style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:11.5px;line-height:1.56;color:#374151;">${mdHtml(p.summary)}</p>`) : '';

  const skillsBlock = skls.length ? technicalSection('Technical Skills',
    skls.map(s => `
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;">
        ${s.category ? `<span style="${TC_MONO}font-size:10.5px;font-weight:700;color:${TC_BLUE};min-width:88px;flex-shrink:0;">${esc(s.category)}</span>` : ''}
        <span style="${TC_MONO}font-size:10.5px;color:#334155;line-height:1.5;">${esc((s.items || []).join('  ·  '))}</span>
      </div>`).join('')) : '';

  const highlightsBlock = his.length ? technicalSection('Career Highlights',
    `<ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:4px;">
      ${his.map(h => `<li style="display:flex;align-items:flex-start;gap:7px;font-size:11.5px;line-height:1.56;color:#374151;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
        <span style="${TC_MONO}color:#BFDBFE;flex-shrink:0;line-height:1.6;font-size:10px;">&#9658;</span><span>${mdHtml(h.text)}</span></li>`).join('')}
    </ul>`) : '';

  const expBlock = exps.length ? technicalSection('Experience',
    exps.map(exp => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <p style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:12.5px;font-weight:700;color:#0f172a;margin:0;">${esc(exp.company)}</p>
            <p style="${TC_MONO}font-size:10.5px;font-style:italic;color:#475569;margin:1px 0 0;">${esc([exp.title, exp.location].filter(Boolean).join(' · '))}</p>
          </div>
          ${dateSpan(exp.start_date, exp.end_date, exp.current_job)}
        </div>
        ${exp.note ? `<p style="font-size:11px;font-style:italic;color:#64748b;line-height:1.5;margin:3px 0 2px;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(exp.note)}</p>` : ''}
        ${bulletList(exp.bullets, 11.5)}
      </div>`).join('')) : '';

  const eduBlock = edus.length ? technicalSection('Education',
    edus.map(edu => `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <p style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:12.5px;font-weight:700;color:#0f172a;margin:0;">${esc(edu.school)}</p>
          <p style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:11.5px;color:#64748b;margin:1px 0 0;">${esc([edu.degree, edu.field].filter(Boolean).join(', '))}${edu.gpa ? ` <span style="color:#94a3b8;">· GPA ${esc(edu.gpa)}</span>` : ''}</p>
        </div>
        ${dateSpan(edu.start_date, edu.end_date)}
      </div>`).join('')) : '';

  const projBlock = pros.length ? technicalSection('Notable Projects',
    pros.map(proj => `
      <p style="font-size:11.5px;line-height:1.5;margin:0 0 5px;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
        <strong style="${TC_MONO}font-size:11px;color:${TC_BLUE};">${esc(proj.name)}</strong>${proj.description ? ` — ${mdHtml(proj.description)}` : ''}
      </p>`).join('')) : '';

  const certGroups = groupCerts(certs);
  const certBlock = certGroups.length ? technicalSection('Certifications &amp; Training',
    certGroups.map(g => `
      ${g.label ? `<p style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:10.5px;font-weight:700;color:${TC_BLUE};margin-bottom:3px;">${esc(g.label)}</p>` : ''}
      ${g.items.map(c => `<p style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:11.5px;color:#374151;line-height:1.5;margin-bottom:3px;">
        <strong>${esc(c.name)}</strong>${c.issuer ? ` · <span style="${TC_MONO}font-size:10.5px;color:${TC_BLUE};">${esc(c.issuer)}</span>` : ''}${certYear(c.date) ? ` <span style="color:#94a3b8;">${certYear(c.date)}</span>` : ''}
      </p>`).join('')}`).join('')) : '';

  const body = `${header}${summaryBlock}${skillsBlock}${highlightsBlock}${expBlock}${eduBlock}${projBlock}${certBlock}`;
  return wrap(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// HERITAGE — classical, finance, law, consulting
// ─────────────────────────────────────────────────────────────────────────────

const HG_SERIF = "font-family:Georgia,'Garamond','Times New Roman',serif;";
const HG_BURG  = '#7C2D12';
const HG_RULE  = '#9CA3AF';

function heritageSection(title, content) {
  return `<div style="margin:2px 0 18px;">
    <div style="height:1px;background:${HG_RULE};"></div>
    <div style="text-align:center;padding:4px 8px;">
      <span style="${HG_SERIF}font-size:11.5px;font-weight:600;font-variant:small-caps;letter-spacing:0.12em;color:${HG_BURG};">${esc(title)}</span>
    </div>
    <div style="height:1px;background:${HG_RULE};"></div>
    <div style="margin-top:8px;">${content}</div>
  </div>`;
}

function buildHeritageHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  const contactParts = [p.email, p.phone, p.location,
    p.website  && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const header = `
    <div style="text-align:center;margin-bottom:22px;">
      <h1 style="${HG_SERIF}font-size:30px;font-weight:600;color:#1C1917;margin:0;line-height:1.15;letter-spacing:0.02em;">${esc(p.full_name || '')}</h1>
      ${p.tagline  ? `<p style="${HG_SERIF}font-size:12.5px;font-variant:small-caps;letter-spacing:0.1em;color:#57534E;margin:5px 0 0;">${esc(p.tagline)}</p>` : ''}
      ${p.subtitle ? `<p style="${HG_SERIF}font-size:11px;font-style:italic;color:#78716C;margin:3px 0 0;">${esc(p.subtitle)}</p>` : ''}
      ${contactParts.length ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;font-size:10.5px;color:#57534E;margin:8px 0 0;${HG_SERIF}">
        ${contactParts.map((part, i) => `${i > 0 ? `<span style="color:${HG_RULE};padding:0 8px;">·</span>` : ''}${esc(part)}`).join('')}
      </div>` : ''}
      <div style="margin:14px auto 0;max-width:420px;">
        <div style="height:1px;background:${HG_RULE};"></div>
        <div style="height:3px;"></div>
        <div style="height:1px;background:${HG_RULE};"></div>
      </div>
    </div>`;

  const summaryBlock = p.summary ? heritageSection('Summary',
    `<p style="${HG_SERIF}font-size:12px;line-height:1.65;color:#1C1917;">${mdHtml(p.summary)}</p>`) : '';

  const highlightsBlock = his.length ? heritageSection('Career Highlights',
    `<ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:5px;">
      ${his.map(h => `<li style="display:flex;align-items:flex-start;gap:8px;${HG_SERIF}font-size:12px;line-height:1.65;color:#1C1917;">
        <span style="color:${HG_BURG};flex-shrink:0;line-height:1.65;font-size:11px;">•</span><span>${mdHtml(h.text)}</span></li>`).join('')}
    </ul>`) : '';

  const expBlock = exps.length ? heritageSection('Experience',
    exps.map(exp => `
      <div style="margin-bottom:13px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <p style="${HG_SERIF}font-size:13px;font-weight:700;color:#1C1917;margin:0;">${esc(exp.company)}</p>
            <p style="${HG_SERIF}font-size:12px;font-style:italic;color:#57534E;margin:1px 0 0;">${esc([exp.title, exp.location].filter(Boolean).join(' · '))}</p>
          </div>
          ${dateSpan(exp.start_date, exp.end_date, exp.current_job)}
        </div>
        ${exp.note ? `<p style="${HG_SERIF}font-size:11.5px;font-style:italic;color:#78716C;line-height:1.5;margin:3px 0 2px;">${esc(exp.note)}</p>` : ''}
        ${bulletList(exp.bullets, 12)}
      </div>`).join('')) : '';

  const eduBlock = edus.length ? heritageSection('Education',
    edus.map(edu => `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <p style="${HG_SERIF}font-size:13px;font-weight:700;color:#1C1917;margin:0;">${esc(edu.school)}</p>
          <p style="${HG_SERIF}font-size:12px;font-style:italic;color:#57534E;margin:1px 0 0;">${esc([edu.degree, edu.field].filter(Boolean).join(', '))}${edu.gpa ? ` <span style="color:#94a3b8;">· GPA ${esc(edu.gpa)}</span>` : ''}</p>
          ${edu.details ? `<p style="${HG_SERIF}font-size:11px;font-style:italic;color:#78716C;margin:2px 0 0;">${esc(edu.details)}</p>` : ''}
        </div>
        <div style="text-align:right;">
          ${dateSpan(edu.start_date, edu.end_date)}
          ${edu.location ? `<p style="font-size:10.2px;color:#94a3b8;margin:2px 0 0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(edu.location)}</p>` : ''}
        </div>
      </div>`).join('')) : '';

  const skillsBlock = skls.length ? heritageSection('Skills',
    skls.map(s => `
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:5px;">
        ${s.category ? `<span style="${HG_SERIF}font-size:12px;font-weight:700;font-variant:small-caps;color:${HG_BURG};min-width:90px;flex-shrink:0;letter-spacing:0.06em;">${esc(s.category)}</span>` : ''}
        <span style="${HG_SERIF}font-size:12px;color:#374151;">${esc((s.items || []).join(' · '))}</span>
      </div>`).join('')) : '';

  const projBlock = pros.length ? heritageSection('Notable Projects',
    pros.map(proj => `
      <p style="${HG_SERIF}font-size:12px;line-height:1.55;margin:0 0 6px;">
        <strong style="color:${HG_BURG};">${esc(proj.name)}</strong>${proj.description ? ` — ${mdHtml(proj.description)}` : ''}
      </p>`).join('')) : '';

  const certGroups = groupCerts(certs);
  const certBlock = certGroups.length ? heritageSection('Certifications &amp; Training',
    certGroups.map(g => `
      ${g.label ? `<p style="${HG_SERIF}font-size:11px;font-weight:700;font-variant:small-caps;color:${HG_BURG};margin-bottom:3px;letter-spacing:0.06em;">${esc(g.label)}</p>` : ''}
      ${g.items.map(c => `<p style="${HG_SERIF}font-size:12px;color:#1C1917;line-height:1.5;margin-bottom:3px;">
        <strong>${esc(c.name)}</strong>${c.issuer ? ` · <span style="color:#57534E;">${esc(c.issuer)}</span>` : ''}${certYear(c.date) ? ` <span style="color:#94a3b8;">${certYear(c.date)}</span>` : ''}
      </p>`).join('')}`).join('')) : '';

  const body = `${header}${summaryBlock}${highlightsBlock}${expBlock}${eduBlock}${skillsBlock}${projBlock}${certBlock}`;
  return wrap(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADUATE — new grads & early career: education and projects lead
// ─────────────────────────────────────────────────────────────────────────────

const GR_GREEN = '#047857';

function gradSection(title, content) {
  return `<div style="margin-bottom:13px;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;margin-top:2px;">
      <span style="font-family:Aptos,'Segoe UI',Arial,sans-serif;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.16em;color:${GR_GREEN};white-space:nowrap;">${esc(title)}</span>
      <div style="flex:1;height:1px;background:#a7f3d0;"></div>
    </div>${content}</div>`;
}

function buildGraduateHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];
  const F     = "font-family:Aptos,'Segoe UI',Arial,sans-serif;";

  const contactParts = [p.email, p.phone, p.location,
    p.website  && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const header = `
    <div style="margin-bottom:14px;border-bottom:2px solid ${GR_GREEN};padding-bottom:12px;">
      <h1 style="${F}font-size:22px;font-weight:800;color:#0f172a;margin:0;letter-spacing:-0.01em;line-height:1.15;">${esc(p.full_name || '')}</h1>
      ${p.tagline  ? `<p style="${F}font-size:12px;font-weight:600;color:${GR_GREEN};margin:4px 0 0;">${esc(p.tagline)}</p>` : ''}
      ${p.subtitle ? `<p style="${F}font-size:11px;color:#64748b;margin:2px 0 0;">${esc(p.subtitle)}</p>` : ''}
      ${contactParts.length ? `<p style="${F}font-size:10.2px;color:#475569;margin:7px 0 0;line-height:1.4;">${esc(contactParts.join('  ·  '))}</p>` : ''}
    </div>`;

  const eduRowsGrad = edus.map(e => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px;page-break-inside:avoid;">
      <div style="flex:1;min-width:0;">
        <p style="${F}font-size:12.2px;font-weight:700;color:#0f172a;margin:0;">${esc(e.school)}</p>
        <p style="${F}font-size:11.5px;color:#374151;margin:1px 0 0;">${esc([e.degree, e.field].filter(Boolean).join(', '))}${e.gpa ? `<span style="color:${GR_GREEN};font-weight:600;margin-left:8px;">GPA ${esc(e.gpa)}</span>` : ''}</p>
        ${e.details ? `<p style="${F}font-size:10.8px;color:#64748b;margin:2px 0 0;">${esc(e.details)}</p>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;padding-left:12px;">
        ${dateSpan(e.start_date, e.end_date)}
        ${e.location ? `<p style="${F}font-size:10.2px;color:#94a3b8;margin:2px 0 0;">${esc(e.location)}</p>` : ''}
      </div>
    </div>`).join('');

  const summaryHtml    = p.summary    ? gradSection('Summary', `<p style="${F}font-size:11.8px;line-height:1.55;color:#374151;margin:0;">${mdHtml(p.summary)}</p>`) : '';
  const highlightsHtml = his.length   ? gradSection('Highlights', bulletList(his.map(h => h.text), 11.8)) : '';
  const educationHtml  = edus.length  ? gradSection('Education', eduRowsGrad) : '';
  const skillsHtml     = skls.length  ? gradSection('Skills', skillRows(skls, { boldCat: true, catColor: '#0f172a' })) : '';
  const projectsHtml   = pros.length  ? gradSection('Projects', projRows(pros, { nameColor: GR_GREEN, descColor: '#374151' })) : '';
  const experienceHtml = exps.length  ? gradSection('Experience', expRows(exps, { titleFirst: true, titleColor: GR_GREEN, titleBold: true, companyColor: '#0f172a' })) : '';
  const certsHtml      = certs.length ? gradSection('Certifications & Training', certRows(certs, { nameColor: '#0f172a', metaColor: GR_GREEN })) : '';

  const body = `${header}${summaryHtml}${highlightsHtml}${educationHtml}${skillsHtml}${projectsHtml}${experienceHtml}${certsHtml}`;
  return wrap(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC — research, faculty, PhD & scientist roles (CV style)
// ─────────────────────────────────────────────────────────────────────────────

const AC_SERIF = "font-family:Georgia,'Garamond','Times New Roman',serif;";
const AC_GREEN = '#14532D';

function academicSection(title, content) {
  return `<div style="margin-bottom:14px;">
    <div style="border-bottom:1px solid ${AC_GREEN};padding-bottom:3px;margin-bottom:9px;margin-top:2px;">
      <span style="${AC_SERIF}font-size:12px;font-weight:700;font-variant:small-caps;letter-spacing:0.1em;color:${AC_GREEN};">${esc(title)}</span>
    </div>${content}</div>`;
}

function acBullets(items) {
  const filledItems = (items || []).filter(Boolean);
  if (!filledItems.length) return '';
  return `<ul style="margin-top:4px;list-style:none;padding:0;display:flex;flex-direction:column;gap:4px;">
    ${filledItems.map(b => `<li style="display:flex;align-items:flex-start;gap:8px;${AC_SERIF}font-size:11.5px;line-height:1.6;color:#1C1917;"><span style="color:#78716C;flex-shrink:0;line-height:1.6;font-size:11px;">&#8226;</span><span>${mdHtml(b)}</span></li>`).join('')}
  </ul>`;
}

function buildAcademicHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  const contactParts = [p.email, p.phone, p.location,
    p.website  && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const header = `
    <div style="text-align:center;margin-bottom:16px;">
      <h1 style="${AC_SERIF}font-size:25px;font-weight:600;font-variant:small-caps;color:#1C1917;margin:0;line-height:1.15;letter-spacing:0.03em;">${esc(p.full_name || '')}</h1>
      ${p.tagline  ? `<p style="${AC_SERIF}font-size:12.5px;font-style:italic;color:#57534E;margin:5px 0 0;">${esc(p.tagline)}</p>` : ''}
      ${p.subtitle ? `<p style="${AC_SERIF}font-size:11px;color:#78716C;margin:2px 0 0;">${esc(p.subtitle)}</p>` : ''}
      ${contactParts.length ? `<p style="${AC_SERIF}font-size:10.5px;color:#57534E;margin:7px 0 0;line-height:1.4;">${contactParts.map(esc).join('&nbsp;&nbsp;&middot;&nbsp;&nbsp;')}</p>` : ''}
      <div style="height:1px;background:${AC_GREEN};margin:12px auto 0;max-width:460px;opacity:0.5;"></div>
    </div>`;

  const eduRowsAc = edus.map(e => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px;page-break-inside:avoid;">
      <div style="flex:1;min-width:0;">
        <p style="${AC_SERIF}font-size:12.5px;font-weight:700;color:#1C1917;margin:0;">${esc(e.school)}</p>
        <p style="${AC_SERIF}font-size:11.5px;font-style:italic;color:#57534E;margin:1px 0 0;">${esc([e.degree, e.field].filter(Boolean).join(', '))}${e.gpa ? `<span style="color:#78716C;margin-left:8px;">· GPA ${esc(e.gpa)}</span>` : ''}</p>
        ${e.details ? `<p style="${AC_SERIF}font-size:11px;color:#78716C;margin:2px 0 0;">${esc(e.details)}</p>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;padding-left:8px;">
        ${dateSpan(e.start_date, e.end_date)}
        ${e.location ? `<p style="font-size:10.2px;color:#94a3b8;margin:2px 0 0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(e.location)}</p>` : ''}
      </div>
    </div>`).join('');

  const expRowsAc = exps.map(e => `
    <div style="margin-bottom:11px;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;min-width:0;">
          <p style="${AC_SERIF}font-size:12.5px;font-weight:700;color:#1C1917;margin:0;">${esc(e.title)}</p>
          <p style="${AC_SERIF}font-size:11.5px;font-style:italic;color:#57534E;margin:1px 0 0;">${esc([e.company, e.location].filter(Boolean).join(' · '))}</p>
        </div>
        ${dateSpan(e.start_date, e.end_date, e.current_job)}
      </div>
      ${e.note ? `<p style="${AC_SERIF}font-size:11px;font-style:italic;color:#78716C;line-height:1.5;margin:3px 0 2px;">${mdHtml(e.note)}</p>` : ''}
      ${acBullets(e.bullets)}
    </div>`).join('');

  const projRowsAc = pros.map(proj => `
    <p style="${AC_SERIF}font-size:11.5px;line-height:1.6;color:#1C1917;margin:0 0 6px;page-break-inside:avoid;">
      <strong style="color:${AC_GREEN};">${esc(proj.name)}</strong>${proj.description ? ` ${mdHtml(proj.description)}` : ''}
    </p>`).join('');

  const skillRowsAc = skls.map(s => `
    <div style="display:flex;gap:10px;margin-bottom:5px;">
      ${s.category ? `<span style="${AC_SERIF}font-size:11.5px;font-weight:700;font-variant:small-caps;color:${AC_GREEN};min-width:96px;flex-shrink:0;">${esc(s.category)}</span>` : ''}
      <span style="${AC_SERIF}font-size:11.5px;color:#1C1917;flex:1;">${esc((s.items || []).join(', '))}</span>
    </div>`).join('');

  const certGroups = groupCerts(certs);
  const certRowsAc = certGroups.map(g => `
    <div style="${AC_SERIF}font-size:11.2px;line-height:1.55;color:#1C1917;margin-bottom:4px;page-break-inside:avoid;">
      ${g.label ? `<strong>${esc(g.label)}: </strong>` : ''}
      ${g.items.map((c, ci) => {
        const year = certYear(c.issued_date || c.expiry_date);
        return `${ci > 0 ? '<span style="color:#78716C;padding:0 5px;">—</span>' : ''}${esc(c.name)}${c.issuer ? `<span style="color:#57534E;"> · ${esc(c.issuer)}</span>` : ''}${year ? `<span style="color:#78716C;"> · ${esc(year)}</span>` : ''}`;
      }).join('')}
    </div>`).join('');

  const summaryHtml    = p.summary    ? academicSection('Research Profile', `<p style="${AC_SERIF}font-size:11.5px;line-height:1.62;color:#1C1917;margin:0;">${mdHtml(p.summary)}</p>`) : '';
  const highlightsHtml = his.length   ? academicSection('Selected Achievements', acBullets(his.map(h => h.text))) : '';
  const educationHtml  = edus.length  ? academicSection('Education', eduRowsAc) : '';
  const projectsHtml   = pros.length  ? academicSection('Research & Publications', projRowsAc) : '';
  const experienceHtml = exps.length  ? academicSection('Appointments & Experience', expRowsAc) : '';
  const skillsHtml     = skls.length  ? academicSection('Skills & Methods', skillRowsAc) : '';
  const certsHtml      = certs.length ? academicSection('Honors & Certifications', certRowsAc) : '';

  const body = `${header}${summaryHtml}${highlightsHtml}${educationHtml}${projectsHtml}${experienceHtml}${skillsHtml}${certsHtml}`;
  return wrap(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// SWISS — international typographic style: black, red, precise grid
// ─────────────────────────────────────────────────────────────────────────────

const SW_HELV = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;";
const SW_RED  = '#DC2626';
const SW_INK  = '#111111';

function swissSection(title, content) {
  return `<div style="margin-bottom:13px;">
    <div style="margin-bottom:9px;margin-top:2px;">
      <div style="height:2px;background:${SW_INK};margin-bottom:5px;"></div>
      <span style="${SW_HELV}font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.22em;color:${SW_INK};">${esc(title)}</span>
    </div>${content}</div>`;
}

function swBullets(items) {
  const filledItems = (items || []).filter(Boolean);
  if (!filledItems.length) return '';
  return `<ul style="margin-top:4px;list-style:none;padding:0;display:flex;flex-direction:column;gap:4px;">
    ${filledItems.map(b => `<li style="display:flex;align-items:flex-start;gap:8px;${SW_HELV}font-size:11.2px;line-height:1.55;color:#262626;"><span style="color:${SW_RED};flex-shrink:0;line-height:1.55;font-size:10px;">&#8226;</span><span>${mdHtml(b)}</span></li>`).join('')}
  </ul>`;
}

function buildSwissHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  const contactParts = [p.email, p.phone, p.location,
    p.website  && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const header = `
    <div style="margin-bottom:16px;">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="width:10px;height:10px;background:${SW_RED};flex-shrink:0;margin-top:8px;"></div>
        <h1 style="${SW_HELV}font-size:24px;font-weight:800;text-transform:uppercase;color:${SW_INK};margin:0;letter-spacing:0.04em;line-height:1.1;">${esc(p.full_name || '')}</h1>
      </div>
      ${p.tagline  ? `<p style="${SW_HELV}font-size:11.5px;font-weight:600;color:${SW_RED};margin:6px 0 0;letter-spacing:0.06em;text-transform:uppercase;">${esc(p.tagline)}</p>` : ''}
      ${p.subtitle ? `<p style="${SW_HELV}font-size:10.8px;color:#525252;margin:3px 0 0;">${esc(p.subtitle)}</p>` : ''}
      ${contactParts.length ? `<p style="${SW_HELV}font-size:10px;color:#404040;margin:8px 0 0;letter-spacing:0.03em;line-height:1.45;">${esc(contactParts.join('   /   '))}</p>` : ''}
    </div>`;

  const expRowsSw = exps.map(e => `
    <div style="margin-bottom:11px;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;min-width:0;">
          <p style="${SW_HELV}font-size:12px;font-weight:800;color:${SW_INK};margin:0;letter-spacing:0.01em;">${esc(e.company)}</p>
          <p style="${SW_HELV}font-size:11px;font-weight:500;color:${SW_RED};margin:1px 0 0;">${esc([e.title, e.location].filter(Boolean).join(' — '))}</p>
        </div>
        <span style="${SW_HELV}font-size:10px;font-weight:600;color:#737373;white-space:nowrap;flex-shrink:0;padding-left:12px;letter-spacing:0.04em;">${esc([e.start_date, e.current_job ? 'Present' : e.end_date].filter(Boolean).join(' – '))}</span>
      </div>
      ${e.note ? `<p style="${SW_HELV}font-size:10.8px;font-style:italic;color:#525252;line-height:1.5;margin:4px 0 2px;">${mdHtml(e.note)}</p>` : ''}
      ${swBullets(e.bullets)}
    </div>`).join('');

  const eduRowsSw = edus.map(e => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;page-break-inside:avoid;">
      <div style="flex:1;min-width:0;">
        <p style="${SW_HELV}font-size:12px;font-weight:800;color:${SW_INK};margin:0;">${esc(e.school)}</p>
        <p style="${SW_HELV}font-size:11px;color:#404040;margin:1px 0 0;">${esc([e.degree, e.field].filter(Boolean).join(', '))}${e.gpa ? `<span style="color:#737373;margin-left:8px;">· GPA ${esc(e.gpa)}</span>` : ''}</p>
      </div>
      <span style="${SW_HELV}font-size:10px;font-weight:600;color:#737373;white-space:nowrap;flex-shrink:0;padding-left:12px;">${esc([e.start_date, e.end_date].filter(Boolean).join(' – '))}</span>
    </div>`).join('');

  const skillRowsSw = skls.map(s => `
    <div style="display:grid;grid-template-columns:110px 1fr;column-gap:10px;align-items:baseline;margin-bottom:5px;">
      ${s.category ? `<span style="${SW_HELV}font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:${SW_INK};">${esc(s.category)}</span>` : '<span></span>'}
      <span style="${SW_HELV}font-size:11.2px;color:#262626;">${esc((s.items || []).join(' / '))}</span>
    </div>`).join('');

  const summaryHtml    = p.summary    ? swissSection('Profile', `<p style="${SW_HELV}font-size:11.5px;line-height:1.55;color:#262626;margin:0;">${mdHtml(p.summary)}</p>`) : '';
  const highlightsHtml = his.length   ? swissSection('Highlights', swBullets(his.map(h => h.text))) : '';
  const experienceHtml = exps.length  ? swissSection('Experience', expRowsSw) : '';
  const educationHtml  = edus.length  ? swissSection('Education', eduRowsSw) : '';
  const skillsHtml     = skls.length  ? swissSection('Competencies', skillRowsSw) : '';
  const projectsHtml   = pros.length  ? swissSection('Projects', projRows(pros, { nameColor: SW_INK, descColor: '#262626', fontSize: 11.2 })) : '';
  const certsHtml      = certs.length ? swissSection('Certifications', certRows(certs, { nameColor: SW_INK, metaColor: '#525252' })) : '';

  const body = `${header}${summaryHtml}${highlightsHtml}${experienceHtml}${educationHtml}${skillsHtml}${projectsHtml}${certsHtml}`;
  return wrap(body);
}

// ─────────────────────────────────────────────────────────────────────────────

function applyCompactMode(resume) {
  if (!resume.compact_mode) return resume;
  return {
    ...resume,
    experiences: (resume.experiences || []).map((exp, i) =>
      i < 3
        ? { ...exp, bullets: (exp.bullets || []).slice(0, 4) }
        : { ...exp, bullets: [], note: null }
    ),
  };
}

function buildResumeHtml(resumeRaw) {
  const resume = applyCompactMode(resumeRaw);
  let html;
  switch (resume.template) {
    case 'modern':     html = buildModernHtml(resume); break;
    case 'executive':  html = buildExecutiveHtml(resume); break;
    case 'minimal':    html = buildMinimalHtml(resume); break;
    case 'leadership': html = buildLeadershipHtml(resume); break;
    case 'compact':    html = buildCompactHtml(resume); break;
    case 'luxe':       html = buildLuxeHtml(resume); break;
    case 'prestige':   html = buildPrestigeHtml(resume); break;
    case 'folio':      html = buildFolioHtml(resume); break;
    case 'editorial':  html = buildEditorialHtml(resume); break;
    case 'technical':  html = buildTechnicalHtml(resume); break;
    case 'heritage':   html = buildHeritageHtml(resume); break;
    case 'graduate':   html = buildGraduateHtml(resume); break;
    case 'academic':   html = buildAcademicHtml(resume); break;
    case 'swiss':      html = buildSwissHtml(resume); break;
    default:           html = buildClassicHtml(resume);
  }
  // Document title becomes the PDF Title metadata in Chrome's print-to-PDF
  const name = String((resume.personal || {}).full_name || '').trim();
  html = html.replace('<head>', `<head><title>${esc(name ? `${name} — Resume` : 'Resume')}</title>`);
  return applyResumeAppearance(html, resume);
}

function wrap(body, extraCss = '') {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:Aptos,'Segoe UI',Arial,sans-serif; font-size:12.2px; color:#1e293b; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
@page { margin:0.45in; size:Letter; } ${extraCss}</style></head><body>${body}</body></html>`;
}

function expRows(exps, opts = {}) {
  return exps.map(e => `
    <div style="margin-bottom:12px;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:${opts.titleFirst?'12':'12.2'}px;font-weight:700;color:${opts.companyColor||'#1e293b'};font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(opts.titleFirst ? e.title : e.company)}</div>
          <div style="font-size:${opts.titleItalic?'11.8':'11.2'}px;color:${opts.titleColor||'#64748b'};font-style:${opts.titleItalic?'italic':'normal'};font-weight:${opts.titleBold?'500':'400'};font-family:Aptos,'Segoe UI',Arial,sans-serif;">
            ${esc(opts.titleFirst ? [e.company, e.location].filter(Boolean).join(' · ') : [e.title, e.location].filter(Boolean).join(' · '))}
          </div>
        </div>
        ${dateSpan(e.start_date, e.end_date, e.current_job)}
      </div>
      ${e.note ? `<p style="font-size:11px;font-style:italic;color:#64748b;font-family:Aptos,'Segoe UI',Arial,sans-serif;line-height:1.5;margin:4px 0 3px;">${mdHtml(e.note)}</p>` : ''}
      ${opts.dash ? bulletListDash(e.bullets) : bulletList(e.bullets)}
    </div>`).join('');
}

function eduRows(edus, opts = {}) {
  return edus.map(e => `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;page-break-inside:avoid;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:12.2px;font-weight:700;color:${opts.schoolColor||'#1e293b'};font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(e.school)}</div>
        <div style="font-size:${opts.bold?'11.2':'11.8'}px;color:${opts.degreeColor||'#64748b'};font-weight:${opts.bold?'500':'400'};font-family:Aptos,'Segoe UI',Arial,sans-serif;">
          ${esc([e.degree, e.field].filter(Boolean).join(', '))}${e.gpa ? `<span style="color:#94a3b8;margin-left:8px;">· GPA ${esc(e.gpa)}</span>` : ''}
        </div>
        ${e.details ? `<div style="font-size:11px;color:#94a3b8;font-style:italic;margin-top:2px;">${esc(e.details)}</div>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:12px;">
        ${dateSpan(e.start_date, e.end_date)}
        ${e.location ? `<div style="font-size:10.2px;color:#94a3b8;margin-top:2px;">${esc(e.location)}</div>` : ''}
      </div>
    </div>`).join('');
}

function skillRows(skls, opts = {}) {
  if (opts.chips) {
    return `<div style="display:flex;flex-direction:column;gap:6px;">${skls.map(s => `
      <div style="display:flex;align-items:flex-start;gap:7px;">
        ${s.category ? `<span style="font-size:11px;font-weight:700;color:#374151;min-width:90px;flex-shrink:0;font-family:Aptos,'Segoe UI',Arial,sans-serif;padding-top:1px;">${esc(s.category)}</span>` : ''}
        <div style="display:flex;flex-wrap:wrap;gap:3px 6px;">${(s.items||[]).map(item => `<span style="font-size:10.2px;background:#eef2ff;color:#4f46e5;padding:1px 7px;border-radius:99px;border:1px solid #c7d2fe;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(item)}</span>`).join('')}</div>
      </div>`).join('')}</div>`;
  }
  if (opts.dots) {
    return `<div style="display:flex;flex-direction:column;gap:5px;">${skls.map(s => `
      <div style="display:grid;grid-template-columns:108px 1fr;column-gap:10px;align-items:baseline;line-height:1.42;">
        ${s.category ? `<span style="font-size:10px;font-weight:700;color:#334155;min-width:0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(s.category)}</span>` : '<span></span>'}
        <span style="font-size:11.2px;color:#475569;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc((s.items||[]).join('  ·  '))}</span>
      </div>`).join('')}</div>`;
  }
  return `<div style="display:flex;flex-direction:column;gap:5px;">${skls.map(s => `
    <div style="display:flex;gap:7px;font-size:11.8px;">
      ${s.category ? `<span style="font-weight:${opts.boldCat?'700':'600'};color:${opts.catColor||'#374151'};min-width:88px;flex-shrink:0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(s.category)}</span>` : ''}
      <span style="color:#475569;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc((s.items||[]).join(', '))}</span>
    </div>`).join('')}</div>`;
}

function projRows(pros, opts = {}) {
  const nameColor = opts.nameColor || '#1e293b';
  const descColor = opts.descColor || '#475569';
  const fontSize = opts.fontSize || 11.5;
  const lineHeight = opts.lineHeight || 1.5;
  const marginBottom = opts.marginBottom ?? 8;
  const F = "font-family:Aptos,'Segoe UI',Arial,sans-serif;";
  return pros.map(proj => `
    <p style="font-size:${fontSize}px;line-height:${lineHeight};color:${descColor};${F}margin:0 0 ${marginBottom}px;page-break-inside:avoid;"><strong style="color:${nameColor};">${esc(proj.name)}</strong>${proj.description ? ` ${mdHtml(proj.description)}` : ''}</p>`).join('');
}

function certRows(certs, opts = {}) {
  const nameColor = opts.nameColor || '#1e293b';
  const metaColor = opts.metaColor || '#64748b';
  const F = "font-family:Aptos,'Segoe UI',Arial,sans-serif;";
  return groupCerts(certs).map(grp => {
    const inline = grp.items.map((c, ci) => {
      const year = certYear(c.issued_date || c.expiry_date);
      return `${ci > 0 ? `<span style="color:#94a3b8;padding:0 5px;">—</span>` : ''}${esc(c.name)}${c.issuer ? `<span style="color:${metaColor};"> · ${esc(c.issuer)}</span>` : ''}${year ? `<span style="color:#94a3b8;"> · ${esc(year)}</span>` : ''}`;
    }).join('');
    return `<div style="font-size:11.5px;line-height:1.5;color:${nameColor};${F}margin-bottom:4px;page-break-inside:avoid;">${grp.label ? `<strong>${esc(grp.label)}: </strong>` : ''}${inline}</div>`;
  }).join('');
}

// ── Classic ───────────────────────────────────────────────────────────────────

function buildClassicHtml(resume) {
  const p    = resume.personal       || {};
  const his  = resume.highlights     || [];
  const exps = resume.experiences    || [];
  const edus = resume.education      || [];
  const skls = resume.skills         || [];
  const pros = resume.projects       || [];
  const certs = resume.certifications || [];

  // Contact row
  const contactItems = [
    p.email,
    p.phone,
    p.location,
    p.website    && p.website.replace(/^https?:\/\/(www\.)?/, ''),
    p.linkedin   && urlDisplay(p.linkedin),
    p.github     && urlDisplay(p.github),
  ].filter(Boolean);

  const contactHtml = contactItems.length
    ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:5px 14px;font-size:10.2px;color:#64748b;margin-bottom:12px;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
        ${contactItems.map((item, i) => `${i > 0 ? '<span style="color:#cbd5e1;">&middot;</span>' : ''}<span>${esc(item)}</span>`).join('')}
      </div>`
    : '';

  const summaryHtml = p.summary
    ? `<div style="margin-bottom:14px;">
        ${sectionHeader('Summary')}
        <p style="font-size:12.2px;line-height:1.56;color:#475569;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${mdHtml(p.summary)}</p>
      </div>`
    : '';

  const highlightsHtml = his.length ? `
    <div style="margin-bottom:14px;">
      ${sectionHeader('Career Highlights')}
      ${bulletList(his.map(h => h.text), 12.2)}
    </div>` : '';

  const experienceHtml = exps.length ? `
    <div style="margin-bottom:14px;">
      ${sectionHeader('Experience')}
      ${exps.map(e => `
        <div style="margin-bottom:12px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:12.2px;font-weight:700;color:#1e293b;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(e.company)}</div>
              <div style="font-size:11.8px;color:#64748b;font-style:italic;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
                ${esc([e.title, e.location].filter(Boolean).join(' · '))}
              </div>
            </div>
            ${dateSpan(e.start_date, e.end_date, e.current_job)}
          </div>
          ${e.note ? `<p style="font-size:11px;font-style:italic;color:#64748b;font-family:Aptos,'Segoe UI',Arial,sans-serif;line-height:1.5;margin:4px 0 3px;">${mdHtml(e.note)}</p>` : ''}
          ${bulletList(e.bullets)}
        </div>`).join('')}
    </div>` : '';

  const educationHtml = edus.length ? `
    <div style="margin-bottom:14px;">
      ${sectionHeader('Education')}
      ${edus.map(e => `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;page-break-inside:avoid;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:12.2px;font-weight:700;color:#1e293b;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(e.school)}</div>
            <div style="font-size:11.8px;color:#64748b;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
              ${esc([e.degree, e.field].filter(Boolean).join(', '))}
              ${e.gpa ? `<span style="color:#94a3b8;margin-left:8px;">· GPA ${esc(e.gpa)}</span>` : ''}
            </div>
            ${e.details ? `<div style="font-size:11px;color:#94a3b8;font-style:italic;margin-top:2px;">${esc(e.details)}</div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:12px;">
            ${dateSpan(e.start_date, e.end_date)}
            ${e.location ? `<div style="font-size:10.2px;color:#94a3b8;margin-top:2px;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(e.location)}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>` : '';

  const skillsHtml = skls.length ? `
    <div style="margin-bottom:14px;">
      ${sectionHeader('Skills')}
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${skls.map(s => `
          <div style="display:flex;gap:7px;font-size:11.8px;">
            ${s.category ? `<span style="font-weight:600;color:#374151;min-width:88px;flex-shrink:0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(s.category)}</span>` : ''}
            <span style="color:#475569;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc((s.items || []).join(', '))}</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  const projectsHtml = pros.length ? `
    <div style="margin-bottom:14px;">
      ${sectionHeader('Notable Projects')}
      ${projRows(pros)}
    </div>` : '';

  const certsHtml = certs.length ? `
    <div style="margin-bottom:14px;">
      ${sectionHeader('Certifications & Training')}
      ${certRows(certs)}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Aptos, 'Segoe UI', Arial, sans-serif;
    font-size: 11.8px;
    color: #1e293b;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { margin: 0.45in; size: Letter; }
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:8px;">
    <h1 style="font-size:22px;font-weight:700;letter-spacing:-0.01em;color:#0f172a;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
      ${esc(p.full_name || '')}
    </h1>
    ${p.tagline ? `<p style="margin-top:5px;font-size:12.2px;color:#64748b;letter-spacing:0.02em;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.tagline)}</p>` : ''}
    ${p.subtitle ? `<p style="margin-top:3px;font-size:11px;color:#94a3b8;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.subtitle)}</p>` : ''}
  </div>
  ${contactHtml}
  ${summaryHtml}
  ${highlightsHtml}
  ${educationHtml}
  ${skillsHtml}
  ${experienceHtml}
  ${projectsHtml}
  ${certsHtml}
</body>
</html>`;
}

// ── Modern ────────────────────────────────────────────────────────────────────

function buildModernHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];
  const recent = exps.slice(0, 3);
  const prior  = exps.slice(3);

  const contactItems = [
    p.email,
    p.phone,
    p.location,
    p.website  && p.website.replace(/^https?:\/\/(www\.)?/, ''),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const contactHtml = contactItems.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:5px 14px;font-size:10.2px;color:#64748b;margin-top:5px;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
        ${contactItems.map((item, i) => `${i > 0 ? '<span style="color:#a5b4fc;">&middot;</span>' : ''}<span>${esc(item)}</span>`).join('')}
      </div>`
    : '';

  const summaryHtml = p.summary
    ? modernSection('Summary', `<p style="font-size:12.2px;line-height:1.56;color:#475569;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${mdHtml(p.summary)}</p>`)
    : '';

  const highlightsHtml = his.length
    ? modernSection('Career Highlights', bulletList(his.map(h => h.text), 12.2))
    : '';

  const experienceHtml = exps.length
    ? modernSection('Experience', expRows(exps, { titleItalic: true, titleColor: '#6366f1' }))
    : '';

  const educationHtml = edus.length
    ? modernSection('Education', eduRows(edus))
    : '';

  const skillsHtml = skls.length
    ? modernSection('Skills', skillRows(skls, { chips: true }))
    : '';

  const projectsHtml = pros.length
    ? modernSection('Notable Projects', projRows(pros, { nameColor: '#4f46e5' }))
    : '';

  const certsHtml = certs.length
    ? modernSection('Certifications & Training', certRows(certs, { nameColor: '#1e293b', metaColor: '#6366f1' }))
    : '';

  const body = `
  <div style="margin-bottom:14px;">
    <h1 style="font-size:23px;font-weight:800;letter-spacing:-0.02em;color:#0f172a;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.full_name || '')}</h1>
    ${p.tagline ? `<p style="margin-top:5px;font-size:12.2px;color:#6366f1;font-weight:500;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.tagline)}</p>` : ''}
    ${p.subtitle ? `<p style="margin-top:2px;font-size:11px;color:#94a3b8;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.subtitle)}</p>` : ''}
    ${contactHtml}
  </div>
  ${summaryHtml}${highlightsHtml}${educationHtml}${skillsHtml}${experienceHtml}${projectsHtml}${certsHtml}`;

  return wrap(body);
}

// ── Executive ─────────────────────────────────────────────────────────────────

function buildExecutiveHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  const contactItems = [
    p.email,
    p.phone,
    p.location,
    p.website  && p.website.replace(/^https?:\/\/(www\.)?/, ''),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const contactHtml = contactItems.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:5px 18px;font-size:10.2px;color:#94a3b8;margin-top:5px;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
        ${contactItems.map((item, i) => `${i > 0 ? '<span style="color:#334155;">&middot;</span>' : ''}<span>${esc(item)}</span>`).join('')}
      </div>`
    : '';

  const summaryHtml = p.summary
    ? execSection('Summary', `<p style="font-size:12.2px;line-height:1.56;color:#475569;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${mdHtml(p.summary)}</p>`)
    : '';

  const highlightsHtml = his.length
    ? execSection('Career Highlights', bulletList(his.map(h => h.text), 12.2))
    : '';

  const experienceHtml = exps.length
    ? execSection('Experience', expRows(exps, { titleBold: true, titleColor: '#475569' }))
    : '';

  const educationHtml = edus.length
    ? execSection('Education', eduRows(edus, { bold: true, schoolColor: '#1e293b' }))
    : '';

  const skillsHtml = skls.length
    ? execSection('Skills', skillRows(skls, { boldCat: true, catColor: '#1e293b' }))
    : '';

  const projectsHtml = pros.length
    ? execSection('Notable Projects', projRows(pros))
    : '';

  const certsHtml = certs.length
    ? execSection('Certifications & Training', certRows(certs))
    : '';

  const extraCss = `
    .exec-header { background:#1e293b; margin:-0.45in -0.45in 0; padding:0.45in 0.45in 18px; }
  `;

  const body = `
  <div class="exec-header">
    <h1 style="font-size:23px;font-weight:800;letter-spacing:-0.01em;color:#f8fafc;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.full_name || '')}</h1>
    ${p.tagline ? `<p style="margin-top:5px;font-size:12.2px;color:#94a3b8;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.tagline)}</p>` : ''}
    ${p.subtitle ? `<p style="margin-top:2px;font-size:11px;color:#64748b;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.subtitle)}</p>` : ''}
    ${contactHtml}
  </div>
  <div style="margin-top:18px;">
    ${summaryHtml}${highlightsHtml}${educationHtml}${skillsHtml}${experienceHtml}${projectsHtml}${certsHtml}
  </div>`;

  return wrap(body, extraCss);
}

// ── Minimal ───────────────────────────────────────────────────────────────────

function buildMinimalHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  const contactItems = [
    p.email,
    p.phone,
    p.location,
    p.website  && p.website.replace(/^https?:\/\/(www\.)?/, ''),
    p.linkedin && urlDisplay(p.linkedin),
    p.github   && urlDisplay(p.github),
  ].filter(Boolean);

  const contactHtml = contactItems.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:4px 12px;font-size:10.2px;color:#475569;margin-top:6px;line-height:1.35;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
        ${contactItems.map((item, i) => `${i > 0 ? '<span style="color:#e2e8f0;">&middot;</span>' : ''}<span>${esc(item)}</span>`).join('')}
      </div>`
    : '';

  const summaryHtml = p.summary
    ? minimalSection('Profile', `<p style="font-size:11.8px;line-height:1.48;color:#334155;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${mdHtml(p.summary)}</p>`)
    : '';

  const highlightsHtml = his.length
    ? minimalSection('Career Highlights', bulletListDash(his.map(h => h.text), 12.2))
    : '';

  const experienceHtml = exps.length
    ? minimalSection('Experience', expRows(exps, { dash: true, titleFirst: true, companyColor: '#0f172a', titleColor: '#64748b', titleBold: true }))
    : '';

  const educationHtml = edus.length
    ? minimalSection('Education', eduRows(edus, { degreeColor: '#64748b' }))
    : '';

  const skillsHtml = skls.length
    ? minimalSection('Skills', skillRows(skls, { dots: true }))
    : '';

  const projectsHtml = pros.length
    ? minimalSection('Notable Projects', projRows(pros, { nameColor: '#0f172a', descColor: '#475569', fontSize: 11.2, lineHeight: 1.45, marginBottom: 8 }))
    : '';

  const certsHtml = certs.length
    ? minimalSection('Certifications', certRows(certs, { nameColor: '#0f172a', metaColor: '#64748b' }))
    : '';

  const body = `
  <div style="margin-bottom:13px;">
    <h1 style="font-size:23px;font-weight:700;letter-spacing:-0.01em;line-height:1.12;color:#0f172a;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.full_name || '')}</h1>
    ${p.tagline ? `<p style="margin-top:4px;font-size:12px;font-weight:600;color:#334155;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.tagline)}</p>` : ''}
    ${p.subtitle ? `<p style="margin-top:2px;font-size:10.8px;color:#64748b;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.subtitle)}</p>` : ''}
    <div style="height:1px;background:#cbd5e1;margin:9px 0 6px;"></div>
    ${contactHtml}
  </div>
  ${summaryHtml}${highlightsHtml}${educationHtml}${skillsHtml}${experienceHtml}${projectsHtml}${certsHtml}`;

  return wrap(body);
}

// ── Leadership ────────────────────────────────────────────────────────────────

const LDR_NAVY     = '#1E3A8A';
const LDR_CHARCOAL = '#1F2937';
const LDR_MUTED    = '#6B7280';

function ldrSectionHeader(title) {
  return `
    <div style="border-bottom:0.5px solid ${LDR_NAVY};padding-bottom:3px;margin-bottom:9px;margin-top:2px;">
      <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${LDR_NAVY};font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(title)}</span>
    </div>`;
}

function compactBullets(items, max = 4) {
  return (items || []).filter(Boolean).slice(0, max);
}

function ldrBulletList(items, opts = {}) {
  const fontSize = opts.fontSize || 10.5;
  const lineHeight = opts.lineHeight || 1.35;
  const gap = opts.gap ?? 3;
  const filled = (items || []).filter(Boolean);
  if (!filled.length) return '';
  return `<ul style="margin-top:4px;list-style:none;padding:0;display:flex;flex-direction:column;gap:${gap}px;">
    ${filled.map(b => `
      <li style="display:flex;align-items:flex-start;gap:8px;font-size:${fontSize}px;line-height:${lineHeight};color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;">
        <span style="flex-shrink:0;color:#6B7280;font-size:10px;line-height:${lineHeight};">&#8226;</span>
        <span>${mdHtml(b)}</span>
      </li>`).join('')}
  </ul>`;
}

function buildLeadershipHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];
  const recent = exps.slice(0, 3);
  const prior  = exps.slice(3);

  // Full URLs, pipe-separated — ATS-safe
  const contactParts = [
    p.email, p.phone, p.location,
    p.website && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github && urlDisplay(p.github),
  ].filter(Boolean);

  const summaryHtml = p.summary ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Summary')}
      <p style="font-size:10.5px;line-height:1.45;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:0;">${mdHtml(p.summary)}</p>
    </div>` : '';

  const highlightsHtml = his.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Career Highlights')}
      ${ldrBulletList(his.map(h => h.text))}
    </div>` : '';

  const skillsHtml = skls.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Core Competencies')}
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${skls.map(s => `
          <div style="display:grid;grid-template-columns:128px 1fr;column-gap:8px;align-items:baseline;font-size:10.2px;line-height:1.32;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;">
            ${s.category ? `<span style="font-weight:700;min-width:0;">${esc(s.category)}:</span>` : '<span></span>'}
            <span>${esc((s.items || []).join(', '))}</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  const experienceHtml = recent.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Professional Experience')}
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${recent.map(e => `
          <div style="break-inside:auto;page-break-inside:auto;">
            <p style="font-size:11px;margin:0;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;">
              <strong style="font-weight:700;">${esc(e.title)}</strong>
              ${e.title && e.company ? `<span style="color:${LDR_MUTED};margin:0 5px;">·</span>` : ''}
              <span style="font-weight:400;">${esc(e.company)}</span>
            </p>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:1px;">
              <span style="font-size:10px;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(e.location || '')}</span>
              <span style="font-size:10px;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;flex-shrink:0;">
                ${esc([e.start_date, e.current_job ? 'Present' : e.end_date].filter(Boolean).join(' – '))}
              </span>
            </div>
            ${e.note ? `<p style="font-size:11px;font-style:italic;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;line-height:1.5;margin:4px 0 3px;">${mdHtml(e.note)}</p>` : ''}
            ${ldrBulletList(compactBullets(e.bullets))}
          </div>`).join('')}
      </div>
    </div>` : '';

  const priorExpHtml = prior.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Earlier Career')}
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
        ${prior.map(e => `
          <div style="display:flex;justify-content:space-between;align-items:baseline;page-break-inside:avoid;">
            <span style="font-size:10.5px;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;line-height:1.32;">
              <strong style="font-weight:600;">${esc(e.title)}</strong>
              ${e.company ? `<span style="color:${LDR_MUTED};"> · ${esc(e.company)}</span>` : ''}
              ${e.location ? `<span style="color:${LDR_MUTED};">, ${esc(e.location)}</span>` : ''}
            </span>
            <span style="font-size:10px;color:${LDR_MUTED};flex-shrink:0;padding-left:12px;white-space:nowrap;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
              ${esc([e.start_date, e.current_job ? 'Present' : e.end_date].filter(Boolean).join(' – '))}
            </span>
          </div>`).join('')}
      </div>
    </div>` : '';

  const projectsHtml = pros.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Notable Projects')}
      <div style="margin-top:4px;">${projRows(pros, { nameColor: LDR_CHARCOAL, descColor: LDR_CHARCOAL, fontSize: 10, lineHeight: 1.28, marginBottom: 4 })}</div>
    </div>` : '';

  const educationHtml = edus.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Education')}
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${edus.map(e => `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;page-break-inside:avoid;">
            <div>
              <p style="font-size:11px;font-weight:700;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:0;">${esc(e.school)}</p>
              <p style="font-size:10.5px;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:1px 0 0;">
                ${esc([e.degree, e.field].filter(Boolean).join(', '))}
                ${e.gpa ? `<span style="color:${LDR_MUTED};margin-left:8px;">· GPA ${esc(e.gpa)}</span>` : ''}
              </p>
              ${e.details ? `<p style="font-size:10px;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:2px 0 0;">${esc(e.details)}</p>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0;padding-left:12px;">
              <span style="font-size:10px;color:${LDR_MUTED};white-space:nowrap;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
                ${esc([e.start_date, e.end_date].filter(Boolean).join(' – '))}
              </span>
              ${e.location ? `<p style="font-size:10px;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:2px 0 0;">${esc(e.location)}</p>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : '';

  const certsHtml = certs.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Certifications & Training')}
      <div style="margin-top:4px;">${certRows(certs, { nameColor: LDR_CHARCOAL, metaColor: LDR_MUTED })}</div>
    </div>` : '';

  const body = `
  <div style="margin-bottom:16px;">
    <h1 style="font-size:22px;font-weight:700;color:${LDR_NAVY};margin:0;letter-spacing:-0.01em;line-height:1.2;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.full_name || '')}</h1>
    ${p.tagline ? `<p style="font-size:12px;font-weight:500;color:${LDR_CHARCOAL};margin:4px 0 0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.tagline)}</p>` : ''}
    ${p.subtitle ? `<p style="font-size:11px;color:${LDR_MUTED};margin:2px 0 0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.subtitle)}</p>` : ''}
    ${contactParts.length ? `<p style="font-size:10px;color:${LDR_CHARCOAL};margin:5px 0 0;line-height:1.35;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(contactParts.join('  |  '))}</p>` : ''}
  </div>
  ${summaryHtml}${highlightsHtml}${skillsHtml}${experienceHtml}${priorExpHtml}${projectsHtml}${educationHtml}${certsHtml}`;

  return wrap(body);
}

// ── Compact ───────────────────────────────────────────────────────────────────

function buildCompactHtml(resume) {
  const p     = resume.personal       || {};
  const his   = resume.highlights     || [];
  const exps  = resume.experiences    || [];
  const edus  = resume.education      || [];
  const skls  = resume.skills         || [];
  const pros  = resume.projects       || [];
  const certs = resume.certifications || [];

  // First 3 (display order = most recent first) get full detail; rest condensed
  const recent = exps.slice(0, 3);
  const prior  = exps.slice(3);

  const contactParts = [
    p.email, p.phone, p.location,
    p.website && urlDisplay(p.website),
    p.linkedin && urlDisplay(p.linkedin),
    p.github && urlDisplay(p.github),
  ].filter(Boolean);

  const summaryHtml = p.summary ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Summary')}
      <p style="font-size:10.5px;line-height:1.45;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:0;">${mdHtml(p.summary)}</p>
    </div>` : '';

  const highlightsHtml = his.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Career Highlights')}
      ${ldrBulletList(his.map(h => h.text))}
    </div>` : '';

  const skillsHtml = skls.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Core Competencies')}
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
        ${skls.map(s => `
          <div style="display:grid;grid-template-columns:128px 1fr;column-gap:8px;align-items:baseline;font-size:10.2px;line-height:1.32;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;">
            ${s.category ? `<span style="font-weight:700;min-width:0;">${esc(s.category)}:</span>` : '<span></span>'}
            <span>${esc((s.items || []).join(', '))}</span>
          </div>`).join('')}
      </div>
    </div>` : '';

  const recentExpHtml = recent.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Professional Experience')}
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px;">
        ${recent.map(e => `
          <div style="break-inside:auto;page-break-inside:auto;">
            <p style="font-size:11px;margin:0;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;">
              <strong style="font-weight:700;">${esc(e.title)}</strong>
              ${e.title && e.company ? `<span style="color:${LDR_MUTED};margin:0 5px;">·</span>` : ''}
              <span style="font-weight:400;">${esc(e.company)}</span>
            </p>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:1px;">
              <span style="font-size:10px;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(e.location || '')}</span>
              <span style="font-size:10px;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;flex-shrink:0;">
                ${esc([e.start_date, e.current_job ? 'Present' : e.end_date].filter(Boolean).join(' – '))}
              </span>
            </div>
            ${e.note ? `<p style="font-size:11px;font-style:italic;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;line-height:1.5;margin:4px 0 3px;">${mdHtml(e.note)}</p>` : ''}
            ${ldrBulletList(compactBullets(e.bullets), { fontSize: 10.2, lineHeight: 1.3, gap: 2 })}
          </div>`).join('')}
      </div>
    </div>` : '';

  const priorExpHtml = prior.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Earlier Career')}
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:4px;">
        ${prior.map(e => `
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:10.5px;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;line-height:1.4;">
              <strong style="font-weight:600;">${esc(e.title)}</strong>
              ${e.company  ? `<span style="color:${LDR_MUTED};"> · ${esc(e.company)}</span>` : ''}
              ${e.location ? `<span style="color:${LDR_MUTED};">, ${esc(e.location)}</span>` : ''}
            </span>
            <span style="font-size:10px;color:${LDR_MUTED};flex-shrink:0;padding-left:12px;white-space:nowrap;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
              ${esc([e.start_date, e.current_job ? 'Present' : e.end_date].filter(Boolean).join(' – '))}
            </span>
          </div>`).join('')}
      </div>
    </div>` : '';

  const projectsHtml = pros.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Notable Projects')}
      <div style="margin-top:4px;">${projRows(pros, { nameColor: LDR_CHARCOAL, descColor: LDR_CHARCOAL, fontSize: 10, lineHeight: 1.28, marginBottom: 4 })}</div>
    </div>` : '';

  const educationHtml = edus.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Education')}
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
        ${edus.map(e => `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;page-break-inside:avoid;">
            <div>
              <p style="font-size:11px;font-weight:700;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:0;">${esc(e.school)}</p>
              <p style="font-size:10.5px;color:${LDR_CHARCOAL};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:1px 0 0;">
                ${esc([e.degree, e.field].filter(Boolean).join(', '))}
                ${e.gpa ? `<span style="color:${LDR_MUTED};margin-left:8px;">· GPA ${esc(e.gpa)}</span>` : ''}
              </p>
              ${e.details ? `<p style="font-size:10px;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:2px 0 0;">${esc(e.details)}</p>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0;padding-left:12px;">
              <span style="font-size:10px;color:${LDR_MUTED};white-space:nowrap;font-family:Aptos,'Segoe UI',Arial,sans-serif;">
                ${esc([e.start_date, e.end_date].filter(Boolean).join(' – '))}
              </span>
              ${e.location ? `<p style="font-size:10px;color:${LDR_MUTED};font-family:Aptos,'Segoe UI',Arial,sans-serif;margin:2px 0 0;">${esc(e.location)}</p>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>` : '';

  const certsHtml = certs.length ? `
    <div style="margin-bottom:14px;">
      ${ldrSectionHeader('Certifications & Training')}
      <div style="margin-top:4px;">${certRows(certs, { nameColor: LDR_CHARCOAL, metaColor: LDR_MUTED })}</div>
    </div>` : '';

  const body = `
  <div style="margin-bottom:16px;">
    <h1 style="font-size:22px;font-weight:700;color:${LDR_NAVY};margin:0;letter-spacing:-0.01em;line-height:1.2;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.full_name || '')}</h1>
    ${p.tagline  ? `<p style="font-size:12px;font-weight:500;color:${LDR_CHARCOAL};margin:4px 0 0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.tagline)}</p>` : ''}
    ${p.subtitle ? `<p style="font-size:11px;color:${LDR_MUTED};margin:2px 0 0;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(p.subtitle)}</p>` : ''}
    ${contactParts.length ? `<p style="font-size:10px;color:${LDR_CHARCOAL};margin:5px 0 0;line-height:1.35;font-family:Aptos,'Segoe UI',Arial,sans-serif;">${esc(contactParts.join('  |  '))}</p>` : ''}
  </div>
  ${summaryHtml}${highlightsHtml}${skillsHtml}${recentExpHtml}${priorExpHtml}${projectsHtml}${educationHtml}${certsHtml}`;

  return wrap(body);
}

// ── PDF generation ────────────────────────────────────────────────────────────

async function generatePdf(html) {
  const chromePath = findChrome();
  if (!chromePath) {
    const err = new Error('Chrome not found. Install Google Chrome and restart the server.');
    err.code = 'CHROME_NOT_FOUND';
    throw err;
  }

  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Trailing bottom margins on the document's last elements can spill a few
    // px past the final page boundary, making Chrome emit a blank last page.
    // They are invisible at the document end, so zero the whole last-child
    // chain before printing.
    await page.evaluate(() => {
      let el = document.body.lastElementChild;
      while (el) {
        el.style.marginBottom = '0';
        el = el.lastElementChild;
      }
    });
    return await page.pdf({
      format: 'Letter',
      printBackground: true,
      // Tagged PDFs carry document structure — better for ATS parsers and screen readers
      tagged: true,
      margin: { top: '0.45in', right: '0.45in', bottom: '0.45in', left: '0.45in' },
    });
  } finally {
    await browser.close();
  }
}

module.exports = { buildResumeHtml, generatePdf, findChrome };
