// pages/login.js
// Requiere: utils.js

function switchTab(tab) {
  const isLogin = tab === 'login';
  el('tab-login').classList.toggle('active', isLogin);
  el('tab-register').classList.toggle('active', !isLogin);
  el('form-login').style.display    = isLogin ? 'block' : 'none';
  el('form-register').style.display = isLogin ? 'none'  : 'block';
  setText('form-title',    isLogin ? 'Acceder' : 'Create account');
  setText('form-subtitle', isLogin ? 'Enter your details to continue' : 'Fill in the form to sign up');
  el('form-footer').innerHTML = isLogin
    ? 'Don\'t have an account? <a onclick="switchTab(\'register\')">Sign up</a>'
    : 'Already have an account? <a onclick="switchTab(\'login\')">Log in</a>';
  hideMsg();
}

function checkStrength(val) {
  const bar  = el('strength-bar');
  const fill = el('strength-fill');
  bar.classList.toggle('show', val.length > 0);
  let s = 0;
  if (val.length >= 6)          s++;
  if (val.length >= 10)         s++;
  if (/[A-Z]/.test(val))        s++;
  if (/[0-9]/.test(val))        s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  const lvl = [
    { w:'20%',  c:'#ef4444' },
    { w:'40%',  c:'#f97316' },
    { w:'60%',  c:'#eab308' },
    { w:'80%',  c:'#84cc16' },
    { w:'100%', c:'#22c55e' },
  ][Math.min(s, 4)];
  fill.style.width      = lvl.w;
  fill.style.background = lvl.c;
}

async function handleLogin() {
  const email = el('login-email').value.trim();
  const pass  = el('login-pass').value;
  hideMsg();
  if (!email) return showMsg('Enter your email or username');
  if (!pass)  return showMsg('Introduce tu contraseña');

  setLoading('btn-login', true);
  try {
    const data = await apiPost('/api/login', { email, password: pass });
    setLoading('btn-login', false);
    if (!data.ok) return showMsg(data.msg || 'Login failed');

    Session.set('player_name', data.name);
    Session.set('player_role', data.role);
    Session.set('player_email', email);

    showMsg('Logged in. Redirecting...', 'success');
    setTimeout(() => goTo(Session.isAdmin() ? 'trivial-admin.html' : 'trivial-modos.html'), 800);
  } catch {
    setLoading('btn-login', false);
    showMsg('Cannot connect to server');
  }
}

async function handleRegister() {
  const name  = el('reg-name').value.trim();
  const email = el('reg-email').value.trim();
  const pass  = el('reg-pass').value;
  hideMsg();
  if (!name)                return showMsg('Choose a username');
  if (name.length < 3)      return showMsg('Name must be at least 3 characters');
  if (!email)               return showMsg('Enter your email address');
  if (!email.includes('@')) return showMsg('Email address no válido');
  if (!pass)                return showMsg('Create a password');
  if (pass.length < 6)      return showMsg('Password must be at least 6 characters');

  setLoading('btn-register', true);
  try {
    const data = await apiPost('/api/register', { name, email, password: pass });
    setLoading('btn-register', false);
    if (!data.ok) return showMsg(data.msg || 'Registration failedse');

    showMsg('Account created. Welcome, ' + name, 'success');
    setTimeout(() => switchTab('login'), 1500);
  } catch {
    setLoading('btn-register', false);
    showMsg('Cannot connect to server');
  }
}

function handleGuest() {
  Session.set('player_name', 'Invitado');
  Session.set('player_role', 'guest');
  showMsg('Continuing as guest...', 'success');
  setTimeout(() => goTo('trivial-modos.html'), 600);
}

// ── Recuperación de contraseña ─────────────────────────────────────────────────
function showForgotModal() {
  el('forgot-modal').style.display = 'flex';
  el('forgot-secret').value = '';
  el('forgot-newpass').value = '';
  el('forgot-msg').textContent = '';
  el('forgot-msg').className = 'forgot-modal-msg';
}

function hideForgotModal() {
  el('forgot-modal').style.display = 'none';
}

async function handleResetPassword() {
  const secretKey   = el('forgot-secret').value.trim();
  const newPassword = el('forgot-newpass').value;
  const msgEl       = el('forgot-msg');

  msgEl.textContent = '';
  if (!secretKey)              { msgEl.textContent = 'Enter the secret key'; return; }
  if (!newPassword)            { msgEl.textContent = 'Enter new password'; return; }
  if (newPassword.length < 6)  { msgEl.textContent = 'At least 6 characters'; return; }

  const btn = el('btn-reset');
  btn.disabled = true;
  btn.textContent = 'Actualizando...';

  try {
    const data = await apiPost('/api/admin/reset-password', { secretKey, newPassword });
    if (data.ok) {
      msgEl.className = 'forgot-modal-msg success';
      msgEl.textContent = '✅ Password actualizada. You can now log in.';
      setTimeout(hideForgotModal, 2000);
    } else {
      msgEl.className = 'forgot-modal-msg error';
      msgEl.textContent = data.msg || 'Update failed';
    }
  } catch {
    msgEl.className = 'forgot-modal-msg error';
    msgEl.textContent = 'Error de conexión';
  }

  btn.disabled = false;
  btn.textContent = 'Update password';
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (el('forgot-modal').style.display === 'flex') { handleResetPassword(); return; }
  const loginVisible = el('form-login').style.display !== 'none';
  if (loginVisible) handleLogin(); else handleRegister();
});
