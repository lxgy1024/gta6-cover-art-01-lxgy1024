// Draws the poster: a multi-panel photo grid with thick white poster frames,
// a Vice City colour grade over every panel, and bold slanted caption
// lettering on a band across the foot. Everything is drawn on a 2D canvas,
// so the preview on the page and the exported PNG are the same drawing.

// Four layouts. Each one is a function of the poster's width and height
// returning the panels as fractions-turned-pixels: {x, y, w, h} each.
export const LAYOUTS = [
  { id: 'spotlight', name: 'Spotlight', panels: (w, h) => [
    { x: 0, y: 0, w: 0.62, h: 1 },
    { x: 0.62, y: 0, w: 0.38, h: 0.5 },
    { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
  ] },
  { id: 'mirror', name: 'Mirror', panels: (w, h) => [
    { x: 0.38, y: 0, w: 0.62, h: 1 },
    { x: 0, y: 0, w: 0.38, h: 0.5 },
    { x: 0, y: 0.5, w: 0.38, h: 0.5 },
  ] },
  { id: 'triple', name: 'Triple', panels: (w, h) => [
    { x: 0, y: 0, w: 1 / 3, h: 1 },
    { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
    { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
  ] },
  { id: 'marquee', name: 'Marquee', panels: (w, h) => [
    { x: 0, y: 0, w: 1, h: 0.62 },
    { x: 0, y: 0.62, w: 0.5, h: 0.38 },
    { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
  ] },
];

// Four colour grades. `wash` is the tint painted over each photo, top to
// bottom; `accent` colours the caption rule and the subtitle; `filter` is a
// canvas filter applied to the photos themselves (empty means none).
export const GRADES = [
  { id: 'sunset', name: 'Sunset', wash: ['rgba(255, 140, 60, 0.20)', 'rgba(255, 40, 120, 0.38)'], accent: '#ffb02e', filter: '' },
  { id: 'neon', name: 'Neon Nights', wash: ['rgba(255, 46, 136, 0.24)', 'rgba(0, 220, 255, 0.30)'], accent: '#00dcff', filter: '' },
  { id: 'palm', name: 'Palm Dusk', wash: ['rgba(0, 180, 140, 0.20)', 'rgba(20, 60, 120, 0.42)'], accent: '#2effb0', filter: '' },
  { id: 'noir', name: 'Noir', wash: ['rgba(0, 0, 0, 0.16)', 'rgba(120, 0, 20, 0.32)'], accent: '#ff3355', filter: 'grayscale(0.75) contrast(1.12)' },
];

export const SIZES = [
  { id: '1080x1080', name: '1080 × 1080', w: 1080, h: 1080 },
  { id: '1080x1350', name: '1080 × 1350', w: 1080, h: 1350 },
  { id: '1920x1080', name: '1920 × 1080', w: 1920, h: 1080 },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

export function sizeById(id) {
  return SIZES.find((s) => s.id === id) ?? SIZES[0];
}

/** Panel rectangles in pixels for a layout at a poster size. */
export function panelRects(layoutId, w, h) {
  return layoutById(layoutId).panels(w, h).map((p) => ({
    x: p.x * w, y: p.y * h, w: p.w * w, h: p.h * h,
  }));
}

/** Which panel (0, 1, 2) a point in the poster falls in, or -1. */
export function panelAt(layoutId, w, h, x, y) {
  return panelRects(layoutId, w, h).findIndex((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);
}

// A tiny deterministic random source, so the film grain is identical on
// every render and every export of the same poster.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo into a panel, cover-fit, with the panel's zoom and pan. */
function drawPanelPhoto(ctx, photo, rect, t, filter) {
  const iw = photo.naturalWidth;
  const ih = photo.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (t.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ((t.ox || 0) / 100) * rect.w * 0.5;
  const dy = rect.y + (rect.h - dh) / 2 + ((t.oy || 0) / 100) * rect.h * 0.5;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (filter) ctx.filter = filter;
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** A panel with no photo yet: a sunset gradient with a low sun. */
function drawEmptyPanel(ctx, rect, grade) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, '#3a1c5e');
  g.addColorStop(0.55, '#c22a7a');
  g.addColorStop(1, '#ff7a3c');
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const sunR = Math.min(rect.w, rect.h) * 0.2;
  const sun = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h * 0.42, sunR * 0.1,
    rect.x + rect.w / 2, rect.y + rect.h * 0.42, sunR,
  );
  sun.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
  sun.addColorStop(1, 'rgba(255, 140, 60, 0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(rect.x + rect.w / 2, rect.y + rect.h * 0.42, sunR, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws the whole poster onto `canvas` (which must already be sized to the
 * export size). `state` holds photos, panelPhoto, transforms, layout,
 * grade, caption and subtitle.
 */
export function renderPoster(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = gradeById(state.grade);
  const rects = panelRects(state.layout, w, h);
  const gutter = Math.max(4, Math.round(w * 0.012));

  // The white poster frame: the whole sheet is white, panels sit inside it.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((rect, i) => {
    const inset = {
      x: rect.x + gutter, y: rect.y + gutter,
      w: rect.w - gutter * 2, h: rect.h - gutter * 2,
    };
    const photo = state.photos[state.panelPhoto[i]] ?? null;
    if (photo) drawPanelPhoto(ctx, photo, inset, state.transforms[i], grade.filter);
    else drawEmptyPanel(ctx, inset, grade);
    // The grade wash over the panel.
    const wash = ctx.createLinearGradient(inset.x, inset.y, inset.x, inset.y + inset.h);
    wash.addColorStop(0, grade.wash[0]);
    wash.addColorStop(1, grade.wash[1]);
    ctx.fillStyle = wash;
    ctx.fillRect(inset.x, inset.y, inset.w, inset.h);
  });

  // The caption band across the foot.
  const bandH = h * 0.17;
  const band = ctx.createLinearGradient(0, h - bandH * 1.6, 0, h);
  band.addColorStop(0, 'rgba(10, 4, 18, 0)');
  band.addColorStop(1, 'rgba(10, 4, 18, 0.9)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h - bandH * 1.6, w, bandH * 1.6);

  const caption = (state.caption || '').trim().toUpperCase();
  if (caption) {
    let size = h * 0.075;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const setFont = () => { ctx.font = `italic 900 ${size}px "Arial Black", Arial, sans-serif`; };
    setFont();
    while (ctx.measureText(caption).width > w * 0.9 && size > 14) {
      size -= 2;
      setFont();
    }
    ctx.save();
    // A slight forward lean, GTA poster style.
    ctx.transform(1, 0, -0.06, 1, 0, 0);
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.strokeStyle = 'rgba(10, 4, 18, 0.9)';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    const cy = h - h * 0.055;
    ctx.strokeText(caption, w / 2, cy);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(caption, w / 2, cy);
    ctx.restore();
    // Accent rule under the title.
    const ruleW = Math.min(w * 0.3, ctx.measureText(caption).width * 0.5);
    ctx.fillStyle = grade.accent;
    ctx.fillRect((w - ruleW) / 2, h - h * 0.03, ruleW, Math.max(3, h * 0.006));
  }

  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (subtitle) {
    ctx.font = `600 ${Math.round(h * 0.024)}px system-ui, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(h * 0.005)}px`; } catch { /* older canvas: no letter spacing */ }
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.accent;
    ctx.fillText(subtitle, w / 2, h - h * 0.15);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }

  // Film grain, seeded so it never changes between renders.
  const rand = seededRandom(20261120);
  const specks = Math.round((w * h) / 900);
  for (let i = 0; i < specks; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.03 + rand() * 0.06})` : `rgba(0,0,0,${0.03 + rand() * 0.06})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }

  // Vignette: darker corners, brighter middle.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

/** Renders a poster to a fresh canvas at the export size and returns it. */
export function renderToCanvas(state) {
  const size = sizeById(state.size);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderPoster(canvas, state);
  return canvas;
}
