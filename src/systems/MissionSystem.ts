import type { Player } from '../core/Player.ts';
import type { Market } from '../core/Market.ts';

export type MissionType = 'quick' | 'strategy' | 'risk';
export type QteResult   = 'perfect' | 'good' | 'missed';

type TrackType =
  | 'earnedDelta'
  | 'tradesDelta'
  | 'sellAtPeak'
  | 'buyOnDip'
  | 'momentumSell'
  | 'holdDiversity'
  | 'qteGoodPlus'
  | 'qtePerfect'
  | 'marketManip'
  | 'rugPull';

interface MissionDef {
  id: string;
  type: MissionType;
  title: string;
  description: (target: number) => string;
  trackType: TrackType;
  getTarget: (rankIdx: number) => number;
  getCashReward: (rankIdx: number) => number;
  xpReward: number;
  minRankIndex?: number;
  formatProgress: (current: number, target: number) => string;
}

export interface ActiveMission {
  instanceId: string;
  defId: string;
  type: MissionType;
  title: string;
  description: string;
  trackType: TrackType;
  target: number;
  current: number;
  cashReward: number;
  xpReward: number;
  completed: boolean;
  completedAt?: number;
  // Snapshot values for delta-based tracking
  _startEarned: number;
  _startTrades: number;
  _startRugPulls: number;
}

export interface MissionSaveState {
  missions: ActiveMission[];
  totalXp: number;
  completedCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtCash(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ── Mission pool ──────────────────────────────────────────────────────────────

const POOL: MissionDef[] = [
  // ── QUICK ──────────────────────────────────────────────────────────────────
  {
    id: 'q_trades',
    type: 'quick',
    title: 'Active Trader',
    description: t => `Complete ${t} trades`,
    trackType: 'tradesDelta',
    getTarget:     r => [5,  8, 12, 18, 25, 35][r] ?? 10,
    getCashReward: r => [800, 2_000, 6_000, 18_000, 50_000, 150_000][r] ?? 1_000,
    xpReward: 25,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} trades`,
  },
  {
    id: 'q_profit',
    type: 'quick',
    title: 'Profit Hunter',
    description: t => `Earn ${fmtCash(t)} in sell proceeds`,
    trackType: 'earnedDelta',
    getTarget:     r => [2_000, 8_000, 25_000, 75_000, 250_000, 800_000][r] ?? 5_000,
    getCashReward: r => [500,   2_000,  7_000,  22_000,  75_000, 250_000][r] ?? 1_000,
    xpReward: 30,
    formatProgress: (c, t) => `${fmtCash(Math.min(c, t))} / ${fmtCash(t)}`,
  },
  {
    id: 'q_diversify',
    type: 'quick',
    title: 'Portfolio Builder',
    description: t => `Hold ${t} different stocks at the same time`,
    trackType: 'holdDiversity',
    getTarget:     r => r <= 1 ? 2 : r <= 3 ? 3 : 4,
    getCashReward: r => [600, 1_200, 4_000, 10_000, 30_000, 80_000][r] ?? 1_000,
    xpReward: 20,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} stocks`,
  },
  {
    id: 'q_buy_dip',
    type: 'quick',
    title: 'Buy the Dip',
    description: t => `Buy ${t} stock${t > 1 ? 's' : ''} while momentum is falling`,
    trackType: 'buyOnDip',
    getTarget:     r => r <= 2 ? 1 : 3,
    getCashReward: r => [750, 1_500, 5_000, 15_000, 40_000, 100_000][r] ?? 1_000,
    xpReward: 22,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} buys`,
  },

  // ── STRATEGY ───────────────────────────────────────────────────────────────
  {
    id: 's_sell_peak',
    type: 'strategy',
    title: 'Peak Timing',
    description: t => `Sell ${t > 1 ? `${t} times` : 'once'} while hype is above 60%`,
    trackType: 'sellAtPeak',
    getTarget:     r => r <= 1 ? 1 : r <= 3 ? 2 : 3,
    getCashReward: r => [1_500, 4_000, 12_000, 35_000, 100_000, 300_000][r] ?? 2_000,
    xpReward: 40,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} peak sells`,
  },
  {
    id: 's_momentum_sell',
    type: 'strategy',
    title: 'Momentum Rider',
    description: t => `Sell ${t} time${t > 1 ? 's' : ''} while momentum is rising`,
    trackType: 'momentumSell',
    getTarget:     r => r <= 1 ? 2 : r <= 3 ? 4 : 7,
    getCashReward: r => [1_200, 3_500, 11_000, 32_000, 90_000, 270_000][r] ?? 2_000,
    xpReward: 38,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} momentum sells`,
  },
  {
    id: 's_spread',
    type: 'strategy',
    title: 'Market Spread',
    description: _ => `Hold 4 different stocks at the same time`,
    trackType: 'holdDiversity',
    getTarget:     _ => 4,
    getCashReward: r => [2_000, 5_000, 15_000, 45_000, 130_000, 400_000][r] ?? 3_000,
    xpReward: 45,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} stocks`,
  },
  {
    id: 's_dip_trader',
    type: 'strategy',
    title: 'Dip Specialist',
    description: t => `Buy ${t} falling stocks and sell them in profit`,
    trackType: 'buyOnDip',
    getTarget:     r => r <= 2 ? 2 : r <= 4 ? 4 : 6,
    getCashReward: r => [1_800, 4_500, 14_000, 42_000, 120_000, 360_000][r] ?? 3_000,
    xpReward: 42,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} dip buys`,
  },

  // ── RISK ───────────────────────────────────────────────────────────────────
  {
    id: 'r_qte_good',
    type: 'risk',
    title: 'Quick Reflexes',
    description: t => `Hit GOOD or better on ${t} QTE${t > 1 ? 's' : ''}`,
    trackType: 'qteGoodPlus',
    getTarget:     r => r <= 2 ? 1 : r <= 4 ? 2 : 3,
    getCashReward: r => [2_000, 5_000, 15_000, 45_000, 130_000, 400_000][r] ?? 3_000,
    xpReward: 50,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} QTEs`,
  },
  {
    id: 'r_qte_perfect',
    type: 'risk',
    title: 'Perfect Timing',
    description: t => `Get ${t} PERFECT QTE${t > 1 ? 's' : ''} — click dead centre`,
    trackType: 'qtePerfect',
    getTarget:     r => r <= 3 ? 1 : 2,
    getCashReward: r => [3_500, 8_000, 25_000, 70_000, 200_000, 600_000][r] ?? 5_000,
    xpReward: 70,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} perfect`,
  },
  {
    id: 'r_market_manip',
    type: 'risk',
    title: 'Market Manipulator',
    description: t => `Successfully manipulate ${t} stock${t > 1 ? 's' : ''} via the Manipulate button`,
    trackType: 'marketManip',
    getTarget:     r => r <= 3 ? 1 : 2,
    getCashReward: r => [4_000, 10_000, 30_000, 90_000, 260_000, 800_000][r] ?? 6_000,
    xpReward: 60,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} manipulations`,
  },
  {
    id: 'r_rug_pull',
    type: 'risk',
    title: 'Exit Scammer',
    description: _ => `Execute a successful rug pull in the Black Market`,
    trackType: 'rugPull',
    getTarget:     _ => 1,
    getCashReward: r => [8_000, 20_000, 60_000, 180_000, 500_000, 1_500_000][r] ?? 10_000,
    xpReward: 100,
    minRankIndex: 3,
    formatProgress: (c, t) => `${Math.min(c, t)} / ${t} rug pulls`,
  },
];

