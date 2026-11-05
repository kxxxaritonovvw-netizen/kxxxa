// Hero artwork: three scenes of work take turns on their own. The pieces of a scene lift away and the
// next scene's pieces rise in one after another (the motion itself is CSS: .scene.is-current / .is-leaving).
// The scenes wait while the mouse is over the artwork, while it is off screen and while the tab is hidden.
{
  const visual = document.querySelector('.visual');
  const scenes = visual ? [...visual.querySelectorAll('.scene')] : [];
  if (scenes.length > 1) setUpScenes(visual, scenes);
}

function setUpScenes(visual, scenes) {
  const HOLD = 6000; // ms a scene stays
  const LEAVE = 1200; // ms until the scene that left is reset below, out of sight
  let current = scenes.findIndex((scene) => scene.classList.contains('is-current'));
  let timer = 0;
  let hovered = false;
  let onScreen = true;

  // The other scenes' images wait until the page has loaded, so they never hold up the first screen
  const loadRest = () => {
    visual.querySelectorAll('[data-srcset]').forEach((el) => { el.srcset = el.dataset.srcset; });
    visual.querySelectorAll('[data-src]').forEach((el) => { el.src = el.dataset.src; });
  };
  const later = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
  if (document.readyState === 'complete') later(loadRest);
  else addEventListener('load', () => later(loadRest), { once: true });

  // A scene shows only once its images are decoded, so nothing pops in halfway through the rise
  const ready = (scene) => Promise.race([
    Promise.all([...scene.querySelectorAll('img')].map((img) => (img.src ? img.decode().catch(() => {}) : Promise.resolve()))),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);

  const show = async (index) => {
    const next = scenes[index];
    await ready(next);
    if (!running()) return schedule();
    const prev = scenes[current];
    document.dispatchEvent(new Event('artwork:hide'));
    prev.classList.add('is-leaving');
    prev.classList.remove('is-current');
    prev.setAttribute('aria-hidden', 'true');
    next.classList.remove('is-leaving');
    next.classList.add('is-current');
    next.removeAttribute('aria-hidden');
    setTimeout(() => { if (!prev.classList.contains('is-current')) prev.classList.remove('is-leaving'); }, LEAVE);
    current = index;
    schedule();
  };

  const running = () => !hovered && onScreen && !document.hidden;
  const schedule = () => {
    clearTimeout(timer);
    timer = running() ? setTimeout(() => show((current + 1) % scenes.length), HOLD) : 0;
  };

  visual.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') { hovered = true; schedule(); }
  });
  visual.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse') { hovered = false; schedule(); }
  });
  // A tap on a piece gives its tooltip a full turn before the scene changes
  visual.addEventListener('pointerdown', (event) => { if (event.pointerType !== 'mouse') schedule(); });
  document.addEventListener('visibilitychange', schedule);
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; schedule(); }).observe(visual);
}
