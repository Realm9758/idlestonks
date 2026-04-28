import type { BlackMarketSystem, BmCustomer, CallMods, NewsManipTypeId } from '../systems/BlackMarketSystem.ts';
import { NEWS_MANIP_TYPES } from '../systems/BlackMarketSystem.ts';
import { screenShake } from './animations.ts';
import { screenFlash } from './animations.ts';
import { SocialMediaPanel } from './SocialMediaPanel.ts';

export interface BmCallbacks {
  showToast:    (msg: string, type: 'success' | 'error' | 'info' | 'chaos') => void;
  addCash:      (amount: number) => void;
  deductCash:   (amount: number) => boolean;
  openBmTab:    () => void;
  onCallStart?: () => void;
  onCallEnd?:   () => void;
}

interface ChatMsg { side: 'left' | 'right'; text: string; }

// ── Unlock / tutorial scripts ──────────────────────────────────────────────

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
  { side: 'left',  text: "call them. have a convo. pitch MoonCoin. get them to invest." },
  { side: 'left',  text: "what you say matters — FOMO works on some, flattery on others." },
  { side: 'left',  text: "the more they put in, the higher the price climbs." },
  { side: 'left',  text: "once there's enough in the pool..." },
  { side: 'left',  text: "💀 RUG PULL. you take 70%. they get nothing." },
  { side: 'left',  text: "BUT — the SEC watches. your heat level rises with every call." },
  { side: 'left',  text: "aggressive pitches spike heat fast. be smart about it." },
  { side: 'right', text: "understood. let's eat. 🍽️" },
  { side: 'left',  text: "that's what i like to hear. gl hf 🫡" },
];

// ── Conversation data ──────────────────────────────────────────────────────

interface CustomerLines {
  opening: string;
  r1_soft: string;
  r1_fomo: string;
  r1_exclusive: string;
  r2_bigask: string;
  r2_smallask: string;
  r2_peer: string;
  accepted: string;
  rejected: string;
  suspicious: string;
}

const CUSTOMER_LINES: Record<string, CustomerLines> = {
  whale: {
    opening:      "Yes? Who gave you this number?",
    r1_soft:      "Get to the point. I'm a busy man.",
    r1_fomo:      "I've heard that pitch before. What makes this one different?",
    r1_exclusive: "I appreciate being called first. Continue.",
    r2_bigask:    "If I'm in, I'm in for real. Send the details.",
    r2_smallask:  "I don't do small amounts. I'll decide the size myself.",
    r2_peer:      "I don't follow the crowd. Give me the numbers.",
    accepted:     "You've got your money. Don't make me regret it.",
    rejected:     "Not convinced. Don't waste my time again.",
    suspicious:   "Something's off here. I'm running a check on you.",
  },
  carol: {
    opening:      "Hello! Oh gosh, I love getting phone calls! Who is this?",
    r1_soft:      "That sounds lovely! Oh, tell me more!",
    r1_fomo:      "Oh my goodness — a limited window?! I simply cannot miss this!",
    r1_exclusive: "I'm on a special list?! How wonderful! I feel so VIP!",
    r2_bigask:    "You know what — life is too short! Let's do it!",
    r2_smallask:  "Just a little to start? That sounds very sensible of you!",
    r2_peer:      "If everyone's doing it, it must be good! Count me in!",
    accepted:     "How exciting!! I'm going to tell everyone at book club!",
    rejected:     "Oh, I think I'll sit this one out. But thank you, dear!",
    suspicious:   "Actually... my nephew told me about scams like this. Hmm.",
  },
  boomer: {
    opening:      "Hello? Who is this exactly? How did you get this number?",
    r1_soft:      "Well... I suppose I could hear you out.",
    r1_fomo:      "I don't like being rushed into things. I need time to think.",
    r1_exclusive: "A personal invitation? That's... rather flattering.",
    r2_bigask:    "That's quite a sum. You sure this is safe?",
    r2_smallask:  "A small amount... yes, that sounds more manageable.",
    r2_peer:      "Well if others are doing it, maybe there's something to it...",
    accepted:     "Alright then. But I'm watching this very closely.",
    rejected:     "I appreciate the call, but it's really not for me.",
    suspicious:   "This is starting to sound like one of those telephone scams.",
  },
  degen: {
    opening:      "yooo who's this lmaooo",
    r1_soft:      "aight bet tell me more 👀",
    r1_fomo:      "BRO NO WAY 🚀🚀 WHAT DO I DO TELL ME WHAT TO DO",
    r1_exclusive: "wait im in the special group?? lowkey feel blessed rn fr",
    r2_bigask:    "I'm literally going all in rn I don't even care anymore 💀",
    r2_smallask:  "nah nah I want to put in MORE not less bro",
    r2_peer:      "if everyone's in then I NEED to be in rn can't be the one who missed",
    accepted:     "YOOOO LESSSGOOO 🚀🚀🚀 moon mission activated fr fr",
    rejected:     "bro I'm actually broke rn 💀 next time tho for real",
    suspicious:   "wait... hold on... is this a rug?? bro is this a rug??",
  },
  analyst: {
    opening:      "Who is this? I don't recognise this number.",
    r1_soft:      "An 'opportunity'. How vague. What are the fundamentals?",
    r1_fomo:      "Classic artificial urgency. That's a significant red flag.",
    r1_exclusive: "Flattery is a manipulation tactic. Give me data, not compliments.",
    r2_bigask:    "You want me to bet big on unverified information. Hard pass.",
    r2_smallask:  "A small position... the downside is at least defined.",
    r2_peer:      "Social proof is a logical fallacy. Not a sound thesis.",
    accepted:     "I've run a quick analysis. The risk-reward is... acceptable.",
    rejected:     "I'm not satisfied with the fundamentals. Goodbye.",
    suspicious:   "I'm noting this call in my fraud log. Goodbye.",
  },
};

