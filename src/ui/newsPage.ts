import type { NewsSystem, NewsItem } from '../core/NewsSystem.ts';
import { createEl } from './components.ts';
import { NEWS_TYPE_INFO } from './renderConstants.ts';

export function buildDetailedCard(
  item: NewsItem,
  currentDay: number,
  currentSecInDay: number,
  currentSecPerDay: number,
): HTMLElement {
  const ti  = NEWS_TYPE_INFO[item.type] ?? { icon: '📰', label: 'NEWS', cls: 'nt-default' };
  const pct = Math.round(item.successChance * 100);

  let statusCls = 'np-status-active', statusTxt = '⏳ UPCOMING';
  if (!item.resolved) {
    const dl = item.triggerDay - currentDay;
    const sl = Math.max(0, (dl - 1) * currentSecPerDay + (currentSecPerDay - currentSecInDay));
    if (dl <= 1 && sl <= 15)  { statusCls = 'np-status-imminent'; statusTxt = '🔴 IMMINENT'; }
    else if (dl <= 1)          { statusCls = 'np-status-urgent';   statusTxt = '⚠️ URGENT'; }
  } else {
    statusCls = item.resolvedSuccess ? 'np-status-success' : 'np-status-fail';
    statusTxt = item.resolvedSuccess ? '✅ SUCCESS' : '❌ FAILED';
  }

  let cardCls = 'np-card';
  if (!item.resolved) {
    const dl = item.triggerDay - currentDay;
    const sl = Math.max(0, (dl - 1) * currentSecPerDay + (currentSecPerDay - currentSecInDay));
    cardCls += dl <= 1 && sl <= 15 ? ' np-card-imminent' : dl <= 1 ? ' np-card-urgent' : ' np-card-active';
    if (item.chainInfo) cardCls += ' np-card-chain';
  } else {
    cardCls += item.resolvedSuccess ? ' np-card-success' : ' np-card-fail';
  }

  let chainStrip = '';
  if (item.chainInfo) {
    const ci   = item.chainInfo;
    const dots = Array.from({ length: ci.totalSteps }, (_, i) => {
      if (i < ci.stepIndex)   return '<span class="np-step np-step-done">●</span>';
      if (i === ci.stepIndex) {
        const r = item.resolved ? (item.resolvedSuccess ? 'np-step-ok' : 'np-step-bad') : '';
        const c = item.resolved ? (item.resolvedSuccess ? '✓' : '✗') : '●';
        return `<span class="np-step np-step-cur ${r}">${c}</span>`;
      }
      return '<span class="np-step np-step-future">○</span>';
    }).join('');
    chainStrip = `<div class="np-chain-strip"><span class="chain-badge">🔗 ${ci.chainTitle}</span><div class="np-chain-dots">${dots}</div><span class="chain-step-progress">Step ${ci.stepIndex + 1}/${ci.totalSteps}</span></div>`;
  }

  let cdHtml = '';
  if (!item.resolved) {
    const dl = item.triggerDay - currentDay;
    const sl = Math.max(0, (dl - 1) * currentSecPerDay + (currentSecPerDay - currentSecInDay));
    const mm = Math.floor(sl / 60), ss = sl % 60;
    const lab = dl <= 1 ? 'today' : `${dl} days`;
    cdHtml = `<span class="np-dot">·</span><span class="np-card-countdown" data-countdown data-trigger-day="${item.triggerDay}">⏳ ${lab} (${mm}:${ss.toString().padStart(2, '0')})</span>`;
  }

  const sMult = item.successMult, fMult = item.failMult;
  const sDir  = sMult >= 1 ? `+${((sMult - 1) * 100).toFixed(0)}%` : `-${((1 - sMult) * 100).toFixed(0)}%`;
  const fDir  = fMult >= 1 ? `+${((fMult - 1) * 100).toFixed(0)}%` : `-${((1 - fMult) * 100).toFixed(0)}%`;
  const sCls  = sMult >= 1 ? 'np-outcome-bull' : 'np-outcome-bear';
  const fCls  = fMult >= 1 ? 'np-outcome-bull' : 'np-outcome-bear';
  const resolvedHtml = item.resolvedMessage
    ? `<div class="np-resolved-msg">${item.resolvedMessage}</div>` : '';

  const el = document.createElement('article');
  el.className = cardCls;
  el.dataset.npId = item.id;
  el.innerHTML = `
    ${chainStrip}
    <div class="np-card-top">
      <div class="np-card-badges">
        <span class="news-type-badge ${ti.cls}">${ti.icon} ${ti.label}</span>
        <span class="np-day-tag">Day ${item.createdDay + 1}</span>
      </div>
      <span class="np-card-status ${statusCls}">${statusTxt}</span>
    </div>
    <div class="np-card-headline">${item.headline}</div>
    <div class="np-card-info">
      <span class="np-card-stock">${item.targetEmoji} ${item.targetName}</span>
      ${!item.resolved ? `<span class="np-dot">·</span><span class="np-card-chance ${pct >= 60 ? 'chance-high' : pct >= 50 ? 'chance-med' : 'chance-low'}">${pct}% success</span>` : ''}
      ${cdHtml}
    </div>
    <button class="np-expand-btn" data-expand-id="${item.id}">▼ Details</button>
    <div class="np-card-body hidden" id="npbody-${item.id}">
      <div class="np-outcomes">
        <div class="np-outcome ${sCls}">✅ Success: ${sDir} price shock</div>
        <div class="np-outcome ${fCls}">❌ Fail: ${fDir} price shock</div>
      </div>
      ${resolvedHtml}
    </div>
  `;
  return el;
}

