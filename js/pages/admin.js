// pages/admin.js
// Requires: utils.js

if (!Session.isAdmin()) goTo('trivial-login.html');

const TENANT = 'default';

const CAT_META = {
  sports:  { name:'Sports',    color:'#18c25a' },
  geo:     { name:'Geography', color:'#3B9EFF' },
  culture: { name:'Culture',   color:'#f5a623' },
  history: { name:'History',   color:'#e84545' },
  eu:      { name:'EU',        color:'#a259ff' },
  kenya:   { name:'Kenya',     color:'#cc2200' },
  mixed:   { name:'Mixed',     color:'#9b59b6' },
};

const DIFF_COLORS = { fácil:'#18c25a', medio:'#f5a623', difícil:'#e84545' };

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

let eventQuestions = [];
let editingEventId = null;

// Get questions from bank for a given category (or all for mixed)
function getBankQuestionsForCategory(catId) {
  if (!catId || catId === 'mixed') {
    // Return all questions from all categories
    const all = [];
    Object.entries(data.questions).forEach(([cId, qs]) => {
      const catInfo = data.categories.find(c => c.id === cId) || CAT_META[cId] || {};
      qs.forEach(q => all.push({ ...q, _catId: cId, _catName: catInfo.name || cId }));
    });
    return all;
  }
  const catInfo = data.categories.find(c => c.id === catId) || CAT_META[catId] || {};
  return (data.questions[catId] || []).map(q => ({ ...q, _catId: catId, _catName: catInfo.name || catId }));
}

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
    return `
      <div class="card" style="margin-bottom:12px;border-left:3px solid ${color}">
        <div class="card-header" style="background:var(--card-bg)">
          <div style="display:flex;align-items:center;gap:10px;flex:1">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></div>
            <span class="card-title" style="font-size:15px">${ev.title}</span>
            <span style="font-size:11px;color:var(--muted);margin-left:4px">${ev.category}</span>
            <span style="font-size:11px;color:${ev.status==='active'?'#18c25a':ev.status==='upcoming'?'#3B9EFF':'var(--muted)'};margin-left:4px;font-weight:600;text-transform:uppercase">● ${ev.status}</span>
          </div>
          <div class="q-actions">
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
  eventQuestions = [];
  setText('modal-event-title', 'New event');
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
    setText('modal-event-title', 'Edit event');
    renderEventForm(ev);
    openEventModal();
  } catch {
    alert('Error loading event');
  }
}

function renderEventForm(ev) {
  // Build category options including Mixed
  const allCatOptions = Object.entries(CAT_META)
    .map(([id, m]) => `<option value="${id}" ${ev.category === id ? 'selected' : ''}>${m.name}</option>`).join('');

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
        <select id="ev-cat" onchange="onEventCategoryChange()">
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
    <div class="form-grid">
      <div class="field">
        <label>Start date</label>
        <input type="datetime-local" id="ev-starts" value="${ev.starts_at ? ev.starts_at.slice(0,16) : ''}">
      </div>
      <div class="field">
        <label>End date</label>
        <input type="datetime-local" id="ev-ends" value="${ev.ends_at ? ev.ends_at.slice(0,16) : ''}">
      </div>
    </div>

    <div style="border-top:1px solid var(--border);margin:16px 0 14px;padding-top:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-family:var(--font-cond);font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:0.5px">
          Event Questions
        </span>
        <button class="btn btn-primary" style="padding:8px 16px;font-size:12px" onclick="addEventQuestion()">+ Add question</button>
      </div>

      <!-- Bank suggestions -->
      <div id="ev-bank-suggestions" style="margin-bottom:14px"></div>

      <div id="ev-questions-list"></div>
    </div>
  `);

  setHTML('modal-event-footer', `
    <button class="btn btn-ghost" onclick="closeEventModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveEvent()">
      ${editingEventId ? 'Save changes' : 'Create event'}
    </button>
  `);

  renderEventQuestionsList();
  renderBankSuggestions();
}

// Called when the category dropdown changes in the event form
function onEventCategoryChange() {
  renderBankSuggestions();
}

