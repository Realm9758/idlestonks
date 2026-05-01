import type { BlackMarketSystem } from '../systems/BlackMarketSystem.ts';
import { NEWS_MANIP_TYPES } from '../systems/BlackMarketSystem.ts'; // used in updateDisplay newsManipResults loop
import { screenShake, screenFlash } from './animations.ts';
import { SocialMediaPanel } from './SocialMediaPanel.ts';
import type { BmCallbacks } from './bmData.ts';
import { UNLOCK_CHAT, TUTORIAL_CHAT } from './bmData.ts';
import { BM_PANEL_HTML, BM_FIXED_HTML } from './bmLayout.ts';
import { BlackMarketCallUI } from './BlackMarketCall.ts';
import { NewsManipPanel } from './NewsManipPanel.ts';

export type { BmCallbacks };

export class BlackMarketPanel {
  private sys:             BlackMarketSystem;
  private cb:              BmCallbacks | null = null;
  private socialPanel:     SocialMediaPanel | null = null;
  private callUI:          BlackMarketCallUI | null = null;
  private newsManipPanel:  NewsManipPanel | null = null;
  private lastCustomerCount = -1;
  tutorialStarted = false;

  constructor(sys: BlackMarketSystem) {
    this.sys = sys;
  }

  mount(container: HTMLElement, callbacks: BmCallbacks): void {
    this.cb = callbacks;
    container.innerHTML = BM_PANEL_HTML;
    this._appendFixed();
    this.callUI = new BlackMarketCallUI(
      this.sys, callbacks,
      () => this.updateDisplay(),
      (id, side, text) => this._appendChatMsg(id, side, text),
    );
    this._wireEvents();
    this._mountSocialPanel();
    this._mountNewsManipPanel();
    this.updateDisplay();
  }

  private _mountNewsManipPanel(): void {
    const mount = document.getElementById('nm-panel');
    if (!mount) return;
    this.newsManipPanel = new NewsManipPanel(this.sys, this.cb!);
    this.newsManipPanel.mount(mount);
  }

  private _mountSocialPanel(): void {
    const mount = document.getElementById('sm-panel-mount');
    if (!mount) return;
    this.socialPanel = new SocialMediaPanel(this.sys, {
      showToast:  (msg, type) => this.cb!.showToast(msg, type),
      addCash:    (amt)       => this.cb!.addCash(amt),
      deductCash: (amt)       => this.cb!.deductCash(amt),
    });
    this.socialPanel.mount(mount);
  }

  private _appendFixed(): void {
    const banner = document.createElement('div');
    banner.id        = 'bm-breaking-banner';
    banner.className = 'bm-breaking-banner hidden';
    banner.innerHTML = BM_FIXED_HTML.banner;
    document.body.appendChild(banner);

    const notif = document.createElement('div');
    notif.id        = 'bm-unlock-notif';
    notif.className = 'bm-unlock-notif hidden';
    notif.innerHTML = BM_FIXED_HTML.notif;
    document.body.appendChild(notif);

    const overlay = document.createElement('div');
    overlay.id        = 'bm-messenger-overlay';
    overlay.className = 'bm-messenger-overlay hidden';
    overlay.innerHTML = BM_FIXED_HTML.messenger;
    document.body.appendChild(overlay);

    const callOverlay = document.createElement('div');
    callOverlay.id        = 'bm-call-overlay';
    callOverlay.className = 'bm-call-overlay hidden';
    callOverlay.innerHTML = BM_FIXED_HTML.callOverlay;
    document.body.appendChild(callOverlay);
  }

