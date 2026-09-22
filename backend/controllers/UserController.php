<?php
declare(strict_types=1);

class UserController
{
    public static function updateProfile(): void
    {
        $u = authenticate();
        $body = readJson();
        $name  = trim((string)($body['name'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));

        if ($name === '') {
            throw new ValidationException('Name is required');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('Invalid email');
        }

        $pdo = db();
        $chk = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
        $chk->execute([$email, (int)$u['id']]);
        if ($chk->fetchColumn()) {
            throw new ConflictException('Email already in use');
        }

        $upd = $pdo->prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?');
        $upd->execute([$name, $email, $phone ?: null, (int)$u['id']]);

        // синхронизация сессии
        bootstrapSession();
        $_SESSION['user']['name']  = $name;
        $_SESSION['user']['email'] = $email;

        jsonOk(['user' => $_SESSION['user']]);
    }

    public static function updatePassword(): void
    {
        $u = authenticate();
        $body = readJson();
        $cur = (string)($body['current_password'] ?? '');
        $new = (string)($body['new_password'] ?? '');

        if ($cur === '' || $new === '') {
            throw new ValidationException('current_password and new_password required');
        }
        if (strlen($new) < 6) {
            throw new ValidationException('New password must be at least 6 characters');
        }

        $pdo = db();
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([(int)$u['id']]);
        $hash = $stmt->fetchColumn();
        if (!$hash || !password_verify($cur, $hash)) {
            throw new AuthException('Current password is incorrect');
        }

        $upd = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $upd->execute([password_hash($new, PASSWORD_DEFAULT), (int)$u['id']]);
        jsonOk(['ok' => true]);
    }
}