// Render suggestions from the question bank for the selected category
function renderBankSuggestions() {
  const catEl = el('ev-cat');
  if (!catEl) return;
  const catId = catEl.value;
  const suggestionsEl = el('ev-bank-suggestions');
  if (!suggestionsEl) return;

  const pool = getBankQuestionsForCategory(catId);
  if (!pool.length) {
    suggestionsEl.innerHTML = '';
    return;
  }

  // Filter out questions already added to eventQuestions
  const addedTexts = new Set(eventQuestions.map(q => q.question.trim().toLowerCase()));
  const available = pool.filter(q => !addedTexts.has(q.q.trim().toLowerCase()));

  if (!available.length) {
    suggestionsEl.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:8px 12px;background:rgba(255,255,255,0.03);border-radius:4px;border:1px dashed var(--border)">All bank questions for this category have already been added.</div>`;
    return;
  }

  const diffLabel = { 'fácil': 'Easy', 'medio': 'Medium', 'difícil': 'Hard' };
  const diffClass = { 'fácil': 'easy', 'medio': 'medio', 'difícil': 'dificil' };

  suggestionsEl.innerHTML = `
    <div style="margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <span style="font-family:var(--font-cond);font-weight:700;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)">
        💡 Suggestions from question bank
        <span style="background:rgba(45,125,210,0.15);color:var(--blue);padding:2px 8px;border-radius:10px;margin-left:6px">${available.length} available</span>
      </span>
      <button onclick="addAllSuggestions()" style="background:rgba(45,125,210,0.12);border:1px solid rgba(45,125,210,0.3);border-radius:3px;padding:5px 12px;font-family:var(--font-cond);font-weight:700;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--blue);cursor:pointer;transition:all .15s"
        onmouseover="this.style.background='rgba(45,125,210,0.22)'" onmouseout="this.style.background='rgba(45,125,210,0.12)'">
        Add all
      </button>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:4px;background:rgba(0,0,0,0.15)">
      ${available.map((q, i) => `
        <div class="suggestion-row" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.04);transition:background .12s;cursor:pointer"
          onmouseover="this.style.background='rgba(45,125,210,0.08)'" onmouseout="this.style.background=''"
          onclick="addSuggestionToEvent(${i})">
          ${catId === 'mixed' ? `<span style="font-size:9px;padding:2px 6px;border-radius:2px;background:${CAT_META[q._catId]?.color || '#888'}22;color:${CAT_META[q._catId]?.color || '#888'};font-family:var(--font-cond);font-weight:700;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;margin-top:2px">${q._catName}</span>` : ''}
          <span class="q-diff-badge ${diffClass[q.diff] || 'medio'}" style="flex-shrink:0;margin-top:2px">${diffLabel[q.diff] || q.diff}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:var(--text);line-height:1.4">${q.q}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">✓ ${q.a}</div>
          </div>
          <button style="flex-shrink:0;background:rgba(24,194,90,0.12);border:1px solid rgba(24,194,90,0.3);border-radius:3px;padding:4px 10px;font-family:var(--font-cond);font-weight:700;font-size:10px;letter-spacing:1px;color:#18c25a;cursor:pointer;white-space:nowrap"
            onclick="event.stopPropagation();addSuggestionToEvent(${i})">+ Add</button>
        </div>
      `).join('')}
    </div>
  `;

  // Store available pool reference for index access
  window._currentSuggestions = available;
}

function addSuggestionToEvent(idx) {
  const pool = window._currentSuggestions || [];
  const q = pool[idx];
  if (!q) return;

  eventQuestions.push({
    question:   q.q,
    answer:     q.a,
    options:    q.opts || [q.a],
    difficulty: q.diff || 'medio'
  });

  renderEventQuestionsList();
  renderBankSuggestions(); // refresh to remove added question
}

function addAllSuggestions() {
  const pool = window._currentSuggestions || [];
  pool.forEach(q => {
    eventQuestions.push({
      question:   q.q,
      answer:     q.a,
      options:    q.opts || [q.a],
      difficulty: q.diff || 'medio'
    });
  });
  renderEventQuestionsList();
  renderBankSuggestions();
}

