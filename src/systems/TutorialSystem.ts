const TUTORIAL_KEY = 'idlestonks_tutorial_v1';

export type TutorialActionType = 'buy' | 'sell';

export interface TutorialStep {
  id: string;
  message: string;
  subtext?: string;
  targetSelector?: string;
  actionRequired?: TutorialActionType;
  nextLabel?: string;
}

interface TutorialSaveState {
  stepIndex: number;
  done: boolean;
  introDone: boolean;
}

export class TutorialSystem {
  private _stepIndex = 0;
  private _done = false;
  private _introDone = false;
  private _pendingAction: TutorialActionType | null = null;
  private _onChange: (() => void) | null = null;

  readonly steps: TutorialStep[] = [
    {
      id: 'stock_intro',
      message: 'this is a stock',
      subtext: 'price moves every second — the goal is to buy low and sell high',
      targetSelector: '#asset-list .asset-row:first-child',
      nextLabel: 'got it →',
    },
    {
      id: 'buy',
      message: 'buy low… sell higher',
      subtext: 'click the Buy button to grab some shares',
      targetSelector: '#asset-list .asset-row:first-child .btn-buy',
      actionRequired: 'buy',
    },
    {
      id: 'sell',
      message: 'nice — now cash out',
      subtext: 'click Sell to lock in your profit',
      targetSelector: '#asset-list .asset-row:first-child .btn-sell',
      actionRequired: 'sell',
    },
    {
      id: 'stats',
      message: 'these tell you what might happen next',
      subtext: 'hype and momentum predict price direction — click 🔍 to deep-dive',
      targetSelector: '#asset-list .asset-row:first-child .asset-indicators',
      nextLabel: 'next →',
    },
    {
      id: 'news',
      message: 'this is where the real money is made',
      subtext: 'news events spike prices — react fast and profit',
      targetSelector: '#news-panel',
      nextLabel: 'next →',
    },
    {
      id: 'time',
      message: 'events happen over time — timing matters',
      subtext: 'each day is ~60 seconds — chaos fires when you least expect it',
      targetSelector: '#stat-day',
      nextLabel: "let's go 🚀",
    },
  ];

  get currentStep(): TutorialStep | null {
    if (this._done || this._stepIndex >= this.steps.length) return null;
    return this.steps[this._stepIndex];
  }

  get isDone():      boolean { return this._done; }
  get stepIndex():   number  { return this._stepIndex; }
  get introDone():   boolean { return this._introDone; }
  get totalSteps():  number  { return this.steps.length; }

  isActionSatisfied(): boolean {
    const step = this.currentStep;
    if (!step?.actionRequired) return true;
    return this._pendingAction === step.actionRequired;
  }

  setOnChange(cb: () => void): void { this._onChange = cb; }

  markIntroDone(): void {
    this._introDone = true;
    this.save();
    this._onChange?.();
  }

  advance(): void {
    if (this._done) return;
    const step = this.currentStep;
    if (step?.actionRequired && !this.isActionSatisfied()) return;
    this._pendingAction = null;
    this._stepIndex++;
    if (this._stepIndex >= this.steps.length) this._done = true;
    this.save();
    this._onChange?.();
  }

  notifyAction(type: TutorialActionType): void {
    if (this._done) return;
    const step = this.currentStep;
    if (!step?.actionRequired || step.actionRequired !== type) return;
    if (this._pendingAction !== type) {
      this._pendingAction = type;
      this._onChange?.();
    }
  }

  skip(): void {
    this._done     = true;
    this._introDone = true;
    this.save();
    this._onChange?.();
  }

  save(): void {
    try {
      const data: TutorialSaveState = {
        stepIndex: this._stepIndex,
        done:      this._done,
        introDone: this._introDone,
      };
      localStorage.setItem(TUTORIAL_KEY, JSON.stringify(data));
    } catch { /* noop */ }
  }

  load(): boolean {
    try {
      const raw = localStorage.getItem(TUTORIAL_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw) as TutorialSaveState;
      this._stepIndex = d.stepIndex ?? 0;
      this._done      = d.done      ?? false;
      this._introDone = d.introDone ?? false;
      return true;
    } catch {
      return false;
    }
  }

  clearSave(): void {
    try { localStorage.removeItem(TUTORIAL_KEY); } catch { /* noop */ }
  }
}
