import type { HedgeFundSystem, HfStrategy } from '../systems/HedgeFundSystem.ts';
import type { HfCallbacks } from './hfData.ts';
import { UNLOCK_CHAT, TUTORIAL_CHAT } from './hfData.ts';
import { HF_PANEL_HTML, HF_FIXED_HTML } from './hfLayout.ts';
import { HedgeFundCallUI } from './HedgeFundCall.ts';

export type { HfCallbacks };

export class HedgeFundPanel {
  private sys:     HedgeFundSystem;
  private cb:      HfCallbacks | null = null;
  private callUI:  HedgeFundCallUI | null = null;
  tutorialStarted = false;

  constructor(sys: HedgeFundSystem) {
    this.sys = sys;
  }

  mount(container: HTMLElement, callbacks: HfCallbacks): void {
    this.cb = callbacks;
    container.innerHTML = HF_PANEL_HTML;
    this._appendFixed();
    this.callUI = new HedgeFundCallUI(
      this.sys, callbacks,
      () => this.updateDisplay(),
      (id, side, text) => this._appendChatMsg(id, side, text),
    );
    this._wireEvents();
    this.updateDisplay();
  }

  private _appendFixed(): void {
    const notif = document.createElement('div');
    notif.id        = 'hf-unlock-notif';
    notif.className = 'hf-unlock-notif hidden';
    notif.innerHTML = HF_FIXED_HTML.notif;
    document.body.appendChild(notif);

    const overlay = document.createElement('div');
    overlay.id        = 'hf-messenger-overlay';
    overlay.className = 'hf-messenger-overlay hidden';
    overlay.innerHTML = HF_FIXED_HTML.messenger;
    document.body.appendChild(overlay);

    const callOverlay = document.createElement('div');
    callOverlay.id        = 'hf-call-overlay';
    callOverlay.className = 'hf-call-overlay hidden';
    callOverlay.innerHTML = HF_FIXED_HTML.callOverlay;
    document.body.appendChild(callOverlay);
  }

  private _wireEvents(): void {
    const cb = this.cb!;

    document.getElementById('hf-unlock-notif')?.addEventListener('click',    () => this._openMessenger());
    document.getElementById('hf-messenger-close')?.addEventListener('click', () => {
      document.getElementById('hf-messenger-overlay')!.classList.add('hidden');
    });
    document.getElementById('hf-messenger-open')?.addEventListener('click', () => {
      document.getElementById('hf-messenger-overlay')!.classList.add('hidden');
      document.getElementById('hf-unlock-notif')!.classList.add('hidden');
      cb.openHfTab();
    });
    document.getElementById('hf-messenger-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('hf-messenger-overlay'))
        document.getElementById('hf-messenger-overlay')!.classList.add('hidden');
    });

