export interface MarketDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requiredRank: number;    // 0=Rookie, 1=Day Trader, 2=Intern, 3=Manipulator, 4=Wolf, 5=Overlord
  requiredNetWorth: number;
  accessCost: number;
  unlocked: boolean;
  assetIds: string[];
}

const RANK_NAMES = ['Rookie', 'Day Trader', 'Intern', 'Manipulator', 'Wolf', 'Overlord'];

const INITIAL_MARKETS: MarketDef[] = [
  {
    id: 'starter',
    name: 'Starter Market',
    emoji: '📊',
    description: 'The classic meme stocks. Every trader starts here.',
    requiredRank: 0,
    requiredNetWorth: 0,
    accessCost: 0,
    unlocked: true,
    assetIds: ['catcoin', 'meme_etf', 'ai_writes_ai', 'quantum_banana', 'influencer_stock',
               'diamond_hands', 'rug_pull', 'doge_cousin', 'nft_of_nft', 'stonks_up'],
  },
  {
    id: 'penny',
    name: 'Penny Stock Exchange',
    emoji: '🪙',
    description: 'Micro-cap penny stocks with explosive upside — and downside.',
    requiredRank: 1,
    requiredNetWorth: 5_000,
    accessCost: 500,
    unlocked: false,
    assetIds: ['broke_coin', 'lottery_token', 'hopium_pills'],
  },
  {
    id: 'tech',
    name: 'Tech Ventures',
    emoji: '💻',
    description: 'Emerging tech companies with strong growth fundamentals.',
    requiredRank: 2,
    requiredNetWorth: 20_000,
    accessCost: 2_000,
    unlocked: false,
    assetIds: ['algo_labs', 'vr_headspace', 'battery_farm'],
  },
  {
    id: 'bluechip',
    name: 'Blue Chip Index',
    emoji: '🏦',
    description: 'Established companies. Boring, reliable, and very profitable.',
    requiredRank: 3,
    requiredNetWorth: 75_000,
    accessCost: 10_000,
    unlocked: false,
    assetIds: ['boring_bank', 'megacorp_etf'],
  },
  {
    id: 'underground',
    name: 'Underground Exchange',
    emoji: '🌑',
    description: 'Off-books market. Extreme risk. Maximum reward. Not for the faint-hearted.',
    requiredRank: 4,
    requiredNetWorth: 250_000,
    accessCost: 50_000,
    unlocked: false,
    assetIds: ['shadow_dao', 'dark_matter_token', 'anon_protocol'],
  },
];

export class MarketAccessSystem {
  private markets: MarketDef[];

  constructor() {
    this.markets = INITIAL_MARKETS.map(m => ({ ...m }));
  }

  getMarkets(): MarketDef[] { return this.markets; }

  isMarketUnlocked(marketId: string): boolean {
    return this.markets.find(m => m.id === marketId)?.unlocked ?? false;
  }

  canUnlock(marketId: string, rankIndex: number, netWorth: number): { ok: boolean; reason?: string } {
    const m = this.markets.find(x => x.id === marketId);
    if (!m) return { ok: false, reason: 'Market not found.' };
    if (m.unlocked) return { ok: false, reason: 'Already unlocked.' };
    if (rankIndex < m.requiredRank) {
      return { ok: false, reason: `Requires ${RANK_NAMES[m.requiredRank]} rank` };
    }
    if (netWorth < m.requiredNetWorth) {
      return { ok: false, reason: `Requires $${m.requiredNetWorth.toLocaleString()} net worth` };
    }
    return { ok: true };
  }

  unlock(
    marketId: string,
    playerCash: number,
    rankIndex: number,
    netWorth: number,
  ): { success: boolean; cost: number; message: string; unlockedAssetIds: string[] } {
    const m = this.markets.find(x => x.id === marketId);
    if (!m) return { success: false, cost: 0, message: 'Market not found.', unlockedAssetIds: [] };
    if (m.unlocked) return { success: false, cost: 0, message: 'Market already unlocked.', unlockedAssetIds: [] };

    const { ok, reason } = this.canUnlock(marketId, rankIndex, netWorth);
    if (!ok) return { success: false, cost: 0, message: reason!, unlockedAssetIds: [] };

    if (playerCash < m.accessCost) {
      return { success: false, cost: 0, message: `Need $${m.accessCost.toLocaleString()} to unlock ${m.name}.`, unlockedAssetIds: [] };
    }

    m.unlocked = true;
    return {
      success: true,
      cost: m.accessCost,
      message: `🔓 ${m.emoji} ${m.name} unlocked! ${m.assetIds.length} new assets now tradeable.`,
      unlockedAssetIds: [...m.assetIds],
    };
  }

  // Returns asset IDs that should be unlocked (for use during load)
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
