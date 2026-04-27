import type {
  HedgeFundSystem, HfInvestorTemplate, HfCallMods,
} from '../systems/HedgeFundSystem.ts';
import { screenShake, screenFlash } from './animations.ts';

export interface HfCallbacks {
  showToast:    (msg: string, type: 'success' | 'error' | 'info' | 'chaos') => void;
  addCash:      (amount: number) => void;
  deductCash:   (amount: number) => void;
  openHfTab:    () => void;
  onCallStart?: () => void;
  onCallEnd?:   () => void;
}

interface ChatMsg { side: 'left' | 'right'; text: string; }

// ── Unlock + tutorial scripts ──────────────────────────────────────────────

const UNLOCK_CHAT: ChatMsg[] = [
  { side: 'left',  text: "you've made some serious money… 👀" },
  { side: 'left',  text: "why not go bigger?" },
  { side: 'left',  text: "a fund. we manage other people's capital." },
  { side: 'right', text: "how does that work" },
  { side: 'left',  text: "you trade. we charge fees — 2% to manage, 20% of profits." },
  { side: 'left',  text: "investors give us capital. we grow it. they're happy." },
  { side: 'left',  text: "but if you lose their money… they WILL come for you." },
  { side: 'right', text: "sounds like a lot of pressure" },
  { side: 'left',  text: "it is. that's the point. 😈" },
  { side: 'left',  text: "ready to play at the next level?" },
];

const TUTORIAL_CHAT: ChatMsg[] = [
  { side: 'left',  text: "ok. YourFund Capital is live. 💼" },
  { side: 'left',  text: "start by calling investors — see the Recruit section." },
  { side: 'left',  text: "every investor type is different. conservatives want safety. aggressives want returns." },
  { side: 'left',  text: "watch the Reputation meter. high rep = inbound calls. low rep = withdrawals." },
  { side: 'left',  text: "fees come in daily. performance fees hit when you make new highs." },
  { side: 'left',  text: "oh — and hire staff. the analyst helps close deals. lawyer keeps regulators off your back." },
  { side: 'right', text: "understood. let's build this thing." },
  { side: 'left',  text: "that's the spirit. 🫡" },
];

// ── Investor dialogue ──────────────────────────────────────────────────────

interface InvestorLines {
  opening_out: string;
  opening_in:  string;
  r1_data:     string;
  r1_vision:   string;
  r1_social:   string;
  r1_safety:   string;
  r2_big:      string;
  r2_small:    string;
  r2_terms:    string;
  accepted:    string;
  declined:    string;
  angry:       string;
}

