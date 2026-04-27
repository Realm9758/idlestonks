export type SocialPlatform = 'ChirpNet' | 'MemeBoard' | 'FinTok';
export type SocialPostType = 'hype' | 'fake_leak' | 'meme' | 'influencer_promo';
export type PostOutcome = 'flop' | 'normal' | 'strong' | 'viral';
export type CommentType = 'positive' | 'neutral' | 'negative';

export interface SocialComment {
  id:        string;
  text:      string;
  type:      CommentType;
  username:  string;
  avatar:    string;
  createdAt: number;
  effect?:   { hype?: number; heat?: number };
}

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  postType: SocialPostType;
  text: string;
  likes: number;
  reposts: number;
  comments: number;
  targetLikes: number;
  targetReposts: number;
  targetComments: number;
  hypeTotal: number;
  riskAdded: number;
  hypeApplied: number;
  crowdAmount: number;
  outcome: PostOutcome;
  age: number;
  settled: boolean;
  viralNotified: boolean;
  liveComments: SocialComment[];
  commentTimer: number; // seconds until next comment appears
}

export interface PlatformMeta {
  icon: string;
  label: string;
  color: string;
  baseLikes: number;
  baseReposts: number;
  baseComments: number;
  viralBonus: number;
}

export interface PostTypeMeta {
  icon: string;
  label: string;
  baseHype: number;
  baseRisk: number;
  viralBonus: number;
}

export const PLATFORM_META: Record<SocialPlatform, PlatformMeta> = {
  ChirpNet:  { icon: '🐦', label: 'ChirpNet',  color: '#00b4d8', baseLikes: 1200, baseReposts: 280, baseComments: 95,  viralBonus: 0.00 },
  MemeBoard: { icon: '😂', label: 'MemeBoard', color: '#ff7043', baseLikes: 800,  baseReposts: 450, baseComments: 180, viralBonus: 0.04 },
  FinTok:    { icon: '📈', label: 'FinTok',    color: '#e040fb', baseLikes: 2200, baseReposts: 380, baseComments: 140, viralBonus: 0.02 },
};

export const POST_TYPE_META: Record<SocialPostType, PostTypeMeta> = {
  hype:             { icon: '🚀', label: 'Hype Post',        baseHype: 7,  baseRisk: 4,  viralBonus: 0.02 },
  fake_leak:        { icon: '🕵️', label: 'Fake Leak',        baseHype: 13, baseRisk: 10, viralBonus: 0.04 },
  meme:             { icon: '😂', label: 'Meme Post',         baseHype: 4,  baseRisk: 3,  viralBonus: 0.08 },
  influencer_promo: { icon: '⭐', label: 'Influencer Promo',  baseHype: 16, baseRisk: 7,  viralBonus: 0.02 },
};