interface ConvOption {
  id: string;
  label: string;
  tag: string;
  playerText: string;
  trustBonus: number;
  amountMult: number;
  extraHeat: number;
  reactionKey: keyof CustomerLines;
}

const ROUND_1: ConvOption[] = [
  {
    id: 'friendly',
    label: '🤝 Casual tip',
    tag: 'LOW RISK',
    playerText: "Hey, I've got something for you — a coin called MoonCoin is quietly going parabolic. Worth a look.",
    trustBonus: 0.10, amountMult: 1.0, extraHeat: 0,
    reactionKey: 'r1_soft',
  },
  {
    id: 'fomo',
    label: '🔥 FOMO pitch',
    tag: 'HIGH PRESSURE',
    playerText: "You need to act NOW. MoonCoin has a major announcement in 24 hours. Insiders are loading up as we speak.",
    trustBonus: 0.02, amountMult: 1.45, extraHeat: 5,
    reactionKey: 'r1_fomo',
  },
  {
    id: 'exclusive',
    label: '⭐ Exclusive invite',
    tag: 'HIGH TRUST',
    playerText: "I only call my top people with this. You've earned it — early access to MoonCoin before the public.",
    trustBonus: 0.18, amountMult: 1.2, extraHeat: 1,
    reactionKey: 'r1_exclusive',
  },
  {
    id: 'soft',
    label: '🌿 Low pressure',
    tag: 'SAFE',
    playerText: "No rush at all — just thought you might want to hear about MoonCoin. Totally your call.",
    trustBonus: 0.06, amountMult: 0.75, extraHeat: 0,
    reactionKey: 'r1_soft',
  },
];

const ROUND_2: ConvOption[] = [
  {
    id: 'bigask',
    label: '💰 Go all in',
    tag: '+6 HEAT',
    playerText: "Be honest with yourself — put in what you can. This is the one that changes everything.",
    trustBonus: 0.0, amountMult: 1.5, extraHeat: 6,
    reactionKey: 'r2_bigask',
  },
  {
    id: 'smallask',
    label: '🌱 Start small',
    tag: 'SAFE',
    playerText: "Even just a little to start. You can always add more once you see it move.",
    trustBonus: 0.08, amountMult: 0.9, extraHeat: 0,
    reactionKey: 'r2_smallask',
  },
  {
    id: 'peer',
    label: '👥 Peer pressure',
    tag: 'MEDIUM PRESSURE',
    playerText: "Look — everyone in the group is already in. You don't want to be the one who watched from the sidelines.",
    trustBonus: -0.02, amountMult: 1.3, extraHeat: 4,
    reactionKey: 'r2_peer',
  },
];

