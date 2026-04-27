import { Asset, ASSET_CONFIGS } from './Asset.ts';

export class Market {
  private assets: Map<string, Asset>;

  constructor() {
    this.assets = new Map();
    for (const config of ASSET_CONFIGS) {
      this.assets.set(config.id, new Asset(config));
    }
  }

  tick(): void {
    for (const asset of this.assets.values()) {
      asset.tick();
    }
  }

  getAsset(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  getUnlockedAssets(): Asset[] {
    return this.getAllAssets().filter(a => a.isUnlocked);
  }

  checkUnlocks(netWorth: number): string[] {
    const newlyUnlocked: string[] = [];
    for (const asset of this.assets.values()) {
      if (!asset.isUnlocked && netWorth >= asset.unlockThreshold) {
        asset.isUnlocked = true;
        newlyUnlocked.push(`${asset.emoji} ${asset.name}`);
      }
    }
    return newlyUnlocked;
  }

  stabilise(): void {
    for (const asset of this.assets.values()) {
      asset.volatilityMod = 0.05;
    }
  }

  applyVolatilityDamper(): void {
    for (const asset of this.assets.values()) {
      asset.baseVolatilityMult = Math.max(0.1, asset.baseVolatilityMult * 0.8);
    }
  }

  manipulate(assetId: string, successBonus = 0): { success: boolean; message: string } {
    const asset = this.assets.get(assetId);
    if (!asset || !asset.isUnlocked) {
      return { success: false, message: 'Asset not found or not unlocked.' };
    }
    if (Math.random() > 0.45 - successBonus) {
      asset.trendBoost += 0.04;
      asset.shock(1.2 + Math.random() * 0.4);
      return { success: true, message: `📈 ${asset.emoji} ${asset.name} successfully pumped!` };
    } else {
      asset.shock(0.3 + Math.random() * 0.3);
      return { success: false, message: `💀 ${asset.emoji} ${asset.name} manipulation backfired spectacularly!` };
    }
  }

  loadPrices(prices: Record<string, number>, ownedAmounts: Record<string, number>): void {
    for (const [id, price] of Object.entries(prices)) {
      const asset = this.assets.get(id);
      if (asset) {
        asset.price = price;
        asset.priceHistory = [price];
      }
    }
    for (const [id, amount] of Object.entries(ownedAmounts)) {
      const asset = this.assets.get(id);
      if (asset) {
        asset.owned = amount;
      }
    }
  }
}
