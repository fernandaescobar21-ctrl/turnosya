// Middleware que bloquea negocios con plan vencido
const db = require('../config/db');

async function checkPlan(req, res, next) {
  if (!req.negocio?.id) return next();

  try {
    const [rows] = await db.execute(
      'SELECT plan, plan_vence FROM negocios WHERE id = ?',
      [req.negocio.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Negocio no encontrado' });

    const { plan_vence } = rows[0];

    // Si no tiene fecha de vencimiento → está en período de gracia (negocio nuevo)
    if (!plan_vence) return next();

    const vigente = new Date(plan_vence) >= new Date();
    if (!vigente) {
      return res.status(402).json({
        error: 'Plan vencido',
        mensaje: 'Tu plan ha vencido. Renueva para seguir recibiendo reservas.',
        renovar: true,
      });
    }
    next();
  } catch (err) {
    next(); // en caso de error de BD, no bloquear
  }
}

module.exports = checkPlan;
