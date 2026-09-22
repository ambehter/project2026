<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/auth-helpers.php';
require_once __DIR__ . '/router.php';

// Приглушаем вывод ошибок в тело ответа (7.4)
ini_set('display_errors', '0');
error_reporting(E_ALL);

sendCors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Убираем /backend/index.php из начала пути
$uri = preg_replace('#^/backend/index\.php#', '', $uri);

// Убираем и просто /backend (на случай прямого вызова)
$uri = preg_replace('#^/backend#', '', $uri);

// Должно остаться /api/...
if (strpos($uri, '/api') !== 0) {
    jsonError('Endpoint not found', 404);
}
if ($uri === '') $uri = '/';

try {
    route_dispatch($method, $uri);
} catch (AuthException $e) {
    jsonError($e->getMessage() ?: 'Unauthorized', 401);
} catch (ForbiddenException $e) {
    jsonError($e->getMessage() ?: 'Forbidden', 403);
} catch (NotFoundException $e) {
    jsonError($e->getMessage() ?: 'Not found', 404);
} catch (ConflictException $e) {
    jsonError($e->getMessage() ?: 'Conflict', 409);
} catch (ValidationException $e) {
    jsonError($e->getMessage() ?: 'Invalid data', 422);
} catch (Throwable $e) {
    // 7.5: не перезаписываем корректный код, но здесь уже только 500-е
    error_log('[API] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    jsonError('Internal server error', 500);
}