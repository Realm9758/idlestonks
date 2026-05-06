import type { Market } from '../core/Market.ts';
import type { Player } from '../core/Player.ts';
import type { EventSystem, EventLogEntry } from '../core/EventSystem.ts';
import type { NewsSystem } from '../core/NewsSystem.ts';
import type { UpgradeSystem } from '../systems/UpgradeSystem.ts';
import type { RankSystem } from '../systems/RankSystem.ts';
import type { InvestorSystem } from '../systems/InvestorSystem.ts';
import type { Asset } from '../core/Asset.ts';
import {
  formatCurrency, formatPct, timeAgo, createEl,
  getDecisionSignal, getStableDecisionSignal, getStockTags, getStorySentence, getTimingWindow, getTopOpportunities,
  SECTORS, SECTOR_ORDER, SECTOR_MAP,
} from './components.ts';
import type { SignalHysteresisEntry } from './components.ts';
import { flashPrice, sweepRow, spawnCashDelta } from './animations.ts';
import { buildAssetRow, type AssetRowCallbacks, type AssetRowMutableState } from './assetRow.ts';
import { buildSparklineSvg } from './sparkline.ts';
import { buildNewsCard, refreshNewsCountdown } from './newsCards.ts';
import { renderNewsPage, refreshNewsPageCountdowns } from './newsPage.ts';
import { updateUpgradesTab, type UpgradesPanelState } from './upgradesPanel.ts';

// ── Shared state shapes ────────────────────────────────────────────────────────

export interface MarketPanelState {
  lastUnlockedCount: number;
  lastPrices: Map<string, number>;
  assetRowCallbacks: AssetRowCallbacks;
  assetRowMutableState: AssetRowMutableState;
  storedPlayer: Player | null;
  signalHistory: Map<string, SignalHysteresisEntry>;
}

export interface NewsPanelState {
  newsActiveKey: string;
  newsPageOpen: boolean;
  newsPageKey: string;
  newsPageFilter: 'all' | 'active' | 'chains' | 'resolved';
  newsExpandedIds: Set<string>;
}

// ── Header ─────────────────────────────────────────────────────────────────────

export function updateHeader(
  player: Player,
  market: Market,
  upgradeSystem: UpgradeSystem,
  day: number,
  rankSystem: RankSystem | null,
  lastCash: { value: number },
): void {
  document.getElementById('stat-day')!.textContent = String(day + 1);
  const cashEl = document.getElementById('stat-cash')!;
  const newCash = player.cash;
  if (lastCash.value >= 0) {
    const delta = newCash - lastCash.value;
    if (Math.abs(delta) >= 10) spawnCashDelta(cashEl, delta);
  }
  lastCash.value = newCash;
  cashEl.textContent = formatCurrency(player.cash);
  cashEl.className = 'stat-value ' + (player.cash > 2000 ? 'green' : player.cash < 200 ? 'red' : '');
  document.getElementById('stat-networth')!.textContent = formatCurrency(player.getNetWorth(market));
  document.getElementById('stat-portfolio')!.textContent = formatCurrency(player.getPortfolioValue(market));
  if (upgradeSystem.prestigeCount > 0) {
    document.getElementById('prestige-block')!.classList.remove('hidden');
    document.getElementById('stat-multiplier')!.textContent = `×${upgradeSystem.getEarningsMultiplier()}`;
  }
  if (rankSystem) {
    const nw = player.getNetWorth(market);
    const rank = rankSystem.getDisplayRank(nw);
    const { pct, nextRank } = rankSystem.getProgress(nw);
    document.getElementById('stat-rank')!.textContent = `${rank.emoji} ${rank.name}`;
    (document.getElementById('rank-progress-fill') as HTMLElement).style.width = `${pct.toFixed(1)}%`;
    document.getElementById('rank-next-name')!.textContent =
      nextRank ? `→ ${nextRank.name}` : '🏆 MAX';
    const unlock = rankSystem.getNextFeatureUnlock(nw);
    const hintEl = document.getElementById('rank-unlock-hint')!;
    hintEl.textContent = unlock
      ? `🔓 ${unlock.label} at ${unlock.atRank.emoji} ${unlock.atRank.name}`
      : '';
  }
}

// ── Market panel ───────────────────────────────────────────────────────────────

