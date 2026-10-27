<?php
declare(strict_types=1);

class TableController
{
    /**
     * GET /api/tables/availability?restaurantId=&date=&time=&guests=
     * 4.3.3: длительность брони 90 минут. Занятые = pending + confirmed
     * с пересекающимся интервалом [time, time+90min).
     */
    public static function availability(): void
    {
        $restaurantId = (int)($_GET['restaurantId'] ?? 0);
        $date = trim((string)($_GET['date'] ?? ''));
        $time = trim((string)($_GET['time'] ?? ''));
        $guests = (int)($_GET['guests'] ?? 0);

        if (!$restaurantId || !$date || !$time || $guests <= 0) {
            throw new ValidationException('restaurantId, date, time, guests required');
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new ValidationException('Invalid date');
        }
        if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $time)) {
            throw new ValidationException('Invalid time');
        }
        // нормализуем время к HH:MM:SS
        if (strlen($time) === 5) {
            $time .= ':00';
        }

        // Интервал: [time, time + 90 минут)
        $start = $time;
        $end   = date('H:i:s', strtotime($date . ' ' . $time) + 90 * 60);

        $pdo = db();
        $sql = "
            SELECT t.id, t.number, t.seats, t.x, t.y, h.name AS hall_name
            FROM tables t
            JOIN halls h ON h.id = t.hall_id
            WHERE h.restaurant_id = ?
              AND t.seats >= ?
              AND t.id NOT IN (
                  SELECT b.table_id
                  FROM bookings b
                  WHERE b.booking_date = ?
                    AND b.status IN ('pending','confirmed')
                    AND b.booking_time < ?
                    AND ADDTIME(b.booking_time, '01:30:00') > ?
              )
            ORDER BY t.seats ASC, t.number ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$restaurantId, $guests, $date, $end, $start]);
        jsonOk(['items' => $stmt->fetchAll()]);
    }
}