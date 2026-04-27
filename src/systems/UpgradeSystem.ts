export interface CoreUpgradeDef {
  id: string; emoji: string; name: string; description: string;
  cost: number; unlockThreshold: number;
}

export interface LeveledUpgradeDef {
  id: string; emoji?: string; name?: string; description?: string;
  maxLevel: number; cost: number; unlockThreshold: number;
  unlockNetWorth: number; levelDescriptions: string[];
}

export const LEVELED_UPGRADES: LeveledUpgradeDef[] = [];

export interface PathUpgradeDef {
  id: string;
  name: string;
  emoji: string;
  path: 'automation' | 'manipulation' | 'capital';
  levelCosts: number[];
  levelEffects: string[];
  unlockNetWorth: number;
}

export interface UpgradeSaveData {
  purchased: string[];
  prestigeCount: number;
  leveledLevels?: Record<string, number>;
}

export const PATH_UPGRADES: PathUpgradeDef[] = [
  // ── AUTOMATION ────────────────────────────────────────────────────────────
  {
    id: 'signal_intel',
    name: 'Signal Intel',
    emoji: '📡',
    path: 'automation',
    unlockNetWorth: 1200,
    levelCosts: [500, 3000, 7500, 20000],
    levelEffects: [
      'Shows trend arrows on all assets',
      'Bloomberg hints on next scheduled event (40% accurate)',
      '75%-accurate hints; Prediction Hamster becomes active',
      'Exact event countdown timer visible in market view',
    ],
  },
  {
    id: 'automation_bot',
    name: 'Automation Bot',
    emoji: '🤖',
    path: 'automation',
    unlockNetWorth: 1800,
    levelCosts: [800, 2560, 8192, 26214, 83886],
    levelEffects: [
      'Buys cheapest affordable asset every 10s (8% cash budget)',
      'Targets highest-momentum asset, 8s interval',
      'News-aware: prioritises hyped assets during active events',
      'Ultra-fast 5s interval, expanded 12% cash budget',
      '3 parallel traders running simultaneously',
    ],
  },
  {
    id: 'day_engine',
    name: 'Day Engine',
    emoji: '⚡',
    path: 'automation',
    unlockNetWorth: 6000,
    levelCosts: [4000, 12000, 35000],
    levelEffects: [
      'Days pass in 45s instead of 60s',
      'Days pass in 30s — maximum speed',
      'Skip Day costs nothing (free)',
    ],
  },

  // ── MANIPULATION ─────────────────────────────────────────────────────────
  {
    id: 'hype_engine',
    name: 'Hype Engine',
    emoji: '📢',
    path: 'manipulation',
    unlockNetWorth: 2000,
    levelCosts: [600, 2000, 6000, 15000],
    levelEffects: [
      'Double YOLO enabled; Manipulate success +10%',
      'Manipulate cost reduced to $750',
      'Manipulate success +25%; post-event hype lasts 2 extra days',
      'Manipulate success +40%; hype spreads to correlated assets',
    ],
  },
  {
    id: 'market_mover',
    name: 'Market Mover',
    emoji: '🎚️',
    path: 'manipulation',
    unlockNetWorth: 5000,
    levelCosts: [2000, 8000, 25000],
    levelEffects: [
      'Reduces all asset volatility by 20%',
      'Sell price +15% on all assets',
      'Sell price +30% on all assets',
    ],
  },
  {
    id: 'network',
    name: 'The Network',
    emoji: '🕸️',
    path: 'manipulation',
    unlockNetWorth: 10000,
    levelCosts: [3000, 10000, 30000],
    levelEffects: [
      '+1 Black Market call per day',
      '+2 calls per day; BM cooldowns 30% faster',
      '+3 calls per day; BM cooldowns 50% faster',
    ],
  },

  // ── CAPITAL ──────────────────────────────────────────────────────────────
  {
    id: 'trade_amplifier',
    name: 'Trade Amplifier',
    emoji: '📈',
    path: 'capital',
    unlockNetWorth: 4000,
    levelCosts: [2000, 5000, 12000, 30000, 75000],
    levelEffects: [
      'Sell gains +10%',
      'Sell gains +25%',
      'Sell gains +50%',
      'Sell gains +80%',
      'Sell gains +100% (doubled)',
    ],
  },
  {
    id: 'fund_optimizer',
    name: 'Fund Optimizer',
    emoji: '🏦',
    path: 'capital',
    unlockNetWorth: 50000,
    levelCosts: [5000, 20000, 60000],
    levelEffects: [
      'HF management fee reduced to 1.5% (from 2%)',
      'HF performance fee reduced to 15% (from 20%)',
      'HF investors pay 1% entry fee; mgmt fee drops to 1%',
    ],
  },
  {
    id: 'prestige_chip',
    name: 'Prestige Protocol',
    emoji: '⭐',
    path: 'capital',
    unlockNetWorth: 75000,
    levelCosts: [50000],
    levelEffects: [
      'Unlocks Prestige: reset everything for a permanent ×2 earnings multiplier',
    ],
  },
];