export function updateMarket(
  market: Market,
  player: Player,
  upgradeSystem: UpgradeSystem,
  day: number,
  newsSystem: NewsSystem | null,
  state: MarketPanelState,
): void {
  const container = document.getElementById('asset-list')!;
  const unlocked = market.getUnlockedAssets();
  const countEl = document.getElementById('market-asset-count');
  if (countEl) {
    const owned = unlocked.filter(a => a.owned > 0).length;
    countEl.textContent = `${unlocked.length} assets · ${owned} owned`;
  }

  if (unlocked.length !== state.lastUnlockedCount) {
    state.lastUnlockedCount = unlocked.length;
    container.innerHTML = '';
    for (const sectorId of SECTOR_ORDER) {
      const sectorAssets = unlocked.filter(a => SECTOR_MAP[a.id] === sectorId);
      if (sectorAssets.length === 0) continue;
      const def = SECTORS.find(s => s.id === sectorId)!;
      const hdr = createEl('div', 'sector-header');
      hdr.innerHTML = `<span class="sector-emoji">${def.emoji}</span><span class="sector-label">${def.label}</span><span class="sector-desc">${def.description}</span>`;
      container.appendChild(hdr);
      for (const asset of sectorAssets) container.appendChild(buildAssetRow(asset, state.assetRowCallbacks, state.assetRowMutableState, state.storedPlayer));
    }
    const mapped = new Set(SECTOR_ORDER.flatMap(sid => unlocked.filter(a => SECTOR_MAP[a.id] === sid).map(a => a.id)));
    for (const asset of unlocked.filter(a => !mapped.has(a.id))) container.appendChild(buildAssetRow(asset, state.assetRowCallbacks, state.assetRowMutableState, state.storedPlayer));
  }

  const activeNews = newsSystem?.getActive() ?? [];

  for (const asset of unlocked) {
    const row = container.querySelector(`[data-id="${asset.id}"]`) as HTMLElement | null;
    if (!row) continue;

    const priceEl = row.querySelector('.asset-price') as HTMLElement;
    const prev = state.lastPrices.get(asset.id) ?? asset.price;
    const delta = (asset.price - prev) / prev;
    if (Math.abs(delta) > 0.001) {
      flashPrice(priceEl, delta > 0 ? 'up' : 'down');
      if (Math.abs(delta) > 0.01) sweepRow(row, delta > 0 ? 'up' : 'down');
      state.lastPrices.set(asset.id, asset.price);
    }
    priceEl.textContent = formatCurrency(asset.price);

    const sparkEl = row.querySelector<HTMLElement>('.asset-sparkline');
    if (sparkEl) sparkEl.innerHTML = buildSparklineSvg(asset.priceHistory, asset.dayOpenPrice);

    const pct = asset.getPriceChangePct();
    const changeEl = row.querySelector('.asset-change') as HTMLElement;
    changeEl.textContent = formatPct(pct);
    changeEl.className = 'asset-change ' + (pct >= 0 ? 'green' : 'red');

    const ds       = getStableDecisionSignal(asset, activeNews, state.signalHistory);
    const pillEl   = row.querySelector<HTMLElement>('.asset-decision-pill');
    const signalEl = row.querySelector<HTMLElement>('.adp-signal');
    const reasonEl = row.querySelector<HTMLElement>('.adp-reason');
    if (pillEl && signalEl && reasonEl && pillEl.dataset.sig !== ds.cls) {
      pillEl.dataset.sig   = ds.cls;
      pillEl.className     = `asset-decision-pill ${ds.cls}`;
      signalEl.textContent = ds.signal;
      reasonEl.textContent = ds.reason;
    }

    const hypeBarFill  = row.querySelector<HTMLElement>('.hype-bar-fill');
    const hypeBarLabel = row.querySelector<HTMLElement>('.hype-bar-label');
    if (hypeBarFill && hypeBarLabel) {
      const hypePct = Math.min(100, Math.round(asset.hype * 100));
      hypeBarFill.style.width = `${hypePct}%`;
      const fillCls = asset.hype > 0.75 ? 'hype-fill-viral'
                    : asset.hype > 0.45 ? 'hype-fill-high'
                    : asset.hype > 0.20 ? 'hype-fill-med'
                    : 'hype-fill-cold';
      hypeBarFill.className = `hype-bar-fill ${fillCls}`;
      hypeBarLabel.textContent = `HYPE ${hypePct}%`;
    }

    const timingEl = row.querySelector<HTMLElement>('.asset-timing');
    if (timingEl) {
      const tw = getTimingWindow(asset);
      if (timingEl.dataset.tw !== tw.cls) {
        timingEl.dataset.tw = tw.cls;
        timingEl.textContent = tw.text;
        timingEl.className = `asset-timing ${tw.cls}`;
      }
    }

    const tagsEl = row.querySelector('.asset-tags') as HTMLElement | null;
    if (tagsEl) {
      const newHtml = getStockTags(asset).map(t => `<span class="asset-tag ${t.cls}">${t.label}</span>`).join('');
      if (tagsEl.innerHTML !== newHtml) tagsEl.innerHTML = newHtml;
    }

    const storyEl = row.querySelector<HTMLElement>('.asset-story');
    if (storyEl) {
      const story = getStorySentence(asset, activeNews, day);
      if (storyEl.textContent !== story) storyEl.textContent = story;
      const isNews    = story.includes('News resolves');
      const isHype    = story.startsWith('🔥');
      const isBad     = story.startsWith('☠️') || story.startsWith('💸') || story.startsWith('⚠️');
      const isSurging = story.startsWith('🚀');
      storyEl.className = 'asset-story' +
        (isNews    ? ' story-news'    : '') +
        (isHype    ? ' story-hype'    : '') +
        (isBad     ? ' story-bad'     : '') +
        (isSurging ? ' story-surge'   : '');
    }

    row.classList.toggle('risk-high', asset.risk > 0.68);
    row.classList.toggle('hype-high', asset.hype > 0.65);
    row.classList.toggle('mom-trending-up',   asset.momentum > 0.015);
    row.classList.toggle('mom-trending-down', asset.momentum < -0.015);

    const trendEl = row.querySelector('.asset-trend') as HTMLElement | null;
    if (trendEl) {
      if (upgradeSystem.getSignalIntelLevel() >= 1) {
        trendEl.classList.remove('hidden');
        const t = asset.trend + asset.trendBoost;
        trendEl.textContent = t > 0.003 ? '▲▲' : t > 0 ? '▲' : t < -0.003 ? '▼▼' : '▼';
        trendEl.className = 'asset-trend ' + (t >= 0 ? 'green' : 'red');
      } else {
        trendEl.classList.add('hidden');
      }
    }

    const maxBuy = Math.floor(player.cash / asset.price);
    const maxBtn = row.querySelector('.btn-max') as HTMLButtonElement;
    maxBtn.textContent = `Max (${maxBuy})`;
    maxBtn.disabled = maxBuy === 0;
    const sellAllBtn = row.querySelector('.btn-sell-all') as HTMLButtonElement;
    sellAllBtn.textContent = `All (${asset.owned})`;
    sellAllBtn.disabled = asset.owned === 0;

    const ownedEl = row.querySelector('.asset-owned') as HTMLElement;
    if (asset.owned > 0) {
      const positionValue = asset.price * asset.owned;
      const basis = state.storedPlayer?.costBasis[asset.id];
      if (basis && basis > 0) {
        const plDollar = (asset.price - basis) * asset.owned;
        const plPct    = ((asset.price - basis) / basis) * 100;
        const plPos    = plDollar >= 0;
        const sign     = plPos ? '+' : '−';
        const plCls    = plPos ? 'owned-pl-pos' : 'owned-pl-neg';
        const absDollar = Math.abs(plDollar);
        const dollarStr = absDollar >= 1000
          ? `$${(absDollar / 1000).toFixed(1)}k`
          : `$${absDollar.toFixed(absDollar < 10 ? 2 : 0)}`;
        ownedEl.innerHTML = `
          <span class="owned-shares">${asset.owned} sh</span>
          <span class="owned-sep">·</span>
          <span class="owned-value">${formatCurrency(positionValue)}</span>
          <span class="owned-pl ${plCls}" title="Unrealized profit/loss vs avg cost $${basis.toFixed(2)}">
            ${sign}${dollarStr} (${sign}${Math.abs(plPct).toFixed(1)}%)
          </span>
        `;
        ownedEl.classList.add('asset-owned-active');
        ownedEl.classList.toggle('asset-owned-pos', plPos);
        ownedEl.classList.toggle('asset-owned-neg', !plPos);
      } else {
        ownedEl.innerHTML = `
          <span class="owned-shares">${asset.owned} sh</span>
          <span class="owned-sep">·</span>
          <span class="owned-value">${formatCurrency(positionValue)}</span>
        `;
        ownedEl.classList.add('asset-owned-active');
        ownedEl.classList.remove('asset-owned-pos', 'asset-owned-neg');
      }
    } else {
      ownedEl.textContent = '';
      ownedEl.classList.remove('asset-owned-active', 'asset-owned-pos', 'asset-owned-neg');
    }

    const newsLine = row.querySelector<HTMLElement>('.asset-news-line');
    if (newsLine) {
      const allNews = activeNews.filter(n => n.targetAssetId === asset.id);
      const chainNews = allNews.filter(n => n.chainInfo);
      const displayNews = chainNews.length > 0 ? chainNews : allNews;
      if (displayNews.length > 0) {
        const n = displayNews[0];
        const daysLeft = n.triggerDay - day;
        const dayStr   = daysLeft <= 1 ? 'today' : `${daysLeft}d`;
        const sDir = n.successMult >= 1 ? `+${((n.successMult - 1) * 100).toFixed(0)}%` : `-${((1 - n.successMult) * 100).toFixed(0)}%`;
        const fDir = n.failMult   >= 1 ? `+${((n.failMult   - 1) * 100).toFixed(0)}%` : `-${((1 - n.failMult)   * 100).toFixed(0)}%`;
        const prefix = n.chainInfo
          ? `🔗 ${n.chainInfo.chainTitle} (${n.chainInfo.stepIndex + 1}/${n.chainInfo.totalSteps}): `
          : '📰 ';
        newsLine.textContent = `${prefix}Resolves ${dayStr} · ✅ ${sDir} · ❌ ${fDir}`;
        newsLine.classList.remove('hidden');
      } else {
        newsLine.classList.add('hidden');
      }
    }

    const orderList = row.querySelector<HTMLElement>(`[data-lo-list="${asset.id}"]`);
    if (orderList && state.storedPlayer) {
      const orders = state.storedPlayer.limitOrders.filter(o => o.assetId === asset.id);
      const key = orders.map(o => o.id).join('|');
      if (orderList.dataset.key !== key) {
        orderList.dataset.key = key;
        orderList.innerHTML = orders.length === 0 ? '' : orders.map(o => {
          const dir = o.type === 'buy' ? '≤' : '≥';
          const label = o.type === 'buy' ? 'BUY' : 'SELL';
          return `<div class="lo-order-row">
            <span class="lo-order-badge lo-${o.type}">${label}</span>
            <span class="lo-order-detail">${o.quantity}× if ${dir} $${o.triggerPrice.toFixed(2)}</span>
            <button class="lo-cancel" data-order-id="${o.id}">✕</button>
          </div>`;
        }).join('');
        orderList.addEventListener('click', (e) => {
          const btn = (e.target as HTMLElement).closest<HTMLElement>('.lo-cancel');
          if (btn?.dataset.orderId) state.assetRowCallbacks.onCancelLimitOrder(btn.dataset.orderId);
        });
      }
    }
  }

  updateOpportunityBar(market, newsSystem, state);
  updateHoldingsStrip(market, state);
}

