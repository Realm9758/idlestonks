import type { PropertySystem, PropertyConfig, OwnedProperty } from '../systems/PropertySystem.ts';
import type { MarketAccessSystem, MarketDef } from '../systems/MarketAccessSystem.ts';
import { PROPERTY_CATALOG, TENANTS } from '../systems/PropertySystem.ts';

export interface AssetsPanelCallbacks {
  onBuyProperty: (configId: string) => void;
  onUpgradeProperty: (configId: string) => void;
  onUnlockMarket: (marketId: string) => void;
}

export class AssetsPanel {
  private el: HTMLElement | null = null;
  private readonly propSys: PropertySystem;
  private readonly masSys: MarketAccessSystem;
  private readonly cb: AssetsPanelCallbacks;

  constructor(propSys: PropertySystem, masSys: MarketAccessSystem, cb: AssetsPanelCallbacks) {
    this.propSys = propSys;
    this.masSys  = masSys;
    this.cb      = cb;
  }

  mount(container: HTMLElement): void {
    this.el = container;
    this.el.innerHTML = this._buildHTML();
    this._bindEvents();
  }

  refresh(playerCash: number, rankIndex: number, netWorth: number): void {
    if (!this.el) return;
    this.el.innerHTML = this._buildHTML(playerCash, rankIndex, netWorth);
    this._bindEvents();
  }

  // ── HTML builders ──────────────────────────────────────────────────────────

  private _buildHTML(cash = 0, rankIndex = 0, netWorth = 0): string {
    return `
      <div class="assets-tab-wrap">
        ${this._buildPropertiesSection(cash)}
        ${this._buildMarketAccessSection(cash, rankIndex, netWorth)}
      </div>`;
  }

  private _buildPropertiesSection(cash: number): string {
    const owned = this.propSys.properties;
    const totalNet = this.propSys.getTotalDailyNet();
    const ownedCount = owned.length;

    const summaryHtml = ownedCount > 0
      ? `<span class="assets-summary-val">${ownedCount} propert${ownedCount === 1 ? 'y' : 'ies'} · <span class="${totalNet >= 0 ? 'col-green' : 'col-red'}">$${totalNet.toLocaleString()}/day net</span></span>`
      : `<span class="assets-summary-val col-muted">No properties owned</span>`;

    const cards = PROPERTY_CATALOG.map(config => {
      const op = owned.find(p => p.configId === config.id);
      return op ? this._buildOwnedCard(config, op, cash) : this._buildForSaleCard(config, cash);
    }).join('');

    return `
      <div class="assets-section">
        <div class="assets-section-header">
          <span>🏠 Real Estate</span>
          ${summaryHtml}
        </div>
        <div class="prop-grid">${cards}</div>
      </div>`;
  }

  private _buildOwnedCard(config: PropertyConfig, op: OwnedProperty, cash: number): string {
    const tenant = TENANTS[config.tenantId];
    const rent = this.propSys.getEffectiveRent(config, op);
    const reliability = this.propSys.getEffectiveReliability(config, op);
    const net = rent - config.upkeepPerDay;
    const stars = '★'.repeat(op.upgradeLevel) + '☆'.repeat(config.upgradeMax - op.upgradeLevel);
    const isMaxed = op.upgradeLevel >= config.upgradeMax;
    const upgCost = isMaxed ? 0 : this.propSys.getUpgradeCost(config.id, op.upgradeLevel);
    const canUpgrade = !isMaxed && cash >= upgCost;
    const upgradeLabel = isMaxed ? 'MAX LEVEL' : `⬆️ Upgrade $${upgCost.toLocaleString()}`;

    return `
      <div class="prop-card prop-card-owned">
        <div class="prop-card-header">
          <span class="prop-emoji">${config.emoji}</span>
          <div class="prop-card-meta">
            <div class="prop-name">${config.name}</div>
            <div class="prop-stars">${stars}</div>
          </div>
          <span class="prop-owned-badge">OWNED</span>
        </div>
        <div class="prop-tenant-row">
          <span>${tenant.emoji} ${tenant.name}</span>
          <span class="prop-reliability">${Math.round(reliability * 100)}% pays</span>
        </div>
        <div class="prop-income-row">
          <span class="prop-income-item"><span class="col-green">+$${rent}/day</span> rent</span>
          <span class="prop-income-sep">·</span>
          <span class="prop-income-item"><span class="col-red">-$${config.upkeepPerDay}/day</span> upkeep</span>
          <span class="prop-income-sep">·</span>
          <span class="prop-income-item prop-net"><span class="${net >= 0 ? 'col-green' : 'col-red'}">$${net}/day</span> net</span>
        </div>
        <button
          class="btn prop-upgrade-btn ${isMaxed ? 'btn-ghost-sm' : (canUpgrade ? 'btn-buy' : 'btn-ghost-sm')}"
          data-prop-upgrade="${config.id}"
          ${isMaxed || !canUpgrade ? 'disabled' : ''}>
          ${upgradeLabel}
        </button>
      </div>`;
  }

