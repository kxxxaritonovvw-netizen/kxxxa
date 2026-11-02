// Liquid glass on the name pill, after the Figma Glass effect (refraction 1, depth 40, dispersion 0.29, frost 4).
// Only Chromium can run an SVG filter as a backdrop-filter; other browsers keep the plain blur from styles.css.
const glass = document.querySelector('.pill-name');
const isChromium = navigator.userAgentData?.brands.some((b) => b.brand === 'Chromium');

if (glass && isChromium) {
  const DEPTH = 40; // px from the edge over which the glass bends the backdrop
  const STRENGTH = 26; // px the backdrop is pulled in at the very edge (refraction 1)
  const DISPERSION = 0.29; // red and blue bend a little more and less than green
  const FROST = 2; // blur stdDeviation, Figma frost 4

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `
    <filter id="liquid-glass" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feImage result="map" preserveAspectRatio="none" />
      ${['r', 'g', 'b'].map((channel, i) => `
        <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G"
          scale="${STRENGTH * (1 + DISPERSION * (1 - i))}" result="d-${channel}" />
        <feColorMatrix in="d-${channel}" type="matrix" result="c-${channel}"
          values="${[0, 1, 2].map((row) => [0, 1, 2, 3, 4].map((col) => +(row === i && col === i)).join(' ')).join(' ')} 0 0 0 1 0" />`).join('')}
      <feComposite in="c-r" in2="c-g" operator="arithmetic" k2="1" k3="1" result="rg" />
      <feComposite in="rg" in2="c-b" operator="arithmetic" k2="1" k3="1" result="rgb" />
      <feGaussianBlur in="rgb" stdDeviation="${FROST}" />
    </filter>`;
  document.body.append(svg);
  const image = svg.querySelector('feImage');
  const canvas = document.createElement('canvas');

  // Displacement map: red/green hold the x/y offset, sampling the backdrop from further in near the rim
  function drawMap() {
    const w = glass.offsetWidth;
    const h = glass.offsetHeight;
    if (!w || !h) return;
    const r = Math.min(parseFloat(getComputedStyle(glass).borderTopLeftRadius) || 0, w / 2, h / 2);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const data = ctx.createImageData(w, h);
    const hx = w / 2 - r;
    const hy = h / 2 - r;
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
        const t = Math.min(Math.max(inside / DEPTH, 0), 1);
        const pull = (1 - t) ** 2;
        const i = (y * w + x) * 4;
        data.data[i] = 128 - 127 * nx * pull;
        data.data[i + 1] = 128 - 127 * ny * pull;
        data.data[i + 2] = 128;
        data.data[i + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
    image.setAttribute('width', w);
    image.setAttribute('height', h);
    image.setAttribute('href', canvas.toDataURL());
  }

  drawMap();
  new ResizeObserver(drawMap).observe(glass);
  glass.classList.add('is-liquid');
}
