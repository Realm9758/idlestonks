import type { Asset } from '../core/Asset.ts';
import type { Market } from '../core/Market.ts';
import { createEl, formatCurrency, formatPct } from './components.ts';

export function buildIntelRow(asset: Asset, isLocked: boolean): HTMLElement {
  const hype = asset.getHypeLabel();
  const mom  = asset.getMomentumLabel();
  const stab = asset.getStabilityLabel();
  const risk = asset.getRiskLabel();

  const row = createEl('div', `intel-row${isLocked ? ' intel-locked' : ''}`);

  const priceText = isLocked
    ? `🔒 Unlocks at ${formatCurrency(asset.unlockThreshold)} NW`
    : `${formatCurrency(asset.price)} <span class="${asset.getPriceChangePct() >= 0 ? 'green' : 'red'}">${formatPct(asset.getPriceChangePct())}</span>`;

  let hint = '';
  if (!isLocked) {
    if (asset.hype > 0.6 && asset.momentum > 0.01) hint = '⚡ Momentum + Hype — high upside, watch for reversal';
    else if (asset.stability > 0.65)                hint = '🛡 Safe hold — good for stable growth strategy';
    else if (asset.risk > 0.7 && asset.hype > 0.4) hint = '🎲 Degen play — explosive but expect shocks';
    else if (asset.momentum < -0.01)                hint = '📉 Falling — wait for momentum to reverse before buying';
    else if (asset.hype > 0.5 && asset.momentum < 0) hint = '⚠️ Hype high, momentum falling — potential sell signal';
    else hint = '➡️ Neutral — monitor for signal changes';
  }

  row.innerHTML = `
    <div class="intel-asset-header">
      <span class="intel-emoji">${asset.emoji}</span>
      <div class="intel-asset-info">
        <div class="intel-asset-name">${asset.name}</div>
        <div class="intel-price">${priceText}</div>
      </div>
    </div>
    <div class="intel-stats">
      <span class="stat-badge ${hype.cls}"><span class="sl-label">HYPE</span> ${hype.icon} ${hype.text}</span>
      <span class="stat-badge ${mom.cls}"><span class="sl-label">MOM</span> ${mom.icon} ${mom.text}</span>
      <span class="stat-badge ${stab.cls}"><span class="sl-label">STAB</span> ${stab.icon} ${stab.text}</span>
      <span class="stat-badge ${risk.cls}"><span class="sl-label">RISK</span> ${risk.icon} ${risk.text}</span>
    </div>
    <div class="intel-desc">${isLocked ? asset.getTeaserSignal() : hint}</div>
  `;
  return row;
}

export function renderIntelContent(market: Market, content: HTMLElement): void {
  content.innerHTML = '';

  const unlocked = market.getAllAssets().filter(a => a.isUnlocked);
  const locked   = market.getAllAssets().filter(a => !a.isUnlocked);

  if (unlocked.length) {
    content.appendChild(createEl('div', 'intel-section-label', '🔓 Active Market'));
    for (const asset of unlocked) content.appendChild(buildIntelRow(asset, false));
  }
  if (locked.length) {
    content.appendChild(createEl('div', 'intel-section-label', '🔒 Locked Assets — Intel Preview'));
    for (const asset of locked) content.appendChild(buildIntelRow(asset, true));
  }

  const scanner = createEl('div', 'intel-scanner-line');
  content.prepend(scanner);

  const rows = Array.from(content.querySelectorAll<HTMLElement>('.intel-row'));
  rows.forEach(r => r.classList.add('scan-pending'));
  rows.forEach((row, i) => {
    setTimeout(() => {
      row.classList.remove('scan-pending');
      row.classList.add('scan-revealed');
    }, 120 + i * 95);
  });
  setTimeout(() => scanner.remove(), 1800);
}