  private _buildForSaleCard(config: PropertyConfig, cash: number): string {
    const tenant = TENANTS[config.tenantId];
    const net = config.rentPerDay - config.upkeepPerDay;
    const canAfford = cash >= config.value;

    return `
      <div class="prop-card prop-card-forsale ${canAfford ? '' : 'prop-card-locked'}">
        <div class="prop-card-header">
          <span class="prop-emoji">${config.emoji}</span>
          <div class="prop-card-meta">
            <div class="prop-name">${config.name}</div>
            <div class="prop-desc">${config.description}</div>
          </div>
        </div>
        <div class="prop-tenant-row">
          <span>${tenant.emoji} ${tenant.name}</span>
          <span class="prop-reliability">${Math.round(tenant.reliability * 100)}% pays</span>
        </div>
        <div class="prop-income-row">
          <span class="prop-income-item"><span class="col-green">+$${config.rentPerDay}/day</span> rent</span>
          <span class="prop-income-sep">·</span>
          <span class="prop-income-item"><span class="col-red">-$${config.upkeepPerDay}/day</span> upkeep</span>
          <span class="prop-income-sep">·</span>
          <span class="prop-income-item prop-net"><span class="${net >= 0 ? 'col-green' : 'col-red'}">~$${net}/day</span></span>
        </div>
        <button
          class="btn ${canAfford ? 'btn-buy' : 'btn-ghost-sm'} prop-buy-btn"
          data-prop-buy="${config.id}"
          ${canAfford ? '' : 'disabled'}>
          ${canAfford ? `🏠 Buy $${config.value.toLocaleString()}` : `🔒 $${config.value.toLocaleString()}`}
        </button>
      </div>`;
  }

  private _buildMarketAccessSection(cash: number, rankIndex: number, netWorth: number): string {
    const markets = this.masSys.getMarkets();
    const cards = markets.map(m => this._buildMarketCard(m, cash, rankIndex, netWorth)).join('');
    return `
      <div class="assets-section">
        <div class="assets-section-header">
          <span>📈 Market Access</span>
          <span class="assets-summary-val col-muted">${markets.filter(m => m.unlocked).length}/${markets.length} unlocked</span>
        </div>
        <div class="market-access-grid">${cards}</div>
      </div>`;
  }

  private _buildMarketCard(m: MarketDef, cash: number, rankIndex: number, netWorth: number): string {
    const RANK_NAMES = ['Rookie', 'Day Trader', 'Intern', 'Manipulator', 'Wolf', 'Overlord'];

    if (m.unlocked) {
      const pills = m.assetIds.slice(0, 5).map(id =>
        `<span class="market-asset-pill">${id.replace(/_/g, ' ')}</span>`
      ).join('');
      return `
        <div class="market-card market-card-unlocked">
          <div class="market-card-header">
            <span class="market-emoji">${m.emoji}</span>
            <div class="market-card-meta">
              <div class="market-name">${m.name}</div>
              <div class="market-desc">${m.description}</div>
            </div>
            <span class="market-unlocked-badge">✓ UNLOCKED</span>
          </div>
          <div class="market-asset-pills">${pills}</div>
        </div>`;
    }

    const { ok, reason } = this.masSys.canUnlock(m.id, rankIndex, netWorth);
    const meetsReqs = ok;
    const canAfford = meetsReqs && cash >= m.accessCost;
    const rankMet = rankIndex >= m.requiredRank;
    const nwMet = netWorth >= m.requiredNetWorth;

    const reqs = [
      `<span class="market-req ${rankMet ? 'req-met' : 'req-unmet'}">${rankMet ? '✓' : '✗'} ${RANK_NAMES[m.requiredRank]} rank</span>`,
      m.requiredNetWorth > 0
        ? `<span class="market-req ${nwMet ? 'req-met' : 'req-unmet'}">${nwMet ? '✓' : '✗'} $${m.requiredNetWorth.toLocaleString()} net worth</span>`
        : '',
    ].filter(Boolean).join('');

    const pills = m.assetIds.slice(0, 5).map(id =>
      `<span class="market-asset-pill market-asset-pill-locked">${id.replace(/_/g, ' ')}</span>`
    ).join('');

    const btnLabel = canAfford
      ? `🔓 Unlock $${m.accessCost.toLocaleString()}`
      : meetsReqs
        ? `🔒 Need $${m.accessCost.toLocaleString()}`
        : `🔒 ${reason}`;

    return `
      <div class="market-card market-card-locked">
        <div class="market-card-header">
          <span class="market-emoji market-emoji-locked">${m.emoji}</span>
          <div class="market-card-meta">
            <div class="market-name">${m.name}</div>
            <div class="market-desc">${m.description}</div>
          </div>
        </div>
        <div class="market-reqs">${reqs}</div>
        <div class="market-asset-pills">${pills}</div>
        <button
          class="btn ${canAfford ? 'btn-buy' : 'btn-ghost-sm'} market-unlock-btn"
          data-market-unlock="${m.id}"
          ${canAfford ? '' : 'disabled'}>
          ${btnLabel}
        </button>
      </div>`;
  }

  // ── Event binding ──────────────────────────────────────────────────────────

  private _bindEvents(): void {
    if (!this.el) return;

    this.el.querySelectorAll<HTMLButtonElement>('[data-prop-buy]').forEach(btn => {
      btn.addEventListener('click', () => this.cb.onBuyProperty(btn.dataset.propBuy!));
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-prop-upgrade]').forEach(btn => {
      btn.addEventListener('click', () => this.cb.onUpgradeProperty(btn.dataset.propUpgrade!));
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-market-unlock]').forEach(btn => {
      btn.addEventListener('click', () => this.cb.onUnlockMarket(btn.dataset.marketUnlock!));
    });
  }
}
