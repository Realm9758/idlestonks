import type { BlackMarketSystem, BmAlert } from '../systems/BlackMarketSystem.ts';
import { LAWYER_UPGRADES } from '../systems/BlackMarketSystem.ts';
import type { SocialPost, SocialPlatform, SocialPostType } from '../systems/SocialPost.ts';
import { PostComposer } from './PostComposer.ts';
import { SocialFeed } from './SocialFeed.ts';
import { screenFlash, screenShake } from './animations.ts';

export interface SocialMediaCallbacks {
  showToast:    (msg: string, type: 'success' | 'error' | 'info' | 'chaos') => void;
  addCash:      (amount: number) => void;
  deductCash:   (amount: number) => boolean;
  onViralPost?: (post: SocialPost) => void;
}

export class SocialMediaPanel {
  private sys:      BlackMarketSystem;
  private cb:       SocialMediaCallbacks;
  private composer: PostComposer | null = null;
  private feed:     SocialFeed   | null = null;

  // Track alert IDs we've already shown to avoid double-toasts
  private _shownAlertIds = new Set<string>();
  // Track previous heat level to detect crossings
  private _prevHeatLevel: string = 'safe';

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
    document.getElementById('sm-lawyer-upgrade-btn')?.addEventListener('click', () => this._handleLawyerUpgrade());

