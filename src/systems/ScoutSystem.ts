import type { Player } from '../core/Player.ts';
import type { Market } from '../core/Market.ts';

export type ScoutAlertKind = 'profit' | 'loss';

export interface ScoutAlert {
  assetId: string;
  kind: ScoutAlertKind;
  message: string;
}

interface AlertRecord {
  basisAtFire: number;
  firedTp: boolean;
  firedSl: boolean;
}

const TP_THRESHOLD = 0.20;
const SL_THRESHOLD = -0.10;
const MIN_POSITION_VALUE = 100;
const REQUIRED_RANK_INDEX = 3;

export class ScoutSystem {
  private records = new Map<string, AlertRecord>();

  check(player: Player, market: Market, rankIndex: number): ScoutAlert[] {
    if (rankIndex < REQUIRED_RANK_INDEX) return [];

    const alerts: ScoutAlert[] = [];

    for (const asset of market.getUnlockedAssets()) {
      const basis = player.costBasis[asset.id];
      if (!basis || basis <= 0 || asset.owned <= 0) {
        // No position: drop the record so a future entry restarts tracking.
        this.records.delete(asset.id);
        continue;
      }

      // Reset tracking when the cost basis changes (new buy averaged in).
      const rec = this.records.get(asset.id);
      if (!rec || Math.abs(rec.basisAtFire - basis) > 0.0001) {
        this.records.set(asset.id, { basisAtFire: basis, firedTp: false, firedSl: false });
        continue;
      }

      const positionValue = asset.price * asset.owned;
      if (positionValue < MIN_POSITION_VALUE) continue;

      const pl = (asset.price - basis) / basis;

      if (!rec.firedTp && pl >= TP_THRESHOLD) {
        rec.firedTp = true;
        const dollarGain = (asset.price - basis) * asset.owned;
        alerts.push({
          assetId: asset.id,
          kind: 'profit',
          message: `🎯 ${asset.emoji} ${asset.name} +${(pl * 100).toFixed(0)}% — lock in $${Math.round(dollarGain).toLocaleString()}?`,
        });
      } else if (!rec.firedSl && pl <= SL_THRESHOLD) {
        rec.firedSl = true;
        const dollarLoss = (basis - asset.price) * asset.owned;
        alerts.push({
          assetId: asset.id,
          kind: 'loss',
          message: `⚠️ ${asset.emoji} ${asset.name} ${(pl * 100).toFixed(0)}% — cut losses? ($${Math.round(dollarLoss).toLocaleString()} down)`,
        });
      }
    }

    return alerts;
  }

  reset(): void {
    this.records.clear();
  }
}
