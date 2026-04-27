export type SocialPlatform = 'ChirpNet' | 'MemeBoard' | 'FinTok';
export type SocialPostType = 'hype' | 'fake_leak' | 'meme' | 'influencer_promo';
export type PostOutcome = 'flop' | 'normal' | 'strong' | 'viral';

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

export function getPostImpactPreview(
  platform: SocialPlatform,
  postType: SocialPostType,
): { hype: number; risk: number; viralChance: number } {
  const pm  = PLATFORM_META[platform];
  const ptm = POST_TYPE_META[postType];
  return {
    hype:       ptm.baseHype,
    risk:       ptm.baseRisk,
    viralChance: Math.round((0.08 + pm.viralBonus + ptm.viralBonus) * 100),
  };
}
