import { Market } from './core/Market.ts';
import { Player } from './core/Player.ts';
import { EventSystem } from './core/EventSystem.ts';
import { UpgradeSystem } from './systems/UpgradeSystem.ts';
import { SaveSystem } from './systems/SaveSystem.ts';
import { IdleSystem } from './systems/IdleSystem.ts';
import { Renderer } from './ui/render.ts';

// ── Bootstrap ────────────────────────────────────────────────────────────────

const market = new Market();
const player = new Player();
const eventSystem = new EventSystem();
const upgradeSystem = new UpgradeSystem();
const saveSystem = new SaveSystem();

// Load saved state
const savedData = saveSystem.load();
if (savedData) {
  saveSystem.applyLoad(savedData, player, market, upgradeSystem);
  market.checkUnlocks(player.getNetWorth(market));
  // Re-apply volatility damper if purchased
  if (upgradeSystem.hasPurchased('volatility_damper')) {
    market.applyVolatilityDamper();
  }
}

// ── Renderer ──────────────────────────────────────────────────────────────────

const renderer = new Renderer({
  onBuy(assetId, qty) {
    const result = player.buy(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) eventSystem.addEntry(result.message);
  },

  onSell(assetId, qty) {
    const result = player.sell(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) eventSystem.addEntry(result.message);
  },

  onBuyMax(assetId) {
    const asset = market.getAsset(assetId);
    if (!asset) return;
    const qty = Math.floor(player.cash / asset.price);
    if (qty === 0) { renderer.showToast('Not enough cash!', 'error'); return; }
    const result = player.buy(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) eventSystem.addEntry(result.message);
  },

  onSellAll(assetId) {
    const asset = market.getAsset(assetId);
    if (!asset || asset.owned === 0) { renderer.showToast('Nothing to sell!', 'error'); return; }
    const result = player.sell(assetId, asset.owned, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) eventSystem.addEntry(result.message);
  },

  onYolo() {
    const result = player.yoloInvest(market);
    renderer.showToast(`🎲 YOLO: ${result.message}`, result.success ? 'info' : 'error');
    if (result.success) eventSystem.addEntry(`🎲 YOLO: ${result.message}`);
  },

  onStabilise() {
    if (player.cash < 500) {
      renderer.showToast('Need $500 to stabilise the market!', 'error');
      return;
    }
    player.cash -= 500;
    market.stabilise();
    renderer.showToast('🎚️ Market volatility crushed temporarily!', 'success');
    eventSystem.addEntry('🎚️ Player paid $500 to stabilise the market.', 'neutral');
  },

  onManipulate(assetId) {
    if (player.cash < 1000) {
      renderer.showToast('Need $1,000 to manipulate the market!', 'error');
      renderer.hideModal();
      return;
    }
    player.cash -= 1000;
    const result = market.manipulate(assetId);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    eventSystem.addEntry(result.message, result.success ? 'good' : 'bad');
    renderer.hideModal();
  },

  onBuyUpgrade(upgradeId) {
    const result = upgradeSystem.buy(upgradeId, player.cash);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (!result.success) return;

    player.cash = result.newCash;
    eventSystem.addEntry(result.message, 'good');

    // Apply immediate one-time effects
    if (upgradeId === 'volatility_damper') {
      market.applyVolatilityDamper();
    }
  },

  onPrestige() {
    if (!upgradeSystem.hasPurchased('prestige_chip')) return;
    const netWorth = player.getNetWorth(market);
    if (netWorth < 75000) {
      renderer.showToast('Need $75,000 net worth to prestige!', 'error');
      return;
    }
    if (!confirm(`Prestige? You lose all cash and assets but gain ×${upgradeSystem.getEarningsMultiplier() * 2} permanent earnings. Current: ${netWorth.toFixed(0)}`)) return;

    for (const asset of market.getAllAssets()) {
      asset.owned = 0;
      asset.price = asset.basePrice;
      asset.priceHistory = [asset.basePrice];
    }
    upgradeSystem.prestige();
    player.cash = 1000 * upgradeSystem.getEarningsMultiplier();
    player.totalEarned = 0;
    player.tradeCount = 0;

    renderer.showToast(`⭐ PRESTIGE #${upgradeSystem.prestigeCount}! ${upgradeSystem.getEarningsMultiplier()}× multiplier active!`, 'success');
    eventSystem.addEntry(`⭐ PRESTIGE! The cycle begins anew with ×${upgradeSystem.getEarningsMultiplier()} multiplier.`, 'good');
    saveSystem.save(player, market, upgradeSystem);
  },

  onDarkModeToggle() {
    renderer.toggleDarkMode();
  },

  onClearSave() {
    saveSystem.clearSave();
    location.reload();
  },

  onShowManipulateModal() {
    renderer.showModal(market);
  },
});

// ── Idle system ───────────────────────────────────────────────────────────────

const idleSystem = new IdleSystem(market, player, eventSystem, upgradeSystem, saveSystem, {
  onTick(tick) {
    renderer.update(market, player, eventSystem, upgradeSystem, tick);
  },

  onEvent(entry) {
    renderer.showToast(entry.message, entry.severity === 'bad' ? 'error' : entry.severity === 'good' ? 'success' : 'chaos');
  },

  onUnlock(name) {
    renderer.showToast(`🔓 New asset unlocked: ${name}!`, 'success');
    eventSystem.addEntry(`🔓 New asset unlocked: ${name}!`, 'good');
  },
});

// ── Start ─────────────────────────────────────────────────────────────────────

renderer.update(market, player, eventSystem, upgradeSystem, 0);
idleSystem.start();

eventSystem.addEntry('📈 IdleStonks launched. May the stonks be ever in your favour.', 'neutral');
