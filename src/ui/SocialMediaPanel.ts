import type { BlackMarketSystem } from '../systems/BlackMarketSystem.ts';
import type { SocialPost, SocialPlatform, SocialPostType } from '../systems/SocialPost.ts';
import { PostComposer } from './PostComposer.ts';
import { SocialFeed } from './SocialFeed.ts';
import { screenFlash, screenShake } from './animations.ts';

export interface SocialMediaCallbacks {
  showToast:    (msg: string, type: 'success' | 'error' | 'info' | 'chaos') => void;
  addCash:      (amount: number) => void;
  onViralPost?: (post: SocialPost) => void;
}

export class SocialMediaPanel {
  private sys:      BlackMarketSystem;
  private cb:       SocialMediaCallbacks;
  private composer: PostComposer | null = null;
  private feed:     SocialFeed   | null = null;

  constructor(sys: BlackMarketSystem, cb: SocialMediaCallbacks) {
    this.sys = sys;
    this.cb  = cb;
  }

  mount(container: HTMLElement): void {
    container.innerHTML = this._buildHtml();

    this.composer = new PostComposer({
      onPublish:      (p, t, text) => this._handlePublish(p, t, text),
      canPost:        ()            => this.sys.canPost(),
      getCooldown:    ()            => this.sys.postCooldownSecs,
      getPostsToday:  ()            => this.sys.postsToday,
      maxPostsPerDay: this.sys.MAX_POSTS_PER_DAY,
    });
    this.composer.mount(document.getElementById('sm-composer-mount')!);

    this.feed = new SocialFeed({ onViralPost: (p) => this._handleViral(p) });
    this.feed.mount(document.getElementById('sm-feed-mount')!);

    document.getElementById('sm-rug-pull-btn')?.addEventListener('click', () => this._handleRugPull());

    this.updateDisplay();
  }

  updateDisplay(): void {
    const s = this.sys;
    const g = (id: string) => document.getElementById(id);

    // ── stock card ──────────────────────────────────────────────────────────
    const priceEl = g('sm-coin-price');
    if (priceEl) {
      const p = s.stock.price;
      priceEl.textContent = `$${p < 1 ? p.toFixed(4) : p.toFixed(2)}`;
    }

    const hypeFill = g('sm-hype-fill') as HTMLElement | null;
    if (hypeFill) hypeFill.style.width = `${(s.stock.hype * 100).toFixed(0)}%`;

    const hypePct = g('sm-hype-pct');
    if (hypePct) hypePct.textContent = `${(s.stock.hype * 100).toFixed(0)}%`;

    const invEl = g('sm-total-invested');
    if (invEl) invEl.textContent = `$${Math.round(s.stock.totalInvested).toLocaleString()}`;

    const crowdTotal = s.posts.reduce((sum, p) => sum + (p.settled ? p.crowdAmount : 0), 0);
    const crowdEl    = g('sm-crowd-amount');
    if (crowdEl) crowdEl.textContent = `$${Math.round(crowdTotal).toLocaleString()}`;

    // stage badge
    const stage      = s.getStage();
    const stageBadge = g('sm-stage-badge');
    if (stageBadge) {
      stageBadge.textContent = stage.toUpperCase();
      stageBadge.className   = `sm-stage-badge sm-stage-${stage}`;
    }

    // ── right panel ─────────────────────────────────────────────────────────
    const hypeMeter = g('sm-hype-meter') as HTMLElement | null;
    if (hypeMeter) hypeMeter.style.height = `${(s.stock.hype * 100).toFixed(0)}%`;
    const hypeVal = g('sm-hype-val');
    if (hypeVal) hypeVal.textContent = `${(s.stock.hype * 100).toFixed(0)}%`;

    const riskMeter = g('sm-risk-meter') as HTMLElement | null;
    if (riskMeter) {
      riskMeter.style.height = `${s.riskLevel}%`;
      riskMeter.className    = `sm-meter-fill bm-risk-fill ${
        s.riskLevel < 35 ? 'risk-low' : s.riskLevel < 65 ? 'risk-mid' : 'risk-high'
      }`;
    }
    const riskVal = g('sm-risk-val');
    if (riskVal) riskVal.textContent = `${Math.round(s.riskLevel)}%`;
    g('sm-risk-warn')?.classList.toggle('hidden', s.riskLevel < 65);

    const postsTodayEl = g('sm-posts-today');
    if (postsTodayEl) postsTodayEl.textContent = `${s.postsToday} / ${s.MAX_POSTS_PER_DAY}`;

    const cdEl = g('sm-post-cd');
    if (cdEl) cdEl.textContent = s.postCooldownSecs > 0 ? `${s.postCooldownSecs}s` : '—';

    const profitEl = g('sm-total-profit');
    if (profitEl) profitEl.textContent = `$${s.totalProfit.toLocaleString()}`;

    const rugEst = Math.round(s.stock.totalInvested * 0.70);
    const rugEstEl = g('sm-rug-estimate');
    if (rugEstEl) rugEstEl.textContent = `$${rugEst.toLocaleString()}`;

    const rugBtn = g('sm-rug-pull-btn') as HTMLButtonElement | null;
    if (rugBtn) rugBtn.disabled = !s.canRugPull();

    g('sm-suspended-notice')?.classList.toggle('hidden', !s.isLocked);
    const lockDays = g('sm-lock-days');
    if (lockDays && s.isLocked) lockDays.textContent = `${s.lockDaysRemaining} day(s) remaining`;

    this.composer?.updateDisplay(s.postCooldownSecs, s.postsToday, s.canPost());
    this.feed?.update(s.posts);
  }

