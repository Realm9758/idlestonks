// ── Animation Utilities ───────────────────────────────────────────────────────
//
// All animations are CSS-class-based or use fixed-position DOM nodes so they
// never touch the game layout. requestAnimationFrame is used where a two-frame
// flush is needed to restart a CSS animation reliably.

// ── Price flash ───────────────────────────────────────────────────────────────

export function flashPrice(el: HTMLElement, dir: 'up' | 'down'): void {
  el.classList.remove('flash-up', 'flash-down');
  // Double-rAF: first frame removes the class, second re-adds so the browser
  // sees a style change and restarts the CSS animation.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add(dir === 'up' ? 'flash-up' : 'flash-down');
    });
  });
}

// ── Floating "+$12.50" text that drifts upward then fades ────────────────────

export function spawnFloatingText(
  anchor: HTMLElement,
  text: string,
  type: 'up' | 'down',
): void {
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `float-text float-${type}`;
  el.textContent = text;
  // Centre horizontally on the anchor element
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top  = `${rect.top + window.scrollY}px`;
  document.body.appendChild(el);
  // CSS animation handles the rise + fade; clean up after it finishes
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

// ── Button pulse (quick scale squeeze on click) ───────────────────────────────

export function pulseElement(el: HTMLElement | null): void {
  if (!el) return;
  el.classList.remove('btn-pulse');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('btn-pulse'));
  });
  el.addEventListener('animationend', () => el.classList.remove('btn-pulse'), { once: true });
}

// ── Screen flash (very subtle full-viewport tint for big events) ──────────────

export function screenFlash(severity: 'good' | 'bad' | 'chaos'): void {
  const el = document.getElementById('screen-flash');
  if (!el) return;
  el.className = ''; // reset
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.className = `sf-active sf-${severity}`;
    });
  });
  el.addEventListener('animationend', () => { el.className = ''; }, { once: true });
}

// ── Row shake (brief horizontal jitter for a crashing asset) ─────────────────

export function shakeElement(el: HTMLElement): void {
  el.classList.remove('row-shake');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('row-shake'));
  });
  el.addEventListener('animationend', () => el.classList.remove('row-shake'), { once: true });
}

// ── Row background sweep on significant price move ────────────────────────────

export function sweepRow(el: HTMLElement, dir: 'up' | 'down'): void {
  const cls = dir === 'up' ? 'row-sweep-up' : 'row-sweep-down';
  el.classList.remove('row-sweep-up', 'row-sweep-down');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add(cls));
  });
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

// ── Buy particle burst (+ symbols float up from button) ───────────────────────

export function spawnBuyParticles(anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top;
  ['+', '$', '+', '✓'].forEach((sym, i) => {
    const el = document.createElement('div');
    el.className = 'buy-particle';
    el.textContent = sym;
    el.style.left  = `${cx + (i - 1.5) * 14}px`;
    el.style.top   = `${cy}px`;
    el.style.animationDelay = `${i * 35}ms`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  });
}

// ── Screen shake (CSS keyframe on #app — no layout thrash) ───────────────────

export function screenShake(intensity: 'light' | 'heavy' = 'light'): void {
  const app = document.getElementById('app');
  if (!app) return;
  const cls = `app-shake-${intensity}`;
  app.classList.remove('app-shake-light', 'app-shake-heavy');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => app.classList.add(cls));
  });
  app.addEventListener('animationend', () => app.classList.remove(cls), { once: true });
}

// ── Cash delta float near a stat element (header) ────────────────────────────

export function spawnCashDelta(anchor: HTMLElement, amount: number): void {
  const rect = anchor.getBoundingClientRect();
  const el   = document.createElement('div');
  el.className   = `float-text float-${amount >= 0 ? 'up' : 'down'} float-cash`;
  el.textContent = amount >= 0
    ? `+$${Math.abs(amount).toFixed(0)}`
    : `-$${Math.abs(amount).toFixed(0)}`;
  el.style.left = `${rect.right + 6}px`;
  el.style.top  = `${rect.top}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}
