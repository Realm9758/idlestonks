import type { TutorialSystem, TutorialStep } from '../systems/TutorialSystem.ts';

const INTRO_MESSAGES = [
  "yo… you ever tried investing? 📈",
  "you can make serious money if you know what you're doing",
  "I'll walk you through the basics — it's actually pretty simple",
];

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
      setTimeout(() => this._showNotif(), 1500);
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

    // Intro notification badge (bottom-right)
    const notif = document.createElement('div');
    notif.id = 'tut-notif';
    notif.className = 'tut-notif hidden';
    notif.innerHTML = `<span class="tut-notif-ping"></span>📱 New Message`;
    notif.addEventListener('click', () => this._openIntroChat());
    document.body.appendChild(notif);

    // Intro chat messenger popup
    const messenger = document.createElement('div');
    messenger.id = 'tut-messenger';
    messenger.className = 'tut-messenger hidden';
    messenger.innerHTML = `
      <div class="tut-msg-hdr">
        <div class="tut-msg-contact">
          <span class="tut-contact-dot">●</span>
          <span class="tut-contact-name">your_friend</span>
        </div>
        <button id="tut-msg-close" class="btn-icon" style="color:#555">✕</button>
      </div>
      <div id="tut-msg-body" class="tut-msg-body"></div>
      <div id="tut-msg-cta" class="tut-msg-cta hidden">
        <button id="tut-msg-start" class="tut-msg-start-btn">📊 ok, show me →</button>
      </div>`;
    document.body.appendChild(messenger);

    document.getElementById('tut-msg-close')!.addEventListener('click', () =>
      document.getElementById('tut-messenger')!.classList.add('hidden'),
    );
    document.getElementById('tut-msg-start')!.addEventListener('click', () => {
      document.getElementById('tut-messenger')!.classList.add('hidden');
      this.sys.markIntroDone();
    });
  }

  // ── Intro chat ─────────────────────────────────────────────────────────────

  private _showNotif(): void {
    document.getElementById('tut-notif')?.classList.remove('hidden');
  }

  private _openIntroChat(): void {
    document.getElementById('tut-notif')!.classList.add('hidden');
    const messenger = document.getElementById('tut-messenger')!;
    const body      = document.getElementById('tut-msg-body')!;
    const cta       = document.getElementById('tut-msg-cta')!;
    messenger.classList.remove('hidden');
    body.innerHTML = '';
    cta.classList.add('hidden');

    let delay = 400;
    for (const text of INTRO_MESSAGES) {
      const d = delay;
      delay += 900 + text.length * 18;
      setTimeout(() => {
        // Reuse the BM chat bubble styles for consistency
        const row = document.createElement('div');
        row.className = 'bm-msg-row bm-msg-left';
        const bubble = document.createElement('div');
        bubble.className = 'bm-bubble bm-bubble-left';
        bubble.textContent = text;
        row.appendChild(bubble);
        body.appendChild(row);
        body.scrollTop = body.scrollHeight;
      }, d);
    }
    setTimeout(() => cta.classList.remove('hidden'), delay + 400);
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
