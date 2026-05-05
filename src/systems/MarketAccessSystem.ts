export type MarketCategory =
  | 'starter'
  | 'penny'
  | 'growth'
  | 'bluechip'
  | 'underground';

export type RiskLevel   = 'Low' | 'Medium' | 'High' | 'Extreme';
export type RewardLevel = 'Low' | 'Medium' | 'High' | 'Extreme';

export interface MarketComparisonStats {
  volatility: number; // 1–5
  growth:     number; // 1–5
  dividend:   number; // 1–5
}

export interface MarketUnlockRequirements {
  rank?: number;
  netWorth?: number;
  blackMarketUnlocked?: boolean;
  missionRequirement?: string;
}

export interface MarketDef {
  id: string;
  name: string;
  emoji: string;
  category: MarketCategory;
  tier: number;
  tierLabel: string;
  description: string;
  strategySummary: string;
  recommendedFor: string;
  whyUnlock: string;
  riskLevel: RiskLevel;
  rewardLevel: RewardLevel;
  tags: string[];
  pros: string[];
  cons: string[];
  comparisonStats: MarketComparisonStats;
  unlockRequirements: MarketUnlockRequirements;
  accessCost: number;
  unlocked: boolean;
  assetIds: string[];
}

export interface CategoryInfo {
  id: MarketCategory;
  title: string;
  emoji: string;
  blurb: string;
}

export const MARKET_CATEGORIES: CategoryInfo[] = [
  { id: 'starter',     title: 'Starter Markets',          emoji: '🎓', blurb: 'Safe entry-level markets. Learn the basics with balanced beginner assets.' },
  { id: 'penny',       title: 'Penny / Speculative',      emoji: '🎰', blurb: 'Cheap, volatile assets. Big upside, big crashes — ideal for event trading.' },
  { id: 'growth',      title: 'Growth / Tech Markets',    emoji: '🚀', blurb: 'Stronger long-term growth. Trend-following assets for momentum players.' },
  { id: 'bluechip',    title: 'Blue Chip / Dividend',     emoji: '🏛️', blurb: 'Stable assets with dividend income. Lower volatility, slow but reliable.' },
  { id: 'underground', title: 'Underground / Black Market', emoji: '🌑', blurb: 'Off-books synthetics. Extreme risk, hype-driven, manipulation-friendly.' },
];

export const RANK_NAMES = ['Rookie', 'Day Trader', 'Intern', 'Manipulator', 'Wolf', 'Overlord'];