function updateHoldingsStrip(market: Market, state: MarketPanelState): void {
  const strip = document.getElementById('holdings-strip');
  const cardsEl = document.getElementById('hs-cards');
  const summaryEl = document.getElementById('hs-summary');
  if (!strip || !cardsEl || !summaryEl) return;

  const owned = market.getUnlockedAssets().filter(a => a.owned > 0);
  if (owned.length === 0) { strip.classList.add('hidden'); return; }
  strip.classList.remove('hidden');

  const player = state.storedPlayer;
  type Row = { asset: Asset; plPct: number; plDollar: number; value: number; basis: number | null };
  const rows: Row[] = owned.map(a => {
    const basis = player?.costBasis[a.id] ?? null;
    const value = a.price * a.owned;
    const plDollar = basis ? (a.price - basis) * a.owned : 0;
    const plPct    = basis ? ((a.price - basis) / basis) * 100 : 0;
    return { asset: a, plPct, plDollar, value, basis };
  });
  rows.sort((x, y) => y.plPct - x.plPct);

  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const totalPl    = rows.reduce((s, r) => s + r.plDollar, 0);
  const plPos = totalPl >= 0;
  const plSign = plPos ? '+' : '−';
  const absTot = Math.abs(totalPl);
  const totStr = absTot >= 1000 ? `$${(absTot/1000).toFixed(1)}k` : `$${absTot.toFixed(absTot < 10 ? 2 : 0)}`;
  summaryEl.innerHTML = `<span class="hs-tot-value">${formatCurrency(totalValue)}</span> <span class="hs-tot-pl ${plPos ? 'hs-pos' : 'hs-neg'}">${plSign}${totStr}</span>`;

  const newHtml = rows.map(r => {
    const cls = r.basis ? (r.plPct >= 0 ? 'hs-pos' : 'hs-neg') : 'hs-neutral';
    const sign = r.plPct >= 0 ? '+' : '';
    const plLabel = r.basis ? `${sign}${r.plPct.toFixed(1)}%` : '—';
    return `<div class="hs-card" data-hs-asset="${r.asset.id}">
      <button class="hs-jump" data-hs-jump="${r.asset.id}" type="button" title="Jump to ${r.asset.name}">
        <span class="hs-emoji">${r.asset.emoji}</span>
        <span class="hs-name">${r.asset.name}</span>
        <span class="hs-qty">${r.asset.owned}×</span>
        <span class="hs-pl ${cls}">${plLabel}</span>
      </button>
      <button class="hs-sell" data-hs-sell="${r.asset.id}" type="button" title="Sell all ${r.asset.owned} ${r.asset.name}">Sell</button>
    </div>`;
  }).join('');

  if (cardsEl.dataset.key !== newHtml) {
    cardsEl.dataset.key = newHtml;
    cardsEl.innerHTML = newHtml;
    cardsEl.querySelectorAll<HTMLButtonElement>('[data-hs-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.hsJump!;
        const row = document.querySelector<HTMLElement>(`.asset-row[data-id="${id}"]`);
        if (!row) return;
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('opp-jump-pulse');
        setTimeout(() => row.classList.remove('opp-jump-pulse'), 1400);
      });
    });
    cardsEl.querySelectorAll<HTMLButtonElement>('[data-hs-sell]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.hsSell!;
        state.assetRowCallbacks.onSellAll(id);
      });
    });
  } else {
    cardsEl.querySelectorAll<HTMLElement>('.hs-pl').forEach(el => {
      const card = el.closest<HTMLElement>('.hs-card');
      const id = card?.dataset.hsAsset;
      const row = rows.find(r => r.asset.id === id);
      if (!row) return;
      const sign = row.plPct >= 0 ? '+' : '';
      el.textContent = row.basis ? `${sign}${row.plPct.toFixed(1)}%` : '—';
      el.className = `hs-pl ${row.basis ? (row.plPct >= 0 ? 'hs-pos' : 'hs-neg') : 'hs-neutral'}`;
    });
  }
}