// ── MissionSystem ────────────────────────────────────────────────────────────

export class MissionSystem {
  private missions: ActiveMission[] = [];
  totalXp = 0;
  completedCount = 0;
  private instanceCounter = 0;
  private onCompleteCb?: (m: ActiveMission) => void;

  // ── Mission pool helpers ──────────────────────────────────────────────────

  private availablePool(type: MissionType, rankIdx: number): MissionDef[] {
    return POOL.filter(d => d.type === type && (d.minRankIndex ?? 0) <= rankIdx);
  }

  private pickDef(type: MissionType, rankIdx: number, excludeDefId?: string): MissionDef {
    const pool = this.availablePool(type, rankIdx);
    const candidates = pool.filter(d => d.id !== excludeDefId);
    const list = candidates.length > 0 ? candidates : pool;
    return list[Math.floor(Math.random() * list.length)];
  }

  private buildMission(type: MissionType, rankIdx: number, player: Player, excludeDefId?: string): ActiveMission {
    const def = this.pickDef(type, rankIdx, excludeDefId);
    const target = def.getTarget(rankIdx);
    return {
      instanceId: `m_${++this.instanceCounter}_${Date.now()}`,
      defId: def.id,
      type,
      title: def.title,
      description: def.description(target),
      trackType: def.trackType,
      target,
      current: 0,
      cashReward: def.getCashReward(rankIdx),
      xpReward: def.xpReward,
      completed: false,
      _startEarned:    player.totalEarned,
      _startTrades:    player.tradeCount,
      _startRugPulls:  0,
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  initialize(rankIdx: number, player: Player): void {
    if (this.missions.length > 0) return;
    this.missions = [
      this.buildMission('quick',    rankIdx, player),
      this.buildMission('strategy', rankIdx, player),
      this.buildMission('risk',     rankIdx, player),
    ];
  }

  setOnComplete(cb: (m: ActiveMission) => void): void {
    this.onCompleteCb = cb;
  }

  getMissions(): readonly ActiveMission[] {
    return this.missions;
  }

  getProgressPct(m: ActiveMission): number {
    if (m.target === 0) return 100;
    return Math.min(100, (m.current / m.target) * 100);
  }

  getProgressText(m: ActiveMission): string {
    const def = POOL.find(d => d.id === m.defId);
    return def ? def.formatProgress(m.current, m.target) : `${m.current} / ${m.target}`;
  }

  // ── Tick (called every game second) ──────────────────────────────────────

  tick(player: Player, market: Market, rankIdx: number, bmRugPullCount = 0): void {
    // Replace old completed missions (after 3-second show)
    for (let i = 0; i < this.missions.length; i++) {
      const m = this.missions[i];
      if (m.completed && m.completedAt && Date.now() - m.completedAt > 3_500) {
        this.missions[i] = this.buildMission(m.type, rankIdx, player, m.defId);
      }
    }

    // Update progress for each active mission
    const ownedCount = market.getAllAssets().filter(a => a.owned > 0).length;

    for (const m of this.missions) {
      if (m.completed) continue;

      switch (m.trackType) {
        case 'earnedDelta':
          m.current = Math.max(0, player.totalEarned - m._startEarned);
          break;
        case 'tradesDelta':
          m.current = Math.max(0, player.tradeCount - m._startTrades);
          break;
        case 'holdDiversity':
          m.current = ownedCount;
          break;
        case 'rugPull':
          m.current = Math.max(0, bmRugPullCount - m._startRugPulls);
          break;
        default:
          // Event-based — incremented by callbacks below
          break;
      }

      if (m.current >= m.target) this._complete(m);
    }
  }

  // ── Event-driven callbacks ────────────────────────────────────────────────

  onSell(hype: number, momentum: number): void {
    for (const m of this.missions) {
      if (m.completed) continue;
      if (m.trackType === 'sellAtPeak'   && hype     > 0.60) m.current++;
      if (m.trackType === 'momentumSell' && momentum > 0.01) m.current++;
    }
  }

  onBuy(momentum: number): void {
    for (const m of this.missions) {
      if (m.completed || m.trackType !== 'buyOnDip') continue;
      if (momentum < -0.01) m.current++;
    }
  }

  onQteResult(result: QteResult): void {
    for (const m of this.missions) {
      if (m.completed) continue;
      if (m.trackType === 'qteGoodPlus' && result !== 'missed') m.current++;
      if (m.trackType === 'qtePerfect'  && result === 'perfect') m.current++;
    }
  }

  onMarketManipSuccess(): void {
    for (const m of this.missions) {
      if (m.completed || m.trackType !== 'marketManip') continue;
      m.current++;
    }
  }

  // ── Internal completion ───────────────────────────────────────────────────

  private _complete(m: ActiveMission): void {
    if (m.completed) return;
    m.completed = true;
    m.completedAt = Date.now();
    m.current = m.target;
    this.totalXp += m.xpReward;
    this.completedCount++;
    this.onCompleteCb?.(m);
  }

  // ── Save / Load ───────────────────────────────────────────────────────────

  saveState(): MissionSaveState {
    return {
      missions: this.missions.map(m => ({ ...m })),
      totalXp: this.totalXp,
      completedCount: this.completedCount,
    };
  }

  loadState(state: MissionSaveState, player: Player, rankIdx: number): void {
    if (!state) return;
    this.missions     = state.missions      ?? [];
    this.totalXp      = state.totalXp       ?? 0;
    this.completedCount = state.completedCount ?? 0;

    // If save has fewer than 3 missions (e.g. first load), fill gaps
    const types: MissionType[] = ['quick', 'strategy', 'risk'];
    for (const t of types) {
      if (!this.missions.find(m => m.type === t)) {
        this.missions.push(this.buildMission(t, rankIdx, player));
      }
    }
  }
}
