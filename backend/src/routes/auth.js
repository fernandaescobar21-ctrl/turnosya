const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { check, rules } = require('../middleware/validate');
const router  = express.Router();

// POST /api/auth/register - Registro de nuevo negocio
router.post('/register', rules.register, check, async (req, res) => {
  const { nombre, categoria, email, password, telefono, direccion } = req.body;

  if (!nombre || !email || !password || !categoria) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO negocios (nombre, categoria, email, password, telefono, direccion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, categoria, email, hash, telefono || null, direccion || null]
    );

    const token = jwt.sign(
      { id: result.insertId, nombre, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ mensaje: 'Negocio registrado', token });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/auth/login - Login del negocio
router.post('/login', rules.login, check, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT * FROM negocios WHERE email = ? AND activo = TRUE',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const negocio = rows[0];
    const coincide = await bcrypt.compare(password, negocio.password);

    if (!coincide) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: negocio.id, nombre: negocio.nombre, email: negocio.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      negocio: {
        id:        negocio.id,
        nombre:    negocio.nombre,
        categoria: negocio.categoria,
        plan:      negocio.plan,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
