// Burger menu: unfolds the name pill and scrolls to the chosen section.
const pill = document.querySelector('.pill-name');
const burger = pill.querySelector('.burger');
const menu = pill.querySelector('.menu');

function setOpen(open) {
  pill.classList.toggle('is-open', open);
  burger.setAttribute('aria-expanded', String(open));
  menu.inert = !open;
}

burger.addEventListener('click', () => setOpen(!pill.classList.contains('is-open')));

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && pill.classList.contains('is-open')) {
    setOpen(false);
    burger.focus();
  }
});

document.addEventListener('click', (event) => {
  if (!pill.contains(event.target)) setOpen(false);
});

// Hover light on the pill follows the mouse, at most once a frame
const glow = pill.querySelector('.pill-glow');
let glowX = null;
pill.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'mouse' || pill.classList.contains('is-open')) return;
  if (glowX === null) requestAnimationFrame(() => {
    // The rect is in screen px; scale back to the pill's own px in case the page is scaled (demo frame)
    const rect = pill.getBoundingClientRect();
    glow.style.setProperty('--glow-x', `${((glowX - rect.left) * pill.offsetWidth) / rect.width}px`);
    glowX = null;
  });
  glowX = event.clientX;
});

// The pill names the section on screen: each titled section of the main page gets its title in the pill,
// shown once the section's top passes 40% of the screen; above the first one the name stays
const swap = pill.querySelector('.name-swap');
const titled = [...document.querySelectorAll('.main > section[id]')].filter((section) => section.querySelector('h2'));
if (titled.length) {
  const demo = document.documentElement.classList.contains('demo');
  const box = demo ? document.querySelector('.main') : null;
  const titles = titled.map((section) => {
    const title = document.createElement('span');
    title.className = 'name name-section';
    title.setAttribute('aria-hidden', 'true');
    title.textContent = section.querySelector('h2').textContent;
    swap.append(title);
    return title;
  });
  let shown = -2;
  let frame = 0;
  const follow = () => {
    frame = 0;
    // Both rects are in the same (possibly zoomed) px
    const view = box ? box.getBoundingClientRect() : { top: 0, height: innerHeight };
    let current = -1;
    titled.forEach((section, i) => {
      if (section.getBoundingClientRect().top - view.top < view.height * 0.4) current = i;
    });
    if (current === shown) return;
    shown = current;
    titles.forEach((title, i) => {
      title.classList.toggle('is-current', i === current);
      title.classList.toggle('is-above', i < current);
    });
    pill.classList.toggle('has-section', current >= 0);
  };
  (box || window).addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(follow);
  }, { passive: true });
  addEventListener('resize', follow);
  follow();
}

menu.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((link) => {
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  });
});
