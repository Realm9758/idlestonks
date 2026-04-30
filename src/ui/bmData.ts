import type { BmCustomer, CallMods } from '../systems/BlackMarketSystem.ts';

export interface BmCallbacks {
  showToast:    (msg: string, type: 'success' | 'error' | 'info' | 'chaos') => void;
  addCash:      (amount: number) => void;
  deductCash:   (amount: number) => boolean;
  openBmTab:    () => void;
  onCallStart?: () => void;
  onCallEnd?:   () => void;
}

export interface ChatMsg { side: 'left' | 'right'; text: string; }

export const UNLOCK_CHAT: ChatMsg[] = [
  { side: 'left',  text: 'bro… have you heard about the black market thing? 👀' },
  { side: 'left',  text: 'you can make BANK. like. serious money.' },
  { side: 'right', text: 'what kind of money' },
  { side: 'left',  text: "enough to make your whole portfolio look like pocket change 😏" },
  { side: 'left',  text: 'you set up a fake coin. hype it up. get people to invest.' },
  { side: 'left',  text: 'then you pull the rug. take everything.' },
  { side: 'right', text: 'that sounds incredibly illegal' },
  { side: 'left',  text: 'lmaooo look who just figured that out 💀' },
  { side: 'left',  text: "you're good enough now. i unlocked it for you." },
  { side: 'left',  text: "don't tell anyone. and don't get caught. 🫡" },
];

export const TUTORIAL_CHAT: ChatMsg[] = [
  { side: 'left',  text: "ok so you're in 😈" },
  { side: 'left',  text: "see those targets on the right? those are your marks." },
  { side: 'left',  text: "call them. have a convo. pitch MoonCoin. get them to invest." },
  { side: 'left',  text: "what you say matters — FOMO works on some, flattery on others." },
  { side: 'left',  text: "the more they put in, the higher the price climbs." },
  { side: 'left',  text: "once there's enough in the pool..." },
  { side: 'left',  text: "💀 RUG PULL. you take 70%. they get nothing." },
  { side: 'left',  text: "BUT — the SEC watches. your heat level rises with every call." },
  { side: 'left',  text: "aggressive pitches spike heat fast. be smart about it." },
  { side: 'right', text: "understood. let's eat. 🍽️" },
  { side: 'left',  text: "that's what i like to hear. gl hf 🫡" },
];

export interface CustomerLines {
  opening:      string;
  r1_soft:      string;
  r1_fomo:      string;
  r1_exclusive: string;
  r2_bigask:    string;
  r2_smallask:  string;
  r2_peer:      string;
  accepted:     string;
  rejected:     string;
  suspicious:   string;
}

export const CUSTOMER_LINES: Record<string, CustomerLines> = {
  whale: {
    opening:      "Yes? Who gave you this number?",
    r1_soft:      "Get to the point. I'm a busy man.",
    r1_fomo:      "I've heard that pitch before. What makes this one different?",
    r1_exclusive: "I appreciate being called first. Continue.",
    r2_bigask:    "If I'm in, I'm in for real. Send the details.",
    r2_smallask:  "I don't do small amounts. I'll decide the size myself.",
    r2_peer:      "I don't follow the crowd. Give me the numbers.",
    accepted:     "You've got your money. Don't make me regret it.",
    rejected:     "Not convinced. Don't waste my time again.",
    suspicious:   "Something's off here. I'm running a check on you.",
  },
  carol: {
    opening:      "Hello! Oh gosh, I love getting phone calls! Who is this?",
    r1_soft:      "That sounds lovely! Oh, tell me more!",
    r1_fomo:      "Oh my goodness — a limited window?! I simply cannot miss this!",
    r1_exclusive: "I'm on a special list?! How wonderful! I feel so VIP!",
    r2_bigask:    "You know what — life is too short! Let's do it!",
    r2_smallask:  "Just a little to start? That sounds very sensible of you!",
    r2_peer:      "If everyone's doing it, it must be good! Count me in!",
    accepted:     "How exciting!! I'm going to tell everyone at book club!",
    rejected:     "Oh, I think I'll sit this one out. But thank you, dear!",
    suspicious:   "Actually... my nephew told me about scams like this. Hmm.",
  },
  boomer: {
    opening:      "Hello? Who is this exactly? How did you get this number?",
    r1_soft:      "Well... I suppose I could hear you out.",
    r1_fomo:      "I don't like being rushed into things. I need time to think.",
    r1_exclusive: "A personal invitation? That's... rather flattering.",
    r2_bigask:    "That's quite a sum. You sure this is safe?",
    r2_smallask:  "A small amount... yes, that sounds more manageable.",
    r2_peer:      "Well if others are doing it, maybe there's something to it...",
    accepted:     "Alright then. But I'm watching this very closely.",
    rejected:     "I appreciate the call, but it's really not for me.",
    suspicious:   "This is starting to sound like one of those telephone scams.",
  },
  degen: {
    opening:      "yooo who's this lmaooo",
    r1_soft:      "aight bet tell me more 👀",
    r1_fomo:      "BRO NO WAY 🚀🚀 WHAT DO I DO TELL ME WHAT TO DO",
    r1_exclusive: "wait im in the special group?? lowkey feel blessed rn fr",
    r2_bigask:    "I'm literally going all in rn I don't even care anymore 💀",
    r2_smallask:  "nah nah I want to put in MORE not less bro",
    r2_peer:      "if everyone's in then I NEED to be in rn can't be the one who missed",
    accepted:     "YOOOO LESSSGOOO 🚀🚀🚀 moon mission activated fr fr",
    rejected:     "bro I'm actually broke rn 💀 next time tho for real",
    suspicious:   "wait... hold on... is this a rug?? bro is this a rug??",
  },
  analyst: {
    opening:      "Who is this? I don't recognise this number.",
    r1_soft:      "An 'opportunity'. How vague. What are the fundamentals?",
    r1_fomo:      "Classic artificial urgency. That's a significant red flag.",
    r1_exclusive: "Flattery is a manipulation tactic. Give me data, not compliments.",
    r2_bigask:    "You want me to bet big on unverified information. Hard pass.",
    r2_smallask:  "A small position... the downside is at least defined.",
    r2_peer:      "Social proof is a logical fallacy. Not a sound thesis.",
    accepted:     "I've run a quick analysis. The risk-reward is... acceptable.",
    rejected:     "I'm not satisfied with the fundamentals. Goodbye.",
    suspicious:   "I'm noting this call in my fraud log. Goodbye.",
  },
};

