export type AssetArchetype = 'HYPE RIDER' | 'BLUE CHIP' | 'CHAOS' | 'MAX CHAOS' | 'BLENDED' | 'STEADY HOLD' | 'HIGH RISK';

export interface StatLabel {
  icon: string;
  text: string;
  cls: string; // sl-great | sl-good | sl-warn | sl-bad | sl-danger | sl-neutral | sl-muted
}

export interface AssetConfig {
  id: string;
  name: string;
  emoji: string;
  basePrice: number;
  volatility: number;
  trend: number;
  unlockThreshold: number;
  description: string;
  // Archetype identity
  archetype: AssetArchetype;
  archetypeClass: string; // CSS class for the archetype badge colour
  buyReason: string;      // 1-line strategic reason shown permanently on the card
  dividendRate?: number;  // daily fraction of held value paid as cash (e.g. 0.0015 = 0.15 %/day)
  // Fundamentals
  hype: number;        // 0–1  social/media buzz; decays over time
  stability: number;   // 0–1  resistance to crashes; static
  risk: number;        // 0–1  chance of extreme price shocks; static
  hypeDecay: number;   // per-tick hype multiplier (e.g. 0.94 = fast decay, 0.995 = slow)
  carryingCost?: number; // per-tick price drain for chaos assets (~0.000140 = 0.84%/day)
}

export class Asset {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly basePrice: number;
  readonly unlockThreshold: number;
  readonly description: string;
  readonly archetype: AssetArchetype;
  readonly archetypeClass: string;
  readonly buyReason: string;
  readonly dividendRate: number;
  readonly stability: number;
  readonly risk: number;
  readonly hypeDecay: number;
  readonly carryingCost: number;

  price: number;
  dayOpenPrice: number;  // price at the start of the current game day
  volatility: number;
  trend: number;
  hype: number;       // dynamic; decays ~1.5% per tick
  momentum: number;   // computed from last 6 ticks; -0.05 to +0.05
  owned: number;
  priceHistory: number[];
  isUnlocked: boolean;
  volatilityMod: number;
  trendBoost: number;
  baseVolatilityMult: number;

  constructor(config: AssetConfig) {
    this.id = config.id;
    this.name = config.name;
    this.emoji = config.emoji;
    this.basePrice = config.basePrice;
    this.volatility = config.volatility;
    this.trend = config.trend;
    this.unlockThreshold = config.unlockThreshold;
    this.description = config.description;
    this.archetype = config.archetype;
    this.archetypeClass = config.archetypeClass;
    this.buyReason = config.buyReason;
    this.dividendRate = config.dividendRate ?? 0;
    this.stability = config.stability;
    this.risk = config.risk;
    this.hypeDecay = config.hypeDecay;
    this.carryingCost = config.carryingCost ?? 0;
    this.hype = config.hype;
    this.momentum = 0;
    this.price = config.basePrice * (0.8 + Math.random() * 0.4);
    this.dayOpenPrice = this.price;
    this.owned = 0;
    this.priceHistory = [this.price];
    this.isUnlocked = config.unlockThreshold === 0;
    this.volatilityMod = 1;
    this.trendBoost = 0;
    this.baseVolatilityMult = 1;
  }

