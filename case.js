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