  // ── private ──────────────────────────────────────────────────────────────

  private _handlePublish(platform: SocialPlatform, postType: SocialPostType, text: string): void {
    const post = this.sys.publishPost(platform, postType, text);
    if (!post) { this.cb.showToast('Cannot post right now.', 'error'); return; }

    const typeLabel: Record<SocialPostType, string> = {
      hype: 'Hype post', fake_leak: 'Fake leak',
      meme: 'Meme post', influencer_promo: 'Influencer promo',
    };
    this.cb.showToast(`📤 ${typeLabel[postType]} posted to ${platform}!`, 'info');
    this.updateDisplay();
  }

  private _handleViral(post: SocialPost): void {
    this.cb.showToast(`🔥 GOING VIRAL on ${post.platform}! Hype incoming!`, 'chaos');
    screenFlash('good');
    this.cb.onViralPost?.(post);

    const card = document.querySelector<HTMLElement>(`[data-post-id="${post.id}"]`);
    if (card) card.style.animation = 'sm-viral-pulse 0.6s ease-out';
  }

  private _handleRugPull(): void {
    if (!this.sys.canRugPull()) return;
    const { profit, totalStolen } = this.sys.rugPull();
    this.cb.addCash(profit);
    this.cb.showToast(
      `💀 RUG PULLED! $${totalStolen.toLocaleString()} stolen — you pocket $${profit.toLocaleString()}`,
      'chaos',
    );
    screenShake('heavy');
    screenFlash('bad');
    this.updateDisplay();
  }