// ── Panel class ────────────────────────────────────────────────────────────

interface CallState {
  customer: BmCustomer;
  accMods: CallMods;
  round: 1 | 2 | 'resolving' | 'done';
  confidence: number; // 0–100, visual feedback only
}

export class BlackMarketPanel {
  private sys:         BlackMarketSystem;
  private cb:          BmCallbacks | null = null;
  private socialPanel: SocialMediaPanel | null = null;
  private lastCustomerCount = -1;
  tutorialStarted = false;

  private _callState: CallState | null = null;

  constructor(sys: BlackMarketSystem) {
    this.sys = sys;
  }

  mount(container: HTMLElement, callbacks: BmCallbacks): void {
    this.cb = callbacks;
    container.innerHTML = this._panelHtml();
    this._appendFixed();
    this._wireEvents();
    this._mountSocialPanel();
    this.updateDisplay();
  }

  private _mountSocialPanel(): void {
    const mount = document.getElementById('sm-panel-mount');
    if (!mount) return;
    this.socialPanel = new SocialMediaPanel(this.sys, {
      showToast:   (msg, type) => this.cb!.showToast(msg, type),
      addCash:     (amt)       => this.cb!.addCash(amt),
      deductCash:  (amt)       => this.cb!.deductCash(amt),
    });
    this.socialPanel.mount(mount);
  }

  // ── HTML builders ──────────────────────────────────────────────────────────

  private _panelHtml(): string {
    return `
<div class="bm-panel-inner">

  <div class="bm-tab-bar">
    <button class="bm-nav-tab bm-nav-active" data-bm-tab="calls">📞 Calls</button>
    <button class="bm-nav-tab" data-bm-tab="social">📱 Social Media</button>
    <button class="bm-nav-tab" data-bm-tab="news">📰 News</button>
  </div>

  <div class="bm-tab-pane" id="bm-pane-calls">
    <div class="bm-layout">

      <!-- LEFT: COMMS -->
      <div class="bm-chat-col">
        <div class="bm-chat-header">
          <div class="bm-chat-contact-row">
            <span class="bm-contact-dot">●</span>
            <span class="bm-contact-name">bro_crypto</span>
          </div>
          <span class="bm-contact-status">online · e2e encrypted</span>
        </div>
        <div id="bm-chat-messages" class="bm-chat-messages"></div>
      </div>

      <!-- CENTER: OPERATIONS -->
      <div class="bm-ops-col">
        <div class="bm-stock-card">
          <div class="bm-stock-header">
            <div class="bm-coin-meta">
              <span class="bm-coin-name">🌑 MoonCoin</span>
              <span class="bm-coin-tag">SYNTHETIC ASSET</span>
            </div>
            <div class="bm-coin-live-wrap">
              <span class="bm-live-dot"></span>
              <span class="bm-live-label">LIVE</span>
            </div>
          </div>
          <div id="bm-price" class="bm-price">$0.0100</div>
          <div class="bm-hype-row">
            <span class="bm-hype-label">HYPE</span>
            <div class="bm-hype-track"><div id="bm-hype-fill" class="bm-hype-fill" style="width:5%"></div></div>
            <span id="bm-hype-pct" class="bm-hype-pct">5%</span>
          </div>
          <div class="bm-invested-row">
            <span class="bm-invested-label">TOTAL POOL</span>
            <span id="bm-total-invested" class="bm-invested-val">$0</span>
          </div>

          <!-- Heat bar lives here now — always in view while calling -->
          <div class="bm-heat-inline">
            <div class="bm-heat-inline-top">
              <span class="bm-heat-inline-lbl">HEAT</span>
              <span id="bm-threat-badge" class="bm-threat-badge bm-threat-safe">SAFE</span>
              <span id="bm-risk-label" class="bm-risk-label">0%</span>
            </div>
            <div class="bm-heat-bar-wrap">
              <div id="bm-risk-fill" class="bm-heat-bar-fill risk-low" style="width:0%"></div>
            </div>
            <div id="bm-risk-warn" class="bm-risk-warn hidden">⚠️ CRITICAL — CASE RISK</div>
          </div>
        </div>

        <div class="bm-targets-hdr">
          <span>TARGETS</span>
          <span class="bm-targets-hint">tap to initiate call</span>
        </div>
        <div id="bm-customers" class="bm-customers"></div>

        <div id="bm-sec-sweep" class="bm-sec-sweep hidden">
          🔒 SEC SWEEP — RUG LOCKED <span id="bm-sweep-timer"></span>
        </div>

        <button id="btn-rug-pull" class="btn-rug-pull" disabled>
          <span class="rug-icon">💀</span>
          <span class="rug-text">EXECUTE RUG PULL</span>
        </button>

        <div class="bm-rivals-hdr">RIVAL OPERATORS</div>
        <div id="bm-rivals-list" class="bm-rivals-list"></div>
      </div>

      <!-- RIGHT: CASE & STATS -->
      <div class="bm-risk-col">

        <!-- Shown when heat ≥ 60 -->
        <div id="bm-case-block" class="bm-case-block hidden">
          <div class="bm-case-block-title">🔍 UNDER INVESTIGATION</div>
          <div id="bm-case-detail" class="hidden">
            <div class="bm-case-prog-row">
              <span class="bm-case-lbl">CASE PROGRESS</span>
              <span id="bm-case-pct" class="bm-case-pct">0%</span>
            </div>
            <div class="bm-case-track">
              <div id="bm-case-fill" class="bm-case-fill" style="width:0%"></div>
            </div>
          </div>
        </div>

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

        <button id="btn-lay-low" class="btn-lay-low" disabled>
          🤫 Lay Low
          <span class="lay-low-sub">−30 heat · 1 day lock</span>
        </button>
      </div>

    </div>
  </div>

  <div class="bm-tab-pane hidden" id="bm-pane-social">
    <div id="sm-panel-mount" style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden"></div>
  </div>

  <div class="bm-tab-pane hidden" id="bm-pane-news">
    <div id="nm-panel" class="nm-panel"></div>
  </div>

</div>`;
  }

