const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function enviarConfirmacion({ nombre, email, fecha, hora }) {
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f7f9f8;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#0C447C;font-size:24px;margin:0">TurnosYa</h1>
      </div>
      <div style="background:#fff;border-radius:10px;padding:24px;border:1px solid #e2e8f0">
        <h2 style="color:#1a202c;margin-top:0">¡Turno confirmado! ✅</h2>
        <p style="color:#4a5568">Hola <strong>${nombre}</strong>, tu reserva quedó registrada.</p>
        <div style="background:#EBF5FB;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:4px 0;color:#2c5282"><strong>📅 Fecha:</strong> ${fecha}</p>
          <p style="margin:4px 0;color:#2c5282"><strong>🕐 Hora:</strong> ${hora}</p>
        </div>
        <p style="color:#718096;font-size:14px">
          Puedes cancelar tu turno hasta 2 horas antes respondiendo este email.
        </p>
      </div>
      <p style="text-align:center;color:#a0aec0;font-size:12px;margin-top:20px">
        TurnosYa — Reservas sin complicaciones
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from:    `"TurnosYa" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `✅ Turno confirmado para el ${fecha} a las ${hora}`,
      html,
    });
  } catch (err) {
    console.error('Error enviando email:', err.message);
    // No lanzamos el error para no bloquear la reserva
  }
}

module.exports = { enviarConfirmacion };
