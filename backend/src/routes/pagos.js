const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const db     = require('../config/db');
const auth   = require('../middleware/auth');
const router = express.Router();

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

const PLANES = {
  basico: { nombre: 'Plan Básico TurnosYa', precio: 4990, descripcion: 'Hasta 50 turnos al mes' },
  pro:    { nombre: 'Plan Pro TurnosYa',    precio: 9990, descripcion: 'Turnos ilimitados + recordatorios' },
};

// POST /api/pagos/suscribir — el negocio inicia el pago de su plan
router.post('/suscribir', auth, async (req, res) => {
  const { plan } = req.body;
  if (!PLANES[plan]) return res.status(400).json({ error: 'Plan inválido' });

  const p = PLANES[plan];
  const preference = new Preference(mp);

  try {
    const result = await preference.create({
      body: {
        items: [{
          title:       p.nombre,
          description: p.descripcion,
          quantity:    1,
          currency_id: 'CLP',
          unit_price:  p.precio,
        }],
        payer: { email: req.negocio.email },
        external_reference: `${req.negocio.id}|${plan}`,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/admin.html?pago=ok`,
          failure: `${process.env.FRONTEND_URL}/admin.html?pago=error`,
          pending: `${process.env.FRONTEND_URL}/admin.html?pago=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/api/pagos/webhook`,
      }
    });

    res.json({
      init_point:   result.init_point,
      sandbox_init: result.sandbox_init_point,
    });
  } catch (err) {
    console.error('MP error:', err);
    res.status(500).json({ error: 'Error al crear preferencia de pago' });
  }
});

// POST /api/pagos/webhook — Mercado Pago notifica el resultado
router.post('/webhook', async (req, res) => {
  const { type, data } = req.body;
  if (type !== 'payment') return res.sendStatus(200);

  try {
    const payment = new Payment(mp);
    const pago = await payment.get({ id: data.id });

    if (pago.status !== 'approved') return res.sendStatus(200);

    const [negocioId, plan] = (pago.external_reference || '').split('|');
    if (!negocioId || !plan) return res.sendStatus(200);

    // Calcular fecha de vencimiento (30 días desde hoy)
    const vence = new Date();
    vence.setDate(vence.getDate() + 30);

    await db.execute(
      `UPDATE negocios SET plan = ?, plan_vence = ?, activo = TRUE WHERE id = ?`,
      [plan, vence.toISOString().split('T')[0], negocioId]
    );

    console.log(`Plan ${plan} activado para negocio ${negocioId} hasta ${vence.toDateString()}`);
    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err);
    res.sendStatus(500);
  }
});

// GET /api/pagos/estado — consultar estado del plan del negocio
router.get('/estado', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT plan, plan_vence, activo FROM negocios WHERE id = ?',
      [req.negocio.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Negocio no encontrado' });

    const neg   = rows[0];
    const hoy   = new Date();
    const vence = neg.plan_vence ? new Date(neg.plan_vence) : null;
    const vigente = vence ? vence >= hoy : false;

    res.json({
      plan:    neg.plan,
      vence:   neg.plan_vence,
      vigente,
      diasRestantes: vence ? Math.max(0, Math.ceil((vence - hoy) / 86400000)) : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
