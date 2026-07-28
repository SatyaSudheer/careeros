import { cloneElement, isValidElement, useMemo, useRef, useLayoutEffect, useState } from 'react';
import { getThemeBody, THEMES } from './themes.jsx';

// ── Letter page geometry (96 dpi), matching server PDF export ────────────────
export const PAGE_W     = 816;
export const PAGE_H     = 1056;
export const PAD_X      = 44;
export const PAD_Y_TOP  = 48;
export const PAD_Y_BOT  = 48;
export const CONTENT_H  = PAGE_H - PAD_Y_TOP - PAD_Y_BOT;
const ACCENT_HEXES = new Set([
  '#6366f1', '#4f46e5', '#e0e7ff', '#eef2ff', '#c7d2fe', '#a5b4fc',
  '#1e293b', '#0f172a', '#334155',
  '#94a3b8', '#cbd5e1', '#e2e8f0',
  // Theme-specific accents: leadership, editorial, technical, heritage,
  // graduate, academic, swiss — so every theme follows the accent picker
  '#1e3a8a', '#4a5568', '#1d4ed8', '#bfdbfe', '#7c2d12', '#9ca3af',
  '#047857', '#a7f3d0', '#d1fae5', '#14532d', '#dc2626',
]);
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
  if (!accent || typeof color !== 'string') return color;
  const lower = color.toLowerCase();
  if (!ACCENT_HEXES.has(lower)) return color;
  if (LIGHT_TINTS.includes(lower)) return tint(accent, 0.86);
  if (MID_TINTS.includes(lower)) return tint(accent, 0.45);
  return accent;
}

function applyStyleAppearance(style, scale, accent) {
  if (!style) return style;
  const next = { ...style };
  if (typeof next.fontSize === 'number') next.fontSize = Math.round(next.fontSize * scale * 10) / 10;
  ['color', 'background', 'backgroundColor', 'borderColor'].forEach(key => {
    if (next[key]) next[key] = mapAccentColor(next[key], accent);
  });
  if (accent) {
    ['border', 'borderTop', 'borderBottom', 'borderLeft', 'borderRight'].forEach(key => {
      if (typeof next[key] !== 'string') return;
      ACCENT_HEXES.forEach(hex => {
        next[key] = next[key].replace(new RegExp(hex, 'ig'), mapAccentColor(hex, accent));
      });
    });
  }
  return next;
}

function applyAppearance(node, scale, accent) {
  if (Array.isArray(node)) {
    return node.map((child, i) => {
      const res = applyAppearance(child, scale, accent);
      return isValidElement(res) && res.key == null ? cloneElement(res, { key: `_aa_${i}` }) : res;
    });
  }
  if (!isValidElement(node)) return node;
  // Expand plain function components (theme subcomponents are pure, hook-free)
  // so their internal styles also receive scale/accent — cloneElement alone
  // cannot reach markup rendered inside them.
  if (typeof node.type === 'function' && !node.type.prototype?.isReactComponent) {
    const expanded = applyAppearance(node.type(node.props), scale, accent);
    return isValidElement(expanded) && node.key != null && expanded.key == null
      ? cloneElement(expanded, { key: node.key })
      : expanded;
  }
  const children = node.props.children ? applyAppearance(node.props.children, scale, accent) : node.props.children;
  return cloneElement(node, { style: applyStyleAppearance(node.props.style, scale, accent) }, children);
}

// ── Page-break avoidance ──────────────────────────────────────────────────────
// Push any block that crosses a page boundary to the next page, as long as
// the block fits on a single page. No threshold guard — guarding by distance
// from the page end caused company-header + note text to be clipped when the
// block started earlier than the guard distance.

// Ancestor CSS transforms (e.g. the scaled form-mode mini preview) shrink
// bounding rects but not offset dimensions — divide the scale out so page
// math always works in untransformed layout pixels.
function rectScale(el) {
  if (!el.offsetWidth) return 1;
  return (el.getBoundingClientRect().width / el.offsetWidth) || 1;
}

// Bottom of the deepest visible content, excluding trailing margins (which
// inflate scrollHeight and would otherwise produce a blank final page).
function contentBottom(el) {
  const scale = rectScale(el);
  const top = el.getBoundingClientRect().top;
  let max = 0;
  for (const node of el.querySelectorAll('*')) {
    const r = node.getBoundingClientRect();
    if (r.height > 0) max = Math.max(max, r.bottom - top);
  }
  return max / scale;
}