export interface ConvOption {
  id:           string;
  label:        string;
  tag:          string;
  playerText:   string;
  trustBonus:   number;
  amountMult:   number;
  extraHeat:    number;
  reactionKey:  keyof CustomerLines;
}

export const ROUND_1: ConvOption[] = [
  {
    id: 'friendly', label: '🤝 Casual tip', tag: 'LOW RISK',
    playerText: "Hey, I've got something for you — a coin called MoonCoin is quietly going parabolic. Worth a look.",
    trustBonus: 0.10, amountMult: 1.0, extraHeat: 0, reactionKey: 'r1_soft',
  },
  {
    id: 'fomo', label: '🔥 FOMO pitch', tag: 'HIGH PRESSURE',
    playerText: "You need to act NOW. MoonCoin has a major announcement in 24 hours. Insiders are loading up as we speak.",
    trustBonus: 0.02, amountMult: 1.45, extraHeat: 5, reactionKey: 'r1_fomo',
  },
  {
    id: 'exclusive', label: '⭐ Exclusive invite', tag: 'HIGH TRUST',
    playerText: "I only call my top people with this. You've earned it — early access to MoonCoin before the public.",
    trustBonus: 0.18, amountMult: 1.2, extraHeat: 1, reactionKey: 'r1_exclusive',
  },
  {
    id: 'soft', label: '🌿 Low pressure', tag: 'SAFE',
    playerText: "No rush at all — just thought you might want to hear about MoonCoin. Totally your call.",
    trustBonus: 0.06, amountMult: 0.75, extraHeat: 0, reactionKey: 'r1_soft',
  },
];

export const ROUND_2: ConvOption[] = [
  {
    id: 'bigask', label: '💰 Go all in', tag: '+6 HEAT',
    playerText: "Be honest with yourself — put in what you can. This is the one that changes everything.",
    trustBonus: 0.0, amountMult: 1.5, extraHeat: 6, reactionKey: 'r2_bigask',
  },
  {
    id: 'smallask', label: '🌱 Start small', tag: 'SAFE',
    playerText: "Even just a little to start. You can always add more once you see it move.",
    trustBonus: 0.08, amountMult: 0.9, extraHeat: 0, reactionKey: 'r2_smallask',
  },
  {
    id: 'peer', label: '👥 Peer pressure', tag: 'MEDIUM PRESSURE',
    playerText: "Look — everyone in the group is already in. You don't want to be the one who watched from the sidelines.",
    trustBonus: -0.02, amountMult: 1.3, extraHeat: 4, reactionKey: 'r2_peer',
  },
];

export interface CallState {
  customer:   BmCustomer;
  accMods:    CallMods;
  round:      1 | 2 | 'resolving' | 'done';
  confidence: number;
}
