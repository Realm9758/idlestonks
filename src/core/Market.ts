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
    // Hype correlation: cat/doge share buzz; influencer/meme share buzz
    this._applyHypeCorrelation('catcoin', 'doge_cousin', 0.015);
    this._applyHypeCorrelation('influencer_stock', 'meme_etf', 0.010);
  }

  private _applyHypeCorrelation(idA: string, idB: string, rate: number): void {
    const a = this.assets.get(idA);
    const b = this.assets.get(idB);
    if (!a || !b || !a.isUnlocked || !b.isUnlocked) return;
    if (a.hype > b.hype) b.hype = Math.min(1, b.hype + (a.hype - b.hype) * rate);
    else                 a.hype = Math.min(1, a.hype + (b.hype - a.hype) * rate);
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

  getFearGreedIndex(): number {
    const unlocked = this.getUnlockedAssets();
    if (unlocked.length === 0) return 50;
    const avgHype = unlocked.reduce((s, a) => s + a.hype, 0) / unlocked.length;
    const avgMom  = unlocked.reduce((s, a) => s + a.momentum, 0) / unlocked.length;
    const avgTrend = unlocked.reduce((s, a) => s + a.trend, 0) / unlocked.length;
    let score = 50;
    score += avgHype * 30;
    score += (avgMom / 0.05) * 20;
    score += (avgTrend / 0.006) * 10;
    return Math.min(100, Math.max(0, Math.round(score)));
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
