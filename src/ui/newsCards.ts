import type { NewsItem } from '../core/NewsSystem.ts';
import { createEl } from './components.ts';
import { NEWS_TYPE_INFO } from './renderConstants.ts';

export function newsImpactLine(item: NewsItem): string {
  const sDir = item.successMult >= 1
    ? `+${((item.successMult - 1) * 100).toFixed(0)}%`
    : `-${((1 - item.successMult) * 100).toFixed(0)}%`;
  const fDir = item.failMult >= 1
    ? `+${((item.failMult - 1) * 100).toFixed(0)}%`
    : `-${((1 - item.failMult) * 100).toFixed(0)}%`;
  const sCls = item.successMult >= 1 ? 'impact-bull' : 'impact-bear';
  const fCls = item.failMult   >= 1 ? 'impact-bull' : 'impact-bear';
  return `<div class="news-impact-row"><span class="news-impact-outcome ${sCls}">✅ ${sDir}</span><span class="news-impact-sep">·</span><span class="news-impact-outcome ${fCls}">❌ ${fDir}</span></div>`;
}

export function buildNewsCard(
  item: NewsItem,
  day: number,
  secondsInDay: number,
  secondsPerDay: number,
): HTMLElement {
  const typeInfo   = NEWS_TYPE_INFO[item.type] ?? { icon: '📰', label: 'NEWS', cls: 'nt-default' };
  const daysLeft   = item.triggerDay - day;
  const secsLeft   = Math.max(0, (daysLeft - 1) * secondsPerDay + (secondsPerDay - secondsInDay));
  const mm         = Math.floor(secsLeft / 60);
  const ss         = secsLeft % 60;
  const timeStr    = `${mm}:${ss.toString().padStart(2, '0')}`;
  const dayLabel   = daysLeft <= 1 ? 'today' : `${daysLeft} days`;
  const imminent   = daysLeft <= 1 && secsLeft <= 15;
  const urgent     = daysLeft <= 1 && !imminent;
  const warning    = daysLeft === 2;
  const urgencyCls = imminent ? 'news-imminent' : urgent ? 'news-urgent' : warning ? 'news-warning' : '';
  const successPct = Math.round(item.successChance * 100);

  const chainRow = item.chainInfo
    ? `<div class="news-chain-row">
         <span class="chain-badge">🔗 ${item.chainInfo.chainTitle}</span>
         <span class="chain-step-progress">${item.chainInfo.stepIndex + 1} / ${item.chainInfo.totalSteps}</span>
       </div>`
    : '';

  const el = createEl('div', `news-item news-enter ${urgencyCls}`);
  el.dataset.newsId = item.id;
  el.innerHTML = `
    ${chainRow}
    <div class="news-top-row">
      <span class="news-type-badge ${typeInfo.cls}">${typeInfo.icon} ${typeInfo.label}</span>
      <span class="news-headline">${item.headline}</span>
    </div>
    <div class="news-meta-row">
      <span class="news-target">${item.targetEmoji} ${item.targetName}</span>
      <span class="news-chance ${successPct >= 60 ? 'chance-high' : successPct >= 50 ? 'chance-med' : 'chance-low'}">${successPct}% success</span>
    </div>
    ${newsImpactLine(item)}
    <div class="news-countdown ${urgencyCls}" data-countdown>⏳ ${dayLabel} (${timeStr})</div>
  `;
  return el;
}

export function refreshNewsCountdown(
  el: HTMLElement,
  item: NewsItem,
  day: number,
  secondsInDay: number,
  secondsPerDay: number,
): void {
  const daysLeft   = item.triggerDay - day;
  const secsLeft   = Math.max(0, (daysLeft - 1) * secondsPerDay + (secondsPerDay - secondsInDay));
  const mm         = Math.floor(secsLeft / 60);
  const ss         = secsLeft % 60;
  const timeStr    = `${mm}:${ss.toString().padStart(2, '0')}`;
  const dayLabel   = daysLeft <= 1 ? 'today' : `${daysLeft} days`;
  const imminent   = daysLeft <= 1 && secsLeft <= 15;
  const urgent     = daysLeft <= 1 && !imminent;
  const warning    = daysLeft === 2;
  const urgencyCls = imminent ? 'news-imminent' : urgent ? 'news-urgent' : warning ? 'news-warning' : '';

  const baseClass = `news-item ${urgencyCls}`;
  if (el.className !== baseClass) el.className = baseClass;
  el.dataset.newsId = item.id;

  const cdEl = el.querySelector<HTMLElement>('[data-countdown]');
  if (cdEl) {
    cdEl.textContent = `⏳ ${dayLabel} (${timeStr})`;
    cdEl.className = `news-countdown ${urgencyCls}`;
  }
}
