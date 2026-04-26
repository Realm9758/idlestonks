import type { Market } from '../core/Market.ts';
import type { Player } from '../core/Player.ts';
import type { EventSystem, EventLogEntry } from '../core/EventSystem.ts';
import type { NewsSystem, NewsItem, NewsResolution } from '../core/NewsSystem.ts';
import type { UpgradeSystem } from './UpgradeSystem.ts';
import type { SaveSystem } from './SaveSystem.ts';
import type { RankSystem } from './RankSystem.ts';

export interface IdleCallbacks {
  onTick: (tick: number, day: number, secondsInDay: number, secondsPerDay: number) => void;
  onEvent: (entry: EventLogEntry) => void;
  onUnlock: (name: string) => void;
  onNewsGenerated?: (item: NewsItem) => void;
  onNewsResolved?: (resolution: NewsResolution) => void;
}

export class IdleSystem {
  private tickCount  = 0;
  private dayCount   = 0;
  private secondsInDay = 0;
  private secondsPerDay = 60;
  private running    = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private autoTraderTimer = 0;

  constructor(
    private readonly market: Market,
    private readonly player: Player,
    private readonly eventSystem: EventSystem,
    private readonly upgradeSystem: UpgradeSystem,
    private readonly saveSystem: SaveSystem,
    private readonly callbacks: IdleCallbacks,
    private readonly newsSystem?: NewsSystem,
    private readonly rankSystem?: RankSystem,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.intervalId = setInterval(() => this.step(), 1000);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private step(): void {
    this.tickCount++;
    this.secondsInDay++;

    // ── Prices update every second ─────────────────────────────────────────
    this.market.tick();

    const netWorth = this.player.getNetWorth(this.market);
    const newlyUnlocked = this.market.checkUnlocks(netWorth);
    for (const name of newlyUnlocked) this.callbacks.onUnlock(name);

    // Passive dividend income
    const bonus = this.upgradeSystem.applyPassiveIncome(this.player.getPortfolioValue(this.market));
    if (bonus > 0) {
      this.player.cash += bonus;
      this.player.totalEarned += bonus;
    }

    // Auto trader: buy cheapest asset every 10 ticks
    if (this.upgradeSystem.hasPurchased('auto_trader')) {
      this.autoTraderTimer++;
      if (this.autoTraderTimer >= 10) {
        this.autoTraderTimer = 0;
        this.runAutoTrader();
      }
    }

    // ── Day boundary ───────────────────────────────────────────────────────
    if (this.secondsInDay >= this.secondsPerDay) {
      this.secondsInDay = 0;
      this.dayCount++;
      this.fireDayEvents();
    }

    // Auto-save every 5 ticks
    this.saveSystem.tick(this.player, this.market, this.upgradeSystem, this, this.newsSystem, this.rankSystem);

    this.callbacks.onTick(this.tickCount, this.dayCount, this.secondsInDay, this.secondsPerDay);
  }

  private fireDayEvents(): void {
    // Chaos events
    const hamster = this.upgradeSystem.hasPurchased('prediction_hamster');
    const entry = this.eventSystem.dayTick(this.market, this.player, hamster);
    if (entry) this.callbacks.onEvent(entry);

    // News generation + resolution
    if (this.newsSystem) {
      const newItem = this.newsSystem.generateIfDue(this.market, this.dayCount);
      if (newItem) this.callbacks.onNewsGenerated?.(newItem);

      const { resolutions, newItems } = this.newsSystem.dayTick(this.market, this.dayCount);
      for (const r of resolutions) this.callbacks.onNewsResolved?.(r);
      for (const item of newItems) this.callbacks.onNewsGenerated?.(item);
    }
  }

  private runAutoTrader(): void {
    const budget = this.player.cash * 0.08;
    const affordable = this.market.getUnlockedAssets()
      .filter(a => a.price <= budget)
      .sort((a, b) => a.price - b.price);
    if (affordable.length > 0) this.player.buy(affordable[0].id, 1, this.market);
  }

  // ── Time controls ──────────────────────────────────────────────────────

  applyTimeWarp(): void {
    this.secondsPerDay = 30;
  }

  // Immediately advance to the next day boundary. Returns false if player can't afford it.
  skipToNextDay(): boolean {
    const cost = 150;
    if (this.player.cash < cost) return false;
    this.player.cash -= cost;
    this.secondsInDay = 0;
    this.dayCount++;
    this.fireDayEvents();
    this.callbacks.onTick(this.tickCount, this.dayCount, this.secondsInDay, this.secondsPerDay);
    return true;
  }

  // ── Accessors ──────────────────────────────────────────────────────────

  getTick(): number        { return this.tickCount; }
  getDayCount(): number    { return this.dayCount; }
  getSecondsInDay(): number  { return this.secondsInDay; }
  getSecondsPerDay(): number { return this.secondsPerDay; }

  loadDayState(day: number, secondsInDay: number, nextEventInDays: number): void {
    this.dayCount     = day ?? 0;
    this.secondsInDay = secondsInDay ?? 0;
    this.eventSystem.loadState({ nextEventInDays: nextEventInDays ?? 3 });
  }
}
