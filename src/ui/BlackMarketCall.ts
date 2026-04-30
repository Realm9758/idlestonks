import type { BlackMarketSystem } from '../systems/BlackMarketSystem.ts';
import type { BmCallbacks, CallState, ConvOption } from './bmData.ts';
import { CUSTOMER_LINES, ROUND_1, ROUND_2 } from './bmData.ts';

export class BlackMarketCallUI {
  private sys: BlackMarketSystem;
  private cb:  BmCallbacks;
  private onUpdate: () => void;
  private appendChatMsg: (id: string, side: 'left' | 'right', text: string) => void;

  private _state: CallState | null = null;
  get isActive(): boolean { return this._state !== null; }

  constructor(
    sys: BlackMarketSystem,
    cb: BmCallbacks,
    onUpdate: () => void,
    appendChatMsg: (id: string, side: 'left' | 'right', text: string) => void,
  ) {
    this.sys = sys;
    this.cb  = cb;
    this.onUpdate    = onUpdate;
    this.appendChatMsg = appendChatMsg;
  }

  open(customerId: string): void {
    if (this._state) return;

    const customer = this.sys.beginCallSession(customerId);
    if (!customer) return;

    this._state = {
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
    document.getElementById('bm-call-chat')!.innerHTML     = '';
    document.getElementById('bm-call-choices')!.innerHTML  = '';
    document.getElementById('bm-call-status')!.textContent = 'CONNECTING...';

    overlay.classList.remove('hidden');
    this.onUpdate();

    setTimeout(() => {
      document.getElementById('bm-call-status')!.textContent = 'CONNECTED';
      this.cb.onCallStart?.();
      this._showTyping();
    }, 700);
    setTimeout(() => {
      this._removeTyping();
      this._addCallBubble('left', lines.opening);
    }, 1600);
    setTimeout(() => this._showRound1(), 2600);
  }

  hangUp(): void {
    this.sys.hangUp();
    this._state = null;
    this._closeModal();
    this.cb.onCallEnd?.();
    this.cb.showToast('Call ended.', 'info');
    this.onUpdate();
  }

  private _showRound1(): void {
    if (!this._state) return;
    this._renderChoices(ROUND_1.map(opt => ({
      label: opt.label, tag: opt.tag, text: opt.playerText,
      onClick: () => this._pickR1(opt),
    })));
  }

  private _pickR1(opt: ConvOption): void {
    if (!this._state) return;
    const lines = CUSTOMER_LINES[this._state.customer.id];
    this._state.accMods.trustBonus += opt.trustBonus;
    this._state.accMods.amountMult *= opt.amountMult;
    this._state.accMods.extraHeat  += opt.extraHeat;
    this._state.round = 2;
    const confDelta = opt.trustBonus > 0.12 ? 22 : opt.trustBonus > 0 ? 12 : opt.extraHeat > 3 ? -8 : 5;
    this._state.confidence = Math.min(95, Math.max(5, this._state.confidence + confDelta));
    this._updateConfidence(this._state.confidence);

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
    if (!this._state) return;
    this._renderChoices(ROUND_2.map(opt => ({
      label: opt.label, tag: opt.tag, text: opt.playerText,
      onClick: () => this._pickR2(opt),
    })));
  }

  private _pickR2(opt: ConvOption): void {
    if (!this._state || this._state.round === 'resolving') return;
    const { customer, accMods } = this._state;
    const lines = CUSTOMER_LINES[customer.id];

    accMods.trustBonus += opt.trustBonus;
    accMods.amountMult *= opt.amountMult;
    accMods.extraHeat  += opt.extraHeat;
    this._state.round = 'resolving';
    const confDelta = opt.id === 'smallask' ? 10 : opt.id === 'bigask' ? -5 : opt.id === 'peer' ? -3 : 5;
    this._state.confidence = Math.min(95, Math.max(5, this._state.confidence + confDelta));
    this._updateConfidence(this._state.confidence);

    document.getElementById('bm-call-choices')!.innerHTML = '';
    this._addCallBubble('right', opt.playerText);

    setTimeout(() => this._showTyping(), 350);
    setTimeout(() => {
      this._removeTyping();
      this._addCallBubble('left', lines[opt.reactionKey]);
    }, 1100);

    setTimeout(() => {
      const result = this.sys.resolveCallSession(accMods);
      if (!result) { this._closeModal(); return; }

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
    btn.className   = 'bm-call-end-btn';
    btn.textContent = '📵 End Call';
    btn.addEventListener('click', () => {
      const type = result.outcome === 'invested' ? 'success'
                 : result.outcome === 'partial'  ? 'info'
                 : 'error';
      this.cb.showToast(result.message, type);
      if (result.amount > 0) this.appendChatMsg('bm-chat-messages', 'left', result.message);
      this._closeModal();
      this.onUpdate();
    });
    choices.appendChild(btn);
  }

  private _closeModal(): void {
    this._state = null;
    const overlay = document.getElementById('bm-call-overlay')!;
    overlay.style.animation = 'call-overlay-out 0.2s ease forwards';
    setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.style.animation = '';
    }, 200);
  }

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
    const row  = document.createElement('div');
    row.className = `bm-call-msg bm-call-msg-${side}`;
    const bubble  = document.createElement('div');
    bubble.className  = `bm-call-bubble bm-call-bubble-${side}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }

  private _showTyping(): void {
    const chat = document.getElementById('bm-call-chat')!;
    const row  = document.createElement('div');
    row.id        = 'bm-typing-indicator';
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
    const fill  = document.getElementById('bm-conf-fill') as HTMLElement | null;
    const label = document.getElementById('bm-conf-pct');
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.className   = `bm-conf-fill ${pct >= 60 ? 'bm-conf-high' : pct >= 35 ? 'bm-conf-mid' : 'bm-conf-low'}`;
    }
    if (label) label.textContent = `${pct}%`;
  }
}
