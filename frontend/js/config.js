// TurnosYa — Configuración de entorno
// Cuando subas a producción, cambia PROD_URL por tu URL de Railway
const PROD_URL = 'https://turnosya-production.up.railway.app/api';
const DEV_URL  = 'http://localhost:3000/api';

const API_URL = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1'
                ? DEV_URL 
                : PROD_URL;
