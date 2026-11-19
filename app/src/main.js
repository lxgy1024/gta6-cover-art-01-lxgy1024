// Neon Vice Cover Studio — wires the page: photo inputs, per-panel crop and pan,
// grade/layout/export-size pickers, caption editing and PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, GRADES, LAYOUTS, EXPORT_SIZES, freshPlacement } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusEl = $('status');

const state = {
  layout: 'hero-left',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Neon nights · Ocean Drive',
  titleScale: 1,
  exportSize: '1080x1080',
  photos: [null, null, null],
  placements: [freshPlacement(), freshPlacement(), freshPlacement()],
  selected: 0,
  samePhoto: true,
};

function rectsFor(canvasEl) {
  // Recompute the panel rectangles the same way cover.js does, so clicks and
  // drags land on the panel the user sees.
  const layout = LAYOUTS[state.layout];
  const { width: w, height: h } = canvasEl;
  const gap = Math.max(4, Math.round(Math.min(w, h) * 0.009));
  return layout.panels.map(([fx, fy, fw, fh]) => ({
    x: fx * w + (fx > 0 ? gap / 2 : 0),
    y: fy * h + (fy > 0 ? gap / 2 : 0),
    w: fw * w - (fx > 0 ? gap / 2 : 0) - (fx + fw < 1 ? gap / 2 : 0),
    h: fh * h - (fy > 0 ? gap / 2 : 0) - (fy + fh < 1 ? gap / 2 : 0),
  }));
}

function redraw() {
  drawCover(canvas, state);
  // The selection outline is editor UI: never draw it on a cover-only shot.
  if (document.body.classList.contains('shot-cover')) return;
  const r = rectsFor(canvas)[state.selected];
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 4;
  ctx.setLineDash([14, 8]);
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.restore();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function setPhoto(index, img) {
  if (state.samePhoto) {
    state.photos = [img, img, img];
  } else {
    state.photos[index] = img;
  }
  redraw();
}

function refreshPanelControls() {
  const p = state.placements[state.selected];
  $('zoom').value = p.zoom;
  $('panx').value = p.dx;
  $('pany').value = p.dy;
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  $('panelName').textContent = `Panel ${state.selected + 1} of ${rectsFor(canvas).length}`;
  document.querySelectorAll('#panels .panel-btn').forEach((b, i) => {
    b.classList.toggle('active', i === state.selected);
  });
}

function buildPickers() {
  const gradeBox = $('grades');
  for (const [key, g] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (key === state.grade ? ' active' : '');
    b.textContent = g.label;
    b.addEventListener('click', () => {
      state.grade = key;
      gradeBox.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('active', x === b));
      redraw();
    });
    gradeBox.appendChild(b);
  }
  const layoutBox = $('layouts');
  for (const [key, l] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (key === state.layout ? ' active' : '');
    b.textContent = l.label;
    b.addEventListener('click', () => {
      state.layout = key;
      layoutBox.querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x === b));
      refreshPanelControls();
      redraw();
    });
    layoutBox.appendChild(b);
  }
  const sizeBox = $('sizes');
  for (const [key, s] of Object.entries(EXPORT_SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (key === state.exportSize ? ' active' : '');
    b.textContent = s.label;
    b.addEventListener('click', () => {
      state.exportSize = key;
      sizeBox.querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x === b));
      applySize(key);
    });
    sizeBox.appendChild(b);
  }
  const panelBox = $('panels');
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-btn' + (i === 0 ? ' active' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      state.selected = i;
      refreshPanelControls();
      redraw();
    });
    panelBox.appendChild(b);
  }
}