const INVESTOR_LINES: Record<string, InvestorLines> = {
  pension_pete: {
    opening_out: "Who is this? How did you get this number?",
    opening_in:  "I've been looking at funds. A colleague mentioned your name.",
    r1_data:     "Hmm. The numbers look… acceptable. Tell me more about drawdowns.",
    r1_vision:   "Growth stories don't pay my pension. I need stability.",
    r1_social:   "Who exactly? Names, please. I'll need to verify.",
    r1_safety:   "Now you're speaking my language. Capital preservation — that's what I care about.",
    r2_big:      "I don't 'go big'. I never have. That's why I still have money.",
    r2_small:    "A small test position. That's sensible. I can work with that.",
    r2_terms:    "Performance-linked fees? I respect that. You only win when I win.",
    accepted:    "Alright. I'll wire the funds. Don't make me regret this.",
    declined:    "I'm not ready to commit. Perhaps another time.",
    angry:       "This feels like a sales job. I don't like it. Don't call again.",
  },
  cfo_karen: {
    opening_out: "My assistant said this was important. You have 90 seconds.",
    opening_in:  "I've had three people mention your fund this week. I'm curious.",
    r1_data:     "12.4% last month means nothing without context. What's your max drawdown?",
    r1_vision:   "Vision is fine. But I've sat across from visionaries who lost everything.",
    r1_social:   "I don't care who else is in. I care about the strategy.",
    r1_safety:   "I'm not looking for safety. I'm looking for alpha.",
    r2_big:      "If I go in, I go in properly. Half-measures are for half-believers.",
    r2_small:    "Fine. A test position. But I'll be watching every basis point.",
    r2_terms:    "I like this structure. Skin in the game matters.",
    accepted:    "Committing now. Don't waste my capital.",
    declined:    "Not what I'm looking for. Good luck.",
    angry:       "I feel like I'm being sold to. That's a dealbreaker.",
  },
  tyler: {
    opening_out: "Yo! Who dis? 😄",
    opening_in:  "bro I literally just texted you lmao did you get my DM?",
    r1_data:     "+12.4%?? that's kinda mid but hey let's see where it goes",
    r1_vision:   "OKAY I'M SOLD the vision is everything fr fr 🚀",
    r1_social:   "wait who else is in?? I need to know if the right people are in",
    r1_safety:   "nah nah safe isn't the vibe — I want UPSIDE bro",
    r2_big:      "I'm literally going all in I don't even care rn 😭",
    r2_small:    "small bag to start? bro no I want the full thing",
    r2_terms:    "okay performance-linked makes sense, I fw that",
    accepted:    "YOOO LET'S GOOO 🚀 money is on the way rn",
    declined:    "nah it's not the right time bro, hit me next month",
    angry:       "bro wait… is this sus? this feels sus. I'm out.",
  },
  margaret: {
    opening_out: "Hello? I don't normally answer unknown numbers.",
    opening_in:  "My financial advisor suggested I speak with you. I'm listening.",
    r1_data:     "These figures are… moderately reassuring. What about volatility?",
    r1_vision:   "I've heard too many visions. I prefer track records.",
    r1_social:   "I appreciate a personal recommendation. That means something.",
    r1_safety:   "That's exactly what I need to hear. My late husband always said, 'protect first'.",
    r2_big:      "That's quite a lot of money. I'd need time to think.",
    r2_small:    "Starting small is wise. My accountant will be pleased.",
    r2_terms:    "If I only pay when you perform, that feels very fair.",
    accepted:    "Very well. I'll speak to my bank tomorrow. Thank you for your patience.",
    declined:    "I appreciate the time, but I'm not ready for this.",
    angry:       "This feels pushy. I don't respond well to pressure. Goodbye.",
  },
  the_whale: {
    opening_out: "Make it fast. I have a board meeting in ten minutes.",
    opening_in:  "I don't call funds. I call people. You came recommended.",
    r1_data:     "Numbers can say anything. What's your edge when the market tanks?",
    r1_vision:   "I've funded three unicorns. Vision without execution is poetry.",
    r1_social:   "Names mean nothing to me. Show me the returns.",
    r1_safety:   "I'm not looking to protect capital. I'm looking to grow it — significantly.",
    r2_big:      "If I'm in, I own a meaningful position. Hundreds. Nothing less.",
    r2_small:    "I don't do small. Don't insult me.",
    r2_terms:    "Aligned incentives. Smart. I respect that structure.",
    accepted:    "Wire instructions to my office. Don't make headlines.",
    declined:    "Not the right fit. Don't take it personally.",
    angry:       "You're wasting my time. I don't forget that.",
  },
};

// ── Conversation options ───────────────────────────────────────────────────

interface ConvOption {
  id:             string;
  label:          string;
  tag:            string;
  playerText:     string;
  trustBonus:     number;
  amountMult:     number;
  reputationEffect: number;
  reactionKey:    keyof InvestorLines;
}

const HF_ROUND_1: ConvOption[] = [
  {
    id: 'data', label: '📊 Show the data', tag: 'ANALYTICAL',
    playerText: "Our fund returned +12.4% last month with a sharpe of 1.8. Risk-adjusted, it's hard to beat.",
    trustBonus: 0.15, amountMult: 1.00, reputationEffect: 1,
    reactionKey: 'r1_data',
  },
  {
    id: 'vision', label: '🚀 The vision', tag: 'HIGH UPSIDE',
    playerText: "We're not just managing money — we're building a legacy. This is a fund positioned for the decade ahead.",
    trustBonus: 0.04, amountMult: 1.40, reputationEffect: 0,
    reactionKey: 'r1_vision',
  },
  {
    id: 'social', label: '🤝 Name-drop', tag: 'TRUST BUILDER',
    playerText: "Three CFOs in the city already trust us with their capital. I thought you should be next.",
    trustBonus: 0.22, amountMult: 1.00, reputationEffect: 2,
    reactionKey: 'r1_social',
  },
  {
    id: 'safety', label: '🛡 Capital protection', tag: 'CONSERVATIVE',
    playerText: "Our risk-first philosophy protects capital first — growth is a byproduct of discipline.",
    trustBonus: 0.18, amountMult: 0.70, reputationEffect: 1,
    reactionKey: 'r1_safety',
  },
];

