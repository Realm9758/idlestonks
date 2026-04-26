import type { Market } from '../core/Market.ts';
import type { Player } from '../core/Player.ts';
import type { EventSystem, EventLogEntry } from '../core/EventSystem.ts';
import type { UpgradeSystem } from '../systems/UpgradeSystem.ts';
import { formatCurrency, formatPct, timeAgo, createEl } from './components.ts';

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
}

interface Toast {
  el: HTMLElement;
  removeAt: number;
}

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
  'Market volatility described as "normal" by man with no face',
  'CatCoin whale moves 69,420 tokens; Reddit explodes',
  'Influencer Stock gains after posting "authentic" sponsored content about authenticity',
  "Doge's Cousin discovers uncle Doge is actually a hedge fund manager",
  'Breaking: Market does market thing; analysts uncertain; more at 11',
  'Government prints more money; Stonks Only Up engineers thrilled',
  'Quantum Banana enters superposition; investors unsure whether to cry',
];

export class Renderer {
  private callbacks: RenderCallbacks;
  private toasts: Toast[] = [];
  private tickerIndex = 0;
  private lastUnlockedCount = -1;
  private lastUpgradeCount = -1;
  private lastLogId = -1;
  private darkMode = true;

  constructor(callbacks: RenderCallbacks) {
    this.callbacks = callbacks;
    this.buildLayout();
    this.startTicker();
  }

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
      <button id="btn-dark" class="btn-icon" title="Toggle dark mode">🌙</button>
    </div>
  </header>

  <div id="ticker-bar">
    <span class="ticker-label">📡 BREAKING</span>
    <div class="ticker-wrap"><span id="ticker-text"></span></div>
  </div>

  <div id="toast-area"></div>

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

      <div id="events-panel" class="panel">
        <div class="panel-header">
          <h2>📰 Events</h2>
          <span id="next-event-badge" class="timer-badge hidden">⏱ --s</span>
        </div>
        <div id="event-log"><p class="empty-msg">Waiting for chaos...</p></div>
      </div>