export class UpgradeSystem {
  private levels = new Map<string, number>();
  prestigeCount = 0;

  getLevel(id: string): number {
    return this.levels.get(id) ?? 0;
  }

  hasPurchased(id: string): boolean {
    return this.getLevel(id) >= 1;
  }

  getCost(id: string): number | null {
    const def = PATH_UPGRADES.find(u => u.id === id);
    if (!def) return null;
    const level = this.getLevel(id);
    if (level >= def.levelCosts.length) return null;
    return def.levelCosts[level];
  }

  buyLevel(id: string, cash: number): { success: boolean; message: string; newCash: number; newLevel: number } {
    const def = PATH_UPGRADES.find(u => u.id === id);
    if (!def) return { success: false, message: 'Upgrade not found.', newCash: cash, newLevel: 0 };
    const currentLevel = this.getLevel(id);
    if (currentLevel >= def.levelCosts.length) {
      return { success: false, message: `${def.name} is already maxed!`, newCash: cash, newLevel: currentLevel };
    }
    const cost = def.levelCosts[currentLevel];
    if (cash < cost) {
      return {
        success: false,
        message: `Need $${cost.toLocaleString()} — $${(cost - cash).toFixed(0)} short.`,
        newCash: cash,
        newLevel: currentLevel,
      };
    }
    const newLevel = currentLevel + 1;
    this.levels.set(id, newLevel);
    return {
      success: true,
      message: `${def.emoji} ${def.name} upgraded to Level ${newLevel}!`,
      newCash: cash - cost,
      newLevel,
    };
  }

  // Compat shim: one-time buy routes through buyLevel
  buy(id: string, cash: number): { success: boolean; message: string; newCash: number } {
    const r = this.buyLevel(id, cash);
    return { success: r.success, message: r.message, newCash: r.newCash };
  }

  getPurchased(): string[] {
    return Array.from(this.levels.entries()).filter(([, v]) => v > 0).map(([k]) => k);
  }

  // Legacy aliases so render.ts/main.ts don't need wholesale edits for now
  getAllUpgrades(): CoreUpgradeDef[] { return []; }
  getAllLeveledUpgrades(): LeveledUpgradeDef[] { return []; }
  getLeveledCost(id: string): number | null { return this.getCost(id); }

  // ── Behavioral queries ───────────────────────────────────────────────────

  getBotLevel(): number { return this.getLevel('automation_bot'); }
  getSignalIntelLevel(): number { return this.getLevel('signal_intel'); }

  getDaySpeedSeconds(): number {
    const l = this.getLevel('day_engine');
    if (l >= 2) return 30;
    if (l >= 1) return 45;
    return 60;
  }

  skipDayIsFree(): boolean { return this.getLevel('day_engine') >= 3; }

  getManipulateSuccessBonus(): number {
    const l = this.getLevel('hype_engine');
    if (l >= 4) return 0.40;
    if (l >= 3) return 0.25;
    if (l >= 1) return 0.10;
    return 0;
  }

  getManipulateCost(): number {
    return this.getLevel('hype_engine') >= 2 ? 750 : 1000;
  }

  isDoubleYoloEnabled(): boolean { return this.getLevel('hype_engine') >= 1; }

