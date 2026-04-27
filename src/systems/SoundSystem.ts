// Web Audio API-based sound system. No audio files needed — all sounds are
// synthesised procedurally so there's nothing to preload or 404.

export type SoundId =
  | 'buy'
  | 'sell'
  | 'price_tick'
  | 'price_up'
  | 'price_down'
  | 'news_alert'
  | 'risk_warning'
  | 'profit'
  | 'loss'
  | 'message_notif'
  | 'phone_ring'
  | 'rank_up'
  | 'unlock'
  | 'call_connect'
  | 'call_hangup';

interface SoundSettings {
  masterVolume: number; // 0–1
  sfxVolume:    number; // 0–1
  muted:        boolean;
}

const SETTINGS_KEY = 'idlestonks_sound_v1';
const COOLDOWN_MS  = 80; // minimum ms between same sound

export class SoundSystem {
  private ctx: AudioContext | null = null;
  private settings: SoundSettings = { masterVolume: 0.5, sfxVolume: 0.8, muted: false };
  private lastPlayed = new Map<SoundId, number>();

  constructor() {
    this._loadSettings();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  play(id: SoundId): void {
    if (this.settings.muted) return;
    const now = Date.now();
    const last = this.lastPlayed.get(id) ?? 0;
    if (now - last < COOLDOWN_MS) return;
    this.lastPlayed.set(id, now);
    try {
      this._ensure();
      this._synthesise(id);
    } catch { /* AudioContext may be blocked before first user gesture */ }
  }

  get masterVolume(): number { return this.settings.masterVolume; }
  get sfxVolume():    number { return this.settings.sfxVolume; }
  get muted():       boolean { return this.settings.muted; }

  setMasterVolume(v: number): void { this.settings.masterVolume = Math.max(0, Math.min(1, v)); this._save(); }
  setSfxVolume(v: number):    void { this.settings.sfxVolume    = Math.max(0, Math.min(1, v)); this._save(); }
  toggleMute():               void { this.settings.muted = !this.settings.muted; this._save(); }

  // ── AudioContext bootstrap ─────────────────────────────────────────────────

  private _ensure(): void {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private _vol(): number {
    return this.settings.masterVolume * this.settings.sfxVolume;
  }

  // ── Master gain helper ─────────────────────────────────────────────────────

  private _gain(amount: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.value = amount * this._vol();
    g.connect(this.ctx!.destination);
    return g;
  }

  // ── Tone primitives ───────────────────────────────────────────────────────

  private _tone(
    freq: number, duration: number, gainAmt: number,
    type: OscillatorType = 'sine',
    attack = 0.005, release = 0.05,
    freqEnd?: number,
  ): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g   = this._gain(gainAmt);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gainAmt * this._vol(), now + attack);
    g.gain.setValueAtTime(gainAmt * this._vol(), now + duration - release);
    g.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(g);
    osc.start(now);
    osc.stop(now + duration);
  }

  private _noise(duration: number, gainAmt: number, lowpass: number): void {
    const ctx   = this.ctx!;
    const now   = ctx.currentTime;
    const buf   = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data  = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const filter = ctx.createBiquadFilter();
    filter.type  = 'lowpass';
    filter.frequency.value = lowpass;
    const g = this._gain(gainAmt);
    g.gain.setValueAtTime(gainAmt * this._vol(), now);
    g.gain.linearRampToValueAtTime(0, now + duration);
    src.connect(filter);
    filter.connect(g);
    src.start(now);
  }

  // ── Sound definitions ─────────────────────────────────────────────────────

  private _synthesise(id: SoundId): void {
    switch (id) {
      // Buy: two ascending tones — satisfying "coin in"
      case 'buy':
        this._tone(440, 0.07, 0.18, 'triangle');
        setTimeout(() => this._tone(660, 0.10, 0.22, 'triangle'), 60);
        break;

      // Sell: descending two-tone — "cashing out"
      case 'sell':
        this._tone(660, 0.07, 0.18, 'triangle');
        setTimeout(() => this._tone(440, 0.10, 0.20, 'triangle'), 60);
        break;

      // Price tick: ultra-subtle, different pitch per direction
      case 'price_tick':
        this._tone(880, 0.03, 0.04, 'sine');
        break;

      case 'price_up':
        this._tone(600, 0.05, 0.06, 'sine', 0.002, 0.04, 680);
        break;

      case 'price_down':
        this._tone(420, 0.05, 0.06, 'sine', 0.002, 0.04, 360);
        break;

      // News alert: bright ascending ding
      case 'news_alert':
        this._tone(880,  0.08, 0.20, 'sine');
        setTimeout(() => this._tone(1100, 0.12, 0.22, 'sine'), 80);
        setTimeout(() => this._tone(1320, 0.15, 0.18, 'sine'), 170);
        break;

      // Risk warning: low tension pulse
      case 'risk_warning':
        this._tone(160, 0.18, 0.25, 'sawtooth', 0.01, 0.10);
        setTimeout(() => this._tone(140, 0.20, 0.20, 'sawtooth', 0.01, 0.12), 200);
        break;

      // Profit: bright upward sweep + sparkle
      case 'profit':
        this._tone(520, 0.10, 0.18, 'triangle', 0.005, 0.07, 780);
        setTimeout(() => this._tone(1040, 0.12, 0.22, 'triangle'), 90);
        setTimeout(() => this._tone(1560, 0.08, 0.15, 'sine'), 190);
        break;

      // Loss: heavy downward thud
      case 'loss':
        this._tone(200, 0.20, 0.28, 'sawtooth', 0.005, 0.15, 80);
        this._noise(0.15, 0.08, 400);
        break;

      // Message notification: friendly ping
      case 'message_notif':
        this._tone(880, 0.06, 0.16, 'sine');
        setTimeout(() => this._tone(1100, 0.09, 0.14, 'sine'), 70);
        break;

      // Phone ring: classic brring-brring pattern
      case 'phone_ring':
        this._tone(480, 0.12, 0.22, 'square');
        setTimeout(() => this._tone(480, 0.12, 0.22, 'square'), 200);
        setTimeout(() => this._tone(380, 0.08, 0.14, 'square'), 420);
        break;

      // Rank up: triumphant ascending chord
      case 'rank_up':
        this._tone(523,  0.20, 0.20, 'triangle');
        setTimeout(() => this._tone(659,  0.20, 0.20, 'triangle'), 80);
        setTimeout(() => this._tone(784,  0.20, 0.20, 'triangle'), 160);
        setTimeout(() => this._tone(1046, 0.35, 0.25, 'triangle'), 260);
        break;

      // Unlock: magical shimmer
      case 'unlock':
        [0, 60, 120, 190, 270].forEach((delay, i) => {
          const freq = [660, 880, 1100, 1320, 1760][i];
          setTimeout(() => this._tone(freq, 0.18, 0.14 - i * 0.01, 'sine'), delay);
        });
        break;

      // Call connect: short connect chime
      case 'call_connect':
        this._tone(800, 0.08, 0.16, 'sine');
        setTimeout(() => this._tone(1000, 0.10, 0.16, 'sine'), 90);
        break;

      // Call hangup: short low-tone disconnect
      case 'call_hangup':
        this._tone(340, 0.12, 0.18, 'sine', 0.005, 0.08, 280);
        break;
    }
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  private _save(): void {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* noop */ }
  }

  private _loadSettings(): void {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<SoundSettings>;
      this.settings.masterVolume = d.masterVolume ?? 0.5;
      this.settings.sfxVolume    = d.sfxVolume    ?? 0.8;
      this.settings.muted        = d.muted        ?? false;
    } catch { /* noop */ }
  }
}
