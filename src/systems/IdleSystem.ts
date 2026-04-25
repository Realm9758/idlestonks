import type { Market } from '../core/Market.ts';
import type { Player } from '../core/Player.ts';
import type { EventSystem, EventLogEntry } from '../core/EventSystem.ts';
import type { UpgradeSystem } from './UpgradeSystem.ts';
import type { SaveSystem } from './SaveSystem.ts';

export interface IdleCallbacks {
  onTick: (tick: number) => void;
  onEvent: (entry: EventLogEntry) => void;
  onUnlock: (name: string) => void;
}

export class IdleSystem {
  private tickCount = 0;
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private autoTraderTimer = 0;

  constructor(
    private readonly market: Market,
    private readonly player: Player,
    private readonly eventSystem: EventSystem,
    private readonly upgradeSystem: UpgradeSystem,
    private readonly saveSystem: SaveSystem,
    private readonly callbacks: IdleCallbacks,
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

    this.market.tick();

    const netWorth = this.player.getNetWorth(this.market);
    const newlyUnlocked = this.market.checkUnlocks(netWorth);
    for (const name of newlyUnlocked) {
      this.callbacks.onUnlock(name);
    }

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

    // Chaos events
    const eventEntry = this.eventSystem.tick(this.market, this.player);
    if (eventEntry) {
      this.callbacks.onEvent(eventEntry);
    }

    // Auto-save every 5 ticks
    this.saveSystem.tick(this.player, this.market, this.upgradeSystem);

    this.callbacks.onTick(this.tickCount);
  }

  private runAutoTrader(): void {
    const budget = this.player.cash * 0.08;
    const affordable = this.market.getUnlockedAssets()
      .filter(a => a.price <= budget)
      .sort((a, b) => a.price - b.price);

    if (affordable.length > 0) {
      const target = affordable[0];
      this.player.buy(target.id, 1, this.market);
    }
  }

  getTick(): number {
    return this.tickCount;
  }
}
