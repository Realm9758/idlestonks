export function buildSparklineSvg(history: number[], dayOpen?: number): string {
  const pts = history.slice(-60);
  if (pts.length < 2) return '';

  // Expand y-range to include the day-open reference if present, so the line
  // stays visible when price has run far above or below open.
  const dataMin = Math.min(...pts);
  const dataMax = Math.max(...pts);
  const min = dayOpen !== undefined ? Math.min(dataMin, dayOpen) : dataMin;
  const max = dayOpen !== undefined ? Math.max(dataMax, dayOpen) : dataMax;
  const range = max - min || min * 0.01 || 1;

  const W = 110; const H = 40;
  const pad = 3;
  const yOf = (p: number) => H - pad - ((p - min) / range) * (H - pad * 2);

  const points = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W;
    return `${x.toFixed(1)},${yOf(p).toFixed(1)}`;
  }).join(' ');

  const last = pts[pts.length - 1];
  const reference = dayOpen ?? pts[0];
  const isUp = last >= reference;
  const color = isUp ? '#3fb950' : '#f85149';
  const fillColor = isUp ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)';
  const lastX = W;
  const lastY = yOf(last);

  const fillPath = `M0,${H} ${pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W;
    return `${x.toFixed(1)},${yOf(p).toFixed(1)}`;
  }).join(' L')} L${lastX},${H} Z`;

  let openLine = '';
  if (dayOpen !== undefined && dayOpen > 0) {
    const oy = yOf(dayOpen).toFixed(1);
    openLine = `
      <line x1="0" y1="${oy}" x2="${W}" y2="${oy}"
            stroke="rgba(255,255,255,0.28)" stroke-width="1"
            stroke-dasharray="2 2" />
      <text x="${W - 1}" y="${(parseFloat(oy) - 2).toFixed(1)}"
            fill="rgba(255,255,255,0.4)" font-size="6" font-family="Inter, system-ui"
            text-anchor="end">open</text>
    `;
  }

  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;overflow:visible">
    <path d="${fillPath}" fill="${fillColor}" stroke="none"/>
    ${openLine}
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastX}" cy="${lastY}" r="2.5" fill="${color}"/>
  </svg>`;
}
