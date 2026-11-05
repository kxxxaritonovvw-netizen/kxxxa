// Scale the hero artwork (drawn at 1308×728 in Figma) to the width of its box.
const visual = document.querySelector('.visual');

// Inner pages have no hero artwork
if (visual) {
  const fitVisual = () => visual.style.setProperty('--vs', visual.clientWidth / 1308);
  fitVisual();
  new ResizeObserver(fitVisual).observe(visual);
}

// Demo only: render the site on a simulated screen (?demo=1440x900 by default) shrunk to fit the window.
const root = document.documentElement;
if (root.classList.contains('demo')) {
  const [, w = 1440, h = 900] = (new URLSearchParams(location.search).get('demo') || '').match(/^(\d+)x(\d+)$/) || [];
  root.style.setProperty('--demo-w', `${w}px`);
  root.style.setProperty('--demo-h', `${h}px`);

  const fitScreen = () => {
    const gap = parseFloat(getComputedStyle(root).getPropertyValue('--demo-gap')) * 2;
    const scale = Math.min((innerWidth - gap) / w, (innerHeight - gap) / h, 1);
    root.style.setProperty('--demo-scale', scale);
  };
  fitScreen();
  addEventListener('resize', fitScreen);
}

// Coming back to a page (Back, or closing a case) puts it where it was left. The browser does this for
// the page itself; the demo frame scrolls its own .main, so its position is kept by hand
const scroller = () => (root.classList.contains('demo') ? document.querySelector('.main') : null);
const scrollKey = `scroll:${location.pathname}`;
addEventListener('pagehide', () => {
  const el = scroller();
  if (el) try { sessionStorage.setItem(scrollKey, String(el.scrollTop)); } catch {}
});
if (performance.getEntriesByType('navigation')[0]?.type === 'back_forward') {
  const el = scroller();
  let y = null;
  try { y = sessionStorage.getItem(scrollKey); } catch {}
  if (el && y !== null) requestAnimationFrame(() => { el.scrollTop = Number(y); });
}
