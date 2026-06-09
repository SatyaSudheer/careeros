/**
 * CareerOS CSS Theme Engine — Registry
 *
 * These themes are separate from the inline-style template system (themes.jsx).
 * They control visual presentation via CSS custom properties and semantic HTML.
 * All themes are ATS Risk Level: Low — single column, real DOM text, no SVG/canvas text.
 */

export type SectionLabelStyle = 'uppercase' | 'small-caps' | 'normal';

export interface ThemeConfig {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** One-line description */
  description: string;
  /** Intended professional audience */
  audience: string;
  /** ATS parsing safety level */
  atsRisk: 'Low' | 'Medium';
  /** Hex color for the picker swatch */
  accent: string;
  /** CSS class applied to the .css-resume wrapper */
  cssClass: string;
  /**
   * Google Fonts URL for this theme's typefaces.
   * null = system fonts only (no network request needed).
   * Loaded dynamically via <link> injection when the theme is activated.
   */
  fontUrl: string | null;
}

export const CSS_THEMES: ThemeConfig[] = [
  {
    id: 'css-executive',
    label: 'Executive',
    description: 'Authority and gravitas for senior leadership',
    audience: 'C-Suite, VP, Senior Executive',
    atsRisk: 'Low',
    accent: '#1B2A4A',
    cssClass: 'theme-executive',
    fontUrl:
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Lato:wght@400;700&display=swap',
  },
  {
    id: 'css-editorial',
    label: 'Editorial',
    description: 'Typographic richness for creative professionals',
    audience: 'Design, Media, Marketing, Creative Roles',
    atsRisk: 'Low',
    accent: '#4A5568',
    cssClass: 'theme-editorial',
    fontUrl:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap',
  },
  {
    id: 'css-minimal',
    label: 'Minimal',
    description: 'Clean, modern, maximum ATS clarity',
    audience: 'Technology, Startups, Product',
    atsRisk: 'Low',
    accent: '#374151',
    cssClass: 'theme-minimal',
    fontUrl:
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
  {
    id: 'css-technical',
    label: 'Technical',
    description: 'Engineering-forward with monospace precision',
    audience: 'Software Engineering, Data, DevOps, SRE',
    atsRisk: 'Low',
    accent: '#1D4ED8',
    cssClass: 'theme-technical',
    fontUrl:
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap',
  },
  {
    id: 'css-heritage',
    label: 'Heritage',
    description: 'Classical elegance for traditional sectors',
    audience: 'Finance, Law, Consulting, Banking',
    atsRisk: 'Low',
    accent: '#7C2D12',
    cssClass: 'theme-heritage',
    fontUrl:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=EB+Garamond:wght@400;500&display=swap',
  },
];

/** Look up a theme config by id */
export function getThemeById(id: string): ThemeConfig | undefined {
  return CSS_THEMES.find((t) => t.id === id);
}

/** Lazily inject a Google Fonts <link> tag for the given theme (no-op if already loaded) */
export function loadThemeFont(theme: ThemeConfig): void {
  if (!theme.fontUrl) return;
  const linkId = `css-theme-font-${theme.id}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = theme.fontUrl;
  document.head.appendChild(link);
}
