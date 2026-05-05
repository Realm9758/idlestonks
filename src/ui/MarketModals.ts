import type {
  MarketDef,
  MarketAccessSystem,
  UnlockContext,
} from '../systems/MarketAccessSystem.ts';
import { RANK_NAMES } from '../systems/MarketAccessSystem.ts';
import type { Market } from '../core/Market.ts';

// ── Details Modal ─────────────────────────────────────────────────────────────
export function showMarketDetailsModal(
  m: MarketDef,
  ctx: UnlockContext,
  market: Market,
  masSys: MarketAccessSystem,
  onUnlock: (id: string) => void,
): void {
  closeMarketModals();

  const req = masSys.checkRequirements(m.id, ctx);
  const canAfford = req.ok && ctx.cash >= m.accessCost;

  const proList = m.pros.map(p => `<li class="md-pro">✓ ${p}</li>`).join('');
  const conList = m.cons.map(c => `<li class="md-con">✗ ${c}</li>`).join('');

  const allAssets = m.assetIds.map(id => {
    const a = market.getAsset(id);
    const name  = a?.name  ?? id.replace(/_/g, ' ');
    const emoji = a?.emoji ?? '·';
    const arch  = a?.archetype ?? '';
    const desc  = a?.description ?? '';
    return `
      <div class="md-asset-row">
        <span class="md-asset-emoji">${emoji}</span>
        <div class="md-asset-info">
          <div class="md-asset-head">
            <span class="md-asset-name">${name}</span>
            ${arch ? `<span class="md-asset-arch">${arch}</span>` : ''}
          </div>
          ${desc ? `<div class="md-asset-desc">${desc}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const reqChips = (() => {
    const reqRank = m.unlockRequirements.rank ?? 0;
    const reqNw   = m.unlockRequirements.netWorth ?? 0;
    const reqBM   = m.unlockRequirements.blackMarketUnlocked ?? false;
    const chips: string[] = [];
    if (reqRank > 0) {
      const met = ctx.rankIndex >= reqRank;
      chips.push(`<span class="md-req ${met ? 'req-met' : 'req-unmet'}">${met ? '✓' : '✗'} ${RANK_NAMES[reqRank]} rank</span>`);
    }
    if (reqNw > 0) {
      const met = ctx.netWorth >= reqNw;
      const label = met
        ? `$${reqNw.toLocaleString()} net worth`
        : `$${Math.round(ctx.netWorth).toLocaleString()} / $${reqNw.toLocaleString()}`;
      chips.push(`<span class="md-req ${met ? 'req-met' : 'req-unmet'}">${met ? '✓' : '✗'} ${label}</span>`);
    }
    if (reqBM) {
      const met = ctx.blackMarketUnlocked;
      chips.push(`<span class="md-req ${met ? 'req-met' : 'req-unmet'}">${met ? '✓' : '✗'} Black Market access</span>`);
    }
    if (chips.length === 0) chips.push(`<span class="md-req req-met">✓ No requirements</span>`);
    return chips.join('');
  })();

  let ctaHtml = '';
  if (m.unlocked) {
    ctaHtml = `<button class="btn md-btn-success" data-md-close>Close</button>`;
  } else if (canAfford) {
    ctaHtml = `
      <button class="btn md-btn-primary" data-md-unlock="${m.id}">🔓 Unlock for $${m.accessCost.toLocaleString()}</button>
      <button class="btn md-btn-ghost" data-md-close>Close</button>
    `;
  } else {
    const blocker = req.ok
      ? `Need $${(m.accessCost - ctx.cash).toLocaleString()} more`
      : (req.reason ?? 'Requirements not met');
    ctaHtml = `
      <button class="btn md-btn-locked" disabled>${blocker}</button>
      <button class="btn md-btn-ghost" data-md-close>Close</button>
    `;
  }

  const wrap = document.createElement('div');
  wrap.className = `md-overlay md-cat-${m.category}`;
  wrap.innerHTML = `
    <div class="md-backdrop" data-md-close></div>
    <div class="md-panel" role="dialog" aria-modal="true">
      <button class="md-close-x" data-md-close aria-label="Close">×</button>
      <div class="md-header">
        <span class="md-emoji">${m.emoji}</span>
        <div class="md-title-block">
          <div class="md-title">${m.name}</div>
          <div class="md-sub">
            <span class="md-tier">${m.tierLabel}</span>
            <span class="md-dot">·</span>
            <span>${m.recommendedFor}</span>
          </div>
        </div>
      </div>

      <div class="md-section">
        <p class="md-desc">${m.description}</p>
        <p class="md-why"><strong>Why unlock?</strong> ${m.whyUnlock}</p>
      </div>

      <div class="md-grid">
        <div class="md-block">
          <div class="md-block-title">Pros</div>
          <ul class="md-list">${proList}</ul>
        </div>
        <div class="md-block">
          <div class="md-block-title">Cons</div>
          <ul class="md-list">${conList}</ul>
        </div>
      </div>

      <div class="md-section">
        <div class="md-block-title">Requirements</div>
        <div class="md-reqs">${reqChips}</div>
      </div>

      <div class="md-section">
        <div class="md-block-title">Included Assets (${m.assetIds.length})</div>
        <div class="md-assets">${allAssets || '<div class="md-empty">No assets listed.</div>'}</div>
      </div>

      <div class="md-actions">${ctaHtml}</div>
    </div>
  `;

  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('md-visible'));

  const close = () => closeMarketModals();
  wrap.querySelectorAll('[data-md-close]').forEach(el => el.addEventListener('click', close));
  wrap.querySelectorAll<HTMLButtonElement>('[data-md-unlock]').forEach(btn =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.mdUnlock!;
      close();
      onUnlock(id);
    }),
  );
  document.addEventListener('keydown', escClose, { once: true });
}

