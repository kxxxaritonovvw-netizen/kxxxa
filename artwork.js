// Hero artwork: hovering a piece with a mouse (or tapping it) grows it a little and shows a tooltip
// with what it is. The text comes from data-tip-title / data-tip-text on the piece or its hit area.
const pieces = [...document.querySelectorAll('.visual .art')];

if (pieces.length) {
  const GAP = 18; // px between the mouse and the tooltip
  const tip = document.createElement('div');
  tip.className = 'art-tip';
  tip.setAttribute('role', 'tooltip');
  tip.innerHTML = '<p class="art-tip-title"></p><p class="art-tip-text"></p>';
  document.body.append(tip);
  const [tipTitle, tipText] = tip.children;

  let active = null;
  let tipX = 0;
  let tipY = 0;
  let frame = 0;

  // Keep the tooltip next to the point, flipped to the other side near the window's edges
  const place = () => {
    frame = 0;
    const flipX = tipX + GAP + tip.offsetWidth > innerWidth - 8;
    const flipY = tipY + GAP + tip.offsetHeight > innerHeight - 8;
    const x = flipX ? tipX - GAP - tip.offsetWidth : tipX + GAP;
    const y = flipY ? tipY - GAP - tip.offsetHeight : tipY + GAP;
    tip.style.transform = `translate(${x}px, ${y}px)`;
  };
  const moveTo = (x, y) => {
    tipX = x;
    tipY = y;
    if (!frame) frame = requestAnimationFrame(place);
  };

  const show = (piece, x, y) => {
    if (active !== piece) {
      active?.classList.remove('is-active');
      piece.classList.add('is-active');
      active = piece;
      const source = piece.querySelector('[data-tip-title]') || piece;
      tipTitle.textContent = source.dataset.tipTitle;
      tipText.textContent = source.dataset.tipText;
    }
    moveTo(x, y);
    tip.classList.add('is-visible');
  };
  const hide = () => {
    active?.classList.remove('is-active');
    active = null;
    tip.classList.remove('is-visible');
  };

  pieces.forEach((piece) => {
    // The pig reacts only over its body, the rest of its box lets the mouse through
    const hit = piece.querySelector('.pig-hit') || piece;
    hit.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse') show(piece, event.clientX, event.clientY);
    });
    hit.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse' && active === piece) hide();
    });
    // Touch: a tap shows the piece, a second tap on it or a tap elsewhere hides it
    hit.addEventListener('click', (event) => {
      if (event.pointerType === 'mouse') return;
      event.stopPropagation();
      if (active === piece) hide();
      else show(piece, event.clientX, event.clientY);
    });
  });
  document.addEventListener('click', (event) => {
    if (event.pointerType !== 'mouse') hide();
  });
  addEventListener('scroll', hide, { passive: true, capture: true });
  // scenes.js: the artwork changed under the tooltip
  document.addEventListener('artwork:hide', hide);
}
