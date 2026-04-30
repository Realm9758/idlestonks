import type { HfInvestorTemplate, HfCallMods } from '../systems/HedgeFundSystem.ts';

export interface HfCallbacks {
  showToast:    (msg: string, type: 'success' | 'error' | 'info' | 'chaos') => void;
  addCash:      (amount: number) => void;
  deductCash:   (amount: number) => void;
  openHfTab:    () => void;
  onCallStart?: () => void;
  onCallEnd?:   () => void;
}

export interface ChatMsg { side: 'left' | 'right'; text: string; }

export const UNLOCK_CHAT: ChatMsg[] = [
  { side: 'left',  text: "you've made some serious money… 👀" },
  { side: 'left',  text: "why not go bigger?" },
  { side: 'left',  text: "a fund. we manage other people's capital." },
  { side: 'right', text: "how does that work" },
  { side: 'left',  text: "you trade. we charge fees — 2% to manage, 20% of profits." },
  { side: 'left',  text: "investors give us capital. we grow it. they're happy." },
  { side: 'left',  text: "but if you lose their money… they WILL come for you." },
  { side: 'right', text: "sounds like a lot of pressure" },
  { side: 'left',  text: "it is. that's the point. 😈" },
  { side: 'left',  text: "ready to play at the next level?" },
];

export const TUTORIAL_CHAT: ChatMsg[] = [
  { side: 'left',  text: "YourFund Capital is live. 💼 let me walk you through this." },
  { side: 'left',  text: "CAPITAL: that's investor money. you don't own it — they do. your job: grow it." },
  { side: 'right', text: "what's my cut?" },
  { side: 'left',  text: "FEES. 2% per year just to manage. 20% of any new profit above previous highs." },
  { side: 'left',  text: "PERFORMANCE is the 7-day average return on their capital. that's what investors watch." },
  { side: 'left',  text: "positive returns → satisfaction goes up. negative too long → they withdraw." },
  { side: 'right', text: "how do I keep them from leaving?" },
  { side: 'left',  text: "STRATEGY MODE. pick it at the top of the fund card." },
  { side: 'left',  text: "conservative = softer swings. cautious investors stay calm. aggressives get bored." },
  { side: 'left',  text: "aggressive = amplified returns AND losses. aggressives thrive. conservatives panic." },
  { side: 'left',  text: "match your strategy to who you have. watch each investor's satisfaction bar." },
  { side: 'left',  text: "REPUTATION matters too. above 70 — investors call you. below 40 — expect withdrawals." },
  { side: 'right', text: "ok. who do I call first?" },
  { side: 'left',  text: "Tyler. easiest to close. see Recruit below. 👇" },
];

export interface InvestorLines {
  opening_out: string;
  opening_in:  string;
  r1_data:     string;
  r1_vision:   string;
  r1_social:   string;
  r1_safety:   string;
  r2_big:      string;
  r2_small:    string;
  r2_terms:    string;
  accepted:    string;
  declined:    string;
  angry:       string;
}

