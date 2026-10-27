<?php
require_once __DIR__ . '/config.php';

$login = 'Conf2027';
$test_pass = 'Demo77'; // Пароль, который вы хотите использовать

$cfg = require __DIR__ . '/config.php';
$d = $cfg['db'];
$pdo = new PDO("mysql:host={$d['host']};dbname={$d['name']};charset=utf8mb4", $d['user'], $d['pass']);

$stmt = $pdo->prepare('SELECT password_hash FROM users WHERE login = ?');
$stmt->execute([$login]);
$hash = $stmt->fetchColumn();

echo "Хэш из базы: <pre>" . htmlspecialchars($hash) . "</pre>";

if (password_verify($test_pass, $hash)) {
    echo "<h2 style='color:green'>✅ Пароль СОВПАДАЕТ! Вход должен работать.</h2>";
} else {
    echo "<h2 style='color:red'>❌ Пароль НЕ СОВПАДАЕТ.</h2>";
    
    // Генерируем правильный хэш и показываем его
    $new_hash = password_hash($test_pass, PASSWORD_DEFAULT);
    echo "Сгенерирован новый правильный хэш для '$test_pass': <br>";
    echo "<textarea rows='3' cols='70'>{$new_hash}</textarea><br>";
    echo "<i>Скопируйте этот текст и вставьте его в базу данных в колонку password_hash для пользователя $login</i>";
}