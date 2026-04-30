import type { HedgeFundSystem, HfInvestorTemplate } from '../systems/HedgeFundSystem.ts';
import { screenFlash } from './animations.ts';
import type { HfCallbacks, ConvOption, HfCallState } from './hfData.ts';
import { INVESTOR_LINES, HF_ROUND_1, HF_ROUND_2 } from './hfData.ts';

export class HedgeFundCallUI {
  private sys: HedgeFundSystem;
  private cb:  HfCallbacks;
  private onUpdate: () => void;
  private appendChatMsg: (id: string, side: 'left' | 'right', text: string) => void;

  private _state: HfCallState | null = null;
  get isActive(): boolean { return this._state !== null; }

  constructor(
    sys: HedgeFundSystem,
    cb: HfCallbacks,
    onUpdate: () => void,
    appendChatMsg: (id: string, side: 'left' | 'right', text: string) => void,
  ) {
    this.sys  = sys;
    this.cb   = cb;
    this.onUpdate    = onUpdate;
    this.appendChatMsg = appendChatMsg;
  }

  open(templateId: string, isInbound: boolean): void {
    if (this._state) return;
    const tmpl = isInbound
      ? this.sys.beginIncomingCallSession(templateId)
      : this.sys.beginCallSession(templateId);
    if (!tmpl) { this.cb.showToast('Cannot call right now.', 'error'); return; }
    this._startCall(tmpl, isInbound);
  }

  hangUp(): void {
    this.sys.hangUp();
    this._state = null;
    this._close();
    this.cb.onCallEnd?.();
    this.cb.showToast('Call ended.', 'info');
    this.onUpdate();
  }

  private _startCall(tmpl: HfInvestorTemplate, isInbound: boolean): void {
    this._state = {
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

    document.getElementById('hf-call-avatar')!.textContent = tmpl.avatar;
    document.getElementById('hf-call-name')!.textContent   = tmpl.name;
    const typeEl = document.getElementById('hf-call-type')!;
    typeEl.textContent = (isInbound ? 'INCOMING · ' : '') + (typeLabels[tmpl.type] ?? tmpl.type);
    typeEl.style.color = typeColors[tmpl.type] ?? '#ccc';
    document.getElementById('hf-call-status')!.textContent = 'CONNECTING...';
    document.getElementById('hf-call-chat')!.innerHTML     = '';
    document.getElementById('hf-call-choices')!.innerHTML  = '';

    document.getElementById('hf-call-overlay')!.classList.remove('hidden');
    this.onUpdate();

    const lines  = INVESTOR_LINES[tmpl.id];
    const opener = isInbound ? lines.opening_in : lines.opening_out;
    setTimeout(() => {
      document.getElementById('hf-call-status')!.textContent = 'CONNECTED';
      this.cb.onCallStart?.();
      this._showTyping();
    }, 700);
    setTimeout(() => { this._removeTyping(); this._addBubble('left', opener); }, 1600);
    setTimeout(() => this._showRound1(), 2500);
  }

  private _showRound1(): void {
    if (!this._state) return;
    this._renderChoices(HF_ROUND_1.map(o => ({
      label: o.label, tag: o.tag, text: o.playerText, onClick: () => this._pickR1(o),
    })));
  }

  private _pickR1(opt: ConvOption): void {
    if (!this._state) return;
    const lines = INVESTOR_LINES[this._state.template.id];
    this._state.accMods.trustBonus       += opt.trustBonus;
    this._state.accMods.amountMult       *= opt.amountMult;
    this._state.accMods.reputationEffect += opt.reputationEffect;
    this._state.round = 2;

    document.getElementById('hf-call-choices')!.innerHTML = '';
    this._addBubble('right', opt.playerText);
    setTimeout(() => this._showTyping(), 350);
    setTimeout(() => { this._removeTyping(); this._addBubble('left', lines[opt.reactionKey]); }, 1100);
    setTimeout(() => this._showRound2(), 2000);
  }

  private _showRound2(): void {
    if (!this._state) return;
    this._renderChoices(HF_ROUND_2.map(o => ({
      label: o.label, tag: o.tag, text: o.playerText, onClick: () => this._pickR2(o),
    })));
  }

  private _pickR2(opt: ConvOption): void {
    if (!this._state || this._state.round === 'resolving') return;
    const { template, accMods } = this._state;
    const lines = INVESTOR_LINES[template.id];

    accMods.trustBonus       += opt.trustBonus;
    accMods.amountMult       *= opt.amountMult;
    accMods.reputationEffect += opt.reputationEffect;
    this._state.round = 'resolving';

    document.getElementById('hf-call-choices')!.innerHTML = '';
    this._addBubble('right', opt.playerText);
    setTimeout(() => this._showTyping(), 350);
    setTimeout(() => { this._removeTyping(); this._addBubble('left', lines[opt.reactionKey]); }, 1100);

    setTimeout(() => {
      const result = this.sys.resolveCallSession(accMods);
      if (!result) { this._close(); return; }

      const outcomeMsg = result.outcome === 'angry'    ? lines.angry
                       : result.outcome === 'declined' ? lines.declined
                       : lines.accepted;

      this._showTyping();
      setTimeout(() => { this._removeTyping(); this._addBubble('left', outcomeMsg); }, 700);
      setTimeout(() => {
        this._addBubble('right', result.message);
        this._showEndBtn(result);
        if (result.outcome === 'invested' || result.outcome === 'partial') screenFlash('good');
      }, 1600);
    }, 2200);
  }

  private _showEndBtn(result: { outcome: string; amount: number; message: string }): void {
    const choices = document.getElementById('hf-call-choices')!;
    choices.innerHTML = '';
    const btn = document.createElement('button');
    btn.className   = 'hf-call-end-btn';
    btn.textContent = '📵 End Call';
    btn.addEventListener('click', () => {
      const type = result.outcome === 'invested' ? 'success'
                 : result.outcome === 'partial'  ? 'info' : 'error';
      this.cb.showToast(result.message, type);
      if (result.amount > 0) this.appendChatMsg('hf-chat-messages', 'left', result.message);
      this._close();
      this.onUpdate();
    });
    choices.appendChild(btn);
  }

  private _close(): void {
    this._state = null;
    const overlay = document.getElementById('hf-call-overlay')!;
    overlay.style.animation = 'hf-call-out 0.2s ease forwards';
    setTimeout(() => { overlay.classList.add('hidden'); overlay.style.animation = ''; }, 200);
  }

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
    const bubble  = document.createElement('div');
    bubble.className   = `hf-call-bubble hf-call-bubble-${side}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    chat.appendChild(row);
    chat.scrollTop = chat.scrollHeight;
  }

  private _showTyping(): void {
    const chat = document.getElementById('hf-call-chat')!;
    const row  = document.createElement('div');
    row.id        = 'hf-typing-indicator';
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
}
