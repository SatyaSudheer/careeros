// Interface scale — scales the whole app UI (text, controls, spacing) via a
// single CSS custom property. Implemented with `zoom` rather than rem units
// because the UI uses several hundred hardcoded px sizes; zoom scales all of
// them, plus padding and icons, without touching every component.
//
// This is the *interface* scale. The resume's own font scale is a separate,
// per-resume setting in the editor's Style menu, and resume pages are
// counter-zoomed in index.css so they always render at true Letter size.

const KEY = 'careeros-ui-scale';

export const UI_SCALES = [
  { value: 0.9,  label: 'Compact' },
  { value: 1,    label: 'Default' },
  { value: 1.1,  label: 'Large' },
  { value: 1.25, label: 'Larger' },
  { value: 1.5,  label: 'Largest' },
];

export const DEFAULT_UI_SCALE = 1;

export function clampUiScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_UI_SCALE;
  return Math.min(1.5, Math.max(0.9, n));
}

export function getUiScale() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw == null ? DEFAULT_UI_SCALE : clampUiScale(raw);
  } catch {
    return DEFAULT_UI_SCALE;
  }
}

export function applyUiScale(value) {
  const scale = clampUiScale(value);
  document.documentElement.style.setProperty('--ui-scale', String(scale));
  return scale;
}

export function setUiScale(value) {
  const scale = applyUiScale(value);
  try { localStorage.setItem(KEY, String(scale)); } catch {}
  return scale;
}

// Called before React renders so there is no flash of unscaled UI.
export function initUiScale() {
  return applyUiScale(getUiScale());
}
