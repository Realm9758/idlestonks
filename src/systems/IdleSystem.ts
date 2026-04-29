import type { Market } from '../core/Market.ts';
import type { Player } from '../core/Player.ts';
import type { EventSystem, EventLogEntry } from '../core/EventSystem.ts';
import type { NewsSystem, NewsItem, NewsResolution } from '../core/NewsSystem.ts';
import type { UpgradeSystem } from './UpgradeSystem.ts';
import type { SaveSystem } from './SaveSystem.ts';
import type { RankSystem } from './RankSystem.ts';
import type { BlackMarketSystem } from './BlackMarketSystem.ts';
import type { InvestorSystem } from './InvestorSystem.ts';
import type { HedgeFundSystem } from './HedgeFundSystem.ts';

export type EventChoice = 'bail' | 'hedge' | 'double' | 'watch';

export interface IdleCallbacks {
  onTick: (tick: number, day: number, secondsInDay: number, secondsPerDay: number) => void;
  onEvent: (entry: EventLogEntry) => void;
  onUnlock: (name: string) => void;
  onNewsGenerated?: (item: NewsItem) => void;
  onNewsResolved?: (resolution: NewsResolution) => void;
  onEventPreChoice?: (hint: string) => void;
  onLimitOrderFilled?: (message: string) => void;
  onDividendPaid?: (amount: number) => void;
}

export class IdleSystem {
  private tickCount  = 0;
  private dayCount   = 0;
  private secondsInDay = 0;
  private secondsPerDay = 60;
  private running    = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private autoTraderTimer = 0;

  private pendingEventChoice: EventChoice = 'watch';
  private lastSeenEventDays = -1;

  constructor(
    private readonly market: Market,
    private readonly player: Player,
    private readonly eventSystem: EventSystem,
    private readonly upgradeSystem: UpgradeSystem,
    private readonly saveSystem: SaveSystem,
    private readonly callbacks: IdleCallbacks,
    private readonly newsSystem?: NewsSystem,
    private readonly rankSystem?: RankSystem,
    private readonly blackMarketSystem?: BlackMarketSystem,
    private readonly investorSystem?: InvestorSystem,
    private readonly hedgeFundSystem?: HedgeFundSystem,
  ) {}

  resolveEventChoice(choice: EventChoice): void {
    this.pendingEventChoice = choice;
  }

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

    this.market.tick();

    const netWorth = this.player.getNetWorth(this.market);
    const newlyUnlocked = this.market.checkUnlocks(netWorth);
    for (const name of newlyUnlocked) this.callbacks.onUnlock(name);

    if (this.investorSystem) {
      const investorBonus = this.investorSystem.computeIncome(netWorth);
      if (investorBonus > 0) {
        this.player.cash += investorBonus;
        this.player.totalEarned += investorBonus;
      }
    }

    const traderLevel = this.upgradeSystem.getBotLevel();
    if (traderLevel > 0) {
      this.autoTraderTimer++;
      const interval = traderLevel >= 4 ? 5 : traderLevel >= 2 ? 8 : 10;
      if (this.autoTraderTimer >= interval) {
        this.autoTraderTimer = 0;
        const traders = traderLevel >= 5 ? 3 : 1;
        for (let i = 0; i < traders; i++) this.runAutoTrader(traderLevel);
      }
    }

    // ── Limit orders check (every tick) ───────────────────────────────────
    const { messages } = this.player.checkLimitOrders(this.market);
    for (const msg of messages) {
      this.callbacks.onLimitOrderFilled?.(msg);
    }

    if (this.secondsInDay >= this.secondsPerDay) {
      this.secondsInDay = 0;
      this.dayCount++;
      this.fireDayEvents();
    }

    this.saveSystem.tick(
      this.player, this.market, this.upgradeSystem, this,
      this.newsSystem, this.rankSystem, this.blackMarketSystem, this.investorSystem,
      this.hedgeFundSystem,
    );

