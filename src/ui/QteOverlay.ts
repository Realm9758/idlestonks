export type QteResult = 'perfect' | 'good' | 'missed';
export type QteType   = 'timing_bar' | 'reaction';

interface QteConfig {
  type: QteType;
  reason: string;
  onResult: (r: QteResult) => void;
}

const COOLDOWN_MS = 22_000; // minimum gap between QTEs

export class QteOverlay {
  private el: HTMLElement | null = null;
  private _active = false;
  private _lastTrigger = 0;
  private _cleanupFns: Array<() => void> = [];

  mount(parent: HTMLElement): void {
    const el = document.createElement('div');
    el.id = 'qte-overlay';
    el.className = 'qte-overlay qte-hidden';
    parent.appendChild(el);
    this.el = el;
  }

  isActive(): boolean { return this._active; }

  canTrigger(): boolean {
    return !this._active && Date.now() - this._lastTrigger > COOLDOWN_MS;
  }

  trigger(type: QteType, reason: string, onResult: (r: QteResult) => void): void {
    if (!this.canTrigger() || !this.el) return;
    this._active = true;
    this._lastTrigger = Date.now();

    const cfg: QteConfig = { type, reason, onResult };
    if (type === 'timing_bar') this._showTimingBar(cfg);
    else                       this._showReaction(cfg);
  }

  // ── Timing Bar ─────────────────────────────────────────────────────────────
  // A cursor sweeps left-to-right over 3 s. The player clicks when it's in the
  // green zone. Perfect = tight centre band, Good = outer green, Missed = outside.

  private _showTimingBar(cfg: QteConfig): void {
    const DURATION = 3_000;
    const greenStart  = 0.52 + Math.random() * 0.14; // 52–66 %
    const greenWidth  = 0.24;
    const perfStart   = greenStart + greenWidth * 0.35;
    const perfWidth   = greenWidth * 0.30;

    this.el!.innerHTML = `
      <div class="qte-card" id="qte-card">
        <div class="qte-header">
          <span class="qte-icon">⚡</span>
          <span class="qte-reason">${cfg.reason}</span>
        </div>
        <p class="qte-instruction">Click in the <span class="qte-green-word">green zone</span>!</p>
        <div class="qte-bar-wrap">
          <div class="qte-bar-track" id="qte-track">
            <div class="qte-green-zone" style="left:${(greenStart*100).toFixed(1)}%;width:${(greenWidth*100).toFixed(1)}%"></div>
            <div class="qte-perfect-zone" style="left:${(perfStart*100).toFixed(1)}%;width:${(perfWidth*100).toFixed(1)}%"></div>
            <div class="qte-cursor" id="qte-cursor"></div>
          </div>
        </div>
        <button class="qte-tap-btn" id="qte-tap">⚡ CLICK!</button>
        <div class="qte-feedback qte-fb-hidden" id="qte-feedback"></div>
      </div>`;

    this.el!.classList.remove('qte-hidden');

    const cursor = document.getElementById('qte-cursor')!;
    const startTime = Date.now();
    let resolved = false;

    const raf = { id: 0 };
    const animate = () => {
      if (resolved) return;
      const pct = Math.min(1, (Date.now() - startTime) / DURATION);
      cursor.style.left = `${(pct * 100).toFixed(2)}%`;
      if (pct >= 1) {
        this._resolve('missed', cfg.onResult);
        resolved = true;
      } else {
        raf.id = requestAnimationFrame(animate);
      }
    };
    raf.id = requestAnimationFrame(animate);

    const tap = document.getElementById('qte-tap')!;
    const onClick = () => {
      if (resolved) return;
      resolved = true;
      cancelAnimationFrame(raf.id);
      const pos = Math.min(1, (Date.now() - startTime) / DURATION);
      let result: QteResult;
      if (pos >= perfStart && pos <= perfStart + perfWidth)         result = 'perfect';
      else if (pos >= greenStart && pos <= greenStart + greenWidth) result = 'good';
      else                                                           result = 'missed';
      this._resolve(result, cfg.onResult);
    };
    tap.addEventListener('click', onClick, { once: true });
    this._cleanupFns.push(() => { cancelAnimationFrame(raf.id); tap.removeEventListener('click', onClick); });
  }

