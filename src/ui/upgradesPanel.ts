import type { UpgradeSystem } from '../systems/UpgradeSystem.ts';
import type { InvestorSystem } from '../systems/InvestorSystem.ts';
import type { RankSystem } from '../systems/RankSystem.ts';
import type { Player } from '../core/Player.ts';
import type { Market } from '../core/Market.ts';
import { createEl, formatCurrency } from './components.ts';
import { PATH_UPGRADES } from '../systems/UpgradeSystem.ts';
import { INVESTOR_TIERS } from '../systems/InvestorSystem.ts';

export interface UpgradesPanelState {
  lastUpgradeKey: string;
  lastInvestorKey: string;
}

export function buildPathCards(
  path: 'automation' | 'manipulation' | 'capital',
  upgradeSystem: UpgradeSystem,
  onBuyLeveledUpgrade: (id: string) => void,
  clearUpgradeKey: () => void,
): void {
  const grid = document.getElementById(`upg-path-${path}`)!;
  grid.innerHTML = '';
  for (const def of PATH_UPGRADES.filter(u => u.path === path)) {
    const level = upgradeSystem.getLevel(def.id);
    const maxLevel = def.levelCosts.length;
    const maxed = level >= maxLevel;
    const card = createEl('div', `upg-card upg-card-path${maxed ? ' upg-maxed' : ''}`);
    const pips = Array.from({ length: maxLevel }, (_, i) =>
      `<span class="upg-pip${i < level ? ' upg-pip-filled' : ''}"></span>`,
    ).join('');
    const currDesc = level > 0 ? def.levelEffects[level - 1] : 'Not yet purchased';
    const nextDesc = !maxed ? def.levelEffects[level] : null;
    const cost = upgradeSystem.getCost(def.id);
    card.innerHTML = `
      <div class="upg-path-header">
        <span class="upg-card-icon">${def.emoji}</span>
        <span class="upg-card-name">${def.name}</span>
        <div class="upg-pips">${pips}</div>
      </div>
      <div class="upg-path-body">
        <div class="upg-curr-effect">${level > 0 ? `<strong>Lv ${level}:</strong> ${currDesc}` : currDesc}</div>
        ${nextDesc ? `<div class="upg-next-effect">→ Lv ${level + 1}: ${nextDesc}</div>` : ''}
      </div>
      <div class="upg-card-action">
        ${maxed
          ? '<span class="upg-maxed-badge">⭐ MAXED</span>'
          : `<button class="btn upg-level-btn" data-upg-id="${def.id}">${cost ? `Upgrade — ${formatCurrency(cost)}` : '—'}</button>`
        }
      </div>`;
    if (!maxed) {
      card.querySelector<HTMLButtonElement>('.upg-level-btn')!.addEventListener('click', () => {
        onBuyLeveledUpgrade(def.id);
        clearUpgradeKey();
      });
    }
    grid.appendChild(card);
  }
}

export function refreshPathButtons(
  upgradeSystem: UpgradeSystem,
  player: Player,
  netWorth: number,
): void {
  for (const path of ['automation', 'manipulation', 'capital'] as const) {
    const grid = document.getElementById(`upg-path-${path}`)!;
    for (const btn of grid.querySelectorAll<HTMLButtonElement>('.upg-level-btn')) {
      const id = btn.dataset.upgId!;
      const def = PATH_UPGRADES.find(u => u.id === id);
      if (!def) continue;
      const cost = upgradeSystem.getCost(id);
      if (cost === null) { btn.disabled = true; btn.textContent = 'MAXED'; continue; }
      const unlocked = netWorth >= def.unlockNetWorth;
      const canAfford = player.cash >= cost;
      btn.disabled = !unlocked || !canAfford;
      if (!unlocked) {
        btn.textContent = `🔒 ${formatCurrency(def.unlockNetWorth)} NW`;
        btn.classList.add('upg-locked');
      } else {
        btn.textContent = `Upgrade — ${formatCurrency(cost)}`;
        btn.classList.remove('upg-locked');
      }
    }
  }
}

