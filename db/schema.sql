SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS restaurant_booking
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE restaurant_booking;

DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS tables;
DROP TABLE IF EXISTS halls;
DROP TABLE IF EXISTS restaurants;
DROP TABLE IF EXISTS users;

-- 5.2 users
CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(32) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','manager','admin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5.3 restaurants
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

-- 5.4 halls
CREATE TABLE halls (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  restaurant_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  capacity INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_hall_rest FOREIGN KEY (restaurant_id)
    REFERENCES restaurants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5.5 tables
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

-- 5.6 bookings
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

-- 5.7 reviews (API не реализован, но схема по ТЗ)
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

-- ============ 5.8 Демо-данные ============
-- пароль для обоих: "password123"
INSERT INTO users (name, email, phone, password_hash, role) VALUES
('Менеджер', 'manager@demo.ru', '+7 900 000-00-01',
 '$2y$10$e0NRl7HnZbFjH7sJ7Q8mUO2XzLxV0T7T3sBqkFh7q3x9Rkq9c8o0y', 'manager'),
('Пользователь', 'user@demo.ru', '+7 900 000-00-02',
 '$2y$10$e0NRl7HnZbFjH7sJ7Q8mUO2XzLxV0T7T3sBqkFh7q3x9Rkq9c8o0y', 'user');

SET @mgr := (SELECT id FROM users WHERE email='manager@demo.ru');

INSERT INTO restaurants (manager_id, name, cuisine, address, city, description, rating, image_url, status) VALUES
(@mgr, 'Пушкинъ', 'Русская', 'Тверской бул., 26А', 'Москва',
 'Легендарный ресторан русской кухни в центре Москвы.', 4.9,
 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'published'),
(@mgr, 'White Rabbit', 'Авторская', 'Смоленская пл., 3', 'Москва',
 'Панорамный ресторан с авторской кухней Владимира Мухина.', 4.8,
 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', 'published');

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