export const POST_TEXTS: Record<SocialPlatform, Record<SocialPostType, string[]>> = {
  ChirpNet: {
    hype: [
      'just loaded up on $MOONCOIN. wen lambo?? 🚀🚀🚀 #MOONCOIN #crypto',
      'MOONCOIN is absolutely printing rn. not financial advice but BUY 🚀',
      'my portfolio up 40% since adding MOONCOIN. this thing is different 📈',
    ],
    fake_leak: [
      "can't say how I know but MOONCOIN partnership announcement coming. load up 👀",
      'insider info: major exchange listing for $MOONCOIN dropping this week. NFA',
      '🔒 received a DM I probably shouldn\'t share... MOONCOIN is about to make headlines',
    ],
    meme: [
      'me before MOONCOIN: 😭 me after MOONCOIN: 🤑 it\'s literally that simple',
      'people sleeping on MOONCOIN rn 🤦 same people who slept on ETH at $10',
      'MOONCOIN bulls watching the chart rn 📈 WE ARE SO BACK',
    ],
    influencer_promo: [
      'excited to announce my partnership with MOONCOIN. one of the most promising projects I\'ve seen 🙏',
      'after weeks of research, I\'m officially backing MOONCOIN. full breakdown soon ⭐',
      '@MOONCOIN reached out and honestly? the team is legit. dyor but I\'m bullish 🌑',
    ],
  },
  MemeBoard: {
    hype: [
      'Why I put 80% of my portfolio in MOONCOIN [DD] 🚀 — seriously undervalued rn',
      'MOONCOIN technical analysis: forming a massive bull flag. this is it boys',
      'Unpopular opinion: MOONCOIN is the most asymmetric trade of the year and nobody sees it',
    ],
    fake_leak: [
      '[NFA] heard from someone at the company that big things are coming for MOONCOIN',
      'My cousin works at the exchange. MOONCOIN listing is happening. Can\'t say when',
      "Can't share the source but: MOONCOIN x [MAJOR BRAND] collab is real. saw the contract.",
    ],
    meme: [
      'MOONCOIN holders rn: [galaxy brain] | Everyone else: what is going on',
      'Bro bought the MOONCOIN top: [sad wojak] | Me who bought the bottom: [chad]',
      'The cycle: sleep on MOONCOIN → watch it 10x → cry → repeat',
    ],
    influencer_promo: [
      "TOP ANALYST: 'MOONCOIN is the most undervalued asset in my career' — full thread inside",
      'Partnered with @FinanceGuru to break down why MOONCOIN is different. thread below 👇',
      'Got early access to MOONCOIN\'s roadmap. sharing full analysis as community member',
    ],
  },
  FinTok: {
    hype: [
      'I turned $100 into $4,200 with MOONCOIN. here\'s how 👇 #MOONCOIN #crypto',
      'MOONCOIN is doing what Bitcoin did in 2013. you need to see this chart 📊',
      'POV: you ignored MOONCOIN at $0.01 🤡 #cryptotok',
    ],
    fake_leak: [
      'BREAKING: MOONCOIN major exchange listing coming VERY SOON. my source is solid 🔥',
      'I work adjacent to the MOONCOIN team. next week\'s announcement will be insane 👀',
      "Get in before Tuesday. that's all I'll say about MOONCOIN. 🤫",
    ],
    meme: [
      'POV: you bought MOONCOIN before the pump 🤑 #mooncoin',
      'Me explaining to my family why I put everything in MOONCOIN 😅 #relatable',
      'MOONCOIN chart going VERTICAL 📈📈 we are NOT missing this #cryptotok',
    ],
    influencer_promo: [
      'Collab with @TradingLegend — MOONCOIN breakdown that will CHANGE how you invest 🧠',
      'My most requested video: why I\'m ALL IN on MOONCOIN ft. @CryptoKing ⭐',
      'Partnered with MOONCOIN to bring you EXCLUSIVE alpha. watch now 🔗',
    ],
  },
};

const USERS: Record<CommentType, Array<{ u: string; a: string }>> = {
  positive: [
    { u: 'moonboi_99',      a: '🚀' }, { u: 'diamond_handz',  a: '💎' },
    { u: 'CryptoKingXL',   a: '👑' }, { u: 'BullishBruno',   a: '🐂' },
    { u: 'apeInGang',      a: '🦍' }, { u: 'tendies_szn',    a: '🍗' },
    { u: 'wagmi_always',   a: '🌙' }, { u: 'satoshi_fan420', a: '💰' },
    { u: 'ngmi_never',     a: '📈' }, { u: 'hodl_or_die',    a: '🔥' },
  ],
  neutral: [
    { u: 'MarketWatcher',   a: '👀' }, { u: 'CryptoAnalyst',  a: '📊' },
    { u: 'DegenDave',       a: '🎰' }, { u: 'on_the_fence',   a: '🤔' },
    { u: 'just_watching',   a: '🔭' }, { u: 'hmm_maybe',      a: '💭' },
    { u: 'normie_investor', a: '🙂' }, { u: 'slow_steady',    a: '🐢' },
  ],
  negative: [
    { u: 'FraudAlert_Bot',  a: '🚨' }, { u: 'rug_detector',   a: '🔍' },
    { u: 'ngmi_spotter',    a: '📉' }, { u: 'SEC_watcher',    a: '🏛️' },
    { u: 'skeptic_sam',     a: '😒' }, { u: 'exit_now_pls',   a: '🚪' },
    { u: 'this_is_fine',    a: '🔥' }, { u: 'ponzi_hunter',   a: '🕵️' },
    { u: 'bearish_af',      a: '🐻' }, { u: 'nfa_but_ngmi',   a: '❌' },
  ],
};

