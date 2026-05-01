import type { Market } from '../core/Market.ts';
import type { Player } from '../core/Player.ts';
import type { EventSystem, EventLogEntry } from '../core/EventSystem.ts';
import type { NewsSystem } from '../core/NewsSystem.ts';
import type { UpgradeSystem } from '../systems/UpgradeSystem.ts';
import type { RankSystem, Rank } from '../systems/RankSystem.ts';
import type { InvestorSystem } from '../systems/InvestorSystem.ts';
import type { BlackMarketPanel } from './BlackMarketPanel.ts';
import type { HedgeFundPanel } from './HedgeFundPanel.ts';
import type { SoundSystem } from '../systems/SoundSystem.ts';
import { createEl, formatCurrency } from './components.ts';
import { spawnFloatingText } from './animations.ts';
import { LAYOUT_HTML } from './layout.ts';
import { NEWS_HEADLINES } from './renderConstants.ts';
import { populateInsightPanel } from './insightPanel.ts';
import { renderIntelContent } from './intelModal.ts';
import { renderNewsPage, refreshNewsPageCountdowns } from './newsPage.ts';
import {
  updateHeader, updateMarket, updateFearGreed, updateStreak,
  updatePortfolio, updateNews, updateEvents, updateFooter, updateNwSparkline,
  type MarketPanelState, type NewsPanelState, type UpgradesPanelState,
} from './panelUpdates.ts';
import { updateUpgradesTab } from './upgradesPanel.ts';

export interface RenderCallbacks {
  onBuy: (assetId: string, qty: number) => void;
  onSell: (assetId: string, qty: number) => void;
  onBuyMax: (assetId: string) => void;
  onSellAll: (assetId: string) => void;
  onYolo: () => void;
  onStabilise: () => void;
  onManipulate: (assetId: string) => void;
  onBuyUpgrade: (upgradeId: string) => void;
  onPrestige: () => void;
  onDarkModeToggle: () => void;
  onClearSave: () => void;
  onShowManipulateModal: () => void;
  onShowMarketIntel: () => void;
  onSkipDay: () => void;
  onSetCash: (amount: number) => void;
  onBuyLeveledUpgrade: (id: string) => void;
  onHireInvestor: (tierId: string) => void;
  onAddLimitOrder: (assetId: string, type: 'buy' | 'sell', triggerPrice: number, quantity: number) => void;
  onCancelLimitOrder: (orderId: string) => void;
}

interface Toast { el: HTMLElement; removeAt: number; }

export class Renderer {
  private readonly callbacks: RenderCallbacks;
  private toasts: Toast[] = [];
  private tickerIndex = 0;
  private darkMode = true;
  private openInsightId: string | null = null;
  private bmPanel: BlackMarketPanel | null = null;
  private hfPanel: HedgeFundPanel | null = null;
  private currentTab: 'main' | 'upgrades' | 'bm' | 'hf' | 'missions' = 'main';
  private soundSystem: SoundSystem | null = null;
  private soundPanelOpen = false;
  private storedRankSystem: RankSystem | null = null;
  private storedInvestorSystem: InvestorSystem | null = null;
  private storedNewsSystem: NewsSystem | null = null;
  private storedPlayer: Player | null = null;
  private currentDay = 0;
  private currentSecInDay = 0;
  private currentSecPerDay = 60;
  private eventChoiceTimerId: ReturnType<typeof setInterval> | null = null;

  // Shared panel states (passed by reference to extracted functions)
  private readonly lastCash = { value: -1 };
  private readonly lastLogId = { value: -1 };
  private readonly marketState: MarketPanelState = {
    lastUnlockedCount: -1,
    lastPrices: new Map(),
    assetRowCallbacks: null as never,  // set in constructor after callbacks available
    assetRowMutableState: { openLimitOrderId: null },
    storedPlayer: null,
  };
  private readonly newsState: NewsPanelState = {
    newsActiveKey: '',
    newsPageOpen: false,
    newsPageKey: '',
    newsPageFilter: 'all',
    newsExpandedIds: new Set(),
  };
  private readonly upgradesState: UpgradesPanelState = {
    lastUpgradeKey: '',
    lastInvestorKey: '',
  };

