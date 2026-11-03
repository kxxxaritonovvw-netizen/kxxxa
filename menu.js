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

menu.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((link) => {
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  });
});
