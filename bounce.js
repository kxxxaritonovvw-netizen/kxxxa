// Touch screens: a tapped element hops up a little and lands with a small rebound, so a tap feels answered.
// The hop runs on translate only; the artwork hops further, in its own (scaled) px.
const BOUNCY = '.art, .burger, .telegram, .case-close';

document.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'mouse') return;
  const el = event.target.closest(BOUNCY);
  if (!el) return;
  // Restart the hop if it is still running from the previous tap
  el.classList.remove('is-bouncing');
  void el.offsetWidth;
  el.classList.add('is-bouncing');
});
document.addEventListener('animationend', (event) => {
  if (event.animationName === 'bounce') event.target.classList.remove('is-bouncing');
});
