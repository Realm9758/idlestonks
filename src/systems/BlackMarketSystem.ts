export interface BmCustomer {
  id: string;
  name: string;
  avatar: string;
  wealth: 'poor' | 'mid' | 'rich';
  money: number;
  trust: number;
  awareness: number;
  invested: number;
  suspicious: boolean;
  callCount: number;
}

export interface BmStock {
  price: number;
  hype: number;
  totalInvested: number;
}

export interface BmCallResult {
  outcome: 'invested' | 'partial' | 'fail' | 'suspicious';
  amount: number;
  message: string;
}

export interface BmConsequence {
  type: 'fine' | 'lock' | 'reputation';
  fineAmount?: number;
  lockDays?: number;
  message: string;
}

export interface BmSaveState {
  unlocked: boolean;
  tutorialSeen: boolean;
  riskLevel: number;
  reputation: number;
  totalProfit: number;
  rugPullCount: number;
  stock: BmStock;
  customers: { id: string; money: number; invested: number; suspicious: boolean; callCount: number }[];
}

const CUSTOMER_TEMPLATES: Omit<BmCustomer, 'invested' | 'suspicious' | 'callCount'>[] = [
  { id: 'whale',    name: 'Whale Wallace',   avatar: '🐋', wealth: 'rich', money: 50000, trust: 0.72, awareness: 0.25 },
  { id: 'carol',    name: 'Clueless Carol',  avatar: '👩', wealth: 'mid',  money: 8000,  trust: 0.88, awareness: 0.08 },
  { id: 'boomer',   name: 'Boomer Bob',      avatar: '👴', wealth: 'mid',  money: 12000, trust: 0.65, awareness: 0.20 },
  { id: 'degen',    name: 'Degen Dave',      avatar: '🤡', wealth: 'poor', money: 2000,  trust: 0.94, awareness: 0.04 },
  { id: 'analyst',  name: 'Analyst Amy',     avatar: '📊', wealth: 'rich', money: 35000, trust: 0.32, awareness: 0.74 },
];

export class BlackMarketSystem {
  unlocked   = false;
  tutorialSeen = false;

  stock: BmStock = { price: 0.01, hype: 0.05, totalInvested: 0 };
  riskLevel  = 0;
  reputation = 1.0;

  callCooldownSecs = 0;
  readonly CALL_COOLDOWN    = 12;
  callsToday = 0;
  readonly MAX_CALLS_PER_DAY = 5;

  isLocked         = false;
  lockDaysRemaining = 0;
  totalProfit  = 0;
  rugPullCount = 0;

  private _customers: BmCustomer[];

  constructor() {
    this._customers = CUSTOMER_TEMPLATES.map(t => ({ ...t, invested: 0, suspicious: false, callCount: 0 }));
  }

  getCustomers(): readonly BmCustomer[] { return this._customers; }

  canCall(): boolean {
    return !this.isLocked && this.callCooldownSecs <= 0 && this.callsToday < this.MAX_CALLS_PER_DAY;
  }

  callCustomer(id: string): BmCallResult | null {
    if (!this.canCall()) return null;
    const c = this._customers.find(x => x.id === id);
    if (!c || c.money <= 0) return null;

    this.callCooldownSecs = this.CALL_COOLDOWN;
    this.callsToday++;
    c.callCount++;

    const effectiveTrust = c.trust * this.reputation * (c.suspicious ? 0.45 : 1.0);
    const effectiveAwareness = Math.min(0.95, c.awareness + c.callCount * 0.04);
    const roll = Math.random();

    if (roll < effectiveAwareness * 0.35) {
      c.suspicious = true;
      this.riskLevel = Math.min(100, this.riskLevel + 10);
      return { outcome: 'suspicious', amount: 0, message: `${c.name} smells something fishy... 👃` };
    }

    if (roll < effectiveTrust) {
      const big   = roll < effectiveTrust * 0.5;
      const pct   = big ? 0.15 + Math.random() * 0.25 : 0.04 + Math.random() * 0.10;
      const amount = Math.round(Math.min(c.money, c.money * pct));
      const outcome: BmCallResult['outcome'] = big ? 'invested' : 'partial';

      c.money             -= amount;
      c.invested          += amount;
      this.stock.totalInvested += amount;
      this.stock.price     = Math.max(0.01, this.stock.price * (1 + amount / 6000));
      this.stock.hype      = Math.min(1, this.stock.hype + 0.08);
      this.riskLevel       = Math.min(100, this.riskLevel + Math.round(c.awareness * 18));

      const msg = outcome === 'invested'
        ? `${c.name} bought in for $${amount.toLocaleString()}! 🤑`
        : `${c.name} put in a little... $${amount.toLocaleString()}`;
      return { outcome, amount, message: msg };
    }

    return { outcome: 'fail', amount: 0, message: `${c.name} hung up. 📵` };
  }

