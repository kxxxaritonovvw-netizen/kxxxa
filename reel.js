// Phones' longread (styles.css, .reel): where the browser has no scroll-driven animations, each picture
// is revealed once, when it is a little way into the screen.
if (!CSS.supports('animation-timeline: view()')) {
  const items = document.querySelectorAll('.reel-item');
  const seen = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      seen.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  items.forEach((item) => seen.observe(item));
}