  getNetworkBonusCalls(): number {
    const l = this.getLevel('network');
    if (l >= 3) return 3;
    if (l >= 2) return 2;
    if (l >= 1) return 1;
    return 0;
  }

  getNetworkCooldownMult(): number {
    const l = this.getLevel('network');
    if (l >= 3) return 0.50;
    if (l >= 2) return 0.70;
    return 1.0;
  }

  getSellBoost(): number {
    const tradeLevel = this.getLevel('trade_amplifier');
    const tradeBonus = ([0, 0.10, 0.25, 0.50, 0.80, 1.00] as const)[Math.min(tradeLevel, 5)];
    const mmLevel = this.getLevel('market_mover');
    const mmBonus = mmLevel >= 3 ? 0.30 : mmLevel >= 2 ? 0.15 : 0;
    return 1 + tradeBonus + mmBonus;
  }

  // Prestige-only multiplier (for prestige display logic)
  getEarningsMultiplier(): number {
    return Math.pow(2, this.prestigeCount);
  }

  // Full sell multiplier = prestige × trade_amplifier × market_mover
  getSellMultiplier(): number {
    return this.getEarningsMultiplier() * this.getSellBoost();
  }

  syncPlayerMultiplier(player: { earningsMultiplier: number }): void {
    player.earningsMultiplier = this.getSellMultiplier();
  }

  getFundMgmtFeePct(): number {
    const l = this.getLevel('fund_optimizer');
    if (l >= 3) return 1.0;
    if (l >= 1) return 1.5;
    return 2.0;
  }

  getFundPerfFeePct(): number {
    return this.getLevel('fund_optimizer') >= 2 ? 15 : 20;
  }

  hasFundEntryFee(): boolean { return this.getLevel('fund_optimizer') >= 3; }

  prestige(): void { this.prestigeCount++; }

  saveState(): UpgradeSaveData {
    return {
      purchased: [],
      prestigeCount: this.prestigeCount,
      leveledLevels: Object.fromEntries(this.levels),
    };
  }

  load(data: UpgradeSaveData): void {
    const old = new Set(data.purchased ?? []);
    const ll = data.leveledLevels ?? {};

    // signal_intel absorbs old insight upgrades
    let sigLevel = ll['signal_intel'] ?? 0;
    if (old.has('prediction_hamster') || ll['prediction_hamster']) sigLevel = Math.max(sigLevel, 3);
    else if (old.has('bloomberg') || ll['bloomberg']) sigLevel = Math.max(sigLevel, 2);
    else if (old.has('insider_ai')) sigLevel = Math.max(sigLevel, 1);

    // automation_bot from old auto_trader
    const botLevel = Math.max(ll['automation_bot'] ?? 0, ll['auto_trader'] ?? (old.has('auto_trader') ? 1 : 0));

    // day_engine from old time_warp (30s = L2)
    const dayLevel = Math.max(ll['day_engine'] ?? 0, old.has('time_warp') ? 2 : 0);

    // hype_engine from old double_yolo
    const hypeLevel = Math.max(ll['hype_engine'] ?? 0, old.has('double_yolo') ? 1 : 0);

    // market_mover from old volatility_damper
    const mmLevel = Math.max(ll['market_mover'] ?? 0, old.has('volatility_damper') ? 1 : 0);

    // prestige_chip (was one-time, now L1)
    const prestigeLevel = Math.max(ll['prestige_chip'] ?? 0, old.has('prestige_chip') ? 1 : 0);

    if (sigLevel > 0) this.levels.set('signal_intel', sigLevel);
    if (botLevel > 0) this.levels.set('automation_bot', botLevel);
    if (dayLevel > 0) this.levels.set('day_engine', dayLevel);
    if (hypeLevel > 0) this.levels.set('hype_engine', hypeLevel);
    if (mmLevel > 0) this.levels.set('market_mover', mmLevel);
    if (prestigeLevel > 0) this.levels.set('prestige_chip', prestigeLevel);

    // New IDs with no old equivalent
    for (const id of ['trade_amplifier', 'fund_optimizer', 'network'] as const) {
      const v = ll[id] ?? 0;
      if (v > 0) this.levels.set(id, v);
    }

    this.prestigeCount = data.prestigeCount ?? 0;
  }
}