      <div id="upgrades-panel" class="panel">
        <div class="panel-header">
          <h2>⚙️ Upgrades</h2>
        </div>
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
</div>`;

    document.getElementById('btn-yolo')!.addEventListener('click', () => this.callbacks.onYolo());
    document.getElementById('btn-stabilise')!.addEventListener('click', () => this.callbacks.onStabilise());
    document.getElementById('btn-manipulate')!.addEventListener('click', () => this.callbacks.onShowManipulateModal());
    document.getElementById('modal-close')!.addEventListener('click', () => this.hideModal());
    document.getElementById('modal-overlay')!.addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.hideModal();
    });
    document.getElementById('btn-dark')!.addEventListener('click', () => this.callbacks.onDarkModeToggle());
    document.getElementById('btn-prestige')!.addEventListener('click', () => this.callbacks.onPrestige());
    document.getElementById('btn-clear')!.addEventListener('click', () => {
      if (confirm('Reset ALL progress? This cannot be undone.')) this.callbacks.onClearSave();
    });
  }

  private startTicker(): void {
    const el = document.getElementById('ticker-text')!;
    const next = () => {
      el.textContent = NEWS_HEADLINES[this.tickerIndex % NEWS_HEADLINES.length];
      this.tickerIndex++;
    };
    next();
    setInterval(next, 8000);
  }

  // ── Main update ──────────────────────────────────────────────────────────

  update(
    market: Market,
    player: Player,
    eventSystem: EventSystem,
    upgradeSystem: UpgradeSystem,
    tick: number,
  ): void {
    this.updateHeader(player, market, upgradeSystem);
    this.updateMarket(market, player, upgradeSystem);
    this.updatePortfolio(market);
    this.updateEvents(eventSystem, upgradeSystem);
    this.updateUpgrades(upgradeSystem, player, market);
    this.updateFooter(player, tick);
    this.drainToasts();
  }

  // ── Header ───────────────────────────────────────────────────────────────

  private updateHeader(player: Player, market: Market, upgradeSystem: UpgradeSystem): void {
    const cash = player.cash;
    const netWorth = player.getNetWorth(market);
    const portfolio = player.getPortfolioValue(market);

    const cashEl = document.getElementById('stat-cash')!;
    cashEl.textContent = formatCurrency(cash);
    cashEl.className = 'stat-value ' + (cash > 2000 ? 'green' : cash < 200 ? 'red' : '');

    document.getElementById('stat-networth')!.textContent = formatCurrency(netWorth);
    document.getElementById('stat-portfolio')!.textContent = formatCurrency(portfolio);

    if (upgradeSystem.prestigeCount > 0) {
      document.getElementById('prestige-block')!.classList.remove('hidden');
      document.getElementById('stat-multiplier')!.textContent = `×${upgradeSystem.getEarningsMultiplier()}`;
    }
  }

  // ── Market panel ─────────────────────────────────────────────────────────

  private updateMarket(market: Market, player: Player, upgradeSystem: UpgradeSystem): void {
    const container = document.getElementById('asset-list')!;
    const unlockedAssets = market.getUnlockedAssets();

    if (unlockedAssets.length !== this.lastUnlockedCount) {
      this.lastUnlockedCount = unlockedAssets.length;
      container.innerHTML = '';
      for (const asset of unlockedAssets) {
        container.appendChild(this.buildAssetRow(asset.id, asset.name, asset.emoji, asset.description));
      }
    }

    for (const asset of unlockedAssets) {
      const row = container.querySelector(`[data-id="${asset.id}"]`) as HTMLElement | null;
      if (!row) continue;

      const pct = asset.getPriceChangePct();

      (row.querySelector('.asset-price') as HTMLElement).textContent = formatCurrency(asset.price);

      const changeEl = row.querySelector('.asset-change') as HTMLElement;
      changeEl.textContent = formatPct(pct);
      changeEl.className = 'asset-change ' + (pct >= 0 ? 'green' : 'red');

      // Trend arrow (Insider AI upgrade)
      const trendEl = row.querySelector('.asset-trend') as HTMLElement | null;
      if (trendEl) {
        if (upgradeSystem.hasPurchased('insider_ai')) {
          trendEl.classList.remove('hidden');
          const effectiveTrend = asset.trend + asset.trendBoost;
          trendEl.textContent = effectiveTrend > 0.002 ? '▲▲' : effectiveTrend > 0 ? '▲' : effectiveTrend < -0.002 ? '▼▼' : '▼';
          trendEl.className = 'asset-trend ' + (effectiveTrend >= 0 ? 'green' : 'red');
        } else {
          trendEl.classList.add('hidden');
        }
      }

      const maxBuy = Math.floor(player.cash / asset.price);
      const maxBuyBtn = row.querySelector('.btn-max') as HTMLButtonElement;
      maxBuyBtn.textContent = `Max (${maxBuy})`;
      maxBuyBtn.disabled = maxBuy === 0;

      const sellAllBtn = row.querySelector('.btn-sell-all') as HTMLButtonElement;
      sellAllBtn.textContent = `All (${asset.owned})`;
      sellAllBtn.disabled = asset.owned === 0;

      const ownedEl = row.querySelector('.asset-owned') as HTMLElement;
      ownedEl.textContent = asset.owned > 0 ? `Own: ${asset.owned}` : '';
    }
  }

  private buildAssetRow(id: string, name: string, emoji: string, description: string): HTMLElement {
    const row = createEl('div', 'asset-row');
    row.dataset.id = id;

    row.innerHTML = `
      <div class="asset-meta">
        <div class="asset-name-row">
          <span class="asset-emoji">${emoji}</span>
          <span class="asset-name">${name}</span>
          <span class="asset-trend hidden"></span>
          <span class="asset-owned"></span>
        </div>
        <div class="asset-desc">${description}</div>
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

    const qtyInput = row.querySelector('.qty-input') as HTMLInputElement;
    row.querySelector('.btn-buy')!.addEventListener('click', () => {
      const qty = parseInt(qtyInput.value, 10);
      if (qty > 0) this.callbacks.onBuy(id, qty);
    });
    row.querySelector('.btn-sell')!.addEventListener('click', () => {
      const qty = parseInt(qtyInput.value, 10);
      if (qty > 0) this.callbacks.onSell(id, qty);
    });
    row.querySelector('.btn-max')!.addEventListener('click', () => this.callbacks.onBuyMax(id));
    row.querySelector('.btn-sell-all')!.addEventListener('click', () => this.callbacks.onSellAll(id));

