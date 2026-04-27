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
  hint: string;
  apply: (market: Market, player: Player) => { message: string; severity: EventSeverity };
}

// ── Stat-aware events ────────────────────────────────────────────────────────
//
// Core patterns players can learn:
//  • High hype  → viral events pump harder; scandal events crash harder
//  • High stab  → resists market crashes
//  • High risk  → extreme shocks more likely (both ways)
//  • Hype decays → buy after viral spike, wait for next cycle

const EVENTS: GameEvent[] = [
  // ── Hype-driven events ───────────────────────────────────────────────────

  {
    id: 'cat_viral',
    weight: 10,
    hint: '🔥 Viral pump brewing',
    apply: (market) => {
      const asset = market.getAsset('catcoin');
      if (!asset) return { message: '🐱 Cat meme fizzled. Nobody cared.', severity: 'neutral' };
      const mult = 1.8 + asset.hype * 1.5;
      const prevHype = asset.hype;
      asset.hype = Math.min(1, asset.hype + 0.45);
      asset.shock(mult);
      const tag = prevHype > 0.6 ? 'PEAK HYPE — maximum pump' : 'Hype rising';
      return { message: `🚀 Cat meme goes viral! ${tag} +${((mult - 1) * 100).toFixed(0)}%`, severity: 'good' };
    },
  },

  {
    id: 'influencer_scandal',
    weight: 9,
    hint: '😬 Scandal incoming',
    apply: (market) => {
      const asset = market.getAsset('influencer_stock');
      if (!asset) return { message: '📸 Scandal contained. Somehow.', severity: 'neutral' };
      const prevHype = asset.hype;
      const crashMult = Math.max(0.05, 0.4 - prevHype * 0.35);
      asset.hype *= 0.04;
      asset.shock(crashMult);
      const tag = prevHype > 0.6 ? 'Hype collapse — BRUTAL' : 'Scandal hits';
      return { message: `😬 Influencer caught faking it! ${tag} -${((1 - crashMult) * 100).toFixed(0)}%`, severity: 'bad' };
    },
  },

  {
    id: 'meme_lord_awakens',
    weight: 5,
    hint: '😤 Meme surge coming',
    apply: (market) => {
      let biggest = '';
      let biggestGain = 0;
      for (const asset of market.getUnlockedAssets()) {
        if (asset.hype > 0.3) {
          const mult = 1.2 + asset.hype * 0.8;
          asset.hype = Math.min(1, asset.hype + 0.2);
          asset.shock(mult);
          if (mult > biggestGain) { biggestGain = mult; biggest = asset.name; }
        }
      }
      return { message: `😤 Meme lord awakens! High-hype assets pump. ${biggest} leads the charge.`, severity: 'good' };
    },
  },

  {
    id: 'hype_crash',
    weight: 7,
    hint: '📉 Hype collapse imminent',
    apply: (market) => {
      let worst = '';
      let worstCrash = 1;
      for (const asset of market.getUnlockedAssets()) {
        if (asset.hype > 0.4) {
          const crashMult = Math.max(0.2, 0.7 - asset.hype * 0.5);
          asset.shock(crashMult);
          asset.hype *= 0.15;
          if (crashMult < worstCrash) { worstCrash = crashMult; worst = asset.name; }
        }
      }
      const tag = worst ? `${worst} worst hit.` : 'Low-hype market saved itself.';
      return { message: `📉 Internet gets bored. Hype assets dump. ${tag}`, severity: 'bad' };
    },
  },

  // ── Stability-tested events ──────────────────────────────────────────────

  {
    id: 'market_crash',
    weight: 2,
    hint: '☠️ Market crash warning',
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        const crashFloor = 0.15 + asset.stability * 0.50;
        asset.shock(crashFloor);
        asset.hype *= 0.35;
      }
      return { message: '☠️ MARKET CRASH! Stable assets held. Fragile ones wrecked. F in chat.', severity: 'bad' };
    },
  },

  {
    id: 'regulation_crackdown',
    weight: 4,
    hint: '🏛️ Regulation wave forming',
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        if (asset.stability > 0.5) {
          asset.shock(1.1 + asset.stability * 0.3);
        } else if (asset.risk > 0.6) {
          asset.shock(Math.max(0.2, 0.5 - asset.risk * 0.3));
        }
      }
      return { message: '🏛️ Government regulation wave! Stable assets gained. High-risk assets hammered.', severity: 'chaos' };
    },
  },

  {
    id: 'bull_run',
    weight: 2,
    hint: '🌕 Bull market forming',
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        const mult = 1.4 + Math.random() * 1.2;
        asset.hype = Math.min(1, asset.hype + 0.3);
        asset.shock(mult);
      }
      return { message: '🌕 BULL MARKET FRENZY! Everything pumping! Buy! BUY! BUY!', severity: 'good' };
    },
  },

  // ── Risk-driven extreme events ───────────────────────────────────────────

  {
    id: 'banana_quantum_collapse',
    weight: 8,
    hint: '🍌 Quantum observation pending',
    apply: (market) => {
      const asset = market.getAsset('quantum_banana');
      if (!asset) return { message: '🍌 Banana observation failed.', severity: 'neutral' };
      const goUp = Math.random() > 0.45;
      const mult = goUp
        ? 2.5 + Math.random() * 3.0
        : 0.08 + Math.random() * 0.22;
      asset.shock(mult);
      return {
        message: goUp
          ? `🍌 Quantum Banana observed — RIPE! +${((mult - 1) * 100).toFixed(0)}%`
          : `🍌 Quantum Banana observed — ROTTEN! -${((1 - mult) * 100).toFixed(0)}%`,
        severity: goUp ? 'good' : 'bad',
      };
    },
  },

  {
    id: 'rug_pull_scare',
    weight: 7,
    hint: '🪤 Rug pull threat detected',
    apply: (market) => {
      const asset = market.getAsset('rug_pull');
      if (!asset) return { message: '🪤 Rug pull target not found.', severity: 'neutral' };
      const crashMult = Math.max(0.04, 0.2 - asset.risk * 0.15);
      asset.hype *= 0.1;
      asset.shock(crashMult);
      return { message: `🪤 Rug Pull devs spotted on a yacht! Token -${((1 - crashMult) * 100).toFixed(0)}%... probably fine`, severity: 'bad' };
    },
  },

  {
    id: 'nft_frenzy',
    weight: 5,
    hint: '🖼️ NFT frenzy building',
    apply: (market) => {
      const asset = market.getAsset('nft_of_nft');
      if (!asset) return { message: '🖼️ NFT market silent.', severity: 'neutral' };
      const mult = 2.0 + asset.risk * 2.5;
      asset.hype = Math.min(1, asset.hype + 0.5);
      asset.shock(mult);
      return { message: `🖼️ NFT art frenzy! High-risk moonshot +${((mult - 1) * 100).toFixed(0)}%`, severity: 'good' };
    },
  },

  {
    id: 'diamond_festival',
    weight: 6,
    hint: '💎 Diamond convention coming',
    apply: (market) => {
      const asset = market.getAsset('diamond_hands');
      if (!asset) return { message: '💎 DiamondHands convention cancelled.', severity: 'neutral' };
      asset.hype = Math.min(1, asset.hype + 0.35);
      asset.shock(2.2);
      return { message: '💎 Annual DiamondHands convention! HODL culture peaks. +120%', severity: 'good' };
    },
  },

  // ── Neutral / chaotic ────────────────────────────────────────────────────

  {
    id: 'market_confusion',
    weight: 6,
    hint: '🤯 Chaos wave inbound',
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        const range = 0.4 + asset.risk * 1.6;
        asset.shock(0.3 + Math.random() * range);
      }
      return { message: '🤯 Market confusion! Everyone panics. Prices randomised by risk level.', severity: 'chaos' };
    },
  },

  {
    id: 'ai_breakthrough',
    weight: 6,
    hint: '🤖 Tech breakthrough signal',
    apply: (market) => {
      const asset = market.getAsset('ai_writes_ai');
      if (!asset) return { message: '🤖 AI too busy to respond.', severity: 'neutral' };
      const mult = 1.5 + asset.stability * 0.8;
      asset.hype = Math.min(1, asset.hype + 0.4);
      asset.shock(mult);
      return { message: `🤖 AI tech breakthrough! AI Writes AI surges +${((mult - 1) * 100).toFixed(0)}% — stability paid off`, severity: 'good' };
    },
  },

  {
    id: 'ai_scandal',
    weight: 8,
    hint: '💀 Tech scandal leaking',
    apply: (market) => {
      const asset = market.getAsset('ai_writes_ai');
      if (!asset) return { message: '🤖 AI scandal unconfirmed.', severity: 'neutral' };
      asset.hype *= 0.2;
      asset.shock(0.3);
      return { message: '💀 AI startup caught making everything up! AI Writes AI CRASHED -70%', severity: 'bad' };
    },
  },

  {
    id: 'elon_tweets',
    weight: 7,
    hint: '🐕 Social media spike incoming',
    apply: (market) => {
      const pump = Math.random() > 0.5;
      const mult = pump ? 2.0 + Math.random() * 0.5 : 0.3 + Math.random() * 0.25;
      market.getAsset('catcoin')?.shock(mult);
      market.getAsset('doge_cousin')?.shock(mult);
      if (pump) {
        const cat = market.getAsset('catcoin');
        if (cat) cat.hype = Math.min(1, cat.hype + 0.3);
      }
      const dir = pump ? 'MOONED 🌕' : 'DUMPED ☠️';
      return { message: `🔥 Elon tweets a dog emoji! Dog-adjacent coins ${dir}`, severity: pump ? 'good' : 'bad' };
    },
  },

  {
    id: 'hamster_wins',
    weight: 4,
    hint: '🐹 Hamster oracle active',
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        asset.shock(1.1 + Math.random() * 0.35);
      }
      return { message: '🐹 Prediction hamster wins another lottery! Market-wide boost!', severity: 'good' };
    },
  },

  {
    id: 'free_money',
    weight: 4,
    hint: '💸 Cash stimulus coming',
    apply: (_market, player) => {
      const base = Math.min(Math.max(200, player.cash * 0.04), 8000);
      const rand = Math.min(Math.max(1300, player.cash * 0.06), 15000) * Math.random();
      const amount = Math.floor(base + rand);
      player.cash += amount;
      return { message: `💸 Government stimulus drop! You received $${amount.toLocaleString()}!`, severity: 'good' };
    },
  },

  {
    id: 'tax_man',
    weight: 5,
    hint: '🧾 Tax audit imminent',
    apply: (_market, player) => {
      const loss = Math.floor(player.cash * (0.05 + Math.random() * 0.1));
      player.cash = Math.max(1, player.cash - loss);
      return { message: `🧾 The tax man cometh. You owe $${loss}. No refunds.`, severity: 'bad' };
    },
  },

  {
    id: 'pump_scheme',
    weight: 4,
    hint: '📣 Pump scheme targeting',
    apply: (market) => {
      const assets = market.getUnlockedAssets();
      if (assets.length === 0) return { message: '📣 Pump scheme fizzled.', severity: 'neutral' };
      const target = assets[Math.floor(Math.random() * assets.length)];
      const mult = 1.8 + target.risk * 2.0;
      target.hype = Math.min(1, target.hype + 0.4);
      target.shock(mult);
      return { message: `📣 Pump scheme targets ${target.emoji} ${target.name}! +${((mult - 1) * 100).toFixed(0)}% — sell before the dump`, severity: 'good' };
    },
  },

  {
    id: 'trend_boost',
    weight: 3,
    hint: '🏛️ Legislation in progress',
    apply: (market) => {
      for (const asset of market.getUnlockedAssets()) {
        asset.trendBoost += 0.015;
      }
      return { message: '🏛️ "Stonks Only Up" bill signed into law! All trends boosted!', severity: 'good' };
    },
  },
];

