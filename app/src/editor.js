// Wires the page: load photos, pick a layout and grade, edit the caption,
// select and pan each panel, and export the poster as a PNG. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).

import { GRADES, LAYOUTS, SIZES, gradeById, panelAt, panelRects, renderPoster, renderToCanvas, sizeById } from './render.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const sizeSelect = document.getElementById('size');
const statusEl = document.getElementById('status');
const slotsEl = document.getElementById('slots');
const selectedHint = document.getElementById('selectedHint');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panX');
const panYInput = document.getElementById('panY');

// The poster's state. photos holds the loaded images; panelPhoto says which
// photo each of the three panels shows; transforms hold each panel's zoom
// and pan in slider units.
const state = {
  photos: [null, null, null],
  panelPhoto: [0, 0, 0],
  transforms: [
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
  ],
  layout: 'spotlight',
  grade: 'sunset',
  size: '1080x1080',
  caption: 'Vice Lights',
  subtitle: 'A Leonida story',
};
let selectedPanel = 0;
let dragging = null;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function redraw() {
  const size = sizeById(state.size);
  if (canvas.width !== size.w) canvas.width = size.w;
  if (canvas.height !== size.h) canvas.height = size.h;
  renderPoster(canvas, state);
  refreshSlots();
  refreshPanelControls();
}

function refreshSlots() {
  slotsEl.replaceChildren();
  state.photos.forEach((photo, i) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot' + (photo ? ' filled' : '') + (state.panelPhoto[selectedPanel] === i && photo ? ' selected' : '');
    slot.textContent = photo ? `Photo ${i + 1}` : `Empty slot ${i + 1}`;
    if (photo) slot.style.backgroundImage = `url(${photo.src})`;
    slot.addEventListener('click', () => {
      if (!photo) return;
      state.panelPhoto[selectedPanel] = i;
      redraw();
    });
    slotsEl.appendChild(slot);
  });
}

function refreshPanelControls() {
  const t = state.transforms[selectedPanel];
  zoomInput.value = String(t.zoom);
  panXInput.value = String(t.ox);
  panYInput.value = String(t.oy);
  document.getElementById('zoomValue').textContent = `${t.zoom.toFixed(2)}×`;
  document.getElementById('panXValue').textContent = String(t.ox);
  document.getElementById('panYValue').textContent = String(t.oy);
  selectedHint.textContent = `Panel ${selectedPanel + 1} selected — drag it on the cover, or use the sliders.`;
}

function addPhoto(img) {
  const empty = state.photos.indexOf(null);
  const slot = empty === -1 ? 0 : empty;
  state.photos[slot] = img;
  // A first photo fills every panel; later photos take the selected panel.
  if (state.photos.filter(Boolean).length === 1) state.panelPhoto = [slot, slot, slot];
  else state.panelPhoto[selectedPanel] = slot;
  redraw();
}

async function addSample(name) {
  try {
    addPhoto(await loadImage(`samples/${name}.jpg`));
    statusEl.textContent = `Loaded the ${name} sample photo.`;
  } catch {
    statusEl.textContent = `Could not load the ${name} sample photo.`;
  }
}

function buildChoices(el, items, current, onPick) {
  el.replaceChildren();
  items.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.name;
    button.setAttribute('aria-pressed', String(item.id === current));
    button.addEventListener('click', () => {
      onPick(item.id);
      buildChoices(el, items, item.id, onPick);
    });
    el.appendChild(button);
  });
}

function refreshLayoutChoices() {
  buildChoices(document.getElementById('layouts'), LAYOUTS, state.layout, (id) => {
    state.layout = id;
    refreshLayoutChoices();
    redraw();
  });
}

function refreshGradeChoices() {
  buildChoices(document.getElementById('grades'), GRADES, state.grade, (id) => {
    state.grade = id;
    refreshGradeChoices();
    redraw();
  });
}

refreshLayoutChoices();
refreshGradeChoices();

document.getElementById('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    addPhoto(await loadImage(URL.createObjectURL(file)));
    statusEl.textContent = `Loaded ${file.name}.`;
  } catch {
    statusEl.textContent = 'That file could not be read as a photo.';
  }
  e.target.value = '';
});
document.getElementById('samplePier').addEventListener('click', () => addSample('pier'));
document.getElementById('sampleBoulevard').addEventListener('click', () => addSample('boulevard'));
document.getElementById('fillAll').addEventListener('click', () => {
  const first = state.photos.findIndex(Boolean);
  if (first === -1) {
    statusEl.textContent = 'Load a photo first.';
    return;
  }
  state.panelPhoto = [first, first, first];
  redraw();
});

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
sizeSelect.addEventListener('change', () => { state.size = sizeSelect.value; redraw(); });
zoomInput.addEventListener('input', () => {
  state.transforms[selectedPanel].zoom = Number(zoomInput.value);
  redraw();
});
panXInput.addEventListener('input', () => {
  state.transforms[selectedPanel].ox = Number(panXInput.value);
  redraw();
});
panYInput.addEventListener('input', () => {
  state.transforms[selectedPanel].oy = Number(panYInput.value);
  redraw();
});
document.getElementById('resetPanel').addEventListener('click', () => {
  state.transforms[selectedPanel] = { zoom: 1, ox: 0, oy: 0 };
  redraw();
});

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(state.layout, canvas.width, canvas.height, p.x, p.y);
  if (hit === -1) return;
  selectedPanel = hit;
  const t = state.transforms[hit];
  dragging = { startX: p.x, startY: p.y, ox: t.ox, oy: t.oy };
  canvas.setPointerCapture(e.pointerId);
  refreshPanelControls();
  refreshSlots();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const t = state.transforms[selectedPanel];
  const rects = panelRectsOfSelected();
  t.ox = Math.max(-100, Math.min(100, dragging.ox + ((p.x - dragging.startX) / rects.w) * 200));
  t.oy = Math.max(-100, Math.min(100, dragging.oy + ((p.y - dragging.startY) / rects.h) * 200));
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });

function panelRectsOfSelected() {
  const size = sizeById(state.size);
  return panelRects(state.layout, size.w, size.h)[selectedPanel];
}

document.getElementById('export').addEventListener('click', () => {
  const size = sizeById(state.size);
  const out = renderToCanvas(state);
  out.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — the browser could not make the PNG.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-lights-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved vice-lights-${size.w}x${size.h}.png`;
  }, 'image/png');
});

// The API the screenshot scenes use: set a whole scene at once, then paint.
export const shotApi = {
  async loadScene(scene) {
    state.layout = scene.layout ?? state.layout;
    state.grade = scene.grade ?? state.grade;
    state.size = scene.size ?? state.size;
    state.caption = scene.caption ?? state.caption;
    state.subtitle = scene.subtitle ?? state.subtitle;
    captionInput.value = state.caption;
    subtitleInput.value = state.subtitle;
    sizeSelect.value = state.size;
    refreshLayoutChoices();
    refreshGradeChoices();
    if (scene.photo) {
      const img = await loadImage(`samples/${scene.photo}.jpg`);
      state.photos = [img, img, img];
      state.panelPhoto = [0, 0, 0];
    }
    redraw();
  },
  gradeName() {
    return gradeById(state.grade).name;
  },
};

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), shotApi);
} else {
  redraw();
}
