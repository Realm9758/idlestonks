export interface AssetConfig {
  id: string;
  name: string;
  emoji: string;
  basePrice: number;
  volatility: number;
  trend: number;
  unlockThreshold: number;
  description: string;
}

export class Asset {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly basePrice: number;
  readonly unlockThreshold: number;
  readonly description: string;

  price: number;
  volatility: number;
  trend: number;
  owned: number;
  priceHistory: number[];
  isUnlocked: boolean;
  volatilityMod: number;   // temporary multiplier, decays to 1
  trendBoost: number;       // temporary additive trend, decays to 0
  baseVolatilityMult: number; // permanent reduction from upgrades

  constructor(config: AssetConfig) {
    this.id = config.id;
    this.name = config.name;
    this.emoji = config.emoji;
    this.basePrice = config.basePrice;
    this.volatility = config.volatility;
    this.trend = config.trend;
    this.unlockThreshold = config.unlockThreshold;
    this.description = config.description;
    this.price = config.basePrice * (0.8 + Math.random() * 0.4);
    this.owned = 0;
    this.priceHistory = [this.price];
    this.isUnlocked = config.unlockThreshold === 0;
    this.volatilityMod = 1;
    this.trendBoost = 0;
    this.baseVolatilityMult = 1;
  }

  tick(): void {
    const noise = (Math.random() - 0.5) * 2;
    const effectiveVolatility = this.volatility * this.volatilityMod * this.baseVolatilityMult;
    const effectiveTrend = this.trend + this.trendBoost;
    const change = (effectiveTrend + noise * effectiveVolatility) * this.price;
    this.price = Math.max(0.01, this.price + change);

    this.priceHistory.push(this.price);
    if (this.priceHistory.length > 60) this.priceHistory.shift();

    // Decay temporary modifiers back to neutral
    this.volatilityMod = 1 + (this.volatilityMod - 1) * 0.97;
    this.trendBoost *= 0.96;
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
    if (this.priceHistory.length < 2) return 0;
    const oldest = this.priceHistory[0];
    return ((this.price - oldest) / oldest) * 100;
  }
}

export const ASSET_CONFIGS: AssetConfig[] = [
  {
    id: 'catcoin',
    name: 'CatCoin',
    emoji: '🐱',
    basePrice: 10,
    volatility: 0.04,
    trend: 0.001,
    unlockThreshold: 0,
    description: 'Meow. That\'s the whole whitepaper.',
  },
  {
    id: 'meme_etf',
    name: 'Meme ETF',
    emoji: '😂',
    basePrice: 25,
    volatility: 0.06,
    trend: 0.002,
    unlockThreshold: 0,
    description: 'A diversified fund of pure internet nonsense.',
  },
  {
    id: 'ai_writes_ai',
    name: 'AI Writes AI',
    emoji: '🤖',
    basePrice: 50,
    volatility: 0.05,
    trend: 0.003,
    unlockThreshold: 0,
    description: 'An AI that writes AI that writes AI. Recursion = profit.',
  },
  {
    id: 'quantum_banana',
    name: 'Quantum Banana',
    emoji: '🍌',
    basePrice: 7,
    volatility: 0.09,
    trend: 0,
    unlockThreshold: 0,
    description: 'Simultaneously ripe and rotten until someone checks.',
  },
  {
    id: 'influencer_stock',
    name: 'Influencer Stock',
    emoji: '📸',
    basePrice: 30,
    volatility: 0.07,
    trend: -0.001,
    unlockThreshold: 0,
    description: 'Value entirely based on vibes and follower count.',
  },
  {
    id: 'diamond_hands',
    name: 'DiamondHandsCoin',
    emoji: '💎',
    basePrice: 100,
    volatility: 0.10,
    trend: 0.002,
    unlockThreshold: 2000,
    description: 'HODL or die. Statistically: mostly die.',
  },
  {
    id: 'rug_pull',
    name: 'Rug Pull Token',
    emoji: '🪤',
    basePrice: 1,
    volatility: 0.15,
    trend: 0.005,
    unlockThreshold: 3500,
    description: 'Why is it going up? Should you be worried? Yes.',
  },
  {
    id: 'doge_cousin',
    name: "Doge's Cousin",
    emoji: '🐕',
    basePrice: 0.5,
    volatility: 0.08,
    trend: 0.001,
    unlockThreshold: 5000,
    description: 'Much wow. Very cousin. Such price discovery.',
  },
  {
    id: 'nft_of_nft',
    name: 'NFT of an NFT',
    emoji: '🖼️',
    basePrice: 500,
    volatility: 0.12,
    trend: -0.002,
    unlockThreshold: 10000,
    description: 'You own the JPEG of the JPEG. Very art. Very real.',
  },
  {
    id: 'stonks_up',
    name: 'Stonks Only Up',
    emoji: '📈',
    basePrice: 1000,
    volatility: 0.02,
    trend: 0.006,
    unlockThreshold: 25000,
    description: 'This one actually goes up. Scientists baffled.',
  },
];