const HF_ROUND_2: ConvOption[] = [
  {
    id: 'big', label: '💰 Full commitment', tag: '+3 RISK',
    playerText: "To see real returns, you need real exposure. What's your full commitment number?",
    trustBonus: 0.00, amountMult: 1.45, reputationEffect: 0,
    reactionKey: 'r2_big',
  },
  {
    id: 'small', label: '🌱 Start small', tag: 'SAFE',
    playerText: "Start with a small position — verify the returns yourself. You can scale up once you're confident.",
    trustBonus: 0.10, amountMult: 0.65, reputationEffect: 1,
    reactionKey: 'r2_small',
  },
  {
    id: 'terms', label: '📈 Performance-linked', tag: 'FAIR DEAL',
    playerText: "We only take our performance fee when you profit. Your interests and ours are completely aligned.",
    trustBonus: 0.12, amountMult: 1.10, reputationEffect: 2,
    reactionKey: 'r2_terms',
  },
];

// ── Panel class ────────────────────────────────────────────────────────────

interface CallState {
  template:  HfInvestorTemplate;
  isInbound: boolean;
  accMods:   HfCallMods;
  round:     1 | 2 | 'resolving' | 'done';
}

export class HedgeFundPanel {
  private sys:  HedgeFundSystem;
  private cb:   HfCallbacks | null = null;
  private _callState: CallState | null = null;
  tutorialStarted = false;

  constructor(sys: HedgeFundSystem) {
    this.sys = sys;
  }

  mount(container: HTMLElement, callbacks: HfCallbacks): void {
    this.cb = callbacks;
    container.innerHTML = this._panelHtml();
    this._appendFixed();
    this._wireEvents();
    this.updateDisplay();
  }

  // ── HTML ───────────────────────────────────────────────────────────────────

  private _panelHtml(): string {
    return `
<div class="hf-panel-inner">
  <div class="hf-layout">

    <div class="hf-chat-col">
      <div class="hf-chat-header">
        <div class="hf-chat-contact-row">
          <span class="hf-contact-dot">●</span>
          <span class="hf-contact-name">advisor_kate</span>
        </div>
        <span class="hf-contact-status">your analyst</span>
      </div>
      <div id="hf-chat-messages" class="hf-chat-messages"></div>
    </div>

    <div class="hf-ops-col">

      <div class="hf-fund-card">
        <div class="hf-fund-header">
          <span class="hf-fund-name">💼 YourFund Capital</span>
          <span class="hf-fund-tag">HEDGE FUND</span>
        </div>
        <div class="hf-fund-stats-row">
          <div class="hf-fstat">
            <span class="hf-fstat-label">AUM</span>
            <span id="hf-aum" class="hf-fstat-val">$0</span>
          </div>
          <div class="hf-fstat">
            <span class="hf-fstat-label">NAV</span>
            <span id="hf-nav" class="hf-fstat-val">1.000×</span>
          </div>
          <div class="hf-fstat">
            <span class="hf-fstat-label">TOTAL FEES</span>
            <span id="hf-fees" class="hf-fstat-val hf-gold">$0</span>
          </div>
        </div>
        <div class="hf-nav-chart-wrap">
          <div class="hf-nav-chart-label">14-DAY RETURNS</div>
          <div id="hf-nav-chart" class="hf-nav-chart"></div>
        </div>
      </div>

      <div class="hf-section-header">👥 Fund Investors</div>
      <div id="hf-investors" class="hf-investors"></div>

      <div class="hf-section-header">📞 Recruit</div>
      <div id="hf-recruits" class="hf-recruits"></div>

      <div class="hf-section-header">🧑‍💼 Staff</div>
      <div class="hf-staff-grid">
        <div class="hf-staff-card" id="hf-staff-analyst-card">
          <span class="hf-staff-emoji">📊</span>
          <div class="hf-staff-body">
            <div class="hf-staff-name">Analyst</div>
            <div class="hf-staff-effect">+10% investor call success</div>
          </div>
          <button id="btn-hire-analyst" class="btn-hire-staff" data-cost="5000">$5,000</button>
        </div>
        <div class="hf-staff-card" id="hf-staff-lawyer-card">
          <span class="hf-staff-emoji">⚖️</span>
          <div class="hf-staff-body">
            <div class="hf-staff-name">Lawyer</div>
            <div class="hf-staff-effect">–40% reputation damage</div>
          </div>
          <button id="btn-hire-lawyer" class="btn-hire-staff" data-cost="15000">$15,000</button>
        </div>
      </div>

    </div>

    <div class="hf-stats-col">
      <div class="hf-rep-title">⭐ REPUTATION</div>
      <div class="hf-rep-meter-wrap">
        <div id="hf-rep-fill" class="hf-rep-fill rep-mid" style="height:50%"></div>
      </div>
      <div id="hf-rep-label" class="hf-rep-label">50</div>
      <div class="hf-divider"></div>
      <div class="hf-srow">
        <span class="hf-slbl">INVESTORS</span>
        <span id="hf-inv-count" class="hf-sval">0 / 5</span>
      </div>
      <div class="hf-srow">
        <span class="hf-slbl">CALLS TODAY</span>
        <span id="hf-calls-today" class="hf-sval">0 / 3</span>
      </div>
      <div class="hf-srow">
        <span class="hf-slbl">COOLDOWN</span>
        <span id="hf-cooldown" class="hf-sval">—</span>
      </div>
      <div id="hf-incoming-notice" class="hf-incoming-notice hidden">
        📞 INCOMING<br>
        <button id="btn-accept-call" class="btn-accept-call">Accept</button>
        <button id="btn-decline-call" class="btn-decline-call">Decline</button>
      </div>
    </div>

  </div>
</div>`;
  }

