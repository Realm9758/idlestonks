export type HfInvestorType = 'conservative' | 'aggressive' | 'whale';
export type HfStrategy    = 'conservative' | 'balanced' | 'aggressive';

export interface HfInvestorTemplate {
  id: string;
  name: string;
  avatar: string;
  type: HfInvestorType;
  capitalRange: [number, number];
  trustBase: number;
  skepticism: number;
  riskTolerance: number;
  patience: number;
  withdrawThreshold: number;
}

export interface HfInvestor {
  id: string;
  capital: number;
  satisfaction: number;  // 0–1
  daysInFund: number;
  callCount: number;
  hasComplained: boolean;
}

export interface HfCallMods {
  trustBonus: number;
  amountMult: number;
  reputationEffect: number;
}

export interface HfCallResult {
  outcome: 'invested' | 'partial' | 'declined' | 'angry';
  amount: number;
  message: string;
}

export interface HfConsequence {
  type: 'withdrawal' | 'incoming_call' | 'fee_notice';
  investorId?: string;
  amount?: number;
  message: string;
}

export interface HfAlert {
  type: 'good' | 'warning' | 'danger';
  message: string;
}

export interface HfSaveState {
  unlocked: boolean;
  tutorialSeen: boolean;
  strategyMode: HfStrategy;
  reputation: number;
  aum: number;
  fundNAV: number;
  highWaterMark: number;
  totalFeeEarned: number;
  navHistory: number[];
  hasAnalyst: boolean;
  hasLawyer: boolean;
  callCooldownSecs: number;
  callsToday: number;
  investors: { id: string; capital: number; satisfaction: number; daysInFund: number; callCount: number; hasComplained: boolean }[];
}

export const HF_INVESTOR_TEMPLATES: HfInvestorTemplate[] = [
  {
    id: 'pension_pete',
    name: 'Pension Pete',
    avatar: '👴',
    type: 'conservative',
    capitalRange: [60_000, 100_000],
    trustBase: 0.40,
    skepticism: 0.55,
    riskTolerance: 0.20,
    patience: 0.8,
    withdrawThreshold: 0.25,
  },
  {
    id: 'cfo_karen',
    name: 'CFO Karen',
    avatar: '💼',
    type: 'aggressive',
    capitalRange: [100_000, 200_000],
    trustBase: 0.35,
    skepticism: 0.60,
    riskTolerance: 0.75,
    patience: 0.50,
    withdrawThreshold: 0.45,
  },
  {
    id: 'tyler',
    name: 'Tech Bro Tyler',
    avatar: '💻',
    type: 'aggressive',
    capitalRange: [30_000, 70_000],
    trustBase: 0.72,
    skepticism: 0.20,
    riskTolerance: 0.90,
    patience: 0.65,
    withdrawThreshold: 0.30,
  },
  {
    id: 'margaret',
    name: 'Careful Margaret',
    avatar: '👵',
    type: 'conservative',
    capitalRange: [150_000, 300_000],
    trustBase: 0.30,
    skepticism: 0.72,
    riskTolerance: 0.15,
    patience: 1.0,
    withdrawThreshold: 0.20,
  },
  {
    id: 'the_whale',
    name: 'The Whale',
    avatar: '🐳',
    type: 'whale',
    capitalRange: [400_000, 600_000],
    trustBase: 0.22,
    skepticism: 0.80,
    riskTolerance: 0.60,
    patience: 0.55,
    withdrawThreshold: 0.50,
  },
];

export class HedgeFundSystem {
  unlocked      = false;
  tutorialSeen  = false;
  strategyMode: HfStrategy = 'balanced';

  reputation     = 50;     // 0–100
  aum            = 0;      // total live investor capital
  fundNAV        = 1.0;    // starts at 1.0 when fund launches
  highWaterMark  = 1.0;    // for perf fee calculation
  totalFeeEarned = 0;
  navHistory: number[] = []; // daily return % — last 14 entries

  hasAnalyst = false;
  hasLawyer  = false;

  callCooldownSecs  = 0;
  readonly CALL_COOLDOWN    = 15;
  callsToday = 0;
  readonly MAX_CALLS_PER_DAY = 3;

  private _investors: HfInvestor[] = [];
  private _activeCallId: string | null = null;
  private _pendingIncoming: string | null = null; // investor id of pending incoming call

  readonly templates = HF_INVESTOR_TEMPLATES;

  // ── Accessors ──────────────────────────────────────────────────────────────

  unlock(): void { this.unlocked = true; }

