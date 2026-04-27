import type { SocialPost } from '../systems/SocialPost.ts';
import { PLATFORM_META, POST_TYPE_META } from '../systems/SocialPost.ts';

export interface FeedCallbacks {
  onViralPost: (post: SocialPost) => void;
}

export class SocialFeed {
  private container: HTMLElement | null = null;
  private cb:        FeedCallbacks;
  private rendered = new Set<string>();

  constructor(cb: FeedCallbacks) {
    this.cb = cb;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = `<div class="sm-feed-empty" id="sm-feed-empty">no posts yet — create your first post above.</div>`;
  }

  update(posts: SocialPost[]): void {
    if (!this.container) return;

    const empty = document.getElementById('sm-feed-empty') as HTMLElement | null;
    if (posts.length === 0) {
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    for (const post of posts) {
      if (!this.rendered.has(post.id)) {
        this.rendered.add(post.id);
        this._addCard(post);
        if (post.outcome === 'viral' && !post.viralNotified) {
          post.viralNotified = true;
          setTimeout(() => this.cb.onViralPost(post), 2800);
        }
      }
      this._refreshCard(post);
    }
  }

  private _addCard(post: SocialPost): void {
    const c   = this.container!;
    const pm  = PLATFORM_META[post.platform];
    const ptm = POST_TYPE_META[post.postType];

    const card = document.createElement('div');
    card.className       = `sm-post-card sm-post-outcome-${post.outcome}`;
    card.dataset.postId  = post.id;
    card.innerHTML = `
      <div class="sm-post-header">
        <span class="sm-post-platform" style="color:${pm.color}">${pm.icon} ${pm.label}</span>
        <span class="sm-post-type">${ptm.icon} ${ptm.label}</span>
        <span class="sm-post-badge sm-badge-growing" id="badge-${post.id}">POSTING…</span>
      </div>
      <div class="sm-post-text">${this._esc(post.text)}</div>
      <div class="sm-post-stats">
        <span class="sm-stat-item">❤️ <span id="likes-${post.id}">0</span></span>
        <span class="sm-stat-item">🔁 <span id="reposts-${post.id}">0</span></span>
        <span class="sm-stat-item">💬 <span id="comments-${post.id}">0</span></span>
      </div>
      <div class="sm-post-impact">
        <span class="sm-impact-hype-tag" id="hype-tag-${post.id}">+0.0 hype</span>
        <span class="sm-impact-risk-tag">+${post.riskAdded} risk</span>
        ${post.crowdAmount > 0 ? `<span class="sm-impact-crowd-tag" id="crowd-tag-${post.id}">…</span>` : ''}
      </div>`;

    c.prepend(card);
  }

  private _refreshCard(post: SocialPost): void {
    const likesEl    = document.getElementById(`likes-${post.id}`);
    const repostsEl  = document.getElementById(`reposts-${post.id}`);
    const commentsEl = document.getElementById(`comments-${post.id}`);
    const hypeTag    = document.getElementById(`hype-tag-${post.id}`);
    const crowdTag   = document.getElementById(`crowd-tag-${post.id}`);
    const badge      = document.getElementById(`badge-${post.id}`);
    const card       = this.container?.querySelector<HTMLElement>(`[data-post-id="${post.id}"]`);

    if (likesEl)    likesEl.textContent    = this._fmt(post.likes);
    if (repostsEl)  repostsEl.textContent  = this._fmt(post.reposts);
    if (commentsEl) commentsEl.textContent = this._fmt(post.comments);
    if (hypeTag)    hypeTag.textContent    = `+${post.hypeApplied.toFixed(1)} hype`;

    if (post.settled) {
      if (badge) {
        badge.textContent = post.outcome.toUpperCase();
        badge.className   = `sm-post-badge sm-badge-${post.outcome}`;
      }
      if (crowdTag && post.crowdAmount > 0) {
        crowdTag.textContent = `+$${post.crowdAmount.toLocaleString()} crowd`;
        crowdTag.className   = 'sm-impact-crowd-tag sm-crowd-settled';
      }
      if (card && post.outcome === 'viral') {
        card.classList.add('sm-post-viral-glow');
      }
    }
  }

  private _fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  private _esc(t: string): string {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
