import { Market } from './core/Market.ts';
import { Player } from './core/Player.ts';
import { EventSystem } from './core/EventSystem.ts';
import { NewsSystem } from './core/NewsSystem.ts';
import { UpgradeSystem } from './systems/UpgradeSystem.ts';
import { SaveSystem } from './systems/SaveSystem.ts';
import { IdleSystem } from './systems/IdleSystem.ts';
import { RankSystem } from './systems/RankSystem.ts';
import { BlackMarketSystem } from './systems/BlackMarketSystem.ts';
import { InvestorSystem } from './systems/InvestorSystem.ts';
import { BlackMarketPanel } from './ui/BlackMarketPanel.ts';
import { HedgeFundSystem } from './systems/HedgeFundSystem.ts';
import { HedgeFundPanel } from './ui/HedgeFundPanel.ts';
import { SoundSystem } from './systems/SoundSystem.ts';
import { Renderer } from './ui/render.ts';
import { TutorialSystem } from './systems/TutorialSystem.ts';
import { TutorialOverlay } from './ui/TutorialOverlay.ts';
import { getTradeInsight } from './ui/components.ts';
import { screenFlash, screenShake } from './ui/animations.ts';

// Cash gifted to the player on each rank-up — makes the moment feel rewarding
const RANK_UP_BONUS: Record<string, number> = {
  day_trader:  500,
  intern:      3_000,
  manipulator: 15_000,
  wolf:        75_000,
  overlord:    200_000,
};

// ── Bootstrap ────────────────────────────────────────────────────────────────

const market          = new Market();
const player          = new Player();
const eventSystem     = new EventSystem();
const newsSystem      = new NewsSystem();
const upgradeSystem   = new UpgradeSystem();
const saveSystem      = new SaveSystem();
const rankSystem      = new RankSystem();
const bmSystem        = new BlackMarketSystem();
const investorSystem  = new InvestorSystem();
const hfSystem        = new HedgeFundSystem();
const soundSystem     = new SoundSystem();
const tutorialSystem  = new TutorialSystem();
const tutorialHasSave = tutorialSystem.load();

// ── Idle system ───────────────────────────────────────────────────────────────
// Created before renderer so save restoration can set day state before first render.

let lastBmDay  = -1;
let lastHfDay  = -1;
let prevHfNetWorth = -1;
let dayStartNetWorth = 0;
let dayStartBmCalls  = 0;
let dayStartBmPosts  = 0;

const MILESTONES = [5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000];
const MILESTONE_LABELS = ['$5K', '$10K', '$25K', '$50K', '$100K', '$250K', '$500K', '$1M'];
let lastMilestoneIdx = -1;

