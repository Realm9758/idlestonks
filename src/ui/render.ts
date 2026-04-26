import type { Market } from '../core/Market.ts';
import type { Player } from '../core/Player.ts';
import type { EventSystem, EventLogEntry } from '../core/EventSystem.ts';
import type { NewsSystem, NewsItem } from '../core/NewsSystem.ts';
import type { UpgradeSystem } from '../systems/UpgradeSystem.ts';
import type { Asset } from '../core/Asset.ts';
import {
  formatCurrency, formatPct, timeAgo, createEl,
  getInsightText, getMomentumArrow,
} from './components.ts';
import { flashPrice, spawnFloatingText, pulseElement } from './animations.ts';

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
}

interface Toast { el: HTMLElement; removeAt: number; }

const NEWS_TYPE_INFO: Record<string, { icon: string; label: string; cls: string }> = {
  hype:         { icon: '🔥', label: 'HYPE',         cls: 'nt-hype' },
  crash:        { icon: '💥', label: 'CRASH',        cls: 'nt-crash' },
  growth:       { icon: '📈', label: 'GROWTH',       cls: 'nt-growth' },
  scandal:      { icon: '🕵️', label: 'SCANDAL',      cls: 'nt-scandal' },
  breakthrough: { icon: '⚡', label: 'BREAKTHROUGH', cls: 'nt-breakthrough' },
};

const NEWS_HEADLINES = [
  'Analyst upgrades CatCoin to "Very Meow" with $420 price target',
  'Prediction hamster selects portfolio by eating random food pellets',
  'SEC investigating "Stonks Only Go Up" fund for false advertising',
  'AI writes AI writes AI — recursion depth exceeded, investors panic',
  'Quantum Banana observed: simultaneously ripe and worth nothing',
  'Local man invests life savings in Meme ETF — says "this is fine"',
  'DiamondHandsCoin holders have not moved in 3 years; doctors concerned',
  'NFT of an NFT sells for $0.00001; artist calls it "meta-conceptual"',
  'Rug Pull Token founder spotted moving to non-extradition country',
  'High-hype assets pump; stability advocates insufferably smug',
  'Prediction hamster declines to comment on Rug Pull Token',
  'Analysts: "momentum is real until it isn\'t" — markets agree',
  'Breaking: Market does market thing; more at 11',
];

export class Renderer {
  private readonly callbacks: RenderCallbacks;
  private toasts: Toast[] = [];
  private tickerIndex = 0;
  private lastUnlockedCount = -1;
  private lastUpgradeCount = -1;
  private lastLogId = -1;
  private darkMode = true;

  // Price flash: only trigger when change > 1%
  private lastPrices = new Map<string, number>();

  // Currently open insight panel asset
  private openInsightId: string | null = null;

  // News change-detection
  private newsActiveKey = '';
  private storedNewsSystem: NewsSystem | null = null;
  private currentDay = 0;
  private currentSecInDay = 0;
  private currentSecPerDay = 60;

  // Full news page state
  private newsPageFilter: 'all' | 'active' | 'chains' | 'resolved' = 'all';
  private newsPageOpen = false;
  private newsPageKey = '';
  private newsExpandedIds = new Set<string>();