function updateOpportunityBar(market: Market, newsSystem: NewsSystem | null, state: MarketPanelState): void {
  const bar = document.getElementById('market-opportunity-bar');
  const cardsEl = document.getElementById('opp-cards');
  if (!bar || !cardsEl) return;

  const unlocked   = market.getUnlockedAssets();
  const activeNews = newsSystem?.getActive() ?? [];
  const tops = getTopOpportunities(unlocked, activeNews, 2);

  if (tops.length === 0) { bar.classList.add('hidden'); return; }

  bar.classList.remove('hidden');
  const newHtml = tops.map(({ asset, reason }) => {
    const ds = getStableDecisionSignal(asset, activeNews, state.signalHistory);
    return `<button class="opp-card opp-card-btn" type="button" data-opp-asset="${asset.id}" title="Jump to ${asset.name}">
      <span class="opp-card-emoji">${asset.emoji}</span>
      <div class="opp-card-body">
        <span class="opp-card-name">${asset.name}</span>
        <span class="opp-card-reason">${reason}</span>
      </div>
      <span class="opp-card-signal ${ds.cls}">${ds.signal}</span>
      <span class="opp-card-jump">↗</span>
    </button>`;
  }).join('');

  if (cardsEl.innerHTML !== newHtml) {
    cardsEl.innerHTML = newHtml;
    cardsEl.querySelectorAll<HTMLButtonElement>('[data-opp-asset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.oppAsset!;
        const row = document.querySelector<HTMLElement>(`.asset-row[data-id="${id}"]`);
        if (!row) return;
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('opp-jump-pulse');
        setTimeout(() => row.classList.remove('opp-jump-pulse'), 1400);
      });
    });
  }
}

