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
  require __DIR__ . '/config.php';
  $cfg = require __DIR__ . '/config.php';
  $d = $cfg['db'];
  $pdo = new PDO(
    "mysql:host={$d['host']};dbname={$d['name']};charset=utf8mb4",
    $d['user'], $d['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );
  $cnt = $pdo->query("SELECT COUNT(*) FROM restaurants")->fetchColumn();
  $result['db_status'] = 'OK';
  $result['restaurants_count'] = (int)$cnt;
} catch (Throwable $e) {
  $result['db_status'] = 'FAIL: ' . $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);