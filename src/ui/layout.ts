export const LAYOUT_HTML = `
<div id="app">
  <header id="header">
    <div class="header-left">
      <div class="logo">
        <span class="logo-icon">📈</span>
        <div class="logo-text">
          <span class="logo-title">IdleStonks</span>
          <span class="logo-sub">Meme Market Simulator</span>
        </div>
      </div>
    </div>
    <div class="header-stats">
      <div class="stat-block">
        <span class="stat-label">📅 Day</span>
        <span id="stat-day" class="stat-value">1</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">💵 Cash</span>
        <span id="stat-cash" class="stat-value">$1,000</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">💼 Portfolio</span>
        <span id="stat-portfolio" class="stat-value">$0</span>
      </div>
      <div class="stat-block stat-block-highlight">
        <span class="stat-label">📊 Net Worth</span>
        <span id="stat-networth" class="stat-value stat-networth">$1,000</span>
      </div>
      <div class="stat-block rank-block">
        <div class="rank-top-row">
          <span class="stat-label">🏆 Rank</span>
          <span id="stat-rank" class="rank-val">📊 Rookie Trader</span>
        </div>
        <div class="rank-progress-row">
          <div class="rank-progress-wrap">
            <div id="rank-progress-fill" class="rank-progress-fill" style="width:0%"></div>
          </div>
          <span id="rank-next-name" class="rank-next-label"></span>
        </div>
        <div id="rank-unlock-hint" class="rank-unlock-hint"></div>
      </div>
      <div class="stat-block prestige-block hidden" id="prestige-block">
        <span class="stat-label">⭐ Multiplier</span>
        <span id="stat-multiplier" class="stat-value gold">×1</span>
      </div>
      <div class="stat-block hidden" id="streak-block">
        <span class="stat-label">🔥 Streak</span>
        <span id="stat-streak" class="stat-value streak-val">0×</span>
      </div>
    </div>
    <div class="header-actions">
      <button id="btn-intel" class="btn btn-intel">📊 Market Intel</button>
      <button id="btn-sound" class="btn-icon" title="Sound settings">🔊</button>
      <button id="btn-dark" class="btn-icon" title="Toggle dark mode">🌙</button>
    </div>
    <div id="sound-panel" class="sound-panel hidden">
      <div class="sp-row">
        <button id="sp-mute" class="btn btn-ghost-sm sp-mute-btn">🔊 Muted: OFF</button>
      </div>
      <div class="sp-row">
        <label class="sp-label">Master</label>
        <input id="sp-master" type="range" min="0" max="1" step="0.05" value="0.5" class="sp-slider" />
        <span id="sp-master-val" class="sp-val">50%</span>
      </div>
      <div class="sp-row">
        <label class="sp-label">SFX</label>
        <input id="sp-sfx" type="range" min="0" max="1" step="0.05" value="0.8" class="sp-slider" />
        <span id="sp-sfx-val" class="sp-val">80%</span>
      </div>
    </div>
  </header>

  <div id="tab-bar">
    <div class="tab-bar-left">
      <button class="tab-btn tab-active" data-tab="main">📊 Market</button>
      <button class="tab-btn" data-tab="upgrades">⬆️ Upgrades</button>
      <button class="tab-btn" data-tab="missions">🎯 Missions</button>
      <button class="tab-btn tab-locked" data-tab="bm" id="tab-bm">🔒 Classified</button>
      <button class="tab-btn tab-locked hidden" data-tab="hf" id="tab-hf">💼 Hedge Fund</button>
    </div>
    <div class="tab-bar-actions" id="tab-action-btns">
      <button id="btn-yolo" class="btn btn-tab-yolo">🎲 YOLO</button>
      <button id="btn-stabilise" class="btn btn-tab-stabilise">🎚️ Stabilise <span class="cost-badge">$500</span></button>
      <button id="btn-manipulate" class="btn btn-tab-manipulate">🕹️ Manipulate <span class="cost-badge">$1,000</span></button>
    </div>
  </div>

  <div id="ticker-bar">
    <span class="ticker-dot"></span>
    <span class="ticker-label">BREAKING</span>
    <div class="ticker-wrap"><span id="ticker-text"></span></div>
  </div>

  <div id="toast-area"></div>
  <div id="event-popup-area"></div>
  <div id="screen-flash"></div>
  <div id="rank-up-popup">
    <div class="rankup-label">🎖 RANK UP</div>
    <div id="rankup-emoji" class="rankup-emoji"></div>
    <div id="rankup-name"  class="rankup-name"></div>
    <div id="rankup-next"  class="rankup-next"></div>
  </div>

  <div id="main-grid">
    <div id="market-panel" class="panel">
      <div class="panel-header">
        <h2>Available Stonks</h2>
        <span id="market-asset-count" class="panel-sub"></span>
      </div>
      <div id="fear-greed-bar" class="fear-greed-bar-compact">
        <span class="fg-label-compact">Sentiment</span>
        <div class="fg-track-compact">
          <div id="fg-fill" class="fg-fill-compact" style="width:50%"></div>
        </div>
        <span id="fg-zone" class="fg-zone fg-neutral">NEUTRAL · 50</span>
      </div>
      <div id="market-opportunity-bar" class="opportunity-bar hidden">
        <div class="opp-header-row">
          <span class="opp-header-label">⭐ Best Opportunities</span>
        </div>
        <div id="opp-cards" class="opp-cards"></div>
      </div>
      <div id="asset-list"></div>
    </div>

    <div id="right-column">
      <div id="portfolio-panel" class="panel">
        <div class="panel-header">
          <h2>💼 Portfolio</h2>
          <span id="portfolio-total" class="panel-sub">$0.00</span>
        </div>
        <div id="portfolio-list"><p class="empty-msg">No positions yet. Buy something!</p></div>
      </div>

      <div id="news-panel" class="panel">
        <div class="panel-header">
          <h2>📰 Live News</h2>
          <div class="news-panel-actions">
            <span id="news-next-timer" class="news-next-badge">📅 --:--</span>
            <button id="btn-open-news-page" class="btn btn-ghost-sm">📰 Feed</button>
          </div>
        </div>
        <div class="news-panel-subbar">
          <span id="news-active-count" class="panel-sub">0 pending</span>
        </div>
        <div id="news-list"><p class="empty-msg">Market watching for developments...</p></div>
      </div>

      <div id="events-panel" class="panel">
        <div class="panel-header">
          <h2>📰 Events</h2>
          <div class="event-timer-area">
            <span id="next-event-badge" class="timer-badge">⏳ --</span>
            <button id="btn-skip-day" class="btn btn-sm btn-skip-day" title="Skip to next day instantly">⏩ Skip Day <span class="cost-badge">$150</span></button>
          </div>
        </div>
        <div id="event-hint-bar" class="event-hint-bar hidden"></div>
        <div id="event-log"><p class="empty-msg">Waiting for chaos...</p></div>
      </div>

    </div>
  </div>

  <!-- Upgrades tab panel -->
  <div id="upgrades-tab-panel" class="hidden">
    <div class="upg-tab-wrap">
      <div class="upg-section-header upg-section-header-top">👥 Investor Network <span class="upg-section-sub">passive income · scales with net worth</span></div>
      <div id="upg-investor-grid" class="upg-investor-grid"></div>
      <div class="upg-section-header upg-section-header-paths">🛠 Upgrade Paths <span class="upg-section-sub">invest in your edge</span></div>
      <div class="upg-three-col">
        <div class="upg-col">
          <div class="upg-col-hdr">🤖 Automation</div>
          <div id="upg-path-automation" class="upg-path-grid"></div>
        </div>
        <div class="upg-col">
          <div class="upg-col-hdr">📢 Manipulation</div>
          <div id="upg-path-manipulation" class="upg-path-grid"></div>
        </div>
        <div class="upg-col">
          <div class="upg-col-hdr">📈 Capital</div>
          <div id="upg-path-capital" class="upg-path-grid"></div>
        </div>
      </div>
    </div>
  </div>

  <footer id="footer">
    <span id="footer-stats">Trades: 0 · Tick: 0</span>
    <div class="footer-actions">
      <button id="btn-prestige" class="btn btn-prestige hidden">⭐ PRESTIGE</button>
      <button id="btn-clear" class="btn btn-ghost-sm">🗑️ Reset Game</button>
    </div>
    <div id="debug-cash-bar">
      <span class="debug-label">🛠 DEBUG</span>
      <input id="debug-cash-input" type="number" placeholder="Set cash..." min="0" step="1000" />
      <button id="debug-cash-btn" class="btn btn-ghost-sm">Set Cash</button>
    </div>
  </footer>

  <!-- Manipulate modal -->
  <div id="modal-overlay" class="hidden">
    <div id="modal">
      <div class="modal-header">
        <h3>🕹️ Manipulate Market</h3>
        <button id="modal-close" class="btn-icon">✕</button>
      </div>
      <p class="modal-desc">Pick an asset to pump or dump. 55% chance of backfire. Costs $1,000.</p>
      <div id="modal-assets"></div>
    </div>
  </div>

  <!-- Market Intel modal -->
  <div id="intel-overlay" class="hidden">
    <div id="intel-modal">
      <div class="modal-header">
        <div>
          <h3>📊 Market Intel</h3>
          <p class="modal-desc">Intelligence on all assets — including locked ones. Plan ahead.</p>
        </div>
        <button id="intel-close" class="btn-icon">✕</button>
      </div>
      <div id="intel-content" class="intel-content-wrap"></div>
    </div>
  </div>

  <!-- Full news page (full-screen overlay) -->
  <div id="news-page-overlay" class="hidden">
    <div id="news-page">
      <div class="np-header">
        <div class="np-brand">
          <span class="np-logo">📰 Market Dispatch</span>
          <span class="np-tagline">Live intelligence feed</span>
        </div>
        <div class="np-center">
          <div class="np-next-global">
            <span class="np-next-label">📅 NEXT STORY</span>
            <span id="np-global-timer" class="np-next-time">--:--</span>
          </div>
        </div>
        <div id="np-filters" class="np-filters">
          <button class="np-filter-btn np-filter-active" data-filter="all">All</button>
          <button class="np-filter-btn" data-filter="active">⏳ Active</button>
          <button class="np-filter-btn" data-filter="chains">🔗 Chains</button>
          <button class="np-filter-btn" data-filter="resolved">Archive</button>
        </div>
        <button id="news-page-close" class="btn-icon">✕</button>
      </div>
      <div id="np-feed" class="np-feed"></div>
    </div>
  </div>

  <!-- Event choice modal -->
  <div id="event-choice-overlay" class="hidden">
    <div id="event-choice-modal" class="event-choice-modal">
      <div class="ecm-header">
        <div class="ecm-header-left">
          <span class="ecm-icon">⚡</span>
          <div>
            <div class="ecm-title">EVENT INCOMING TOMORROW</div>
            <div id="ecm-hint" class="ecm-hint"></div>
          </div>
        </div>
        <div class="ecm-timer-wrap">
          <div id="ecm-timer" class="ecm-timer">12</div>
          <div class="ecm-timer-label">sec</div>
        </div>
      </div>
      <p class="ecm-desc">You got intel early. Choose your move before it fires:</p>
      <div class="ecm-choices">
        <button class="btn ecm-btn ecm-bail" id="ecm-bail">
          <span class="ecm-btn-icon">🏃</span>
          <span class="ecm-btn-label">BAIL OUT</span>
          <span class="ecm-btn-sub">Sell all positions now</span>
        </button>
        <button class="btn ecm-btn ecm-hedge" id="ecm-hedge">
          <span class="ecm-btn-icon">🎚️</span>
          <span class="ecm-btn-label">HEDGE</span>
          <span class="ecm-btn-sub">Pay $500 — dampen volatility</span>
        </button>
        <button class="btn ecm-btn ecm-double" id="ecm-double">
          <span class="ecm-btn-icon">💰</span>
          <span class="ecm-btn-label">DOUBLE DOWN</span>
          <span class="ecm-btn-sub">YOLO into the market now</span>
        </button>
        <button class="btn ecm-btn ecm-watch" id="ecm-watch">
          <span class="ecm-btn-icon">👀</span>
          <span class="ecm-btn-label">WATCH</span>
          <span class="ecm-btn-sub">Do nothing — let it play out</span>
        </button>
      </div>
    </div>
  </div>

  <!-- Missions tab panel -->
  <div id="missions-panel-mount" class="hidden"></div>

  <!-- Black market mount point -->
  <div id="bm-panel-mount" class="hidden"></div>

  <!-- Hedge fund mount point -->
  <div id="hf-panel-mount" class="hidden"></div>

  <!-- Insight panel background -->
  <div id="insight-bg" class="insight-bg"></div>

  <!-- Insight panel -->
  <div id="insight-panel" class="insight-panel">
    <div class="ip-header">
      <span id="ip-emoji" class="ip-emoji"></span>
      <div class="ip-meta">
        <div id="ip-name" class="ip-name"></div>
        <div id="ip-price" class="ip-price-val"></div>
      </div>
      <button id="ip-close" class="btn-icon">✕</button>
    </div>

    <div id="ip-tags" class="ip-tags"></div>

    <div class="ip-section">
      <div class="ip-section-label">RECOMMENDED PLAY</div>
      <div id="ip-play" class="ip-play">—</div>
      <div id="ip-play-sub" class="ip-play-sub"></div>
    </div>

    <div class="ip-stats-grid">
      <span id="ip-hype-badge" class="stat-badge sl-muted">—</span>
      <span id="ip-mom-badge"  class="stat-badge sl-muted">—</span>
      <span id="ip-stab-badge" class="stat-badge sl-muted">—</span>
      <span id="ip-risk-badge" class="stat-badge sl-muted">—</span>
    </div>

    <div class="ip-section">
      <div class="ip-section-label">ANALYSIS</div>
      <div id="ip-analysis" class="ip-analysis-text"></div>
    </div>

    <div class="ip-section">
      <div class="ip-section-label">OPPORTUNITY SCORE</div>
      <div id="ip-score" class="ip-score"></div>
    </div>

    <div class="ip-section">
      <div class="ip-section-label">TIMING</div>
      <div id="ip-timing" class="ip-timing tim-neutral">—</div>
    </div>

    <div class="ip-section">
      <div class="ip-section-label">HOW TO TRADE</div>
      <div id="ip-playbook" class="ip-playbook-text"></div>
    </div>

    <div class="ip-section">
      <div class="ip-section-label">VOLATILITY PROFILE</div>
      <div id="ip-vol-profile" class="ip-vol-text"></div>
    </div>

    <div id="ip-risk-warn-row" class="ip-section hidden">
      <div class="ip-section-label">⚠️ RISK WARNING</div>
      <div id="ip-risk-warn" class="ip-risk-warn"></div>
    </div>

    <div class="ip-actions">
      <button id="ip-buy-btn"  class="btn btn-buy  btn-sm ip-act-btn">Buy 1</button>
      <button id="ip-sell-btn" class="btn btn-sell btn-sm ip-act-btn">Sell 1</button>
    </div>
  </div>
</div>`;
