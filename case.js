// Case logo: turns a little after the mouse, so the metal catches the light as it moves.
// Only transforms are written, on three small elements, so a frame costs no style or paint work.
const turn = document.querySelector('.case-logo-turn');

if (turn && matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
  // The metal and the reflection slide by different amounts, as their bands sit at different depths
  const sheens = [...turn.querySelectorAll('.case-sheen')].map((el) => ({
    el,
    gain: el.closest('.case-logo-gloss') ? 1.2 : 1,
  }));
  const EASE = 0.08;
  let goalX = 0;
  let goalY = 0;
  let x = 0;
  let y = 0;
  let frame = 0;

  // Ease towards the mouse every frame, and stop once it has caught up
  const step = () => {
    x += (goalX - x) * EASE;
    y += (goalY - y) * EASE;
    turn.style.transform = `rotateX(${(-y * 4).toFixed(3)}deg) rotateY(${(x * 10).toFixed(3)}deg)`;
    // One logo width is 1/9 of the sheen strip
    const shift = (-(x * 0.5 + y * 0.25) * 100) / 9;
    for (const { el, gain } of sheens) el.style.transform = `translateX(${(shift * gain).toFixed(3)}%)`;
    frame = Math.abs(goalX - x) + Math.abs(goalY - y) > 0.001 ? requestAnimationFrame(step) : 0;
  };

  addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    // -1…1 across the window
    goalX = (event.clientX / innerWidth) * 2 - 1;
    goalY = (event.clientY / innerHeight) * 2 - 1;
    if (!frame) frame = requestAnimationFrame(step);
  }, { passive: true });
}

// On a phone the close button flies up out of the way while the page scrolls down,
// and comes back once it has been scrolled 40px up again (or near the top)
const close = document.querySelector('.case-close');
const main = document.querySelector('.main');
if (close && main) {
  const BACK = 40; // px of scrolling up that bring the button back
  let lastY = 0;
  let upFrom = null; // where the current scroll up started
  // Capture catches the scroll of the page and of the demo frame's own scroller alike
  document.addEventListener('scroll', (event) => {
    const scroller = event.target === document ? document.scrollingElement : event.target;
    if (!scroller.contains(main) && scroller !== main) return;
    const y = scroller.scrollTop;
    let away = close.classList.contains('is-away');
    if (main.clientWidth > 640) {
      away = false;
    } else if (y > lastY) {
      upFrom = null;
      if (y > BACK) away = true;
    } else if (y < lastY) {
      upFrom ??= lastY;
      if (upFrom - y >= BACK || y <= BACK) away = false;
    }
    close.classList.toggle('is-away', away);
    lastY = y;
  }, { capture: true, passive: true });
}