    return row;
  }

  // ── Portfolio panel ──────────────────────────────────────────────────────

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
      const row = createEl('div', 'portfolio-row');
      row.innerHTML = `
        <span class="p-name">${asset.emoji} ${asset.name}</span>
        <span class="p-qty">${asset.owned}×</span>
        <span class="p-value">${formatCurrency(asset.getValue())}</span>
        <span class="p-change ${pct >= 0 ? 'green' : 'red'}">${formatPct(pct)}</span>
      `;
      container.appendChild(row);
    }
  }

  // ── Events panel ─────────────────────────────────────────────────────────

  private updateEvents(eventSystem: EventSystem, upgradeSystem: UpgradeSystem): void {
    const timerBadge = document.getElementById('next-event-badge')!;
    if (upgradeSystem.hasPurchased('bloomberg')) {
      timerBadge.classList.remove('hidden');
      timerBadge.textContent = `⏱ ${eventSystem.getNextEventIn()}s`;
    }

    const log = eventSystem.getLog();
    if (log.length === 0) return;
    if (log[0].id === this.lastLogId) return;
    this.lastLogId = log[0].id;

    const container = document.getElementById('event-log')!;
    container.innerHTML = '';
    for (const entry of log) {
      const el = createEl('div', `event-entry sev-${entry.severity}`);
      const msg = createEl('span', 'event-msg', entry.message);
      const ts = createEl('span', 'event-time', timeAgo(entry.timestamp));
      el.appendChild(msg);
      el.appendChild(ts);
      container.appendChild(el);
    }
  }

  // ── Upgrades panel ───────────────────────────────────────────────────────

  private updateUpgrades(upgradeSystem: UpgradeSystem, player: Player, market: Market): void {
    const purchased = upgradeSystem.getPurchasedUpgrades();

    // Rebuild DOM structure only when a new purchase happens
    if (purchased.length !== this.lastUpgradeCount) {
      this.lastUpgradeCount = purchased.length;
      this.buildUpgradeList(upgradeSystem);
    }

    // Update button disabled state every tick as cash changes
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
          <span class="upg-owned-badge">OWNED</span>
        `;
        container.appendChild(card);
      } else {
        const card = createEl('div', 'upgrade-card');
        card.innerHTML = `
          <div class="upg-info">
            <span class="upg-name">${upg.emoji} ${upg.name}</span>
            <span class="upg-desc">${upg.description}</span>
          </div>
          <button class="btn btn-buy-upg" data-upg-id="${upg.id}">
            ${formatCurrency(upg.cost)}
          </button>
        `;
        card.querySelector<HTMLButtonElement>('.btn-buy-upg')!.addEventListener('click', () => {
          this.callbacks.onBuyUpgrade(upg.id);
          this.lastUpgradeCount = -1; // force rebuild on next tick
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

      const canAfford = player.cash >= upg.cost;
      const meetsThreshold = netWorth >= upg.unlockThreshold;
      btn.disabled = !canAfford || !meetsThreshold;

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

  // ── Footer ───────────────────────────────────────────────────────────────

  private updateFooter(player: Player, tick: number): void {
    document.getElementById('footer-stats')!.textContent =
      `Trades: ${player.tradeCount} · Tick: ${tick} · Earned: ${formatCurrency(player.totalEarned)}`;
  }

  // ── Manipulate modal ─────────────────────────────────────────────────────

  showModal(market?: Market): void {
    const overlay = document.getElementById('modal-overlay')!;
    const list = document.getElementById('modal-assets')!;
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

  // ── Toasts ───────────────────────────────────────────────────────────────

  showToast(message: string, type: 'success' | 'error' | 'info' | 'chaos' = 'info'): void {
    const area = document.getElementById('toast-area')!;
    const toast = createEl('div', `toast toast-${type}`);
    toast.textContent = message;
    area.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));

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

  // ── Dark mode ────────────────────────────────────────────────────────────

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    document.body.className = this.darkMode ? 'dark' : 'light';
    document.getElementById('btn-dark')!.textContent = this.darkMode ? '🌙' : '☀️';
  }
}
