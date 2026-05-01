import type { TutorialSystem, TutorialStep } from '../systems/TutorialSystem.ts';

// Welcome modal shown immediately to brand-new players
const WELCOME_HTML = `
<div id="tut-welcome-overlay" class="tut-welcome-overlay">
  <div class="tut-welcome-card">
    <div class="tut-welcome-logo">📈 IdleStonks</div>
    <div class="tut-welcome-sub">Meme Market Simulator</div>
    <div class="tut-welcome-body">
      <p class="tut-welcome-desc">
        You're a trader with <strong>$1,000</strong> and a dream.<br>
        Buy and sell meme stocks, ride market events, and grow your net worth to <strong>$1,000,000+</strong>.
      </p>
      <div class="tut-welcome-pills">
        <span class="tut-wpill">📊 Prices move every second</span>
        <span class="tut-wpill">⚡ Events crash &amp; pump markets</span>
        <span class="tut-wpill">📰 Breaking news = opportunities</span>
        <span class="tut-wpill">💼 Grow your portfolio</span>
        <span class="tut-wpill">⬆️ Unlock upgrades &amp; features</span>
      </div>
    </div>
    <div class="tut-welcome-actions">
      <button id="tut-welcome-start" class="tut-welcome-btn-primary">📊 Show me how →</button>
      <button id="tut-welcome-skip"  class="tut-welcome-btn-skip">I know what I'm doing — skip</button>
    </div>
  </div>
</div>`;

export class TutorialOverlay {
  private readonly sys: TutorialSystem;
  private resizeObserver: ResizeObserver | null = null;
  private completionShown = false;

  constructor(sys: TutorialSystem) {
    this.sys = sys;
  }

  init(): void {
    this._appendDom();
    this.sys.setOnChange(() => this.render());
    this.resizeObserver = new ResizeObserver(() => this._updatePositions());
    window.addEventListener('resize', () => this._updatePositions());

    if (this.sys.isDone) return;

    if (!this.sys.introDone) {
      this._showWelcomeModal();
    } else {
      // Resume mid-tutorial after reload
      this.render();
    }
  }

  render(): void {
    if (this.sys.isDone) {
      this._hideStepUi();
      if (!this.completionShown) {
        this.completionShown = true;
        this._showCompletion();
      }
      return;
    }

    if (!this.sys.introDone) {
      this._hideStepUi();
      return;
    }

    const step = this.sys.currentStep;
    if (!step) { this._hideStepUi(); return; }

    this._renderStep(step);
  }

  // ── Step rendering ─────────────────────────────────────────────────────────

  private _renderStep(step: TutorialStep): void {
    const spotlight = document.getElementById('tut-spotlight')!;
    document.getElementById('tut-skip-btn')!.classList.remove('hidden');

    if (step.targetSelector) {
      const target = document.querySelector<HTMLElement>(step.targetSelector);
      if (target) {
        this.resizeObserver?.disconnect();
        this.resizeObserver?.observe(target);
        this._moveSpotlight(target);
        spotlight.classList.remove('hidden');
      } else {
        spotlight.classList.add('hidden');
      }
    } else {
      spotlight.classList.add('hidden');
    }

    this._buildTooltip(step);
    this._positionTooltip(step);
  }

  private _hideStepUi(): void {
    document.getElementById('tut-spotlight')?.classList.add('hidden');
    document.getElementById('tut-tooltip')?.classList.add('hidden');
    document.getElementById('tut-skip-btn')?.classList.add('hidden');
    this.resizeObserver?.disconnect();
  }

  // ── Spotlight ──────────────────────────────────────────────────────────────