const INITIAL_MARKETS: MarketDef[] = [
  {
    id: 'starter',
    name: 'Starter Market',
    emoji: '📊',
    category: 'starter',
    tier: 1,
    tierLabel: 'Tier 1',
    description: 'The classic meme stocks. Every trader starts here.',
    strategySummary: 'Balanced entry-level assets — a little of everything.',
    recommendedFor: 'Good for beginners',
    whyUnlock: 'Learn the basics with balanced entry-level assets useful for early-game missions.',
    riskLevel: 'Medium',
    rewardLevel: 'Medium',
    tags: ['Learning', 'Balanced', 'Mission Friendly'],
    pros: [
      'Wide variety of archetypes',
      'Forgiving for new traders',
      'Drives early-game progression',
    ],
    cons: [
      'Lower ceiling than later markets',
      'Mostly meme volatility',
    ],
    comparisonStats: { volatility: 3, growth: 2, dividend: 1 },
    unlockRequirements: {},
    accessCost: 0,
    unlocked: true,
    assetIds: [
      'catcoin', 'meme_etf', 'ai_writes_ai', 'quantum_banana', 'influencer_stock',
      'diamond_hands', 'rug_pull', 'doge_cousin', 'nft_of_nft', 'stonks_up',
    ],
  },
  {
    id: 'penny',
    name: 'Penny Stock Exchange',
    emoji: '🪙',
    category: 'penny',
    tier: 2,
    tierLabel: 'Tier 2',
    description: 'Micro-cap penny stocks with explosive upside — and downside.',
    strategySummary: 'Volatile cheap entries. Catch the pump, dodge the dump.',
    recommendedFor: 'Best for risky plays & event trading',
    whyUnlock: 'Cheap entries, huge upside, and event synergy. Grow your money faster.',
    riskLevel: 'High',
    rewardLevel: 'High',
    tags: ['Volatile', 'Event Trading', 'Momentum'],
    pros: [
      'Cheap entries — buy lots of shares',
      'Massive % swings on news',
      'Synergy with manipulation events',
    ],
    cons: [
      'Crashes often',
      'Bad for passive holding',
      'High risk of total losses',
    ],
    comparisonStats: { volatility: 5, growth: 3, dividend: 1 },
    unlockRequirements: { rank: 1, netWorth: 5_000 },
    accessCost: 500,
    unlocked: false,
    assetIds: ['broke_coin', 'lottery_token', 'hopium_pills'],
  },
  {
    id: 'tech',
    name: 'Tech Ventures',
    emoji: '💻',
    category: 'growth',
    tier: 3,
    tierLabel: 'Tier 3',
    description: 'Emerging tech companies with strong growth fundamentals.',
    strategySummary: 'Trend-following growth assets — buy dips, ride the wave.',
    recommendedFor: 'Best for medium-term holds',
    whyUnlock: 'Stronger long-term growth, better for momentum players holding through cycles.',
    riskLevel: 'Medium',
    rewardLevel: 'High',
    tags: ['Momentum', 'Growth', 'Trend Following'],
    pros: [
      'Strong upward trends',
      'Great for medium-term holds',
      'Pairs well with research upgrades',
    ],
    cons: [
      'Higher entry prices',
      'Still vulnerable to bubbles',
    ],
    comparisonStats: { volatility: 3, growth: 5, dividend: 2 },
    unlockRequirements: { rank: 2, netWorth: 20_000 },
    accessCost: 2_000,
    unlocked: false,
    assetIds: ['algo_labs', 'vr_headspace', 'battery_farm'],
  },
  {
    id: 'bluechip',
    name: 'Blue Chip Index',
    emoji: '🏦',
    category: 'bluechip',
    tier: 4,
    tierLabel: 'Tier 4 — Elite',
    description: 'Established companies. Boring, reliable, and very profitable.',
    strategySummary: 'Slow, stable, dividend-bearing — the long game.',
    recommendedFor: 'Best for passive income',
    whyUnlock: 'Stable holdings with dividend income and low volatility — the safer long game.',
    riskLevel: 'Low',
    rewardLevel: 'Medium',
    tags: ['Safe Hold', 'Passive Income', 'Dividends'],
    pros: [
      'Low volatility',
      'Reliable dividend income',
      'Good ballast for risky portfolios',
    ],
    cons: [
      'Slow growth',
      'High capital requirement to enter',
      'Boring price action',
    ],
    comparisonStats: { volatility: 1, growth: 3, dividend: 5 },
    unlockRequirements: { rank: 3, netWorth: 75_000 },
    accessCost: 10_000,
    unlocked: false,
    assetIds: ['boring_bank', 'megacorp_etf'],
  },
  {
    id: 'underground',
    name: 'Underground Exchange',
    emoji: '🌑',
    category: 'underground',
    tier: 5,
    tierLabel: 'Underground',
    description: 'Off-books market. Extreme risk. Maximum reward. Not for the faint-hearted.',
    strategySummary: 'Synthetic coins driven by manipulation and hype cycles.',
    recommendedFor: 'Best for manipulation & hype strategies',
    whyUnlock: 'Black-market-linked assets for hype and manipulation strategies. Highest risk, highest reward.',
    riskLevel: 'Extreme',
    rewardLevel: 'Extreme',
    tags: ['Manipulation', 'Volatile', 'Hype'],
    pros: [
      'Extreme upside potential',
      'Synergy with Black Market ops',
      'Lucrative for skilled manipulators',
    ],
    cons: [
      'Catastrophic crashes',
      'Requires Black Market access',
      'Not forgiving to mistakes',
    ],
    comparisonStats: { volatility: 5, growth: 4, dividend: 1 },
    unlockRequirements: { rank: 4, netWorth: 250_000, blackMarketUnlocked: true },
    accessCost: 50_000,
    unlocked: false,
    assetIds: ['shadow_dao', 'dark_matter_token', 'anon_protocol'],
  },
];

export interface UnlockContext {
  cash: number;
  rankIndex: number;
  netWorth: number;
  blackMarketUnlocked: boolean;
}

export interface RequirementCheck {
  ok: boolean;
  rankMet: boolean;
  netWorthMet: boolean;
  blackMarketMet: boolean;
  reason?: string;
}

export class MarketAccessSystem {
  private markets: MarketDef[];

  constructor() {
    this.markets = INITIAL_MARKETS.map(m => ({ ...m }));
  }