  getInvestors(): readonly HfInvestor[] { return this._investors; }

  getTemplate(id: string): HfInvestorTemplate | undefined {
    return this.templates.find(t => t.id === id);
  }

  getRecruitableTemplates(): HfInvestorTemplate[] {
    const live = new Set(this._investors.map(i => i.id));
    return this.templates.filter(t => !live.has(t.id));
  }

  getPendingIncoming(): string | null { return this._pendingIncoming; }
  clearPendingIncoming(): void        { this._pendingIncoming = null; }

  getRecentAvgReturn(): number {
    if (this.navHistory.length === 0) return 0;
    const slice = this.navHistory.slice(-7);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  canCall(): boolean {
    return !this.callCooldownSecs && this.callsToday < this.MAX_CALLS_PER_DAY;
  }

  setStrategy(mode: HfStrategy): void { this.strategyMode = mode; }

  getWithdrawalRisk(investorId: string): 'safe' | 'nervous' | 'high' {
    const inv  = this._investors.find(i => i.id === investorId);
    const tmpl = this.getTemplate(investorId);
    if (!inv || !tmpl) return 'safe';
    const margin = inv.satisfaction - tmpl.withdrawThreshold;
    if (margin < 0.08) return 'high';
    if (margin < 0.22) return 'nervous';
    return 'safe';
  }

  getAlerts(): HfAlert[] {
    const alerts: HfAlert[] = [];
    const avg7 = this.getRecentAvgReturn();

    if (this.navHistory.length >= 3) {
      if (avg7 > 4)        alerts.push({ type: 'good',    message: '📈 Strong performance — investor confidence rising' });
      else if (avg7 < -3)  alerts.push({ type: 'danger',  message: '🔴 Poor returns — withdrawal risk elevated across fund' });
      else if (avg7 < -1)  alerts.push({ type: 'warning', message: '⚠️ Performance slipping — watch investor satisfaction' });
    }

    for (const inv of this._investors) {
      const tmpl = this.getTemplate(inv.id)!;
      const risk = this.getWithdrawalRisk(inv.id);
      if (risk === 'high')
        alerts.push({ type: 'danger',  message: `🚨 ${tmpl.avatar} ${tmpl.name} — withdrawal imminent` });
      else if (risk === 'nervous')
        alerts.push({ type: 'warning', message: `⚠️ ${tmpl.avatar} ${tmpl.name} is getting nervous` });
    }

    if (this._investors.length > 0 && this.reputation < 35)
      alerts.push({ type: 'danger', message: '🔴 Reputation critical — investors may withdraw' });

    return alerts;
  }

  // ── Outgoing call ──────────────────────────────────────────────────────────

  beginCallSession(id: string): HfInvestorTemplate | null {
    if (!this.canCall()) return null;
    const tmpl = this.getTemplate(id);
    if (!tmpl) return null;
    if (this._investors.find(i => i.id === id)) return null; // already in fund

    this.callCooldownSecs = this.CALL_COOLDOWN;
    this.callsToday++;
    this._activeCallId = id;
    return tmpl;
  }

  // ── Incoming call (initiated by investor) — no cooldown cost ──────────────

  beginIncomingCallSession(id: string): HfInvestorTemplate | null {
    const tmpl = this.getTemplate(id);
    if (!tmpl) return null;
    this._activeCallId = id;
    this._pendingIncoming = null;
    return tmpl;
  }

  resolveCallSession(mods: HfCallMods): HfCallResult | null {
    if (!this._activeCallId) return null;
    const id = this._activeCallId;
    this._activeCallId = null;
    const tmpl = this.getTemplate(id);
    if (!tmpl) return null;

    const analystBonus = this.hasAnalyst ? 0.10 : 0;
    const repBonus     = (this.reputation - 50) / 500; // –0.1 → +0.1
    const effectiveTrust = Math.min(0.95,
      tmpl.trustBase * (1 + repBonus) + mods.trustBonus + analystBonus,
    );
    const roll = Math.random();

    // Hostile/suspicious check
    if (roll < tmpl.skepticism * 0.22) {
      const repDmg = this.hasLawyer ? 3 : 7;
      this.reputation = Math.max(0, this.reputation - repDmg);
      return {
        outcome: 'angry',
        amount:  0,
        message: `${tmpl.name} thinks something's off. Reputation –${repDmg}. 😤`,
      };
    }

    if (roll < effectiveTrust) {
      const big = roll < effectiveTrust * 0.40;
      const [lo, hi] = tmpl.capitalRange;
      const pct    = big ? 0.55 + Math.random() * 0.45 : 0.20 + Math.random() * 0.35;
      const capital = Math.round(Math.min(hi, lo + (hi - lo) * pct * Math.max(0.5, mods.amountMult)));

      const inv: HfInvestor = {
        id: tmpl.id, capital, satisfaction: 0.70 + Math.random() * 0.20,
        daysInFund: 0, callCount: 0, hasComplained: false,
      };
      this._investors.push(inv);
      this.aum += capital;

      // Launch NAV from 1.0 on first investor
      if (this._investors.length === 1) {
        this.fundNAV = 1.0;
        this.highWaterMark = 1.0;
      }

      this.reputation = Math.min(100, this.reputation + (big ? 5 : 2) + mods.reputationEffect);
      const msg = big
        ? `${tmpl.avatar} ${tmpl.name} committed $${capital.toLocaleString()}! 🎉`
        : `${tmpl.avatar} ${tmpl.name} started with $${capital.toLocaleString()}.`;
      return { outcome: big ? 'invested' : 'partial', amount: capital, message: msg };
    }

    return { outcome: 'declined', amount: 0, message: `${tmpl.name} passed. "Not the right time."` };
  }

  hangUp(): void { this._activeCallId = null; }

  // ── Per-second tick ────────────────────────────────────────────────────────

  tickSecond(): void {
    if (this.callCooldownSecs > 0) this.callCooldownSecs--;
  }

  // ── Day tick ───────────────────────────────────────────────────────────────

  dayTick(dailyReturnPct: number): {
    consequences: HfConsequence[];
    managementFee: number;
    performanceFee: number;
  } {
    this.callsToday = 0;
    const consequences: HfConsequence[] = [];
    let managementFee  = 0;
    let performanceFee = 0;

    // Incoming call from recruitable even with no investors yet (reputation-gated)
    if (this._investors.length === 0) {
      if (Math.random() < 0.10 && this.reputation >= 45 && !this._pendingIncoming) {
        const pool = this.getRecruitableTemplates();
        if (pool.length > 0) {
          const tmpl = pool[Math.floor(Math.random() * pool.length)];
          this._pendingIncoming = tmpl.id;
          consequences.push({
            type: 'incoming_call', investorId: tmpl.id,
            message: `📞 ${tmpl.avatar} ${tmpl.name} is calling — they've heard about your fund`,
          });
        }
      }
      return { consequences, managementFee, performanceFee };
    }

    // Update fund NAV
    this.fundNAV *= (1 + dailyReturnPct / 100);
    this.navHistory.push(Math.round(dailyReturnPct * 100) / 100);
    if (this.navHistory.length > 14) this.navHistory.shift();

    // ── Fees ──────────────────────────────────────────────────────────────
    managementFee = Math.round(this.aum * 0.02 / 365);
    this.totalFeeEarned += managementFee;

    if (this.fundNAV > this.highWaterMark && this.aum > 0) {
      const gainPct  = this.fundNAV - this.highWaterMark;
      performanceFee = Math.round(gainPct * this.aum * 0.20);
      this.highWaterMark = this.fundNAV;
      this.totalFeeEarned += performanceFee;
    }

    // ── Reputation drift ──────────────────────────────────────────────────
    const avg7 = this.getRecentAvgReturn();
    if (avg7 > 3)       this.reputation = Math.min(100, this.reputation + 2);
    else if (avg7 > 0)  this.reputation = Math.min(100, this.reputation + 0.5);
    else if (avg7 < -3) this.reputation = Math.max(0, this.reputation - (this.hasLawyer ? 3 : 5));
    else if (avg7 < 0)  this.reputation = Math.max(0, this.reputation - 1);

    // ── Investor satisfaction + withdrawals ───────────────────────────────
    // Strategy mode scales how investors perceive returns — conservative
    // softens swings, aggressive amplifies them in both directions.
    const stratMult = { conservative: 0.65, balanced: 1.0, aggressive: 1.35 }[this.strategyMode];
    const perceivedReturn = dailyReturnPct * stratMult;

    const toRemove: string[] = [];
    for (const inv of this._investors) {
      inv.daysInFund++;
      const tmpl = this.getTemplate(inv.id)!;

      let delta = 0;
      if      (perceivedReturn >  3) delta =  0.07;
      else if (perceivedReturn >  0) delta =  0.02;
      else if (perceivedReturn < -5) delta = -0.14;
      else if (perceivedReturn < -1) delta = -0.06;
      else                           delta = -0.01;

      if (tmpl.type === 'conservative' && perceivedReturn < 0) delta *= 1.6;
      if (tmpl.type === 'aggressive'   && perceivedReturn < 3) delta *= 1.2;
      if (tmpl.type === 'whale'        && perceivedReturn < 1) delta *= 1.3;

      // Strategy-type alignment bonus/penalty
      if (this.strategyMode === 'conservative' && tmpl.type === 'conservative') delta += 0.01;
      if (this.strategyMode === 'aggressive'   && tmpl.type === 'aggressive')   delta += 0.01;
      if (this.strategyMode === 'conservative' && tmpl.type === 'aggressive')   delta -= 0.01;
      if (this.strategyMode === 'aggressive'   && tmpl.type === 'conservative') delta -= 0.015;

      if (delta < 0) delta *= tmpl.patience;

      inv.satisfaction = Math.max(0, Math.min(1, inv.satisfaction + delta));

      if (inv.satisfaction < tmpl.withdrawThreshold) {
        toRemove.push(inv.id);
        consequences.push({
          type: 'withdrawal', investorId: inv.id, amount: inv.capital,
          message: `💸 ${tmpl.avatar} ${tmpl.name} withdrew $${inv.capital.toLocaleString()} — satisfaction too low`,
        });
      } else if (!inv.hasComplained && inv.satisfaction < 0.40) {
        inv.hasComplained = true;
        if (!this._pendingIncoming) {
          this._pendingIncoming = inv.id;
          consequences.push({
            type: 'incoming_call', investorId: inv.id,
            message: `📞 ${tmpl.avatar} ${tmpl.name} is calling — they're not happy`,
          });
        }
      }
    }

    for (const id of toRemove) {
      const inv = this._investors.find(i => i.id === id);
      if (inv) this.aum = Math.max(0, this.aum - inv.capital);
    }
    this._investors = this._investors.filter(i => !toRemove.includes(i.id));

    // Random inbound from new investor prospects
    if (this.reputation >= 60 && Math.random() < 0.08
        && this.getRecruitableTemplates().length > 0 && !this._pendingIncoming) {
      const pool = this.getRecruitableTemplates();
      const tmpl = pool[Math.floor(Math.random() * pool.length)];
      this._pendingIncoming = tmpl.id;
      consequences.push({
        type: 'incoming_call', investorId: tmpl.id,
        message: `📞 ${tmpl.avatar} ${tmpl.name} heard about you — incoming call!`,
      });
    }

    return { consequences, managementFee, performanceFee };
  }

  // ── Staff ──────────────────────────────────────────────────────────────────

  hireAnalyst(): boolean {
    if (this.hasAnalyst) return false;
    this.hasAnalyst = true;
    return true;
  }

  hireLawyer(): boolean {
    if (this.hasLawyer) return false;
    this.hasLawyer = true;
    return true;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  saveState(): HfSaveState {
    return {
      unlocked:        this.unlocked,
      tutorialSeen:    this.tutorialSeen,
      strategyMode:    this.strategyMode,
      reputation:      this.reputation,
      aum:             this.aum,
      fundNAV:         this.fundNAV,
      highWaterMark:   this.highWaterMark,
      totalFeeEarned:  this.totalFeeEarned,
      navHistory:      [...this.navHistory],
      hasAnalyst:      this.hasAnalyst,
      hasLawyer:       this.hasLawyer,
      callCooldownSecs: this.callCooldownSecs,
      callsToday:      this.callsToday,
      investors:       this._investors.map(i => ({ ...i })),
    };
  }

  loadState(s: Partial<HfSaveState>): void {
    this.unlocked        = s.unlocked        ?? false;
    this.tutorialSeen    = s.tutorialSeen    ?? false;
    this.strategyMode    = s.strategyMode    ?? 'balanced';
    this.reputation      = s.reputation      ?? 50;
    this.aum             = s.aum             ?? 0;
    this.fundNAV         = s.fundNAV         ?? 1.0;
    this.highWaterMark   = s.highWaterMark   ?? 1.0;
    this.totalFeeEarned  = s.totalFeeEarned  ?? 0;
    this.navHistory      = s.navHistory      ?? [];
    this.hasAnalyst      = s.hasAnalyst      ?? false;
    this.hasLawyer       = s.hasLawyer       ?? false;
    this.callCooldownSecs = s.callCooldownSecs ?? 0;
    this.callsToday      = s.callsToday      ?? 0;
    if (s.investors)     this._investors = s.investors.map(i => ({ ...i }));
  }
}