function renderEventQuestionsList() {
  const list = el('ev-questions-list');
  if (!list) return;

  if (!eventQuestions.length) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;border:1.5px dashed var(--border);border-radius:4px">
      No questions yet. Add from the bank above or click "Add question".
    </div>`;
    return;
  }

  const diffLabel = { 'fácil': 'Easy', 'medio': 'Medium', 'difícil': 'Hard' };
  const diffClass = { 'fácil': 'easy', 'medio': 'medio', 'difícil': 'dificil' };

  list.innerHTML = `
    <div style="font-family:var(--font-cond);font-weight:700;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:6px">
      Added questions <span style="background:rgba(45,125,210,0.15);color:var(--blue);padding:2px 8px;border-radius:10px;margin-left:4px">${eventQuestions.length}</span>
    </div>
    ${eventQuestions.map((q, i) => {
      const dc = diffClass[q.difficulty] || 'medio';
      const dl = diffLabel[q.difficulty] || q.difficulty;
      return `
        <div class="q-item" style="margin-bottom:8px;border:1px solid var(--border);border-radius:4px">
          <span class="q-diff-badge ${dc}">${dl}</span>
          <div class="q-text-wrap" style="flex:1">
            <div class="q-text" style="font-size:13px">${q.question}</div>
            <div class="q-answer" style="font-size:11px">✓ ${q.answer}</div>
          </div>
          <div class="q-actions">
            <button class="btn-icon" onclick="editEventQuestion(${i})" title="Edit">
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" onclick="removeEventQuestion(${i})" title="Remove">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>`;
    }).join('')}
  `;
}

function addEventQuestion() {
  showEventQuestionSubModal(-1, {});
}

function editEventQuestion(idx) {
  showEventQuestionSubModal(idx, eventQuestions[idx]);
}

function showEventQuestionSubModal(idx, q) {
  const isEdit = idx >= 0;
  setText('modal-title', isEdit ? 'Edit question' : 'New event question');
  setHTML('modal-body', `
    <div class="field">
      <label>Question</label>
      <textarea id="evq-text" rows="3" placeholder="Write the question...">${q.question || ''}</textarea>
    </div>
    <div class="field">
      <label>Correct answer</label>
      <input type="text" id="evq-answer" value="${q.answer || ''}" placeholder="Correct answer">
    </div>
    <div class="form-grid">
      <div class="field"><label>Option 2</label><input type="text" id="evq-opt2" value="${(q.options && q.options[1]) || ''}" placeholder="Wrong option"></div>
      <div class="field"><label>Option 3</label><input type="text" id="evq-opt3" value="${(q.options && q.options[2]) || ''}" placeholder="Wrong option (optional)"></div>
    </div>
    <div class="field">
      <label>Difficulty</label>
      <select id="evq-diff">
        <option value="fácil"   ${q.difficulty === 'fácil'   ? 'selected' : ''}>Easy</option>
        <option value="medio"   ${q.difficulty === 'medio'   ? 'selected' : ''}>Medium</option>
        <option value="difícil" ${q.difficulty === 'difícil' ? 'selected' : ''}>Hard</option>
      </select>
    </div>
  `);
  setHTML('modal-footer', `
    <button class="btn btn-ghost" onclick="closeModal(); openEventModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveEventQuestion(${idx})">Save question</button>
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

  if (!question) return alert('Enter the question');
  if (!answer)   return alert('Enter the correct answer');
  if (!opt2)     return alert('Enter at least option 2');

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
  renderBankSuggestions();
}

function removeEventQuestion(idx) {
  if (!confirm('Remove this question?')) return;
  eventQuestions.splice(idx, 1);
  renderEventQuestionsList();
  renderBankSuggestions();
}

async function saveEvent() {
  const title     = el('ev-title').value.trim();
  const desc      = el('ev-desc').value.trim();
  const category  = el('ev-cat').value;
  const status    = el('ev-status').value;
  const starts_at = el('ev-starts').value || null;
  const ends_at   = el('ev-ends').value   || null;

  if (!title)    return alert('The event needs a title');
  if (!category) return alert('Select a category');

  // Use a default difficulty since we removed the selector
  const difficulty = 'medio';

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
      flashMsg(editingEventId ? 'Event updated' : 'Event created', 'success', 'msg-events');
      loadEvents();
    } else {
      alert(res.msg || 'Error saving event');
    }
  } catch(e) {
    alert('Connection error: ' + e.message);
  }
}

async function deleteEvent(id) {
  if (!confirm('Delete this event and all its questions?')) return;
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