import type { Market } from './Market.ts';

export class Player {
  cash: number;
  totalEarned: number;
  tradeCount: number;
  earningsMultiplier: number;

  constructor() {
    this.cash = 1000;
    this.totalEarned = 0;
    this.tradeCount = 0;
    this.earningsMultiplier = 1;
  }

  getNetWorth(market: Market): number {
    return this.cash + this.getPortfolioValue(market);
  }

  getPortfolioValue(market: Market): number {
    return market.getAllAssets().reduce((sum, a) => sum + a.getValue(), 0);
  }

  buy(assetId: string, quantity: number, market: Market): { success: boolean; message: string } {
    const asset = market.getAsset(assetId);
    if (!asset) return { success: false, message: 'Asset not found.' };
    if (!asset.isUnlocked) return { success: false, message: 'Asset not unlocked yet.' };
    if (quantity <= 0) return { success: false, message: 'Invalid quantity.' };

    const cost = asset.price * quantity;
    if (cost > this.cash) {
      return { success: false, message: `Need $${cost.toFixed(2)} but only have $${this.cash.toFixed(2)}.` };
    }

    this.cash -= cost;
    asset.owned += quantity;
    this.tradeCount++;
    return { success: true, message: `Bought ${quantity}× ${asset.emoji} ${asset.name} for $${cost.toFixed(2)}` };
  }

  sell(assetId: string, quantity: number, market: Market): { success: boolean; message: string } {
    const asset = market.getAsset(assetId);
    if (!asset) return { success: false, message: 'Asset not found.' };
    if (quantity <= 0) return { success: false, message: 'Invalid quantity.' };
    if (asset.owned < quantity) {
      return { success: false, message: `Only own ${asset.owned} shares of ${asset.name}.` };
    }

    const proceeds = asset.price * quantity * this.earningsMultiplier;
    this.cash += proceeds;
    this.totalEarned += proceeds;
    asset.owned -= quantity;
    this.tradeCount++;
    return { success: true, message: `Sold ${quantity}× ${asset.emoji} ${asset.name} for $${proceeds.toFixed(2)}` };
  }

  yoloInvest(market: Market): { success: boolean; message: string } {
    const available = market.getUnlockedAssets();
    if (available.length === 0) return { success: false, message: 'No assets available.' };

    const asset = available[Math.floor(Math.random() * available.length)];
    const maxAffordable = Math.floor(this.cash / asset.price);
    if (maxAffordable === 0) return { success: false, message: 'Not enough cash to YOLO. Tragic.' };

    const pct = 0.3 + Math.random() * 0.7;
    const quantity = Math.max(1, Math.floor(maxAffordable * pct));
    return this.buy(asset.id, quantity, market);
  }
}
