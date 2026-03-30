const { body, validationResult } = require('express-validator');

// Middleware que corta si hay errores
function check(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

const rules = {
  login: [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
  ],
  register: [
    body('nombre').trim().notEmpty().withMessage('Nombre del negocio requerido'),
    body('categoria').notEmpty().withMessage('Categoría requerida'),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  ],
  turno: [
    body('negocioId').isInt({ min: 1 }).withMessage('negocioId inválido'),
    body('servicioId').isInt({ min: 1 }).withMessage('servicioId inválido'),
    body('nombre').trim().notEmpty().withMessage('Nombre del cliente requerido'),
    body('email').isEmail().withMessage('Email inválido'),
    body('fecha').isDate().withMessage('Fecha inválida (YYYY-MM-DD)'),
    body('hora').matches(/^\d{2}:\d{2}$/).withMessage('Hora inválida (HH:MM)'),
  ],
};

module.exports = { check, rules };
