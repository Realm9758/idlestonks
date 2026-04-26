import { Market } from './core/Market.ts';
import { Player } from './core/Player.ts';
import { EventSystem } from './core/EventSystem.ts';
import { NewsSystem } from './core/NewsSystem.ts';
import { UpgradeSystem } from './systems/UpgradeSystem.ts';
import { SaveSystem } from './systems/SaveSystem.ts';
import { IdleSystem } from './systems/IdleSystem.ts';
import { Renderer } from './ui/render.ts';
import { getTradeInsight } from './ui/components.ts';
import { screenFlash } from './ui/animations.ts';

// ── Bootstrap ────────────────────────────────────────────────────────────────

const market        = new Market();
const player        = new Player();
const eventSystem   = new EventSystem();
const newsSystem    = new NewsSystem();
const upgradeSystem = new UpgradeSystem();
const saveSystem    = new SaveSystem();

// ── Idle system ───────────────────────────────────────────────────────────────
// Created before renderer so save restoration can set day state before first render.

const idleSystem = new IdleSystem(
  market, player, eventSystem, upgradeSystem, saveSystem,
  {
    onTick(tick, day, secondsInDay, secondsPerDay) {
      renderer.update(market, player, eventSystem, upgradeSystem, tick, day, secondsInDay, secondsPerDay, newsSystem);
    },

    onEvent(entry) {
      const type = entry.severity === 'bad' ? 'error' : entry.severity === 'good' ? 'success' : 'chaos';
      renderer.showToast(entry.message, type);
      renderer.showEventPopup(entry);
      if (entry.severity === 'bad') screenFlash('bad');
      else if (entry.severity === 'good') screenFlash('good');
      else if (entry.severity === 'chaos') screenFlash('chaos');
    },

    onUnlock(name) {
      renderer.showToast(`🔓 New asset unlocked: ${name}!`, 'success');
      eventSystem.addEntry(`🔓 New asset unlocked: ${name}!`, 'good');
    },

    onNewsGenerated(item) {
      const chainLabel = item.chainInfo
        ? ` [🔗 ${item.chainInfo.chainTitle} — Step ${item.chainInfo.stepIndex + 1}/${item.chainInfo.totalSteps}]`
        : '';
      renderer.showToast(
        `📰 Breaking: "${item.headline}"${chainLabel} — triggers in ${item.triggerDay - idleSystem.getDayCount()} day(s)`,
        'info',
      );
    },

    onNewsResolved(resolution) {
      const type = resolution.severity === 'bad' ? 'error' : resolution.severity === 'good' ? 'success' : 'chaos';
      renderer.showToast(resolution.message, type);
      renderer.showEventPopup({
        id: Date.now(),
        timestamp: Date.now(),
        message: resolution.message,
        severity: resolution.severity,
      });
      if (resolution.severity === 'bad') screenFlash('bad');
      else if (resolution.severity === 'good') screenFlash('good');
    },
  },
  newsSystem,
);

// ── Restore save ──────────────────────────────────────────────────────────────

const savedData = saveSystem.load();
if (savedData) {
  saveSystem.applyLoad(savedData, player, market, upgradeSystem, idleSystem, newsSystem);
  market.checkUnlocks(player.getNetWorth(market));
  if (upgradeSystem.hasPurchased('volatility_damper')) market.applyVolatilityDamper();
  if (upgradeSystem.hasPurchased('time_warp')) idleSystem.applyTimeWarp();
}

// ── Renderer ──────────────────────────────────────────────────────────────────

const renderer = new Renderer({
  onBuy(assetId, qty) {
    const asset = market.getAsset(assetId);
    const result = player.buy(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success && asset) {
      eventSystem.addEntry(result.message);
      renderer.showToast(getTradeInsight(asset, 'buy'), 'info');
      renderer.animateTrade(assetId, `-${(asset.price * qty).toFixed(0)}`, 'down');
    }
  },

  onSell(assetId, qty) {
    const asset = market.getAsset(assetId);
    const result = player.sell(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success && asset) {
      eventSystem.addEntry(result.message);
      renderer.showToast(getTradeInsight(asset, 'sell'), 'info');
      renderer.animateTrade(assetId, `+${(asset.price * qty).toFixed(0)}`, 'up');
    }
  },

  onBuyMax(assetId) {
    const asset = market.getAsset(assetId);
    if (!asset) return;
    const qty = Math.floor(player.cash / asset.price);
    if (qty === 0) { renderer.showToast('Not enough cash!', 'error'); return; }
    const result = player.buy(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      eventSystem.addEntry(result.message);
      renderer.showToast(getTradeInsight(asset, 'buy'), 'info');
      renderer.animateTrade(assetId, `-${(asset.price * qty).toFixed(0)}`, 'down');
    }
  },

  onSellAll(assetId) {
    const asset = market.getAsset(assetId);
    if (!asset || asset.owned === 0) { renderer.showToast('Nothing to sell!', 'error'); return; }
    const qty = asset.owned;
    const result = player.sell(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      eventSystem.addEntry(result.message);
      renderer.showToast(getTradeInsight(asset, 'sell'), 'info');
      renderer.animateTrade(assetId, `+${(asset.price * qty).toFixed(0)}`, 'up');
    }
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
    if (upgradeId === 'volatility_damper') market.applyVolatilityDamper();
    if (upgradeId === 'time_warp') {
      idleSystem.applyTimeWarp();
      renderer.showToast('⚡ Days now pass in 30 seconds!', 'info');
    }
  },

  onPrestige() {
    if (!upgradeSystem.hasPurchased('prestige_chip')) return;
    const netWorth = player.getNetWorth(market);
    if (netWorth < 75000) {
      renderer.showToast('Need $75,000 net worth to prestige!', 'error');
      return;
    }
    if (!confirm(`Prestige? You lose all cash and assets but gain ×${upgradeSystem.getEarningsMultiplier() * 2} permanent earnings.`)) return;

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
    saveSystem.save(player, market, upgradeSystem, idleSystem, newsSystem);
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

  onShowMarketIntel() {
    renderer.showMarketIntel(market);
  },

  onSkipDay() {
    const ok = idleSystem.skipToNextDay();
    if (!ok) renderer.showToast('Need $150 to skip a day!', 'error');
    else renderer.showToast('⏩ Day skipped!', 'info');
  },
});

// ── Insight panel trigger ─────────────────────────────────────────────────────

document.addEventListener('open-insight', (e) => {
  renderer.showInsightPanel((e as CustomEvent<string>).detail, market);
});

// ── Start ─────────────────────────────────────────────────────────────────────

renderer.update(
  market, player, eventSystem, upgradeSystem, 0,
  idleSystem.getDayCount(), idleSystem.getSecondsInDay(), idleSystem.getSecondsPerDay(),
  newsSystem,
);
idleSystem.start();
eventSystem.addEntry('📈 IdleStonks launched. Events fire every 2–5 days. Watch 📰 Breaking News for timed opportunities.', 'neutral');
