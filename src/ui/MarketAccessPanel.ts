import type {
  MarketAccessSystem,
  MarketDef,
  CategoryInfo,
  UnlockContext,
  RiskLevel,
  RewardLevel,
} from '../systems/MarketAccessSystem.ts';
import { MARKET_CATEGORIES, RANK_NAMES } from '../systems/MarketAccessSystem.ts';
import type { Market } from '../core/Market.ts';
import { showMarketDetailsModal } from './MarketModals.ts';

export interface MarketAccessCallbacks {
  onUnlockMarket: (marketId: string) => void;
  onGoToMarket?: (marketId: string) => void;
}

interface BuildContext extends UnlockContext {}

const RISK_COLOR: Record<RiskLevel, string> = {
  Low:     'risk-low',
  Medium:  'risk-med',
  High:    'risk-high',
  Extreme: 'risk-extreme',
};

const REWARD_COLOR: Record<RewardLevel, string> = {
  Low:     'reward-low',
  Medium:  'reward-med',
  High:    'reward-high',
  Extreme: 'reward-extreme',
};

export class MarketAccessPanel {
  private readonly masSys: MarketAccessSystem;
  private readonly market: Market;
  private readonly cb: MarketAccessCallbacks;

  constructor(masSys: MarketAccessSystem, market: Market, cb: MarketAccessCallbacks) {
    this.masSys = masSys;
    this.market = market;
    this.cb     = cb;
  }

  // ── Public entry: returns full HTML for the section ───────────────────────────
  buildHTML(ctx: BuildContext): string {
    return `
      <div class="market-access-section">
        ${this._buildOverview(ctx)}
        ${this._buildCategories(ctx)}
      </div>
    `;
  }

