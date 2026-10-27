<?php
declare(strict_types=1);

function generateCsrfToken(): string
{
    bootstrapSession();

    if (!empty($_SESSION['csrf_token']) && !empty($_SESSION['csrf_expires'])) {
        if (time() < $_SESSION['csrf_expires']) {
            return $_SESSION['csrf_token'];
        }
    }

    $token = bin2hex(random_bytes(32));
    $_SESSION['csrf_token']   = $token;
    $_SESSION['csrf_expires'] = time() + 3600;

    $pdo = db();
    $userId = $_SESSION['user']['id'] ?? null;

    if ($userId) {
        $del = $pdo->prepare('DELETE FROM csrf_tokens WHERE user_id = ? OR expires_at < NOW()');
        $del->execute([$userId]);
    } else {
        $pdo->exec('DELETE FROM csrf_tokens WHERE expires_at < NOW()');
    }

    $ins = $pdo->prepare('INSERT INTO csrf_tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
    $ins->execute([$userId, $token, date('Y-m-d H:i:s', time() + 3600)]);

    return $token;
}

function validateCsrfToken(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if ($token === '') throw new ForbiddenException('CSRF token missing');

    bootstrapSession();
    $sessionToken = $_SESSION['csrf_token'] ?? '';

    if (!hash_equals($sessionToken, $token)) {
        throw new ForbiddenException('Invalid CSRF token');
    }
    if (empty($_SESSION['csrf_expires']) || time() > $_SESSION['csrf_expires']) {
        throw new ForbiddenException('CSRF token expired');
    }
}

function requireCsrf(): void
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'], true)) {
        validateCsrfToken();
    }
}