// Scale the hero artwork (drawn at 1308×728 in Figma) to the width of its box.
const visual = document.querySelector('.visual');

function fitVisual() {
  visual.style.setProperty('--vs', visual.clientWidth / 1308);
}

fitVisual();
new ResizeObserver(fitVisual).observe(visual);
