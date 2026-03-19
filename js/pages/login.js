// pages/login.js
// Requiere: utils.js

function switchTab(tab) {
    const isLogin = tab === 'login';
    el('tab-login').classList.toggle('active', isLogin);
    el('tab-register').classList.toggle('active', !isLogin);
    el('form-login').style.display    = isLogin ? 'block' : 'none';
    el('form-register').style.display = isLogin ? 'none'  : 'block';
    setText('form-title',    isLogin ? 'Acceder' : 'Crear cuenta');
    setText('form-subtitle', isLogin ? 'Introduce tus datos para continuar' : 'Rellena el formulario para registrarte');
    el('form-footer').innerHTML = isLogin
      ? '¿No tienes cuenta? <a onclick="switchTab(\'register\')">Regístrate</a>'
      : '¿Ya tienes cuenta? <a onclick="switchTab(\'login\')">Inicia sesión</a>';
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
    if (!email) return showMsg('Introduce tu correo o usuario');
    if (!pass)  return showMsg('Introduce tu contraseña');
  
    setLoading('btn-login', true);
    try {
      const data = await apiPost('/api/login', { email, password: pass });
      setLoading('btn-login', false);
      if (!data.ok) return showMsg(data.msg || 'Error al iniciar sesión');
  
      Session.set('player_name', data.name);
      Session.set('player_role', data.role);
      Session.set('player_email', email);
  
      showMsg('Sesión iniciada. Redirigiendo...', 'success');
      setTimeout(() => goTo(Session.isAdmin() ? 'trivial-admin.html' : 'trivial-modos.html'), 800);
    } catch {
      setLoading('btn-login', false);
      showMsg('No se puede conectar al servidor');
    }
  }
  
  async function handleRegister() {
    const name  = el('reg-name').value.trim();
    const email = el('reg-email').value.trim();
    const pass  = el('reg-pass').value;
    hideMsg();
    if (!name)                return showMsg('Elige un nombre de usuario');
    if (name.length < 3)      return showMsg('El nombre debe tener al menos 3 caracteres');
    if (!email)               return showMsg('Introduce tu correo electrónico');
    if (!email.includes('@')) return showMsg('Correo electrónico no válido');
    if (!pass)                return showMsg('Crea una contraseña');
    if (pass.length < 6)      return showMsg('La contraseña debe tener al menos 6 caracteres');
  
    setLoading('btn-register', true);
    try {
      const data = await apiPost('/api/register', { name, email, password: pass });
      setLoading('btn-register', false);
      if (!data.ok) return showMsg(data.msg || 'Error al registrarse');
  
      showMsg('Cuenta creada. Bienvenido, ' + name, 'success');
      setTimeout(() => switchTab('login'), 1500);
    } catch {
      setLoading('btn-register', false);
      showMsg('No se puede conectar al servidor');
    }
  }
  
  function handleGuest() {
    Session.set('player_name', 'Invitado');
    Session.set('player_role', 'guest');
    showMsg('Entrando como invitado...', 'success');
    setTimeout(() => goTo('trivial-modos.html'), 600);
  }
  
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const loginVisible = el('form-login').style.display !== 'none';
    if (loginVisible) handleLogin(); else handleRegister();
  });