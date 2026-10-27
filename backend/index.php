<?php
declare(strict_types=1);

// 1. Отключаем вывод ошибок в браузер (чтобы не ломать JSON)
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// 2. Подключаем необходимые файлы
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/auth-helpers.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/router.php';

// 3. Отправляем CORS заголовки
sendCors();

// 4. Получаем метод и URI
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri    = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Убираем /backend/index.php из начала пути
$uri = preg_replace('#^/backend/index\.php#', '', $uri);
$uri = preg_replace('#^/backend#', '', $uri);

if (strpos($uri, '/api') !== 0) {
    jsonError('Endpoint not found', 404);
}
if ($uri === '') {
    $uri = '/';
}

// 5. Обработка запроса и перехват исключений
try {
    $skipCsrfPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/csrf-token',
    ];

    if (!in_array($uri, $skipCsrfPaths, true)) {
        requireCsrf();
    }

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
    error_log('[API Error] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    jsonError('Internal server error', 500);
}