export const COMMENT_POOL: Record<CommentType, string[]> = {
  positive: [
    // hype
    "this is literally going to 100x 🚀",
    "getting in before it moons 📈",
    "WAGMI 🙌 see you at the top",
    "LFG LFG LFG 🔥🔥🔥",
    "🚀🚀🚀",
    // conviction
    "went all in just now. zero regrets",
    "diamond hands only 💎 not selling until $1",
    "in since the bottom, feeling extremely blessed",
    "added more on the last dip, comfy bag",
    "not selling a single coin. ever.",
    // social proof
    "told my whole group chat, everyone's in now",
    "my brother called me crazy. who's laughing now 😂",
    "sent this to the family WhatsApp group lmao",
    "three of my friends just bought in. we're all set",
    // analysis cosplay
    "chart is forming a massive bull flag no cap",
    "volume confirmed the breakout. textbook setup 📊",
    "never seen a setup this clean in 4 years of trading",
    "RSI looking healthy, MACD about to cross bullish",
    // short
    "easiest buy of my life",
    "this team is different",
    "early movers always win 💰",
    "generational wealth incoming fr",
    "THIS. IS. THE. ONE.",
    "portfolio finally making sense",
    "price discovery mode activated 📈",
    "aping in rn, no hesitation whatsoever",
    "biggest play of the year, not debatable",
  ],
  neutral: [
    // watching/waiting
    "keeping an eye on this one",
    "watching the volume before I commit",
    "might dip my toes in with a small bag",
    "gonna wait for the next dip honestly",
    "set a price alert, we'll see",
    // questions
    "what's the market cap on this?",
    "anyone done proper DD?",
    "what's the actual utility here?",
    "who's on the team? can't find anything",
    "is there a whitepaper?",
    "what exchange is this on?",
    // mildly interested
    "interesting price action tbh",
    "been hearing about this all week",
    "first time seeing this project",
    "seems like there's real momentum building",
    "could go either way from here",
    "chart looks decent but nothing crazy",
    "not sure yet, doing my own research",
    "curious how this plays out",
    "this one's on my watchlist now",
    "would need to see more volume",
  ],
  negative: [
    // rug alerts
    "this screams rug pull 🚨 be careful",
    "classic pump and dump, seen it a thousand times",
    "whale wallets dumping right now, don't fall for it",
    "get out while you still can 🚪",
    "I give this 48 hours before it crashes",
    // regulatory
    "SEC is going to have a field day with this",
    "market manipulation is a federal crime btw",
    "my friend at the financial watchdog is curious",
    "reported to the authorities. you're welcome.",
    "this is literally textbook securities fraud",
    // skepticism
    "nobody's asking who is actually behind this",
    "anonymous team is always a red flag 🚩",
    "zero fundamentals, 100% manufactured hype",
    "these comments are so obviously fake lmao",
    "the dev wallet holds 80% of supply fyi",
    "no whitepaper, no team page, no product 🚩",
    "liquidity is paper thin, one sell and it dumps",
    // resigned / sarcastic
    "rip to everyone who bought the top",
    "can't believe people fall for this in 2024",
    "oh wow a totally organic price pump, very real",
    "exit liquidity. that's all you are to them.",
    "NGMI if you're still holding after this 📉",
    "I've seen this exact playbook 6 times this year",
    "the founders are already booking flights rn 💀",
  ],
};

export function pickComment(heat: number): SocialComment {
  let posW: number, neuW: number, negW: number;
  if (heat < 30)      { posW = 0.70; neuW = 0.20; negW = 0.10; }
  else if (heat < 60) { posW = 0.40; neuW = 0.30; negW = 0.30; }
  else if (heat < 85) { posW = 0.20; neuW = 0.25; negW = 0.55; }
  else                { posW = 0.05; neuW = 0.10; negW = 0.85; }

  const roll = Math.random();
  let type: CommentType;
  if (roll < posW) type = 'positive';
  else if (roll < posW + neuW) type = 'neutral';
  else type = 'negative';

  const pool     = COMMENT_POOL[type];
  const userPool = USERS[type];
  const text     = pool[Math.floor(Math.random() * pool.length)];
  const user     = userPool[Math.floor(Math.random() * userPool.length)];
  const effect   = type === 'positive' ? { hype: 1 }
                 : type === 'negative' ? { heat: 1 }
                 : undefined;

  return {
    id:        `c_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
    text,
    type,
    username:  user.u,
    avatar:    user.a,
    createdAt: Date.now(),
    effect,
  };
}

export function getPostImpactPreview(
  platform: SocialPlatform,
  postType: SocialPostType,
): { hype: number; risk: number; viralChance: number } {
  const pm  = PLATFORM_META[platform];
  const ptm = POST_TYPE_META[postType];
  return {
    hype:        ptm.baseHype,
    risk:        ptm.baseRisk,
    viralChance: Math.round((0.08 + pm.viralBonus + ptm.viralBonus) * 100),
  };
}
