export interface Rank {
  id: string;
  name: string;
  emoji: string;
  requiredNetWorth: number;
}

export interface RankSaveState {
  highestRankIndex: number;
}

const RANKS: Rank[] = [
  { id: 'rookie',      name: 'Rookie Trader',     emoji: '📊', requiredNetWorth: 0 },
  { id: 'day_trader',  name: 'Day Trader',         emoji: '📈', requiredNetWorth: 5_000 },
  { id: 'intern',      name: 'Hedge Fund Intern',  emoji: '💼', requiredNetWorth: 25_000 },
  { id: 'manipulator', name: 'Market Manipulator', emoji: '🕹️', requiredNetWorth: 100_000 },
  { id: 'wolf',        name: 'Wall Street Wolf',   emoji: '🐺', requiredNetWorth: 400_000 },
  { id: 'overlord',    name: 'Financial Overlord', emoji: '👑', requiredNetWorth: 1_000_000 },
];

// Feature ID → minimum rank index required
const FEATURE_RANK_INDEX: Record<string, number> = {
  black_market: 3, // 'manipulator' — $100k
  hedge_fund:   4, // 'wolf'        — $400k
};

export class RankSystem {
  private highestRankIndex = 0;

  private qualifiedIndex(netWorth: number): number {
    let idx = 0;
    for (let i = 0; i < RANKS.length; i++) {
      if (netWorth >= RANKS[i].requiredNetWorth) idx = i;
    }
    return idx;
  }

  private displayIndex(netWorth: number): number {
    return Math.max(this.highestRankIndex, this.qualifiedIndex(netWorth));
  }

  getDisplayRank(netWorth: number): Rank {
    return RANKS[this.displayIndex(netWorth)];
  }

  // Call every tick. Returns the new rank only when a rank-up occurs.
  checkRankUp(netWorth: number): { rankUp: boolean; newRank: Rank | null } {
    const qi = this.qualifiedIndex(netWorth);
    if (qi > this.highestRankIndex) {
      this.highestRankIndex = qi;
      return { rankUp: true, newRank: RANKS[qi] };
    }
    return { rankUp: false, newRank: null };
  }

  // Progress toward next rank above the player's current display rank.
  getProgress(netWorth: number): { pct: number; nextRank: Rank | null } {
    const di = this.displayIndex(netWorth);
    if (di >= RANKS.length - 1) return { pct: 100, nextRank: null };
    const curr = RANKS[di];
    const next = RANKS[di + 1];
    const pct = Math.min(100, Math.max(0,
      ((netWorth - curr.requiredNetWorth) / (next.requiredNetWorth - curr.requiredNetWorth)) * 100,
    ));
    return { pct, nextRank: next };
  }

  isFeatureUnlocked(feature: string, netWorth: number): boolean {
    const required = FEATURE_RANK_INDEX[feature];
    if (required === undefined) return false;
    return this.displayIndex(netWorth) >= required;
  }

  getNextFeatureUnlock(netWorth: number): { label: string; atRank: Rank } | null {
    const di = this.displayIndex(netWorth);
    const FEATURE_LABELS: Record<string, string> = { black_market: 'Black Market', hedge_fund: 'Hedge Fund', wolf: 'Wall Street Wolf' };
    const sorted = Object.entries(FEATURE_RANK_INDEX).sort((a, b) => a[1] - b[1]);
    for (const [feature, rankIdx] of sorted) {
      if (rankIdx > di) {
        return { label: FEATURE_LABELS[feature] ?? feature, atRank: RANKS[rankIdx] };
      }
    }
    return null;
  }

  getAllRanks(): Rank[] { return [...RANKS]; }
  getHighestRankIndex(): number { return this.highestRankIndex; }

  saveState(): RankSaveState {
    return { highestRankIndex: this.highestRankIndex };
  }

  loadState(state: Partial<RankSaveState>): void {
    this.highestRankIndex = state.highestRankIndex ?? 0;
  }
}
