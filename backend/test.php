<?php
// Включаем ошибки для теста
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

echo "<h2>1. Проверка файлов</h2>";
require_once __DIR__ . '/bootstrap.php';
echo "bootstrap.php - OK<br>";
require_once __DIR__ . '/csrf.php';
echo "csrf.php - OK<br>";

echo "<h2>2. Проверка БД</h2>";
try {
    $pdo = db();
    echo "Подключение к БД - OK<br>";
    
    // Проверяем наличие таблиц
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "Таблицы в БД: " . implode(', ', $tables) . "<br>";
    
    // Проверяем колонку is_blocked
    $col = $pdo->query("SHOW COLUMNS FROM users LIKE 'is_blocked'")->fetch();
    if ($col) {
        echo "Колонка is_blocked в users - ЕСТЬ<br>";
    } else {
        echo "<b style='color:red'>Колонка is_blocked в users - НЕТ! (Будет ошибка 500)</b><br>";
    }
} catch (Throwable $e) {
    echo "<b style='color:red'>Ошибка БД: " . $e->getMessage() . "</b><br>";
}

echo "<h2>3. Проверка Сессии</h2>";
try {
    bootstrapSession();
    $_SESSION['test'] = '123';
    echo "Сессия работает. ID: " . session_id() . "<br>";
} catch (Throwable $e) {
    echo "<b style='color:red'>Ошибка сессии: " . $e->getMessage() . "</b><br>";
}

echo "<h2>4. Проверка CSRF</h2>";
try {
    $token = generateCsrfToken();
    echo "Токен сгенерирован: " . $token . "<br>";
} catch (Throwable $e) {
    echo "<b style='color:red'>Ошибка CSRF: " . $e->getMessage() . "</b><br>";
}