import type { Asset } from '../core/Asset.ts';

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1_000) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${value.toFixed(2)}`;
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function timeAgo(timestamp: number): string {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function getEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

export function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── Trade feedback ────────────────────────────────────────────────────────────
//
// Returns a short insight shown as a second toast when the player buys or sells.
// The goal: teach players what signals matter, without being preachy.

export function getTradeInsight(asset: Asset, action: 'buy' | 'sell'): string {
  if (action === 'buy') {
    if (asset.momentum > 0.02 && asset.hype > 0.5)
      return `📈 Buying into SURGING momentum + HIGH hype — could run further, but hype decays`;
    if (asset.momentum > 0.015)
      return `📈 Strong momentum behind ${asset.name} — trend continuation likely`;
    if (asset.hype > 0.7)
      return `🔥 Entering at PEAK HYPE — expect a spike, then watch for the crash`;
    if (asset.hype > 0.45)
      return `🔥 High hype adds upward pressure — ride it while it lasts`;
    if (asset.momentum < -0.015)
      return `📉 Catching a falling knife — momentum is negative. Brave or foolish?`;
    if (asset.stability > 0.65)
      return `🛡 Safe pick — high stability means softer crashes and steady growth`;
    if (asset.risk > 0.75)
      return `🎲 EXTREME risk asset — rare shocks incoming. Could moon or crater.`;
    if (asset.risk > 0.45)
      return `⚠️ High risk — expect irregular big moves. Size your position carefully.`;
    if (asset.momentum < -0.005)
      return `📉 Momentum is falling — could reverse, could keep dropping`;
    return `✅ Neutral entry — no strong signals either way`;
  } else {
    if (asset.hype > 0.65)
      return `💰 Selling at HIGH hype — good timing. Hype peaks don't last.`;
    if (asset.momentum > 0.02)
      return `⚠️ Selling into SURGING momentum — may leave gains on the table`;
    if (asset.momentum < -0.015)
      return `🛡 Cutting losses — momentum is deeply negative. Smart exit.`;
    if (asset.risk > 0.7)
      return `🎲 Taking profits on extreme-risk asset — always a reasonable call`;
    return `✅ Sold — check momentum and hype before re-entering`;
  }
}
