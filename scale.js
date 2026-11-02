// The design is a fixed 1920×1080 composition; fit it inside the window, leaving the page gap around it.
const viewport = document.querySelector('.viewport');

function fit() {
  const gap = parseFloat(getComputedStyle(viewport).paddingLeft) * 2;
  const scale = Math.min((window.innerWidth - gap) / 1920, (window.innerHeight - gap) / 1080);
  viewport.style.setProperty('--scale', Math.max(scale, 0.1));
}

fit();
window.addEventListener('resize', fit);
