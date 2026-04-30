import type {
  BlackMarketSystem,
  NewsManipTypeId,
  NewsManipAngle,
  StoryStrength,
  NewsManipPreview,
} from '../systems/BlackMarketSystem.ts';
import {
  NEWS_MANIP_TYPES,
  ANGLE_MODS,
  STRENGTH_MODS,
} from '../systems/BlackMarketSystem.ts';
import type { BmCallbacks } from './bmData.ts';
import { screenShake, screenFlash } from './animations.ts';

export class NewsManipPanel {
  private sys: BlackMarketSystem;
  private cb:  BmCallbacks;
  private el:  HTMLElement | null = null;

  // Builder state
  private typeId:   NewsManipTypeId = 'positive_hype';
  private angle:    NewsManipAngle  = 'safe_spin';
  private strength: StoryStrength   = 'medium';
  private headline  = '';

  constructor(sys: BlackMarketSystem, cb: BmCallbacks) {
    this.sys = sys;
    this.cb  = cb;
  }

  mount(container: HTMLElement): void {
    this.el = container;
    this._render();
  }

  refresh(): void {
    if (this.el) this._render();
  }

  private _render(): void {
    const el = this.el!;
    if (!this.sys.newsManipUnlocked) {
      el.innerHTML = `
        <div class="nm2-locked">
          <div class="nm2-lock-icon">🔒</div>
          <div class="nm2-lock-title">NEWS MANIPULATION</div>
          <div class="nm2-lock-sub">Requires $200,000 net worth while in the Black Market</div>
          <div class="nm2-lock-hint">Control the narrative. Shape the market.</div>
        </div>`;
      return;
    }

    const type     = NEWS_MANIP_TYPES.find(t => t.id === this.typeId)!;
    const preview  = this.sys.previewNewsManip(this.typeId, this.angle, this.strength)!;
    const canPub   = this.sys.canManipNews();
    const cooldown = this.sys.newsManipCooldownSecs;

    el.innerHTML = `
<div class="nm2-panel">

  <!-- ── LEFT: Story Type Selector ── -->
  <div class="nm2-left">
    <div class="nm2-col-title">Story Type</div>
    <div class="nm2-type-list">
      ${NEWS_MANIP_TYPES.map(t => `
        <div class="nm2-type-card${t.id === this.typeId ? ' nm2-type-selected' : ''}" data-nm2-type="${t.id}">
          <span class="nm2-type-emoji">${t.emoji}</span>
          <div class="nm2-type-body">
            <div class="nm2-type-name">${t.label}</div>
            <div class="nm2-type-meta">
              <span class="nm2-risk-badge nm2-${t.riskClass}">${t.riskLabel}</span>
              <span class="nm2-type-cost">$${(t.cost / 1000).toFixed(0)}k</span>
              <span class="nm2-type-chance">${Math.round(t.successChance * 100)}%</span>
            </div>
          </div>
        </div>`).join('')}
    </div>
    <div class="nm2-meta-footer">
      <span class="nm2-daily-badge${this.sys.newsManipsToday >= this.sys.MAX_NEWS_MANIPS_PER_DAY ? ' nm2-daily-full' : ''}">
        ${this.sys.newsManipsToday} / ${this.sys.MAX_NEWS_MANIPS_PER_DAY} today
      </span>
      ${cooldown > 0 ? `<span class="nm2-cooldown-badge">⏳ ${cooldown}s</span>` : ''}
    </div>
  </div>

  <!-- ── CENTER: Story Builder ── -->
  <div class="nm2-center">
    <div class="nm2-col-title">Story Builder</div>

    <div class="nm2-builder-group">
      <div class="nm2-group-label">Headline</div>
      <input class="nm2-headline-input" id="nm2-headline-input"
        type="text" maxlength="80"
        placeholder="${type.headlines[0]}"
        value="${this._esc(this.headline)}" />
      <div class="nm2-suggestions">
        ${type.headlines.map((h, i) => `
          <button class="nm2-suggestion" data-nm2-suggest="${i}">${h}</button>`).join('')}
      </div>
    </div>

    <div class="nm2-builder-group">
      <div class="nm2-group-label">Angle</div>
      <div class="nm2-angle-grid">
        ${(Object.entries(ANGLE_MODS) as [NewsManipAngle, typeof ANGLE_MODS[NewsManipAngle]][]).map(([id, a]) => `
          <button class="nm2-angle-btn${id === this.angle ? ' nm2-angle-selected' : ''}" data-nm2-angle="${id}">
            <span class="nm2-angle-emoji">${a.emoji}</span>
            <span class="nm2-angle-label">${a.label}</span>
            <span class="nm2-angle-desc">${a.desc}</span>
          </button>`).join('')}
      </div>
    </div>

    <div class="nm2-builder-group">
      <div class="nm2-group-label">Story Strength</div>
      <div class="nm2-strength-row">
        ${(Object.entries(STRENGTH_MODS) as [StoryStrength, typeof STRENGTH_MODS[StoryStrength]][]).map(([id, s]) => `
          <button class="nm2-str-btn${id === this.strength ? ' nm2-str-selected' : ''}" data-nm2-str="${id}">
            <span class="nm2-str-label">${s.label}</span>
            <span class="nm2-str-desc">${s.desc}</span>
          </button>`).join('')}
      </div>
    </div>

    <div class="nm2-preview" id="nm2-preview">
      ${this._previewHtml(preview)}
    </div>

    <button class="nm2-publish-btn${canPub ? '' : ' nm2-publish-disabled'}" id="nm2-publish-btn"
      ${canPub ? '' : 'disabled'}>
      ${this._publishBtnLabel(canPub, cooldown, preview.cost)}
    </button>
  </div>

  <!-- ── RIGHT: Risk & Impact ── -->
  <div class="nm2-right">
    <div class="nm2-col-title">Live Risk</div>
    ${this._riskPanelHtml(preview)}
  </div>

</div>`;

    this._wireEvents(el);
  }

