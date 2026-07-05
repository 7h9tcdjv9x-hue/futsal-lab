// ─── lineaSVG ─────────────────────────────────────────────────────────────────
// Returns an SVG string.
// punti: [{x: iso-date-or-number, y: number}]
// banda: {daY, aYmin, aYmax} - a translucent polygon showing target band
// All values are app-generated numbers — template literals are safe here.
export function lineaSVG({ punti, banda, larg = 320, alt = 150, unita = '' }) {
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

  // 3 gridline orizzontali hairline
  for (let i = 0; i < 3; i++) {
    const fraction = (i + 1) / 4;
    const gridY = PAD.top + fraction * H;
    svgContent += `<line x1="${PAD.left}" y1="${gridY}" x2="${larg - PAD.right}" y2="${gridY}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  }

  // Banda obiettivo (invariata: #27500A opacity .55)
  if (banda) {
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

  // Area fill: polygon chiuso sul fondo, PRIMA della polilinea
  const polyPoints = punti.map((p, i) => `${cx(xRaw[i])},${cy(p.y)}`).join(' ');
  const firstX = cx(xRaw[0]);
  const lastX = cx(xRaw[xRaw.length - 1]);
  const bottomY = PAD.top + H;
  const areaPoints = `${firstX},${bottomY} ${polyPoints} ${lastX},${bottomY}`;
  svgContent += `<polygon points="${areaPoints}" fill="#A8D65C" opacity="0.10"/>`;

  // Polilinea lime 2px classe grafico-linea con stroke-dasharray per animazione CSS
  svgContent += `<polyline class="grafico-linea" points="${polyPoints}" fill="none" stroke="#A8D65C" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="1000" pathLength="1000"/>`;

  // Punti: intermedi r 2.5, ultimo punto r 3.5 pieno + anello esterno r 6
  for (let i = 0; i < punti.length; i++) {
    const px = cx(xRaw[i]);
    const py = cy(punti[i].y);
    if (i === punti.length - 1) {
      // Anello esterno (disegnato prima per essere sotto)
      svgContent += `<circle cx="${px}" cy="${py}" r="6" fill="none" stroke="#0A0C0A" stroke-width="2"/>`;
      // Punto pieno lime r 3.5
      svgContent += `<circle cx="${px}" cy="${py}" r="3.5" fill="#A8D65C"/>`;
    } else {
      svgContent += `<circle cx="${px}" cy="${py}" r="2.5" fill="#A8D65C"/>`;
    }
  }

  // Etichette min/max y — font-size 11, fill #6E736C, tabular-nums
  const yMinLabel = yMin.toFixed(1) + (unita ? ' ' + unita : '');
  const yMaxLabel = yMax.toFixed(1) + (unita ? ' ' + unita : '');
  svgContent += `<text x="${PAD.left}" y="${alt - 4}" font-size="11" fill="#6E736C" style="font-variant-numeric:tabular-nums">${yMinLabel}</text>`;
  svgContent += `<text x="${PAD.left}" y="${PAD.top - 3}" font-size="11" fill="#6E736C" style="font-variant-numeric:tabular-nums">${yMaxLabel}</text>`;

  return `<svg viewBox="0 0 ${larg} ${alt}" xmlns="http://www.w3.org/2000/svg" style="width:100%;overflow:visible">${svgContent}</svg>`;
}
