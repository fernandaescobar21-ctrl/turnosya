const express   = require('express');
const db        = require('../config/db');
const auth      = require('../middleware/auth');
const checkPlan = require('../middleware/checkPlan');
const mailer    = require('../config/mailer');
const { check, rules } = require('../middleware/validate');
const router    = express.Router();

// ─────────────────────────────────────────────
//  RUTAS PÚBLICAS (cliente sin login)
// ─────────────────────────────────────────────

// GET /api/turnos/disponibles/:negocioId?fecha=2025-04-04
// Devuelve los horarios disponibles para un día
router.get('/disponibles/:negocioId', async (req, res) => {
  const { negocioId } = req.params;
  const { fecha }     = req.query;

  if (!fecha) return res.status(400).json({ error: 'Parámetro fecha requerido (YYYY-MM-DD)' });

  try {
    // Día de la semana en MySQL: 1=Domingo ... 7=Sábado
    // Ajustamos para que 1=Lunes ... 7=Domingo
    const [horario] = await db.execute(
      `SELECT hora_inicio, hora_fin FROM horarios
       WHERE negocio_id = ? AND dia_semana = DAYOFWEEK(?) - 1 AND activo = TRUE`,
      [negocioId, fecha]
    );

    if (horario.length === 0) {
      return res.json({ disponibles: [] }); // día cerrado
    }

    // Turnos ya ocupados ese día
    const [ocupados] = await db.execute(
      `SELECT hora FROM turnos
       WHERE negocio_id = ? AND fecha = ? AND estado != 'cancelado'`,
      [negocioId, fecha]
    );

    const ocupadasSet = new Set(ocupados.map(t => t.hora.slice(0, 5)));

    // Generar slots de 30 minutos dentro del horario
    const slots = [];
    const [hIni, mIni] = horario[0].hora_inicio.split(':').map(Number);
    const [hFin, mFin] = horario[0].hora_fin.split(':').map(Number);
    let minutos = hIni * 60 + mIni;
    const fin   = hFin * 60 + mFin;

    while (minutos < fin) {
      const h = String(Math.floor(minutos / 60)).padStart(2, '0');
      const m = String(minutos % 60).padStart(2, '0');
      const slot = `${h}:${m}`;
      slots.push({ hora: slot, disponible: !ocupadasSet.has(slot) });
      minutos += 30;
    }

    res.json({ disponibles: slots });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/turnos - Crear nueva reserva (cliente)
router.post('/', rules.turno, check, async (req, res) => {
  const { negocioId, servicioId, nombre, email, telefono, fecha, hora, notas } = req.body;

  if (!negocioId || !servicioId || !nombre || !email || !fecha || !hora) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    // Crear o buscar cliente
    let clienteId;
    const [existe] = await db.execute('SELECT id FROM clientes WHERE email = ?', [email]);

    if (existe.length > 0) {
      clienteId = existe[0].id;
    } else {
      const [nuevo] = await db.execute(
        'INSERT INTO clientes (nombre, email, telefono) VALUES (?, ?, ?)',
        [nombre, email, telefono || null]
      );
      clienteId = nuevo.insertId;
    }

    // Verificar que el slot esté disponible
    const [ocupado] = await db.execute(
      `SELECT id FROM turnos WHERE negocio_id = ? AND fecha = ? AND hora = ? AND estado != 'cancelado'`,
      [negocioId, fecha, hora]
    );

    if (ocupado.length > 0) {
      return res.status(409).json({ error: 'Ese horario ya está ocupado' });
    }

    // Insertar turno
    const [result] = await db.execute(
      `INSERT INTO turnos (negocio_id, cliente_id, servicio_id, fecha, hora, notas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [negocioId, clienteId, servicioId, fecha, hora, notas || null]
    );

    // Enviar email de confirmación
    await mailer.enviarConfirmacion({ nombre, email, fecha, hora });

    res.status(201).json({
      mensaje: 'Turno reservado con éxito',
      turnoId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/turnos/:id/cancelar - Cancelar turno (cliente con token de turno)
router.put('/:id/cancelar', async (req, res) => {
  const { id } = req.params;
  const { email } = req.body; // verificación básica por email

  try {
    const [turno] = await db.execute(
      `SELECT t.*, c.email FROM turnos t JOIN clientes c ON c.id = t.cliente_id WHERE t.id = ?`,
      [id]
    );

    if (turno.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });

    if (turno[0].email !== email) return res.status(403).json({ error: 'No autorizado' });

    if (turno[0].estado === 'cancelado') {
      return res.status(400).json({ error: 'El turno ya está cancelado' });
    }

    await db.execute(`UPDATE turnos SET estado = 'cancelado' WHERE id = ?`, [id]);

    res.json({ mensaje: 'Turno cancelado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────
//  RUTAS PRIVADAS (negocio autenticado)
// ─────────────────────────────────────────────

// GET /api/turnos - Ver todos los turnos del negocio
router.get('/', auth, checkPlan, async (req, res) => {
  const { fecha, estado } = req.query;
  let query  = `SELECT t.*, c.nombre AS cliente_nombre, c.email AS cliente_email,
                  c.telefono AS cliente_telefono, s.nombre AS servicio_nombre, s.precio
                FROM turnos t
                JOIN clientes c ON c.id = t.cliente_id
                JOIN servicios s ON s.id = t.servicio_id
                WHERE t.negocio_id = ?`;
  const params = [req.negocio.id];

  if (fecha)  { query += ' AND t.fecha = ?';  params.push(fecha); }
  if (estado) { query += ' AND t.estado = ?'; params.push(estado); }

  query += ' ORDER BY t.fecha, t.hora';

  try {
    const [turnos] = await db.execute(query, params);
    res.json(turnos);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/turnos/:id/estado - Confirmar o cambiar estado (negocio)
router.put('/:id/estado', auth, checkPlan, async (req, res) => {
  const { id }     = req.params;
  const { estado } = req.body;
  const validos    = ['pendiente', 'confirmado', 'cancelado', 'completado'];

  if (!validos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    const [turno] = await db.execute(
      'SELECT id FROM turnos WHERE id = ? AND negocio_id = ?',
      [id, req.negocio.id]
    );

    if (turno.length === 0) return res.status(404).json({ error: 'Turno no encontrado' });

    await db.execute('UPDATE turnos SET estado = ? WHERE id = ?', [estado, id]);

    res.json({ mensaje: `Estado actualizado a "${estado}"` });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
