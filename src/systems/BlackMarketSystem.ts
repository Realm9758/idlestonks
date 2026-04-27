import type { SocialPost, SocialPlatform, SocialPostType, PostOutcome } from './SocialPost.ts';
import { PLATFORM_META, POST_TYPE_META, pickComment } from './SocialPost.ts';
export type { SocialPost, SocialPlatform, SocialPostType, PostOutcome };

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

export interface CallMods {
  trustBonus: number;
  amountMult: number;
  extraHeat: number;
}

export interface BmConsequence {
  type: 'fine' | 'lock' | 'reputation' | 'case_won' | 'case_lost';
  fineAmount?: number;
  lockDays?: number;
  message: string;
}

export type HeatLevel = 'safe' | 'suspicious' | 'watched' | 'danger';

export interface BmAlert {
  id: string;
  type: 'investigation_warning' | 'case_opened' | 'case_resolved_win' | 'case_resolved_loss';
  message: string;
}

export interface LawyerUpgrade {
  level: number;
  name: string;
  cost: number;
  description: string;
  // Effects (all are bonuses on top of previous level)
  investigationReduction: number; // reduces case build rate
  fineReduction: number;          // multiplier on fines
  winChanceBonus: number;         // added to case win probability
  caseDelayBonus: number;         // extra seconds before case opens
  ignoreChance: number;           // chance to skip penalty entirely
}

export const LAWYER_UPGRADES: LawyerUpgrade[] = [
  { level: 1, name: 'Street Lawyer',     cost: 5_000,   description: 'Reduces investigation speed by 20%', investigationReduction: 0.20, fineReduction: 0,    winChanceBonus: 0,    caseDelayBonus: 0,  ignoreChance: 0    },
  { level: 2, name: 'Corporate Counsel', cost: 25_000,  description: 'Reduces fines by 25%',               investigationReduction: 0,    fineReduction: 0.25, winChanceBonus: 0,    caseDelayBonus: 0,  ignoreChance: 0    },
  { level: 3, name: 'Senior Partner',    cost: 90_000,  description: 'Win case chance +20%',               investigationReduction: 0,    fineReduction: 0,    winChanceBonus: 0.20, caseDelayBonus: 0,  ignoreChance: 0    },
  { level: 4, name: 'Elite Firm',        cost: 250_000, description: 'Delays case trigger significantly',  investigationReduction: 0,    fineReduction: 0,    winChanceBonus: 0,    caseDelayBonus: 15, ignoreChance: 0    },
  { level: 5, name: 'The Fixer',         cost: 600_000, description: '25% chance to ignore any penalty',  investigationReduction: 0,    fineReduction: 0,    winChanceBonus: 0,    caseDelayBonus: 0,  ignoreChance: 0.25 },
];

export interface BmSaveState {
  unlocked: boolean;
  tutorialSeen: boolean;
  heat: number;
  riskLevel?: number; // legacy compat
  reputation: number;
  totalProfit: number;
  rugPullCount: number;
  stock: BmStock;
  customers: { id: string; money: number; invested: number; suspicious: boolean; callCount: number }[];
  postsToday?: number;
  postCooldownSecs?: number;
  lawyerLevel?: number;
}

const CUSTOMER_TEMPLATES: Omit<BmCustomer, 'invested' | 'suspicious' | 'callCount'>[] = [
  { id: 'whale',    name: 'Whale Wallace',   avatar: '🐋', wealth: 'rich', money: 50000, trust: 0.72, awareness: 0.25 },
  { id: 'carol',    name: 'Clueless Carol',  avatar: '👩', wealth: 'mid',  money: 8000,  trust: 0.88, awareness: 0.08 },
  { id: 'boomer',   name: 'Boomer Bob',      avatar: '👴', wealth: 'mid',  money: 12000, trust: 0.65, awareness: 0.20 },
  { id: 'degen',    name: 'Degen Dave',      avatar: '🤡', wealth: 'poor', money: 2000,  trust: 0.94, awareness: 0.04 },
  { id: 'analyst',  name: 'Analyst Amy',     avatar: '📊', wealth: 'rich', money: 35000, trust: 0.32, awareness: 0.74 },
];

