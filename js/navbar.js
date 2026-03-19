// ── navbar.js ─────────────────────────────────────────────────────────────────
// Requiere: utils.js

function toggleDropdown(id) {
  const li = document.getElementById(id);
  const isOpen = li.classList.contains('open');
  document.querySelectorAll('.navbar-links li.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) li.classList.add('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.navbar-links li')) {
    document.querySelectorAll('.navbar-links li.open').forEach(el => el.classList.remove('open'));
  }
});

function toggleMobile() {
  document.getElementById('navbar-mobile').classList.toggle('open');
}

function logout() {
  sessionStorage.clear();
  window.location.href = 'trivial-login.html';
}

function initNavbar() {
  const name  = Session.playerName();
  const role  = Session.playerRole();
  const right = document.getElementById('navbar-right');
  if (!right) return;

  if (name && name !== 'Invitado') {
    right.innerHTML = `
      <div class="navbar-user-info">
        <div class="navbar-avatar">${name.charAt(0).toUpperCase()}</div>
        <span>${name}</span>
      </div>
      <button class="navbar-btn navbar-btn-ghost" onclick="logout()">Salir</button>
    `;
    if (role === 'admin') {
      const ddAdmin     = document.getElementById('dd-admin');
      const mobileAdmin = document.getElementById('mobile-admin');
      if (ddAdmin)     ddAdmin.style.display     = 'block';
      if (mobileAdmin) mobileAdmin.style.display = 'block';
    }
    const mobileLogin = document.getElementById('mobile-login');
    if (mobileLogin) mobileLogin.style.display = 'none';
  } else if (name === 'Invitado') {
    right.innerHTML = `
      <div class="navbar-user-info">
        <div class="navbar-avatar" style="background:#aaa">?</div>
        <span>Invitado</span>
      </div>
      <a class="navbar-btn navbar-btn-primary" href="trivial-login.html">Registrarse</a>
    `;
  } else {
    right.innerHTML = `
      <a class="navbar-btn navbar-btn-ghost" href="trivial-login.html">Iniciar sesión</a>
      <a class="navbar-btn navbar-btn-primary" href="trivial-login.html">Registrarse</a>
    `;
  }

  // Marcar link activo
  const path = window.location.pathname.split('/').pop() || 'trivial-intro.html';
  document.querySelectorAll('.navbar-links > li > a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === path);
  });
}

document.addEventListener('DOMContentLoaded', initNavbar);