function computeSpacers(el) {
  const scale = rectScale(el);
  const containerRect = el.getBoundingClientRect();
  const blocks = Array.from(el.querySelectorAll('[data-block]'))
    .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  const result = {};
  let cumulative = 0;

  blocks.forEach(block => {
    const rect = block.getBoundingClientRect();
    const top = (rect.top - containerRect.top) / scale + cumulative;
    const h   = rect.height / scale;

    if (h >= CONTENT_H) return;

    const pageEnd   = (Math.floor(top / CONTENT_H) + 1) * CONTENT_H;
    const remaining = pageEnd - top;

    if (top + h > pageEnd) {
      result[block.dataset.block] = remaining;
      cumulative += remaining;
    }
  });

  return result;
}

// ── Paginated preview ─────────────────────────────────────────────────────────

// Compact mode: top 3 experiences keep up to 4 bullets; older ones get no bullets/note.
function applyCompactMode(resume) {
  if (!resume?.compact_mode) return resume;
  return {
    ...resume,
    experiences: (resume.experiences || []).map((exp, i) =>
      i < 3
        ? { ...exp, bullets: (exp.bullets || []).slice(0, 4) }
        : { ...exp, bullets: [], note: null }
    ),
  };
}

export default function ResumePreview({ resume }) {
  const rawRef    = useRef(null);
  const spacedRef = useRef(null);
  const [spacers,   setSpacers]   = useState({});
  const [pageCount, setPageCount] = useState(1);

  const r           = applyCompactMode(resume);
  const ThemeBody   = getThemeBody(r?.template);
  const themeDef    = THEMES[r?.template];
  const fontScale   = clampScale(r?.font_scale);
  const accentColor = r?.accent_color || '';
  const layoutKey = useMemo(() => JSON.stringify({
    template: r?.template || 'classic',
    font_scale: fontScale,
    accent_color: accentColor,
    compact_mode: r?.compact_mode,
    personal: r?.personal,
    highlights: r?.highlights,
    experiences: r?.experiences,
    education: r?.education,
    skills: r?.skills,
    projects: r?.projects,
  }), [r, fontScale, accentColor]);

  useLayoutEffect(() => {
    if (!rawRef.current || !spacedRef.current) return;

    const computed = computeSpacers(rawRef.current);
    if (JSON.stringify(computed) !== JSON.stringify(spacers)) {
      setSpacers(computed);
      return;
    }

    const n = Math.max(1, Math.ceil((contentBottom(spacedRef.current) - 1) / CONTENT_H));
    if (n !== pageCount) setPageCount(n);
  });

  useLayoutEffect(() => {
    setSpacers({});
    setPageCount(1);
  }, [layoutKey]);

  const rawBody = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {applyAppearance(ThemeBody({ resume: r, spacers: {} }), fontScale, accentColor)}
    </div>
  );
  const spacedBody = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {applyAppearance(ThemeBody({ resume: r, spacers }), fontScale, accentColor)}
    </div>
  );

  const hiddenBox   = { position: 'relative', overflow: 'hidden', height: 0, width: PAGE_W - PAD_X * 2 };
  const hiddenInner = { position: 'absolute', top: 0, left: 0, width: '100%', visibility: 'hidden', pointerEvents: 'none' };

  return (
    <div id="resume-print" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>

      {/* Hidden measurement nodes */}
      <div style={hiddenBox} aria-hidden="true">
        <div ref={rawRef} style={hiddenInner}>{rawBody}</div>
      </div>
      <div style={hiddenBox} aria-hidden="true">
        <div ref={spacedRef} style={hiddenInner}>{spacedBody}</div>
      </div>

      {/* Letter page cards */}
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          className="resume-page"
          style={{
            position: 'relative',
            width: PAGE_W,
            height: PAGE_H,
            background: '#ffffff',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 2px 16px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
            borderRadius: 4,
          }}
        >
          {/* Per-page background graphics (theme opt-in via pageBg) */}
          {themeDef?.pageBg && <themeDef.pageBg accentColor={accentColor || themeDef.accent} />}

          <div style={{ position: 'absolute', top: PAD_Y_TOP - i * CONTENT_H, left: PAD_X, right: PAD_X }}>
            {spacedBody}
          </div>

          {/* Executive dark header bleeds to page edge — no top overlay needed on page 1 */}
          {i > 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: PAD_Y_TOP, background: '#ffffff', zIndex: 2 }} />}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: PAD_Y_BOT, background: '#ffffff', zIndex: 2 }} />

          {pageCount > 1 && (
            <div style={{
              position: 'absolute', bottom: 15, left: 0, right: 0, textAlign: 'center',
              fontSize: 9, color: '#d1d5db', fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: '0.06em', zIndex: 3, pointerEvents: 'none', userSelect: 'none',
            }}>
              {i + 1} / {pageCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
