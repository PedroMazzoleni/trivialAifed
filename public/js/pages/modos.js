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