  constructor(callbacks: RenderCallbacks) {
    this.callbacks = callbacks;
    this.marketState.assetRowCallbacks = {
      onBuy:              callbacks.onBuy,
      onSell:             callbacks.onSell,
      onBuyMax:           callbacks.onBuyMax,
      onSellAll:          callbacks.onSellAll,
      onAddLimitOrder:    callbacks.onAddLimitOrder,
      onCancelLimitOrder: callbacks.onCancelLimitOrder,
      showToast:          (msg, type) => this.showToast(msg, type as 'success' | 'error' | 'info' | 'chaos'),
    };
    this.buildLayout();
    this.startTicker();
  }

  // ── Layout ─────────────────────────────────────────────────────────────────

  private buildLayout(): void {
    document.body.className = 'dark';
    document.body.innerHTML = LAYOUT_HTML;

    document.getElementById('btn-yolo')!.addEventListener('click', () => this.callbacks.onYolo());
    document.getElementById('btn-stabilise')!.addEventListener('click', () => this.callbacks.onStabilise());
    document.getElementById('btn-manipulate')!.addEventListener('click', () => this.callbacks.onShowManipulateModal());
    document.getElementById('btn-intel')!.addEventListener('click', () => this.callbacks.onShowMarketIntel());
    document.getElementById('modal-close')!.addEventListener('click', () => this.hideModal());
    document.getElementById('intel-close')!.addEventListener('click', () => this.hideIntelModal());
    document.getElementById('ip-close')!.addEventListener('click', () => this.hideInsightPanel());
    document.getElementById('insight-bg')!.addEventListener('click', () => this.hideInsightPanel());
    document.getElementById('ip-buy-btn')!.addEventListener('click', () => {
      if (this.openInsightId) this.callbacks.onBuy(this.openInsightId, 1);
    });
    document.getElementById('ip-sell-btn')!.addEventListener('click', () => {
      if (this.openInsightId) this.callbacks.onSell(this.openInsightId, 1);
    });
    document.getElementById('modal-overlay')!.addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.hideModal();
    });
    document.getElementById('intel-overlay')!.addEventListener('click', (e) => {
      if (e.target === document.getElementById('intel-overlay')) this.hideIntelModal();
    });
    document.getElementById('btn-open-news-page')!.addEventListener('click', () => this.showNewsPage());
    document.getElementById('news-page-close')!.addEventListener('click', () => this.hideNewsPage());
    document.getElementById('news-page-overlay')!.addEventListener('click', (e) => {
      if (e.target === document.getElementById('news-page-overlay')) this.hideNewsPage();
    });
    document.getElementById('np-filters')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.np-filter-btn');
      if (btn?.dataset.filter) this.setNewsPageFilter(btn.dataset.filter as 'all' | 'active' | 'chains' | 'resolved');
    });
    document.getElementById('np-feed')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.np-expand-btn');
      if (!btn?.dataset.expandId) return;
      const id = btn.dataset.expandId;
      const body = document.getElementById(`npbody-${id}`);
      if (!body) return;
      const isOpen = !body.classList.contains('hidden');
      if (isOpen) { this.newsState.newsExpandedIds.delete(id); body.classList.add('hidden'); btn.textContent = '▼ Details'; }
      else         { this.newsState.newsExpandedIds.add(id);    body.classList.remove('hidden'); btn.textContent = '▲ Hide'; }
    });
    document.getElementById('tab-bar')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
      if (!btn || btn.classList.contains('tab-locked')) return;
      this.switchTab(btn.dataset.tab as 'main' | 'upgrades' | 'bm' | 'hf' | 'missions');
    });
    document.getElementById('floating-missions-btn')!.addEventListener('click', () => {
      this.switchTab('missions');
      this.clearTabBadge('missions');
    });
    document.getElementById('tab-bar')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
      if (!btn) return;
      const t = btn.dataset.tab as 'main' | 'upgrades' | 'bm' | 'hf' | 'missions';
      if (t === 'missions') this.clearTabBadge('missions');
      if (t === 'bm')       this.clearTabBadge('bm');
      if (t === 'hf')       this.clearTabBadge('hf');
    }, true); // capture phase so it runs before the other tab listener
    document.getElementById('portfolio-list')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-pf-sell]');
      if (btn?.dataset.pfSell) this.callbacks.onSellAll(btn.dataset.pfSell);
    });
    document.getElementById('btn-dark')!.addEventListener('click', () => this.callbacks.onDarkModeToggle());
    document.getElementById('btn-skip-day')!.addEventListener('click', () => this.callbacks.onSkipDay());
    document.getElementById('btn-prestige')!.addEventListener('click', () => this.callbacks.onPrestige());
    document.getElementById('btn-clear')!.addEventListener('click', () => {
      if (confirm('Reset ALL progress? This cannot be undone.')) this.callbacks.onClearSave();
    });
    document.getElementById('debug-cash-btn')!.addEventListener('click', () => {
      const input = document.getElementById('debug-cash-input') as HTMLInputElement;
      const val = parseFloat(input.value);
      if (!isNaN(val) && val >= 0) { this.callbacks.onSetCash(val); input.value = ''; this.showToast(`🛠 Cash set to $${val.toLocaleString()}`, 'info'); }
    });
    (document.getElementById('debug-cash-input') as HTMLInputElement).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') (document.getElementById('debug-cash-btn') as HTMLButtonElement).click();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideInsightPanel();
        this.hideIntelModal();
        this.hideModal();
        this.hideNewsPage();
      }
    });
  }

  private startTicker(): void {
    const el = document.getElementById('ticker-text')!;
    const next = () => {
      const liveHeadlines = this.storedNewsSystem
        ? this.storedNewsSystem.getActive().map(n => `📰 ${n.targetEmoji} ${n.targetName}: "${n.headline}"`)
        : [];
      const pool = liveHeadlines.length > 0
        ? [...liveHeadlines, NEWS_HEADLINES[this.tickerIndex % NEWS_HEADLINES.length]]
        : NEWS_HEADLINES;
      el.textContent = pool[this.tickerIndex % pool.length];
      this.tickerIndex++;
    };
    next();
    setInterval(next, 8000);
  }

  // ── Main update ────────────────────────────────────────────────────────────

  update(
    market: Market,
    player: Player,
    eventSystem: EventSystem,
    upgradeSystem: UpgradeSystem,
    tick: number,
    day = 0,
    secondsInDay = 0,
    secondsPerDay = 60,
    newsSystem?: NewsSystem,
    rankSystem?: RankSystem,
    investorSystem?: InvestorSystem,
    nwHistory?: number[],
  ): void {
    if (newsSystem)    this.storedNewsSystem    = newsSystem;
    if (rankSystem)    this.storedRankSystem    = rankSystem;
    if (investorSystem) this.storedInvestorSystem = investorSystem;
    this.storedPlayer = player;
    this.marketState.storedPlayer = player;
    this.currentDay = day;
    this.currentSecInDay = secondsInDay;
    this.currentSecPerDay = secondsPerDay;

    updateHeader(player, market, upgradeSystem, day, this.storedRankSystem, this.lastCash);
    updateMarket(market, player, upgradeSystem, day, this.storedNewsSystem, this.marketState);
    updatePortfolio(market, player);
    updateFearGreed(market);
    updateStreak(player);
    updateNews(newsSystem, day, secondsInDay, secondsPerDay, this.newsState);
    updateEvents(eventSystem, upgradeSystem, day, secondsInDay, secondsPerDay, this.lastLogId);
    updateUpgradesTab(
      upgradeSystem, player, market,
      this.storedInvestorSystem, this.storedRankSystem,
      this.callbacks.onBuyLeveledUpgrade, this.callbacks.onHireInvestor,
      this.upgradesState,
    );
    updateFooter(player, tick, day);
    if (nwHistory) updateNwSparkline(nwHistory);
    if (this.openInsightId) this.refreshInsightPanel(market);
    this.drainToasts();
  }

  // ── Event choice modal ─────────────────────────────────────────────────────

  showEventChoiceModal(hint: string, onChoose: (choice: string) => void): void {
    if (this.eventChoiceTimerId !== null) {
      clearInterval(this.eventChoiceTimerId);
      this.eventChoiceTimerId = null;
    }
    const overlay  = document.getElementById('event-choice-overlay')!;
    const hintEl   = document.getElementById('ecm-hint')!;
    const timerEl  = document.getElementById('ecm-timer')!;
    hintEl.textContent = hint;
    overlay.classList.remove('hidden');
    let seconds = 15;
    timerEl.textContent = String(seconds);
    const done = (choice: string) => {
      if (this.eventChoiceTimerId !== null) { clearInterval(this.eventChoiceTimerId); this.eventChoiceTimerId = null; }
      overlay.classList.add('hidden');
      onChoose(choice);
    };
    this.eventChoiceTimerId = setInterval(() => {
      seconds--;
      timerEl.textContent = String(seconds);
      if (seconds <= 0) done('watch');
    }, 1000);
    document.getElementById('ecm-bail')!.onclick   = () => done('bail');
    document.getElementById('ecm-hedge')!.onclick  = () => done('hedge');
    document.getElementById('ecm-double')!.onclick = () => done('double');
    document.getElementById('ecm-watch')!.onclick  = () => done('watch');
  }

  // ── Insight panel ──────────────────────────────────────────────────────────

  showInsightPanel(assetId: string, market: Market): void {
    const asset = market.getAsset(assetId);
    if (!asset) return;
    this.openInsightId = assetId;
    populateInsightPanel(asset);
    document.getElementById('insight-bg')!.classList.add('visible');
    document.getElementById('insight-panel')!.classList.add('visible');
  }

  private refreshInsightPanel(market: Market): void {
    if (!this.openInsightId) return;
    const asset = market.getAsset(this.openInsightId);
    if (asset) populateInsightPanel(asset);
  }

  hideInsightPanel(): void {
    this.openInsightId = null;
    document.getElementById('insight-panel')!.classList.remove('visible');
    document.getElementById('insight-bg')!.classList.remove('visible');
  }

  // ── Manipulate modal ───────────────────────────────────────────────────────

  showModal(market?: Market): void {
    const overlay = document.getElementById('modal-overlay')!;
    const list    = document.getElementById('modal-assets')!;
    overlay.classList.remove('hidden');
    list.innerHTML = '';
    if (!market) return;
    for (const asset of market.getUnlockedAssets()) {
      const btn = createEl('button', 'btn btn-manipulate-asset');
      btn.textContent = `${asset.emoji} ${asset.name} — ${formatCurrency(asset.price)}`;
      btn.addEventListener('click', () => this.callbacks.onManipulate(asset.id));
      list.appendChild(btn);
    }
  }

  hideModal(): void { document.getElementById('modal-overlay')!.classList.add('hidden'); }

  // ── Market Intel modal ─────────────────────────────────────────────────────

  showMarketIntel(market: Market): void {
    document.getElementById('intel-overlay')!.classList.remove('hidden');
    renderIntelContent(market, document.getElementById('intel-content')!);
  }

  hideIntelModal(): void { document.getElementById('intel-overlay')!.classList.add('hidden'); }

  // ── Full news page ─────────────────────────────────────────────────────────

  showNewsPage(): void {
    this.newsState.newsPageOpen = true;
    document.getElementById('news-page-overlay')!.classList.remove('hidden');
    this.newsState.newsPageKey = '';
    if (this.storedNewsSystem) {
      renderNewsPage(this.storedNewsSystem, document.getElementById('np-feed')!, this.newsState.newsPageFilter, this.currentDay, this.currentSecInDay, this.currentSecPerDay, this.newsState.newsExpandedIds);
    }
  }

  hideNewsPage(): void {
    this.newsState.newsPageOpen = false;
    document.getElementById('news-page-overlay')!.classList.add('hidden');
  }

  private setNewsPageFilter(filter: 'all' | 'active' | 'chains' | 'resolved'): void {
    this.newsState.newsPageFilter = filter;
    document.querySelectorAll<HTMLElement>('#np-filters .np-filter-btn').forEach(btn => {
      btn.classList.toggle('np-filter-active', btn.dataset.filter === filter);
    });
    if (this.storedNewsSystem) {
      renderNewsPage(this.storedNewsSystem, document.getElementById('np-feed')!, filter, this.currentDay, this.currentSecInDay, this.currentSecPerDay, this.newsState.newsExpandedIds);
    }
  }

  // ── Rank-up popup ──────────────────────────────────────────────────────────

  showRankUp(rank: Rank): void {
    const popup = document.getElementById('rank-up-popup')!;
    document.getElementById('rankup-emoji')!.textContent = rank.emoji;
    document.getElementById('rankup-name')!.textContent  = rank.name;
    const nextEl = document.getElementById('rankup-next')!;
    if (this.storedRankSystem) {
      const allRanks = this.storedRankSystem.getAllRanks();
      const idx = allRanks.findIndex(r => r.id === rank.id);
      nextEl.textContent = idx < allRanks.length - 1
        ? `Next: ${allRanks[idx + 1].emoji} ${allRanks[idx + 1].name} at ${formatCurrency(allRanks[idx + 1].requiredNetWorth)} NW`
        : '🏆 Maximum rank achieved!';
    }
    popup.classList.remove('visible');
    requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add('visible')));
    setTimeout(() => popup.classList.remove('visible'), 4000);
  }

  // ── Trade animation ────────────────────────────────────────────────────────

  animateTrade(assetId: string, text: string, type: 'up' | 'down'): void {
    const row = document.querySelector(`[data-id="${assetId}"] .asset-price`) as HTMLElement | null;
    if (row) spawnFloatingText(row, text, type);
  }

  // ── Event popup ────────────────────────────────────────────────────────────

  showEventPopup(entry: EventLogEntry): void {
    const area = document.getElementById('event-popup-area');
    if (!area) return;
    const existing = area.querySelectorAll('.event-popup');
    if (existing.length >= 3) existing[0].remove();
    const popup = createEl('div', `event-popup popup-${entry.severity}`);
    popup.textContent = entry.message;
    area.appendChild(popup);
    requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add('visible')));
    setTimeout(() => {
      popup.classList.remove('visible');
      popup.classList.add('dismissing');
      setTimeout(() => popup.remove(), 380);
    }, 4200);
  }

  // ── Toasts ─────────────────────────────────────────────────────────────────

  showToast(message: string, type: 'success' | 'error' | 'info' | 'chaos' = 'info'): void {
    const area = document.getElementById('toast-area')!;
    const toast = createEl('div', `toast toast-${type}`);
    toast.textContent = message;
    area.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('visible')));
    this.toasts.push({ el: toast, removeAt: Date.now() + 3500 });
  }

  private drainToasts(): void {
    const now = Date.now();
    this.toasts = this.toasts.filter(t => {
      if (now >= t.removeAt) {
        t.el.classList.remove('visible');
        setTimeout(() => t.el.remove(), 400);
        return false;
      }
      return true;
    });
  }

  // ── Tab management ─────────────────────────────────────────────────────────

  setBmPanel(panel: BlackMarketPanel): void { this.bmPanel = panel; }

  switchTab(tab: 'main' | 'upgrades' | 'bm' | 'hf' | 'missions'): void {
    this.currentTab = tab;
    document.getElementById('main-grid')!.classList.toggle('hidden', tab !== 'main');
    document.getElementById('upgrades-tab-panel')!.classList.toggle('hidden', tab !== 'upgrades');
    document.getElementById('missions-panel-mount')!.classList.toggle('hidden', tab !== 'missions');
    document.getElementById('bm-panel-mount')!.classList.toggle('hidden', tab !== 'bm');
    document.getElementById('hf-panel-mount')!.classList.toggle('hidden', tab !== 'hf');
    document.querySelectorAll<HTMLElement>('#tab-bar [data-tab]').forEach(btn => {
      btn.classList.remove('tab-active');
      if (btn.dataset.tab === tab) btn.classList.add('tab-active');
    });
    if (tab === 'bm' && this.bmPanel && !this.bmPanel.tutorialStarted) this.bmPanel.playTutorial();
    if (tab === 'hf' && this.hfPanel && !this.hfPanel.tutorialStarted) this.hfPanel.playTutorial();
    // Hide floating btn when on missions tab
    const fmb = document.getElementById('floating-missions-btn');
    if (fmb) fmb.classList.toggle('fmb-hidden', tab === 'missions');
  }

  // ── Tab badges ─────────────────────────────────────────────────────────────

  addTabBadge(tab: 'missions' | 'bm' | 'hf', count?: number): void {
    const badgeId = `tab-${tab}-badge`;
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    const n = count ?? (parseInt(badge.textContent ?? '0') || 0) + 1;
    badge.textContent = String(n);
    badge.classList.remove('hidden');
    // Also update floating missions button badge
    if (tab === 'missions') this._updateFloatingMissionsBadge(n);
  }

  clearTabBadge(tab: 'missions' | 'bm' | 'hf'): void {
    const badge = document.getElementById(`tab-${tab}-badge`);
    if (badge) { badge.textContent = '0'; badge.classList.add('hidden'); }
    if (tab === 'missions') this._updateFloatingMissionsBadge(0);
  }

  private _updateFloatingMissionsBadge(count: number): void {
    const fmb = document.getElementById('fmb-badge');
    if (!fmb) return;
    if (count > 0) { fmb.textContent = String(count); fmb.classList.remove('hidden'); }
    else            { fmb.classList.add('hidden'); }
  }

  updateFloatingMissionsBtn(pendingCount: number): void {
    const btn = document.getElementById('floating-missions-btn');
    if (!btn) return;
    const isVisible = this.currentTab !== 'missions';
    btn.classList.toggle('fmb-hidden', !isVisible);
    this._updateFloatingMissionsBadge(pendingCount);
  }

  showBlackMarketUnlock(): void {
    const btn = document.getElementById('tab-bm');
    if (btn) {
      // Preserve the badge span, only replace text node
      const badge = btn.querySelector('.tab-badge');
      btn.innerHTML = '🕵️ Black Market';
      if (badge) btn.appendChild(badge);
      btn.classList.remove('tab-locked');
    }
    this.bmPanel?.triggerUnlockNotif();
  }

  revealBlackMarketTab(): void {
    const btn = document.getElementById('tab-bm');
    if (btn) {
      const badge = btn.querySelector('.tab-badge');
      btn.innerHTML = '🕵️ Black Market';
      if (badge) btn.appendChild(badge);
      btn.classList.remove('tab-locked');
    }
  }

  setHfPanel(panel: HedgeFundPanel): void { this.hfPanel = panel; }

  showHedgeFundUnlock(): void {
    const btn = document.getElementById('tab-hf');
    if (btn) { btn.classList.remove('tab-locked', 'hidden'); }
    this.hfPanel?.triggerUnlockNotif();
  }

  revealHedgeFundTab(): void {
    const btn = document.getElementById('tab-hf');
    if (btn) { btn.classList.remove('tab-locked', 'hidden'); }
  }

  // ── Milestone + Day Summary ────────────────────────────────────────────────

  showMilestone(label: string, sub: string): void {
    const existing = document.getElementById('milestone-popup');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'milestone-popup';
    el.className = 'milestone-popup';
    el.innerHTML = `<span class="ms-label">${label}</span><span class="ms-sub">${sub}</span>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('milestone-visible')));
    setTimeout(() => { el.classList.add('milestone-out'); setTimeout(() => el.remove(), 400); }, 2500);
  }

  showDaySummary(opts: { day: number; netWorthDelta: number; callsMade: number; postsMade: number; rugProfit: number }): void {
    const existing = document.getElementById('day-summary-overlay');
    if (existing) existing.remove();
    const sign = opts.netWorthDelta >= 0 ? '+' : '';
    const overlay = document.createElement('div');
    overlay.id = 'day-summary-overlay';
    overlay.className = 'day-summary-overlay';
    overlay.innerHTML = `
      <div class="day-summary-card">
        <div class="day-summary-title">DAY ${opts.day} COMPLETE</div>
        <div class="day-summary-rows">
          <div class="day-summary-row">
            <span class="ds-lbl">NET WORTH CHANGE</span>
            <span class="ds-val ${opts.netWorthDelta >= 0 ? 'ds-pos' : 'ds-neg'}">${sign}$${Math.abs(opts.netWorthDelta).toLocaleString()}</span>
          </div>
          ${opts.callsMade > 0 || opts.postsMade > 0 || opts.rugProfit > 0 ? `
          <div class="day-summary-row"><span class="ds-lbl">BM CALLS</span><span class="ds-val">${opts.callsMade}</span></div>
          <div class="day-summary-row"><span class="ds-lbl">POSTS</span><span class="ds-val">${opts.postsMade}</span></div>
          ${opts.rugProfit > 0 ? `<div class="day-summary-row"><span class="ds-lbl">RUG PROFIT</span><span class="ds-val ds-pos">+$${opts.rugProfit.toLocaleString()}</span></div>` : ''}
          ` : ''}
        </div>
        <button class="day-summary-close">CONTINUE →</button>
      </div>`;
    document.body.appendChild(overlay);
    const dismiss = () => { overlay.classList.add('day-summary-out'); setTimeout(() => overlay.remove(), 300); };
    overlay.querySelector('.day-summary-close')?.addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
    setTimeout(dismiss, 5000);
  }

  // ── Sound panel ────────────────────────────────────────────────────────────

  setSoundSystem(ss: SoundSystem): void {
    this.soundSystem = ss;
    const muteBtn  = document.getElementById('sp-mute')!;
    const master   = document.getElementById('sp-master') as HTMLInputElement;
    const sfx      = document.getElementById('sp-sfx') as HTMLInputElement;
    const masterV  = document.getElementById('sp-master-val')!;
    const sfxV     = document.getElementById('sp-sfx-val')!;
    const sync = () => {
      master.value   = String(ss.masterVolume);
      sfx.value      = String(ss.sfxVolume);
      masterV.textContent = `${Math.round(ss.masterVolume * 100)}%`;
      sfxV.textContent    = `${Math.round(ss.sfxVolume    * 100)}%`;
      muteBtn.textContent = ss.muted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
      muteBtn.classList.toggle('sp-muted', ss.muted);
    };
    sync();
    muteBtn.addEventListener('click', () => { ss.unlock(); ss.toggleMute(); sync(); });
    master.addEventListener('input', () => { ss.unlock(); ss.setMasterVolume(parseFloat(master.value)); masterV.textContent = `${Math.round(ss.masterVolume * 100)}%`; });
    sfx.addEventListener('input',    () => { ss.unlock(); ss.setSfxVolume(parseFloat(sfx.value));       sfxV.textContent    = `${Math.round(ss.sfxVolume    * 100)}%`; });
    document.getElementById('sp-test')?.addEventListener('click', () => { ss.unlock(); ss.play('profit'); });
    document.getElementById('btn-sound')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.soundPanelOpen = !this.soundPanelOpen;
      document.getElementById('sound-panel')!.classList.toggle('hidden', !this.soundPanelOpen);
      if (this.soundPanelOpen) ss.unlock(); // unlock AudioContext on panel open
    });
    document.addEventListener('click', () => {
      if (this.soundPanelOpen) { this.soundPanelOpen = false; document.getElementById('sound-panel')!.classList.add('hidden'); }
    });
    document.getElementById('sound-panel')!.addEventListener('click', (e) => e.stopPropagation());
  }

  // ── Dark mode ──────────────────────────────────────────────────────────────

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    document.body.className = this.darkMode ? 'dark' : 'light';
    document.getElementById('btn-dark')!.textContent = this.darkMode ? '🌙' : '☀️';
  }
}