export class BlackMarketSystem {
  unlocked     = false;
  tutorialSeen = false;

  stock: BmStock = { price: 0.01, hype: 0.05, totalInvested: 0 };

  heat       = 0;   // 0–100  |  0–30 safe, 30–60 suspicious, 60–85 watched, 85–100 danger
  reputation = 1.0;

  // Case system
  caseProgress       = 0;    // 0–100, builds when heat > 85
  caseActive         = false;
  caseSecondsAbove85 = 0;    // tracks consecutive seconds above 85 before case opens
  private _caseTriggerDelay = 8; // seconds at heat > 85 before case opens

  // Lawyer
  lawyerLevel = 0;

  // Pending UI alerts (consumed by the panel each tick)
  pendingAlerts: BmAlert[] = [];

  callCooldownSecs = 0;
  readonly CALL_COOLDOWN     = 12;
  callsToday = 0;
  readonly MAX_CALLS_PER_DAY = 5;

  posts: SocialPost[]     = [];
  postCooldownSecs = 0;
  readonly POST_COOLDOWN     = 20;
  postsToday = 0;
  readonly MAX_POSTS_PER_DAY = 8;

  isLocked          = false;
  lockDaysRemaining = 0;
  totalProfit  = 0;
  rugPullCount = 0;

  private _customers: BmCustomer[];
  private _activeCallId: string | null = null;

  // Expose riskLevel as alias for backward compat with BlackMarketPanel
  get riskLevel(): number  { return this.heat; }
  set riskLevel(v: number) { this.heat = v; }

  constructor() {
    this._customers = CUSTOMER_TEMPLATES.map(t => ({ ...t, invested: 0, suspicious: false, callCount: 0 }));
  }

  getCustomers(): readonly BmCustomer[] { return this._customers; }

  getHeatLevel(): HeatLevel {
    if (this.heat < 30) return 'safe';
    if (this.heat < 60) return 'suspicious';
    if (this.heat < 85) return 'watched';
    return 'danger';
  }

  getStage(): 'quiet' | 'growing' | 'trending' | 'viral' | 'unstable' {
    const { hype, totalInvested } = this.stock;
    const hasLiveViral = this.posts.some(p => p.outcome === 'viral' && !p.settled);
    if (this.heat > 75 && hype < 0.3)            return 'unstable';
    if (hype > 0.75 || hasLiveViral)             return 'viral';
    if (hype > 0.45 || totalInvested > 4000)     return 'trending';
    if (hype > 0.15 || totalInvested > 400)      return 'growing';
    return 'quiet';
  }

  getLawyerUpgrade(): LawyerUpgrade | null {
    const next = this.lawyerLevel + 1;
    return LAWYER_UPGRADES.find(u => u.level === next) ?? null;
  }

  getLawyerMeta(): LawyerUpgrade | null {
    return LAWYER_UPGRADES.find(u => u.level === this.lawyerLevel) ?? null;
  }

  private _getLawyerStat(key: keyof LawyerUpgrade): number {
    // Cumulative stat from all purchased lawyer levels
    let total = 0;
    for (let l = 1; l <= this.lawyerLevel; l++) {
      const u = LAWYER_UPGRADES.find(x => x.level === l);
      if (u) total += u[key] as number;
    }
    return total;
  }

  buyLawyerUpgrade(deductCash: (amount: number) => boolean): boolean {
    const next = this.getLawyerUpgrade();
    if (!next) return false;
    if (!deductCash(next.cost)) return false;
    this.lawyerLevel++;
    return true;
  }

  getCaseBuildRate(): number {
    if (this.heat <= 85) return 0;
    const base = (this.heat - 85) * 0.12;
    const reduction = this._getLawyerStat('investigationReduction');
    return base * (1 - reduction);
  }

  getCaseWinChance(): number {
    return Math.min(0.90, 0.30 + this._getLawyerStat('winChanceBonus'));
  }

  getCaseTriggerDelay(): number {
    return this._caseTriggerDelay + this._getLawyerStat('caseDelayBonus');
  }

