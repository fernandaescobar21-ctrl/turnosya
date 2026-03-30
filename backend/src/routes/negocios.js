const express = require('express');
const db      = require('../config/db');
const auth    = require('../middleware/auth');
const router  = express.Router();

// ─────────────────────────────────────────────
//  NEGOCIOS (públicos)
// ─────────────────────────────────────────────

// GET /api/negocios - Listar negocios activos
router.get('/', async (req, res) => {
  const { categoria } = req.query;
  let query  = 'SELECT id, nombre, categoria, telefono, direccion, descripcion FROM negocios WHERE activo = TRUE';
  const params = [];

  if (categoria) { query += ' AND categoria = ?'; params.push(categoria); }

  try {
    const [negocios] = await db.execute(query, params);
    res.json(negocios);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/negocios/:id - Detalle de un negocio
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT n.id, n.nombre, n.categoria, n.telefono, n.direccion, n.descripcion,
        JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'nombre', s.nombre, 'duracion_min', s.duracion_min, 'precio', s.precio)) AS servicios
       FROM negocios n
       LEFT JOIN servicios s ON s.negocio_id = n.id AND s.activo = TRUE
       WHERE n.id = ? AND n.activo = TRUE
       GROUP BY n.id`,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Negocio no encontrado' });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────
//  SERVICIOS (privados)
// ─────────────────────────────────────────────

// GET /api/negocios/servicios/mios
router.get('/servicios/mios', auth, async (req, res) => {
  try {
    const [servicios] = await db.execute(
      'SELECT * FROM servicios WHERE negocio_id = ?',
      [req.negocio.id]
    );
    res.json(servicios);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/negocios/servicios
router.post('/servicios', auth, async (req, res) => {
  const { nombre, duracion_min, precio } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre del servicio requerido' });

  try {
    const [result] = await db.execute(
      'INSERT INTO servicios (negocio_id, nombre, duracion_min, precio) VALUES (?, ?, ?, ?)',
      [req.negocio.id, nombre, duracion_min || 30, precio || null]
    );
    res.status(201).json({ id: result.insertId, nombre });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/negocios/servicios/:id
router.delete('/servicios/:id', auth, async (req, res) => {
  try {
    await db.execute(
      'UPDATE servicios SET activo = FALSE WHERE id = ? AND negocio_id = ?',
      [req.params.id, req.negocio.id]
    );
    res.json({ mensaje: 'Servicio eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────
//  HORARIOS (privados)
// ─────────────────────────────────────────────

// GET /api/negocios/horarios/mios
router.get('/horarios/mios', auth, async (req, res) => {
  try {
    const [horarios] = await db.execute(
      'SELECT * FROM horarios WHERE negocio_id = ? ORDER BY dia_semana',
      [req.negocio.id]
    );
    res.json(horarios);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/negocios/horarios - Guardar horarios completos
router.put('/horarios', auth, async (req, res) => {
  const { horarios } = req.body; // array de { dia_semana, hora_inicio, hora_fin, activo }

  if (!Array.isArray(horarios)) {
    return res.status(400).json({ error: 'Se esperaba un array de horarios' });
  }

  const conn = await (require('../config/db')).getConnection();
  try {
    await conn.beginTransaction();

    for (const h of horarios) {
      await conn.execute(
        `INSERT INTO horarios (negocio_id, dia_semana, hora_inicio, hora_fin, activo)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE hora_inicio = VALUES(hora_inicio),
                                 hora_fin    = VALUES(hora_fin),
                                 activo      = VALUES(activo)`,
        [req.negocio.id, h.dia_semana, h.hora_inicio, h.hora_fin, h.activo ?? true]
      );
    }

    await conn.commit();
    res.json({ mensaje: 'Horarios guardados' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Error al guardar horarios' });
  } finally {
    conn.release();
  }
});

// PUT /api/negocios/perfil - Actualizar datos del negocio
router.put('/perfil', auth, async (req, res) => {
  const { nombre, categoria, telefono, direccion, descripcion } = req.body;

  try {
    await db.execute(
      'UPDATE negocios SET nombre=?, categoria=?, telefono=?, direccion=?, descripcion=? WHERE id=?',
      [nombre, categoria, telefono, direccion, descripcion, req.negocio.id]
    );
    res.json({ mensaje: 'Perfil actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