  private _moveSpotlight(target: HTMLElement): void {
    const r = target.getBoundingClientRect();
    const P = 8;
    const s = document.getElementById('tut-spotlight')!;
    s.style.left   = `${r.left   - P}px`;
    s.style.top    = `${r.top    - P}px`;
    s.style.width  = `${r.width  + P * 2}px`;
    s.style.height = `${r.height + P * 2}px`;
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────

  private _buildTooltip(step: TutorialStep): void {
    const tooltip   = document.getElementById('tut-tooltip')!;
    const satisfied = this.sys.isActionSatisfied();
    const showNext  = !!(step.nextLabel && (step.actionRequired ? satisfied : true));
    const pct       = ((this.sys.stepIndex + 1) / this.sys.totalSteps) * 100;

    const waitHtml = step.actionRequired
      ? satisfied
        ? `<p class="tut-action-done"><span class="tut-check">✓</span> nice — moving on...</p>`
        : `<p class="tut-action-hint">
             <span class="tut-action-dot"></span>
             ${step.actionRequired === 'buy' ? 'click Buy above to continue' : 'click Sell above to continue'}
           </p>`
      : '';

    const nextHtml = showNext
      ? `<button id="tut-next-btn" class="tut-next-btn">${step.nextLabel}</button>`
      : '';

    // Rebuild inner HTML — the .tut-tip-body div is fresh each time, so its
    // CSS animation fires on every step transition automatically.
    tooltip.innerHTML = `
      <div class="tut-tip-progress">
        <div class="tut-tip-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="tut-tip-body">
        <p class="tut-tip-msg">${step.message}</p>
        ${step.subtext ? `<p class="tut-tip-sub">${step.subtext}</p>` : ''}
        ${waitHtml}
        ${nextHtml}
      </div>`;

    document.getElementById('tut-next-btn')?.addEventListener('click', () => this.sys.advance());
    tooltip.classList.remove('hidden');
  }

  private _positionTooltip(step: TutorialStep): void {
    const tooltip = document.getElementById('tut-tooltip')!;
    const TW = 300, TH = 160, GAP = 14, MARGIN = 12;

    if (!step.targetSelector) {
      tooltip.style.left = `${window.innerWidth  / 2 - TW / 2}px`;
      tooltip.style.top  = `${window.innerHeight / 2 - TH / 2}px`;
      return;
    }

    const target = document.querySelector<HTMLElement>(step.targetSelector);
    if (!target) return;
    const r = target.getBoundingClientRect();
    const P = 8; // spotlight padding

    // Horizontal: centred over the spotlight ring
    let left = r.left - P + (r.width + P * 2) / 2 - TW / 2;
    left = Math.max(MARGIN, Math.min(window.innerWidth - TW - MARGIN, left));

    // Vertical: prefer below, fall back to above
    const spBelow = window.innerHeight - (r.bottom + P + GAP);
    const spAbove = r.top - P - GAP;
    let top: number;
    if (spBelow >= TH || spBelow >= spAbove) {
      top = r.bottom + P + GAP;
    } else {
      top = r.top - P - GAP - TH;
    }
    top = Math.max(MARGIN, Math.min(window.innerHeight - TH - MARGIN, top));

    tooltip.style.left = `${left}px`;
    tooltip.style.top  = `${top}px`;
  }

  private _updatePositions(): void {
    if (!this.sys.introDone || this.sys.isDone) return;
    const step = this.sys.currentStep;
    if (!step?.targetSelector) return;
    const target = document.querySelector<HTMLElement>(step.targetSelector);
    if (target) {
      this._moveSpotlight(target);
      this._positionTooltip(step);
    }
  }

  // ── DOM scaffolding ────────────────────────────────────────────────────────

  private _appendDom(): void {
    // Spotlight ring — box-shadow creates the dim backdrop outside it
    const spotlight = document.createElement('div');
    spotlight.id = 'tut-spotlight';
    spotlight.className = 'tut-spotlight hidden';
    document.body.appendChild(spotlight);

    // Floating tooltip card
    const tooltip = document.createElement('div');
    tooltip.id = 'tut-tooltip';
    tooltip.className = 'tut-tooltip hidden';
    document.body.appendChild(tooltip);

    // Skip button (bottom-right corner)
    const skip = document.createElement('button');
    skip.id = 'tut-skip-btn';
    skip.className = 'tut-skip-btn hidden';
    skip.textContent = 'Skip tutorial';
    skip.addEventListener('click', () => this.sys.skip());
    document.body.appendChild(skip);
  }

  // ── Welcome modal ──────────────────────────────────────────────────────────

  private _showWelcomeModal(): void {
    const wrap = document.createElement('div');
    wrap.innerHTML = WELCOME_HTML;
    document.body.appendChild(wrap.firstElementChild!);

    document.getElementById('tut-welcome-start')!.addEventListener('click', () => {
      document.getElementById('tut-welcome-overlay')?.remove();
      this.sys.markIntroDone();
    });
    document.getElementById('tut-welcome-skip')!.addEventListener('click', () => {
      document.getElementById('tut-welcome-overlay')?.remove();
      this.sys.skip();
    });
  }

  // ── Completion ─────────────────────────────────────────────────────────────

  private _showCompletion(): void {
    const el = document.createElement('div');
    el.className = 'tut-done-banner';
    el.textContent = '🎓 tutorial complete — go make some money';
    document.body.appendChild(el);
    // Double rAF ensures the element is painted before the transition fires
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('tut-done-banner--show')));
    setTimeout(() => {
      el.classList.remove('tut-done-banner--show');
      setTimeout(() => el.remove(), 500);
    }, 3500);
  }
}
