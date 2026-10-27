<?php
declare(strict_types=1);

class AdminController
{
    /* =========================================================
     * Дашборд: сводная статистика
     * GET /api/admin/stats
     * ========================================================= */
    public static function stats(): void
    {
        requireRole('admin');
        $pdo = db();

        $users       = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $blocked     = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE is_blocked = 1")->fetchColumn();
        $bookings    = (int)$pdo->query("SELECT COUNT(*) FROM bookings")->fetchColumn();
        $pending     = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status='pending'")->fetchColumn();
        $confirmed   = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status='confirmed'")->fetchColumn();
        $cancelled   = (int)$pdo->query("SELECT COUNT(*) FROM bookings WHERE status='cancelled'")->fetchColumn();
        $restaurants = (int)$pdo->query("SELECT COUNT(*) FROM restaurants")->fetchColumn();

        jsonOk([
            'users'       => $users,
            'blocked'     => $blocked,
            'bookings'    => $bookings,
            'pending'     => $pending,
            'confirmed'   => $confirmed,
            'cancelled'   => $cancelled,
            'restaurants' => $restaurants,
        ]);
    }

    /* =========================================================
     * Брони: список с пагинацией, сортировкой, фильтрами
     * GET /api/admin/bookings
     * ========================================================= */
    public static function bookings(): void
    {
        requireRole('admin');

        // 1. Пагинация
        $page    = max(1, (int)($_GET['page'] ?? 1));
        $perPage = max(1, min(100, (int)($_GET['per_page'] ?? 10)));
        
        // 2. Фильтры
        $status  = trim((string)($_GET['status'] ?? ''));
        $date    = trim((string)($_GET['date'] ?? ''));
        $q       = trim((string)($_GET['q'] ?? ''));

        // 3. Сортировка (белый список для защиты от SQL-инъекций)
        $sortMap = [
            'id'           => 'b.id',
            'booking_date' => 'b.booking_date',
            'created_at'   => 'b.created_at',
            'status'       => 'b.status',
            'guests'       => 'b.guests',
        ];
        $sortKey = $_GET['sort'] ?? 'id';
        $sort    = $sortMap[$sortKey] ?? 'b.id';
        $dir     = (strtolower($_GET['dir'] ?? 'desc') === 'asc') ? 'ASC' : 'DESC';

        // 4. Сборка WHERE
        $where  = [];
        $params = [];

        if (in_array($status, ['pending','confirmed','cancelled'], true)) {
            $where[]  = 'b.status = ?';
            $params[] = $status;
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $where[]  = 'b.booking_date = ?';
            $params[] = $date;
        }
        if ($q !== '') {
            $where[]  = '(us.full_name LIKE ? OR us.email LIKE ? OR r.name LIKE ?)';
            $like     = '%' . $q . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $pdo = db();

        // 5. Подсчёт общего количества
        $cnt = $pdo->prepare("
            SELECT COUNT(*)
            FROM bookings b
            JOIN users us       ON us.id = b.user_id
            JOIN tables t       ON t.id = b.table_id
            JOIN halls h        ON h.id = t.hall_id
            JOIN restaurants r  ON r.id = h.restaurant_id
            $whereSql
        ");
        $cnt->execute($params);
        $total = (int)$cnt->fetchColumn();

        $offset = ($page - 1) * $perPage;

        // 6. Выборка данных
        $sql = "
            SELECT b.id, b.booking_date, b.booking_time, b.guests, b.status,
                   b.comment, b.created_at,
                   t.number AS table_number, t.seats,
                   h.name AS hall_name,
                   r.id AS restaurant_id, r.name AS restaurant_name,
                   us.id AS user_id, us.login AS user_login,
                   us.full_name AS user_name, us.email AS user_email,
                   us.phone AS user_phone
            FROM bookings b
            JOIN users us       ON us.id = b.user_id
            JOIN tables t       ON t.id = b.table_id
            JOIN halls h        ON h.id = t.hall_id
            JOIN restaurants r  ON r.id = h.restaurant_id
            $whereSql
            ORDER BY $sort $dir
            LIMIT $perPage OFFSET $offset
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        jsonOk([
            'items'    => $stmt->fetchAll(),
            'page'     => $page,
            'per_page' => $perPage,
            'total'    => $total,
            'pages'    => (int)ceil($total / $perPage),
        ]);
    }

    /* =========================================================
     * Смена статуса брони (только статус)
     * PUT /api/admin/bookings/{id}/status
     * ========================================================= */
    public static function updateBookingStatus(string $id): void
    {
        requireRole('admin');
        $body   = readJson();
        $status = (string)($body['status'] ?? '');
        
        if (!in_array($status, ['pending','confirmed','cancelled'], true)) {
            throw new ValidationException('status must be pending|confirmed|cancelled');
        }
        
        $pdo = db();
        $chk = $pdo->prepare('SELECT id FROM bookings WHERE id = ?');
        $chk->execute([(int)$id]);
        if (!$chk->fetchColumn()) {
            throw new NotFoundException('Booking not found');
        }
        
        $upd = $pdo->prepare('UPDATE bookings SET status = ? WHERE id = ?');
        $upd->execute([$status, (int)$id]);
        jsonOk(['ok' => true]);
    }

    /* =========================================================
     * Полное редактирование брони
     * PUT /api/admin/bookings/{id}
     * ========================================================= */
    public static function updateBooking(string $id): void
    {
        requireRole('admin');
        $body    = readJson();
        $date    = trim((string)($body['booking_date'] ?? ''));
        $time    = trim((string)($body['booking_time'] ?? ''));
        $guests  = (int)($body['guests'] ?? 0);
        $status  = (string)($body['status'] ?? '');
        $comment = $body['comment'] ?? null;

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new ValidationException('Дата в формате ГГГГ-ММ-ДД');
        }
        if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $time)) {
            throw new ValidationException('Время в формате ЧЧ:ММ');
        }
        if (strlen($time) === 5) {
            $time .= ':00';
        }
        if ($guests < 1 || $guests > 20) {
            throw new ValidationException('Гостей от 1 до 20');
        }
        if (!in_array($status, ['pending','confirmed','cancelled'], true)) {
            throw new ValidationException('Некорректный статус');
        }

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('
                SELECT b.id, b.table_id, t.seats
                FROM bookings b
                JOIN tables t ON t.id = b.table_id
                WHERE b.id = ? FOR UPDATE
            ');
            $stmt->execute([(int)$id]);
            $b = $stmt->fetch();
            if (!$b) {
                throw new NotFoundException('Booking not found');
            }
            if ((int)$b['seats'] < $guests) {
                throw new ValidationException('Недостаточно мест за столиком');
            }

            // Проверка пересечения (90 минут)
            $start = $time;
            $end   = date('H:i:s', strtotime($date . ' ' . $time) + 90 * 60);
            $chk = $pdo->prepare("
                SELECT COUNT(*) FROM bookings
                WHERE table_id = ?
                  AND booking_date = ?
                  AND id <> ?
                  AND status IN ('pending','confirmed')
                  AND booking_time < ?
                  AND ADDTIME(booking_time, '01:30:00') > ?
            ");
            $chk->execute([(int)$b['table_id'], $date, (int)$id, $end, $start]);
            if ((int)$chk->fetchColumn() > 0) {
                throw new ConflictException('Столик уже забронирован на это время');
            }

            $upd = $pdo->prepare('
                UPDATE bookings
                SET booking_date = ?, booking_time = ?, guests = ?, status = ?, comment = ?
                WHERE id = ?
            ');
            $upd->execute([$date, $time, $guests, $status, $comment, (int)$id]);

            $pdo->commit();
            jsonOk(['ok' => true]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }

    /* =========================================================
     * Удаление брони
     * DELETE /api/admin/bookings/{id}
     * ========================================================= */
    public static function deleteBooking(string $id): void
    {
        requireRole('admin');
        $del = db()->prepare('DELETE FROM bookings WHERE id = ?');
        $del->execute([(int)$id]);
        if ($del->rowCount() === 0) {
            throw new NotFoundException('Booking not found');
        }
        jsonOk(['ok' => true]);
    }

    /* =========================================================
     * Пользователи: пагинация, сортировка, поиск, фильтр роли
     * GET /api/admin/users
     * ========================================================= */
    public static function users(): void
    {
        requireRole('admin');

        $page    = max(1, (int)($_GET['page'] ?? 1));
        $perPage = max(1, min(100, (int)($_GET['per_page'] ?? 10)));
        $q       = trim((string)($_GET['q'] ?? ''));
        $role    = trim((string)($_GET['role'] ?? ''));

        $sortMap = [
            'id'         => 'u.id',
            'login'      => 'u.login',
            'full_name'  => 'u.full_name',
            'email'      => 'u.email',
            'created_at' => 'u.created_at',
            'role'       => 'u.role',
        ];
        $sortKey = $_GET['sort'] ?? 'id';
        $sort    = $sortMap[$sortKey] ?? 'u.id';
        $dir     = (strtolower($_GET['dir'] ?? 'desc') === 'asc') ? 'ASC' : 'DESC';

        $where  = [];
        $params = [];
        if ($q !== '') {
            $where[]  = '(u.login LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)';
            $like     = '%' . $q . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        if (in_array($role, ['user','manager','admin'], true)) {
            $where[]  = 'u.role = ?';
            $params[] = $role;
        }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $pdo = db();
        $cnt = $pdo->prepare("SELECT COUNT(*) FROM users u $whereSql");
        $cnt->execute($params);
        $total = (int)$cnt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT u.id, u.login, u.full_name, u.email, u.phone,
                   u.role, u.is_blocked, u.created_at
            FROM users u
            $whereSql
            ORDER BY $sort $dir
            LIMIT $perPage OFFSET $offset
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        jsonOk([
            'items'    => $stmt->fetchAll(),
            'page'     => $page,
            'per_page' => $perPage,
            'total'    => $total,
            'pages'    => (int)ceil($total / $perPage),
        ]);
    }

    /* =========================================================
     * Смена роли
     * PUT /api/admin/users/{id}/role
     * ========================================================= */
    public static function updateUserRole(string $id): void
    {
        $me     = requireRole('admin');
        $body   = readJson();
        $role   = (string)($body['role'] ?? '');
        $userId = (int)$id;

        if (!in_array($role, ['user','manager','admin'], true)) {
            throw new ValidationException('role must be user|manager|admin');
        }
        // Нельзя разжаловать себя
        if ($userId === (int)$me['id'] && $role !== 'admin') {
            throw new ForbiddenException('Нельзя снять роль с самого себя');
        }

        $pdo = db();
        $chk = $pdo->prepare('SELECT id FROM users WHERE id = ?');
        $chk->execute([$userId]);
        if (!$chk->fetchColumn()) {
            throw new NotFoundException('User not found');
        }
        $upd = $pdo->prepare('UPDATE users SET role = ? WHERE id = ?');
        $upd->execute([$role, $userId]);
        jsonOk(['ok' => true]);
    }

    /* =========================================================
     * Блокировка / разблокировка
     * PUT /api/admin/users/{id}/block
     * ========================================================= */
    public static function toggleUserBlock(string $id): void
    {
        $me     = requireRole('admin');
        $userId = (int)$id;
        $body   = readJson();
        $block  = (int)($body['is_blocked'] ?? 0) === 1 ? 1 : 0;

        if ($userId === (int)$me['id']) {
            throw new ForbiddenException('Нельзя заблокировать самого себя');
        }

        $pdo = db();
        $chk = $pdo->prepare('SELECT id FROM users WHERE id = ?');
        $chk->execute([$userId]);
        if (!$chk->fetchColumn()) {
            throw new NotFoundException('User not found');
        }
        $upd = $pdo->prepare('UPDATE users SET is_blocked = ? WHERE id = ?');
        $upd->execute([$block, $userId]);

        if ($block === 1) {
            $del = $pdo->prepare('DELETE FROM csrf_tokens WHERE user_id = ?');
            $del->execute([$userId]);
        }
        jsonOk(['ok' => true]);
    }

    /* =========================================================
     * Удаление пользователя
     * DELETE /api/admin/users/{id}
     * ========================================================= */
    public static function deleteUser(string $id): void
    {
        $me     = requireRole('admin');
        $userId = (int)$id;
        if ($userId === (int)$me['id']) {
            throw new ForbiddenException('Нельзя удалить самого себя');
        }
        $del = db()->prepare('DELETE FROM users WHERE id = ?');
        $del->execute([$userId]);
        if ($del->rowCount() === 0) {
            throw new NotFoundException('User not found');
        }
        jsonOk(['ok' => true]);
    }
}