  // ── Reaction ───────────────────────────────────────────────────────────────
  // Counts down 3-2-1 then flashes "CLICK NOW!" — player must click quickly.
  // < 400 ms = PERFECT, < 1 500 ms = GOOD, timeout = MISSED.

  private _showReaction(cfg: QteConfig): void {
    const PROMPT_WINDOW = 1_500;

    this.el!.innerHTML = `
      <div class="qte-card" id="qte-card">
        <div class="qte-header">
          <span class="qte-icon">⚡</span>
          <span class="qte-reason">${cfg.reason}</span>
        </div>
        <div class="qte-countdown" id="qte-countdown">3</div>
        <div class="qte-prompt qte-prompt-hidden" id="qte-prompt">⚡ CLICK NOW!</div>
        <button class="qte-tap-btn" id="qte-tap">TAP!</button>
        <div class="qte-feedback qte-fb-hidden" id="qte-feedback"></div>
      </div>`;

    this.el!.classList.remove('qte-hidden');

    const countEl  = document.getElementById('qte-countdown')!;
    const promptEl = document.getElementById('qte-prompt')!;
    const tap      = document.getElementById('qte-tap')!;

    let count = 3;
    let promptShownAt: number | null = null;
    let resolved = false;

    const tickId = setInterval(() => {
      if (resolved) { clearInterval(tickId); return; }
      count--;
      if (count > 0) {
        countEl.textContent = String(count);
        countEl.classList.add('qte-count-pulse');
        setTimeout(() => countEl.classList.remove('qte-count-pulse'), 300);
      } else {
        clearInterval(tickId);
        countEl.classList.add('qte-hidden');
        promptEl.classList.remove('qte-prompt-hidden');
        promptEl.classList.add('qte-prompt-flash');
        promptShownAt = Date.now();

        const missTimeout = setTimeout(() => {
          if (!resolved) { resolved = true; this._resolve('missed', cfg.onResult); }
        }, PROMPT_WINDOW);
        this._cleanupFns.push(() => clearTimeout(missTimeout));
      }
    }, 1_000);

    this._cleanupFns.push(() => clearInterval(tickId));

    const onClick = () => {
      if (resolved) return;
      resolved = true;
      clearInterval(tickId);
      if (promptShownAt === null) {
        this._resolve('missed', cfg.onResult); // clicked during countdown
        return;
      }
      const ms = Date.now() - promptShownAt;
      const result: QteResult = ms < 400 ? 'perfect' : ms < PROMPT_WINDOW ? 'good' : 'missed';
      this._resolve(result, cfg.onResult);
    };
    tap.addEventListener('click', onClick, { once: true });
    this._cleanupFns.push(() => tap.removeEventListener('click', onClick));
  }

  // ── Shared resolution ──────────────────────────────────────────────────────

  private _resolve(result: QteResult, onResult: (r: QteResult) => void): void {
    const fb = document.getElementById('qte-feedback');
    if (fb) {
      fb.classList.remove('qte-fb-hidden');
      if (result === 'perfect') {
        fb.className = 'qte-feedback qte-fb-perfect';
        fb.innerHTML = '🎯 PERFECT!<span class="qte-bonus-text">+25% BONUS</span>';
      } else if (result === 'good') {
        fb.className = 'qte-feedback qte-fb-good';
        fb.innerHTML = '✅ GOOD!<span class="qte-bonus-text">+10% BONUS</span>';
      } else {
        fb.className = 'qte-feedback qte-fb-missed';
        fb.innerHTML = '❌ MISSED<span class="qte-bonus-text">No bonus</span>';
      }
    }

    onResult(result);

    setTimeout(() => this._dismiss(), 1_800);
  }

  private _dismiss(): void {
    for (const fn of this._cleanupFns) fn();
    this._cleanupFns = [];
    this._active = false;
    if (this.el) {
      this.el.classList.add('qte-hidden');
      this.el.innerHTML = '';
    }
  }
}
