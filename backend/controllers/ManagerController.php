<?php
declare(strict_types=1);

class ManagerController
{
    public static function bookings(): void
    {
        $u = requireManager();
        $status = trim((string)($_GET['status'] ?? ''));
        $date   = trim((string)($_GET['date'] ?? ''));

        $sql = "
            SELECT b.id, b.booking_date, b.booking_time, b.guests, b.status,
                   b.comment, b.created_at,
                   t.number AS table_number, t.seats,
                   h.name AS hall_name,
                   r.id AS restaurant_id, r.name AS restaurant_name,
                   us.name AS user_name, us.email AS user_email, us.phone AS user_phone
            FROM bookings b
            JOIN tables t  ON t.id = b.table_id
            JOIN halls h   ON h.id = t.hall_id
            JOIN restaurants r ON r.id = h.restaurant_id
            JOIN users us  ON us.id = b.user_id
            WHERE r.manager_id = ?
        ";
        $params = [(int)$u['id']];
        if (in_array($status, ['pending','confirmed','cancelled'], true)) {
            $sql .= " AND b.status = ?";
            $params[] = $status;
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $sql .= " AND b.booking_date = ?";
            $params[] = $date;
        }
        $sql .= " ORDER BY b.booking_date DESC, b.booking_time DESC";

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        jsonOk(['items' => $stmt->fetchAll()]);
    }

    public static function updateBooking(string $id): void
    {
        $u = requireManager();
        $body = readJson();
        $status = (string)($body['status'] ?? '');
        if (!in_array($status, ['confirmed','cancelled'], true)) {
            throw new ValidationException('status must be confirmed or cancelled');
        }

        $pdo = db();
        // Проверяем принадлежность
        $stmt = $pdo->prepare("
            SELECT b.id
            FROM bookings b
            JOIN tables t ON t.id = b.table_id
            JOIN halls h  ON h.id = t.hall_id
            JOIN restaurants r ON r.id = h.restaurant_id
            WHERE b.id = ? AND r.manager_id = ? LIMIT 1
        ");
        $stmt->execute([(int)$id, (int)$u['id']]);
        if (!$stmt->fetchColumn()) {
            throw new NotFoundException('Booking not found');
        }

        $upd = $pdo->prepare("UPDATE bookings SET status = ? WHERE id = ?");
        $upd->execute([$status, (int)$id]);
        jsonOk(['ok' => true]);
    }

    public static function halls(): void
    {
        $u = requireManager();
        $stmt = db()->prepare("
            SELECT h.id, h.name, h.capacity, r.id AS restaurant_id, r.name AS restaurant_name
            FROM halls h
            JOIN restaurants r ON r.id = h.restaurant_id
            WHERE r.manager_id = ?
            ORDER BY h.id DESC
        ");
        $stmt->execute([(int)$u['id']]);
        jsonOk(['items' => $stmt->fetchAll()]);
    }

    public static function createHall(): void
    {
        $u = requireManager();
        $body = readJson();
        $name = trim((string)($body['name'] ?? ''));
        $capacity = (int)($body['capacity'] ?? 0);

        if ($name === '' || $capacity <= 0) {
            throw new ValidationException('name and capacity required');
        }

        $rid = managerRestaurantId((int)$u['id']);
        if (!$rid) {
            throw new ForbiddenException('No restaurant assigned to manager');
        }

        $ins = db()->prepare('INSERT INTO halls (restaurant_id, name, capacity) VALUES (?, ?, ?)');
        $ins->execute([$rid, $name, $capacity]);
        jsonOk(['hall_id' => (int)db()->lastInsertId()], 201);
    }

    public static function tables(): void
    {
        $u = requireManager();
        $stmt = db()->prepare("
            SELECT t.id, t.number, t.seats, t.x, t.y,
                   h.id AS hall_id, h.name AS hall_name,
                   r.id AS restaurant_id, r.name AS restaurant_name
            FROM tables t
            JOIN halls h ON h.id = t.hall_id
            JOIN restaurants r ON r.id = h.restaurant_id
            WHERE r.manager_id = ?
            ORDER BY h.id, t.number
        ");
        $stmt->execute([(int)$u['id']]);
        jsonOk(['items' => $stmt->fetchAll()]);
    }

    public static function createTable(): void
    {
        $u = requireManager();
        $body = readJson();
        $hallId = (int)($body['hall_id'] ?? 0);
        $number = trim((string)($body['number'] ?? ''));
        $seats  = (int)($body['seats'] ?? 0);

        if (!$hallId || $number === '' || $seats <= 0) {
            throw new ValidationException('hall_id, number, seats required');
        }

        // Проверка: зал принадлежит ресторану менеджера
        $chk = db()->prepare("
            SELECT h.id FROM halls h
            JOIN restaurants r ON r.id = h.restaurant_id
            WHERE h.id = ? AND r.manager_id = ? LIMIT 1
        ");
        $chk->execute([$hallId, (int)$u['id']]);
        if (!$chk->fetchColumn()) {
            throw new ForbiddenException('Hall does not belong to your restaurant');
        }

        try {
            $ins = db()->prepare('INSERT INTO tables (hall_id, number, seats) VALUES (?, ?, ?)');
            $ins->execute([$hallId, $number, $seats]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                throw new ConflictException('Table number already exists in this hall');
            }
            throw $e;
        }
        jsonOk(['table_id' => (int)db()->lastInsertId()], 201);
    }
}