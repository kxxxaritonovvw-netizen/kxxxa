// Case logo: turns a little after the mouse, so the metal catches the light as it moves.
const hero = document.querySelector('.case-hero');

if (hero && matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
  let goalX = 0;
  let goalY = 0;
  let x = 0;
  let y = 0;
  let frame = null;

  // Ease towards the mouse every frame, and stop once it has caught up
  const step = () => {
    x += (goalX - x) * 0.08;
    y += (goalY - y) * 0.08;
    hero.style.setProperty('--mx', x.toFixed(4));
    hero.style.setProperty('--my', y.toFixed(4));
    frame = Math.abs(goalX - x) + Math.abs(goalY - y) > 0.001 ? requestAnimationFrame(step) : null;
  };

  addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    // -1…1 across the window
    goalX = (event.clientX / innerWidth) * 2 - 1;
    goalY = (event.clientY / innerHeight) * 2 - 1;
    frame ??= requestAnimationFrame(step);
  });
}
