export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt?: number;
}

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (state: AchievementState) => boolean;
}

export interface AchievementState {
  netWorth: number;
  totalEarned: number;
  tradeCount: number;
  ownedCount: number;
  streak: number;
  dayCount: number;
  rugPullCount: number;
  missionsCompleted: number;
  prestigeCount: number;
  bmHeat: number;
  rankIndex: number;
}

const DEFS: AchievementDef[] = [
  { id: 'first_buy',      emoji: '🛒', title: 'First Trade',          description: 'Make your first trade',                   check: s => s.tradeCount >= 1 },
  { id: 'broke_1k',       emoji: '💵', title: 'Four Digits',          description: 'Reach $1,000 net worth',                  check: s => s.netWorth >= 1_000 },
  { id: 'broke_10k',      emoji: '💰', title: 'Five Figures',         description: 'Reach $10,000 net worth',                 check: s => s.netWorth >= 10_000 },
  { id: 'broke_100k',     emoji: '🤑', title: 'Six Figures',          description: 'Reach $100,000 net worth',                check: s => s.netWorth >= 100_000 },
  { id: 'broke_1m',       emoji: '🏆', title: 'Millionaire',          description: 'Reach $1,000,000 net worth',              check: s => s.netWorth >= 1_000_000 },
  { id: 'diversified',    emoji: '🌈', title: 'Diversified',          description: 'Hold 5 different assets at once',         check: s => s.ownedCount >= 5 },
  { id: 'full_spread',    emoji: '🗂️', title: 'Full Portfolio',       description: 'Hold 7 different assets at once',         check: s => s.ownedCount >= 7 },
  { id: 'hot_hand',       emoji: '🔥', title: 'Hot Hand',             description: 'Get a 5× profit streak',                  check: s => s.streak >= 5 },
  { id: 'century_trader', emoji: '📊', title: 'Century Trader',       description: 'Make 100 trades',                         check: s => s.tradeCount >= 100 },
  { id: 'veteran',        emoji: '🎖️', title: 'Market Veteran',       description: 'Survive 30 days',                         check: s => s.dayCount >= 30 },
  { id: 'rug_puller',     emoji: '💀', title: 'Exit Scammer',         description: 'Execute a rug pull',                      check: s => s.rugPullCount >= 1 },
  { id: 'mission_5',      emoji: '🎯', title: 'Mission Accomplished', description: 'Complete 5 missions',                     check: s => s.missionsCompleted >= 5 },
  { id: 'mission_20',     emoji: '🏅', title: 'Mission Master',       description: 'Complete 20 missions',                    check: s => s.missionsCompleted >= 20 },
  { id: 'prestige_1',     emoji: '⭐', title: 'Prestige',             description: 'Prestige for the first time',             check: s => s.prestigeCount >= 1 },
  { id: 'max_rank',       emoji: '👑', title: 'Financial Overlord',   description: 'Reach the highest rank',                  check: s => s.rankIndex >= 5 },
  { id: 'heat_danger',    emoji: '🚨', title: 'Living Dangerously',   description: 'Push Black Market heat above 90',         check: s => s.bmHeat >= 90 },
  { id: 'earned_500k',    emoji: '💸', title: 'Half a Mil',           description: 'Earn $500K in total sell proceeds',       check: s => s.totalEarned >= 500_000 },
  { id: 'earned_5m',      emoji: '🚀', title: 'To The Moon',          description: 'Earn $5M in total sell proceeds',         check: s => s.totalEarned >= 5_000_000 },
];

export class AchievementSystem {
  private achievements: Map<string, Achievement>;
  private onUnlockCb?: (a: Achievement) => void;

  constructor() {
    this.achievements = new Map(
      DEFS.map(d => [d.id, { id: d.id, title: d.title, description: d.description, emoji: d.emoji, unlocked: false }])
    );
  }

  setOnUnlock(cb: (a: Achievement) => void): void { this.onUnlockCb = cb; }

  check(state: AchievementState): void {
    for (const def of DEFS) {
      const ach = this.achievements.get(def.id)!;
      if (ach.unlocked) continue;
      if (def.check(state)) {
        ach.unlocked = true;
        ach.unlockedAt = Date.now();
        this.onUnlockCb?.(ach);
      }
    }
  }

  getAll(): Achievement[] { return Array.from(this.achievements.values()); }

  saveState(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const [id, a] of this.achievements) out[id] = a.unlocked;
    return out;
  }

  loadState(saved: Record<string, boolean>): void {
    for (const [id, unlocked] of Object.entries(saved)) {
      const a = this.achievements.get(id);
      if (a) a.unlocked = unlocked;
    }
  }
}
