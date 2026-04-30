import type { Asset } from '../core/Asset.ts';
import type { Player } from '../core/Player.ts';
import { createEl, formatCurrency } from './components.ts';
import { pulseElement, spawnBuyParticles } from './animations.ts';

export interface AssetRowCallbacks {
  onBuy: (id: string, qty: number) => void;
  onSell: (id: string, qty: number) => void;
  onBuyMax: (id: string) => void;
  onSellAll: (id: string) => void;
  onAddLimitOrder: (id: string, type: 'buy' | 'sell', price: number, qty: number) => void;
  onCancelLimitOrder: (id: string) => void;
  showToast: (msg: string, type: string) => void;
}

export interface AssetRowMutableState {
  openLimitOrderId: string | null;
}

export function buildAssetRow(
  asset: Asset,
  callbacks: AssetRowCallbacks,
  mutableState: AssetRowMutableState,
  storedPlayer: Player | null,
): HTMLElement {
  const row = createEl('div', 'asset-row');
  row.dataset.id = asset.id;

  const ticker = asset.id.replace(/_/g, '').slice(0, 4).toUpperCase();

  row.innerHTML = `
    <div class="asset-card-main">
      <div class="asset-left">
        <div class="asset-icon-wrap">${asset.emoji}</div>
        <div class="asset-info-compact">
          <div class="asset-name-row">
            <span class="asset-name">${asset.name}</span>
            <span class="asset-ticker">${ticker}</span>
            <span class="asset-trend hidden"></span>
          </div>
          <span class="asset-owned"></span>
        </div>
      </div>
      <div class="asset-sparkline"></div>
      <div class="asset-right">
        <div class="asset-price-col">
          <span class="asset-price">$0.00</span>
          <span class="asset-change green">+0.00%</span>
        </div>
        <div class="asset-decision-pill sig-wait">
          <span class="adp-signal">Wait</span>
          <span class="adp-reason">No clear trend</span>
        </div>
      </div>
    </div>
    <div class="asset-action-row">
      <div class="asset-qty-group">
        <button class="btn-qty btn-qty-dec">−</button>
        <input class="qty-input" type="number" min="1" value="1" />
        <button class="btn-qty btn-qty-inc">+</button>
      </div>
      <button class="btn btn-buy">Buy</button>
      <button class="btn btn-sell">Sell</button>
      <button class="btn btn-max btn-sm">Max (0)</button>
      <button class="btn btn-sell-all btn-sm">All (0)</button>
      <button class="btn-detail btn-icon" title="More details">⋯</button>
    </div>
    <div class="asset-detail-panel hidden">
      <div class="adp-hype-section">
        <div class="hype-bar-track">
          <div class="hype-bar-fill hype-fill-cold" style="width:0%"></div>
        </div>
        <span class="hype-bar-label">HYPE 0%</span>
        <span class="asset-timing tw-neutral">⏳ WATCHING</span>
      </div>
      <div class="asset-tags"></div>
      <div class="asset-story"></div>
      <div class="asset-news-line hidden"></div>
      <div class="adp-footer">
        <button class="btn-analyse btn-ghost-sm btn-sm">🔍 Analyse</button>
        <button class="btn-orders btn-ghost-sm btn-sm">📋 Orders</button>
      </div>
      <div class="limit-order-panel hidden" data-lo-panel="${asset.id}">
        <div class="lo-form-row">
          <select class="lo-type">
            <option value="buy">Buy if ≤</option>
            <option value="sell">Sell if ≥</option>
          </select>
          <span class="lo-dollar">$</span>
          <input class="lo-price" type="number" min="0.01" step="0.01" placeholder="price" />
          <span class="lo-x">×</span>
          <input class="lo-qty" type="number" min="1" step="1" value="1" placeholder="qty" />
          <button class="btn btn-sm lo-set">Set Order</button>
        </div>
        <div class="lo-active-orders" data-lo-list="${asset.id}"></div>
      </div>
    </div>
  `;

  const qtyInput = row.querySelector('.qty-input') as HTMLInputElement;
  row.querySelector('.btn-qty-dec')!.addEventListener('click', () => {
    const v = parseInt(qtyInput.value, 10);
    if (v > 1) qtyInput.value = String(v - 1);
  });
  row.querySelector('.btn-qty-inc')!.addEventListener('click', () => {
    const v = parseInt(qtyInput.value, 10);
    qtyInput.value = String(v + 1);
  });
  row.querySelector('.btn-buy')!.addEventListener('click', () => {
    const qty = parseInt(qtyInput.value, 10);
    if (qty > 0) {
      const buyBtn = row.querySelector('.btn-buy') as HTMLElement;
      pulseElement(buyBtn);
      spawnBuyParticles(buyBtn);
      callbacks.onBuy(asset.id, qty);
    }
  });
  row.querySelector('.btn-sell')!.addEventListener('click', () => {
    const qty = parseInt(qtyInput.value, 10);
    if (qty > 0) {
      pulseElement(row.querySelector('.btn-sell') as HTMLElement);
      callbacks.onSell(asset.id, qty);
    }
  });
  row.querySelector('.btn-max')!.addEventListener('click', () => {
    pulseElement(row.querySelector('.btn-max') as HTMLElement);
    callbacks.onBuyMax(asset.id);
  });
  row.querySelector('.btn-sell-all')!.addEventListener('click', () => {
    pulseElement(row.querySelector('.btn-sell-all') as HTMLElement);
    callbacks.onSellAll(asset.id);
  });
  row.querySelector('.btn-analyse')!.addEventListener('click', (e) => {
    e.stopPropagation();
    const ev = new CustomEvent('open-insight', { detail: asset.id, bubbles: true });
    row.dispatchEvent(ev);
  });
  row.querySelector('.btn-orders')!.addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = row.querySelector<HTMLElement>(`[data-lo-panel="${asset.id}"]`);
    if (!panel) return;
    const isOpen = !panel.classList.contains('hidden');
    if (isOpen) {
      panel.classList.add('hidden');
      mutableState.openLimitOrderId = null;
    } else {
      document.querySelectorAll<HTMLElement>('.limit-order-panel').forEach(p => p.classList.add('hidden'));
      panel.classList.remove('hidden');
      mutableState.openLimitOrderId = asset.id;
    }
  });
  row.querySelector('.btn-detail')!.addEventListener('click', (e) => {
    e.stopPropagation();
    const detailPanel = row.querySelector<HTMLElement>('.asset-detail-panel');
    if (!detailPanel) return;
    const nowOpen = detailPanel.classList.toggle('hidden') === false;
    (e.currentTarget as HTMLElement).textContent = nowOpen ? '✕' : '⋯';
  });
  row.querySelector('.lo-set')!.addEventListener('click', () => {
    const typeEl  = row.querySelector<HTMLSelectElement>('.lo-type')!;
    const priceEl = row.querySelector<HTMLInputElement>('.lo-price')!;
    const qtyEl   = row.querySelector<HTMLInputElement>('.lo-qty')!;
    const type  = typeEl.value as 'buy' | 'sell';
    const price = parseFloat(priceEl.value);
    const qty   = parseInt(qtyEl.value, 10);
    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) {
      callbacks.showToast('Invalid order — enter a valid price and quantity.', 'error');
      return;
    }
    callbacks.onAddLimitOrder(asset.id, type, price, qty);
    priceEl.value = '';
    qtyEl.value = '1';
  });

  return row;
}
