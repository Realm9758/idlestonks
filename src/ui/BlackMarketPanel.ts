import type { BlackMarketSystem } from '../systems/BlackMarketSystem.ts';
import { screenShake } from './animations.ts';
import { screenFlash } from './animations.ts';

export interface BmCallbacks {
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'chaos') => void;
  addCash:   (amount: number) => void;
  deductCash:(amount: number) => void;
  openBmTab: () => void;
}

interface ChatMsg { side: 'left' | 'right'; text: string; }

const UNLOCK_CHAT: ChatMsg[] = [
  { side: 'left',  text: 'bro… have you heard about the black market thing? 👀' },
  { side: 'left',  text: 'you can make BANK. like. serious money.' },
  { side: 'right', text: 'what kind of money' },
  { side: 'left',  text: "enough to make your whole portfolio look like pocket change 😏" },
  { side: 'left',  text: 'you set up a fake coin. hype it up. get people to invest.' },
  { side: 'left',  text: 'then you pull the rug. take everything.' },
  { side: 'right', text: 'that sounds incredibly illegal' },
  { side: 'left',  text: 'lmaooo look who just figured that out 💀' },
  { side: 'left',  text: "you're good enough now. i unlocked it for you." },
  { side: 'left',  text: "don't tell anyone. and don't get caught. 🫡" },
];

const TUTORIAL_CHAT: ChatMsg[] = [
  { side: 'left',  text: "ok so you're in 😈" },
  { side: 'left',  text: "see those targets on the right? those are your marks." },
  { side: 'left',  text: "call them. pitch the coin. get them to invest." },
  { side: 'left',  text: "the more they put in, the higher the price climbs." },
  { side: 'left',  text: "once there's enough in the pool..." },
  { side: 'left',  text: "💀 RUG PULL. you take 70%. they get nothing." },
  { side: 'left',  text: "BUT — the SEC watches. your heat level rises with every call." },
  { side: 'left',  text: "too much heat? fines. suspensions. worse." },
  { side: 'left',  text: "keep it cool. be strategic. don't be greedy." },
  { side: 'right', text: "understood. let's eat. 🍽️" },
  { side: 'left',  text: "that's what i like to hear. gl hf 🫡" },
];

export class BlackMarketPanel {
  private sys: BlackMarketSystem;
  private cb: BmCallbacks | null = null;
  private lastCustomerCount = -1;
  tutorialStarted = false;

  constructor(sys: BlackMarketSystem) {
    this.sys = sys;
  }

  mount(container: HTMLElement, callbacks: BmCallbacks): void {
    this.cb = callbacks;
    container.innerHTML = this._panelHtml();
    this._appendFixed();
    this._wireEvents();
    this.updateDisplay();
  }

  // ── HTML builders ──────────────────────────────────────────────────────────

