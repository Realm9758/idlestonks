export interface UpgradeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  unlockThreshold: number;
}

export interface LeveledUpgradeDef {
  id: string;
  name: string;
  emoji: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  unlockNetWorth: number;
  levelDescriptions: string[];
}

// One-time purchases (auto_trader and dividend_engine moved to LEVELED_UPGRADES)
export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'bloomberg',
    name: 'Bloomberg Terminal',
    emoji: '📰',
    description: 'Reveals a hint about the next scheduled event. Pair with Hamster for accuracy.',
    cost: 500,
    unlockThreshold: 1200,
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
    description: 'Shows trend arrows on all assets. Probably legal.',
    cost: 3000,
    unlockThreshold: 5000,
  },
  {
    id: 'time_warp',
    name: 'Time Warp',
    emoji: '⚡',
    description: 'Doubles day speed — days pass in 30s instead of 60s.',
    cost: 4000,
    unlockThreshold: 6000,
  },
  {
    id: 'prediction_hamster',
    name: 'Prediction Hamster',
    emoji: '🐹',
    description: 'Bloomberg shows 75%-accurate hints about the next event type.',
    cost: 7500,
    unlockThreshold: 10000,
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

export const LEVELED_UPGRADES: LeveledUpgradeDef[] = [
  {
    id: 'auto_trader',
    name: 'Auto Trader',
    emoji: '🤖',
    maxLevel: 5,
    baseCost: 800,
    costMultiplier: 3.2,
    unlockNetWorth: 1800,
    levelDescriptions: [
      'Buys cheapest affordable asset every 10s (8% cash budget)',
      'Targets highest-momentum asset, 8s interval',
      'News-aware: prioritises hyped assets during active events',
      'Ultra-fast 5s interval, expanded 12% cash budget',
      '3 parallel traders running simultaneously',
    ],
  },
  {
    id: 'dividend_engine',
    name: 'Dividend Engine',
    emoji: '💰',
    maxLevel: 5,
    baseCost: 3000,
    costMultiplier: 2.5,
    unlockNetWorth: 5000,
    levelDescriptions: [
      '0.05% of portfolio value per tick',
      '0.10% of portfolio value per tick',
      '0.20% of portfolio value per tick',
      '0.35% of portfolio value per tick',
      '0.50% per tick + 2× multiplier during active news',
    ],
  },
];

export interface UpgradeSaveData {
  purchased: string[];
  prestigeCount: number;
  leveledLevels?: Record<string, number>;
}

export class UpgradeSystem {
  private purchased: Set<string>;
  prestigeCount: number;
  private leveledLevels = new Map<string, number>();

  constructor() {
    this.purchased = new Set();
    this.prestigeCount = 0;
  }

  // Leveled upgrades count as "purchased" once at level >= 1 (backward compat)
  hasPurchased(id: string): boolean {
    if (LEVELED_UPGRADES.some(u => u.id === id)) {
      return (this.leveledLevels.get(id) ?? 0) >= 1;
    }
    return this.purchased.has(id);
  }

  getLevel(id: string): number {
    return this.leveledLevels.get(id) ?? 0;
  }

  getLeveledCost(id: string): number | null {
    const def = LEVELED_UPGRADES.find(u => u.id === id);
    if (!def) return null;
    const currentLevel = this.leveledLevels.get(id) ?? 0;
    if (currentLevel >= def.maxLevel) return null;
    return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
  }

  buyLevel(id: string, cash: number): { success: boolean; message: string; newCash: number; newLevel: number } {
    const def = LEVELED_UPGRADES.find(u => u.id === id);
    if (!def) return { success: false, message: 'Upgrade not found.', newCash: cash, newLevel: 0 };
    const currentLevel = this.leveledLevels.get(id) ?? 0;
    if (currentLevel >= def.maxLevel) {
      return { success: false, message: `${def.name} is already maxed!`, newCash: cash, newLevel: currentLevel };
    }
    const cost = this.getLeveledCost(id)!;
    if (cash < cost) {
      return {
        success: false,
        message: `Need $${cost.toLocaleString()} — $${(cost - cash).toFixed(0)} short.`,
        newCash: cash,
        newLevel: currentLevel,
      };
    }
    const newLevel = currentLevel + 1;
    this.leveledLevels.set(id, newLevel);
    return {
      success: true,
      message: `${def.emoji} ${def.name} upgraded to Level ${newLevel}!`,
      newCash: cash - cost,
      newLevel,
    };
  }

  getPurchased(): string[] {
    return Array.from(this.purchased);
  }

  getAllUpgrades(): UpgradeDefinition[] {
    return UPGRADES;
  }

  getAllLeveledUpgrades(): LeveledUpgradeDef[] {
    return LEVELED_UPGRADES;
  }

  getPurchasedUpgrades(): UpgradeDefinition[] {
    return UPGRADES.filter(u => this.purchased.has(u.id));
  }

  buy(id: string, cash: number): { success: boolean; message: string; newCash: number } {
    const upgrade = UPGRADES.find(u => u.id === id);
    if (!upgrade) return { success: false, message: 'Upgrade not found.', newCash: cash };
    if (this.purchased.has(id)) return { success: false, message: 'Already purchased.', newCash: cash };
    if (cash < upgrade.cost) {
      return {
        success: false,
        message: `Need $${upgrade.cost.toLocaleString()}. $${(upgrade.cost - cash).toFixed(0)} short.`,
        newCash: cash,
      };
    }
    this.purchased.add(id);
    return { success: true, message: `Purchased ${upgrade.emoji} ${upgrade.name}!`, newCash: cash - upgrade.cost };
  }

  getEarningsMultiplier(): number {
    return Math.pow(2, this.prestigeCount);
  }

  getDividendRate(): number {
    const level = this.leveledLevels.get('dividend_engine') ?? 0;
    const rates = [0, 0.0005, 0.001, 0.002, 0.0035, 0.005];
    return (rates[Math.min(level, 5)] ?? 0) * this.getEarningsMultiplier();
  }

  applyPassiveIncome(portfolioValue: number, hasActiveNews = false): number {
    const level = this.leveledLevels.get('dividend_engine') ?? 0;
    if (level === 0) return 0;
    const rate = this.getDividendRate();
    const multiplier = level >= 5 && hasActiveNews ? 2 : 1;
    return portfolioValue * rate * multiplier;
  }

  prestige(): void {
    this.prestigeCount++;
  }

  saveState(): UpgradeSaveData {
    return {
      purchased: Array.from(this.purchased),
      prestigeCount: this.prestigeCount,
      leveledLevels: Object.fromEntries(this.leveledLevels),
    };
  }

  load(data: UpgradeSaveData): void {
    const purchased = data.purchased ?? [];
    // Migrate old one-time auto_trader / dividend_engine to leveled system
    if (purchased.includes('auto_trader') && !data.leveledLevels?.['auto_trader']) {
      this.leveledLevels.set('auto_trader', 1);
    }
    if (purchased.includes('dividend_engine') && !data.leveledLevels?.['dividend_engine']) {
      this.leveledLevels.set('dividend_engine', 1);
    }
    if (data.leveledLevels) {
      for (const [id, level] of Object.entries(data.leveledLevels)) {
        this.leveledLevels.set(id, level);
      }
    }
    this.purchased = new Set(purchased.filter(id => !LEVELED_UPGRADES.some(u => u.id === id)));
    this.prestigeCount = data.prestigeCount ?? 0;
  }
}