function syncControls() {
  // Bring every control in line with `state` — used after a shot scene sets
  // the state directly, so the buttons never disagree with the cover.
  document.querySelectorAll('#grades .swatch').forEach((b, i) => {
    b.classList.toggle('active', Object.keys(GRADES)[i] === state.grade);
  });
  document.querySelectorAll('#layouts .chip').forEach((b, i) => {
    b.classList.toggle('active', Object.keys(LAYOUTS)[i] === state.layout);
  });
  document.querySelectorAll('#sizes .chip').forEach((b, i) => {
    b.classList.toggle('active', Object.keys(EXPORT_SIZES)[i] === state.exportSize);
  });
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('titleSize').value = state.titleScale;
  $('titleSizeVal').textContent = `${Math.round(state.titleScale * 100)}%`;
  $('samePhoto').checked = state.samePhoto;
  refreshPanelControls();
}

function applySize(key) {
  const s = EXPORT_SIZES[key] ?? EXPORT_SIZES['1080x1080'];
  state.exportSize = key in EXPORT_SIZES ? key : '1080x1080';
  canvas.width = s.w;
  canvas.height = s.h;
  refreshPanelControls();
  redraw();
}

// Click a panel in the preview to select it; drag to pan its photo.
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * canvas.width;
  const py = ((e.clientY - r.top) / r.height) * canvas.height;
  const hit = rectsFor(canvas).findIndex((q) => px >= q.x && px <= q.x + q.w && py >= q.y && py <= q.y + q.h);
  if (hit === -1) return;
  state.selected = hit;
  refreshPanelControls();
  const rect = rectsFor(canvas)[hit];
  drag = { x: px, y: py, dx: state.placements[hit].dx, dy: state.placements[hit].dy, rect };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * canvas.width;
  const py = ((e.clientY - r.top) / r.height) * canvas.height;
  const p = state.placements[state.selected];
  p.dx = Math.max(-0.5, Math.min(0.5, drag.dx + (px - drag.x) / drag.rect.w));
  p.dy = Math.max(-0.5, Math.min(0.5, drag.dy + (py - drag.y) / drag.rect.h));
  refreshPanelControls();
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

$('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setPhoto(state.selected, await loadImage(URL.createObjectURL(file)));
  statusEl.textContent = `Loaded ${file.name} into panel ${state.selected + 1}.`;
});
$('samePhoto').addEventListener('change', (e) => {
  state.samePhoto = e.target.checked;
  if (state.samePhoto && state.photos[state.selected]) setPhoto(state.selected, state.photos[state.selected]);
});
$('samples').addEventListener('click', async () => {
  const [a, b] = await Promise.all([loadImage('samples/pier.jpg'), loadImage('samples/boulevard.jpg')]);
  state.samePhoto = false;
  $('samePhoto').checked = false;
  state.photos = [a, b, a];
  redraw();
  statusEl.textContent = 'Sample photos loaded: pier in panels 1 and 3, boulevard in panel 2.';
});
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('titleSize').addEventListener('input', (e) => {
  state.titleScale = Number(e.target.value);
  $('titleSizeVal').textContent = `${Math.round(state.titleScale * 100)}%`;
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  state.placements[state.selected].zoom = Number(e.target.value);
  refreshPanelControls();
  redraw();
});
$('panx').addEventListener('input', (e) => {
  state.placements[state.selected].dx = Number(e.target.value);
  refreshPanelControls();
  redraw();
});
$('pany').addEventListener('input', (e) => {
  state.placements[state.selected].dy = Number(e.target.value);
  refreshPanelControls();
  redraw();
});
$('resetCrop').addEventListener('click', () => {
  state.placements[state.selected] = freshPlacement();
  refreshPanelControls();
  redraw();
});

$('export').addEventListener('click', () => {
  const s = EXPORT_SIZES[state.exportSize];
  const off = document.createElement('canvas');
  off.width = s.w;
  off.height = s.h;
  drawCover(off, state);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${s.w}x${s.h}.png`;
    a.click();
    statusEl.textContent = `Saved vice-cover-${s.w}x${s.h}.png (${(blob.size / 1024).toFixed(0)} KB).`;
  }, 'image/png');
});

buildPickers();
refreshPanelControls();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, { loadImage, redraw, applySize, syncControls });
} else {
  applySize(state.exportSize);
}