  getMarkets(): MarketDef[] { return this.markets; }
  getMarket(id: string): MarketDef | undefined { return this.markets.find(m => m.id === id); }
  getMarketsByCategory(cat: MarketCategory): MarketDef[] {
    return this.markets.filter(m => m.category === cat);
  }
  getUnlockedCount(): number { return this.markets.filter(m => m.unlocked).length; }
  getTotalCount(): number    { return this.markets.length; }

  isMarketUnlocked(marketId: string): boolean {
    return this.markets.find(m => m.id === marketId)?.unlocked ?? false;
  }

  checkRequirements(marketId: string, ctx: UnlockContext): RequirementCheck {
    const m = this.markets.find(x => x.id === marketId);
    if (!m) return { ok: false, rankMet: false, netWorthMet: false, blackMarketMet: false, reason: 'Market not found.' };

    const reqRank = m.unlockRequirements.rank ?? 0;
    const reqNw   = m.unlockRequirements.netWorth ?? 0;
    const reqBM   = m.unlockRequirements.blackMarketUnlocked ?? false;

    const rankMet       = ctx.rankIndex >= reqRank;
    const netWorthMet   = ctx.netWorth  >= reqNw;
    const blackMarketMet = !reqBM || ctx.blackMarketUnlocked;

    let reason: string | undefined;
    if (!rankMet)              reason = `Requires ${RANK_NAMES[reqRank]} rank`;
    else if (!netWorthMet)     reason = `Requires $${reqNw.toLocaleString()} net worth`;
    else if (!blackMarketMet)  reason = 'Requires Black Market access';

    return { ok: rankMet && netWorthMet && blackMarketMet, rankMet, netWorthMet, blackMarketMet, reason };
  }

  /** Returns the market a player should aim for next (cheapest unmet locked market). */
  getRecommendedNext(ctx: UnlockContext): MarketDef | undefined {
    const locked = this.markets.filter(m => !m.unlocked);
    if (locked.length === 0) return undefined;

    // Prefer markets where requirements are already met (just need to pay).
    const ready = locked.filter(m => this.checkRequirements(m.id, ctx).ok);
    if (ready.length > 0) {
      return ready.sort((a, b) => a.tier - b.tier)[0];
    }
    // Otherwise pick lowest-tier market the player is closest to.
    return locked.sort((a, b) => a.tier - b.tier)[0];
  }

  /** Progress (0–1) towards unlocking the given market based on rank + net worth. */
  getProgressToward(marketId: string, ctx: UnlockContext): number {
    const m = this.markets.find(x => x.id === marketId);
    if (!m) return 0;
    const reqRank = m.unlockRequirements.rank ?? 0;
    const reqNw   = m.unlockRequirements.netWorth ?? 0;

    let count = 0;
    let total = 0;
    if (reqRank > 0) {
      total++;
      count += Math.min(1, ctx.rankIndex / reqRank);
    }
    if (reqNw > 0) {
      total++;
      count += Math.min(1, ctx.netWorth / reqNw);
    }
    if (m.unlockRequirements.blackMarketUnlocked) {
      total++;
      count += ctx.blackMarketUnlocked ? 1 : 0;
    }
    if (total === 0) return 1;
    return count / total;
  }

  unlock(
    marketId: string,
    ctx: UnlockContext,
  ): { success: boolean; cost: number; message: string; unlockedAssetIds: string[]; market?: MarketDef } {
    const m = this.markets.find(x => x.id === marketId);
    if (!m) return { success: false, cost: 0, message: 'Market not found.', unlockedAssetIds: [] };
    if (m.unlocked) return { success: false, cost: 0, message: 'Market already unlocked.', unlockedAssetIds: [] };

    const req = this.checkRequirements(marketId, ctx);
    if (!req.ok) return { success: false, cost: 0, message: req.reason!, unlockedAssetIds: [] };

    if (ctx.cash < m.accessCost) {
      return { success: false, cost: 0, message: `Need $${m.accessCost.toLocaleString()} to unlock ${m.name}.`, unlockedAssetIds: [] };
    }

    m.unlocked = true;
    return {
      success: true,
      cost: m.accessCost,
      message: `🔓 ${m.emoji} ${m.name} unlocked! ${m.assetIds.length} new assets now tradeable.`,
      unlockedAssetIds: [...m.assetIds],
      market: m,
    };
  }

  loadState(data: Record<string, boolean>): string[] {
    const toUnlock: string[] = [];
    for (const m of this.markets) {
      if (data[m.id] === true && !m.unlocked) {
        m.unlocked = true;
        toUnlock.push(...m.assetIds);
      }
    }
    return toUnlock;
  }

  saveState(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const m of this.markets) out[m.id] = m.unlocked;
    return out;
  }
}