    this.callbacks.onTick(this.tickCount, this.dayCount, this.secondsInDay, this.secondsPerDay);
  }

  private fireDayEvents(): void {
    const prevEventDays = this.eventSystem.getNextEventInDays();

    // Apply pending event choice BEFORE event fires
    if (prevEventDays <= 1) {
      const choice = this.pendingEventChoice;
      this.pendingEventChoice = 'watch';

      if (choice === 'bail') {
        for (const asset of this.market.getAllAssets()) {
          if (asset.owned > 0) this.player.sell(asset.id, asset.owned, this.market);
        }
        this.callbacks.onEvent(this.eventSystem.addEntry('🏃 Bail! All positions sold before the event.', 'neutral'));
      } else if (choice === 'hedge') {
        if (this.player.cash >= 500) {
          this.player.cash -= 500;
          this.market.stabilise();
        }
        this.callbacks.onEvent(this.eventSystem.addEntry('🎚️ Hedged! Paid $500 to dampen market volatility.', 'neutral'));
      } else if (choice === 'double') {
        const result = this.player.yoloInvest(this.market);
        if (result.success) {
          this.callbacks.onEvent(this.eventSystem.addEntry(`💰 Doubled Down! ${result.message}`, 'good'));
        }
      }
    }

    const hamster = this.upgradeSystem.getSignalIntelLevel() >= 3;
    const entries = this.eventSystem.dayTick(this.market, this.player, hamster);
    for (const entry of entries) this.callbacks.onEvent(entry);

    const newEventDays = this.eventSystem.getNextEventInDays();

    // Show choice modal when event moves to exactly 1 day away (preTease just fired)
    if (newEventDays === 1 && prevEventDays >= 2 && newEventDays !== this.lastSeenEventDays) {
      this.lastSeenEventDays = newEventDays;
      this.callbacks.onEventPreChoice?.(this.eventSystem.getHintText());
    } else if (newEventDays !== 1) {
      this.lastSeenEventDays = newEventDays;
    }

    // Dividend income
    let totalDividend = 0;
    for (const asset of this.market.getAllAssets()) {
      const d = asset.getDailyDividend();
      if (d > 0) {
        totalDividend += d;
        this.player.cash += d;
        this.player.totalEarned += d;
      }
    }
    if (totalDividend > 0) {
      const fmt = totalDividend >= 1000
        ? `$${(totalDividend / 1000).toFixed(1)}K`
        : `$${totalDividend.toFixed(2)}`;
      this.callbacks.onEvent({
        id: this.tickCount * 10 + 7,
        timestamp: Date.now(),
        message: `💰 Dividend income: +${fmt} from stable holdings`,
        severity: 'good',
      });
      this.callbacks.onDividendPaid?.(totalDividend);
    }

    if (this.newsSystem) {
      const newItem = this.newsSystem.generateIfDue(this.market, this.dayCount);
      if (newItem) this.callbacks.onNewsGenerated?.(newItem);

      const { resolutions, newItems } = this.newsSystem.dayTick(this.market, this.dayCount);
      for (const r of resolutions) this.callbacks.onNewsResolved?.(r);
      for (const item of newItems) this.callbacks.onNewsGenerated?.(item);
    }
  }

  private runAutoTrader(level: number): void {
    const budgetPct = level >= 4 ? 0.12 : 0.08;
    const budget = this.player.cash * budgetPct;
    const unlocked = this.market.getUnlockedAssets();

    if (level >= 3 && this.newsSystem) {
      const hyped = unlocked.filter(a => a.hype > 0.5 && a.price <= budget);
      if (hyped.length > 0) {
        hyped.sort((a, b) => b.hype - a.hype);
        this.player.buy(hyped[0].id, 1, this.market);
        return;
      }
    }

    if (level >= 2) {
      const momentum = unlocked.filter(a => a.momentum > 0 && a.price <= budget);
      if (momentum.length > 0) {
        momentum.sort((a, b) => b.momentum - a.momentum);
        this.player.buy(momentum[0].id, 1, this.market);
        return;
      }
    }

    const affordable = unlocked.filter(a => a.price <= budget).sort((a, b) => a.price - b.price);
    if (affordable.length > 0) this.player.buy(affordable[0].id, 1, this.market);
  }

  applyTimeWarp(): void { this.secondsPerDay = 30; }

  setDaySpeed(seconds: number): void { this.secondsPerDay = seconds; }

  skipToNextDay(): boolean {
    const free = this.upgradeSystem.skipDayIsFree();
    const cost = 150;
    if (!free && this.player.cash < cost) return false;
    if (!free) this.player.cash -= cost;
    this.secondsInDay = 0;
    this.dayCount++;
    this.fireDayEvents();
    this.callbacks.onTick(this.tickCount, this.dayCount, this.secondsInDay, this.secondsPerDay);
    return true;
  }

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
