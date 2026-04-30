export const BM_PANEL_HTML = `
<div class="bm-panel-inner">

  <div class="bm-tab-bar">
    <button class="bm-nav-tab bm-nav-active" data-bm-tab="calls">📞 Calls</button>
    <button class="bm-nav-tab" data-bm-tab="social">📱 Social Media</button>
    <button class="bm-nav-tab" data-bm-tab="news">📰 News</button>
  </div>

  <div class="bm-tab-pane" id="bm-pane-calls">
    <div class="bm-layout">

      <!-- LEFT: COMMS -->
      <div class="bm-chat-col">
        <div class="bm-chat-header">
          <div class="bm-chat-contact-row">
            <span class="bm-contact-dot">●</span>
            <span class="bm-contact-name">bro_crypto</span>
          </div>
          <span class="bm-contact-status">online · e2e encrypted</span>
        </div>
        <div id="bm-chat-messages" class="bm-chat-messages"></div>
      </div>

      <!-- CENTER: OPERATIONS -->
      <div class="bm-ops-col">
        <div class="bm-stock-card">
          <div class="bm-stock-header">
            <div class="bm-coin-meta">
              <span class="bm-coin-name">🌑 MoonCoin</span>
              <span class="bm-coin-tag">SYNTHETIC ASSET</span>
            </div>
            <div class="bm-coin-live-wrap">
              <span class="bm-live-dot"></span>
              <span class="bm-live-label">LIVE</span>
            </div>
          </div>
          <div id="bm-price" class="bm-price">$0.0100</div>
          <div class="bm-hype-row">
            <span class="bm-hype-label">HYPE</span>
            <div class="bm-hype-track"><div id="bm-hype-fill" class="bm-hype-fill" style="width:5%"></div></div>
            <span id="bm-hype-pct" class="bm-hype-pct">5%</span>
          </div>
          <div class="bm-invested-row">
            <span class="bm-invested-label">TOTAL POOL</span>
            <span id="bm-total-invested" class="bm-invested-val">$0</span>
          </div>

          <div class="bm-heat-inline">
            <div class="bm-heat-inline-top">
              <span class="bm-heat-inline-lbl">HEAT</span>
              <span id="bm-threat-badge" class="bm-threat-badge bm-threat-safe">SAFE</span>
              <span id="bm-risk-label" class="bm-risk-label">0%</span>
            </div>
            <div class="bm-heat-bar-wrap">
              <div id="bm-risk-fill" class="bm-heat-bar-fill risk-low" style="width:0%"></div>
            </div>
            <div id="bm-risk-warn" class="bm-risk-warn hidden">⚠️ CRITICAL — CASE RISK</div>
          </div>
        </div>

        <div class="bm-targets-hdr">
          <span>TARGETS</span>
          <span class="bm-targets-hint">tap to initiate call</span>
        </div>
        <div id="bm-customers" class="bm-customers"></div>

        <div id="bm-sec-sweep" class="bm-sec-sweep hidden">
          🔒 SEC SWEEP — RUG LOCKED <span id="bm-sweep-timer"></span>
        </div>

        <button id="btn-rug-pull" class="btn-rug-pull" disabled>
          <span class="rug-icon">💀</span>
          <span class="rug-text">EXECUTE RUG PULL</span>
        </button>

        <div class="bm-rivals-hdr">RIVAL OPERATORS</div>
        <div id="bm-rivals-list" class="bm-rivals-list"></div>
      </div>

      <!-- RIGHT: CASE & STATS -->
      <div class="bm-risk-col">

        <div id="bm-case-block" class="bm-case-block hidden">
          <div class="bm-case-block-title">🔍 UNDER INVESTIGATION</div>
          <div id="bm-case-detail" class="hidden">
            <div class="bm-case-prog-row">
              <span class="bm-case-lbl">CASE PROGRESS</span>
              <span id="bm-case-pct" class="bm-case-pct">0%</span>
            </div>
            <div class="bm-case-track">
              <div id="bm-case-fill" class="bm-case-fill" style="width:0%"></div>
            </div>
          </div>
        </div>

        <div class="bm-divider"></div>

        <div class="bm-stat-row">
          <span class="bm-stat-lbl">CALLS TODAY</span>
          <span id="bm-calls-today" class="bm-stat-val">0 / 5</span>
        </div>
        <div class="bm-stat-row">
          <span class="bm-stat-lbl">COOLDOWN</span>
          <span id="bm-cooldown" class="bm-stat-val">—</span>
        </div>
        <div class="bm-stat-row">
          <span class="bm-stat-lbl">TOTAL PROFIT</span>
          <span id="bm-profit" class="bm-stat-val bm-neon-green">$0</span>
        </div>
        <div class="bm-stat-row">
          <span class="bm-stat-lbl">RUG PULLS</span>
          <span id="bm-rug-count" class="bm-stat-val">0</span>
        </div>

        <div id="bm-suspended-notice" class="bm-suspended-notice hidden">
          🚫 SUSPENDED<br>
          <span id="bm-lock-days" class="bm-lock-days">—</span>
        </div>

        <button id="btn-lay-low" class="btn-lay-low" disabled>
          🤫 Lay Low
          <span class="lay-low-sub">−30 heat · 1 day lock</span>
        </button>
      </div>

    </div>
  </div>

  <div class="bm-tab-pane hidden" id="bm-pane-social">
    <div id="sm-panel-mount" style="flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden"></div>
  </div>

  <div class="bm-tab-pane hidden" id="bm-pane-news">
    <div id="nm-panel" class="nm-panel"></div>
  </div>

</div>`;

