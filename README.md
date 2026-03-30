# TurnosYa 🗓️

App de reserva de turnos para micronegocios (peluquerías, nail art, nutricionistas, etc.)

---

## Estructura del proyecto

```
turnosya/
├── sql/
│   └── turnosya_schema.sql     ← Base de datos completa
└── backend/
    ├── .env.example             ← Copia como .env y rellena
    ├── package.json
    └── src/
        ├── index.js             ← Servidor principal
        ├── config/
        │   ├── db.js            ← Conexión MySQL
        │   └── mailer.js        ← Emails con Nodemailer
        ├── middleware/
        │   └── auth.js          ← Autenticación JWT
        └── routes/
            ├── auth.js          ← Login / registro
            ├── negocios.js      ← Negocios, servicios, horarios
            └── turnos.js        ← Reservar, cancelar, gestionar
```

---

## Instalación paso a paso

### 1. Base de datos
```bash
mysql -u root -p < sql/turnosya_schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edita .env con tus datos reales
npm install
npm run dev
```

La API queda corriendo en `http://localhost:3000`

---

## Endpoints principales

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | /api/auth/register | Registrar negocio | No |
| POST | /api/auth/login | Login negocio | No |
| GET | /api/negocios | Listar negocios | No |
| GET | /api/negocios/:id | Detalle negocio | No |
| GET | /api/turnos/disponibles/:id | Horarios disponibles | No |
| POST | /api/turnos | Crear reserva | No |
| PUT | /api/turnos/:id/cancelar | Cancelar (cliente) | No |
| GET | /api/turnos | Ver mis turnos | Sí (JWT) |
| PUT | /api/turnos/:id/estado | Cambiar estado | Sí (JWT) |
| PUT | /api/negocios/perfil | Editar perfil | Sí (JWT) |
| GET | /api/negocios/horarios/mios | Ver horarios | Sí (JWT) |
| PUT | /api/negocios/horarios | Guardar horarios | Sí (JWT) |

---

## Para las rutas con Auth
Envía el token en el header:
```
Authorization: Bearer <token>
```

---

## Tecnologías
- Node.js + Express
- MySQL 8
- JWT (jsonwebtoken)
- bcryptjs
- Nodemailer

## Próximo paso: Frontend (PWA)
- HTML + CSS + JavaScript vanilla
- Pantalla cliente: buscar, reservar, cancelar
- Panel negocio: gestionar turnos, config horarios
