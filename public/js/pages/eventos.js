// pages/eventos.js
// Requires: utils.js

const CAT_COLORS = {
    sports: '#18c25a', geo: '#3B9EFF', culture: '#f5a623',
    history: '#e84545', eu: '#a259ff', kenya: '#cc2200', mixed: '#9b59b6',
  };
  
  const LETTERS = ['A','B','C','D'];
  
  let allEvents = [];
  let currentFilter = 'all';
  
  // ── INIT ─────────────────────────────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', loadEvents);
  
  async function loadEvents() {
    try {
      const all = await apiGet('/api/events');
      // Hide closed events from players
      allEvents = all.filter(ev => ev.status !== 'closed');
      renderEvents();
    } catch {
      document.getElementById('eventos-grid').innerHTML =
        '<div class="eventos-empty"><p>Could not load events.</p></div>';
    }
  }
  
  function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderEvents();
  }
  
  function parseEventDate(str) {
    // MySQL returns "2026-03-25 08:00:00" (space); normalise to ISO for consistent local-time parsing
    return new Date(str.replace(' ', 'T'));
  }

  function getEventStatus(ev) {
    const now = new Date();
    if (!ev.starts_at && !ev.ends_at) return ev.status || 'active';
    if (ev.ends_at && parseEventDate(ev.ends_at) < now) return 'finished';
    if (ev.starts_at && parseEventDate(ev.starts_at) > now) return 'upcoming';
    return 'active';
  }
  
  function renderEvents() {
    const grid = document.getElementById('eventos-grid');
  
    let filtered = allEvents;
    if (currentFilter !== 'all') {
      filtered = allEvents.filter(ev => getEventStatus(ev) === currentFilter);
    }
  
    if (!filtered.length) {
      grid.innerHTML = `
        <div class="eventos-empty">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p>No events ${currentFilter !== 'all' ? 'in this category' : 'available'}.<br>Check back soon!</p>
        </div>`;
      return;
    }
  
    grid.innerHTML = filtered.map((ev, i) => {
      const status = getEventStatus(ev);
      const color  = CAT_COLORS[ev.category] || '#3d5af1';
      const statusLabel = { active: 'Active', upcoming: 'Upcoming', finished: 'Finished' }[status];
      const canJoin = status === 'active';
  
      return `
        <div class="event-card" style="animation-delay:${i * 0.05}s">
          <div class="event-card-band" style="background:${color}"></div>
          <div class="event-card-body">
            <div class="event-card-top">
              <span class="event-category">${ev.category}</span>
              <span class="event-status ${status}">${statusLabel}</span>
            </div>
            <div class="event-title">${ev.title}</div>
            <div class="event-desc">${ev.description || 'No description'}</div>
  
            <!-- Event meta chips -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
              <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:3px;background:rgba(0,0,0,0.06);color:#555">
                🎡 Spin Wheel
              </span>
              <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:3px;background:rgba(0,0,0,0.06);color:#555">
                ${ev.rounds || 6} rounds
              </span>
              <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:3px;background:rgba(0,0,0,0.06);color:#555">
                ∞ players
              </span>
            </div>
  
            <div class="event-card-footer">
              <div class="event-meta">
                ${ev.starts_at ? `<div class="event-meta-item">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  ${formatDate(ev.starts_at)}
                </div>` : ''}
              </div>
              ${canJoin
                ? `<button class="event-join-btn" onclick="joinEvent(${ev.id}, '${encodeURIComponent(ev.title)}', '${ev.category}', ${ev.rounds || 6})">
                    🎮 Join
                    <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>`
                : `<button class="event-btn" onclick="openEventInfoModal(${ev.id})">
                    View
                    <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>`
              }
            </div>
          </div>
        </div>`;
    }).join('');
  }
  
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  
  // ── JOIN EVENT ────────────────────────────────────────────────────────────────
  function joinEvent(eventId, title, category, rounds) {
    const playerName = Session.playerName() || '';
  
    if (!playerName || playerName === 'Invitado' || playerName === 'Guest') {
      // Show name prompt modal
      showJoinModal(eventId, title, category, rounds);
      return;
    }
  
    goTo(`trivial-evento-juego.html?event=${eventId}&player=${encodeURIComponent(playerName)}&title=${title}&cat=${category}&rounds=${rounds}`);
  }
  
  function showJoinModal(eventId, title, category, rounds) {
    const modal = document.getElementById('ev-modal');
    const body  = document.getElementById('ev-modal-body');
    modal.classList.add('show');
    body.innerHTML = `
      <div style="padding:28px 28px 0">
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:24px;color:#111;margin-bottom:6px;text-transform:uppercase">${decodeURIComponent(title)}</div>
        <p style="font-size:14px;color:#666;margin-bottom:20px">Enter your name to join this event.</p>
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:8px;color:#333">Your name</label>
          <input type="text" id="join-name-input" placeholder="Your name in the game" maxlength="20"
            style="width:100%;padding:12px 14px;border:1.5px solid #e0e0e0;border-radius:4px;font-size:15px;outline:none;transition:border-color .15s"
            onfocus="this.style.borderColor='#3d5af1'" onblur="this.style.borderColor='#e0e0e0'"
            onkeydown="if(event.key==='Enter') confirmJoin(${eventId},'${title}','${category}',${rounds})">
        </div>
        <div style="display:flex;gap:8px;padding-bottom:24px">
          <button onclick="closeEventModal()" style="flex:1;padding:12px;background:transparent;border:1.5px solid #e0e0e0;border-radius:4px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;color:#888">Cancel</button>
          <button onclick="confirmJoin(${eventId},'${title}','${category}',${rounds})" style="flex:2;padding:12px;background:#3d5af1;border:none;border-radius:4px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;color:#fff">Join Event</button>
        </div>
      </div>
    `;
    setTimeout(() => { const inp = document.getElementById('join-name-input'); if (inp) inp.focus(); }, 100);
  }
  
  function confirmJoin(eventId, title, category, rounds) {
    const inp  = document.getElementById('join-name-input');
    const name = inp ? inp.value.trim() : '';
    if (!name) { if (inp) inp.focus(); return; }
    closeEventModal();
    goTo(`trivial-evento-juego.html?event=${eventId}&player=${encodeURIComponent(name)}&title=${encodeURIComponent(decodeURIComponent(title))}&cat=${category}&rounds=${rounds}`);
  }
  
  // ── INFO MODAL (for non-active events) ───────────────────────────────────────
  async function openEventInfoModal(id) {
    const modal = document.getElementById('ev-modal');
    const body  = document.getElementById('ev-modal-body');
    modal.classList.add('show');
    body.innerHTML = '<div style="padding:60px;text-align:center;color:#999">Loading...</div>';
  
    try {
      const ev     = await apiGet(`/api/events/${id}`);
      const color  = CAT_COLORS[ev.category] || '#3d5af1';
      const status = getEventStatus(ev);
      const statusLabel = { active: 'Active', upcoming: 'Upcoming', finished: 'Finished' }[status];
  
      body.innerHTML = `
        <div class="ev-modal-band" style="background:${color}"></div>
        <div class="ev-modal-content">
          <div class="ev-modal-head">
            <span class="ev-modal-eyebrow">${ev.category}</span>
            <div class="ev-modal-title">${ev.title}</div>
            <div class="ev-modal-desc">${ev.description || ''}</div>
            <div class="ev-modal-badges">
              <span class="ev-modal-badge event-status ${status}">${statusLabel}</span>
              <span class="ev-modal-badge" style="background:rgba(61,90,241,0.08);color:#3d5af1;padding:5px 14px;border-radius:50px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase">🎡 Spin Wheel · ${ev.rounds || 6} rounds</span>
            </div>
          </div>
          ${ev.starts_at || ev.ends_at ? `
          <div class="ev-modal-dates">
            ${ev.starts_at ? `<div class="ev-modal-date"><span class="ev-modal-date-label">Start</span><span class="ev-modal-date-val">${formatDate(ev.starts_at)}</span></div>` : ''}
            ${ev.ends_at ? `<div class="ev-modal-date"><span class="ev-modal-date-label">End</span><span class="ev-modal-date-val">${formatDate(ev.ends_at)}</span></div>` : ''}
          </div>` : ''}
        </div>`;
    } catch {
      body.innerHTML = '<div style="padding:40px;text-align:center;color:#999">Error loading event.</div>';
    }
  }
  
  function closeEventModal() {
    document.getElementById('ev-modal').classList.remove('show');
  }
  
  document.getElementById('ev-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('ev-modal')) closeEventModal();
  });
