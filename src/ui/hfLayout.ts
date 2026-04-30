export const HF_PANEL_HTML = `
<div class="hf-panel-inner">
  <div id="hf-alert-bar" class="hf-alert-bar hidden"></div>
  <div class="hf-layout">

    <div class="hf-chat-col">
      <div class="hf-chat-header">
        <div class="hf-chat-contact-row">
          <span class="hf-contact-dot">●</span>
          <span class="hf-contact-name">advisor_kate</span>
        </div>
        <span class="hf-contact-status">your analyst</span>
      </div>
      <div id="hf-chat-messages" class="hf-chat-messages"></div>
    </div>

    <div class="hf-ops-col">

      <div class="hf-fund-card">
        <div class="hf-fund-header">
          <span class="hf-fund-name">💼 YourFund Capital</span>
          <span class="hf-fund-tag">HEDGE FUND</span>
        </div>
        <div class="hf-fund-stats-row">
          <div class="hf-fstat">
            <span class="hf-fstat-label">CAPITAL</span>
            <span id="hf-aum" class="hf-fstat-val">$0</span>
          </div>
          <div class="hf-fstat">
            <span class="hf-fstat-label">7D RETURN</span>
            <span id="hf-perf" class="hf-fstat-val">—</span>
          </div>
          <div class="hf-fstat">
            <span class="hf-fstat-label">YOUR FEES</span>
            <span id="hf-fees" class="hf-fstat-val hf-gold">$0</span>
          </div>
        </div>

        <div class="hf-strategy">
          <div class="hf-strategy-lbl">STRATEGY MODE</div>
          <div class="hf-strat-btns">
            <button class="hf-strat-btn" data-strat="conservative">🛡 Conservative</button>
            <button class="hf-strat-btn hf-strat-active" data-strat="balanced">⚖️ Balanced</button>
            <button class="hf-strat-btn" data-strat="aggressive">⚡ Aggressive</button>
          </div>
          <div id="hf-strat-desc" class="hf-strat-desc">Balanced risk. Neutral effect on all investor types.</div>
        </div>

        <div class="hf-nav-chart-wrap">
          <div class="hf-nav-chart-label">14-DAY RETURNS</div>
          <div id="hf-nav-chart" class="hf-nav-chart"></div>
        </div>
      </div>

      <div class="hf-section-header">👥 Investors</div>
      <div id="hf-investors" class="hf-investors"></div>

      <div class="hf-section-header">📞 Recruit</div>
      <div id="hf-recruits" class="hf-recruits"></div>

      <div class="hf-section-header">🧑‍💼 Staff</div>
      <div class="hf-staff-grid">
        <div class="hf-staff-card" id="hf-staff-analyst-card">
          <span class="hf-staff-emoji">📊</span>
          <div class="hf-staff-body">
            <div class="hf-staff-name">Analyst</div>
            <div class="hf-staff-effect">+10% investor call success</div>
          </div>
          <button id="btn-hire-analyst" class="btn-hire-staff" data-cost="5000">$5,000</button>
        </div>
        <div class="hf-staff-card" id="hf-staff-lawyer-card">
          <span class="hf-staff-emoji">⚖️</span>
          <div class="hf-staff-body">
            <div class="hf-staff-name">Lawyer</div>
            <div class="hf-staff-effect">–40% reputation damage</div>
          </div>
          <button id="btn-hire-lawyer" class="btn-hire-staff" data-cost="15000">$15,000</button>
        </div>
      </div>

    </div>

    <div class="hf-stats-col">
      <div class="hf-rep-title">⭐ REPUTATION</div>
      <div class="hf-rep-meter-wrap">
        <div id="hf-rep-fill" class="hf-rep-fill rep-mid" style="height:50%"></div>
      </div>
      <div id="hf-rep-label" class="hf-rep-label">50</div>
      <div class="hf-rep-explanation">
        <div class="hf-rep-eff hf-rep-eff-good">↑ 70+ Investors call you</div>
        <div class="hf-rep-eff hf-rep-eff-mid">→ 40–70 Stable</div>
        <div class="hf-rep-eff hf-rep-eff-bad">↓ &lt;40 Withdrawals likely</div>
      </div>
      <div class="hf-divider"></div>
      <div class="hf-srow">
        <span class="hf-slbl">INVESTORS</span>
        <span id="hf-inv-count" class="hf-sval">0 / 5</span>
      </div>
      <div class="hf-srow">
        <span class="hf-slbl">CALLS TODAY</span>
        <span id="hf-calls-today" class="hf-sval">0 / 3</span>
      </div>
      <div class="hf-srow">
        <span class="hf-slbl">COOLDOWN</span>
        <span id="hf-cooldown" class="hf-sval">—</span>
      </div>
      <div id="hf-incoming-notice" class="hf-incoming-notice hidden">
        📞 INCOMING<br>
        <button id="btn-accept-call" class="btn-accept-call">Accept</button>
        <button id="btn-decline-call" class="btn-decline-call">Decline</button>
      </div>
    </div>

  </div>
</div>`;

export const HF_FIXED_HTML = {
  notif: `<span class="hf-notif-ping"></span>📱 New Message`,
  messenger: `
    <div class="hf-messenger">
      <div class="hf-messenger-hdr">
        <div class="hf-messenger-contact">
          <span class="hf-contact-dot">●</span>
          <span>advisor_kate</span>
        </div>
        <button id="hf-messenger-close" class="btn-icon" style="color:#555">✕</button>
      </div>
      <div id="hf-messenger-msgs" class="hf-messenger-msgs"></div>
      <div id="hf-messenger-footer" class="hf-messenger-footer hidden">
        <button id="hf-messenger-open" class="hf-btn-open">💼 Open Hedge Fund</button>
      </div>
    </div>`,
  callOverlay: `
    <div class="hf-call-screen">
      <div class="hf-call-header">
        <div class="hf-call-status-row">
          <div class="hf-call-dot"></div>
          <span id="hf-call-status" class="hf-call-status-text">CONNECTING...</span>
        </div>
        <div class="hf-call-info">
          <span id="hf-call-avatar" class="hf-call-avatar"></span>
          <div>
            <div id="hf-call-name" class="hf-call-name"></div>
            <div id="hf-call-type" class="hf-call-type"></div>
          </div>
        </div>
      </div>
      <div id="hf-call-chat"    class="hf-call-chat"></div>
      <div id="hf-call-choices" class="hf-call-choices"></div>
      <button id="hf-call-hangup" class="hf-call-hangup">📵 Hang Up</button>
    </div>`,
};
