-- ============================================================
--  TurnosYa - Esquema de Base de Datos
--  Motor: MySQL 8+
-- ============================================================

CREATE DATABASE IF NOT EXISTS turnosya CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE turnosya;

-- ------------------------------------------------------------
-- 1. NEGOCIOS
-- ------------------------------------------------------------
CREATE TABLE negocios(
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  categoria   VARCHAR(50)  NOT NULL,
  email       VARCHAR(120) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,          -- bcrypt hash
  telefono    VARCHAR(20),
  direccion   VARCHAR(200),
  descripcion TEXT,
  plan        ENUM('basico','pro') NOT NULL DEFAULT 'basico',
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 2. CLIENTES
-- ------------------------------------------------------------
CREATE TABLE clientes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  email      VARCHAR(120) NOT NULL UNIQUE,
  telefono   VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 3. SERVICIOS (cada negocio define los suyos)
-- ------------------------------------------------------------
CREATE TABLE servicios (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  negocio_id   INT NOT NULL,
  nombre       VARCHAR(100) NOT NULL,
  duracion_min INT  NOT NULL DEFAULT 30,   -- duración en minutos
  precio       DECIMAL(10,2),
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 4. HORARIOS (disponibilidad por día de la semana)
--    dia_semana: 1=Lunes ... 7=Domingo
-- ------------------------------------------------------------
CREATE TABLE horarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  negocio_id  INT  NOT NULL,
  dia_semana  TINYINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  hora_inicio TIME NOT NULL,
  hora_fin    TIME NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (negocio_id) REFERENCES negocios(id) ON DELETE CASCADE,
  UNIQUE KEY uq_negocio_dia (negocio_id, dia_semana)
);

-- ------------------------------------------------------------
-- 5. TURNOS
--    estado: pendiente → confirmado / cancelado / completado
-- ------------------------------------------------------------
CREATE TABLE turnos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  negocio_id  INT  NOT NULL,
  cliente_id  INT  NOT NULL,
  servicio_id INT  NOT NULL,
  fecha       DATE NOT NULL,
  hora        TIME NOT NULL,
  estado      ENUM('pendiente','confirmado','cancelado','completado')
              NOT NULL DEFAULT 'pendiente',
  notas       VARCHAR(300),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (negocio_id)  REFERENCES negocios(id)  ON DELETE CASCADE,
  FOREIGN KEY (cliente_id)  REFERENCES clientes(id)  ON DELETE CASCADE,
  FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
  -- Evita turnos duplicados: mismo negocio, fecha y hora
  UNIQUE KEY uq_turno_slot (negocio_id, fecha, hora)
);

-- ------------------------------------------------------------
-- DATOS DE PRUEBA
-- ------------------------------------------------------------

-- Negocio demo (password: demo1234 → bcrypt)
INSERT INTO negocios (nombre, categoria, email, password, telefono, direccion, plan)
VALUES (
  'Studio Valentina',
  'Peluquería & Color',
  'valentina@demo.cl',
  '$2b$10$YourHashHere',
  '+56912345678',
  'Concepción, Biobío',
  'pro'
);

-- Servicios del negocio
INSERT INTO servicios (negocio_id, nombre, duracion_min, precio) VALUES
  (1, 'Corte de cabello', 30, 12000),
  (1, 'Corte + Color',    90, 35000),
  (1, 'Brushing',         45, 15000),
  (1, 'Tinte completo',   120, 45000);

-- Horarios lunes a sábado
INSERT INTO horarios (negocio_id, dia_semana, hora_inicio, hora_fin) VALUES
  (1, 1, '09:00', '19:00'),
  (1, 2, '09:00', '19:00'),
  (1, 3, '09:00', '19:00'),
  (1, 4, '09:00', '19:00'),
  (1, 5, '09:00', '19:00'),
  (1, 6, '09:00', '14:00');

-- Cliente demo
INSERT INTO clientes (nombre, email, telefono)
VALUES ('María González', 'maria@demo.cl', '+56987654321');

-- Turno demo
INSERT INTO turnos (negocio_id, cliente_id, servicio_id, fecha, hora, estado)
VALUES (1, 1, 2, CURDATE() + INTERVAL 1 DAY, '10:00', 'pendiente');

-- ============================================================
--  Migración: agregar control de plan
-- ============================================================
ALTER TABLE negocios
  ADD COLUMN plan_vence DATE NULL,
  ADD COLUMN periodo_gracia_dias INT NOT NULL DEFAULT 30;

-- Los negocios nuevos tienen 30 días gratis automáticamente
-- El campo plan_vence NULL = en período de gracia
