import type { SocialPost, SocialComment } from '../systems/SocialPost.ts';
import { PLATFORM_META, POST_TYPE_META } from '../systems/SocialPost.ts';

export interface FeedCallbacks {
  onViralPost: (post: SocialPost) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5)    return 'just now';
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return 'a while ago';
}

// ── CommentBubble ─────────────────────────────────────────────────────────────

class CommentBubble {
  static create(comment: SocialComment, isTop = false): HTMLElement {
    const el = document.createElement('div');
    el.className = [
      'sm-comment-row',
      `sm-comment-${comment.type}`,
      isTop ? 'sm-comment-top-pin' : '',
    ].filter(Boolean).join(' ');
    el.dataset.commentId = comment.id;
    el.dataset.created   = String(comment.createdAt);

    const topBadge = isTop
      ? `<span class="sm-top-label">⭐ Top Comment</span>`
      : '';

    const effectHtml = comment.effect
      ? `<span class="sm-effect-tag sm-effect-${comment.effect.hype != null ? 'hype' : 'heat'}" data-auto-hide>
           ${comment.effect.hype != null ? `+${comment.effect.hype} hype` : `+${comment.effect.heat} heat`}
         </span>`
      : '';

    el.innerHTML = `
      <div class="sm-comment-avatar-wrap">
        <span class="sm-comment-avatar">${esc(comment.avatar)}</span>
      </div>
      <div class="sm-comment-body">
        ${topBadge}
        <div class="sm-comment-header">
          <span class="sm-comment-username">@${esc(comment.username)}</span>
          <time class="sm-comment-ts">${relativeTime(comment.createdAt)}</time>
        </div>
        <div class="sm-comment-text">${esc(comment.text)}</div>
        ${effectHtml ? `<div class="sm-comment-footer">${effectHtml}</div>` : ''}
      </div>`;

    if (comment.effect) {
      const badge = el.querySelector<HTMLElement>('[data-auto-hide]');
      if (badge) setTimeout(() => badge.classList.add('sm-effect-hidden'), 2200);
    }

    return el;
  }
}

// ── CommentList ───────────────────────────────────────────────────────────────

const MAX_BODY = 6; // max non-pinned comments visible

class CommentList {
  private el:       HTMLElement;
  private rendered  = new Set<string>();
  private topId:    string | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  sync(comments: SocialComment[], isViral: boolean): void {
    this.el.classList.toggle('sm-list-viral', isViral);

    let added = false;
    for (const c of comments) {
      if (this.rendered.has(c.id)) continue;
      this.rendered.add(c.id);
      this._insert(c);
      added = true;
    }

    if (added) this._trim();
    this._refreshTimestamps();
  }

  private _insert(c: SocialComment): void {
    const isTop = this.topId === null && c.type !== 'negative';
    if (isTop) this.topId = c.id;

    const bubble = CommentBubble.create(c, isTop);

    if (isTop) {
      this.el.prepend(bubble);
    } else {
      this.el.appendChild(bubble);
    }
  }

  private _trim(): void {
    const nonPinned = [
      ...this.el.querySelectorAll<HTMLElement>('.sm-comment-row:not(.sm-comment-top-pin)'),
    ];
    while (nonPinned.length > MAX_BODY) {
      nonPinned.shift()?.remove();
    }
  }

  private _refreshTimestamps(): void {
    this.el.querySelectorAll<HTMLElement>('.sm-comment-ts').forEach(el => {
      const row     = el.closest<HTMLElement>('[data-created]');
      const created = Number(row?.dataset.created ?? 0);
      if (created) el.textContent = relativeTime(created);
    });
  }
}

// ── SocialFeed ────────────────────────────────────────────────────────────────

export class SocialFeed {
  private container: HTMLElement | null = null;
  private cb:        FeedCallbacks;
  private rendered   = new Set<string>();
  private lists      = new Map<string, CommentList>();

  constructor(cb: FeedCallbacks) {
    this.cb = cb;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = `<div class="sm-feed-empty" id="sm-feed-empty">no posts yet — create your first post above.</div>`;
  }

  update(posts: SocialPost[]): void {
    if (!this.container) return;

    const empty = document.getElementById('sm-feed-empty');
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
      this.lists.get(post.id)?.sync(post.liveComments, post.outcome === 'viral' && !post.settled);
    }
  }

  private _addCard(post: SocialPost): void {
    const c   = this.container!;
    const pm  = PLATFORM_META[post.platform];
    const ptm = POST_TYPE_META[post.postType];

    const card = document.createElement('div');
    card.className      = `sm-post-card sm-post-outcome-${post.outcome}`;
    card.dataset.postId = post.id;
    card.innerHTML = `
      <div class="sm-post-header">
        <span class="sm-post-platform" style="color:${pm.color}">${pm.icon} ${pm.label}</span>
        <span class="sm-post-type">${ptm.icon} ${ptm.label}</span>
        <span class="sm-post-badge sm-badge-growing" id="badge-${post.id}">POSTING…</span>
      </div>
      <div class="sm-post-text">${esc(post.text)}</div>
      <div class="sm-post-stats">
        <span class="sm-stat-item">❤️ <span id="likes-${post.id}">0</span></span>
        <span class="sm-stat-item">🔁 <span id="reposts-${post.id}">0</span></span>
        <span class="sm-stat-item">💬 <span id="comments-${post.id}">0</span></span>
      </div>
      <div class="sm-post-impact">
        <span class="sm-impact-hype-tag" id="hype-tag-${post.id}">+0.0 hype</span>
        <span class="sm-impact-risk-tag">+${post.riskAdded} heat</span>
        ${post.crowdAmount > 0 ? `<span class="sm-impact-crowd-tag" id="crowd-tag-${post.id}">…</span>` : ''}
      </div>
      <div class="sm-comment-section" id="comments-list-${post.id}"></div>`;

    c.prepend(card);

    const listEl = card.querySelector<HTMLElement>('.sm-comment-section')!;
    this.lists.set(post.id, new CommentList(listEl));
  }

  private _refreshCard(post: SocialPost): void {
    const get = (id: string) => document.getElementById(id);

    const likesEl    = get(`likes-${post.id}`);
    const repostsEl  = get(`reposts-${post.id}`);
    const commentsEl = get(`comments-${post.id}`);
    const hypeTag    = get(`hype-tag-${post.id}`);
    const crowdTag   = get(`crowd-tag-${post.id}`);
    const badge      = get(`badge-${post.id}`);
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
}