  constructor(callbacks: RenderCallbacks) {
    this.callbacks = callbacks;
    this.buildLayout();
    this.startTicker();
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  private buildLayout(): void {
    document.body.className = 'dark';
    document.body.innerHTML = `
<div id="app">
  <header id="header">
    <div class="header-left">
      <div class="logo">📈 <span>IdleStonks</span></div>
    </div>
    <div class="header-stats">
      <div class="stat-block">
        <span class="stat-label">DAY</span>
        <span id="stat-day" class="stat-value">1</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">CASH</span>
        <span id="stat-cash" class="stat-value">$1,000</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">NET WORTH</span>
        <span id="stat-networth" class="stat-value">$1,000</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">PORTFOLIO</span>
        <span id="stat-portfolio" class="stat-value">$0</span>
      </div>
      <div class="stat-block prestige-block hidden" id="prestige-block">
        <span class="stat-label">MULTIPLIER</span>
        <span id="stat-multiplier" class="stat-value gold">×1</span>
      </div>
    </div>
    <div class="header-actions">
      <button id="btn-intel" class="btn btn-intel">📊 Market Intel</button>
      <button id="btn-dark" class="btn-icon" title="Toggle dark mode">🌙</button>
    </div>
  </header>

  <div id="ticker-bar">
    <span class="ticker-label">📡 BREAKING</span>
    <div class="ticker-wrap"><span id="ticker-text"></span></div>
  </div>

  <div id="toast-area"></div>
  <div id="event-popup-area"></div>
  <div id="screen-flash"></div>

  <div id="main-grid">
    <div id="market-panel" class="panel">
      <div class="panel-header">
        <h2>📊 Market</h2>
        <div class="panel-actions">
          <button id="btn-yolo" class="btn btn-primary">🎲 YOLO</button>
          <button id="btn-stabilise" class="btn btn-secondary">🎚️ Stabilise <span class="cost-badge">$500</span></button>
          <button id="btn-manipulate" class="btn btn-danger">🕹️ Manipulate <span class="cost-badge">$1000</span></button>
        </div>
      </div>
      <div id="asset-list"></div>
    </div>

    <div id="right-column">
      <div id="portfolio-panel" class="panel">
        <div class="panel-header">
          <h2>💼 Portfolio</h2>
          <span id="portfolio-total" class="panel-sub">$0.00</span>
        </div>
        <div id="portfolio-list"><p class="empty-msg">No positions yet. Buy something!</p></div>
      </div>

      <div id="news-panel" class="panel">
        <div class="panel-header">
          <h2>📰 Live News</h2>
          <div class="news-panel-actions">
            <span id="news-next-timer" class="news-next-badge">📅 --:--</span>
            <button id="btn-open-news-page" class="btn btn-ghost-sm">📰 Feed</button>
          </div>
        </div>
        <div class="news-panel-subbar">
          <span id="news-active-count" class="panel-sub">0 pending</span>
        </div>
        <div id="news-list"><p class="empty-msg">Market watching for developments...</p></div>
      </div>

      <div id="events-panel" class="panel">
        <div class="panel-header">
          <h2>📰 Events</h2>
          <div class="event-timer-area">
            <span id="next-event-badge" class="timer-badge">⏳ --</span>
            <button id="btn-skip-day" class="btn btn-sm btn-skip-day" title="Skip to next day instantly">⏩ Skip Day <span class="cost-badge">$150</span></button>
          </div>
        </div>
        <div id="event-hint-bar" class="event-hint-bar hidden"></div>
        <div id="event-log"><p class="empty-msg">Waiting for chaos...</p></div>
      </div>

      <div id="upgrades-panel" class="panel">
        <div class="panel-header"><h2>⚙️ Upgrades</h2></div>
        <div id="upgrade-list"><p class="empty-msg">Grow your net worth to unlock upgrades.</p></div>
      </div>
    </div>
  </div>

  <footer id="footer">
    <span id="footer-stats">Trades: 0 · Tick: 0</span>
    <div class="footer-actions">
      <button id="btn-prestige" class="btn btn-prestige hidden">⭐ PRESTIGE</button>
      <button id="btn-clear" class="btn btn-ghost-sm">🗑️ Reset Game</button>
    </div>
  </footer>

  <!-- Manipulate modal -->
  <div id="modal-overlay" class="hidden">
    <div id="modal">
      <div class="modal-header">
        <h3>🕹️ Manipulate Market</h3>
        <button id="modal-close" class="btn-icon">✕</button>
      </div>
      <p class="modal-desc">Pick an asset to pump or dump. 55% chance of backfire. Costs $1,000.</p>
      <div id="modal-assets"></div>
    </div>
  </div>

  <!-- Market Intel modal -->
  <div id="intel-overlay" class="hidden">
    <div id="intel-modal">
      <div class="modal-header">
        <div>
          <h3>📊 Market Intel</h3>
          <p class="modal-desc">Intelligence on all assets — including locked ones. Plan ahead.</p>
        </div>
        <button id="intel-close" class="btn-icon">✕</button>
      </div>
      <div id="intel-content" class="intel-content-wrap"></div>
    </div>
  </div>

  <!-- Full news page (full-screen overlay) -->
  <div id="news-page-overlay" class="hidden">
    <div id="news-page">
      <div class="np-header">
        <div class="np-brand">
          <span class="np-logo">📰 Market Dispatch</span>
          <span class="np-tagline">Live intelligence feed</span>
        </div>
        <div class="np-center">
          <div class="np-next-global">
            <span class="np-next-label">📅 NEXT STORY</span>
            <span id="np-global-timer" class="np-next-time">--:--</span>
          </div>
        </div>
        <div id="np-filters" class="np-filters">
          <button class="np-filter-btn np-filter-active" data-filter="all">All</button>
          <button class="np-filter-btn" data-filter="active">⏳ Active</button>
          <button class="np-filter-btn" data-filter="chains">🔗 Chains</button>
          <button class="np-filter-btn" data-filter="resolved">Archive</button>
        </div>
        <button id="news-page-close" class="btn-icon">✕</button>
      </div>
      <div id="np-feed" class="np-feed"></div>
    </div>
  </div>

  <!-- Insight panel background -->
  <div id="insight-bg" class="insight-bg"></div>

  <!-- Insight panel -->
  <div id="insight-panel" class="insight-panel">
    <div class="ip-header">
      <span id="ip-emoji" class="ip-emoji"></span>
      <div class="ip-meta">
        <div id="ip-name" class="ip-name"></div>
        <div id="ip-price" class="ip-price-val"></div>
      </div>
      <button id="ip-close" class="btn-icon">✕</button>
    </div>
    <div class="ip-bars">
      <div class="ip-bar-row">
        <span class="ip-bar-label">🔥 Hype</span>
        <div class="ip-track"><div class="ip-fill ip-hype-fill"></div></div>
        <span class="ip-pct" id="ip-hype-val">0%</span>
      </div>
      <div class="ip-bar-row">
        <span class="ip-bar-label">📈 Momentum</span>
        <div class="ip-track ip-mom-track">
          <div class="ip-mom-center"></div>
          <div class="ip-fill ip-mom-fill"></div>
        </div>
        <span class="ip-pct ip-arrow-val" id="ip-mom-val">→</span>
      </div>
      <div class="ip-bar-row">
        <span class="ip-bar-label">🛡 Stability</span>
        <div class="ip-track"><div class="ip-fill ip-stab-fill"></div></div>
        <span class="ip-pct" id="ip-stab-val">0%</span>
      </div>
      <div class="ip-bar-row">
        <span class="ip-bar-label">🎲 Risk</span>
        <div class="ip-track"><div class="ip-fill ip-risk-fill"></div></div>
        <span class="ip-pct" id="ip-risk-val">0%</span>
      </div>
    </div>
    <div id="ip-text" class="ip-text"></div>
  </div>
</div>`;

    // ── Button wiring ──────────────────────────────────────────────────────
    document.getElementById('btn-yolo')!.addEventListener('click', () => this.callbacks.onYolo());
    document.getElementById('btn-stabilise')!.addEventListener('click', () => this.callbacks.onStabilise());
    document.getElementById('btn-manipulate')!.addEventListener('click', () => this.callbacks.onShowManipulateModal());
    document.getElementById('btn-intel')!.addEventListener('click', () => this.callbacks.onShowMarketIntel());
    document.getElementById('modal-close')!.addEventListener('click', () => this.hideModal());
    document.getElementById('intel-close')!.addEventListener('click', () => this.hideIntelModal());
    document.getElementById('ip-close')!.addEventListener('click', () => this.hideInsightPanel());
    document.getElementById('insight-bg')!.addEventListener('click', () => this.hideInsightPanel());
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
      if (isOpen) { this.newsExpandedIds.delete(id); body.classList.add('hidden'); btn.textContent = '▼ Details'; }
      else         { this.newsExpandedIds.add(id);    body.classList.remove('hidden'); btn.textContent = '▲ Hide'; }
    });
    document.getElementById('btn-dark')!.addEventListener('click', () => this.callbacks.onDarkModeToggle());
    document.getElementById('btn-skip-day')!.addEventListener('click', () => this.callbacks.onSkipDay());
    document.getElementById('btn-prestige')!.addEventListener('click', () => this.callbacks.onPrestige());
    document.getElementById('btn-clear')!.addEventListener('click', () => {
      if (confirm('Reset ALL progress? This cannot be undone.')) this.callbacks.onClearSave();
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

  // ── Main update (called every tick) ──────────────────────────────────────

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
  ): void {
    if (newsSystem) this.storedNewsSystem = newsSystem;
    this.currentDay = day;
    this.currentSecInDay = secondsInDay;
    this.currentSecPerDay = secondsPerDay;
    this.updateHeader(player, market, upgradeSystem, day);
    this.updateMarket(market, player, upgradeSystem, day);
    this.updatePortfolio(market);
    this.updateNews(newsSystem, day, secondsInDay, secondsPerDay);
    this.updateEvents(eventSystem, upgradeSystem, day, secondsInDay, secondsPerDay);
    this.updateUpgrades(upgradeSystem, player, market);
    this.updateFooter(player, tick, day);
    if (this.openInsightId) this.refreshInsightPanel(market);
    this.drainToasts();
  }

  // ── Header ────────────────────────────────────────────────────────────────

  private updateHeader(player: Player, market: Market, upgradeSystem: UpgradeSystem, day: number): void {
    document.getElementById('stat-day')!.textContent = String(day + 1);
    const cashEl = document.getElementById('stat-cash')!;
    cashEl.textContent = formatCurrency(player.cash);
    cashEl.className = 'stat-value ' + (player.cash > 2000 ? 'green' : player.cash < 200 ? 'red' : '');
    document.getElementById('stat-networth')!.textContent = formatCurrency(player.getNetWorth(market));
    document.getElementById('stat-portfolio')!.textContent = formatCurrency(player.getPortfolioValue(market));
    if (upgradeSystem.prestigeCount > 0) {
      document.getElementById('prestige-block')!.classList.remove('hidden');
      document.getElementById('stat-multiplier')!.textContent = `×${upgradeSystem.getEarningsMultiplier()}`;
    }
  }

  // ── Market panel ──────────────────────────────────────────────────────────

  private updateMarket(market: Market, player: Player, upgradeSystem: UpgradeSystem, day: number): void {
    const container = document.getElementById('asset-list')!;
    const unlocked = market.getUnlockedAssets();

    if (unlocked.length !== this.lastUnlockedCount) {
      this.lastUnlockedCount = unlocked.length;
      container.innerHTML = '';
      for (const asset of unlocked) container.appendChild(this.buildAssetRow(asset));
    }

    for (const asset of unlocked) {
      const row = container.querySelector(`[data-id="${asset.id}"]`) as HTMLElement | null;
      if (!row) continue;

      // ── Price display + flash ──────────────────────────────────────────
      const priceEl = row.querySelector('.asset-price') as HTMLElement;
      const prev = this.lastPrices.get(asset.id) ?? asset.price;
      const delta = (asset.price - prev) / prev;
      if (Math.abs(delta) > 0.008) {
        flashPrice(priceEl, delta > 0 ? 'up' : 'down');
        this.lastPrices.set(asset.id, asset.price);
      }
      priceEl.textContent = formatCurrency(asset.price);

      const pct = asset.getPriceChangePct();
      const changeEl = row.querySelector('.asset-change') as HTMLElement;
      changeEl.textContent = formatPct(pct);
      changeEl.className = 'asset-change ' + (pct >= 0 ? 'green' : 'red');

      // ── Live indicators: hype bar + momentum arrow ─────────────────────
      const hypeFill = row.querySelector('.ind-hype-fill') as HTMLElement;
      if (hypeFill) hypeFill.style.width = `${Math.round(asset.hype * 100)}%`;

      const momEl = row.querySelector('.mom-arrow') as HTMLElement;
      if (momEl) {
        const arrow = getMomentumArrow(asset.momentum);
        momEl.textContent = arrow;
        const isUp = asset.momentum > 0.006;
        const isDown = asset.momentum < -0.006;
        momEl.className = `mom-arrow ${isUp ? 'green' : isDown ? 'red' : 'muted'} ${Math.abs(asset.momentum) > 0.02 ? 'mom-strong' : ''}`;
      }

      // ── Risk flicker + hype glow (CSS-driven, just toggle classes) ─────
      row.classList.toggle('risk-high', asset.risk > 0.68);
      row.classList.toggle('hype-high', asset.hype > 0.65);

      // ── Insider AI arrows ──────────────────────────────────────────────
      const trendEl = row.querySelector('.asset-trend') as HTMLElement | null;
      if (trendEl) {
        if (upgradeSystem.hasPurchased('insider_ai')) {
          trendEl.classList.remove('hidden');
          const t = asset.trend + asset.trendBoost;
          trendEl.textContent = t > 0.003 ? '▲▲' : t > 0 ? '▲' : t < -0.003 ? '▼▼' : '▼';
          trendEl.className = 'asset-trend ' + (t >= 0 ? 'green' : 'red');
        } else {
          trendEl.classList.add('hidden');
        }
      }

      // ── Buy/sell button states ─────────────────────────────────────────
      const maxBuy = Math.floor(player.cash / asset.price);
      const maxBtn = row.querySelector('.btn-max') as HTMLButtonElement;
      maxBtn.textContent = `Max (${maxBuy})`;
      maxBtn.disabled = maxBuy === 0;
      const sellAllBtn = row.querySelector('.btn-sell-all') as HTMLButtonElement;
      sellAllBtn.textContent = `All (${asset.owned})`;
      sellAllBtn.disabled = asset.owned === 0;

      const ownedEl = row.querySelector('.asset-owned') as HTMLElement;
      ownedEl.textContent = asset.owned > 0 ? `Own: ${asset.owned}` : '';

      // ── Chain / news line ──────────────────────────────────────────────────
      const newsLine = row.querySelector<HTMLElement>('.asset-news-line');
      if (newsLine && this.storedNewsSystem) {
        const chainNews = this.storedNewsSystem.getActive()
          .filter(n => n.targetAssetId === asset.id && n.chainInfo);
        if (chainNews.length > 0) {
          const cn = chainNews[0];
          const ci = cn.chainInfo!;
          const daysLeft = cn.triggerDay - day;
          const dayStr = daysLeft <= 1 ? 'today' : `${daysLeft}d`;
          newsLine.textContent = `🔗 ${ci.chainTitle} (${ci.stepIndex + 1}/${ci.totalSteps}): "${cn.headline}" — ${dayStr}`;
          newsLine.classList.remove('hidden');
        } else {
          newsLine.classList.add('hidden');
        }
      }
    }
  }

  private buildAssetRow(asset: Asset): HTMLElement {
    const row = createEl('div', 'asset-row');
    row.dataset.id = asset.id;

    row.innerHTML = `
      <div class="asset-meta">
        <div class="asset-name-row">
          <span class="asset-emoji">${asset.emoji}</span>
          <span class="asset-name">${asset.name}</span>
          <span class="asset-trend hidden"></span>
          <button class="btn-analyse btn-icon" title="Analyse ${asset.name}">🔍</button>
          <span class="asset-owned"></span>
        </div>
        <div class="asset-news-line hidden"></div>
        <div class="asset-indicators">
          <div class="ind-item" title="Hype — decays over time, boosts price when high">
            <span class="ind-icon">🔥</span>
            <div class="ind-bar"><div class="ind-fill ind-hype-fill"></div></div>
          </div>
          <div class="ind-item" title="Momentum — direction of recent price movement">
            <span class="ind-icon">📈</span>
            <span class="mom-arrow muted">→</span>
          </div>
          <div class="ind-item" title="Stability — resistance to crashes (static)">
            <span class="ind-icon">🛡</span>
            <div class="ind-bar"><div class="ind-fill ind-stab-fill"></div></div>
          </div>
          <div class="ind-item" title="Risk — chance of extreme price shocks (static)">
            <span class="ind-icon">🎲</span>
            <div class="ind-bar"><div class="ind-fill ind-risk-fill"></div></div>
          </div>
        </div>
      </div>
      <div class="asset-price-col">
        <span class="asset-price">$0.00</span>
        <span class="asset-change green">+0.00%</span>
      </div>
      <div class="asset-btns">
        <input class="qty-input" type="number" min="1" value="1" />
        <button class="btn btn-buy btn-sm">Buy</button>
        <button class="btn btn-sell btn-sm">Sell</button>
        <button class="btn btn-max btn-sm">Max</button>
        <button class="btn btn-sell-all btn-sm">All</button>
      </div>
    `;

    // Set static indicator bars once (stability + risk never change)
    (row.querySelector('.ind-stab-fill') as HTMLElement).style.width = `${asset.stability * 100}%`;
    (row.querySelector('.ind-risk-fill') as HTMLElement).style.width  = `${asset.risk * 100}%`;
    // Initial hype bar
    (row.querySelector('.ind-hype-fill') as HTMLElement).style.width  = `${asset.hype * 100}%`;

    const qtyInput = row.querySelector('.qty-input') as HTMLInputElement;
    row.querySelector('.btn-buy')!.addEventListener('click', () => {
      const qty = parseInt(qtyInput.value, 10);
      if (qty > 0) {
        pulseElement(row.querySelector('.btn-buy') as HTMLElement);
        this.callbacks.onBuy(asset.id, qty);
      }
    });
    row.querySelector('.btn-sell')!.addEventListener('click', () => {
      const qty = parseInt(qtyInput.value, 10);
      if (qty > 0) {
        pulseElement(row.querySelector('.btn-sell') as HTMLElement);
        this.callbacks.onSell(asset.id, qty);
      }
    });
    row.querySelector('.btn-max')!.addEventListener('click', () => {
      pulseElement(row.querySelector('.btn-max') as HTMLElement);
      this.callbacks.onBuyMax(asset.id);
    });
    row.querySelector('.btn-sell-all')!.addEventListener('click', () => {
      pulseElement(row.querySelector('.btn-sell-all') as HTMLElement);
      this.callbacks.onSellAll(asset.id);
    });
    row.querySelector('.btn-analyse')!.addEventListener('click', (e) => {
      e.stopPropagation();
      // Dispatch upward; main wires this via showInsightPanel
      const ev = new CustomEvent('open-insight', { detail: asset.id, bubbles: true });
      row.dispatchEvent(ev);
    });

    return row;
  }

  // ── Portfolio ─────────────────────────────────────────────────────────────

  private updatePortfolio(market: Market): void {
    const container = document.getElementById('portfolio-list')!;
    const owned = market.getAllAssets().filter(a => a.owned > 0);

    document.getElementById('portfolio-total')!.textContent = formatCurrency(
      owned.reduce((s, a) => s + a.getValue(), 0),
    );

    if (owned.length === 0) {
      container.innerHTML = '<p class="empty-msg">No positions yet. Buy something!</p>';
      return;
    }

    container.innerHTML = '';
    for (const asset of owned) {
      const pct = asset.getPriceChangePct();
      const arrow = getMomentumArrow(asset.momentum);
      const isUp = asset.momentum > 0.006;
      const isDown = asset.momentum < -0.006;
      const row = createEl('div', 'portfolio-row');
      row.innerHTML = `
        <span class="p-name">${asset.emoji} ${asset.name}</span>
        <span class="p-qty">${asset.owned}×</span>
        <span class="p-value">${formatCurrency(asset.getValue())}</span>
        <span class="p-change ${pct >= 0 ? 'green' : 'red'}">${formatPct(pct)}</span>
        <span class="p-mom ${isUp ? 'green' : isDown ? 'red' : 'muted'}">${arrow}</span>
      `;
      container.appendChild(row);
    }
  }

  // ── News panel ───────────────────────────────────────────────────────────

  private updateNews(
    newsSystem: NewsSystem | undefined,
    day: number,
    secondsInDay: number,
    secondsPerDay: number,
  ): void {
    if (!newsSystem) return;

    // ── "Next news in" timer ───────────────────────────────────────────────
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

    // ── Compact panel ─────────────────────────────────────────────────────
    const container = document.getElementById('news-list')!;
    const countEl   = document.getElementById('news-active-count')!;
    const active    = newsSystem.getActive();
    countEl.textContent = active.length === 0 ? '0 pending' : `${active.length} pending`;

    const sorted = [...active].sort((a, b) => a.triggerDay - b.triggerDay);
    const newKey = sorted.map(n => n.id).join('|');

    if (newKey !== this.newsActiveKey) {
      this.newsActiveKey = newKey;
      container.innerHTML = '';
      if (active.length === 0) {
        container.innerHTML = '<p class="empty-msg">No active news. Check back later...</p>';
      } else {
        for (const item of sorted) {
          const card = this.buildNewsCard(item, day, secondsInDay, secondsPerDay);
          container.appendChild(card);
          requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('news-enter')));
        }
      }
    } else {
      const cards = container.querySelectorAll<HTMLElement>('.news-item[data-news-id]');
      cards.forEach((card, i) => {
        if (sorted[i]) this.refreshNewsCountdown(card, sorted[i], day, secondsInDay, secondsPerDay);
      });
    }

