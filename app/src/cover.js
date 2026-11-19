// Neon Vice Cover Studio — the cover renderer.
//
// Paints a GTA-poster-style cover on a canvas: a multi-panel photo grid with
// thick white poster frames, a sunset or neon colour grade, film grain, a
// vignette, and big bold slanted caption lettering. Drawn from scratch with
// the canvas 2D API; no Rockstar logos, artwork or fonts are used anywhere.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    photoFilter: 'saturate(1.35) contrast(1.07) brightness(1.03)',
    wash: [[0, 'rgba(255, 176, 66, 0.26)'], [0.5, 'rgba(255, 94, 58, 0.16)'], [1, 'rgba(178, 32, 120, 0.32)']],
  },
  neon: {
    label: 'Neon',
    photoFilter: 'saturate(1.75) contrast(1.1) hue-rotate(-16deg)',
    wash: [[0, 'rgba(255, 0, 170, 0.30)'], [0.5, 'rgba(110, 40, 255, 0.18)'], [1, 'rgba(0, 214, 255, 0.30)']],
  },
  palm: {
    label: 'Palm Dusk',
    photoFilter: 'saturate(1.4) contrast(1.06) sepia(0.2)',
    wash: [[0, 'rgba(255, 205, 100, 0.22)'], [0.5, 'rgba(24, 158, 138, 0.14)'], [1, 'rgba(8, 64, 88, 0.36)']],
  },
  noir: {
    label: 'Noir',
    photoFilter: 'grayscale(1) contrast(1.35) brightness(1.06)',
    wash: [[0, 'rgba(255, 255, 255, 0.12)'], [1, 'rgba(0, 0, 0, 0.44)']],
  },
};

// Panels are [x, y, width, height] in fractions of the cover.
export const LAYOUTS = {
  'hero-left': { label: 'Hero left', panels: [[0, 0, 0.62, 1], [0.62, 0, 0.38, 0.5], [0.62, 0.5, 0.38, 0.5]] },
  'hero-right': { label: 'Hero right', panels: [[0, 0, 0.38, 0.5], [0, 0.5, 0.38, 0.5], [0.38, 0, 0.62, 1]] },
  triptych: { label: 'Triptych', panels: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]] },
  band: { label: 'Wide band', panels: [[0, 0, 1, 0.58], [0, 0.58, 0.5, 0.42], [0.5, 0.58, 0.5, 0.42]] },
};

export const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
};

/** A panel's photo placement: zoom (1 = cover-fit) and pan in panel fractions. */
export function freshPlacement() {
  return { zoom: 1, dx: 0, dy: 0 };
}

// Tiny deterministic PRNG for the grain tile (same picture every export).
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const grainTiles = new Map();
function grainTile() {
  if (grainTiles.has(128)) return grainTiles.get(128);
  const tile = document.createElement('canvas');
  tile.width = tile.height = 128;
  const t = tile.getContext('2d');
  const pixels = t.createImageData(128, 128);
  const rnd = lcg(987654321);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    pixels.data[i] = v;
    pixels.data[i + 1] = v;
    pixels.data[i + 2] = v;
    pixels.data[i + 3] = 20;
  }
  t.putImageData(pixels, 0, 0);
  grainTiles.set(128, tile);
  return tile;
}

function panelRects(w, h, layoutKey) {
  const layout = LAYOUTS[layoutKey] ?? LAYOUTS['hero-left'];
  const gap = Math.max(4, Math.round(Math.min(w, h) * 0.009));
  return layout.panels.map(([fx, fy, fw, fh]) => ({
    x: fx * w + (fx > 0 ? gap / 2 : 0),
    y: fy * h + (fy > 0 ? gap / 2 : 0),
    w: fw * w - (fx > 0 ? gap / 2 : 0) - (fx + fw < 1 ? gap / 2 : 0),
    h: fh * h - (fy > 0 ? gap / 2 : 0) - (fy + fh < 1 ? gap / 2 : 0),
  }));
}

function paintPhoto(ctx, photo, rect, place, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (photo) {
    const fit = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
    const scale = fit * place.zoom;
    const pw = photo.naturalWidth * scale;
    const ph = photo.naturalHeight * scale;
    const cx = x + w / 2 + place.dx * w;
    const cy = y + h / 2 + place.dy * h;
    ctx.filter = grade.photoFilter;
    ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
    ctx.filter = 'none';
  } else {
    const bg = ctx.createLinearGradient(x, y, x + w, y + h);
    bg.addColorStop(0, '#3b1d60');
    bg.addColorStop(1, '#12081f');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = `700 ${Math.max(14, Math.round(h * 0.045))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  }
  // Colour-grade wash, blended over the photo, plus a soft vignette.
  const wash = ctx.createLinearGradient(x, y, x, y + h);
  for (const [at, colour] of grade.wash) wash.addColorStop(at, colour);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
  const vig = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.32,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.78,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Thick white poster frame around the panel.
  const gap = Math.max(4, Math.round(Math.min(rect.w, rect.h) * 0.02));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, Math.round(Math.min(w, h) * 0.006));
  ctx.strokeRect(x + gap / 2, y + gap / 2, w - gap, h - gap);
}

function paintCaption(ctx, w, h, title, subtitle, scale) {
  const bandH = h * 0.22;
  const bandY = h - bandH;
  const scrim = ctx.createLinearGradient(0, bandY - h * 0.05, 0, h);
  scrim.addColorStop(0, 'rgba(9, 3, 18, 0)');
  scrim.addColorStop(0.4, 'rgba(9, 3, 18, 0.7)');
  scrim.addColorStop(1, 'rgba(9, 3, 18, 0.94)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - h * 0.05, w, bandH + h * 0.05);

  // Diagonal accent slash above the title.
  ctx.save();
  ctx.translate(w * 0.045, bandY + h * 0.03);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#ff5e3a';
  ctx.fillRect(0, 0, w * 0.085, Math.max(4, h * 0.009));
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(w * 0.095, 0, w * 0.03, Math.max(4, h * 0.009));
  ctx.restore();

  const text = (title || '').trim().toUpperCase();
  if (text) {
    const family = '"Arial Black", Impact, "Archivo Black", sans-serif';
    let size = h * 0.112 * scale;
    ctx.font = `italic 900 ${size}px ${family}`;
    while (ctx.measureText(text).width > w * 0.91 && size > 14) {
      size -= 2;
      ctx.font = `italic 900 ${size}px ${family}`;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#150620';
    ctx.lineWidth = Math.max(3, size * 0.15);
    ctx.save();
    ctx.translate(w * 0.045, bandY + bandH * 0.5);
    ctx.rotate(-0.012);
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  const sub = (subtitle || '').trim().toUpperCase();
  if (sub) {
    const size = Math.max(12, h * 0.03);
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'left';
    try { ctx.letterSpacing = `${Math.round(size * 0.3)}px`; } catch { /* older canvas */ }
    ctx.fillText(sub, w * 0.045, bandY + bandH * 0.85);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  }
}

/**
 * Draws the whole cover.
 * state: { layout, grade, title, subtitle, titleScale,
 *          photos: (Image|null)[], placements: [{zoom, dx, dy}[]] }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = panelRects(w, h, state.layout);

  ctx.fillStyle = '#0d0518';
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => {
    paintPhoto(ctx, state.photos[i] ?? null, rect, state.placements[i] ?? freshPlacement(), grade);
  });

  // Film grain over the full cover.
  const pattern = ctx.createPattern(grainTile(), 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);

  paintCaption(ctx, w, h, state.title, state.subtitle, state.titleScale ?? 1);
}
