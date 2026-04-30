export function buildSparklineSvg(history: number[]): string {
  const pts = history.slice(-60);
  if (pts.length < 2) return '';
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || min * 0.01 || 1;
  const W = 96; const H = 28;
  const points = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - ((p - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isUp = pts[pts.length - 1] >= pts[0];
  const color = isUp ? '#3fb950' : '#f85149';
  const fillColor = isUp ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)';
  const lastX = ((pts.length - 1) / (pts.length - 1)) * W;
  const lastY = H - ((pts[pts.length - 1] - min) / range) * (H - 4) - 2;
  const fillPath = `M0,${H} ${pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - ((p - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' L')} L${lastX},${H} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;overflow:visible">
    <path d="${fillPath}" fill="${fillColor}" stroke="none"/>
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastX}" cy="${lastY}" r="2" fill="${color}"/>
  </svg>`;
}
