<?php
declare(strict_types=1);

class BookingController
{
    public static function create(): void
    {
        $u = authenticate();
        $body = readJson();

        $tableId = (int)($body['table_id'] ?? 0);
        $date    = trim((string)($body['booking_date'] ?? ''));
        $time    = trim((string)($body['booking_time'] ?? ''));
        $guests  = (int)($body['guests'] ?? 0);

        if (!$tableId || !$date || !$time || $guests <= 0) {
            throw new ValidationException('table_id, booking_date, booking_time, guests required');
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new ValidationException('Invalid date');
        }
        if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $time)) {
            throw new ValidationException('Invalid time');
        }
        if (strlen($time) === 5) {
            $time .= ':00';
        }

        $pdo = db();
        $pdo->beginTransaction();
        try {
            // SELECT ... FOR UPDATE (8.8)
            $stmt = $pdo->prepare('SELECT id, seats FROM tables WHERE id = ? FOR UPDATE');
            $stmt->execute([$tableId]);
            $table = $stmt->fetch();
            if (!$table) {
                throw new NotFoundException('Table not found');
            }
            if ((int)$table['seats'] < $guests) {
                throw new ConflictException('Not enough seats');
            }

            $start = $time;
            $end   = date('H:i:s', strtotime($date . ' ' . $time) + 90 * 60);

            $chk = $pdo->prepare("
                SELECT COUNT(*) FROM bookings
                WHERE table_id = ?
                  AND booking_date = ?
                  AND status IN ('pending','confirmed')
                  AND booking_time < ?
                  AND ADDTIME(booking_time, '01:30:00') > ?
            ");
            $chk->execute([$tableId, $date, $end, $start]);
            if ((int)$chk->fetchColumn() > 0) {
                throw new ConflictException('Table already booked for this time');
            }

            $ins = $pdo->prepare("
                INSERT INTO bookings
                    (user_id, table_id, booking_date, booking_time, guests, status, comment)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
            ");
            $ins->execute([
                (int)$u['id'], $tableId, $date, $time, $guests,
                $body['comment'] ?? null,
            ]);
            $id = (int)$pdo->lastInsertId();

            $pdo->commit();

            jsonOk(['booking_id' => $id], 201);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function my(): void
    {
        $u = authenticate();
        $status = trim((string)($_GET['status'] ?? ''));

        $sql = "
            SELECT b.id, b.booking_date, b.booking_time, b.guests, b.status,
                   b.comment, b.created_at,
                   t.number AS table_number, t.seats,
                   r.id AS restaurant_id, r.name AS restaurant_name, r.image_url
            FROM bookings b
            JOIN tables t ON t.id = b.table_id
            JOIN halls h ON h.id = t.hall_id
            JOIN restaurants r ON r.id = h.restaurant_id
            WHERE b.user_id = ?
        ";
        $params = [(int)$u['id']];
        if (in_array($status, ['pending','confirmed','cancelled'], true)) {
            $sql .= " AND b.status = ?";
            $params[] = $status;
        }
        $sql .= " ORDER BY b.booking_date DESC, b.booking_time DESC";

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        jsonOk(['items' => $stmt->fetchAll()]);
    }

    public static function cancel(string $id): void
    {
        $u = authenticate();
        $id = (int)$id;

        $pdo = db();
        $stmt = $pdo->prepare("
            SELECT b.id, b.user_id, b.status, r.manager_id
            FROM bookings b
            JOIN tables t ON t.id = b.table_id
            JOIN halls h ON h.id = t.hall_id
            JOIN restaurants r ON r.id = h.restaurant_id
            WHERE b.id = ? LIMIT 1
        ");
        $stmt->execute([$id]);
        $b = $stmt->fetch();
        if (!$b) {
            throw new NotFoundException('Booking not found');
        }

        $isOwner  = (int)$b['user_id'] === (int)$u['id'];
        $isMgr    = in_array($u['role'], ['manager','admin'], true)
                    && (int)$b['manager_id'] === (int)$u['id'];

        if (!$isOwner && !$isMgr) {
            throw new ForbiddenException('Cannot cancel this booking');
        }
        if ($b['status'] === 'cancelled') {
            throw new ConflictException('Already cancelled');
        }

        $upd = $pdo->prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?");
        $upd->execute([$id]);
        jsonOk(['ok' => true]);
    }
}