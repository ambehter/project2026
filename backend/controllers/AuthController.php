<?php
declare(strict_types=1);

class AuthController
{
    /**
     * POST /api/auth/register
     * Регистрация: логин, ФИО, email, телефон, пароль.
     */
    public static function register(): void
    {
        $body      = readJson();
        $login     = trim((string)($body['login'] ?? ''));
        $full_name = trim((string)($body['full_name'] ?? ''));
        $email     = trim((string)($body['email'] ?? ''));
        $phone     = trim((string)($body['phone'] ?? ''));
        $pass      = (string)($body['password'] ?? '');

        // Логин: латиница + цифры, от 6 символов
        if (!preg_match('/^[A-Za-z0-9]{6,}$/', $login)) {
            throw new ValidationException('Логин: латиница и цифры, от 6 символов');
        }

        // ФИО: кириллица и пробелы
        if (!preg_match('/^[А-Яа-яЁё\s]+$/u', $full_name) || mb_strlen($full_name) < 2) {
            throw new ValidationException('ФИО: только кириллица и пробелы');
        }

        // Email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('Некорректный email');
        }

        // Телефон: 8(XXX)XXX-XX-XX
        if (!preg_match('/^8\(\d{3}\)\d{3}-\d{2}-\d{2}$/', $phone)) {
            throw new ValidationException('Телефон в формате 8(XXX)XXX-XX-XX');
        }

        // Пароль: от 8 символов
        if (strlen($pass) < 8) {
            throw new ValidationException('Пароль не менее 8 символов');
        }

        $pdo = db();

        // Уникальность логина
        $chk = $pdo->prepare('SELECT id FROM users WHERE login = ? LIMIT 1');
        $chk->execute([$login]);
        if ($chk->fetchColumn()) {
            throw new ConflictException('Логин уже занят');
        }

        // Уникальность email
        $chk = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $chk->execute([$email]);
        if ($chk->fetchColumn()) {
            throw new ConflictException('Email уже зарегистрирован');
        }

        // ХЕШИРОВАНИЕ ПАРОЛЯ
        $hash = password_hash($pass, PASSWORD_DEFAULT);

        // INSERT
        $ins = $pdo->prepare('
            INSERT INTO users (login, full_name, email, phone, password_hash, role)
            VALUES (?, ?, ?, ?, ?, "user")
        ');
        $ins->execute([$login, $full_name, $email, $phone, $hash]);
        $id = (int)$pdo->lastInsertId();

        bootstrapSession();
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id'        => $id,
            'login'     => $login,
            'full_name' => $full_name,
            'email'     => $email,
            'role'      => 'user',
        ];

        jsonOk(['user' => $_SESSION['user']], 201);
    }

    /**
     * POST /api/auth/login
     * Вход по логину и паролю.
     */
    public static function login(): void
    {
        $body  = readJson();
        $login = trim((string)($body['login'] ?? ''));
        $pass  = (string)($body['password'] ?? '');

        if ($login === '' || $pass === '') {
            throw new ValidationException('Логин и пароль обязательны');
        }

        // ВАЖНО: добавлено поле is_blocked в SELECT
        $stmt = db()->prepare('
            SELECT id, login, full_name, email, phone, password_hash, role, is_blocked
            FROM users WHERE login = ? LIMIT 1
        ');
        $stmt->execute([$login]);
        $u = $stmt->fetch();

        // ПРОВЕРКА ПАРОЛЯ
        if (!$u || !password_verify($pass, $u['password_hash'])) {
            throw new AuthException('Неверный логин или пароль');
        }

        // ПРОВЕРКА НА БЛОКИРОВКУ
        if ((int)($u['is_blocked'] ?? 0) === 1) {
            throw new ForbiddenException('Аккаунт заблокирован администратором');
        }

        bootstrapSession();
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id'        => (int)$u['id'],
            'login'     => $u['login'],
            'full_name' => $u['full_name'],
            'email'     => $u['email'],
            'role'      => $u['role'],
        ];

        jsonOk(['user' => $_SESSION['user']]);
    }

    /**
     * POST /api/auth/logout
     * Выход.
     */
    public static function logout(): void
    {
        bootstrapSession();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $p['path'],
                $p['domain'],
                $p['secure'],
                $p['httponly']
            );
        }
        session_destroy();
        jsonOk(['ok' => true]);
    }

    /**
     * GET /api/auth/me
     * Текущий пользователь.
     */
    public static function me(): void
    {
        $u = currentUser();
        if (!$u) {
            throw new AuthException('Unauthorized');
        }
        jsonOk(['user' => $u]);
    }
}