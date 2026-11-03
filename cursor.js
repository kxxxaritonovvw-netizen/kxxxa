// Round cursor: a small light dot replaces the system pointer and eases after the mouse.
// Only for a mouse; touch screens and pens keep their own pointer.
// Near an element marked data-magnet the dot is pulled to its centre and swells into it, while the
// element leans a little towards the mouse and takes the .is-magnet look. Only transforms move, every frame.
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);
  document.documentElement.classList.add('has-cursor');

  const EASE = matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0.35; // share of the gap closed each frame
  const DOT = 6; // px, the dot's size in styles.css
  const REACH = 24; // px around a magnet where it starts to pull
  const LEAN = 0.3; // share of the mouse's offset from the centre that the magnet follows
  const magnets = [...document.querySelectorAll('[data-magnet]')];
  let x = 0;
  let y = 0;
  let scale = 1;
  let toX = 0;
  let toY = 0;
  let toScale = 1;
  let mouseX = 0;
  let mouseY = 0;
  let held = null; // the magnet holding the dot
  let leanX = 0; // screen px the held magnet is moved by
  let leanY = 0;
  let frame = 0;

  // Which magnet the mouse is within reach of, if any
  const magnetAt = (mx, my) => magnets.find((el) => {
    const r = el.getBoundingClientRect();
    return mx > r.left - REACH && mx < r.right + REACH && my > r.top - REACH && my < r.bottom + REACH;
  });

  const aim = () => {
    const magnet = magnetAt(mouseX, mouseY);
    if (magnet !== held) {
      held?.classList.remove('is-magnet');
      held?.style.removeProperty('translate');
      leanX = leanY = 0;
      magnet?.classList.add('is-magnet');
      dot.classList.toggle('is-held', !!magnet);
      held = magnet;
    }
    if (!held) {
      toX = mouseX;
      toY = mouseY;
      toScale = 1;
      return;
    }
    // The rect includes the current lean, so take it off to get the resting centre.
    // It is in screen px, while the element's own px may be scaled (demo frame)
    const r = held.getBoundingClientRect();
    const zoom = r.width / held.offsetWidth;
    const centreX = r.left + r.width / 2 - leanX;
    const centreY = r.top + r.height / 2 - leanY;
    leanX = (mouseX - centreX) * LEAN;
    leanY = (mouseY - centreY) * LEAN;
    held.style.translate = `${(leanX / zoom).toFixed(2)}px ${(leanY / zoom).toFixed(2)}px`;
    toX = centreX + leanX;
    toY = centreY + leanY;
    toScale = r.width / DOT;
  };

  const move = () => {
    x += (toX - x) * EASE;
    y += (toY - y) * EASE;
    scale += (toScale - scale) * EASE;
    if (Math.abs(toX - x) < 0.1 && Math.abs(toY - y) < 0.1 && Math.abs(toScale - scale) < 0.01) {
      x = toX;
      y = toY;
      scale = toScale;
      frame = 0;
    } else {
      frame = requestAnimationFrame(move);
    }
    dot.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };

  addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    mouseX = event.clientX;
    mouseY = event.clientY;
    aim();
    // The first move after the dot was hidden puts it straight under the mouse
    if (!dot.classList.contains('is-visible')) {
      x = toX;
      y = toY;
      dot.classList.add('is-visible');
    }
    if (!frame) frame = requestAnimationFrame(move);
  }, { passive: true });

  // Hide the dot while the mouse is outside the window, and let go of any magnet
  const hide = () => {
    dot.classList.remove('is-visible');
    mouseX = mouseY = -1e4;
    aim();
  };
  document.addEventListener('pointerleave', hide);
  addEventListener('blur', hide);
}
