// ─── lineaSVG ─────────────────────────────────────────────────────────────────
// Returns an SVG string.
// punti: [{x: iso-date-or-number, y: number}]
// banda: {daY, aYmin, aYmax} - a translucent polygon showing target band
// All values are app-generated numbers — template literals are safe here.
export function lineaSVG({ punti, banda, larg = 320, alt = 140, unita = '' }) {
  if (!punti || punti.length === 0) {
    return `<svg viewBox="0 0 ${larg} ${alt}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }

  const PAD = { top: 16, bottom: 24, left: 8, right: 8 };
  const W = larg - PAD.left - PAD.right;
  const H = alt - PAD.top - PAD.bottom;

  // Map x values to numbers
  const xRaw = punti.map(p => {
    if (typeof p.x === 'number') return p.x;
    return new Date(p.x + 'T12:00:00').getTime();
  });
  const xMin = Math.min(...xRaw);
  const xMax = Math.max(...xRaw);
  const xSpan = xMax - xMin || 1;

  const ys = punti.map(p => p.y);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (banda) {
    yMin = Math.min(yMin, banda.aYmin);
    yMax = Math.max(yMax, banda.daY, banda.aYmax);
  }
  const ySpan = yMax - yMin || 1;

  function cx(xi) { return PAD.left + ((xi - xMin) / xSpan) * W; }
  function cy(y) { return PAD.top + ((yMax - y) / ySpan) * H; }

  let svgContent = '';

  // Banda (translucent polygon fill #27500A)
  if (banda) {
    // polygon from left anchor to right, tracing aYmin then aYmax back
    // banda.daY = anchor y (left side), banda.aYmin/aYmax = target range (right side)
    const x0 = xRaw[0];
    const xN = xRaw[xRaw.length - 1];
    const points = [
      `${cx(x0)},${cy(banda.daY)}`,
      `${cx(xN)},${cy(banda.aYmin)}`,
      `${cx(xN)},${cy(banda.aYmax)}`,
      `${cx(x0)},${cy(banda.daY)}`,
    ].join(' ');
    svgContent += `<polygon points="${points}" fill="#27500A" opacity="0.55"/>`;
  }

  // Polyline
  const polyPoints = punti.map((p, i) => `${cx(xRaw[i])},${cy(p.y)}`).join(' ');
  svgContent += `<polyline points="${polyPoints}" fill="none" stroke="#97C459" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;

  // Dots
  for (let i = 0; i < punti.length; i++) {
    svgContent += `<circle cx="${cx(xRaw[i])}" cy="${cy(punti[i].y)}" r="3" fill="#97C459"/>`;
  }

  // Min/Max y labels
  const yMinLabel = yMin.toFixed(1) + (unita ? ' ' + unita : '');
  const yMaxLabel = yMax.toFixed(1) + (unita ? ' ' + unita : '');
  svgContent += `<text x="${PAD.left}" y="${alt - 4}" font-size="11" fill="#888780">${yMinLabel}</text>`;
  svgContent += `<text x="${PAD.left}" y="${PAD.top - 3}" font-size="11" fill="#888780">${yMaxLabel}</text>`;

  return `<svg viewBox="0 0 ${larg} ${alt}" xmlns="http://www.w3.org/2000/svg" style="width:100%;overflow:visible">${svgContent}</svg>`;
}
