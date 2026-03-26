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
  kenya:   { name:'Kenya',     color:'#cc2200' },
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
el('modal').addEventListener('click', e => { if (e.target === el('modal')) closeModal(); });

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
  } catch {
    setHTML('events-list', '<div style="padding:20px;color:var(--muted)">Error loading events</div>');
  }
}

function renderEventsList(events) {
  if (!events.length) {
    setHTML('events-list', `
      <div style="text-align:center;padding:60px;color:var(--muted);font-size:14px">
        No events created yet.<br>
        <button class="btn btn-primary" style="margin-top:20px" onclick="openNewEvent()">Create first event</button>
      </div>`);
    return;
  }

  setHTML('events-list', events.map(ev => {
    const color = CAT_META[ev.category]?.color || '#888';
    const statusColor = ev.status==='active'?'#18c25a':ev.status==='upcoming'?'#3B9EFF':'var(--muted)';
    return `
      <div class="card" style="margin-bottom:12px;border-left:3px solid ${color}">
        <div class="card-header" style="background:var(--card-bg)">
          <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
            <span class="card-title" style="font-size:15px">${ev.title}</span>
            <span style="font-size:11px;color:var(--muted)">${ev.category}</span>
            <span style="font-family:var(--font-cond);font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:2px;background:rgba(45,125,210,0.1);color:var(--blue)">${ev.rounds || 6} rounds</span>
            <span style="font-size:11px;color:${statusColor};font-weight:600;text-transform:uppercase">● ${ev.status}</span>
          </div>
          <div class="q-actions">
            ${ev.status !== 'active'
              ? `<button class="btn-icon" onclick="toggleEventStatus(${ev.id}, 'active')" title="Activar" style="color:#18c25a">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="10 8 16 12 10 16 10 8"/></svg>
                </button>`
              : `<button class="btn-icon" onclick="toggleEventStatus(${ev.id}, 'finished')" title="Desactivar" style="color:#e84545">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6"/></svg>
                </button>`
            }
            <button class="btn-icon" onclick="openEditEvent(${ev.id})" title="Edit">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" onclick="deleteEvent(${ev.id})" title="Delete">
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
  setText('modal-event-title', 'New event');
  renderEventForm({});
  openEventModal();
}

async function openEditEvent(id) {
  try {
    const ev = await apiGet(`/api/events/${id}`);
    editingEventId = id;
    setText('modal-event-title', 'Edit event');
    renderEventForm(ev);
    // Load existing questions
    if (ev.questions && ev.questions.length) {
      ev.questions.forEach(q => addEventQuestion(q));
    }
    openEventModal();
  } catch {
    alert('Error loading event');
  }
}

function renderEventForm(ev) {
  const allCatOptions = Object.entries(CAT_META)
    .map(([id, m]) => `<option value="${id}" ${ev.category === id ? 'selected' : ''}>${m.name}</option>`).join('');

  const rounds = ev.rounds || 6;

  setHTML('modal-event-body', `
    <div class="field">
      <label>Event title</label>
      <input type="text" id="ev-title" value="${ev.title || ''}" placeholder="Event name">
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="ev-desc" rows="2" placeholder="Brief description of the event">${ev.description || ''}</textarea>
    </div>
    <div class="form-grid">
      <div class="field">
        <label>Category</label>
        <select id="ev-cat">
          ${allCatOptions}
        </select>
      </div>
      <div class="field">
        <label>Status</label>
        <select id="ev-status">
          <option value="active"   ${ev.status === 'active'   ? 'selected' : ''}>Active</option>
          <option value="upcoming" ${ev.status === 'upcoming' ? 'selected' : ''}>Upcoming</option>
          <option value="finished" ${ev.status === 'finished' ? 'selected' : ''}>Finished</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label>Number of rounds</label>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:6px">
        ${[4,6,8,10,12].map(n => `
          <button type="button"
            onclick="selectEventRounds(${n})"
            id="ev-round-btn-${n}"
            class="round-btn ${n === rounds ? 'selected' : ''}">
            ${n}
          </button>`).join('')}
      </div>
      <input type="hidden" id="ev-rounds" value="${rounds}">
    </div>

    <div class="form-grid">
      <div class="field">
        <label>Start date</label>
        <input type="datetime-local" id="ev-starts" value="${ev.starts_at ? ev.starts_at.replace(' ','T').slice(0,16) : ''}">
      </div>
      <div class="field">
        <label>End date</label>
        <input type="datetime-local" id="ev-ends" value="${ev.ends_at ? ev.ends_at.replace(' ','T').slice(0,16) : ''}">
      </div>
    </div>

    <div style="padding:14px 16px;background:rgba(45,125,210,0.06);border:1px solid rgba(45,125,210,0.2);border-radius:4px;font-size:13px;color:var(--muted);line-height:1.6">
      🎡 <strong style="color:var(--text)">Spin Wheel mode</strong> — unlimited players join the event room. Each round, the wheel spins and everyone answers the same question simultaneously. A podium is revealed at the end.
    </div>

    <!-- ── PREGUNTAS DEL EVENTO ── -->
    <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <span style="font-family:var(--font-cond);font-weight:700;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)">Preguntas del evento</span>
        <button type="button" onclick="addEventQuestion()" style="background:rgba(45,125,210,0.15);border:1px solid rgba(45,125,210,0.3);border-radius:3px;padding:5px 14px;font-family:var(--font-cond);font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--blue);cursor:pointer">+ Añadir pregunta</button>
      </div>
      <div id="ev-questions-list" style="display:flex;flex-direction:column;gap:10px"></div>
      <div id="ev-no-questions" style="text-align:center;padding:20px;color:var(--muted);font-size:13px">
        No hay preguntas todavía. Pulsa "+ Añadir pregunta" para empezar.
      </div>
    </div>
  `);

  setHTML('modal-event-footer', `
    <button class="btn btn-ghost" onclick="closeEventModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveEvent()">
      ${editingEventId ? 'Save changes' : 'Create event'}
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
  const qId = _evQCount;
  const list = el('ev-questions-list');
  const noQ  = el('ev-no-questions');
  if (noQ) noQ.style.display = 'none';

  const div = document.createElement('div');
  div.id = `evq-block-${qId}`;
  div.style.cssText = 'background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:4px;padding:14px';

  // Build options html (always 3 options)
  const opts = existing ? existing.options : ['', '', ''];
  const optsHtml = opts.map((opt, i) => `
    <input type="text" id="evq-opt-${qId}-${i}"
      value="${(opt||'').replace(/"/g,'&quot;')}"
      placeholder="Opción ${i+1}"
      style="flex:1;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:3px;color:var(--text);font-size:13px;outline:none;min-width:0">
  `).join('');

  div.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <span style="font-family:var(--font-cond);font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">Pregunta ${qId}</span>
      <button type="button" onclick="removeEventQuestion(${qId})" style="background:none;border:none;color:#e84545;cursor:pointer;font-size:16px;line-height:1">✕</button>
    </div>
    <div class="field" style="margin-bottom:10px">
      <label style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700;display:block;margin-bottom:6px">Pregunta</label>
      <input type="text" id="evq-q-${qId}"
        value="${existing ? (existing.question||'').replace(/"/g,'&quot;') : ''}"
        placeholder="Escribe la pregunta aquí..."
        style="width:100%;padding:10px;background:var(--bg);border:1.5px solid var(--border);border-radius:3px;color:var(--text);font-size:14px;outline:none">
    </div>
    <div class="field" style="margin-bottom:10px">
      <label style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#18c25a;font-weight:700;display:block;margin-bottom:6px">✓ Respuesta correcta</label>
      <input type="text" id="evq-a-${qId}"
        value="${existing ? (existing.answer||'').replace(/"/g,'&quot;') : ''}"
        placeholder="Escribe la respuesta correcta..."
        style="width:100%;padding:10px;background:var(--bg);border:1.5px solid #18c25a;border-radius:3px;color:#18c25a;font-size:14px;outline:none">
    </div>
    <div class="field" style="margin-bottom:0">
      <label style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);font-weight:700;display:block;margin-bottom:6px">Opciones de respuesta (mínimo 2)</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${optsHtml}
        <button type="button" onclick="addOptionToQuestion(${qId})"
          style="padding:8px 10px;background:rgba(255,255,255,0.05);border:1px dashed var(--border);border-radius:3px;color:var(--muted);cursor:pointer;font-size:12px;white-space:nowrap">+ opción</button>
      </div>
    </div>
  `;

  list.appendChild(div);
}

function removeEventQuestion(qId) {
  const block = el(`evq-block-${qId}`);
  if (block) block.remove();
  // Show "no questions" message if list is empty
  const list = el('ev-questions-list');
  if (list && list.children.length === 0) {
    const noQ = el('ev-no-questions');
    if (noQ) noQ.style.display = 'block';
  }
}

function addOptionToQuestion(qId) {
  const block = el(`evq-block-${qId}`);
  if (!block) return;
  const optionsWrap = block.querySelector('[style*="display:flex;gap:6px"]');
  if (!optionsWrap) return;
  const currentOpts = optionsWrap.querySelectorAll('input[type="text"]').length;
  const input = document.createElement('input');
  input.type = 'text';
  input.id = `evq-opt-${qId}-${currentOpts}`;
  input.placeholder = `Opción ${currentOpts + 1}`;
  input.style.cssText = 'flex:1;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:3px;color:var(--text);font-size:13px;outline:none;min-width:120px';
  const addBtn = optionsWrap.querySelector('button');
  optionsWrap.insertBefore(input, addBtn);
}

function collectEventQuestions() {
  const list = el('ev-questions-list');
  if (!list) return [];
  const questions = [];
  list.querySelectorAll('[id^="evq-block-"]').forEach(block => {
    const qId = block.id.replace('evq-block-', '');
    const question = (el(`evq-q-${qId}`)?.value || '').trim();
    const answer   = (el(`evq-a-${qId}`)?.value || '').trim();
    const options  = [];
    block.querySelectorAll(`input[id^="evq-opt-${qId}-"]`).forEach(inp => {
      const v = inp.value.trim();
      if (v) options.push(v);
    });
    if (question && answer && options.length >= 2) {
      // Make sure correct answer is in options
      if (!options.includes(answer)) options.push(answer);
      questions.push({ question, answer, options, difficulty: 'medio' });
    }
  });
  return questions;
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

  const questions = collectEventQuestions();
  if (!questions.length) return alert('Añade al menos una pregunta al evento');
  if (questions.length < rounds) {
    if (!confirm(`Tienes ${questions.length} pregunta(s) pero ${rounds} rondas. ¿Continuar de todas formas?`)) return;
  }

  const payload = { title, description: desc, category, difficulty: 'medio', status, rounds, starts_at, ends_at, questions };

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
      flashMsg(editingEventId ? `Evento actualizado (${questions.length} preguntas)` : `Evento creado con ${questions.length} preguntas`, 'success', 'msg-events');
      loadEvents();
    } else {
      alert(res.msg || 'Error al guardar el evento');
    }
  } catch(e) {
    alert('Error de conexión: ' + e.message);
  }
}

async function toggleEventStatus(id, newStatus) {
  try {
    // Get current event data first
    const ev = await apiGet(`/api/events/${id}`);
    ev.status = newStatus;
    const res = await fetch(`${SERVER}/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ev)
    }).then(r => r.json());
    if (res.ok) {
      const label = newStatus === 'active' ? '✅ Evento activado' : '⏹️ Evento desactivado';
      flashMsg(label, 'success', 'msg-events');
      loadEvents();
    } else {
      alert(res.msg || 'Error al cambiar estado');
    }
  } catch { alert('Error de conexión'); }
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
el('modal-event').addEventListener('click', e => { if (e.target === el('modal-event')) closeEventModal(); });

// ── STARTUP ───────────────────────────────────────────────────────────────────
loadData();
loadUsers();