  private _appendFixed(): void {
    // Unlock notification badge
    const notif = document.createElement('div');
    notif.id = 'hf-unlock-notif';
    notif.className = 'hf-unlock-notif hidden';
    notif.innerHTML = `<span class="hf-notif-ping"></span>📱 New Message`;
    document.body.appendChild(notif);

    // Advisor messenger overlay
    const overlay = document.createElement('div');
    overlay.id = 'hf-messenger-overlay';
    overlay.className = 'hf-messenger-overlay hidden';
    overlay.innerHTML = `
      <div class="hf-messenger">
        <div class="hf-messenger-hdr">
          <div class="hf-messenger-contact">
            <span class="hf-contact-dot">●</span>
            <span>advisor_kate</span>
          </div>
          <button id="hf-messenger-close" class="btn-icon" style="color:#555">✕</button>
        </div>
        <div id="hf-messenger-msgs" class="hf-messenger-msgs"></div>
        <div id="hf-messenger-footer" class="hf-messenger-footer hidden">
          <button id="hf-messenger-open" class="hf-btn-open">💼 Open Hedge Fund</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // Call overlay
    const callOverlay = document.createElement('div');
    callOverlay.id = 'hf-call-overlay';
    callOverlay.className = 'hf-call-overlay hidden';
    callOverlay.innerHTML = `
      <div class="hf-call-screen">
        <div class="hf-call-header">
          <div class="hf-call-status-row">
            <div class="hf-call-dot"></div>
            <span id="hf-call-status" class="hf-call-status-text">CONNECTING...</span>
          </div>
          <div class="hf-call-info">
            <span id="hf-call-avatar" class="hf-call-avatar"></span>
            <div>
              <div id="hf-call-name"   class="hf-call-name"></div>
              <div id="hf-call-type"   class="hf-call-type"></div>
            </div>
          </div>
        </div>
        <div id="hf-call-chat"    class="hf-call-chat"></div>
        <div id="hf-call-choices" class="hf-call-choices"></div>
        <button id="hf-call-hangup" class="hf-call-hangup">📵 Hang Up</button>
      </div>`;
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
      if (btn) this._openCallModal(btn.dataset.hfCallId!, false);
    });

    document.getElementById('btn-hire-analyst')?.addEventListener('click', () => {
      const cost = 5_000;
      if (!this.cb) return;
      cb.deductCash(cost);
      this.sys.hireAnalyst();
      cb.showToast('📊 Analyst hired! +10% call success.', 'success');
      this.updateDisplay();
    });

    document.getElementById('btn-hire-lawyer')?.addEventListener('click', () => {
      const cost = 15_000;
      if (!this.cb) return;
      cb.deductCash(cost);
      this.sys.hireLawyer();
      cb.showToast('⚖️ Lawyer hired! –40% reputation damage.', 'success');
      this.updateDisplay();
    });

    document.getElementById('btn-accept-call')?.addEventListener('click',  () => this._acceptIncoming());
    document.getElementById('btn-decline-call')?.addEventListener('click', () => this._declineIncoming());

    document.getElementById('hf-call-hangup')?.addEventListener('click', () => this._hangUp());
  }

  // ── Incoming call handling ─────────────────────────────────────────────────

  notifyIncomingCall(investorId: string): void {
    const tmpl = this.sys.getTemplate(investorId);
    if (!tmpl) return;
    const notice = document.getElementById('hf-incoming-notice')!;
    notice.classList.remove('hidden');
    // Prepend investor info
    const nameSpan = notice.querySelector<HTMLElement>('.hf-incoming-investor') ?? document.createElement('span');
    nameSpan.className = 'hf-incoming-investor';
    nameSpan.textContent = `${tmpl.avatar} ${tmpl.name}`;
    if (!notice.contains(nameSpan)) notice.insertBefore(nameSpan, notice.firstChild);
    this.cb?.showToast(`📞 ${tmpl.avatar} ${tmpl.name} is calling...`, 'info');
  }

  private _acceptIncoming(): void {
    const id = this.sys.getPendingIncoming();
    if (!id) return;
    document.getElementById('hf-incoming-notice')!.classList.add('hidden');
    const tmpl = this.sys.beginIncomingCallSession(id);
    if (!tmpl) return;
    this._startCall(tmpl, true);
  }

  private _declineIncoming(): void {
    this.sys.clearPendingIncoming();
    document.getElementById('hf-incoming-notice')!.classList.add('hidden');
    this.cb?.showToast('Call declined.', 'info');
  }

  // ── Call modal ─────────────────────────────────────────────────────────────

  private _openCallModal(templateId: string, isInbound: boolean): void {
    if (this._callState) return;
    const tmpl = isInbound
      ? this.sys.beginIncomingCallSession(templateId)
      : this.sys.beginCallSession(templateId);
    if (!tmpl) {
      this.cb?.showToast('Cannot call right now.', 'error');
      return;
    }
    this._startCall(tmpl, isInbound);
  }

  private _startCall(tmpl: HfInvestorTemplate, isInbound: boolean): void {
    this._callState = {
      template: tmpl, isInbound,
      accMods: { trustBonus: 0, amountMult: 1.0, reputationEffect: 0 },
      round: 1,
    };

    const typeLabels: Record<string, string> = {
      conservative: 'CONSERVATIVE', aggressive: 'AGGRESSIVE', whale: 'WHALE',
    };
    const typeColors: Record<string, string> = {
      conservative: '#6fb3ff', aggressive: '#ff8c66', whale: '#f4c430',
    };

    document.getElementById('hf-call-avatar')!.textContent  = tmpl.avatar;
    document.getElementById('hf-call-name')!.textContent    = tmpl.name;
    const typeEl = document.getElementById('hf-call-type')!;
    typeEl.textContent = (isInbound ? 'INCOMING · ' : '') + typeLabels[tmpl.type];
    typeEl.style.color = typeColors[tmpl.type] ?? '#ccc';
    document.getElementById('hf-call-status')!.textContent  = 'CONNECTING...';
    document.getElementById('hf-call-chat')!.innerHTML      = '';
    document.getElementById('hf-call-choices')!.innerHTML   = '';

    document.getElementById('hf-call-overlay')!.classList.remove('hidden');
    this.updateDisplay();

    const lines  = INVESTOR_LINES[tmpl.id];
    const opener = isInbound ? lines.opening_in : lines.opening_out;
    setTimeout(() => { document.getElementById('hf-call-status')!.textContent = 'CONNECTED'; this.cb?.onCallStart?.(); this._showTyping(); }, 700);
    setTimeout(() => { this._removeTyping(); this._addBubble('left', opener); }, 1600);
    setTimeout(() => this._showRound1(), 2500);
  }

  private _showRound1(): void {
    if (!this._callState) return;
    this._renderChoices(HF_ROUND_1.map(o => ({
      label: o.label, tag: o.tag, text: o.playerText, onClick: () => this._pickR1(o),
    })));
  }

  private _pickR1(opt: ConvOption): void {
    if (!this._callState) return;
    const lines = INVESTOR_LINES[this._callState.template.id];
    this._callState.accMods.trustBonus       += opt.trustBonus;
    this._callState.accMods.amountMult       *= opt.amountMult;
    this._callState.accMods.reputationEffect += opt.reputationEffect;
    this._callState.round = 2;

    document.getElementById('hf-call-choices')!.innerHTML = '';
    this._addBubble('right', opt.playerText);
    setTimeout(() => this._showTyping(), 350);
    setTimeout(() => { this._removeTyping(); this._addBubble('left', lines[opt.reactionKey]); }, 1100);
    setTimeout(() => this._showRound2(), 2000);
  }

  private _showRound2(): void {
    if (!this._callState) return;
    this._renderChoices(HF_ROUND_2.map(o => ({
      label: o.label, tag: o.tag, text: o.playerText, onClick: () => this._pickR2(o),
    })));
  }

  private _pickR2(opt: ConvOption): void {
    if (!this._callState || this._callState.round === 'resolving') return;
    const { template, accMods } = this._callState;
    const lines = INVESTOR_LINES[template.id];

    accMods.trustBonus       += opt.trustBonus;
    accMods.amountMult       *= opt.amountMult;
    accMods.reputationEffect += opt.reputationEffect;
    this._callState.round = 'resolving';

    document.getElementById('hf-call-choices')!.innerHTML = '';
    this._addBubble('right', opt.playerText);
    setTimeout(() => this._showTyping(), 350);
    setTimeout(() => { this._removeTyping(); this._addBubble('left', lines[opt.reactionKey]); }, 1100);

    setTimeout(() => {
      const result = this.sys.resolveCallSession(accMods);
      if (!result) { this._closeCall(); return; }

      const outcomeMsg = result.outcome === 'angry'    ? lines.angry
                       : result.outcome === 'declined' ? lines.declined
                       : lines.accepted;

      this._showTyping();
      setTimeout(() => { this._removeTyping(); this._addBubble('left', outcomeMsg); }, 700);
      setTimeout(() => {
        this._addBubble('right', result.message);
        this._showEndBtn(result);
        if (result.outcome === 'invested' || result.outcome === 'partial') {
          screenFlash('good');
        }
      }, 1600);
    }, 2200);
  }

  private _showEndBtn(result: { outcome: string; amount: number; message: string }): void {
    const choices = document.getElementById('hf-call-choices')!;
    choices.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'hf-call-end-btn';
    btn.textContent = '📵 End Call';
    btn.addEventListener('click', () => {
      const type = result.outcome === 'invested' ? 'success'
                 : result.outcome === 'partial'  ? 'info' : 'error';
      this.cb!.showToast(result.message, type);
      if (result.amount > 0) {
        this._appendChatMsg('hf-chat-messages', 'left', result.message);
      }
      this._closeCall();
      this.updateDisplay();
    });
    choices.appendChild(btn);
  }

  private _hangUp(): void {
    this.sys.hangUp();
    this._callState = null;
    this._closeCall();
    this.cb?.onCallEnd?.();
    this.cb?.showToast('Call ended.', 'info');
    this.updateDisplay();
  }

  private _closeCall(): void {
    this._callState = null;
    const overlay = document.getElementById('hf-call-overlay')!;
    overlay.style.animation = 'hf-call-out 0.2s ease forwards';
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.style.animation = '';
    }, 200);
  }

  // ── Call UI helpers ────────────────────────────────────────────────────────

  private _renderChoices(opts: { label: string; tag: string; text: string; onClick: () => void }[]): void {
    const el = document.getElementById('hf-call-choices')!;
    el.innerHTML = '';
    for (const opt of opts) {
      const btn = document.createElement('button');
      btn.className = 'hf-call-choice';
      btn.innerHTML = `<span class="hfc-label">${opt.label} <span class="hfc-tag">${opt.tag}</span></span>
                       <span class="hfc-text">"${opt.text}"</span>`;
      btn.addEventListener('click', opt.onClick);
      el.appendChild(btn);
    }
  }

  private _addBubble(side: 'left' | 'right', text: string): void {
    const chat = document.getElementById('hf-call-chat')!;
    const row  = document.createElement('div');
    row.className = `hf-call-msg hf-call-msg-${side}`;
    const bubble = document.createElement('div');
    bubble.className = `hf-call-bubble hf-call-bubble-${side}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }

  private _showTyping(): void {
    const chat = document.getElementById('hf-call-chat')!;
    const row  = document.createElement('div');
    row.id = 'hf-typing-indicator';
    row.className = 'hf-call-msg hf-call-msg-left';
    row.innerHTML = `<div class="hf-call-typing">
      <div class="hf-call-typing-dot"></div>
      <div class="hf-call-typing-dot"></div>
      <div class="hf-call-typing-dot"></div>
    </div>`;
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }

  private _removeTyping(): void {
    document.getElementById('hf-typing-indicator')?.remove();
  }

  // ── Unlock / tutorial ──────────────────────────────────────────────────────

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

  private _appendChatMsg(containerId: string, side: 'left' | 'right', text: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row    = document.createElement('div');
    row.className = `bm-msg-row bm-msg-${side}`;
    const bubble = document.createElement('div');
    bubble.className = `bm-bubble bm-bubble-${side}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  // ── Display update ─────────────────────────────────────────────────────────

  updateDisplay(): void {
    const s = this.sys;
    const g = (id: string) => document.getElementById(id);

    g('hf-aum')!.textContent  = `$${Math.round(s.aum).toLocaleString()}`;
    g('hf-nav')!.textContent  = `${s.fundNAV.toFixed(3)}×`;
    g('hf-fees')!.textContent = `$${Math.round(s.totalFeeEarned).toLocaleString()}`;

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
    if (callsEl) callsEl.textContent = `${s.callsToday} / ${s.MAX_CALLS_PER_DAY}`;
    const cdEl = g('hf-cooldown');
    if (cdEl) cdEl.textContent = s.callCooldownSecs > 0 ? `${s.callCooldownSecs}s` : '—';

    // Staff buttons
    const analyBtn = g('btn-hire-analyst') as HTMLButtonElement | null;
    if (analyBtn) {
      analyBtn.disabled   = s.hasAnalyst;
      analyBtn.textContent = s.hasAnalyst ? '✓ Hired' : '$5,000';
    }
    const lawyBtn = g('btn-hire-lawyer') as HTMLButtonElement | null;
    if (lawyBtn) {
      lawyBtn.disabled    = s.hasLawyer;
      lawyBtn.textContent = s.hasLawyer ? '✓ Hired' : '$15,000';
    }

    this._updateNavChart();
    this._updateInvestorCards();
    this._updateRecruitCards();
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

    const ids = new Set([...container.querySelectorAll<HTMLElement>('[data-hf-inv-id]')].map(e => e.dataset.hfInvId!));
    const liveIds = new Set(investors.map(i => i.id));

    // Remove stale cards
    for (const id of ids) {
      if (!liveIds.has(id)) container.querySelector(`[data-hf-inv-id="${id}"]`)?.remove();
    }

    for (const inv of investors) {
      const tmpl = this.sys.getTemplate(inv.id)!;
      let card = container.querySelector<HTMLElement>(`[data-hf-inv-id="${inv.id}"]`);

      if (!card) {
        card = document.createElement('div');
        card.className = 'hf-investor-card';
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
            <span class="hf-inv-sat-lbl">SATISFACTION</span>
            <div class="hf-sat-track"><div class="hf-sat-fill" id="hf-sat-${inv.id}"></div></div>
            <span class="hf-sat-pct" id="hf-sat-pct-${inv.id}"></span>
          </div>
          <div class="hf-inv-footer">
            <span id="hf-inv-days-${inv.id}">Day 0</span>
          </div>`;
        container.appendChild(card);
      }

      const pct = Math.round(inv.satisfaction * 100);
      const fill = document.getElementById(`hf-sat-${inv.id}`) as HTMLElement | null;
      if (fill) {
        fill.style.width = `${pct}%`;
        fill.className = `hf-sat-fill ${pct >= 65 ? 'sat-good' : pct >= 40 ? 'sat-warn' : 'sat-bad'}`;
      }
      const pctEl = document.getElementById(`hf-sat-pct-${inv.id}`);
      if (pctEl) pctEl.textContent = `${pct}%`;
      const daysEl = document.getElementById(`hf-inv-days-${inv.id}`);
      if (daysEl) daysEl.textContent = `Day ${inv.daysInFund}`;
    }
  }

  private _updateRecruitCards(): void {
    const container = document.getElementById('hf-recruits');
    if (!container) return;
    const recruits   = this.sys.getRecruitableTemplates();
    const inCall     = !!this._callState;
    const canCall    = this.sys.canCall() && !inCall;

    // Rebuild if the set of recruitable templates changed
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
        card.className = 'hf-recruit-card';
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

  addChatMessage(text: string): void {
    this._appendChatMsg('hf-chat-messages', 'left', text);
  }
}