  private _buildHtml(): string {
    return `
<div class="sm-layout">

  <!-- LEFT: stock overview -->
  <div class="sm-stock-col">
    <div class="sm-col-label">🌑 OPERATION</div>
    <div class="sm-coin-card">
      <div class="sm-coin-name">🌑 MoonCoin</div>
      <div class="sm-coin-tag-row">
        <span class="bm-coin-tag">SYNTHETIC</span>
        <span class="sm-stage-badge sm-stage-quiet" id="sm-stage-badge">QUIET</span>
      </div>
      <div class="sm-coin-price" id="sm-coin-price">$0.0100</div>
      <div class="sm-hype-section">
        <div class="sm-hype-label-row">
          <span class="sm-label">HYPE</span>
          <span class="sm-hype-pct" id="sm-hype-pct">5%</span>
        </div>
        <div class="sm-hype-track">
          <div class="sm-hype-fill" id="sm-hype-fill" style="width:5%"></div>
        </div>
      </div>
      <div class="sm-kv-row">
        <span class="sm-label">INVESTED</span>
        <span class="sm-val-yellow" id="sm-total-invested">$0</span>
      </div>
      <div class="sm-kv-row">
        <span class="sm-label">CROWD PULL</span>
        <span class="sm-val-green" id="sm-crowd-amount">$0</span>
      </div>
    </div>

    <div class="sm-strategy-card">
      <div class="sm-strategy-title">STRATEGY GUIDE</div>
      <div class="sm-strategy-row">
        <span class="sm-strategy-tag sm-tag-calls">📞 Calls</span>
        <span class="sm-strategy-desc">Direct · Predictable · Limited</span>
      </div>
      <div class="sm-strategy-row">
        <span class="sm-strategy-tag sm-tag-social">📱 Social</span>
        <span class="sm-strategy-desc">Delayed · Scalable · Viral risk</span>
      </div>
      <div class="sm-strategy-tip">Both feed the same stock. Rug pull when hype peaks.</div>
    </div>
  </div>

  <!-- CENTER: composer + feed -->
  <div class="sm-center-col">
    <div id="sm-composer-mount"></div>
    <div class="sm-feed-header">
      <span class="sm-feed-title">📡 LIVE FEED</span>
      <span class="sm-feed-sub">engagement updates in real-time</span>
    </div>
    <div class="sm-feed-scroll" id="sm-feed-mount"></div>
  </div>

  <!-- RIGHT: meters + rug pull -->
  <div class="sm-right-col">
    <div class="sm-meter-section">
      <div class="sm-meter-label">📈 HYPE</div>
      <div class="sm-meter-wrap">
        <div class="sm-meter-fill sm-hype-meter-fill" id="sm-hype-meter" style="height:5%"></div>
      </div>
      <div class="sm-meter-val" id="sm-hype-val">5%</div>
    </div>

    <div class="sm-meter-section">
      <div class="sm-meter-label">🌡️ RISK</div>
      <div class="sm-meter-wrap">
        <div class="sm-meter-fill bm-risk-fill risk-low" id="sm-risk-meter" style="height:0%"></div>
      </div>
      <div class="sm-meter-val" id="sm-risk-val">0%</div>
      <div class="sm-risk-warn hidden" id="sm-risk-warn">⚠️ HIGH RISK</div>
    </div>

    <div class="bm-divider"></div>

    <div class="bm-stat-row">
      <span class="bm-stat-lbl">POSTS TODAY</span>
      <span class="bm-stat-val" id="sm-posts-today">0 / 8</span>
    </div>
    <div class="bm-stat-row">
      <span class="bm-stat-lbl">COOLDOWN</span>
      <span class="bm-stat-val" id="sm-post-cd">—</span>
    </div>
    <div class="bm-stat-row">
      <span class="bm-stat-lbl">TOTAL PROFIT</span>
      <span class="bm-stat-val bm-neon-green" id="sm-total-profit">$0</span>
    </div>

    <div class="bm-divider"></div>

    <div class="sm-rug-panel">
      <div class="sm-rug-est-label">ESTIMATED CASHOUT</div>
      <div class="sm-rug-est-val" id="sm-rug-estimate">$0</div>
      <button id="sm-rug-pull-btn" class="btn-rug-pull" disabled>
        <span class="rug-icon">💀</span>
        <span class="rug-text">RUG PULL</span>
      </button>
    </div>

    <div id="sm-suspended-notice" class="bm-suspended-notice hidden">
      🚫 SUSPENDED<br>
      <span id="sm-lock-days" class="bm-lock-days">—</span>
    </div>
  </div>

</div>`;
  }
}