// ── Fear & Greed ───────────────────────────────────────────────────────────────

export function updateFearGreed(market: Market): void {
  const score = market.getFearGreedIndex();
  const fill  = document.getElementById('fg-fill');
  const zone  = document.getElementById('fg-zone');
  if (fill) fill.style.width = `${score}%`;
  if (zone) {
    let text: string; let cls: string;
    if      (score >= 80) { text = `EXTREME GREED · ${score}`; cls = 'fg-extreme-greed'; }
    else if (score >= 60) { text = `GREED · ${score}`;         cls = 'fg-greed'; }
    else if (score >= 40) { text = `NEUTRAL · ${score}`;       cls = 'fg-neutral'; }
    else if (score >= 20) { text = `FEAR · ${score}`;          cls = 'fg-fear'; }
    else                  { text = `EXTREME FEAR · ${score}`;  cls = 'fg-extreme-fear'; }
    zone.textContent = text;
    zone.className   = `fg-zone ${cls}`;
  }
}

// ── Streak badge ───────────────────────────────────────────────────────────────

export function updateStreak(player: Player): void {
  const block = document.getElementById('streak-block');
  const val   = document.getElementById('stat-streak');
  if (!block || !val) return;
  if (player.streak >= 1) {
    block.classList.remove('hidden');
    val.textContent = `${player.streak}×`;
    val.className   = player.hotHandActive ? 'stat-value streak-hot' : 'stat-value streak-val';
  } else {
    block.classList.add('hidden');
  }
}

