// pages/modos.js
// Requiere: utils.js

function selectMode(mode) {
  const routes = {
    online:  'trivial-lobby.html',
    ia:      'trivial-ia-nivel.html',
    admin:   'trivial-admin.html',
    ranking: 'trivial-ranking.html',
  };
  if (routes[mode]) goTo(routes[mode]);
}

// Mostrar botón admin si corresponde
if (Session.isAdmin()) {
  el('admin-card').style.display = 'flex';
}

// Mostrar nombre e info del jugador
const playerName = Session.playerName();
if (playerName && playerName !== 'Invitado') {
  el('player-info').style.display = 'flex';
  setText('player-name-display', '👤 ' + playerName);

  apiGet(`/api/wins/${encodeURIComponent(playerName)}`)
    .then(data => {
      if (data.wins > 0) {
        setText('wins-count-modos', data.wins);
        el('wins-badge-modos').style.display = 'inline-block';
      }
    })
    .catch(() => {});
}

// ── Save URL actual en sessionStorage para volver aquí ──────────────────
sessionStorage.setItem('last_page', 'trivial-modos.html');

// ── Cargar evento activo y mostrar banner ──────────────────────────────────
const CAT_COLORS = {
  sports: '#18c25a', geo: '#3B9EFF', culture: '#f5a623',
  history: '#e84545', eu: '#a259ff', mixed: '#9b59b6',
};
const CAT_BG = {
  sports:  'images/bg-sport.jpg',
  geo:     'images/bg-geography.jpg',
  culture: 'images/bg-culture.jpg',
  history: 'images/bg-history.jpg',
  eu:      'images/bg-eu.jpg',
};

async function loadActiveEvents() {
  try {
    const events = await apiGet('/api/events');
    const active = events.filter(ev => ev.status === 'active');
    if (!active.length) return;

    const banner = el('event-banner');
    banner.innerHTML = '';

    // Cargar conteo de players en cada evento
    banner.innerHTML = active.map(ev => {
      const color = CAT_COLORS[ev.category] || '#2d7dd2';
      const bg    = ev.banner_image || CAT_BG[ev.category] || 'images/bg-ia.png';
      const desc  = ev.description ? `<div class="event-live-desc">${ev.description}</div>` : '';
      return `
        <a href="trivial-eventos.html" style="text-decoration:none;display:block">
          <div class="event-live-banner" style="--ev-color:${color};--ev-bg:url('${bg}')">
            <div class="event-live-bg"></div>
            <div class="event-live-pulse"></div>
            <div class="event-live-content">
              <div class="event-live-badge">🔴 LIVE EVENT</div>
              <div class="event-live-title">${ev.title}</div>
              ${desc}
              <div class="event-live-meta">${ev.rounds} rounds</div>
              <div class="event-live-players" id="ev-live-players-${ev.id}">👥 loading...</div>
            </div>
            <div class="event-live-cta">
              Join now
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </div>
          </div>
        </a>`;
    }).join('');

  } catch(e) {}
}

loadActiveEvents();
// Auto-refresh banner each 10s to detect when admin opens an event
setInterval(loadActiveEvents, 10000);