  private _panelHtml(): string {
    return `
<div class="bm-panel-inner">
  <div class="bm-layout">
    <div class="bm-chat-col">
      <div class="bm-chat-header">
        <div class="bm-chat-contact-row">
          <span class="bm-contact-dot">●</span>
          <span class="bm-contact-name">bro_crypto</span>
        </div>
        <span class="bm-contact-status">online</span>
      </div>
      <div id="bm-chat-messages" class="bm-chat-messages"></div>
    </div>

    <div class="bm-ops-col">
      <div class="bm-stock-card">
        <div class="bm-stock-header">
          <span class="bm-coin-name">🌑 MoonCoin</span>
          <span class="bm-coin-tag">SYNTHETIC</span>
        </div>
        <div id="bm-price" class="bm-price">$0.0100</div>
        <div class="bm-hype-row">
          <span class="bm-hype-label">HYPE</span>
          <div class="bm-hype-track"><div id="bm-hype-fill" class="bm-hype-fill" style="width:5%"></div></div>
        </div>
        <div class="bm-invested-row">
          <span class="bm-invested-label">TOTAL INVESTED</span>
          <span id="bm-total-invested" class="bm-invested-val">$0</span>
        </div>
      </div>
      <div class="bm-customers-header">👥 Targets</div>
      <div id="bm-customers" class="bm-customers"></div>
      <button id="btn-rug-pull" class="btn-rug-pull" disabled>
        <span class="rug-icon">💀</span>
        <span class="rug-text">RUG PULL</span>
      </button>
    </div>

    <div class="bm-risk-col">
      <div class="bm-risk-title">🌡️ HEAT LEVEL</div>
      <div class="bm-risk-meter-wrap">
        <div id="bm-risk-fill" class="bm-risk-fill risk-low" style="height:0%"></div>
      </div>
      <div id="bm-risk-label" class="bm-risk-label">0%</div>
      <div id="bm-risk-warn" class="bm-risk-warn hidden">⚠️ HIGH HEAT</div>
      <div class="bm-divider"></div>
      <div class="bm-stat-row">
        <span class="bm-stat-lbl">CALLS TODAY</span>
        <span id="bm-calls-today" class="bm-stat-val">0 / 5</span>
      </div>
      <div class="bm-stat-row">
        <span class="bm-stat-lbl">COOLDOWN</span>
        <span id="bm-cooldown" class="bm-stat-val">—</span>
      </div>
      <div class="bm-stat-row">
        <span class="bm-stat-lbl">TOTAL PROFIT</span>
        <span id="bm-profit" class="bm-stat-val bm-neon-green">$0</span>
      </div>
      <div class="bm-stat-row">
        <span class="bm-stat-lbl">RUG PULLS</span>
        <span id="bm-rug-count" class="bm-stat-val">0</span>
      </div>
      <div id="bm-suspended-notice" class="bm-suspended-notice hidden">
        🚫 SUSPENDED<br>
        <span id="bm-lock-days" class="bm-lock-days">—</span>
      </div>
    </div>
  </div>
</div>`;
  }