export function refreshNewsPageCountdowns(
  currentDay: number,
  currentSecInDay: number,
  currentSecPerDay: number,
): void {
  const els = document.querySelectorAll<HTMLElement>('#np-feed [data-countdown]');
  for (const el of els) {
    const trigDay = parseInt(el.dataset.triggerDay ?? '0', 10);
    const dl = trigDay - currentDay;
    const sl = Math.max(0, (dl - 1) * currentSecPerDay + (currentSecPerDay - currentSecInDay));
    const mm = Math.floor(sl / 60), ss = sl % 60;
    const lab = dl <= 1 ? 'today' : `${dl} days`;
    el.textContent = `⏳ ${lab} (${mm}:${ss.toString().padStart(2, '0')})`;
  }
}

export function renderNewsPage(
  newsSystem: NewsSystem,
  feed: HTMLElement,
  filter: 'all' | 'active' | 'chains' | 'resolved',
  currentDay: number,
  currentSecInDay: number,
  currentSecPerDay: number,
  newsExpandedIds: Set<string>,
): void {
  let all = newsSystem.getAll();
  if (filter === 'active')   all = all.filter(n => !n.resolved);
  if (filter === 'chains')   all = all.filter(n => !!n.chainInfo);
  if (filter === 'resolved') all = all.filter(n => n.resolved);

  const active   = all.filter(n => !n.resolved).sort((a, b) => a.triggerDay - b.triggerDay);
  const resolved = all.filter(n => n.resolved).reverse();

  if (active.length === 0 && resolved.length === 0) {
    feed.innerHTML = '<p class="empty-msg">Nothing to show. Trade more to generate news!</p>';
    return;
  }

  feed.innerHTML = '';

  if (filter === 'chains' && active.length > 0) {
    const groups = new Map<string, NewsItem[]>();
    for (const item of [...active, ...resolved]) {
      const cid = item.chainInfo!.chainId;
      if (!groups.has(cid)) groups.set(cid, []);
      groups.get(cid)!.push(item);
    }
    for (const chainItems of groups.values()) {
      const sorted = [...chainItems].sort((a, b) => a.chainInfo!.stepIndex - b.chainInfo!.stepIndex);
      const ci = sorted[0].chainInfo!;
      const hdr = createEl('div', 'np-chain-group-hdr');
      hdr.innerHTML = `<span class="chain-badge">🔗 ${ci.chainTitle}</span><span class="np-chain-count">${chainItems.length} step(s)</span>`;
      feed.appendChild(hdr);
      for (const item of sorted) feed.appendChild(buildDetailedCard(item, currentDay, currentSecInDay, currentSecPerDay));
    }
    return;
  }

  if (active.length > 0) {
    feed.appendChild(createEl('div', 'np-section-label', `⏳ Upcoming — ${active.length} active`));
    for (const item of active) feed.appendChild(buildDetailedCard(item, currentDay, currentSecInDay, currentSecPerDay));
  }
  if (resolved.length > 0) {
    feed.appendChild(createEl('div', 'np-section-label', `📁 Archive — ${resolved.length} resolved`));
    for (const item of resolved) feed.appendChild(buildDetailedCard(item, currentDay, currentSecInDay, currentSecPerDay));
  }

  for (const id of newsExpandedIds) {
    const body = document.getElementById(`npbody-${id}`);
    if (!body) continue;
    body.classList.remove('hidden');
    const btn = feed.querySelector<HTMLElement>(`[data-expand-id="${id}"]`);
    if (btn) btn.textContent = '▲ Hide';
  }
}
