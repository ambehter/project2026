<?php
header('Content-Type: application/json; charset=utf-8');

$result = [
    'php_version'   => PHP_VERSION,
    'pdo_mysql'     => extension_loaded('pdo_mysql'),
    'request_uri'   => $_SERVER['REQUEST_URI'] ?? null,
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? null,
    'backend_path'  => __DIR__,
    'db_status'     => null,
];

try {
    // Подключаем ваш bootstrap.php (там, где создается функция db())
    require_once __DIR__ . '/bootstrap.php'; 
    
    // Пробуем выполнить простой запрос к БД
    $pdo = db();
    $cnt = $pdo->query("SELECT COUNT(*) FROM restaurants")->fetchColumn();
    
    $result['db_status'] = 'OK';
    $result['restaurants_count'] = (int)$cnt;
} catch (Throwable $e) {
    $result['db_status'] = 'FAIL: ' . $e->getMessage();
}

// Выводим результат в формате JSON
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);