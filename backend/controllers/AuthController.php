<?php
declare(strict_types=1);

class AuthController
{
    public static function register(): void
    {
        $body = readJson();
        $name  = trim((string)($body['name'] ?? ''));
        $email = trim((string)($body['email'] ?? ''));
        $pass  = (string)($body['password'] ?? '');

        if ($name === '' || mb_strlen($name) < 2) {
            throw new ValidationException('Name is required');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('Invalid email');
        }
        if (strlen($pass) < 6) {
            throw new ValidationException('Password must be at least 6 characters');
        }

        $pdo = db();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        if ($stmt->fetchColumn()) {
            throw new ConflictException('Email already registered');
        }

        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $ins = $pdo->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, "user")');
        $ins->execute([$name, $email, $hash]);
        $id = (int)$pdo->lastInsertId();

        bootstrapSession();
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id' => $id, 'name' => $name, 'email' => $email, 'role' => 'user',
        ];

        jsonOk(['user' => $_SESSION['user']], 201);
    }

    public static function login(): void
    {
        $body = readJson();
        $email = trim((string)($body['email'] ?? ''));
        $pass  = (string)($body['password'] ?? '');

        if ($email === '' || $pass === '') {
            throw new ValidationException('Email and password required');
        }

        $stmt = db()->prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $u = $stmt->fetch();

        if (!$u || !password_verify($pass, $u['password_hash'])) {
            throw new AuthException('Invalid credentials');
        }

        bootstrapSession();
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id'    => (int)$u['id'],
            'name'  => $u['name'],
            'email' => $u['email'],
            'role'  => $u['role'],
        ];

        jsonOk(['user' => $_SESSION['user']]);
    }

    public static function logout(): void
    {
        bootstrapSession();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
        jsonOk(['ok' => true]);
    }

    public static function me(): void
    {
        $u = currentUser();
        if (!$u) {
            throw new AuthException('Unauthorized');
        }
        jsonOk(['user' => $u]);
    }
}