  canRugPull(): boolean {
    return !this.isLocked && this.stock.totalInvested >= 100;
  }

  rugPull(): { profit: number; totalStolen: number } {
    const totalStolen = this.stock.totalInvested;
    const profit = Math.round(totalStolen * 0.70);
    this.totalProfit  += profit;
    this.rugPullCount++;
    this.stock = { price: 0.001, hype: 0, totalInvested: 0 };
    for (const c of this._customers) { c.invested = 0; c.suspicious = true; }
    this.riskLevel = Math.min(100, this.riskLevel + 45);
    return { profit, totalStolen };
  }

  tickSecond(): void {
    if (this.callCooldownSecs > 0) this.callCooldownSecs--;
    if (this.stock.price > 0.001) {
      const noise = (Math.random() - 0.48) * 0.025 * (1 + this.stock.hype);
      this.stock.price = Math.max(0.001, this.stock.price * (1 + noise));
    }
  }

  dayTick(): BmConsequence | null {
    this.callsToday = 0;
    if (this.lockDaysRemaining > 0) {
      this.lockDaysRemaining--;
      if (this.lockDaysRemaining === 0) this.isLocked = false;
    }
    this.riskLevel  = Math.max(0, this.riskLevel - 4);
    this.stock.hype = Math.max(0, this.stock.hype - 0.04);
    if (this.stock.totalInvested === 0) {
      this.stock.price = Math.max(0.001, this.stock.price * 0.96);
    }
    if (this.riskLevel > 25 && Math.random() < (this.riskLevel - 25) / 270) {
      return this._consequence();
    }
    return null;
  }

  private _consequence(): BmConsequence {
    const r = Math.random();
    if (r < 0.50) {
      const fine = Math.round(400 + this.riskLevel * 90);
      this.riskLevel = Math.max(0, this.riskLevel - 18);
      return { type: 'fine', fineAmount: fine, message: `⚖️ SEC fined you $${fine.toLocaleString()}!` };
    } else if (r < 0.80) {
      const days = 1 + (Math.random() < 0.4 ? 1 : 0);
      this.isLocked = true;
      this.lockDaysRemaining = days;
      this.riskLevel = Math.max(0, this.riskLevel - 22);
      return { type: 'lock', lockDays: days, message: `🚫 Black Market suspended for ${days} day(s)!` };
    } else {
      this.reputation = Math.max(0.3, this.reputation - 0.15);
      this.riskLevel  = Math.max(0, this.riskLevel - 12);
      return { type: 'reputation', message: `📉 Word got out. Customers trust you less now.` };
    }
  }

  saveState(): BmSaveState {
    return {
      unlocked:     this.unlocked,
      tutorialSeen: this.tutorialSeen,
      riskLevel:    this.riskLevel,
      reputation:   this.reputation,
      totalProfit:  this.totalProfit,
      rugPullCount: this.rugPullCount,
      stock:        { ...this.stock },
      customers:    this._customers.map(c => ({
        id: c.id, money: c.money, invested: c.invested,
        suspicious: c.suspicious, callCount: c.callCount,
      })),
    };
  }

  unlock(): void { this.unlocked = true; }

  loadState(s: Partial<BmSaveState>): void {
    this.unlocked      = s.unlocked      ?? false;
    this.tutorialSeen  = s.tutorialSeen  ?? false;
    this.riskLevel     = s.riskLevel     ?? 0;
    this.reputation    = s.reputation    ?? 1.0;
    this.totalProfit   = s.totalProfit   ?? 0;
    this.rugPullCount  = s.rugPullCount  ?? 0;
    if (s.stock) this.stock = { ...s.stock };
    if (s.customers) {
      for (const sc of s.customers) {
        const c = this._customers.find(x => x.id === sc.id);
        if (c) Object.assign(c, { money: sc.money, invested: sc.invested, suspicious: sc.suspicious, callCount: sc.callCount });
      }
    }
  }
}
