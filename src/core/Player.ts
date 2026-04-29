import type { Market } from './Market.ts';

export interface LimitOrder {
  id: string;
  assetId: string;
  type: 'buy' | 'sell';
  triggerPrice: number;
  quantity: number;
}

export class Player {
  cash: number;
  totalEarned: number;
  tradeCount: number;
  earningsMultiplier: number;
  costBasis: Record<string, number> = {};

  // Trading streaks
  streak: number = 0;
  hotHandActive: boolean = false;

  // Limit orders
  limitOrders: LimitOrder[] = [];
  private _orderIdCounter = 0;

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

  getDiversificationBonus(market: Market): number {
    const held = market.getAllAssets().filter(a => a.owned > 0).length;
    if (held >= 7) return 1.20;
    if (held >= 5) return 1.10;
    if (held >= 3) return 1.05;
    return 1.0;
  }

  getStreakBonus(): number {
    if (!this.hotHandActive) return 1.0;
    if (this.streak >= 5) return 1.10;
    return 1.05;
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

    const prevOwned = asset.owned;
    const prevBasis = this.costBasis[assetId] ?? asset.price;
    this.cash -= cost;
    asset.owned += quantity;
    this.costBasis[assetId] = (prevBasis * prevOwned + cost) / asset.owned;
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

    const basis = this.costBasis[assetId] ?? asset.price;
    const isProfitable = asset.price > basis;

    const divBonus    = this.getDiversificationBonus(market);
    const streakBonus = this.getStreakBonus();
    const proceeds    = asset.price * quantity * this.earningsMultiplier * divBonus * streakBonus;

    this.cash += proceeds;
    this.totalEarned += proceeds;
    asset.owned -= quantity;
    this.tradeCount++;

    if (isProfitable) {
      this.streak++;
      if (this.streak >= 3) this.hotHandActive = true;
    } else {
      this.streak = 0;
      this.hotHandActive = false;
    }

    const bonusNote = divBonus > 1 || streakBonus > 1
      ? ` (×${(divBonus * streakBonus).toFixed(2)} bonus)`
      : '';
    return { success: true, message: `Sold ${quantity}× ${asset.emoji} ${asset.name} for $${proceeds.toFixed(2)}${bonusNote}` };
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

  // ── Limit orders ──────────────────────────────────────────────────────────

  addLimitOrder(assetId: string, type: 'buy' | 'sell', triggerPrice: number, quantity: number): LimitOrder {
    const order: LimitOrder = {
      id: String(++this._orderIdCounter),
      assetId,
      type,
      triggerPrice,
      quantity,
    };
    this.limitOrders.push(order);
    return order;
  }

  cancelLimitOrder(id: string): boolean {
    const idx = this.limitOrders.findIndex(o => o.id === id);
    if (idx === -1) return false;
    this.limitOrders.splice(idx, 1);
    return true;
  }

  checkLimitOrders(market: Market): { executed: LimitOrder[]; messages: string[] } {
    const executed: LimitOrder[] = [];
    const messages: string[] = [];
    const remaining: LimitOrder[] = [];

    for (const order of this.limitOrders) {
      const asset = market.getAsset(order.assetId);
      if (!asset || !asset.isUnlocked) { remaining.push(order); continue; }

      const triggered = order.type === 'buy'
        ? asset.price <= order.triggerPrice
        : asset.price >= order.triggerPrice;

      if (triggered) {
        const result = order.type === 'buy'
          ? this.buy(order.assetId, order.quantity, market)
          : this.sell(order.assetId, order.quantity, market);
        if (result.success) {
          executed.push(order);
          messages.push(`📋 Order filled: ${result.message}`);
        } else {
          remaining.push(order);
        }
      } else {
        remaining.push(order);
      }
    }

    this.limitOrders = remaining;
    return { executed, messages };
  }
}