  canCall(): boolean {
    return !this.isLocked && this.callCooldownSecs <= 0 && this.callsToday < this.MAX_CALLS_PER_DAY;
  }

  canPost(): boolean {
    return !this.isLocked && this.postCooldownSecs <= 0 && this.postsToday < this.MAX_POSTS_PER_DAY;
  }

  publishPost(platform: SocialPlatform, postType: SocialPostType, text: string): SocialPost | null {
    if (!this.canPost()) return null;

    this.postCooldownSecs = this.POST_COOLDOWN;
    this.postsToday++;

    const pm  = PLATFORM_META[platform];
    const ptm = POST_TYPE_META[postType];

    const viralChance = 0.08 + pm.viralBonus + ptm.viralBonus;
    const roll = Math.random();
    let outcome: PostOutcome;
    let engMult: number;
    let hypeMult: number;

    if (roll < 0.18) {
      outcome = 'flop';   engMult = 0.08; hypeMult = 0;
    } else if (roll < 0.18 + viralChance) {
      outcome = 'viral';  engMult = 9;    hypeMult = 3.5;
    } else if (roll < 0.70) {
      outcome = 'normal'; engMult = 1;    hypeMult = 1;
    } else {
      outcome = 'strong'; engMult = 2.5;  hypeMult = 1.7;
    }

    const variance    = 0.65 + Math.random() * 0.7;
    const hypeTotal   = Math.max(0, ptm.baseHype * hypeMult * variance);
    const riskAdded   = Math.round(ptm.baseRisk * (
      outcome === 'viral' ? 2.2 : outcome === 'strong' ? 1.3 : outcome === 'flop' ? 0.4 : 1
    ));

    const crowdBase: Record<PostOutcome, [number, number]> = {
      flop:   [0,    0],
      normal: [200,  700],
      strong: [600,  2000],
      viral:  [3000, 10000],
    };
    const [cMin, cMax] = crowdBase[outcome];
    const crowdAmount  = Math.round(cMin + Math.random() * (cMax - cMin));

    // Comment interval: viral posts get rapid comments, flops get few
    const baseInterval: Record<PostOutcome, number> = {
      flop: 20, normal: 8, strong: 5, viral: 2,
    };

    const post: SocialPost = {
      id: `sp_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      platform,
      postType,
      text,
      likes: 0, reposts: 0, comments: 0,
      targetLikes:    Math.max(1, Math.round(pm.baseLikes    * engMult * variance)),
      targetReposts:  Math.max(1, Math.round(pm.baseReposts  * engMult * variance)),
      targetComments: Math.max(1, Math.round(pm.baseComments * engMult * variance)),
      hypeTotal,
      riskAdded,
      hypeApplied: 0,
      crowdAmount,
      outcome,
      age: 0,
      settled: false,
      viralNotified: false,
      liveComments: [],
      commentTimer: baseInterval[outcome],
    };

    this.heat = Math.min(100, this.heat + riskAdded);
    this.posts.unshift(post);
    if (this.posts.length > 15) this.posts.pop();

    return post;
  }

  beginCallSession(id: string): BmCustomer | null {
    if (!this.canCall()) return null;
    const c = this._customers.find(x => x.id === id);
    if (!c || c.money <= 0) return null;
    this.callCooldownSecs = this.CALL_COOLDOWN;
    this.callsToday++;
    c.callCount++;
    this._activeCallId = id;
    return c;
  }

  resolveCallSession(mods: CallMods): BmCallResult | null {
    if (!this._activeCallId) return null;
    const id = this._activeCallId;
    this._activeCallId = null;
    const c = this._customers.find(x => x.id === id);
    if (!c) return null;

    const effectiveTrust = Math.min(0.97,
      c.trust * this.reputation * (c.suspicious ? 0.45 : 1.0) + mods.trustBonus,
    );
    const effectiveAwareness = Math.min(0.95, c.awareness + c.callCount * 0.04);
    const roll = Math.random();

    if (roll < effectiveAwareness * 0.35) {
      c.suspicious = true;
      this.heat = Math.min(100, this.heat + 10 + mods.extraHeat);
      return { outcome: 'suspicious', amount: 0, message: `${c.name} smells something fishy... 👃` };
    }

    if (roll < effectiveTrust) {
      const big   = roll < effectiveTrust * 0.5;
      const base  = big ? 0.15 + Math.random() * 0.25 : 0.04 + Math.random() * 0.10;
      const pct   = base * Math.max(0.5, mods.amountMult);
      const amount = Math.round(Math.min(c.money, c.money * pct));
      const outcome: BmCallResult['outcome'] = big ? 'invested' : 'partial';

      c.money              -= amount;
      c.invested           += amount;
      this.stock.totalInvested += amount;
      this.stock.price      = Math.max(0.01, this.stock.price * (1 + amount / 6000));
      this.stock.hype       = Math.min(1, this.stock.hype + 0.08);
      this.heat             = Math.min(100, this.heat + Math.round(c.awareness * 18) + mods.extraHeat);

      const msg = outcome === 'invested'
        ? `${c.name} bought in for $${amount.toLocaleString()}! 🤑`
        : `${c.name} put in a little — $${amount.toLocaleString()}`;
      return { outcome, amount, message: msg };
    }

    this.heat = Math.min(100, this.heat + mods.extraHeat);
    return { outcome: 'fail', amount: 0, message: `${c.name} passed. 📵` };
  }

  hangUp(): void {
    this._activeCallId = null;
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
      this.heat = Math.min(100, this.heat + 10);
      return { outcome: 'suspicious', amount: 0, message: `${c.name} smells something fishy... 👃` };
    }

    if (roll < effectiveTrust) {
      const big    = roll < effectiveTrust * 0.5;
      const pct    = big ? 0.15 + Math.random() * 0.25 : 0.04 + Math.random() * 0.10;
      const amount = Math.round(Math.min(c.money, c.money * pct));
      const outcome: BmCallResult['outcome'] = big ? 'invested' : 'partial';

      c.money              -= amount;
      c.invested           += amount;
      this.stock.totalInvested += amount;
      this.stock.price      = Math.max(0.01, this.stock.price * (1 + amount / 6000));
      this.stock.hype       = Math.min(1, this.stock.hype + 0.08);
      this.heat             = Math.min(100, this.heat + Math.round(c.awareness * 18));

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
    this.heat = Math.min(100, this.heat + 45);
    this.caseProgress = Math.min(100, this.caseProgress + 30);
    return { profit, totalStolen };
  }

  consumeAlerts(): BmAlert[] {
    const alerts = [...this.pendingAlerts];
    this.pendingAlerts = [];
    return alerts;
  }

  tickSecond(): void {
    if (this.callCooldownSecs > 0) this.callCooldownSecs--;
    if (this.postCooldownSecs  > 0) this.postCooldownSecs--;

    if (this.stock.price > 0.001) {
      const noise = (Math.random() - 0.48) * 0.025 * (1 + this.stock.hype);
      this.stock.price = Math.max(0.001, this.stock.price * (1 + noise));
    }

    // Case system: track time above heat 85
    if (this.heat >= 85) {
      this.caseSecondsAbove85++;

      // Trigger case open after delay
      if (!this.caseActive && this.caseSecondsAbove85 >= this.getCaseTriggerDelay()) {
        this.caseActive = true;
        this.pendingAlerts.push({
          id: `alert_${Date.now()}`,
          type: 'case_opened',
          message: '🚨 Case opened against you! Heat is too high.',
        });
      }

      // Build case progress
      if (this.caseActive) {
        this.caseProgress = Math.min(100, this.caseProgress + this.getCaseBuildRate());
      }
    } else {
      // Heat back below 85 — slow case progress decay
      this.caseSecondsAbove85 = Math.max(0, this.caseSecondsAbove85 - 2);
      if (this.caseActive && this.caseProgress > 0) {
        this.caseProgress = Math.max(0, this.caseProgress - 0.05);
        if (this.caseProgress <= 0) this.caseActive = false;
      }
    }

    // Investigation warning at heat 60 (one-time)
    if (this.heat >= 60 && this.heat < 65 && !this.caseActive) {
      if (!this.pendingAlerts.some(a => a.type === 'investigation_warning')) {
        this.pendingAlerts.push({
          id: `alert_${Date.now()}`,
          type: 'investigation_warning',
          message: '⚠️ Authorities are watching your activity.',
        });
      }
    }

    // Posts: engagement growth + comment generation
    for (const post of this.posts) {
      if (post.settled) continue;
      post.age++;

      const rate = 0.05;
      const newLikes    = Math.min(post.targetLikes,    Math.ceil(post.likes    + (post.targetLikes    - post.likes)    * rate));
      const newReposts  = Math.min(post.targetReposts,  Math.ceil(post.reposts  + (post.targetReposts  - post.reposts)  * rate));
      const newComments = Math.min(post.targetComments, Math.ceil(post.comments + (post.targetComments - post.comments) * rate));

      const progress  = post.targetLikes > 0 ? newLikes / post.targetLikes : 1;
      const deltaHype = Math.max(0, post.hypeTotal * progress - post.hypeApplied);
      if (deltaHype > 0.0001) {
        post.hypeApplied  += deltaHype;
        this.stock.hype    = Math.min(1, this.stock.hype + deltaHype * 0.007);
        this.stock.price   = Math.max(0.001, this.stock.price * (1 + deltaHype * 0.0012));
      }

      post.likes    = newLikes;
      post.reposts  = newReposts;
      post.comments = newComments;

      // Generate live comments
      post.commentTimer--;
      if (post.commentTimer <= 0 && post.liveComments.length < 6) {
        const comment = pickComment(this.heat);
        post.liveComments.push(comment);

        // Comments affect hype / heat
        if (comment.type === 'positive') {
          this.stock.hype = Math.min(1, this.stock.hype + 0.002);
        } else if (comment.type === 'negative') {
          this.heat = Math.min(100, this.heat + 0.4);
        }

        // Reset timer — viral posts get faster comments
        const baseInterval: Record<string, number> = {
          flop: 18, normal: 7, strong: 4, viral: 2,
        };
        post.commentTimer = baseInterval[post.outcome] + Math.floor(Math.random() * 4);
      }

      if (post.likes >= post.targetLikes || post.age > 90) {
        post.likes    = post.targetLikes;
        post.reposts  = post.targetReposts;
        post.comments = post.targetComments;
        if (!post.settled) {
          post.settled = true;
          if (post.crowdAmount > 0) {
            this.stock.totalInvested += post.crowdAmount;
            this.stock.price          = Math.max(0.001, this.stock.price * (1 + post.crowdAmount / 10000));
          }
        }
      }
    }
  }

  dayTick(): BmConsequence | null {
    this.callsToday = 0;
    this.postsToday = 0;
    if (this.lockDaysRemaining > 0) {
      this.lockDaysRemaining--;
      if (this.lockDaysRemaining === 0) this.isLocked = false;
    }
    this.heat        = Math.max(0, this.heat - 4);
    this.stock.hype  = Math.max(0, this.stock.hype - 0.04);
    if (this.stock.totalInvested === 0) {
      this.stock.price = Math.max(0.001, this.stock.price * 0.96);
    }

    // Force-resolve case if progress is full
    if (this.caseActive && this.caseProgress >= 100) {
      this.caseActive = false;
      this.caseProgress = 0;
      this.caseSecondsAbove85 = 0;
      return this._resolveCase();
    }

    if (this.heat > 25 && Math.random() < (this.heat - 25) / 270) {
      return this._consequence();
    }
    return null;
  }

  private _resolveCase(): BmConsequence {
    const winChance = this.getCaseWinChance();
    const ignoreChance = this._getLawyerStat('ignoreChance');

    if (Math.random() < ignoreChance) {
      this.pendingAlerts.push({ id: `alert_${Date.now()}`, type: 'case_resolved_win', message: '⚖️ Your lawyer buried the case. No penalty.' });
      return { type: 'case_won', message: '⚖️ Your lawyer buried the case. No penalty!' };
    }

    if (Math.random() < winChance) {
      this.heat = Math.max(0, this.heat - 25);
      this.pendingAlerts.push({ id: `alert_${Date.now()}`, type: 'case_resolved_win', message: '⚖️ Case dismissed! Your lawyer pulled through.' });
      return { type: 'case_won', message: '⚖️ Case dismissed! Your lawyer pulled through.' };
    }

    // Lost the case
    const fineBase = Math.round(2000 + this.heat * 150);
    const fineReduction = this._getLawyerStat('fineReduction');
    const fine = Math.round(fineBase * (1 - fineReduction));
    this.heat = Math.max(0, this.heat - 30);
    this.pendingAlerts.push({ id: `alert_${Date.now()}`, type: 'case_resolved_loss', message: `🚨 Case lost. Fined $${fine.toLocaleString()}!` });
    return { type: 'case_lost', fineAmount: fine, message: `🚨 Case lost. SEC fined you $${fine.toLocaleString()}!` };
  }

  private _consequence(): BmConsequence {
    const ignoreChance = this._getLawyerStat('ignoreChance');
    if (Math.random() < ignoreChance) {
      return { type: 'fine', fineAmount: 0, message: '⚖️ Your lawyer deflected a fine.' };
    }

    const r = Math.random();
    if (r < 0.50) {
      const base = Math.round(400 + this.heat * 90);
      const fineReduction = this._getLawyerStat('fineReduction');
      const fine = Math.round(base * (1 - fineReduction));
      this.heat = Math.max(0, this.heat - 18);
      return { type: 'fine', fineAmount: fine, message: `⚖️ SEC fined you $${fine.toLocaleString()}!` };
    } else if (r < 0.80) {
      const days = 1 + (Math.random() < 0.4 ? 1 : 0);
      this.isLocked = true;
      this.lockDaysRemaining = days;
      this.heat = Math.max(0, this.heat - 22);
      return { type: 'lock', lockDays: days, message: `🚫 Black Market suspended for ${days} day(s)!` };
    } else {
      this.reputation = Math.max(0.3, this.reputation - 0.15);
      this.heat       = Math.max(0, this.heat - 12);
      return { type: 'reputation', message: `📉 Word got out. Customers trust you less now.` };
    }
  }

  private _getLawyerStat(key: keyof Pick<LawyerUpgrade, 'investigationReduction' | 'fineReduction' | 'winChanceBonus' | 'caseDelayBonus' | 'ignoreChance'>): number {
    let total = 0;
    for (let l = 1; l <= this.lawyerLevel; l++) {
      const u = LAWYER_UPGRADES.find(x => x.level === l);
      if (u) total += u[key] as number;
    }
    return total;
  }

  saveState(): BmSaveState {
    return {
      unlocked:        this.unlocked,
      tutorialSeen:    this.tutorialSeen,
      heat:            this.heat,
      reputation:      this.reputation,
      totalProfit:     this.totalProfit,
      rugPullCount:    this.rugPullCount,
      stock:           { ...this.stock },
      customers:       this._customers.map(c => ({
        id: c.id, money: c.money, invested: c.invested,
        suspicious: c.suspicious, callCount: c.callCount,
      })),
      postsToday:       this.postsToday,
      postCooldownSecs: this.postCooldownSecs,
      lawyerLevel:      this.lawyerLevel,
    };
  }

  unlock(): void { this.unlocked = true; }

  loadState(s: Partial<BmSaveState>): void {
    this.unlocked         = s.unlocked         ?? false;
    this.tutorialSeen     = s.tutorialSeen     ?? false;
    this.heat             = s.heat ?? s.riskLevel ?? 0; // support legacy saves
    this.reputation       = s.reputation       ?? 1.0;
    this.totalProfit      = s.totalProfit      ?? 0;
    this.rugPullCount     = s.rugPullCount     ?? 0;
    this.postsToday       = s.postsToday       ?? 0;
    this.postCooldownSecs = s.postCooldownSecs ?? 0;
    this.lawyerLevel      = s.lawyerLevel      ?? 0;
    if (s.stock) this.stock = { ...s.stock };
    if (s.customers) {
      for (const sc of s.customers) {
        const c = this._customers.find(x => x.id === sc.id);
        if (c) Object.assign(c, { money: sc.money, invested: sc.invested, suspicious: sc.suspicious, callCount: sc.callCount });
      }
    }
  }
}
