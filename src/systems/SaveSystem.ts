import type { Player } from '../core/Player.ts';
import type { Market } from '../core/Market.ts';
import type { UpgradeSystem } from './UpgradeSystem.ts';
import type { IdleSystem } from './IdleSystem.ts';
import type { NewsSystem, NewsSaveState } from '../core/NewsSystem.ts';
import type { RankSystem, RankSaveState } from './RankSystem.ts';
import type { BlackMarketSystem, BmSaveState } from './BlackMarketSystem.ts';
import type { InvestorSystem, InvestorSaveData } from './InvestorSystem.ts';

interface SaveData {
  version: number;
  cash: number;
  totalEarned: number;
  tradeCount: number;
  prices: Record<string, number>;
  owned: Record<string, number>;
  upgrades: ReturnType<UpgradeSystem['saveState']>;
  savedAt: number;
  day: number;
  secondsInDay: number;
  nextEventInDays: number;
  news?: NewsSaveState;
  rank?: RankSaveState;
  blackMarket?: BmSaveState;
  investors?: InvestorSaveData;
}

const SAVE_KEY = 'idlestonks_v2';
const SAVE_VERSION = 2;

export class SaveSystem {
  private ticksSinceLastSave = 0;
  private readonly saveEveryTicks = 5;

  tick(
    player: Player, market: Market, upgradeSystem: UpgradeSystem,
    idleSystem?: IdleSystem, newsSystem?: NewsSystem, rankSystem?: RankSystem,
    blackMarketSystem?: BlackMarketSystem, investorSystem?: InvestorSystem,
  ): void {
    this.ticksSinceLastSave++;
    if (this.ticksSinceLastSave >= this.saveEveryTicks) {
      this.ticksSinceLastSave = 0;
      this.save(player, market, upgradeSystem, idleSystem, newsSystem, rankSystem, blackMarketSystem, investorSystem);
    }
  }

  save(
    player: Player, market: Market, upgradeSystem: UpgradeSystem,
    idleSystem?: IdleSystem, newsSystem?: NewsSystem, rankSystem?: RankSystem,
    blackMarketSystem?: BlackMarketSystem, investorSystem?: InvestorSystem,
  ): void {
    const prices: Record<string, number> = {};
    const owned: Record<string, number> = {};

    for (const asset of market.getAllAssets()) {
      prices[asset.id] = asset.price;
      owned[asset.id] = asset.owned;
    }

    const data: SaveData = {
      version: SAVE_VERSION,
      cash: player.cash,
      totalEarned: player.totalEarned,
      tradeCount: player.tradeCount,
      prices,
      owned,
      upgrades: upgradeSystem.saveState(),
      savedAt: Date.now(),
      day: idleSystem?.getDayCount() ?? 0,
      secondsInDay: idleSystem?.getSecondsInDay() ?? 0,
      nextEventInDays: 3,
      news: newsSystem?.saveState(),
      rank: rankSystem?.saveState(),
      blackMarket: blackMarketSystem?.saveState(),
      investors: investorSystem?.saveState(),
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // localStorage may be unavailable
    }
  }

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== SAVE_VERSION) return null;
      return data;
    } catch {
      return null;
    }
  }

  applyLoad(
    data: SaveData, player: Player, market: Market,
    upgradeSystem: UpgradeSystem, idleSystem?: IdleSystem,
    newsSystem?: NewsSystem, rankSystem?: RankSystem,
    blackMarketSystem?: BlackMarketSystem, investorSystem?: InvestorSystem,
  ): void {
    player.cash = data.cash ?? 1000;
    player.totalEarned = data.totalEarned ?? 0;
    player.tradeCount = data.tradeCount ?? 0;
    market.loadPrices(data.prices ?? {}, data.owned ?? {});
    if (data.upgrades) upgradeSystem.load(data.upgrades);
    if (idleSystem) {
      idleSystem.loadDayState(data.day ?? 0, data.secondsInDay ?? 0, data.nextEventInDays ?? 3);
    }
    if (newsSystem && data.news) newsSystem.loadState(data.news);
    if (rankSystem && data.rank) rankSystem.loadState(data.rank);
    if (blackMarketSystem && data.blackMarket) blackMarketSystem.loadState(data.blackMarket);
    if (investorSystem && data.investors) investorSystem.loadState(data.investors);
  }

  clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('idlestonks_v1');
  }
}
