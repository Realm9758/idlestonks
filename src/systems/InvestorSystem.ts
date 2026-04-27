export interface InvestorTierDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseHireCost: number;
  hireCostMultiplier: number;
  incomeRate: number;
  maxCount: number;
  unlockRankIndex: number;
}

export const INVESTOR_TIERS: InvestorTierDef[] = [
  {
    id: 'day_trader_bot',
    name: 'Day Trader Bot',
    emoji: '🤖',
    description: 'Automated basic trader. Steady, reliable, cheap.',
    baseHireCost: 500,
    hireCostMultiplier: 1.8,
    incomeRate: 0.00005,
    maxCount: 10,
    unlockRankIndex: 0,
  },
  {
    id: 'advanced_trader',
    name: 'Advanced Trader',
    emoji: '📊',
    description: 'Experienced professional with a better market read.',
    baseHireCost: 5000,
    hireCostMultiplier: 1.9,
    incomeRate: 0.00012,
    maxCount: 8,
    unlockRankIndex: 1,
  },
  {
    id: 'senior_investor',
    name: 'Senior Investor',
    emoji: '💼',
    description: 'Veteran fund manager. High returns, high salary.',
    baseHireCost: 25000,
    hireCostMultiplier: 2.0,
    incomeRate: 0.00025,
    maxCount: 6,
    unlockRankIndex: 2,
  },
  {
    id: 'hedge_fund_ai',
    name: 'Hedge Fund AI',
    emoji: '🧠',
    description: 'Sentient trading algorithm. Relentless and profitable.',
    baseHireCost: 100000,
    hireCostMultiplier: 2.2,
    incomeRate: 0.00045,
    maxCount: 4,
    unlockRankIndex: 3,
  },
];

export interface InvestorSaveData {
  counts: Record<string, number>;
}

export class InvestorSystem {
  private counts = new Map<string, number>();

  getCount(id: string): number {
    return this.counts.get(id) ?? 0;
  }

  getHireCost(id: string): number {
    const tier = INVESTOR_TIERS.find(t => t.id === id);
    if (!tier) return 0;
    const count = this.counts.get(id) ?? 0;
    return Math.round(tier.baseHireCost * Math.pow(tier.hireCostMultiplier, count));
  }

  isUnlocked(id: string, highestRankIndex: number): boolean {
    const tier = INVESTOR_TIERS.find(t => t.id === id);
    return !!tier && highestRankIndex >= tier.unlockRankIndex;
  }

  isFull(id: string): boolean {
    const tier = INVESTOR_TIERS.find(t => t.id === id);
    if (!tier) return true;
    return (this.counts.get(id) ?? 0) >= tier.maxCount;
  }

  hire(
    id: string,
    cash: number,
    highestRankIndex: number,
  ): { success: boolean; message: string; newCash: number } {
    const tier = INVESTOR_TIERS.find(t => t.id === id);
    if (!tier) return { success: false, message: 'Unknown investor type.', newCash: cash };
    if (!this.isUnlocked(id, highestRankIndex)) {
      return { success: false, message: `Requires higher rank to hire ${tier.name}.`, newCash: cash };
    }
    if (this.isFull(id)) {
      return {
        success: false,
        message: `${tier.name} team is full (${tier.maxCount}/${tier.maxCount}).`,
        newCash: cash,
      };
    }
    const cost = this.getHireCost(id);
    if (cash < cost) {
      return { success: false, message: `Need $${cost.toLocaleString()} to hire.`, newCash: cash };
    }
    this.counts.set(id, (this.counts.get(id) ?? 0) + 1);
    return { success: true, message: `Hired ${tier.emoji} ${tier.name}!`, newCash: cash - cost };
  }

  computeIncome(netWorth: number): number {
    let total = 0;
    for (const tier of INVESTOR_TIERS) {
      const count = this.counts.get(tier.id) ?? 0;
      if (count > 0) total += netWorth * tier.incomeRate * count;
    }
    return total;
  }

  getTotalIncome(netWorth: number): number {
    return this.computeIncome(netWorth);
  }

  saveState(): InvestorSaveData {
    return { counts: Object.fromEntries(this.counts) };
  }

  loadState(data: Partial<InvestorSaveData>): void {
    if (data.counts) {
      for (const [id, count] of Object.entries(data.counts)) {
        this.counts.set(id, count);
      }
    }
  }
}
