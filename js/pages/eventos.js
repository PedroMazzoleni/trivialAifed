// pages/eventos.js
// Requiere: utils.js

const CAT_COLORS = {
    sports: '#18c25a', geo: '#3B9EFF', culture: '#f5a623',
    history: '#e84545', eu: '#a259ff', kenya: '#cc2200',
  };
  
  const DIFF_LABEL = { fácil: 'easy', medio: 'medio', difícil: 'hard' };
  const LETTERS = ['A','B','C','D'];
  
  let allEvents = [];
  let currentFilter = 'all';
  
  // ── INIT ────────────────────────────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', loadEvents);
  
  async function loadEvents() {
    try {
      allEvents = await apiGet('/api/events');
      renderEvents();
    } catch {
      document.getElementById('eventos-grid').innerHTML =
        '<div class="eventos-empty"><p>No se pudieron cargar los eventos.</p></div>';
    }
  }
  
  function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderEvents();
  }
  
  function getEventStatus(ev) {
    const now = new Date();
    if (!ev.starts_at && !ev.ends_at) return ev.status || 'active';
    if (ev.ends_at && new Date(ev.ends_at) < now) return 'finished';
    if (ev.starts_at && new Date(ev.starts_at) > now) return 'upcoming';
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
          <p>No hay eventos ${currentFilter !== 'all' ? 'en esta categoría' : 'disponibles'}.<br>¡Pronto habrá novedades!</p>
        </div>`;
      return;
    }
  
    grid.innerHTML = filtered.map((ev, i) => {
      const status = getEventStatus(ev);
      const color  = CAT_COLORS[ev.category] || '#3d5af1';
      const diff   = DIFF_LABEL[ev.difficulty] || 'medio';
      const statusLabel = { active: 'Activo', upcoming: 'Próximo', finished: 'Finalizado' }[status];
  
      return `
        <div class="event-card" style="animation-delay:${i * 0.05}s" onclick="openEventModal(${ev.id})">
          <div class="event-card-band" style="background:${color}"></div>
          <div class="event-card-body">
            <div class="event-card-top">
              <span class="event-category">${ev.category}</span>
              <span class="event-status ${status}">${statusLabel}</span>
            </div>
            <div class="event-title">${ev.title}</div>
            <div class="event-desc">${ev.description || 'Sin descripción'}</div>
            <div class="event-card-footer">
              <div class="event-meta">
                <div class="event-meta-item">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  ${ev.starts_at ? formatDate(ev.starts_at) : 'Sin fecha'}
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <span class="event-diff ${diff}">${ev.difficulty}</span>
                <button class="event-btn">
                  Ver
                  <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }
  
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  
  // ── MODAL ────────────────────────────────────────────────────────────────────
  async function openEventModal(id) {
    const modal = document.getElementById('ev-modal');
    const body  = document.getElementById('ev-modal-body');
    modal.classList.add('show');
    body.innerHTML = '<div style="padding:60px;text-align:center;color:#999">Cargando...</div>';
  
    try {
      const ev     = await apiGet(`/api/events/${id}`);
      const color  = CAT_COLORS[ev.category] || '#3d5af1';
      const status = getEventStatus(ev);
      const diff   = DIFF_LABEL[ev.difficulty] || 'medio';
      const statusLabel = { active: 'Activo', upcoming: 'Próximo', finished: 'Finalizado' }[status];
  
      const questionsHTML = (ev.questions || []).map((q, qi) => {
        const opts = q.options || [];
        return `
          <div class="ev-question-item">
            <div class="ev-q-text">${qi + 1}. ${q.question}</div>
            <div class="ev-q-opts">
              ${opts.map((opt, i) => `
                <div class="ev-q-opt ${opt === q.answer ? 'correct' : ''}">
                  <span class="ev-q-letter">${LETTERS[i]}</span>
                  ${opt}
                </div>`).join('')}
            </div>
          </div>`;
      }).join('');
  
      body.innerHTML = `
        <div class="ev-modal-band" style="background:${color}"></div>
        <div class="ev-modal-content">
          <div class="ev-modal-head">
            <span class="ev-modal-eyebrow">${ev.category}</span>
            <div class="ev-modal-title">${ev.title}</div>
            <div class="ev-modal-desc">${ev.description || ''}</div>
            <div class="ev-modal-badges">
              <span class="ev-modal-badge event-status ${status}">${statusLabel}</span>
              <span class="ev-modal-badge event-diff ${diff}">${ev.difficulty}</span>
            </div>
          </div>
          ${ev.starts_at || ev.ends_at ? `
          <div class="ev-modal-dates">
            ${ev.starts_at ? `<div class="ev-modal-date"><span class="ev-modal-date-label">Inicio</span><span class="ev-modal-date-val">${formatDate(ev.starts_at)}</span></div>` : ''}
            ${ev.ends_at ? `<div class="ev-modal-date"><span class="ev-modal-date-label">Fin</span><span class="ev-modal-date-val">${formatDate(ev.ends_at)}</span></div>` : ''}
          </div>` : ''}
          ${ev.questions && ev.questions.length ? `
          <div class="ev-questions-title">
            Preguntas <span>${ev.questions.length}</span>
          </div>
          ${questionsHTML}` : '<p style="color:#999;font-size:14px">Este evento aún no tiene preguntas.</p>'}
        </div>`;
    } catch {
      body.innerHTML = '<div style="padding:40px;text-align:center;color:#999">Error al cargar el evento.</div>';
    }
  }
  
  function closeEventModal() {
    document.getElementById('ev-modal').classList.remove('show');
  }
  
  document.getElementById('ev-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('ev-modal')) closeEventModal();
  });