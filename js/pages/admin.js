// pages/admin.js
// Requiere: utils.js

if (!Session.isAdmin()) goTo('trivial-login.html');

const TENANT = 'default';

const CAT_META = {
  sports:  { name:'Sports',    color:'#18c25a' },
  geo:     { name:'Geography', color:'#3B9EFF' },
  culture: { name:'Culture',   color:'#f5a623' },
  history: { name:'History',   color:'#e84545' },
  eu:      { name:'EU',        color:'#a259ff' },
  kenya:   { name:'Kenya',     color:'#cc2200' },
};

const DIFF_COLORS = { fácil:'#18c25a', medio:'#f5a623', difícil:'#e84545' };

let data       = { categories: [], questions: {} };
let currentCat = null;
let editingQ   = null;

// ════════════════════════════════════
//  BANCO DE PREGUNTAS (código original)
// ════════════════════════════════════

async function loadData() {
  try {
    const raw = await apiGet(`/api/tenant/${TENANT}`);
    data.categories = raw.categories?.length
      ? raw.categories
      : Object.entries(CAT_META).map(([id, m]) => ({ id, ...m }));
    data.questions = Object.keys(raw.questions || {}).length ? raw.questions : {};
    data.categories.forEach(c => { if (!data.questions[c.id]) data.questions[c.id] = []; });
  } catch {
    data.categories = Object.entries(CAT_META).map(([id, m]) => ({ id, ...m }));
    data.questions  = {};
    data.categories.forEach(c => { data.questions[c.id] = []; });
  }
  renderSidebar();
  renderDashboard();
  renderFilterSelects();
  renderQuestions();
}

function renderSidebar() {
  setHTML('sidebar-cats', data.categories.map(cat => {
    const count = (data.questions[cat.id] || []).length;
    const color = cat.color || CAT_META[cat.id]?.color || '#888';
    return `
      <div class="nav-item ${currentCat === cat.id ? 'active' : ''}" onclick="filterByCat('${cat.id}')">
        <div class="nav-dot" style="background:${color}"></div>
        ${cat.name}
        <span class="nav-count">${count}</span>
      </div>`;
  }).join(''));
}

function filterByCat(catId) {
  currentCat = catId;
  el('filter-cat').value = catId;
  renderSidebar();
  renderQuestions();
  showPage('questions');
}

function renderDashboard() {
  const allQ   = Object.values(data.questions).flat();
  const total  = allQ.length;
  const easy   = allQ.filter(q => q.diff === 'fácil').length;
  const medium = allQ.filter(q => q.diff === 'medio').length;
  const hard   = allQ.filter(q => q.diff === 'difícil').length;

  setHTML('stats-grid', `
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Preguntas totales</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#18c25a">${easy}</div><div class="stat-label">Fáciles</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#f5a623">${medium}</div><div class="stat-label">Medias</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#e84545">${hard}</div><div class="stat-label">Difíciles</div></div>
  `);

  const rows = data.categories.map(cat => {
    const qs = data.questions[cat.id] || [];
    const e = qs.filter(q => q.diff === 'fácil').length;
    const m = qs.filter(q => q.diff === 'medio').length;
    const h = qs.filter(q => q.diff === 'difícil').length;
    const color = cat.color || CAT_META[cat.id]?.color || '#888';
    return `<tr>
      <td style="padding:10px 14px;display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>${cat.name}</td>
      <td style="padding:10px 14px;text-align:center;color:#18c25a;font-weight:600">${e}</td>
      <td style="padding:10px 14px;text-align:center;color:#f5a623;font-weight:600">${m}</td>
      <td style="padding:10px 14px;text-align:center;color:#e84545;font-weight:600">${h}</td>
      <td style="padding:10px 14px;text-align:center;font-weight:700">${qs.length}</td>
    </tr>`;
  }).join('');

  setHTML('distribution-table', `
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="padding:8px 14px;text-align:left;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-weight:700">Categoría</th>
        <th style="padding:8px 14px;text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#18c25a;font-weight:700">Fácil</th>
        <th style="padding:8px 14px;text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#f5a623;font-weight:700">Medio</th>
        <th style="padding:8px 14px;text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#e84545;font-weight:700">Difícil</th>
        <th style="padding:8px 14px;text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-weight:700">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`);
}

