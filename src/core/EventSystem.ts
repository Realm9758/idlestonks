import type { Market } from './Market.ts';
import type { Player } from './Player.ts';

export type EventSeverity = 'good' | 'bad' | 'neutral' | 'chaos';

export interface EventLogEntry {
  id: number;
  timestamp: number;
  message: string;
  severity: EventSeverity;
}

interface GameEvent {
  id: string;
  weight: number;
  apply: (market: Market, player: Player) => { message: string; severity: EventSeverity };
}

const EVENTS: GameEvent[] = [
  {
    id: 'cat_viral',
    weight: 10,
    apply: (market) => {
      market.getAsset('catcoin')?.shock(3.0);
      return { message: '🚀 Cat meme goes viral! CatCoin PUMPED +200%', severity: 'good' };
    },
  },
  {
    id: 'ai_scandal',
    weight: 8,
    apply: (market) => {
      market.getAsset('ai_writes_ai')?.shock(0.3);
      return { message: '💀 AI startup exposed for making things up! AI Writes AI CRASHED -70%', severity: 'bad' };
    },
  },
  {
    id: 'market_confusion',
    weight: 6,
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        asset.shock(0.3 + Math.random() * 1.7);
      }
      return { message: '🤯 Market confusion event! All prices randomised!', severity: 'chaos' };
    },
  },
  {
    id: 'banana_shortage',
    weight: 8,
    apply: (market) => {
      market.getAsset('quantum_banana')?.shock(3.5);
      return { message: '🍌 Global banana shortage! Quantum Banana SOARED +250%', severity: 'good' };
    },
  },
  {
    id: 'influencer_scandal',
    weight: 9,
    apply: (market) => {
      market.getAsset('influencer_stock')?.shock(0.15);
      return { message: '😬 Influencer caught buying fake followers! Influencer Stock NUKED -85%', severity: 'bad' };
    },
  },
  {
    id: 'elon_tweets',
    weight: 7,
    apply: (market) => {
      const pump = Math.random() > 0.5;
      const mult = pump ? 2.2 : 0.35;
      market.getAsset('catcoin')?.shock(mult);
      market.getAsset('doge_cousin')?.shock(mult);
      const dir = pump ? 'MOONED 🌕' : 'DUMPED ☠️';
      return { message: `🔥 Elon tweets a dog emoji! Dog-adjacent coins ${dir}`, severity: pump ? 'good' : 'bad' };
    },
  },
  {
    id: 'diamond_festival',
    weight: 6,
    apply: (market) => {
      market.getAsset('diamond_hands')?.shock(2.5);
      return { message: '💎 Annual DiamondHands convention! DiamondHandsCoin +150%', severity: 'good' };
    },
  },
  {
    id: 'rug_pull_scare',
    weight: 7,
    apply: (market) => {
      market.getAsset('rug_pull')?.shock(0.08);
      return { message: '🪤 Rug Pull Token devs spotted on a yacht! -92%... probably fine', severity: 'bad' };
    },
  },
  {
    id: 'hamster_wins',
    weight: 4,
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        asset.shock(1.1 + Math.random() * 0.4);
      }
      return { message: '🐹 Prediction hamster wins another lottery! Market-wide boost!', severity: 'good' };
    },
  },
  {
    id: 'nft_frenzy',
    weight: 5,
    apply: (market) => {
      market.getAsset('nft_of_nft')?.shock(4.0);
      return { message: '🖼️ NFT art collector frenzy! NFT of an NFT EXPLODED +300%', severity: 'good' };
    },
  },
  {
    id: 'meme_recession',
    weight: 6,
    apply: (market) => {
      market.getAsset('meme_etf')?.shock(0.4);
      market.getAsset('catcoin')?.shock(0.7);
      return { message: '📉 Internet gets bored. Meme recession begins. Cope.', severity: 'bad' };
    },
  },
  {
    id: 'free_money',
    weight: 4,
    apply: (_market, player) => {
      const amount = Math.floor(200 + Math.random() * 1300);
      player.cash += amount;
      return { message: `💸 Government stimulus drop! You received $${amount}!`, severity: 'good' };
    },
  },
  {
    id: 'quantum_collapse',
    weight: 5,
    apply: (market) => {
      const mult = 0.1 + Math.random() * 9;
      market.getAsset('quantum_banana')?.shock(mult);
      const dir = mult > 1 ? `+${((mult - 1) * 100).toFixed(0)}%` : `-${((1 - mult) * 100).toFixed(0)}%`;
      return { message: `🌀 Quantum banana state collapsed! Price ${dir}. Schrödinger shrugs.`, severity: mult > 1 ? 'good' : 'bad' };
    },
  },
  {
    id: 'trend_boost',
    weight: 3,
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        asset.trendBoost += 0.015;
      }
      return { message: '🏛️ "Stonks Only Up" bill signed into law! Market trend boosted!', severity: 'good' };
    },
  },
  {
    id: 'market_crash',
    weight: 2,
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        asset.shock(0.15 + Math.random() * 0.35);
      }
      return { message: '☠️ MARKET CRASH! Everything dumped. Press F in chat.', severity: 'bad' };
    },
  },
  {
    id: 'bull_run',
    weight: 2,
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        asset.shock(1.5 + Math.random() * 2.0);
      }
      return { message: '🌕 BULL MARKET FRENZY! Everything is pumping! Buy! BUY! BUY!', severity: 'good' };
    },
  },
  {
    id: 'tax_man',
    weight: 5,
    apply: (_market, player) => {
      const loss = Math.floor(player.cash * (0.05 + Math.random() * 0.1));
      player.cash = Math.max(1, player.cash - loss);
      return { message: `🧾 The tax man cometh. You owe $${loss}. No refunds.`, severity: 'bad' };
    },
  },
  {
    id: 'pump_scheme',
    weight: 4,
    apply: (market) => {
      const assets = market.getUnlockedAssets();
      if (assets.length === 0) return { message: '📣 Pump scheme fizzles. Nobody had assets to pump.', severity: 'neutral' };
      const target = assets[Math.floor(Math.random() * assets.length)];
      target.shock(2.0 + Math.random() * 3.0);
      return { message: `📣 Pump scheme targets ${target.emoji} ${target.name}! Price SURGES!`, severity: 'good' };
    },
  },
];