function escClose(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMarketModals();
}

export function closeMarketModals(): void {
  document.querySelectorAll('.md-overlay').forEach(el => el.remove());
  document.querySelectorAll('.mu-celebration').forEach(el => el.remove());
}

// ── Unlock Celebration Modal ──────────────────────────────────────────────────
export function showMarketUnlockCelebration(m: MarketDef, market: Market): void {
  const previewAssets = m.assetIds.slice(0, 4).map(id => {
    const a = market.getAsset(id);
    const name  = a?.name  ?? id.replace(/_/g, ' ');
    const emoji = a?.emoji ?? '·';
    const arch  = a?.archetype ?? '';
    return `
      <div class="mu-asset">
        <span class="mu-asset-emoji">${emoji}</span>
        <div class="mu-asset-info">
          <div class="mu-asset-name">${name}</div>
          ${arch ? `<div class="mu-asset-arch">${arch}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  const moreCount = m.assetIds.length - 4;

  const wrap = document.createElement('div');
  wrap.className = `mu-celebration mu-cat-${m.category}`;
  wrap.innerHTML = `
    <div class="mu-backdrop" data-mu-close></div>
    <div class="mu-panel" role="dialog" aria-modal="true">
      <div class="mu-confetti"></div>
      <div class="mu-tag">🎉 New Market Unlocked</div>
      <div class="mu-emoji">${m.emoji}</div>
      <div class="mu-name">${m.name}</div>
      <div class="mu-tier">${m.tierLabel}</div>
      <p class="mu-desc">${m.whyUnlock}</p>

      <div class="mu-strategy">
        <span class="mu-strategy-label">Playstyle</span>
        <span class="mu-strategy-text">${m.strategySummary}</span>
      </div>

      <div class="mu-assets-section">
        <div class="mu-assets-title">${m.assetIds.length} new asset${m.assetIds.length === 1 ? '' : 's'} now tradeable</div>
        <div class="mu-assets-grid">
          ${previewAssets}
          ${moreCount > 0 ? `<div class="mu-asset mu-asset-more">+${moreCount} more</div>` : ''}
        </div>
      </div>

      <button class="btn mu-btn-primary" data-mu-close>Start Trading</button>
    </div>
  `;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('mu-visible'));

  const close = () => {
    wrap.classList.remove('mu-visible');
    setTimeout(() => wrap.remove(), 280);
  };
  wrap.querySelectorAll('[data-mu-close]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', function once(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', once); }
  });
}