function renderFilterSelects() {
  el('filter-cat').innerHTML = '<option value="">Todas las categorías</option>' +
    data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function renderQuestions() {
  const search = el('search-input').value.toLowerCase();
  const catF   = el('filter-cat').value;
  const diffF  = el('filter-diff').value;
  const cat    = catF ? data.categories.find(c => c.id === catF) : null;

  setText('questions-title', cat ? cat.name : 'Preguntas');
  setText('questions-sub', cat ? `${(data.questions[catF]||[]).length} preguntas` : 'Todas las categorías');

  let items = [];
  Object.entries(data.questions).forEach(([catId, qs]) => {
    if (catF && catId !== catF) return;
    qs.forEach((q, idx) => {
      if (diffF && q.diff !== diffF) return;
      if (search && !q.q.toLowerCase().includes(search) && !q.a.toLowerCase().includes(search)) return;
      items.push({ catId, idx, q });
    });
  });

  const list = el('questions-list');
  if (!items.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-size:14px">No hay preguntas que coincidan</div>`;
    return;
  }

  const byCat = {};
  items.forEach(item => { if (!byCat[item.catId]) byCat[item.catId] = []; byCat[item.catId].push(item); });

  list.innerHTML = Object.entries(byCat).map(([catId, qItems]) => {
    const catMeta = data.categories.find(c => c.id === catId) || CAT_META[catId] || {};
    return `
      <div class="card">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:${catMeta.color||'#888'}"></div>
            <span class="card-title">${catMeta.name||catId}</span>
            <span style="font-size:11px;color:var(--muted);font-weight:400">${qItems.length} preguntas</span>
          </div>
        </div>
        <div>${qItems.map(({catId, idx, q}) => `
          <div class="q-item">
            <span class="q-diff-badge ${q.diff==='fácil'?'easy':q.diff==='medio'?'medio':'dificil'}">${q.diff}</span>
            <div class="q-text-wrap">
              <div class="q-text">${q.q}</div>
              <div class="q-answer">Respuesta: <strong>${q.a}</strong></div>
            </div>
            <div class="q-actions">
              <button class="btn-icon" onclick="editQuestion('${catId}',${idx})" title="Editar">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon danger" onclick="deleteQuestion('${catId}',${idx})" title="Eliminar">
                <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>`).join('')}
        </div>
      </div>`;
  }).join('');
}

function openNewQuestion() {
  editingQ = null;
  setText('modal-title', 'Nueva pregunta');
  setHTML('modal-body', questionForm(null));
  setHTML('modal-footer', `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveQuestion()">Guardar pregunta</button>`);
  openModal();
}

function editQuestion(catId, idx) {
  editingQ = { catId, idx };
  setText('modal-title', 'Editar pregunta');
  setHTML('modal-body', questionForm(data.questions[catId][idx], catId));
  setHTML('modal-footer', `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveQuestion()">Guardar cambios</button>`);
  openModal();
}

function questionForm(q, selectedCat) {
  const cats      = data.categories.map(c => `<option value="${c.id}" ${selectedCat===c.id?'selected':''}>${c.name}</option>`).join('');
  const wrongOpts = q ? q.opts.filter(o => o !== q.a) : ['',''];
  return `
    <div class="field"><label>Categoría</label><select id="q-cat">${cats}</select></div>
    <div class="field"><label>Pregunta</label><textarea id="q-text" rows="3" placeholder="Escribe la pregunta aquí...">${q?q.q:''}</textarea></div>
    <div class="field"><label>Respuesta correcta</label><input type="text" id="q-answer" value="${q?q.a:''}" placeholder="Respuesta correcta"></div>
    <div class="form-grid">
      <div class="field"><label>Opción 2</label><input type="text" id="q-opt2" value="${wrongOpts[0]||''}" placeholder="Opción incorrecta"></div>
      <div class="field"><label>Opción 3</label><input type="text" id="q-opt3" value="${wrongOpts[1]||''}" placeholder="Opción incorrecta"></div>
    </div>
    <div class="field"><label>Dificultad</label><select id="q-diff">
      <option value="fácil"   ${q?.diff==='fácil'  ?'selected':''}>Fácil</option>
      <option value="medio"   ${q?.diff==='medio'  ?'selected':''}>Medio</option>
      <option value="difícil" ${q?.diff==='difícil'?'selected':''}>Difícil</option>
    </select></div>`;
}

function saveQuestion() {
  const catId  = el('q-cat').value;
  const text   = el('q-text').value.trim();
  const answer = el('q-answer').value.trim();
  const opt2   = el('q-opt2').value.trim();
  const opt3   = el('q-opt3').value.trim();
  const diff   = el('q-diff').value;

  if (!text)   return alert('Introduce la pregunta');
  if (!answer) return alert('Introduce la respuesta correcta');
  if (!opt2)   return alert('Introduce al menos la opción 2');

  const entry = { q: text, a: answer, opts: [answer, opt2, opt3].filter(Boolean), diff };
  if (!data.questions[catId]) data.questions[catId] = [];

  if (editingQ && editingQ.catId === catId)  data.questions[catId][editingQ.idx] = entry;
  else if (editingQ && editingQ.catId !== catId) {
    data.questions[editingQ.catId].splice(editingQ.idx, 1);
    data.questions[catId].push(entry);
  } else {
    data.questions[catId].push(entry);
  }

  closeModal();
  saveToServer();
  refresh();
}

function deleteQuestion(catId, idx) {
  if (!confirm('¿Eliminar esta pregunta?')) return;
  data.questions[catId].splice(idx, 1);
  saveToServer();
  refresh();
}

async function saveToServer() {
  try {
    await apiPost(`/api/tenant/${TENANT}/questions`, { questions: data.questions });
    flashMsg('Guardado correctamente', 'success', 'msg-questions');
  } catch {
    flashMsg('Error al guardar en servidor', 'error', 'msg-questions');
  }
}

function openModal()  { el('modal').classList.add('show'); }
function closeModal() { el('modal').classList.remove('show'); }
el('modal').addEventListener('click', e => { if (e.target === el('modal')) closeModal(); });

function showPage(id) {
  qsAll('.page').forEach(p => p.classList.remove('active'));
  el('page-' + id).classList.add('active');
  if (id === 'events') loadEvents();
}

function refresh() { renderSidebar(); renderDashboard(); renderQuestions(); }

async function loadUsers() {
  try {
    const list = await apiGet('/api/users');
    setText('users-count', `${list.length} jugador${list.length !== 1 ? 'es' : ''}`);
    setHTML('users-list', list.length
      ? list.map((u, i) => `
          <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;border-bottom:1px solid var(--border)${i===list.length-1?';border-bottom:none':''}">
            ${avatarHTML(u.name, i, 34)}
            <div style="flex:1"><div style="font-size:14px;font-weight:600">${u.name}</div><div style="font-size:12px;color:var(--muted)">${u.email}</div></div>
            <span style="font-family:var(--font-cond);font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:2px;background:rgba(24,194,90,0.1);color:var(--green)">${u.role}</span>
          </div>`)
        .join('')
      : `<div style="text-align:center;padding:32px;color:var(--muted);font-size:14px">No hay jugadores registrados todavía</div>`
    );
  } catch {
    setHTML('users-list', `<div style="padding:20px;color:var(--muted)">Error al cargar jugadores</div>`);
  }
}

// ════════════════════════════════════
//  GESTIÓN DE EVENTOS
// ════════════════════════════════════

let eventQuestions = [];  // preguntas del evento en edición
let editingEventId = null;

const CAT_OPTIONS = Object.entries(CAT_META)
  .map(([id, m]) => `<option value="${id}">${m.name}</option>`).join('');

async function loadEvents() {
  try {
    const events = await apiGet('/api/events');
    renderEventsList(events);
  } catch {
    setHTML('events-list', '<div style="padding:20px;color:var(--muted)">Error al cargar eventos</div>');
  }
}

function renderEventsList(events) {
  if (!events.length) {
    setHTML('events-list', `
      <div style="text-align:center;padding:60px;color:var(--muted);font-size:14px">
        No hay eventos creados todavía.<br>
        <button class="btn btn-primary" style="margin-top:20px" onclick="openNewEvent()">Crear primer evento</button>
      </div>`);
    return;
  }

  setHTML('events-list', events.map(ev => {
    const color = CAT_META[ev.category]?.color || '#888';
    const diffClass = ev.difficulty === 'fácil' ? 'easy' : ev.difficulty === 'medio' ? 'medio' : 'dificil';
    return `
      <div class="card" style="margin-bottom:12px;border-left:3px solid ${color}">
        <div class="card-header" style="background:var(--card-bg)">
          <div style="display:flex;align-items:center;gap:10px;flex:1">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
            <span class="card-title" style="font-size:15px">${ev.title}</span>
            <span class="q-diff-badge ${diffClass}">${ev.difficulty}</span>
            <span style="font-size:11px;color:var(--muted);margin-left:4px">${ev.category}</span>
            <span style="font-size:11px;color:${ev.status==='active'?'#18c25a':ev.status==='upcoming'?'#3B9EFF':'var(--muted)'};margin-left:4px;font-weight:600;text-transform:uppercase">● ${ev.status}</span>
          </div>
          <div class="q-actions">
            <button class="btn-icon" onclick="openEditEvent(${ev.id})" title="Editar">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" onclick="deleteEvent(${ev.id})" title="Eliminar">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
        ${ev.description ? `<div style="padding:10px 18px;font-size:13px;color:var(--muted)">${ev.description}</div>` : ''}
      </div>`;
  }).join(''));
}

function openNewEvent() {
  editingEventId = null;
  eventQuestions = [];
  setText('modal-event-title', 'Nuevo evento');
  renderEventForm({});
  openEventModal();
}

async function openEditEvent(id) {
  try {
    const ev = await apiGet(`/api/events/${id}`);
    editingEventId = id;
    eventQuestions = (ev.questions || []).map(q => ({
      question: q.question, answer: q.answer,
      options: q.options, difficulty: q.difficulty
    }));
    setText('modal-event-title', 'Editar evento');
    renderEventForm(ev);
    openEventModal();
  } catch {
    alert('Error al cargar el evento');
  }
}

function renderEventForm(ev) {
  setHTML('modal-event-body', `
    <div class="field">
      <label>Título del evento</label>
      <input type="text" id="ev-title" value="${ev.title || ''}" placeholder="Nombre del evento">
    </div>
    <div class="field">
      <label>Descripción</label>
      <textarea id="ev-desc" rows="2" placeholder="Descripción breve del evento">${ev.description || ''}</textarea>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Categoría</label>
        <select id="ev-cat">
          ${Object.entries(CAT_META).map(([id, m]) =>
            `<option value="${id}" ${ev.category === id ? 'selected' : ''}>${m.name}</option>`
          ).join('')}
        </select>
      </div>
      <div class="field">
        <label>Dificultad</label>
        <select id="ev-diff">
          <option value="fácil"   ${ev.difficulty === 'fácil'   ? 'selected' : ''}>Fácil</option>
          <option value="medio"   ${ev.difficulty === 'medio'   ? 'selected' : ''}>Medio</option>
          <option value="difícil" ${ev.difficulty === 'difícil' ? 'selected' : ''}>Difícil</option>
        </select>
      </div>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Estado</label>
        <select id="ev-status">
          <option value="active"   ${ev.status === 'active'   ? 'selected' : ''}>Activo</option>
          <option value="upcoming" ${ev.status === 'upcoming' ? 'selected' : ''}>Próximo</option>
          <option value="finished" ${ev.status === 'finished' ? 'selected' : ''}>Finalizado</option>
        </select>
      </div>
      <div class="field">
        <label>Fecha inicio</label>
        <input type="datetime-local" id="ev-starts" value="${ev.starts_at ? ev.starts_at.slice(0,16) : ''}">
      </div>
    </div>
    <div class="field">
      <label>Fecha fin</label>
      <input type="datetime-local" id="ev-ends" value="${ev.ends_at ? ev.ends_at.slice(0,16) : ''}">
    </div>

    <div style="border-top:1px solid var(--border);margin:16px 0 14px;padding-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="font-family:var(--font-cond);font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px">
          Preguntas del evento
        </span>
        <button class="btn btn-primary" style="padding:8px 16px;font-size:12px" onclick="addEventQuestion()">+ Añadir pregunta</button>
      </div>
      <div id="ev-questions-list"></div>
    </div>
  `);

  setHTML('modal-event-footer', `
    <button class="btn btn-ghost" onclick="closeEventModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveEvent()">
      ${editingEventId ? 'Guardar cambios' : 'Crear evento'}
    </button>
  `);

  renderEventQuestionsList();
}

function renderEventQuestionsList() {
  const list = el('ev-questions-list');
  if (!list) return;

  if (!eventQuestions.length) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;border:1.5px dashed var(--border);border-radius:4px">
      Sin preguntas todavía. Pulsa "Añadir pregunta" para empezar.
    </div>`;
    return;
  }

  list.innerHTML = eventQuestions.map((q, i) => {
    const diffClass = q.difficulty === 'fácil' ? 'easy' : q.difficulty === 'medio' ? 'medio' : 'dificil';
    return `
      <div class="q-item" style="margin-bottom:8px;border:1px solid var(--border);border-radius:4px">
        <span class="q-diff-badge ${diffClass}">${q.difficulty}</span>
        <div class="q-text-wrap" style="flex:1">
          <div class="q-text" style="font-size:13px">${q.question}</div>
          <div class="q-answer" style="font-size:11px">✓ ${q.answer}</div>
        </div>
        <div class="q-actions">
          <button class="btn-icon" onclick="editEventQuestion(${i})" title="Editar">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="removeEventQuestion(${i})" title="Eliminar">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');
}

function addEventQuestion() {
  showEventQuestionSubModal(-1, {});
}

function editEventQuestion(idx) {
  showEventQuestionSubModal(idx, eventQuestions[idx]);
}

function showEventQuestionSubModal(idx, q) {
  // Usa el mismo modal genérico para la sub-pregunta
  const isEdit = idx >= 0;
  setText('modal-title', isEdit ? 'Editar pregunta' : 'Nueva pregunta del evento');
  setHTML('modal-body', `
    <div class="field">
      <label>Pregunta</label>
      <textarea id="evq-text" rows="3" placeholder="Escribe la pregunta...">${q.question || ''}</textarea>
    </div>
    <div class="field">
      <label>Respuesta correcta</label>
      <input type="text" id="evq-answer" value="${q.answer || ''}" placeholder="Respuesta correcta">
    </div>
    <div class="form-grid">
      <div class="field"><label>Opción 2</label><input type="text" id="evq-opt2" value="${(q.options && q.options[1]) || ''}" placeholder="Opción incorrecta"></div>
      <div class="field"><label>Opción 3</label><input type="text" id="evq-opt3" value="${(q.options && q.options[2]) || ''}" placeholder="Opción incorrecta (opcional)"></div>
    </div>
    <div class="field">
      <label>Dificultad</label>
      <select id="evq-diff">
        <option value="fácil"   ${q.difficulty === 'fácil'   ? 'selected' : ''}>Fácil</option>
        <option value="medio"   ${q.difficulty === 'medio'   ? 'selected' : ''}>Medio</option>
        <option value="difícil" ${q.difficulty === 'difícil' ? 'selected' : ''}>Difícil</option>
      </select>
    </div>
  `);
  setHTML('modal-footer', `
    <button class="btn btn-ghost" onclick="closeModal(); openEventModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveEventQuestion(${idx})">Guardar pregunta</button>
  `);
  el('modal-event').classList.remove('show');
  openModal();
}

function saveEventQuestion(idx) {
  const question = el('evq-text').value.trim();
  const answer   = el('evq-answer').value.trim();
  const opt2     = el('evq-opt2').value.trim();
  const opt3     = el('evq-opt3').value.trim();
  const diff     = el('evq-diff').value;

  if (!question) return alert('Introduce la pregunta');
  if (!answer)   return alert('Introduce la respuesta correcta');
  if (!opt2)     return alert('Introduce al menos la opción 2');

  const entry = {
    question, answer,
    options: [answer, opt2, opt3].filter(Boolean),
    difficulty: diff
  };

  if (idx >= 0) eventQuestions[idx] = entry;
  else          eventQuestions.push(entry);

  closeModal();
  openEventModal();
  renderEventQuestionsList();
}

function removeEventQuestion(idx) {
  if (!confirm('¿Eliminar esta pregunta?')) return;
  eventQuestions.splice(idx, 1);
  renderEventQuestionsList();
}

async function saveEvent() {
  const title     = el('ev-title').value.trim();
  const desc      = el('ev-desc').value.trim();
  const category  = el('ev-cat').value;
  const difficulty= el('ev-diff').value;
  const status    = el('ev-status').value;
  const starts_at = el('ev-starts').value || null;
  const ends_at   = el('ev-ends').value   || null;

  if (!title)    return alert('El evento necesita un título');
  if (!category) return alert('Selecciona una categoría');

  const payload = { title, description: desc, category, difficulty, status, starts_at, ends_at, questions: eventQuestions };

  try {
    let res;
    if (editingEventId) {
      res = await fetch(`${SERVER}/api/events/${editingEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
    } else {
      res = await apiPost('/api/events', payload);
    }

    if (res.ok) {
      closeEventModal();
      flashMsg(editingEventId ? 'Evento actualizado' : 'Evento creado', 'success', 'msg-events');
      loadEvents();
    } else {
      alert(res.msg || 'Error al guardar el evento');
    }
  } catch(e) {
    alert('Error de conexión: ' + e.message);
  }
}

async function deleteEvent(id) {
  if (!confirm('¿Eliminar este evento y todas sus preguntas?')) return;
  try {
    const res = await fetch(`${SERVER}/api/events/${id}`, { method: 'DELETE' }).then(r => r.json());
    if (res.ok) { flashMsg('Evento eliminado', 'success', 'msg-events'); loadEvents(); }
    else alert(res.msg || 'Error al eliminar');
  } catch { alert('Error de conexión'); }
}

function openEventModal()  { el('modal-event').classList.add('show'); }
function closeEventModal() { el('modal-event').classList.remove('show'); }
el('modal-event').addEventListener('click', e => { if (e.target === el('modal-event')) closeEventModal(); });

// ── ARRANQUE ──────────────────────────────────────────────────────────────────
loadData();
loadUsers();