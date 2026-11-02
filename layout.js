// Scale the hero artwork (drawn at 1308×728 in Figma) to the width of its box.
const visual = document.querySelector('.visual');

function fitVisual() {
  visual.style.setProperty('--vs', visual.clientWidth / 1308);
}

fitVisual();
new ResizeObserver(fitVisual).observe(visual);

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
