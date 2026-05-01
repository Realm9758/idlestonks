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
      id: 'market',
      message: '📈 These are your meme stocks',
      subtext: 'Prices move every second based on hype, momentum, and random market chaos. Your job: buy low, sell high.',
      targetSelector: '#asset-list .asset-row:first-child',
      nextLabel: 'got it →',
    },
    {
      id: 'buy',
      message: '🛒 Buy some shares to get started',
      subtext: 'Set a quantity and click Buy. You start with $1,000 — try grabbing a few shares of the cheapest stock.',
      targetSelector: '#asset-list .asset-row:first-child .btn-buy',
      actionRequired: 'buy',
    },
    {
      id: 'sell',
      message: '💰 Now sell to lock in your profit',
      subtext: 'When the price rises above what you paid, selling earns you the difference. Sell all at once or one at a time.',
      targetSelector: '#asset-list .asset-row:first-child .btn-sell',
      actionRequired: 'sell',
    },
    {
      id: 'portfolio',
      message: '💼 This is your portfolio',
      subtext: 'It shows everything you own and your gain/loss vs what you paid. Holding 3+ different stocks unlocks a sell bonus.',
      targetSelector: '#portfolio-panel',
      nextLabel: 'next →',
    },
    {
      id: 'sentiment',
      message: '😱 Watch the market sentiment',
      subtext: 'The Fear/Greed bar shows the mood of the whole market. Extreme Greed = bubble risk. Extreme Fear = buy opportunity.',
      targetSelector: '#fear-greed-bar',
      nextLabel: 'next →',
    },
    {
      id: 'news',
      message: '📰 Breaking news moves prices fast',
      subtext: 'News events resolve in 1–4 days and cause big price swings. The outcome (✅ success or ❌ fail) isn\'t guaranteed — plan ahead.',
      targetSelector: '#news-panel',
      nextLabel: 'next →',
    },
    {
      id: 'events',
      message: '⚡ Random events fire every few days',
      subtext: 'Market crashes, viral memes, and bull runs happen without warning. The countdown shows when the next one hits — position yourself before it fires.',
      targetSelector: '#events-panel',
      nextLabel: 'next →',
    },
    {
      id: 'missions',
      message: '🎯 Missions give you bonus cash',
      subtext: 'You always have 3 active missions (Quick / Strategy / Risk). Complete them for rewards and XP. Check the Missions tab anytime.',
      targetSelector: '[data-tab="missions"]',
      nextLabel: 'next →',
    },
    {
      id: 'upgrades',
      message: '⬆️ Upgrades scale your earning power',
      subtext: 'Buy upgrades to automate trading, boost sell profits, speed up days, and unlock the Black Market. Spend early — upgrades compound.',
      targetSelector: '[data-tab="upgrades"]',
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
    if (this._pendingAction === type) return; // already queued
    this._pendingAction = type;
    this._onChange?.(); // show "✓ perfect" state briefly
    setTimeout(() => this.advance(), 900);
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
