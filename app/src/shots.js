// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone. `photo` picks the sample
// (samples/<photo>.jpg), `caption` the title, and `layout`, `grade`, `size`
// and `subtitle` the rest of the scene. window.__shotReady is set once the
// scene has painted, so a screenshot tool knows when to shoot.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const scene = {
    photo: query.get('photo') ?? 'pier',
    caption: query.get('caption') ?? 'Vice Lights',
    subtitle: query.get('subtitle') ?? 'A Leonida story',
    layout: query.get('layout') ?? 'spotlight',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? '1080x1080',
  };
  await api.loadScene(scene);
  document.title = `Vice Lights — ${scene.caption} (${api.gradeName()}, ${scene.size})`;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
