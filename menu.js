// Burger menu: unfolds the name pill and scrolls the canvas to the chosen screen.
const pill = document.querySelector('.pill-name');
const burger = pill.querySelector('.burger');
const menu = pill.querySelector('.menu');
const scroller = document.querySelector('.scroll');

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

menu.querySelectorAll('a[href^="#"]').forEach((link) => {
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const scale = parseFloat(getComputedStyle(scroller).getPropertyValue('--scale')) || 1;
    scroller.scrollTo({ top: target.offsetTop * scale, behavior: 'smooth' });
    setOpen(false);
  });
});
