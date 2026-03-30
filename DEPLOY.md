# TurnosYa — Guía de Deploy (30-40 min)

## Paso 1: Subir código a GitHub (5 min)

```bash
# En tu computador, dentro de la carpeta turnosya/
git init
git add .
git commit -m "TurnosYa v1.0 - lista para producción"

# Crea un repo en github.com y luego:
git remote add origin https://github.com/TU_USUARIO/turnosya.git
git push -u origin main
```

Crea un archivo `.gitignore` en backend/ con:
```
node_modules/
.env
```

---

## Paso 2: Base de datos en Railway (10 min)

1. Ve a https://railway.app → Sign up con GitHub (gratis)
2. New Project → Add Service → Database → MySQL
3. Click en el servicio MySQL → Variables → copia:
   - MYSQL_HOST
   - MYSQL_PORT
   - MYSQL_USER
   - MYSQL_PASSWORD
   - MYSQL_DATABASE
4. Ve a la pestaña "Query" y pega todo el contenido de `sql/turnosya_schema.sql`
5. Ejecuta → ¡base de datos lista!

---

## Paso 3: Backend en Railway (10 min)

1. En Railway → New Service → GitHub Repo → elige tu repo
2. Selecciona la carpeta `backend/` como root directory
3. Ve a Variables y agrega:

```
DB_HOST=          ← el MYSQL_HOST de paso 2
DB_PORT=          ← el MYSQL_PORT
DB_USER=          ← el MYSQL_USER
DB_PASSWORD=      ← el MYSQL_PASSWORD
DB_NAME=          ← el MYSQL_DATABASE
JWT_SECRET=       ← inventa una clave larga: "turnosya_super_secreto_2025_abc123"
EMAIL_USER=       ← tucorreo@gmail.com
EMAIL_PASS=       ← tu App Password de Gmail (no tu contraseña normal)
NODE_ENV=production
```

4. Deploy → Railway te da una URL tipo:
   `https://turnosya-backend-production.up.railway.app`

5. Cópiala → ve a `frontend/js/config.js` → reemplaza PROD_URL con esa URL + /api

---

## Paso 4: Frontend en Netlify (5 min)

1. Ve a https://netlify.com → Sign up con GitHub (gratis)
2. Add new site → Import from Git → elige tu repo
3. Base directory: `frontend`
4. Build command: (dejar vacío)
5. Publish directory: `frontend`
6. Deploy site

Netlify te da una URL tipo: `https://turnosya.netlify.app`

---

## Paso 5: Configurar CORS (2 min)

En Railway, agrega esta variable al backend:
```
FRONTEND_URL=https://turnosya.netlify.app
```

Redeploy → ¡listo!

---

## Cómo obtener App Password de Gmail

1. Ve a tu cuenta Google → Seguridad
2. Verificación en 2 pasos → actívala si no está
3. Contraseñas de aplicaciones
4. Selecciona "Correo" + "Mi PC" → Generar
5. Copia la contraseña de 16 caracteres → úsala como EMAIL_PASS

---

## Verificar que todo funciona

Abre: `https://turnosya-backend-production.up.railway.app/`
Debes ver: `{"status":"ok","mensaje":"TurnosYa API funcionando"}`

Si ves eso → ¡la app está 100% operativa en producción! 🎉