// hfSystem declared before IdleSystem so it can be passed in
const idleSystem = new IdleSystem(
  market, player, eventSystem, upgradeSystem, saveSystem,
  { // callbacks

    onTick(tick, day, secondsInDay, secondsPerDay) {
      const nw = player.getNetWorth(market);

      // Net worth milestone check
      for (let i = lastMilestoneIdx + 1; i < MILESTONES.length; i++) {
        if (nw >= MILESTONES[i]) {
          lastMilestoneIdx = i;
          renderer.showMilestone(`💰 ${MILESTONE_LABELS[i]} NET WORTH`, `Day ${day + 1} · ${market.getUnlockedAssets().filter(a => a.owned > 0).length} positions`);
          soundSystem.play('rank_up');
        } else break;
      }

      // Rank-up check
      const { rankUp, newRank } = rankSystem.checkRankUp(nw);
      if (rankUp && newRank) {
        renderer.showRankUp(newRank);
        screenFlash('good');
        soundSystem.play('rank_up');
        eventSystem.addEntry(`🎖 Rank up: ${newRank.name}!`, 'good');
        const bonus = RANK_UP_BONUS[newRank.id] ?? 0;
        if (bonus > 0) {
          player.cash += bonus;
          renderer.showToast(`🎖 ${newRank.name}! Bonus: +$${bonus.toLocaleString()}`, 'success');
        }
      }

      // BM unlock check
      if (!bmSystem.unlocked && rankSystem.isFeatureUnlocked('black_market', nw)) {
        bmSystem.unlock();
        renderer.showBlackMarketUnlock();
        soundSystem.play('unlock');
        eventSystem.addEntry('🕵️ Black Market unlocked. Check your messages.', 'good');
      }

      // HF unlock check
      if (!hfSystem.unlocked && rankSystem.isFeatureUnlocked('hedge_fund', nw)) {
        hfSystem.unlock();
        renderer.showHedgeFundUnlock();
        soundSystem.play('unlock');
        eventSystem.addEntry('💼 Hedge Fund unlocked. Check your messages.', 'good');
      }

      // BM per-second tick
      bmSystem.tickSecond();
      bmPanel.updateDisplay();

      // HF per-second tick
      hfSystem.tickSecond();
      hfPanel.updateDisplay();

      // BM day-boundary tick
      if (day !== lastBmDay) {
        lastBmDay = day;

        // Feature C: capture stats before dayTick resets them
        if (bmSystem.unlocked && day > 1) {
          renderer.showDaySummary({
            day:          day - 1,
            netWorthDelta: nw - dayStartNetWorth,
            callsMade:    dayStartBmCalls,
            postsMade:    dayStartBmPosts,
            rugProfit:    bmSystem.dailyRugProfit,
          });
        }
        dayStartNetWorth = nw;
        dayStartBmCalls  = bmSystem.callsToday;
        dayStartBmPosts  = bmSystem.postsToday;

        const consequence = bmSystem.dayTick();
        if (consequence) {
          if (consequence.type === 'fine' || consequence.type === 'case_lost') {
            soundSystem.play('loss');
            player.cash = Math.max(0, player.cash - (consequence.fineAmount ?? 0));
          }
          const isWin = consequence.type === 'case_won';
          renderer.showToast(consequence.message, isWin ? 'success' : 'error');
          renderer.showEventPopup({ id: Date.now(), timestamp: Date.now(), message: consequence.message, severity: isWin ? 'good' : 'bad' });
          if (!isWin) screenFlash('bad');
        }
      }

      // HF day-boundary tick
      if (day !== lastHfDay) {
        lastHfDay = day;
        const dailyReturnPct = prevHfNetWorth > 0
          ? ((nw - prevHfNetWorth) / prevHfNetWorth) * 100
          : 0;
        prevHfNetWorth = nw;
        const { consequences, managementFee, performanceFee } = hfSystem.dayTick(dailyReturnPct);
        if (managementFee > 0) {
          player.cash += managementFee;
        }
        if (performanceFee > 0) {
          player.cash += performanceFee;
          renderer.showToast(`💼 Performance fee: +$${performanceFee.toLocaleString()}!`, 'success');
        }
        for (const c of consequences) {
          if (c.type === 'withdrawal') {
            soundSystem.play('loss');
            renderer.showToast(c.message, 'error');
            renderer.showEventPopup({ id: Date.now(), timestamp: Date.now(), message: c.message, severity: 'bad' });
            screenFlash('bad');
          } else if (c.type === 'incoming_call' && c.investorId) {
            soundSystem.play('phone_ring');
            hfPanel.notifyIncomingCall(c.investorId);
          }
        }
      }

      renderer.update(market, player, eventSystem, upgradeSystem, tick, day, secondsInDay, secondsPerDay, newsSystem, rankSystem, investorSystem);
    },

    onEvent(entry) {
      const type = entry.severity === 'bad' ? 'error' : entry.severity === 'good' ? 'success' : 'chaos';
      renderer.showToast(entry.message, type);
      renderer.showEventPopup(entry);
      if (entry.severity === 'bad')   { soundSystem.play('loss');   screenFlash('bad'); screenShake('light'); }
      else if (entry.severity === 'good')  { soundSystem.play('profit'); screenFlash('good'); }
      else if (entry.severity === 'chaos') { soundSystem.play('risk_warning'); screenFlash('chaos'); screenShake('heavy'); }
    },

    onUnlock(name) {
      renderer.showToast(`🔓 New asset unlocked: ${name}!`, 'success');
      eventSystem.addEntry(`🔓 New asset unlocked: ${name}!`, 'good');
    },

    onNewsGenerated(item) {
      soundSystem.play('news_alert');
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
      if (resolution.severity === 'bad') { screenFlash('bad'); screenShake('light'); }
      else if (resolution.severity === 'good') screenFlash('good');
    },
  },
  newsSystem,
  rankSystem,
  bmSystem,
  investorSystem,
  hfSystem,
);