export const BM_FIXED_HTML = {
  banner: `
    <div class="bbn-inner">
      <span class="bbn-live">📺 BREAKING</span>
      <span id="bbn-headline" class="bbn-headline"></span>
      <span id="bbn-result" class="bbn-result"></span>
    </div>`,
  notif: `<span class="bm-notif-ping"></span>📱 New Message`,
  messenger: `
    <div class="bm-messenger">
      <div class="bm-messenger-hdr">
        <div class="bm-messenger-contact">
          <span class="bm-contact-dot">●</span>
          <span>bro_crypto</span>
        </div>
        <button id="bm-messenger-close" class="btn-icon" style="color:#555">✕</button>
      </div>
      <div id="bm-messenger-msgs" class="bm-messenger-msgs"></div>
      <div id="bm-messenger-footer" class="bm-messenger-footer hidden">
        <button id="bm-messenger-open" class="bm-btn-open-mkt">🕵️ Open Black Market</button>
      </div>
    </div>`,
  callOverlay: `
    <div class="bm-call-screen">
      <div class="bm-call-header">
        <div class="bm-call-status-row">
          <div class="bm-call-dot"></div>
          <span class="bm-call-status-text" id="bm-call-status">CONNECTING...</span>
        </div>
        <div class="bm-call-customer-info">
          <span class="bm-call-avatar" id="bm-call-avatar"></span>
          <div>
            <div class="bm-call-customer-name" id="bm-call-name"></div>
            <div class="bm-call-customer-wealth" id="bm-call-wealth"></div>
          </div>
        </div>
        <div class="bm-conf-wrap">
          <span class="bm-conf-lbl">TRUST</span>
          <div class="bm-conf-track">
            <div id="bm-conf-fill" class="bm-conf-fill" style="width:35%"></div>
          </div>
          <span id="bm-conf-pct" class="bm-conf-pct">35%</span>
        </div>
      </div>
      <div id="bm-call-chat" class="bm-call-chat"></div>
      <div id="bm-call-choices" class="bm-call-choices"></div>
      <button id="bm-call-hangup" class="bm-call-hangup">📵 Hang Up</button>
    </div>`,
};
