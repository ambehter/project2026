<?php
declare(strict_types=1);

class RestaurantController
{
    public static function list(): void
    {
        $search  = trim((string)($_GET['search'] ?? ''));
        $cuisine = trim((string)($_GET['cuisine'] ?? ''));
        $limit   = max(1, min(50, (int)($_GET['limit'] ?? 20)));
        $offset  = max(0, (int)($_GET['offset'] ?? 0));

        $sql = "SELECT id, manager_id, name, cuisine, address, city, description,
                       rating, image_url, status
                FROM restaurants
                WHERE status = 'published'";
        $params = [];

        if ($search !== '') {
            $sql .= " AND (name LIKE ? OR description LIKE ? OR city LIKE ?)";
            $like = '%' . $search . '%';
            $params[] = $like; $params[] = $like; $params[] = $like;
        }
        if ($cuisine !== '') {
            $sql .= " AND cuisine = ?";
            $params[] = $cuisine;
        }
        $sql .= " ORDER BY rating DESC, id DESC LIMIT $limit OFFSET $offset";

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        jsonOk(['items' => $stmt->fetchAll()]);
    }

    public static function show(string $id): void
    {
        $stmt = db()->prepare(
            "SELECT id, manager_id, name, cuisine, address, city, description,
                    rating, image_url, status
             FROM restaurants WHERE id = ? LIMIT 1"
        );
        $stmt->execute([(int)$id]);
        $r = $stmt->fetch();
        if (!$r) {
            throw new NotFoundException('Restaurant not found');
        }
        jsonOk(['restaurant' => $r]);
    }
}