  private _appendFixed(): void {
    // Breaking news banner
    const banner = document.createElement('div');
    banner.id = 'bm-breaking-banner';
    banner.className = 'bm-breaking-banner hidden';
    banner.innerHTML = `
      <div class="bbn-inner">
        <span class="bbn-live">📺 BREAKING</span>
        <span id="bbn-headline" class="bbn-headline"></span>
        <span id="bbn-result" class="bbn-result"></span>
      </div>`;
    document.body.appendChild(banner);

    // Unlock notification
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

    // Call overlay
    const callOverlay = document.createElement('div');
    callOverlay.id = 'bm-call-overlay';
    callOverlay.className = 'bm-call-overlay hidden';
    callOverlay.innerHTML = `
      <div class="bm-call-screen">
        <div class="bm-call-header">
          <div class="bm-call-status-row">
            <div class="bm-call-dot"></div>
            <span class="bm-call-status-text" id="bm-call-status">CONNECTING...</span>
          </div>
          <div class="bm-call-customer-info">
            <span class="bm-call-avatar" id="bm-call-avatar"></span>
            <div>
              <div class="bm-call-customer-name" id="bm-call-name"></div>
              <div class="bm-call-customer-wealth" id="bm-call-wealth"></div>
            </div>
          </div>
          <div class="bm-conf-wrap">
            <span class="bm-conf-lbl">TRUST</span>
            <div class="bm-conf-track">
              <div id="bm-conf-fill" class="bm-conf-fill" style="width:35%"></div>
            </div>
            <span id="bm-conf-pct" class="bm-conf-pct">35%</span>
          </div>
        </div>
        <div id="bm-call-chat" class="bm-call-chat"></div>
        <div id="bm-call-choices" class="bm-call-choices"></div>
        <button id="bm-call-hangup" class="bm-call-hangup">📵 Hang Up</button>
      </div>`;
    document.body.appendChild(callOverlay);
  }