// ── Portfolio ──────────────────────────────────────────────────────────────────

export function updatePortfolio(market: Market, player: Player | undefined): void {
  const container = document.getElementById('portfolio-list')!;
  const owned = market.getAllAssets().filter(a => a.owned > 0);
  const totalVal = owned.reduce((s, a) => s + a.getValue(), 0);
  document.getElementById('portfolio-total')!.textContent = formatCurrency(totalVal);

  // ── Bonuses strip ──────────────────────────────────────────────────────────
  let bonusStrip = document.getElementById('portfolio-bonuses-strip');
  if (!bonusStrip) {
    bonusStrip = createEl('div', 'bonuses-strip');
    bonusStrip.id = 'portfolio-bonuses-strip';
    const panelEl = document.getElementById('portfolio-panel');
    const listEl  = document.getElementById('portfolio-list');
    if (panelEl && listEl) panelEl.insertBefore(bonusStrip, listEl);
  }

  const divBonus    = player ? player.getDiversificationBonus(market) : 1;
  const streakBonus = player ? player.getStreakBonus() : 1;
  const earningsM   = player ? player.earningsMultiplier : 1;
  const chips: string[] = [];

  if (player && player.streak >= 3) {
    chips.push(`<span class="bonus-chip bonus-chip-streak">🔥 ${player.streak}× Streak · ×${streakBonus.toFixed(2)}</span>`);
  } else if (player && player.streak >= 1) {
    chips.push(`<span class="bonus-chip bonus-chip-streak">🔥 ${player.streak}× streak</span>`);
  }

  if (divBonus > 1) {
    chips.push(`<span class="bonus-chip bonus-chip-div">🌈 ×${divBonus.toFixed(2)} Div Bonus</span>`);
  } else if (owned.length < 3) {
    chips.push(`<span class="bonus-chip bonus-chip-hint">Hold ${3 - owned.length} more for div bonus</span>`);
  }

  if (earningsM > 1) {
    chips.push(`<span class="bonus-chip bonus-chip-multi">⭐ ×${earningsM} Prestige</span>`);
  }

  bonusStrip.innerHTML = chips.join('');
  bonusStrip.style.display = chips.length > 0 ? 'flex' : 'none';

  const divBonus2 = player ? player.getDiversificationBonus(market) : 1;
  let divEl = document.getElementById('portfolio-div-bonus');
  if (!divEl) {
    divEl = createEl('span', 'div-bonus-badge');
    divEl.id = 'portfolio-div-bonus';
    const hdr = document.querySelector('#portfolio-panel .panel-header');
    if (hdr) hdr.appendChild(divEl);
  }
  if (divBonus2 > 1) {
    divEl.textContent = `🌈 +${((divBonus2 - 1) * 100).toFixed(0)}% Div Bonus`;
    divEl.className = 'div-bonus-badge div-bonus-active';
  } else {
    divEl.textContent = '';
    divEl.className = 'div-bonus-badge';
  }

  if (owned.length === 0) {
    container.innerHTML = '<p class="empty-msg">No positions yet. Buy something!</p>';
    return;
  }

  container.innerHTML = '';
  for (const asset of owned) {
    const arrow = asset.momentum > 0.025 ? '↑↑' : asset.momentum > 0.006 ? '↑' : asset.momentum < -0.025 ? '↓↓' : asset.momentum < -0.006 ? '↓' : '→';
    const isUp = asset.momentum > 0.006;
    const isDown = asset.momentum < -0.006;

    const avgCost = player?.costBasis[asset.id] ?? null;
    let plHtml = '';
    if (avgCost && avgCost > 0) {
      const plPct = ((asset.price - avgCost) / avgCost) * 100;
      const plCls = plPct >= 0 ? 'pf-pl-pos' : 'pf-pl-neg';
      const plSign = plPct >= 0 ? '+' : '';
      plHtml = `<span class="pf-avg">avg ${formatCurrency(avgCost)}</span><span class="pf-pl ${plCls}">${plSign}${plPct.toFixed(1)}%</span>`;
    }

    const row = createEl('div', 'portfolio-row');
    row.innerHTML = `
      <span class="p-name">${asset.emoji} ${asset.name}</span>
      <span class="p-qty">${asset.owned}×</span>
      <span class="p-value">${formatCurrency(asset.getValue())}</span>
      <span class="p-mom ${isUp ? 'green' : isDown ? 'red' : 'muted'}">${arrow}</span>
      <div class="pf-basis-row">${plHtml}</div>
      <button class="pf-sell-btn" data-pf-sell="${asset.id}" title="Sell all ${asset.name}">Sell All</button>
    `;
    container.appendChild(row);
  }
}