  tick(): void {
    // Recompute momentum from recent price history
    this.momentum = this.computeMomentum();

    // Per-asset hype decay — hype riders lose buzz fast, stable assets hold it longer
    this.hype = Math.max(0, this.hype * this.hypeDecay);

    const effectiveTrend = this.trend + this.trendBoost;
    const effectiveVolatility = this.volatility * this.volatilityMod * this.baseVolatilityMult;

    // ── Fundamental component (~76% of movement) ────────────────────────
    const fundamentalPct =
      effectiveTrend +
      this.momentum * 0.25 +
      this.hype * 0.002;

    // ── Noise component (~24% of movement) ──────────────────────────────
    const noiseRaw = (Math.random() - 0.5) * 2 * effectiveVolatility * (1 + this.risk * 0.8);

    // Blend: fundamentals steer direction, noise adds uncertainty
    let pctChange = fundamentalPct * 0.76 + noiseRaw * 0.24;

    // (C) Momentum mean-reversion: extreme runs pull back naturally
    if (Math.abs(this.momentum) > 0.025) {
      pctChange -= this.momentum * 0.15;
    }

    // Stability shields against downside
    if (pctChange < 0) {
      pctChange *= 1 - this.stability * 0.55;
    }

    // Rare extreme shock driven by risk stat
    if (Math.random() < this.risk * 0.003) {
      const dir = Math.random() > 0.45 ? 1 : -1;
      pctChange += dir * (0.04 + Math.random() * 0.12 * this.risk);
    }

    const rawPrice = this.price * (1 + pctChange);
    this.price = isFinite(rawPrice) ? Math.max(0.01, rawPrice) : this.basePrice;

    // (B) Carrying cost — chaos assets bleed value passively when flat
    if (this.carryingCost > 0) {
      this.price = Math.max(0.01, this.price * (1 - this.carryingCost));
    }

    this.priceHistory.push(this.price);
    if (this.priceHistory.length > 60) this.priceHistory.shift();

    // Decay temporary modifiers
    this.volatilityMod = 1 + (this.volatilityMod - 1) * 0.97;
    this.trendBoost *= 0.96;
  }

  private computeMomentum(): number {
    if (this.priceHistory.length < 3) return 0;
    const lookback = Math.min(6, this.priceHistory.length);
    const recent = this.priceHistory.slice(-lookback);
    let total = 0;
    for (let i = 1; i < recent.length; i++) {
      total += (recent[i] - recent[i - 1]) / recent[i - 1];
    }
    return Math.max(-0.05, Math.min(0.05, total / (recent.length - 1)));
  }

  getDailyDividend(): number {
    if (this.dividendRate <= 0 || this.owned <= 0) return 0;
    return this.price * this.owned * this.dividendRate;
  }

  shock(multiplier: number): void {
    this.price = Math.max(0.01, this.price * multiplier);
    this.priceHistory.push(this.price);
    if (this.priceHistory.length > 60) this.priceHistory.shift();
  }

  getValue(): number {
    return this.price * this.owned;
  }

  getPriceChangePct(): number {
    if (this.dayOpenPrice <= 0) return 0;
    return ((this.price - this.dayOpenPrice) / this.dayOpenPrice) * 100;
  }

  getPlayerProfitPct(avgCost: number): number {
    if (avgCost <= 0) return 0;
    return ((this.price - avgCost) / avgCost) * 100;
  }

  // ── Stat labels (used in both asset rows and Market Intel modal) ─────────

  getHypeLabel(): StatLabel {
    if (this.hype > 0.75) return { icon: '🔥', text: 'VIRAL',  cls: 'sl-great' };
    if (this.hype > 0.45) return { icon: '🔥', text: 'HIGH',   cls: 'sl-good' };
    if (this.hype > 0.2)  return { icon: '📢', text: 'MED',    cls: 'sl-warn' };
    return                        { icon: '😴', text: 'COLD',   cls: 'sl-muted' };
  }

  getMomentumLabel(): StatLabel {
    if (this.momentum > 0.02)   return { icon: '🚀', text: 'SURGING',  cls: 'sl-great' };
    if (this.momentum > 0.005)  return { icon: '📈', text: 'RISING',   cls: 'sl-good' };
    if (this.momentum < -0.02)  return { icon: '☠️', text: 'CRASHING', cls: 'sl-danger' };
    if (this.momentum < -0.005) return { icon: '📉', text: 'FALLING',  cls: 'sl-bad' };
    return                               { icon: '➡️', text: 'FLAT',     cls: 'sl-neutral' };
  }

  getStabilityLabel(): StatLabel {
    if (this.stability > 0.7) return { icon: '🛡', text: 'SAFE',    cls: 'sl-great' };
    if (this.stability > 0.4) return { icon: '⚖️', text: 'STEADY',  cls: 'sl-good' };
    if (this.stability > 0.2) return { icon: '⚠️', text: 'SHAKY',   cls: 'sl-warn' };
    return                           { icon: '💀', text: 'FRAGILE', cls: 'sl-danger' };
  }

