import type { MissionSystem, ActiveMission } from '../systems/MissionSystem.ts';

const TYPE_META: Record<string, { label: string; icon: string; cls: string }> = {
  quick:    { label: 'QUICK',    icon: '⚡', cls: 'mp-type-quick'    },
  strategy: { label: 'STRATEGY', icon: '🧠', cls: 'mp-type-strategy' },
  risk:     { label: 'RISK',     icon: '💀', cls: 'mp-type-risk'     },
};

function fmtCash(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export class MissionPanel {
  private container: HTMLElement | null = null;

  mount(el: HTMLElement): void {
    this.container = el;
    el.innerHTML = this._skeleton();
  }

  refresh(system: MissionSystem): void {
    if (!this.container) return;

    const missions = system.getMissions();

    // Update XP counter
    const xpEl = this.container.querySelector<HTMLElement>('.mp-xp-value');
    if (xpEl) xpEl.textContent = system.totalXp.toLocaleString();
    const cntEl = this.container.querySelector<HTMLElement>('.mp-completed-value');
    if (cntEl) cntEl.textContent = String(system.completedCount);

    // Update each mission card
    for (const m of missions) {
      const card = this.container.querySelector<HTMLElement>(`[data-iid="${m.instanceId}"]`);
      if (!card) {
        // Mission instance changed — full re-render
        this._fullRender(system);
        return;
      }
      this._updateCard(card, m, system);
    }
  }

  private _fullRender(system: MissionSystem): void {
    if (!this.container) return;
    this.container.innerHTML = this._skeleton();
    const grid = this.container.querySelector<HTMLElement>('.mp-grid')!;
    for (const m of system.getMissions()) {
      grid.appendChild(this._buildCard(m, system));
    }

    const xpEl  = this.container.querySelector<HTMLElement>('.mp-xp-value');
    const cntEl = this.container.querySelector<HTMLElement>('.mp-completed-value');
    if (xpEl)  xpEl.textContent  = system.totalXp.toLocaleString();
    if (cntEl) cntEl.textContent = String(system.completedCount);
  }

  private _skeleton(): string {
    return `
      <div class="mp-wrap">
        <div class="mp-header">
          <div class="mp-title-row">
            <h2 class="mp-title">🎯 Missions</h2>
            <div class="mp-stats">
              <span class="mp-stat">⭐ XP: <strong class="mp-xp-value">0</strong></span>
              <span class="mp-stat">✅ Done: <strong class="mp-completed-value">0</strong></span>
            </div>
          </div>
          <p class="mp-subtitle">Complete missions to earn cash bonuses and XP. New missions generate automatically.</p>
        </div>
        <div class="mp-grid"></div>
        <div class="mp-qte-hint">
          <span class="mp-qte-icon">⚡</span>
          <span>QTEs trigger automatically during peak-hype sells and large momentum trades. React fast for bonus cash!</span>
        </div>
      </div>`;
  }

  private _buildCard(m: ActiveMission, system: MissionSystem): HTMLElement {
    const el = document.createElement('div');
    el.className = `mp-card mp-card-${m.type}${m.completed ? ' mp-card-done' : ''}`;
    el.dataset.iid = m.instanceId;
    el.innerHTML = this._cardInner(m, system);
    return el;
  }

  private _cardInner(m: ActiveMission, system: MissionSystem): string {
    const meta = TYPE_META[m.type];
    const pct  = system.getProgressPct(m);
    const txt  = system.getProgressText(m);

    if (m.completed) {
      return `
        <div class="mp-card-header">
          <span class="mp-type-badge ${meta.cls}">${meta.icon} ${meta.label}</span>
          <span class="mp-complete-badge">✅ COMPLETE</span>
        </div>
        <div class="mp-card-title">${m.title}</div>
        <div class="mp-card-desc">${m.description}</div>
        <div class="mp-reward-row">
          <span class="mp-reward-cash">💰 ${fmtCash(m.cashReward)}</span>
          <span class="mp-reward-xp">⭐ +${m.xpReward} XP</span>
        </div>
        <div class="mp-complete-text">Next mission generating…</div>`;
    }

    return `
      <div class="mp-card-header">
        <span class="mp-type-badge ${meta.cls}">${meta.icon} ${meta.label}</span>
        <div class="mp-reward-row">
          <span class="mp-reward-cash">💰 ${fmtCash(m.cashReward)}</span>
          <span class="mp-reward-xp">⭐ ${m.xpReward} XP</span>
        </div>
      </div>
      <div class="mp-card-title">${m.title}</div>
      <div class="mp-card-desc">${m.description}</div>
      <div class="mp-progress-wrap">
        <div class="mp-progress-track">
          <div class="mp-progress-fill mp-fill-${m.type}" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="mp-progress-label">${txt}</div>
      </div>`;
  }

  private _updateCard(card: HTMLElement, m: ActiveMission, system: MissionSystem): void {
    const wasDone = card.classList.contains('mp-card-done');
    const isDone  = m.completed;

    if (isDone !== wasDone) {
      // State changed — replace inner HTML
      card.className = `mp-card mp-card-${m.type}${isDone ? ' mp-card-done' : ''}`;
      card.innerHTML = this._cardInner(m, system);
      return;
    }

    if (!isDone) {
      const fill  = card.querySelector<HTMLElement>('.mp-progress-fill');
      const label = card.querySelector<HTMLElement>('.mp-progress-label');
      if (fill)  fill.style.width  = `${system.getProgressPct(m).toFixed(1)}%`;
      if (label) label.textContent = system.getProgressText(m);
    }
  }

  // Called once after mount to do the first full render
  initialRender(system: MissionSystem): void {
    this._fullRender(system);
  }
}