// ── News panel ─────────────────────────────────────────────────────────────────

export function updateNews(
  newsSystem: NewsSystem | undefined,
  day: number,
  secondsInDay: number,
  secondsPerDay: number,
  state: NewsPanelState,
): void {
  if (!newsSystem) return;

  const nextDay   = newsSystem.getNextGenerationDay();
  const daysUntil = Math.max(0, nextDay - day);
  const secsUntil = daysUntil === 0
    ? 0
    : Math.max(0, (daysUntil - 1) * secondsPerDay + (secondsPerDay - secondsInDay));
  const nm = Math.floor(secsUntil / 60);
  const ns = secsUntil % 60;
  const timerEl = document.getElementById('news-next-timer');
  if (timerEl) timerEl.textContent = daysUntil === 0 ? '📅 soon' : `📅 ${nm}:${ns.toString().padStart(2, '0')}`;

  const npGlobal = document.getElementById('np-global-timer');
  if (npGlobal) npGlobal.textContent = daysUntil === 0 ? 'now' : `${nm}:${ns.toString().padStart(2, '0')}`;

  const container = document.getElementById('news-list')!;
  const countEl   = document.getElementById('news-active-count')!;
  const active    = newsSystem.getActive();
  countEl.textContent = active.length === 0 ? '0 pending' : `${active.length} pending`;

  const sorted = [...active].sort((a, b) => a.triggerDay - b.triggerDay);
  const newKey = sorted.map(n => n.id).join('|');

  if (newKey !== state.newsActiveKey) {
    state.newsActiveKey = newKey;
    container.innerHTML = '';
    if (active.length === 0) {
      container.innerHTML = '<p class="empty-msg">No active news. Check back later...</p>';
    } else {
      for (const item of sorted) {
        const card = buildNewsCard(item, day, secondsInDay, secondsPerDay);
        container.appendChild(card);
        requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('news-enter')));
      }
    }
  } else {
    const cards = container.querySelectorAll<HTMLElement>('.news-item[data-news-id]');
    cards.forEach((card, i) => {
      if (sorted[i]) refreshNewsCountdown(card, sorted[i], day, secondsInDay, secondsPerDay);
    });
  }

  if (state.newsPageOpen) {
    const allKey = newsSystem.getAll().map(n => `${n.id}:${String(n.resolved)}`).join('|');
    if (allKey !== state.newsPageKey) {
      state.newsPageKey = allKey;
      const feed = document.getElementById('np-feed')!;
      renderNewsPage(newsSystem, feed, state.newsPageFilter, day, secondsInDay, secondsPerDay, state.newsExpandedIds);
    } else {
      refreshNewsPageCountdowns(day, secondsInDay, secondsPerDay);
    }
  }
}

