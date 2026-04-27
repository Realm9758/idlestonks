import type { SocialPlatform, SocialPostType } from '../systems/SocialPost.ts';
import { PLATFORM_META, POST_TYPE_META, POST_TEXTS, getPostImpactPreview } from '../systems/SocialPost.ts';

export interface ComposerCallbacks {
  onPublish:      (platform: SocialPlatform, postType: SocialPostType, text: string) => void;
  canPost:        () => boolean;
  getCooldown:    () => number;
  getPostsToday:  () => number;
  maxPostsPerDay: number;
}

export class PostComposer {
  private cb:               ComposerCallbacks;
  private selectedPlatform: SocialPlatform = 'ChirpNet';
  private selectedType:     SocialPostType  = 'hype';
  private container:        HTMLElement | null = null;

  constructor(cb: ComposerCallbacks) {
    this.cb = cb;
  }

  mount(container: HTMLElement): void {
    this.container  = container;
    container.innerHTML = this._buildHtml();
    this._wireEvents();
    this._updatePreview();
  }

  updateDisplay(cooldown: number, postsToday: number, canPost: boolean): void {
    if (!this.container) return;
    const btn     = this.container.querySelector<HTMLButtonElement>('#sm-publish-btn');
    const counter = this.container.querySelector<HTMLElement>('#sm-posts-counter');
    const cdBar   = this.container.querySelector<HTMLElement>('#sm-cooldown-bar');
    const cdText  = this.container.querySelector<HTMLElement>('#sm-cooldown-text');

    if (counter) counter.textContent = `${postsToday} / ${this.cb.maxPostsPerDay} today`;
    if (btn)     btn.disabled = !canPost;
    if (cdBar && cdText) {
      if (cooldown > 0) {
        cdBar.style.display = 'flex';
        cdText.textContent  = `cooldown: ${cooldown}s`;
      } else {
        cdBar.style.display = 'none';
      }
    }
  }

  private _buildHtml(): string {
    const platforms = (Object.keys(PLATFORM_META) as SocialPlatform[]).map(id => {
      const m = PLATFORM_META[id];
      return `<button class="sm-platform-btn${id === this.selectedPlatform ? ' active' : ''}" data-platform="${id}">${m.icon} ${m.label}</button>`;
    }).join('');

    const types = (Object.keys(POST_TYPE_META) as SocialPostType[]).map(id => {
      const m = POST_TYPE_META[id];
      return `<button class="sm-type-btn${id === this.selectedType ? ' active' : ''}" data-ptype="${id}">${m.icon} ${m.label}</button>`;
    }).join('');

    const defaultText = POST_TEXTS[this.selectedPlatform][this.selectedType][0];

    return `
<div class="sm-composer">
  <div class="sm-composer-header">
    <span class="sm-composer-title">📝 CREATE POST</span>
    <span class="sm-posts-counter" id="sm-posts-counter">0 / ${this.cb.maxPostsPerDay} today</span>
  </div>
  <div class="sm-platform-row" id="sm-platform-row">${platforms}</div>
  <div class="sm-type-row" id="sm-type-row">${types}</div>
  <textarea class="sm-text-input" id="sm-text-input" maxlength="280" spellcheck="false">${defaultText}</textarea>
  <div class="sm-composer-footer">
    <div class="sm-impact-preview" id="sm-impact-preview">
      <span class="sm-impact-item sm-impact-hype" id="sm-impact-hype">+? hype</span>
      <span class="sm-impact-item sm-impact-risk" id="sm-impact-risk">+? risk</span>
      <span class="sm-impact-item sm-impact-viral" id="sm-impact-viral">?% viral</span>
    </div>
    <button class="sm-publish-btn" id="sm-publish-btn">📤 POST</button>
  </div>
  <div class="sm-cooldown-bar" id="sm-cooldown-bar" style="display:none">
    <span class="sm-cooldown-text" id="sm-cooldown-text">cooldown: 20s</span>
  </div>
</div>`;
  }

  private _wireEvents(): void {
    const c = this.container!;

    c.querySelector('#sm-platform-row')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-platform]');
      if (!btn) return;
      this.selectedPlatform = btn.dataset.platform as SocialPlatform;
      c.querySelectorAll('.sm-platform-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this._refreshText();
      this._updatePreview();
    });

    c.querySelector('#sm-type-row')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-ptype]');
      if (!btn) return;
      this.selectedType = btn.dataset.ptype as SocialPostType;
      c.querySelectorAll('.sm-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this._refreshText();
      this._updatePreview();
    });

    c.querySelector('#sm-publish-btn')?.addEventListener('click', () => {
      if (!this.cb.canPost()) return;
      const text = (c.querySelector<HTMLTextAreaElement>('#sm-text-input'))?.value?.trim() ?? '';
      if (!text) return;
      this.cb.onPublish(this.selectedPlatform, this.selectedType, text);
      this._refreshText();
    });
  }

  private _refreshText(): void {
    const texts = POST_TEXTS[this.selectedPlatform][this.selectedType];
    const ta    = this.container?.querySelector<HTMLTextAreaElement>('#sm-text-input');
    if (ta) ta.value = texts[Math.floor(Math.random() * texts.length)];
  }

  private _updatePreview(): void {
    const p     = getPostImpactPreview(this.selectedPlatform, this.selectedType);
    const hype  = this.container?.querySelector('#sm-impact-hype');
    const risk  = this.container?.querySelector('#sm-impact-risk');
    const viral = this.container?.querySelector('#sm-impact-viral');
    if (hype)  hype.textContent  = `+${p.hype} hype`;
    if (risk)  risk.textContent  = `+${p.risk} risk`;
    if (viral) viral.textContent = `${p.viralChance}% viral`;
  }
}
