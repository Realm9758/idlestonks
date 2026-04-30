import type { Asset } from '../core/Asset.ts';
import {
  formatCurrency,
  getInsightText, getStockTags, getRecommendedPlay,
  getOpportunityScore, getTimingAdvice, getRiskWarning,
  getArchetypePlaybook, getConcreteVolatilityInfo,
} from './components.ts';

export function populateInsightPanel(asset: Asset): void {
  const g = (id: string) => document.getElementById(id)!;

  g('ip-emoji').textContent = asset.emoji;
  g('ip-name').textContent  = asset.name;
  g('ip-price').textContent = formatCurrency(asset.price);

  const tags = getStockTags(asset);
  g('ip-tags').innerHTML = tags.length
    ? tags.map(t => `<span class="asset-tag ${t.cls}">${t.label}</span>`).join('')
    : '<span class="ip-no-tags">no signals</span>';

  const play = getRecommendedPlay(asset);
  const playEl = g('ip-play');
  playEl.textContent = play.action;
  playEl.className   = `ip-play ${play.cls}`;
  g('ip-play-sub').textContent = play.sub;

  const hL = asset.getHypeLabel(), mL = asset.getMomentumLabel(),
        sL = asset.getStabilityLabel(), rL = asset.getRiskLabel();
  const hb = g('ip-hype-badge'); hb.textContent = `${hL.icon} Hype: ${hL.text}`; hb.className = `stat-badge ${hL.cls}`;
  const mb = g('ip-mom-badge');  mb.textContent = `${mL.icon} ${mL.text}`;        mb.className = `stat-badge ${mL.cls}`;
  const sb = g('ip-stab-badge'); sb.textContent = `${sL.icon} ${sL.text}`;        sb.className = `stat-badge ${sL.cls}`;
  const rb = g('ip-risk-badge'); rb.textContent = `${rL.icon} Risk: ${rL.text}`;  rb.className = `stat-badge ${rL.cls}`;

  g('ip-analysis').textContent = getInsightText(asset);

  const score = getOpportunityScore(asset);
  g('ip-score').innerHTML =
    Array.from({ length: 5 }, (_, i) =>
      `<span class="ip-star${i < score ? ' ip-star-on' : ''}">${i < score ? '★' : '☆'}</span>`,
    ).join('') + `<span class="ip-score-num">${score}/5</span>`;

  const timing = getTimingAdvice(asset);
  const timingEl = g('ip-timing');
  timingEl.textContent = timing.text;
  timingEl.className   = `ip-timing ${timing.cls}`;

  g('ip-playbook').textContent  = getArchetypePlaybook(asset);
  g('ip-vol-profile').textContent = getConcreteVolatilityInfo(asset);

  const warn = getRiskWarning(asset);
  const warnRow = g('ip-risk-warn-row');
  if (warn) { warnRow.classList.remove('hidden'); g('ip-risk-warn').textContent = warn; }
  else        warnRow.classList.add('hidden');
}