// ── Events panel ───────────────────────────────────────────────────────────────

export function updateEvents(
  eventSystem: EventSystem,
  upgradeSystem: UpgradeSystem,
  day: number,
  secondsInDay: number,
  secondsPerDay: number,
  lastLogId: { value: number },
): void {
  const badge = document.getElementById('next-event-badge')!;
  const hintBar = document.getElementById('event-hint-bar')!;
  const skipBtn = document.getElementById('btn-skip-day') as HTMLButtonElement;

  const nextDays = eventSystem.getNextEventInDays();
  const secsRemaining = (nextDays - 1) * secondsPerDay + (secondsPerDay - secondsInDay);
  const mm = Math.floor(secsRemaining / 60);
  const ss = secsRemaining % 60;
  const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;
  const dayLabel = nextDays === 1 ? 'today' : `${nextDays} days`;
  badge.textContent = `⏳ ${dayLabel} (${timeStr})`;

  const imminent = nextDays === 1 && secsRemaining <= 15;
  const soon     = nextDays <= 2 && !imminent;
  badge.classList.toggle('event-imminent', imminent);
  badge.classList.toggle('event-soon', soon && !imminent);
  badge.classList.remove(imminent ? 'event-soon' : 'event-imminent');

  skipBtn.disabled = false;
  skipBtn.title = 'Skip to next day instantly ($150)';

  const sigLevel = upgradeSystem.getSignalIntelLevel();
  if (sigLevel >= 2) {
    hintBar.classList.remove('hidden');
    const hamster = sigLevel >= 3;
    const prefix = hamster ? '🐹 Hamster senses:' : '📰 Intel:';
    hintBar.textContent = `${prefix} ${eventSystem.getHintText()}`;
    hintBar.className = `event-hint-bar ${hamster ? 'hint-hamster' : 'hint-bloomberg'}`;
  } else {
    hintBar.classList.add('hidden');
  }

  const log = eventSystem.getLog();
  if (log.length === 0 || log[0].id === lastLogId.value) return;
  lastLogId.value = log[0].id;

  const container = document.getElementById('event-log')!;
  container.innerHTML = '';
  for (const entry of log) {
    const el = createEl('div', `event-entry sev-${entry.severity}`);
    el.appendChild(createEl('span', 'event-msg', entry.message));
    el.appendChild(createEl('span', 'event-time', timeAgo(entry.timestamp)));
    container.appendChild(el);
  }
}

// ── Net Worth Sparkline ────────────────────────────────────────────────────────

export function updateNwSparkline(history: number[]): void {
  const svgEl = document.getElementById('nw-sparkline-svg') as SVGSVGElement | null;
  if (!svgEl || history.length < 2) return;
  const pts = history.slice(-30);
  const W = 80; const H = 28; const pad = 2;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || min * 0.01 || 1;
  const isUp = pts[pts.length - 1] >= pts[0];
  const color = isUp ? '#3fb950' : '#f85149';
  const toXY = (p: number, i: number) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - pad - ((p - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  const points = pts.map(toXY).join(' ');
  const [lx, ly] = toXY(pts[pts.length - 1], pts.length - 1).split(',');
  svgEl.innerHTML = `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${lx}" cy="${ly}" r="2" fill="${color}"/>`;
}

// ── Footer ─────────────────────────────────────────────────────────────────────

export function updateFooter(player: Player, tick: number, day: number): void {
  document.getElementById('footer-stats')!.textContent =
    `Day: ${day} · Trades: ${player.tradeCount} · Tick: ${tick} · Earned: ${formatCurrency(player.totalEarned)}`;
}

// Re-export updateUpgradesTab so render.ts only needs one import
export { updateUpgradesTab, type UpgradesPanelState };