function weightedRandom(events: GameEvent[]): GameEvent {
  const total = events.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of events) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return events[events.length - 1];
}

export interface EventSystemState {
  nextEventInDays: number;
}

export class EventSystem {
  private log: EventLogEntry[] = [];
  private nextEventInDays: number;
  private nextEvent: GameEvent;
  private hintEvent: GameEvent;  // what bloomberg shows (may be inaccurate)
  private entryIdCounter = 0;
  private readonly maxLogEntries = 25;

  constructor() {
    this.nextEvent = weightedRandom(EVENTS);
    this.hintEvent = this.nextEvent;
    this.nextEventInDays = this.randomInterval();
  }

  private randomInterval(): number {
    return 2 + Math.floor(Math.random() * 4);  // 2–5 days
  }

  private schedule(hamsterOwned = false): void {
    this.nextEventInDays = this.randomInterval();
    this.nextEvent = weightedRandom(EVENTS);
    // Hamster: 75% accurate. Bloomberg alone: always shows a hint but may be wrong.
    const accurate = hamsterOwned ? Math.random() < 0.75 : Math.random() < 0.50;
    this.hintEvent = accurate ? this.nextEvent : weightedRandom(EVENTS);
  }

  // Called once per DAY by IdleSystem (not every second).
  dayTick(market: Market, player: Player, hamsterOwned = false): EventLogEntry | null {
    this.nextEventInDays--;
    if (this.nextEventInDays <= 0) {
      const result = this.nextEvent.apply(market, player);
      const entry = this.addEntry(result.message, result.severity);
      this.schedule(hamsterOwned);
      return entry;
    }
    return null;
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

  getNextEventInDays(): number {
    return this.nextEventInDays;
  }

  // Returns hint text for the bloomberg/hamster upgrade display.
  getHintText(): string {
    return this.hintEvent.hint;
  }

  saveState(): EventSystemState {
    return { nextEventInDays: this.nextEventInDays };
  }

  loadState(state: EventSystemState): void {
    this.nextEventInDays = state.nextEventInDays ?? this.randomInterval();
  }
}
