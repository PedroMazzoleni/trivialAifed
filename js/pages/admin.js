// pages/admin.js
// Requiere: utils.js

// Redirigir si no es admin
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

let data       = { categories: [], questions: {} };
let currentCat = null;
let editingQ   = null;

// ── INIT ─────────────────────────────────────────────────────────────────────
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

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
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

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
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

// ── QUESTIONS ─────────────────────────────────────────────────────────────────
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

// ── MODAL ─────────────────────────────────────────────────────────────────────
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
      <option value="fácil"   ${q?.diff==='fácil'  ?'selected':''}>Fácil (+1)</option>
      <option value="medio"   ${q?.diff==='medio'  ?'selected':''}>Medio (+2)</option>
      <option value="difícil" ${q?.diff==='difícil'?'selected':''}>Difícil (+3)</option>
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
}

function refresh() { renderSidebar(); renderDashboard(); renderQuestions(); }

// ── USUARIOS ─────────────────────────────────────────────────────────────────
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

// ── START ─────────────────────────────────────────────────────────────────────
loadData();
loadUsers();