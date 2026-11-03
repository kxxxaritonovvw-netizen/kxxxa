// Round cursor: a small light dot replaces the system pointer and eases after the mouse.
// Only for a mouse; touch screens and pens keep their own pointer.
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);
  document.documentElement.classList.add('has-cursor');

  const EASE = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0.35; // share of the gap closed each frame
  let x = 0;
  let y = 0;
  let toX = 0;
  let toY = 0;
  let frame = 0;

  const move = () => {
    x += (toX - x) * EASE;
    y += (toY - y) * EASE;
    if (Math.abs(toX - x) < 0.1 && Math.abs(toY - y) < 0.1) {
      x = toX;
      y = toY;
      frame = 0;
    } else {
      frame = requestAnimationFrame(move);
    }
    dot.style.transform = `translate(${x}px, ${y}px)`;
  };

  addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    toX = event.clientX;
    toY = event.clientY;
    // The first move after the dot was hidden puts it straight under the mouse
    if (!dot.classList.contains('is-visible')) {
      x = toX;
      y = toY;
      dot.classList.add('is-visible');
    }
    if (!frame) frame = requestAnimationFrame(move);
  }, { passive: true });

  // Hide the dot while the mouse is outside the window
  document.addEventListener('pointerleave', () => dot.classList.remove('is-visible'));
  addEventListener('blur', () => dot.classList.remove('is-visible'));
}
