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
  onShowMarketIntel: () => void;
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
  'High-hype assets pump; stability advocates insufferably smug',
  'Prediction hamster declines to comment on Rug Pull Token',
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
      <button id="btn-intel" class="btn btn-intel">📊 Market Intel</button>
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
          <p class="modal-desc">Full intelligence on all assets — including locked ones. Plan ahead.</p>
        </div>
        <button id="intel-close" class="btn-icon">✕</button>
      </div>
      <div id="intel-content"></div>
    </div>
  </div>
</div>`;

    document.getElementById('btn-yolo')!.addEventListener('click', () => this.callbacks.onYolo());
    document.getElementById('btn-stabilise')!.addEventListener('click', () => this.callbacks.onStabilise());
    document.getElementById('btn-manipulate')!.addEventListener('click', () => this.callbacks.onShowManipulateModal());
    document.getElementById('btn-intel')!.addEventListener('click', () => this.callbacks.onShowMarketIntel());
    document.getElementById('modal-close')!.addEventListener('click', () => this.hideModal());
    document.getElementById('intel-close')!.addEventListener('click', () => this.hideIntelModal());
    document.getElementById('modal-overlay')!.addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.hideModal();
    });
    document.getElementById('intel-overlay')!.addEventListener('click', (e) => {
      if (e.target === document.getElementById('intel-overlay')) this.hideIntelModal();
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

  // ── Market panel ─────────────────────────────────────────────────────────

  private updateMarket(market: Market, player: Player, upgradeSystem: UpgradeSystem): void {
    const container = document.getElementById('asset-list')!;
    const unlocked = market.getUnlockedAssets();

    if (unlocked.length !== this.lastUnlockedCount) {
      this.lastUnlockedCount = unlocked.length;
      container.innerHTML = '';
      for (const asset of unlocked) {
        container.appendChild(this.buildAssetRow(asset.id, asset.name, asset.emoji, asset.description));
      }
    }

    for (const asset of unlocked) {
      const row = container.querySelector(`[data-id="${asset.id}"]`) as HTMLElement | null;
      if (!row) continue;

      const pct = asset.getPriceChangePct();

      (row.querySelector('.asset-price') as HTMLElement).textContent = formatCurrency(asset.price);

      const changeEl = row.querySelector('.asset-change') as HTMLElement;
      changeEl.textContent = formatPct(pct);
      changeEl.className = 'asset-change ' + (pct >= 0 ? 'green' : 'red');

      // ── Stat badges ───────────────────────────────────────────────────
      const setbadge = (sel: string, label: { icon: string; text: string; cls: string }) => {
        const el = row.querySelector(sel) as HTMLElement | null;
        if (el) {
          el.textContent = `${label.icon} ${label.text}`;
          el.className = `stat-badge ${label.cls}`;
        }
      };
      setbadge('[data-stat="hype"]',      asset.getHypeLabel());
      setbadge('[data-stat="momentum"]',  asset.getMomentumLabel());
      setbadge('[data-stat="stability"]', asset.getStabilityLabel());
      setbadge('[data-stat="risk"]',      asset.getRiskLabel());

      // Insider AI trend arrows
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

      const maxBuy = Math.floor(player.cash / asset.price);
      (row.querySelector('.btn-max') as HTMLButtonElement).textContent = `Max (${maxBuy})`;
      (row.querySelector('.btn-max') as HTMLButtonElement).disabled = maxBuy === 0;
      (row.querySelector('.btn-sell-all') as HTMLButtonElement).textContent = `All (${asset.owned})`;
      (row.querySelector('.btn-sell-all') as HTMLButtonElement).disabled = asset.owned === 0;

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
        <div class="asset-stats-row">
          <span class="stat-badge sl-muted" data-stat="hype">😴 COLD</span>
          <span class="stat-badge sl-neutral" data-stat="momentum">➡️ FLAT</span>
          <span class="stat-badge sl-warn" data-stat="stability">⚠️ SHAKY</span>
          <span class="stat-badge sl-warn" data-stat="risk">🟡 MEDIUM</span>
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
      const mom = asset.getMomentumLabel();
      const row = createEl('div', 'portfolio-row');
      row.innerHTML = `
        <span class="p-name">${asset.emoji} ${asset.name}</span>
        <span class="p-qty">${asset.owned}×</span>
        <span class="p-value">${formatCurrency(asset.getValue())}</span>
        <span class="p-change ${pct >= 0 ? 'green' : 'red'}">${formatPct(pct)}</span>
        <span class="stat-badge ${mom.cls} p-mom">${mom.icon} ${mom.text}</span>
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
      el.appendChild(createEl('span', 'event-msg', entry.message));
      el.appendChild(createEl('span', 'event-time', timeAgo(entry.timestamp)));
      container.appendChild(el);
    }
  }

  // ── Upgrades panel ───────────────────────────────────────────────────────

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
          <button class="btn btn-buy-upg" data-upg-id="${upg.id}">${formatCurrency(upg.cost)}</button>
        `;
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

  // ── Market Intel modal ───────────────────────────────────────────────────

  showMarketIntel(market: Market): void {
    const overlay = document.getElementById('intel-overlay')!;
    const content = document.getElementById('intel-content')!;
    overlay.classList.remove('hidden');
    content.innerHTML = '';

    const allAssets = market.getAllAssets();
    const unlocked = allAssets.filter(a => a.isUnlocked);
    const locked = allAssets.filter(a => !a.isUnlocked);

    // ── Unlocked section ──────────────────────────────────────────────────
    if (unlocked.length > 0) {
      content.appendChild(createEl('div', 'intel-section-label', '🔓 Active Market'));
      for (const asset of unlocked) {
        content.appendChild(this.buildIntelRow(asset, false));
      }
    }

    // ── Locked section ────────────────────────────────────────────────────
    if (locked.length > 0) {
      content.appendChild(createEl('div', 'intel-section-label', '🔒 Locked Assets — Intelligence Preview'));
      for (const asset of locked) {
        content.appendChild(this.buildIntelRow(asset, true));
      }
    }
  }

  private buildIntelRow(asset: ReturnType<Market['getAsset']> & object, isLocked: boolean): HTMLElement {
    const hype = asset.getHypeLabel();
    const mom  = asset.getMomentumLabel();
    const stab = asset.getStabilityLabel();
    const risk = asset.getRiskLabel();

    const row = createEl('div', `intel-row${isLocked ? ' intel-locked' : ''}`);

    // Price bar
    const priceText = isLocked
      ? `🔒 Unlocks at ${formatCurrency(asset.unlockThreshold)} NW`
      : `${formatCurrency(asset.price)} <span class="${asset.getPriceChangePct() >= 0 ? 'green' : 'red'}">${formatPct(asset.getPriceChangePct())}</span>`;

    // Strategy hint
    let stratHint = '';
    if (!isLocked) {
      if (asset.hype > 0.6 && asset.momentum > 0.01) stratHint = '⚡ Momentum + Hype combo — high upside, watch for reversal';
      else if (asset.stability > 0.65) stratHint = '🛡 Safe hold — good for stable growth strategy';
      else if (asset.risk > 0.7 && asset.hype > 0.4) stratHint = '🎲 Degen play — explosive but expect shocks';
      else if (asset.momentum < -0.01) stratHint = '📉 Falling — consider waiting for momentum to reverse';
      else if (asset.hype > 0.5 && asset.momentum < 0) stratHint = '⚠️ Hype high but momentum falling — potential sell signal';
      else stratHint = '➡️ Neutral — monitor for signal changes';
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
      <div class="intel-desc">${isLocked ? asset.getTeaserSignal() : stratHint}</div>
    `;

    return row;
  }

  hideIntelModal(): void {
    document.getElementById('intel-overlay')!.classList.add('hidden');
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