  getRiskLabel(): StatLabel {
    if (this.risk > 0.7)  return { icon: '🎲', text: 'EXTREME', cls: 'sl-danger' };
    if (this.risk > 0.45) return { icon: '⚠️', text: 'HIGH',    cls: 'sl-bad' };
    if (this.risk > 0.2)  return { icon: '🟡', text: 'MEDIUM',  cls: 'sl-warn' };
    return                        { icon: '🟢', text: 'LOW',     cls: 'sl-great' };
  }

  // Teaser text shown for locked assets in Market Intel
  getTeaserSignal(): string {
    if (this.risk > 0.8) return '⚠️ Extremely volatile — explosive upside AND downside';
    if (this.stability > 0.7) return '📈 Steady climber — reliable long-term growth';
    if (this.hype > 0.6) return '🔥 Hype building... could spike soon';
    if (this.risk > 0.5 && this.stability < 0.3) return '🎲 High-risk high-reward — for degens only';
    if (this.trend > 0.004) return '📈 Strong upward trend — patience pays off';
    if (this.trend < 0) return '📉 Declining fundamentals — risky long-term hold';
    return '🔍 Quiet accumulation — something may be brewing';
  }
}

export const ASSET_CONFIGS: AssetConfig[] = [
  {
    id: 'catcoin',
    name: 'CatCoin',
    emoji: '🐱',
    basePrice: 10,
    volatility: 0.04,
    trend: 0.0005,        // near-zero: flat without hype, pops on meme events
    hype: 0.55,
    stability: 0.25,
    risk: 0.35,
    hypeDecay: 0.94,      // fast decay: hype spikes hard then collapses
    unlockThreshold: 0,
    description: 'Meow. That\'s the whole whitepaper.',
    archetype: 'HYPE RIDER',
    archetypeClass: 'arch-hype',
    buyReason: 'Buy before meme events. Hype spikes hard, fades fast — time your exit.',
  },
  {
    id: 'meme_etf',
    name: 'Meme ETF',
    emoji: '😂',
    basePrice: 25,
    volatility: 0.05,
    trend: 0.0015,        // modest positive — catches hype with a floor
    hype: 0.50,
    stability: 0.30,
    risk: 0.40,
    hypeDecay: 0.975,
    unlockThreshold: 0,
    description: 'A diversified fund of pure internet nonsense.',
    archetype: 'BLENDED',
    archetypeClass: 'arch-blend',
    buyReason: 'Balanced hype play. Catches most pumps with softer crashes. Pays tiny dividends.',
    dividendRate: 0.0002,
  },
  {
    id: 'ai_writes_ai',
    name: 'AI Writes AI',
    emoji: '🤖',
    basePrice: 50,
    volatility: 0.04,
    trend: 0.003,         // solid steady climber
    hype: 0.40,
    stability: 0.50,
    risk: 0.35,
    hypeDecay: 0.995,     // slow decay: hype events have lingering tailwind for days
    unlockThreshold: 0,
    description: 'An AI that writes AI that writes AI. Recursion = profit.',
    archetype: 'STEADY HOLD',
    archetypeClass: 'arch-steady',
    buyReason: 'Buy and hold. Slow hype decay means events keep paying for days. Pays dividends.',
    dividendRate: 0.0006,
  },
  {
    id: 'quantum_banana',
    name: 'Quantum Banana',
    emoji: '🍌',
    basePrice: 7,
    volatility: 0.07,
    trend: -0.001,        // mild negative bleed, needs catalyst to pop
    hype: 0.20,
    stability: 0.10,
    risk: 0.80,
    hypeDecay: 0.97,
    carryingCost: 0.000140,
    unlockThreshold: 0,
    description: 'Simultaneously ripe and rotten until someone checks.',
    archetype: 'CHAOS',
    archetypeClass: 'arch-chaos',
    buyReason: 'Enter ONLY with a catalyst pending. Bleeds value daily with no event.',
  },
  {
    id: 'influencer_stock',
    name: 'Influencer Stock',
    emoji: '📸',
    basePrice: 30,
    volatility: 0.06,
    trend: -0.001,        // negative baseline — must ride event spikes and exit
    hype: 0.70,
    stability: 0.15,
    risk: 0.50,
    hypeDecay: 0.93,      // fastest hype decay — must sell the spike same-day
    unlockThreshold: 0,
    description: 'Value entirely based on vibes and follower count.',
    archetype: 'HYPE RIDER',
    archetypeClass: 'arch-hype',
    buyReason: 'Event-trade only — negative trend means holding long-term is a losing strategy.',
  },
  {
    id: 'diamond_hands',
    name: 'DiamondHandsCoin',
    emoji: '💎',
    basePrice: 100,
    volatility: 0.08,
    trend: 0.002,         // positive but regularly interrupted by shocks
    hype: 0.45,
    stability: 0.30,
    risk: 0.65,
    hypeDecay: 0.975,
    unlockThreshold: 2000,
    description: 'HODL or die. Statistically: mostly die.',
    archetype: 'HIGH RISK',
    archetypeClass: 'arch-highrisk',
    buyReason: 'Positive trend but violent shocks. Size small — huge upside if you can stomach the swings.',
  },
  {
    id: 'rug_pull',
    name: 'Rug Pull Token',
    emoji: '🪤',
    basePrice: 1,
    volatility: 0.12,
    trend: 0.005,         // strong trend but extreme risk overwhelms it regularly
    hype: 0.50,
    stability: 0.05,
    risk: 0.90,
    hypeDecay: 0.97,
    carryingCost: 0.000120,
    unlockThreshold: 3500,
    description: 'Why is it going up? Should you be worried? Yes.',
    archetype: 'MAX CHAOS',
    archetypeClass: 'arch-chaos',
    buyReason: 'Maximum volatility. Penny stock that can 10× or go to zero — pure degen play.',
  },
  {
    id: 'doge_cousin',
    name: "Doge's Cousin",
    emoji: '🐕',
    basePrice: 0.5,
    volatility: 0.07,
    trend: 0.0005,        // correlated with CatCoin via hype spillover
    hype: 0.50,
    stability: 0.20,
    risk: 0.55,
    hypeDecay: 0.94,
    unlockThreshold: 5000,
    description: 'Much wow. Very cousin. Such price discovery.',
    archetype: 'HYPE RIDER',
    archetypeClass: 'arch-hype',
    buyReason: "Correlated with CatCoin — trade the lag. CatCoin pumps first, this follows.",
  },
  {
    id: 'nft_of_nft',
    name: 'NFT of an NFT',
    emoji: '🖼️',
    basePrice: 500,
    volatility: 0.10,
    trend: -0.002,        // strong negative bleed — event-only entry
    hype: 0.20,
    stability: 0.05,
    risk: 0.85,
    hypeDecay: 0.97,
    carryingCost: 0.000160,
    unlockThreshold: 10000,
    description: 'You own the JPEG of the JPEG. Very art. Very real.',
    archetype: 'CHAOS',
    archetypeClass: 'arch-chaos',
    buyReason: 'Enter ONLY when NFT Frenzy event is imminent. Otherwise pure bleed.',
  },
  {
    id: 'stonks_up',
    name: 'Stonks Only Up',
    emoji: '📈',
    basePrice: 1000,
    volatility: 0.015,
    trend: 0.006,         // reliable daily compounder; highest dividends
    hype: 0.10,
    stability: 0.80,
    risk: 0.05,
    hypeDecay: 0.995,
    unlockThreshold: 25000,
    description: 'This one actually goes up. Scientists baffled.',
    archetype: 'BLUE CHIP',
    archetypeClass: 'arch-blue',
    buyReason: 'The safe compounder. Highest dividends. Buy, hold, accumulate — boring and profitable.',
    dividendRate: 0.0015,
  },
];