export const INVESTOR_LINES: Record<string, InvestorLines> = {
  pension_pete: {
    opening_out: "Who is this? How did you get this number?",
    opening_in:  "I've been looking at funds. A colleague mentioned your name.",
    r1_data:     "Hmm. The numbers look… acceptable. Tell me more about drawdowns.",
    r1_vision:   "Growth stories don't pay my pension. I need stability.",
    r1_social:   "Who exactly? Names, please. I'll need to verify.",
    r1_safety:   "Now you're speaking my language. Capital preservation — that's what I care about.",
    r2_big:      "I don't 'go big'. I never have. That's why I still have money.",
    r2_small:    "A small test position. That's sensible. I can work with that.",
    r2_terms:    "Performance-linked fees? I respect that. You only win when I win.",
    accepted:    "Alright. I'll wire the funds. Don't make me regret this.",
    declined:    "I'm not ready to commit. Perhaps another time.",
    angry:       "This feels like a sales job. I don't like it. Don't call again.",
  },
  cfo_karen: {
    opening_out: "My assistant said this was important. You have 90 seconds.",
    opening_in:  "I've had three people mention your fund this week. I'm curious.",
    r1_data:     "12.4% last month means nothing without context. What's your max drawdown?",
    r1_vision:   "Vision is fine. But I've sat across from visionaries who lost everything.",
    r1_social:   "I don't care who else is in. I care about the strategy.",
    r1_safety:   "I'm not looking for safety. I'm looking for alpha.",
    r2_big:      "If I go in, I go in properly. Half-measures are for half-believers.",
    r2_small:    "Fine. A test position. But I'll be watching every basis point.",
    r2_terms:    "I like this structure. Skin in the game matters.",
    accepted:    "Committing now. Don't waste my capital.",
    declined:    "Not what I'm looking for. Good luck.",
    angry:       "I feel like I'm being sold to. That's a dealbreaker.",
  },
  tyler: {
    opening_out: "Yo! Who dis? 😄",
    opening_in:  "bro I literally just texted you lmao did you get my DM?",
    r1_data:     "+12.4%?? that's kinda mid but hey let's see where it goes",
    r1_vision:   "OKAY I'M SOLD the vision is everything fr fr 🚀",
    r1_social:   "wait who else is in?? I need to know if the right people are in",
    r1_safety:   "nah nah safe isn't the vibe — I want UPSIDE bro",
    r2_big:      "I'm literally going all in I don't even care rn 😭",
    r2_small:    "small bag to start? bro no I want the full thing",
    r2_terms:    "okay performance-linked makes sense, I fw that",
    accepted:    "YOOOO LET'S GOOO 🚀 money is on the way rn",
    declined:    "nah it's not the right time bro, hit me next month",
    angry:       "bro wait… is this sus? this feels sus. I'm out.",
  },
  margaret: {
    opening_out: "Hello? I don't normally answer unknown numbers.",
    opening_in:  "My financial advisor suggested I speak with you. I'm listening.",
    r1_data:     "These figures are… moderately reassuring. What about volatility?",
    r1_vision:   "I've heard too many visions. I prefer track records.",
    r1_social:   "I appreciate a personal recommendation. That means something.",
    r1_safety:   "That's exactly what I need to hear. My late husband always said, 'protect first'.",
    r2_big:      "That's quite a lot of money. I'd need time to think.",
    r2_small:    "Starting small is wise. My accountant will be pleased.",
    r2_terms:    "If I only pay when you perform, that feels very fair.",
    accepted:    "Very well. I'll speak to my bank tomorrow. Thank you for your patience.",
    declined:    "I appreciate the time, but I'm not ready for this.",
    angry:       "This feels pushy. I don't respond well to pressure. Goodbye.",
  },
  the_whale: {
    opening_out: "Make it fast. I have a board meeting in ten minutes.",
    opening_in:  "I don't call funds. I call people. You came recommended.",
    r1_data:     "Numbers can say anything. What's your edge when the market tanks?",
    r1_vision:   "I've funded three unicorns. Vision without execution is poetry.",
    r1_social:   "Names mean nothing to me. Show me the returns.",
    r1_safety:   "I'm not looking to protect capital. I'm looking to grow it — significantly.",
    r2_big:      "If I'm in, I own a meaningful position. Hundreds. Nothing less.",
    r2_small:    "I don't do small. Don't insult me.",
    r2_terms:    "Aligned incentives. Smart. I respect that structure.",
    accepted:    "Wire instructions to my office. Don't make headlines.",
    declined:    "Not the right fit. Don't take it personally.",
    angry:       "You're wasting my time. I don't forget that.",
  },
};

export interface ConvOption {
  id:               string;
  label:            string;
  tag:              string;
  playerText:       string;
  trustBonus:       number;
  amountMult:       number;
  reputationEffect: number;
  reactionKey:      keyof InvestorLines;
}

export const HF_ROUND_1: ConvOption[] = [
  {
    id: 'data', label: '📊 Show the data', tag: 'ANALYTICAL',
    playerText: "Our fund returned +12.4% last month with a sharpe of 1.8. Risk-adjusted, it's hard to beat.",
    trustBonus: 0.15, amountMult: 1.00, reputationEffect: 1, reactionKey: 'r1_data',
  },
  {
    id: 'vision', label: '🚀 The vision', tag: 'HIGH UPSIDE',
    playerText: "We're not just managing money — we're building a legacy. This is a fund positioned for the decade ahead.",
    trustBonus: 0.04, amountMult: 1.40, reputationEffect: 0, reactionKey: 'r1_vision',
  },
  {
    id: 'social', label: '🤝 Name-drop', tag: 'TRUST BUILDER',
    playerText: "Three CFOs in the city already trust us with their capital. I thought you should be next.",
    trustBonus: 0.22, amountMult: 1.00, reputationEffect: 2, reactionKey: 'r1_social',
  },
  {
    id: 'safety', label: '🛡 Capital protection', tag: 'CONSERVATIVE',
    playerText: "Our risk-first philosophy protects capital first — growth is a byproduct of discipline.",
    trustBonus: 0.18, amountMult: 0.70, reputationEffect: 1, reactionKey: 'r1_safety',
  },
];

export const HF_ROUND_2: ConvOption[] = [
  {
    id: 'big', label: '💰 Full commitment', tag: '+3 RISK',
    playerText: "To see real returns, you need real exposure. What's your full commitment number?",
    trustBonus: 0.00, amountMult: 1.45, reputationEffect: 0, reactionKey: 'r2_big',
  },
  {
    id: 'small', label: '🌱 Start small', tag: 'SAFE',
    playerText: "Start with a small position — verify the returns yourself. You can scale up once you're confident.",
    trustBonus: 0.10, amountMult: 0.65, reputationEffect: 1, reactionKey: 'r2_small',
  },
  {
    id: 'terms', label: '📈 Performance-linked', tag: 'FAIR DEAL',
    playerText: "We only take our performance fee when you profit. Your interests and ours are completely aligned.",
    trustBonus: 0.12, amountMult: 1.10, reputationEffect: 2, reactionKey: 'r2_terms',
  },
];

export interface HfCallState {
  template:  HfInvestorTemplate;
  isInbound: boolean;
  accMods:   HfCallMods;
  round:     1 | 2 | 'resolving' | 'done';
}