  private _wireEvents(el: HTMLElement): void {
    // Type selector
    el.querySelectorAll<HTMLElement>('[data-nm2-type]').forEach(card => {
      card.addEventListener('click', () => {
        this.typeId  = card.dataset.nm2Type as NewsManipTypeId;
        this.headline = ''; // reset headline when type changes
        this._render();
      });
    });

    // Headline input
    const hlInput = el.querySelector<HTMLInputElement>('#nm2-headline-input');
    hlInput?.addEventListener('input', () => {
      this.headline = hlInput.value;
      this._softUpdate(el);
    });

    // Headline suggestions
    el.querySelectorAll<HTMLElement>('[data-nm2-suggest]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = NEWS_MANIP_TYPES.find(t => t.id === this.typeId)!;
        const idx  = parseInt(btn.dataset.nm2Suggest ?? '0', 10);
        this.headline = type.headlines[idx] ?? '';
        const input = el.querySelector<HTMLInputElement>('#nm2-headline-input');
        if (input) input.value = this.headline;
        this._softUpdate(el);
      });
    });

    // Angle
    el.querySelectorAll<HTMLElement>('[data-nm2-angle]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.angle = btn.dataset.nm2Angle as NewsManipAngle;
        el.querySelectorAll('[data-nm2-angle]').forEach(b => b.classList.remove('nm2-angle-selected'));
        btn.classList.add('nm2-angle-selected');
        this._softUpdate(el);
      });
    });

    // Strength
    el.querySelectorAll<HTMLElement>('[data-nm2-str]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.strength = btn.dataset.nm2Str as StoryStrength;
        el.querySelectorAll('[data-nm2-str]').forEach(b => b.classList.remove('nm2-str-selected'));
        btn.classList.add('nm2-str-selected');
        this._softUpdate(el);
      });
    });

    // Publish
    el.querySelector<HTMLButtonElement>('#nm2-publish-btn')?.addEventListener('click', () => {
      this._publish();
    });
  }

  private _softUpdate(el: HTMLElement): void {
    const preview = this.sys.previewNewsManip(this.typeId, this.angle, this.strength)!;
    const canPub  = this.sys.canManipNews();

    const previewEl = el.querySelector<HTMLElement>('#nm2-preview');
    if (previewEl) previewEl.innerHTML = this._previewHtml(preview);

    const rightEl = el.querySelector<HTMLElement>('.nm2-right');
    if (rightEl) {
      const title = rightEl.querySelector('.nm2-col-title');
      rightEl.innerHTML = `<div class="nm2-col-title">${title?.textContent ?? 'Live Risk'}</div>${this._riskPanelHtml(preview)}`;
    }

    const pubBtn = el.querySelector<HTMLButtonElement>('#nm2-publish-btn');
    if (pubBtn) {
      pubBtn.disabled = !canPub;
      pubBtn.className = `nm2-publish-btn${canPub ? '' : ' nm2-publish-disabled'}`;
      pubBtn.textContent = this._publishBtnLabel(canPub, this.sys.newsManipCooldownSecs, preview.cost);
    }
  }

  private _publish(): void {
    const hl     = this.headline.trim()
                  || (NEWS_MANIP_TYPES.find(t => t.id === this.typeId)?.headlines[0] ?? '');
    const result = this.sys.publishNewsManipFull(
      this.typeId, this.angle, this.strength, hl,
      amount => this.cb.deductCash(amount),
    );

    if (!result.success) {
      this.cb.showToast(result.message, 'error');
      return;
    }

    screenShake('light');
    screenFlash('good');
    this.cb.showToast(`📰 Story planted — resolves tomorrow`, 'info');

    // Push to bm chat
    const chatContainer = document.getElementById('bm-chat-messages');
    if (chatContainer) {
      const row = document.createElement('div');
      row.className = 'bm-msg-row bm-msg-left';
      const bubble = document.createElement('div');
      bubble.className = 'bm-bubble bm-bubble-left';
      bubble.textContent = `story's live. "${hl}" 📰`;
      row.appendChild(bubble);
      chatContainer.appendChild(row);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    this._render(); // full re-render to reset state + show pending
  }

  // ── HTML builders ─────────────────────────────────────────────────────────

  private _previewHtml(p: NewsManipPreview): string {
    const hypeColor    = p.hypeOnSuccess > 0.35 ? '#00ff88' : p.hypeOnSuccess > 0.18 ? '#a3ffcb' : '#6affb0';
    const heatPubColor = p.heatOnPublish >= 15 ? '#ff6b6b' : p.heatOnPublish >= 8 ? '#ffaa44' : '#ffd166';
    const heatFailColor = '#ff4444';
    const succColor    = p.successChance >= 0.65 ? '#00ff88' : p.successChance >= 0.45 ? '#ffd166' : '#ff6b6b';
    const credColor    = p.credibility >= 65 ? '#00ff88' : p.credibility >= 40 ? '#ffd166' : '#ff6b6b';
    const priceMom     = Math.round(p.hypeOnSuccess * 60);

    return `
      <div class="nm2-preview-title">Impact Preview</div>
      <div class="nm2-preview-col">
        <div class="nm2-preview-section nm2-preview-success">
          <div class="nm2-preview-section-lbl">✅ If successful</div>
          <div class="nm2-preview-row">
            <span class="nm2-pv-key">Hype boost</span>
            <span class="nm2-pv-val" style="color:${hypeColor}">+${Math.round(p.hypeOnSuccess * 100)}%</span>
          </div>
          <div class="nm2-preview-row">
            <span class="nm2-pv-key">Price momentum</span>
            <span class="nm2-pv-val" style="color:${hypeColor}">+${priceMom}%</span>
          </div>
          <div class="nm2-preview-row">
            <span class="nm2-pv-key">Success chance</span>
            <span class="nm2-pv-val" style="color:${succColor}">${Math.round(p.successChance * 100)}%</span>
          </div>
        </div>
        <div class="nm2-preview-section nm2-preview-fail">
          <div class="nm2-preview-section-lbl">❌ If traced</div>
          <div class="nm2-preview-row">
            <span class="nm2-pv-key">Heat on publish</span>
            <span class="nm2-pv-val" style="color:${heatPubColor}">+${p.heatOnPublish}</span>
          </div>
          <div class="nm2-preview-row">
            <span class="nm2-pv-key">Heat on fail</span>
            <span class="nm2-pv-val" style="color:${heatFailColor}">+${p.heatOnFail}</span>
          </div>
          ${p.trustDrainOnFail > 0 ? `
          <div class="nm2-preview-row">
            <span class="nm2-pv-key">Trust loss</span>
            <span class="nm2-pv-val" style="color:${heatFailColor}">−${Math.round(p.trustDrainOnFail * 100)}%</span>
          </div>` : ''}
        </div>
      </div>
      <div class="nm2-preview-cost">Cost: <strong>$${p.cost.toLocaleString()}</strong></div>
      <div class="nm2-cred-row">
        <span class="nm2-cred-lbl">Credibility</span>
        <div class="nm2-cred-track"><div class="nm2-cred-fill" style="width:${p.credibility}%;background:${credColor}"></div></div>
        <span class="nm2-cred-val" style="color:${credColor}">${p.credibility}%</span>
      </div>`;
  }

  private _riskPanelHtml(p: NewsManipPreview): string {
    const s        = this.sys;
    const hypeW    = Math.round(s.stock.hype * 100);
    const heatW    = Math.round(s.heat);
    const repW     = Math.round(s.reputation * 100);
    const heatCls  = heatW >= 85 ? 'risk-high' : heatW >= 60 ? 'risk-mid' : 'risk-low';
    const heatCol  = heatW >= 85 ? '#ff4444' : heatW >= 60 ? '#ffaa44' : '#00ff88';
    const hypeCol  = hypeW >= 70 ? '#00ff88' : hypeW >= 35 ? '#ffd166' : '#888';
    const repCol   = repW >= 80 ? '#00ff88' : repW >= 50 ? '#ffd166' : '#ff6b6b';

    const newHeat = Math.min(100, s.heat + p.heatOnPublish);
    const newHeatW = newHeat;
    const investigation = s.caseActive
      ? `<div class="nm2-risk-warn nm2-risk-warn-danger">🚨 Case active — extreme caution</div>`
      : newHeatW >= 85
        ? `<div class="nm2-risk-warn nm2-risk-warn-danger">⚠️ Will trigger investigation threshold</div>`
        : newHeatW >= 65
          ? `<div class="nm2-risk-warn nm2-risk-warn-warn">⚠️ High heat — approaching danger zone</div>`
          : '';

    const pending  = s.pendingNewsManips;

    return `
      <div class="nm2-risk-stat-group">
        <div class="nm2-risk-stat">
          <span class="nm2-rs-lbl">MoonCoin Hype</span>
          <div class="nm2-rs-track"><div class="nm2-rs-fill" style="width:${hypeW}%;background:${hypeCol}"></div></div>
          <span class="nm2-rs-val" style="color:${hypeCol}">${hypeW}%</span>
        </div>
        <div class="nm2-risk-stat">
          <span class="nm2-rs-lbl">Current Heat</span>
          <div class="nm2-rs-track"><div class="nm2-rs-fill ${heatCls}" style="width:${heatW}%"></div></div>
          <span class="nm2-rs-val" style="color:${heatCol}">${heatW}</span>
        </div>
        <div class="nm2-risk-stat">
          <span class="nm2-rs-lbl">Reputation</span>
          <div class="nm2-rs-track"><div class="nm2-rs-fill" style="width:${Math.min(100, repW)}%;background:${repCol}"></div></div>
          <span class="nm2-rs-val" style="color:${repCol}">${(s.reputation * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div class="nm2-heat-delta">
        <span class="nm2-hd-lbl">Heat after publish</span>
        <span class="nm2-hd-val" style="color:${newHeatW >= 85 ? '#ff4444' : newHeatW >= 65 ? '#ffaa44' : '#ffd166'}">${Math.round(newHeat)}</span>
      </div>

      ${investigation}

      ${pending.length > 0 ? `
        <div class="nm2-in-circ">
          <div class="nm2-ic-title">📡 In Circulation</div>
          ${pending.map(m => `
            <div class="nm2-ic-item">
              <span class="nm2-ic-dot"></span>
              <span class="nm2-ic-text">"${m.headline}"</span>
              <span class="nm2-ic-eta">resolves tomorrow</span>
            </div>`).join('')}
        </div>` : ''}

      <div class="nm2-notes">
        <div class="nm2-note">Cold stock → safer but less impact</div>
        <div class="nm2-note">Hot stock → stronger effect, more heat</div>
      </div>`;
  }

  private _publishBtnLabel(canPub: boolean, cooldown: number, cost: number): string {
    if (!this.sys.newsManipUnlocked)                              return '🔒 Locked';
    if (this.sys.isLocked)                                        return '🚫 Suspended';
    if (this.sys.newsManipsToday >= this.sys.MAX_NEWS_MANIPS_PER_DAY) return '✋ Daily Limit Reached';
    if (cooldown > 0)                                             return `⏳ Cooldown — ${cooldown}s`;
    if (!canPub)                                                  return '🔒 Cannot Publish';
    return `📤 Publish Story — $${cost.toLocaleString()}`;
  }

  private _esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
}
