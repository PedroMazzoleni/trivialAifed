// pages/admin.js
// Requires: utils.js

if (!Session.isAdmin()) goTo('trivial-login.html');

const TENANT = 'default';

const CAT_META = {
  sports:  { name:'Sports',    color:'#18c25a' },
  geo:     { name:'Geography', color:'#3B9EFF' },
  culture: { name:'Culture',   color:'#f5a623' },
  history: { name:'History',   color:'#e84545' },
  eu:      { name:'Europa',     color:'#a259ff' },
  mixed:   { name:'Mixed',     color:'#9b59b6' },
};

let data       = { categories: [], questions: {} };
let currentCat = null;
let editingQ   = null;

// ════════════════════════════════════
//  QUESTION BANK
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
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Total Questions</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#18c25a">${easy}</div><div class="stat-label">Easy</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#f5a623">${medium}</div><div class="stat-label">Medium</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#e84545">${hard}</div><div class="stat-label">Hard</div></div>
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
        <th style="padding:8px 14px;text-align:left;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-weight:700">Category</th>
        <th style="padding:8px 14px;text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#18c25a;font-weight:700">Easy</th>
        <th style="padding:8px 14px;text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#f5a623;font-weight:700">Medium</th>
        <th style="padding:8px 14px;text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#e84545;font-weight:700">Hard</th>
        <th style="padding:8px 14px;text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-weight:700">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`);
}

function renderFilterSelects() {
  el('filter-cat').innerHTML = '<option value="">All categories</option>' +
    data.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function renderQuestions() {
  const search = el('search-input').value.toLowerCase();
  const catF   = el('filter-cat').value;
  const diffF  = el('filter-diff').value;
  const cat    = catF ? data.categories.find(c => c.id === catF) : null;

  setText('questions-title', cat ? cat.name : 'Questions');
  setText('questions-sub', cat ? `${(data.questions[catF]||[]).length} questions` : 'All categories');

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
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-size:14px">No questions match the current filters</div>`;
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
            <span style="font-size:11px;color:var(--muted);font-weight:400">${qItems.length} questions</span>
          </div>
        </div>
        <div>${qItems.map(({catId, idx, q}) => `
          <div class="q-item">
            <span class="q-diff-badge ${q.diff==='fácil'?'easy':q.diff==='medio'?'medio':'dificil'}">${q.diff==='fácil'?'Easy':q.diff==='medio'?'Medium':'Hard'}</span>
            <div class="q-text-wrap">
              <div class="q-text">${q.q}</div>
              <div class="q-answer">Answer: <strong>${q.a}</strong></div>
            </div>
            <div class="q-actions">
              <button class="btn-icon" onclick="editQuestion('${catId}',${idx})" title="Edit">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon danger" onclick="deleteQuestion('${catId}',${idx})" title="Delete">
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
  setText('modal-title', 'New question');
  setHTML('modal-body', questionForm(null));
  setHTML('modal-footer', `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveQuestion()">Save question</button>`);
  openModal();
}

function editQuestion(catId, idx) {
  editingQ = { catId, idx };
  setText('modal-title', 'Edit question');
  setHTML('modal-body', questionForm(data.questions[catId][idx], catId));
  setHTML('modal-footer', `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveQuestion()">Save changes</button>`);
  openModal();
}

function questionForm(q, selectedCat) {
  const cats      = data.categories.map(c => `<option value="${c.id}" ${selectedCat===c.id?'selected':''}>${c.name}</option>`).join('');
  const wrongOpts = q ? q.opts.filter(o => o !== q.a) : ['',''];
  return `
    <div class="field"><label>Category</label><select id="q-cat">${cats}</select></div>
    <div class="field"><label>Question</label><textarea id="q-text" rows="3" placeholder="Write the question here...">${q?q.q:''}</textarea></div>
    <div class="field"><label>Correct answer</label><input type="text" id="q-answer" value="${q?q.a:''}" placeholder="Correct answer"></div>
    <div class="form-grid">
      <div class="field"><label>Option 2</label><input type="text" id="q-opt2" value="${wrongOpts[0]||''}" placeholder="Wrong option"></div>
      <div class="field"><label>Option 3</label><input type="text" id="q-opt3" value="${wrongOpts[1]||''}" placeholder="Wrong option"></div>
    </div>
    <div class="field"><label>Difficulty</label><select id="q-diff">
      <option value="fácil"   ${q?.diff==='fácil'  ?'selected':''}>Easy</option>
      <option value="medio"   ${q?.diff==='medio'  ?'selected':''}>Medium</option>
      <option value="difícil" ${q?.diff==='difícil'?'selected':''}>Hard</option>
    </select></div>`;
}

function saveQuestion() {
  const catId  = el('q-cat').value;
  const text   = el('q-text').value.trim();
  const answer = el('q-answer').value.trim();
  const opt2   = el('q-opt2').value.trim();
  const opt3   = el('q-opt3').value.trim();
  const diff   = el('q-diff').value;

  if (!text)   return alert('Enter the question');
  if (!answer) return alert('Enter the correct answer');
  if (!opt2)   return alert('Enter at least option 2');

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
  if (!confirm('Delete this question?')) return;
  data.questions[catId].splice(idx, 1);
  saveToServer();
  refresh();
}

async function saveToServer() {
  try {
    await apiPost(`/api/tenant/${TENANT}/questions`, { questions: data.questions });
    flashMsg('Saved successfully', 'success', 'msg-questions');
  } catch {
    flashMsg('Error saving to server', 'error', 'msg-questions');
  }
}

function openModal()  { el('modal').classList.add('show'); }
function closeModal() { el('modal').classList.remove('show'); }

function showPage(id) {
  qsAll('.page').forEach(p => p.classList.remove('active'));
  el('page-' + id).classList.add('active');
  if (id === 'events') loadEvents();
  if (id === 'users')  loadUsers();
}

function refresh() { renderSidebar(); renderDashboard(); renderQuestions(); }

async function loadUsers() {
  try {
    const list = await apiGet('/api/users');
    setText('users-count', `${list.length} player${list.length !== 1 ? 's' : ''}`);
    setHTML('users-list', list.length
      ? list.map((u, i) => `
          <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;border-bottom:1px solid var(--border)${i===list.length-1?';border-bottom:none':''}">
            ${avatarHTML(u.name, i, 34)}
            <div style="flex:1"><div style="font-size:14px;font-weight:600">${u.name}</div><div style="font-size:12px;color:var(--muted)">${u.email}</div></div>
            <span style="font-family:var(--font-cond);font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:2px;background:rgba(24,194,90,0.1);color:var(--green)">${u.role}</span>
          </div>`)
        .join('')
      : `<div style="text-align:center;padding:32px;color:var(--muted);font-size:14px">No registered players yet</div>`
    );
  } catch {
    setHTML('users-list', `<div style="padding:20px;color:var(--muted)">Error loading players</div>`);
  }
}

// ════════════════════════════════════
//  EVENT MANAGEMENT
// ════════════════════════════════════

let editingEventId = null;

async function loadEvents() {
  try {
    const events = await apiGet('/api/events');
    renderEventsList(events);
  } catch(e) {
    console.error('loadEvents error:', e);
    setHTML('events-list', '<div style="padding:20px;color:var(--muted)">Error loading events: ' + e.message + '</div>');
  }
}

function renderEventsList(events) {
  if (!events.length) {
    setHTML('events-list', `
      <div style="text-align:center;padding:60px;color:var(--muted);font-size:14px">
        No hay eventos todavía.<br>
        <button class="btn btn-primary" style="margin-top:20px" onclick="openNewEvent()">Crear primer evento</button>
      </div>`);
    return;
  }

  setHTML('events-list', events.map(ev => {
    const color = CAT_META[ev.category]?.color || '#888';
    const isActive = ev.status === 'active';
    const statusColor = isActive ? '#18c25a' : ev.status === 'upcoming' ? '#3B9EFF' : 'var(--muted)';
    const statusLabel = { active:'🔓 ABIERTO', upcoming:'📅 PRÓXIMO', finished:'⏹ FINALIZADO', closed:'🔒 CERRADO' }[ev.status] || ev.status;

    return `
      <div class="card" style="margin-bottom:12px;border-left:3px solid ${color}">
        <div class="card-header" style="background:var(--card-bg)">
          <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
            <span class="card-title" style="font-size:15px">${ev.title}</span>
            <span style="font-size:11px;color:var(--muted)">${ev.category}</span>
            <span style="font-family:var(--font-cond);font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:2px;background:rgba(45,125,210,0.1);color:var(--blue)">${ev.rounds||6} rondas</span>
            <span style="font-size:11px;color:${statusColor};font-weight:600">${statusLabel}</span>
          </div>
          <div class="q-actions">
            <button class="btn-icon" onclick="openEditEvent(${ev.id})" title="Editar">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" onclick="deleteEvent(${ev.id})" title="Borrar">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
        ${ev.description ? `<div style="padding:8px 18px;font-size:13px;color:var(--muted)">${ev.description}</div>` : ''}
        <div style="padding:10px 18px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div>
            <span id="ev-players-${ev.id}" style="font-size:12px;color:var(--muted)">👥 0 en sala</span>
            <span id="ev-state-${ev.id}" style="font-size:12px;color:var(--muted);margin-left:12px"></span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${!isActive ? `<button onclick="adminOpenEvent(${ev.id})" style="padding:5px 12px;background:rgba(45,125,210,0.15);border:1px solid rgba(45,125,210,0.3);border-radius:3px;font-family:var(--font-cond);font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--blue);cursor:pointer">🔓 Abrir</button>` : ''}
            ${isActive ? `
              <button onclick="adminStartEvent(${ev.id})" style="padding:5px 12px;background:rgba(24,194,90,0.15);border:1px solid rgba(24,194,90,0.3);border-radius:3px;font-family:var(--font-cond);font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#18c25a;cursor:pointer">▶ Iniciar</button>
              <button onclick="adminStopEvent(${ev.id})" style="padding:5px 12px;background:rgba(245,166,35,0.1);border:1px solid rgba(245,166,35,0.3);border-radius:3px;font-family:var(--font-cond);font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#f5a623;cursor:pointer">⏸ Parar</button>
              <button onclick="adminCloseEvent(${ev.id})" style="padding:5px 12px;background:rgba(232,69,69,0.1);border:1px solid rgba(232,69,69,0.2);border-radius:3px;font-family:var(--font-cond);font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#e84545;cursor:pointer">🔒 Cerrar</button>
            ` : ''}
          </div>
        </div>
      </div>`;
  }).join(''));

  connectAdminSocket();
}

function openNewEvent() {
  editingEventId = null;
  _evQCount = 0;
  setText('modal-event-title', 'Nuevo evento');
  renderEventForm({});
  openEventModal();
}

async function openEditEvent(id) {
  try {
    const ev = await apiGet(`/api/events/${id}`);
    editingEventId = id;
    _evQCount = 0;
    setText('modal-event-title', 'Editar evento');
    renderEventForm(ev);
    if (ev.questions && ev.questions.length) {
      ev.questions.forEach(q => addEventQuestion(q));
    }
    openEventModal();
  } catch { alert('Error loading event'); }
}

function renderEventForm(ev) {
  const allCatOptions = Object.entries(CAT_META)
    .map(([id, m]) => `<option value="${id}" ${ev.category === id ? 'selected' : ''}>${m.name}</option>`).join('');
  const rounds = ev.rounds || 6;

  setHTML('modal-event-body', `
    <div class="field">
      <label>Título del evento</label>
      <input type="text" id="ev-title" value="${ev.title || ''}" placeholder="Nombre del evento">
    </div>
    <div class="field">
      <label>Descripción</label>
      <textarea id="ev-desc" rows="2" placeholder="Descripción breve">${ev.description || ''}</textarea>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Categoría</label>
        <select id="ev-cat">${allCatOptions}</select>
      </div>
      <div class="field">
        <label>Estado inicial</label>
        <select id="ev-status">
          <option value="upcoming" ${ev.status === 'upcoming' ? 'selected' : ''}>📅 Próximo (oculto)</option>
          <option value="active"   ${ev.status === 'active'   ? 'selected' : ''}>🔓 Abierto (visible)</option>
          <option value="finished" ${ev.status === 'finished' ? 'selected' : ''}>⏹ Finalizado</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>Número de rondas</label>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:6px">
        ${[4,6,8,10,12].map(n => `
          <button type="button" onclick="selectEventRounds(${n})" id="ev-round-btn-${n}"
            class="round-btn ${n === rounds ? 'selected' : ''}">${n}</button>`).join('')}
      </div>
      <input type="hidden" id="ev-rounds" value="${rounds}">
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Fecha inicio (opcional)</label>
        <input type="datetime-local" id="ev-starts" value="${ev.starts_at ? ev.starts_at.replace(' ','T').slice(0,16) : ''}">
      </div>
      <div class="field">
        <label>Fecha fin (opcional)</label>
        <input type="datetime-local" id="ev-ends" value="${ev.ends_at ? ev.ends_at.replace(' ','T').slice(0,16) : ''}">
      </div>
    </div>

    <!-- PREGUNTAS -->
    <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="font-family:var(--font-cond);font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)">Preguntas del evento</span>
        <button type="button" onclick="addEventQuestion()" style="background:rgba(45,125,210,0.15);border:1px solid rgba(45,125,210,0.3);border-radius:3px;padding:5px 14px;font-family:var(--font-cond);font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--blue);cursor:pointer">+ Añadir pregunta</button>
      </div>
      <div id="ev-questions-list" style="display:flex;flex-direction:column;gap:10px"></div>
      <div id="ev-no-questions" style="text-align:center;padding:20px;color:var(--muted);font-size:13px">
        Sin preguntas. Pulsa "+ Añadir pregunta".
      </div>
    </div>
  `);

  setHTML('modal-event-footer', `
    <button class="btn btn-ghost" onclick="closeEventModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveEvent()">
      ${editingEventId ? 'Guardar cambios' : 'Crear evento'}
    </button>
  `);
}

function selectEventRounds(n) {
  el('ev-rounds').value = n;
  [4,6,8,10,12].forEach(x => {
    const btn = el(`ev-round-btn-${x}`);
    if (!btn) return;
    btn.className = 'round-btn' + (x === n ? ' selected' : '');
  });
}

// ── PREGUNTAS DEL EVENTO ──────────────────────────────────────────────────────
let _evQCount = 0;

function addEventQuestion(existing = null) {
  _evQCount++;
  const qId  = _evQCount;
  const list = el('ev-questions-list');
  const noQ  = el('ev-no-questions');
  if (noQ) noQ.style.display = 'none';

  const opts = existing ? existing.options : ['', '', ''];
  const existingCat = existing ? (existing.category || '') : '';
  const div  = document.createElement('div');
  div.id = `evq-block-${qId}`;
  div.style.cssText = 'background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:4px;padding:14px';
  div.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-family:var(--font-cond);font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">Pregunta ${qId}</span>
      <button type="button" onclick="removeEvQ(${qId})" style="background:none;border:none;color:#e84545;cursor:pointer;font-size:16px">✕</button>
    </div>
    <div class="field" style="margin-bottom:8px">
      <label style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700;display:block;margin-bottom:4px">Pregunta</label>
      <input type="text" id="evq-q-${qId}" value="${existing ? (existing.question||'').replace(/"/g,'&quot;') : ''}" placeholder="Escribe la pregunta..." style="width:100%;padding:10px;background:var(--bg);border:1.5px solid var(--border);border-radius:3px;color:var(--text);font-size:14px;outline:none">
    </div>
    <div class="field" style="margin-bottom:8px">
      <label style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#18c25a;font-weight:700;display:block;margin-bottom:4px">✓ Respuesta correcta</label>
      <input type="text" id="evq-a-${qId}" value="${existing ? (existing.answer||'').replace(/"/g,'&quot;') : ''}" placeholder="Respuesta correcta..." style="width:100%;padding:10px;background:var(--bg);border:1.5px solid #18c25a;border-radius:3px;color:#18c25a;font-size:14px;outline:none">
    </div>
    <div class="field" style="margin-bottom:8px">
      <label style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#a259ff;font-weight:700;display:block;margin-bottom:4px">🎯 Categoría en ruleta</label>
      <select id="evq-cat-${qId}" style="width:100%;padding:8px 10px;background:var(--bg);border:1.5px solid #a259ff;border-radius:3px;color:var(--text);font-size:13px;outline:none">
        <option value="">-- Sin categoría específica --</option>
      <option value="sports">⚽ Sports</option>
      <option value="geo">🌍 Geography</option>
      <option value="culture">🎭 Culture</option>
      <option value="history">📜 History</option>
      <option value="eu">🇪🇺 Europa</option>
      </select>
    </div>
    <div class="field" style="margin-bottom:0">
      <label style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700;display:block;margin-bottom:4px">Opciones (mínimo 2)</label>
      <div id="evq-opts-${qId}" style="display:flex;gap:6px;flex-wrap:wrap">
        ${opts.map((opt, i) => `<input type="text" id="evq-opt-${qId}-${i}" value="${(opt||'').replace(/"/g,'&quot;')}" placeholder="Opción ${i+1}" style="flex:1;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:3px;color:var(--text);font-size:13px;outline:none;min-width:100px">`).join('')}
        <button type="button" onclick="addEvQOpt(${qId})" style="padding:8px 10px;background:rgba(255,255,255,0.05);border:1px dashed var(--border);border-radius:3px;color:var(--muted);cursor:pointer;font-size:12px">+ opción</button>
      </div>
    </div>`;
  list.appendChild(div);
  // Setear categoría si existe
  if (existingCat) {
    const catSel = el(`evq-cat-${qId}`);
    if (catSel) catSel.value = existingCat;
  }
}

function removeEvQ(qId) {
  const b = el(`evq-block-${qId}`); if (b) b.remove();
  const list = el('ev-questions-list');
  if (list && !list.children.length) { const n = el('ev-no-questions'); if (n) n.style.display = 'block'; }
}

function addEvQOpt(qId) {
  const wrap = el(`evq-opts-${qId}`); if (!wrap) return;
  const n = wrap.querySelectorAll('input').length;
  const inp = document.createElement('input');
  inp.type = 'text'; inp.id = `evq-opt-${qId}-${n}`; inp.placeholder = `Opción ${n+1}`;
  inp.style.cssText = 'flex:1;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:3px;color:var(--text);font-size:13px;outline:none;min-width:100px';
  wrap.insertBefore(inp, wrap.lastElementChild);
}

function collectEvQuestions() {
  const list = el('ev-questions-list'); if (!list) return [];
  const qs = [];
  list.querySelectorAll('[id^="evq-block-"]').forEach(block => {
    const qId = block.id.replace('evq-block-','');
    const question = (el(`evq-q-${qId}`)?.value||'').trim();
    const answer   = (el(`evq-a-${qId}`)?.value||'').trim();
    const options  = [];
    block.querySelectorAll(`input[id^="evq-opt-${qId}-"]`).forEach(i => { const v=i.value.trim(); if(v) options.push(v); });
    if (question && answer && options.length >= 2) {
      if (!options.includes(answer)) options.push(answer);
      qs.push({ question, answer, options, difficulty:'medio' });
    }
  });
  return qs;
}

async function saveEvent() {
  const title     = el('ev-title').value.trim();
  const desc      = el('ev-desc').value.trim();
  const category  = el('ev-cat').value;
  const status    = el('ev-status').value;
  const rounds    = parseInt(el('ev-rounds').value) || 6;
  const starts_at = el('ev-starts').value || null;
  const ends_at   = el('ev-ends').value   || null;

  if (!title)    return alert('El evento necesita un título');
  if (!category) return alert('Selecciona una categoría');

  const questions = collectEvQuestions();
  if (!questions.length) return alert('Añade al menos una pregunta al evento');

  const payload = { title, description:desc, category, difficulty:'medio', status, rounds, starts_at, ends_at, questions };

  try {
    let res;
    if (editingEventId) {
      res = await fetch(`${SERVER}/api/events/${editingEventId}`, {
        method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
      }).then(r=>r.json());
    } else {
      res = await apiPost('/api/events', payload);
    }
    if (res.ok) {
      closeEventModal();
      flashMsg(editingEventId ? `Evento actualizado (${questions.length} preguntas)` : `Evento creado con ${questions.length} preguntas`, 'success', 'msg-events');
      loadEvents();
    } else { alert(res.msg || 'Error al guardar'); }
  } catch(e) { alert('Error de conexión: ' + e.message); }
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  try {
    const res = await fetch(`${SERVER}/api/events/${id}`, { method: 'DELETE' }).then(r => r.json());
    if (res.ok) { flashMsg('Event deleted', 'success', 'msg-events'); loadEvents(); }
    else alert(res.msg || 'Error deleting');
  } catch { alert('Connection error'); }
}

function openEventModal()  { el('modal-event').classList.add('show'); }
function closeEventModal() { el('modal-event').classList.remove('show'); }
document.addEventListener('DOMContentLoaded', () => {
  const me = el('modal-event');
  if (me) me.addEventListener('click', e => { if (e.target === me) closeEventModal(); });
  const m = el('modal');
  if (m) m.addEventListener('click', e => { if (e.target === m) closeModal(); });
});

// ── ADMIN SOCKET — control eventos ────────────────────────────────────────────
let adminSocket = null;

function connectAdminSocket() {
  if (adminSocket && adminSocket.connected) return;
  adminSocket = io(SERVER, { transports: ['polling'] });
  adminSocket.on('connect', () => adminSocket.emit('admin:watchEvents'));
  adminSocket.on('admin:eventStatus', ({ eventId, players, state, currentRound, totalRounds }) => {
    const pe = el(`ev-players-${eventId}`);
    const se = el(`ev-state-${eventId}`);
    if (pe) pe.textContent = `👥 ${players} en sala`;
    if (se) {
      const labels = { waiting:'⏳ Esperando jugadores', playing:'▶ En curso', spinning:`🎡 Ronda ${currentRound}/${totalRounds}`, question:`❓ Ronda ${currentRound}/${totalRounds}`, answer:`✅ Ronda ${currentRound}/${totalRounds}`, finished:'🏁 Terminado' };
      se.textContent = labels[state] || '';
    }
  });
}

function adminOpenEvent(id)  { toggleEventStatus(id, 'active'); }

function adminCloseEvent(id) {
  if (!confirm('¿Cerrar el evento? Dejará de aparecer para los jugadores.')) return;
  if (adminSocket) adminSocket.emit('admin:stopEvent', { eventId: String(id) });
  toggleEventStatus(id, 'closed');
}

function adminStartEvent(id) {
  if (!adminSocket) return alert('Sin conexión');
  adminSocket.once('error', ({ msg }) => alert('⚠️ ' + msg));
  adminSocket.emit('admin:startEvent', { eventId: String(id) });
  flashMsg('▶ Iniciando partida...', 'success', 'msg-events');
}

function adminStopEvent(id) {
  if (!confirm('¿Parar la partida en curso?')) return;
  if (!adminSocket) return alert('Sin conexión');
  adminSocket.emit('admin:stopEvent', { eventId: String(id) });
  flashMsg('⏸ Partida parada', 'success', 'msg-events');
}

async function toggleEventStatus(id, newStatus) {
  try {
    const ev = await apiGet(`/api/events/${id}`);
    const payload = {
      title: ev.title, description: ev.description||'', category: ev.category,
      difficulty: ev.difficulty||'medio', status: newStatus, rounds: ev.rounds||6,
      starts_at: ev.starts_at||null, ends_at: ev.ends_at||null,
      questions: (ev.questions||[]).map(q => ({
        question: q.question, answer: q.answer, difficulty: q.difficulty||'medio',
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options||'[]'),
      })),
    };
    const res = await fetch(`${SERVER}/api/events/${id}`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    }).then(r=>r.json());
    if (res.ok) { flashMsg('Estado actualizado', 'success', 'msg-events'); loadEvents(); }
    else alert(res.msg || 'Error');
  } catch(e) { alert('Error: ' + e.message); }
}

// ── STARTUP ───────────────────────────────────────────────────────────────────
loadData();
loadUsers();
loadEvents();