export function buildInvestorCards(
  investorSystem: InvestorSystem | null,
  onHireInvestor: (tierId: string) => void,
  clearInvestorKey: () => void,
): void {
  const grid = document.getElementById('upg-investor-grid')!;
  grid.innerHTML = '';
  for (const tier of INVESTOR_TIERS) {
    const count = investorSystem?.getCount(tier.id) ?? 0;
    const full = investorSystem?.isFull(tier.id) ?? false;
    const card = createEl('div', `upg-card upg-card-investor`);
    card.dataset.investorId = tier.id;
    card.innerHTML = `
      <div class="upg-investor-header">
        <span class="upg-investor-emoji">${tier.emoji}</span>
        <div class="upg-investor-meta">
          <div class="upg-card-name">${tier.name}</div>
          <div class="upg-card-desc">${tier.description}</div>
        </div>
        <div class="upg-investor-count">${count}<span class="upg-count-max">/${tier.maxCount}</span></div>
      </div>
      <div class="upg-investor-income">
        <span class="upg-income-label">Income/tick</span>
        <span class="upg-income-rate">${(tier.incomeRate * 100).toFixed(4)}% × net worth × count</span>
      </div>
      <div class="upg-card-action">
        ${full
          ? '<span class="upg-full-badge">FULL</span>'
          : `<button class="btn upg-hire-btn" data-investor-id="${tier.id}" data-rank-req="${tier.unlockRankIndex}">Hire</button>`
        }
      </div>`;
    if (!full) {
      card.querySelector<HTMLButtonElement>('.upg-hire-btn')!.addEventListener('click', () => {
        onHireInvestor(tier.id);
        clearInvestorKey();
      });
    }
    grid.appendChild(card);
  }
}

export function refreshInvestorButtons(
  player: Player,
  netWorth: number,
  investorSystem: InvestorSystem | null,
  rankSystem: RankSystem | null,
): void {
  const grid = document.getElementById('upg-investor-grid')!;
  if (!investorSystem) return;
  const rankIndex = rankSystem?.getHighestRankIndex() ?? 0;
  for (const btn of grid.querySelectorAll<HTMLButtonElement>('.upg-hire-btn')) {
    const id = btn.dataset.investorId!;
    const tier = INVESTOR_TIERS.find(t => t.id === id);
    if (!tier) continue;
    const cost = investorSystem.getHireCost(id);
    const unlocked = rankIndex >= tier.unlockRankIndex;
    const canAfford = player.cash >= cost;
    btn.disabled = !unlocked || !canAfford;
    if (!unlocked) {
      const reqRank = rankSystem?.getAllRanks()[tier.unlockRankIndex];
      btn.textContent = `🔒 ${reqRank?.name ?? 'Higher rank'}`;
      btn.classList.add('upg-locked');
    } else {
      btn.textContent = `Hire — ${formatCurrency(cost)}`;
      btn.classList.remove('upg-locked');
      const incomeEl = btn.closest('.upg-card')?.querySelector<HTMLElement>('.upg-income-rate');
      if (incomeEl) {
        const count = investorSystem.getCount(id);
        const perTick = netWorth * tier.incomeRate * (count + 1);
        incomeEl.textContent = `+${formatCurrency(perTick)}/tick with ${count + 1} hired`;
      }
    }
  }
}

export function updateUpgradesTab(
  upgradeSystem: UpgradeSystem,
  player: Player,
  market: Market,
  investorSystem: InvestorSystem | null,
  rankSystem: RankSystem | null,
  onBuyLeveledUpgrade: (id: string) => void,
  onHireInvestor: (tierId: string) => void,
  state: UpgradesPanelState,
): void {
  if (upgradeSystem.hasPurchased('prestige_chip')) {
    document.getElementById('btn-prestige')!.classList.remove('hidden');
  }

  const netWorth = player.getNetWorth(market);
  const upgradeKey = PATH_UPGRADES.map(u => `${u.id}:${upgradeSystem.getLevel(u.id)}`).join(',');
  const investorKey = investorSystem
    ? INVESTOR_TIERS.map(t => `${t.id}:${investorSystem.getCount(t.id)}`).join(',')
    : '';

  if (upgradeKey !== state.lastUpgradeKey) {
    state.lastUpgradeKey = upgradeKey;
    buildPathCards('automation', upgradeSystem, onBuyLeveledUpgrade, () => { state.lastUpgradeKey = ''; });
    buildPathCards('manipulation', upgradeSystem, onBuyLeveledUpgrade, () => { state.lastUpgradeKey = ''; });
    buildPathCards('capital', upgradeSystem, onBuyLeveledUpgrade, () => { state.lastUpgradeKey = ''; });
  }

  if (investorKey !== state.lastInvestorKey) {
    state.lastInvestorKey = investorKey;
    buildInvestorCards(investorSystem, onHireInvestor, () => { state.lastInvestorKey = ''; });
  }

  refreshPathButtons(upgradeSystem, player, netWorth);
  refreshInvestorButtons(player, netWorth, investorSystem, rankSystem);
}
