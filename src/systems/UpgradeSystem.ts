export interface UpgradeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  unlockThreshold: number;
}

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'bloomberg',
    name: 'Bloomberg Terminal',
    emoji: '📰',
    description: 'See the countdown timer to next chaos event.',
    cost: 500,
    unlockThreshold: 1200,
  },
  {
    id: 'auto_trader',
    name: 'Auto Trader',
    emoji: '🤖',
    description: 'Automatically buys the cheapest affordable asset every 10s.',
    cost: 800,
    unlockThreshold: 1800,
  },
  {
    id: 'double_yolo',
    name: 'Double YOLO',
    emoji: '🎲',
    description: 'YOLO Invest bets up to 100% of your cash instead of 70%.',
    cost: 600,
    unlockThreshold: 2000,
  },
  {
    id: 'volatility_damper',
    name: 'Volatility Damper',
    emoji: '🎚️',
    description: 'Permanently reduces all asset volatility by 20%.',
    cost: 2000,
    unlockThreshold: 3000,
  },
  {
    id: 'insider_ai',
    name: 'Insider AI',
    emoji: '🕵️',
    description: 'Shows trend arrows on assets. Probably legal.',
    cost: 3000,
    unlockThreshold: 5000,
  },
  {
    id: 'prediction_hamster',
    name: 'Prediction Hamster',
    emoji: '🐹',
    description: 'Occasionally predicts the next event type. 65% accurate.',
    cost: 7500,
    unlockThreshold: 10000,
  },
  {
    id: 'dividend_engine',
    name: 'Dividend Engine',
    emoji: '💰',
    description: 'Earn 0.1% of your portfolio value every tick passively.',
    cost: 12000,
    unlockThreshold: 18000,
  },
  {
    id: 'prestige_chip',
    name: 'Prestige Protocol',
    emoji: '⭐',
    description: 'Reset everything for a permanent 2× earnings multiplier.',
    cost: 50000,
    unlockThreshold: 75000,
  },
];

export interface UpgradeSaveData {
  purchased: string[];
  prestigeCount: number;
}

export class UpgradeSystem {
  private purchased: Set<string>;
  prestigeCount: number;

  constructor() {
    this.purchased = new Set();
    this.prestigeCount = 0;
  }

  hasPurchased(id: string): boolean {
    return this.purchased.has(id);
  }

  getPurchased(): string[] {
    return Array.from(this.purchased);
  }

  getAvailableUpgrades(_netWorth: number): UpgradeDefinition[] {
    return UPGRADES.filter(u => !this.purchased.has(u.id));
  }

  getAllUpgrades(): UpgradeDefinition[] {
    return UPGRADES;
  }

  getPurchasedUpgrades(): UpgradeDefinition[] {
    return UPGRADES.filter(u => this.purchased.has(u.id));
  }

  buy(id: string, cash: number): { success: boolean; message: string; newCash: number } {
    const upgrade = UPGRADES.find(u => u.id === id);
    if (!upgrade) return { success: false, message: 'Upgrade not found.', newCash: cash };
    if (this.purchased.has(id)) return { success: false, message: 'Already purchased.', newCash: cash };
    if (cash < upgrade.cost) {
      return { success: false, message: `Need $${upgrade.cost.toLocaleString()}. You're $${(upgrade.cost - cash).toFixed(0)} short.`, newCash: cash };
    }

    this.purchased.add(id);
    return { success: true, message: `Purchased ${upgrade.emoji} ${upgrade.name}!`, newCash: cash - upgrade.cost };
  }

  getEarningsMultiplier(): number {
    return Math.pow(2, this.prestigeCount);
  }

  applyPassiveIncome(portfolioValue: number): number {
    if (!this.purchased.has('dividend_engine')) return 0;
    return portfolioValue * 0.001 * this.getEarningsMultiplier();
  }

  prestige(): void {
    this.prestigeCount++;
  }

  load(data: UpgradeSaveData): void {
    this.purchased = new Set(data.purchased);
    this.prestigeCount = data.prestigeCount ?? 0;
  }
}