// ── Restore save ──────────────────────────────────────────────────────────────

const savedData = saveSystem.load();
if (savedData) {
  saveSystem.applyLoad(savedData, player, market, upgradeSystem, idleSystem, newsSystem, rankSystem, bmSystem, investorSystem, hfSystem);
  market.checkUnlocks(player.getNetWorth(market));
  if (upgradeSystem.hasPurchased('market_mover')) market.applyVolatilityDamper();
  idleSystem.setDaySpeed(upgradeSystem.getDaySpeedSeconds());
  upgradeSystem.syncPlayerMultiplier(player);
}

function _applyUpgradeSideEffects(id: string, level: number): void {
  if (id === 'day_engine') idleSystem.setDaySpeed(upgradeSystem.getDaySpeedSeconds());
  if (id === 'market_mover' && level === 1) market.applyVolatilityDamper();
  upgradeSystem.syncPlayerMultiplier(player);
}

// ── Renderer ──────────────────────────────────────────────────────────────────

const renderer = new Renderer({
  onBuy(assetId, qty) {
    const asset = market.getAsset(assetId);
    const result = player.buy(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success && asset) {
      soundSystem.play('buy');
      eventSystem.addEntry(result.message);
      renderer.showToast(getTradeInsight(asset, 'buy'), 'info');
      renderer.animateTrade(assetId, `-${(asset.price * qty).toFixed(0)}`, 'down');
      tutorialSystem.notifyAction('buy');
    }
  },

  onSell(assetId, qty) {
    const asset = market.getAsset(assetId);
    const cashBefore = player.cash;
    const result = player.sell(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success && asset) {
      const profit = player.cash - cashBefore;
      soundSystem.play(profit > 0 ? 'profit' : 'sell');
      eventSystem.addEntry(result.message);
      renderer.showToast(getTradeInsight(asset, 'sell'), 'info');
      renderer.animateTrade(assetId, `+${(asset.price * qty).toFixed(0)}`, 'up');
      tutorialSystem.notifyAction('sell');
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
      soundSystem.play('buy');
      eventSystem.addEntry(result.message);
      renderer.showToast(getTradeInsight(asset, 'buy'), 'info');
      renderer.animateTrade(assetId, `-${(asset.price * qty).toFixed(0)}`, 'down');
      tutorialSystem.notifyAction('buy');
    }
  },

  onSellAll(assetId) {
    const asset = market.getAsset(assetId);
    if (!asset || asset.owned === 0) { renderer.showToast('Nothing to sell!', 'error'); return; }
    const qty = asset.owned;
    const cashBefore = player.cash;
    const result = player.sell(assetId, qty, market);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      const profit = player.cash - cashBefore;
      soundSystem.play(profit > 0 ? 'profit' : 'sell');
      eventSystem.addEntry(result.message);
      renderer.showToast(getTradeInsight(asset, 'sell'), 'info');
      renderer.animateTrade(assetId, `+${(asset.price * qty).toFixed(0)}`, 'up');
      tutorialSystem.notifyAction('sell');
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
    const mutateCost = upgradeSystem.getManipulateCost();
    if (player.cash < mutateCost) {
      renderer.showToast(`Need $${mutateCost.toLocaleString()} to manipulate the market!`, 'error');
      renderer.hideModal();
      return;
    }
    player.cash -= mutateCost;
    const successBonus = upgradeSystem.getManipulateSuccessBonus();
    const result = market.manipulate(assetId, successBonus);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    eventSystem.addEntry(result.message, result.success ? 'good' : 'bad');
    renderer.hideModal();
  },

  onBuyUpgrade(upgradeId) {
    // All upgrades are now leveled — delegate to buyLevel handler
    const result = upgradeSystem.buyLevel(upgradeId, player.cash);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (!result.success) return;
    player.cash = result.newCash;
    eventSystem.addEntry(result.message, 'good');
    _applyUpgradeSideEffects(upgradeId, result.newLevel);
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
    saveSystem.save(player, market, upgradeSystem, idleSystem, newsSystem, rankSystem, bmSystem, investorSystem, hfSystem);
  },

  onDarkModeToggle() {
    renderer.toggleDarkMode();
  },

  onClearSave() {
    saveSystem.clearSave();
    tutorialSystem.clearSave();
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
    else renderer.showToast(upgradeSystem.skipDayIsFree() ? '⏩ Day skipped (free)!' : '⏩ Day skipped!', 'info');
  },

  onSetCash(amount: number) {
    player.cash = amount;
  },

  onBuyLeveledUpgrade(id: string) {
    const result = upgradeSystem.buyLevel(id, player.cash);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      player.cash = result.newCash;
      eventSystem.addEntry(result.message, 'good');
      _applyUpgradeSideEffects(id, result.newLevel);
    }
  },

  onHireInvestor(tierId: string) {
    const result = investorSystem.hire(tierId, player.cash, rankSystem.getHighestRankIndex());
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      player.cash = result.newCash;
      eventSystem.addEntry(result.message, 'good');
    }
  },
});