    document.getElementById('hf-recruits')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-hf-call-id]');
      if (btn) this.callUI?.open(btn.dataset.hfCallId!, false);
    });

    document.getElementById('btn-hire-analyst')?.addEventListener('click', () => {
      cb.deductCash(5_000);
      this.sys.hireAnalyst();
      cb.showToast('📊 Analyst hired! +10% call success.', 'success');
      this.updateDisplay();
    });

    document.getElementById('btn-hire-lawyer')?.addEventListener('click', () => {
      cb.deductCash(15_000);
      this.sys.hireLawyer();
      cb.showToast('⚖️ Lawyer hired! –40% reputation damage.', 'success');
      this.updateDisplay();
    });

    document.querySelectorAll<HTMLButtonElement>('.hf-strat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sys.setStrategy(btn.dataset.strat as HfStrategy);
        this._updateStrategyUI();
      });
    });

    document.getElementById('btn-accept-call')?.addEventListener('click',  () => this._acceptIncoming());
    document.getElementById('btn-decline-call')?.addEventListener('click', () => this._declineIncoming());
    document.getElementById('hf-call-hangup')?.addEventListener('click',   () => this.callUI?.hangUp());
  }

  // ── Incoming call ─────────────────────────────────────────────────────────

  notifyIncomingCall(investorId: string): void {
    const tmpl = this.sys.getTemplate(investorId);
    if (!tmpl) return;
    const notice   = document.getElementById('hf-incoming-notice')!;
    const nameSpan = notice.querySelector<HTMLElement>('.hf-incoming-investor') ?? document.createElement('span');
    nameSpan.className  = 'hf-incoming-investor';
    nameSpan.textContent = `${tmpl.avatar} ${tmpl.name}`;
    if (!notice.contains(nameSpan)) notice.insertBefore(nameSpan, notice.firstChild);
    notice.classList.remove('hidden');
    this.cb?.showToast(`📞 ${tmpl.avatar} ${tmpl.name} is calling...`, 'info');
  }

  private _acceptIncoming(): void {
    const id = this.sys.getPendingIncoming();
    if (!id) return;
    document.getElementById('hf-incoming-notice')!.classList.add('hidden');
    this.callUI?.open(id, true);
  }

  private _declineIncoming(): void {
    this.sys.clearPendingIncoming();
    document.getElementById('hf-incoming-notice')!.classList.add('hidden');
    this.cb?.showToast('Call declined.', 'info');
  }

  // ── Unlock / tutorial ─────────────────────────────────────────────────────

  triggerUnlockNotif(): void {
    document.getElementById('hf-unlock-notif')?.classList.remove('hidden');
  }

  private _openMessenger(): void {
    const overlay = document.getElementById('hf-messenger-overlay')!;
    const msgs    = document.getElementById('hf-messenger-msgs')!;
    const footer  = document.getElementById('hf-messenger-footer')!;
    overlay.classList.remove('hidden');
    msgs.innerHTML = '';
    footer.classList.add('hidden');
    let delay = 300;
    for (const m of UNLOCK_CHAT) {
      const d = delay;
      delay += 700 + m.text.length * 22;
      setTimeout(() => { this._appendChatMsg('hf-messenger-msgs', m.side, m.text); }, d);
    }
    setTimeout(() => footer.classList.remove('hidden'), delay + 300);
  }

  playTutorial(): void {
    if (this.tutorialStarted || this.sys.tutorialSeen) return;
    this.tutorialStarted = true;
    this.sys.tutorialSeen = true;
    const container = document.getElementById('hf-chat-messages');
    if (!container) return;
    container.innerHTML = '';
    let delay = 600;
    for (const m of TUTORIAL_CHAT) {
      const d = delay;
      delay += 700 + m.text.length * 22;
      setTimeout(() => { this._appendChatMsg('hf-chat-messages', m.side, m.text); }, d);
    }
  }

  addChatMessage(text: string): void {
    this._appendChatMsg('hf-chat-messages', 'left', text);
  }

  private _appendChatMsg(containerId: string, side: 'left' | 'right', text: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row    = document.createElement('div');
    row.className = `bm-msg-row bm-msg-${side}`;
    const bubble  = document.createElement('div');
    bubble.className   = `bm-bubble bm-bubble-${side}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  // ── Display update ────────────────────────────────────────────────────────

  updateDisplay(): void {
    const s = this.sys;
    const g = (id: string) => document.getElementById(id);

    const aumEl = g('hf-aum');
    if (aumEl)  aumEl.textContent  = `$${Math.round(s.aum).toLocaleString()}`;
    const feeEl = g('hf-fees');
    if (feeEl)  feeEl.textContent  = `$${Math.round(s.totalFeeEarned).toLocaleString()}`;

    const avg7   = s.getRecentAvgReturn();
    const perfEl = g('hf-perf');
    if (perfEl) {
      if (s.navHistory.length === 0) {
        perfEl.textContent = '—';
        perfEl.className   = 'hf-fstat-val';
      } else {
        const sign = avg7 >= 0 ? '+' : '';
        perfEl.textContent = `${sign}${avg7.toFixed(2)}%`;
        perfEl.className   = `hf-fstat-val ${avg7 >= 0 ? 'hf-perf-pos' : 'hf-perf-neg'}`;
      }
    }

    const repFill = g('hf-rep-fill') as HTMLElement | null;
    if (repFill) {
      repFill.style.height = `${s.reputation}%`;
      repFill.className = `hf-rep-fill ${s.reputation < 35 ? 'rep-low' : s.reputation < 65 ? 'rep-mid' : 'rep-high'}`;
    }
    const repLabel = g('hf-rep-label');
    if (repLabel) repLabel.textContent = Math.round(s.reputation).toString();

    const invCount = g('hf-inv-count');
    if (invCount) invCount.textContent = `${s.getInvestors().length} / 5`;
    const callsEl = g('hf-calls-today');
    if (callsEl)  callsEl.textContent = `${s.callsToday} / ${s.MAX_CALLS_PER_DAY}`;
    const cdEl = g('hf-cooldown');
    if (cdEl)     cdEl.textContent = s.callCooldownSecs > 0 ? `${s.callCooldownSecs}s` : '—';

    const analyBtn = g('btn-hire-analyst') as HTMLButtonElement | null;
    if (analyBtn) { analyBtn.disabled = s.hasAnalyst; analyBtn.textContent = s.hasAnalyst ? '✓ Hired' : '$5,000'; }
    const lawyBtn = g('btn-hire-lawyer') as HTMLButtonElement | null;
    if (lawyBtn)  { lawyBtn.disabled  = s.hasLawyer;  lawyBtn.textContent  = s.hasLawyer  ? '✓ Hired' : '$15,000'; }

    this._updateAlerts();
    this._updateStrategyUI();
    this._updateNavChart();
    this._updateInvestorCards();
    this._updateRecruitCards();
  }

  private _updateAlerts(): void {
    const bar = document.getElementById('hf-alert-bar');
    if (!bar) return;
    const alerts = this.sys.getAlerts();
    if (alerts.length === 0) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
    bar.classList.remove('hidden');
    bar.innerHTML = alerts.map(a => `<div class="hf-alert hf-alert-${a.type}">${a.message}</div>`).join('');
  }

  private _updateStrategyUI(): void {
    const DESCS: Record<string, string> = {
      conservative: '🛡 Protect capital. Softens all return swings. Cautious investors stay calmer.',
      balanced:     '⚖️ Balanced risk. Neutral effect on all investor types.',
      aggressive:   '⚡ Chase returns. Amplifies gains AND losses. Aggressives thrive, conservatives panic.',
    };
    document.querySelectorAll<HTMLButtonElement>('.hf-strat-btn').forEach(btn => {
      btn.classList.toggle('hf-strat-active', btn.dataset.strat === this.sys.strategyMode);
    });
    const desc = document.getElementById('hf-strat-desc');
    if (desc) desc.textContent = DESCS[this.sys.strategyMode] ?? '';
  }

  private _updateNavChart(): void {
    const chart = document.getElementById('hf-nav-chart');
    if (!chart) return;
    const history = this.sys.navHistory;
    if (history.length === 0) {
      chart.innerHTML = '<span class="hf-chart-empty">No data yet</span>';
      return;
    }
    const maxAbs = Math.max(...history.map(Math.abs), 1);
    chart.innerHTML = history.map(v => {
      const h   = Math.round((Math.abs(v) / maxAbs) * 100);
      const cls = v >= 0 ? 'hf-bar-pos' : 'hf-bar-neg';
      return `<div class="hf-nav-bar"><div class="${cls}" style="height:${h}%"></div></div>`;
    }).join('');
  }

  private _updateInvestorCards(): void {
    const container = document.getElementById('hf-investors');
    if (!container) return;
    const investors = this.sys.getInvestors();

    if (investors.length === 0) {
      container.innerHTML = '<p class="hf-empty-msg">No investors yet. Recruit below.</p>';
      return;
    }

    const ids    = new Set([...container.querySelectorAll<HTMLElement>('[data-hf-inv-id]')].map(e => e.dataset.hfInvId!));
    const liveIds = new Set(investors.map(i => i.id));
    for (const id of ids) {
      if (!liveIds.has(id)) container.querySelector(`[data-hf-inv-id="${id}"]`)?.remove();
    }

    for (const inv of investors) {
      const tmpl = this.sys.getTemplate(inv.id)!;
      let card   = container.querySelector<HTMLElement>(`[data-hf-inv-id="${inv.id}"]`);

      if (!card) {
        card = document.createElement('div');
        card.className    = 'hf-investor-card';
        card.dataset.hfInvId = inv.id;
        card.innerHTML = `
          <div class="hf-inv-top">
            <span class="hf-inv-avatar">${tmpl.avatar}</span>
            <div class="hf-inv-meta">
              <div class="hf-inv-name">${tmpl.name}</div>
              <div class="hf-inv-type hf-type-${tmpl.type}">${tmpl.type.toUpperCase()}</div>
            </div>
            <div class="hf-inv-capital">$${inv.capital.toLocaleString()}</div>
          </div>
          <div class="hf-inv-sat-row">
            <span id="hf-sat-emoji-${inv.id}" class="hf-sat-emoji">😊</span>
            <div class="hf-sat-track"><div class="hf-sat-fill" id="hf-sat-${inv.id}"></div></div>
            <span class="hf-sat-pct" id="hf-sat-pct-${inv.id}"></span>
          </div>
          <div class="hf-inv-footer">
            <span id="hf-inv-risk-${inv.id}" class="hf-risk-badge hf-risk-safe">● SAFE</span>
            <span class="hf-inv-days" id="hf-inv-days-${inv.id}">Day 0</span>
          </div>`;
        container.appendChild(card);
      }

      const pct    = Math.round(inv.satisfaction * 100);
      const fill   = document.getElementById(`hf-sat-${inv.id}`) as HTMLElement | null;
      if (fill) {
        fill.style.width = `${pct}%`;
        fill.className   = `hf-sat-fill ${pct >= 65 ? 'sat-good' : pct >= 40 ? 'sat-warn' : 'sat-bad'}`;
      }
      const pctEl = document.getElementById(`hf-sat-pct-${inv.id}`);
      if (pctEl)  pctEl.textContent = `${pct}%`;
      const emojiEl = document.getElementById(`hf-sat-emoji-${inv.id}`);
      if (emojiEl) emojiEl.textContent = pct >= 70 ? '😊' : pct >= 45 ? '😐' : '😟';

      const risk   = this.sys.getWithdrawalRisk(inv.id);
      const riskEl = document.getElementById(`hf-inv-risk-${inv.id}`);
      if (riskEl) {
        const labels = { safe: '● SAFE', nervous: '⚠ NERVOUS', high: '🚨 WITHDRAWAL RISK' };
        riskEl.textContent = labels[risk];
        riskEl.className   = `hf-risk-badge hf-risk-${risk}`;
      }
      const daysEl = document.getElementById(`hf-inv-days-${inv.id}`);
      if (daysEl)  daysEl.textContent = `Day ${inv.daysInFund}`;
    }
  }

  private _updateRecruitCards(): void {
    const container = document.getElementById('hf-recruits');
    if (!container) return;
    const recruits = this.sys.getRecruitableTemplates();
    const inCall   = this.callUI?.isActive ?? false;
    const canCall  = this.sys.canCall() && !inCall;

    const currentIds = new Set([...container.querySelectorAll<HTMLElement>('[data-hf-recruit-id]')].map(e => e.dataset.hfRecruitId!));
    const newIds     = new Set(recruits.map(t => t.id));
    if ([...currentIds].sort().join(',') !== [...newIds].sort().join(',')) {
      container.innerHTML = '';
      if (recruits.length === 0) {
        container.innerHTML = '<p class="hf-empty-msg">All investors recruited!</p>';
        return;
      }
      for (const tmpl of recruits) {
        const card = document.createElement('div');
        card.className        = 'hf-recruit-card';
        card.dataset.hfRecruitId = tmpl.id;
        const [lo, hi] = tmpl.capitalRange;
        card.innerHTML = `
          <div class="hf-rec-top">
            <span class="hf-rec-avatar">${tmpl.avatar}</span>
            <div class="hf-rec-info">
              <div class="hf-rec-name">${tmpl.name}</div>
              <div class="hf-rec-range">$${(lo / 1000).toFixed(0)}k–$${(hi / 1000).toFixed(0)}k · <span class="hf-type-${tmpl.type}">${tmpl.type}</span></div>
            </div>
            <button class="btn-hf-call" data-hf-call-id="${tmpl.id}">📞 Call</button>
          </div>`;
        container.appendChild(card);
      }
    }

    for (const btn of container.querySelectorAll<HTMLButtonElement>('.btn-hf-call')) {
      btn.disabled = !canCall;
    }
  }
}