    // ── Full news page: refresh if open ───────────────────────────────────
    if (this.newsPageOpen) {
      const allKey = newsSystem.getAll().map(n => `${n.id}:${String(n.resolved)}`).join('|');
      if (allKey !== this.newsPageKey) {
        this.newsPageKey = allKey;
        this.renderNewsPage();
      } else {
        this.refreshNewsPageCountdowns();
      }
    }
  }

  private buildNewsCard(item: NewsItem, day: number, secondsInDay: number, secondsPerDay: number): HTMLElement {
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
      <div class="news-countdown ${urgencyCls}" data-countdown>⏳ ${dayLabel} (${timeStr})</div>
    `;
    return el;
  }

  private refreshNewsCountdown(el: HTMLElement, item: NewsItem, day: number, secondsInDay: number, secondsPerDay: number): void {
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

    // Only update urgency class if it changed
    const baseClass = `news-item ${urgencyCls}`;
    if (el.className !== baseClass) el.className = baseClass;
    el.dataset.newsId = item.id;

    const cdEl = el.querySelector<HTMLElement>('[data-countdown]');
    if (cdEl) {
      cdEl.textContent = `⏳ ${dayLabel} (${timeStr})`;
      cdEl.className = `news-countdown ${urgencyCls}`;
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  private updateEvents(
    eventSystem: EventSystem,
    upgradeSystem: UpgradeSystem,
    day: number,
    secondsInDay: number,
    secondsPerDay: number,
  ): void {
    const badge = document.getElementById('next-event-badge')!;
    const hintBar = document.getElementById('event-hint-bar')!;
    const skipBtn = document.getElementById('btn-skip-day') as HTMLButtonElement;

    const nextDays = eventSystem.getNextEventInDays();
    // Total seconds remaining until event fires
    const secsRemaining = (nextDays - 1) * secondsPerDay + (secondsPerDay - secondsInDay);
    const mm = Math.floor(secsRemaining / 60);
    const ss = secsRemaining % 60;
    const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`;
    const dayLabel = nextDays === 1 ? 'today' : `${nextDays} days`;
    badge.textContent = `⏳ ${dayLabel} (${timeStr})`;

    // Urgency classes
    const imminent = nextDays === 1 && secsRemaining <= 15;
    const soon     = nextDays <= 2 && !imminent;
    badge.classList.toggle('event-imminent', imminent);
    badge.classList.toggle('event-soon', soon && !imminent);
    badge.classList.remove(imminent ? 'event-soon' : 'event-imminent');

    // Skip day button disabled state
    skipBtn.disabled = false;
    skipBtn.title = 'Skip to next day instantly ($150)';

    // Bloomberg hint bar
    if (upgradeSystem.hasPurchased('bloomberg')) {
      hintBar.classList.remove('hidden');
      const hamster = upgradeSystem.hasPurchased('prediction_hamster');
      const prefix = hamster ? '🐹 Hamster senses:' : '📰 Intel:';
      hintBar.textContent = `${prefix} ${eventSystem.getHintText()}`;
      hintBar.className = `event-hint-bar ${hamster ? 'hint-hamster' : 'hint-bloomberg'}`;
    } else {
      hintBar.classList.add('hidden');
    }

    // ── Event log (only rebuild when new entry arrives) ────────────────────
    const log = eventSystem.getLog();
    if (log.length === 0 || log[0].id === this.lastLogId) return;
    this.lastLogId = log[0].id;

    const container = document.getElementById('event-log')!;
    container.innerHTML = '';
    for (const entry of log) {
      const el = createEl('div', `event-entry sev-${entry.severity}`);
      el.appendChild(createEl('span', 'event-msg', entry.message));
      el.appendChild(createEl('span', 'event-time', timeAgo(entry.timestamp)));
      container.appendChild(el);
    }
  }

  // ── Event popup (floating, separate from log) ─────────────────────────────

  showEventPopup(entry: EventLogEntry): void {
    const area = document.getElementById('event-popup-area');
    if (!area) return;

    // Cap at 3 stacked popups
    const existing = area.querySelectorAll('.event-popup');
    if (existing.length >= 3) existing[0].remove();

    const popup = createEl('div', `event-popup popup-${entry.severity}`);
    popup.textContent = entry.message;
    area.appendChild(popup);

    // Two-frame flush to trigger transition
    requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add('visible')));

    setTimeout(() => {
      popup.classList.remove('visible');
      popup.classList.add('dismissing');
      setTimeout(() => popup.remove(), 380);
    }, 4200);
  }

  // ── Upgrades ──────────────────────────────────────────────────────────────

  private updateUpgrades(upgradeSystem: UpgradeSystem, player: Player, market: Market): void {
    const purchased = upgradeSystem.getPurchasedUpgrades();
    if (purchased.length !== this.lastUpgradeCount) {
      this.lastUpgradeCount = purchased.length;
      this.buildUpgradeList(upgradeSystem);
    }
    this.refreshUpgradeButtons(upgradeSystem, player, market);
    if (upgradeSystem.hasPurchased('prestige_chip')) {
      document.getElementById('btn-prestige')!.classList.remove('hidden');
    }
  }

  private buildUpgradeList(upgradeSystem: UpgradeSystem): void {
    const container = document.getElementById('upgrade-list')!;
    container.innerHTML = '';
    for (const upg of upgradeSystem.getAllUpgrades()) {
      if (upgradeSystem.hasPurchased(upg.id)) {
        const card = createEl('div', 'upgrade-card owned');
        card.innerHTML = `
          <div class="upg-info">
            <span class="upg-name">${upg.emoji} ${upg.name}</span>
            <span class="upg-desc">${upg.description}</span>
          </div>
          <span class="upg-owned-badge">OWNED</span>`;
        container.appendChild(card);
      } else {
        const card = createEl('div', 'upgrade-card');
        card.innerHTML = `
          <div class="upg-info">
            <span class="upg-name">${upg.emoji} ${upg.name}</span>
            <span class="upg-desc">${upg.description}</span>
          </div>
          <button class="btn btn-buy-upg" data-upg-id="${upg.id}">${formatCurrency(upg.cost)}</button>`;
        card.querySelector<HTMLButtonElement>('.btn-buy-upg')!.addEventListener('click', () => {
          this.callbacks.onBuyUpgrade(upg.id);
          this.lastUpgradeCount = -1;
        });
        container.appendChild(card);
      }
    }
  }

  private refreshUpgradeButtons(upgradeSystem: UpgradeSystem, player: Player, market: Market): void {
    const container = document.getElementById('upgrade-list')!;
    const netWorth = player.getNetWorth(market);
    for (const btn of container.querySelectorAll<HTMLButtonElement>('.btn-buy-upg')) {
      const id = btn.dataset.upgId!;
      const upg = upgradeSystem.getAllUpgrades().find(u => u.id === id);
      if (!upg) continue;
      const meetsThreshold = netWorth >= upg.unlockThreshold;
      const canAfford = player.cash >= upg.cost;
      btn.disabled = !meetsThreshold || !canAfford;
      if (!meetsThreshold) {
        btn.textContent = `🔒 Need ${formatCurrency(upg.unlockThreshold)} NW`;
        btn.classList.add('locked');
      } else if (!canAfford) {
        btn.textContent = `${formatCurrency(upg.cost)} (need ${formatCurrency(upg.cost - player.cash)} more)`;
        btn.classList.remove('locked');
      } else {
        btn.textContent = formatCurrency(upg.cost);
        btn.classList.remove('locked');
      }
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  private updateFooter(player: Player, tick: number, day: number): void {
    document.getElementById('footer-stats')!.textContent =
      `Day: ${day} · Trades: ${player.tradeCount} · Tick: ${tick} · Earned: ${formatCurrency(player.totalEarned)}`;
  }

  // ── Insight panel ─────────────────────────────────────────────────────────

  showInsightPanel(assetId: string, market: Market): void {
    const asset = market.getAsset(assetId);
    if (!asset) return;
    this.openInsightId = assetId;

    document.getElementById('ip-emoji')!.textContent = asset.emoji;
    document.getElementById('ip-name')!.textContent  = asset.name;
    document.getElementById('ip-price')!.textContent = formatCurrency(asset.price);

    // Reset fills to 0 so the CSS transition animates from zero on open
    this.setIpFill('ip-hype-fill',  0);
    this.setIpFill('ip-stab-fill',  0);
    this.setIpFill('ip-risk-fill',  0);
    this.setIpFill('ip-mom-fill',   0);

    // Show panel first so the element has dimensions, then animate fills
    document.getElementById('insight-bg')!.classList.add('visible');
    document.getElementById('insight-panel')!.classList.add('visible');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.setIpFill('ip-hype-fill', asset.hype * 100);
        this.setIpFill('ip-stab-fill', asset.stability * 100);
        this.setIpFill('ip-risk-fill', asset.risk * 100);
        // Momentum: 50% = neutral; >50% = positive (green), <50% = negative (red)
        const momPct = ((asset.momentum / 0.05 + 1) / 2) * 100;
        this.setIpFill('ip-mom-fill', Math.max(0, Math.min(100, momPct)));
        document.getElementById('ip-hype-val')!.textContent = `${(asset.hype * 100).toFixed(0)}%`;
        document.getElementById('ip-stab-val')!.textContent = `${(asset.stability * 100).toFixed(0)}%`;
        document.getElementById('ip-risk-val')!.textContent = `${(asset.risk * 100).toFixed(0)}%`;
        document.getElementById('ip-mom-val')!.textContent  = getMomentumArrow(asset.momentum);
        document.getElementById('ip-text')!.textContent     = getInsightText(asset);
      });
    });
  }

  private refreshInsightPanel(market: Market): void {
    if (!this.openInsightId) return;
    const asset = market.getAsset(this.openInsightId);
    if (!asset) return;

    document.getElementById('ip-price')!.textContent = formatCurrency(asset.price);
    this.setIpFill('ip-hype-fill', asset.hype * 100);
    const momPct = ((asset.momentum / 0.05 + 1) / 2) * 100;
    this.setIpFill('ip-mom-fill', Math.max(0, Math.min(100, momPct)));
    document.getElementById('ip-hype-val')!.textContent = `${(asset.hype * 100).toFixed(0)}%`;
    document.getElementById('ip-mom-val')!.textContent  = getMomentumArrow(asset.momentum);
    document.getElementById('ip-text')!.textContent     = getInsightText(asset);
  }

  hideInsightPanel(): void {
    this.openInsightId = null;
    document.getElementById('insight-panel')!.classList.remove('visible');
    document.getElementById('insight-bg')!.classList.remove('visible');
  }

  private setIpFill(cls: string, pct: number): void {
    const el = document.querySelector(`.${cls}`) as HTMLElement | null;
    if (el) el.style.width = `${pct}%`;
  }

  // ── Trade animation (float text + button pulse) ───────────────────────────

  animateTrade(assetId: string, text: string, type: 'up' | 'down'): void {
    const row = document.querySelector(`[data-id="${assetId}"] .asset-price`) as HTMLElement | null;
    if (row) spawnFloatingText(row, text, type);
  }

  // ── Manipulate modal ──────────────────────────────────────────────────────

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

  hideModal(): void {
    document.getElementById('modal-overlay')!.classList.add('hidden');
  }

  // ── Market Intel modal with scanner animation ─────────────────────────────

  showMarketIntel(market: Market): void {
    const overlay = document.getElementById('intel-overlay')!;
    const content = document.getElementById('intel-content')!;
    overlay.classList.remove('hidden');
    content.innerHTML = '';

    const unlocked = market.getAllAssets().filter(a => a.isUnlocked);
    const locked   = market.getAllAssets().filter(a => !a.isUnlocked);

    if (unlocked.length) {
      content.appendChild(createEl('div', 'intel-section-label', '🔓 Active Market'));
      for (const asset of unlocked) content.appendChild(this.buildIntelRow(asset, false));
    }
    if (locked.length) {
      content.appendChild(createEl('div', 'intel-section-label', '🔒 Locked Assets — Intel Preview'));
      for (const asset of locked) content.appendChild(this.buildIntelRow(asset, true));
    }

    // ── Scanner sweep + staggered row reveals ─────────────────────────────
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

    // Remove scanner element after sweep finishes
    setTimeout(() => scanner.remove(), 1800);
  }

  private buildIntelRow(asset: Asset, isLocked: boolean): HTMLElement {
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

  hideIntelModal(): void {
    document.getElementById('intel-overlay')!.classList.add('hidden');
  }

  // ── Full news page ────────────────────────────────────────────────────────

  showNewsPage(): void {
    this.newsPageOpen = true;
    document.getElementById('news-page-overlay')!.classList.remove('hidden');
    this.newsPageKey = '';  // force full render
    this.renderNewsPage();
  }

  hideNewsPage(): void {
    this.newsPageOpen = false;
    document.getElementById('news-page-overlay')!.classList.add('hidden');
  }

  private setNewsPageFilter(filter: 'all' | 'active' | 'chains' | 'resolved'): void {
    this.newsPageFilter = filter;
    document.querySelectorAll<HTMLElement>('#np-filters .np-filter-btn').forEach(btn => {
      btn.classList.toggle('np-filter-active', btn.dataset.filter === filter);
    });
    this.renderNewsPage();
  }

  private renderNewsPage(): void {
    const feed = document.getElementById('np-feed')!;
    const ns   = this.storedNewsSystem;
    if (!ns) { feed.innerHTML = '<p class="empty-msg">No data yet.</p>'; return; }

    let all = ns.getAll();
    if (this.newsPageFilter === 'active')   all = all.filter(n => !n.resolved);
    if (this.newsPageFilter === 'chains')   all = all.filter(n => !!n.chainInfo);
    if (this.newsPageFilter === 'resolved') all = all.filter(n => n.resolved);

    const active   = all.filter(n => !n.resolved).sort((a, b) => a.triggerDay - b.triggerDay);
    const resolved = all.filter(n => n.resolved).reverse();

    if (active.length === 0 && resolved.length === 0) {
      feed.innerHTML = '<p class="empty-msg">Nothing to show. Trade more to generate news!</p>';
      return;
    }

    feed.innerHTML = '';

    if (this.newsPageFilter === 'chains' && active.length > 0) {
      // Group chain items by chainId
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
        for (const item of sorted) feed.appendChild(this.buildDetailedCard(item));
      }
      return;
    }

    if (active.length > 0) {
      feed.appendChild(createEl('div', 'np-section-label', `⏳ Upcoming — ${active.length} active`));
      for (const item of active) feed.appendChild(this.buildDetailedCard(item));
    }
    if (resolved.length > 0) {
      feed.appendChild(createEl('div', 'np-section-label', `📁 Archive — ${resolved.length} resolved`));
      for (const item of resolved) feed.appendChild(this.buildDetailedCard(item));
    }

    // Restore expanded states
    for (const id of this.newsExpandedIds) {
      const body = document.getElementById(`npbody-${id}`);
      if (!body) continue;
      body.classList.remove('hidden');
      const btn = feed.querySelector<HTMLElement>(`[data-expand-id="${id}"]`);
      if (btn) btn.textContent = '▲ Hide';
    }
  }

  private buildDetailedCard(item: NewsItem): HTMLElement {
    const ti  = NEWS_TYPE_INFO[item.type] ?? { icon: '📰', label: 'NEWS', cls: 'nt-default' };
    const pct = Math.round(item.successChance * 100);

    // Status label + class
    let statusCls = 'np-status-active', statusTxt = '⏳ UPCOMING';
    if (!item.resolved) {
      const dl = item.triggerDay - this.currentDay;
      const sl = Math.max(0, (dl - 1) * this.currentSecPerDay + (this.currentSecPerDay - this.currentSecInDay));
      if (dl <= 1 && sl <= 15)  { statusCls = 'np-status-imminent'; statusTxt = '🔴 IMMINENT'; }
      else if (dl <= 1)          { statusCls = 'np-status-urgent';   statusTxt = '⚠️ URGENT'; }
    } else {
      statusCls = item.resolvedSuccess ? 'np-status-success' : 'np-status-fail';
      statusTxt = item.resolvedSuccess ? '✅ SUCCESS' : '❌ FAILED';
    }

    // Card urgency class
    let cardCls = 'np-card';
    if (!item.resolved) {
      const dl = item.triggerDay - this.currentDay;
      const sl = Math.max(0, (dl - 1) * this.currentSecPerDay + (this.currentSecPerDay - this.currentSecInDay));
      cardCls += dl <= 1 && sl <= 15 ? ' np-card-imminent' : dl <= 1 ? ' np-card-urgent' : ' np-card-active';
      if (item.chainInfo) cardCls += ' np-card-chain';
    } else {
      cardCls += item.resolvedSuccess ? ' np-card-success' : ' np-card-fail';
    }

    // Chain strip
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

    // Countdown (active only)
    let cdHtml = '';
    if (!item.resolved) {
      const dl = item.triggerDay - this.currentDay;
      const sl = Math.max(0, (dl - 1) * this.currentSecPerDay + (this.currentSecPerDay - this.currentSecInDay));
      const mm = Math.floor(sl / 60), ss = sl % 60;
      const lab = dl <= 1 ? 'today' : `${dl} days`;
      cdHtml = `<span class="np-dot">·</span><span class="np-card-countdown" data-countdown data-trigger-day="${item.triggerDay}">⏳ ${lab} (${mm}:${ss.toString().padStart(2, '0')})</span>`;
    }

    // Impact preview
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

  private refreshNewsPageCountdowns(): void {
    const els = document.querySelectorAll<HTMLElement>('#np-feed [data-countdown]');
    for (const el of els) {
      const trigDay = parseInt(el.dataset.triggerDay ?? '0', 10);
      const dl = trigDay - this.currentDay;
      const sl = Math.max(0, (dl - 1) * this.currentSecPerDay + (this.currentSecPerDay - this.currentSecInDay));
      const mm = Math.floor(sl / 60), ss = sl % 60;
      const lab = dl <= 1 ? 'today' : `${dl} days`;
      el.textContent = `⏳ ${lab} (${mm}:${ss.toString().padStart(2, '0')})`;
    }
  }

  // ── Toasts ────────────────────────────────────────────────────────────────

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

  // ── Dark mode ─────────────────────────────────────────────────────────────

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    document.body.className = this.darkMode ? 'dark' : 'light';
    document.getElementById('btn-dark')!.textContent = this.darkMode ? '🌙' : '☀️';
  }
}