    this.updateDisplay();
  }

  updateDisplay(): void {
    const s = this.sys;
    const g = (id: string) => document.getElementById(id);

    // Consume and handle pending alerts
    this._processAlerts(s.consumeAlerts());

    // ── LEFT: Operation panel ────────────────────────────────────────────────
    const priceEl = g('sm-coin-price');
    if (priceEl) {
      const p = s.stock.price;
      priceEl.textContent = `$${p < 1 ? p.toFixed(4) : p.toFixed(2)}`;
    }

    // Hype bar
    const hypeFill = g('sm-hype-fill') as HTMLElement | null;
    if (hypeFill) hypeFill.style.width = `${(s.stock.hype * 100).toFixed(0)}%`;
    const hypePct = g('sm-hype-pct');
    if (hypePct) hypePct.textContent = `${(s.stock.hype * 100).toFixed(0)}%`;

    // Heat bar (with level-based color class)
    const heatFill = g('sm-heat-fill') as HTMLElement | null;
    const heatLevel = s.getHeatLevel();
    if (heatFill) {
      heatFill.style.width = `${s.heat.toFixed(0)}%`;
      heatFill.className = `sm-heat-fill sm-heat-${heatLevel}`;
    }
    const heatPct = g('sm-heat-pct');
    if (heatPct) heatPct.textContent = `${Math.round(s.heat)}%`;

    // Heat label
    const heatLabel = g('sm-heat-label');
    if (heatLabel) {
      const labels: Record<string, string> = {
        safe: '🟢 SAFE', suspicious: '🟡 SUSPICIOUS', watched: '🟠 UNDER WATCH', danger: '🔴 CASE RISK',
      };
      heatLabel.textContent = labels[heatLevel];
      heatLabel.className   = `sm-heat-status-label sm-heat-status-${heatLevel}`;
    }

    // Stage badge
    const stage      = s.getStage();
    const stageBadge = g('sm-stage-badge');
    if (stageBadge) {
      stageBadge.textContent = stage.toUpperCase();
      stageBadge.className   = `sm-stage-badge sm-stage-${stage}`;
    }

    // Invested / crowd
    const invEl = g('sm-total-invested');
    if (invEl) invEl.textContent = `$${Math.round(s.stock.totalInvested).toLocaleString()}`;
    const crowdTotal = s.posts.reduce((sum, p) => sum + (p.settled ? p.crowdAmount : 0), 0);
    const crowdEl    = g('sm-crowd-amount');
    if (crowdEl) crowdEl.textContent = `$${Math.round(crowdTotal).toLocaleString()}`;

    // ── RIGHT: Control panel ─────────────────────────────────────────────────
    // Vertical hype meter
    const hypeMeter = g('sm-hype-meter') as HTMLElement | null;
    if (hypeMeter) hypeMeter.style.height = `${(s.stock.hype * 100).toFixed(0)}%`;
    const hypeVal = g('sm-hype-val');
    if (hypeVal) hypeVal.textContent = `${(s.stock.hype * 100).toFixed(0)}%`;

    // Vertical heat meter (with color + pulse)
    const heatMeter = g('sm-heat-meter') as HTMLElement | null;
    if (heatMeter) {
      heatMeter.style.height = `${s.heat.toFixed(0)}%`;
      heatMeter.className    = `sm-meter-fill sm-heat-meter-fill sm-heat-meter-${heatLevel}`;
    }
    const heatVal = g('sm-heat-val');
    if (heatVal) heatVal.textContent = `${Math.round(s.heat)}%`;

    // Trend label
    const trendEl = g('sm-trend-label');
    if (trendEl) {
      const trends: Record<string, string> = {
        quiet: '—', growing: '↑ Rising', trending: '↑↑ Trending', viral: '🔥 VIRAL', unstable: '⚠️ Unstable',
      };
      trendEl.textContent = trends[stage] ?? '—';
      trendEl.className   = `sm-trend-val sm-trend-${stage}`;
    }

    // Posts today / cooldown
    const postsTodayEl = g('sm-posts-today');
    if (postsTodayEl) postsTodayEl.textContent = `${s.postsToday} / ${s.MAX_POSTS_PER_DAY}`;
    const cdEl = g('sm-post-cd');
    if (cdEl) cdEl.textContent = s.postCooldownSecs > 0 ? `${s.postCooldownSecs}s` : '—';

    // Total profit
    const profitEl = g('sm-total-profit');
    if (profitEl) profitEl.textContent = `$${s.totalProfit.toLocaleString()}`;

    // ── Rug pull panel ───────────────────────────────────────────────────────
    const rugEst   = Math.round(s.stock.totalInvested * 0.70);
    const rugEstEl = g('sm-rug-estimate');
    if (rugEstEl) rugEstEl.textContent = `$${rugEst.toLocaleString()}`;

    // Rug pull warning message
    const rugWarnEl = g('sm-rug-warning');
    if (rugWarnEl) {
      rugWarnEl.textContent  = this._getRugWarning();
      rugWarnEl.className    = `sm-rug-warning sm-rug-warn-${this._getRugWarnLevel()}`;
    }

    const rugBtn = g('sm-rug-pull-btn') as HTMLButtonElement | null;
    if (rugBtn) rugBtn.disabled = !s.canRugPull();

    // Suspended notice
    g('sm-suspended-notice')?.classList.toggle('hidden', !s.isLocked);
    const lockDays = g('sm-lock-days');
    if (lockDays && s.isLocked) lockDays.textContent = `${s.lockDaysRemaining} day(s) remaining`;

    // ── Case panel ───────────────────────────────────────────────────────────
    const casePanel = g('sm-case-panel');
    if (casePanel) casePanel.classList.toggle('hidden', !s.caseActive);

    if (s.caseActive) {
      const caseFill = g('sm-case-progress-fill') as HTMLElement | null;
      if (caseFill) caseFill.style.width = `${s.caseProgress.toFixed(0)}%`;
      const casePct = g('sm-case-progress-pct');
      if (casePct) casePct.textContent = `${Math.round(s.caseProgress)}%`;

      // Expected fine
      const fineBase       = Math.round(2000 + s.heat * 150);
      const fineReduction  = this._getLawyerFineReduction();
      const expectedFine   = Math.round(fineBase * (1 - fineReduction));
      const fineEl         = g('sm-case-expected-fine');
      if (fineEl) fineEl.textContent = `$${expectedFine.toLocaleString()}`;

      // Lawyer effectiveness
      const winChanceEl = g('sm-case-win-chance');
      if (winChanceEl) winChanceEl.textContent = `${Math.round(s.getCaseWinChance() * 100)}%`;
    }

    // Investigation warning (heat ≥ 60, no case yet)
    const invAlert = g('sm-investigation-alert');
    if (invAlert) {
      invAlert.classList.toggle('hidden', s.heat < 60 || s.caseActive);
    }

    // ── Lawyer panel ─────────────────────────────────────────────────────────
    this._updateLawyerPanel();

    // Composer + feed updates
    this.composer?.updateDisplay(s.postCooldownSecs, s.postsToday, s.canPost());
    this.feed?.update(s.posts);
  }

  // ── private ──────────────────────────────────────────────────────────────

  private _processAlerts(alerts: BmAlert[]): void {
    for (const alert of alerts) {
      if (this._shownAlertIds.has(alert.id)) continue;
      this._shownAlertIds.add(alert.id);
      if (alert.type === 'investigation_warning') {
        this.cb.showToast(alert.message, 'error');
        screenFlash('bad');
      } else if (alert.type === 'case_opened') {
        this.cb.showToast(alert.message, 'chaos');
        screenShake('heavy');
        screenFlash('bad');
      } else if (alert.type === 'case_resolved_win') {
        this.cb.showToast(alert.message, 'success');
        screenFlash('good');
      } else if (alert.type === 'case_resolved_loss') {
        this.cb.showToast(alert.message, 'error');
        screenFlash('bad');
      }
    }
  }

  private _getRugWarning(): string {
    const s = this.sys;
    const hype = s.stock.hype;
    const heat = s.heat;
    const stage = s.getStage();
    if (stage === 'unstable')               return '⚠️ Momentum fading — last chance';
    if (heat >= 85)                         return '🚨 TOO HOT — case risk imminent';
    if (heat >= 60)                         return '⚠️ Heat rising — risk of investigation';
    if (hype > 0.70 && heat < 60)           return '💰 Peak hype — maximum profit';
    if (hype < 0.15 && s.stock.totalInvested < 500) return '😴 Too early — wait for hype';
    return '✅ Safe exit';
  }

  private _getRugWarnLevel(): string {
    const s = this.sys;
    if (s.heat >= 85 || s.getStage() === 'unstable') return 'danger';
    if (s.heat >= 60)                                return 'warning';
    if (s.stock.hype > 0.70)                         return 'peak';
    return 'safe';
  }

  private _getLawyerFineReduction(): number {
    let total = 0;
    for (let l = 1; l <= this.sys.lawyerLevel; l++) {
      const u = LAWYER_UPGRADES.find(x => x.level === l);
      if (u) total += u.fineReduction;
    }
    return total;
  }

  private _updateLawyerPanel(): void {
    const s        = this.sys;
    const g        = (id: string) => document.getElementById(id);
    const next     = s.getLawyerUpgrade();
    const current  = s.getLawyerMeta();
    const nameEl   = g('sm-lawyer-name');
    const descEl   = g('sm-lawyer-desc');
    const btn      = g('sm-lawyer-upgrade-btn') as HTMLButtonElement | null;

    if (nameEl) {
      nameEl.textContent = s.lawyerLevel === 0
        ? 'No Lawyer'
        : `${current?.name ?? ''} (Lv ${s.lawyerLevel})`;
    }

    if (next) {
      if (descEl) descEl.textContent = `Upgrade: ${next.name} — ${next.description}`;
      if (btn) {
        btn.disabled     = false;
        btn.textContent  = `Hire for $${next.cost.toLocaleString()}`;
      }
    } else {
      if (descEl) descEl.textContent = 'Max level — fully protected';
      if (btn) { btn.disabled = true; btn.textContent = 'MAX LEVEL'; }
    }
  }

  private _handlePublish(platform: SocialPlatform, postType: SocialPostType, text: string): void {
    const post = this.sys.publishPost(platform, postType, text);
    if (!post) { this.cb.showToast('Cannot post right now.', 'error'); return; }
    const typeLabel: Record<SocialPostType, string> = {
      hype: 'Hype post', fake_leak: 'Fake leak', meme: 'Meme post', influencer_promo: 'Influencer promo',
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

  private _handleLawyerUpgrade(): void {
    const next = this.sys.getLawyerUpgrade();
    if (!next) return;
    const success = this.sys.buyLawyerUpgrade((amount) => {
      if (!this.cb.deductCash(amount)) {
        this.cb.showToast(`Not enough cash. Need $${amount.toLocaleString()}.`, 'error');
        return false;
      }
      return true;
    });
    if (success) {
      this.cb.showToast(`⚖️ Hired ${next.name}! Legal protection upgraded.`, 'success');
      screenFlash('good');
      this.updateDisplay();
    }
  }

  private _buildHtml(): string {
    return `
<div class="sm-layout">

  <!-- ── LEFT: OPERATION PANEL ── -->
  <div class="sm-op-col">
    <div class="sm-col-label">🌑 OPERATION</div>

    <div class="sm-coin-card">
      <div class="sm-coin-name">🌑 MoonCoin</div>
      <div class="sm-coin-tag-row">
        <span class="bm-coin-tag">SYNTHETIC</span>
        <span class="sm-stage-badge sm-stage-quiet" id="sm-stage-badge">QUIET</span>
      </div>
      <div class="sm-coin-price" id="sm-coin-price">$0.0100</div>

      <div class="sm-bar-group">
        <div class="sm-bar-label-row">
          <span class="sm-bar-lbl">📈 HYPE</span>
          <span class="sm-bar-pct" id="sm-hype-pct">5%</span>
        </div>
        <div class="sm-bar-track">
          <div class="sm-hype-fill" id="sm-hype-fill" style="width:5%"></div>
        </div>
      </div>

      <div class="sm-bar-group">
        <div class="sm-bar-label-row">
          <span class="sm-bar-lbl">🌡️ HEAT</span>
          <span class="sm-bar-pct sm-heat-pct" id="sm-heat-pct">0%</span>
        </div>
        <div class="sm-bar-track">
          <div class="sm-heat-fill sm-heat-safe" id="sm-heat-fill" style="width:0%"></div>
        </div>
        <div class="sm-heat-status-label sm-heat-status-safe" id="sm-heat-label">🟢 SAFE</div>
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

    <!-- Investigation alert -->
    <div class="sm-investigation-alert hidden" id="sm-investigation-alert">
      <div class="sm-inv-icon">⚠️</div>
      <div class="sm-inv-text">Authorities are watching your activity</div>
    </div>

    <!-- Case panel -->
    <div class="sm-case-panel hidden" id="sm-case-panel">
      <div class="sm-case-header">🚨 CASE OPENED</div>
      <div class="sm-case-progress-wrap">
        <div class="sm-case-progress-fill" id="sm-case-progress-fill" style="width:0%"></div>
      </div>
      <div class="sm-case-stats">
        <div class="sm-case-stat-row">
          <span class="sm-case-lbl">CASE BUILDING</span>
          <span class="sm-case-val" id="sm-case-progress-pct">0%</span>
        </div>
        <div class="sm-case-stat-row">
          <span class="sm-case-lbl">EXPECTED FINE</span>
          <span class="sm-case-val sm-case-fine" id="sm-case-expected-fine">$0</span>
        </div>
        <div class="sm-case-stat-row">
          <span class="sm-case-lbl">WIN CHANCE</span>
          <span class="sm-case-val sm-case-win" id="sm-case-win-chance">30%</span>
        </div>
      </div>
      <div class="sm-case-tip">Lower heat to slow case. Hire a lawyer to improve odds.</div>
    </div>

    <!-- Lawyer panel -->
    <div class="sm-lawyer-panel">
      <div class="sm-lawyer-header">⚖️ LEGAL PROTECTION</div>
      <div class="sm-lawyer-name" id="sm-lawyer-name">No Lawyer</div>
      <div class="sm-lawyer-desc" id="sm-lawyer-desc">Hire a lawyer to reduce penalties and fight cases.</div>
      <button class="sm-lawyer-upgrade-btn" id="sm-lawyer-upgrade-btn">Hire for $5,000</button>
    </div>
  </div>

  <!-- ── CENTER: LIVE SOCIAL FEED ── -->
  <div class="sm-feed-col">
    <div class="sm-feed-platform-bar">
      <span class="sm-feed-platform-tag" style="color:#00b4d8">🐦 ChirpNet</span>
      <span class="sm-feed-platform-tag" style="color:#ff7043">😂 MemeBoard</span>
      <span class="sm-feed-platform-tag" style="color:#e040fb">📈 FinTok</span>
      <span class="sm-feed-live-dot"></span>
      <span class="sm-feed-live-text">LIVE</span>
    </div>
    <div id="sm-composer-mount"></div>
    <div class="sm-feed-header">
      <span class="sm-feed-title">📡 LIVE FEED</span>
      <span class="sm-feed-sub">engagement updates in real-time</span>
    </div>
    <div class="sm-feed-scroll" id="sm-feed-mount"></div>
  </div>

  <!-- ── RIGHT: CONTROL & RUG PULL ── -->
  <div class="sm-ctrl-col">

    <div class="sm-ctrl-meters">
      <div class="sm-meter-section">
        <div class="sm-meter-label">📈 HYPE</div>
        <div class="sm-meter-wrap">
          <div class="sm-meter-fill sm-hype-meter-fill" id="sm-hype-meter" style="height:5%"></div>
        </div>
        <div class="sm-meter-val" id="sm-hype-val">5%</div>
      </div>
      <div class="sm-meter-section">
        <div class="sm-meter-label">🌡️ HEAT</div>
        <div class="sm-meter-wrap">
          <div class="sm-meter-fill sm-heat-meter-fill sm-heat-meter-safe" id="sm-heat-meter" style="height:0%"></div>
        </div>
        <div class="sm-meter-val" id="sm-heat-val">0%</div>
      </div>
    </div>

    <div class="bm-divider"></div>

    <div class="sm-ctrl-stat-row">
      <span class="sm-ctrl-lbl">TREND</span>
      <span class="sm-trend-val sm-trend-quiet" id="sm-trend-label">—</span>
    </div>
    <div class="sm-ctrl-stat-row">
      <span class="sm-ctrl-lbl">POSTS TODAY</span>
      <span class="sm-ctrl-val" id="sm-posts-today">0 / 8</span>
    </div>
    <div class="sm-ctrl-stat-row">
      <span class="sm-ctrl-lbl">COOLDOWN</span>
      <span class="sm-ctrl-val" id="sm-post-cd">—</span>
    </div>
    <div class="sm-ctrl-stat-row">
      <span class="sm-ctrl-lbl">TOTAL PROFIT</span>
      <span class="sm-ctrl-val bm-neon-green" id="sm-total-profit">$0</span>
    </div>

    <div class="bm-divider"></div>

    <!-- Rug pull CTA -->
    <div class="sm-rug-panel">
      <div class="sm-rug-est-label">ESTIMATED CASHOUT</div>
      <div class="sm-rug-est-val" id="sm-rug-estimate">$0</div>
      <div class="sm-rug-warning sm-rug-warn-safe" id="sm-rug-warning">✅ Safe exit</div>
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