  private _wireEvents(): void {
    const cb = this.cb!;

    document.querySelectorAll<HTMLElement>('[data-bm-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.bmTab!;
        document.querySelectorAll('[data-bm-tab]').forEach(b => b.classList.remove('bm-nav-active'));
        btn.classList.add('bm-nav-active');
        document.getElementById('bm-pane-calls')?.classList.toggle('hidden', tab !== 'calls');
        document.getElementById('bm-pane-social')?.classList.toggle('hidden', tab !== 'social');
        document.getElementById('bm-pane-news')?.classList.toggle('hidden', tab !== 'news');
        if (tab === 'news') this._renderNewsPanel();
      });
    });

    document.getElementById('bm-unlock-notif')?.addEventListener('click', () => this._openMessenger());
    document.getElementById('bm-messenger-close')?.addEventListener('click', () => {
      document.getElementById('bm-messenger-overlay')!.classList.add('hidden');
    });
    document.getElementById('bm-messenger-open')?.addEventListener('click', () => {
      document.getElementById('bm-messenger-overlay')!.classList.add('hidden');
      document.getElementById('bm-unlock-notif')!.classList.add('hidden');
      cb.openBmTab();
    });
    document.getElementById('bm-messenger-overlay')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('bm-messenger-overlay'))
        document.getElementById('bm-messenger-overlay')!.classList.add('hidden');
    });

    document.getElementById('bm-customers')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-call-id]');
      if (!btn) return;
      this.callUI?.open(btn.dataset.callId!);
    });

    document.getElementById('btn-rug-pull')?.addEventListener('click', () => this._handleRugPull());
    document.getElementById('btn-lay-low')?.addEventListener('click', () => this._handleLayLow());
    document.getElementById('bm-call-hangup')?.addEventListener('click', () => this.callUI?.hangUp());
  }

  // ── Rug pull & lay low ────────────────────────────────────────────────────

  private _handleRugPull(): void {
    if (!this.sys.canRugPull()) return;
    const { profit, totalStolen } = this.sys.rugPull();
    this.cb!.addCash(profit);
    screenShake('heavy');
    screenFlash('bad');

    const rugBtn = document.getElementById('btn-rug-pull') as HTMLButtonElement | null;
    if (rugBtn) rugBtn.disabled = true;

    this._appendChatMsg('bm-chat-messages', 'left', '⚡ INITIATING WIRE TRANSFER...');
    setTimeout(() => {
      this._appendChatMsg('bm-chat-messages', 'left', `💸 $${profit.toLocaleString()} routed through 7 shell companies`);
    }, 1000);
    setTimeout(() => {
      this._appendChatMsg('bm-chat-messages', 'left', `✅ funds landed. clean. they got nothing 😈`);
      this.cb!.showToast(`💀 RUG PULLED! Stole $${totalStolen.toLocaleString()}, you keep $${profit.toLocaleString()}`, 'chaos');
      this.updateDisplay();
    }, 2800);
  }

  private _handleLayLow(): void {
    const success = this.sys.layLow();
    if (success) {
      this.cb!.showToast('🤫 Laying low — heat drops 30pts, suspended 1 day.', 'info');
      this._appendChatMsg('bm-chat-messages', 'left', 'smart move. stay dark for a bit 🤫');
      this.updateDisplay();
    }
  }

  // ── News manipulation ─────────────────────────────────────────────────────

  private _renderNewsPanel(): void {
    this.newsManipPanel?.refresh();
  }

  // ── Breaking news banner ──────────────────────────────────────────────────

  showBreakingNewsBanner(headline: string, success: boolean): void {
    const banner      = document.getElementById('bm-breaking-banner');
    const headlineEl  = document.getElementById('bbn-headline');
    const resultEl    = document.getElementById('bbn-result');
    if (!banner || !headlineEl || !resultEl) return;

    headlineEl.textContent = `"${headline}"`;
    resultEl.textContent   = success ? '✅ LANDED' : '❌ TRACED';
    banner.className = `bm-breaking-banner bm-breaking-${success ? 'success' : 'fail'}`;
    void banner.offsetWidth;
    banner.classList.add('bm-breaking-visible');

    if (success) screenFlash('good');
    else { screenFlash('bad'); screenShake('light'); }

    setTimeout(() => {
      banner.classList.remove('bm-breaking-visible');
      setTimeout(() => { banner.className = 'bm-breaking-banner hidden'; }, 600);
    }, 4000);
  }

  // ── Unlock / tutorial ─────────────────────────────────────────────────────

  triggerUnlockNotif(): void {
    document.getElementById('bm-unlock-notif')?.classList.remove('hidden');
  }

  private _openMessenger(): void {
    const overlay = document.getElementById('bm-messenger-overlay')!;
    const msgs    = document.getElementById('bm-messenger-msgs')!;
    const footer  = document.getElementById('bm-messenger-footer')!;
    overlay.classList.remove('hidden');
    msgs.innerHTML = '';
    footer.classList.add('hidden');
    let delay = 300;
    for (const m of UNLOCK_CHAT) {
      const d = delay;
      delay += 700 + m.text.length * 22;
      setTimeout(() => { this._appendChatMsg('bm-messenger-msgs', m.side, m.text); }, d);
    }
    setTimeout(() => footer.classList.remove('hidden'), delay + 300);
  }

  playTutorial(): void {
    if (this.tutorialStarted || this.sys.tutorialSeen) return;
    this.tutorialStarted = true;
    this.sys.tutorialSeen = true;
    const container = document.getElementById('bm-chat-messages');
    if (!container) return;
    container.innerHTML = '';
    let delay = 600;
    for (const m of TUTORIAL_CHAT) {
      const d = delay;
      delay += 700 + m.text.length * 22;
      setTimeout(() => { this._appendChatMsg('bm-chat-messages', m.side, m.text); }, d);
    }
  }

  addChatMessage(text: string): void {
    this._appendChatMsg('bm-chat-messages', 'left', text);
  }

  private _appendChatMsg(containerId: string, side: 'left' | 'right', text: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row    = document.createElement('div');
    row.className = `bm-msg-row bm-msg-${side}`;
    const bubble  = document.createElement('div');
    bubble.className  = `bm-bubble bm-bubble-${side}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  // ── Display update ────────────────────────────────────────────────────────

  updateDisplay(): void {
    const s = this.sys;
    const g = (id: string) => document.getElementById(id);

    const priceEl = g('bm-price');
    if (priceEl) priceEl.textContent = `$${s.stock.price < 1 ? s.stock.price.toFixed(4) : s.stock.price.toFixed(2)}`;
    const hypeEl = g('bm-hype-fill') as HTMLElement | null;
    if (hypeEl) hypeEl.style.width = `${(s.stock.hype * 100).toFixed(0)}%`;
    const invEl = g('bm-total-invested');
    if (invEl) invEl.textContent = `$${Math.round(s.stock.totalInvested).toLocaleString()}`;

    const riskFill = g('bm-risk-fill') as HTMLElement | null;
    if (riskFill) {
      riskFill.style.width = `${s.heat}%`;
      riskFill.className = `bm-heat-bar-fill ${s.heat < 35 ? 'risk-low' : s.heat < 65 ? 'risk-mid' : 'risk-high'}`;
    }
    const riskLbl = g('bm-risk-label');
    if (riskLbl) riskLbl.textContent = `${Math.round(s.heat)}%`;
    g('bm-risk-warn')?.classList.toggle('hidden', s.heat < 85);

    // Pulse the BM panel container when heat is critical
    const bmMount = document.getElementById('bm-panel-mount');
    if (bmMount) bmMount.classList.toggle('bm-heat-critical', s.heat >= 75);

    const threatBadge = g('bm-threat-badge') as HTMLElement | null;
    if (threatBadge) {
      const lvl = s.getHeatLevel();
      const MAP: Record<string, [string, string]> = {
        safe:       ['SAFE',        'bm-threat-safe'],
        suspicious: ['SUSPICIOUS',  'bm-threat-suspicious'],
        watched:    ['UNDER WATCH', 'bm-threat-watched'],
        danger:     ['⚠ CASE RISK', 'bm-threat-danger'],
      };
      const [label, cls] = MAP[lvl];
      threatBadge.textContent = label;
      threatBadge.className   = `bm-threat-badge ${cls}`;
    }

    const hypePct = g('bm-hype-pct') as HTMLElement | null;
    if (hypePct) hypePct.textContent = `${(s.stock.hype * 100).toFixed(0)}%`;

    g('bm-case-block')?.classList.toggle('hidden', s.heat < 60);
    g('bm-case-detail')?.classList.toggle('hidden', !s.caseActive);
    if (s.caseActive) {
      const caseFill = g('bm-case-fill') as HTMLElement | null;
      const casePct  = g('bm-case-pct');
      if (caseFill) caseFill.style.width = `${s.caseProgress.toFixed(1)}%`;
      if (casePct)  casePct.textContent  = `${Math.round(s.caseProgress)}%`;
    }

    const callsEl = g('bm-calls-today');
    if (callsEl) callsEl.textContent = `${s.callsToday} / ${s.MAX_CALLS_PER_DAY}`;
    const cdEl = g('bm-cooldown');
    if (cdEl) cdEl.textContent = s.callCooldownSecs > 0 ? `${s.callCooldownSecs}s` : '—';
    const profEl = g('bm-profit');
    if (profEl) profEl.textContent = `$${s.totalProfit.toLocaleString()}`;
    const rugEl = g('bm-rug-count');
    if (rugEl) rugEl.textContent = String(s.rugPullCount);

    g('bm-suspended-notice')?.classList.toggle('hidden', !s.isLocked);
    const lockDays = g('bm-lock-days');
    if (lockDays && s.isLocked) lockDays.textContent = `${s.lockDaysRemaining} day(s) remaining`;

    const rugBtn = g('btn-rug-pull') as HTMLButtonElement | null;
    if (rugBtn) rugBtn.disabled = !s.canRugPull();

    const sweepEl    = g('bm-sec-sweep');
    const sweepTimer = g('bm-sweep-timer');
    sweepEl?.classList.toggle('hidden', s.secSweepSecsRemaining <= 0);
    if (sweepTimer) sweepTimer.textContent = s.secSweepSecsRemaining > 0 ? `(${s.secSweepSecsRemaining}s)` : '';

    const layLowBtn = g('btn-lay-low') as HTMLButtonElement | null;
    if (layLowBtn) layLowBtn.disabled = s.isLocked || s.heat < 20;

    this._updateRivalsList();
    this._updateCustomerCards();
    this.socialPanel?.updateDisplay();

    const nmResults = this.sys.consumeNewsManipResults();
    for (const r of nmResults) {
      const type    = NEWS_MANIP_TYPES.find(t => t.id === r.typeId);
      const label   = type?.label ?? r.typeId;
      const toastMsg = r.success
        ? `📰 Story landed: "${r.headline}" — hype boosted!`
        : `📰 Story traced: "${r.headline}" — heat spiked!`;
      this.cb?.showToast(toastMsg, r.success ? 'success' : 'error');
      this._appendChatMsg(
        'bm-chat-messages', 'left',
        r.success ? `✅ "${label}" worked. hype is climbing 🚀` : `❌ "${label}" got traced. heat +${type?.heatOnFail ?? '?'} 🔥`,
      );
      this.showBreakingNewsBanner(r.headline, r.success);
    }

    const newsPane = document.getElementById('bm-pane-news');
    if (newsPane && !newsPane.classList.contains('hidden')) this._renderNewsPanel();
  }

  private _updateRivalsList(): void {
    const container = document.getElementById('bm-rivals-list');
    if (!container) return;
    container.innerHTML = '';
    for (const r of this.sys.getRivals()) {
      const pct = r.active ? Math.min(100, (r.poolAmount / r.rugThreshold) * 100) : 0;
      const div = document.createElement('div');
      div.className = 'bm-rival-row';
      div.innerHTML = `
        <span class="bm-rival-avatar">${r.avatar}</span>
        <div class="bm-rival-info">
          <div class="bm-rival-name">${r.name} ${r.active ? '' : `<span class="bm-rival-dormant">dormant ${r.cooldownDays}d</span>`}</div>
          <div class="bm-rival-track"><div class="bm-rival-fill ${r.active ? '' : 'bm-rival-inactive'}" style="width:${pct.toFixed(0)}%"></div></div>
        </div>
        <span class="bm-rival-pct">${r.active ? `${pct.toFixed(0)}%` : '—'}</span>`;
      container.appendChild(div);
    }
  }

  private _updateCustomerCards(): void {
    const container = document.getElementById('bm-customers');
    if (!container) return;
    const customers = this.sys.getCustomers();
    const inCall    = this.callUI?.isActive ?? false;

    if (container.children.length !== customers.length) {
      container.innerHTML = '';
      for (const c of customers) {
        const card = document.createElement('div');
        card.className         = 'bm-customer-card';
        card.dataset.customerId = c.id;
        card.innerHTML = `
          <div class="bm-cust-top">
            <span class="bm-cust-avatar">${c.avatar}</span>
            <div class="bm-cust-info">
              <div class="bm-cust-name">${c.name}</div>
              <div class="bm-cust-wealth bm-wealth-${c.wealth}">${c.wealth.toUpperCase()}</div>
            </div>
            <button class="btn-call-customer" data-call-id="${c.id}">📞 Call</button>
          </div>
          <div class="bm-cust-bars">
            <div class="bm-cust-bar-row">
              <span class="bm-cust-bar-lbl">TRUST</span>
              <div class="bm-mini-track"><div class="bm-mini-fill bm-trust-fill" id="bt-${c.id}"></div></div>
            </div>
            <div class="bm-cust-bar-row">
              <span class="bm-cust-bar-lbl">AWARE</span>
              <div class="bm-mini-track"><div class="bm-mini-fill bm-aware-fill" id="ba-${c.id}"></div></div>
            </div>
          </div>
          <div class="bm-cust-footer">
            <span class="bm-cust-invested" id="ci-${c.id}">Invested: $0</span>
            <span class="bm-cust-money" id="cm-${c.id}">Wealth: $${c.money.toLocaleString()}</span>
          </div>`;
        container.appendChild(card);
      }
    }

    const canCall = this.sys.canCall() && !inCall;
    for (const c of customers) {
      const card = container.querySelector<HTMLElement>(`[data-customer-id="${c.id}"]`);
      if (!card) continue;
      const trustFill = document.getElementById(`bt-${c.id}`) as HTMLElement | null;
      const awareFill = document.getElementById(`ba-${c.id}`) as HTMLElement | null;
      if (trustFill) trustFill.style.width = `${(c.trust * 100).toFixed(0)}%`;
      if (awareFill) awareFill.style.width = `${(c.awareness * 100).toFixed(0)}%`;
      const invEl = document.getElementById(`ci-${c.id}`);
      const monEl = document.getElementById(`cm-${c.id}`);
      if (invEl) invEl.textContent = `Invested: $${c.invested.toLocaleString()}`;
      if (monEl) monEl.textContent = `Wealth: $${c.money.toLocaleString()}`;
      const btn = card.querySelector<HTMLButtonElement>('.btn-call-customer');
      if (btn) {
        btn.disabled = !canCall || c.money <= 0;
        btn.classList.toggle('btn-suspicious', c.suspicious);
      }
      card.classList.toggle('bm-card-suspicious', c.suspicious);
    }
  }
}
