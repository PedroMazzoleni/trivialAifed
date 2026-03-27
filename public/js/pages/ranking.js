// pages/ranking.js
// Requiere: utils.js

const MY_NAME = Session.playerName();

function goBack() {
  goTo(Session.isLoggedIn() ? 'trivial-modos.html' : 'trivial-login.html');
}

async function loadRanking() {
  try {
    const players = await apiGet('/api/ranking');
    render(players);
  } catch {
    setHTML('ranking-list', '<div class="empty">No se pudo cargar el ranking.<br>Comprueba la conexión.</div>');
  }
}

function render(players) {
  const list = el('ranking-list');

  if (!players.length) {
    list.innerHTML = '<div class="empty">Aún no hay players registrados.<br>¡Sé el primero en jugar y ganar!</div>';
    return;
  }

  // Podio top 3
  const top    = players.slice(0, Math.min(3, players.length));
  const podium = el('podium');
  podium.style.display = 'flex';

  const tiers   = ['gold','silver','bronze'];
  const heights = [110, 80, 60];
  const crowns  = ['👑','',''];
  const order   = top.length >= 3 ? [1,0,2] : top.length === 2 ? [1,0] : [0];

  podium.innerHTML = order.map(i => {
    const p = top[i];
    if (!p) return '';
    const col = playerColor(i);
    return `
      <div class="podium-slot">
        <div class="podium-avatar" style="background:${col};border-color:${col}">
          ${crowns[i] ? `<span class="podium-crown">${crowns[i]}</span>` : ''}
          ${playerInitial(p.name)}
        </div>
        <div class="podium-name">${p.name}</div>
        <div class="podium-wins">${p.wins} win${p.wins !== 1 ? 's' : ''}</div>
        <div class="podium-block ${tiers[i]}" style="height:${heights[i]}px">${i + 1}</div>
      </div>`;
  }).join('');

  // Banner de posición propia
  const myIdx = players.findIndex(p => p.name === MY_NAME);
  if (myIdx >= 0) {
    setText('my-pos', `#${myIdx + 1}`);
    el('my-banner').classList.add('show');
  }

  // Tabla completa
  list.innerHTML = players.map((p, i) => {
    const isMe  = p.name === MY_NAME;
    const col   = playerColor(i);
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
    return `
      <div class="ranking-row ${isMe ? 'is-me' : ''}" style="animation-delay:${i * 0.04}s">
        <div class="rank-pos ${i < 3 ? 'top' : ''}">${medal}</div>
        <div class="rank-player">
          <div class="rank-avatar" style="background:${col}">${playerInitial(p.name)}</div>
          <span class="rank-name">${p.name}</span>
          ${isMe ? '<span class="rank-me">Tú</span>' : ''}
        </div>
        <div class="rank-stat rank-wins">${p.wins}</div>
        <div class="rank-stat rank-pts">${p.totalPoints}</div>
        <div class="rank-stat rank-games">${p.gamesPlayed}</div>
      </div>`;
  }).join('');
}

loadRanking();
