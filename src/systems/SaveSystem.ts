import type { Player } from '../core/Player.ts';
import type { Market } from '../core/Market.ts';
import type { UpgradeSystem, UpgradeSaveData } from './UpgradeSystem.ts';

interface SaveData {
  version: number;
  cash: number;
  totalEarned: number;
  tradeCount: number;
  prices: Record<string, number>;
  owned: Record<string, number>;
  upgrades: UpgradeSaveData;
  savedAt: number;
}

const SAVE_KEY = 'idlestonks_v1';
const SAVE_VERSION = 1;

export class SaveSystem {
  private ticksSinceLastSave = 0;
  private readonly saveEveryTicks = 5;

  tick(player: Player, market: Market, upgradeSystem: UpgradeSystem): void {
    this.ticksSinceLastSave++;
    if (this.ticksSinceLastSave >= this.saveEveryTicks) {
      this.ticksSinceLastSave = 0;
      this.save(player, market, upgradeSystem);
    }
  }

  save(player: Player, market: Market, upgradeSystem: UpgradeSystem): void {
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
      upgrades: {
        purchased: upgradeSystem.getPurchased(),
        prestigeCount: upgradeSystem.prestigeCount,
      },
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // localStorage may be unavailable in some contexts
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

  applyLoad(data: SaveData, player: Player, market: Market, upgradeSystem: UpgradeSystem): void {
    player.cash = data.cash ?? 1000;
    player.totalEarned = data.totalEarned ?? 0;
    player.tradeCount = data.tradeCount ?? 0;
    market.loadPrices(data.prices ?? {}, data.owned ?? {});
    if (data.upgrades) upgradeSystem.load(data.upgrades);
  }

  clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