function weightedRandom(events: GameEvent[]): GameEvent {
  const totalWeight = events.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const event of events) {
    r -= event.weight;
    if (r <= 0) return event;
  }
  return events[events.length - 1];
}

export class EventSystem {
  private log: EventLogEntry[];
  private nextEventIn: number;
  private entryIdCounter: number;
  private readonly maxLogEntries = 25;

  constructor() {
    this.log = [];
    this.nextEventIn = this.randomInterval();
    this.entryIdCounter = 0;
  }

  private randomInterval(): number {
    return 10 + Math.floor(Math.random() * 20);
  }

  tick(market: Market, player: Player): EventLogEntry | null {
    this.nextEventIn--;
    if (this.nextEventIn <= 0) {
      this.nextEventIn = this.randomInterval();
      return this.triggerRandom(market, player);
    }
    return null;
  }

  triggerRandom(market: Market, player: Player): EventLogEntry {
    const event = weightedRandom(EVENTS);
    const result = event.apply(market, player);
    return this.addEntry(result.message, result.severity);
  }

  addEntry(message: string, severity: EventSeverity = 'neutral'): EventLogEntry {
    const entry: EventLogEntry = {
      id: this.entryIdCounter++,
      timestamp: Date.now(),
      message,
      severity,
    };
    this.log.unshift(entry);
    if (this.log.length > this.maxLogEntries) this.log.pop();
    return entry;
  }

  getLog(): EventLogEntry[] {
    return [...this.log];
  }

  getNextEventIn(): number {
    return this.nextEventIn;
  }
}
