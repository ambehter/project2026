SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS restaurant_booking
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurant_booking;

-- ============================================================
-- Удаление таблиц (порядок важен из-за внешних ключей)
-- csrf_tokens ссылается на users → удаляем её первой
-- reviews и bookings ссылаются на users и restaurants
-- tables → halls → restaurants → users
-- ============================================================
DROP TABLE IF EXISTS csrf_tokens;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS tables;
DROP TABLE IF EXISTS halls;
DROP TABLE IF EXISTS restaurants;
DROP TABLE IF EXISTS users;

-- ==================== users ====================
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','manager','admin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== csrf_tokens ====================
-- Хранит активные CSRF-токены. user_id может быть NULL для гостей.
-- Токен живёт 1 час, старые записи удаляются при генерации нового.
CREATE TABLE csrf_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at),
  INDEX idx_user (user_id),
  CONSTRAINT fk_csrf_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== rate_limits ====================
-- Хранит счётчики попыток для защиты от брутфорса.
-- Привязка к IP + действие (login, register).
CREATE TABLE rate_limits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  action VARCHAR(50) NOT NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 1,
  first_attempt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME NULL,
  INDEX idx_ip_action (ip_address, action),
  INDEX idx_blocked (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== restaurants ====================
CREATE TABLE restaurants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  manager_id INT UNSIGNED NULL,
  name VARCHAR(190) NOT NULL,
  cuisine VARCHAR(120) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  description TEXT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  image_url VARCHAR(500) NULL,
  status ENUM('draft','published','blocked') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rest_manager FOREIGN KEY (manager_id)
    REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_city_cuisine (city, cuisine)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== halls ====================
CREATE TABLE halls (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  capacity INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_hall_rest FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== tables ====================
CREATE TABLE tables (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hall_id INT UNSIGNED NOT NULL,
  number VARCHAR(20) NOT NULL,
  seats INT UNSIGNED NOT NULL DEFAULT 2,
  x INT NULL,
  y INT NULL,
  CONSTRAINT fk_table_hall FOREIGN KEY (hall_id)
    REFERENCES halls(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_hall_number (hall_id, number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== bookings ====================
CREATE TABLE bookings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  table_id INT UNSIGNED NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  guests INT UNSIGNED NOT NULL,
  status ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_book_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_book_table FOREIGN KEY (table_id)
    REFERENCES tables(id) ON DELETE CASCADE,
  INDEX idx_table_date (table_id, booking_date),
  INDEX idx_user_date (user_id, booking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== reviews ====================
CREATE TABLE reviews (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  restaurant_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  text TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rev_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_rest FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Демо-данные
-- Пароли устанавливаются через backend/install_admin.php
-- ============================================================

INSERT INTO users (login, full_name, email, phone, password_hash, role) VALUES
('Conf2027', 'Администратор портала', 'admin@conf2027.ru', '8(800)000-00-00',
 'ЗАГЛУШКА_ЗАМЕНИТЬ_ЧЕРЕЗ_install_admin.php', 'admin'),
('manager01', 'Менеджеров Менеджер Менеджерович', 'manager@demo.ru', '8(900)000-00-01',
 'ЗАГЛУШКА_ЗАМЕНИТЬ_ЧЕРЕЗ_install_admin.php', 'manager'),
('user01', 'Пользователев Пользователь Пользователевич', 'user@demo.ru', '8(900)000-00-02',
 'ЗАГЛУШКА_ЗАМЕНИТЬ_ЧЕРЕЗ_install_admin.php', 'user');

SET @mgr := (SELECT id FROM users WHERE email='manager@demo.ru');

INSERT INTO restaurants (manager_id, name, cuisine, address, city, description, rating, image_url, status) VALUES
(@mgr, 'Пушкинъ', 'Русская', 'Тверской бул., 26А', 'Москва',
 'Легендарный ресторан русской кухни в центре Москвы.', 4.9,
 'images/pushkin.jpg', 'published'),
(@mgr, 'White Rabbit', 'Авторская', 'Смоленская пл., 3', 'Москва',
 'Панорамный ресторан с авторской кухней Владимира Мухина.', 4.8,
 'images/white-rabbit.jpg', 'published'),
(@mgr, 'Турандот', 'Китайская', 'Тверской бул., 26', 'Москва',
 'Изысканная китайская кухня в центре Москвы.', 4.7,
 'images/turandot.jpg', 'published'),
(@mgr, 'Марио', 'Итальянская', 'Невский пр., 50', 'СПб',
 'Семейная итальянская траттория.', 4.6,
 'images/mario.jpg', 'published'),
(@mgr, 'Nobu', 'Японская', 'Пресненская наб., 12', 'Москва',
 'Японская кухня премиум-класса.', 4.7,
 'images/nobu.jpg', 'published'),
(@mgr, 'Фаренгейт', 'Европейская', 'Столешников пер., 11', 'Москва',
 'Ресторан европейской кухни.', 4.5,
 'images/farengeit.jpg', 'published'),
(@mgr, 'Erwin.РекаМореОкеан', 'Морская', 'Кутузовский пр., 2/1', 'Москва',
 'Морская кухня на набережной.', 4.6,
 'images/erwin.jpg', 'published'),
(@mgr, 'Мама Тао', 'Паназиатская', 'Берсеневская наб., 6', 'Москва',
 'Паназиатская кухня на Красном Октябре.', 4.5,
 'images/mama-tao.jpg', 'published'),
(@mgr, 'Self Edge Japanese', 'Японская', 'Кутузовский пр., 2/1', 'Москва',
 'Японская кухня с открытой кухней.', 4.4,
 'images/self-edge.jpg', 'published'),
(@mgr, 'Северяне', 'Русская', 'Лесная ул., 5', 'Москва',
 'Северная кухня, морепродукты.', 4.5,
 'images/severyane.jpg', 'published');

-- Залы и столики для ресторанов 1 и 2 (Пушкинъ, White Rabbit)
SET @r1 := (SELECT id FROM restaurants WHERE name='Пушкинъ');
SET @r2 := (SELECT id FROM restaurants WHERE name='White Rabbit');

INSERT INTO halls (restaurant_id, name, capacity) VALUES
(@r1, 'Основной зал', 40),
(@r2, 'Веранда', 30);

SET @h1 := (SELECT id FROM halls WHERE restaurant_id=@r1 AND name='Основной зал');
SET @h2 := (SELECT id FROM halls WHERE restaurant_id=@r2 AND name='Веранда');

INSERT INTO tables (hall_id, number, seats, x, y) VALUES
(@h1, '1', 2, 10, 10),
(@h1, '2', 4, 20, 10),
(@h2, '5', 2, 10, 10),
(@h2, '8', 6, 30, 20);

-- Залы и столики для ресторанов 3–10 (Турандот, Марио, Nobu, Фаренгейт, Erwin, Мама Тао, Self Edge, Северяне)

INSERT INTO halls (restaurant_id, name, capacity) VALUES (3, 'Основной зал', 60);
SET @h := LAST_INSERT_ID();
INSERT INTO tables (hall_id, number, seats) VALUES
(@h, '1', 2), (@h, '2', 4), (@h, '3', 6), (@h, '4', 4);

INSERT INTO halls (restaurant_id, name, capacity) VALUES (4, 'Основной зал', 40);
SET @h := LAST_INSERT_ID();
INSERT INTO tables (hall_id, number, seats) VALUES
(@h, '1', 2), (@h, '2', 4), (@h, '3', 6);

INSERT INTO halls (restaurant_id, name, capacity) VALUES (5, 'Основной зал', 30);
SET @h := LAST_INSERT_ID();
INSERT INTO tables (hall_id, number, seats) VALUES
(@h, '1', 2), (@h, '2', 4), (@h, '3', 6);

INSERT INTO halls (restaurant_id, name, capacity) VALUES (6, 'Основной зал', 35);
SET @h := LAST_INSERT_ID();
INSERT INTO tables (hall_id, number, seats) VALUES
(@h, '1', 2), (@h, '2', 4), (@h, '3', 4);

INSERT INTO halls (restaurant_id, name, capacity) VALUES (7, 'Терраса', 50);
SET @h := LAST_INSERT_ID();
INSERT INTO tables (hall_id, number, seats) VALUES
(@h, '1', 2), (@h, '2', 4), (@h, '3', 6), (@h, '4', 2);

INSERT INTO halls (restaurant_id, name, capacity) VALUES (8, 'Основной зал', 40);
SET @h := LAST_INSERT_ID();
INSERT INTO tables (hall_id, number, seats) VALUES
(@h, '1', 2), (@h, '2', 4), (@h, '3', 6);

INSERT INTO halls (restaurant_id, name, capacity) VALUES (9, 'Основной зал', 25);
SET @h := LAST_INSERT_ID();
INSERT INTO tables (hall_id, number, seats) VALUES
(@h, '1', 2), (@h, '2', 4), (@h, '3', 2);

INSERT INTO halls (restaurant_id, name, capacity) VALUES (10, 'Основной зал', 45);
SET @h := LAST_INSERT_ID();
INSERT INTO tables (hall_id, number, seats) VALUES
(@h, '1', 2), (@h, '2', 4), (@h, '3', 6);