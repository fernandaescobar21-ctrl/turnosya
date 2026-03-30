/* ============================================================
   TurnosYa — API Client y utilidades globales
   ============================================================ */



/* ── API Client ─────────────────────────────────────────── */
const api = {
  _token() { return localStorage.getItem('ty_token'); },

  async _req(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this._token()) headers['Authorization'] = `Bearer ${this._token()}`;

    try {
      const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error del servidor');
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Sin conexión al servidor. Verifica que el backend esté corriendo.');
      }
      throw err;
    }
  },

  get:    (path)        => api._req('GET',    path),
  post:   (path, body)  => api._req('POST',   path, body),
  put:    (path, body)  => api._req('PUT',    path, body),
  delete: (path)        => api._req('DELETE', path),

  /* Auth */
  login(email, password)  { return this.post('/auth/login',    { email, password }); },
  register(data)          { return this.post('/auth/register', data); },

  /* Negocios */
  getNegocios(cat)        { return this.get(`/negocios${cat ? `?categoria=${cat}` : ''}`); },
  getNegocio(id)          { return this.get(`/negocios/${id}`); },
  updatePerfil(data)      { return this.put('/negocios/perfil', data); },

  /* Servicios */
  getMisServicios()       { return this.get('/negocios/servicios/mios'); },
  crearServicio(data)     { return this.post('/negocios/servicios', data); },
  deleteServicio(id)      { return this.delete(`/negocios/servicios/${id}`); },

  /* Horarios */
  getMisHorarios()        { return this.get('/negocios/horarios/mios'); },
  saveHorarios(horarios)  { return this.put('/negocios/horarios', { horarios }); },

  /* Turnos */
  getDisponibles(negocioId, fecha) { return this.get(`/turnos/disponibles/${negocioId}?fecha=${fecha}`); },
  crearTurno(data)         { return this.post('/turnos', data); },
  cancelarTurno(id, email) { return this.put(`/turnos/${id}/cancelar`, { email }); },
  getMisTurnos(query)      { return this.get(`/turnos${query || ''}`); },
  updateEstado(id, estado) { return this.put(`/turnos/${id}/estado`, { estado }); },
};

/* ── Auth helpers ──────────────────────────────────────── */
const auth = {
  guardar(token, negocio) {
    localStorage.setItem('ty_token',   token);
    localStorage.setItem('ty_negocio', JSON.stringify(negocio));
  },
  cerrar() {
    localStorage.removeItem('ty_token');
    localStorage.removeItem('ty_negocio');
    window.location.href = 'login-negocio.html';
  },
  negocio() {
    const raw = localStorage.getItem('ty_negocio');
    return raw ? JSON.parse(raw) : null;
  },
  estaLogueado() { return !!localStorage.getItem('ty_token'); },
  requireAuth() {
    if (!this.estaLogueado()) window.location.href = 'login-negocio.html';
  },
};

/* ── Toast ─────────────────────────────────────────────── */
function toast(msg, tipo = 'default') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  const colores = { success: '#1D9E75', error: '#E24B4A', default: '#2C2C2A' };
  el.style.background = colores[tipo] || colores.default;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

/* ── Fecha helpers ─────────────────────────────────────── */
const fechaUtil = {
  hoy()         { return new Date().toISOString().split('T')[0]; },
  formato(iso)  {
    const [y, m, d] = iso.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${d} ${meses[+m-1]} ${y}`;
  },
  diaSemana(iso) {
    const d = new Date(iso + 'T12:00:00');
    return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()];
  },
};

/* ── DOM helpers ───────────────────────────────────────── */
function qs(sel, ctx = document)  { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.original = btn.textContent;
    btn.textContent = 'Cargando...';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.original || btn.textContent;
    btn.disabled = false;
  }
}

/* ── Spinner ── */
function spinnerHTML() {
  return `<div style="text-align:center;padding:40px;color:var(--txt3)">
    <div style="width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--brand);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 12px"></div>
    Cargando...
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
}

/* ── Inicializar topbar de admin ── */
function initAdminTopbar() {
  const neg = auth.negocio();
  if (!neg) return;
  const avatar = qs('.topbar-avatar');
  if (avatar) {
    const initials = neg.nombre.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
    avatar.textContent = initials;
  }
  const logoutBtn = qs('#btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', auth.cerrar.bind(auth));
}