  /** Bind events on the rendered section's container. Called after innerHTML set. */
  bindEvents(root: HTMLElement, ctx: BuildContext): void {
    root.querySelectorAll<HTMLButtonElement>('[data-market-unlock]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.cb.onUnlockMarket(btn.dataset.marketUnlock!);
      });
    });
    root.querySelectorAll<HTMLButtonElement>('[data-market-details]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const mId = btn.dataset.marketDetails!;
        const m = this.masSys.getMarket(mId);
        if (m) showMarketDetailsModal(m, ctx, this.market, this.masSys, this.cb.onUnlockMarket);
      });
    });
    root.querySelectorAll<HTMLButtonElement>('[data-market-track]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const mId = btn.dataset.marketTrack!;
        const m = this.masSys.getMarket(mId);
        if (m) showMarketDetailsModal(m, ctx, this.market, this.masSys, this.cb.onUnlockMarket);
      });
    });
    root.querySelectorAll<HTMLButtonElement>('[data-market-goto]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.cb.onGoToMarket?.(btn.dataset.marketGoto!);
      });
    });
  }

  // ── Section 1: Overview ───────────────────────────────────────────────────────
  private _buildOverview(ctx: BuildContext): string {
    const unlocked = this.masSys.getUnlockedCount();
    const total    = this.masSys.getTotalCount();
    const rec      = this.masSys.getRecommendedNext(ctx);
    const rankName = RANK_NAMES[Math.min(ctx.rankIndex, RANK_NAMES.length - 1)] ?? 'Rookie';

    let recBlock = '';
    if (rec) {
      const progress = Math.round(this.masSys.getProgressToward(rec.id, ctx) * 100);
      const req = this.masSys.checkRequirements(rec.id, ctx);
      const reqsHtml = this._buildRequirementChips(rec, ctx);
      const ready = req.ok && ctx.cash >= rec.accessCost;
      const ctaLabel = ready
        ? `🔓 Unlock for $${rec.accessCost.toLocaleString()}`
        : req.ok
          ? `Need $${(rec.accessCost - ctx.cash).toLocaleString()} more`
          : `Track Requirements`;

      recBlock = `
        <div class="ma-rec-card">
          <div class="ma-rec-tag">Recommended Next Unlock</div>
          <div class="ma-rec-row">
            <div class="ma-rec-emoji">${rec.emoji}</div>
            <div class="ma-rec-info">
              <div class="ma-rec-name">${rec.name} <span class="ma-tier-pill">${rec.tierLabel}</span></div>
              <div class="ma-rec-blurb">${rec.whyUnlock}</div>
              <div class="ma-rec-reqs">${reqsHtml}</div>
            </div>
          </div>
          <div class="ma-rec-progress-wrap">
            <div class="ma-rec-progress-bar"><div class="ma-rec-progress-fill" style="width:${progress}%"></div></div>
            <span class="ma-rec-progress-label">${progress}% ready</span>
          </div>
          <div class="ma-rec-actions">
            <button class="btn ma-btn-primary" data-${ready ? 'market-unlock' : 'market-track'}="${rec.id}">
              ${ctaLabel}
            </button>
            <button class="btn ma-btn-ghost" data-market-details="${rec.id}">Details</button>
          </div>
        </div>
      `;
    } else {
      recBlock = `
        <div class="ma-rec-card ma-rec-card-complete">
          <div class="ma-rec-tag">All Markets Unlocked</div>
          <div class="ma-rec-row">
            <div class="ma-rec-emoji">🏆</div>
            <div class="ma-rec-info">
              <div class="ma-rec-name">Master Trader</div>
              <div class="ma-rec-blurb">You've unlocked every market. Build your empire.</div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="ma-overview">
        <div class="ma-overview-stats">
          <div class="ma-stat-card">
            <span class="ma-stat-label">Markets Unlocked</span>
            <span class="ma-stat-value">${unlocked} <span class="ma-stat-sep">/</span> ${total}</span>
            <div class="ma-stat-bar"><div class="ma-stat-bar-fill" style="width:${(unlocked / total) * 100}%"></div></div>
          </div>
          <div class="ma-stat-card">
            <span class="ma-stat-label">Trader Rank</span>
            <span class="ma-stat-value ma-stat-rank">${rankName}</span>
            <span class="ma-stat-sub">Tier ${ctx.rankIndex + 1}</span>
          </div>
          <div class="ma-stat-card">
            <span class="ma-stat-label">Net Worth</span>
            <span class="ma-stat-value">$${Math.round(ctx.netWorth).toLocaleString()}</span>
            <span class="ma-stat-sub">${ctx.blackMarketUnlocked ? '🕵️ Black Market access' : 'Legit only'}</span>
          </div>
        </div>
        ${recBlock}
        <p class="ma-overview-hint">
          Unlock new markets to access new asset types, strategies, and higher-risk opportunities.
        </p>
      </div>
    `;
  }

  // ── Section 2: Categories + Cards ─────────────────────────────────────────────
  private _buildCategories(ctx: BuildContext): string {
    return MARKET_CATEGORIES.map(cat => this._buildCategorySection(cat, ctx))
      .filter(Boolean)
      .join('');
  }

  private _buildCategorySection(cat: CategoryInfo, ctx: BuildContext): string {
    const markets = this.masSys.getMarketsByCategory(cat.id);
    if (markets.length === 0) return '';

    // Hide the underground section unless BM is unlocked OR an underground market is already unlocked.
    const isUnderground = cat.id === 'underground';
    const anyUnderUnlocked = markets.some(m => m.unlocked);
    if (isUnderground && !ctx.blackMarketUnlocked && !anyUnderUnlocked) {
      return this._buildHiddenCategoryTeaser(cat);
    }

    const unlocked = markets.filter(m => m.unlocked).length;
    const cards = markets.map(m => this._buildMarketCard(m, ctx)).join('');

    return `
      <div class="ma-category ${isUnderground ? 'ma-category-underground' : ''}">
        <div class="ma-category-header">
          <div class="ma-category-title">
            <span class="ma-cat-emoji">${cat.emoji}</span>
            <span>${cat.title}</span>
            <span class="ma-cat-count">${unlocked}/${markets.length}</span>
          </div>
          <div class="ma-category-blurb">${cat.blurb}</div>
        </div>
        <div class="ma-card-grid">${cards}</div>
      </div>
    `;
  }

  private _buildHiddenCategoryTeaser(cat: CategoryInfo): string {
    return `
      <div class="ma-category ma-category-hidden">
        <div class="ma-hidden-row">
          <span class="ma-hidden-icon">🔒</span>
          <div>
            <div class="ma-hidden-title">??? — Hidden Markets</div>
            <div class="ma-hidden-blurb">Unlock the Black Market to discover ${cat.title}.</div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Market Card ───────────────────────────────────────────────────────────────
  private _buildMarketCard(m: MarketDef, ctx: BuildContext): string {
    const req = this.masSys.checkRequirements(m.id, ctx);
    const canAfford = req.ok && ctx.cash >= m.accessCost;

    const status: 'unlocked' | 'available' | 'locked' = m.unlocked
      ? 'unlocked'
      : canAfford ? 'available' : 'locked';

    const statusBadge = {
      unlocked:  `<span class="ma-status ma-status-unlocked">✓ Unlocked</span>`,
      available: `<span class="ma-status ma-status-available">⚡ Available</span>`,
      locked:    `<span class="ma-status ma-status-locked">🔒 Locked</span>`,
    }[status];

    const cardClass = `ma-card ma-card-${status} ma-card-cat-${m.category}`;

    const tagsHtml = m.tags.map(t => `<span class="ma-tag">${t}</span>`).join('');
    const recHtml  = `<div class="ma-rec-line"><span class="ma-rec-icon">🎯</span> ${m.recommendedFor}</div>`;

    const riskRow = `
      <div class="ma-meter-row">
        <div class="ma-meter">
          <span class="ma-meter-label">Risk</span>
          <span class="ma-meter-value ${RISK_COLOR[m.riskLevel]}">${m.riskLevel}</span>
        </div>
        <div class="ma-meter">
          <span class="ma-meter-label">Reward</span>
          <span class="ma-meter-value ${REWARD_COLOR[m.rewardLevel]}">${m.rewardLevel}</span>
        </div>
        <div class="ma-meter">
          <span class="ma-meter-label">Tier</span>
          <span class="ma-meter-value">${m.tier}</span>
        </div>
      </div>
    `;

    const statsRow = this._buildStatBars(m);
    const assetsRow = this._buildAssetPreview(m, status === 'locked');
    const reqsRow = status !== 'unlocked' ? `<div class="ma-card-reqs">${this._buildRequirementChips(m, ctx)}</div>` : '';

    let actions = '';
    if (status === 'unlocked') {
      actions = `
        <div class="ma-card-actions">
          <button class="btn ma-btn-success" data-market-goto="${m.id}">📈 View Assets</button>
          <button class="btn ma-btn-ghost" data-market-details="${m.id}">Details</button>
        </div>`;
    } else if (status === 'available') {
      actions = `
        <div class="ma-card-actions">
          <button class="btn ma-btn-primary" data-market-unlock="${m.id}">
            🔓 Unlock — $${m.accessCost.toLocaleString()}
          </button>
          <button class="btn ma-btn-ghost" data-market-details="${m.id}">Details</button>
        </div>`;
    } else {
      const blocking = req.reason ?? `Need $${m.accessCost.toLocaleString()}`;
      actions = `
        <div class="ma-card-actions">
          <button class="btn ma-btn-locked" disabled title="${blocking}">
            🔒 ${blocking}
          </button>
          <button class="btn ma-btn-ghost" data-market-track="${m.id}">Track</button>
        </div>`;
    }

    return `
      <div class="${cardClass}">
        <div class="ma-card-glow"></div>
        <div class="ma-card-top">
          <div class="ma-card-icon">${m.emoji}</div>
          <div class="ma-card-title-block">
            <div class="ma-card-title-row">
              <span class="ma-card-name">${m.name}</span>
              ${statusBadge}
            </div>
            <span class="ma-card-tier">${m.tierLabel}</span>
          </div>
        </div>
        <p class="ma-card-desc">${m.description}</p>
        <div class="ma-card-strategy">
          <span class="ma-strategy-label">Strategy</span>
          <span class="ma-strategy-text">${m.strategySummary}</span>
        </div>
        <div class="ma-card-tags">${tagsHtml}</div>
        ${recHtml}
        ${riskRow}
        ${statsRow}
        ${assetsRow}
        ${reqsRow}
        ${actions}
      </div>
    `;
  }

  // ── Sub-builders ──────────────────────────────────────────────────────────────
  private _buildRequirementChips(m: MarketDef, ctx: BuildContext): string {
    const reqRank = m.unlockRequirements.rank ?? 0;
    const reqNw   = m.unlockRequirements.netWorth ?? 0;
    const reqBM   = m.unlockRequirements.blackMarketUnlocked ?? false;

    const chips: string[] = [];
    if (reqRank > 0) {
      const met = ctx.rankIndex >= reqRank;
      chips.push(`<span class="ma-req ${met ? 'req-met' : 'req-unmet'}" title="Trader rank required">${met ? '✓' : '✗'} ${RANK_NAMES[reqRank]} rank</span>`);
    }
    if (reqNw > 0) {
      const met = ctx.netWorth >= reqNw;
      const cur = Math.min(ctx.netWorth, reqNw);
      const pct = Math.round((cur / reqNw) * 100);
      const label = met
        ? `$${reqNw.toLocaleString()} net worth`
        : `$${Math.round(ctx.netWorth).toLocaleString()} / $${reqNw.toLocaleString()} (${pct}%)`;
      chips.push(`<span class="ma-req ${met ? 'req-met' : 'req-unmet'}" title="Net worth required">${met ? '✓' : '✗'} ${label}</span>`);
    }
    if (reqBM) {
      const met = ctx.blackMarketUnlocked;
      chips.push(`<span class="ma-req ${met ? 'req-met' : 'req-unmet'}" title="Requires Black Market access">${met ? '✓' : '✗'} Black Market access</span>`);
    }
    if (chips.length === 0) {
      chips.push(`<span class="ma-req req-met">✓ No requirements</span>`);
    }
    return chips.join('');
  }

  private _buildStatBars(m: MarketDef): string {
    const stat = (label: string, val: number, cls: string) => {
      const pct = Math.max(0, Math.min(100, val * 20));
      return `
        <div class="ma-stat-line">
          <span class="ma-stat-line-label">${label}</span>
          <div class="ma-stat-line-bar"><div class="ma-stat-line-fill ${cls}" style="width:${pct}%"></div></div>
          <span class="ma-stat-line-val">${val}/5</span>
        </div>`;
    };
    return `
      <div class="ma-card-stats">
        ${stat('Volatility', m.comparisonStats.volatility, 'fill-vol')}
        ${stat('Growth',     m.comparisonStats.growth,     'fill-growth')}
        ${stat('Dividend',   m.comparisonStats.dividend,   'fill-div')}
      </div>
    `;
  }

  private _buildAssetPreview(m: MarketDef, locked: boolean): string {
    const previewIds = m.assetIds.slice(0, 5);
    const pills = previewIds.map(id => {
      const a = this.market.getAsset(id);
      const name  = a?.name  ?? id.replace(/_/g, ' ');
      const emoji = a?.emoji ?? '·';
      const arch  = a?.archetype ?? '';
      const cls = locked ? 'ma-asset-pill ma-asset-pill-locked' : 'ma-asset-pill';
      const tip = arch ? `${name} — ${arch}` : name;
      return `<span class="${cls}" title="${tip}"><span class="ma-asset-emoji">${emoji}</span>${name}</span>`;
    }).join('');
    const more = m.assetIds.length > previewIds.length
      ? `<span class="ma-asset-pill ma-asset-pill-more">+${m.assetIds.length - previewIds.length} more</span>`
      : '';
    return `
      <div class="ma-card-assets">
        <span class="ma-asset-label">Includes</span>
        <div class="ma-asset-pills">${pills}${more}</div>
      </div>
    `;
  }
}
