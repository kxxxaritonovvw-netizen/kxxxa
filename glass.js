// Liquid glass on the name pill, started from the Figma Glass effect and pushed further so it reads on the dark page.
// Only Chromium can run an SVG filter as a backdrop-filter; other browsers keep the plain blur from styles.css.
const glass = document.querySelector('.pill-name');
const isChromium = navigator.userAgentData?.brands.some((b) => b.brand === 'Chromium');

if (glass && isChromium) {
  const DEPTH = 32; // px from the edge over which the glass bends the backdrop, a wide lens
  const STRENGTH = 42; // px the backdrop is pulled in at the very edge
  const OPEN_STRENGTH = 90; // stronger bend while the menu is open
  const DISPERSION = 0.5; // red and blue bend a little more and less than green
  const OPEN_DISPERSION = 0.15; // the open bend is so strong that a wide split ghosts the text
  const FROST = 1.5; // blur stdDeviation

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `
    <filter id="liquid-glass" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage result="map" preserveAspectRatio="none" />
      ${['r', 'g', 'b'].map((channel, i) => `
        <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"
          result="d-${channel}" />
        <feColorMatrix in="d-${channel}" type="matrix" result="c-${channel}"
          values="${[0, 1, 2].map((row) => [0, 1, 2, 3, 4].map((col) => +(row === i && col === i)).join(' ')).join(' ')} 0 0 0 1 0" />`).join('')}
      <feComposite in="c-r" in2="c-g" operator="arithmetic" k2="1" k3="1" result="rg" />
      <feComposite in="rg" in2="c-b" operator="arithmetic" k2="1" k3="1" result="rgb" />
      <feGaussianBlur in="rgb" stdDeviation="${FROST}" />
    </filter>`;
  document.body.append(svg);
  const image = svg.querySelector('feImage');
  const displacements = svg.querySelectorAll('feDisplacementMap');
  const canvas = document.createElement('canvas');

  // open: 0 for the closed pill, 1 for the open one; bend and colour split follow it
  function setOpenness(open) {
    const strength = STRENGTH + (OPEN_STRENGTH - STRENGTH) * open;
    const dispersion = DISPERSION + (OPEN_DISPERSION - DISPERSION) * open;
    displacements.forEach((map, i) => map.setAttribute('scale', strength * (1 + dispersion * (1 - i))));
  }

  // Displacement map: red/green hold the x/y offset, sampling the backdrop from further in near the rim
  function drawMap(w, h, r) {
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const data = ctx.createImageData(w, h);
    const hx = w / 2 - r;
    const hy = h / 2 - r;
    // The bend must fade out before the middle, or the pull flips sharply there and tears the backdrop
    const depth = Math.min(DEPTH, w / 2, h / 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x + 0.5 - w / 2;
        const py = y + 0.5 - h / 2;
        const qx = Math.abs(px) - hx;
        const qy = Math.abs(py) - hy;
        // Distance from the rounded edge inwards, and the outward normal there
        let inside;
        let nx = 0;
        let ny = 0;
        if (qx > 0 && qy > 0) {
          const len = Math.hypot(qx, qy) || 1;
          inside = r - len;
          nx = (qx / len) * Math.sign(px);
          ny = (qy / len) * Math.sign(py);
        } else if (qx > qy) {
          inside = r - qx;
          nx = Math.sign(px);
        } else {
          inside = r - qy;
          ny = Math.sign(py);
        }
        const t = Math.min(Math.max(inside / depth, 0), 1);
        const pull = (1 - t) ** 1.5;
        const i = (y * w + x) * 4;
        data.data[i] = 128 - 127 * nx * pull;
        data.data[i + 1] = 128 - 127 * ny * pull;
        data.data[i + 2] = 128;
        data.data[i + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
    // toBlob encodes off the main thread, so a new map never stalls a frame
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(URL.createObjectURL(blob))));
  }

  // Maps are cached by size, so opening and closing swap ready images instead of drawing new ones
  const maps = new Map();
  const radius = () => parseFloat(getComputedStyle(glass).borderTopLeftRadius) || 0;
  function mapFor(w, h) {
    const key = `${w}x${h}`;
    if (!maps.has(key)) {
      if (maps.size >= 8) {
        const [oldKey, oldMap] = maps.entries().next().value;
        oldMap.then(URL.revokeObjectURL);
        maps.delete(oldKey);
      }
      maps.set(key, drawMap(w, h, Math.min(radius(), w / 2, h / 2)));
    }
    return maps.get(key);
  }
  let shown = '';
  function showMap(w, h) {
    if (!w || !h) return;
    const key = `${w}x${h}`;
    shown = key;
    mapFor(w, h).then((url) => {
      if (shown === key) image.setAttribute('href', url);
    });
  }
  // The size the pill settles at once open: 200px wider, with the menu below the bar
  const menuInner = glass.querySelector('.menu-inner');
  const openSize = () => [
    Math.round(Math.min(560, glass.parentElement.clientWidth - 32)),
    glass.querySelector('.pill-name-bar').offsetHeight + (menuInner?.scrollHeight || 0),
  ];
  const closedSize = () => [
    Math.round(Math.min(360, glass.parentElement.clientWidth - 32)),
    glass.querySelector('.pill-name-bar').offsetHeight,
  ];

  // The map has no fixed size, so it stretches over the pill while it animates; once the size settles,
  // the map for that size is shown (from the cache when it was drawn ahead)
  let redraw;
  showMap(glass.offsetWidth, glass.offsetHeight);
  new ResizeObserver(() => {
    clearTimeout(redraw);
    redraw = setTimeout(() => showMap(glass.offsetWidth, glass.offsetHeight), 120);
  }).observe(glass);
  // Draw the open map while the page is idle, so the first open is as smooth as the rest
  (window.requestIdleCallback || setTimeout)(() => mapFor(...openSize()));
  // Opening the menu eases into the open glass and closing eases back, in step with the pill
  let openness = 0;
  let goal = 0; // where the tween is heading; a quick reopen or close must turn it round mid-way
  let tween;
  setOpenness(openness);
  new MutationObserver(() => {
    const target = glass.classList.contains('is-open') ? 1 : 0;
    if (target === goal) return;
    goal = target;
    // Switch to the target map as the motion starts, while it is fast, so nothing pops once it settles
    showMap(...(target ? openSize() : closedSize()));
    cancelAnimationFrame(tween);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpenness((openness = target));
      return;
    }
    const from = openness;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 400, 1);
      openness = from + (target - from) * (1 - (1 - t) ** 3);
      setOpenness(openness);
      if (t < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }).observe(glass, { attributes: true, attributeFilter: ['class'] });

  glass.classList.add('is-liquid');
}
