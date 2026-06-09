/**
 * ThemePicker — floating pill UI for the CSS theme engine
 *
 * Renders a non-intrusive floating pill at the bottom-right of the preview pane.
 * Activating a theme only swaps the CSS class on the resume wrapper — no re-render
 * of the underlying data, no re-fetch, no state outside this component's concern.
 *
 * Props:
 *   activeTheme   ThemeConfig | null  — currently selected CSS theme
 *   onThemeChange (theme | null) => void — called when a swatch is clicked
 */

import { useState } from 'react';
import { CSS_THEMES, loadThemeFont } from '../themes/index';

export default function ThemePicker({ activeTheme, onThemeChange }) {
  const [hovered, setHovered] = useState(null);
  const [expanded, setExpanded] = useState(false);

  function handleSelect(theme) {
    if (activeTheme?.id === theme.id) {
      // Clicking the active theme deselects (returns to default preview)
      onThemeChange(null);
    } else {
      // Lazily inject the Google Fonts <link> for this theme
      loadThemeFont(theme);
      onThemeChange(theme);
    }
  }

  function handleDeselect() {
    onThemeChange(null);
  }

  return (
    <div
      style={{
        position:       'fixed',
        bottom:         24,
        right:          24,
        zIndex:         100,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'flex-end',
        gap:            8,
        pointerEvents:  'none',   // let clicks through the gap area
      }}
    >
      {/* ── Picker pill ──────────────────────────────────────────────────── */}
      <div
        style={{
          pointerEvents:    'auto',
          display:          'flex',
          alignItems:       'center',
          gap:              7,
          background:       'rgba(255, 255, 255, 0.96)',
          backdropFilter:   'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius:     999,
          padding:          expanded ? '8px 12px' : '6px 10px',
          boxShadow:        '0 4px 24px rgba(0,0,0,0.13), 0 1px 6px rgba(0,0,0,0.07)',
          border:           '1px solid rgba(226,232,240,0.9)',
          transition:       'padding 0.18s ease',
          cursor:           'default',
        }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => { setExpanded(false); setHovered(null); }}
        role="toolbar"
        aria-label="CSS Presentation Themes"
      >
        {/* Label / toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background:   'none',
            border:       'none',
            padding:      '0 2px',
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          5,
            color:        activeTheme ? '#6366f1' : '#94a3b8',
            fontSize:     10,
            fontFamily:   'Inter, system-ui, sans-serif',
            fontWeight:   600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace:   'nowrap',
            lineHeight:   1,
            outline:      'none',
          }}
          title={expanded ? 'Collapse theme picker' : 'Expand CSS themes'}
          aria-expanded={expanded}
        >
          {/* Palette dot */}
          <span
            style={{
              width:        8,
              height:       8,
              borderRadius: '50%',
              background:   activeTheme ? activeTheme.accent : '#cbd5e1',
              display:      'inline-block',
              flexShrink:   0,
              transition:   'background 0.2s',
            }}
          />
          {activeTheme ? activeTheme.label : 'CSS Themes'}
        </button>

        {/* Swatches — visible when expanded or always when a theme is active */}
        {(expanded || activeTheme) && (
          <div
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        6,
            }}
          >
            {/* Deselect button (shown only when a CSS theme is active) */}
            {activeTheme && (
              <button
                onClick={handleDeselect}
                title="Return to default template themes"
                aria-label="Deselect CSS theme"
                style={{
                  width:        22,
                  height:       22,
                  borderRadius: '50%',
                  border:       '1.5px solid #e2e8f0',
                  background:   '#f8fafc',
                  cursor:       'pointer',
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                  fontSize:     12,
                  lineHeight:   1,
                  color:        '#94a3b8',
                  transition:   'all 0.15s',
                  outline:      'none',
                  fontFamily:   'sans-serif',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                ×
              </button>
            )}

            {CSS_THEMES.map(theme => {
              const isActive  = activeTheme?.id === theme.id;
              const isHovered = hovered === theme.id;
              return (
                <div
                  key={theme.id}
                  style={{ position: 'relative' }}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      role="tooltip"
                      style={{
                        position:    'absolute',
                        bottom:      'calc(100% + 8px)',
                        left:        '50%',
                        transform:   'translateX(-50%)',
                        background:  '#0f172a',
                        color:       '#f8fafc',
                        fontSize:    10,
                        fontFamily:  'Inter, system-ui, sans-serif',
                        fontWeight:  500,
                        padding:     '4px 8px',
                        borderRadius: 5,
                        whiteSpace:  'nowrap',
                        pointerEvents: 'none',
                        zIndex:      200,
                        lineHeight:  1.3,
                      }}
                    >
                      <strong style={{ display: 'block' }}>{theme.label}</strong>
                      <span style={{ opacity: 0.7, fontSize: 9 }}>{theme.audience}</span>
                    </div>
                  )}

                  {/* Swatch button */}
                  <button
                    onClick={() => handleSelect(theme)}
                    onMouseEnter={() => setHovered(theme.id)}
                    onMouseLeave={() => setHovered(null)}
                    title={`${theme.label} — ${theme.description}`}
                    aria-label={`${theme.label} theme${isActive ? ' (active)' : ''}`}
                    aria-pressed={isActive}
                    style={{
                      width:        isActive ? 26 : 22,
                      height:       isActive ? 26 : 22,
                      borderRadius: '50%',
                      background:   theme.accent,
                      border:       isActive
                        ? '2.5px solid #6366f1'
                        : isHovered
                          ? '2px solid rgba(0,0,0,0.2)'
                          : '2px solid transparent',
                      cursor:       'pointer',
                      outline:      isActive ? '2px solid rgba(99,102,241,0.25)' : 'none',
                      outlineOffset: 2,
                      transition:   'all 0.15s ease',
                      transform:    isHovered && !isActive ? 'scale(1.12)' : 'scale(1)',
                      display:      'block',
                      flexShrink:   0,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active theme name label beneath the pill */}
      {activeTheme && (
        <p
          style={{
            pointerEvents: 'auto',
            fontSize:      9,
            fontFamily:    'Inter, system-ui, sans-serif',
            color:         '#94a3b8',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin:        0,
            textAlign:     'right',
            lineHeight:    1,
            paddingRight:  6,
          }}
        >
          {activeTheme.label} · CSS Theme
        </p>
      )}
    </div>
  );
}
