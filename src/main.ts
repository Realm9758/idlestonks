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
import { MissionSystem } from './systems/MissionSystem.ts';
import { QteOverlay } from './ui/QteOverlay.ts';
import { MissionPanel } from './ui/MissionPanel.ts';
import { getTradeInsight } from './ui/components.ts';
import { screenFlash, screenShake, spawnBigSellCelebration, showEventFlashBanner } from './ui/animations.ts';
import { AchievementSystem } from './systems/AchievementSystem.ts';
import { PropertySystem } from './systems/PropertySystem.ts';
import { MarketAccessSystem } from './systems/MarketAccessSystem.ts';
import { AssetsPanel } from './ui/AssetsPanel.ts';
import { showMarketUnlockCelebration } from './ui/MarketModals.ts';

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
const missionSystem      = new MissionSystem();
const achievementSystem  = new AchievementSystem();
const qteOverlay         = new QteOverlay();
const propertySystem     = new PropertySystem();
const marketAccessSystem = new MarketAccessSystem();

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

      // News Manipulation unlock (requires BM active + $200k net worth)
      if (bmSystem.unlocked && !bmSystem.newsManipUnlocked && nw >= 200_000) {
        bmSystem.newsManipUnlocked = true;
        soundSystem.play('unlock');
        renderer.showToast('📰 News Manipulation unlocked! Control the narrative in the Black Market.', 'success');
        eventSystem.addEntry('📰 News Manipulation unlocked — shape the market.', 'good');
        bmPanel.addChatMessage('new feature unlocked: news manipulation 📰 check the News tab');
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

      // Mission system tick
      missionSystem.tick(player, market, rankSystem.getHighestRankIndex(), bmSystem.rugPullCount);
      missionPanel.refresh(missionSystem);

      // Mission autosave every 30 seconds
      if (tick % 30 === 0) {
        localStorage.setItem('idlestonks_missions', JSON.stringify(missionSystem.saveState()));
      }

      // Property income — fire once per day
      if (secondsInDay === 1 && propertySystem.properties.length > 0) {
        const propResult = propertySystem.dayTick();
        if (propResult.income !== 0) {
          player.cash += propResult.income;
          if (propResult.income > 0) player.totalEarned += propResult.income;
          const label = propResult.income >= 0 ? `+$${propResult.income.toLocaleString()}` : `-$${Math.abs(propResult.income).toLocaleString()}`;
          renderer.showToast(`🏠 Property income: ${label}`, propResult.income >= 0 ? 'success' : 'error');
        }
        for (const ev of propResult.events) {
          eventSystem.addEntry(ev.message, ev.type === 'income' ? 'good' : 'bad');
        }
        // Autosave property state
        localStorage.setItem('idlestonks_properties', JSON.stringify(propertySystem.saveState()));
        localStorage.setItem('idlestonks_market_access', JSON.stringify(marketAccessSystem.saveState()));
        // Refresh the assets panel if visible
        assetsPanel.refresh(player.cash, rankSystem.getHighestRankIndex(), player.getNetWorth(market), bmSystem.unlocked);
      }

      // Net worth history — record once per day
      if (secondsInDay === 1) {
        nwHistory.push(Math.round(nw));
        if (nwHistory.length > 90) nwHistory.splice(0, nwHistory.length - 90);
        if (tick % 60 === 1) localStorage.setItem(NW_HISTORY_KEY, JSON.stringify(nwHistory));
      }

      // Floating missions button — show pending mission count
      const pendingMissions = missionSystem.getMissions().filter(m => !m.completed).length;
      renderer.updateFloatingMissionsBtn(pendingMissions);

      // Achievement checks every 5 ticks
      if (tick % 5 === 0) checkAchievements();

      renderer.update(market, player, eventSystem, upgradeSystem, tick, day, secondsInDay, secondsPerDay, newsSystem, rankSystem, investorSystem, nwHistory);
    },

    onEvent(entry) {
      const type = entry.severity === 'bad' ? 'error' : entry.severity === 'good' ? 'success' : 'chaos';
      renderer.showToast(entry.message, type);
      renderer.showEventPopup(entry);
      if (entry.severity === 'bad')   { soundSystem.play('loss');   screenFlash('bad'); screenShake('light'); showEventFlashBanner(entry.message, 'bad'); }
      else if (entry.severity === 'good')  { soundSystem.play('profit'); screenFlash('good'); showEventFlashBanner(entry.message, 'good'); }
      else if (entry.severity === 'chaos') { soundSystem.play('risk_warning'); screenFlash('chaos'); screenShake('heavy'); showEventFlashBanner(entry.message, 'chaos'); }
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

    onEventPreChoice(hint) {
      renderer.showEventChoiceModal(hint, (choice) => {
        idleSystem.resolveEventChoice(choice as 'bail' | 'hedge' | 'double' | 'watch');
      });
    },

    onLimitOrderFilled(message) {
      renderer.showToast(`📋 ${message}`, 'success');
      soundSystem.play('profit');
      screenFlash('good');
      eventSystem.addEntry(message, 'good');
      renderer.showEventPopup({ id: Date.now(), timestamp: Date.now(), message: `📋 ${message}`, severity: 'good' });
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
      missionSystem.onBuy(asset.momentum);
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
      missionSystem.onSell(asset.hype, asset.momentum);
      if (profit >= 1000) spawnBigSellCelebration(profit);
      const qteThreshold = [50, 150, 300, 600, 1000, 2000][rankSystem.getHighestRankIndex()] ?? 300;
      const saleValue = asset.price * qty;
      if (saleValue >= qteThreshold && (asset.hype > 0.5 || asset.momentum > 0.012)) {
        const qteType = asset.hype > 0.5 ? 'timing_bar' : 'reaction';
        const qteReason = asset.hype > 0.5 ? `🔥 Hype sell — ${asset.name}` : `📈 Momentum trade — ${asset.name}`;
        qteOverlay.trigger(qteType, qteReason, (r) => {
          missionSystem.onQteResult(r);
          if (r !== 'missed') {
            const bonus = saleValue * (r === 'perfect' ? 0.25 : 0.10);
            player.cash += bonus;
            player.totalEarned += bonus;
            renderer.showToast(`${r === 'perfect' ? '🎯 PERFECT' : '✅ GOOD'} +$${bonus.toFixed(0)} bonus!`, 'success');
            soundSystem.play('profit');
          }
        });
      }
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
      missionSystem.onBuy(asset.momentum);
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
      missionSystem.onSell(asset.hype, asset.momentum);
      if (profit >= 1000) spawnBigSellCelebration(profit);
      const qteThreshold = [50, 150, 300, 600, 1000, 2000][rankSystem.getHighestRankIndex()] ?? 300;
      const saleValue = asset.price * qty;
      if (saleValue >= qteThreshold && (asset.hype > 0.5 || asset.momentum > 0.012)) {
        const qteType = asset.hype > 0.5 ? 'timing_bar' : 'reaction';
        const qteReason = asset.hype > 0.5 ? `🔥 Hype sell — ${asset.name}` : `📈 Momentum trade — ${asset.name}`;
        qteOverlay.trigger(qteType, qteReason, (r) => {
          missionSystem.onQteResult(r);
          if (r !== 'missed') {
            const bonus = saleValue * (r === 'perfect' ? 0.25 : 0.10);
            player.cash += bonus;
            player.totalEarned += bonus;
            renderer.showToast(`${r === 'perfect' ? '🎯 PERFECT' : '✅ GOOD'} +$${bonus.toFixed(0)} bonus!`, 'success');
            soundSystem.play('profit');
          }
        });
      }
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
    if (result.success) missionSystem.onMarketManipSuccess();
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
    localStorage.removeItem('idlestonks_missions');
    localStorage.removeItem('idlestonks_properties');
    localStorage.removeItem('idlestonks_market_access');
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

  onAddLimitOrder(assetId: string, type: 'buy' | 'sell', triggerPrice: number, quantity: number) {
    player.addLimitOrder(assetId, type, triggerPrice, quantity);
    const asset = market.getAsset(assetId);
    const dir = type === 'buy' ? '≤' : '≥';
    renderer.showToast(`📋 Order set: ${type === 'buy' ? 'Buy' : 'Sell'} ${quantity}× ${asset?.emoji ?? ''} if price ${dir} $${triggerPrice.toFixed(2)}`, 'info');
  },

  onCancelLimitOrder(orderId: string) {
    player.cancelLimitOrder(orderId);
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

// ── Mission panel + QTE overlay ───────────────────────────────────────────────

const missionPanel = new MissionPanel();
missionPanel.mount(document.getElementById('missions-panel-mount')!);
qteOverlay.mount(document.body);

// ── Assets panel (Properties + Market Access) ─────────────────────────────────

const refreshAssetsPanel = () => {
  assetsPanel.refresh(
    player.cash,
    rankSystem.getHighestRankIndex(),
    player.getNetWorth(market),
    bmSystem.unlocked,
  );
};

const assetsPanel = new AssetsPanel(propertySystem, marketAccessSystem, market, {
  onBuyProperty(configId) {
    const result = propertySystem.buy(configId, player.cash);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      player.cash -= result.cost;
      eventSystem.addEntry(result.message, 'good');
      soundSystem.play('buy');
      localStorage.setItem('idlestonks_properties', JSON.stringify(propertySystem.saveState()));
      refreshAssetsPanel();
    }
  },
  onUpgradeProperty(configId) {
    const result = propertySystem.upgrade(configId, player.cash);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      player.cash -= result.cost;
      eventSystem.addEntry(result.message, 'good');
      soundSystem.play('rank_up');
      localStorage.setItem('idlestonks_properties', JSON.stringify(propertySystem.saveState()));
      refreshAssetsPanel();
    }
  },
  onUnlockMarket(marketId) {
    const ctx = {
      cash: player.cash,
      rankIndex: rankSystem.getHighestRankIndex(),
      netWorth: player.getNetWorth(market),
      blackMarketUnlocked: bmSystem.unlocked,
    };
    const result = marketAccessSystem.unlock(marketId, ctx);
    renderer.showToast(result.message, result.success ? 'success' : 'error');
    if (result.success) {
      player.cash -= result.cost;
      for (const id of result.unlockedAssetIds) {
        const asset = market.getAsset(id);
        if (asset) asset.isUnlocked = true;
      }
      eventSystem.addEntry(result.message, 'good');
      soundSystem.play('unlock');
      localStorage.setItem('idlestonks_market_access', JSON.stringify(marketAccessSystem.saveState()));
      if (result.market) showMarketUnlockCelebration(result.market, market);
      refreshAssetsPanel();
    }
  },
  onGoToMarket() {
    const tabBtn = document.getElementById('tab-market');
    if (tabBtn) (tabBtn as HTMLElement).click();
  },
});

assetsPanel.mount(document.getElementById('assets-panel-mount')!);

// Load saved property + market access state
(function loadAssetsState() {
  try {
    const propRaw = localStorage.getItem('idlestonks_properties');
    if (propRaw) propertySystem.loadState(JSON.parse(propRaw));
  } catch { /* noop */ }

  try {
    const masRaw = localStorage.getItem('idlestonks_market_access');
    if (masRaw) {
      const assetIds = marketAccessSystem.loadState(JSON.parse(masRaw));
      for (const id of assetIds) {
        const asset = market.getAsset(id);
        if (asset) asset.isUnlocked = true;
      }
    }
  } catch { /* noop */ }

  refreshAssetsPanel();
})();

missionSystem.setOnComplete((m) => {
  player.cash += m.cashReward;
  player.totalEarned += m.cashReward;
  renderer.showToast(`🎯 Mission complete: "${m.title}"! +$${m.cashReward.toLocaleString()} +${m.xpReward}XP`, 'success');
  soundSystem.play('profit');
  eventSystem.addEntry(`🎯 Mission "${m.title}" completed! Reward: +$${m.cashReward.toLocaleString()}`, 'good');
  // Badge the missions tab if it's not currently active
  renderer.addTabBadge('missions');
  checkAchievements();
});

const missionSaveRaw = localStorage.getItem('idlestonks_missions');
if (missionSaveRaw) {
  try { missionSystem.loadState(JSON.parse(missionSaveRaw), player, rankSystem.getHighestRankIndex()); }
  catch { missionSystem.initialize(rankSystem.getHighestRankIndex(), player); }
} else {
  missionSystem.initialize(rankSystem.getHighestRankIndex(), player);
}
missionPanel.initialRender(missionSystem);

// ── Tutorial ──────────────────────────────────────────────────────────────────
// Returning players who existed before tutorial feature → skip automatically.
if (savedData && !tutorialHasSave) tutorialSystem.skip();
const tutorialOverlay = new TutorialOverlay(tutorialSystem);
tutorialOverlay.init();

// ── Insight panel trigger ─────────────────────────────────────────────────────

document.addEventListener('open-insight', (e) => {
  renderer.showInsightPanel((e as CustomEvent<string>).detail, market);
});

// ── Daily login bonus ─────────────────────────────────────────────────────────

(function checkLoginBonus() {
  if (!savedData) return; // new player, no bonus
  const lastLogin = parseInt(localStorage.getItem('idlestonks_last_login') ?? '0', 10);
  const now = Date.now();
  const hoursSince = (now - lastLogin) / 3_600_000;
  localStorage.setItem('idlestonks_last_login', String(now));
  if (lastLogin === 0 || hoursSince < 20) return; // first load or same-day
  const nw = player.getNetWorth(market);
  const bonus = Math.max(500, Math.round(nw * 0.02)); // 2% of net worth, min $500
  player.cash += bonus;
  player.totalEarned += bonus;
  const popup = document.createElement('div');
  popup.className = 'login-bonus-popup';
  popup.innerHTML = `
    <div class="login-bonus-title">🎁 Daily Login Bonus</div>
    <div class="login-bonus-amount">+$${bonus.toLocaleString()}</div>
    <div class="login-bonus-sub">Welcome back! Here's 2% of your net worth.</div>
    <div class="login-bonus-close">Click anywhere to continue →</div>
  `;
  document.body.appendChild(popup);
  const dismiss = () => { popup.style.opacity = '0'; popup.style.transform = 'translate(-50%,-50%) scale(0.9)'; popup.style.transition = 'all 0.25s'; setTimeout(() => popup.remove(), 260); };
  popup.addEventListener('click', dismiss);
  setTimeout(dismiss, 5000);
})();

// ── Net worth history (for header sparkline) ──────────────────────────────────

const NW_HISTORY_KEY = 'idlestonks_nw_history';
const nwHistory: number[] = (() => {
  try { return JSON.parse(localStorage.getItem(NW_HISTORY_KEY) ?? '[]'); } catch { return []; }
})();

// ── Achievement system ────────────────────────────────────────────────────────

const ACH_KEY = 'idlestonks_achievements';
try { achievementSystem.loadState(JSON.parse(localStorage.getItem(ACH_KEY) ?? '{}')); } catch { /* */ }

achievementSystem.setOnUnlock((ach) => {
  soundSystem.play('rank_up');
  // Show achievement toast
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `<div class="ach-toast-header">🏅 Achievement Unlocked</div><div class="ach-toast-title">${ach.emoji} ${ach.title}</div><div class="ach-toast-desc">${ach.description}</div>`;
  document.body.appendChild(toast);
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  localStorage.setItem(ACH_KEY, JSON.stringify(achievementSystem.saveState()));
});

function checkAchievements(): void {
  achievementSystem.check({
    netWorth:           player.getNetWorth(market),
    totalEarned:        player.totalEarned,
    tradeCount:         player.tradeCount,
    ownedCount:         market.getAllAssets().filter(a => a.owned > 0).length,
    streak:             player.streak,
    dayCount:           idleSystem.getDayCount(),
    rugPullCount:       bmSystem.rugPullCount,
    missionsCompleted:  missionSystem.completedCount,
    prestigeCount:      upgradeSystem.prestigeCount,
    bmHeat:             bmSystem.heat,
    rankIndex:          rankSystem.getHighestRankIndex(),
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────

renderer.update(
  market, player, eventSystem, upgradeSystem, 0,
  idleSystem.getDayCount(), idleSystem.getSecondsInDay(), idleSystem.getSecondsPerDay(),
  newsSystem, rankSystem, investorSystem,
);
idleSystem.start();
eventSystem.addEntry('📈 IdleStonks launched. Events fire every 2–5 days. Watch 📰 Breaking News for timed opportunities.', 'neutral');
