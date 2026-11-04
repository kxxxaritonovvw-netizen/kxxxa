// Scroll rail on the right instead of the system scrollbar: it fills from the top as the page scrolls, and
// every section marked data-rail is a dot on it at the point where that section reaches the top of the screen.
const railSections = [...document.querySelectorAll('[data-rail]')];

if (railSections.length > 1) {
  const demo = document.documentElement.classList.contains('demo');
  const box = demo ? document.querySelector('.main') : document.documentElement;
  const scroller = demo ? box : window;
  const rail = document.createElement('nav');
  rail.className = 'rail';
  rail.setAttribute('aria-label', 'Прокрутка по разделам');
  rail.innerHTML = '<div class="rail-line"><div class="rail-fill"></div></div>';
  const marks = railSections.map((section) => {
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'rail-mark';
    mark.innerHTML = `<span>${section.dataset.rail}</span>`;
    mark.setAttribute('aria-label', section.dataset.rail);
    mark.addEventListener('click', () => section.scrollIntoView({ behavior: 'smooth' }));
    rail.append(mark);
    return mark;
  });
  document.querySelector('.page').append(rail);

  let frame = 0;
  let current = -1;
  let stopTimer = 0;
  let announceTimer = 0;

  // Where each dot sits: the share of the full scroll at which its section reaches the top
  const place = () => {
    const max = box.scrollHeight - box.clientHeight;
    railSections.forEach((section, i) => {
      const at = max > 0 ? Math.min(1, section.offsetTop / max) : 0;
      marks[i].dataset.at = at;
      marks[i].style.setProperty('--at', `${(at * 100).toFixed(2)}%`);
    });
    update();
  };

  const update = () => {
    frame = 0;
    const max = box.scrollHeight - box.clientHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, box.scrollTop / max)) : 0;
    rail.style.setProperty('--progress', progress.toFixed(4));
    let reached = 0;
    marks.forEach((mark, i) => {
      const on = progress >= Number(mark.dataset.at) - 0.002;
      mark.classList.toggle('is-reached', on);
      if (on) reached = i;
    });
    if (reached !== current) {
      marks[current]?.classList.remove('is-current', 'is-announced');
      marks[reached].classList.add('is-current');
      // Name the section the fill has just reached for a moment (not on the first load)
      if (current !== -1) {
        marks[reached].classList.add('is-announced');
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => marks[reached].classList.remove('is-announced'), 1400);
      }
      current = reached;
    }
  };

  scroller.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(update);
    rail.classList.add('is-scrolling');
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => rail.classList.remove('is-scrolling'), 600);
  }, { passive: true });
  // Sections change height as fonts and images load or the window resizes
  const resized = new ResizeObserver(place);
  railSections.forEach((section) => resized.observe(section));
  addEventListener('resize', place);
  place();
}