  private _appendFixed(): void {
    // Unlock notification (fixed, bottom-right)
    const notif = document.createElement('div');
    notif.id = 'bm-unlock-notif';
    notif.className = 'bm-unlock-notif hidden';
    notif.innerHTML = `<span class="bm-notif-ping"></span>📱 New Message`;
    document.body.appendChild(notif);

    // Messenger overlay
    const overlay = document.createElement('div');
    overlay.id = 'bm-messenger-overlay';
    overlay.className = 'bm-messenger-overlay hidden';
    overlay.innerHTML = `
      <div class="bm-messenger">
        <div class="bm-messenger-hdr">
          <div class="bm-messenger-contact">
            <span class="bm-contact-dot">●</span>
            <span>bro_crypto</span>
          </div>
          <button id="bm-messenger-close" class="btn-icon" style="color:#555">✕</button>
        </div>
        <div id="bm-messenger-msgs" class="bm-messenger-msgs"></div>
        <div id="bm-messenger-footer" class="bm-messenger-footer hidden">
          <button id="bm-messenger-open" class="bm-btn-open-mkt">🕵️ Open Black Market</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }

  private _wireEvents(): void {
    const cb = this.cb!;

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
      this._handleCall(btn.dataset.callId!);
    });

    document.getElementById('btn-rug-pull')?.addEventListener('click', () => this._handleRugPull());
  }

  // ── Interactions ───────────────────────────────────────────────────────────

  private _handleCall(id: string): void {
    const result = this.sys.callCustomer(id);
    if (!result) return;
    const type = result.outcome === 'invested'   ? 'success'
               : result.outcome === 'partial'    ? 'info'
               : 'error';
    this.cb!.showToast(result.message, type);
    this._appendChatMsg('bm-chat-messages', 'left', result.message);
    this.updateDisplay();
  }

  private _handleRugPull(): void {
    if (!this.sys.canRugPull()) return;
    const { profit, totalStolen } = this.sys.rugPull();
    this.cb!.addCash(profit);
    this.cb!.showToast(`💀 RUG PULLED! Stole $${totalStolen.toLocaleString()}, you keep $${profit.toLocaleString()}`, 'chaos');
    this._appendChatMsg('bm-chat-messages', 'left', `bro you actually did it 💀 $${profit.toLocaleString()} in your pocket. GG`);
    screenShake('heavy');
    screenFlash('bad');
    this.updateDisplay();
  }

  // ── Unlock / tutorial ──────────────────────────────────────────────────────

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
    const row = document.createElement('div');
    row.className = `bm-msg-row bm-msg-${side}`;
    const bubble = document.createElement('div');
    bubble.className = `bm-bubble bm-bubble-${side}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  // ── Display update (called every tick) ────────────────────────────────────

  updateDisplay(): void {
    const s = this.sys;
    const g = (id: string) => document.getElementById(id);

    // Stock
    const priceEl = g('bm-price');
    if (priceEl) priceEl.textContent = `$${s.stock.price < 1 ? s.stock.price.toFixed(4) : s.stock.price.toFixed(2)}`;
    const hypeEl = g('bm-hype-fill') as HTMLElement | null;
    if (hypeEl) hypeEl.style.width = `${(s.stock.hype * 100).toFixed(0)}%`;
    const invEl = g('bm-total-invested');
    if (invEl) invEl.textContent = `$${Math.round(s.stock.totalInvested).toLocaleString()}`;

    // Risk meter
    const riskFill = g('bm-risk-fill') as HTMLElement | null;
    if (riskFill) {
      riskFill.style.height = `${s.riskLevel}%`;
      riskFill.className = `bm-risk-fill ${s.riskLevel < 35 ? 'risk-low' : s.riskLevel < 65 ? 'risk-mid' : 'risk-high'}`;
    }
    const riskLbl = g('bm-risk-label');
    if (riskLbl) riskLbl.textContent = `${Math.round(s.riskLevel)}%`;
    g('bm-risk-warn')?.classList.toggle('hidden', s.riskLevel < 65);

    // Stats
    const callsEl = g('bm-calls-today');
    if (callsEl) callsEl.textContent = `${s.callsToday} / ${s.MAX_CALLS_PER_DAY}`;
    const cdEl = g('bm-cooldown');
    if (cdEl) cdEl.textContent = s.callCooldownSecs > 0 ? `${s.callCooldownSecs}s` : '—';
    const profEl = g('bm-profit');
    if (profEl) profEl.textContent = `$${s.totalProfit.toLocaleString()}`;
    const rugEl = g('bm-rug-count');
    if (rugEl) rugEl.textContent = String(s.rugPullCount);

    // Suspended notice
    const sus = g('bm-suspended-notice');
    sus?.classList.toggle('hidden', !s.isLocked);
    const lockDays = g('bm-lock-days');
    if (lockDays && s.isLocked) lockDays.textContent = `${s.lockDaysRemaining} day(s) remaining`;

    // Rug pull button
    const rugBtn = g('btn-rug-pull') as HTMLButtonElement | null;
    if (rugBtn) rugBtn.disabled = !s.canRugPull();

    // Customer cards
    this._updateCustomerCards();
  }

  private _updateCustomerCards(): void {
    const container = document.getElementById('bm-customers');
    if (!container) return;
    const customers = this.sys.getCustomers();

    if (container.children.length !== customers.length) {
      container.innerHTML = '';
      for (const c of customers) {
        const card = document.createElement('div');
        card.className = 'bm-customer-card';
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

    const canCall = this.sys.canCall();
    for (const c of customers) {
      const card = container.querySelector<HTMLElement>(`[data-customer-id="${c.id}"]`);
      if (!card) continue;
      const trustFill = document.getElementById(`bt-${c.id}`) as HTMLElement | null;
      const awareFill = document.getElementById(`ba-${c.id}`) as HTMLElement | null;
      if (trustFill) trustFill.style.width = `${(c.trust * 100).toFixed(0)}%`;
      if (awareFill) awareFill.style.width = `${(c.awareness * 100).toFixed(0)}%`;
      const invEl  = document.getElementById(`ci-${c.id}`);
      const monEl  = document.getElementById(`cm-${c.id}`);
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
