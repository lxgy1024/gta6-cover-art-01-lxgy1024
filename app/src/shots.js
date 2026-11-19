// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos;
// ?shot=cover shows the cover alone. `photo` picks a sample (samples/<photo>.jpg),
// `caption` the title, `layout` and `grade` the look, `size` the export size.
// window.__shotReady is set once the scene has been painted.
export async function runShot(shot, query, state, tools) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const layout = query.get('layout');
  const grade = query.get('grade');
  const size = query.get('size');
  if (layout) state.layout = layout;
  if (grade) state.grade = grade;
  if (size && tools.applySize) tools.applySize(size);
  const [pier, boulevard] = await Promise.all([
    tools.loadImage(`samples/${query.get('photo') ?? 'pier'}.jpg`),
    tools.loadImage(`samples/${query.get('photo2') ?? 'boulevard'}.jpg`),
  ]);
  state.samePhoto = false;
  state.photos = [pier, boulevard, pier];
  state.title = query.get('caption') ?? 'Sunset Heist';
  state.subtitle = query.get('subtitle') ?? 'Neon nights · Ocean Drive';
  if (tools.syncControls) tools.syncControls();
  tools.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