// ── Black market panel ────────────────────────────────────────────────────────

const bmPanel = new BlackMarketPanel(bmSystem);
bmPanel.mount(document.getElementById('bm-panel-mount')!, {
  showToast:    (msg, type) => renderer.showToast(msg, type as 'success' | 'error' | 'info' | 'chaos'),
  addCash:      (amt) => { player.cash += amt; },
  deductCash:   (amt) => { if (player.cash < amt) return false; player.cash -= amt; return true; },
  openBmTab:    () => renderer.switchTab('bm'),
  onCallStart:  () => soundSystem.play('call_connect'),
  onCallEnd:    () => soundSystem.play('call_hangup'),
});
renderer.setBmPanel(bmPanel);
if (bmSystem.unlocked) renderer.revealBlackMarketTab();

// ── Hedge fund panel ──────────────────────────────────────────────────────────

const hfPanel = new HedgeFundPanel(hfSystem);
hfPanel.mount(document.getElementById('hf-panel-mount')!, {
  showToast:    (msg, type) => renderer.showToast(msg, type as 'success' | 'error' | 'info' | 'chaos'),
  addCash:      (amt) => { player.cash += amt; },
  deductCash:   (amt) => { player.cash = Math.max(0, player.cash - amt); },
  openHfTab:    () => renderer.switchTab('hf'),
  onCallStart:  () => soundSystem.play('call_connect'),
  onCallEnd:    () => soundSystem.play('call_hangup'),
});
renderer.setHfPanel(hfPanel);
if (hfSystem.unlocked) renderer.revealHedgeFundTab();
renderer.setSoundSystem(soundSystem);

// ── Tutorial ──────────────────────────────────────────────────────────────────
// Returning players who existed before tutorial feature → skip automatically.
if (savedData && !tutorialHasSave) tutorialSystem.skip();
const tutorialOverlay = new TutorialOverlay(tutorialSystem);
tutorialOverlay.init();

// ── Insight panel trigger ─────────────────────────────────────────────────────

document.addEventListener('open-insight', (e) => {
  renderer.showInsightPanel((e as CustomEvent<string>).detail, market);
});

// ── Start ─────────────────────────────────────────────────────────────────────

renderer.update(
  market, player, eventSystem, upgradeSystem, 0,
  idleSystem.getDayCount(), idleSystem.getSecondsInDay(), idleSystem.getSecondsPerDay(),
  newsSystem, rankSystem, investorSystem,
);
idleSystem.start();
eventSystem.addEntry('📈 IdleStonks launched. Events fire every 2–5 days. Watch 📰 Breaking News for timed opportunities.', 'neutral');
