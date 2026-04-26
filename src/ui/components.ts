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

// ── Momentum arrow ────────────────────────────────────────────────────────────

export function getMomentumArrow(momentum: number): string {
  if (momentum > 0.025) return '↑↑';
  if (momentum > 0.006) return '↑';
  if (momentum < -0.025) return '↓↓';
  if (momentum < -0.006) return '↓';
  return '→';
}

// ── Insight panel text ────────────────────────────────────────────────────────
//
// Short AI-style read on the asset based on its current stats.
// Patterns are intentionally learnable: players who understand the signals
// will see these confirm their read, reinforcing the mental model.

export function getInsightText(asset: Asset): string {
  const { hype, momentum, stability, risk } = asset;

  if (hype > 0.75 && momentum > 0.015)
    return '🔥 Hype peak + rising momentum. Classic pump setup. Ride it, then exit fast.';
  if (hype > 0.70 && momentum < -0.01)
    return '⚠️ Overhyped with falling momentum. Pre-crash pattern. Consider selling.';
  if (hype > 0.55 && risk > 0.6)
    return '💣 High hype + extreme risk = maximum volatility. One bad event away from ruin.';

  if (stability > 0.70)
    return '🛡 Low noise, steady gains. Best for passive accumulation and crash hedging.';
  if (stability > 0.50 && momentum > 0)
    return '⚖️ Stable and rising. Less exciting, but consistent. Safe long-term hold.';

  if (risk > 0.80)
    return '🌋 Extreme risk. Sleeping volcano. Could +400% or -90% on any given tick.';
  if (risk > 0.65 && hype < 0.25)
    return '🎲 High risk, cold hype. Hidden potential — or just chaos waiting to erupt.';

  if (momentum > 0.025)
    return '🚀 Strong upward momentum. Trend continuation is likely. Classic momentum buy.';
  if (momentum > 0.010)
    return '📈 Rising momentum. Moderate trend forming. Monitor for acceleration.';
  if (momentum < -0.025)
    return '📉 Steep decline in progress. Strong negative momentum. Do not catch this knife.';
  if (momentum < -0.010)
    return '↘️ Negative momentum building. Could reverse or continue dropping.';

  if (hype > 0.50 && stability < 0.25)
    return '💣 Hyped but fragile. One bad event and this craters hard.';
  if (hype < 0.15 && stability > 0.40 && risk < 0.30)
    return '💎 Cold hype, solid foundation, low risk. Value investor territory.';

  return '📊 Mixed signals. No clear edge right now. Watch for momentum or hype changes.';
}

// ── Trade feedback ────────────────────────────────────────────────────────────

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
