/* ═══════════════════════════════════════════════════════
   utils.js  —  Trivial Travel
   Funciones utilitarias compartidas entre todas las páginas
   ═══════════════════════════════════════════════════════ */

   const SERVER = window.location.origin;

   /* ── MENSAJES ─────────────────────────────────────────── */
   function showMsg(text, type = 'error', targetId = 'msg') {
     const el = document.getElementById(targetId);
     if (!el) return;
     el.textContent = text;
     el.className   = `msg ${type} show`;
   }
   
   function hideMsg(targetId = 'msg') {
     const el = document.getElementById(targetId);
     if (el) el.className = 'msg';
   }
   
   function flashMsg(text, type = 'success', targetId = 'msg', ms = 3000) {
     showMsg(text, type, targetId);
     setTimeout(() => hideMsg(targetId), ms);
   }
   
   /* ── BOTONES DE CARGA ─────────────────────────────────── */
   function setLoading(btnId, on) {
     const el = document.getElementById(btnId);
     if (el) el.classList.toggle('loading', on);
   }
   
   /* ── PANTALLAS (SPA) ──────────────────────────────────── */
   function showScreen(id) {
     document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
     const el = document.getElementById('screen-' + id);
     if (el) el.classList.add('active');
   }
   
   /* ── NAVEGACIÓN ───────────────────────────────────────── */
   function goTo(url) {
     window.location.href = url;
   }
   
   /* ── SESIÓN ───────────────────────────────────────────── */
   const Session = {
     get(key)          { return sessionStorage.getItem(key); },
     set(key, value)   { sessionStorage.setItem(key, value); },
     remove(key)       { sessionStorage.removeItem(key); },
     clear()           { sessionStorage.clear(); },
     playerName()      { return sessionStorage.getItem('player_name') || ''; },
     playerRole()      { return sessionStorage.getItem('player_role') || 'guest'; },
     isAdmin()         { return sessionStorage.getItem('player_role') === 'admin'; },
     isGuest()         { return sessionStorage.getItem('player_role') === 'guest'; },
     isLoggedIn()      { return !!sessionStorage.getItem('player_name'); },
   };
   
   /* ── FETCH HELPERS ────────────────────────────────────── */
   async function apiFetch(path, options = {}) {
     const res = await fetch(`${SERVER}${path}`, {
       headers: { 'Content-Type': 'application/json' },
       ...options,
     });
     if (!res.ok) throw new Error(`HTTP ${res.status}`);
     return res.json();
   }
   
   async function apiGet(path) {
     return apiFetch(path);
   }
   
   async function apiPost(path, body) {
     return apiFetch(path, {
       method: 'POST',
       body: JSON.stringify(body),
     });
   }
   
   /* ── UTILIDADES DOM ───────────────────────────────────── */
   function qs(selector, parent = document)  { return parent.querySelector(selector); }
   function qsAll(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }
   function el(id) { return document.getElementById(id); }
   function setText(id, text) { const e = el(id); if (e) e.textContent = text; }
   function setHTML(id, html) { const e = el(id); if (e) e.innerHTML  = html; }
   function show(id) { const e = el(id); if (e) e.style.display = ''; }
   function hide(id) { const e = el(id); if (e) e.style.display = 'none'; }
   function toggle(id, force) { const e = el(id); if (e) e.classList.toggle('show', force); }
   
   /* ── COLORES DE JUGADORES ─────────────────────────────── */
   const PLAYER_COLORS = ['#2d7dd2','#e84545','#f5a623','#18c25a','#a259ff','#ff6b6b','#3B9EFF','#f5c842'];
   
   function playerColor(index) {
     return PLAYER_COLORS[index % PLAYER_COLORS.length];
   }
   
   function playerInitial(name = '') {
     return name.charAt(0).toUpperCase();
   }
   
   /* ── AVATAR HTML ──────────────────────────────────────── */
   function avatarHTML(name, index, size = 32) {
     const color = playerColor(index);
     return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-weight:800;font-size:${Math.floor(size * 0.44)}px;color:#0a0e1a;flex-shrink:0">${playerInitial(name)}</div>`;
   }