  private _wireEvents(): void {
    const cb = this.cb!;

    // ── Tab switching ───────────────────────────────────────────────────────
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
      this._openCallModal(btn.dataset.callId!);
    });

    document.getElementById('btn-rug-pull')?.addEventListener('click', () => this._handleRugPull());
    document.getElementById('btn-lay-low')?.addEventListener('click', () => this._handleLayLow());

    document.getElementById('bm-call-hangup')?.addEventListener('click', () => this._hangUp());
  }

  // ── Call modal ────────────────────────────────────────────────────────────

  private _openCallModal(customerId: string): void {
    if (this._callState) return; // already in a call

    const customer = this.sys.beginCallSession(customerId);
    if (!customer) return;

    this._callState = {
      customer,
      accMods: { trustBonus: 0, amountMult: 1.0, extraHeat: 0 },
      round: 1,
      confidence: 35,
    };
    this._updateConfidence(35);

    const lines = CUSTOMER_LINES[customerId];
    const wealthColors: Record<string, string> = { poor: '#ff9966', mid: '#ffd966', rich: '#00ff88' };

    const overlay = document.getElementById('bm-call-overlay')!;
    document.getElementById('bm-call-avatar')!.textContent = customer.avatar;
    document.getElementById('bm-call-name')!.textContent   = customer.name;
    const wealthEl = document.getElementById('bm-call-wealth')!;
    wealthEl.textContent = customer.wealth.toUpperCase();
    wealthEl.style.color = wealthColors[customer.wealth] ?? '#ccc';
    document.getElementById('bm-call-chat')!.innerHTML  = '';
    document.getElementById('bm-call-choices')!.innerHTML = '';
    document.getElementById('bm-call-status')!.textContent = 'CONNECTING...';

    overlay.classList.remove('hidden');
    this.updateDisplay(); // disable call buttons

    // Connecting → Connected → opening line → Round 1 choices
    setTimeout(() => {
      document.getElementById('bm-call-status')!.textContent = 'CONNECTED';
      this.cb?.onCallStart?.();
      this._showTyping();
    }, 700);
    setTimeout(() => {
      this._removeTyping();
      this._addCallBubble('left', lines.opening);
    }, 1600);
    setTimeout(() => this._showRound1(), 2600);
  }

  private _showRound1(): void {
    if (!this._callState) return;
    this._renderChoices(ROUND_1.map(opt => ({
      label: opt.label,
      tag:   opt.tag,
      text:  opt.playerText,
      onClick: () => this._pickR1(opt),
    })));
  }

  private _pickR1(opt: ConvOption): void {
    if (!this._callState) return;
    const lines = CUSTOMER_LINES[this._callState.customer.id];
    this._callState.accMods.trustBonus += opt.trustBonus;
    this._callState.accMods.amountMult *= opt.amountMult;
    this._callState.accMods.extraHeat  += opt.extraHeat;
    this._callState.round = 2;
    const confDelta = opt.trustBonus > 0.12 ? 22 : opt.trustBonus > 0 ? 12 : opt.extraHeat > 3 ? -8 : 5;
    this._callState.confidence = Math.min(95, Math.max(5, this._callState.confidence + confDelta));
    this._updateConfidence(this._callState.confidence);

    document.getElementById('bm-call-choices')!.innerHTML = '';
    this._addCallBubble('right', opt.playerText);

    setTimeout(() => this._showTyping(), 350);
    setTimeout(() => {
      this._removeTyping();
      this._addCallBubble('left', lines[opt.reactionKey]);
    }, 1100);
    setTimeout(() => this._showRound2(), 2000);
  }

  private _showRound2(): void {
    if (!this._callState) return;
    this._renderChoices(ROUND_2.map(opt => ({
      label: opt.label,
      tag:   opt.tag,
      text:  opt.playerText,
      onClick: () => this._pickR2(opt),
    })));
  }

  private _pickR2(opt: ConvOption): void {
    if (!this._callState || this._callState.round === 'resolving') return;
    const { customer, accMods } = this._callState;
    const lines = CUSTOMER_LINES[customer.id];

    accMods.trustBonus += opt.trustBonus;
    accMods.amountMult *= opt.amountMult;
    accMods.extraHeat  += opt.extraHeat;
    this._callState.round = 'resolving';
    const confDelta = opt.id === 'smallask' ? 10 : opt.id === 'bigask' ? -5 : opt.id === 'peer' ? -3 : 5;
    this._callState.confidence = Math.min(95, Math.max(5, this._callState.confidence + confDelta));
    this._updateConfidence(this._callState.confidence);

    document.getElementById('bm-call-choices')!.innerHTML = '';
    this._addCallBubble('right', opt.playerText);

    setTimeout(() => this._showTyping(), 350);
    setTimeout(() => {
      this._removeTyping();
      this._addCallBubble('left', lines[opt.reactionKey]);
    }, 1100);

    // Resolve and show outcome
    setTimeout(() => {
      const result = this.sys.resolveCallSession(accMods);
      if (!result) { this._closeCallModal(); return; }

      const outcomeMsg = result.outcome === 'suspicious' ? lines.suspicious
                       : result.amount > 0               ? lines.accepted
                       : lines.rejected;

      this._showTyping();
      setTimeout(() => {
        this._removeTyping();
        this._addCallBubble('left', outcomeMsg);
      }, 700);
      setTimeout(() => {
        this._addCallBubble('right', result.message);
        this._showEndCallBtn(result);
      }, 1600);
    }, 2200);
  }

  private _showEndCallBtn(result: { outcome: string; amount: number; message: string }): void {
    const choices = document.getElementById('bm-call-choices')!;
    choices.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'bm-call-end-btn';
    btn.textContent = '📵 End Call';
    btn.addEventListener('click', () => {
      const type = result.outcome === 'invested'  ? 'success'
                 : result.outcome === 'partial'   ? 'info'
                 : 'error';
      this.cb!.showToast(result.message, type);
      if (result.amount > 0) {
        this._appendChatMsg('bm-chat-messages', 'left', result.message);
      }
      this._closeCallModal();
      this.updateDisplay();
    });
    choices.appendChild(btn);
  }

  private _hangUp(): void {
    this.sys.hangUp();
    this._callState = null;
    this._closeCallModal();
    this.cb?.onCallEnd?.();
    this.cb?.showToast('Call ended.', 'info');
    this.updateDisplay();
  }

  private _closeCallModal(): void {
    this._callState = null;
    const overlay = document.getElementById('bm-call-overlay')!;
    overlay.style.animation = 'call-overlay-out 0.2s ease forwards';
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.style.animation = '';
    }, 200);
  }

  // ── Call UI helpers ───────────────────────────────────────────────────────

  private _renderChoices(options: { label: string; tag: string; text: string; onClick: () => void }[]): void {
    const el = document.getElementById('bm-call-choices')!;
    el.innerHTML = '';
    for (const opt of options) {
      const btn = document.createElement('button');
      btn.className = 'bm-call-choice';
      btn.innerHTML = `<span class="choice-label">${opt.label} <span class="choice-tag">${opt.tag}</span></span>
                       <span class="choice-text">"${opt.text}"</span>`;
      btn.addEventListener('click', opt.onClick);
      el.appendChild(btn);
    }
  }

  private _addCallBubble(side: 'left' | 'right', text: string): void {
    const chat = document.getElementById('bm-call-chat')!;
    const row = document.createElement('div');
    row.className = `bm-call-msg bm-call-msg-${side}`;
    const bubble = document.createElement('div');
    bubble.className = `bm-call-bubble bm-call-bubble-${side}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }

  private _showTyping(): void {
    const chat = document.getElementById('bm-call-chat')!;
    const row = document.createElement('div');
    row.id = 'bm-typing-indicator';
    row.className = 'bm-call-msg bm-call-msg-left';
    row.innerHTML = `<div class="bm-call-typing">
      <div class="bm-call-typing-dot"></div>
      <div class="bm-call-typing-dot"></div>
      <div class="bm-call-typing-dot"></div>
    </div>`;
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }

  private _removeTyping(): void {
    document.getElementById('bm-typing-indicator')?.remove();
  }

  private _updateConfidence(pct: number): void {
    const fill = document.getElementById('bm-conf-fill') as HTMLElement | null;
    const label = document.getElementById('bm-conf-pct');
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.className = `bm-conf-fill ${pct >= 60 ? 'bm-conf-high' : pct >= 35 ? 'bm-conf-mid' : 'bm-conf-low'}`;
    }
    if (label) label.textContent = `${pct}%`;
  }

  // ── Rug pull ──────────────────────────────────────────────────────────────

  private _handleRugPull(): void {
    if (!this.sys.canRugPull()) return;
    const { profit, totalStolen } = this.sys.rugPull();
    this.cb!.addCash(profit);
    screenShake('heavy');
    screenFlash('bad');

    // Post-rug ritual — lock UI, show wire transfer, then unlock
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

  // ── News Manipulation ─────────────────────────────────────────────────────

  private _renderNewsPanel(): void {
    const container = document.getElementById('nm-panel');
    if (!container) return;

    if (!this.sys.newsManipUnlocked) {
      container.innerHTML = `
        <div class="nm-locked">
          <div class="nm-lock-icon">🔒</div>
          <div class="nm-lock-title">NEWS MANIPULATION</div>
          <div class="nm-lock-sub">Requires $200,000 net worth while in the Black Market</div>
          <div class="nm-lock-hint">Control the narrative. Shape the market.</div>
        </div>`;
      return;
    }

    const s = this.sys;
    const canPublish = s.canManipNews();
    const cooldown   = s.newsManipCooldownSecs;

    const pendingHtml = s.pendingNewsManips.length > 0
      ? `<div class="nm-pending-section">
          <div class="nm-section-lbl">IN CIRCULATION</div>
          ${s.pendingNewsManips.map(m => `
            <div class="nm-pending-item">
              <span class="nm-pending-dot"></span>
              <span class="nm-pending-headline">"${m.headline}"</span>
              <span class="nm-pending-eta">resolves next day</span>
            </div>`).join('')}
        </div>`
      : '';

    const limitColor = s.newsManipsToday >= s.MAX_NEWS_MANIPS_PER_DAY ? 'nm-limit-danger' : '';

    container.innerHTML = `
      <div class="nm-header">
        <div class="nm-header-title">📰 NEWS CONTROL CENTER</div>
        <div class="nm-header-meta">
          <span class="nm-daily-limit ${limitColor}">${s.newsManipsToday} / ${s.MAX_NEWS_MANIPS_PER_DAY} TODAY</span>
          ${cooldown > 0 ? `<span class="nm-cooldown">⏳ ${cooldown}s cooldown</span>` : ''}
        </div>
      </div>

      <div class="nm-description">
        Plant false stories and manipulate public perception. Every headline carries a cost — and a risk.
      </div>

      <div class="nm-cards">
        ${NEWS_MANIP_TYPES.map(type => {
          const disabled = !canPublish;
          return `
          <div class="nm-card nm-card-${type.id}">
            <div class="nm-card-header">
              <span class="nm-card-emoji">${type.emoji}</span>
              <div class="nm-card-meta">
                <div class="nm-card-title">${type.label}</div>
                <div class="nm-card-tags">${type.tags.map(t => `<span class="nm-tag">${t}</span>`).join('')}</div>
              </div>
            </div>
            <div class="nm-card-headline">"${type.headline}"</div>
            <div class="nm-card-desc">${type.description}</div>
            <div class="nm-card-effects">
              <span class="nm-effect nm-effect-heat">+${type.heatOnPublish} HEAT on publish</span>
              <span class="nm-effect nm-effect-hype">+${Math.round(type.hypeBoostOnSuccess * 100)}% HYPE on success</span>
              ${type.heatOnFail > 0 ? `<span class="nm-effect nm-effect-fail">+${type.heatOnFail} HEAT on fail</span>` : ''}
            </div>
            <button class="nm-publish-btn" data-nm-type="${type.id}" ${disabled ? 'disabled' : ''}>
              ${disabled
                ? (cooldown > 0 ? `⏳ ${cooldown}s` : s.newsManipsToday >= s.MAX_NEWS_MANIPS_PER_DAY ? '✋ DAILY LIMIT' : '🔒 LOCKED')
                : `📤 PUBLISH — $${type.cost.toLocaleString()}`}
            </button>
          </div>`;
        }).join('')}
      </div>

      ${pendingHtml}`;

    container.querySelectorAll<HTMLElement>('[data-nm-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const typeId = btn.dataset.nmType as NewsManipTypeId;
        this._handlePublishNewsManip(typeId);
      });
    });
  }

  private _handlePublishNewsManip(typeId: NewsManipTypeId): void {
    const type = NEWS_MANIP_TYPES.find(t => t.id === typeId);
    if (!type) return;

    const result = this.sys.publishNewsManip(typeId, amount => this.cb!.deductCash(amount));
    if (!result.success) {
      this.cb!.showToast(result.message, 'error');
      return;
    }

    screenShake('light');
    this.cb!.showToast(`📰 Story planted: "${type.headline}"`, 'info');
    this._appendChatMsg('bm-chat-messages', 'left', `story's out. "${type.headline}" 📰`);
    this._renderNewsPanel();
  }

  showBreakingNewsBanner(headline: string, success: boolean): void {
    const banner   = document.getElementById('bm-breaking-banner');
    const headlineEl = document.getElementById('bbn-headline');
    const resultEl   = document.getElementById('bbn-result');
    if (!banner || !headlineEl || !resultEl) return;

    headlineEl.textContent = `"${headline}"`;
    resultEl.textContent   = success ? '✅ LANDED' : '❌ TRACED';
    banner.className = `bm-breaking-banner bm-breaking-${success ? 'success' : 'fail'}`;

    void banner.offsetWidth; // force reflow for animation restart
    banner.classList.add('bm-breaking-visible');

    if (success) { screenFlash('good'); }
    else         { screenFlash('bad'); screenShake('light'); }

    setTimeout(() => {
      banner.classList.remove('bm-breaking-visible');
      setTimeout(() => { banner.className = 'bm-breaking-banner hidden'; }, 600);
    }, 4000);
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

  // ── Display update ─────────────────────────────────────────────────────────

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

    // Threat badge (now inline in the MoonCoin card)
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

    // Case block (shows at heat ≥ 60)
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

    const sus = g('bm-suspended-notice');
    sus?.classList.toggle('hidden', !s.isLocked);
    const lockDays = g('bm-lock-days');
    if (lockDays && s.isLocked) lockDays.textContent = `${s.lockDaysRemaining} day(s) remaining`;

    const rugBtn = g('btn-rug-pull') as HTMLButtonElement | null;
    if (rugBtn) rugBtn.disabled = !s.canRugPull();

    // SEC sweep indicator
    const sweepEl = g('bm-sec-sweep');
    const sweepTimer = g('bm-sweep-timer');
    sweepEl?.classList.toggle('hidden', s.secSweepSecsRemaining <= 0);
    if (sweepTimer) sweepTimer.textContent = s.secSweepSecsRemaining > 0 ? `(${s.secSweepSecsRemaining}s)` : '';

    // Lay Low button
    const layLowBtn = g('btn-lay-low') as HTMLButtonElement | null;
    if (layLowBtn) layLowBtn.disabled = s.isLocked || s.heat < 20;

    this._updateRivalsList();
    this._updateCustomerCards();
    this.socialPanel?.updateDisplay();

    // Drain news manip results and show banner
    const nmResults = this.sys.consumeNewsManipResults();
    for (const r of nmResults) {
      const type = NEWS_MANIP_TYPES.find(t => t.id === r.typeId);
      const label = type?.label ?? r.typeId;
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

    // Refresh news panel if visible
    const newsPane = document.getElementById('bm-pane-news');
    if (newsPane && !newsPane.classList.contains('hidden')) {
      this._renderNewsPanel();
    }
  }

  private _updateRivalsList(): void {
    const container = document.getElementById('bm-rivals-list');
    if (!container) return;
    const rivals = this.sys.getRivals();
    container.innerHTML = '';
    for (const r of rivals) {
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
    const inCall = !!this._callState;

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
